"""
Services de cache optimisés pour l'ERP Michel De Vélo
Utilise Redis pour un accès rapide aux données fréquemment utilisées
"""
from django.core.cache import cache
from django.conf import settings
from django.utils import timezone
from datetime import timedelta
import json
import logging

logger = logging.getLogger(__name__)

class CacheService:
    """Service centralisé pour la gestion du cache"""
    
    # Durées de cache en secondes
    DURATIONS = {
        'SHORT': 300,      # 5 minutes - données très volatiles
        'MEDIUM': 1800,    # 30 minutes - données moyennement volatiles
        'LONG': 7200,      # 2 heures - données stables
        'DAILY': 86400,   # 24 heures - données quotidiennes
    }
    
    @classmethod
    def get(cls, key, default=None):
        """Récupérer une valeur du cache"""
        try:
            value = cache.get(key)
            if value is not None:
                logger.debug(f"Cache HIT: {key}")
                return value
            logger.debug(f"Cache MISS: {key}")
            return default
        except Exception as e:
            logger.error(f"Cache get error for {key}: {e}")
            return default
    
    @classmethod
    def set(cls, key, value, duration='MEDIUM'):
        """Définir une valeur dans le cache"""
        try:
            timeout = cls.DURATIONS.get(duration, cls.DURATIONS['MEDIUM'])
            cache.set(key, value, timeout)
            logger.debug(f"Cache SET: {key} (duration: {duration})")
        except Exception as e:
            logger.error(f"Cache set error for {key}: {e}")
    
    @classmethod
    def delete(cls, key):
        """Supprimer une valeur du cache"""
        try:
            cache.delete(key)
            logger.debug(f"Cache DELETE: {key}")
        except Exception as e:
            logger.error(f"Cache delete error for {key}: {e}")
    
    @classmethod
    def clear_pattern(cls, pattern):
        """Supprimer toutes les clés correspondant à un pattern"""
        try:
            from django.core.cache.backends.redis import RedisCache
            if isinstance(cache, RedisCache):
                # Utiliser les commandes Redis directement
                client = cache._client
                keys = client.keys(f"*{pattern}*")
                if keys:
                    client.delete(*keys)
                    logger.debug(f"Cache CLEAR PATTERN: {pattern} ({len(keys)} keys)")
        except Exception as e:
            logger.error(f"Cache clear pattern error for {pattern}: {e}")
    
    @classmethod
    def get_or_set(cls, key, func, duration='MEDIUM', *args, **kwargs):
        """Récupérer du cache ou exécuter la fonction et mettre en cache"""
        value = cls.get(key)
        if value is None:
            value = func(*args, **kwargs)
            cls.set(key, value, duration)
        return value

class RepairCacheService(CacheService):
    """Service de cache spécialisé pour les réparations"""
    
    @classmethod
    def get_repairs_list(cls, filters=None):
        """Cache pour la liste des réparations"""
        cache_key = f"repairs_list_{json.dumps(filters or {}, sort_keys=True)}"
        return cls.get_or_set(
            cache_key,
            lambda: cls._fetch_repairs_from_db(filters),
            'MEDIUM'
        )
    
    @classmethod
    def get_repair_details(cls, repair_id):
        """Cache pour les détails d'une réparation"""
        cache_key = f"repair_details_{repair_id}"
        return cls.get_or_set(
            cache_key,
            lambda: cls._fetch_repair_details_from_db(repair_id),
            'SHORT'
        )
    
    @classmethod
    def get_kanban_data(cls, store=None):
        """Cache pour les données Kanban"""
        cache_key = f"kanban_data_{store or 'all'}"
        return cls.get_or_set(
            cache_key,
            lambda: cls._fetch_kanban_data_from_db(store),
            'SHORT'
        )
    
    @classmethod
    def get_dashboard_stats(cls):
        """Cache pour les statistiques du dashboard"""
        cache_key = "dashboard_stats"
        return cls.get_or_set(
            cache_key,
            lambda: cls._fetch_dashboard_stats_from_db(),
            'MEDIUM'
        )
    
    @classmethod
    def invalidate_repair_cache(cls, repair_id=None):
        """Invalider les caches liés aux réparations"""
        if repair_id:
            cls.delete(f"repair_details_{repair_id}")
        
        # Invalider les caches de liste
        cls.clear_pattern("repairs_list")
        cls.clear_pattern("kanban_data")
        cls.delete("dashboard_stats")
        
        logger.info(f"Invalidated repair caches for repair {repair_id or 'all'}")
    
    @staticmethod
    def _fetch_repairs_from_db(filters):
        """Récupérer les réparations depuis la DB"""
        from repairs.models import Repair
        from django.db.models import Q
        
        queryset = Repair.objects.select_related(
            'client', 'assigned_to'
        ).prefetch_related('items', 'timeline')
        
        if filters:
            if filters.get('status'):
                queryset = queryset.filter(status=filters['status'])
            if filters.get('store'):
                queryset = queryset.filter(store=filters['store'])
            if filters.get('priority'):
                queryset = queryset.filter(priority=filters['priority'])
        
        return list(queryset.order_by('-created_at'))
    
    @staticmethod
    def _fetch_repair_details_from_db(repair_id):
        """Récupérer les détails d'une réparation depuis la DB"""
        from repairs.models import Repair
        
        try:
            return Repair.objects.select_related(
                'client', 'assigned_to'
            ).prefetch_related('items', 'timeline', 'documents').get(
                id=repair_id
            )
        except Repair.DoesNotExist:
            return None
    
    @staticmethod
    def _fetch_kanban_data_from_db(store):
        """Récupérer les données Kanban depuis la DB"""
        from repairs.models import Repair
        from django.db.models import Count
        
        repairs = RepairCacheService._fetch_repairs_from_db({'store': store} if store else None)
        
        kanban_data = {
            'pending': [],
            'in_progress': [],
            'completed': [],
            'delivered': []
        }
        
        for repair in repairs:
            if repair.status in kanban_data:
                kanban_data[repair.status].append({
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
                })
        
        return kanban_data
    
    @staticmethod
    def _fetch_dashboard_stats_from_db():
        """Récupérer les statistiques du dashboard depuis la DB"""
        from django.db.models import Count, Sum, Q
        from repairs.models import Repair
        from orders.models import Order
        from products.models import Product
        
        today = timezone.now().date()
        month_start = today.replace(day=1)
        
        return {
            'total_repairs': Repair.objects.count(),
            'repairs_this_month': Repair.objects.filter(created_at__gte=month_start).count(),
            'pending_repairs': Repair.objects.filter(status='pending').count(),
            'completed_repairs': Repair.objects.filter(status='completed').count(),
            'total_orders': Order.objects.count(),
            'orders_this_month': Order.objects.filter(created_at__gte=month_start).count(),
            'low_stock_products': Product.objects.filter(
                total_stock__lt=10
            ).count(),
            'total_products': Product.objects.count(),
        }

