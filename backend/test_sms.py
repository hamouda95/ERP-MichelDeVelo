#!/usr/bin/env python
"""
Script de test pour l'endpoint SMS
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

print("=== Test SMS Configuration ===")
print(f"SMS_ENABLED: {getattr(settings, 'SMS_ENABLED', 'NOT SET')}")
print(f"SMS_TEST_MODE: {getattr(settings, 'SMS_TEST_MODE', 'NOT SET')}")
print(f"TWILIO_ACCOUNT_SID: {getattr(settings, 'TWILIO_ACCOUNT_SID', 'NOT SET')}")
print(f"TWILIO_AUTH_TOKEN: {getattr(settings, 'TWILIO_AUTH_TOKEN', 'NOT SET')}")
print(f"TWILIO_PHONE_NUMBER: {getattr(settings, 'TWILIO_PHONE_NUMBER', 'NOT SET')}")
print()

print("=== Test SMS Service ===")
try:
    result = sms_service.send_sms(
        to_phone="+33612345678",
        message="Test message from ERP",
        store="ville_avray"
    )
    print(f"SMS Result: {result}")
except Exception as e:
    print(f"SMS Service Error: {e}")
    import traceback
    traceback.print_exc()
print()

print("=== Test Repair Data ===")
try:
    repairs = Repair.objects.all()[:3]
    for repair in repairs:
        print(f"Repair {repair.id}: {repair.reference_number}")
        print(f"  Client: {repair.client}")
        print(f"  Client Phone: {getattr(repair.client, 'phone', 'NO PHONE')}")
        print(f"  Store: {repair.store}")
        print()
except Exception as e:
    print(f"Error fetching repairs: {e}")
    import traceback
    traceback.print_exc()

print("=== Test Complete ===")
