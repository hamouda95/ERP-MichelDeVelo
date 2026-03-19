"""
Serializers pour la gestion des transferts multi-magasins
"""
from rest_framework import serializers
from .models_extended import StoreStockConfig, StockTransfer, StockTransferItem, TransferSuggestion
from products.serializers import ProductSerializer


class StoreStockConfigSerializer(serializers.ModelSerializer):
    """Serializer pour la configuration des stocks par magasin"""
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_reference = serializers.CharField(source='product.reference', read_only=True)
    updated_by_name = serializers.CharField(source='updated_by.username', read_only=True)
    
    class Meta:
        model = StoreStockConfig
        fields = [
            'id', 'product', 'product_name', 'product_reference', 'store',
            'min_stock', 'max_stock', 'priority', 'seasonal_factor', 'is_active',
            'created_at', 'updated_at', 'updated_by', 'updated_by_name'
        ]
        read_only_fields = ['created_at', 'updated_at', 'updated_by', 'updated_by_name']


class StockTransferItemSerializer(serializers.ModelSerializer):
    """Serializer pour les items de transfert"""
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_reference = serializers.CharField(source='product.reference', read_only=True)
    
    class Meta:
        model = StockTransferItem
        fields = [
            'id', 'transfer', 'product', 'product_name', 'product_reference',
            'quantity_suggested', 'quantity_validated', 'quantity_shipped', 'quantity_received',
            'unit_cost', 'total_cost', 'notes', 'batch_number',
            'created_at', 'updated_at',
            'is_fully_received', 'reception_percentage'
        ]
        read_only_fields = [
            'created_at', 'updated_at', 'is_fully_received', 'reception_percentage'
        ]


