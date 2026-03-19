from rest_framework import viewsets, status
from rest_framework.response import Response
from django.db import transaction
from .models import Order, OrderItem
from .serializers import OrderSerializer
from products.models import Product
import logging

logger = logging.getLogger(__name__)


class OrderViewSet(viewsets.ModelViewSet):
    queryset = Order.objects.all()
    serializer_class = OrderSerializer
    ordering = ['-created_at']
    
    def create(self, request, *args, **kwargs):
        # Debug: afficher les données reçues
        logger.info("===== DONNÉES REÇUES =====")
        logger.info(request.data)
        logger.info("===========================")
        
        try:
            with transaction.atomic():
                # Extraire les items
                items_data = request.data.get('items', [])
                
                if not items_data:
                    return Response(
                        {'error': 'Aucun article dans la commande'}, 
                        status=status.HTTP_400_BAD_REQUEST
                    )
                
                # 🆕 Extraire les notes (optionnel)
                notes = request.data.get('notes', None)
                if notes:
                    notes = notes.strip() or None
                
                # Créer la commande
                order = Order.objects.create(
                    client_id=request.data['client'],
                    user=request.user,
                    store=request.data['store'],
                    payment_method=request.data.get('payment_method', 'cash'),
                    installments=request.data.get('installments', 1),
                    notes=notes,  # 🆕 Ajout des notes
                )
                
                logger.info(f"Commande créée: ID={order.id}, Notes={order.notes}")
                
                # Créer les items et calculer les totaux
                subtotal_ht = 0
                total_tva = 0
                
                for item_data in items_data:
                    # Gérer les réparations (sans produit) et les produits (avec produit)
                    if 'product' in item_data and item_data['product']:
                        # Item avec produit
                        product = Product.objects.get(id=item_data['product'])
                        
                        # Créer l'item
                        order_item = OrderItem.objects.create(
                            order=order,
                            product=product,
                            quantity=item_data['quantity'],
                            unit_price_ht=float(item_data.get('unit_price_ht', item_data['unit_price'])),
                            unit_price_ttc=float(item_data.get('unit_price_ttc', item_data['unit_price'])),
                            tva_rate=float(item_data.get('tva_rate', 20.0)),
                            description=item_data.get('description', f"{product.name} x {item_data['quantity']}")
                        )
                        
                        subtotal_ht += float(order_item.subtotal_ht)
                        total_tva += (float(order_item.subtotal_ttc) - float(order_item.subtotal_ht))
                        
                        # Déduire du stock
                        if order.store == 'ville_avray':
                            product.stock_ville_avray -= item_data['quantity']
                        else:
                            product.stock_garches -= item_data['quantity']
                        product.save()
                    else:
                        # Item de réparation (sans produit)
                        unit_price = float(item_data['unit_price'])
                        # TVA par défaut pour services de réparation (20%)
                        tva_rate = 20.0
                        
                        # Créer l'item de commande sans produit réel
                        order_item = OrderItem.objects.create(
                            order=order,
                            product=None,  # Pas de produit pour les réparations
                            quantity=item_data['quantity'],
                            unit_price_ht=unit_price,
                            unit_price_ttc=unit_price * (1 + tva_rate/100),
                            tva_rate=tva_rate,
                            description=item_data.get('description', 'Service de réparation')
                        )
                        
                        # Calculer les totaux pour cet item
                        item_subtotal_ht = unit_price * item_data['quantity']
                        item_subtotal_ttc = unit_price * (1 + tva_rate/100) * item_data['quantity']
                        
                        subtotal_ht += item_subtotal_ht
                        total_tva += (item_subtotal_ttc - item_subtotal_ht)
                
                # Mettre à jour les totaux de la commande
                order.subtotal_ht = subtotal_ht
                order.total_tva = total_tva
                order.total_ttc = subtotal_ht + total_tva
                order.status = 'completed'
                order.save()
                
                logger.info(f"Totaux calculés: HT={subtotal_ht}, TVA={total_tva}, TTC={order.total_ttc}")
                
                # Créer la facture automatiquement
                from invoices.models import Invoice
                invoice = Invoice.objects.create(order=order)
                
                logger.info(f"Facture créée: {invoice.invoice_number}")
                
                serializer = self.get_serializer(order)
                return Response(serializer.data, status=status.HTTP_201_CREATED)
                
        except Product.DoesNotExist:
            logger.error("Produit non trouvé")
            return Response(
                {'error': 'Produit non trouvé'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        except KeyError as e:
            logger.error(f"Champ manquant: {str(e)}")
            return Response(
                {'error': f'Champ manquant: {str(e)}'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            logger.error("===== ERREUR =====")
            logger.error(f"Type: {type(e).__name__}")
            logger.error(f"Message: {str(e)}")
            logger.error("==================")
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_400_BAD_REQUEST
            )
