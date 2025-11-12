import axios from 'axios';
import { useAuthStore } from '../store';
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Intercepteur pour ajouter le token JWT à chaque requête
api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Intercepteur pour gérer les erreurs d'authentification
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Token expiré ou invalide, déconnecter l'utilisateur
      useAuthStore.getState().logout();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ===== AUTH API =====
export const authAPI = {
  login: (credentials) => api.post('/token/', credentials),
  register: (userData) => api.post('/auth/register/', userData),
  getCurrentUser: () => api.get('/auth/me/'),
  requestPasswordReset: (email) => api.post('/auth/password-reset/', { email }),
  confirmPasswordReset: (data) => api.post('/auth/password-reset-confirm/', data),
};

// ===== PRODUCTS API =====
export const productsAPI = {
  // Récupérer tous les produits avec filtres optionnels
  getAll: (params) => api.get('/products/', { params }),
  
  // Récupérer un produit par son ID
  getById: (id) => api.get(`/products/${id}/`),
  
  // Créer un nouveau produit
  create: (data) => api.post('/products/', data),
  
  // Mettre à jour un produit
  update: (id, data) => api.patch(`/products/${id}/`, data),
  
  // Supprimer un produit
  delete: (id) => api.delete(`/products/${id}/`),
  
  // ✨ CORRIGÉ : Rechercher un produit par code-barre
  // L'URL correcte est : /products/barcode/?code=XXXXX
  searchByBarcode: (barcode) => api.get(`/products/barcode/`, { 
    params: { code: barcode } 
  }),
};


// ===== CATEGORIES API =====
export const categoriesAPI = {
  // Récupérer toutes les catégories avec filtres optionnels
  getAll: (params) => api.get('/categories/', { params }),

  // Récupérer une catégorie par son ID
  getById: (id) => api.get(`/categories/${id}/`),

  // Créer une nouvelle catégorie
  create: (data) => api.post('/categories/', data),

  // Mettre à jour une catégorie
  update: (id, data) => api.patch(`/categories/${id}/`, data),

  // Supprimer une catégorie
  delete: (id) => api.delete(`/categories/${id}/`),
};


// ===== CLIENTS API =====
export const clientsAPI = {
  // Récupérer tous les clients avec filtres optionnels
  getAll: (params) => api.get('/clients/', { params }),
  
  // Récupérer un client par son ID
  getById: (id) => api.get(`/clients/${id}/`),
  
  // Créer un nouveau client
  create: (data) => api.post('/clients/', data),
  
  // Mettre à jour un client
  update: (id, data) => api.patch(`/clients/${id}/`, data),
  
  // Supprimer un client
  delete: (id) => api.delete(`/clients/${id}/`),
  
  // Rechercher un client par nom, email ou téléphone
  search: (query) => api.get(`/clients/search/`, { params: { q: query } }),
};

// ===== ORDERS API =====
export const ordersAPI = {
  // Récupérer toutes les commandes avec filtres optionnels
  getAll: (params) => api.get('/orders/', { params }),
  
  // Récupérer une commande par son ID
  getById: (id) => api.get(`/orders/${id}/`),
  
  // Créer une nouvelle commande
  create: (data) => api.post('/orders/', data),
  
  // Mettre à jour une commande
  update: (id, data) => api.patch(`/orders/${id}/`, data),
  
  // Supprimer une commande
  delete: (id) => api.delete(`/orders/${id}/`),
};

// ===== INVOICES API =====
export const invoicesAPI = {
  // Récupérer toutes les factures avec filtres optionnels
  getAll: (params) => api.get('/invoices/', { params }),
  
  // Récupérer une facture par son ID
  getById: (id) => api.get(`/invoices/${id}/`),
  
  // Générer le PDF d'une facture
  generatePDF: (id) => api.post(`/invoices/${id}/generate-pdf/`),
  
  // Télécharger le PDF d'une facture
  downloadPDF: (id) => api.get(`/invoices/${id}/download/`, { 
    responseType: 'blob' 
  }),
};

// ===== ANALYTICS API =====
export const analyticsAPI = {
  getDashboard: () => api.get('/analytics/dashboard/'),
  getSalesStats: (params) => api.get('/analytics/sales/', { params }),
  getProductStats: () => api.get('/analytics/products/'),
  getClientStats: () => api.get('/analytics/clients/'),
};

// ===== REPAIRS API =====
export const repairsAPI = {
  getAll: (params) => api.get('/repairs/', { params }),
  getById: (id) => api.get(`/repairs/${id}/`),
  create: (data) => api.post('/repairs/', data),
  update: (id, data) => api.put(`/repairs/${id}/`, data),
  patch: (id, data) => api.patch(`/repairs/${id}/`, data),
  delete: (id) => api.delete(`/repairs/${id}/`),
  updateStatus: (id, status) => api.post(`/repairs/${id}/update_status/`, { status }),
  addItem: (id, itemData) => api.post(`/repairs/${id}/add_item/`, itemData),
  getStatistics: () => api.get('/repairs/statistics/'),
  print: (id) => api.get(`/repairs/${id}/print/`, { responseType: 'blob' }),
};

