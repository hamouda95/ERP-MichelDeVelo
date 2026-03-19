"""
Extensions des modèles pour la gestion multi-magasins
Ajout des fonctionnalités de transferts et configuration des stocks
"""
from django.db import models
from django.contrib.auth import get_user_model
from django.utils import timezone

User = get_user_model()


class StoreStockConfig(models.Model):
    """Configuration des stocks par magasin"""
    STORE_CHOICES = [
        ('ville_avray', 'Ville d\'Avray'),
        ('garches', 'Garches'),
    ]
    
    product = models.ForeignKey(
        'products.Product', 
        on_delete=models.CASCADE, 
        related_name='stock_configs'
    )
    store = models.CharField(max_length=20, choices=STORE_CHOICES)
    min_stock = models.PositiveIntegerField(default=5, verbose_name="Stock minimum")
    max_stock = models.PositiveIntegerField(default=20, verbose_name="Stock maximum")
    priority = models.PositiveIntegerField(default=1, verbose_name="Priorité (1 = plus prioritaire)")
    seasonal_factor = models.FloatField(default=1.0, verbose_name="Facteur saisonnier")
    is_active = models.BooleanField(default=True, verbose_name="Actif")
    
    # Métadonnées
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    updated_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    
    class Meta:
        db_table = 'store_stock_configs'
        unique_together = ['product', 'store']
        ordering = ['store', '-priority', 'product__name']
        indexes = [
            models.Index(fields=['store', 'min_stock']),
            models.Index(fields=['product', 'store']),
        ]
    
    def __str__(self):
        return f"{self.product.name} - {self.store} (Min: {self.min_stock})"


class StockTransfer(models.Model):
    """Transferts de stock entre magasins"""
    TRANSFER_STATUS_CHOICES = [
        ('suggested', 'Suggéré'),
        ('validated', 'Validé par manager'),
        ('in_transit', 'En transit'),
        ('received', 'Reçu'),
        ('cancelled', 'Annulé'),
    ]
    
    STORE_CHOICES = [
        ('central', 'Stock Central'),
        ('ville_avray', 'Ville d\'Avray'),
        ('garches', 'Garches'),
    ]
    
    # Commande d'achat d'origine (si applicable)
    purchase_order = models.ForeignKey(
        'PurchaseOrder', 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='transfers'
    )
    
    # Informations de transfert
    from_store = models.CharField(max_length=20, choices=STORE_CHOICES, default='central')
    to_store = models.CharField(max_length=20, choices=STORE_CHOICES)
    transfer_number = models.CharField(max_length=50, unique=True, blank=True)
    
    # Statut et dates
    status = models.CharField(max_length=15, choices=TRANSFER_STATUS_CHOICES, default='suggested')
    
    # Dates importantes
    created_at = models.DateTimeField(auto_now_add=True)
    validated_at = models.DateTimeField(null=True, blank=True)
    shipped_at = models.DateTimeField(null=True, blank=True)
    received_at = models.DateTimeField(null=True, blank=True)
    
    # Validation
    validated_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    
    # Informations supplémentaires
    notes = models.TextField(blank=True, verbose_name="Notes")
    total_items = models.PositiveIntegerField(default=0)
    total_value = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    
    class Meta:
        db_table = 'stock_transfers'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status', 'created_at']),
            models.Index(fields=['from_store', 'to_store']),
            models.Index(fields=['transfer_number']),
        ]
    
    def __str__(self):
        return f"Transfert {self.transfer_number or f'#{self.id}'}: {self.from_store} → {self.to_store}"
    
    def save(self, *args, **kwargs):
        if not self.transfer_number:
            self.transfer_number = self.generate_transfer_number()
        super().save(*args, **kwargs)
    
    def generate_transfer_number(self):
        """Génère un numéro de transfert unique"""
        from datetime import datetime
        date_str = datetime.now().strftime('%Y%m')
        # Compter les transferts du mois
        count = StockTransfer.objects.filter(
            transfer_number__startswith=f'TRF{date_str}'
        ).count()
        return f'TRF{date_str}{str(count + 1).zfill(3)}'
    
    @property
    def is_pending_validation(self):
        return self.status == 'suggested'
    
    @property
    def is_in_transit(self):
        return self.status == 'in_transit'
    
    @property
    def is_completed(self):
        return self.status == 'received'


