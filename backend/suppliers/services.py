"""
Services métier pour le module Achat
"""
from django.db import transaction, models
from django.utils import timezone
from decimal import Decimal
from .models import PurchaseOrder, PurchaseOrderItem, Supplier
from products.models import Product
from django.core.mail import send_mail
from django.conf import settings

class PurchaseOrderService:
    
    @staticmethod
    @transaction.atomic
    def create_purchase_order(supplier_id, store, items_data, expected_delivery_date=None, notes="", shipping_cost=0, user=None):
        """
        Créer une commande d'achat avec mise à jour automatique des statistiques
        """
        supplier = Supplier.objects.get(id=supplier_id)
        
        # Créer la commande
        order = PurchaseOrder.objects.create(
            supplier=supplier,
            store=store,
            expected_delivery_date=expected_delivery_date or timezone.now().date() + timezone.timedelta(days=supplier.delivery_delay),
            notes=notes,
            shipping_cost=Decimal(str(shipping_cost)),
            status='draft'
        )
        
        # Ajouter les articles
        subtotal = Decimal('0')
        for item_data in items_data:
            product = Product.objects.get(id=item_data['product_id'])
            quantity = Decimal(str(item_data['quantity']))
            unit_price = Decimal(str(item_data['unit_price']))
            
            PurchaseOrderItem.objects.create(
                purchase_order=order,
                product=product,
                quantity=quantity,
                unit_price=unit_price,
                total_price=quantity * unit_price
            )
            
            subtotal += quantity * unit_price
        
        # Calculer les totaux
        order.subtotal_ht = subtotal
        order.total_ttc = subtotal + Decimal(str(shipping_cost))
        order.save()
        
        return order
    
    @staticmethod
    @transaction.atomic
    def receive_purchase_items(order_id, received_items_data, user=None):
        """
        Réceptionner les articles d'une commande et mettre à jour les stocks
        """
        order = PurchaseOrder.objects.get(id=order_id)
        
        if order.status not in ['confirmed', 'partial']:
            raise ValueError("Seules les commandes confirmées peuvent être réceptionnées")
        
        all_received = True
        for item_data in received_items_data:
            item = PurchaseOrderItem.objects.get(id=item_data['item_id'])
            received_quantity = Decimal(str(item_data['received_quantity']))
            
            if received_quantity > 0:
                # Mettre à jour la quantité reçue
                item.quantity_received = (item.quantity_received or 0) + received_quantity
                item.save()
                
                # Mettre à jour le stock du produit
                product = item.product
                if order.store == 'ville_avray':
                    product.stock_ville_avray += int(received_quantity)
                else:
                    product.stock_garches += int(received_quantity)
                product.save()
            
            # Vérifier si tout est reçu
            if item.quantity_received < item.quantity:
                all_received = False
        
        # Mettre à jour le statut de la commande
        if all_received:
            order.status = 'received'
            order.actual_delivery_date = timezone.now().date()
        else:
            order.status = 'partial'
        
        order.save()
        
        # Mettre à jour les statistiques du fournisseur
        supplier = order.supplier
        supplier.total_orders += 1
        supplier.total_amount += order.total_ttc
        supplier.save()
        
        return order
    
    @staticmethod
    def send_order_to_supplier(order_id):
        """
        Envoyer une commande au fournisseur (simulation d'envoi email)
        """
        order = PurchaseOrder.objects.get(id=order_id)
        
        if order.status != 'draft':
            raise ValueError("Seules les commandes en brouillon peuvent être envoyées")
        
        order.status = 'sent'
        order.save()
        
        # Envoyer email au fournisseur
        try:
            subject = f"Commande d'achat {order.purchase_order_number} - Michel De Vélo"
            message = f"""
Bonjour {order.supplier.contact_person or order.supplier.name},

Nous vous confirmons notre commande d'achat {order.purchase_order_number}.

Détails de la commande:
- Date de livraison prévue: {order.expected_delivery_date}
- Magasin de destination: {order.get_store_display()}
- Montant total: {order.total_ttc} €

Vous trouverez les détails en pièce jointe.

Cordialement,
L'équipe de Michel De Vélo
            """
            
            send_mail(
                subject,
                message,
                settings.DEFAULT_FROM_EMAIL,
                [order.supplier.email],
                fail_silently=True,
            )
        except Exception as e:
            print(f"Erreur envoi email: {e}")
        
        return order
    
    @staticmethod
    def get_purchase_statistics(supplier_id=None, store=None, date_from=None, date_to=None):
        """
        Obtenir des statistiques sur les achats
        """
        queryset = PurchaseOrder.objects.all()
        
        if supplier_id:
            queryset = queryset.filter(supplier_id=supplier_id)
        if store:
            queryset = queryset.filter(store=store)
        if date_from:
            queryset = queryset.filter(order_date__gte=date_from)
        if date_to:
            queryset = queryset.filter(order_date__lte=date_to)
        
        stats = {
            'total_orders': queryset.count(),
            'total_amount': queryset.aggregate(total=models.Sum('total_ttc'))['total'] or 0,
            'pending_orders': queryset.filter(status__in=['draft', 'sent', 'confirmed']).count(),
            'received_orders': queryset.filter(status='received').count(),
            'average_order_value': queryset.aggregate(avg=models.Avg('total_ttc'))['avg'] or 0,
        }
        
        return stats
