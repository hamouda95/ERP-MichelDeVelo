from django.contrib import admin
from .models import Invoice


@admin.register(Invoice)
class InvoiceAdmin(admin.ModelAdmin):
    list_display = ['invoice_number', 'order', 'invoice_date', 'is_paid']
    list_filter = ['is_paid', 'invoice_date']
    search_fields = ['invoice_number']
