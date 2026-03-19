from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from .models import Product, Category
from .serializers import ProductSerializer, CategorySerializer
from django.db import models


class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.all()
    serializer_class = ProductSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['category', 'product_type', 'is_active', 'is_visible']
    search_fields = ['name', 'reference', 'barcode', 'brand']
    ordering_fields = ['created_at', 'name', 'price_ttc']
    
    @action(detail=False, methods=['get'])
    def barcode(self, request):
        barcode = request.query_params.get('code')
        try:
            product = Product.objects.get(barcode=barcode)
            serializer = self.get_serializer(product)
            return Response(serializer.data)
        except Product.DoesNotExist:
            # Si pas de produit trouvé avec ce code-barre, essayer une recherche par nom/référence
            search_term = barcode.strip()
            if len(search_term) >= 3:
                products = Product.objects.filter(
                    models.Q(name__icontains=search_term) |
                    models.Q(reference__icontains=search_term)
                ).filter(is_visible=True)[:1]
                if products.exists():
                    product = products.first()
                    serializer = self.get_serializer(product)
                    return Response(serializer.data)
            return Response({'error': 'Product not found'}, status=404)


class CategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
