#!/usr/bin/env python
"""
Migration SQL pour corriger la contrainte parts_needed
"""
import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'bike_erp.settings')
django.setup()

from django.db import connection

def fix_parts_needed_constraint():
    """Modifie la contrainte NOT NULL sur parts_needed"""
    cursor = connection.cursor()
    
    try:
        # Modifier la colonne pour permettre NULL
        cursor.execute("""
            ALTER TABLE repairs 
            ALTER COLUMN parts_needed DROP NOT NULL
        """)
        
        # Mettre à jour les valeurs NULL existantes
        cursor.execute("""
            UPDATE repairs 
            SET parts_needed = '[]'::jsonb 
            WHERE parts_needed IS NULL
        """)
        
        print('✅ Contrainte parts_needed modifiée avec succès')
        
    except Exception as e:
        print(f'❌ Erreur: {str(e)}')
        
    finally:
        cursor.close()

if __name__ == '__main__':
    fix_parts_needed_constraint()