class StockTransferItem(models.Model):
    """Articles d'un transfert de stock"""
    transfer = models.ForeignKey(
        StockTransfer, 
        on_delete=models.CASCADE, 
        related_name='items'
    )
    product = models.ForeignKey(
        'products.Product', 
        on_delete=models.CASCADE
    )
    
    # Quantités
    quantity_suggested = models.PositiveIntegerField(default=0, verbose_name="Quantité suggérée")
    quantity_validated = models.PositiveIntegerField(default=0, verbose_name="Quantité validée")
    quantity_shipped = models.PositiveIntegerField(default=0, verbose_name="Quantité expédiée")
    quantity_received = models.PositiveIntegerField(default=0, verbose_name="Quantité reçue")
    
    # Prix pour valorisation
    unit_cost = models.DecimalField(max_digits=10, decimal_places=2, default=0, verbose_name="Coût unitaire")
    total_cost = models.DecimalField(max_digits=12, decimal_places=2, default=0, verbose_name="Coût total")
    
    # Informations
    notes = models.TextField(blank=True, verbose_name="Notes")
    batch_number = models.CharField(max_length=50, blank=True, verbose_name="Numéro de lot")
    
    # Métadonnées
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'stock_transfer_items'
        unique_together = ['transfer', 'product']
        ordering = ['transfer__transfer_number', 'product__name']
        indexes = [
            models.Index(fields=['transfer', 'product']),
            models.Index(fields=['product', 'transfer']),
        ]
    
    def __str__(self):
        return f"{self.product.name} - {self.transfer.transfer_number}"
    
    def save(self, *args, **kwargs):
        # Calculer le coût total
        self.total_cost = self.quantity_validated * self.unit_cost
        super().save(*args, **kwargs)
    
    @property
    def is_fully_received(self):
        return self.quantity_received >= self.quantity_validated
    
    @property
    def reception_percentage(self):
        if self.quantity_validated == 0:
            return 0
        return (self.quantity_received / self.quantity_validated) * 100


class TransferSuggestion(models.Model):
    """Suggestions de transfert générées automatiquement"""
    product = models.ForeignKey(
        'products.Product', 
        on_delete=models.CASCADE, 
        related_name='transfer_suggestions'
    )
    from_store = models.CharField(max_length=20, default='central')
    to_store = models.CharField(max_length=20)
    
    # Calculs
    current_stock = models.IntegerField()
    min_stock = models.IntegerField()
    needed_quantity = models.IntegerField()
    available_quantity = models.IntegerField()
    suggested_quantity = models.IntegerField()
    
    # Priorité et scoring
    priority_score = models.FloatField(default=1.0)
    urgency_level = models.CharField(max_length=20, choices=[
        ('low', 'Faible'),
        ('medium', 'Moyen'),
        ('high', 'Élevé'),
        ('critical', 'Critique'),
    ], default='medium')
    
    # Raison et contexte
    reason = models.TextField()
    context_data = models.JSONField(default=dict, blank=True)
    
    # Statut
    is_active = models.BooleanField(default=True)
    applied = models.BooleanField(default=False)
    applied_at = models.DateTimeField(null=True, blank=True)
    applied_transfer = models.ForeignKey(
        StockTransfer, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='suggestions'
    )
    
    # Métadonnées
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'transfer_suggestions'
        ordering = ['-urgency_level', '-priority_score', 'created_at']
        indexes = [
            models.Index(fields=['to_store', 'urgency_level']),
            models.Index(fields=['product', 'is_active']),
            models.Index(fields=['applied', 'created_at']),
        ]
    
    def __str__(self):
        return f"Suggestion: {self.product.name} → {self.to_store}"
    
    @property
    def is_expired(self):
        if self.expires_at is None:
            return False
        return timezone.now() > self.expires_at
    
    def apply_suggestion(self, transfer):
        """Appliquer la suggestion à un transfert"""
        self.applied = True
        self.applied_at = timezone.now()
        self.applied_transfer = transfer
        self.save()
