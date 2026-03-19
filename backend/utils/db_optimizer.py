"""
Utilitaires d'optimisation de la base de données
"""
from django.db import connection
from django.core.management.base import BaseCommand
import logging

logger = logging.getLogger(__name__)

def create_indexes():
    """Crée des index optimisés pour les performances"""
    indexes = [
        # Index pour les recherches fréquentes
        "CREATE INDEX IF NOT EXISTS idx_products_name ON products(name)",
        "CREATE INDEX IF NOT EXISTS idx_products_reference ON products(reference)",
        "CREATE INDEX IF NOT EXISTS idx_clients_email ON clients(email)",
        "CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status)",
        "CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at)",
        "CREATE INDEX IF NOT EXISTS idx_orders_client ON orders(client_id)",
        
        # Index composites pour les requêtes complexes
        "CREATE INDEX IF NOT EXISTS idx_orders_client_status ON orders(client_id, status)",
        "CREATE INDEX IF NOT EXISTS idx_products_active_visible ON products(is_active, is_visible)",
        "CREATE INDEX IF NOT EXISTS idx_order_items_product ON order_items(product_id)",
    ]
    
    with connection.cursor() as cursor:
        for index_sql in indexes:
            try:
                cursor.execute(index_sql)
                logger.info(f"Index créé: {index_sql}")
            except Exception as e:
                logger.warning(f"Index déjà existant ou erreur: {e}")

def analyze_tables():
    """Analyse les tables pour optimiser les requêtes"""
    tables = ['products', 'clients', 'orders', 'order_items', 'invoices']
    
    with connection.cursor() as cursor:
        for table in tables:
            try:
                cursor.execute(f"ANALYZE {table}")
                logger.info(f"Table analysée: {table}")
            except Exception as e:
                logger.error(f"Erreur analyse table {table}: {e}")

def vacuum_tables():
    """Nettoie les tables pour optimiser l'espace"""
    tables = ['products', 'clients', 'orders', 'order_items', 'invoices']
    
    with connection.cursor() as cursor:
        for table in tables:
            try:
                cursor.execute(f"VACUUM ANALYZE {table}")
                logger.info(f"Table nettoyée: {table}")
            except Exception as e:
                logger.error(f"Erreur VACUUM table {table}: {e}")
