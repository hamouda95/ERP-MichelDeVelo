from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db import transaction
from django_filters.rest_framework import DjangoFilterBackend
from django.utils import timezone
from django.core.files.uploadedfile import InMemoryUploadedFile
from .models import Supplier, PurchaseOrder, PurchaseOrderItem
from .serializers import SupplierSerializer, PurchaseOrderSerializer, PurchaseOrderItemSerializer
from .services import PurchaseOrderService
from .utils import DocumentParser, StockChecker, PurchaseOrderValidator
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
    queryset = PurchaseOrder.objects.select_related('supplier').prefetch_related('items').all()
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
                    supplier_reference=request.data.get('supplier_reference', ''),
                    shipping_cost=request.data.get('shipping_cost', 0),
                    status=request.data.get('status', 'draft')
                )
                
                # Créer les items
                subtotal_ht = 0
                total_tva = 0
                
                for item_data in items_data:
                    # Récupérer les informations du produit
                    product = None
                    product_name = item_data.get('product_name', '')
                    product_reference = item_data.get('product_reference', '')
                    
                    if item_data.get('product'):
                        try:
                            product = Product.objects.get(id=item_data['product'])
                            product_name = product.name
                            product_reference = product.reference
                        except Product.DoesNotExist:
                            pass
                    
                    # Créer l'item
                    item = PurchaseOrderItem.objects.create(
                        purchase_order=purchase_order,
                        product=product,
                        product_reference=product_reference,
                        product_name=product_name,
                        quantity_ordered=item_data.get('quantity_ordered', item_data.get('quantity', 1)),
                        unit_price_ht=item_data.get('unit_price_ht', item_data.get('unit_price', 0)),
                        tva_rate=item_data.get('tva_rate', 20),
                    )
                    
                    subtotal_ht += float(item.subtotal_ht)
                    tva = float(item.subtotal_ht) * float(item.tva_rate) / 100
                    total_tva += tva
                
                # Ajouter les frais de port au total HT
                shipping_cost = float(request.data.get('shipping_cost', 0))
                subtotal_ht += shipping_cost
                
                # Mettre à jour les totaux
                purchase_order.subtotal_ht = subtotal_ht
                purchase_order.total_tva = total_tva
                purchase_order.total_ttc = subtotal_ht + total_tva
                purchase_order.save()
                
                serializer = self.get_serializer(purchase_order)
                return Response(serializer.data, status=status.HTTP_201_CREATED)
                
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
    
    def update(self, request, *args, **kwargs):
        """Mettre à jour un bon de commande"""
        try:
            with transaction.atomic():
                instance = self.get_object()
                items_data = request.data.get('items', [])
                
                # Mettre à jour les informations de base
                instance.supplier_id = request.data.get('supplier', instance.supplier_id)
                instance.store = request.data.get('store', instance.store)
                instance.expected_delivery_date = request.data.get('expected_delivery_date', instance.expected_delivery_date)
                instance.notes = request.data.get('notes', instance.notes)
                instance.supplier_reference = request.data.get('supplier_reference', instance.supplier_reference)
                instance.shipping_cost = request.data.get('shipping_cost', instance.shipping_cost)
                instance.status = request.data.get('status', instance.status)
                
                # Si des items sont fournis, recalculer
                if items_data:
                    # Supprimer les anciens items
                    instance.items.all().delete()
                    
                    # Créer les nouveaux items
                    subtotal_ht = 0
                    total_tva = 0
                    
                    for item_data in items_data:
                        product = None
                        product_name = item_data.get('product_name', '')
                        product_reference = item_data.get('product_reference', '')
                        
                        if item_data.get('product'):
                            try:
                                product = Product.objects.get(id=item_data['product'])
                                product_name = product.name
                                product_reference = product.reference
                            except Product.DoesNotExist:
                                pass
                        
                        item = PurchaseOrderItem.objects.create(
                            purchase_order=instance,
                            product=product,
                            product_reference=product_reference,
                            product_name=product_name,
                            quantity_ordered=item_data.get('quantity_ordered', item_data.get('quantity', 1)),
                            unit_price_ht=item_data.get('unit_price_ht', item_data.get('unit_price', 0)),
                            tva_rate=item_data.get('tva_rate', 20),
                        )
                        
                        subtotal_ht += float(item.subtotal_ht)
                        tva = float(item.subtotal_ht) * float(item.tva_rate) / 100
                        total_tva += tva
                    
                    # Ajouter les frais de port
                    shipping_cost = float(request.data.get('shipping_cost', 0))
                    subtotal_ht += shipping_cost
                    
                    # Mettre à jour les totaux
                    instance.subtotal_ht = subtotal_ht
                    instance.total_tva = total_tva
                    instance.total_ttc = subtotal_ht + total_tva
                
                instance.save()
                
                serializer = self.get_serializer(instance)
                return Response(serializer.data)
                
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['post'])
    def receive_items(self, request, pk=None):
        """Réceptionner les articles d'une commande"""
        purchase_order = self.get_object()
        items_received = PurchaseOrderItem.objects.filter(purchase_order=purchase_order)

        try:
            with transaction.atomic():
                for item in items_received:
                    
                    # Mettre à jour la quantité reçue
                    item.quantity_received += item.quantity_ordered
                    item.save()
                    
                    # Mettre à jour le stock si le produit existe
                    if item.product:
                        if purchase_order.store == 'ville_avray':
                            item.product.stock_ville_avray += item.quantity_received
                        else:
                            item.product.stock_garches += item.quantity_received
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

    @action(detail=True, methods=['post'])
    def send_to_supplier(self, request, pk=None):
        """Envoyer la commande au fournisseur"""
        try:
            order = self.get_object()
            updated_order = PurchaseOrderService.send_order_to_supplier(order.id)
            serializer = self.get_serializer(updated_order)
            return Response(serializer.data)
        except Exception as e:
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=True, methods=['post'])
    def receive_items(self, request, pk=None):
        """Réceptionner les articles de la commande"""
        try:
            order = self.get_object()
            received_items_data = request.data.get('items', [])
            
            updated_order = PurchaseOrderService.receive_purchase_items(
                order.id, 
                received_items_data,
                user=request.user
            )
            serializer = self.get_serializer(updated_order)
            return Response(serializer.data)
        except Exception as e:
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=False, methods=['get'])
    def statistics(self, request):
        """Statistiques globales des achats"""
        try:
            supplier_id = request.query_params.get('supplier_id')
            store = request.query_params.get('store')
            
            stats = PurchaseOrderService.get_purchase_statistics(
                supplier_id=supplier_id,
                store=store
            )
            
            return Response(stats)
            
        except Exception as e:
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=False, methods=['post'])
    def parse_document(self, request):
        """Parser un document (Excel/CSV) pour import de commande"""
        try:
            file = request.FILES.get('document')
            document_type = request.data.get('document_type', 'delivery_note')
            
            if not file:
                return Response(
                    {'error': 'Aucun fichier fourni'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Parser selon le type de fichier
            if file.name.endswith('.xlsx') or file.name.endswith('.xls'):
                items = DocumentParser.parse_excel(file)
            elif file.name.endswith('.csv'):
                items = DocumentParser.parse_csv(file)
            else:
                return Response(
                    {'error': 'Format de fichier non supporté. Utilisez Excel (.xlsx, .xls) ou CSV (.csv)'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Enrichir avec les produits existants
            products_dict = {p.reference.lower(): p for p in Product.objects.all()}
            enriched_items = []
            
            for item in items:
                product = None
                
                # Chercher par référence
                if item.get('reference'):
                    product = products_dict.get(item['reference'].lower())
                
                # Chercher par nom si pas trouvé par référence
                if not product and item.get('product_name'):
                    for p in Product.objects.all():
                        if item['product_name'].lower() in p.name.lower():
                            product = p
                            break
                
                enriched_item = {
                    'product_id': product.id if product else None,
                    'product_name': item['product_name'],
                    'product_reference': item['reference'],
                    'quantity': item['quantity'],
                    'unit_price': item['unit_price'],
                    'total_price': item['quantity'] * item['unit_price'],
                    'matched_product': product is not None,
                }
                enriched_items.append(enriched_item)
            
            return Response({
                'items': enriched_items,
                'total_items': len(enriched_items),
                'matched_products': len([i for i in enriched_items if i['matched_product']]),
                'document_type': document_type,
            })
            
        except Exception as e:
            return Response(
                {'error': f'Erreur lors du parsing: {str(e)}'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=False, methods=['get'])
    def stock_check(self, request):
        """Vérifier les niveaux de stock et générer des alertes"""
        try:
            store = request.query_params.get('store')
            
            # Récupérer tous les produits actifs
            products = Product.objects.filter(is_active=True)
            
            # Générer le rapport de stock
            report = StockChecker.generate_stock_report(products, store)
            
            return Response(report)
            
        except Exception as e:
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=False, methods=['post'])
    def validate_order(self, request):
        """Valider une commande d'achat avant création"""
        try:
            order_data = request.data
            
            # Récupérer les produits et fournisseurs
            products_dict = {str(p.id): p for p in Product.objects.all()}
            suppliers_dict = {str(s.id): s for s in Supplier.objects.all()}
            
            # Valider la commande
            validation = PurchaseOrderValidator.validate_order(order_data, products_dict, suppliers_dict)
            
            return Response(validation)
            
        except Exception as e:
            return Response(
                {'error': str(e), 'is_valid': False}, 
                status=status.HTTP_400_BAD_REQUEST
            )


class PurchaseOrderItemViewSet(viewsets.ModelViewSet):
    queryset = PurchaseOrderItem.objects.all()
    serializer_class = PurchaseOrderItemSerializer
    
    def get_queryset(self):
        queryset = super().get_queryset()
        purchase_order_id = self.request.query_params.get('purchase_order')
        if purchase_order_id:
            queryset = queryset.filter(purchase_order_id=purchase_order_id)
        return queryset
