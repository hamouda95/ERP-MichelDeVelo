"""
Services métier pour l'ERP Michel De Vélo
Sépare la logique métier des views Django
"""
from django.db import models
from django.utils import timezone
from decimal import Decimal
from typing import List, Dict, Optional, Tuple
import logging

logger = logging.getLogger(__name__)

class RepairBusinessService:
    """Service métier pour la gestion des réparations"""
    
    @staticmethod
    def calculate_repair_cost(repair_items: List[Dict]) -> Decimal:
        """Calcule le coût total d'une réparation"""
        total = Decimal('0.00')
        for item in repair_items:
            unit_price = Decimal(str(item.get('unit_price', 0)))
            quantity = Decimal(str(item.get('quantity', 0)))
            total += unit_price * quantity
        return total.quantize(Decimal('0.01'))
    
    @staticmethod
    def validate_repair_status_transition(current_status: str, new_status: str) -> bool:
        """Valide si la transition de statut est autorisée"""
        allowed_transitions = {
            'pending': ['in_progress', 'cancelled'],
            'in_progress': ['completed', 'cancelled', 'pending'],
            'completed': ['delivered', 'in_progress'],
            'delivered': [],  # État final
            'cancelled': []  # État final
        }
        
        return new_status in allowed_transitions.get(current_status, [])
    
    @staticmethod
    def get_repair_statistics(repairs_queryset) -> Dict:
        """Calcule les statistiques des réparations"""
        from django.db.models import Count, Sum, Q, Avg
        
        today = timezone.now().date()
        month_start = today.replace(day=1)
        
        stats = repairs_queryset.aggregate(
            total=Count('id'),
            pending=Count('id', filter=Q(status='pending')),
            in_progress=Count('id', filter=Q(status='in_progress')),
            completed=Count('id', filter=Q(status='completed')),
            delivered=Count('id', filter=Q(status='delivered')),
            avg_cost=Avg('estimated_cost'),
            total_value=Sum('estimated_cost')
        )
        
        # Statistiques du mois
        month_stats = repairs_queryset.filter(created_at__gte=month_start).aggregate(
            this_month=Count('id'),
            month_value=Sum('estimated_cost')
        )
        
        return {
            'total': stats['total'] or 0,
            'pending': stats['pending'] or 0,
            'in_progress': stats['in_progress'] or 0,
            'completed': stats['completed'] or 0,
            'delivered': stats['delivered'] or 0,
            'avg_cost': float(stats['avg_cost'] or 0),
            'total_value': float(stats['total_value'] or 0),
            'this_month': month_stats['this_month'] or 0,
            'month_value': float(month_stats['month_value'] or 0),
            'completion_rate': round(
                (stats['delivered'] or 0) / max(stats['total'] or 1, 1) * 100, 2
            )
        }
    
    @staticmethod
    def organize_kanban_data(repairs_queryset) -> Dict:
        """Organise les réparations pour le tableau Kanban"""
        kanban_columns = {
            'pending': [],
            'in_progress': [],
            'completed': [],
            'delivered': []
        }
        
        for repair in repairs_queryset:
            repair_data = {
                'id': repair.id,
                'reference_number': repair.reference_number,
                'client_name': f"{repair.client.first_name} {repair.client.last_name}",
                'bike_brand': repair.bike_brand,
                'bike_model': repair.bike_model,
                'description': repair.description,
                'priority': repair.priority,
                'status': repair.status,
                'created_at': repair.created_at.isoformat(),
                'estimated_cost': float(repair.estimated_cost),
                'store': repair.store
            }
            
            if repair.status in kanban_columns:
                kanban_columns[repair.status].append(repair_data)
        
        return kanban_columns
    
    @staticmethod
    def generate_repair_reference(store: str, date: timezone.datetime) -> str:
        """Génère une référence de réparation unique"""
        from repairs.models import Repair
        import random
        
        # Format: REP-VA-YYYYMMDD-XXX
        date_str = date.strftime('%Y%m%d')
        store_prefix = 'VA' if store == 'ville_avray' else 'GA'
        
        # Trouver le dernier numéro pour aujourd'hui
        today_start = date.replace(hour=0, minute=0, second=0, microsecond=0)
        today_end = date.replace(hour=23, minute=59, second=59, microsecond=999999)
        
        last_repair = Repair.objects.filter(
            reference_number__startswith=f'REP-{store_prefix}-{date_str}',
            created_at__range=(today_start, today_end)
        ).order_by('-reference_number').first()
        
        if last_repair:
            last_number = int(last_repair.reference_number.split('-')[-1])
            new_number = last_number + 1
        else:
            new_number = 1
        
        return f'REP-{store_prefix}-{date_str}-{new_number:03d}'

