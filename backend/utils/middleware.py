"""
Middleware de monitoring pour l'ERP Michel De Vélo
Capture les métriques de performance et d'utilisation
"""
import time
import logging
import psutil
from django.utils.deprecation import MiddlewareMixin
from django.http import JsonResponse
from django.core.cache import cache
from django.conf import settings
import json
from datetime import datetime

logger = logging.getLogger('performance')

class PerformanceMonitoringMiddleware(MiddlewareMixin):
    """Middleware pour le monitoring des performances"""
    
    def __init__(self, get_response):
        self.get_response = get_response
        self.start_time = None
        
    def process_request(self, request):
        """Capture le début de la requête"""
        self.start_time = time.time()
        request.start_time = self.start_time
        
        # Ajouter des métriques à la requête
        request.performance_metrics = {
            'start_time': self.start_time,
            'memory_start': psutil.Process().memory_info().rss / 1024 / 1024,  # MB
        }
        
        return None
    
    def process_response(self, request, response):
        """Capture la fin de la requête et calcule les métriques"""
        if not hasattr(request, 'start_time'):
            return response
        
        # Calculer les métriques de performance
        duration = time.time() - request.start_time
        memory_end = psutil.Process().memory_info().rss / 1024 / 1024  # MB
        memory_delta = memory_end - request.performance_metrics['memory_start']
        
        # Métriques de base
        metrics = {
            'timestamp': datetime.utcnow().isoformat(),
            'method': request.method,
            'path': request.path,
            'status_code': response.status_code,
            'duration_ms': round(duration * 1000, 2),
            'memory_usage_mb': round(memory_end, 2),
            'memory_delta_mb': round(memory_delta, 2),
            'user_agent': request.META.get('HTTP_USER_AGENT', '')[:200],
            'ip_address': self.get_client_ip(request),
            'response_size': len(response.content) if hasattr(response, 'content') else 0
        }
        
        # Ajouter les métriques spécifiques à l'API
        if request.path.startswith('/api/'):
            self._capture_api_metrics(request, response, metrics)
        
        # Stocker les métriques dans le cache pour l'analyse
        self._store_metrics(metrics)
        
        # Ajouter les headers de monitoring en développement
        if settings.DEBUG:
            response['X-Response-Time'] = f"{metrics['duration_ms']}ms"
            response['X-Memory-Usage'] = f"{metrics['memory_usage_mb']}MB"
        
        return response
    
    def get_client_ip(self, request):
        """Récupère l'IP client en tenant compte des proxies"""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            return x_forwarded_for.split(',')[0].strip()
        
        x_real_ip = request.META.get('HTTP_X_REAL_IP')
        if x_real_ip:
            return x_real_ip
        
        return request.META.get('REMOTE_ADDR', '')
    
    def _capture_api_metrics(self, request, response, metrics):
        """Capture les métriques spécifiques à l'API"""
        # Identifier le type d'endpoint
        endpoint_type = self._classify_endpoint(request.path)
        metrics['endpoint_type'] = endpoint_type
        
        # Capturer les erreurs d'API
        if response.status_code >= 400:
            metrics['error_type'] = self._classify_error(response.status_code)
            if hasattr(response, 'content'):
                try:
                    error_content = json.loads(response.content.decode('utf-8'))
                    metrics['error_message'] = error_content.get('error', 'Unknown error')
                except:
                    metrics['error_message'] = 'Parse error'
        
        # Capturer les métriques de base de données
        if hasattr(request, 'db_queries'):
            metrics['db_queries'] = len(request.db_queries)
            metrics['db_time'] = sum(q['time'] for q in request.db_queries)
    
    def _classify_endpoint(self, path):
        """Classifie le type d'endpoint"""
        if '/repairs/' in path:
            return 'repairs'
        elif '/products/' in path:
            return 'products'
        elif '/clients/' in path:
            return 'clients'
        elif '/orders/' in path:
            return 'orders'
        elif '/auth/' in path:
            return 'authentication'
        else:
            return 'other'
    
    def _classify_error(self, status_code):
        """Classifie le type d'erreur"""
        if 400 <= status_code < 500:
            return 'client_error'
        elif 500 <= status_code < 600:
            return 'server_error'
        else:
            return 'unknown_error'
    
    def _store_metrics(self, metrics):
        """Stocke les métriques dans le cache Redis"""
        try:
            # Clé basée sur l'heure pour l'agrégation
            cache_key = f"perf_metrics_{datetime.utcnow().strftime('%Y%m%d%H%M')}"
            
            # Récupérer les métriques existantes
            existing_metrics = cache.get(cache_key, [])
            existing_metrics.append(metrics)
            
            # Garder seulement les 100 dernières métriques par minute
            if len(existing_metrics) > 100:
                existing_metrics = existing_metrics[-100:]
            
            # Stocker pour 1 heure
            cache.set(cache_key, existing_metrics, timeout=3600)
            
        except Exception as e:
            logger.error(f"Error storing metrics: {e}")

class DatabaseQueryMiddleware(MiddlewareMixin):
    """Middleware pour le monitoring des requêtes SQL"""
    
    def process_request(self, request):
        """Capture le début des requêtes DB"""
        from django.db import connections
        
        # Activer le monitoring des requêtes
        for connection in connections.all():
            connection.force_debug_cursor = True
        
        request.db_queries = []
        return None
    
    def process_response(self, request, response):
        """Capture et analyse les requêtes SQL"""
        from django.db import connections
        
        for connection in connections.all():
            if hasattr(connection, 'queries'):
                request.db_queries = connection.queries
        
        return response

