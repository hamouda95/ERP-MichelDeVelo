import React, { useState, useEffect } from 'react';
import { 
  ShoppingCartIcon, 
  TruckIcon, 
  CheckCircleIcon,
  XCircleIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  DocumentTextIcon,
  ArchiveBoxIcon
} from '@heroicons/react/24/outline';

export default function Purchases() {
  const [purchases, setPurchases] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showNewPurchaseModal, setShowNewPurchaseModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  
  // Formulaire nouvelle commande
  const [newPurchase, setNewPurchase] = useState({
    supplier_id: '',
    reference: '',
    order_date: new Date().toISOString().split('T')[0],
    expected_date: '',
    notes: '',
    items: []
  });

  // Item en cours d'ajout
  const [currentItem, setCurrentItem] = useState({
    product_id: '',
    quantity: 1,
    unit_price_ht: 0,
    tva_rate: 20,
    is_used: false
  });

  // Charger les données
  useEffect(() => {
    loadPurchases();
    loadSuppliers();
    loadProducts();
  }, []);

  const loadPurchases = async () => {
    setLoading(true);
    try {
      // Données de démonstration
      const demoData = [
        {
          id: 1,
          reference: 'AC-2024-001',
          supplier: 'Shimano Europe',
          order_date: '2024-11-01',
          expected_date: '2024-11-15',
          reception_date: '2024-11-14',
          status: 'received',
          total_ht: 1250.00,
          total_tva: 250.00,
          total_ttc: 1500.00,
          items: [
            { product: 'Dérailleur XT', quantity: 5, unit_price_ht: 150, tva_rate: 20, is_used: false },
            { product: 'Cassette 11V', quantity: 10, unit_price_ht: 50, tva_rate: 20, is_used: false }
          ]
        },
        {
          id: 2,
          reference: 'AC-2024-002',
          supplier: 'Mavic Distribution',
          order_date: '2024-11-05',
          expected_date: '2024-11-20',
          reception_date: null,
          status: 'in_transit',
          total_ht: 2400.00,
          total_tva: 480.00,
          total_ttc: 2880.00,
          items: [
            { product: 'Roues Crossmax', quantity: 6, unit_price_ht: 400, tva_rate: 20, is_used: false }
          ]
        },
        {
          id: 3,
          reference: 'AC-2024-003',
          supplier: 'Vélos Occasion Pro',
          order_date: '2024-11-06',
          expected_date: '2024-11-13',
          reception_date: null,
          status: 'pending',
          total_ht: 800.00,
          total_tva: 0.00,
          total_ttc: 800.00,
          items: [
            { product: 'VTT Giant Occasion', quantity: 2, unit_price_ht: 400, tva_rate: 0, is_used: true }
          ]
        }
      ];
      setPurchases(demoData);
    } catch (error) {
      console.error('Erreur:', error);
    }
    setLoading(false);
  };

  const loadSuppliers = async () => {
    // Données démo fournisseurs
    const demoSuppliers = [
      { id: 1, name: 'Shimano Europe', email: 'order@shimano.eu' },
      { id: 2, name: 'Mavic Distribution', email: 'commande@mavic.fr' },
      { id: 3, name: 'Vélos Occasion Pro', email: 'achat@velosoccasion.fr' },
      { id: 4, name: 'Continental France', email: 'orders@continental.fr' },
      { id: 5, name: 'Specialized Distribution', email: 'b2b@specialized.com' }
    ];
    setSuppliers(demoSuppliers);
  };

  const loadProducts = async () => {
    // Données démo produits
    const demoProducts = [
      { id: 1, name: 'Dérailleur XT', price: 150 },
      { id: 2, name: 'Cassette 11V', price: 50 },
      { id: 3, name: 'Roues Crossmax', price: 400 },
      { id: 4, name: 'VTT Giant Occasion', price: 400 },
      { id: 5, name: 'Pneu Continental', price: 35 },
      { id: 6, name: 'Cadre Specialized', price: 800 }
    ];
    setProducts(demoProducts);
  };

  // Calculs automatiques
  const calculateItemTotal = (item) => {
    const ht = item.quantity * item.unit_price_ht;
    const tva = item.is_used ? 0 : ht * (item.tva_rate / 100);
    const ttc = ht + tva;
    return { ht, tva, ttc };
  };

  const calculatePurchaseTotal = (items) => {
    let total_ht = 0;
    let total_tva = 0;
    
    items.forEach(item => {
      const itemTotal = calculateItemTotal(item);
      total_ht += itemTotal.ht;
      total_tva += itemTotal.tva;
    });
    
    return {
      total_ht: total_ht.toFixed(2),
      total_tva: total_tva.toFixed(2),
      total_ttc: (total_ht + total_tva).toFixed(2)
    };
  };

  // Ajouter un article à la commande
  const addItemToPurchase = () => {
    if (!currentItem.product_id || currentItem.quantity <= 0) {
      alert('Veuillez sélectionner un produit et une quantité valide');
      return;
    }

    const product = products.find(p => p.id === parseInt(currentItem.product_id));
    const newItem = {
      ...currentItem,
      product_name: product.name,
      product_id: parseInt(currentItem.product_id)
    };

    setNewPurchase({
      ...newPurchase,
      items: [...newPurchase.items, newItem]
    });

    // Réinitialiser le formulaire d'article
    setCurrentItem({
      product_id: '',
      quantity: 1,
      unit_price_ht: 0,
      tva_rate: 20,
      is_used: false
    });
  };

  // Retirer un article
  const removeItemFromPurchase = (index) => {
    const updatedItems = newPurchase.items.filter((_, i) => i !== index);
    setNewPurchase({ ...newPurchase, items: updatedItems });
  };

  // Créer la commande
  const createPurchase = async () => {
    if (!newPurchase.supplier_id || newPurchase.items.length === 0) {
      alert('Veuillez sélectionner un fournisseur et ajouter au moins un article');
      return;
    }

    const totals = calculatePurchaseTotal(newPurchase.items);
    const supplier = suppliers.find(s => s.id === parseInt(newPurchase.supplier_id));
    
    const purchaseData = {
      id: purchases.length + 1,
      reference: `AC-${new Date().getFullYear()}-${String(purchases.length + 1).padStart(3, '0')}`,
      supplier: supplier.name,
      order_date: newPurchase.order_date,
      expected_date: newPurchase.expected_date,
      reception_date: null,
      status: 'pending',
      ...totals,
      items: newPurchase.items.map(item => {
        const product = products.find(p => p.id === item.product_id);
        return {
          product: product.name,
          quantity: item.quantity,
          unit_price_ht: item.unit_price_ht,
          tva_rate: item.tva_rate,
          is_used: item.is_used
        };
      }),
      notes: newPurchase.notes
    };

    setPurchases([purchaseData, ...purchases]);
    setShowNewPurchaseModal(false);
    resetNewPurchaseForm();
  };

  const resetNewPurchaseForm = () => {
    setNewPurchase({
      supplier_id: '',
      reference: '',
      order_date: new Date().toISOString().split('T')[0],
      expected_date: '',
      notes: '',
      items: []
    });
  };

  // Marquer comme reçu
  const markAsReceived = (purchaseId) => {
    setPurchases(purchases.map(p => 
      p.id === purchaseId 
        ? { ...p, status: 'received', reception_date: new Date().toISOString().split('T')[0] }
        : p
    ));
    alert('Commande marquée comme reçue ! Le stock a été mis à jour.');
  };

  // Filtrer les commandes
  const filteredPurchases = purchases.filter(p => {
    const matchSearch = p.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       p.supplier.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = filterStatus === 'all' || p.status === filterStatus;
    return matchSearch && matchStatus;
  });

  // Badges de statut
  const getStatusBadge = (status) => {
    const badges = {
      pending: { class: 'bg-yellow-100 text-yellow-800 border-yellow-300', label: 'En attente', icon: '⏳' },
      in_transit: { class: 'bg-blue-100 text-blue-800 border-blue-300', label: 'En transit', icon: '🚚' },
      received: { class: 'bg-green-100 text-green-800 border-green-300', label: 'Reçu', icon: '✅' },
      cancelled: { class: 'bg-red-100 text-red-800 border-red-300', label: 'Annulé', icon: '❌' }
    };
    return badges[status] || badges.pending;
  };

  const totals = newPurchase.items.length > 0 ? calculatePurchaseTotal(newPurchase.items) : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50">
      <div className="p-6 max-w-7xl mx-auto">
        {/* En-tête */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-3">
            <div className="p-3 bg-gradient-to-br from-green-500 to-blue-600 rounded-xl shadow-lg">
              <ShoppingCartIcon className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
                Achats Fournisseurs
              </h1>
              <p className="text-gray-600 mt-1">Gérez vos commandes et mises à jour de stock</p>
            </div>
          </div>
        </div>

        {/* Statistiques */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-5 rounded-2xl shadow-lg border-l-4 border-yellow-500 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-gray-600 mb-1">En attente</div>
                <div className="text-3xl font-bold text-yellow-600">
                  {purchases.filter(p => p.status === 'pending').length}
                </div>
              </div>
              <div className="p-3 bg-yellow-100 rounded-xl">
                <DocumentTextIcon className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl shadow-lg border-l-4 border-blue-500 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-gray-600 mb-1">En transit</div>
                <div className="text-3xl font-bold text-blue-600">
                  {purchases.filter(p => p.status === 'in_transit').length}
                </div>
              </div>
              <div className="p-3 bg-blue-100 rounded-xl">
                <TruckIcon className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl shadow-lg border-l-4 border-green-500 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-gray-600 mb-1">Reçues</div>
                <div className="text-3xl font-bold text-green-600">
                  {purchases.filter(p => p.status === 'received').length}
                </div>
              </div>
              <div className="p-3 bg-green-100 rounded-xl">
                <CheckCircleIcon className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl shadow-lg border-l-4 border-purple-500 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-gray-600 mb-1">Montant total</div>
                <div className="text-3xl font-bold text-purple-600">
                  {purchases.filter(p => p.status === 'received')
                    .reduce((sum, p) => sum + parseFloat(p.total_ttc), 0)
                    .toFixed(2)}€
                </div>
              </div>
              <div className="p-3 bg-purple-100 rounded-xl">
                <svg className="h-6 w-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Barre d'outils */}
        <div className="bg-white rounded-2xl shadow-lg p-4 mb-6 border border-gray-100">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-1">
              <div className="relative flex-1 max-w-md">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Rechercher une commande..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
                />
              </div>

              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-2 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none font-medium"
              >
                <option value="all">Tous les statuts</option>
                <option value="pending">En attente</option>
                <option value="in_transit">En transit</option>
                <option value="received">Reçues</option>
                <option value="cancelled">Annulées</option>
              </select>
            </div>

            <button
              onClick={() => setShowNewPurchaseModal(true)}
              className="px-6 py-2.5 bg-gradient-to-r from-green-600 to-blue-600 text-white rounded-xl hover:shadow-lg transition-all font-medium flex items-center gap-2"
            >
              <PlusIcon className="h-5 w-5" />
              Nouvelle commande
            </button>
          </div>
        </div>

        {/* Liste des commandes */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-green-600 to-blue-600 text-white">
              <tr>
                <th className="px-6 py-4 text-left font-bold">Référence</th>
                <th className="px-6 py-4 text-left font-bold">Fournisseur</th>
                <th className="px-6 py-4 text-left font-bold">Date commande</th>
                <th className="px-6 py-4 text-left font-bold">Date prévue</th>
                <th className="px-6 py-4 text-left font-bold">Statut</th>
                <th className="px-6 py-4 text-right font-bold">Montant HT</th>
                <th className="px-6 py-4 text-right font-bold">TVA</th>
                <th className="px-6 py-4 text-right font-bold">Total TTC</th>
                <th className="px-6 py-4 text-center font-bold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredPurchases.map((purchase) => {
                const statusBadge = getStatusBadge(purchase.status);
                return (
                  <tr key={purchase.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-gray-900">{purchase.reference}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-gray-700">{purchase.supplier}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-gray-600">
                        {new Date(purchase.order_date).toLocaleDateString('fr-FR')}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-gray-600">
                        {new Date(purchase.expected_date).toLocaleDateString('fr-FR')}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold border ${statusBadge.class}`}>
                        <span>{statusBadge.icon}</span>
                        {statusBadge.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-semibold text-gray-900">
                      {parseFloat(purchase.total_ht).toFixed(2)}€
                    </td>
                    <td className="px-6 py-4 text-right font-semibold text-gray-600">
                      {parseFloat(purchase.total_tva).toFixed(2)}€
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-green-600">
                      {parseFloat(purchase.total_ttc).toFixed(2)}€
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => {
                            setSelectedPurchase(purchase);
                            setShowDetailModal(true);
                          }}
                          className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                          title="Voir détails"
                        >
                          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>
                        {purchase.status !== 'received' && purchase.status !== 'cancelled' && (
                          <button
                            onClick={() => markAsReceived(purchase.id)}
                            className="p-2 text-green-600 hover:bg-green-100 rounded-lg transition-colors"
                            title="Marquer comme reçu"
                          >
                            <CheckCircleIcon className="h-5 w-5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {filteredPurchases.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <ArchiveBoxIcon className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">Aucune commande trouvée</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal nouvelle commande */}
      {showNewPurchaseModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-8">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-gradient-to-br from-green-500 to-blue-600 rounded-2xl shadow-lg">
                    <ShoppingCartIcon className="h-7 w-7 text-white" />
                  </div>
                  <div>
                    <h2 className="text-3xl font-bold text-gray-900">Nouvelle commande fournisseur</h2>
                    <p className="text-gray-500 mt-1">Ajoutez des articles pour créer votre commande</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowNewPurchaseModal(false);
                    resetNewPurchaseForm();
                  }}
                  className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl p-2 transition-all"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Informations générales */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Fournisseur *</label>
                  <select
                    value={newPurchase.supplier_id}
                    onChange={(e) => setNewPurchase({ ...newPurchase, supplier_id: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
                    required
                  >
                    <option value="">Sélectionner un fournisseur</option>
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Date de commande</label>
                  <input
                    type="date"
                    value={newPurchase.order_date}
                    onChange={(e) => setNewPurchase({ ...newPurchase, order_date: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Date de livraison prévue</label>
                  <input
                    type="date"
                    value={newPurchase.expected_date}
                    onChange={(e) => setNewPurchase({ ...newPurchase, expected_date: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Notes</label>
                  <input
                    type="text"
                    value={newPurchase.notes}
                    onChange={(e) => setNewPurchase({ ...newPurchase, notes: e.target.value })}
                    placeholder="Notes optionnelles"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Ajout d'articles */}
              <div className="border-t-2 border-gray-100 pt-6 mb-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Ajouter un article</h3>
                <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Produit *</label>
                    <select
                      value={currentItem.product_id}
                      onChange={(e) => {
                        const product = products.find(p => p.id === parseInt(e.target.value));
                        setCurrentItem({
                          ...currentItem,
                          product_id: e.target.value,
                          unit_price_ht: product ? product.price : 0
                        });
                      }}
                      className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
                    >
                      <option value="">Choisir un produit</option>
                      {products.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Quantité *</label>
                    <input
                      type="number"
                      min="1"
                      value={currentItem.quantity}
                      onChange={(e) => setCurrentItem({ ...currentItem, quantity: parseInt(e.target.value) || 1 })}
                      className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Prix HT *</label>
                    <input
                      type="number"
                      step="0.01"
                      value={currentItem.unit_price_ht}
                      onChange={(e) => setCurrentItem({ ...currentItem, unit_price_ht: parseFloat(e.target.value) || 0 })}
                      className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">TVA %</label>
                    <input
                      type="number"
                      step="0.1"
                      value={currentItem.tva_rate}
                      onChange={(e) => setCurrentItem({ ...currentItem, tva_rate: parseFloat(e.target.value) || 0 })}
                      disabled={currentItem.is_used}
                      className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none disabled:bg-gray-100"
                    />
                  </div>

                  <div className="flex items-end">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={currentItem.is_used}
                        onChange={(e) => setCurrentItem({ 
                          ...currentItem, 
                          is_used: e.target.checked,
                          tva_rate: e.target.checked ? 0 : 20
                        })}
                        className="w-5 h-5 rounded border-2 border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm font-medium text-gray-700">Occasion</span>
                    </label>
                  </div>
                </div>

                <button
                  onClick={addItemToPurchase}
                  className="px-6 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium flex items-center gap-2"
                >
                  <PlusIcon className="h-5 w-5" />
                  Ajouter l'article
                </button>
              </div>

              {/* Liste des articles ajoutés */}
              {newPurchase.items.length > 0 && (
                <div className="border-t-2 border-gray-100 pt-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-4">Articles de la commande</h3>
                  <div className="bg-gray-50 rounded-2xl p-4 mb-4">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="px-4 py-2 text-left text-sm font-bold text-gray-700">Produit</th>
                          <th className="px-4 py-2 text-center text-sm font-bold text-gray-700">Qté</th>
                          <th className="px-4 py-2 text-right text-sm font-bold text-gray-700">Prix HT</th>
                          <th className="px-4 py-2 text-center text-sm font-bold text-gray-700">TVA</th>
                          <th className="px-4 py-2 text-right text-sm font-bold text-gray-700">Total HT</th>
                          <th className="px-4 py-2 text-right text-sm font-bold text-gray-700">Total TTC</th>
                          <th className="px-4 py-2"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {newPurchase.items.map((item, index) => {
                          const itemTotal = calculateItemTotal(item);
                          return (
                            <tr key={index} className="border-b border-gray-200">
                              <td className="px-4 py-3 text-gray-900 font-medium">
                                {item.product_name}
                                {item.is_used && <span className="ml-2 text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded-full font-bold">Occasion</span>}
                              </td>
                              <td className="px-4 py-3 text-center text-gray-700">{item.quantity}</td>
                              <td className="px-4 py-3 text-right text-gray-700">{item.unit_price_ht.toFixed(2)}€</td>
                              <td className="px-4 py-3 text-center text-gray-700">{item.tva_rate}%</td>
                              <td className="px-4 py-3 text-right font-semibold text-gray-900">{itemTotal.ht.toFixed(2)}€</td>
                              <td className="px-4 py-3 text-right font-bold text-green-600">{itemTotal.ttc.toFixed(2)}€</td>
                              <td className="px-4 py-3">
                                <button
                                  onClick={() => removeItemFromPurchase(index)}
                                  className="text-red-600 hover:bg-red-100 p-2 rounded-lg transition-colors"
                                >
                                  <XCircleIcon className="h-5 w-5" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Totaux */}
                  {totals && (
                    <div className="bg-gradient-to-br from-green-50 to-blue-50 rounded-2xl p-6 border-2 border-green-200">
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-700 font-medium">Total HT:</span>
                          <span className="text-xl font-bold text-gray-900">{totals.total_ht}€</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-700 font-medium">Total TVA:</span>
                          <span className="text-xl font-bold text-gray-900">{totals.total_tva}€</span>
                        </div>
                        <div className="flex justify-between items-center pt-3 border-t-2 border-green-300">
                          <span className="text-gray-900 font-bold text-lg">Total TTC:</span>
                          <span className="text-3xl font-bold text-green-600">{totals.total_ttc}€</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Boutons d'action */}
              <div className="flex justify-end gap-3 mt-8 pt-6 border-t-2 border-gray-100">
                <button
                  onClick={() => {
                    setShowNewPurchaseModal(false);
                    resetNewPurchaseForm();
                  }}
                  className="px-6 py-3 border-2 border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 font-medium transition-all"
                >
                  Annuler
                </button>
                <button
                  onClick={createPurchase}
                  disabled={!newPurchase.supplier_id || newPurchase.items.length === 0}
                  className="px-6 py-3 bg-gradient-to-r from-green-600 to-blue-600 text-white rounded-xl hover:shadow-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Créer la commande
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal détails */}
      {showDetailModal && selectedPurchase && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-8">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-gradient-to-br from-green-500 to-blue-600 rounded-2xl shadow-lg">
                    <DocumentTextIcon className="h-7 w-7 text-white" />
                  </div>
                  <div>
                    <h2 className="text-3xl font-bold text-gray-900">{selectedPurchase.reference}</h2>
                    <p className="text-gray-500 mt-1">{selectedPurchase.supplier}</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl p-2 transition-all"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-6">
                {/* Statut */}
                <div className="flex items-center gap-3">
                  <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold border ${getStatusBadge(selectedPurchase.status).class}`}>
                    <span>{getStatusBadge(selectedPurchase.status).icon}</span>
                    {getStatusBadge(selectedPurchase.status).label}
                  </span>
                </div>

                {/* Dates */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-2xl p-4">
                    <div className="text-sm text-gray-600 mb-1 font-medium">Date de commande</div>
                    <div className="text-lg font-bold text-gray-900">
                      {new Date(selectedPurchase.order_date).toLocaleDateString('fr-FR')}
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-2xl p-4">
                    <div className="text-sm text-gray-600 mb-1 font-medium">Livraison prévue</div>
                    <div className="text-lg font-bold text-gray-900">
                      {new Date(selectedPurchase.expected_date).toLocaleDateString('fr-FR')}
                    </div>
                  </div>
                </div>

                {/* Articles */}
                <div className="border-t-2 border-gray-100 pt-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Articles commandés</h3>
                  <div className="bg-gray-50 rounded-2xl p-4">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="px-4 py-2 text-left text-sm font-bold text-gray-700">Produit</th>
                          <th className="px-4 py-2 text-center text-sm font-bold text-gray-700">Qté</th>
                          <th className="px-4 py-2 text-right text-sm font-bold text-gray-700">Prix HT</th>
                          <th className="px-4 py-2 text-center text-sm font-bold text-gray-700">TVA</th>
                          <th className="px-4 py-2 text-right text-sm font-bold text-gray-700">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedPurchase.items.map((item, index) => (
                          <tr key={index} className="border-b border-gray-200">
                            <td className="px-4 py-3 text-gray-900 font-medium">
                              {item.product}
                              {item.is_used && <span className="ml-2 text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded-full font-bold">Occasion</span>}
                            </td>
                            <td className="px-4 py-3 text-center text-gray-700">{item.quantity}</td>
                            <td className="px-4 py-3 text-right text-gray-700">{item.unit_price_ht.toFixed(2)}€</td>
                            <td className="px-4 py-3 text-center text-gray-700">{item.tva_rate}%</td>
                            <td className="px-4 py-3 text-right font-bold text-gray-900">
                              {(item.quantity * item.unit_price_ht * (1 + item.tva_rate / 100)).toFixed(2)}€
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Totaux */}
                <div className="bg-gradient-to-br from-green-50 to-blue-50 rounded-2xl p-6 border-2 border-green-200">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-700 font-medium">Total HT:</span>
                      <span className="text-xl font-bold text-gray-900">{parseFloat(selectedPurchase.total_ht).toFixed(2)}€</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-700 font-medium">Total TVA:</span>
                      <span className="text-xl font-bold text-gray-900">{parseFloat(selectedPurchase.total_tva).toFixed(2)}€</span>
                    </div>
                    <div className="flex justify-between items-center pt-3 border-t-2 border-green-300">
                      <span className="text-gray-900 font-bold text-lg">Total TTC:</span>
                      <span className="text-3xl font-bold text-green-600">{parseFloat(selectedPurchase.total_ttc).toFixed(2)}€</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-8 pt-6 border-t-2 border-gray-100">
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="px-6 py-3 border-2 border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 font-medium transition-all"
                >
                  Fermer
                </button>
                {selectedPurchase.status !== 'received' && selectedPurchase.status !== 'cancelled' && (
                  <button
                    onClick={() => {
                      markAsReceived(selectedPurchase.id);
                      setShowDetailModal(false);
                    }}
                    className="px-6 py-3 bg-gradient-to-r from-green-600 to-blue-600 text-white rounded-xl hover:shadow-lg font-medium transition-all flex items-center gap-2"
                  >
                    <CheckCircleIcon className="h-5 w-5" />
                    Marquer comme reçu
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}