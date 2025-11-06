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
  QrCodeIcon
} from '@heroicons/react/24/outline';

export default function Cart() {
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

  const [products, setProducts] = useState([]);
  const [clients, setClients] = useState([]);
  const [barcodeInput, setBarcodeInput] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showClientModal, setShowClientModal] = useState(false);
  const [showCreateClientModal, setShowCreateClientModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [installments, setInstallments] = useState(1);

  const barcodeInputRef = useRef(null);

  // --- Effets de chargement ---
  const loadProducts = useCallback(async () => {
    try {
      const resp = await productsAPI.getAll({ is_visible: true });
      const list = resp.data.results || resp.data;
      setProducts(list);
    } catch (error) {
      console.error('Erreur chargement produits:', error);
      toast.error('Erreur de chargement des produits');
    }
  }, []);

  const loadClients = useCallback(async () => {
    try {
      const resp = await clientsAPI.getAll();
      const list = resp.data.results || resp.data;
      setClients(list);
    } catch (error) {
      console.error('Erreur chargement clients:', error);
      toast.error('Erreur de chargement des clients');
    }
  }, []);

  useEffect(() => {
    loadProducts();
    loadClients();
  }, [loadProducts, loadClients]);

  useEffect(() => {
    if (barcodeInputRef.current) barcodeInputRef.current.focus();
  }, []);

  // --- Recherche par code-barre ou saisie manuelle ---
  const handleBarcodeSearch = useCallback(async (barcode) => {
    if (!barcode.trim() || isScanning) return;
    setIsScanning(true);
    try {
      const resp = await productsAPI.searchByBarcode(barcode);
      const product = resp.data;
      if (!product.is_visible) {
        toast.error("❌ Ce produit n’est plus disponible à la vente");
        setBarcodeInput('');
        return;
      }
      const stockDisponible =
        selectedStore === 'ville_avray'
          ? product.stock_ville_avray
          : product.stock_garches;
      if (stockDisponible <= 0) {
        const magasinNom = selectedStore === 'ville_avray' ? "Ville d'Avray" : 'Garches';
        toast.error(`❌ Stock insuffisant pour ce produit dans le magasin ${magasinNom}`);
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

  /*const handleBarcodeKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleBarcodeSearch(barcodeInput);
    }
  };*/
  const handleBarcodeKeyPress = (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    const term = barcodeInput.trim().toLowerCase();

    // 1️⃣ Vérifie s’il existe une correspondance locale
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
      setTimeout(() => {
        if (barcodeInputRef.current) barcodeInputRef.current.focus();
      }, 100);
    } else {
      // 2️⃣ Sinon, tente la recherche par code-barre via l’API
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

  // --- Liste produits filtrée (barre de recherche universelle) ---
  const filteredProducts = useMemo(() => {
    const term = barcodeInput.toLowerCase();
    if (!term) return products;
    return products.filter(p =>
      p.name.toLowerCase().includes(term) ||
      p.reference.toLowerCase().includes(term) ||
      (p.barcode && p.barcode.toLowerCase().includes(term))
    );
  }, [products, barcodeInput]);

  // --- Validation / Checkout ---
  /*const handleCheckout = useCallback(async () => {
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
      };
  
      const respOrder = await ordersAPI.create(orderData);
      const order = respOrder.data;
      toast.success('✅ Vente enregistrée avec succès !');
  
      const authStorage = localStorage.getItem('auth-storage');
      const token = authStorage ? JSON.parse(authStorage)?.state?.token : null;
      if (!token) {
        toast.error('Session expirée, veuillez vous reconnecter');
        setLoading(false);
        return;
      }
  
      const axiosAuth = axios.create({
        baseURL: 'https://erp-micheldevelo.onrender.com/',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
  
      // Génération des fichiers + envoi automatique du mail côté backend
      await axiosAuth.post(`/api/invoices/${order.invoice.id}/generate_both/`);
      toast.success('📧 Facture envoyée automatiquement au client !', { duration: 4000 });
  
      // Téléchargement local des PDFs
      const receiptResp = await axiosAuth.get(
        `/api/invoices/${order.invoice.id}/download_receipt/`,
        { responseType: 'blob' }
      );
      const receiptUrl = window.URL.createObjectURL(new Blob([receiptResp.data]));
      const a = document.createElement('a');
      a.href = receiptUrl;
      a.setAttribute('download', `ticket_${order.invoice.invoice_number}.pdf`);
      document.body.appendChild(a);
      a.click();
      a.remove();
  
      const invoiceResp = await axiosAuth.get(
        `/api/invoices/${order.invoice.id}/download_invoice/`,
        { responseType: 'blob' }
      );
      const invoiceUrl = window.URL.createObjectURL(new Blob([invoiceResp.data]));
      const b = document.createElement('a');
      b.href = invoiceUrl;
      b.setAttribute('download', `facture_${order.invoice.invoice_number}.pdf`);
      document.body.appendChild(b);
      b.click();
      b.remove();
  
      clearCart();
      setBarcodeInput('');
      setPaymentMethod('cash');
      setInstallments(1);
      setTimeout(() => barcodeInputRef.current?.focus(), 500);
    } catch (error) {
      console.error('Erreur checkout:', error);
      toast.error('Erreur lors de la création de la commande');
    } finally {
      setLoading(false);
    }
  }, [selectedClient, selectedStore, items, paymentMethod, installments, clearCart]);*/

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
      };
  
      const respOrder = await ordersAPI.create(orderData);
      const order = respOrder.data;
      toast.success('✅ Vente enregistrée avec succès !');
  
      const authStorage = localStorage.getItem('auth-storage');
      const token = authStorage ? JSON.parse(authStorage)?.state?.token : null;
      if (!token) {
        toast.error('Session expirée, veuillez vous reconnecter');
        setLoading(false);
        return;
      }
  
      const axiosAuth = axios.create({
        baseURL: 'https://erp-micheldevelo.onrender.com/',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
  
      // Génération des fichiers + envoi automatique du mail côté backend
      await axiosAuth.post(`/api/invoices/${order.invoice.id}/generate_both/`);
      toast.success('📧 Facture envoyée automatiquement au client !', { duration: 4000 });
  
      // Téléchargement local des PDFs si ce n'est pas un Android
      const isAndroid = /Android/i.test(navigator.userAgent);
      if (!isAndroid) {
        // Télécharger le ticket
        const receiptResp = await axiosAuth.get(
          `/api/invoices/${order.invoice.id}/download_receipt/`,
          { responseType: 'blob' }
        );
        const receiptUrl = window.URL.createObjectURL(new Blob([receiptResp.data]));
        const a = document.createElement('a');
        a.href = receiptUrl;
        a.setAttribute('download', `ticket_${order.invoice.invoice_number}.pdf`);
        document.body.appendChild(a);
        a.click();
        a.remove();
  
        // Télécharger la facture
        const invoiceResp = await axiosAuth.get(
          `/api/invoices/${order.invoice.id}/download_invoice/`,
          { responseType: 'blob' }
        );
        const invoiceUrl = window.URL.createObjectURL(new Blob([invoiceResp.data]));
        const b = document.createElement('a');
        b.href = invoiceUrl;
        b.setAttribute('download', `facture_${order.invoice.invoice_number}.pdf`);
        document.body.appendChild(b);
        b.click();
        b.remove();
      } else {
        console.log("Téléchargement local désactivé sur Android");
      }
  
      // Réinitialisation du panier et autres états
      clearCart();
      setBarcodeInput('');
      setPaymentMethod('cash');
      setInstallments(1);
      setTimeout(() => barcodeInputRef.current?.focus(), 500);
    } catch (error) {
      console.error('Erreur checkout:', error);
      toast.error('Erreur lors de la création de la commande');
    } finally {
      setLoading(false);
    }
  }, [selectedClient, selectedStore, items, paymentMethod, installments, clearCart]);



  const totalTTC = getTotal();
  const totalHT = getTotalHT();
  const totalTVA = totalTTC - totalHT;

  // --- JSX return ---
  return (
    <div className="p-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Partie gauche : recherche et produits */}
        <div className="lg:col-span-2 space-y-6">

          {/* Magasin */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Magasin de vente</h2>
            <div className="grid grid-cols-2 gap-4">
              {['ville_avray', 'garches'].map((store) => (
                <button
                  key={store}
                  onClick={() => setSelectedStore(store)}
                  className={`p-4 rounded-lg border-2 font-semibold transition ${
                    selectedStore === store
                      ? 'border-blue-600 bg-blue-50 text-blue-600'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {store === 'ville_avray' ? "Ville d'Avray" : 'Garches'}
                </button>
              ))}
            </div>
          </div>

          {/* Barre de recherche universelle */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl shadow-lg p-6 border-2 border-blue-200">
            <div className="flex items-center gap-3 mb-4">
              <QrCodeIcon className="w-8 h-8 text-blue-600" />
              <h2 className="text-xl font-bold text-gray-900">Recherche / Scan produit</h2>
              {isScanning && (
                <span className="ml-auto px-3 py-1 bg-blue-600 text-white text-sm font-semibold rounded-full animate-pulse">
                  Recherche...
                </span>
              )}
            </div>

            <input
              ref={barcodeInputRef}
              type="text"
              value={barcodeInput}
              onChange={(e) => setBarcodeInput(e.target.value)}
              onKeyPress={handleBarcodeKeyPress}
              placeholder="Scannez ou saisissez le nom, référence ou code-barre..."
              className="w-full px-4 py-4 text-lg border-2 border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition disabled:bg-gray-100 disabled:cursor-not-allowed"
              disabled={isScanning}
              autoComplete="off"
            />

            {/* Liste produits filtrés */}
            <div className="bg-white rounded-xl shadow-lg p-6 mt-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Produits disponibles</h2>
              <div className="max-h-96 overflow-y-auto space-y-2">
                {filteredProducts.length > 0 ? (
                  filteredProducts.map((product) => (
                    <div
                      key={product.id}
                      className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg cursor-pointer border border-transparent hover:border-blue-200 transition"
                      onClick={() => addItem(product)}
                    >
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900">{product.name}</p>
                        <p className="text-sm text-gray-600">
                          Réf: {product.reference} • Stock: {product.total_stock}
                          {product.barcode && ` • CB: ${product.barcode}`}
                        </p>
                      </div>
                      <div className="text-right ml-4">
                        <p className="font-bold text-blue-600 text-lg">{product.price_ttc} €</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-gray-500 py-8">Aucun produit trouvé</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Partie panier + client */}
        <div className="space-y-6">
          {/* Sélection client */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Client</h2>
            {selectedClient ? (
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p className="font-semibold text-gray-900">{selectedClient.full_name}</p>
                <p className="text-sm text-gray-600">{selectedClient.email}</p>
                <p className="text-sm text-gray-600">{selectedClient.phone}</p>
                <button
                  onClick={() => setSelectedClient(null)}
                  className="mt-3 text-sm text-red-600 hover:text-red-700 font-medium"
                >
                  ✕ Changer de client
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <button
                  onClick={() => setShowClientModal(true)}
                  className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-600 hover:text-blue-600 font-semibold transition"
                >
                  + Sélectionner un client existant
                </button>
                <button
                  onClick={() => setShowCreateClientModal(true)}
                  className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition"
                >
                  + Créer un nouveau client
                </button>
              </div>
            )}
          </div>

          {/* Panier */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Panier</h2>
              <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full font-semibold">
                {items.length} {items.length > 1 ? 'articles' : 'article'}
              </span>
            </div>

            {items.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🛒</div>
                <p className="text-gray-500 font-medium">Panier vide</p>
                <p className="text-sm text-gray-400 mt-1">Scannez ou ajoutez des produits</p>
              </div>
            ) : (
              <div className="space-y-3">
                {items.map(item => (
                  <div key={item.product.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-gray-900 truncate">{item.product.name}</p>
                      <p className="text-xs text-gray-600">{item.product.price_ttc} € × {item.quantity}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateQuantity(item.product.id, Math.max(1, item.quantity - 1))}
                        className="p-1.5 bg-white rounded hover:bg-gray-100 border border-gray-300 transition"
                        title="Diminuer"
                      >
                        <MinusIcon className="w-4 h-4 text-gray-600" />
                      </button>
                      <span className="w-8 text-center font-bold text-gray-900">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                        className="p-1.5 bg-white rounded hover:bg-gray-100 border border-gray-300 transition"
                        title="Augmenter"
                      >
                        <PlusIcon className="w-4 h-4 text-gray-600" />
                      </button>
                      <button
                        onClick={() => removeItem(item.product.id)}
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded transition"
                        title="Supprimer"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Paiement */}
            {items.length > 0 && (
              <div className="mt-6 pt-6 border-t">
                <h3 className="font-semibold text-gray-900 mb-3">Moyen de paiement</h3>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 mb-3"
                >
                  <option value="cash">💵 Espèces</option>
                  <option value="card">💳 Carte bancaire</option>
                  <option value="check">📝 Chèque</option>
                  <option value="sumup">📱 SumUp</option>
                  <option value="installment">💰 Paiement en plusieurs fois</option>
                </select>

                {paymentMethod === 'installment' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nombre de mensualités
                    </label>
                    <select
                      value={installments}
                      onChange={(e) => setInstallments(Number(e.target.value))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="2">2 fois ({(totalTTC / 2).toFixed(2)} € x 2)</option>
                      <option value="3">3 fois ({(totalTTC / 3).toFixed(2)} € x 3)</option>
                      <option value="4">4 fois ({(totalTTC / 4).toFixed(2)} € x 4)</option>
                    </select>
                  </div>
                )}
              </div>
            )}

            {/* Total */}
            {items.length > 0 && (
              <div className="mt-6 pt-6 border-t space-y-2">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Total HT</span>
                  <span className="font-medium">{totalHT.toFixed(2)} €</span>
                </div>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>TVA</span>
                  <span className="font-medium">{totalTVA.toFixed(2)} €</span>
                </div>
                <div className="flex justify-between text-xl font-bold text-gray-900 pt-2 border-t">
                  <span>Total TTC</span>
                  <span className="text-blue-600">{totalTTC.toFixed(2)} €</span>
                </div>
              </div>
            )}

            {/* Valider la vente */}
            {items.length > 0 && (
              <button
                onClick={handleCheckout}
                disabled={loading || !selectedClient}
                className="w-full mt-6 py-4 bg-green-600 text-white rounded-lg font-bold text-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-lg hover:shadow-xl"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Traitement en cours…
                  </span>
                ) : (
                  '✅ Valider la vente'
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Modales */}
      {showClientModal && (
        <ClientSelectionModal
          clients={clients}
          onSelect={(client) => {
            setSelectedClient(client);
            setShowClientModal(false);
          }}
          onClose={() => setShowClientModal(false)}
        />
      )}
      {showCreateClientModal && (
        <CreateClientModal
          onSave={(newClient) => {
            setSelectedClient(newClient);
            loadClients();
            setShowCreateClientModal(false);
          }}
          onClose={() => setShowCreateClientModal(false)}
        />
      )}
    </div>
  );
}

// … (ClientSelectionModal & CreateClientModal restent équivalents à ce que tu avais, à refactorer si souhaité)


function ClientSelectionModal({ clients, onSelect, onClose }) {
  const [search, setSearch] = useState('');

  const filteredClients = clients.filter((c) =>
    c.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase()) ||
    c.phone?.includes(search)
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
        <div className="p-6 border-b flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Sélectionner un client</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>
        <div className="p-6">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher par nom, email ou téléphone..."
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 mb-4"
            autoFocus
          />
        </div>
        <div className="overflow-y-auto max-h-96 px-6 pb-6 space-y-2">
          {filteredClients.map((client) => (
            <button
              key={client.id}
              onClick={() => onSelect(client)}
              className="w-full text-left p-4 hover:bg-gray-50 rounded-lg transition border border-gray-200 hover:border-blue-300"
            >
              <p className="font-semibold text-gray-900">{client.full_name || `${client.first_name} ${client.last_name}`}</p>
              <p className="text-sm text-gray-600">{client.email} • {client.phone}</p>
            </button>
          ))}
          {filteredClients.length === 0 && (
            <p className="text-center text-gray-500 py-8">Aucun client trouvé</p>
          )}
        </div>
      </div>
    </div>
  );
}

function CreateClientModal({ onSave, onClose }) {
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    postal_code: '',
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await clientsAPI.create(formData);
      toast.success('✅ Client créé avec succès');
      onSave(response.data);
    } catch (error) {
      toast.error('❌ Erreur lors de la création du client');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b p-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Nouveau client</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Prénom *</label>
              <input
                type="text"
                name="first_name"
                value={formData.first_name}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Nom *</label>
              <input
                type="text"
                name="last_name"
                value={formData.last_name}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email *</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Téléphone *</label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Adresse</label>
            <input
              type="text"
              name="address"
              value={formData.address}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Code postal</label>
              <input
                type="text"
                name="postal_code"
                value={formData.postal_code}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Ville</label>
              <input
                type="text"
                name="city"
                value={formData.city}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex gap-4 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Création...' : 'Créer le client'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
