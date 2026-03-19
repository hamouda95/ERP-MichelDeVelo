#!/usr/bin/env python
"""
Vérification du champ parts_needed dans la base de données
"""
import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'bike_erp.settings')
django.setup()

from django.db import connection

def check_parts_field():
    """Vérifie les colonnes contenant 'parts' dans la table repairs"""
    cursor = connection.cursor()
    cursor.execute("""
        SELECT column_name, is_nullable, data_type 
        FROM information_schema.columns 
        WHERE table_name = %s 
        AND column_name LIKE %s 
        ORDER BY ordinal_position
    """, ['repairs', '%parts%'])
    
    columns = cursor.fetchall()
    print('Colonnes contenant "parts" dans la table repairs:')
    for col in columns:
        print(f'  {col[0]}: {col[2]} (nullable: {col[1]})')

if __name__ == '__main__':
    check_parts_field()
