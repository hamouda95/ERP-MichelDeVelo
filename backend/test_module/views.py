"""
Vues pour le module de test ERP
Test complet de toutes les fonctionnalités
"""

import json
import time
from datetime import datetime, timedelta
from django.http import JsonResponse
from django.shortcuts import render
from django.contrib.auth.decorators import login_required
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.db import connection
from django.utils import timezone

# Import des modèles
from accounts.models import CustomUser
from clients.models import Client
from products.models import Product
from orders.models import Order
from appointments.models import Appointment, WixSyncLog
from repairs.models import Repair
from invoices.models import Invoice
from suppliers.models import Supplier

# Import des services
from appointments.services import WixBookingsService

User = CustomUser


def test_dashboard(request):
    """
    Tableau de bord de test avec toutes les statistiques
    """
    context = {
        'title': 'Tableau de Bord - Test ERP',
        'module_name': 'test_module',
    }
    return render(request, 'test_module/dashboard.html', context)


def api_test(request):
    """
    Test de toutes les APIs disponibles
    """
    results = {
        'timestamp': timezone.now().isoformat(),
        'tests': {}
    }
    
    # Test API Clients
    try:
        clients = Client.objects.all()[:5]
        results['tests']['clients_api'] = {
            'status': 'success',
            'count': len(clients),
            'sample': [{'id': c.id, 'name': f"{c.first_name} {c.last_name}"} for c in clients]
        }
    except Exception as e:
        results['tests']['clients_api'] = {
            'status': 'error',
            'message': str(e)
        }
    
    # Test API Produits
    try:
        products = Product.objects.all()[:5]
        results['tests']['products_api'] = {
            'status': 'success',
            'count': len(products),
            'sample': [{'id': p.id, 'name': p.name, 'stock': p.stock} for p in products]
        }
    except Exception as e:
        results['tests']['products_api'] = {
            'status': 'error',
            'message': str(e)
        }
    
    # Test API Commandes
    try:
        orders = Order.objects.all()[:5]
        results['tests']['orders_api'] = {
            'status': 'success',
            'count': len(orders),
            'sample': [{'id': o.id, 'status': o.status, 'total': o.total} for o in orders]
        }
    except Exception as e:
        results['tests']['orders_api'] = {
            'status': 'error',
            'message': str(e)
        }
    
    # Test API Rendez-vous
    try:
        appointments = Appointment.objects.all()[:5]
        results['tests']['appointments_api'] = {
            'status': 'success',
            'count': len(appointments),
            'sample': [{'id': a.id, 'title': a.title, 'status': a.status} for a in appointments]
        }
    except Exception as e:
        results['tests']['appointments_api'] = {
            'status': 'error',
            'message': str(e)
        }
    
    # Test API Réparations
    try:
        repairs = Repair.objects.all()[:5]
        results['tests']['repairs_api'] = {
            'status': 'success',
            'count': len(repairs),
            'sample': [{'id': r.id, 'status': r.status, 'client': r.client.first_name if r.client else 'N/A'} for r in repairs]
        }
    except Exception as e:
        results['tests']['repairs_api'] = {
            'status': 'error',
            'message': str(e)
        }
    
    return JsonResponse(results)


def database_test(request):
    """
    Test complet de la base de données
    """
    results = {
        'timestamp': timezone.now().isoformat(),
        'database_tests': {}
    }
    
    # Test de connexion
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            results['database_tests']['connection'] = {
                'status': 'success',
                'message': 'Connexion à la base de données OK'
            }
    except Exception as e:
        results['database_tests']['connection'] = {
            'status': 'error',
            'message': f'Erreur de connexion: {str(e)}'
        }
    
    # Test des comptes
    try:
        tables = {
            'users': User.objects.count(),
            'clients': Client.objects.count(),
            'products': Product.objects.count(),
            'orders': Order.objects.count(),
            'appointments': Appointment.objects.count(),
            'repairs': Repair.objects.count(),
            'invoices': Invoice.objects.count(),
            'suppliers': Supplier.objects.count(),
        }
        results['database_tests']['table_counts'] = {
            'status': 'success',
            'data': tables
        }
    except Exception as e:
        results['database_tests']['table_counts'] = {
            'status': 'error',
            'message': str(e)
        }
    
    # Test des relations
    try:
        # Test des relations clients-commandes
        clients_with_orders = Client.objects.filter(orders__isnull=False).count()
        orders_with_clients = Order.objects.filter(client__isnull=False).count()
        
        # Test des relations clients-rendez-vous
        clients_with_appointments = Client.objects.filter(appointments__isnull=False).count()
        appointments_with_clients = Appointment.objects.filter(client__isnull=False).count()
        
        results['database_tests']['relations'] = {
            'status': 'success',
            'data': {
                'clients_with_orders': clients_with_orders,
                'orders_with_clients': orders_with_clients,
                'clients_with_appointments': clients_with_appointments,
                'appointments_with_clients': appointments_with_clients,
            }
        }
    except Exception as e:
        results['database_tests']['relations'] = {
            'status': 'error',
            'message': str(e)
        }
    
    return JsonResponse(results)


