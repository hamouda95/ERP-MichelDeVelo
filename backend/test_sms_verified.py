#!/usr/bin/env python
"""
Test SMS avec votre numéro personnel à vérifier
"""
import os
import sys
import django

# Setup Django
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'bike_erp.settings')
django.setup()

from repairs.sms_service import sms_service

print("=== Test SMS avec votre numéro personnel ===")
print("Pour recevoir un SMS, vous devez d'abord vérifier votre numéro sur :")
print("https://www.twilio.com/user/account/phone-numbers/verified")
print()

# Test avec votre numéro personnel (à vérifier d'abord)
your_phone = "+33745331687"  # Format international

try:
    result = sms_service.send_sms(
        to_phone=your_phone,
        message="Test SMS depuis ERP Michel De Vélo - Si vous recevez ce message, tout fonctionne !",
        store="ville_avray"
    )
    print(f"Résultat : {result}")
    
    if result['success']:
        print("✅ SMS envoyé avec succès !")
        print(f"📱 Vérifiez votre téléphone : {your_phone}")
    else:
        print(f"❌ Erreur : {result['message']}")
        print("🔧 Vérifiez votre numéro sur Twilio ou passez à un compte payant")
        
except Exception as e:
    print(f"Erreur : {e}")

print("\n=== Étapes suivantes ===")
print("1. Vérifiez votre numéro sur : https://www.twilio.com/user/account/phone-numbers/verified")
print("2. Relancez ce test")
print("3. Ou passez à un compte payant Twilio")
