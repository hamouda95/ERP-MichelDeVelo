from django.db import models
from django.contrib.auth import get_user_model
from django.core.validators import MinValueValidator, MaxValueValidator
from django.utils import timezone
from clients.models import Client
from products.models import Product

User = get_user_model()


class Repair(models.Model):
    """
    Modèle principal pour les réparations - Atelier Digital
    """
    STATUS_CHOICES = [
        ('pending', 'Réception vélo'),
        ('in_progress', 'En réparation'),
        ('completed', 'Réparé - SMS envoyé'),
        ('delivered', 'Vélo récupéré'),
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
    
    TYPE_CHOICES = [
        ('repair', 'Réparation'),
        ('maintenance', 'Entretien'),
        ('customization', 'Personnalisation'),
        ('emergency', 'Urgence'),
    ]
    
    # Numéro de référence auto-généré
    reference_number = models.CharField(max_length=30, unique=True, editable=False)
    
    # Informations client
    client = models.ForeignKey(Client, on_delete=models.PROTECT, related_name='repairs')
    
    # Informations vélo
    bike_brand = models.CharField(max_length=100, verbose_name="Marque du vélo")
    bike_model = models.CharField(max_length=200, blank=True, verbose_name="Modèle du vélo")
    bike_serial_number = models.CharField(max_length=100, blank=True, verbose_name="Numéro de série")
    bike_type = models.CharField(max_length=50, choices=[
        ('mtb', 'VTT'),
        ('road', 'Route'),
        ('electric', 'Électrique'),
        ('city', 'Ville'),
        ('kids', 'Enfant'),
        ('other', 'Autre'),
    ], default='other', verbose_name="Type de vélo")
    
    # Photos du vélo (jusqu'à 3 photos)
    photo_1 = models.ImageField(upload_to='repairs/photos/', blank=True, null=True)
    photo_2 = models.ImageField(upload_to='repairs/photos/', blank=True, null=True)
    photo_3 = models.ImageField(upload_to='repairs/photos/', blank=True, null=True)
    
    # Détails réparation
    repair_type = models.CharField(max_length=20, choices=TYPE_CHOICES, default='repair', verbose_name="Type de service")
    description = models.TextField(verbose_name="Description du problème")
    diagnosis = models.TextField(blank=True, verbose_name="Diagnostic technique")
    notes = models.TextField(blank=True, verbose_name="Notes internes")
    
    # Dates
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Date de création")
    estimated_completion = models.DateField(null=True, blank=True, verbose_name="Date de livraison estimée")
    actual_completion = models.DateField(null=True, blank=True, verbose_name="Date de livraison réelle")
    estimated_duration = models.IntegerField(null=True, blank=True, verbose_name="Durée estimée (heures)")
    
    # Informations gestion
    store = models.CharField(max_length=20, choices=STORE_CHOICES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    priority = models.CharField(max_length=20, choices=PRIORITY_CHOICES, default='normal')
    assigned_to = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='assigned_repairs')
    
    # Coûts
    estimated_cost = models.DecimalField(max_digits=10, decimal_places=2, default=0, verbose_name="Coût estimé")
    final_cost = models.DecimalField(max_digits=10, decimal_places=2, default=0, verbose_name="Coût final")
    deposit_paid = models.DecimalField(max_digits=10, decimal_places=2, default=0, verbose_name="Acompte versé")
    max_budget = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True, verbose_name="Budget maximum")
    
    # Suivi client
    client_notified = models.BooleanField(default=False, verbose_name="Client notifié")
    client_approved = models.BooleanField(default=False, verbose_name="Devis approuvé par client")
    client_approval_date = models.DateTimeField(null=True, blank=True, verbose_name="Date d'approbation client")
    
    # Pièces et main d'œuvre
    labor_hours = models.DecimalField(max_digits=5, decimal_places=2, default=0, verbose_name="Heures de main d'œuvre")
    labor_rate = models.DecimalField(max_digits=5, decimal_places=2, default=35.00, verbose_name="Taux horaire")
    
    # Documents
    quote_pdf = models.FileField(upload_to='repairs/quotes/', blank=True, null=True, verbose_name="Devis PDF")
    invoice_pdf = models.FileField(upload_to='repairs/invoices/', blank=True, null=True, verbose_name="Facture PDF")
    
    # Métadonnées
    created_by = models.ForeignKey(User, on_delete=models.PROTECT, related_name='created_repairs')
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'repairs'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['reference_number']),
            models.Index(fields=['status']),
            models.Index(fields=['created_at']),
            models.Index(fields=['store']),
            models.Index(fields=['priority']),
        ]
    
    def __str__(self):
        return f"Réparation {self.reference_number} - {self.bike_brand} {self.bike_model}"
    
    def save(self, *args, **kwargs):
        if not self.reference_number:
            self.reference_number = self.generate_reference_number()
        super().save(*args, **kwargs)
    
    def generate_reference_number(self):
        """Génère un numéro de référence unique"""
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
    
    @property
    def labor_cost(self):
        """Coût de la main d'œuvre"""
        return self.labor_hours * self.labor_rate
    
    @property
    def parts_cost(self):
        """Coût total des pièces"""
        return sum(item.total_price for item in self.items.all())
    
    @property
    def total_cost(self):
        """Coût total (main d'œuvre + pièces)"""
        return self.labor_cost + self.parts_cost
    
    @property
    def is_overdue(self):
        """Vérifie si la réparation est en retard"""
        if self.estimated_completion and self.status not in ['completed', 'delivered', 'cancelled']:
            return timezone.now().date() > self.estimated_completion
        return False
    
    @property
    def days_in_workshop(self):
        """Nombre de jours passés à l'atelier"""
        if self.actual_completion:
            return (self.actual_completion - self.created_at.date()).days
        return (timezone.now().date() - self.created_at.date()).days


