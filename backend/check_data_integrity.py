#!/usr/bin/env python
"""
Script pour vérifier l'intégrité des données dans l'ERP Michel De Vélo
"""

import os
import sys
import django

# Configuration Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'bike_erp.settings')
django.setup()

from django.db import connection
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.utils import timezone

User = get_user_model()

def check_table_counts():
    """Vérifie le nombre d'enregistrements dans chaque table"""
    print("📊 Vérification des données de l'ERP Michel De Vélo")
    print("=" * 60)
    
    tables_to_check = [
        ('auth_user', 'Utilisateurs'),
        ('accounts_client', 'Clients'),
        ('products_product', 'Produits'),
        ('orders_order', 'Commandes'),
        ('appointments_appointment', 'Rendez-vous'),
        ('repairs_repair', 'Réparations'),
        ('invoices_invoice', 'Factures'),
        ('suppliers_supplier', 'Fournisseurs'),
        ('analytics_analytic', 'Analytics'),
        ('appointments_wixsynclog', 'Logs Wix Sync'),
    ]
    
    for table_name, display_name in tables_to_check:
        try:
            with connection.cursor() as cursor:
                cursor.execute(f"SELECT COUNT(*) FROM {table_name}")
                count = cursor.fetchone()[0]
                print(f"✅ {display_name:20} : {count:,} enregistrements")
        except Exception as e:
            print(f"❌ {display_name:20} : ERREUR - {str(e)}")
    
    print("=" * 60)

def check_data_quality():
    """Vérifie la qualité des données"""
    print("\n🔍 Vérification de la qualité des données")
    print("=" * 60)
    
    try:
        # Vérifier les utilisateurs
        from django.contrib.auth import get_user_model
        User = get_user_model()
        users_count = User.objects.count()
        active_users = User.objects.filter(is_active=True).count()
        print(f"✅ Utilisateurs totaux: {users_count}")
        print(f"✅ Utilisateurs actifs: {active_users}")
        
        # Vérifier les clients
        from accounts.models import Client
        clients_count = Client.objects.count()
        clients_with_email = Client.objects.exclude(email='').count()
        clients_with_phone = Client.objects.exclude(phone='').count()
        print(f"✅ Clients totaux: {clients_count}")
        print(f"✅ Clients avec email: {clients_with_email}")
        print(f"✅ Clients avec téléphone: {clients_with_phone}")
        
        # Vérifier les produits
        from products.models import Product
        products_count = Product.objects.count()
        products_with_stock = Product.objects.filter(stock__gt=0).count()
        products_with_price = Product.objects.exclude(price=0).count()
        print(f"✅ Produits totaux: {products_count}")
        print(f"✅ Produits en stock: {products_with_stock}")
        print(f"✅ Produits avec prix: {products_with_price}")
        
        # Vérifier les rendez-vous
        from appointments.models import Appointment
        appointments_count = Appointment.objects.count()
        appointments_wix = Appointment.objects.filter(source='wix').count()
        appointments_local = Appointment.objects.filter(source='local').count()
        print(f"✅ Rendez-vous totaux: {appointments_count}")
        print(f"✅ Rendez-vous Wix: {appointments_wix}")
        print(f"✅ Rendez-vous locaux: {appointments_local}")
        
        # Vérifier les commandes
        from orders.models import Order
        orders_count = Order.objects.count()
        orders_paid = Order.objects.filter(status='paid').count()
        orders_pending = Order.objects.filter(status='pending').count()
        print(f"✅ Commandes totales: {orders_count}")
        print(f"✅ Commandes payées: {orders_paid}")
        print(f"✅ Commandes en attente: {orders_pending}")
        
        # Vérifier les réparations
        from repairs.models import Repair
        repairs_count = Repair.objects.count()
        repairs_completed = Repair.objects.filter(status='completed').count()
        repairs_in_progress = Repair.objects.filter(status='in_progress').count()
        print(f"✅ Réparations totales: {repairs_count}")
        print(f"✅ Réparations terminées: {repairs_completed}")
        print(f"✅ Réparations en cours: {repairs_in_progress}")
        
    except Exception as e:
        print(f"❌ Erreur lors de la vérification de la qualité: {e}")

