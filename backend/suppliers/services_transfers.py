"""
Services pour la gestion des transferts multi-magasins
Algorithmes d'optimisation et logique métier
"""
from django.db import models, transaction
from django.utils import timezone
from decimal import Decimal
from datetime import datetime, timedelta
from .models_extended import StoreStockConfig, StockTransfer, StockTransferItem, TransferSuggestion
from products.models import Product
from .models import PurchaseOrder, PurchaseOrderItem


class TransferOptimizer:
    """Optimiseur de transferts multi-magasins"""
    
    def __init__(self):
        self.priority_order = ['ville_avray', 'garches']  # Ville d'Avray prioritaire
        self.central_store = 'central'
    
    def analyze_all_needs(self):
        """Analyse les besoins de tous les magasins"""
        needs = {}
        for store in self.priority_order:
            needs[store] = self.calculate_store_needs(store)
        return needs
    
    def calculate_store_needs(self, store):
        """Calcule les besoins d'un magasin spécifique"""
        needs = []
        
        # Récupérer toutes les configurations actives pour ce magasin
        configs = StoreStockConfig.objects.filter(store=store, is_active=True)
        
        for config in configs:
            product = config.product
            if not product.is_active:
                continue
            
            # Stock actuel du magasin
            current_stock = self.get_current_stock(product, store)
            min_stock = config.min_stock
            max_stock = config.max_stock
            
            if current_stock < min_stock:
                needed = min_stock - current_stock
                
                # Ajustement selon facteur saisonnier
                seasonal_adjusted = int(needed * config.seasonal_factor)
                
                # Calculer le niveau d'urgence
                urgency = self.calculate_urgency_level(current_stock, min_stock, seasonal_adjusted)
                
                needs.append({
                    'product': product,
                    'config': config,
                    'current_stock': current_stock,
                    'min_stock': min_stock,
                    'max_stock': max_stock,
                    'needed_quantity': seasonal_adjusted,
                    'urgency_level': urgency,
                    'priority_score': config.priority * self.get_urgency_multiplier(urgency),
                    'reason': f"Stock actuel: {current_stock}, Minimum: {min_stock}, Ajusté: {seasonal_adjusted}"
                })
        
        # Trier par priorité décroissante
        needs.sort(key=lambda x: x['priority_score'], reverse=True)
        return needs
    
    def get_current_stock(self, product, store):
        """Récupère le stock actuel d'un produit dans un magasin"""
        if store == 'ville_avray':
            return product.stock_ville_avray
        elif store == 'garches':
            return product.stock_garches
        return 0
    
    def calculate_urgency_level(self, current_stock, min_stock, needed):
        """Calcule le niveau d'urgence"""
        if current_stock == 0:
            return 'critical'
        elif current_stock < min_stock * 0.5:
            return 'high'
        elif needed > min_stock:
            return 'medium'
        else:
            return 'low'
    
    def get_urgency_multiplier(self, urgency):
        """Multiplicateur selon l'urgence"""
        multipliers = {
            'critical': 4.0,
            'high': 3.0,
            'medium': 2.0,
            'low': 1.0,
        }
        return multipliers.get(urgency, 1.0)
    
    def get_central_stock(self, product):
        """Calcule le stock central disponible pour un produit"""
        # Stock central = commandes reçues non transférées
        central_orders = PurchaseOrder.objects.filter(
            store='central',
            status='received',
            transfer_status__in=['pending', 'partial']
        )
        
        total_available = 0
        for order in central_orders:
            for item in order.items.all():
                if item.product == product:
                    # Quantité reçue - quantité déjà transférée
                    received = item.quantity_received
                    transferred = self.get_already_transferred_quantity(product, order)
                    available = max(0, received - transferred)
                    total_available += available
        
        return total_available
    
    def get_already_transferred_quantity(self, product, order):
        """Quantité déjà transférée pour un produit depuis une commande"""
        transferred_items = StockTransferItem.objects.filter(
            transfer__purchase_order=order,
            product=product,
            transfer__status__in=['validated', 'in_transit', 'received']
        )
        return transferred_items.aggregate(
            total=models.Sum('quantity_validated')
        )['total'] or 0
    
    def generate_transfer_suggestions(self):
        """Génère des suggestions de transfert optimisées"""
        suggestions = []
        needs = self.analyze_all_needs()
        
        # Traiter par ordre de priorité des magasins
        for store in self.priority_order:
            store_needs = needs.get(store, [])
            
            for need in store_needs:
                product = need['product']
                available = self.get_central_stock(product)
                
                if available > 0:
                    # Calculer la quantité optimale à transférer
                    transfer_quantity = min(need['needed_quantity'], available)
                    
                    # Créer la suggestion
                    suggestion = TransferSuggestion.objects.create(
                        product=product,
                        from_store=self.central_store,
                        to_store=store,
                        current_stock=need['current_stock'],
                        min_stock=need['min_stock'],
                        needed_quantity=need['needed_quantity'],
                        available_quantity=available,
                        suggested_quantity=transfer_quantity,
                        priority_score=need['priority_score'],
                        urgency_level=need['urgency_level'],
                        reason=need['reason'],
                        context_data={
                            'config_id': need['config'].id,
                            'max_stock': need['max_stock'],
                            'seasonal_factor': need['config'].seasonal_factor,
                        },
                        expires_at=timezone.now() + timedelta(days=7)  # Expire après 7 jours
                    )
                    
                    suggestions.append(suggestion)
        
        return suggestions
    
    def optimize_transfers_for_week(self):
        """Optimisation hebdomadaire des transferts"""
        # Nettoyer les anciennes suggestions expirées
        TransferSuggestion.objects.filter(
            expires_at__lt=timezone.now(),
            applied=False
        ).delete()
        
        # Générer nouvelles suggestions
        return self.generate_transfer_suggestions()


