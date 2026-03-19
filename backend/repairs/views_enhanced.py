"""
Views améliorées pour l'atelier de magasin digital
"""
from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q, Count, Sum, Avg, F
from django.utils import timezone
from datetime import timedelta, date
from .models import Repair, RepairItem, RepairTimeline, RepairDocument, WorkshopWorkload
from .serializers_enhanced import (
    RepairSerializer, RepairCreateSerializer, RepairStatusUpdateSerializer,
    RepairItemSerializer, RepairTimelineSerializer, RepairDocumentSerializer,
    WorkshopWorkloadSerializer, RepairStatisticsSerializer,
    RepairQuoteSerializer, RepairNotificationSerializer
)
from django.http import HttpResponse
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
import io
import os


class RepairViewSet(viewsets.ModelViewSet):
    """
    ViewSet pour la gestion des réparations - Atelier Digital
    """
    queryset = Repair.objects.select_related(
        'client', 'assigned_to', 'created_by'
    ).prefetch_related('items', 'timeline', 'documents')
    serializer_class = RepairSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'store', 'client', 'priority', 'repair_type', 'bike_type']
    search_fields = [
        'reference_number', 'bike_brand', 'bike_model', 'bike_serial_number',
        'client__first_name', 'client__last_name', 'description', 'diagnosis'
    ]
    ordering_fields = [
        'created_at', 'estimated_completion', 'actual_completion', 
        'priority', 'estimated_cost', 'final_cost'
    ]
    ordering = ['-created_at']
    
    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return RepairCreateSerializer
        return RepairSerializer
    
    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)
        
        # Ajouter au timeline
        repair = serializer.instance
        RepairTimeline.objects.create(
            repair=repair,
            status='pending',
            description="Réparation créée",
            created_by=self.request.user
        )
    
    @action(detail=True, methods=['post'])
    def update_status(self, request, pk=None):
        """Mise à jour du statut avec suivi dans le timeline"""
        repair = self.get_object()
        serializer = RepairStatusUpdateSerializer(
            data=request.data, 
            context={'repair': repair}
        )
        
        if serializer.is_valid():
            old_status = repair.status
            new_status = serializer.validated_data['status']
            notes = serializer.validated_data.get('notes', '')
            
            # Mettre à jour le statut
            repair.status = new_status
            
            # Date de livraison réelle si terminé
            if new_status == 'delivered' and not repair.actual_completion:
                repair.actual_completion = timezone.now().date()
            
            # Date de diagnostic si en diagnostic
            if new_status == 'diagnosis' and old_status == 'pending':
                repair.estimated_duration = request.data.get('estimated_duration')
            
            repair.save()
            
            # Ajouter au timeline
            RepairTimeline.objects.create(
                repair=repair,
                status=new_status,
                description=f"Statut changé: {repair.get_status_display()}. {notes}",
                created_by=request.user
            )
            
            # Notifier le client si nécessaire
            if new_status in ['completed', 'delivered']:
                repair.client_notified = False
                repair.save()
            
            return Response(RepairSerializer(repair, context={'request': request}).data)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['post'])
    def add_item(self, request, pk=None):
        """Ajouter un article/pièce à une réparation"""
        repair = self.get_object()
        serializer = RepairItemSerializer(data=request.data)
        
        if serializer.is_valid():
            item = serializer.save(repair=repair)
            
            # Recalculer le coût final
            repair.final_cost = repair.total_cost
            repair.save()
            
            return Response(RepairItemSerializer(item).data, status=status.HTTP_201_CREATED)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['post'])
    def add_timeline(self, request, pk=None):
        """Ajouter une entrée au timeline"""
        repair = self.get_object()
        
        RepairTimeline.objects.create(
            repair=repair,
            status=request.data.get('status', repair.status),
            description=request.data.get('description', ''),
            created_by=request.user
        )
        
        return Response({'message': 'Timeline mis à jour'})
    
    @action(detail=True, methods=['post'])
    def upload_document(self, request, pk=None):
        """Uploader un document (photo, PDF, etc.)"""
        repair = self.get_object()
        
        if 'file' not in request.FILES:
            return Response(
                {'error': 'Aucun fichier fourni'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        document = RepairDocument.objects.create(
            repair=repair,
            document_type=request.data.get('document_type', 'other'),
            title=request.data.get('title', request.FILES['file'].name),
            file=request.FILES['file'],
            uploaded_by=request.user
        )
        
        return Response(
            RepairDocumentSerializer(document, context={'request': request}).data,
            status=status.HTTP_201_CREATED
        )
    
    @action(detail=True, methods=['get'])
    def print_quote(self, request, pk=None):
        """Générer un devis PDF"""
        repair = self.get_object()
        
        buffer = io.BytesIO()
        p = canvas.Canvas(buffer, pagesize=A4)
        
        # Configuration du document
        width, height = A4
        margin = 20 * mm
        y_position = height - margin
        
        # En-tête
        p.setFont("Helvetica-Bold", 16)
        p.drawString(margin, y_position, f"DEVIS - Réparation {repair.reference_number}")
        y_position -= 15 * mm
        
        # Informations client
        p.setFont("Helvetica-Bold", 12)
        p.drawString(margin, y_position, "CLIENT:")
        y_position -= 8 * mm
        
        p.setFont("Helvetica", 10)
        p.drawString(margin, y_position, f"{repair.client.first_name} {repair.client.last_name}")
        y_position -= 6 * mm
        p.drawString(margin, y_position, f"{repair.client.email}")
        y_position -= 6 * mm
        if repair.client.phone:
            p.drawString(margin, y_position, repair.client.phone)
        y_position -= 6 * mm
        if repair.client.address:
            p.drawString(margin, y_position, repair.client.address)
        y_position -= 10 * mm
        
        # Informations vélo
        p.setFont("Helvetica-Bold", 12)
        p.drawString(margin, y_position, "VÉLO:")
        y_position -= 8 * mm
        
        p.setFont("Helvetica", 10)
        p.drawString(margin, y_position, f"Marque: {repair.bike_brand}")
        y_position -= 6 * mm
        if repair.bike_model:
            p.drawString(margin, y_position, f"Modèle: {repair.bike_model}")
            y_position -= 6 * mm
        if repair.bike_serial_number:
            p.drawString(margin, y_position, f"N° série: {repair.bike_serial_number}")
            y_position -= 6 * mm
        p.drawString(margin, y_position, f"Type: {repair.get_bike_type_display()}")
        y_position -= 10 * mm
        
        # Description du problème
        p.setFont("Helvetica-Bold", 12)
        p.drawString(margin, y_position, "DESCRIPTION:")
        y_position -= 8 * mm
        
        p.setFont("Helvetica", 10)
        description_lines = repair.description.split('\n')
        for line in description_lines[:5]:  # Limiter à 5 lignes
            if y_position < 50 * mm:  # Espace minimum
                break
            p.drawString(margin, y_position, line[:80])
            y_position -= 6 * mm
        y_position -= 10 * mm
        
        # Diagnostic
        if repair.diagnosis:
            p.setFont("Helvetica-Bold", 12)
            p.drawString(margin, y_position, "DIAGNOSTIC:")
            y_position -= 8 * mm
            
            p.setFont("Helvetica", 10)
            diagnosis_lines = repair.diagnosis.split('\n')
            for line in diagnosis_lines[:3]:
                if y_position < 50 * mm:
                    break
                p.drawString(margin, y_position, line[:80])
                y_position -= 6 * mm
            y_position -= 10 * mm
        
        # Articles et coûts
        p.setFont("Helvetica-Bold", 12)
        p.drawString(margin, y_position, "DÉTAIL DES COÛTS:")
        y_position -= 8 * mm
        
        # En-tête du tableau
        p.setFont("Helvetica-Bold", 10)
        p.drawString(margin, y_position, "Description")
        p.drawString(100 * mm, y_position, "Qté")
        p.drawString(120 * mm, y_position, "Prix U")
        p.drawString(150 * mm, y_position, "Total")
        y_position -= 6 * mm
        
        # Ligne de séparation
        p.line(margin, y_position, 180 * mm, y_position)
        y_position -= 8 * mm
        
        # Main d'œuvre
        if repair.labor_hours > 0:
            p.setFont("Helvetica", 10)
            p.drawString(margin, y_position, "Main d'œuvre")
            p.drawString(100 * mm, y_position, f"{repair.labor_hours}")
            p.drawString(120 * mm, y_position, f"{repair.labor_rate}€")
            p.drawString(150 * mm, y_position, f"{repair.labor_cost}€")
            y_position -= 6 * mm
        
        # Pièces
        for item in repair.items.all():
            if y_position < 80 * mm:  # Espace pour le pied de page
                p.showPage()
                y_position = height - margin
            
            p.setFont("Helvetica", 10)
            p.drawString(margin, y_position, item.description[:30])
            p.drawString(100 * mm, y_position, f"{item.quantity}")
            p.drawString(120 * mm, y_position, f"{item.unit_price}€")
            p.drawString(150 * mm, y_position, f"{item.total_price}€")
            y_position -= 6 * mm
        
        y_position -= 10 * mm
        
        # Total
        p.line(margin, y_position, 180 * mm, y_position)
        y_position -= 8 * mm
        
        p.setFont("Helvetica-Bold", 12)
        p.drawString(120 * mm, y_position, "TOTAL:")
        p.drawString(150 * mm, y_position, f"{repair.total_cost}€")
        y_position -= 15 * mm
        
        # Validité
        p.setFont("Helvetica", 9)
        p.drawString(margin, y_position, "Devis valable 30 jours")
        y_position -= 8 * mm
        p.drawString(margin, y_position, f"Date: {timezone.now().strftime('%d/%m/%Y')}")
        
        p.showPage()
        p.save()
        
        buffer.seek(0)
        response = HttpResponse(buffer, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="devis_{repair.reference_number}.pdf"'
        
        # Sauvegarder le PDF
        repair.quote_pdf.save(f'devis_{repair.reference_number}.pdf', buffer, save=False)
        repair.save()
        
        return response
    
    @action(detail=False, methods=['get'])
    def statistics(self, request):
        """Statistiques détaillées de l'atelier"""
        # Périodes
        today = timezone.now().date()
        thirty_days_ago = today - timedelta(days=30)
        start_of_month = today.replace(day=1)
        
        # Statistiques générales
        stats = {
            'total_repairs': Repair.objects.count(),
            'pending_repairs': Repair.objects.filter(status='pending').count(),
            'in_progress_repairs': Repair.objects.filter(
                status__in=['diagnosis', 'waiting_parts', 'in_progress', 'testing']
            ).count(),
            'completed_repairs': Repair.objects.filter(status='completed').count(),
            'delivered_repairs': Repair.objects.filter(status='delivered').count(),
            'overdue_repairs': Repair.objects.filter(
                estimated_completion__lt=today,
                status__in=['pending', 'diagnosis', 'waiting_parts', 'in_progress', 'testing']
            ).count(),
        }
        
        # Durée moyenne
        completed_repairs = Repair.objects.filter(
            status='delivered',
            actual_completion__isnull=False
        )
        if completed_repairs.exists():
            durations = []
            for repair in completed_repairs:
                duration = (repair.actual_completion - repair.created_at.date()).days
                durations.append(duration)
            stats['average_duration'] = sum(durations) / len(durations)
        else:
            stats['average_duration'] = 0
        
        # Revenus
        stats['total_revenue'] = Repair.objects.filter(
            status='delivered'
        ).aggregate(total=Sum('final_cost'))['total'] or 0
        
        stats['monthly_revenue'] = Repair.objects.filter(
            status='delivered',
            actual_completion__gte=start_of_month
        ).aggregate(total=Sum('final_cost'))['total'] or 0
        
        # Charge de travail par mécanicien
        workload = Repair.objects.filter(
            status__in=['pending', 'diagnosis', 'waiting_parts', 'in_progress', 'testing']
        ).values('assigned_to__username').annotate(
            count=Count('id'),
            estimated_hours=Sum('estimated_duration')
        ).order_by('-count')
        
        stats['workload_by_mechanic'] = list(workload)
        
        # Réparations par type
        repairs_by_type = Repair.objects.values('repair_type').annotate(
            count=Count('id')
        ).order_by('-count')
        
        stats['repairs_by_type'] = list(repairs_by_type)
        
        # Réparations par priorité
        repairs_by_priority = Repair.objects.values('priority').annotate(
            count=Count('id')
        ).order_by('-priority')
        
        stats['repairs_by_priority'] = list(repairs_by_priority)
        
        return Response(stats)
    
    @action(detail=False, methods=['get'])
    def dashboard(self, request):
        """Dashboard de l'atelier"""
        today = timezone.now().date()
        
        # Réparations récentes
        recent_repairs = Repair.objects.select_related('client').order_by('-created_at')[:10]
        
        # Réparations urgentes
        urgent_repairs = Repair.objects.filter(
            priority='urgent',
            status__in=['pending', 'diagnosis', 'waiting_parts', 'in_progress', 'testing']
        ).select_related('client').order_by('created_at')
        
        # Réparations en retard
        overdue_repairs = Repair.objects.filter(
            estimated_completion__lt=today,
            status__in=['pending', 'diagnosis', 'waiting_parts', 'in_progress', 'testing']
        ).select_related('client').order_by('estimated_completion')
        
        # Pièces en attente
        waiting_parts = RepairItem.objects.filter(
            ordered=True,
            received=False
        ).select_related('repair', 'repair__client')
        
        return Response({
            'recent_repairs': RepairSerializer(
                recent_repairs, 
                many=True, 
                context={'request': request}
            ).data,
            'urgent_repairs': RepairSerializer(
                urgent_repairs, 
                many=True, 
                context={'request': request}
            ).data,
            'overdue_repairs': RepairSerializer(
                overdue_repairs, 
                many=True, 
                context={'request': request}
            ).data,
            'waiting_parts_count': waiting_parts.count(),
            'waiting_parts': RepairItemSerializer(waiting_parts, many=True).data,
        })
    
    @action(detail=True, methods=['post'])
    def send_notification(self, request, pk=None):
        """Envoyer une notification au client"""
        repair = self.get_object()
        serializer = RepairNotificationSerializer(data=request.data)
        
        if serializer.is_valid():
            notification_type = serializer.validated_data['notification_type']
            message = serializer.validated_data['message']
            
            # Logique d'envoi d'email/SMS
            if serializer.validated_data.get('send_email', False):
                # TODO: Intégrer l'envoi d'email
                pass
            
            if serializer.validated_data.get('send_sms', False):
                # TODO: Intégrer l'envoi SMS
                pass
            
            # Marquer comme notifié
            repair.client_notified = True
            repair.save()
            
            return Response({'message': 'Notification envoyée'})
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class RepairItemViewSet(viewsets.ModelViewSet):
    """ViewSet pour la gestion des articles de réparation"""
    queryset = RepairItem.objects.select_related('repair', 'product')
    serializer_class = RepairItemSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['repair', 'item_type', 'ordered', 'received']
    search_fields = ['description', 'product__name']
    
    @action(detail=True, methods=['post'])
    def mark_ordered(self, request, pk=None):
        """Marquer une pièce comme commandée"""
        item = self.get_object()
        item.ordered = True
        item.ordered_date = timezone.now().date()
        item.save()
        
        return Response({'message': 'Pièce marquée comme commandée'})
    
    @action(detail=True, methods=['post'])
    def mark_received(self, request, pk=None):
        """Marquer une pièce comme reçue"""
        item = self.get_object()
        item.received = True
        item.received_date = timezone.now().date()
        item.save()
        
        return Response({'message': 'Pièce marquée comme reçue'})


class WorkshopWorkloadViewSet(viewsets.ModelViewSet):
    """ViewSet pour la gestion de la charge de travail"""
    queryset = WorkshopWorkload.objects.select_related('mechanic')
    serializer_class = WorkshopWorkloadSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['store', 'mechanic', 'date']
    
    @action(detail=False, methods=['get'])
    def weekly_planning(self, request):
        """Planning hebdomadaire de l'atelier"""
        today = timezone.now().date()
        start_of_week = today - timedelta(days=today.weekday())
        end_of_week = start_of_week + timedelta(days=6)
        
        workload = WorkshopWorkload.objects.filter(
            date__range=[start_of_week, end_of_week]
        ).select_related('mechanic').order_by('date', 'mechanic')
        
        return Response(WorkshopWorkloadSerializer(workload, many=True).data)
