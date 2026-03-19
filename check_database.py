#!/usr/bin/env python
"""
Script pour vérifier l'état de la base de données
"""
import os
import sys
import django

# Configuration Django
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'bike_erp.settings')
django.setup()

from django.db import connection
from suppliers.models_extended import StoreStockConfig, StockTransfer, TransferSuggestion
from products.models import Product

def check_database():
    """Vérifie l'état de la base de données"""
    print("🔍 Vérification de la base de données...")
    print("=" * 50)
    
    # Vérifier les tables
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name LIKE '%transfer%' OR table_name LIKE '%config%'
            ORDER BY table_name;
        """)
        tables = cursor.fetchall()
        
        print("📊 Tables de transferts trouvées :")
        for table in tables:
            print(f"  ✅ {table[0]}")
    
    print("\n📦 Compteurs des modèles :")
    
    # Compter les produits
    try:
        product_count = Product.objects.count()
        print(f"  🚴 Produits : {product_count}")
    except Exception as e:
        print(f"  ❌ Erreur produits : {e}")
    
    # Compter les configurations de stock
    try:
        config_count = StoreStockConfig.objects.count()
        print(f"  ⚙️ Configurations stock : {config_count}")
    except Exception as e:
        print(f"  ❌ Erreur configs : {e}")
    
    # Compter les transferts
    try:
        transfer_count = StockTransfer.objects.count()
        print(f"  🔄 Transferts : {transfer_count}")
    except Exception as e:
        print(f"  ❌ Erreur transferts : {e}")
    
    # Compter les suggestions
    try:
        suggestion_count = TransferSuggestion.objects.count()
        print(f"  💡 Suggestions : {suggestion_count}")
    except Exception as e:
        print(f"  ❌ Erreur suggestions : {e}")
    
    print("\n🎯 Test des fonctionnalités :")
    
    # Test création configuration
    try:
        if Product.objects.exists():
            product = Product.objects.first()
            config, created = StoreStockConfig.objects.get_or_create(
                product=product,
                store='ville_avray',
                defaults={
                    'min_stock': 5,
                    'max_stock': 20,
                    'priority': 1
                }
            )
            print(f"  ✅ Configuration stock : {'Créée' if created else 'Existante'}")
        else:
            print("  ⚠️ Aucun produit pour tester")
    except Exception as e:
        print(f"  ❌ Erreur test config : {e}")
    
    print("\n🏪 État des magasins :")
    
    # Vérifier les stocks par magasin
    try:
        products = Product.objects.all()[:5]  # 5 premiers produits
        
        for product in products:
            print(f"  📦 {product.name[:30]:30} | VA: {product.stock_ville_avray:3} | GA: {product.stock_garches:3} | Alert: {product.alert_stock}")
    except Exception as e:
        print(f"  ❌ Erreur stocks : {e}")
    
    print("\n🎉 Base de données vérifiée !")

if __name__ == '__main__':
    check_database()
