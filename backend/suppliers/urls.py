from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import SupplierViewSet, PurchaseOrderViewSet
from .views_transfers import (
    StoreStockConfigViewSet, 
    StockTransferViewSet, 
    TransferSuggestionViewSet,
    TransferAnalysisViewSet
)

router = DefaultRouter()
router.register(r'suppliers', SupplierViewSet, basename='supplier')
router.register(r'purchase-orders', PurchaseOrderViewSet, basename='purchaseorder')

# Routes pour les transferts multi-magasins
router.register(r'stock-configs', StoreStockConfigViewSet, basename='stockconfig')
router.register(r'transfers', StockTransferViewSet, basename='stocktransfer')
router.register(r'transfer-suggestions', TransferSuggestionViewSet, basename='transfersuggestion')
router.register(r'transfer-analysis', TransferAnalysisViewSet, basename='transferanalysis')

urlpatterns = [
    path('', include(router.urls)),
]