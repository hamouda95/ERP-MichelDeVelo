from django.db import models
from django.contrib.auth import get_user_model
from clients.models import Client

User = get_user_model()

class Repair(models.Model):
    STATUS_CHOICES = [
        ('pending', 'En attente'),
        ('in_progress', 'En cours'),
        ('waiting_parts', 'Attente pièces'),
        ('completed', 'Terminée'),
        ('delivered', 'Livrée'),
        ('cancelled', 'Annulée'),
    ]
    
    PRIORITY_CHOICES = [
        ('low', 'Basse'),
        ('normal', 'Normale'),
        ('high', 'Haute'),
        ('urgent', 'Urgente'),
    ]
    
    STORE_CHOICES = [
        ('ville_avray', 'Ville d\'Avray'),
        ('garches', 'Garches'),
    ]
    
    # Numéro de référence auto-généré
    reference_number = models.CharField(max_length=30, unique=True, editable=False)
    
    # Informations client (OBLIGATOIRE dans le front)
    client = models.ForeignKey(Client, on_delete=models.PROTECT, related_name='repairs')
    
    # Informations vélo
    # bike_brand = Produit déposé (OBLIGATOIRE dans le front)
    bike_brand = models.CharField(max_length=100, verbose_name="Produit déposé")
    bike_model = models.CharField(max_length=200, blank=True, default='', verbose_name="Modèle du vélo")
    bike_serial_number = models.CharField(max_length=100, blank=True, default='', verbose_name="Numéro de série")

    # Détails réparation
    # description = Description du problème (OBLIGATOIRE dans le front)
    description = models.TextField(verbose_name="Description du problème")
    diagnosis = models.TextField(blank=True, default='', verbose_name="Diagnostic")
    notes = models.TextField(blank=True, default='', verbose_name="Notes")
    
    # Dates
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Date de création")
    estimated_completion = models.DateField(null=True, blank=True, verbose_name="Date de livraison estimée")
    actual_completion = models.DateField(null=True, blank=True, verbose_name="Date de livraison réelle")
    updated_at = models.DateTimeField(auto_now=True)
    
    # Informations gestion
    # store = Magasin (OBLIGATOIRE dans le front)
    store = models.CharField(max_length=20, choices=STORE_CHOICES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    # priority = Priorité (OBLIGATOIRE dans le front avec défaut 'normal')
    priority = models.CharField(max_length=20, choices=PRIORITY_CHOICES, default='normal')
    assigned_to = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='assigned_repairs')
    
    # Coûts
    estimated_cost = models.DecimalField(max_digits=10, decimal_places=2, default=0, verbose_name="Coût estimé")
    final_cost = models.DecimalField(max_digits=10, decimal_places=2, default=0, verbose_name="Coût final")
    deposit_paid = models.DecimalField(max_digits=10, decimal_places=2, default=0, verbose_name="Acompte versé")
    # max_budget = Budget MAX (optionnel dans le front)
    max_budget = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True, verbose_name="Budget maximum")
    
    # Pièces nécessaires (JSON field pour flexibilité)
    # Format: [{"product": id, "product_name": "nom", "quantity": 1, "unit_price": 10.00}]
    parts_needed = models.JSONField(default=list, blank=True, verbose_name="Pièces nécessaires")
    
    # Métadonnées
    created_by = models.ForeignKey(User, on_delete=models.PROTECT, related_name='created_repairs')
    
    class Meta:
        db_table = 'repairs'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['reference_number']),
            models.Index(fields=['status']),
            models.Index(fields=['created_at']),
        ]
    
    def __str__(self):
        return f"Réparation {self.reference_number} - {self.bike_brand} {self.bike_model}"
    
    def save(self, *args, **kwargs):
        if not self.reference_number:
            self.reference_number = self.generate_reference_number()
        super().save(*args, **kwargs)
    
    def generate_reference_number(self):
        """
        Génère un numéro de référence au format:
        REP-VA-20251208-001 pour Ville d'Avray
        REP-GA-20251208-001 pour Garches
        """
        from django.utils import timezone

        today = timezone.now()
        date_str = today.strftime('%Y%m%d')
        
        store_code = 'VA' if self.store == 'ville_avray' else 'GA'
        prefix = f"REP-{store_code}-{date_str}"
        
        last_repair = Repair.objects.filter(
            reference_number__startswith=prefix
        ).order_by('-reference_number').first()
        
        if last_repair:
            last_number = int(last_repair.reference_number.split('-')[-1])
            new_number = last_number + 1
        else:
            new_number = 1
        
        return f"{prefix}-{new_number:03d}"


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
