from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()

class Expense(models.Model):
    """Dépenses de l'entreprise"""
    CATEGORY_CHOICES = [
        ('rent', 'Loyer'),
        ('utilities', 'Factures'),
        ('salaries', 'Salaires'),
        ('supplies', 'Fournitures'),
        ('maintenance', 'Maintenance'),
        ('marketing', 'Marketing'),
        ('insurance', 'Assurance'),
        ('taxes', 'Taxes'),
        ('other', 'Autre'),
    ]
    
    PAYMENT_METHOD_CHOICES = [
        ('cash', 'Espèces'),
        ('bank_transfer', 'Virement bancaire'),
        ('card', 'Carte bancaire'),
        ('check', 'Chèque'),
    ]
    
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES)
    description = models.TextField()
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    date = models.DateField()
    payment_method = models.CharField(max_length=20, choices=PAYMENT_METHOD_CHOICES)
    receipt = models.FileField(upload_to='finance/receipts/', null=True, blank=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-date']
        verbose_name = 'Dépense'
        verbose_name_plural = 'Dépenses'

    def __str__(self):
        return f"{self.category} - {self.amount}€"

class Revenue(models.Model):
    """Revenus de l'entreprise"""
    CATEGORY_CHOICES = [
        ('sales', 'Ventes'),
        ('repairs', 'Réparations'),
        ('services', 'Services'),
        ('rental', 'Location'),
        ('other', 'Autre'),
    ]
    
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES)
    description = models.TextField()
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    date = models.DateField()
    source = models.CharField(max_length=100)  # Source du revenu
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-date']
        verbose_name = 'Revenu'
        verbose_name_plural = 'Revenus'

    def __str__(self):
        return f"{self.category} - {self.amount}€"
