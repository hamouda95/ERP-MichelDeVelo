#!/usr/bin/env python
"""
Test du service Email 100% Gratuit
"""
import os
import sys
import django

# Setup Django
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'bike_erp.settings')
django.setup()

from repairs.email_service import email_service
from django.conf import settings

print("=== Test Email Notification (100% Gratuit) ===")
print(f"EMAIL_HOST: {getattr(settings, 'EMAIL_HOST', 'NOT SET')}")
print(f"EMAIL_HOST_USER: {getattr(settings, 'EMAIL_HOST_USER', 'NOT SET')}")
print(f"SMS_PROVIDER: {getattr(settings, 'SMS_PROVIDER', 'NOT SET')}")
print()

print("=== Test Service Email ===")
try:
    # Test avec votre email micheldevelo@gmail.com
    result = email_service.send_notification(
        to_email="micheldevelo@gmail.com",  # Votre email de test
        subject="🚴 Test Email - Michel De Vélo",
        message="Votre vélo est réparé et disponible !",
        client_name="Test Client",
        store="ville_avray"
    )
    print(f"Résultat: {result}")
    
    if result['success']:
        print("✅ Email envoyé avec succès !")
        print("📧 Vérifiez votre boîte de réception")
    else:
        print(f"❌ Erreur: {result['message']}")
        print("🔧 Vérifiez votre configuration Gmail")
        
except Exception as e:
    print(f"❌ Erreur: {e}")
    import traceback
    traceback.print_exc()

print("\n=== Configuration Gmail Requise ===")
print("1. Activez la 'vérification en 2 étapes' sur votre compte Gmail")
print("2. Générez un 'mot de passe d'application' :")
print("   - Allez dans : https://myaccount.google.com/apppasswords")
print("   - Sélectionnez 'Autre (nom personnalisé)'")
print("   - Tapez 'Michel De Vélo ERP'")
print("   - Copiez le mot de passe généré (16 caractères)")
print("3. Mettez ce mot de passe dans EMAIL_HOST_PASSWORD")
print()
print("=== Avantages ===")
print("🆓 100% GRATUIT - Pas de coût mensuel")
print("📧 TOUS les opérateurs - Orange, SFR, Bouygues, Free...")
print("📱 Illimité - Pas de limitation de volume")
print("🎨 Professionnel - Email HTML stylé")
print("⚡ Immédiat - Activation instantanée")
