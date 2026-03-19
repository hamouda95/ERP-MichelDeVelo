from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import get_user_model
from django.core.mail import send_mail
from django.conf import settings
from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes, force_str
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters
from utils.permissions import require_permission, get_user_permissions
from .serializers import UserSerializer, RegisterSerializer, PasswordResetRequestSerializer, PasswordResetConfirmSerializer

User = get_user_model()

class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = [AllowAny]
    serializer_class = RegisterSerializer
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        
        refresh = RefreshToken.for_user(user)
        
        return Response({
            'user': UserSerializer(user).data,
            'refresh': str(refresh),
            'access': str(refresh.access_token),
        }, status=status.HTTP_201_CREATED)

@api_view(['POST'])
@permission_classes([AllowAny])
def password_reset_request(request):
    serializer = PasswordResetRequestSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    
    email = serializer.validated_data['email']
    try:
        user = User.objects.get(email=email)
        token = default_token_generator.make_token(user)
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        
        reset_link = f"{settings.FRONTEND_URL}/reset-password/{uid}/{token}"
        
        send_mail(
            'Réinitialisation de mot de passe - ERP Vélo',
            f'Cliquez sur ce lien pour réinitialiser votre mot de passe: {reset_link}',
            settings.DEFAULT_FROM_EMAIL,
            [email],
            fail_silently=False,
        )
        
        return Response({'message': 'Email de réinitialisation envoyé.'}, status=status.HTTP_200_OK)
    except User.DoesNotExist:
        return Response({'message': 'Email envoyé si le compte existe.'}, status=status.HTTP_200_OK)

@api_view(['POST'])
@permission_classes([AllowAny])
def password_reset_confirm(request):
    serializer = PasswordResetConfirmSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    
    try:
        uid = force_str(urlsafe_base64_decode(request.data.get('uid')))
        user = User.objects.get(pk=uid)
        
        if default_token_generator.check_token(user, serializer.validated_data['token']):
            user.set_password(serializer.validated_data['password'])
            user.save()
            return Response({'message': 'Mot de passe réinitialisé avec succès.'}, status=status.HTTP_200_OK)
        else:
            return Response({'error': 'Token invalide.'}, status=status.HTTP_400_BAD_REQUEST)
    except (TypeError, ValueError, OverflowError, User.DoesNotExist):
        return Response({'error': 'Lien invalide.'}, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_current_user(request):
    """Récupérer l'utilisateur connecté avec ses permissions"""
    serializer = UserSerializer(request.user)
    user_data = serializer.data
    user_data['permissions'] = get_user_permissions(request.user)
    return Response(user_data)


class UserListView(generics.ListCreateAPIView):
    """Liste et création des utilisateurs (nécessite permission)"""
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['role', 'store_access']
    search_fields = ['first_name', 'last_name', 'email']
    
    def get_queryset(self):
        user = self.request.user
        if not user.can_manage_users:
            return User.objects.filter(id=user.id)
        return User.objects.all()
    
    def perform_create(self, serializer):
        # Seul un admin peut créer des utilisateurs avec permissions avancées
        user = self.request.user
        if not user.can_manage_users:
            serializer.save(
                store_access=user.store_access,
                can_manage_users=False,
                can_view_all_stores=False,
                can_manage_products=False,
                can_manage_clients=False,
                can_view_analytics=False
            )
        else:
            serializer.save()


class UserDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Détail et mise à jour d'un utilisateur"""
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        if user.can_manage_users:
            return User.objects.all()
        return User.objects.filter(id=user.id)
    
    def perform_update(self, serializer):
        user = self.request.user
        current_user = self.get_object()
        
        # Si l'utilisateur n'est pas admin, limiter les champs modifiables
        if not user.can_manage_users and current_user.id != user.id:
            return
        
        # Seul un admin peut modifier les permissions
        if not user.can_manage_users:
            allowed_fields = ['first_name', 'last_name', 'phone', 'avatar']
            data = {k: v for k, v in serializer.validated_data.items() if k in allowed_fields}
            serializer.save(**data)
        else:
            serializer.save()


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def update_user_permissions(request, user_id):
    """Mettre à jour les permissions d'un utilisateur"""
    # Vérifier manuellement la permission
    if not request.user.can_manage_users:
        return Response(
            {'error': 'Permission refusée', 'message': 'Vous n\'avez pas la permission de gérer les utilisateurs'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    try:
        user = User.objects.get(id=user_id)
        
        # Mettre à jour les permissions
        permissions = [
            'can_manage_users',
            'can_view_all_stores', 
            'can_manage_products',
            'can_manage_clients',
            'can_view_analytics'
        ]
        
        for perm in permissions:
            if perm in request.data:
                setattr(user, perm, request.data[perm])
        
        if 'store_access' in request.data:
            user.store_access = request.data['store_access']
        
        user.save()
        
        return Response({
            'message': 'Permissions mises à jour avec succès',
            'permissions': get_user_permissions(user)
        })
        
    except User.DoesNotExist:
        return Response(
            {'error': 'Utilisateur non trouvé'},
            status=status.HTTP_404_NOT_FOUND
        )
