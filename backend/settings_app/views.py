from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.http import HttpResponse
import json

from .models import Store, Service, Role, SystemSetting
from .serializers import StoreSerializer, ServiceSerializer, RoleSerializer, SystemSettingSerializer

User = get_user_model()

class StoreViewSet(viewsets.ModelViewSet):
    """ViewSet pour la gestion des magasins"""
    serializer_class = StoreSerializer
    permission_classes = [IsAuthenticated]
    queryset = Store.objects.all()

class ServiceViewSet(viewsets.ModelViewSet):
    """ViewSet pour la gestion des services"""
    serializer_class = ServiceSerializer
    permission_classes = [IsAuthenticated]
    queryset = Service.objects.all()

class RoleViewSet(viewsets.ModelViewSet):
    """ViewSet pour la gestion des rôles"""
    serializer_class = RoleSerializer
    permission_classes = [IsAuthenticated]
    queryset = Role.objects.all()

class SystemSettingViewSet(viewsets.ModelViewSet):
    """ViewSet pour la gestion des paramètres système"""
    serializer_class = SystemSettingSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        # Les utilisateurs non-admin ne voient que les paramètres publics
        if not self.request.user.is_staff:
            return SystemSetting.objects.filter(is_public=True)
        return SystemSetting.objects.all()
    
    def perform_update(self, serializer):
        serializer.save(updated_by=self.request.user)

# Vues pour la configuration système
def get_settings(request):
    """Obtenir tous les paramètres système"""
    if not request.user.is_authenticated:
        return Response({'error': 'Non autorisé'}, status=401)
    
    if not request.user.is_staff:
        settings = SystemSetting.objects.filter(is_public=True)
    else:
        settings = SystemSetting.objects.all()
    
    data = {setting.key: setting.value for setting in settings}
    return Response(data)

def update_settings(request):
    """Mettre à jour les paramètres système"""
    if not request.user.is_authenticated or not request.user.is_staff:
        return Response({'error': 'Non autorisé'}, status=401)
    
    if request.method == 'POST':
        data = json.loads(request.body)
        
        for key, value in data.items():
            setting, created = SystemSetting.objects.update_or_create(
                key=key,
                defaults={'value': value, 'updated_by': request.user}
            )
        
        return Response({'message': 'Paramètres mis à jour avec succès'})
    
    return Response({'error': 'Méthode non autorisée'}, status=405)

def system_info(request):
    """Informations système"""
    if not request.user.is_authenticated:
        return Response({'error': 'Non autorisé'}, status=401)
    
    info = {
        'django_version': '4.2.7',  # À adapter selon votre version
        'python_version': '3.11+',  # À adapter
        'database': 'PostgreSQL (Supabase)',
        'api_version': '1.0.0',
        'timezone': 'Europe/Paris',
    }
    
    return Response(info)

def backup_database(request):
    """Sauvegarder la base de données"""
    if not request.user.is_authenticated or not request.user.is_staff:
        return Response({'error': 'Non autorisé'}, status=401)
    
    try:
        # Appel à la commande de backup Django
        call_command('dbbackup')
        return Response({'message': 'Sauvegarde lancée avec succès'})
    except Exception as e:
        return Response({'error': str(e)}, status=500)

def restore_database(request):
    """Restaurer la base de données"""
    if not request.user.is_authenticated or not request.user.is_staff:
        return Response({'error': 'Non autorisé'}, status=401)
    
    if request.method == 'POST' and 'backup' in request.FILES:
        backup_file = request.FILES['backup']
        
        try:
            # Logique de restauration (à implémenter selon vos besoins)
            call_command('dbrestore', backup_file)
            return Response({'message': 'Restauration lancée avec succès'})
        except Exception as e:
            return Response({'error': str(e)}, status=500)
    
    return Response({'error': 'Fichier de sauvegarde requis'}, status=400)
