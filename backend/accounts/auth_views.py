"""
Vue personnalisée pour l'authentification avec email/mot de passe
"""
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from django.contrib.auth import get_user_model
from django.utils.translation import gettext_lazy as _

User = get_user_model()

@api_view(['POST'])
@permission_classes([AllowAny])
def custom_token_obtain(request):
    """
    Vue personnalisée pour obtenir un token JWT avec email ou username
    Accepte soit l'email soit le username comme identifiant
    """
    email = request.data.get('email')
    username = request.data.get('username')
    password = request.data.get('password')
    
    if not password:
        return Response(
            {'error': 'Le mot de passe est requis'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Déterminer l'identifiant (email ou username)
    identifier = email or username
    
    if not identifier:
        return Response(
            {'error': 'L\'identifiant est requis'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Essayer d'authentifier avec username
    user = None
    
    # D'abord essayer avec le username directement
    user = authenticate(username=identifier, password=password)
    
    # Si ça ne marche pas, essayer avec l'email
    if not user:
        try:
            user_obj = User.objects.get(email=identifier)
            user = authenticate(username=user_obj.username, password=password)
        except User.DoesNotExist:
            pass
    
    if user:
        if not user.is_active:
            return Response(
                {'error': 'Ce compte est désactivé'},
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        # Générer les tokens
        refresh = RefreshToken.for_user(user)
        
        return Response({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'role': user.role,
                'store_access': user.store_access,
                'is_staff': user.is_staff,
                'is_superuser': user.is_superuser
            }
        })
    
    return Response(
        {'error': 'Identifiant ou mot de passe incorrect'},
        status=status.HTTP_401_UNAUTHORIZED
    )

@api_view(['GET'])
def current_user_info(request):
    """
    Retourne les informations de l'utilisateur connecté
    """
    if request.user.is_authenticated:
        return Response({
            'id': request.user.id,
            'username': request.user.username,
            'email': request.user.email,
            'first_name': request.user.first_name,
            'last_name': request.user.last_name,
            'role': request.user.role,
            'store_access': request.user.store_access,
            'is_staff': request.user.is_staff,
            'is_superuser': request.user.is_superuser,
            'phone': request.user.phone,
            'can_manage_users': request.user.can_manage_users,
            'can_view_all_stores': request.user.can_view_all_stores,
            'can_manage_products': request.user.can_manage_products,
            'can_manage_clients': request.user.can_manage_clients,
            'can_view_analytics': request.user.can_view_analytics,
        })
    
    return Response(
        {'error': 'Non authentifié'},
        status=status.HTTP_401_UNAUTHORIZED
    )
