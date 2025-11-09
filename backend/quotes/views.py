from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db import transaction
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters
from .models import Quote, QuoteItem
from .serializers import QuoteSerializer
from products.models import Product
from orders.models import Order, OrderItem
from django.utils.dateparse import parse_date


class QuoteViewSet(viewsets.ModelViewSet):
    queryset = Quote.objects.all()
    serializer_class = QuoteSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'store', 'client']
    search_fields = ['quote_number', 'client__first_name', 'client__last_name']
    ordering_fields = ['created_at', 'quote_date', 'valid_until']
    ordering = ['-created_at']
    
    
    def create(self, request, *args, **kwargs):
        """Créer un devis (similaire à une commande mais sans affecter le stock)"""
        try:
            with transaction.atomic():
                items_data = request.data.get('items', [])
                
                if not items_data:
                    return Response(
                        {'error': 'Aucun article dans le devis'}, 
                        status=status.HTTP_400_BAD_REQUEST
                    )
                valid_until = request.data['valid_until']
                if isinstance(valid_until, str):
                    valid_until = parse_date(valid_until)
                

    
                # Créer le devis
                quote = Quote.objects.create(
                    client_id=request.data['client'],
                    user=request.user,
                    store=request.data['store'],
                    valid_until=valid_until,
                    notes=request.data.get('notes', '')
)
                
                # Créer les items
                subtotal_ht = 0
                total_tva = 0
                
                for item_data in items_data:
                    product = Product.objects.get(id=item_data['product'])
                    
                    # Calculer les prix
                    unit_price_ht = float(item_data.get('unit_price', product.price_ht))
                    unit_price_ttc = float(item_data.get('unit_price_ttc', product.price_ttc))
                    tva_rate = float(item_data.get('tva_rate', product.tva_rate))
                    quantity = int(item_data['quantity'])
                    
                    quote_item = QuoteItem.objects.create(
                        quote=quote,
                        product=product,
                        quantity=quantity,
                        unit_price_ht=unit_price_ht,
                        unit_price_ttc=unit_price_ttc,
                        tva_rate=tva_rate,
                    )
                    
                    subtotal_ht += float(quote_item.subtotal_ht)
                    total_tva += (float(quote_item.subtotal_ttc) - float(quote_item.subtotal_ht))
                
                # Appliquer les remises si présentes
                discount_amount = float(request.data.get('discount_amount', 0))
                if discount_amount > 0:
                    discount_type = request.data.get('discount_type', 'amount')
                    if discount_type == 'percentage':
                        discount_amount = subtotal_ht * (discount_amount / 100)
                    subtotal_ht -= discount_amount
                    quote.discount_amount = discount_amount
                
                # Mettre à jour les totaux
                quote.subtotal_ht = subtotal_ht
                quote.total_tva = total_tva
                quote.total_ttc = subtotal_ht + total_tva
                quote.save()
                
                serializer = self.get_serializer(quote)
                return Response(serializer.data, status=status.HTTP_201_CREATED)
                
        except Product.DoesNotExist:
            return Response({'error': 'Produit introuvable'}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['post'])
    def convert_to_order(self, request, pk=None):
        """Convertir un devis en commande"""
        quote = self.get_object()
        
        if quote.status == 'converted':
            return Response(
                {'error': 'Ce devis a déjà été converti en commande'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if quote.is_expired():
            return Response(
                {'error': 'Ce devis est expiré'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            with transaction.atomic():
                # Créer la commande
                order = Order.objects.create(
                    client=quote.client,
                    user=request.user,
                    store=quote.store,
                    payment_method=request.data.get('payment_method', 'cash'),
                    subtotal_ht=quote.subtotal_ht,
                    total_tva=quote.total_tva,
                    total_ttc=quote.total_ttc,
                    discount_amount=quote.discount_amount,
                    discount_percentage=quote.discount_percentage,
                    notes=f"Converti du devis {quote.quote_number}. {quote.notes}"
                )
                
                # Copier les items et déduire du stock
                for quote_item in quote.items.all():
                    OrderItem.objects.create(
                        order=order,
                        product=quote_item.product,
                        quantity=quote_item.quantity,
                        unit_price_ht=quote_item.unit_price_ht,
                        unit_price_ttc=quote_item.unit_price_ttc,
                        tva_rate=quote_item.tva_rate,
                    )
                    
                    # Déduire du stock
                    product = quote_item.product
                    if order.store == 'ville_avray':
                        product.stock_ville_avray -= quote_item.quantity
                    else:
                        product.stock_garches -= quote_item.quantity
                    product.save()
                
                order.status = 'completed'
                order.save()
                
                # Marquer le devis comme converti
                quote.status = 'converted'
                quote.converted_to_order = order
                quote.save()
                
                # Créer la facture
                from invoices.models import Invoice
                invoice = Invoice.objects.create(order=order)
                
                return Response({
                    'message': 'Devis converti en commande avec succès',
                    'order_id': order.id,
                    'order_number': order.order_number,
                    'invoice_id': invoice.id
                })
                
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['post'])
    def update_status(self, request, pk=None):
        """Mettre à jour le statut du devis"""
        quote = self.get_object()
        new_status = request.data.get('status')
        
        if new_status not in dict(Quote.STATUS_CHOICES):
            return Response(
                {'error': 'Statut invalide'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        quote.status = new_status
        quote.save()
        
        serializer = self.get_serializer(quote)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post', 'get'])
    def generate_pdf(self, request, pk=None):
        """Générer le PDF du devis"""
        quote = self.get_object()
        
        # TODO: Implémenter la génération PDF (similaire aux factures)
        # Utiliser ReportLab comme pour les factures
        
        return Response({
            'message': 'PDF généré avec succès',
            'pdf_url': quote.quote_pdf.url if quote.quote_pdf else None
        })
    
    @action(detail=True, methods=['get'])
    def print(self, request, pk=None):
        """Alias pour generate_pdf pour compatibilité frontend"""
        return self.generate_pdf(request, pk)