class ProductBusinessService:
    """Service métier pour la gestion des produits"""
    
    @staticmethod
    def calculate_stock_status(product, total_stock: int, min_stock: int) -> Dict:
        """Calcule le statut de stock d'un produit"""
        stock_ratio = total_stock / max(min_stock, 1)
        
        if total_stock <= 0:
            status = 'out_of_stock'
            urgency = 'critical'
        elif total_stock < min_stock:
            status = 'low_stock'
            urgency = 'high'
        elif stock_ratio < 2:
            status = 'normal'
            urgency = 'medium'
        else:
            status = 'well_stocked'
            urgency = 'low'
        
        return {
            'status': status,
            'urgency': urgency,
            'stock_ratio': round(stock_ratio, 2),
            'reorder_needed': total_stock < min_stock,
            'suggested_order': max(min_stock * 2, total_stock * 1.5)
        }
    
    @staticmethod
    def get_product_statistics(products_queryset) -> Dict:
        """Calcule les statistiques des produits"""
        from django.db.models import Count, Sum, Avg, Q
        
        stats = products_queryset.aggregate(
            total=Count('id'),
            total_stock=Sum('total_stock'),
            low_stock=Count('id', filter=Q(total_stock__lt=models.F('min_stock'))),
            out_of_stock=Count('id', filter=Q(total_stock=0)),
            avg_price=Avg('price')
        )
        
        # Valeur totale du stock
        total_value = products_queryset.aggregate(
            total_value=Sum(models.F('price') * models.F('total_stock'))
        )['total_value'] or 0
        
        return {
            'total': stats['total'] or 0,
            'total_stock': stats['total_stock'] or 0,
            'low_stock': stats['low_stock'] or 0,
            'out_of_stock': stats['out_of_stock'] or 0,
            'avg_price': float(stats['avg_price'] or 0),
            'total_value': float(total_value),
            'stock_health': round(
                (stats['total'] - stats['low_stock'] - stats['out_of_stock']) / max(stats['total'], 1) * 100, 2
            )
        }

