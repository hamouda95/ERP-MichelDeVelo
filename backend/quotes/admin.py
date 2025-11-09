from django.contrib import admin
from .models import Quote, QuoteItem


@admin.register(Quote)
class QuoteAdmin(admin.ModelAdmin):
    list_display = ['quote_number', 'client', 'store', 'status', 'total_ttc', 'quote_date', 'valid_until']
    list_filter = ['status', 'store', 'quote_date']
    search_fields = ['quote_number', 'client__first_name', 'client__last_name']
    readonly_fields = ['quote_number', 'created_at', 'updated_at']
    

@admin.register(QuoteItem)
class QuoteItemAdmin(admin.ModelAdmin):
    list_display = ['quote', 'product', 'quantity', 'unit_price_ttc', 'subtotal_ttc']
    list_filter = ['quote__status']
    search_fields = ['quote__quote_number', 'product__name']
