"""
Optimisation des requêtes pour l'ERP Michel De Vélo
Utilise select_related et prefetch_related pour éviter les N+1 queries
"""
from django.db import models
from django.db.models import Count, Sum, Avg, F, Q, Prefetch
from django.utils import timezone
from datetime import timedelta

class RepairQuerySet(models.QuerySet):
    """QuerySet optimisé pour les réparations"""
    
    def with_client_details(self):
        """Précharge les détails du client"""
        return self.select_related('client')
    
    def with_assigned_user(self):
        """Précharge l'utilisateur assigné"""
        return self.select_related('assigned_to')
    
    def with_items_and_timeline(self):
        """Précharge les items et timeline"""
        return self.prefetch_related(
            'items',
            'timeline'
        )
    
    def with_creator(self):
        """Précharge le créateur"""
        return self.select_related('created_by')
    
    def with_full_details(self):
        """Précharge toutes les relations pour éviter N+1 queries"""
        return self.select_related(
            'client', 'assigned_to', 'created_by'
        ).prefetch_related(
            'items', 'timeline', 'documents'
        )
    
    def active_repairs(self):
        """Filtre les réparations actives (non terminées)"""
        return self.exclude(status__in=['delivered', 'cancelled'])
    
    def by_store(self, store):
        """Filtre par magasin"""
        if store:
            return self.filter(store=store)
        return self
    
    def by_priority(self, priority):
        """Filtre par priorité"""
        if priority:
            return self.filter(priority=priority)
        return self
    
    def by_status(self, status):
        """Filtre par statut"""
        if status:
            return self.filter(status=status)
        return self
    
    def overdue(self):
        """Filtre les réparations en retard"""
        return self.filter(
            estimated_completion__lt=timezone.now(),
            status__in=['pending', 'in_progress']
        )
    
    def due_soon(self, days=3):
        """Filtre les réparations à échéance proche"""
        deadline = timezone.now() + timedelta(days=days)
        return self.filter(
            estimated_completion__lte=deadline,
            status__in=['pending', 'in_progress']
        )
    
    def with_cost_summary(self):
        """Ajoute un résumé des coûts"""
        return self.annotate(
            items_count=Count('items'),
            total_cost=Sum(models.F('items__unit_price') * models.F('items__quantity'))
        )
    
    def with_completion_stats(self):
        """Ajoute les statistiques de complétion"""
        return self.annotate(
            days_in_progress=Case(
                When(
                    Q(status='in_progress') & Q(started_at__isnull=False),
                    then=timezone.now() - F('started_at')
                ),
                default=timezone.timedelta(0),
                output_field=models.DurationField()
            ),
            completion_delay=Case(
                When(
                    Q(status='delivered') & Q(actual_completion__isnull=False),
                    then=F('actual_completion') - F('estimated_completion')
                ),
                default=timezone.timedelta(0),
                output_field=models.DurationField()
            )
        )

class ProductQuerySet(models.QuerySet):
    """QuerySet optimisé pour les produits"""
    
    def with_category(self):
        """Précharge la catégorie"""
        return self.select_related('category')
    
    def with_stock_info(self):
        """Ajoute les informations de stock calculées"""
        return self.annotate(
            reorder_needed=Case(
                When(total_stock__lt=models.F('min_stock'), then=True),
                default=False,
                output_field=models.BooleanField()
            ),
            stock_value=models.F('total_stock') * models.F('price'),
            stock_ratio=models.F('total_stock') / models.F('min_stock')
        )
    
    def low_stock(self):
        """Filtre les produits en stock faible"""
        return self.filter(total_stock__lt=models.F('min_stock'))
    
    def out_of_stock(self):
        """Filtre les produits en rupture de stock"""
        return self.filter(total_stock=0)
    
    def by_category(self, category):
        """Filtre par catégorie"""
        if category:
            return self.filter(category=category)
        return self
    
    def search_multiple_fields(self, query):
        """Recherche dans plusieurs champs"""
        if not query:
            return self
        
        return self.filter(
            Q(name__icontains=query) |
            Q(description__icontains=query) |
            Q(reference__icontains=query) |
            Q(category__name__icontains=query)
        )

class ClientQuerySet(models.QuerySet):
    """QuerySet optimisé pour les clients"""
    
    def with_repairs_and_orders(self):
        """Précharge les réparations et commandes"""
        return self.prefetch_related(
            Prefetch('repairs', queryset=RepairQuerySet.all().with_client_details()),
            Prefetch('orders', queryset=models.QuerySet(model=models.get_model('orders.Order')).all())
        )
    
    def with_lifetime_value(self):
        """Calcule et ajoute la valeur vie client"""
        from orders.models import Order
        from repairs.models import Repair
        
        return self.annotate(
            orders_count=Count('orders'),
            repairs_count=Count('repairs'),
            total_orders_value=Sum('orders__total_ttc'),
            total_repairs_value=Sum('repairs__estimated_cost'),
            lifetime_value=Sum(
                models.F('orders__total_ttc') + models.F('repairs__estimated_cost')
            )
        )
    
    def active_clients(self):
        """Filtre les clients actifs (interaction < 90 jours)"""
        cutoff = timezone.now() - timedelta(days=90)
        return self.filter(
            Q(orders__created_at__gte=cutoff) |
            Q(repairs__created_at__gte=cutoff)
        ).distinct()
    
    def vip_clients(self, min_value=1000):
        """Filtre les clients VIP (valeur > min_value)"""
        return self.annotate(
            lifetime_value=Sum(
                models.F('orders__total_ttc') + models.F('repairs__estimated_cost')
            )
        ).filter(lifetime_value__gte=min_value)
    
    def search_multiple_fields(self, query):
        """Recherche dans plusieurs champs"""
        if not query:
            return self
        
        return self.filter(
            Q(first_name__icontains=query) |
            Q(last_name__icontains=query) |
            Q(email__icontains=query) |
            Q(phone__icontains=query) |
            Q(company__icontains=query)
        )

