from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.db.models import Sum, Count, F, Q, Case, When, Value, CharField, Avg
from django.utils import timezone
from datetime import timedelta
from decimal import Decimal
from django.core.cache import cache
from orders.models import Order, OrderItem
from products.models import Product
from clients.models import Client
from repairs.models import Repair
from quotes.models import Quote


def decimal_to_float(value):
    """Convertir Decimal en float pour JSON"""
    if isinstance(value, Decimal):
        return float(value)
    return value if value is not None else 0


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dashboard_stats(request):
    """Vue d'ensemble pour le dashboard avec cache"""
    
    # Vérifier le cache
    cache_key = 'dashboard_stats'
    cached_stats = cache.get(cache_key)
    if cached_stats:
        return Response(cached_stats)
    
    try:
        today = timezone.now().date()
        start_of_month = today.replace(day=1)
        start_of_week = today - timedelta(days=today.weekday())
        
        # Chiffre d'affaires total
        total_revenue_result = Order.objects.filter(
            status='completed'
        ).aggregate(total=Sum('total_ttc'))
        total_revenue = decimal_to_float(total_revenue_result['total'])
        
        # Nombre total de commandes
        total_orders = Order.objects.count()
        
        # Nombre total de clients
        total_clients = Client.objects.filter(is_active=True).count()
        
        # Nombre total de produits
        total_products = Product.objects.filter(is_active=True).count()
        
        # Ventes par mois (6 derniers mois) - AVEC TIMEZONE
        sales_by_month = []
        now = timezone.now()
        
        for i in range(5, -1, -1):
            # Calculer le début du mois avec timezone
            month_date = now - timedelta(days=30*i)
            month_start = month_date.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            
            if i == 0:
                month_end = now
            else:
                if month_start.month == 12:
                    next_month = month_start.replace(year=month_start.year + 1, month=1)
                else:
                    next_month = month_start.replace(month=month_start.month + 1)
                month_end = next_month - timedelta(seconds=1)
            
            month_sales_result = Order.objects.filter(
                created_at__gte=month_start,
                created_at__lte=month_end,
                status='completed'
            ).aggregate(total=Sum('total_ttc'))
            
            month_sales = decimal_to_float(month_sales_result['total'])
            
            sales_by_month.append({
                'month': month_start.strftime('%b %Y'),
                'total': month_sales
            })
        
        # Top 5 produits les plus vendus
        top_products_query = OrderItem.objects.values(
            'product__name'
        ).annotate(
            quantity=Sum('quantity')
        ).order_by('-quantity')[:5]
        
        top_products_data = []
        for item in top_products_query:
            if item['product__name']:
                top_products_data.append({
                    'name': item['product__name'],
                    'quantity': int(item['quantity'])
                })
        
        # Ventes par magasin
        ville_avray_result = Order.objects.filter(
            store='ville_avray',
            status='completed'
        ).aggregate(total=Sum('total_ttc'))
        ville_avray_sales = decimal_to_float(ville_avray_result['total'])
        
        garches_result = Order.objects.filter(
            store='garches',
            status='completed'
        ).aggregate(total=Sum('total_ttc'))
        garches_sales = decimal_to_float(garches_result['total'])
        
        store_stats = {
            'ville_avray': ville_avray_sales,
            'garches': garches_sales
        }
        
        # Produits en rupture de stock - UTILISER stock_ville_avray + stock_garches
        # Calculer le stock total et filtrer ceux qui ont <= 5
        all_products = Product.objects.filter(is_active=True)
        low_stock_data = []
        
        for p in all_products:
            total_stock = (p.stock_ville_avray or 0) + (p.stock_garches or 0)
            if total_stock <= 5:
                low_stock_data.append({
                    'id': p.id,
                    'name': p.name,
                    'reference': p.reference,
                    'total_stock': total_stock
                })
                if len(low_stock_data) >= 20: # Limiter à 20 produits
                    break
        
        # Dernières commandes (10 dernières)
        recent_orders = Order.objects.select_related('client').order_by('-created_at')[:10]
        
        recent_orders_data = []
        for order in recent_orders:
            recent_orders_data.append({
                'id': order.id,
                'order_number': order.order_number,
                'client_name': f"{order.client.first_name} {order.client.last_name}",
                'store': order.store,
                'total_ttc': decimal_to_float(order.total_ttc),
                'status': order.status
            })
        
        # Nouvelles statistiques pour le Dashboard optimisé
        # Statistiques mensuelles pour tendances
        month_orders = Order.objects.filter(
            status='completed',
            completed_at__gte=start_of_month
        )
        month_revenue = decimal_to_float(
            month_orders.aggregate(total=Sum('total_ttc'))['total'] or 0
        )
        
        # Mois précédent pour comparaison
        last_month = start_of_month - timedelta(days=1)
        last_month_start = last_month.replace(day=1)
        
        last_month_orders = Order.objects.filter(
            status='completed',
            completed_at__gte=last_month_start,
            completed_at__lt=start_of_month
        )
        last_month_revenue = decimal_to_float(
            last_month_orders.aggregate(total=Sum('total_ttc'))['total'] or 0
        )
        
        # Calcul de la tendance
        if last_month_revenue > 0:
            growth = ((month_revenue - last_month_revenue) / last_month_revenue) * 100
        else:
            growth = 0
        
        # Statistiques hebdomadaires
        week_orders = Order.objects.filter(
            status='completed',
            completed_at__gte=start_of_week
        )
        week_revenue = decimal_to_float(
            week_orders.aggregate(total=Sum('total_ttc'))['total'] or 0
        )
        
        # Réparations et RDV
        total_repairs = Repair.objects.count()
        pending_quotes = Quote.objects.filter(status='pending').count()
        
        # RDV du jour (si la table appointments existe)
        try:
            from appointments.models import Appointment
            today_appointments = Appointment.objects.filter(
                appointment_date=today
            ).count()
        except ImportError:
            # Fallback: utiliser les réparations avec date estimée
            today_appointments = Repair.objects.filter(
                estimated_completion=today
            ).count()
        
        # Top produits avec revenus
        top_products_with_revenue = []
        for item in top_products_query[:3]:
            if item['product__name']:
                # Calculer le revenu moyen
                order_items_with_price = OrderItem.objects.filter(
                    product__name=item['product__name'],
                    order__status='completed'
                )
                avg_price = order_items_with_price.aggregate(
                    avg_price=Avg('unit_price_ttc')
                )['avg_price'] or 45
                
                top_products_with_revenue.append({
                    'name': item['product__name'],
                    'sales': int(item['quantity']),
                    'revenue': decimal_to_float(avg_price * item['quantity'])
                })
        
        # Tâches à venir
        upcoming_tasks = []
        
        # Rendez-vous à venir
        try:
            appointments = Appointment.objects.filter(
                appointment_date__gte=today,
                appointment_date__lte=today + timedelta(days=7)
            ).order_by('appointment_date', 'appointment_time')[:2]
            
            for apt in appointments:
                upcoming_tasks.append({
                    'type': 'appointment',
                    'title': f"RDV - {apt.client.name}",
                    'time': apt.appointment_time.strftime('%H:%M'),
                    'priority': apt.priority
                })
        except ImportError:
            pass
        
        # Réparations en cours
        repairs_in_progress = Repair.objects.filter(
            status__in=['pending', 'in_progress']
        ).order_by('priority', 'created_at')[:2]
        
        for repair in repairs_in_progress:
            upcoming_tasks.append({
                'type': 'repair',
                'title': f"Réparation - {repair.client.name}",
                'time': repair.created_at.strftime('%H:%M') if repair.created_at else '10:00',
                'priority': repair.priority
            })
        
        # Devis en attente récents
        recent_quotes = Quote.objects.filter(
            status='pending'
        ).order_by('-created_at')[:1]
        
        for quote in recent_quotes:
            upcoming_tasks.append({
                'type': 'quote',
                'title': f"Devis - {quote.client.name}",
                'time': quote.created_at.strftime('%H:%M') if quote.created_at else '14:00',
                'priority': 'low'
            })
        
        stats = {
            'totalRevenue': total_revenue,
            'totalOrders': total_orders,
            'totalClients': total_clients,
            'totalProducts': total_products,
            'totalRepairs': total_repairs,
            'pendingQuotes': pending_quotes,
            'todayAppointments': today_appointments,
            'monthlyTrend': {
                'current': month_revenue,
                'previous': last_month_revenue,
                'percentage': round(growth, 1)
            },
            'weeklyStats': {
                'revenue': week_revenue,
                'orders': week_orders.count(),
                'newClients': Client.objects.filter(
                    created_at__gte=start_of_week
                ).count(),
                'repairs': Repair.objects.filter(
                    created_at__gte=start_of_week
                ).count()
            },
            'lowStockProducts': low_stock_data[:5],  # Limiter à 5 pour le dashboard
            'recentOrders': recent_orders_data[:5],  # Limiter à 5 pour le dashboard
            'topProducts': top_products_with_revenue,
            'upcomingTasks': upcoming_tasks[:3],  # Limiter à 3 tâches pour le dashboard
            'salesByMonth': sales_by_month,
            'storeStats': store_stats,
            'topProducts': top_products_data,
            'lowStockProducts': low_stock_data,
            'recentOrders': recent_orders_data
        }
        
        # Mettre en cache pour 5 minutes
        cache.set(cache_key, stats, timeout=300)
        
        return Response(stats)
        
    except Exception as e:
        print(f"Erreur dans dashboard_stats: {str(e)}")
        import traceback
        traceback.print_exc()
        
        # Retourner des données vides en cas d'erreur
        return Response({
            'totalRevenue': 0,
            'totalOrders': 0,
            'totalClients': 0,
            'totalProducts': 0,
            'totalRepairs': 0,
            'pendingQuotes': 0,
            'todayAppointments': 0,
            'monthlyTrend': {'current': 0, 'previous': 0, 'percentage': 0},
            'weeklyStats': {'revenue': 0, 'orders': 0, 'newClients': 0, 'repairs': 0},
            'lowStockProducts': [],
            'recentOrders': [],
            'topProducts': [],
            'upcomingTasks': [],
            'salesByMonth': [],
            'storeStats': {'ville_avray': 0, 'garches': 0},
            'topProducts': [],
            'lowStockProducts': [],
            'recentOrders': []
        })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dashboard_detailed(request):
    """Endpoint détaillé pour les statistiques du dashboard"""
    try:
        # Paramètres
        period = request.query_params.get('period', 'monthly')
        days = int(request.query_params.get('days', 30))
        
        start_date = timezone.now().date() - timedelta(days=days)
        
        # Statistiques par période
        stats = {
            'period': period,
            'days': days,
            'start_date': start_date,
            'end_date': timezone.now().date()
        }
        
        return Response(stats)
        
    except Exception as e:
        return Response(
            {'error': str(e)}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


# Nouveaux endpoints analytics pour correspondre au frontend
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def sales_stats(request):
    """Statistiques des ventes"""
    try:
        days = int(request.query_params.get('days', 30))
        start_date = timezone.now().date() - timedelta(days=days)
        
        orders = Order.objects.filter(
            created_at__date__gte=start_date,
            status='completed'
        )
        
        total_sales = decimal_to_float(
            orders.aggregate(total=Sum('total_ttc'))['total'] or 0
        )
        
        # Ventes par jour
        daily_sales = []
        for i in range(days):
            date = start_date + timedelta(days=i)
            day_sales = orders.filter(created_at__date=date)
            daily_sales.append({
                'date': date.strftime('%Y-%m-%d'),
                'total': decimal_to_float(day_sales.aggregate(total=Sum('total_ttc'))['total'] or 0),
                'count': day_sales.count()
            })
        
        return Response({
            'total_sales': total_sales,
            'total_orders': orders.count(),
            'average_order': total_sales / orders.count() if orders.count() > 0 else 0,
            'daily_sales': daily_sales
        })
        
    except Exception as e:
        return Response({'error': str(e)}, status=500)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def sales_trends(request):
    """Tendances des ventes"""
    try:
        months = int(request.query_params.get('months', 12))
        
        trends_data = []
        now = timezone.now()
        
        for i in range(months):
            month_date = now - timedelta(days=30*i)
            month_start = month_date.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            
            if i == 0:
                month_end = now
            else:
                if month_start.month == 12:
                    next_month = month_start.replace(year=month_start.year + 1, month=1)
                else:
                    next_month = month_start.replace(month=month_start.month + 1)
                month_end = next_month - timedelta(seconds=1)
            
            month_sales = Order.objects.filter(
                created_at__gte=month_start,
                created_at__lte=month_end,
                status='completed'
            )
            
            total = decimal_to_float(month_sales.aggregate(total=Sum('total_ttc'))['total'] or 0)
            
            trends_data.append({
                'month': month_start.strftime('%Y-%m'),
                'sales': total,
                'orders': month_sales.count()
            })
        
        return Response({
            'trends': list(reversed(trends_data))
        })
        
    except Exception as e:
        return Response({'error': str(e)}, status=500)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def top_products(request):
    """Produits les plus vendus"""
    try:
        limit = int(request.query_params.get('limit', 10))
        
        top_products = OrderItem.objects.values(
            'product__name',
            'product__reference'
        ).annotate(
            total_quantity=Sum('quantity'),
            total_revenue=Sum(F('quantity') * F('unit_price_ttc'))
        ).order_by('-total_revenue')[:limit]
        
        result = []
        for item in top_products:
            if item['product__name']:
                result.append({
                    'name': item['product__name'],
                    'reference': item['product__reference'],
                    'quantity_sold': int(item['total_quantity']),
                    'revenue': decimal_to_float(item['total_revenue'])
                })
        
        return Response(result)
        
    except Exception as e:
        return Response({'error': str(e)}, status=500)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def top_clients(request):
    """Meilleurs clients"""
    try:
        limit = int(request.query_params.get('limit', 10))
        
        top_clients = Order.objects.values(
            'client__first_name',
            'client__last_name',
            'client__email'
        ).annotate(
            total_orders=Count('id'),
            total_spent=Sum('total_ttc')
        ).filter(
            status='completed'
        ).order_by('-total_spent')[:limit]
        
        result = []
        for item in top_clients:
            result.append({
                'name': f"{item['client__first_name']} {item['client__last_name']}",
                'email': item['client__email'],
                'orders': item['total_orders'],
                'total_spent': decimal_to_float(item['total_spent'])
            })
        
        return Response(result)
        
    except Exception as e:
        return Response({'error': str(e)}, status=500)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def product_stats(request):
    """Statistiques des produits"""
    try:
        total_products = Product.objects.filter(is_active=True).count()
        
        # Produits par catégorie
        products_by_category = Product.objects.filter(is_active=True).values(
            'category__name'
        ).annotate(
            count=Count('id')
        ).order_by('-count')
        
        # Valeur totale du stock
        stock_value = Product.objects.filter(is_active=True).aggregate(
            total_value=Sum(F('stock_ville_avray') * F('price_ttc') + F('stock_garches') * F('price_ttc'))
        )['total_value'] or 0
        
        # Produits en stock faible
        low_stock_count = Product.objects.filter(
            is_active=True
        ).extra(
            where=['(stock_ville_avray + stock_garches) <= 5']
        ).count()
        
        return Response({
            'total_products': total_products,
            'products_by_category': list(products_by_category),
            'total_stock_value': decimal_to_float(stock_value),
            'low_stock_count': low_stock_count
        })
        
    except Exception as e:
        return Response({'error': str(e)}, status=500)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def inventory_report(request):
    """Rapport d'inventaire"""
    try:
        products = Product.objects.filter(is_active=True)
        
        inventory_data = []
        for product in products:
            total_stock = (product.stock_ville_avray or 0) + (product.stock_garches or 0)
            total_value = total_stock * (product.price_ttc or 0)
            
            inventory_data.append({
                'id': product.id,
                'name': product.name,
                'reference': product.reference,
                'category': product.category.name if product.category else 'N/A',
                'stock_ville_avray': product.stock_ville_avray or 0,
                'stock_garches': product.stock_garches or 0,
                'total_stock': total_stock,
                'unit_price': decimal_to_float(product.price_ttc or 0),
                'total_value': decimal_to_float(total_value),
                'status': 'low' if total_stock <= 5 else 'normal'
            })
        
        return Response({
            'products': inventory_data,
            'summary': {
                'total_products': len(inventory_data),
                'total_value': sum(item['total_value'] for item in inventory_data),
                'low_stock_count': sum(1 for item in inventory_data if item['status'] == 'low')
            }
        })
        
    except Exception as e:
        return Response({'error': str(e)}, status=500)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def client_stats(request):
    """Statistiques des clients"""
    try:
        total_clients = Client.objects.filter(is_active=True).count()
        
        # Nouveaux clients par mois (6 derniers mois)
        new_clients_by_month = []
        now = timezone.now()
        
        for i in range(5, -1, -1):
            month_date = now - timedelta(days=30*i)
            month_start = month_date.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            
            if i == 0:
                month_end = now
            else:
                if month_start.month == 12:
                    next_month = month_start.replace(year=month_start.year + 1, month=1)
                else:
                    next_month = month_start.replace(month=month_start.month + 1)
                month_end = next_month - timedelta(seconds=1)
            
            month_clients = Client.objects.filter(
                created_at__gte=month_start,
                created_at__lte=month_end,
                is_active=True
            ).count()
            
            new_clients_by_month.append({
                'month': month_start.strftime('%b %Y'),
                'new_clients': month_clients
            })
        
        # Clients actifs (ayant commandé dans les 6 derniers mois)
        six_months_ago = now - timedelta(days=180)
        active_clients = Order.objects.filter(
            created_at__gte=six_months_ago,
            status='completed'
        ).values('client').distinct().count()
        
        return Response({
            'total_clients': total_clients,
            'active_clients': active_clients,
            'new_clients_by_month': new_clients_by_month
        })
        
    except Exception as e:
        return Response({'error': str(e)}, status=500)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def repair_stats(request):
    """Statistiques des réparations"""
    try:
        days = int(request.query_params.get('days', 30))
        start_date = timezone.now().date() - timedelta(days=days)
        
        repairs = Repair.objects.filter(created_at__date__gte=start_date)
        
        # Réparations par statut
        repairs_by_status = repairs.values('status').annotate(count=Count('id'))
        
        # Réparations par mois
        repairs_by_month = []
        now = timezone.now()
        
        for i in range(5, -1, -1):
            month_date = now - timedelta(days=30*i)
            month_start = month_date.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            
            if i == 0:
                month_end = now
            else:
                if month_start.month == 12:
                    next_month = month_start.replace(year=month_start.year + 1, month=1)
                else:
                    next_month = month_start.replace(month=month_start.month + 1)
                month_end = next_month - timedelta(seconds=1)
            
            month_repairs = repairs.filter(
                created_at__gte=month_start,
                created_at__lte=month_end
            ).count()
            
            repairs_by_month.append({
                'month': month_start.strftime('%b %Y'),
                'repairs': month_repairs
            })
        
        return Response({
            'total_repairs': repairs.count(),
            'repairs_by_status': list(repairs_by_status),
            'repairs_by_month': repairs_by_month
        })
        
    except Exception as e:
        return Response({'error': str(e)}, status=500)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def mechanic_performance(request):
    """Performance des mécaniciens"""
    try:
        # Si le modèle Repair a un champ mechanic
        if hasattr(Repair.objects.first(), 'mechanic'):
            repairs_by_mechanic = Repair.objects.values(
                'mechanic__username'
            ).annotate(
                total_repairs=Count('id'),
                completed_repairs=Count('id', filter=Q(status='completed'))
            ).order_by('-total_repairs')
            
            result = []
            for item in repairs_by_mechanic:
                if item['mechanic__username']:
                    completion_rate = (item['completed_repairs'] / item['total_repairs'] * 100) if item['total_repairs'] > 0 else 0
                    result.append({
                        'mechanic': item['mechanic__username'],
                        'total_repairs': item['total_repairs'],
                        'completed_repairs': item['completed_repairs'],
                        'completion_rate': round(completion_rate, 1)
                    })
            
            return Response(result)
        else:
            # Fallback: utiliser created_by
            repairs_by_creator = Repair.objects.values(
                'created_by__username'
            ).annotate(
                total_repairs=Count('id'),
                completed_repairs=Count('id', filter=Q(status='completed'))
            ).order_by('-total_repairs')
            
            result = []
            for item in repairs_by_creator:
                if item['created_by__username']:
                    completion_rate = (item['completed_repairs'] / item['total_repairs'] * 100) if item['total_repairs'] > 0 else 0
                    result.append({
                        'mechanic': item['created_by__username'],
                        'total_repairs': item['total_repairs'],
                        'completed_repairs': item['completed_repairs'],
                        'completion_rate': round(completion_rate, 1)
                    })
            
            return Response(result)
        
    except Exception as e:
        return Response({'error': str(e)}, status=500)
