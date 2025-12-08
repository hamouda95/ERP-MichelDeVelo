from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from .models import Repair, RepairItem
from .serializers import RepairSerializer, RepairCreateSerializer, RepairItemSerializer
from django.http import HttpResponse
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
import io


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
        """Utiliser le bon serializer selon l'action"""
        if self.action in ['create', 'update', 'partial_update']:
            return RepairCreateSerializer
        return RepairSerializer
    
    def perform_create(self, serializer):
        """Ajouter l'utilisateur courant comme créateur"""
        serializer.save(created_by=self.request.user)
    
    def create(self, request, *args, **kwargs):
        """Créer une nouvelle réparation avec validation"""
        serializer = self.get_serializer(data=request.data)
        
        try:
            serializer.is_valid(raise_exception=True)
            self.perform_create(serializer)
            
            # Utiliser le serializer de lecture pour la réponse
            repair = serializer.instance
            response_serializer = RepairSerializer(repair)
            
            return Response(
                response_serializer.data,
                status=status.HTTP_201_CREATED
            )
        except Exception as e:
            return Response(
                {'error': str(e)},
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
        
        if new_status not in dict(Repair.STATUS_CHOICES):
            return Response(
                {'error': 'Statut invalide'}, 
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
        
        # Pièces nécessaires
        if repair.parts_needed:
            p.setFont("Helvetica-Bold", 12)
            p.drawString(x_left, y, "Pièces nécessaires")
            y -= 20
            
            p.setFont("Helvetica", 10)
            for part in repair.parts_needed:
                product_name = part.get('product_name', 'N/A')
                quantity = part.get('quantity', 1)
                p.drawString(x_left + 10, y, f"• {product_name} x {quantity}")
                y -= 15
            y -= 15
        
        # Articles/Interventions
        if repair.items.exists():
            p.setFont("Helvetica-Bold", 12)
            p.drawString(x_left, y, "Articles/Interventions réalisés")
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
    
    @action(detail=False, methods=['get'])
    def statistics(self, request):
        """Statistiques des réparations"""
        from django.db.models import Count, Sum, Avg, Q
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
            estimated_cost__gt=models.F('max_budget')
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
