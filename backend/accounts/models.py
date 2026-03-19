from django.contrib.auth.models import AbstractUser
from django.db import models

class CustomUser(AbstractUser):
    ROLE_CHOICES = [
        ('admin', 'Administrateur'),
        ('manager', 'Gérant'),
        ('vendeur', 'Vendeur'),
    ]
    
    STORE_CHOICES = [
        ('ville_avray', 'Ville d\'Avray'),
        ('garches', 'Garches'),
        ('both', 'Les deux magasins'),
    ]
    
    phone = models.CharField(max_length=20, blank=True)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='vendeur')
    store_access = models.CharField(max_length=20, choices=STORE_CHOICES, default='both')
    company_id = models.IntegerField(default=1)  # Ajout du champ manquant
    can_manage_users = models.BooleanField(default=False)
    can_view_all_stores = models.BooleanField(default=False)
    can_manage_products = models.BooleanField(default=False)
    can_manage_clients = models.BooleanField(default=False)
    can_view_analytics = models.BooleanField(default=False)
    avatar = models.ImageField(upload_to='avatars/', blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'users'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.first_name} {self.last_name} ({self.get_role_display()})"
    
    def can_access_store(self, store):
        """Vérifier si l'utilisateur peut accéder à un magasin"""
        if self.store_access == 'both':
            return True
        return self.store_access == store
    
    def get_accessible_stores(self):
        """Retourner les magasins accessibles"""
        if self.store_access == 'both':
            return ['ville_avray', 'garches']
        return [self.store_access]
