"""
Serializers améliorés pour l'atelier de magasin digital
"""
from rest_framework import serializers
from .models import Repair, RepairItem, RepairTimeline, RepairDocument, WorkshopWorkload
from clients.serializers import ClientSerializer
from products.serializers import ProductSerializer
from django.contrib.auth import get_user_model

User = get_user_model()


class RepairItemSerializer(serializers.ModelSerializer):
    """Serializer pour les articles de réparation"""
    product_details = ProductSerializer(source='product', read_only=True)
    
    class Meta:
        model = RepairItem
        fields = '__all__'
        read_only_fields = ['total_price']


class RepairTimelineSerializer(serializers.ModelSerializer):
    """Serializer pour le chronologie des réparations"""
    created_by_name = serializers.CharField(source='created_by.username', read_only=True)
    
    class Meta:
        model = RepairTimeline
        fields = '__all__'


class RepairDocumentSerializer(serializers.ModelSerializer):
    """Serializer pour les documents de réparation"""
    uploaded_by_name = serializers.CharField(source='uploaded_by.username', read_only=True)
    file_url = serializers.SerializerMethodField()
    
    class Meta:
        model = RepairDocument
        fields = '__all__'
    
    def get_file_url(self, obj):
        if obj.file:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.file.url)
            return obj.file.url
        return None


class RepairSerializer(serializers.ModelSerializer):
    """Serializer principal pour les réparations (lecture)"""
    client_details = ClientSerializer(source='client', read_only=True)
    assigned_to_name = serializers.CharField(source='assigned_to.username', read_only=True)
    created_by_name = serializers.CharField(source='created_by.username', read_only=True)
    items = RepairItemSerializer(many=True, read_only=True)
    timeline = RepairTimelineSerializer(many=True, read_only=True)
    documents = RepairDocumentSerializer(many=True, read_only=True)
    
    # Champs calculés
    labor_cost = serializers.ReadOnlyField()
    parts_cost = serializers.ReadOnlyField()
    total_cost = serializers.ReadOnlyField()
    is_overdue = serializers.ReadOnlyField()
    days_in_workshop = serializers.ReadOnlyField()
    
    # URLs des photos
    photo_1_url = serializers.SerializerMethodField()
    photo_2_url = serializers.SerializerMethodField()
    photo_3_url = serializers.SerializerMethodField()
    
    class Meta:
        model = Repair
        fields = '__all__'
    
    def get_photo_1_url(self, obj):
        if obj.photo_1:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.photo_1.url)
            return obj.photo_1.url
        return None
    
    def get_photo_2_url(self, obj):
        if obj.photo_2:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.photo_2.url)
            return obj.photo_2.url
        return None
    
    def get_photo_3_url(self, obj):
        if obj.photo_3:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.photo_3.url)
            return obj.photo_3.url
        return None


class RepairCreateSerializer(serializers.ModelSerializer):
    """Serializer pour la création et modification des réparations"""
    
    class Meta:
        model = Repair
        fields = [
            'client', 'bike_brand', 'bike_model', 'bike_serial_number', 'bike_type',
            'photo_1', 'photo_2', 'photo_3', 'repair_type', 'description', 'diagnosis',
            'notes', 'estimated_completion', 'estimated_duration', 'store', 'status',
            'priority', 'assigned_to', 'estimated_cost', 'max_budget', 'deposit_paid',
            'labor_hours', 'labor_rate'
        ]
    
    def validate(self, data):
        """Validation personnalisée"""
        # Valider que la date estimée est dans le futur
        if data.get('estimated_completion'):
            from django.utils import timezone
            if data['estimated_completion'] <= timezone.now().date():
                raise serializers.ValidationError(
                    "La date de livraison estimée doit être dans le futur"
                )
        
        # Valider le budget maximum
        max_budget = data.get('max_budget')
        estimated_cost = data.get('estimated_cost', 0)
        if max_budget and estimated_cost > max_budget:
            raise serializers.ValidationError(
                "Le coût estimé ne peut pas dépasser le budget maximum"
            )
        
        # Valider l'acompte
        deposit = data.get('deposit_paid', 0)
        if deposit > estimated_cost:
            raise serializers.ValidationError(
                "L'acompte ne peut pas dépasser le coût estimé"
            )
        
        return data


class RepairStatusUpdateSerializer(serializers.Serializer):
    """Serializer pour la mise à jour de statut"""
    status = serializers.ChoiceField(choices=Repair.STATUS_CHOICES)
    notes = serializers.CharField(required=False, allow_blank=True)
    
    def validate_status(self, value):
        """Validation des transitions de statut"""
        repair = self.context['repair']
        
        # Transitions interdites
        forbidden_transitions = {
            'delivered': ['pending', 'diagnosis', 'waiting_parts'],
            'cancelled': ['completed', 'delivered'],
            'completed': ['cancelled', 'delivered']
        }
        
        if repair.status in forbidden_transitions.get(value, []):
            raise serializers.ValidationError(
                f"Transition de statut invalide: {repair.status} → {value}"
            )
        
        return value


class WorkshopWorkloadSerializer(serializers.ModelSerializer):
    """Serializer pour la charge de travail de l'atelier"""
    mechanic_name = serializers.CharField(source='mechanic.username', read_only=True)
    
    class Meta:
        model = WorkshopWorkload
        fields = '__all__'


class RepairStatisticsSerializer(serializers.Serializer):
    """Serializer pour les statistiques de réparation"""
    total_repairs = serializers.IntegerField()
    pending_repairs = serializers.IntegerField()
    in_progress_repairs = serializers.IntegerField()
    completed_repairs = serializers.IntegerField()
    overdue_repairs = serializers.IntegerField()
    average_duration = serializers.FloatField()
    total_revenue = serializers.DecimalField(max_digits=12, decimal_places=2)
    monthly_revenue = serializers.DecimalField(max_digits=12, decimal_places=2)
    workload_by_mechanic = serializers.ListField()
    repairs_by_type = serializers.ListField()
    repairs_by_priority = serializers.ListField()


class RepairQuoteSerializer(serializers.Serializer):
    """Serializer pour la génération de devis PDF"""
    repair_id = serializers.IntegerField()
    include_labor = serializers.BooleanField(default=True)
    include_parts = serializers.BooleanField(default=True)
    notes = serializers.CharField(required=False, allow_blank=True)


class RepairNotificationSerializer(serializers.Serializer):
    """Serializer pour les notifications client"""
    repair_id = serializers.IntegerField()
    notification_type = serializers.ChoiceField(choices=[
        ('status_update', 'Mise à jour de statut'),
        ('quote_ready', 'Devis prêt'),
        ('repair_completed', 'Réparation terminée'),
        ('parts_delayed', 'Retard de pièces'),
        ('payment_reminder', 'Rappel de paiement')
    ])
    message = serializers.CharField()
    send_email = serializers.BooleanField(default=True)
    send_sms = serializers.BooleanField(default=False)
