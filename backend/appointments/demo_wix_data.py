"""
Données de démonstration pour simuler des bookings Wix
Utilisé quand l'API Wix n'est pas accessible
"""

import random
from datetime import datetime, timedelta
from django.utils import timezone


def get_demo_wix_bookings():
    """
    Génère des données de démonstration pour simuler des bookings Wix
    """
    now = timezone.now()
    
    demo_bookings = [
        {
            "id": f"wix_demo_{random.randint(1000, 9999)}",
            "contactDetails": {
                "firstName": "Jean",
                "lastName": "Dupont",
                "email": "jean.dupont@email.com",
                "phone": "+33612345678"
            },
            "startDate": (now + timedelta(days=1)).isoformat(),
            "endDate": (now + timedelta(days=1, hours=1)).isoformat(),
            "status": "CONFIRMED",
            "bookingDetails": {
                "title": "Réparation Vélo de Route",
                "description": "Réparation complète du vélo de route : changement de chaîne, freins, dérailleurs"
            },
            "form": {
                "paymentStatus": "PAID"
            },
            "createdDate": (now - timedelta(days=5)).isoformat()
        },
        {
            "id": f"wix_demo_{random.randint(1000, 9999)}",
            "contactDetails": {
                "firstName": "Marie",
                "lastName": "Martin",
                "email": "marie.martin@email.com",
                "phone": "+33698765432"
            },
            "startDate": (now + timedelta(days=2)).isoformat(),
            "endDate": (now + timedelta(days=2, hours=2)).isoformat(),
            "status": "CONFIRMED",
            "bookingDetails": {
                "title": "Entretien Complet VTC",
                "description": "Entretien annuel complet : vidange, réglages, contrôle des freins"
            },
            "form": {
                "paymentStatus": "PAID"
            },
            "createdDate": (now - timedelta(days=3)).isoformat()
        },
        {
            "id": f"wix_demo_{random.randint(1000, 9999)}",
            "contactDetails": {
                "firstName": "Pierre",
                "lastName": "Dubois",
                "email": "pierre.dubois@email.com",
                "phone": "+33711223344"
            },
            "startDate": (now + timedelta(days=3)).isoformat(),
            "endDate": (now + timedelta(days=3, hours=1)).isoformat(),
            "status": "PENDING",
            "bookingDetails": {
                "title": "Diagnostic Électrique",
                "description": "Diagnostic problème batterie et assistance électrique"
            },
            "form": {
                "paymentStatus": "PENDING"
            },
            "createdDate": (now - timedelta(days=1)).isoformat()
        },
        {
            "id": f"wix_demo_{random.randint(1000, 9999)}",
            "contactDetails": {
                "firstName": "Sophie",
                "lastName": "Bernard",
                "email": "sophie.bernard@email.com",
                "phone": "+33655443322"
            },
            "startDate": (now + timedelta(days=5)).isoformat(),
            "endDate": (now + timedelta(days=5, hours=1, minutes=30)).isoformat(),
            "status": "CONFIRMED",
            "bookingDetails": {
                "title": "Installation Accessoires",
                "description": "Installation porte-bagages et éclairage avant"
            },
            "form": {
                "paymentStatus": "PAID"
            },
            "createdDate": (now - timedelta(days=7)).isoformat()
        },
        {
            "id": f"wix_demo_{random.randint(1000, 9999)}",
            "contactDetails": {
                "firstName": "Thomas",
                "lastName": "Petit",
                "email": "thomas.petit@email.com",
                "phone": "+33788776655"
            },
            "startDate": (now - timedelta(days=1)).isoformat(),
            "endDate": (now - timedelta(days=1, hours=2)).isoformat(),
            "status": "COMPLETED",
            "bookingDetails": {
                "title": "Réparation Ponctuelle",
                "description": "Changement pneu arrière et réglage dérailleur"
            },
            "form": {
                "paymentStatus": "PAID"
            },
            "createdDate": (now - timedelta(days=10)).isoformat()
        }
    ]
    
    return demo_bookings


def get_demo_wix_stats():
    """
    Génère des statistiques de démonstration
    """
    return {
        "total_bookings": 5,
        "confirmed": 3,
        "pending": 1,
        "completed": 1,
        "cancelled": 0,
        "total_revenue": 450.00,
        "upcoming_bookings": 4,
        "last_sync": timezone.now().isoformat()
    }
