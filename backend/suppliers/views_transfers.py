"""
Views pour la gestion des transferts multi-magasins
API REST pour les transferts et suggestions
"""
from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db import transaction
from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.permissions import IsAuthenticated

from .models_extended import StockTransfer, StockTransferItem, StoreStockConfig, TransferSuggestion
from .services_transfers import TransferOptimizer, TransferManager, StockConfigManager
from .serializers_transfers import (
    StockTransferSerializer, 
    StockTransferItemSerializer,
    StoreStockConfigSerializer,
    TransferSuggestionSerializer
)
from products.models import Product


class StoreStockConfigViewSet(viewsets.ModelViewSet):
    """ViewSet pour la configuration des stocks par magasin"""
    queryset = StoreStockConfig.objects.all()
    serializer_class = StoreStockConfigSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['store', 'product', 'is_active']
    search_fields = ['product__name', 'product__reference']
    ordering_fields = ['store', 'priority', 'min_stock', 'product__name']
    ordering = ['store', '-priority', 'product__name']

    @action(detail=False, methods=['post'])
    def initialize_defaults(self, request):
        """Initialise les configurations par défaut pour tous les produits"""
        try:
            configs_created = StockConfigManager.create_default_configs()
            return Response({
                'message': f'{configs_created} configurations créées',
                'configs_created': configs_created
            }, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=False, methods=['get'])
    def critical_stocks(self, request):
        """Retourne les stocks critiques par magasin"""
        store = request.query_params.get('store')
        configs = StoreStockConfig.objects.filter(is_active=True)
        
        if store:
            configs = configs.filter(store=store)
        
        critical_stocks = []
        
        for config in configs:
            product = config.product
            current_stock = TransferOptimizer().get_current_stock(product, config.store)
            
            if current_stock <= config.min_stock:
                critical_stocks.append({
                    'product_id': product.id,
                    'product_name': product.name,
                    'product_reference': product.reference,
                    'store': config.store,
                    'current_stock': current_stock,
                    'min_stock': config.min_stock,
                    'max_stock': config.max_stock,
                    'urgency_level': 'critical' if current_stock == 0 else 'high',
                    'needed_quantity': config.min_stock - current_stock
                })
        
        return Response({
            'critical_stocks': critical_stocks,
            'total_critical': len(critical_stocks)
        })


