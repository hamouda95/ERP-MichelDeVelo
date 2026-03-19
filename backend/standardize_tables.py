#!/usr/bin/env python
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'bike_erp.settings')
django.setup()

from django.db import connection, transaction

print("=== STANDARDISATION DES TABLES ===\n")

# Mapping des tables existantes vers les noms Django standards
table_mapping = {
    'users': 'accounts_customuser',
    'products': 'products_product', 
    'categories': 'products_category',
    'clients': 'clients_client',
    'orders': 'orders_order',
    'order_items': 'orders_orderitem',
    'invoices': 'invoices_invoice',
    'suppliers': 'suppliers_supplier',
    'purchase_orders': 'suppliers_purchaseorder',
    'purchase_order_items': 'suppliers_purchaseorderitem',
    'repairs': 'repairs_repair',
    'repair_items': 'repairs_repairitem',
    'quotes': 'quotes_quote',
    'quote_items': 'quotes_quoteitem'
}

cursor = connection.cursor()

print("1. Vérification des tables à renommer:")
for old_name, new_name in table_mapping.items():
    cursor.execute("SELECT COUNT(*) FROM information_schema.tables WHERE table_name = %s", [old_name])
    exists = cursor.fetchone()[0] > 0
    if exists:
        cursor.execute(f"SELECT COUNT(*) FROM {old_name}")
        count = cursor.fetchone()[0]
        print(f"  📋 {old_name} → {new_name} ({count} enregistrements)")
    else:
        print(f"  ❌ {old_name} - INEXISTANTE")

print("\n2. Création des tables standards avec les données existantes:")

try:
    with transaction.atomic():
        for old_name, new_name in table_mapping.items():
            # Vérifier si la table source existe
            cursor.execute("SELECT COUNT(*) FROM information_schema.tables WHERE table_name = %s", [old_name])
            if cursor.fetchone()[0] == 0:
                print(f"  ⚠️  Table {old_name} inexistante, ignorée")
                continue
                
            # Vérifier si la table destination existe déjà
            cursor.execute("SELECT COUNT(*) FROM information_schema.tables WHERE table_name = %s", [new_name])
            if cursor.fetchone()[0] > 0:
                print(f"  ⚠️  Table {new_name} existe déjà, suppression...")
                cursor.execute(f"DROP TABLE IF EXISTS {new_name}")
            
            print(f"  🔄 Copie {old_name} → {new_name}")
            cursor.execute(f"CREATE TABLE {new_name} AS SELECT * FROM {old_name}")
            
            # Réinitialiser les séquences PostgreSQL
            cursor.execute(f"""
                SELECT setval(pg_get_serial_sequence('{new_name}', 'id'), 
                             COALESCE(MAX(id), 1), 
                             MAX(id) IS NOT NULL) 
                FROM {new_name}
            """)
            
            print(f"  ✅ {new_name} créée avec succès")
        
        print("\n3. Mise à jour des séquences Django:")
        # Recréer les séquences pour les nouvelles tables
        cursor.execute("SELECT table_name FROM information_schema.tables WHERE table_name LIKE '%customuser' OR table_name LIKE '%product' OR table_name LIKE '%client' OR table_name LIKE '%order' OR table_name LIKE '%invoice' OR table_name LIKE '%supplier' OR table_name LIKE '%repair' OR table_name LIKE '%quote'")
        django_tables = [row[0] for row in cursor.fetchall()]
        
        for table in django_tables:
            cursor.execute(f"""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = %s AND column_default LIKE 'nextval%'
            """, [table])
            serial_columns = [row[0] for row in cursor.fetchall()]
            
            for column in serial_columns:
                cursor.execute(f"""
                    SELECT setval(pg_get_serial_sequence('{table}', '{column}'), 
                                 COALESCE(MAX({column}), 1), 
                                 MAX({column}) IS NOT NULL) 
                    FROM {table}
                """)
        
        print("  ✅ Séquences mises à jour")
        
        print("\n4. Validation finale:")
        for old_name, new_name in table_mapping.items():
            cursor.execute("SELECT COUNT(*) FROM information_schema.tables WHERE table_name = %s", [new_name])
            if cursor.fetchone()[0] > 0:
                cursor.execute(f"SELECT COUNT(*) FROM {new_name}")
                count = cursor.fetchone()[0]
                print(f"  ✅ {new_name}: {count} enregistrements")
        
        print("\n🎉 Standardisation terminée avec succès!")
        
except Exception as e:
    print(f"\n❌ Erreur lors de la standardisation: {e}")
    transaction.rollback()
else:
    transaction.commit()
