"""
Utilitaires de permissions pour l'ERP
"""
from functools import wraps
from django.http import JsonResponse
from rest_framework import status

def require_permission(permission_name):
    """
    Décorateur pour vérifier une permission spécifique
    """
    def decorator(view_func):
        @wraps(view_func)
        def wrapper(request, *args, **kwargs):
            user = request.user
            
            # Vérifier si l'utilisateur a la permission
            if not hasattr(user, permission_name):
                return JsonResponse({
                    'error': 'Permission refusée',
                    'message': f'Vous n\'avez pas la permission {permission_name}'
                }, status=status.HTTP_403_FORBIDDEN)
            
            if not getattr(user, permission_name, False):
                return JsonResponse({
                    'error': 'Permission refusée',
                    'message': f'Vous n\'avez pas la permission {permission_name}'
                }, status=status.HTTP_403_FORBIDDEN)
            
            return view_func(request, *args, **kwargs)
        return wrapper
    return decorator

def require_store_access(store_param='store'):
    """
    Décorateur pour vérifier l'accès à un magasin
    """
    def decorator(view_func):
        @wraps(view_func)
        def wrapper(request, *args, **kwargs):
            user = request.user
            
            # Récupérer le magasin depuis les paramètres
            store = kwargs.get(store_param) or request.data.get(store_param)
            
            if not store:
                return JsonResponse({
                    'error': 'Magasin non spécifié',
                    'message': 'Le magasin doit être spécifié'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Vérifier si l'utilisateur peut accéder à ce magasin
            if not user.can_access_store(store):
                return JsonResponse({
                    'error': 'Accès refusé',
                    'message': f'Vous n\'avez pas accès au magasin {store}'
                }, status=status.HTTP_403_FORBIDDEN)
            
            return view_func(request, *args, **kwargs)
        return wrapper
    return decorator

def filter_by_store(queryset, user, store_field='store'):
    """
    Filtre un queryset par magasin selon les permissions de l'utilisateur
    """
    if user.can_view_all_stores or user.store_access == 'both':
        return queryset
    
    return queryset.filter(**{store_field: user.store_access})

def get_user_permissions(user):
    """
    Retourne les permissions de l'utilisateur sous forme de dictionnaire
    """
    return {
        'role': user.role,
        'store_access': user.store_access,
        'can_manage_users': user.can_manage_users,
        'can_view_all_stores': user.can_view_all_stores,
        'can_manage_products': user.can_manage_products,
        'can_manage_clients': user.can_manage_clients,
        'can_view_analytics': user.can_view_analytics,
        'accessible_stores': user.get_accessible_stores()
    }