def wix_test(request):
    """
    Test de l'intégration Wix
    """
    results = {
        'timestamp': timezone.now().isoformat(),
        'wix_tests': {}
    }
    
    # Test du service Wix
    try:
        wix_service = WixBookingsService()
        
        # Test d'authentification
        token = wix_service.get_access_token()
        results['wix_tests']['authentication'] = {
            'status': 'success' if token else 'error',
            'message': 'Token obtenu' if token else 'Échec authentification',
            'token_preview': token[:20] + '...' if token else None
        }
        
        # Test de récupération des bookings
        bookings = wix_service.fetch_bookings(limit=3)
        results['wix_tests']['fetch_bookings'] = {
            'status': 'success',
            'count': len(bookings),
            'message': f'{len(bookings)} bookings récupérés'
        }
        
        # Test de transformation
        if bookings:
            transformed = wix_service.transform_booking_data(bookings[0])
            results['wix_tests']['transformation'] = {
                'status': 'success',
                'message': 'Transformation OK',
                'sample': {
                    'title': transformed.get('title'),
                    'client_name': transformed.get('client_name'),
                    'status': transformed.get('status')
                }
            }
        
        # Test des logs de synchronisation
        sync_logs = WixSyncLog.objects.all()[:3]
        results['wix_tests']['sync_logs'] = {
            'status': 'success',
            'count': len(sync_logs),
            'sample': [{'date': log.sync_date, 'status': log.status} for log in sync_logs]
        }
        
    except Exception as e:
        results['wix_tests']['general'] = {
            'status': 'error',
            'message': str(e)
        }
    
    return JsonResponse(results)


def auth_test(request):
    """
    Test du système d'authentification
    """
    results = {
        'timestamp': timezone.now().isoformat(),
        'auth_tests': {}
    }
    
    # Test création d'utilisateur
    try:
        test_user_data = {
            'username': f'test_user_{int(time.time())}',
            'email': f'test_{int(time.time())}@example.com',
            'first_name': 'Test',
            'last_name': 'User',
            'password': 'testpass123'
        }
        
        # Vérifier si l'utilisateur existe déjà
        existing_user = User.objects.filter(username=test_user_data['username']).exists()
        results['auth_tests']['user_creation'] = {
            'status': 'info',
            'message': f'Utilisateur test {"existe déjà" if existing_user else "peut être créé"}',
            'username': test_user_data['username']
        }
        
        # Test des permissions
        if request.user.is_authenticated:
            results['auth_tests']['current_user'] = {
                'status': 'success',
                'user_id': request.user.id,
                'username': request.user.username,
                'is_staff': request.user.is_staff,
                'is_superuser': request.user.is_superuser
            }
        else:
            results['auth_tests']['current_user'] = {
                'status': 'info',
                'message': 'Utilisateur non connecté'
            }
            
    except Exception as e:
        results['auth_tests']['user_creation'] = {
            'status': 'error',
            'message': str(e)
        }
    
    return JsonResponse(results)


def frontend_test(request):
    """
    Test de compatibilité frontend
    """
    results = {
        'timestamp': timezone.now().isoformat(),
        'frontend_tests': {}
    }
    
    # Test des en-têtes HTTP
    results['frontend_tests']['headers'] = {
        'user_agent': request.META.get('HTTP_USER_AGENT', 'Unknown'),
        'content_type': request.content_type,
        'method': request.method,
        'is_ajax': request.headers.get('X-Requested-With') == 'XMLHttpRequest'
    }
    
    # Test des cookies
    results['frontend_tests']['cookies'] = {
        'session_key': request.session.session_key,
        'cookies_count': len(request.COOKIES),
        'has_csrf': 'csrftoken' in request.COOKIES
    }
    
    # Test de réponse JSON
    if request.method == 'POST' and request.content_type == 'application/json':
        try:
            data = json.loads(request.body)
            results['frontend_tests']['json_handling'] = {
                'status': 'success',
                'message': 'JSON parsing OK',
                'received_fields': list(data.keys()) if isinstance(data, dict) else 'Not a dict'
            }
        except:
            results['frontend_tests']['json_handling'] = {
                'status': 'error',
                'message': 'JSON parsing failed'
            }
    else:
        results['frontend_tests']['json_handling'] = {
            'status': 'info',
            'message': 'No JSON data to test'
        }
    
    return JsonResponse(results)


@require_http_methods(["POST"])
@csrf_exempt
def cleanup_test_data(request):
    """
    Nettoyage des données de test
    """
    results = {
        'timestamp': timezone.now().isoformat(),
        'cleanup_results': {}
    }
    
    try:
        # Supprimer les utilisateurs de test
        test_users_deleted = User.objects.filter(username__startswith='test_user_').delete()
        results['cleanup_results']['test_users'] = {
            'status': 'success',
            'deleted': test_users_deleted[0] if test_users_deleted else 0
        }
        
        # Supprimer les clients de test
        test_clients_deleted = Client.objects.filter(email__contains='@example.com').delete()
        results['cleanup_results']['test_clients'] = {
            'status': 'success',
            'deleted': test_clients_deleted[0] if test_clients_deleted else 0
        }
        
        results['cleanup_results']['message'] = 'Nettoyage terminé avec succès'
        
    except Exception as e:
        results['cleanup_results']['error'] = {
            'status': 'error',
            'message': str(e)
        }
    
    return JsonResponse(results)
