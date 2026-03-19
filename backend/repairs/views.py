from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.conf import settings
from django.http import JsonResponse
from django.core.files.base import ContentFile
from django.utils import timezone
from .models import Repair, RepairItem
from .serializers import RepairSerializer, RepairCreateSerializer, RepairItemSerializer
from .sms_service import sms_service
from .email_service import email_service
try:
    from .sms_free_service import free_mobile_service
except ImportError:
    free_mobile_service = None
from django.http import HttpResponse
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
import io


class RepairItemViewSet(viewsets.ModelViewSet):
    """ViewSet pour la gestion des articles de réparation"""
    queryset = RepairItem.objects.select_related('repair', 'product')
    serializer_class = RepairItemSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['repair', 'item_type', 'ordered', 'received']
    search_fields = ['description', 'product__name']

    def get_queryset(self):
        queryset = super().get_queryset()
        repair_id = self.request.query_params.get('repair')
        if repair_id:
            queryset = queryset.filter(repair_id=repair_id)
        return queryset


class RepairViewSet(viewsets.ModelViewSet):
    """
    ViewSet pour gérer les réparations
    
    Endpoints:
    - GET /api/repairs/repairs/ - Liste toutes les réparations
    - POST /api/repairs/repairs/ - Créer une nouvelle réparation
    - GET /api/repairs/repairs/{id}/ - Détails d'une réparation
    - PUT /api/repairs/repairs/{id}/ - Mettre à jour une réparation
    - DELETE /api/repairs/repairs/{id}/ - Supprimer une réparation
    - POST /api/repairs/repairs/{id}/update_status/ - Changer le statut
    - POST /api/repairs/repairs/{id}/add_item/ - Ajouter un item
    - GET /api/repairs/repairs/{id}/print/ - Générer un PDF
    - GET /api/repairs/repairs/statistics/ - Statistiques
    """
    queryset = Repair.objects.select_related('client', 'assigned_to', 'created_by').prefetch_related('items')
    serializer_class = RepairSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'store', 'client', 'priority']
    search_fields = [
        'reference_number', 
        'bike_brand', 
        'bike_model', 
        'client__first_name', 
        'client__last_name',
        'description'
    ]
    ordering_fields = ['created_at', 'estimated_completion', 'actual_completion', 'priority']
    ordering = ['-created_at']
    
    def get_serializer_class(self):
        """Retourne le serializer approprié selon l'action"""
        if self.action in ['create', 'update', 'partial_update']:
            return RepairCreateSerializer
        return RepairSerializer
    
    def create(self, request, *args, **kwargs):
        """Création d'une réparation"""
        try:
            serializer = self.get_serializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            self.perform_create(serializer)
            headers = self.get_success_headers(serializer.data)
            return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)
        except Exception as e:
            import traceback
            traceback.print_exc()
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_400_BAD_REQUEST
            )
    
    def perform_create(self, serializer):
        """Création avec ajout du créateur"""
        validated_data = serializer.validated_data
        validated_data['created_by'] = self.request.user
        
        serializer.save(**validated_data)
    
    def list(self, request, *args, **kwargs):
        """Liste des réparations"""
        try:
            queryset = self.filter_queryset(self.get_queryset())
            page = self.paginate_queryset(queryset)
            if page is not None:
                serializer = self.get_serializer(page, many=True)
                return self.get_paginated_response(serializer.data)
            serializer = self.get_serializer(queryset, many=True)
            return Response(serializer.data)
        except Exception as e:
            import traceback
            traceback.print_exc()
            return Response(
                {'error': str(e), 'detail': 'Check server logs'},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    def update(self, request, *args, **kwargs):
        """Mettre à jour une réparation"""
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        
        try:
            serializer.is_valid(raise_exception=True)
            self.perform_update(serializer)
            
            # Utiliser le serializer de lecture pour la réponse
            response_serializer = RepairSerializer(serializer.instance)
            
            return Response(response_serializer.data)
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=True, methods=['post'])
    def update_status(self, request, pk=None):
        """Mettre à jour le statut d'une réparation"""
        repair = self.get_object()
        new_status = request.data.get('status')
        
        # Si new_status est un dictionnaire, extraire la valeur
        if isinstance(new_status, dict):
            new_status = new_status.get('status')
        
        # Récupérer les choix de statut valides
        valid_statuses = [choice[0] for choice in Repair.STATUS_CHOICES]
        
        if new_status not in valid_statuses:
            return Response(
                {'error': f'Statut invalide: {new_status}. Statuts valides: {valid_statuses}'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        repair.status = new_status
        
        # Si livré, enregistrer la date réelle de livraison
        if new_status == 'delivered' and not repair.actual_completion:
            from django.utils import timezone
            repair.actual_completion = timezone.now().date()
        
        repair.save()
        
        serializer = self.get_serializer(repair)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def add_item(self, request, pk=None):
        """Ajouter un article/intervention à une réparation"""
        repair = self.get_object()
        serializer = RepairItemSerializer(data=request.data)
        
        if serializer.is_valid():
            serializer.save(repair=repair)
            
            # Recalculer le coût final
            total = sum(item.total_price for item in repair.items.all())
            repair.final_cost = total
            repair.save()
            
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['post'])
    def send_sms(self, request, pk=None):
        """Envoyer un SMS au client pour notification de réparation terminée"""
        try:
            repair = self.get_object()
            
            # Debug: Vérifier les informations du client
            print(f"DEBUG: Repair {repair.id} - Client: {repair.client}")
            print(f"DEBUG: Client phone: {getattr(repair.client, 'phone', 'NO PHONE')}")
            print(f"DEBUG: SMS_ENABLED: {getattr(settings, 'SMS_ENABLED', 'NOT SET')}")
            print(f"DEBUG: SMS_TEST_MODE: {getattr(settings, 'SMS_TEST_MODE', 'NOT SET')}")
            
            if not hasattr(repair.client, 'phone') or not repair.client.phone:
                return Response(
                    {'error': 'Le client n\'a pas de numéro de téléphone'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Envoyer une notification avec le service approprié (Email, Free Mobile ou Twilio)
            message = f"Bonjour {repair.client.first_name}, votre {repair.bike_brand} est réparé et disponible à notre atelier. Michel De Vélo"
            
            # Choisir le service selon la configuration
            provider = getattr(settings, 'SMS_PROVIDER', 'TWILIO')
            
            if provider == 'EMAIL':
                # Service Email 100% gratuit
                subject = f"🚴 Votre {repair.bike_brand} est réparé !"
                notification_result = email_service.send_notification(
                    to_email=repair.client.email,
                    subject=subject,
                    message=message,
                    client_name=repair.client.first_name,
                    store=repair.store
                )
            elif provider == 'FREE_MOBILE' and free_mobile_service:
                # Service Free Mobile
                notification_result = free_mobile_service.send_sms(
                    to_phone=repair.client.phone,
                    message=message,
                    store=repair.store
                )
            else:
                # Utiliser Twilio (par défaut)
                notification_result = sms_service.send_sms(
                    to_phone=repair.client.phone,
                    message=message,
                    from_name="Michel De Vélo",
                    store=repair.store
                )
            
            print(f"DEBUG: Notification Result: {notification_result}")
            
            if notification_result['success']:
                # Marquer que le SMS a été envoyé
                repair.client_notified = True
                repair.save()
                
                return Response({
                    'message': 'Notification envoyée avec succès',
                    'method': notification_result.get('method', 'Unknown'),
                    'message_content': message,
                    'store': repair.store
                })
            else:
                return Response(
                    {'error': f"Erreur lors de l'envoi de la notification: {notification_result['message']}"}, 
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
            
        except Exception as e:
            print(f"DEBUG: Exception in send_sms: {str(e)}")
            import traceback
            traceback.print_exc()
            return Response(
                {'error': f"Erreur lors de l'envoi du SMS: {str(e)}"}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['get'])
    def print(self, request, pk=None):
        """
        Générer et renvoyer un PDF du bon de réparation
        Compatible avec le ticket thermique 80mm
        """
        repair = self.get_object()

        # Création d'un PDF en mémoire
        buffer = io.BytesIO()
        p = canvas.Canvas(buffer, pagesize=A4)
        
        # Marges et positions
        x_left = 50
        y_start = 800
        y = y_start
        
        # En-tête
        p.setFont("Helvetica-Bold", 16)
        p.drawString(x_left, y, f"Bon de réparation n°{repair.reference_number}")
        y -= 30
        
        # Informations générales
        p.setFont("Helvetica-Bold", 12)
        p.drawString(x_left, y, "Informations générales")
        y -= 20
        
        p.setFont("Helvetica", 10)
        p.drawString(x_left, y, f"Client : {repair.client.first_name} {repair.client.last_name}")
        y -= 15
        p.drawString(x_left, y, f"Email : {repair.client.email}")
        y -= 15
        if hasattr(repair.client, 'phone') and repair.client.phone:
            p.drawString(x_left, y, f"Téléphone : {repair.client.phone}")
            y -= 15
        p.drawString(x_left, y, f"Magasin : {repair.get_store_display()}")
        y -= 15
        p.drawString(x_left, y, f"Date de dépôt : {repair.created_at.strftime('%d/%m/%Y à %H:%M')}")
        y -= 15
        p.drawString(x_left, y, f"Statut : {repair.get_status_display()}")
        y -= 15
        p.drawString(x_left, y, f"Priorité : {repair.get_priority_display()}")
        y -= 30
        
        # Informations vélo
        p.setFont("Helvetica-Bold", 12)
        p.drawString(x_left, y, "Vélo")
        y -= 20
        
        p.setFont("Helvetica", 10)
        p.drawString(x_left, y, f"Produit déposé : {repair.bike_brand}")
        y -= 15
        
        if repair.bike_model:
            p.drawString(x_left, y, f"Modèle : {repair.bike_model}")
            y -= 15
        
        if repair.bike_serial_number:
            p.drawString(x_left, y, f"N° de série : {repair.bike_serial_number}")
            y -= 15
        
        y -= 15
        
        # Description
        p.setFont("Helvetica-Bold", 12)
        p.drawString(x_left, y, "Description du problème")
        y -= 20
        
        p.setFont("Helvetica", 10)
        # Gérer les descriptions longues
        description_lines = repair.description.split('\n')
        for line in description_lines:
            # Couper les lignes trop longues
            if len(line) > 80:
                words = line.split(' ')
                current_line = ''
                for word in words:
                    if len(current_line + word) < 80:
                        current_line += word + ' '
                    else:
                        p.drawString(x_left + 10, y, current_line)
                        y -= 15
                        current_line = word + ' '
                if current_line:
                    p.drawString(x_left + 10, y, current_line)
                    y -= 15
            else:
                p.drawString(x_left + 10, y, line)
                y -= 15
        
        y -= 15
        
        # Diagnostic si présent
        if repair.diagnosis:
            p.setFont("Helvetica-Bold", 12)
            p.drawString(x_left, y, "Diagnostic")
            y -= 20
            
            p.setFont("Helvetica", 10)
            diagnosis_lines = repair.diagnosis.split('\n')
            for line in diagnosis_lines[:5]:  # Limiter à 5 lignes
                p.drawString(x_left + 10, y, line[:80])
                y -= 15
            y -= 15
        
        # Pièces nécessaires (via les items)
        if repair.items.exists():
            p.setFont("Helvetica-Bold", 12)
            p.drawString(x_left, y, "Pièces et interventions")
            y -= 20
            
            p.setFont("Helvetica", 10)
            for item in repair.items.all():
                p.drawString(x_left + 10, y, f"• {item.description}")
                y -= 15
                p.drawString(x_left + 20, y, f"Qté : {item.quantity} - Prix unitaire : {item.unit_price}€ - Total : {item.total_price}€")
                y -= 20
        y -= 15
        
        # Coûts
        p.setFont("Helvetica-Bold", 12)
        p.drawString(x_left, y, "Coûts")
        y -= 20
        
        p.setFont("Helvetica", 10)
        if repair.max_budget:
            p.drawString(x_left, y, f"Budget maximum : {repair.max_budget}€")
            y -= 15
        
        p.drawString(x_left, y, f"Coût estimé : {repair.estimated_cost}€")
        y -= 15
        
        if repair.final_cost > 0:
            p.setFont("Helvetica-Bold", 10)
            p.drawString(x_left, y, f"Coût final : {repair.final_cost}€")
            y -= 15
        
        if repair.deposit_paid > 0:
            p.drawString(x_left, y, f"Acompte versé : {repair.deposit_paid}€")
            y -= 15
        
        # Dates
        y -= 15
        p.setFont("Helvetica-Bold", 12)
        p.drawString(x_left, y, "Dates")
        y -= 20
        
        p.setFont("Helvetica", 10)
        if repair.estimated_completion:
            p.drawString(x_left, y, f"Livraison estimée : {repair.estimated_completion.strftime('%d/%m/%Y')}")
            y -= 15
        
        if repair.actual_completion:
            p.drawString(x_left, y, f"Livraison réelle : {repair.actual_completion.strftime('%d/%m/%Y')}")
            y -= 15
        
        # Signature
        y -= 30
        p.setFont("Helvetica", 10)
        p.drawString(x_left, y, "Signature du client :")
        p.line(x_left + 120, y - 5, x_left + 300, y - 5)

        p.showPage()
        p.save()

        buffer.seek(0)
        response = HttpResponse(buffer, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="reparation_{repair.reference_number}.pdf"'
        return response
    
    @action(detail=True, methods=['get'])
    def print_quote(self, request, pk=None):
        """Générer un devis PDF pour la réparation"""
        repair = self.get_object()
        
        # Utiliser le même système que print() mais avec un en-tête "DEVIS"
        buffer = io.BytesIO()
        p = canvas.Canvas(buffer, pagesize=A4)
        
        # Marges et positions
        x_left = 50
        y_start = 800
        y = y_start
        
        # En-tête DEVIS
        p.setFont("Helvetica-Bold", 16)
        p.drawString(x_left, y, f"DEVIS - Réparation n°{repair.reference_number}")
        y -= 30
        
        p.setFont("Helvetica-Bold", 12)
        p.drawString(x_left, y, "Informations générales")
        y -= 20
        
        p.setFont("Helvetica", 10)
        p.drawString(x_left, y, f"Client : {repair.client.first_name} {repair.client.last_name}")
        y -= 15
        p.drawString(x_left, y, f"Email : {repair.client.email}")
        y -= 15
        if hasattr(repair.client, 'phone') and repair.client.phone:
            p.drawString(x_left, y, f"Téléphone : {repair.client.phone}")
            y -= 15
        p.drawString(x_left, y, f"Magasin : {repair.get_store_display()}")
        y -= 15
        p.drawString(x_left, y, f"Date : {repair.created_at.strftime('%d/%m/%Y')}")
        y -= 30
        
        # Vélo
        p.setFont("Helvetica-Bold", 12)
        p.drawString(x_left, y, "Vélo")
        y -= 20
        
        p.setFont("Helvetica", 10)
        p.drawString(x_left, y, f"Marque : {repair.bike_brand}")
        y -= 15
        if repair.bike_model:
            p.drawString(x_left, y, f"Modèle : {repair.bike_model}")
            y -= 15
        y -= 15
        
        # Description
        p.setFont("Helvetica-Bold", 12)
        p.drawString(x_left, y, "Description du problème")
        y -= 20
        
        p.setFont("Helvetica", 10)
        description_lines = repair.description.split('\n')
        for line in description_lines[:3]:  # Limiter à 3 lignes pour le devis
            p.drawString(x_left + 10, y, line[:80])
            y -= 15
        y -= 15
        
        # Estimation des coûts
        p.setFont("Helvetica-Bold", 12)
        p.drawString(x_left, y, "Estimation des coûts")
        y -= 20
        
        p.setFont("Helvetica", 10)
        if repair.max_budget:
            p.drawString(x_left, y, f"Budget maximum : {repair.max_budget}€")
            y -= 15
        
        p.drawString(x_left, y, f"Coût estimé : {repair.estimated_cost}€")
        y -= 15
        
        if repair.estimated_completion:
            p.drawString(x_left, y, f"Date livraison estimée : {repair.estimated_completion.strftime('%d/%m/%Y')}")
            y -= 15
        
        y -= 30
        p.setFont("Helvetica-Bold", 10)
        p.drawString(x_left, y, "Signature du client :")
        p.line(x_left + 120, y - 5, x_left + 300, y - 5)
        
        p.showPage()
        p.save()
        
        buffer.seek(0)
        response = HttpResponse(buffer, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="devis_{repair.reference_number}.pdf"'
        return response
    
    @action(detail=True, methods=['get'])
    def print_invoice(self, request, pk=None):
        """Générer une facture PDF pour la réparation"""
        repair = self.get_object()
        
        buffer = io.BytesIO()
        p = canvas.Canvas(buffer, pagesize=A4)
        
        # Marges et positions
        x_left = 50
        y_start = 800
        y = y_start
        
        # En-tête FACTURE
        p.setFont("Helvetica-Bold", 16)
        p.drawString(x_left, y, f"FACTURE - Réparation n°{repair.reference_number}")
        y -= 30
        
        p.setFont("Helvetica-Bold", 12)
        p.drawString(x_left, y, "Informations générales")
        y -= 20
        
        p.setFont("Helvetica", 10)
        p.drawString(x_left, y, f"Client : {repair.client.first_name} {repair.client.last_name}")
        y -= 15
        p.drawString(x_left, y, f"Email : {repair.client.email}")
        y -= 15
        if hasattr(repair.client, 'phone') and repair.client.phone:
            p.drawString(x_left, y, f"Téléphone : {repair.client.phone}")
            y -= 15
        p.drawString(x_left, y, f"Magasin : {repair.get_store_display()}")
        y -= 15
        p.drawString(x_left, y, f"Date de facturation : {timezone.now().strftime('%d/%m/%Y')}")
        y -= 30
        
        # Vélo
        p.setFont("Helvetica-Bold", 12)
        p.drawString(x_left, y, "Vélo")
        y -= 20
        
        p.setFont("Helvetica", 10)
        p.drawString(x_left, y, f"Marque : {repair.bike_brand}")
        y -= 15
        if repair.bike_model:
            p.drawString(x_left, y, f"Modèle : {repair.bike_model}")
            y -= 15
        y -= 15
        
        # Détail des interventions
        if repair.items.exists():
            p.setFont("Helvetica-Bold", 12)
            p.drawString(x_left, y, "Interventions réalisées")
            y -= 20
            
            p.setFont("Helvetica", 10)
            total_items = 0
            for item in repair.items.all():
                p.drawString(x_left + 10, y, f"{item.description}")
                y -= 15
                p.drawString(x_left + 20, y, f"Qté : {item.quantity} x {item.unit_price}€ = {item.total_price}€")
                y -= 20
                total_items += float(item.total_price)
            y -= 15
        
        # Main d'œuvre
        labor_cost = float(repair.labor_cost)
        if labor_cost > 0:
            p.setFont("Helvetica-Bold", 12)
            p.drawString(x_left, y, "Main d'œuvre")
            y -= 20
            
            p.setFont("Helvetica", 10)
            p.drawString(x_left + 10, y, f"{repair.labor_hours}h x {repair.labor_rate}€/h = {labor_cost}€")
            y -= 20
        y -= 15
        
        # Total
        p.setFont("Helvetica-Bold", 12)
        p.drawString(x_left, y, "TOTAL")
        y -= 20
        
        total_cost = float(repair.final_cost) if repair.final_cost > 0 else total_items + labor_cost
        p.setFont("Helvetica-Bold", 14)
        p.drawString(x_left + 50, y, f"{total_cost}€")
        
        if repair.deposit_paid > 0:
            y -= 25
            p.setFont("Helvetica", 10)
            p.drawString(x_left, y, f"Acompte versé : {repair.deposit_paid}€")
            y -= 15
            p.setFont("Helvetica-Bold", 12)
            p.drawString(x_left, y, f"Reste à payer : {total_cost - float(repair.deposit_paid)}€")
        
        p.showPage()
        p.save()
        
        buffer.seek(0)
        response = HttpResponse(buffer, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="facture_{repair.reference_number}.pdf"'
        return response
    
    @action(detail=True, methods=['post'])
    def upload_document(self, request, pk=None):
        """Uploader un document pour la réparation"""
        repair = self.get_object()
        
        if 'file' not in request.FILES:
            return Response(
                {'error': 'Aucun fichier fourni'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        file = request.FILES['file']
        document_type = request.data.get('document_type', 'other')
        title = request.data.get('title', file.name)
        
        # Créer le document
        from .models import RepairDocument
        document = RepairDocument.objects.create(
            repair=repair,
            document_type=document_type,
            title=title,
            file=file,
            uploaded_by=request.user
        )
        
        return Response({
            'id': document.id,
            'document_type': document.document_type,
            'title': document.title,
            'uploaded_at': document.uploaded_at
        })
    
    @action(detail=True, methods=['get'])
    def timeline(self, request, pk=None):
        """Récupérer la timeline d'une réparation"""
        repair = self.get_object()
        
        from .models import RepairTimeline
        timeline_events = RepairTimeline.objects.filter(repair=repair).order_by('-created_at')
        
        timeline_data = []
        for event in timeline_events:
            timeline_data.append({
                'id': event.id,
                'status': event.status,
                'description': event.description,
                'created_at': event.created_at.isoformat(),
                'created_by': {
                    'id': event.created_by.id,
                    'username': event.created_by.username,
                    'full_name': event.created_by.get_full_name()
                }
            })
        
        return Response(timeline_data)
    
    @action(detail=True, methods=['post'])
    def add_timeline(self, request, pk=None):
        """Ajouter un événement à la timeline"""
        repair = self.get_object()
        
        from .models import RepairTimeline
        event = RepairTimeline.objects.create(
            repair=repair,
            status=request.data.get('status', repair.status),
            description=request.data.get('description', ''),
            created_by=request.user
        )
        
        return Response({
            'id': event.id,
            'status': event.status,
            'description': event.description,
            'created_at': event.created_at.isoformat()
        })
    
    @action(detail=False, methods=['get'])
    def dashboard(self, request):
        """Dashboard des réparations avec statistiques avancées"""
        from django.db.models import Count, Sum, Q, F
        from django.utils import timezone
        from datetime import timedelta, date
        
        # Périodes
        today = timezone.now().date()
        thirty_days_ago = today - timedelta(days=30)
        seven_days_ago = today - timedelta(days=7)
        
        # Statistiques de base
        total_repairs = Repair.objects.count()
        pending_repairs = Repair.objects.filter(status='pending').count()
        in_progress_repairs = Repair.objects.filter(status='in_progress').count()
        completed_repairs = Repair.objects.filter(status='completed').count()
        delivered_repairs = Repair.objects.filter(status='delivered').count()
        
        # Réparations récentes
        recent_repairs = Repair.objects.filter(
            created_at__gte=seven_days_ago
        ).count()
        
        # Réparations en retard
        overdue_repairs = Repair.objects.filter(
            estimated_completion__lt=today,
            status__in=['pending', 'in_progress']
        ).count()
        
        # Revenus
        total_revenue = Repair.objects.filter(
            status='delivered'
        ).aggregate(total=Sum('final_cost'))['total'] or 0
        
        monthly_revenue = Repair.objects.filter(
            status='delivered',
            actual_completion__gte=thirty_days_ago
        ).aggregate(total=Sum('final_cost'))['total'] or 0
        
        # Réparations par magasin
        store_stats = Repair.objects.values('store').annotate(
            count=Count('id'),
            revenue=Sum('final_cost', filter=Q(status='delivered'))
        ).order_by('-count')
        
        # Réparations par priorité
        priority_stats = Repair.objects.values('priority').annotate(
            count=Count('id')
        ).order_by('-count')
        
        # Dernières réparations
        latest_repairs = Repair.objects.select_related('client').order_by('-created_at')[:5]
        latest_data = []
        for repair in latest_repairs:
            latest_data.append({
                'id': repair.id,
                'reference_number': repair.reference_number,
                'client_name': f"{repair.client.first_name} {repair.client.last_name}",
                'bike_brand': repair.bike_brand,
                'status': repair.status,
                'priority': repair.priority,
                'created_at': repair.created_at.isoformat()
            })
        
        # Réparations urgentes
        urgent_repairs = Repair.objects.filter(
            priority='urgent',
            status__in=['pending', 'in_progress']
        ).select_related('client').order_by('created_at')[:5]
        
        urgent_data = []
        for repair in urgent_repairs:
            urgent_data.append({
                'id': repair.id,
                'reference_number': repair.reference_number,
                'client_name': f"{repair.client.first_name} {repair.client.last_name}",
                'bike_brand': repair.bike_brand,
                'created_at': repair.created_at.isoformat(),
                'days_waiting': (today - repair.created_at.date()).days
            })
        
        return Response({
            'overview': {
                'total_repairs': total_repairs,
                'pending': pending_repairs,
                'in_progress': in_progress_repairs,
                'completed': completed_repairs,
                'delivered': delivered_repairs,
                'recent': recent_repairs,
                'overdue': overdue_repairs
            },
            'revenue': {
                'total': float(total_revenue),
                'monthly': float(monthly_revenue)
            },
            'store_stats': list(store_stats),
            'priority_stats': list(priority_stats),
            'latest_repairs': latest_data,
            'urgent_repairs': urgent_data
        })
    
    @action(detail=False, methods=['get'])
    def statistics(self, request):
        """Statistiques des réparations"""
        from django.db.models import Count, Sum, Avg, Q, F
        from django.utils import timezone
        from datetime import timedelta
        
        # Statistiques par statut
        status_stats = Repair.objects.values('status').annotate(
            count=Count('id')
        )
        
        # Statistiques par priorité
        priority_stats = Repair.objects.values('priority').annotate(
            count=Count('id')
        )
        
        # Statistiques par magasin
        store_stats = Repair.objects.values('store').annotate(
            count=Count('id')
        )
        
        # Statistiques mensuelles
        thirty_days_ago = timezone.now().date() - timedelta(days=30)
        monthly_repairs = Repair.objects.filter(
            created_at__gte=thirty_days_ago
        ).count()
        
        # Réparations en cours
        in_progress_count = Repair.objects.filter(
            status__in=['pending', 'in_progress', 'waiting_parts']
        ).count()
        
        # Revenus des réparations terminées
        total_revenue = Repair.objects.filter(
            status='delivered'
        ).aggregate(total=Sum('final_cost'))['total'] or 0
        
        # Revenus du mois
        monthly_revenue = Repair.objects.filter(
            status='delivered',
            actual_completion__gte=thirty_days_ago
        ).aggregate(total=Sum('final_cost'))['total'] or 0
        
        # Durée moyenne de réparation
        completed_repairs = Repair.objects.filter(
            status='delivered',
            actual_completion__isnull=False
        )
        
        avg_duration = 0
        if completed_repairs.exists():
            durations = []
            for r in completed_repairs:
                if r.created_at and r.actual_completion:
                    duration = (r.actual_completion - r.created_at.date()).days
                    durations.append(duration)
            
            if durations:
                avg_duration = sum(durations) / len(durations)
        
        # Réparations avec dépassement de budget
        budget_exceeded = Repair.objects.filter(
            max_budget__isnull=False,
            estimated_cost__gt=F('max_budget')
        ).count()
        
        return Response({
            'status_distribution': list(status_stats),
            'priority_distribution': list(priority_stats),
            'store_distribution': list(store_stats),
            'monthly_repairs': monthly_repairs,
            'in_progress_count': in_progress_count,
            'total_revenue': float(total_revenue),
            'monthly_revenue': float(monthly_revenue),
            'average_duration_days': round(avg_duration, 1),
            'budget_exceeded_count': budget_exceeded
        })
    
    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Alias pour statistics - Statistiques des réparations"""
        return self.statistics(request)
    
    @action(detail=False, methods=['get'])
    def kanban(self, request):
        """Données pour le tableau Kanban des réparations - CORRIGÉ pour cohérence avec models.py"""
        from django.db.models import Count, Q
        
        # Définir les colonnes Kanban - ALIGNÉES avec les vrais statuts du modèle
        kanban_columns = {
            'pending': {
                'title': 'Réception vélo',
                'status': ['pending'],
                'color': '#FFA500'
            },
            'in_progress': {
                'title': 'En réparation',
                'status': ['in_progress'],
                'color': '#4CAF50'
            },
            'completed': {
                'title': 'Réparé - SMS envoyé',
                'status': ['completed'],
                'color': '#2196F3'
            },
            'delivered': {
                'title': 'Vélo récupéré',
                'status': ['delivered'],
                'color': '#9C27B0'
            }
        }
        
        kanban_data = []
        
        for column_id, column_info in kanban_columns.items():
            repairs = Repair.objects.filter(
                status__in=column_info['status']
            ).select_related('client', 'assigned_to').order_by('-priority', 'created_at')
            
            column_repairs = []
            for repair in repairs:
                repair_data = {
                    'id': repair.id,
                    'reference_number': repair.reference_number,
                    'client': {
                        'id': repair.client.id,
                        'first_name': repair.client.first_name,
                        'last_name': repair.client.last_name,
                        'phone': repair.client.phone,
                        'email': repair.client.email
                    },
                    'bike_brand': repair.bike_brand,
                    'bike_model': repair.bike_model,
                    'description': repair.description[:100] + '...' if len(repair.description) > 100 else repair.description,
                    'status': repair.status,
                    'priority': repair.priority,
                    'created_at': repair.created_at.isoformat(),
                    'estimated_cost': float(repair.estimated_cost),
                    'final_cost': float(repair.final_cost),
                    'photo_1': repair.photo_1.url if repair.photo_1 else None,
                    'store': repair.store
                }
                column_repairs.append(repair_data)
            
            kanban_data.append({
                'id': column_id,
                'title': column_info['title'],
                'color': column_info['color'],
                'repairs': column_repairs
            })
        
        return Response({
            'columns': kanban_data,
            'summary': {
                'total_repairs': Repair.objects.count(),
                'in_progress': Repair.objects.filter(status__in=['pending', 'in_progress', 'waiting_parts']).count(),
                'completed': Repair.objects.filter(status='delivered').count()
            }
        })