class RepairItem(models.Model):
    """
    Articles/pièces utilisées pour une réparation
    """
    ITEM_TYPE_CHOICES = [
        ('part', 'Pièce'),
        ('labor', 'Main d\'œuvre'),
        ('service', 'Service'),
        ('other', 'Autre'),
    ]
    
    repair = models.ForeignKey(Repair, on_delete=models.CASCADE, related_name='items')
    item_type = models.CharField(max_length=20, choices=ITEM_TYPE_CHOICES, default='part')
    product = models.ForeignKey(Product, on_delete=models.SET_NULL, null=True, blank=True, verbose_name="Produit (si applicable)")
    description = models.CharField(max_length=200, verbose_name="Description")
    quantity = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(0)])
    unit_price = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(0)])
    total_price = models.DecimalField(max_digits=10, decimal_places=2)
    
    # Informations de suivi
    ordered = models.BooleanField(default=False, verbose_name="Pièce commandée")
    received = models.BooleanField(default=False, verbose_name="Pièce reçue")
    ordered_date = models.DateField(null=True, blank=True, verbose_name="Date de commande")
    received_date = models.DateField(null=True, blank=True, verbose_name="Date de réception")
    
    class Meta:
        db_table = 'repair_items'
        ordering = ['item_type', 'description']
    
    def __str__(self):
        return f"{self.description} x {self.quantity}"
    
    def save(self, *args, **kwargs):
        self.total_price = self.unit_price * self.quantity
        super().save(*args, **kwargs)


class RepairTimeline(models.Model):
    """
    Suivi chronologique des réparations
    """
    repair = models.ForeignKey(Repair, on_delete=models.CASCADE, related_name='timeline')
    status = models.CharField(max_length=20, choices=Repair.STATUS_CHOICES)
    description = models.TextField(blank=True)
    created_by = models.ForeignKey(User, on_delete=models.PROTECT)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'repair_timeline'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.repair.reference_number} - {self.get_status_display()}"


class RepairDocument(models.Model):
    """
    Documents associés aux réparations
    """
    DOCUMENT_TYPE_CHOICES = [
        ('quote', 'Devis'),
        ('invoice', 'Facture'),
        ('photo', 'Photo'),
        ('diagnostic', 'Rapport de diagnostic'),
        ('other', 'Autre'),
    ]
    
    repair = models.ForeignKey(Repair, on_delete=models.CASCADE, related_name='documents')
    document_type = models.CharField(max_length=20, choices=DOCUMENT_TYPE_CHOICES)
    title = models.CharField(max_length=200)
    file = models.FileField(upload_to='repairs/documents/')
    uploaded_by = models.ForeignKey(User, on_delete=models.PROTECT)
    uploaded_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'repair_documents'
        ordering = ['-uploaded_at']
    
    def __str__(self):
        return f"{self.repair.reference_number} - {self.title}"


class WorkshopWorkload(models.Model):
    """
    Gestion de la charge de travail de l'atelier
    """
    date = models.DateField()
    store = models.CharField(max_length=20, choices=Repair.STORE_CHOICES)
    mechanic = models.ForeignKey(User, on_delete=models.CASCADE, related_name='workload')
    estimated_hours = models.DecimalField(max_digits=5, decimal_places=2)
    actual_hours = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    
    class Meta:
        db_table = 'workshop_workload'
        unique_together = ['date', 'store', 'mechanic']
        ordering = ['-date', 'store', 'mechanic']
    
    def __str__(self):
        return f"{self.mechanic.username} - {self.date} ({self.store})"
