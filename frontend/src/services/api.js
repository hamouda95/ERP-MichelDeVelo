/**
 * ============================================================================ 
 * API SERVICES - LEGACY COMPATIBILITY LAYER
 * ============================================================================ 
 * 
 * This file provides backward compatibility while redirecting to the
 * consolidated API services. Import from api_consolidated.js instead.
 * 
 * @deprecated Use api_consolidated.js instead
 * ============================================================================ 
 */

// Import all APIs from the consolidated file
import {
  authAPI,
  productsAPI,
  clientsAPI,
  ordersAPI,
  repairsAPI,
  suppliersAPI,
  financeAPI,
  analyticsAPI,
  appointmentsAPI,
  settingsAPI,
  invoicesAPI,
  quotesAPI,
  utilsAPI,
  API
} from './api_consolidated.js';

import api from './api_consolidated.js';

// Re-export for backward compatibility
export {
  authAPI,
  productsAPI,
  clientsAPI,
  ordersAPI,
  repairsAPI,
  suppliersAPI,
  financeAPI,
  analyticsAPI,
  appointmentsAPI,
  settingsAPI,
  invoicesAPI,
  quotesAPI,
  utilsAPI,
  API,
  api
};

// Re-export categories API for backward compatibility
export const categoriesAPI = {
  getAll: (params) => productsAPI.getCategories(params),
  getById: (id) => productsAPI.getCategory(id),
  create: (data) => productsAPI.createCategory(data),
  update: (id, data) => productsAPI.updateCategory(id, data),
  delete: (id) => productsAPI.deleteCategory(id),
};