class StockTransferViewSet(viewsets.ModelViewSet):
    """ViewSet pour la gestion des transferts de stock"""
    queryset = StockTransfer.objects.all()
    serializer_class = StockTransferSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'from_store', 'to_store', 'validated_by']
    search_fields = ['transfer_number', 'notes']
    ordering_fields = ['created_at', 'validated_at', 'transfer_number']
    ordering = ['-created_at']

    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Filtrer par magasin si spécifié
        store = self.request.query_params.get('store')
        if store:
            queryset = queryset.filter(
                models.Q(from_store=store) | models.Q(to_store=store)
            )
        
        return queryset

    @action(detail=False, methods=['post'])
    def create_from_suggestions(self, request):
        """Crée des transferts à partir de suggestions"""
        try:
            suggestion_ids = request.data.get('suggestions', [])
            notes = request.data.get('notes', '')
            
            if not suggestion_ids:
                return Response(
                    {'error': 'Aucune suggestion fournie'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            suggestions = TransferSuggestion.objects.filter(
                id__in=suggestion_ids,
                is_active=True,
                applied=False
            )
            
            if not suggestions:
                return Response(
                    {'error': 'Aucune suggestion valide trouvée'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            transfers = TransferManager.create_transfer_from_suggestions(
                suggestions, 
                validated_by=request.user,
                notes=notes
            )
            
            serializer = StockTransferSerializer(transfers, many=True)
            return Response({
                'message': f'{len(transfers)} transferts créés',
                'transfers': serializer.data
            }, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=True, methods=['post'])
    def validate(self, request, pk):
        """Valide un transfert avec ajustement des quantités"""
        try:
            transfer = self.get_object()
            
            if transfer.status != 'suggested':
                return Response(
                    {'error': 'Seuls les transferts suggérés peuvent être validés'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            validated_items = request.data.get('items', [])
            
            if not validated_items:
                return Response(
                    {'error': 'Aucun item fourni pour la validation'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            updated_transfer = TransferManager.validate_transfer(
                transfer.id,
                validated_items,
                request.user
            )
            
            serializer = self.get_serializer(updated_transfer)
            return Response({
                'message': 'Transfert validé avec succès',
                'transfer': serializer.data
            })
            
        except Exception as e:
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=True, methods=['post'])
    def ship(self, request, pk):
        """Marque un transfert comme expédié"""
        try:
            transfer = TransferManager.ship_transfer(pk)
            serializer = self.get_serializer(transfer)
            return Response({
                'message': 'Transfert expédié',
                'transfer': serializer.data
            })
        except Exception as e:
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=True, methods=['post'])
    def receive(self, request, pk):
        """Reçoit un transfert et met à jour les stocks"""
        try:
            received_items = request.data.get('items', [])
            
            if not received_items:
                return Response(
                    {'error': 'Aucun item fourni pour la réception'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            updated_transfer = TransferManager.receive_transfer(pk, received_items)
            serializer = self.get_serializer(updated_transfer)
            
            return Response({
                'message': 'Transfert reçu avec succès',
                'transfer': serializer.data
            })
            
        except Exception as e:
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=False, methods=['get'])
    def statistics(self, request):
        """Statistiques sur les transferts"""
        queryset = self.get_queryset()
        
        stats = {
            'total_transfers': queryset.count(),
            'pending_validation': queryset.filter(status='suggested').count(),
            'in_transit': queryset.filter(status='in_transit').count(),
            'completed': queryset.filter(status='received').count(),
            'by_store': {},
            'by_status': {}
        }
        
        # Statistiques par magasin
        for store in ['central', 'ville_avray', 'garches']:
            stats['by_store'][store] = {
                'from': queryset.filter(from_store=store).count(),
                'to': queryset.filter(to_store=store).count(),
            }
        
        # Statistiques par statut
        for status_choice in StockTransfer.TRANSFER_STATUS_CHOICES:
            status_key = status_choice[0]
            stats['by_status'][status_key] = queryset.filter(status=status_key).count()
        
        return Response(stats)

    @action(detail=False, methods=['get'])
    def pending_validation(self, request):
        """Retourne les transferts en attente de validation"""
        transfers = self.get_queryset().filter(status='suggested')
        serializer = self.get_serializer(transfers, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def in_transit(self, request):
        """Retourne les transferts en cours"""
        transfers = self.get_queryset().filter(status='in_transit')
        serializer = self.get_serializer(transfers, many=True)
        return Response(serializer.data)


class TransferSuggestionViewSet(viewsets.ModelViewSet):
    """ViewSet pour les suggestions de transfert"""
    queryset = TransferSuggestion.objects.all()
    serializer_class = TransferSuggestionSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['from_store', 'to_store', 'urgency_level', 'applied']
    search_fields = ['product__name', 'product__reference', 'reason']
    ordering_fields = ['created_at', 'urgency_level', 'priority_score']
    ordering = ['-urgency_level', '-priority_score', '-created_at']

    @action(detail=False, methods=['post'])
    def generate_suggestions(self, request):
        """Génère automatiquement des suggestions de transfert"""
        try:
            optimizer = TransferOptimizer()
            suggestions = optimizer.generate_transfer_suggestions()
            
            serializer = TransferSuggestionSerializer(suggestions, many=True)
            return Response({
                'message': f'{len(suggestions)} suggestions générées',
                'suggestions': serializer.data
            }, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=False, methods=['post'])
    def optimize_weekly(self, request):
        """Optimisation hebdomadaire des transferts"""
        try:
            optimizer = TransferOptimizer()
            suggestions = optimizer.optimize_transfers_for_week()
            
            serializer = TransferSuggestionSerializer(suggestions, many=True)
            return Response({
                'message': 'Optimisation hebdomadaire effectuée',
                'suggestions': serializer.data
            })
            
        except Exception as e:
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=False, methods=['get'])
    def active_suggestions(self, request):
        """Retourne les suggestions actives non appliquées"""
        suggestions = self.get_queryset().filter(
            is_active=True,
            applied=False
        ).exclude(expires_at__lt=timezone.now())
        
        # Filtrer par magasin si spécifié
        store = request.query_params.get('store')
        if store:
            suggestions = suggestions.filter(to_store=store)
        
        serializer = self.get_serializer(suggestions, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def by_urgency(self, request):
        """Retourne les suggestions groupées par urgence"""
        suggestions = self.get_queryset().filter(
            is_active=True,
            applied=False
        ).exclude(expires_at__lt=timezone.now())
        
        grouped = {}
        for urgency in ['critical', 'high', 'medium', 'low']:
            grouped[urgency] = suggestions.filter(urgency_level=urgency).count()
        
        return Response(grouped)

    @action(detail=False, methods=['post'])
    def apply_suggestions(self, request):
        """Applique automatiquement les suggestions critiques"""
        try:
            # Récupérer seulement les suggestions critiques
            critical_suggestions = self.get_queryset().filter(
                is_active=True,
                applied=False,
                urgency_level='critical'
            ).exclude(expires_at__lt=timezone.now())
            
            if not critical_suggestions:
                return Response({
                    'message': 'Aucune suggestion critique à appliquer'
                })
            
            transfers = TransferManager.create_transfer_from_suggestions(
                critical_suggestions,
                validated_by=request.user,
                notes='Application automatique des suggestions critiques'
            )
            
            return Response({
                'message': f'{len(transfers)} transferts créés à partir des suggestions critiques',
                'transfers': StockTransferSerializer(transfers, many=True).data
            })
            
        except Exception as e:
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=True, methods=['post'])
    def apply(self, request, pk):
        """Applique une suggestion spécifique"""
        try:
            suggestion = self.get_object()
            
            if suggestion.applied:
                return Response(
                    {'error': 'Cette suggestion a déjà été appliquée'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            transfers = TransferManager.create_transfer_from_suggestions(
                [suggestion],
                validated_by=request.user,
                notes=f'Application de la suggestion {suggestion.id}'
            )
            
            return Response({
                'message': 'Suggestion appliquée avec succès',
                'transfer': StockTransferSerializer(transfers[0]).data
            })
            
        except Exception as e:
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_400_BAD_REQUEST
            )


class TransferAnalysisViewSet(viewsets.ViewSet):
    """ViewSet pour l'analyse des transferts et optimisation"""
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=['get'])
    def dashboard_data(self, request):
        """Données pour le tableau de bord des transferts"""
        try:
            optimizer = TransferOptimizer()
            
            # Statistiques générales
            all_needs = optimizer.analyze_all_needs()
            
            # Calculer les stocks centraux
            central_stocks = {}
            for store_needs in all_needs.values():
                for need in store_needs:
                    product = need['product']
                    if product.id not in central_stocks:
                        central_stocks[product.id] = optimizer.get_central_stock(product)
            
            # Préparer les données
            dashboard_data = {
                'total_needs': sum(len(needs) for needs in all_needs.values()),
                'central_stock_value': sum(
                    optimizer.get_product_cost_from_central(Product.objects.get(id=pid)) * qty
                    for pid, qty in central_stocks.items() if qty > 0
                ),
                'stores_needs': {
                    store: len(needs) for store, needs in all_needs.items()
                },
                'urgency_breakdown': {},
                'top_critical_products': []
            }
            
            # Analyse par urgence
            urgency_counts = {'critical': 0, 'high': 0, 'medium': 0, 'low': 0}
            for store_needs in all_needs.values():
                for need in store_needs:
                    urgency_counts[need['urgency_level']] += 1
            dashboard_data['urgency_breakdown'] = urgency_counts
            
            # Top produits critiques
            all_critical = []
            for store_needs in all_needs.values():
                all_critical.extend([n for n in store_needs if n['urgency_level'] == 'critical'])
            
            all_critical.sort(key=lambda x: x['priority_score'], reverse=True)
            dashboard_data['top_critical_products'] = [
                {
                    'product_id': need['product'].id,
                    'product_name': need['product'].name,
                    'store': next(store for store, needs in all_needs.items() if need in needs),
                    'needed_quantity': need['needed_quantity'],
                    'current_stock': need['current_stock'],
                    'min_stock': need['min_stock']
                }
                for need in all_critical[:10]
            ]
            
            return Response(dashboard_data)
            
        except Exception as e:
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['get'])
    def stock_analysis(self, request):
        """Analyse complète des stocks multi-magasins"""
        try:
            optimizer = TransferOptimizer()
            
            analysis = {
                'stores': {},
                'central_stock': {},
                'recommendations': []
            }
            
            # Analyse par magasin
            for store in ['ville_avray', 'garches']:
                needs = optimizer.calculate_store_needs(store)
                
                analysis['stores'][store] = {
                    'total_needs': len(needs),
                    'total_needed_quantity': sum(n['needed_quantity'] for n in needs),
                    'urgency_breakdown': {},
                    'top_needs': []
                }
                
                # Breakdown par urgence
                urgency_counts = {'critical': 0, 'high': 0, 'medium': 0, 'low': 0}
                for need in needs:
                    urgency_counts[need['urgency_level']] += 1
                analysis['stores'][store]['urgency_breakdown'] = urgency_counts
                
                # Top besoins
                top_needs = sorted(needs, key=lambda x: x['priority_score'], reverse=True)[:5]
                analysis['stores'][store]['top_needs'] = [
                    {
                        'product_name': need['product'].name,
                        'needed_quantity': need['needed_quantity'],
                        'urgency_level': need['urgency_level'],
                        'reason': need['reason']
                    }
                    for need in top_needs
                ]
            
            # Stock central disponible
            products_with_central_stock = Product.objects.filter(is_active=True)
            for product in products_with_central_stock:
                central_qty = optimizer.get_central_stock(product)
                if central_qty > 0:
                    analysis['central_stock'][product.id] = {
                        'product_name': product.name,
                        'available_quantity': central_qty,
                        'unit_cost': optimizer.get_product_cost_from_central(product),
                        'total_value': central_qty * optimizer.get_product_cost_from_central(product)
                    }
            
            # Recommandations
            total_central_value = sum(item['total_value'] for item in analysis['central_stock'].values())
            total_needs_value = 0
            
            for store_data in analysis['stores'].values():
                for need in store_data['top_needs']:
                    # Estimation de la valeur (approximative)
                    product = Product.objects.filter(name=need['product_name']).first()
                    if product:
                        unit_cost = optimizer.get_product_cost_from_central(product)
                        total_needs_value += need['needed_quantity'] * unit_cost
            
            if total_needs_value > total_central_value:
                analysis['recommendations'].append({
                    'type': 'stock_shortage',
                    'message': 'Le stock central est insuffisant pour couvrir tous les besoins',
                    'priority': 'high'
                })
            
            return Response(analysis)
            
        except Exception as e:
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
