from rest_framework import serializers
from .models import Order, OrderItem
from products.serializers import ProductSerializer
from invoices.serializers import InvoiceSerializer


class OrderItemSerializer(serializers.ModelSerializer):
    product = ProductSerializer(read_only=True)
    product_id = serializers.IntegerField(write_only=True)
    
    class Meta:
        model = OrderItem
        fields = '__all__'


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    invoice = InvoiceSerializer(read_only=True)
    client_name = serializers.CharField(source='client.full_name', read_only=True)
    
    class Meta:
        model = Order
        fields = '__all__'