class ProductCacheService(CacheService):
    """Service de cache pour les produits"""
    
    @classmethod
    def get_products_list(cls, category=None, search=None):
        """Cache pour la liste des produits"""
        cache_key = f"products_list_{category or 'all'}_{search or ''}"
        return cls.get_or_set(
            cache_key,
            lambda: cls._fetch_products_from_db(category, search),
            'MEDIUM'
        )
    
    @classmethod
    def get_low_stock_products(cls):
        """Cache pour les produits en stock faible"""
        cache_key = "low_stock_products"
        return cls.get_or_set(
            cache_key,
            lambda: cls._fetch_low_stock_from_db(),
            'SHORT'
        )
    
    @classmethod
    def invalidate_product_cache(cls):
        """Invalider les caches de produits"""
        cls.clear_pattern("products_list")
        cls.delete("low_stock_products")
        logger.info("Invalidated product caches")
    
    @staticmethod
    def _fetch_products_from_db(category, search):
        """Récupérer les produits depuis la DB"""
        from products.models import Product
        from django.db.models import Q
        
        queryset = Product.objects.select_related('category')
        
        if category:
            queryset = queryset.filter(category_id=category)
        
        if search:
            queryset = queryset.filter(
                Q(name__icontains=search) |
                Q(description__icontains=search) |
                Q(reference__icontains=search)
            )
        
        return list(queryset.order_by('name'))
    
    @staticmethod
    def _fetch_low_stock_from_db():
        """Récupérer les produits en stock faible depuis la DB"""
        from products.models import Product
        
        return list(Product.objects.filter(
            total_stock__lt=10
        ).order_by('total_stock')[:50])

# Service de cache pour les données client
class ClientCacheService(CacheService):
    """Service de cache pour les clients"""
    
    @classmethod
    def get_clients_list(cls, search=None):
        """Cache pour la liste des clients"""
        cache_key = f"clients_list_{search or ''}"
        return cls.get_or_set(
            cache_key,
            lambda: cls._fetch_clients_from_db(search),
            'MEDIUM'
        )
    
    @classmethod
    def get_client_details(cls, client_id):
        """Cache pour les détails d'un client"""
        cache_key = f"client_details_{client_id}"
        return cls.get_or_set(
            cache_key,
            lambda: cls._fetch_client_details_from_db(client_id),
            'LONG'
        )
    
    @classmethod
    def invalidate_client_cache(cls, client_id=None):
        """Invalider les caches de clients"""
        if client_id:
            cls.delete(f"client_details_{client_id}")
        
        cls.clear_pattern("clients_list")
        logger.info(f"Invalidated client caches for client {client_id or 'all'}")
    
    @staticmethod
    def _fetch_clients_from_db(search):
        """Récupérer les clients depuis la DB"""
        from clients.models import Client
        from django.db.models import Q
        
        queryset = Client.objects.all()
        
        if search:
            queryset = queryset.filter(
                Q(first_name__icontains=search) |
                Q(last_name__icontains=search) |
                Q(email__icontains=search) |
                Q(phone__icontains=search)
            )
        
        return list(queryset.order_by('last_name', 'first_name'))
    
    @staticmethod
    def _fetch_client_details_from_db(client_id):
        """Récupérer les détails d'un client depuis la DB"""
        from clients.models import Client
        
        try:
            return Client.objects.prefetch_related('repairs', 'orders').get(id=client_id)
        except Client.DoesNotExist:
            return None
