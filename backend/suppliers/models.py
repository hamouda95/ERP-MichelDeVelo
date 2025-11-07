from django.db import models


class Supplier(models.Model):
    """Fournisseurs"""
    # Informations générales
    name = models.CharField(max_length=200, verbose_name="Nom du fournisseur")
    company_name = models.CharField(max_length=200, blank=True, verbose_name="Raison sociale")
    
    # Contact
    contact_person = models.CharField(max_length=100, blank=True, verbose_name="Personne de contact")
    email = models.EmailField(verbose_name="Email")
    phone = models.CharField(max_length=20, verbose_name="Téléphone")
    phone_secondary = models.CharField(max_length=20, blank=True, verbose_name="Téléphone secondaire")
    website = models.URLField(blank=True, verbose_name="Site web")
    
    # Adresse
    address = models.CharField(max_length=255, verbose_name="Adresse")
    city = models.CharField(max_length=100, verbose_name="Ville")
    postal_code = models.CharField(max_length=10, verbose_name="Code postal")
    country = models.CharField(max_length=100, default='France', verbose_name="Pays")
    
    # Informations légales
    siret = models.CharField(max_length=14, blank=True, verbose_name="SIRET")
    vat_number = models.CharField(max_length=20, blank=True, verbose_name="Numéro TVA")
    
    # Informations commerciales
    payment_terms = models.CharField(max_length=100, blank=True, verbose_name="Conditions de paiement")
    delivery_delay = models.IntegerField(default=7, verbose_name="Délai de livraison (jours)")
    minimum_order = models.DecimalField(max_digits=10, decimal_places=2, default=0, verbose_name="Montant minimum de commande")
    
    # Catégories de produits fournis
    product_categories = models.TextField(blank=True, verbose_name="Catégories de produits fournis")
    
    # Notes
    notes = models.TextField(blank=True, verbose_name="Notes")
    
    # Statut
    is_active = models.BooleanField(default=True, verbose_name="Actif")
    is_preferred = models.BooleanField(default=False, verbose_name="Fournisseur préféré")
    
    # Statistiques
    total_orders = models.IntegerField(default=0, verbose_name="Nombre total de commandes")
    total_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0, verbose_name="Montant total acheté")
    
    # Métadonnées
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'suppliers'
        ordering = ['name']
        indexes = [
            models.Index(fields=['name']),
            models.Index(fields=['email']),
        ]
    
    def __str__(self):
        return self.name


class PurchaseOrder(models.Model):
    """Bon de commande fournisseur"""
    STATUS_CHOICES = [
        ('draft', 'Brouillon'),
        ('sent', 'Envoyé'),
        ('confirmed', 'Confirmé'),
        ('partial', 'Partiellement reçu'),
        ('received', 'Reçu'),
        ('cancelled', 'Annulé'),
    ]
    
    STORE_CHOICES = [
        ('ville_avray', 'Ville d\'Avray'),
        ('garches', 'Garches'),
    ]
    
    # Numéro de commande
    purchase_order_number = models.CharField(max_length=30, unique=True, editable=False)
    
    # Fournisseur
    supplier = models.ForeignKey(Supplier, on_delete=models.PROTECT, related_name='purchase_orders')
    
    # Informations
    order_date = models.DateField(auto_now_add=True)
    expected_delivery_date = models.DateField(verbose_name="Date de livraison prévue")
    actual_delivery_date = models.DateField(null=True, blank=True, verbose_name="Date de livraison réelle")
    
    # Magasin de destination
    store = models.CharField(max_length=20, choices=STORE_CHOICES)
    
    # Statut
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    
    # Montants
    subtotal_ht = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    total_tva = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    total_ttc = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    
    # Notes
    notes = models.TextField(blank=True)
    
    # Référence fournisseur
    supplier_reference = models.CharField(max_length=50, blank=True, verbose_name="Référence fournisseur")
    
    # Métadonnées
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'purchase_orders'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['purchase_order_number']),
            models.Index(fields=['status']),
        ]
    
    def __str__(self):
        return f"Commande {self.purchase_order_number}"
    
    def save(self, *args, **kwargs):
        if not self.purchase_order_number:
            self.purchase_order_number = self.generate_purchase_order_number()
        super().save(*args, **kwargs)
    
    def generate_purchase_order_number(self):
        """
        Génère un numéro de commande au format:
        BCA04112025-000001 pour Ville d'Avray
        BCG04112025-000001 pour Garches
        """
        from django.utils import timezone
        today = timezone.now()
        date_str = today.strftime('%d%m%Y')
        
        prefix = 'BCA' if self.store == 'ville_avray' else 'BCG'
        
        last_po = PurchaseOrder.objects.filter(
            purchase_order_number__startswith=f"{prefix}{date_str}"
        ).order_by('-purchase_order_number').first()
        
        if last_po:
            last_number = int(last_po.purchase_order_number.split('-')[1])
            new_number = last_number + 1
        else:
            new_number = 1
        
        return f"{prefix}{date_str}-{new_number:07d}"


class PurchaseOrderItem(models.Model):
    """Articles d'un bon de commande"""
    purchase_order = models.ForeignKey(PurchaseOrder, on_delete=models.CASCADE, related_name='items')
    
    # Référence produit (peut être un produit existant ou une nouvelle référence)
    product = models.ForeignKey('products.Product', on_delete=models.SET_NULL, null=True, blank=True)
    product_reference = models.CharField(max_length=100, verbose_name="Référence produit")
    product_name = models.CharField(max_length=200, verbose_name="Nom du produit")
    
    # Quantités
    quantity_ordered = models.IntegerField(verbose_name="Quantité commandée")
    quantity_received = models.IntegerField(default=0, verbose_name="Quantité reçue")
    
    # Prix
    unit_price_ht = models.DecimalField(max_digits=10, decimal_places=2)
    tva_rate = models.DecimalField(max_digits=5, decimal_places=2, default=20)
    subtotal_ht = models.DecimalField(max_digits=10, decimal_places=2)
    
    class Meta:
        db_table = 'purchase_order_items'
    
    def __str__(self):
        return f"{self.product_name} x {self.quantity_ordered}"
    
    def save(self, *args, **kwargs):
        self.subtotal_ht = self.unit_price_ht * self.quantity_ordered
        super().save(*args, **kwargs)