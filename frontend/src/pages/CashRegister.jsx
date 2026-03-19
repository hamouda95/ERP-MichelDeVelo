import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useCartStore } from '../store';
import { productsAPI, clientsAPI, ordersAPI } from '../services/api';
import toast from 'react-hot-toast';
import axios from 'axios';
import {
  TrashIcon,
  PlusIcon,
  MinusIcon,
  XMarkIcon,
  QrCodeIcon,
  MagnifyingGlassIcon,
  PencilIcon,
  UserIcon,
  ShoppingCartIcon,
  ClockIcon,
  CreditCardIcon,
  BanknotesIcon,
  CalendarIcon,
  PhoneIcon,
  EnvelopeIcon,
  MapPinIcon,
  ChevronRightIcon,
  DocumentTextIcon,
  FilterIcon,
  PlusCircleIcon,
  CheckCircleIcon,
  ArrowLeftIcon,
  ArrowPathIcon,
  UserPlusIcon,
  EyeIcon,
  CurrencyEuroIcon,
  ArrowUturnLeftIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

// ============================================
// MODULE CAISSE + CLIENTS UNIFIÉ
// ============================================

export default function CashRegister() {
  // État pour la navigation entre les vues
  const [activeView, setActiveView] = useState('cashier'); // 'cashier', 'clients', 'client-detail', 'history'
  const [selectedClientForDetail, setSelectedClientForDetail] = useState(null);
  
  // Données clients
  const [clients, setClients] = useState([]);
  const [filteredClients, setFilteredClients] = useState([]);
  const [clientSearchTerm, setClientSearchTerm] = useState('');
  const [loadingClients, setLoadingClients] = useState(false);
  
  // Données historique des ventes
  const [salesHistory, setSalesHistory] = useState([]);
  const [filteredSalesHistory, setFilteredSalesHistory] = useState([]);
  const [salesSearchTerm, setSalesSearchTerm] = useState('');
  const [loadingSales, setLoadingSales] = useState(false);
  const [selectedDateFilter, setSelectedDateFilter] = useState('all');
  const [selectedStoreFilter, setSelectedStoreFilter] = useState('all');
  const [saleToEdit, setSaleToEdit] = useState(null);
  const [showEditSaleModal, setShowEditSaleModal] = useState(false);
  const [saleToDelete, setSaleToDelete] = useState(null);
  const [showDeleteSaleModal, setShowDeleteSaleModal] = useState(false);
  
  // Modales clients
  const [showClientModal, setShowClientModal] = useState(false);
  const [showCreateClientModal, setShowCreateClientModal] = useState(false);
  const [showEditClientModal, setShowEditClientModal] = useState(false);
  const [clientToEdit, setClientToEdit] = useState(null);
  const [clientToDelete, setClientToDelete] = useState(null);
  const [showDeleteClientModal, setShowDeleteClientModal] = useState(false);
  
  // Store panier
  const {
    items,
    selectedStore,
    selectedClient,
    setSelectedStore,
    setSelectedClient,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    getTotal,
    getTotalHT
  } = useCartStore();
  
  // État caisse
  const [products, setProducts] = useState([]);
  const [barcodeInput, setBarcodeInput] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [installments, setInstallments] = useState(1);
  const [orderNotes, setOrderNotes] = useState('');
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  
  const barcodeInputRef = useRef(null);
  
  // ============================================
  // CHARGEMENT DES DONNÉES
  // ============================================
  
  const loadProducts = useCallback(async () => {
    try {
      const resp = await productsAPI.getAll({ is_visible: true });
      
      // Gérer différentes structures de réponse API
      let list = [];
      if (resp && typeof resp === 'object') {
        // Si la réponse a une propriété results
        if (resp.data && resp.data.results && Array.isArray(resp.data.results)) {
          list = resp.data.results;
        }
        // Si la réponse a une propriété data qui est un tableau
        else if (resp.data && Array.isArray(resp.data)) {
          list = resp.data;
        }
        // Si la réponse est directement un tableau
        else if (Array.isArray(resp)) {
          list = resp;
        }
      }
      
      setProducts(list);
    } catch (error) {
      console.error('Erreur chargement produits:', error);
      toast.error('Erreur de chargement des produits');
      setProducts([]); // Initialiser avec un tableau vide
    }
  }, []);
  
  const loadClients = useCallback(async () => {
    setLoadingClients(true);
    try {
      const resp = await clientsAPI.getAll();
      
      // Gérer différentes structures de réponse API
      let clientsData = [];
      if (resp && typeof resp === 'object') {
        // Si la réponse a une propriété results
        if (resp.data && resp.data.results && Array.isArray(resp.data.results)) {
          clientsData = resp.data.results;
        }
        // Si la réponse a une propriété data qui est un tableau
        else if (resp.data && Array.isArray(resp.data)) {
          clientsData = resp.data;
        }
        // Si la réponse est directement un tableau
        else if (Array.isArray(resp)) {
          clientsData = resp;
        }
      }
      
      setClients(clientsData);
      setFilteredClients(clientsData);
    } catch (error) {
      console.error('Erreur chargement clients:', error);
      toast.error('Erreur lors du chargement des clients');
      setClients([]); // Initialiser avec un tableau vide
      setFilteredClients([]);
    } finally {
      setLoadingClients(false);
    }
  }, []);

  const loadSalesHistory = useCallback(async () => {
    setLoadingSales(true);
    try {
      const resp = await ordersAPI.getAll();
      
      // Gérer différentes structures de réponse API
      let salesData = [];
      if (resp && typeof resp === 'object') {
        // Si la réponse a une propriété results
        if (resp.data && resp.data.results && Array.isArray(resp.data.results)) {
          salesData = resp.data.results;
        }
        // Si la réponse a une propriété data qui est un tableau
        else if (resp.data && Array.isArray(resp.data)) {
          salesData = resp.data;
        }
        // Si la réponse est directement un tableau
        else if (Array.isArray(resp)) {
          salesData = resp;
        }
      }
      
      setSalesHistory(salesData);
      setFilteredSalesHistory(salesData);
    } catch (error) {
      console.error('Erreur chargement historique:', error);
      toast.error('Erreur lors du chargement de l\'historique des ventes');
      setSalesHistory([]); // Initialiser avec un tableau vide
      setFilteredSalesHistory([]);
    } finally {
      setLoadingSales(false);
    }
  }, []);
  
  useEffect(() => {
    loadProducts();
    loadClients();
    if (activeView === 'history') {
      loadSalesHistory();
    }
  }, [loadProducts, loadClients, activeView, loadSalesHistory]);
  
  // Charger les données de réparation en attente
  useEffect(() => {
    const pendingCheckout = localStorage.getItem('pendingCheckout');
    if (pendingCheckout && activeView === 'cashier') {
      try {
        const data = JSON.parse(pendingCheckout);
        if (data.client) {
          setSelectedClient(data.client);
          toast.success(`Client ${data.client.first_name} ${data.client.last_name} sélectionné`);
          
          // Ajouter la réparation comme service si disponible
          if (data.repair && data.repair.estimated_cost > 0) {
            const repairService = {
              id: `repair-${data.repair.id}`,
              name: `Réparation vélo - ${data.repair.bike_brand} ${data.repair.bike_model}`,
              reference: `REP${data.repair.id}`,
              price_ttc: data.repair.estimated_cost,
              price_ht: data.repair.estimated_cost * 0.8,
              tva_rate: 20,
              total_stock: 999,
              is_visible: true,
              stock_ville_avray: 999,
              stock_garches: 999,
              category: 'services'
            };
            addItem(repairService);
            toast.success(`Service de réparation ajouté au panier`);
          }
        }
        // Nettoyer le localStorage
        localStorage.removeItem('pendingCheckout');
      } catch (error) {
        console.error('Erreur lors du chargement des données de réparation:', error);
      }
    }
  }, [activeView, setSelectedClient, addItem]);
  
  // Focus sur le champ de scan
  useEffect(() => {
    if (activeView === 'cashier' && barcodeInputRef.current) {
      barcodeInputRef.current.focus();
    }
  }, [activeView]);
  
  // Filtrage des clients
  useEffect(() => {
    if (!clientSearchTerm.trim()) {
      setFilteredClients(clients);
      return;
    }
    const searchLower = clientSearchTerm.toLowerCase();
    const filtered = clients.filter((client) =>
      [client.first_name, client.last_name, client.email, client.city]
        .some((field) => field?.toLowerCase().includes(searchLower)) ||
      client.phone?.includes(clientSearchTerm)
    );
    setFilteredClients(filtered);
  }, [clientSearchTerm, clients]);
  
  // Filtrage de l'historique des ventes
  useEffect(() => {
    let filtered = salesHistory;
    
    // Filtre par recherche
    if (salesSearchTerm.trim()) {
      const searchLower = salesSearchTerm.toLowerCase();
      filtered = filtered.filter((sale) =>
        sale.client_details?.first_name?.toLowerCase().includes(searchLower) ||
        sale.client_details?.last_name?.toLowerCase().includes(searchLower) ||
        sale.reference?.toLowerCase().includes(searchLower) ||
        sale.items?.some(item => item.product?.name?.toLowerCase().includes(searchLower))
      );
    }
    
    // Filtre par date
    if (selectedDateFilter !== 'all') {
      const now = new Date();
      const filterDate = new Date();
      
      switch (selectedDateFilter) {
        case 'today':
          filterDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          filterDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          filterDate.setMonth(now.getMonth() - 1);
          break;
        default:
          break;
      }
      
      if (selectedDateFilter !== 'all') {
        filtered = filtered.filter(sale => 
          new Date(sale.created_at) >= filterDate
        );
      }
    }
    
    // Filtre par magasin
    if (selectedStoreFilter !== 'all') {
      filtered = filtered.filter(sale => sale.store === selectedStoreFilter);
    }
    
    setFilteredSalesHistory(filtered);
  }, [salesHistory, salesSearchTerm, selectedDateFilter, selectedStoreFilter]);
  
  // ============================================
  // GESTION VENTES (MODIFICATION/SUPPRESSION)
  // ============================================
  
  const openEditSaleModal = (sale) => {
    setSaleToEdit(sale);
    setShowEditSaleModal(true);
  };
  
  const openDeleteSaleModal = (sale) => {
    setSaleToDelete(sale);
    setShowDeleteSaleModal(true);
  };
  
  const handleUpdateSale = async (updatedData) => {
    try {
      await ordersAPI.update(saleToEdit.id, updatedData);
      toast.success('Vente mise à jour avec succès');
      setShowEditSaleModal(false);
      loadSalesHistory();
    } catch (error) {
      console.error('Erreur mise à jour vente:', error);
      toast.error('Erreur lors de la mise à jour de la vente');
    }
  };
  
  const handleDeleteSale = async () => {
    try {
      await ordersAPI.delete(saleToDelete.id);
      toast.success('Vente supprimée avec succès');
      setShowDeleteSaleModal(false);
      setSaleToDelete(null);
      loadSalesHistory();
    } catch (error) {
      console.error('Erreur suppression vente:', error);
      toast.error('Erreur lors de la suppression de la vente');
    }
  };
  
  const handleBarcodeSearch = useCallback(async (barcode) => {
    if (!barcode.trim() || isScanning) return;
    setIsScanning(true);
    try {
      const resp = await productsAPI.searchByBarcode(barcode);
      const product = resp.data;
      if (!product.is_visible) {
        toast.error("❌ Ce produit n'est plus disponible à la vente");
        setBarcodeInput('');
        return;
      }
      const stockDisponible =
        selectedStore === 'ville_avray'
          ? product.stock_ville_avray
          : product.stock_garches;
      if (stockDisponible <= 0) {
        const magasinNom = selectedStore === 'ville_avray' ? "Ville d'Avray" : 'Garches';
        toast.error(`❌ Stock insuffisant dans le magasin ${magasinNom}`);
        setBarcodeInput('');
        return;
      }
      addItem(product);
      playSuccessBeep();
      toast.success(`✅ ${product.name} ajouté au panier`, { duration: 2000, icon: '🛒' });
      setBarcodeInput('');
      setTimeout(() => barcodeInputRef.current?.focus(), 100);
    } catch (error) {
      console.error('Erreur recherche code-barre:', error);
      if (error.response?.status === 404) {
        toast.error('❌ Produit non trouvé', { duration: 3000 });
      } else {
        toast.error('❌ Erreur lors de la recherche du produit');
      }
      setBarcodeInput('');
    } finally {
      setIsScanning(false);
    }
  }, [isScanning, selectedStore, addItem]);
  
  const handleBarcodeKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const term = barcodeInput.trim().toLowerCase();
      const localMatch = products.find(p =>
        p.name.toLowerCase().includes(term) ||
        p.reference.toLowerCase().includes(term) ||
        (p.barcode && p.barcode.toLowerCase() === term)
      );
      if (localMatch) {
        addItem(localMatch);
        playSuccessBeep();
        toast.success(`✅ ${localMatch.name} ajouté au panier`, { duration: 2000, icon: '🛒' });
        setBarcodeInput('');
        setTimeout(() => barcodeInputRef.current?.focus(), 100);
      } else {
        handleBarcodeSearch(barcodeInput);
      }
    }
  };
  
  const playSuccessBeep = () => {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.1);
    } catch {
      console.warn('Son de confirmation non disponible');
    }
  };
  
  // Produits filtrés pour l'affichage
  const filteredProducts = useMemo(() => {
    let filtered = products;
    
    // Filtre par recherche
    if (productSearchTerm) {
      const term = productSearchTerm.toLowerCase();
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(term) ||
        p.reference.toLowerCase().includes(term) ||
        (p.barcode && p.barcode.toLowerCase().includes(term))
      );
    }
    
    // Filtre par catégorie
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(p => p.category === selectedCategory);
    }
    
    return filtered;
  }, [products, productSearchTerm, selectedCategory]);
  
  // Catégories uniques
  const categories = useMemo(() => {
    const cats = [...new Set(products.map(p => p.category).filter(Boolean))];
    return ['all', ...cats];
  }, [products]);
  
  // ============================================
  // CAISSE - CHECKOUT
  // ============================================
  
  const handleCheckout = useCallback(async () => {
    if (!selectedClient) {
      toast.error('Veuillez sélectionner un client');
      return;
    }
    if (items.length === 0) {
      toast.error('Le panier est vide');
      return;
    }
    setLoading(true);
    try {
      const orderData = {
        client: selectedClient.id,
        store: selectedStore,
        items: items.map(item => ({
          product: item.product.id,
          quantity: item.quantity,
          unit_price_ht: parseFloat(item.product.price_ht),
          unit_price_ttc: parseFloat(item.product.price_ttc),
          tva_rate: parseFloat(item.product.tva_rate),
        })),
        payment_method: paymentMethod,
        installments: paymentMethod === 'installment' ? installments : 1,
        notes: orderNotes.trim() || null,
      };
  
      const respOrder = await ordersAPI.create(orderData);
      const order = respOrder.data;
      toast.success('✅ Vente enregistrée avec succès !');
  
      // Génération facture
      const authStorage = localStorage.getItem('auth-storage');
      const token = authStorage ? JSON.parse(authStorage)?.state?.token : null;
      if (token) {
        try {
          const axiosAuth = axios.create({
            baseURL: 'http://localhost:8000/',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          });
          await axiosAuth.post(`/api/invoices/${order.invoice.id}/generate_both/`);
          toast.success('📧 Facture envoyée au client !', { duration: 4000 });
        } catch (error) {
          console.error('Erreur génération facture:', error);
          toast.warning('⚠️ Vente enregistrée mais erreur lors de l\'envoi de la facture');
        }
      }
  
      clearCart();
      setBarcodeInput('');
      setPaymentMethod('cash');
      setInstallments(1);
      setOrderNotes('');
      setTimeout(() => barcodeInputRef.current?.focus(), 500);
    } catch (error) {
      console.error('Erreur checkout:', error);
      toast.error('Erreur lors de la création de la commande');
    } finally {
      setLoading(false);
    }
  }, [selectedClient, selectedStore, items, paymentMethod, installments, orderNotes, clearCart]);
  
  const totalTTC = getTotal();
  const totalHT = getTotalHT();
  const totalTVA = totalTTC - totalHT;
  
  // ============================================
  // GESTION CLIENTS - CRUD
  // ============================================
  
  const handleCreateClient = async (clientData) => {
    try {
      const response = await clientsAPI.create(clientData);
      toast.success('✅ Client créé avec succès');
      await loadClients();
      return response.data;
    } catch (error) {
      toast.error('❌ Erreur lors de la création du client');
      console.error(error);
      throw error;
    }
  };
  
  const handleUpdateClient = async (id, clientData) => {
    try {
      await clientsAPI.update(id, clientData);
      toast.success('✅ Client mis à jour avec succès');
      await loadClients();
      setShowEditClientModal(false);
      setClientToEdit(null);
    } catch (error) {
      toast.error('❌ Erreur lors de la mise à jour du client');
      console.error(error);
    }
  };
  
  const handleDeleteClient = async () => {
    if (!clientToDelete) return;
    try {
      await clientsAPI.delete(clientToDelete.id);
      toast.success('✅ Client supprimé avec succès');
      await loadClients();
      setShowDeleteClientModal(false);
      setClientToDelete(null);
    } catch (error) {
      toast.error('❌ Erreur lors de la suppression du client');
      console.error(error);
    }
  };
  
  const openEditModal = (client) => {
    setClientToEdit(client);
    setShowEditClientModal(true);
  };
  
  const openDeleteModal = (client) => {
    setClientToDelete(client);
    setShowDeleteClientModal(true);
  };
  
  const viewClientDetail = (client) => {
    setSelectedClientForDetail(client);
    setActiveView('client-detail');
  };
  
  const selectClientForCart = (client) => {
    setSelectedClient(client);
    setShowClientModal(false);
    setActiveView('cashier');
    toast.success(`Client ${client.first_name} ${client.last_name} sélectionné`);
  };
  
  // ============================================
  // RENDU - NAVIGATION
  // ============================================
  
  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header avec navigation */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-gray-900">Caisse</h1>
            <span className="badge-blue">{items.length}</span>
          </div>
          
          {/* Navigation tabs */}
          <div className="flex bg-gray-100 rounded-lg p-1 border border-gray-200">
            <button
              onClick={() => setActiveView('cashier')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${
                activeView === 'cashier'
                  ? 'bg-white shadow-sm text-primary-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <ShoppingCartIcon className="w-4 h-4 inline mr-1" />
              Caisse
            </button>
            <button
              onClick={() => setActiveView('clients')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${
                activeView === 'clients'
                  ? 'bg-white shadow-sm text-primary-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <UserIcon className="w-4 h-4 inline mr-1" />
              Clients
            </button>
            <button
              onClick={() => setActiveView('history')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${
                activeView === 'history'
                  ? 'bg-white shadow-sm text-primary-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <ClockIcon className="w-4 h-4 inline mr-1" />
              Historique
            </button>
          </div>
          
          {/* Client sélectionné */}
          {selectedClient && (
            <div className="flex items-center gap-2">
              <span className="badge-green">
                {selectedClient.first_name} {selectedClient.last_name}
              </span>
              <button
                onClick={() => setSelectedClient(null)}
                className="text-green-600 hover:text-green-800"
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
      
      {/* Contenu principal selon la vue active */}
      <div className="flex-1 overflow-auto p-3">
        {activeView === 'cashier' && (
          <CashierView
            products={filteredProducts}
            categories={categories}
            selectedCategory={selectedCategory}
            setSelectedCategory={setSelectedCategory}
            productSearchTerm={productSearchTerm}
            setProductSearchTerm={setProductSearchTerm}
            barcodeInput={barcodeInput}
            setBarcodeInput={setBarcodeInput}
            barcodeInputRef={barcodeInputRef}
            handleBarcodeKeyPress={handleBarcodeKeyPress}
            handleBarcodeSearch={handleBarcodeSearch}
            isScanning={isScanning}
            selectedStore={selectedStore}
            setSelectedStore={setSelectedStore}
            items={items}
            addItem={addItem}
            updateQuantity={updateQuantity}
            removeItem={removeItem}
            totalTTC={totalTTC}
            totalHT={totalHT}
            totalTVA={totalTVA}
            selectedClient={selectedClient}
            setShowClientModal={setShowClientModal}
            setShowCreateClientModal={setShowCreateClientModal}
            paymentMethod={paymentMethod}
            setPaymentMethod={setPaymentMethod}
            installments={installments}
            setInstallments={setInstallments}
            orderNotes={orderNotes}
            setOrderNotes={setOrderNotes}
            handleCheckout={handleCheckout}
            loading={loading}
            onViewClients={() => setActiveView('clients')}
          />
        )}
        
        {activeView === 'clients' && (
          <ClientsListView
            clients={filteredClients}
            searchTerm={clientSearchTerm}
            setSearchTerm={setClientSearchTerm}
            loading={loadingClients}
            onCreateClient={() => setShowCreateClientModal(true)}
            onEditClient={openEditModal}
            onDeleteClient={openDeleteModal}
            onViewDetail={viewClientDetail}
            onSelectForCart={selectClientForCart}
            onBack={() => setActiveView('cashier')}
          />
        )}
        
        {activeView === 'client-detail' && selectedClientForDetail && (
          <ClientDetailView
            client={selectedClientForDetail}
            onBack={() => setActiveView('clients')}
            onEdit={() => openEditModal(selectedClientForDetail)}
            onSelectForCart={() => {
              selectClientForCart(selectedClientForDetail);
            }}
          />
        )}
        
        {activeView === 'history' && (
          <SalesHistoryView
            sales={filteredSalesHistory}
            searchTerm={salesSearchTerm}
            setSearchTerm={setSalesSearchTerm}
            selectedDateFilter={selectedDateFilter}
            setSelectedDateFilter={setSelectedDateFilter}
            selectedStoreFilter={selectedStoreFilter}
            setSelectedStoreFilter={setSelectedStoreFilter}
            loading={loadingSales}
            onRefresh={loadSalesHistory}
            onBack={() => setActiveView('cashier')}
            onEditSale={openEditSaleModal}
            onDeleteSale={openDeleteSaleModal}
          />
        )}
      </div>
      
      {/* Modales */}
      {showClientModal && (
        <ClientSelectionModal
          clients={filteredClients}
          searchTerm={clientSearchTerm}
          setSearchTerm={setClientSearchTerm}
          onSelect={selectClientForCart}
          onClose={() => setShowClientModal(false)}
          onCreateNew={() => {
            setShowClientModal(false);
            setShowCreateClientModal(true);
          }}
        />
      )}
      
      {showCreateClientModal && (
        <ClientFormModal
          title="Créer un nouveau client"
          onSave={handleCreateClient}
          onClose={() => setShowCreateClientModal(false)}
        />
      )}
      
      {showEditClientModal && clientToEdit && (
        <ClientFormModal
          title="Modifier le client"
          client={clientToEdit}
          onSave={handleUpdateClient}
          onClose={() => setShowEditClientModal(false)}
        />
      )}
      
      {showDeleteClientModal && clientToDelete && (
        <DeleteConfirmationModal
          client={clientToDelete}
          onConfirm={handleDeleteClient}
          onClose={() => setShowDeleteClientModal(false)}
        />
      )}
      
      {showEditSaleModal && saleToEdit && (
        <EditSaleModal
          sale={saleToEdit}
          onSave={handleUpdateSale}
          onClose={() => setShowEditSaleModal(false)}
        />
      )}
      
      {showDeleteSaleModal && saleToDelete && (
        <DeleteSaleConfirmationModal
          sale={saleToDelete}
          onConfirm={handleDeleteSale}
          onClose={() => setShowDeleteSaleModal(false)}
        />
      )}
    </div>
  );
}

// ============================================
// SOUS-COMPOSANTS
// ============================================

function CashierView({
  products,
  categories,
  selectedCategory,
  setSelectedCategory,
  productSearchTerm,
  setProductSearchTerm,
  barcodeInput,
  setBarcodeInput,
  barcodeInputRef,
  handleBarcodeKeyPress,
  handleBarcodeSearch,
  isScanning,
  selectedStore,
  setSelectedStore,
  items,
  addItem,
  updateQuantity,
  removeItem,
  totalTTC,
  totalHT,
  totalTVA,
  selectedClient,
  setShowClientModal,
  setShowCreateClientModal,
  paymentMethod,
  setPaymentMethod,
  installments,
  setInstallments,
  orderNotes,
  setOrderNotes,
  handleCheckout,
  loading,
  onViewClients
}) {
  return (
    <div className="flex gap-4 h-full">
      {/* Partie gauche - Produits */}
      <div className="flex-1 space-y-3">
        {/* Sélecteur de magasin */}
        <div className="card bg-white rounded-xl shadow-soft p-3">
          <label className="form-label text-xs">Magasin</label>
          <select
            value={selectedStore}
            onChange={(e) => setSelectedStore(e.target.value)}
            className="form-input text-sm"
          >
            <option value="ville_avray">📍 Ville d'Avray</option>
            <option value="garches">📍 Garches</option>
          </select>
        </div>
        
        {/* Recherche et filtres */}
        <div className="card bg-white rounded-xl shadow-soft p-3 space-y-3">
          {/* Code-barres */}
          <div className="relative">
            <QrCodeIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              ref={barcodeInputRef}
              type="text"
              value={barcodeInput}
              onChange={(e) => setBarcodeInput(e.target.value)}
              onKeyPress={handleBarcodeKeyPress}
              placeholder="Scanner code-barres ou rechercher..."
              className={`form-input pl-10 pr-10 text-sm ${isScanning ? 'animate-pulse border-yellow-400' : ''}`}
              disabled={isScanning}
            />
            {isScanning && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <div className="spinner w-4 h-4"></div>
              </div>
            )}
          </div>
          
          {/* Recherche texte */}
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={productSearchTerm}
              onChange={(e) => setProductSearchTerm(e.target.value)}
              placeholder="Rechercher un produit..."
              className="form-input pl-10 text-sm"
            />
          </div>
          
          {/* Filtre par catégorie */}
          <div className="flex gap-2 flex-wrap">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`badge transition-all duration-200 ${
                  selectedCategory === cat
                    ? 'badge-primary'
                    : 'badge-gray hover:bg-gray-200'
                }`}
              >
                {cat === 'all' ? 'Tous' : cat}
              </button>
            ))}
          </div>
        </div>
        
        {/* Liste des produits */}
        <div className="card bg-white rounded-xl shadow-soft p-3 max-h-96 overflow-y-auto">
          <div className="grid grid-cols-1 gap-2">
            {products.length > 0 ? (
              products.map(product => (
                <div
                  key={product.id}
                  onClick={() => addItem(product)}
                  className="p-3 bg-gray-50 rounded-lg hover:bg-primary-50 cursor-pointer transition-all duration-200 hover:shadow-md border border-transparent hover:border-primary-200"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-gray-900 truncate">{product.name}</p>
                      <p className="text-xs text-gray-500">{product.reference}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs font-semibold text-primary-600">{product.price_ttc}€</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                          (selectedStore === 'ville_avray' ? product.stock_ville_avray : product.stock_garches) > 0
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}>
                          Stock: {selectedStore === 'ville_avray' ? product.stock_ville_avray : product.stock_garches}
                        </span>
                      </div>
                    </div>
                    <PlusIcon className="w-4 h-4 text-primary-600" />
                  </div>
                </div>
              ))
            ) : (
              <p className="col-span-full text-center text-gray-500 py-6 text-sm">
                Aucun produit trouvé
              </p>
            )}
          </div>
        </div>
      </div>
      
      {/* Partie droite - Panier */}
      <div className="space-y-3">
        {/* Client */}
        <div className="card bg-white rounded-xl shadow-soft p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-gray-900">Client</h2>
            <button
              onClick={onViewClients}
              className="text-xs text-primary-600 hover:text-primary-800 font-medium transition-colors"
            >
              Voir tous
            </button>
          </div>
          
          {selectedClient ? (
            <div className="p-3 bg-primary-50 rounded-lg border border-primary-200">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-gray-900 text-sm">
                    {selectedClient.first_name} {selectedClient.last_name}
                  </p>
                  <p className="text-xs text-gray-600">{selectedClient.email}</p>
                  <p className="text-xs text-gray-600">{selectedClient.phone}</p>
                </div>
                <button
                  onClick={() => setShowClientModal(true)}
                  className="text-primary-600 hover:text-primary-800 transition-colors"
                >
                  <PencilIcon className="w-3 h-3" />
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <button
                onClick={() => setShowClientModal(true)}
                className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-primary-600 hover:text-primary-600 font-medium text-sm transition-all duration-200 flex items-center justify-center gap-2"
              >
                <UserIcon className="w-3 h-3" />
                Sélectionner un client
              </button>
              <button
                onClick={() => setShowCreateClientModal(true)}
                className="btn-primary text-sm py-2"
              >
                <PlusIcon className="w-3 h-3 inline mr-1" />
                Nouveau client
              </button>
            </div>
          )}
        </div>
        
        {/* Notes */}
        <div className="card bg-white rounded-xl shadow-soft p-4">
          <h2 className="text-base font-bold text-gray-900 mb-3">Notes</h2>
          <textarea
            value={orderNotes}
            onChange={(e) => setOrderNotes(e.target.value)}
            placeholder="Notes pour cette commande..."
            className="form-input text-xs resize-none"
            rows="2"
            maxLength="200"
          />
        </div>
        
        {/* Panier */}
        <div className="card bg-white rounded-xl shadow-soft p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-gray-900">Panier</h2>
            <span className="badge-primary">
              {items.length} article{items.length > 1 ? 's' : ''}
            </span>
          </div>
          
          {items.length === 0 ? (
            <div className="text-center py-6 text-gray-400">
              <ShoppingCartIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Panier vide</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {items.map(item => (
                <div key={item.product.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-xs text-gray-900 truncate">
                      {item.product.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {item.product.price_ttc}€ × {item.quantity}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => updateQuantity(item.product.id, Math.max(1, item.quantity - 1))}
                      className="p-1 bg-white rounded border border-gray-300 hover:bg-gray-100 transition-colors"
                    >
                      <MinusIcon className="w-3 h-3" />
                    </button>
                    <span className="w-5 text-center text-xs font-semibold">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                      className="p-1 bg-white rounded border border-gray-300 hover:bg-gray-100 transition-colors"
                    >
                      <PlusIcon className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => removeItem(item.product.id)}
                      className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                    >
                      <TrashIcon className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {/* Paiement */}
          {items.length > 0 && (
            <div className="mt-4 pt-3 border-t">
              <label className="form-label text-xs">Paiement</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="form-input text-xs mb-2"
              >
                <option value="cash">💵 Espèces</option>
                <option value="card">💳 Carte bancaire</option>
                <option value="check">📝 Chèque</option>
                <option value="sumup">📱 SumUp</option>
                <option value="installment">💰 Mensualités</option>
              </select>
              
              {paymentMethod === 'installment' && (
                <select
                  value={installments}
                  onChange={(e) => setInstallments(Number(e.target.value))}
                  className="form-input text-xs"
                >
                  <option value={2}>2× {(totalTTC / 2).toFixed(2)}€</option>
                  <option value={3}>3× {(totalTTC / 3).toFixed(2)}€</option>
                  <option value={4}>4× {(totalTTC / 4).toFixed(2)}€</option>
                </select>
              )}
            </div>
          )}
          
          {/* Total */}
          {items.length > 0 && (
            <div className="mt-4 pt-3 border-t space-y-2">
              <div className="flex justify-between text-xs text-gray-600">
                <span>HT</span>
                <span>{totalHT.toFixed(2)}€</span>
              </div>
              <div className="flex justify-between text-xs text-gray-600">
                <span>TVA</span>
                <span>{totalTVA.toFixed(2)}€</span>
              </div>
              <div className="flex justify-between text-sm font-bold text-gray-900 pt-2 border-t">
                <span>Total</span>
                <span className="text-primary-600 text-lg">{totalTTC.toFixed(2)}€</span>
              </div>
            </div>
          )}
          
          {/* Bouton valider */}
          {items.length > 0 && (
            <button
              onClick={handleCheckout}
              disabled={loading || !selectedClient}
              className="btn-success w-full mt-3 py-3 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm font-bold"
            >
              {loading ? (
                <>
                  <div className="spinner w-4 h-4"></div>
                  Traitement...
                </>
              ) : (
                <>
                  <CheckCircleIcon className="w-4 h-4" />
                  Valider la vente
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function ClientsListView({
  clients,
  searchTerm,
  setSearchTerm,
  loading,
  onCreateClient,
  onEditClient,
  onDeleteClient,
  onViewDetail,
  onSelectForCart,
  onBack
}) {
  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={onBack}
            className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            <ArrowLeftIcon className="w-4 h-4" />
          </button>
          <h2 className="text-lg font-bold text-gray-900">Gestion des clients</h2>
          <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full font-medium">
            {clients.length}
          </span>
        </div>
        <button
          onClick={onCreateClient}
          className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition text-sm"
        >
          <UserPlusIcon className="w-4 h-4" />
          Nouveau client
        </button>
      </div>
      
      {/* Recherche */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3">
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Rechercher par nom, email, téléphone..."
            className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
          />
        </div>
      </div>
      
      {/* Liste clients */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-6 text-center text-gray-500">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2" />
            <span className="text-sm">Chargement...</span>
          </div>
        ) : clients.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            <UserIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Aucun client trouvé</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {clients.map((client) => (
              <div
                key={client.id}
                className="p-3 hover:bg-gray-50 transition flex items-center justify-between"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <UserIcon className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">
                        {client.first_name} {client.last_name}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        {client.email && (
                          <span className="flex items-center gap-1">
                            <EnvelopeIcon className="w-3 h-3" />
                            {client.email}
                          </span>
                        )}
                        {client.phone && (
                          <span className="flex items-center gap-1">
                            <PhoneIcon className="w-3 h-3" />
                            {client.phone}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => onSelectForCart(client)}
                    className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg"
                    title="Sélectionner pour la caisse"
                  >
                    <ShoppingCartIcon className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onViewDetail(client)}
                    className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"
                    title="Voir détails"
                  >
                    <EyeIcon className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onEditClient(client)}
                    className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-lg"
                    title="Modifier"
                  >
                    <PencilIcon className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onDeleteClient(client)}
                    className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"
                    title="Supprimer"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ClientDetailView({ client, onBack, onEdit, onSelectForCart }) {
  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={onBack}
            className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            <ArrowLeftIcon className="w-4 h-4" />
          </button>
          <h2 className="text-lg font-bold text-gray-900">Détails client</h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onSelectForCart}
            className="flex items-center gap-2 px-3 py-1.5 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition text-sm"
          >
            <ShoppingCartIcon className="w-4 h-4" />
            Sélectionner
          </button>
          <button
            onClick={onEdit}
            className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition text-sm"
          >
            <PencilIcon className="w-4 h-4" />
            Modifier
          </button>
        </div>
      </div>
      
      {/* Infos client */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-start gap-3">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
            <UserIcon className="w-8 h-8 text-blue-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-bold text-gray-900">
              {client.first_name} {client.last_name}
            </h3>
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {client.email && (
                <div className="flex items-center gap-2 text-gray-600 text-sm">
                  <EnvelopeIcon className="w-4 h-4" />
                  {client.email}
                </div>
              )}
              {client.phone && (
                <div className="flex items-center gap-2 text-gray-600 text-sm">
                  <PhoneIcon className="w-4 h-4" />
                  {client.phone}
                </div>
              )}
              {client.address && (
                <div className="flex items-center gap-2 text-gray-600 text-sm sm:col-span-2">
                  <MapPinIcon className="w-4 h-4" />
                  {client.address}, {client.postal_code} {client.city}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Statistiques */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3">
          <p className="text-xs text-gray-500">Total achats</p>
          <p className="text-lg font-bold text-blue-600">-- €</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3">
          <p className="text-xs text-gray-500">Nombre de commandes</p>
          <p className="text-lg font-bold text-green-600">--</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3">
          <p className="text-xs text-gray-500">Dernière visite</p>
          <p className="text-lg font-bold text-gray-700">--</p>
        </div>
      </div>
      
      {/* Historique (placeholder) */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3">
        <h3 className="text-base font-bold text-gray-900 mb-3">Historique des achats</h3>
        <p className="text-gray-500 text-center py-6 text-sm">
          Historique non disponible pour le moment
        </p>
      </div>
    </div>
  );
}

function ClientSelectionModal({ clients, searchTerm, setSearchTerm, onSelect, onClose, onCreateNew }) {
  const filtered = clients.filter((c) =>
    c.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.phone?.includes(searchTerm)
  );
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3">
      <div className="bg-white rounded-lg max-w-xl w-full max-h-[85vh] overflow-hidden">
        <div className="p-3 border-b flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">Sélectionner un client</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-3">
          <div className="relative mb-3">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Rechercher..."
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
              autoFocus
            />
          </div>
          
          <button
            onClick={onCreateNew}
            className="w-full py-2.5 mb-3 border-2 border-dashed border-blue-300 rounded-lg text-blue-600 hover:bg-blue-50 font-medium transition flex items-center justify-center gap-2 text-sm"
          >
            <PlusCircleIcon className="w-4 h-4" />
            Créer un nouveau client
          </button>
        </div>
        
        <div className="overflow-y-auto max-h-96 px-3 pb-3 space-y-1">
          {filtered.map((client) => (
            <button
              key={client.id}
              onClick={() => onSelect(client)}
              className="w-full text-left p-2.5 hover:bg-gray-50 rounded-lg transition border border-gray-200 hover:border-blue-300 flex items-center gap-3"
            >
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <UserIcon className="w-4 h-4 text-blue-600" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-gray-900 text-sm">
                  {client.first_name} {client.last_name}
                </p>
                <p className="text-xs text-gray-500">{client.email} • {client.phone}</p>
              </div>
              <ChevronRightIcon className="w-4 h-4 text-gray-400" />
            </button>
          ))}
          {filtered.length === 0 && (
            <p className="text-center text-gray-500 py-6 text-sm">Aucun client trouvé</p>
          )}
        </div>
      </div>
    </div>
  );
}

function ClientFormModal({ client, onSave, onClose, title }) {
  const [formData, setFormData] = useState({
    first_name: client?.first_name || '',
    last_name: client?.last_name || '',
    email: client?.email || '',
    phone: client?.phone || '',
    address: client?.address || '',
    city: client?.city || '',
    postal_code: client?.postal_code || '',
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSave(formData);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b p-3 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-3 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Prénom *</label>
              <input
                type="text"
                name="first_name"
                value={formData.first_name}
                onChange={handleChange}
                className="w-full px-2 py-1.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Nom *</label>
              <input
                type="text"
                name="last_name"
                value={formData.last_name}
                onChange={handleChange}
                className="w-full px-2 py-1.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 text-sm"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full px-2 py-1.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Téléphone *</label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="w-full px-2 py-1.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 text-sm"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Adresse</label>
            <input
              type="text"
              name="address"
              value={formData.address}
              onChange={handleChange}
              className="w-full px-2 py-1.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Code postal</label>
              <input
                type="text"
                name="postal_code"
                value={formData.postal_code}
                onChange={handleChange}
                className="w-full px-2 py-1.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Ville</label>
              <input
                type="text"
                name="city"
                value={formData.city}
                onChange={handleChange}
                className="w-full px-2 py-1.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
          </div>

          <div className="flex gap-2 pt-3 border-t">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-3 py-2 border border-gray-300 text-gray-700 rounded-md font-medium hover:bg-gray-50 text-sm"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 disabled:opacity-50 text-sm"
            >
              {loading ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function DeleteConfirmationModal({ client, onConfirm, onClose }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3">
      <div className="bg-white rounded-lg max-w-sm w-full p-4">
        <div className="text-center">
          <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <TrashIcon className="w-5 h-5 text-red-600" />
          </div>
          <h3 className="text-base font-bold text-gray-900 mb-2">Confirmer la suppression</h3>
          <p className="text-sm text-gray-600 mb-4">
            Êtes-vous sûr de vouloir supprimer <strong>{client.first_name} {client.last_name}</strong> ?
            Cette action est irréversible.
          </p>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="flex-1 px-3 py-2 border border-gray-300 text-gray-700 rounded-md font-medium hover:bg-gray-50 text-sm"
            >
              Annuler
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 px-3 py-2 bg-red-600 text-white rounded-md font-medium hover:bg-red-700 text-sm"
            >
              Supprimer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function EditSaleModal({ sale, onSave, onClose }) {
  const [formData, setFormData] = useState({
    payment_method: sale.payment_method,
    installments: sale.installments || 1,
    notes: sale.notes || ''
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSave(formData);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b p-3 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">Modifier la vente #{sale.reference}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-3 space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Méthode de paiement</label>
            <select
              name="payment_method"
              value={formData.payment_method}
              onChange={handleChange}
              className="w-full px-2 py-1.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="cash">💵 Espèces</option>
              <option value="card">💳 Carte bancaire</option>
              <option value="check">📝 Chèque</option>
              <option value="sumup">📱 SumUp</option>
              <option value="installment">💰 Mensualités</option>
            </select>
          </div>

          {formData.payment_method === 'installment' && (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Nombre de mensualités</label>
              <select
                name="installments"
                value={formData.installments}
                onChange={handleChange}
                className="w-full px-2 py-1.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value={2}>2×</option>
                <option value={3}>3×</option>
                <option value={4}>4×</option>
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              placeholder="Notes sur cette vente..."
              className="w-full px-2 py-1.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 resize-none text-sm"
              rows="2"
              maxLength="200"
            />
          </div>

          <div className="bg-gray-50 p-2 rounded-md">
            <p className="text-xs text-gray-600 mb-1">Détails de la vente</p>
            <p className="text-sm font-semibold text-gray-900">{sale.total_ttc}€ TTC</p>
            <p className="text-xs text-gray-500">
              {sale.items?.length || 0} article{(sale.items?.length || 0) > 1 ? 's' : ''}
            </p>
            {sale.client_details && (
              <p className="text-xs text-gray-500">
                Client: {sale.client_details.first_name} {sale.client_details.last_name}
              </p>
            )}
          </div>

          <div className="flex gap-2 pt-3 border-t">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-3 py-2 border border-gray-300 text-gray-700 rounded-md font-medium hover:bg-gray-50 text-sm"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 disabled:opacity-50 text-sm"
            >
              {loading ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function DeleteSaleConfirmationModal({ sale, onConfirm, onClose }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3">
      <div className="bg-white rounded-lg max-w-sm w-full p-4">
        <div className="text-center">
          <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <ExclamationTriangleIcon className="w-5 h-5 text-red-600" />
          </div>
          <h3 className="text-base font-bold text-gray-900 mb-2">Annuler la vente</h3>
          <p className="text-sm text-gray-600 mb-4">
            Êtes-vous sûr de vouloir annuler la vente <strong>#{sale.reference}</strong> ?
            <br />
            <span className="text-red-600 font-semibold">{sale.total_ttc}€</span> seront remboursés.
            <br />
            Cette action est irréversible.
          </p>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="flex-1 px-3 py-2 border border-gray-300 text-gray-700 rounded-md font-medium hover:bg-gray-50 text-sm"
            >
              Annuler
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 px-3 py-2 bg-red-600 text-white rounded-md font-medium hover:bg-red-700 text-sm"
            >
              Confirmer l'annulation
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SalesHistoryView({
  sales,
  searchTerm,
  setSearchTerm,
  selectedDateFilter,
  setSelectedDateFilter,
  selectedStoreFilter,
  setSelectedStoreFilter,
  loading,
  onRefresh,
  onBack,
  onEditSale,
  onDeleteSale
}) {
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getPaymentIcon = (method) => {
    switch (method) {
      case 'cash': return <BanknotesIcon className="w-4 h-4" />;
      case 'card': return <CreditCardIcon className="w-4 h-4" />;
      case 'check': return <DocumentTextIcon className="w-4 h-4" />;
      case 'sumup': return <PhoneIcon className="w-4 h-4" />;
      case 'installment': return <CalendarIcon className="w-4 h-4" />;
      default: return <CurrencyEuroIcon className="w-4 h-4" />;
    }
  };

  const getPaymentLabel = (method) => {
    switch (method) {
      case 'cash': return 'Espèces';
      case 'card': return 'Carte';
      case 'check': return 'Chèque';
      case 'sumup': return 'SumUp';
      case 'installment': return 'Mensualités';
      default: return method;
    }
  };

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={onBack}
            className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            <ArrowLeftIcon className="w-4 h-4" />
          </button>
          <h2 className="text-lg font-bold text-gray-900">Historique des ventes</h2>
          <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full font-medium">
            {sales.length}
          </span>
        </div>
        <button
          onClick={onRefresh}
          className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-lg"
          title="Actualiser"
        >
          <ArrowPathIcon className="w-4 h-4" />
        </button>
      </div>

      {/* Filtres */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Recherche */}
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Rechercher..."
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>

          {/* Filtre date */}
          <select
            value={selectedDateFilter}
            onChange={(e) => setSelectedDateFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
          >
            <option value="all">Toutes les dates</option>
            <option value="today">Aujourd'hui</option>
            <option value="week">7 derniers jours</option>
            <option value="month">30 derniers jours</option>
          </select>

          {/* Filtre magasin */}
          <select
            value={selectedStoreFilter}
            onChange={(e) => setSelectedStoreFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
          >
            <option value="all">Tous magasins</option>
            <option value="ville_avray">Ville d'Avray</option>
            <option value="garches">Garches</option>
          </select>
        </div>
      </div>

      {/* Liste des ventes */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-6 text-center text-gray-500">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2" />
            <span className="text-sm">Chargement...</span>
          </div>
        ) : sales.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            <DocumentTextIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Aucune vente trouvée</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
            {sales.map((sale) => (
              <div key={sale.id} className="p-3 hover:bg-gray-50 transition">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-gray-900 text-sm">
                        #{sale.reference}
                      </span>
                      <span className="text-xs text-gray-500">
                        {formatDate(sale.created_at)}
                      </span>
                      <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded">
                        {sale.store === 'ville_avray' ? "Ville d'Avray" : 'Garches'}
                      </span>
                    </div>
                    
                    {sale.client_details && (
                      <div className="flex items-center gap-1 text-xs text-gray-600 mb-2">
                        <UserIcon className="w-3 h-3" />
                        {sale.client_details.first_name} {sale.client_details.last_name}
                      </div>
                    )}

                    <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                      {sale.items?.slice(0, 2).map((item, index) => (
                        <span key={index} className="bg-gray-50 px-1.5 py-0.5 rounded">
                          {item.quantity}× {item.product?.name?.substring(0, 20)}
                          {item.product?.name?.length > 20 && '...'}
                        </span>
                      ))}
                      {sale.items?.length > 2 && (
                        <span className="text-gray-400">+{sale.items.length - 2}</span>
                      )}
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="flex items-center gap-1 text-xs text-gray-600">
                          {getPaymentIcon(sale.payment_method)}
                          {getPaymentLabel(sale.payment_method)}
                        </span>
                        {sale.installments > 1 && (
                          <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
                            {sale.installments}×
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-blue-600 text-sm">
                          {sale.total_ttc}€
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => onEditSale(sale)}
                            className="p-1 text-gray-600 hover:bg-gray-100 rounded"
                            title="Modifier la vente"
                          >
                            <PencilIcon className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => onDeleteSale(sale)}
                            className="p-1 text-red-600 hover:bg-red-50 rounded"
                            title="Annuler la vente"
                          >
                            <ArrowUturnLeftIcon className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
