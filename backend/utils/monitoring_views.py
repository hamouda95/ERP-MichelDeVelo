"""
Dashboard de monitoring pour l'ERP Michel De Vélo
Affiche les métriques en temps réel et les alertes
"""
from django.shortcuts import render
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from django.contrib.auth.decorators import login_required
from django.core.cache import cache
from django.utils import timezone
from datetime import datetime, timedelta
import json
import psutil

@login_required
@require_http_methods(["GET"])
def monitoring_dashboard(request):
    """Dashboard de monitoring principal"""
    
    # Récupérer les métriques de performance
    performance_metrics = get_performance_metrics()
    
    # Récupérer les métriques de sécurité
    security_metrics = get_security_metrics()
    
    # Récupérer les métriques système
    system_metrics = get_system_metrics()
    
    # Récupérer les erreurs récentes
    recent_errors = get_recent_errors()
    
    context = {
        'performance_metrics': performance_metrics,
        'security_metrics': security_metrics,
        'system_metrics': system_metrics,
        'recent_errors': recent_errors,
        'last_updated': timezone.now().isoformat()
    }
    
    return render(request, 'monitoring/dashboard.html', context)

@login_required
@require_http_methods(["GET"])
def performance_metrics_api(request):
    """API pour les métriques de performance"""
    
    # Paramètres de filtrage
    hours = int(request.GET.get('hours', 24))
    endpoint_type = request.GET.get('endpoint', 'all')
    
    metrics = get_performance_metrics(hours=hours, endpoint_type=endpoint_type)
    
    return JsonResponse({'data': metrics})

@login_required
@require_http_methods(["GET"])
def security_events_api(request):
    """API pour les événements de sécurité"""
    
    # Paramètres de filtrage
    days = int(request.GET.get('days', 7))
    event_type = request.GET.get('type', 'all')
    
    events = get_security_events(days=days, event_type=event_type)
    
    return JsonResponse({'data': events})

@login_required
@require_http_methods(["GET"])
def system_health_api(request):
    """API pour l'état de santé du système"""
    
    health_status = {
        'status': 'healthy',
        'timestamp': timezone.now().isoformat(),
        'checks': {
            'database': check_database_health(),
            'cache': check_cache_health(),
            'disk_space': check_disk_space(),
            'memory': check_memory_usage(),
            'cpu': check_cpu_usage()
        }
    }
    
    # Déterminer le statut global
    unhealthy_checks = [check for check in health_status['checks'].values() 
                       if check['status'] != 'healthy']
    
    if unhealthy_checks:
        health_status['status'] = 'degraded' if len(unhealthy_checks) < 3 else 'unhealthy'
        health_status['issues'] = unhealthy_checks
    
    return JsonResponse(health_status)

def get_performance_metrics(hours=24, endpoint_type='all'):
    """Récupère les métriques de performance"""
    
    metrics = {
        'requests_per_minute': [],
        'response_times': [],
        'error_rates': [],
        'memory_usage': [],
        'endpoint_breakdown': {}
    }
    
    # Récupérer les métriques des dernières heures
    end_time = timezone.now()
    start_time = end_time - timedelta(hours=hours)
    
    current_time = start_time
    while current_time <= end_time:
        cache_key = f"perf_metrics_{current_time.strftime('%Y%m%d%H%M')}"
        minute_metrics = cache.get(cache_key, [])
        
        if minute_metrics:
            # Agréger par minute
            total_requests = len(minute_metrics)
            avg_response_time = sum(m['duration_ms'] for m in minute_metrics) / total_requests if total_requests > 0 else 0
            error_count = len([m for m in minute_metrics if m['status_code'] >= 400])
            error_rate = (error_count / total_requests * 100) if total_requests > 0 else 0
            avg_memory = sum(m['memory_usage_mb'] for m in minute_metrics) / total_requests if total_requests > 0 else 0
            
            metrics['requests_per_minute'].append({
                'timestamp': current_time.isoformat(),
                'count': total_requests
            })
            
            metrics['response_times'].append({
                'timestamp': current_time.isoformat(),
                'avg_ms': round(avg_response_time, 2),
                'p95_ms': calculate_percentile([m['duration_ms'] for m in minute_metrics], 95)
            })
            
            metrics['error_rates'].append({
                'timestamp': current_time.isoformat(),
                'percentage': round(error_rate, 2)
            })
            
            metrics['memory_usage'].append({
                'timestamp': current_time.isoformat(),
                'avg_mb': round(avg_memory, 2)
            })
            
            # Breakdown par endpoint
            for metric in minute_metrics:
                if endpoint_type == 'all' or metric.get('endpoint_type') == endpoint_type:
                    endpoint = metric['endpoint_type']
                    if endpoint not in metrics['endpoint_breakdown']:
                        metrics['endpoint_breakdown'][endpoint] = {
                            'count': 0,
                            'avg_response_time': 0,
                            'error_rate': 0
                        }
                    
                    ep_metrics = metrics['endpoint_breakdown'][endpoint]
                    ep_metrics['count'] += 1
                    ep_metrics['avg_response_time'] = (
                        (ep_metrics['avg_response_time'] + metric['duration_ms']) / 2
                    )
                    if metric['status_code'] >= 400:
                        ep_metrics['error_rate'] = (
                            (ep_metrics['error_rate'] + 1) / ep_metrics['count'] * 100
                        )
        
        current_time += timedelta(minutes=1)
    
    return metrics

