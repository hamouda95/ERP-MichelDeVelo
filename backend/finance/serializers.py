from rest_framework import serializers
from .models import Expense, Revenue

class ExpenseSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source='created_by.username', read_only=True)
    
    class Meta:
        model = Expense
        fields = [
            'id', 'category', 'description', 'amount', 'date', 
            'payment_method', 'receipt', 'created_by', 'created_by_name',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['created_by', 'created_at', 'updated_at']

class RevenueSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source='created_by.username', read_only=True)
    
    class Meta:
        model = Revenue
        fields = [
            'id', 'category', 'description', 'amount', 'date', 
            'source', 'created_by', 'created_by_name',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['created_by', 'created_at', 'updated_at']
