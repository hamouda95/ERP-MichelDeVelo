/**
 * ============================================================================ 
 * CONSOLIDATED API SERVICES - ERP Michel De Vélo
 * ============================================================================ 
 * 
 * Unified API service combining all modules:
 * - Authentication & Users
 * - Products & Categories
 * - Clients & Orders
 * - Repairs (all variants merged)
 * - Suppliers & Purchases
 * - Finance & Analytics
 * - Appointments & Settings
 * 
 * ============================================================================ 
 */

import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

// Create axios instance with unified configuration
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 second timeout
});

// Enhanced request interceptor with better token handling
api.interceptors.request.use(
  (config) => {
    // Try multiple token storage methods for compatibility
    const authStorage = localStorage.getItem('auth-storage');
    const directToken = localStorage.getItem('token');
    
    let token = null;
    
    if (authStorage) {
      try {
        token = JSON.parse(authStorage)?.state?.token;
      } catch (e) {
        console.warn('Invalid auth-storage format');
      }
    }
    
    if (!token && directToken) {
      token = directToken;
    }
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    return config;
  },
  (error) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Enhanced response interceptor with better error handling
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Clear all auth storage methods
      localStorage.removeItem('auth-storage');
      localStorage.removeItem('token');
      
      // Try to call logout if available
      try {
        const authStorage = localStorage.getItem('auth-storage');
        if (authStorage) {
          const auth = JSON.parse(authStorage);
          if (auth.state?.logout) {
            auth.state.logout();
          }
        }
      } catch (e) {
        console.warn('Logout call failed:', e);
      }
      
      // Redirect to login
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    
    // Log detailed error information
    if (error.response) {
      console.error('API Error:', {
        status: error.response.status,
        data: error.response.data,
        url: error.config?.url,
        method: error.config?.method
      });
    } else if (error.request) {
      console.error('Network Error:', error.request);
    } else {
      console.error('Error:', error.message);
    }
    
    return Promise.reject(error);
  }
);