class ClientBusinessService:
    """Service métier pour la gestion des clients"""
    
    @staticmethod
    def calculate_client_lifetime_value(client) -> Dict:
        """Calcule la valeur vie client (CLV)"""
        from orders.models import Order
        from repairs.models import Repair
        
        # Valeur totale des commandes
        orders_total = Order.objects.filter(client=client).aggregate(
            total=Sum(models.F('total_ttc')),
            count=Count('id')
        )
        
        # Valeur totale des réparations
        repairs_total = Repair.objects.filter(client=client).aggregate(
            total=Sum('estimated_cost'),
            count=Count('id')
        )
        
        # Date de première et dernière interaction
        interactions = list(
            Order.objects.filter(client=client).values_list('created_at', flat=True)
        ) + list(
            Repair.objects.filter(client=client).values_list('created_at', flat=True)
        )
        
        if interactions:
            first_interaction = min(interactions)
            last_interaction = max(interactions)
            days_as_customer = (timezone.now() - first_interaction).days
        else:
            first_interaction = None
            last_interaction = None
            days_as_customer = 0
        
        return {
            'total_orders_value': float(orders_total['total'] or 0),
            'total_repairs_value': float(repairs_total['total'] or 0),
            'total_value': float((orders_total['total'] or 0) + (repairs_total['total'] or 0)),
            'orders_count': orders_total['count'] or 0,
            'repairs_count': repairs_total['count'] or 0,
            'total_interactions': (orders_total['count'] or 0) + (repairs_total['count'] or 0),
            'days_as_customer': days_as_customer,
            'first_interaction': first_interaction.isoformat() if first_interaction else None,
            'last_interaction': last_interaction.isoformat() if last_interaction else None,
            'avg_transaction_value': round(
                ((orders_total['total'] or 0) + (repairs_total['total'] or 0)) / 
                max((orders_total['count'] or 0) + (repairs_total['count'] or 0), 1), 2
            )
        }
    
    @staticmethod
    def segment_clients(clients_queryset) -> Dict:
        """Segmente les clients par valeur et activité"""
        from django.db.models import Sum, Count, Q
        from datetime import timedelta
        
        # Clients VIP (plus de 1000€ de commandes/réparations)
        vip_clients = clients_queryset.annotate(
            total_value=Sum(models.F('orders__total_ttc') + models.F('repairs__estimated_cost'))
        ).filter(total_value__gte=1000).count()
        
        # Clients actifs (interaction dans les 90 derniers jours)
        active_threshold = timezone.now() - timedelta(days=90)
        active_clients = clients_queryset.filter(
            Q(orders__created_at__gte=active_threshold) |
            Q(repairs__created_at__gte=active_threshold)
        ).distinct().count()
        
        # Clients inactifs
        inactive_clients = clients_queryset.count() - active_clients
        
        # Nouveaux clients (moins de 30 jours)
        new_threshold = timezone.now() - timedelta(days=30)
        new_clients = clients_queryset.filter(
            created_at__gte=new_threshold
        ).count()
        
        return {
            'total': clients_queryset.count(),
            'vip': vip_clients,
            'active': active_clients,
            'inactive': inactive_clients,
            'new': new_clients,
            'vip_percentage': round(vip_clients / max(clients_queryset.count(), 1) * 100, 2),
            'active_percentage': round(active_clients / max(clients_queryset.count(), 1) * 100, 2)
        }

class FinancialBusinessService:
    """Service métier pour la gestion financière"""
    
    @staticmethod
    def calculate_monthly_revenue(year: int, month: int) -> Dict:
        """Calcule les revenus mensuels"""
        from orders.models import Order
        from repairs.models import Repair
        from django.db.models import Sum, Q
        
        start_date = timezone.datetime(year, month, 1)
        if month == 12:
            end_date = timezone.datetime(year + 1, 1, 1) - timezone.timedelta(days=1)
        else:
            end_date = timezone.datetime(year, month + 1, 1)
        
        # Revenus des commandes
        orders_revenue = Order.objects.filter(
            created_at__range=(start_date, end_date),
            status='completed'
        ).aggregate(total=Sum('total_ttc'))['total'] or 0
        
        # Revenus des réparations
        repairs_revenue = Repair.objects.filter(
            created_at__range=(start_date, end_date),
            status='delivered'
        ).aggregate(total=Sum('estimated_cost'))['total'] or 0
        
        total_revenue = orders_revenue + repairs_revenue
        
        return {
            'year': year,
            'month': month,
            'orders_revenue': float(orders_revenue),
            'repairs_revenue': float(repairs_revenue),
            'total_revenue': float(total_revenue),
            'orders_percentage': round(orders_revenue / max(total_revenue, 1) * 100, 2),
            'repairs_percentage': round(repairs_revenue / max(total_revenue, 1) * 100, 2)
        }
    
    @staticmethod
    def calculate_profit_margin(revenue: Decimal, costs: Decimal) -> Dict:
        """Calcule la marge bénéficiaire"""
        if revenue <= 0:
            return {
                'margin': 0,
                'margin_percentage': 0,
                'profit': 0
            }
        
        profit = revenue - costs
        margin_percentage = (profit / revenue) * 100
        
        return {
            'revenue': float(revenue),
            'costs': float(costs),
            'profit': float(profit),
            'margin': float(margin_percentage),
            'margin_percentage': round(margin_percentage, 2)
        }
    
    @staticmethod
    def forecast_monthly_revenue(historical_data: List[Dict], months_ahead: int = 3) -> List[Dict]:
        """Prédit les revenus mensuels basés sur l'historique"""
        if len(historical_data) < 3:
            return []
        
        # Simple moyenne mobile pondérée
        recent_data = historical_data[-3:]  # 3 derniers mois
        avg_revenue = sum(item['total_revenue'] for item in recent_data) / len(recent_data)
        
        # Tendance de croissance
        if len(historical_data) >= 2:
            growth_rate = (historical_data[-1]['total_revenue'] - historical_data[0]['total_revenue']) / historical_data[0]['total_revenue']
        else:
            growth_rate = 0
        
        forecasts = []
        for i in range(1, months_ahead + 1):
            # Appliquer la tendance de croissance
            forecast_revenue = avg_revenue * (1 + growth_rate) * (1 + i * 0.1)  # Légère accélération
            
            forecasts.append({
                'month_offset': i,
                'forecast_revenue': round(forecast_revenue, 2),
                'confidence': max(0.7 - i * 0.1, 0.3),  # Confiance diminue avec le temps
                'growth_rate': round(growth_rate * 100, 2)
            })
        
        return forecasts

