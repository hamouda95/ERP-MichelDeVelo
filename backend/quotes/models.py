from django.db import models
from django.contrib.auth import get_user_model
from clients.models import Client
from products.models import Product

User = get_user_model()

class Quote(models.Model):
    """Devis - comme une commande mais sans affecter le stock"""
    STATUS_CHOICES = [
        ('draft', 'Brouillon'),
        ('sent', 'Envoyé'),
        ('accepted', 'Accepté'),
        ('rejected', 'Refusé'),
        ('expired', 'Expiré'),
        ('converted', 'Converti en commande'),
    ]
    
    STORE_CHOICES = [
        ('ville_avray', 'Ville d\'Avray'),
        ('garches', 'Garches'),
    ]
    
    quote_number = models.CharField(max_length=30, unique=True, editable=False)
    client = models.ForeignKey(Client, on_delete=models.PROTECT, related_name='quotes')
    user = models.ForeignKey(User, on_delete=models.PROTECT, related_name='quotes')
    store = models.CharField(max_length=20, choices=STORE_CHOICES)
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    
    # Dates
    quote_date = models.DateField(auto_now_add=True)
    valid_until = models.DateField(verbose_name="Valide jusqu'au")
    
    # Montants
    subtotal_ht = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    total_tva = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    total_ttc = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    
    discount_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    discount_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    
    notes = models.TextField(blank=True)
    
    # PDF généré
    quote_pdf = models.FileField(upload_to='quotes/', blank=True, null=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Si converti en commande
    converted_to_order = models.OneToOneField(
        'orders.Order', 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True, 
        related_name='source_quote'
    )
    
    class Meta:
        db_table = 'quotes'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['quote_number']),
            models.Index(fields=['status']),
        ]
    
    def __str__(self):
        return f"Devis {self.quote_number}"
    
    def save(self, *args, **kwargs):
        if not self.quote_number:
            self.quote_number = self.generate_quote_number()
        super().save(*args, **kwargs)
    
    def generate_quote_number(self):
        """
        Génère un numéro de devis au format:
        DA04112025-000001 pour Ville d'Avray
        DG04112025-000001 pour Garches
        """
        from django.utils import timezone
        today = timezone.now()
        date_str = today.strftime('%d%m%Y')
        
        prefix = 'DA' if self.store == 'ville_avray' else 'DG'
        
        last_quote = Quote.objects.filter(
            quote_number__startswith=f"{prefix}{date_str}"
        ).order_by('-quote_number').first()
        
        if last_quote:
            last_number = int(last_quote.quote_number.split('-')[1])
            new_number = last_number + 1
        else:
            new_number = 1
        
        return f"{prefix}{date_str}-{new_number:07d}"
    
    def is_expired(self):
        """Vérifier si le devis est expiré"""
        from django.utils import timezone
        return timezone.now().date() > self.valid_until


class QuoteItem(models.Model):
    """Articles dans un devis"""
    quote = models.ForeignKey(Quote, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey(Product, on_delete=models.PROTECT)
    
    quantity = models.IntegerField(default=1)
    unit_price_ht = models.DecimalField(max_digits=10, decimal_places=2)
    unit_price_ttc = models.DecimalField(max_digits=10, decimal_places=2)
    tva_rate = models.DecimalField(max_digits=5, decimal_places=2)
    
    subtotal_ht = models.DecimalField(max_digits=10, decimal_places=2)
    subtotal_ttc = models.DecimalField(max_digits=10, decimal_places=2)
    
    class Meta:
        db_table = 'quote_items'
    
    def __str__(self):
        return f"{self.product.name} x {self.quantity}"
    
    def save(self, *args, **kwargs):
        self.subtotal_ht = self.unit_price_ht * self.quantity
        self.subtotal_ttc = self.unit_price_ttc * self.quantity
        super().save(*args, **kwargs)