// ===== AUTHENTICATION API =====
export const authAPI = {
  // Basic auth
  login: (credentials) => api.post('/token/', credentials),
  register: (userData) => api.post('/auth/register/', userData),
  getCurrentUser: () => api.get('/auth/me/'),
  refreshToken: (refresh) => api.post('/token/refresh/', { refresh }),
  
  // Password management
  requestPasswordReset: (email) => api.post('/auth/password-reset/', { email }),
  confirmPasswordReset: (data) => api.post('/auth/password-reset-confirm/', data),
  changePassword: (data) => api.post('/auth/change-password/', data),
  
  // User management
  getAllUsers: (params) => api.get('/auth/users/', { params }),
  getUserById: (id) => api.get(`/auth/users/${id}/`),
  createUser: (data) => api.post('/auth/users/', data),
  updateUser: (id, data) => api.patch(`/auth/users/${id}/`, data),
  deleteUser: (id) => api.delete(`/auth/users/${id}/`),
  updateUserPermissions: (userId, permissions) => api.post(`/auth/users/${userId}/permissions/`, permissions),
  
  // Profile management
  updateProfile: (data) => api.patch('/auth/profile/', data),
  uploadAvatar: (file) => {
    const formData = new FormData();
    formData.append('avatar', file);
    return api.post('/auth/upload-avatar/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  }
};

// ===== PRODUCTS API =====
export const productsAPI = {
  // Basic CRUD
  getAll: (params) => api.get('/products/', { params }),
  getById: (id) => api.get(`/products/${id}/`),
  create: (data) => api.post('/products/', data),
  update: (id, data) => api.patch(`/products/${id}/`, data),
  delete: (id) => api.delete(`/products/${id}/`),
  
  // Search and filters
  searchByBarcode: (barcode) => api.get('/products/barcode/', { 
    params: { code: barcode } 
  }),
  search: (query, params = {}) => api.get('/products/', { 
    params: { search: query, ...params } 
  }),
  
  // Stock management
  updateStock: (id, stockData) => api.post(`/products/${id}/update_stock/`, stockData),
  getLowStock: (params) => api.get('/products/low_stock/', { params }),
  getStockHistory: (id, params) => api.get(`/products/${id}/stock_history/`, { params }),
  
  // Categories
  getCategories: (params) => api.get('/categories/', { params }),
  createCategory: (data) => api.post('/categories/', data),
  updateCategory: (id, data) => api.patch(`/categories/${id}/`, data),
  deleteCategory: (id) => api.delete(`/categories/${id}/`),
  
  // Bulk operations
  bulkUpdate: (updates) => api.post('/products/bulk_update/', { updates }),
  bulkDelete: (ids) => api.post('/products/bulk_delete/', { ids }),
  importCSV: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/products/import_csv/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  exportCSV: (params) => api.get('/products/export_csv/', { 
    params, 
    responseType: 'blob' 
  })
};

// ===== CLIENTS API =====
export const clientsAPI = {
  // Basic CRUD
  getAll: (params) => api.get('/clients/', { params }),
  getById: (id) => api.get(`/clients/${id}/`),
  create: (data) => api.post('/clients/', data),
  update: (id, data) => api.patch(`/clients/${id}/`, data),
  delete: (id) => api.delete(`/clients/${id}/`),
  
  // Search and filters
  search: (query, params = {}) => api.get('/clients/search/', { 
    params: { q: query, ...params } 
  }),
  
  // Client history
  getOrders: (id, params) => api.get(`/clients/${id}/orders/`, { params }),
  getRepairs: (id, params) => api.get(`/clients/${id}/repairs/`, { params }),
  getInvoices: (id, params) => api.get(`/clients/${id}/invoices/`, { params }),
  
  // Advanced features
  getStatistics: (id) => api.get(`/clients/${id}/statistics/`),
  sendEmail: (id, emailData) => api.post(`/clients/${id}/send_email/`, emailData),
  mergeClients: (primaryId, secondaryId) => api.post(`/clients/merge/`, { 
    primary_id: primaryId, 
    secondary_id: secondaryId 
  })
};

// ===== ORDERS API =====
export const ordersAPI = {
  // Basic CRUD
  getAll: (params) => api.get('/orders/', { params }),
  getById: (id) => api.get(`/orders/${id}/`),
  create: (data) => api.post('/orders/', data),
  update: (id, data) => api.patch(`/orders/${id}/`, data),
  delete: (id) => api.delete(`/orders/${id}/`),
  
  // Order management
  updateStatus: (id, status) => api.post(`/orders/${id}/update_status/`, { status }),
  addItem: (id, itemData) => api.post(`/orders/${id}/add_item/`, itemData),
  removeItem: (id, itemId) => api.delete(`/orders/${id}/items/${itemId}/`),
  updateItem: (id, itemId, data) => api.patch(`/orders/${id}/items/${itemId}/`, data),
  
  // Payment processing
  processPayment: (id, paymentData) => api.post(`/orders/${id}/process_payment/`, paymentData),
  refund: (id, refundData) => api.post(`/orders/${id}/refund/`, refundData),
  
  // Documents
  generateInvoice: (id) => api.post(`/orders/${id}/generate_invoice/`),
  downloadInvoice: (id) => api.get(`/orders/${id}/download_invoice/`, { 
    responseType: 'blob' 
  }),
  
  // Analytics
  getStatistics: (params) => api.get('/orders/statistics/', { params }),
  getSalesReport: (params) => api.get('/orders/sales_report/', { 
    params, 
    responseType: 'blob' 
  })
};

// ===== REPAIRS API (Consolidated from all variants) =====
export const repairsAPI = {
  // Basic CRUD
  getAll: (params) => api.get('/repairs/repairs/', { params }),
  getById: (id) => api.get(`/repairs/repairs/${id}/`),
  create: (data) => api.post('/repairs/repairs/', data, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  update: (id, data) => api.patch(`/repairs/repairs/${id}/`, data),
  delete: (id) => api.delete(`/repairs/repairs/${id}/`),
  
  // Kanban-specific methods - CORRIGÉ pour correspondre au modèle backend réel
  getRepairsByStatus: async (filters = {}) => {
    try {
      const response = await api.get('/repairs/repairs/', { params: filters });
      const repairs = response.data.results || response.data;
      
      // S'assurer que repairs est bien un tableau
      const repairsArray = Array.isArray(repairs) ? repairs : [];
      
      // Organize by status for Kanban view - SEULEMENT les vrais statuts du backend
      const organized = {
        pending: [],
        in_progress: [],
        completed: [],
        delivered: []
      };
      
      repairsArray.forEach(repair => {
        if (organized.hasOwnProperty(repair.status)) {
          organized[repair.status].push({
            ...repair,
            // Add photo URLs if available
            photo_1_url: repair.photo_1 ? `${API_URL.replace('/api', '')}${repair.photo_1}` : null,
            photo_2_url: repair.photo_2 ? `${API_URL.replace('/api', '')}${repair.photo_2}` : null,
            photo_3_url: repair.photo_3 ? `${API_URL.replace('/api', '')}${repair.photo_3}` : null,
          });
        } else {
          // Log pour les statuts non reconnus
          console.warn(`Statut non reconnu: ${repair.status} pour réparation ${repair.id}`);
        }
      });
      
      return organized;
    } catch (error) {
      console.error('Error organizing repairs by status:', error);
      throw error;
    }
  },
  
  // Utiliser le vrai endpoint kanban du backend - BEST PRACTICE
  getKanban: (filters) => api.get('/repairs/repairs/kanban/', { params: filters }),
  
  // Status management
  updateStatus: (id, statusData) => api.post(`/repairs/repairs/${id}/update_status/`, statusData),
  bulkUpdateStatus: (repairIds, statusData) => api.post('/repairs/repairs/bulk_update_status/', {
    repair_ids: repairIds,
    ...statusData
  }),
  
  // Repair items/parts
  addItem: (id, itemData) => api.post(`/repairs/repairs/${id}/add_item/`, itemData),
  getItems: (repairId) => api.get('/repairs/repair-items/', { params: { repair: repairId } }),
  updateItem: (id, data) => api.patch(`/repairs/repair-items/${id}/`, data),
  deleteItem: (id) => api.delete(`/repairs/repair-items/${id}/`),
  
  // Enhanced parts management
  markPieceOrdered: (id) => api.post(`/repairs/repair-items/${id}/mark_ordered/`),
  markPieceReceived: (id) => api.post(`/repairs/repair-items/${id}/mark_received/`),
  
  // Timeline management
  getTimeline: (repairId) => api.get(`/repairs/repairs/${repairId}/timeline/`),
  addTimelineEntry: (repairId, timelineData) => api.post(`/repairs/repairs/${repairId}/add_timeline/`, timelineData),
  
  // SMS management
  sendSMS: (id) => api.post(`/repairs/repairs/${id}/send_sms/`),
  
  // Document management
  uploadDocument: (repairId, documentData) => {
    const formData = new FormData();
    Object.keys(documentData).forEach(key => {
      formData.append(key, documentData[key]);
    });
    return api.post(`/repairs/repairs/${repairId}/upload_document/`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  getDocuments: (repairId) => api.get(`/repairs/repairs/${repairId}/documents/`),
  deleteDocument: (repairId, docId) => api.delete(`/repairs/repairs/${repairId}/documents/${docId}/`),
  
  // PDF generation
  generateQuote: (id) => api.get(`/repairs/repairs/${id}/print_quote/`, { 
    responseType: 'blob' 
  }),
  generateInvoice: (id) => api.get(`/repairs/repairs/${id}/print_invoice/`, { 
    responseType: 'blob' 
  }),
  printTicket: (id) => api.get(`/repairs/repairs/${id}/print/`, { 
    responseType: 'blob' 
  }),
  
  // Quick repair creation (for Kanban)
  quickCreate: async (repairData) => {
    const formData = new FormData();
    
    // Add text fields
    Object.keys(repairData).forEach(key => {
      if (key !== 'photos') {
        formData.append(key, repairData[key]);
      }
    });

    // Add photos
    if (repairData.photos) {
      repairData.photos.forEach((photo, index) => {
        if (photo) {
          formData.append(`photo_${index + 1}`, photo);
        }
      });
    }

    return api.post('/repairs/repairs/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  
  // Analytics and statistics
  getStatistics: () => api.get('/repairs/repairs/statistics/'),
  getStats: () => api.get('/repairs/repairs/stats/'),  // Alias
  getWorkflowStats: () => api.get('/repairs/repairs/statistics/'),
  getKanban: () => api.get('/repairs/repairs/kanban/'),  // Nouvel endpoint Kanban
  getRepairReport: (params) => api.get('/repairs/repairs/report/', { 
    params, 
    responseType: 'blob' 
  }),
  
  // Advanced search
  searchRepairs: (query, filters = {}) => api.get('/repairs/repairs/', {
    params: { search: query, ...filters }
  })
};

// ===== SUPPLIERS API =====
export const suppliersAPI = {
  // Basic CRUD for suppliers
  getAll: (params) => api.get('/suppliers/suppliers/', { params }),
  getById: (id) => api.get(`/suppliers/suppliers/${id}/`),
  create: (data) => api.post('/suppliers/suppliers/', data),
  update: (id, data) => api.patch(`/suppliers/suppliers/${id}/`, data),
  delete: (id) => api.delete(`/suppliers/suppliers/${id}/`),
  
  // Purchase orders
  getPurchaseOrders: (params) => api.get('/suppliers/purchase-orders/', { params }),
  getPurchaseOrderById: (id) => api.get(`/suppliers/purchase-orders/${id}/`),
  createPurchaseOrder: (data) => api.post('/suppliers/purchase-orders/', data),
  updatePurchaseOrder: (id, data) => api.patch(`/suppliers/purchase-orders/${id}/`, data),
  deletePurchaseOrder: (id) => api.delete(`/suppliers/purchase-orders/${id}/`),
  
  // Purchase order actions
  sendToSupplier: (id) => api.post(`/suppliers/purchase-orders/${id}/send_to_supplier/`),
  receiveItems: (id, items) => api.post(`/suppliers/purchase-orders/${id}/receive_items/`, { items }),
  confirmOrder: (id) => api.post(`/suppliers/purchase-orders/${id}/confirm_order/`),
  cancelOrder: (id, reason) => api.post(`/suppliers/purchase-orders/${id}/cancel/`, { reason }),
  
  // Document parsing and validation
  parseDocument: (file, documentType) => {
    const formData = new FormData();
    formData.append('document', file);
    formData.append('document_type', documentType);
    return api.post('/suppliers/purchase-orders/parse_document/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  validateOrder: (orderData) => api.post('/suppliers/purchase-orders/validate_order/', orderData),
  
  // Stock management
  stockCheck: (store) => api.get('/suppliers/purchase-orders/stock_check/', { params: { store } }),
  getCriticalStocks: (params) => api.get('/suppliers/stock-configs/critical_stocks/', { params }),
  
  // Transfers between stores
  getTransfers: (params) => api.get('/suppliers/transfers/', { params }),
  getTransferById: (id) => api.get(`/suppliers/transfers/${id}/`),
  createTransfer: (data) => api.post('/suppliers/transfers/', data),
  updateTransfer: (id, data) => api.patch(`/suppliers/transfers/${id}/`, data),
  deleteTransfer: (id) => api.delete(`/suppliers/transfers/${id}/`),
  
  // Transfer actions
  validateTransfer: (id, items) => api.post(`/suppliers/transfers/${id}/validate/`, { items }),
  shipTransfer: (id) => api.post(`/suppliers/transfers/${id}/ship/`),
  receiveTransfer: (id, items) => api.post(`/suppliers/transfers/${id}/receive/`, { items }),
  
  // Transfer suggestions
  getTransferSuggestions: (params) => api.get('/suppliers/transfer-suggestions/', { params }),
  generateTransferSuggestions: () => api.post('/suppliers/transfer-suggestions/generate_suggestions/'),
  applyTransferSuggestion: (id) => api.post(`/suppliers/transfer-suggestions/${id}/apply/`),
  
  // Analytics
  getPurchaseStatistics: () => api.get('/suppliers/purchase-orders/statistics/'),
  getTransferStatistics: () => api.get('/suppliers/transfers/statistics/'),
  getSupplierPerformance: (id) => api.get(`/suppliers/suppliers/${id}/performance/`)
};

// ===== FINANCE API =====
export const financeAPI = {
  // Dashboard
  getDashboard: () => api.get('/analytics/dashboard/'),
  getProfitLoss: (params) => api.get('/finance/profit-loss/', { params }),
  
  // Expenses
  getExpenses: (params) => api.get('/finance/expenses/', { params }),
  createExpense: (data) => api.post('/finance/expenses/', data),
  updateExpense: (id, data) => api.patch(`/finance/expenses/${id}/`, data),
  deleteExpense: (id) => api.delete(`/finance/expenses/${id}/`),
  
  // Revenue
  getRevenue: (params) => api.get('/finance/revenue/', { params }),
  getRevenueByCategory: (params) => api.get('/finance/revenue/by_category/', { params }),
  
  // Reports
  exportProfitLoss: (params) => api.get('/finance/profit-loss/export/', { 
    params, 
    responseType: 'blob' 
  }),
  exportBalanceSheet: (params) => api.get('/finance/balance_sheet/export/', { 
    params, 
    responseType: 'blob' 
  }),
  
  // Taxes
  getTaxReport: (params) => api.get('/finance/tax_report/', { params }),
  exportTaxReport: (params) => api.get('/finance/tax_report/export/', { 
    params, 
    responseType: 'blob' 
  })
};

// ===== ANALYTICS API =====
export const analyticsAPI = {
  // Dashboard
  getDashboard: () => api.get('/analytics/dashboard/'),
  getRealTimeStats: () => api.get('/analytics/realtime/'),
  
  // Sales analytics
  getSalesStats: (params) => api.get('/analytics/sales/', { params }),
  getSalesTrends: (params) => api.get('/analytics/sales/trends/', { params }),
  getTopProducts: (params) => api.get('/analytics/products/top/', { params }),
  getTopClients: (params) => api.get('/analytics/clients/top/', { params }),
  
  // Product analytics
  getProductStats: () => api.get('/analytics/products/'),
  getInventoryReport: () => api.get('/analytics/inventory/'),
  getStockTurnover: (params) => api.get('/analytics/stock_turnover/', { params }),
  
  // Client analytics
  getClientStats: () => api.get('/analytics/clients/'),
  getClientRetention: (params) => api.get('/analytics/clients/retention/', { params }),
  getClientSegmentation: () => api.get('/analytics/clients/segmentation/'),
  
  // Repair analytics
  getRepairStats: (params) => api.get('/analytics/repairs/', { params }),
  getRepairTrends: (params) => api.get('/analytics/repairs/trends/', { params }),
  getMechanicPerformance: (params) => api.get('/analytics/repairs/mechanics/', { params })
};

// ===== APPOINTMENTS API =====
export const appointmentsAPI = {
  // Basic CRUD
  getAll: (params) => api.get('/appointments/', { params }),
  getById: (id) => api.get(`/appointments/${id}/`),
  create: (data) => api.post('/appointments/', data),
  update: (id, data) => api.put(`/appointments/${id}/`, data),
  remove: (id) => api.delete(`/appointments/${id}/`),
  
  // Wix integration
  getFromWix: () => {
    console.warn('Wix API not configured. Please configure API keys in backend.');
    return Promise.resolve({ data: [] });
  },
  syncWithWix: () => api.post('/appointments/sync_wix/'),
  
  // Calendar integration
  getCalendarView: (params) => api.get('/appointments/calendar/', { params }),
  getAvailability: (params) => api.get('/appointments/availability/', { params }),
  
  // Reminders
  sendReminder: (id) => api.post(`/appointments/${id}/send_reminder/`),
  scheduleReminders: (data) => api.post('/appointments/schedule_reminders/', data)
};

// ===== SETTINGS API =====
export const settingsAPI = {
  // General settings
  getSettings: () => api.get('/settings/'),
  updateSettings: (data) => api.patch('/settings/', data),
  
  // Store configuration
  getStores: () => api.get('/settings/stores/'),
  createStore: (data) => api.post('/settings/stores/', data),
  updateStore: (id, data) => api.patch(`/settings/stores/${id}/`, data),
  deleteStore: (id) => api.delete(`/settings/stores/${id}/`),
  
  // Services
  getServices: () => api.get('/settings/services/'),
  createService: (data) => api.post('/settings/services/', data),
  updateService: (id, data) => api.patch(`/settings/services/${id}/`, data),
  deleteService: (id) => api.delete(`/settings/services/${id}/`),
  
  // User roles and permissions
  getRoles: () => api.get('/settings/roles/'),
  createRole: (data) => api.post('/settings/roles/', data),
  updateRole: (id, data) => api.patch(`/settings/roles/${id}/`, data),
  deleteRole: (id) => api.delete(`/settings/roles/${id}/`),
  
  // System configuration
  getSystemInfo: () => api.get('/settings/system/'),
  backupDatabase: () => api.post('/settings/backup/'),
  restoreDatabase: (file) => {
    const formData = new FormData();
    formData.append('backup', file);
    return api.post('/settings/restore/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  }
};

// ===== INVOICES API =====
export const invoicesAPI = {
  getAll: (params) => api.get('/invoices/', { params }),
  getById: (id) => api.get(`/invoices/${id}/`),
  create: (data) => api.post('/invoices/', data),
  update: (id, data) => api.patch(`/invoices/${id}/`, data),
  delete: (id) => api.delete(`/invoices/${id}/`),
  
  // PDF generation
  generatePDF: (id) => api.post(`/invoices/${id}/generate-pdf/`),
  downloadPDF: (id) => api.get(`/invoices/${id}/download/`, { 
    responseType: 'blob' 
  }),
  
  // Invoice actions
  markPaid: (id, paymentData) => api.post(`/invoices/${id}/mark_paid/`, paymentData),
  sendEmail: (id, emailData) => api.post(`/invoices/${id}/send_email/`, emailData),
  
  // Reports
  getInvoiceReport: (params) => api.get('/invoices/report/', { 
    params, 
    responseType: 'blob' 
  })
};

// ===== QUOTES API =====
export const quotesAPI = {
  getAll: (params) => api.get('/quotes/', { params }),
  getById: (id) => api.get(`/quotes/${id}/`),
  create: (data) => api.post('/quotes/', data),
  update: (id, data) => api.put(`/quotes/${id}/`, data),
  patch: (id, data) => api.patch(`/quotes/${id}/`, data),
  delete: (id) => api.delete(`/quotes/${id}/`),
  
  // Quote actions
  convertToOrder: (id, paymentData) => api.post(`/quotes/${id}/convert_to_order/`, paymentData),
  updateStatus: (id, status) => api.post(`/quotes/${id}/update_status/`, { status }),
  sendEmail: (id, emailData) => api.post(`/quotes/${id}/send_email/`, emailData),
  
  // PDF generation
  generatePDF: (id) => api.post(`/quotes/${id}/generate-pdf/`),
  downloadPDF: (id) => api.get(`/quotes/${id}/download/`, { 
    responseType: 'blob' 
  })
};

// ===== UTILITY FUNCTIONS =====
export const utilsAPI = {
  // File operations
  downloadFile: (blob, filename) => {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },
  
  // Formatting utilities
  formatPrice: (amount) => {
    return new Intl.NumberFormat('fr-FR', { 
      style: 'currency', 
      currency: 'EUR' 
    }).format(amount);
  },
  
  formatDate: (date) => {
    return new Intl.DateTimeFormat('fr-FR', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    }).format(new Date(date));
  },
  
  formatDateTime: (date) => {
    return new Intl.DateTimeFormat('fr-FR', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit' 
    }).format(new Date(date));
  },
  
  // System utilities
  healthCheck: () => api.get('/health/'),
  getVersion: () => api.get('/version/'),
  
  // Data export/import
  exportData: (type, params) => api.get(`/export/${type}/`, { 
    params, 
    responseType: 'blob' 
  }),
  importData: (type, file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post(`/import/${type}/`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  }
};

// Export the main api instance for direct use if needed
export default api;

// Export all APIs as a single object for convenience
export const API = {
  auth: authAPI,
  products: productsAPI,
  clients: clientsAPI,
  orders: ordersAPI,
  repairs: repairsAPI,
  suppliers: suppliersAPI,
  finance: financeAPI,
  analytics: analyticsAPI,
  appointments: appointmentsAPI,
  settings: settingsAPI,
  invoices: invoicesAPI,
  quotes: quotesAPI,
  utils: utilsAPI
};