class NotificationBusinessService:
    """Service métier pour la gestion des notifications"""
    
    @staticmethod
    def should_send_repair_notification(repair, notification_type: str) -> bool:
        """Détermine si une notification doit être envoyée"""
        # Éviter les notifications en double
        from repairs.models import RepairNotification
        recent_notification = RepairNotification.objects.filter(
            repair=repair,
            notification_type=notification_type,
            sent_at__gte=timezone.now() - timezone.timedelta(hours=1)
        ).exists()
        
        if recent_notification:
            return False
        
        # Règles spécifiques par type
        rules = {
            'status_change': True,  # Toujours notifier les changements de statut
            'completion': repair.status == 'completed',
            'delivery': repair.status == 'delivered',
            'delay_warning': (
                repair.status in ['pending', 'in_progress'] and
                repair.estimated_completion and
                repair.estimated_completion < timezone.now() + timezone.timedelta(days=1)
            )
        }
        
        return rules.get(notification_type, False)
    
    @staticmethod
    def get_notification_preferences(client) -> Dict:
        """Récupère les préférences de notification d'un client"""
        from clients.models import ClientNotificationPreference
        
        preferences = ClientNotificationPreference.objects.filter(client=client).first()
        
        if not preferences:
            # Préférences par défaut
            return {
                'email_enabled': True,
                'sms_enabled': True,
                'repair_updates': True,
                'promotional_offers': False,
                'payment_reminders': True,
                'delivery_notifications': True
            }
        
        return {
            'email_enabled': preferences.email_enabled,
            'sms_enabled': preferences.sms_enabled,
            'repair_updates': preferences.repair_updates,
            'promotional_offers': preferences.promotional_offers,
            'payment_reminders': preferences.payment_reminders,
            'delivery_notifications': preferences.delivery_notifications
        }
    
    @staticmethod
    def format_notification_message(template_data: Dict, notification_type: str) -> str:
        """Formate un message de notification basé sur un template"""
        templates = {
            'repair_created': """
                Bonjour {client_first_name},
                
                Votre réparation #{repair_reference} a été enregistrée avec succès.
                
                Vélo: {bike_brand} {bike_model}
                Description: {description}
                Estimation: {estimated_cost}€
                
                Nous vous tiendrons informé de l'avancement.
                
                Cordialement,
                L'équipe Michel De Vélo
            """,
            'status_change': """
                Bonjour {client_first_name},
                
                Votre réparation #{repair_reference} a été mise à jour.
                
                Nouveau statut: {new_status}
                
                {additional_info}
                
                Cordialement,
                L'équipe Michel De Vélo
            """,
            'repair_completed': """
                Bonjour {client_first_name},
                
                Votre réparation #{repair_reference} est terminée !
                
                Vous pouvez maintenant récupérer votre vélo en magasin.
                
                Coût final: {final_cost}€
                
                Cordialement,
                L'équipe Michel De Vélo
            """
        }
        
        template = templates.get(notification_type, '')
        
        try:
            return template.format(**template_data)
        except KeyError as e:
            logger.error(f"Missing template variable: {e}")
            return template  # Retourner le template non formaté
