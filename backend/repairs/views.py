from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from .models import Repair, RepairItem
from .serializers import RepairSerializer, RepairCreateSerializer, RepairItemSerializer
from django.http import HttpResponse
from reportlab.pdfgen import canvas
import io


class RepairViewSet(viewsets.ModelViewSet):
    queryset = Repair.objects.all()
    serializer_class = RepairSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'store', 'client']
    search_fields = ['reference_number', 'bike_brand', 'bike_model', 'client__first_name', 'client__last_name']
    ordering_fields = ['created_at', 'estimated_completion', 'actual_completion']
    ordering = ['-created_at']
    
    def get_serializer_class(self):
        if self.action == 'create':
            return RepairCreateSerializer
        return RepairSerializer
    
    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)
    
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
        """Générer et renvoyer un PDF du bon de réparation"""
        repair = self.get_object()

        # Création d'un PDF en mémoire
        buffer = io.BytesIO()
        p = canvas.Canvas(buffer)
        
        # Contenu du PDF
        p.setFont("Helvetica-Bold", 16)
        p.drawString(100, 800, f"Bon de réparation n°{repair.reference_number}")
        p.setFont("Helvetica", 12)
        p.drawString(100, 780, f"Client : {repair.client.first_name} {repair.client.last_name}")
        p.drawString(100, 760, f"Magasin : {repair.get_store_display()}")
        p.drawString(100, 740, f"Date : {repair.created_at.strftime('%d/%m/%Y')}")
        
        y = 700
        p.drawString(100, y, f"Vélo : {repair.bike_brand} {repair.bike_model}")
        
        if repair.bike_serial_number:
            y -= 20
            p.drawString(100, y, f"N° série : {repair.bike_serial_number}")
        
        y -= 40
        p.drawString(100, y, "Description :")
        y -= 20
        p.drawString(120, y, repair.description or "Non renseignée")
        
        if repair.items.exists():
            y -= 40
            p.drawString(100, y, "Articles/Interventions :")
            for item in repair.items.all():
                y -= 20
                p.drawString(120, y, f"{item.description} - Qté : {item.quantity} - Prix : {item.total_price}€")
        
        y -= 40
        p.drawString(100, y, f"Coût estimé : {repair.estimated_cost}€")
        
        if repair.final_cost > 0:
            y -= 20
            p.drawString(100, y, f"Coût final : {repair.final_cost}€")

        p.showPage()
        p.save()

        buffer.seek(0)
        response = HttpResponse(buffer, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="reparation_{repair.reference_number}.pdf"'
        return response
    
    @action(detail=False, methods=['get'])
    def statistics(self, request):
        """Statistiques des réparations"""
        from django.db.models import Count, Sum, Avg
        from django.utils import timezone
        from datetime import timedelta
        
        # Statistiques par statut
        status_stats = Repair.objects.values('status').annotate(
            count=Count('id')
        )
        
        # Statistiques mensuelles
        thirty_days_ago = timezone.now().date() - timedelta(days=30)
        monthly_repairs = Repair.objects.filter(
            created_at__gte=thirty_days_ago
        ).count()
        
        # Revenus des réparations terminées
        total_revenue = Repair.objects.filter(
            status='delivered'
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
        
        return Response({
            'status_distribution': list(status_stats),
            'monthly_repairs': monthly_repairs,
            'total_revenue': float(total_revenue),
            'average_duration_days': round(avg_duration, 1)
        })
