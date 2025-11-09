from rest_framework import serializers
from .models import Quote, QuoteItem
from products.serializers import ProductSerializer


class QuoteItemSerializer(serializers.ModelSerializer):
    product = ProductSerializer(read_only=True)
    product_id = serializers.IntegerField(write_only=True)
    product_name = serializers.CharField(source='product.name', read_only=True)
    
    class Meta:
        model = QuoteItem
        fields = '__all__'


class QuoteSerializer(serializers.ModelSerializer):
    items = QuoteItemSerializer(many=True, read_only=True)
    client_name = serializers.CharField(source='client.full_name', read_only=True)
    is_expired = serializers.SerializerMethodField()
    reference_number = serializers.CharField(source='quote_number', read_only=True)
    total_amount = serializers.DecimalField(source='total_ttc', max_digits=10, decimal_places=2, read_only=True)
    
    # Champs pour compatibilité frontend
    client = serializers.SerializerMethodField()
    
    class Meta:
        model = Quote
        fields = '__all__'
    
    def get_is_expired(self, obj):
        return obj.is_expired()
    
    def get_client(self, obj):
        """Retourne les infos du client dans le format attendu par le frontend"""
        return {
            'id': obj.client.id,
            'name': f"{obj.client.first_name} {obj.client.last_name}",
            'full_name': f"{obj.client.first_name} {obj.client.last_name}",
            'email': obj.client.email,
            'phone': obj.client.phone
        }
