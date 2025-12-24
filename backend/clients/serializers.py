from rest_framework import serializers
from .models import Client
import re


class ClientSerializer(serializers.ModelSerializer):
    full_name = serializers.ReadOnlyField()
    
    class Meta:
        model = Client
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at', 'full_name', 'total_purchases', 'visit_count']
    
    def validate_email(self, value):
        """Validate email format"""
        if value:
            value = value.lower().strip()
            email_regex = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
            if not re.match(email_regex, value):
                raise serializers.ValidationError("Format d'email invalide")
        return value
    
    def validate_phone(self, value):
        """Validate phone format"""
        if value:
            value = value.strip()
            # Allow digits, spaces, +, (), -
            phone_regex = r'^[0-9\s+()-]+$'
            if not re.match(phone_regex, value):
                raise serializers.ValidationError("Format de téléphone invalide")
            # Check minimum length (at least 10 digits)
            digits_only = re.sub(r'[^0-9]', '', value)
            if len(digits_only) < 10:
                raise serializers.ValidationError("Le numéro de téléphone doit contenir au moins 10 chiffres")
        return value
    
    def validate_postal_code(self, value):
        """Validate postal code format"""
        if value:
            value = value.strip()
            # French postal code format (5 digits)
            if len(value) > 0 and not re.match(r'^\d{5}$', value):
                raise serializers.ValidationError("Le code postal doit contenir 5 chiffres")
        return value
    
    def validate(self, data):
        """Additional validation"""
        # Check if email is unique (for updates)
        if self.instance:  # Update case
            email = data.get('email', self.instance.email)
            if email != self.instance.email:
                if Client.objects.filter(email=email).exists():
                    raise serializers.ValidationError({'email': 'Un client avec cet email existe déjà'})
        else:  # Create case
            email = data.get('email')
            if email and Client.objects.filter(email=email).exists():
                raise serializers.ValidationError({'email': 'Un client avec cet email existe déjà'})
        
        return data
