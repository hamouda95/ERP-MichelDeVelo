from rest_framework import serializers
from .models import Supplier, PurchaseOrder, PurchaseOrderItem


class SupplierSerializer(serializers.ModelSerializer):
    class Meta:
        model = Supplier
        fields = '__all__'


class PurchaseOrderItemSerializer(serializers.ModelSerializer):
    # Champs calculés pour le frontend
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

    # Champs de compatibilité frontend
    reference_number = serializers.CharField(source='purchase_order_number', read_only=True)
    total_amount = serializers.DecimalField(source='total_ttc', max_digits=10, decimal_places=2, read_only=True)

    # Détails du fournisseur
    supplier_details = serializers.SerializerMethodField()

    class Meta:
        model = PurchaseOrder
        fields = '__all__'

    def get_supplier_details(self, obj):
        """Retourne les infos du fournisseur de manière sécurisée"""
        supplier = obj.supplier
        if not supplier:
            return None
        return {
            'id': supplier.id,
            'name': supplier.name,
            'email': supplier.email,
            'phone': supplier.phone,
        }

    def to_representation(self, instance):
        """Ajoute les détails du fournisseur dans la réponse finale"""
        data = super().to_representation(instance)
        data['supplier'] = data.pop('supplier_details', None)
        return data
