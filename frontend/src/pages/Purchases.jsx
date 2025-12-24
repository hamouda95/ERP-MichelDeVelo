import React, { useState, useEffect } from "react";
import {
  PlusIcon,
  MagnifyingGlassIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/outline";
import api from "../services/api";

export default function Purchases() {
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterStore, setFilterStore] = useState("all");
  const [notification, setNotification] = useState({
    show: false,
    message: "",
    type: "success",
  });

  const [orderFormData, setOrderFormData] = useState({
    supplier: "",
    store: "ville_avray",
    expected_delivery_date: "",
    status: "draft",
    items: [],
    notes: "",
    shipping_cost: 0,
  });

  const [newItem, setNewItem] = useState({
    product: "",
    quantity: 1,
    unit_price: 0,
  });

  const orderStatusConfig = {
    draft: { label: "Brouillon", color: "bg-gray-100 text-gray-800" },
    sent: { label: "Envoyé", color: "bg-blue-100 text-blue-800" },
    confirmed: { label: "Confirmé", color: "bg-indigo-100 text-indigo-800" },
    partial: { label: "Partiellement reçu", color: "bg-yellow-100 text-yellow-800" },
    received: { label: "Reçu", color: "bg-green-100 text-green-800" },
    cancelled: { label: "Annulé", color: "bg-red-100 text-red-800" },
  };

  const storeLabels = {
    ville_avray: "Ville d'Avray",
    garches: "Garches",
  };

  // Fetch data
  useEffect(() => {
    fetchPurchaseOrders();
    fetchSuppliers();
    fetchProducts();
  }, []);

  const fetchPurchaseOrders = async () => {
    try {
      const res = await api.get("/suppliers/purchase-orders/");
      const data = res.data;
      setPurchaseOrders(Array.isArray(data) ? data : data.results || []);
    } catch (err) {
      showNotification("Erreur lors du chargement des commandes", "error");
    }
  };

  const fetchSuppliers = async () => {
    try {
      const res = await api.get("/suppliers/suppliers/");
      const data = res.data;
      setSuppliers(Array.isArray(data) ? data : data.results || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await api.get("/products/");
      const data = res.data;
      setProducts(Array.isArray(data) ? data : data.results || []);
    } catch (err) {
      console.error(err);
    }
  };

  const showNotification = (message, type = "success") => {
    setNotification({ show: true, message, type });
    setTimeout(
      () => setNotification({ show: false, message: "", type: "success" }),
      3000
    );
  };

  // Modals
  const openOrderModal = (order = null) => {
    if (order) {
      setSelectedOrder(order);
      setOrderFormData({
        supplier: order.supplier?.id || order.supplier,
        store: order.store,
        expected_delivery_date: order.expected_delivery_date || "",
        status: order.status,
        items:
          order.items?.map((i) => ({
            product: i.product,
            product_name: i.product_name,
            product_reference: i.product_reference,
            quantity: i.quantity_ordered,
            unit_price: parseFloat(i.unit_price_ht),
            tva_rate: parseFloat(i.tva_rate || 20),
          })) || [],
        notes: order.notes || "",
        shipping_cost: parseFloat(order.shipping_cost || 0),
      });
    } else {
      setSelectedOrder(null);
      setOrderFormData({
        supplier: "",
        store: "ville_avray",
        expected_delivery_date: "",
        status: "draft",
        items: [],
        notes: "",
        shipping_cost: 0,
      });
    }
    setShowOrderModal(true);
  };

  const handleSubmitOrder = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        supplier: orderFormData.supplier,
        store: orderFormData.store,
        expected_delivery_date: orderFormData.expected_delivery_date,
        status: orderFormData.status,
        notes: orderFormData.notes,
        shipping_cost: parseFloat(orderFormData.shipping_cost || 0),
        items: orderFormData.items.map((i) => ({
          product: i.product,
          quantity_ordered: i.quantity,
          unit_price_ht: parseFloat(i.unit_price),
          tva_rate: parseFloat(i.tva_rate || 20),
        })),
      };

      if (selectedOrder) {
        await api.put(`/suppliers/purchase-orders/${selectedOrder.id}/`, payload);
        showNotification("Commande mise à jour avec succès");
      } else {
        await api.post("/suppliers/purchase-orders/", payload);
        showNotification("Commande créée avec succès");
      }
      fetchPurchaseOrders();
      setShowOrderModal(false);
    } catch (err) {
      console.error(err);
      showNotification("Erreur lors de la sauvegarde", "error");
    }
  };

  const handleDeleteOrder = async (id) => {
    if (window.confirm("Supprimer cette commande ?")) {
      try {
        await api.delete(`/suppliers/purchase-orders/${id}/`);
        showNotification("Commande supprimée");
        fetchPurchaseOrders();
      } catch {
        showNotification("Erreur lors de la suppression", "error");
      }
    }
  };

  const handleMarkAsReceived = async (id) => {
    if (window.confirm("Marquer cette commande comme reçue ?")) {
      try {
        await api.post(`/suppliers/purchase-orders/${id}/receive_items/`, { items: [] });
        showNotification("Commande marquée comme reçue");
        fetchPurchaseOrders();
      } catch {
        showNotification("Erreur lors de la réception", "error");
      }
    }
  };

  const handleAddItem = () => {
    if (!newItem.product) return showNotification("Choisissez un produit", "error");
    const product = products.find((p) => p.id === parseInt(newItem.product));
    setOrderFormData({
      ...orderFormData,
      items: [
        ...orderFormData.items,
        {
          product: product.id,
          product_name: product.name,
          product_reference: product.reference,
          quantity: parseInt(newItem.quantity),
          unit_price: parseFloat(newItem.unit_price),
          tva_rate: 20,
        },
      ],
    });
    setNewItem({ product: "", quantity: 1, unit_price: 0 });
  };

  const handleRemoveItem = (index) => {
    setOrderFormData({
      ...orderFormData,
      items: orderFormData.items.filter((_, i) => i !== index),
    });
  };

  const calculateOrderTotal = () => {
    const itemsTotal = orderFormData.items.reduce(
      (sum, i) => sum + i.quantity * i.unit_price,
      0
    );
    return itemsTotal + parseFloat(orderFormData.shipping_cost || 0);
  };

  const filteredOrders = purchaseOrders.filter((order) => {
    const matchesSearch =
      order.purchase_order_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.supplier_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === "all" || order.status === filterStatus;
    const matchesStore = filterStore === "all" || order.store === filterStore;
    return matchesSearch && matchesStatus && matchesStore;
  });

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Commandes d'achat</h1>
        <p className="text-gray-600">Gérez vos bons de commande fournisseurs</p>
      </div>

      {/* Filters */}
      <div className="flex gap-4 mb-6">
        <div className="flex-1 relative">
          <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher une commande..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg"
        >
          <option value="all">Tous les statuts</option>
          {Object.entries(orderStatusConfig).map(([key, c]) => (
            <option key={key} value={key}>
              {c.label}
            </option>
          ))}
        </select>
        <select
          value={filterStore}
          onChange={(e) => setFilterStore(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg"
        >
          <option value="all">Tous les magasins</option>
          {Object.entries(storeLabels).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
        <button
          onClick={() => openOrderModal()}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <PlusIcon className="w-5 h-5" />
          Nouvelle commande
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Référence</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fournisseur</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Magasin</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Livraison</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Montant TTC</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Statut</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredOrders.map((order) => (
              <tr key={order.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 text-sm font-medium text-gray-900">
                  {order.purchase_order_number || order.reference_number}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">{order.supplier_name}</td>
                <td className="px-6 py-4 text-sm text-gray-500">{storeLabels[order.store]}</td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {new Date(order.created_at).toLocaleDateString("fr-FR")}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {order.expected_delivery_date
                    ? new Date(order.expected_delivery_date).toLocaleDateString("fr-FR")
                    : "-"}
                </td>
                <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                  {parseFloat(order.total_ttc || 0).toFixed(2)}€
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`px-2 py-1 text-xs font-medium rounded-full ${
                      orderStatusConfig[order.status]?.color || "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {orderStatusConfig[order.status]?.label || order.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-right flex justify-end gap-2">
                  <button
                    onClick={() => {
                      setSelectedOrder(order);
                      setShowDetailModal(true);
                    }}
                    className="text-blue-600 hover:text-blue-900"
                  >
                    <EyeIcon className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => openOrderModal(order)}
                    className="text-indigo-600 hover:text-indigo-900"
                  >
                    <PencilIcon className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleDeleteOrder(order.id)}
                    className="text-red-600 hover:text-red-900"
                  >
                    <TrashIcon className="w-5 h-5" />
                  </button>
                  {order.status !== "received" && (
                    <button
                      onClick={() => handleMarkAsReceived(order.id)}
                      className="text-green-600 hover:text-green-800"
                    >
                      <CheckCircleIcon className="w-5 h-5" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Order Modal */}
      {showOrderModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-6">
                {selectedOrder ? 'Modifier la commande' : 'Nouvelle commande'}
              </h2>
              <form onSubmit={handleSubmitOrder}>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Fournisseur *</label>
                    <select
                      required
                      value={orderFormData.supplier}
                      onChange={(e) => setOrderFormData({ ...orderFormData, supplier: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Sélectionner un fournisseur</option>
                      {suppliers.map((supplier) => (
                        <option key={supplier.id} value={supplier.id}>
                          {supplier.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Magasin *</label>
                    <select
                      required
                      value={orderFormData.store}
                      onChange={(e) => setOrderFormData({ ...orderFormData, store: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      {Object.entries(storeLabels).map(([key, label]) => (
                        <option key={key} value={key}>{label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Date de livraison prévue *
                    </label>
                    <input
                      type="date"
                      required
                      value={orderFormData.expected_delivery_date}
                      onChange={(e) => setOrderFormData({ ...orderFormData, expected_delivery_date: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Frais de port (€)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={orderFormData.shipping_cost}
                      onChange={(e) => setOrderFormData({ ...orderFormData, shipping_cost: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Articles */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Articles</label>
                  
                  <div className="bg-gray-50 p-4 rounded-lg mb-4">
                    <div className="grid grid-cols-4 gap-3">
                      <select
                        value={newItem.product}
                        onChange={(e) => {
                          const product = products.find(p => p.id === parseInt(e.target.value));
                          setNewItem({
                            ...newItem,
                            product: e.target.value,
                            unit_price: product?.purchase_price || 0
                          });
                        }}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Sélectionner un produit</option>
                        {products.map((product) => (
                          <option key={product.id} value={product.id}>
                            {product.name} ({product.reference})
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        min="1"
                        value={newItem.quantity}
                        onChange={(e) => setNewItem({ ...newItem, quantity: e.target.value })}
                        placeholder="Quantité"
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                      <input
                        type="number"
                        step="0.01"
                        value={newItem.unit_price}
                        onChange={(e) => setNewItem({ ...newItem, unit_price: e.target.value })}
                        placeholder="Prix unitaire"
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                      <button
                        type="button"
                        onClick={handleAddItem}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                      >
                        Ajouter
                      </button>
                    </div>
                  </div>

                  {orderFormData.items.length > 0 && (
                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Produit</th>
                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Quantité</th>
                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Prix unitaire</th>
                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Total</th>
                            <th className="px-4 py-2"></th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {orderFormData.items.map((item, index) => {
                            const quantity = item.quantity || item.quantity_ordered;
                            const price = item.unit_price || item.unit_price_ht;
                            return (
                              <tr key={index}>
                                <td className="px-4 py-2 text-sm">{item.product_name}</td>
                                <td className="px-4 py-2 text-sm text-right">{quantity}</td>
                                <td className="px-4 py-2 text-sm text-right">{parseFloat(price).toFixed(2)}€</td>
                                <td className="px-4 py-2 text-sm text-right font-semibold">
                                  {(quantity * price).toFixed(2)}€
                                </td>
                                <td className="px-4 py-2 text-right">
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveItem(index)}
                                    className="text-red-600 hover:text-red-900"
                                  >
                                    <TrashIcon className="w-4 h-4" />
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                          <tr className="bg-gray-50">
                            <td colSpan="3" className="px-4 py-2 text-right text-sm">Sous-total</td>
                            <td className="px-4 py-2 text-right text-sm font-semibold">
                              {orderFormData.items.reduce((sum, item) => {
                                const quantity = item.quantity || item.quantity_ordered;
                                const price = item.unit_price || item.unit_price_ht;
                                return sum + (quantity * price);
                              }, 0).toFixed(2)}€
                            </td>
                            <td></td>
                          </tr>
                          <tr className="bg-gray-50">
                            <td colSpan="3" className="px-4 py-2 text-right text-sm">Frais de port</td>
                            <td className="px-4 py-2 text-right text-sm">
                              {parseFloat(orderFormData.shipping_cost || 0).toFixed(2)}€
                            </td>
                            <td></td>
                          </tr>
                          <tr className="bg-gray-50 font-semibold">
                            <td colSpan="3" className="px-4 py-2 text-right">Total</td>
                            <td className="px-4 py-2 text-right">{calculateOrderTotal().toFixed(2)}€</td>
                            <td></td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                  <textarea
                    value={orderFormData.notes}
                    onChange={(e) => setOrderFormData({ ...orderFormData, notes: e.target.value })}
                    rows="3"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="flex justify-end gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowOrderModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    {selectedOrder ? 'Mettre à jour' : 'Créer'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-6">Détails de la commande</h2>
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-gray-500">Référence</p>
                  <p className="text-lg font-semibold">
                    {selectedOrder.purchase_order_number || selectedOrder.reference_number}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Fournisseur</p>
                    <p>{selectedOrder.supplier?.name || selectedOrder.supplier_name}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Magasin</p>
                    <p>{storeLabels[selectedOrder.store]}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Date de commande</p>
                    <p>{new Date(selectedOrder.created_at).toLocaleDateString('fr-FR')}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Livraison prévue</p>
                    <p>
                      {selectedOrder.expected_delivery_date 
                        ? new Date(selectedOrder.expected_delivery_date).toLocaleDateString('fr-FR')
                        : '-'
                      }
                    </p>
                  </div>
                </div>
                {selectedOrder.items && selectedOrder.items.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-2">Articles</p>
                    <table className="min-w-full divide-y divide-gray-200 border border-gray-200 rounded-lg">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Produit</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Quantité</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Prix unitaire</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Total</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {selectedOrder.items.map((item, index) => {
                          const quantity = item.quantity_ordered || item.quantity;
                          const price = item.unit_price_ht || item.unit_price;
                          return (
                            <tr key={index}>
                              <td className="px-4 py-2 text-sm">{item.product_name}</td>
                              <td className="px-4 py-2 text-sm text-right">{quantity}</td>
                              <td className="px-4 py-2 text-sm text-right">{parseFloat(price).toFixed(2)}€</td>
                              <td className="px-4 py-2 text-sm text-right">
                                {(quantity * price).toFixed(2)}€
                              </td>
                            </tr>
                          );
                        })}
                        <tr className="bg-gray-50">
                          <td colSpan="3" className="px-4 py-2 text-right text-sm">Frais de port</td>
                          <td className="px-4 py-2 text-right text-sm">
                            {parseFloat(selectedOrder.shipping_cost || 0).toFixed(2)}€
                          </td>
                        </tr>
                        <tr className="bg-gray-50 font-semibold">
                          <td colSpan="3" className="px-4 py-2 text-right">Total</td>
                          <td className="px-4 py-2 text-right">
                            {parseFloat(selectedOrder.total_ttc || selectedOrder.total_amount || 0).toFixed(2)}€
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}
                {selectedOrder.notes && (
                  <div>
                    <p className="text-sm font-medium text-gray-500">Notes</p>
                    <p>{selectedOrder.notes}</p>
                  </div>
                )}
              </div>
              <div className="flex justify-end mt-6">
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Notifications */}
      {notification.show && (
        <div className="fixed bottom-4 right-4 z-50">
          <div
            className={`px-6 py-3 rounded-lg shadow-lg ${
              notification.type === "success" ? "bg-green-500" : "bg-red-500"
            } text-white`}
          >
            {notification.message}
          </div>
        </div>
      )}
    </div>
  );
}