class SecurityMonitoringMiddleware(MiddlewareMixin):
    """Middleware pour le monitoring de sécurité"""
    
    def process_request(self, request):
        """Détecte les activités suspectes"""
        # Détecter les tentatives d'injection SQL
        self._detect_sql_injection(request)
        
        # Détecter les tentatives de XSS
        self._detect_xss_attempts(request)
        
        # Détecter les tentatives de force brute
        self._detect_brute_force(request)
        
        return None
    
    def _detect_sql_injection(self, request):
        """Détecte les tentatives d'injection SQL"""
        sql_patterns = [
            "union select", "drop table", "insert into", "delete from",
            "update set", "exec(", "xp_cmdshell", "sp_executesql"
        ]
        
        # Vérifier les paramètres GET/POST
        suspicious_params = []
        
        for param_name, param_value in request.GET.items():
            if self._contains_sql_patterns(param_value, sql_patterns):
                suspicious_params.append(f"GET:{param_name}")
        
        for param_name, param_value in request.POST.items():
            if self._contains_sql_patterns(param_value, sql_patterns):
                suspicious_params.append(f"POST:{param_name}")
        
        if suspicious_params:
            self._log_security_event('sql_injection_attempt', {
                'params': suspicious_params,
                'ip': self.get_client_ip(request),
                'user_agent': request.META.get('HTTP_USER_AGENT', '')
            })
    
    def _detect_xss_attempts(self, request):
        """Détecte les tentatives XSS"""
        xss_patterns = [
            "<script", "javascript:", "onload=", "onerror=",
            "onclick=", "onmouseover=", "vbscript:"
        ]
        
        suspicious_params = []
        
        for param_name, param_value in request.GET.items():
            if self._contains_xss_patterns(param_value, xss_patterns):
                suspicious_params.append(f"GET:{param_name}")
        
        for param_name, param_value in request.POST.items():
            if self._contains_xss_patterns(param_value, xss_patterns):
                suspicious_params.append(f"POST:{param_name}")
        
        if suspicious_params:
            self._log_security_event('xss_attempt', {
                'params': suspicious_params,
                'ip': self.get_client_ip(request),
                'user_agent': request.META.get('HTTP_USER_AGENT', '')
            })
    
    def _detect_brute_force(self, request):
        """Détecte les tentatives de force brute"""
        # Compter les tentatives de connexion par IP
        ip = self.get_client_ip(request)
        cache_key = f"login_attempts_{ip}"
        
        attempts = cache.get(cache_key, 0) + 1
        cache.set(cache_key, attempts, timeout=300)  # 5 minutes
        
        if attempts > 10:  # Plus de 10 tentatives en 5 minutes
            self._log_security_event('brute_force_attempt', {
                'attempts': attempts,
                'ip': ip,
                'user_agent': request.META.get('HTTP_USER_AGENT', '')
            })
    
    def _contains_sql_patterns(self, value, patterns):
        """Vérifie si une valeur contient des patterns SQL"""
        if not isinstance(value, str):
            return False
        
        value_lower = value.lower()
        return any(pattern in value_lower for pattern in patterns)
    
    def _contains_xss_patterns(self, value, patterns):
        """Vérifie si une valeur contient des patterns XSS"""
        if not isinstance(value, str):
            return False
        
        value_lower = value.lower()
        return any(pattern in value_lower for pattern in patterns)
    
    def _log_security_event(self, event_type, details):
        """Log un événement de sécurité"""
        security_event = {
            'timestamp': datetime.utcnow().isoformat(),
            'event_type': event_type,
            'details': details
        }
        
        # Stocker l'événement de sécurité
        cache_key = f"security_events_{datetime.utcnow().strftime('%Y%m%d')}"
        existing_events = cache.get(cache_key, [])
        existing_events.append(security_event)
        
        # Garder 1000 événements par jour
        if len(existing_events) > 1000:
            existing_events = existing_events[-1000:]
        
        cache.set(cache_key, existing_events, timeout=86400)  # 24 heures
        
        # Log immédiat pour les événements critiques
        if event_type in ['sql_injection_attempt', 'brute_force_attempt']:
            logger.warning(f"Security event detected: {event_type}", extra=security_event)

class ErrorTrackingMiddleware(MiddlewareMixin):
    """Middleware pour le suivi des erreurs"""
    
    def process_exception(self, request, exception):
        """Capture et log les exceptions"""
        error_data = {
            'timestamp': datetime.utcnow().isoformat(),
            'type': type(exception).__name__,
            'message': str(exception),
            'path': request.path,
            'method': request.method,
            'user': getattr(request.user, 'email', 'anonymous') if hasattr(request, 'user') else 'anonymous',
            'ip': self.get_client_ip(request),
            'user_agent': request.META.get('HTTP_USER_AGENT', ''),
            'stack_trace': getattr(exception, '__traceback__', None)
        }
        
        # Stocker l'erreur
        cache_key = f"errors_{datetime.utcnow().strftime('%Y%m%d')}"
        existing_errors = cache.get(cache_key, [])
        existing_errors.append(error_data)
        
        # Garder 500 erreurs par jour
        if len(existing_errors) > 500:
            existing_errors = existing_errors[-500:]
        
        cache.set(cache_key, existing_errors, timeout=86400)  # 24 heures
        
        # Log immédiat
        logger.error(f"Application error: {error_data['type']}", extra=error_data)
        
        return None
