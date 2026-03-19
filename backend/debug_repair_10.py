#!/usr/bin/env python
"""
Debug de la réparation 10 pour l'erreur SMS
"""
import os
import sys
import django

# Setup Django
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'bike_erp.settings')
django.setup()

from repairs.models import Repair
from repairs.sms_service import sms_service
from django.conf import settings

print("=== Debug Réparation 10 ===")
try:
    repair = Repair.objects.get(id=10)
    print(f"Réparation {repair.id}: {repair.reference_number}")
    print(f"Client: {repair.client}")
    print(f"Client Phone: {getattr(repair.client, 'phone', 'NO PHONE')}")
    print(f"Store: {repair.store}")
    print(f"Status: {repair.status}")
    print(f"Bike Brand: {repair.bike_brand}")
    print()
    
    # Test SMS avec ce numéro
    if hasattr(repair.client, 'phone') and repair.client.phone:
        phone = repair.client.phone
        print(f"Test SMS vers: {phone}")
        
        result = sms_service.send_sms(
            to_phone=phone,
            message=f"Bonjour {repair.client.first_name}, votre {repair.bike_brand} est réparé et disponible à notre atelier. Michel De Vélo",
            store=repair.store
        )
        print(f"Résultat SMS: {result}")
    else:
        print("❌ Le client n'a pas de numéro de téléphone")
        
except Repair.DoesNotExist:
    print("❌ Réparation 10 n'existe pas")
except Exception as e:
    print(f"❌ Erreur: {e}")
    import traceback
    traceback.print_exc()

print("\n=== Configuration SMS ===")
print(f"SMS_ENABLED: {getattr(settings, 'SMS_ENABLED', 'NOT SET')}")
print(f"SMS_TEST_MODE: {getattr(settings, 'SMS_TEST_MODE', 'NOT SET')}")
print(f"TWILIO_PHONE_NUMBER: {getattr(settings, 'TWILIO_PHONE_NUMBER', 'NOT SET')}")
