from rest_framework import serializers
from .models import Repair, RepairItem


class RepairItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = RepairItem
        fields = '__all__'


class RepairSerializer(serializers.ModelSerializer):
    """Serializer pour la lecture des réparations"""
    items = RepairItemSerializer(many=True, read_only=True)
    client_name = serializers.SerializerMethodField()
    assigned_to_name = serializers.CharField(
        source='assigned_to.get_full_name', 
        read_only=True, 
        allow_null=True
    )
    created_by_name = serializers.CharField(
        source='created_by.get_full_name', 
        read_only=True
    )
    
    # Informations client complètes pour le frontend
    client_info = serializers.SerializerMethodField()
    
    class Meta:
        model = Repair
        fields = '__all__'
        read_only_fields = ['reference_number', 'created_by', 'created_at', 'updated_at']
    
    def get_client_name(self, obj):
        """Retourne le nom complet du client"""
        return f"{obj.client.first_name} {obj.client.last_name}"
    
    def get_client_info(self, obj):
        """
        Retourne toutes les informations client nécessaires au frontend
        Le frontend utilise: repair.client_info.name, repair.client_info.email, etc.
        """
        return {
            'id': obj.client.id,
            'first_name': obj.client.first_name,
            'last_name': obj.client.last_name,
            'name': f"{obj.client.first_name} {obj.client.last_name}",
            'email': obj.client.email,
            'phone': getattr(obj.client, 'phone', '')
        }


class RepairCreateSerializer(serializers.ModelSerializer):
    """Serializer pour la création et mise à jour des réparations"""
    items = RepairItemSerializer(many=True, required=False)
    parts_needed = serializers.ListField(required=False, allow_empty=True)
    
    # Rendre client obligatoire
    client = serializers.PrimaryKeyRelatedField(
        queryset=__import__('clients.models', fromlist=['Client']).Client.objects.all(),
        required=True
    )
    
    # Rendre store obligatoire
    store = serializers.ChoiceField(
        choices=Repair.STORE_CHOICES,
        required=True
    )
    
    # Rendre bike_brand (Produit déposé) obligatoire
    bike_brand = serializers.CharField(required=True, allow_blank=False)
    
    # Rendre description obligatoire
    description = serializers.CharField(required=True, allow_blank=False)
    
    # Priority avec défaut
    priority = serializers.ChoiceField(
        choices=Repair.PRIORITY_CHOICES,
        default='normal'
    )
    
    class Meta:
        model = Repair
        exclude = ['reference_number', 'created_by', 'created_at', 'updated_at']
    
    def validate_estimated_cost(self, value):
        """Valider que le coût estimé est positif"""
        if value < 0:
            raise serializers.ValidationError("Le coût estimé ne peut pas être négatif")
        return value
    
    def validate_max_budget(self, value):
        """Valider que le budget max est positif"""
        if value is not None and value < 0:
            raise serializers.ValidationError("Le budget maximum ne peut pas être négatif")
        return value
    
    def validate(self, data):
        """
        Validation globale:
        - Vérifier que le coût estimé ne dépasse pas le budget max
        """
        max_budget = data.get('max_budget')
        estimated_cost = data.get('estimated_cost', 0)
        
        if max_budget and estimated_cost > max_budget:
            # On n'empêche pas la création, mais on pourrait ajouter un warning
            # Le frontend affiche déjà un code couleur pour ça
            pass
        
        return data
    
    def create(self, validated_data):
        """Créer une réparation avec ses items"""
        items_data = validated_data.pop('items', [])
        parts_needed = validated_data.pop('parts_needed', [])
        
        # Créer la réparation
        repair = Repair.objects.create(**validated_data)
        
        # Créer les items si fournis
        for item_data in items_data:
            RepairItem.objects.create(repair=repair, **item_data)
        
        return repair
    
    def update(self, instance, validated_data):
        """Mettre à jour une réparation"""
        items_data = validated_data.pop('items', None)
        parts_needed = validated_data.pop('parts_needed', None)
        
        # Mettre à jour les champs de base
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        
        instance.save()
        
        # Mettre à jour les items si fournis
        if items_data is not None:
            # Supprimer les anciens items
            instance.items.all().delete()
            # Créer les nouveaux
            for item_data in items_data:
                RepairItem.objects.create(repair=instance, **item_data)
        
        return instance
