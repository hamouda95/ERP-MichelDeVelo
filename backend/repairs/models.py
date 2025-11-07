from django.db import models
from django.contrib.auth import get_user_model
from clients.models import Client

User = get_user_model()

class Repair(models.Model):
    STATUS_CHOICES = [
        ('pending', 'En attente'),
        ('in_progress', 'En cours'),
        ('completed', 'Terminé'),
        ('delivered', 'Livré'),
        ('cancelled', 'Annulé'),
    ]
    
    STORE_CHOICES = [
        ('ville_avray', 'Ville d\'Avray'),
        ('garches', 'Garches'),
    ]
    
    # Numéro de réparation auto-généré
    repair_number = models.CharField(max_length=30, unique=True, editable=False)
    
    # Informations client
    client = models.ForeignKey(Client, on_delete=models.PROTECT, related_name='repairs')
    client_phone = models.CharField(max_length=20)  # Redondance pour facilité
    
    # Informations vélo
    bike_name = models.CharField(max_length=200, verbose_name="Nom/Modèle du vélo")
    bike_brand = models.CharField(max_length=100, blank=True, verbose_name="Marque")
    bike_serial_number = models.CharField(max_length=100, blank=True, verbose_name="Numéro de série")
    
    # Détails réparation
    description = models.TextField(verbose_name="Description du problème")
    observations = models.TextField(blank=True, verbose_name="Observations")
    
    # Dates
    date_reception = models.DateField(verbose_name="Date de prise en charge")
    date_estimated_delivery = models.DateField(verbose_name="Date de livraison estimée")
    date_actual_delivery = models.DateField(null=True, blank=True, verbose_name="Date de livraison réelle")
    
    # Informations gestion
    store = models.CharField(max_length=20, choices=STORE_CHOICES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    assigned_to = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='assigned_repairs')
    
    # Coûts
    estimated_cost = models.DecimalField(max_digits=10, decimal_places=2, default=0, verbose_name="Coût estimé")
    final_cost = models.DecimalField(max_digits=10, decimal_places=2, default=0, verbose_name="Coût final")
    deposit_paid = models.DecimalField(max_digits=10, decimal_places=2, default=0, verbose_name="Acompte versé")
    
    # Métadonnées
    created_by = models.ForeignKey(User, on_delete=models.PROTECT, related_name='created_repairs')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'repairs'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['repair_number']),
            models.Index(fields=['status']),
            models.Index(fields=['date_reception']),
        ]
    
    def __str__(self):
        return f"Réparation {self.repair_number} - {self.bike_name}"
    
    def save(self, *args, **kwargs):
        if not self.repair_number:
            self.repair_number = self.generate_repair_number()
        super().save(*args, **kwargs)
    
    def generate_repair_number(self):
        """
        Génère un numéro de réparation au format:
        RA04112025-000001 pour Ville d'Avray
        RG04112025-000001 pour Garches
        """
        from django.utils import timezone
        today = timezone.now()
        date_str = today.strftime('%d%m%Y')
        
        prefix = 'RA' if self.store == 'ville_avray' else 'RG'
        
        last_repair = Repair.objects.filter(
            repair_number__startswith=f"{prefix}{date_str}"
        ).order_by('-repair_number').first()
        
        if last_repair:
            last_number = int(last_repair.repair_number.split('-')[1])
            new_number = last_number + 1
        else:
            new_number = 1
        
        return f"{prefix}{date_str}-{new_number:07d}"


class RepairItem(models.Model):
    """Articles/pièces utilisées pour une réparation"""
    repair = models.ForeignKey(Repair, on_delete=models.CASCADE, related_name='items')
    description = models.CharField(max_length=200, verbose_name="Description de l'intervention/pièce")
    quantity = models.IntegerField(default=1)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    total_price = models.DecimalField(max_digits=10, decimal_places=2)
    
    class Meta:
        db_table = 'repair_items'
    
    def __str__(self):
        return f"{self.description} x {self.quantity}"
    
    def save(self, *args, **kwargs):
        self.total_price = self.unit_price * self.quantity
        super().save(*args, **kwargs)