from rest_framework import serializers
from .models import Supplier, PurchaseOrder, PurchaseOrderItem


class SupplierSerializer(serializers.ModelSerializer):
    class Meta:
        model = Supplier
        fields = '__all__'


class PurchaseOrderItemSerializer(serializers.ModelSerializer):
    # Ajout de champs calculés pour le frontend
    quantity = serializers.IntegerField(source='quantity_ordered', read_only=True)
    unit_price = serializers.DecimalField(source='unit_price_ht', max_digits=10, decimal_places=2, read_only=True)
    
    class Meta:
        model = PurchaseOrderItem
        fields = '__all__'
        extra_kwargs = {
            'quantity_ordered': {'write_only': False},
            'unit_price_ht': {'write_only': False},
        }


class PurchaseOrderSerializer(serializers.ModelSerializer):
    items = PurchaseOrderItemSerializer(many=True, read_only=True)
    supplier_name = serializers.CharField(source='supplier.name', read_only=True)
    
    # Ajout des champs pour la compatibilité avec le frontend
    reference_number = serializers.CharField(source='purchase_order_number', read_only=True)
    total_amount = serializers.DecimalField(source='total_ttc', max_digits=10, decimal_places=2, read_only=True)
    
    # Détails du fournisseur pour l'affichage
    supplier_details = serializers.SerializerMethodField()
    
    class Meta:
        model = PurchaseOrder
        fields = '__all__'
    
    def get_supplier_details(self, obj):
        return {
            'id': obj.supplier.id,
            'name': obj.supplier.name,
            'email': obj.supplier.email,
            'phone': obj.supplier.phone,
        }
    
    def to_representation(self, instance):
        """Personnaliser la représentation pour inclure les détails du fournisseur"""
        data = super().to_representation(instance)
        data['supplier'] = self.get_supplier_details(instance)
        return data
