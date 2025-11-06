from django.db import models

class Category(models.Model):
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'categories'
        verbose_name_plural = 'Categories'
    
    def __str__(self):
        return self.name

class Product(models.Model):
    PRODUCT_TYPE = [
        ('bike', 'Vélo'),
        ('accessory', 'Accessoire'),
        ('part', 'Pièce détachée'),
        ('service', 'Service'),
    ]
    
    STORE_CHOICES = [
        ('ville_avray', 'Ville d\'Avray'),
        ('garches', 'Garches'),
        ('both', 'Les deux magasins'),
    ]
    
    reference = models.CharField(max_length=50, unique=True)
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    product_type = models.CharField(max_length=20, choices=PRODUCT_TYPE, default='bike')
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True, related_name='products')
    
    price_ht = models.DecimalField(max_digits=10, decimal_places=2)
    price_ttc = models.DecimalField(max_digits=10, decimal_places=2)
    tva_rate = models.DecimalField(max_digits=5, decimal_places=2, default=20.00)
    
    stock_ville_avray = models.IntegerField(default=0)
    stock_garches = models.IntegerField(default=0)
    alert_stock = models.IntegerField(default=5)
    
    barcode = models.CharField(max_length=100, blank=True, unique=True, null=True)
    image = models.ImageField(upload_to='products/', blank=True, null=True)
    
    is_active = models.BooleanField(default=True)
    is_visible = models.BooleanField(default=True)
    
    brand = models.CharField(max_length=100, blank=True)
    weight = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'products'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['reference']),
            models.Index(fields=['barcode']),
            models.Index(fields=['name']),
        ]

    size = models.CharField(max_length=50, blank=True, null=True, verbose_name='Taille')

    
    def __str__(self):
        return f"{self.reference} - {self.name}"
    
    @property
    def total_stock(self):
        return self.stock_ville_avray + self.stock_garches
    
    @property
    def is_low_stock(self):
        return self.total_stock <= self.alert_stock