def check_foreign_keys():
    """Vérifie l'intégrité des clés étrangères"""
    print("\n🔗 Vérification des clés étrangères")
    print("=" * 60)
    
    try:
        # Vérifier les rendez-vous avec clients valides
        from appointments.models import Appointment
        from accounts.models import Client
        from django.contrib.auth import get_user_model
        User = get_user_model()
        
        appointments_without_client = Appointment.objects.filter(client__isnull=True).count()
        appointments_without_user = Appointment.objects.filter(created_by__isnull=True).count()
        
        print(f"✅ Rendez-vous sans client: {appointments_without_client}")
        print(f"✅ Rendez-vous sans utilisateur: {appointments_without_user}")
        
        # Vérifier les commandes avec clients valides
        from orders.models import Order
        orders_without_client = Order.objects.filter(client__isnull=True).count()
        print(f"✅ Commandes sans client: {orders_without_client}")
        
        # Vérifier les réparations avec clients valides
        from repairs.models import Repair
        repairs_without_client = Repair.objects.filter(client__isnull=True).count()
        print(f"✅ Réparations sans client: {repairs_without_client}")
        
    except Exception as e:
        print(f"❌ Erreur lors de la vérification des clés étrangères: {e}")

def check_recent_activity():
    """Vérifie l'activité récente"""
    print("\n📅 Vérification de l'activité récente")
    print("=" * 60)
    
    try:
        from django.utils import timezone
        from datetime import timedelta
        
        now = timezone.now()
        last_24h = now - timedelta(hours=24)
        last_7d = now - timedelta(days=7)
        last_30d = now - timedelta(days=30)
        
        # Activité des rendez-vous
        from appointments.models import Appointment
        appointments_24h = Appointment.objects.filter(created_at__gte=last_24h).count()
        appointments_7d = Appointment.objects.filter(created_at__gte=last_7d).count()
        appointments_30d = Appointment.objects.filter(created_at__gte=last_30d).count()
        
        print(f"✅ Rendez-vous (24h): {appointments_24h}")
        print(f"✅ Rendez-vous (7j): {appointments_7d}")
        print(f"✅ Rendez-vous (30j): {appointments_30d}")
        
        # Activité des commandes
        from orders.models import Order
        orders_24h = Order.objects.filter(created_at__gte=last_24h).count()
        orders_7d = Order.objects.filter(created_at__gte=last_7d).count()
        orders_30d = Order.objects.filter(created_at__gte=last_30d).count()
        
        print(f"✅ Commandes (24h): {orders_24h}")
        print(f"✅ Commandes (7j): {orders_7d}")
        print(f"✅ Commandes (30j): {orders_30d}")
        
    except Exception as e:
        print(f"❌ Erreur lors de la vérification de l'activité: {e}")

def check_system_health():
    """Vérifie la santé du système"""
    print("\n🏥 Vérification de la santé du système")
    print("=" * 60)
    
    try:
        # Vérifier la connexion à la base de données
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            print("✅ Connexion base de données: OK")
        
        # Vérifier les migrations
        from django.core.management import execute_from_command_line
        from io import StringIO
        out = StringIO()
        execute_from_command_line(['manage.py', 'showmigrations'], stdout=out)
        print("✅ État des migrations: OK")
        
        # Vérifier les fichiers de configuration
        if os.path.exists('.env'):
            print("✅ Fichier .env: Présent")
        else:
            print("❌ Fichier .env: Manquant")
            
    except Exception as e:
        print(f"❌ Erreur lors de la vérification système: {e}")

def main():
    """Fonction principale"""
    print("🚀 Lancement de l'audit complet de l'ERP Michel De Vélo")
    print(f"📅 Date: {timezone.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()
    
    # Exécuter toutes les vérifications
    check_table_counts()
    check_data_quality()
    check_foreign_keys()
    check_recent_activity()
    check_system_health()
    
    print("\n" + "=" * 60)
    print("🎯 Audit terminé !")
    print("📋 Prochaines étapes recommandées:")
    print("   1. Corriger les erreurs de clés étrangères")
    print("   2. Ajouter des données de test si nécessaire")
    print("   3. Configurer les synchronisations automatiques")
    print("   4. Mettre en place les sauvegardes régulières")
    print("=" * 60)

if __name__ == '__main__':
    main()