class StockTransferSerializer(serializers.ModelSerializer):
    """Serializer pour les transferts de stock"""
    items = StockTransferItemSerializer(many=True, read_only=True)
    from_store_display = serializers.CharField(source='get_from_store_display', read_only=True)
    to_store_display = serializers.CharField(source='get_to_store_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    validated_by_name = serializers.CharField(source='validated_by.username', read_only=True)
    purchase_order_number = serializers.CharField(source='purchase_order.purchase_order_number', read_only=True)
    
    class Meta:
        model = StockTransfer
        fields = [
            'id', 'transfer_number', 'purchase_order', 'purchase_order_number',
            'from_store', 'from_store_display', 'to_store', 'to_store_display',
            'status', 'status_display', 'created_at', 'validated_at', 'shipped_at', 'received_at',
            'validated_by', 'validated_by_name', 'notes', 'total_items', 'total_value',
            'items', 'is_pending_validation', 'is_in_transit', 'is_completed'
        ]
        read_only_fields = [
            'transfer_number', 'created_at', 'validated_at', 'shipped_at', 'received_at',
            'validated_by_name', 'is_pending_validation', 'is_in_transit', 'is_completed'
        ]


class TransferSuggestionSerializer(serializers.ModelSerializer):
    """Serializer pour les suggestions de transfert"""
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_reference = serializers.CharField(source='product.reference', read_only=True)
    from_store_display = serializers.CharField(source='get_from_store_display', read_only=True)
    to_store_display = serializers.CharField(source='get_to_store_display', read_only=True)
    urgency_level_display = serializers.CharField(source='get_urgency_level_display', read_only=True)
    applied_transfer_number = serializers.CharField(source='applied_transfer.transfer_number', read_only=True)
    
    class Meta:
        model = TransferSuggestion
        fields = [
            'id', 'product', 'product_name', 'product_reference',
            'from_store', 'from_store_display', 'to_store', 'to_store_display',
            'current_stock', 'min_stock', 'needed_quantity', 'available_quantity', 'suggested_quantity',
            'priority_score', 'urgency_level', 'urgency_level_display',
            'reason', 'context_data', 'is_active', 'applied', 'applied_at', 'applied_transfer',
            'applied_transfer_number', 'created_at', 'expires_at',
            'is_expired'
        ]
        read_only_fields = [
            'created_at', 'applied_at', 'applied_transfer_number', 'is_expired'
        ]


class TransferCreateSerializer(serializers.Serializer):
    """Serializer pour la création de transferts"""
    from_store = serializers.ChoiceField(choices=['central', 'ville_avray', 'garches'], default='central')
    to_store = serializers.ChoiceField(choices=['ville_avray', 'garches'])
    notes = serializers.CharField(required=False, allow_blank=True, max_length=1000)
    items = serializers.ListField(
        child=serializers.DictField(),
        required=True,
        min_length=1
    )
    
    def validate_items(self, items):
        """Validation des items de transfert"""
        if not items:
            raise serializers.ValidationError("Au moins un item est requis")
        
        product_ids = []
        for item in items:
            if 'product_id' not in item:
                raise serializers.ValidationError("Chaque item doit avoir un product_id")
            
            if 'quantity' not in item or item['quantity'] <= 0:
                raise serializers.ValidationError("La quantité doit être positive")
            
            product_ids.append(item['product_id'])
        
        # Vérifier qu'il n'y a pas de doublons
        if len(product_ids) != len(set(product_ids)):
            raise serializers.ValidationError("Un produit ne peut apparaître qu'une fois")
        
        return items


class TransferValidationSerializer(serializers.Serializer):
    """Serializer pour la validation de transferts"""
    items = serializers.ListField(
        child=serializers.DictField(),
        required=True,
        min_length=1
    )
    
    def validate_items(self, items):
        """Validation des items pour validation"""
        if not items:
            raise serializers.ValidationError("Au moins un item est requis")
        
        for item in items:
            if 'product_id' not in item:
                raise serializers.ValidationError("Chaque item doit avoir un product_id")
            
            if 'quantity_validated' not in item or item['quantity_validated'] < 0:
                raise serializers.ValidationError("La quantité validée doit être positive ou nulle")
        
        return items


class TransferReceptionSerializer(serializers.Serializer):
    """Serializer pour la réception de transferts"""
    items = serializers.ListField(
        child=serializers.DictField(),
        required=True,
        min_length=1
    )
    
    def validate_items(self, items):
        """Validation des items pour réception"""
        if not items:
            raise serializers.ValidationError("Au moins un item est requis")
        
        for item in items:
            if 'product_id' not in item:
                raise serializers.ValidationError("Chaque item doit avoir un product_id")
            
            if 'received_quantity' not in item or item['received_quantity'] < 0:
                raise serializers.ValidationError("La quantité reçue doit être positive ou nulle")
        
        return items


class StockConfigBatchSerializer(serializers.Serializer):
    """Serializer pour la création en masse de configurations de stock"""
    product_ids = serializers.ListField(
        child=serializers.IntegerField(),
        required=True,
        min_length=1
    )
    store = serializers.ChoiceField(choices=['ville_avray', 'garches'])
    min_stock = serializers.IntegerField(min_value=0, default=5)
    max_stock = serializers.IntegerField(min_value=0, default=20)
    priority = serializers.IntegerField(min_value=1, max_value=10, default=1)
    seasonal_factor = serializers.FloatField(min_value=0.1, max_value=5.0, default=1.0)
    
    def validate_product_ids(self, product_ids):
        """Validation des IDs de produits"""
        from products.models import Product
        existing_products = Product.objects.filter(id__in=product_ids, is_active=True).count()
        
        if existing_products != len(product_ids):
            raise serializers.ValidationError("Certains produits n'existent pas ou ne sont pas actifs")
        
        return product_ids


class TransferOptimizationSerializer(serializers.Serializer):
    """Serializer pour les paramètres d'optimisation"""
    stores = serializers.ListField(
        child=serializers.ChoiceField(choices=['ville_avray', 'garches']),
        required=False,
        default=['ville_avray', 'garches']
    )
    urgency_threshold = serializers.ChoiceField(
        choices=['critical', 'high', 'medium', 'low'],
        required=False,
        default='medium'
    )
    max_suggestions = serializers.IntegerField(min_value=1, max_value=100, default=50)
    include_expired = serializers.BooleanField(default=False)
