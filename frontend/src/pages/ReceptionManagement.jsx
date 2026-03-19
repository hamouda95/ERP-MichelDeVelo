import React, { useState, useEffect } from 'react';
import {
  MagnifyingGlassIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  XMarkIcon,
  PackageIcon,
  TruckIcon,
  CheckCircleIcon,
  EyeIcon,
  CloudArrowUpIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import { suppliersAPI, productsAPI } from '../services/api';
import toast from 'react-hot-toast';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';

export default function ReceptionManagement() {
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStore, setFilterStore] = useState('all');
  const [uploading, setUploading] = useState(false);
  const [stockChanges, setStockChanges] = useState([]);

  const [receptionData, setReceptionData] = useState({
    order_id: '',
    items: [],
    notes: '',
    document_type: 'delivery_note', // 'delivery_note' ou 'invoice'
    document_file: null,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setError(null);
      const [ordersRes, productsRes] = await Promise.all([
        suppliersAPI.getPurchaseOrders(),
        productsAPI.getAll(),
      ]);
      
      setOrders(ordersRes.data.results || ordersRes.data);
      setProducts(productsRes.data.results || productsRes.data);
    } catch (error) {
      console.error('Erreur chargement:', error);
      setError('Impossible de charger les données');
      toast.error('Erreur de chargement');
    } finally {
      setLoading(false);
    }
  };

  const handleReception = async (e) => {
    e.preventDefault();
    try {
      const itemsData = receptionData.items.map(item => ({
        item_id: item.id,
        received_quantity: item.received_quantity,
      }));

      await suppliersAPI.receiveItems(receptionData.order_id, itemsData);
      
      // Afficher les changements de stock
      if (stockChanges.length > 0) {
        showStockChanges();
      }

      toast.success('Commande réceptionnée avec succès');
      setShowModal(false);
      setStockChanges([]);
      resetForm();
      loadData();
    } catch (error) {
      console.error('Erreur réception:', error);
      toast.error('Erreur lors de la réception');
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      // Simulation de parsing de fichier (PDF/Excel)
      // En réalité, vous utiliseriez une librairie comme pdf-parse ou xlsx
      await parseDocument(file);
      toast.success('Document importé avec succès');
    } catch (error) {
      toast.error('Erreur lors de l\'import du document');
    } finally {
      setUploading(false);
    }
  };

  const parseDocument = async (file) => {
    // Simulation de parsing - en réalité, utiliser une librairie appropriée
    return new Promise((resolve) => {
      setTimeout(() => {
        // Simuler des données extraites d'un bon de livraison/facture
        const mockItems = [
          { product_name: 'Vélo de ville', reference: 'VV001', quantity: 5, unit_price: 299.99 },
          { product_name: 'Casque vélo', reference: 'CAS001', quantity: 10, unit_price: 19.99 },
        ];
        
        // Mettre à jour les données de réception
        updateReceptionItems(mockItems);
        resolve(mockItems);
      }, 1000);
    });
  };

  const updateReceptionItems = (items) => {
    const updatedItems = items.map(item => {
      const product = products.find(p => 
        p.reference === item.reference || 
        p.name.toLowerCase().includes(item.product_name.toLowerCase())
      );
      
      return {
        id: item.id || Date.now() + Math.random(),
        product_id: product?.id,
        product_name: item.product_name,
        product_reference: item.reference,
        quantity_ordered: item.quantity || 0,
        received_quantity: item.quantity || 0,
        unit_price: item.unit_price,
        total_price: item.quantity * item.unit_price,
        stock_before: product ? (product.stock_ville_avray + product.stock_garches) : 0,
        stock_after: product ? (product.stock_ville_avray + product.stock_garches + item.quantity) : 0,
      };
    });

    setReceptionData({
      ...receptionData,
      items: updatedItems,
    });

    // Calculer les changements de stock
    const changes = updatedItems.map(item => ({
      product_name: item.product_name,
      reference: item.product_reference,
      quantity_change: item.received_quantity,
      stock_before: item.stock_before,
      stock_after: item.stock_after,
    }));

    setStockChanges(changes);
  };

  const resetForm = () => {
    setReceptionData({
      order_id: '',
      items: [],
      notes: '',
      document_type: 'delivery_note',
      document_file: null,
    });
    setSelectedOrder(null);
  };

  const openReceptionModal = (order) => {
    setSelectedOrder(order);
    setReceptionData({
      ...receptionData,
      order_id: order.id,
      items: order.items?.map(item => ({
        ...item,
        received_quantity: 0,
        stock_before: 0, // À calculer avec le produit
        stock_after: 0,
      })) || [],
    });
    setShowModal(true);
  };

  const showStockChanges = () => {
    const changesMessage = stockChanges.map(change => 
      `${change.product_name}: +${change.quantity_change} (${change.stock_before} → ${change.stock_after})`
    ).join('\n');
    
    toast.success(`Stock mis à jour:\n${changesMessage}`, {
      duration: 5000,
    });
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = order.purchase_order_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.supplier?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStore = filterStore === 'all' || order.store === filterStore;
    const canReceive = ['sent', 'confirmed', 'partial'].includes(order.status);
    
    return matchesSearch && matchesStore && canReceive;
  });

  if (loading) {
    return <LoadingSpinner size="lg" text="Chargement des réceptions..." />;
  }

  if (error) {
    return <ErrorMessage message={error} onRetry={loadData} />;
  }

  return (
    <div className="p-6">
      {/* En-tête */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Réception de Commandes</h1>
          <p className="text-gray-600 mt-1">Réceptionnez vos commandes et mettez à jour les stocks</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center gap-2"
        >
          <TruckIcon className="w-5 h-5" />
          Nouvelle Réception
        </button>
      </div>

      {/* Filtres et recherche */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-64">
            <div className="relative">
              <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher une commande..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
          </div>
          <select
            value={filterStore}
            onChange={(e) => setFilterStore(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          >
            <option value="all">Tous les magasins</option>
            <option value="ville_avray">Ville d'Avray</option>
            <option value="garches">Garches</option>
          </select>
        </div>
      </div>

      {/* Liste des commandes à recevoir */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Commande
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Fournisseur
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date livraison
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Articles
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Statut
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredOrders.map((order) => (
              <tr key={order.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div>
                    <div className="text-sm font-medium text-gray-900">{order.purchase_order_number}</div>
                    <div className="text-sm text-gray-500">{order.store === 'ville_avray' ? 'Ville d\'Avray' : 'Garches'}</div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{order.supplier?.name}</div>
                  <div className="text-sm text-gray-500">{order.items?.length || 0} articles</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(order.expected_delivery_date).toLocaleDateString('fr-FR')}
                  {order.actual_delivery_date && (
                    <div className="text-xs text-green-600">
                      Reçu: {new Date(order.actual_delivery_date).toLocaleDateString('fr-FR')}
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {order.items?.reduce((sum, item) => sum + (item.quantity_received || 0), 0) || 0} / {order.items?.reduce((sum, item) => sum + (item.quantity_ordered || item.quantity), 0) || 0}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    order.status === 'sent' ? 'bg-blue-100 text-blue-800' :
                    order.status === 'confirmed' ? 'bg-indigo-100 text-indigo-800' :
                    order.status === 'partial' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {order.status === 'sent' ? 'Envoyé' :
                     order.status === 'confirmed' ? 'Confirmé' :
                     order.status === 'partial' ? 'Partiellement reçu' : order.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <button
                    onClick={() => openReceptionModal(order)}
                    className="text-green-600 hover:text-green-900 mr-3"
                    title="Réceptionner"
                  >
                    <TruckIcon className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => {
                      setSelectedOrder(order);
                      setShowDetailModal(true);
                    }}
                    className="text-blue-600 hover:text-blue-900"
                    title="Voir détails"
                  >
                    <EyeIcon className="w-5 h-5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal réception */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-6xl shadow-lg rounded-md bg-white">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              Réception de Commande {selectedOrder?.purchase_order_number}
            </h3>
            
            {/* Import de document */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <h4 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                <CloudArrowUpIcon className="w-5 h-5" />
                Import de document (Facture ou Bon de livraison)
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-blue-700 mb-2">Type de document</label>
                  <select
                    value={receptionData.document_type}
                    onChange={(e) => setReceptionData({...receptionData, document_type: e.target.value})}
                    className="w-full border border-blue-300 rounded-md px-3 py-2 bg-white"
                  >
                    <option value="delivery_note">Bon de livraison</option>
                    <option value="invoice">Facture</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-blue-700 mb-2">Fichier (PDF/Excel)</label>
                  <input
                    type="file"
                    accept=".pdf,.xlsx,.xls"
                    onChange={handleFileUpload}
                    disabled={uploading}
                    className="w-full border border-blue-300 rounded-md px-3 py-2 bg-white"
                  />
                </div>
              </div>
              <p className="text-sm text-blue-600 mt-2">
                L'import automatique remplira les quantités reçues depuis le document
              </p>
            </div>

            <form onSubmit={handleReception} className="space-y-6">
              {/* Articles à recevoir */}
              <div>
                <h4 className="text-md font-semibold text-gray-900 mb-3">Articles à réceptionner</h4>
                <div className="border rounded-lg p-4 bg-gray-50">
                  {receptionData.items.length > 0 ? (
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Produit</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Référence</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Commandé</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Reçu</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">À recevoir</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Stock avant</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Stock après</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {receptionData.items.map((item, index) => (
                          <tr key={item.id}>
                            <td className="px-4 py-2 text-sm text-gray-900">{item.product_name}</td>
                            <td className="px-4 py-2 text-sm text-gray-500">{item.product_reference}</td>
                            <td className="px-4 py-2 text-sm text-gray-900">{item.quantity_ordered || item.quantity}</td>
                            <td className="px-4 py-2 text-sm text-gray-500">{item.quantity_received || 0}</td>
                            <td className="px-4 py-2">
                              <input
                                type="number"
                                min="0"
                                max={item.quantity_ordered || item.quantity}
                                value={item.received_quantity}
                                onChange={(e) => {
                                  const newQuantity = parseInt(e.target.value) || 0;
                                  const updatedItems = [...receptionData.items];
                                  updatedItems[index] = {
                                    ...item,
                                    received_quantity: newQuantity,
                                    stock_after: item.stock_before + newQuantity,
                                  };
                                  setReceptionData({...receptionData, items: updatedItems});
                                }}
                                className="w-20 border border-gray-300 rounded px-2 py-1"
                              />
                            </td>
                            <td className="px-4 py-2 text-sm text-gray-500">{item.stock_before}</td>
                            <td className="px-4 py-2 text-sm font-medium text-green-600">{item.stock_after}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <p className="text-gray-500 text-center py-4">
                      Aucun article à réceptionner. Importez un document ou sélectionnez une commande.
                    </p>
                  )}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700">Notes de réception</label>
                <textarea
                  value={receptionData.notes}
                  onChange={(e) => setReceptionData({...receptionData, notes: e.target.value})}
                  rows={3}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  placeholder="Notes sur la réception, articles manquants, etc."
                />
              </div>

              {/* Résumé des changements de stock */}
              {stockChanges.length > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h4 className="font-semibold text-green-900 mb-2 flex items-center gap-2">
                    <ArrowPathIcon className="w-5 h-5" />
                    Changements de stock prévus
                  </h4>
                  <div className="space-y-1">
                    {stockChanges.map((change, index) => (
                      <div key={index} className="text-sm text-green-700">
                        <span className="font-medium">{change.product_name}</span>: 
                        +{change.quantity_change} unités 
                        ({change.stock_before} → {change.stock_after})
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                  disabled={receptionData.items.length === 0}
                >
                  Valider la réception
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal détails */}
      {showDetailModal && selectedOrder && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-900">Détails de la commande {selectedOrder.purchase_order_number}</h3>
              <button
                onClick={() => setShowDetailModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <h4 className="font-semibold text-gray-900">Informations générales</h4>
                  <p><strong>Fournisseur:</strong> {selectedOrder.supplier?.name}</p>
                  <p><strong>Magasin:</strong> {selectedOrder.store === 'ville_avray' ? 'Ville d\'Avray' : 'Garches'}</p>
                  <p><strong>Date commande:</strong> {new Date(selectedOrder.order_date).toLocaleDateString('fr-FR')}</p>
                  <p><strong>Date livraison prévue:</strong> {new Date(selectedOrder.expected_delivery_date).toLocaleDateString('fr-FR')}</p>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">Statut de réception</h4>
                  <p><strong>Statut:</strong> {selectedOrder.status}</p>
                  <p><strong>Total articles:</strong> {selectedOrder.items?.length || 0}</p>
                  <p><strong>Total reçu:</strong> {selectedOrder.items?.reduce((sum, item) => sum + (item.quantity_received || 0), 0) || 0}</p>
                  <p><strong>Reste à recevoir:</strong> {selectedOrder.items?.reduce((sum, item) => sum + ((item.quantity_ordered || item.quantity) - (item.quantity_received || 0)), 0) || 0}</p>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">Actions</h4>
                  <div className="space-y-2 mt-2">
                    {['sent', 'confirmed', 'partial'].includes(selectedOrder.status) && (
                      <button
                        onClick={() => {
                          setShowDetailModal(false);
                          openReceptionModal(selectedOrder);
                        }}
                        className="w-full px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center justify-center gap-2"
                      >
                        <TruckIcon className="w-4 h-4" />
                        Réceptionner
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {selectedOrder.items && selectedOrder.items.length > 0 && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">Articles de la commande</h4>
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Produit</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Commandé</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Reçu</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Reste</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Statut</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {selectedOrder.items.map((item) => {
                        const ordered = item.quantity_ordered || item.quantity;
                        const received = item.quantity_received || 0;
                        const remaining = ordered - received;
                        const isComplete = remaining === 0;
                        
                        return (
                          <tr key={item.id}>
                            <td className="px-4 py-2 text-sm text-gray-900">{item.product_name}</td>
                            <td className="px-4 py-2 text-sm text-gray-900">{ordered}</td>
                            <td className="px-4 py-2 text-sm text-gray-900">{received}</td>
                            <td className="px-4 py-2 text-sm text-gray-900">{remaining}</td>
                            <td className="px-4 py-2">
                              <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                isComplete ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                              }`}>
                                {isComplete ? 'Complet' : 'En attente'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
