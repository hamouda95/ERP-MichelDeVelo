#!/usr/bin/env python
"""
Test du service SMS Free Mobile 100% gratuit
"""
import os
import sys
import django

# Setup Django
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'bike_erp.settings')
django.setup()

from repairs.sms_free_service import free_mobile_service
from django.conf import settings

print("=== Test SMS Free Mobile (100% Gratuit) ===")
print(f"SMS_ENABLED: {getattr(settings, 'SMS_ENABLED', 'NOT SET')}")
print(f"SMS_PROVIDER: {getattr(settings, 'SMS_PROVIDER', 'NOT SET')}")
print(f"FREE_MOBILE_USER: {getattr(settings, 'FREE_MOBILE_USER', 'NOT SET')}")
print()

print("=== Test Service Free Mobile ===")
try:
    # Test avec votre numéro personnel (à configurer)
    result = free_mobile_service.send_sms(
        to_phone="+33612345678",  # Remplacez par votre numéro
        message="Test SMS gratuit depuis ERP Michel De Vélo !",
        store="ville_avray"
    )
    print(f"Résultat: {result}")
    
    if result['success']:
        print("✅ SMS envoyé avec succès via Free Mobile !")
    else:
        print(f"❌ Erreur: {result['message']}")
        print("🔧 Vérifiez votre configuration Free Mobile")
        
except Exception as e:
    print(f"❌ Erreur: {e}")
    import traceback
    traceback.print_exc()

print("\n=== Configuration Requise ===")
print("1. Avoir un abonnement Free Mobile")
print("2. Activer l'option SMS API dans votre espace client Free")
print("3. Configurer FREE_MOBILE_USER et FREE_MOBILE_API_KEY dans .env")
print("4. Mettre SMS_PROVIDER=FREE_MOBILE")
print()
print("=== Coût ===")
print("🆓 100% GRATUIT")
print("📱 Illimité (limitation raisonnable de Free)")
print("⚡ Immédiat")