class TransferManager:
    """Gestionnaire des transferts de stock"""
    
    @staticmethod
    @transaction.atomic
    def create_transfer_from_suggestions(suggestions, validated_by=None, notes=''):
        """Crée un transfert à partir de suggestions"""
        if not suggestions:
            raise ValueError("Aucune suggestion fournie")
        
        # Grouper par magasin de destination
        suggestions_by_store = {}
        for suggestion in suggestions:
            store = suggestion.to_store
            if store not in suggestions_by_store:
                suggestions_by_store[store] = []
            suggestions_by_store[store].append(suggestion)
        
        transfers = []
        
        for store, store_suggestions in suggestions_by_store.items():
            # Créer le transfert
            transfer = StockTransfer.objects.create(
                from_store='central',
                to_store=store,
                status='validated',
                validated_by=validated_by,
                notes=notes,
                total_items=len(store_suggestions),
            )
            
            # Créer les items de transfert
            total_value = 0
            for suggestion in store_suggestions:
                # Récupérer le coût unitaire depuis la commande d'origine
                unit_cost = TransferManager.get_product_cost_from_central(suggestion.product)
                
                item = StockTransferItem.objects.create(
                    transfer=transfer,
                    product=suggestion.product,
                    quantity_suggested=suggestion.suggested_quantity,
                    quantity_validated=suggestion.suggested_quantity,
                    unit_cost=unit_cost,
                    notes=f"Basé sur suggestion: {suggestion.reason}"
                )
                
                total_value += item.total_cost
                
                # Marquer la suggestion comme appliquée
                suggestion.apply_suggestion(transfer)
            
            # Mettre à jour la valeur totale du transfert
            transfer.total_value = total_value
            transfer.save()
            
            transfers.append(transfer)
        
        return transfers
    
    @staticmethod
    def get_product_cost_from_central(product):
        """Récupère le coût unitaire d'un produit depuis le stock central"""
        # Chercher dans les commandes centrales reçues
        central_items = PurchaseOrderItem.objects.filter(
            purchase_order__store='central',
            purchase_order__status='received',
            product=product
        ).order_by('-purchase_order__created_at')
        
        if central_items.exists():
            return central_items.first().unit_price_ht
        
        # Coût par défaut si non trouvé
        return product.price_ht if hasattr(product, 'price_ht') else Decimal('0.00')
    
    @staticmethod
    @transaction.atomic
    def validate_transfer(transfer_id, validated_items, validated_by):
        """Valide un transfert avec des quantités ajustées"""
        transfer = StockTransfer.objects.get(id=transfer_id)
        
        if transfer.status != 'suggested':
            raise ValueError("Seuls les transferts suggérés peuvent être validés")
        
        # Mettre à jour les items
        total_value = 0
        for item_data in validated_items:
            item = transfer.items.get(product_id=item_data['product_id'])
            item.quantity_validated = item_data['quantity_validated']
            item.save()
            total_value += item.total_cost
        
        # Mettre à jour le transfert
        transfer.status = 'validated'
        transfer.validated_by = validated_by
        transfer.validated_at = timezone.now()
        transfer.total_value = total_value
        transfer.total_items = len(validated_items)
        transfer.save()
        
        return transfer
    
    @staticmethod
    @transaction.atomic
    def ship_transfer(transfer_id):
        """Marque un transfert comme en transit"""
        transfer = StockTransfer.objects.get(id=transfer_id)
        
        if transfer.status != 'validated':
            raise ValueError("Le transfert doit être validé avant expédition")
        
        transfer.status = 'in_transit'
        transfer.shipped_at = timezone.now()
        
        # Mettre à jour les quantités expédiées
        for item in transfer.items.all():
            item.quantity_shipped = item.quantity_validated
            item.save()
        
        transfer.save()
        return transfer
    
    @staticmethod
    @transaction.atomic
    def receive_transfer(transfer_id, received_items):
        """Reçoit un transfert et met à jour les stocks"""
        transfer = StockTransfer.objects.get(id=transfer_id)
        
        if transfer.status != 'in_transit':
            raise ValueError("Le transfert doit être en transit pour être reçu")
        
        total_value = 0
        
        for item_data in received_items:
            item = transfer.items.get(product_id=item_data['product_id'])
            received_quantity = item_data['received_quantity']
            
            # Vérifier que la quantité reçue ne dépasse pas la quantité validée
            if received_quantity > item.quantity_validated:
                raise ValueError(f"Quantité reçue supérieure à la quantité validée pour {item.product.name}")
            
            # Mettre à jour la quantité reçue
            item.quantity_received = received_quantity
            item.save()
            
            # Mettre à jour le stock du magasin de destination
            TransferManager.update_store_stock(item.product, transfer.to_store, received_quantity)
            
            total_value += (received_quantity * item.unit_cost)
        
        # Mettre à jour le transfert
        transfer.status = 'received'
        transfer.received_at = timezone.now()
        transfer.total_value = total_value
        transfer.save()
        
        # Mettre à jour le statut de transfert de la commande d'origine
        if transfer.purchase_order:
            TransferManager.update_purchase_order_transfer_status(transfer.purchase_order)
        
        return transfer
    
    @staticmethod
    def update_store_stock(product, store, quantity):
        """Met à jour le stock d'un produit dans un magasin"""
        if store == 'ville_avray':
            product.stock_ville_avray += quantity
        elif store == 'garches':
            product.stock_garches += quantity
        
        product.save()
    
    @staticmethod
    def update_purchase_order_transfer_status(purchase_order):
        """Met à jour le statut de transfert d'une commande"""
        # Calculer le total transféré pour cette commande
        transferred_quantities = {}
        
        for transfer in purchase_order.transfers.all():
            if transfer.status == 'received':
                for item in transfer.items.all():
                    product_id = item.product.id
                    if product_id not in transferred_quantities:
                        transferred_quantities[product_id] = 0
                    transferred_quantities[product_id] += item.quantity_received
        
        # Vérifier si tout est transféré
        all_transferred = True
        for item in purchase_order.items.all():
            product_id = item.product.id if item.product else None
            if product_id and product_id in transferred_quantities:
                if transferred_quantities[product_id] < item.quantity_received:
                    all_transferred = False
                    break
            elif item.quantity_received > 0:
                all_transferred = False
                break
        
        # Mettre à jour le statut
        if all_transferred:
            purchase_order.transfer_status = 'complete'
        elif transferred_quantities:
            purchase_order.transfer_status = 'partial'
        else:
            purchase_order.transfer_status = 'pending'
        
        purchase_order.save()


