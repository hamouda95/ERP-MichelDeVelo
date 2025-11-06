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
  // Récupérer les données du dashboard
  getDashboard: () => api.get('/analytics/dashboard/'),
  
  // Récupérer les statistiques de ventes
  getSalesStats: (params) => api.get('/analytics/sales/', { params }),
  
  // Récupérer les statistiques de produits
  getProductStats: () => api.get('/analytics/products/'),
  
  // Récupérer les statistiques de clients
  getClientStats: () => api.get('/analytics/clients/'),
};

export default api;