from rest_framework import viewsets, status
from rest_framework.response import Response
from django.db import transaction
from .models import Order, OrderItem
from .serializers import OrderSerializer
from products.models import Product

class OrderViewSet(viewsets.ModelViewSet):
    queryset = Order.objects.all()
    serializer_class = OrderSerializer
    ordering = ['-created_at']
    
    def create(self, request, *args, **kwargs):
        # Debug: afficher les données reçues
        print("===== DONNÉES REÇUES =====")
        print(request.data)
        print("===========================")
        
        try:
            with transaction.atomic():
                # Extraire les items
                items_data = request.data.get('items', [])
                
                if not items_data:
                    return Response(
                        {'error': 'Aucun article dans la commande'}, 
                        status=status.HTTP_400_BAD_REQUEST
                    )
                
                # Créer la commande
                order = Order.objects.create(
                    client_id=request.data['client'],
                    user=request.user,
                    store=request.data['store'],
                    payment_method=request.data.get('payment_method', 'cash'),
                    installments=request.data.get('installments', 1),
                )
                
                # Créer les items et calculer les totaux
                subtotal_ht = 0
                total_tva = 0
                
                for item_data in items_data:
                    product = Product.objects.get(id=item_data['product'])
                    
                    # Créer l'item
                    order_item = OrderItem.objects.create(
                        order=order,
                        product=product,
                        quantity=item_data['quantity'],
                        unit_price_ht=float(item_data['unit_price_ht']),
                        unit_price_ttc=float(item_data['unit_price_ttc']),
                        tva_rate=float(item_data['tva_rate']),
                    )
                    
                    subtotal_ht += float(order_item.subtotal_ht)
                    total_tva += (float(order_item.subtotal_ttc) - float(order_item.subtotal_ht))
                    
                    # Déduire du stock
                    if order.store == 'ville_avray':
                        product.stock_ville_avray -= item_data['quantity']
                    else:
                        product.stock_garches -= item_data['quantity']
                    product.save()
                
                # Mettre à jour les totaux de la commande
                order.subtotal_ht = subtotal_ht
                order.total_tva = total_tva
                order.total_ttc = subtotal_ht + total_tva
                order.status = 'completed'
                order.save()
                
                # Créer la facture automatiquement
                from invoices.models import Invoice
                invoice = Invoice.objects.create(order=order)
                
                serializer = self.get_serializer(order)
                return Response(serializer.data, status=status.HTTP_201_CREATED)
                
        except Exception as e:
            print("===== ERREUR =====")
            print("Type:", type(e).__name__)
            print("Message:", str(e))
            print("==================")
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)