def get_security_events(days=7, event_type='all'):
    """Récupère les événements de sécurité"""
    
    events = []
    current_date = timezone.now().date()
    
    for i in range(days):
        cache_key = f"security_events_{(current_date - timedelta(days=i)).strftime('%Y%m%d')}"
        day_events = cache.get(cache_key, [])
        
        for event in day_events:
            if event_type == 'all' or event['event_type'] == event_type:
                events.append(event)
    
    return sorted(events, key=lambda x: x['timestamp'], reverse=True)

def get_system_metrics():
    """Récupère les métriques système"""
    
    # Utilisation CPU
    cpu_percent = psutil.cpu_percent(interval=1)
    cpu_cores = psutil.cpu_count()
    
    # Utilisation mémoire
    memory = psutil.virtual_memory()
    
    # Utilisation disque
    disk = psutil.disk_usage('/')
    disk_percent = (disk.used / disk.total) * 100
    
    # Information réseau
    network = psutil.net_io_counters()
    
    # Information processus Django
    django_process = psutil.Process()
    
    return {
        'cpu': {
            'usage_percent': cpu_percent,
            'cores': cpu_cores,
            'load_average': psutil.getloadavg() if hasattr(psutil, 'getloadavg') else None
        },
        'memory': {
            'total_gb': round(memory.total / 1024 / 1024 / 1024, 2),
            'used_gb': round(memory.used / 1024 / 1024 / 1024, 2),
            'available_gb': round(memory.available / 1024 / 1024 / 1024, 2),
            'usage_percent': memory.percent
        },
        'disk': {
            'total_gb': round(disk.total / 1024 / 1024 / 1024, 2),
            'used_gb': round(disk.used / 1024 / 1024 / 1024, 2),
            'free_gb': round(disk.free / 1024 / 1024 / 1024, 2),
            'usage_percent': disk_percent
        },
        'network': {
            'bytes_sent': network.bytes_sent,
            'bytes_recv': network.bytes_recv,
            'packets_sent': network.packets_sent,
            'packets_recv': network.packets_recv
        },
        'django_process': {
            'pid': django_process.pid,
            'memory_mb': round(django_process.memory_info().rss / 1024 / 1024, 2),
            'cpu_percent': django_process.cpu_percent(),
            'threads': django_process.num_threads(),
            'create_time': django_process.create_time()
        }
    }

