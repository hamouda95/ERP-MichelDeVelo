from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db import transaction
from django_filters.rest_framework import DjangoFilterBackend
from .models import Supplier, PurchaseOrder, PurchaseOrderItem
from .serializers import SupplierSerializer, PurchaseOrderSerializer, PurchaseOrderItemSerializer
from products.models import Product


class SupplierViewSet(viewsets.ModelViewSet):
    queryset = Supplier.objects.all()
    serializer_class = SupplierSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['is_active', 'is_preferred']
    search_fields = ['name', 'company_name', 'email', 'contact_person']
    ordering_fields = ['name', 'created_at', 'total_orders', 'total_amount']
    ordering = ['name']
    
    @action(detail=True, methods=['get'])
    def statistics(self, request, pk=None):
        """Statistiques d'un fournisseur"""
        supplier = self.get_object()
        
        # Commandes
        purchase_orders = supplier.purchase_orders.all()
        total_orders = purchase_orders.count()
        
        # Montant total
        from django.db.models import Sum
        total_amount = purchase_orders.aggregate(
            total=Sum('total_ttc')
        )['total'] or 0
        
        # Commandes par statut
        status_distribution = {}
        for status_choice in PurchaseOrder.STATUS_CHOICES:
            count = purchase_orders.filter(status=status_choice[0]).count()
            if count > 0:
                status_distribution[status_choice[1]] = count
        
        return Response({
            'total_orders': total_orders,
            'total_amount': float(total_amount),
            'status_distribution': status_distribution,
            'average_order_amount': float(total_amount / total_orders) if total_orders > 0 else 0
        })


class PurchaseOrderViewSet(viewsets.ModelViewSet):
    queryset = PurchaseOrder.objects.all()
    serializer_class = PurchaseOrderSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'store', 'supplier']
    search_fields = ['purchase_order_number', 'supplier__name']
    ordering_fields = ['created_at', 'order_date', 'expected_delivery_date']
    ordering = ['-created_at']
    
    def create(self, request, *args, **kwargs):
        """Créer un bon de commande"""
        try:
            with transaction.atomic():
                items_data = request.data.get('items', [])
                
                if not items_data:
                    return Response(
                        {'error': 'Aucun article dans la commande'}, 
                        status=status.HTTP_400_BAD_REQUEST
                    )
                
                # Créer le bon de commande
                purchase_order = PurchaseOrder.objects.create(
                    supplier_id=request.data['supplier'],
                    store=request.data['store'],
                    expected_delivery_date=request.data['expected_delivery_date'],
                    notes=request.data.get('notes', ''),
                    supplier_reference=request.data.get('supplier_reference', '')
                )
                
                # Créer les items
                subtotal_ht = 0
                total_tva = 0
                
                for item_data in items_data:
                    item = PurchaseOrderItem.objects.create(
                        purchase_order=purchase_order,
                        product_id=item_data.get('product'),
                        product_reference=item_data['product_reference'],
                        product_name=item_data['product_name'],
                        quantity_ordered=item_data['quantity_ordered'],
                        unit_price_ht=item_data['unit_price_ht'],
                        tva_rate=item_data.get('tva_rate', 20),
                    )
                    
                    subtotal_ht += float(item.subtotal_ht)
                    tva = float(item.subtotal_ht) * float(item.tva_rate) / 100
                    total_tva += tva
                
                # Mettre à jour les totaux
                purchase_order.subtotal_ht = subtotal_ht
                purchase_order.total_tva = total_tva
                purchase_order.total_ttc = subtotal_ht + total_tva
                purchase_order.save()
                
                serializer = self.get_serializer(purchase_order)
                return Response(serializer.data, status=status.HTTP_201_CREATED)
                
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['post'])
    def receive_items(self, request, pk=None):
        """Réceptionner les articles d'une commande"""
        purchase_order = self.get_object()
        items_received = request.data.get('items', [])
        
        try:
            with transaction.atomic():
                for item_data in items_received:
                    item_id = item_data['item_id']
                    quantity_received = item_data['quantity_received']
                    
                    item = PurchaseOrderItem.objects.get(
                        id=item_id, 
                        purchase_order=purchase_order
                    )
                    
                    # Mettre à jour la quantité reçue
                    item.quantity_received += quantity_received
                    item.save()
                    
                    # Mettre à jour le stock si le produit existe
                    if item.product:
                        if purchase_order.store == 'ville_avray':
                            item.product.stock_ville_avray += quantity_received
                        else:
                            item.product.stock_garches += quantity_received
                        item.product.save()
                
                # Vérifier si tout est reçu
                all_received = all(
                    item.quantity_received >= item.quantity_ordered 
                    for item in purchase_order.items.all()
                )
                
                if all_received:
                    purchase_order.status = 'received'
                    from django.utils import timezone
                    purchase_order.actual_delivery_date = timezone.now().date()
                else:
                    purchase_order.status = 'partial'
                
                purchase_order.save()
                
                # Mettre à jour les statistiques du fournisseur
                supplier = purchase_order.supplier
                supplier.total_orders = supplier.purchase_orders.count()
                from django.db.models import Sum
                supplier.total_amount = supplier.purchase_orders.aggregate(
                    total=Sum('total_ttc')
                )['total'] or 0
                supplier.save()
                
                serializer = self.get_serializer(purchase_order)
                return Response(serializer.data)
                
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['post'])
    def update_status(self, request, pk=None):
        """Mettre à jour le statut d'une commande"""
        purchase_order = self.get_object()
        new_status = request.data.get('status')
        
        if new_status not in dict(PurchaseOrder.STATUS_CHOICES):
            return Response(
                {'error': 'Statut invalide'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        purchase_order.status = new_status
        purchase_order.save()
        
        serializer = self.get_serializer(purchase_order)
        return Response(serializer.data)


class PurchaseOrderItemViewSet(viewsets.ModelViewSet):
    queryset = PurchaseOrderItem.objects.all()
    serializer_class = PurchaseOrderItemSerializer
    
    def get_queryset(self):
        queryset = super().get_queryset()
        purchase_order_id = self.request.query_params.get('purchase_order')
        if purchase_order_id:
            queryset = queryset.filter(purchase_order_id=purchase_order_id)
        return queryset