class OrderQuerySet(models.QuerySet):
    """QuerySet optimisé pour les commandes"""
    
    def with_client_and_items(self):
        """Précharge le client et les items"""
        return self.select_related('client').prefetch_related('items')
    
    def with_payment_info(self):
        """Ajoute les informations de paiement"""
        return self.annotate(
            paid_amount=Sum('payments__amount'),
            remaining_amount=models.F('total_ttc') - Sum('payments__amount'),
            payment_status=Case(
                When(
                    Q(paid_amount__gte=models.F('total_ttc')),
                    then='paid'
                ),
                When(
                    Q(paid_amount__gt=0),
                    then='partial'
                ),
                default='unpaid',
                output_field=models.CharField()
            )
        )
    
    def by_status(self, status):
        """Filtre par statut"""
        if status:
            return self.filter(status=status)
        return self
    
    def by_date_range(self, start_date, end_date):
        """Filtre par plage de dates"""
        queryset = self
        if start_date:
            queryset = queryset.filter(created_at__gte=start_date)
        if end_date:
            queryset = queryset.filter(created_at__lte=end_date)
        return queryset
    
    def with_items_summary(self):
        """Ajoute un résumé des items"""
        return self.annotate(
            items_count=Count('items'),
            total_quantity=Sum('items__quantity'),
            total_value=Sum(models.F('items__unit_price') * models.F('items__quantity'))
        )

# Managers personnalisés
class RepairManager(models.Manager):
    """Manager optimisé pour les réparations"""
    
    def get_queryset(self):
        return RepairQuerySet(self.model, using=self._db)
    
    def dashboard_stats(self):
        """Statistiques optimisées pour le dashboard"""
        return (
            self.get_queryset()
            .with_full_details()
            .with_cost_summary()
            .aggregate(
                total=Count('id'),
                pending=Count('id', filter=Q(status='pending')),
                in_progress=Count('id', filter=Q(status='in_progress')),
                completed=Count('id', filter=Q(status='completed')),
                delivered=Count('id', filter=Q(status='delivered')),
                total_value=Sum('total_cost'),
                avg_cost=Avg('total_cost')
            )
        )
    
    def kanban_data(self, store=None):
        """Données optimisées pour le Kanban"""
        queryset = self.get_queryset().with_full_details()
        if store:
            queryset = queryset.by_store(store)
        
        repairs = list(queryset.order_by('-priority', 'created_at'))
        
        # Organiser par statut
        kanban_data = {
            'pending': [],
            'in_progress': [],
            'completed': [],
            'delivered': []
        }
        
        for repair in repairs:
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
            
            if repair.status in kanban_data:
                kanban_data[repair.status].append(repair_data)
        
        return kanban_data

class ProductManager(models.Manager):
    """Manager optimisé pour les produits"""
    
    def get_queryset(self):
        return ProductQuerySet(self.model, using=self._db)
    
    def stock_alerts(self):
        """Alertes de stock optimisées"""
        return (
            self.get_queryset()
            .with_category()
            .with_stock_info()
            .filter(total_stock__lt=models.F('min_stock'))
            .order_by('stock_ratio')
        )
    
    def inventory_summary(self):
        """Résumé de l'inventaire optimisé"""
        return (
            self.get_queryset()
            .with_category()
            .with_stock_info()
            .aggregate(
                total_products=Count('id'),
                total_categories=Count('category', distinct=True),
                total_stock_value=Sum('stock_value'),
                low_stock_count=Count('id', filter=Q(total_stock__lt=models.F('min_stock'))),
                out_of_stock_count=Count('id', filter=Q(total_stock=0))
            )
        )

class ClientManager(models.Manager):
    """Manager optimisé pour les clients"""
    
    def get_queryset(self):
        return ClientQuerySet(self.model, using=self._db)
    
    def analytics_summary(self):
        """Résumé analytique optimisé"""
        return (
            self.get_queryset()
            .with_lifetime_value()
            .aggregate(
                total_clients=Count('id'),
                vip_clients=Count('id', filter=Q(lifetime_value__gte=1000)),
                avg_lifetime_value=Avg('lifetime_value'),
                total_lifetime_value=Sum('lifetime_value')
            )
        )

class OrderManager(models.Manager):
    """Manager optimisé pour les commandes"""
    
    def get_queryset(self):
        return OrderQuerySet(self.model, using=self._db)
    
    def revenue_summary(self, start_date=None, end_date=None):
        """Résumé des revenus optimisé"""
        queryset = self.get_queryset().with_payment_info()
        if start_date or end_date:
            queryset = queryset.by_date_range(start_date, end_date)
        
        return queryset.aggregate(
            total_orders=Count('id'),
            total_revenue=Sum('total_ttc'),
            paid_revenue=Sum('total_ttc', filter=Q(payment_status='paid')),
            unpaid_count=Count('id', filter=Q(payment_status='unpaid')),
            avg_order_value=Avg('total_ttc')
        )