// ===== QUOTES API =====
export const quotesAPI = {
  getAll: (params) => api.get('/quotes/', { params }),
  getById: (id) => api.get(`/quotes/${id}/`),
  create: (data) => api.post('/quotes/', data),
  update: (id, data) => api.put(`/quotes/${id}/`, data),
  patch: (id, data) => api.patch(`/quotes/${id}/`, data),
  delete: (id) => api.delete(`/quotes/${id}/`),
  convertToOrder: (id, paymentData) => api.post(`/quotes/${id}/convert_to_order/`, paymentData),
  updateStatus: (id, status) => api.post(`/quotes/${id}/update_status/`, { status }),
  generatePDF: (id) => api.post(`/quotes/${id}/generate_pdf/`),
  print: (id) => api.get(`/quotes/${id}/print/`, { responseType: 'blob' }),
};

// ===== SUPPLIERS API =====
export const suppliersAPI = {
  getAll: (params) => api.get('/suppliers/suppliers/', { params }),
  getById: (id) => api.get(`/suppliers/suppliers/${id}/`),
  create: (data) => api.post('/suppliers/suppliers/', data),
  update: (id, data) => api.put(`/suppliers/suppliers/${id}/`, data),
  patch: (id, data) => api.patch(`/suppliers/suppliers/${id}/`, data),
  delete: (id) => api.delete(`/suppliers/suppliers/${id}/`),
  getStatistics: (id) => api.get(`/suppliers/suppliers/${id}/statistics/`),
};

// ===== PURCHASE ORDERS API =====
export const purchaseOrdersAPI = {
  getAll: (params) => api.get('/suppliers/purchase-orders/', { params }),
  getById: (id) => api.get(`/suppliers/purchase-orders/${id}/`),
  create: (data) => api.post('/suppliers/purchase-orders/', data),
  update: (id, data) => api.put(`/suppliers/purchase-orders/${id}/`, data),
  patch: (id, data) => api.patch(`/suppliers/purchase-orders/${id}/`, data),
  delete: (id) => api.delete(`/suppliers/purchase-orders/${id}/`),
  receiveItems: (id, itemsData) => api.post(`/suppliers/purchase-orders/${id}/receive_items/`, itemsData),
  updateStatus: (id, status) => api.post(`/suppliers/purchase-orders/${id}/update_status/`, { status }),
  print: (id) => api.get(`/suppliers/purchase-orders/${id}/print/`, { responseType: 'blob' }),
};

// ===== PURCHASE ORDER ITEMS API =====
export const purchaseOrderItemsAPI = {
  getAll: (purchaseOrderId) => api.get('/suppliers/purchase-order-items/', { params: { purchase_order: purchaseOrderId } }),
  getById: (id) => api.get(`/suppliers/purchase-order-items/${id}/`),
  create: (data) => api.post('/suppliers/purchase-order-items/', data),
  update: (id, data) => api.put(`/suppliers/purchase-order-items/${id}/`, data),
  delete: (id) => api.delete(`/suppliers/purchase-order-items/${id}/`),
};

// ===== FINANCE API =====
export const financeAPI = {
  getExpenses: (params) => api.get('/finance/expenses/', { params }),
  createExpense: (data) => api.post('/finance/expenses/', data),
  updateExpense: (id, data) => api.put(`/finance/expenses/${id}/`, data),
  deleteExpense: (id) => api.delete(`/finance/expenses/${id}/`),
  getProfitLoss: (params) => api.get('/finance/profit-loss/', { params }),
  exportProfitLoss: (params) => api.get('/finance/profit-loss/export/', { params, responseType: 'blob' }),
};

// ===== APPOINTMENTS API =====
export const appointmentsAPI = {
  getFromWix: () => {
    console.warn('Wix API non configurée. Veuillez configurer les clés API dans le backend.');
    return Promise.resolve({ data: [] });
  },
  create: (data) => api.post('/appointments/', data),
  getAll: (params) => api.get('/appointments/', { params }),
  update: (id, data) => api.put(`/appointments/${id}/`, data),
  delete: (id) => api.delete(`/appointments/${id}/`),
};

// ===== UTILITIES =====
export const downloadFile = (blob, filename) => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

export const formatPrice = (amount) => {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount);
};

export const formatDate = (date) => {
  return new Intl.DateTimeFormat('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date(date));
};

export const formatDateTime = (date) => {
  return new Intl.DateTimeFormat('fr-FR', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(date));
};

export default api;