def get_recent_errors(hours=24):
    """Récupère les erreurs récentes"""
    
    errors = []
    current_date = timezone.now().date()
    
    for i in range(hours // 24 + 1):  # Inclure aujourd'hui et les jours précédents
        cache_key = f"errors_{(current_date - timedelta(days=i)).strftime('%Y%m%d')}"
        day_errors = cache.get(cache_key, [])
        
        for error in day_errors:
            error_time = datetime.fromisoformat(error['timestamp'])
            if timezone.now() - error_time <= timedelta(hours=hours):
                errors.append(error)
    
    return sorted(errors, key=lambda x: x['timestamp'], reverse=True)[:50]  # Limiter à 50 erreurs

def check_database_health():
    """Vérifie la santé de la base de données"""
    try:
        from django.db import connection
        
        # Test de connexion simple
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            result = cursor.fetchone()
        
        # Informations sur la base de données
        db_info = {
            'status': 'healthy',
            'connection_time': 'OK',
            'engine': connection.vendor,
            'name': connection.settings_dict.get('NAME', 'unknown')
        }
        
        # Vérifier les connexions actives
        if hasattr(connection, 'connection') and connection.connection:
            db_info['active_connections'] = getattr(connection.connection, 'thread_id', None)
        
        return db_info
        
    except Exception as e:
        return {
            'status': 'unhealthy',
            'error': str(e),
            'connection_time': 'Failed'
        }

def check_cache_health():
    """Vérifie la santé du cache Redis"""
    try:
        # Test d'écriture/lecture
        test_key = 'health_check_test'
        test_value = f"test_{timezone.now().isoformat()}"
        
        cache.set(test_key, test_value, timeout=10)
        retrieved_value = cache.get(test_key)
        cache.delete(test_key)
        
        if retrieved_value == test_value:
            return {
                'status': 'healthy',
                'response_time': 'OK',
                'backend': 'Redis'
            }
        else:
            return {
                'status': 'unhealthy',
                'error': 'Cache read/write test failed'
            }
            
    except Exception as e:
        return {
            'status': 'unhealthy',
            'error': str(e),
            'backend': 'Redis'
        }

def check_disk_space():
    """Vérifie l'espace disque disponible"""
    disk = psutil.disk_usage('/')
    
    free_percent = (disk.free / disk.total) * 100
    
    if free_percent < 5:  # Moins de 5% libre
        return {
            'status': 'critical',
            'free_percent': round(free_percent, 2),
            'free_gb': round(disk.free / 1024 / 1024 / 1024, 2)
        }
    elif free_percent < 10:  # Moins de 10% libre
        return {
            'status': 'warning',
            'free_percent': round(free_percent, 2),
            'free_gb': round(disk.free / 1024 / 1024 / 1024, 2)
        }
    else:
        return {
            'status': 'healthy',
            'free_percent': round(free_percent, 2),
            'free_gb': round(disk.free / 1024 / 1024 / 1024, 2)
        }

def check_memory_usage():
    """Vérifie l'utilisation mémoire"""
    memory = psutil.virtual_memory()
    
    if memory.percent > 90:
        return {
            'status': 'critical',
            'usage_percent': memory.percent,
            'available_gb': round(memory.available / 1024 / 1024 / 1024, 2)
        }
    elif memory.percent > 80:
        return {
            'status': 'warning',
            'usage_percent': memory.percent,
            'available_gb': round(memory.available / 1024 / 1024 / 1024, 2)
        }
    else:
        return {
            'status': 'healthy',
            'usage_percent': memory.percent,
            'available_gb': round(memory.available / 1024 / 1024 / 1024, 2)
        }

def check_cpu_usage():
    """Vérifie l'utilisation CPU"""
    cpu_percent = psutil.cpu_percent(interval=1)
    
    if cpu_percent > 90:
        return {
            'status': 'critical',
            'usage_percent': cpu_percent,
            'cores': psutil.cpu_count()
        }
    elif cpu_percent > 80:
        return {
            'status': 'warning',
            'usage_percent': cpu_percent,
            'cores': psutil.cpu_count()
        }
    else:
        return {
            'status': 'healthy',
            'usage_percent': cpu_percent,
            'cores': psutil.cpu_count()
        }

def calculate_percentile(values, percentile):
    """Calcule le percentile d'une liste de valeurs"""
    if not values:
        return 0
    
    sorted_values = sorted(values)
    index = (percentile / 100) * (len(sorted_values) - 1)
    
    return sorted_values[int(index)]