class StockConfigManager:
    """Gestionnaire des configurations de stock"""
    
    @staticmethod
    def create_default_configs():
        """Crée les configurations de stock par défaut pour tous les produits"""
        products = Product.objects.filter(is_active=True)
        stores = ['ville_avray', 'garches']
        
        configs_created = 0
        
        for product in products:
            for store in stores:
                config, created = StoreStockConfig.objects.get_or_create(
                    product=product,
                    store=store,
                    defaults={
                        'min_stock': product.alert_stock if hasattr(product, 'alert_stock') else 5,
                        'max_stock': product.alert_stock * 4 if hasattr(product, 'alert_stock') else 20,
                        'priority': 1 if store == 'ville_avray' else 2,  # Ville d'Avray prioritaire
                    }
                )
                if created:
                    configs_created += 1
        
        return configs_created
    
    @staticmethod
    def update_config_from_product(product):
        """Met à jour la configuration de stock d'un produit"""
        stores = ['ville_avray', 'garches']
        
        for store in stores:
            config, created = StoreStockConfig.objects.get_or_create(
                product=product,
                store=store,
                defaults={
                    'min_stock': product.alert_stock if hasattr(product, 'alert_stock') else 5,
                    'max_stock': product.alert_stock * 4 if hasattr(product, 'alert_stock') else 20,
                    'priority': 1 if store == 'ville_avray' else 2,
                }
            )
            
            if not created and hasattr(product, 'alert_stock'):
                config.min_stock = product.alert_stock
                config.max_stock = product.alert_stock * 4
                config.save()
