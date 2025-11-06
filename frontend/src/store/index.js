import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Auth Store
export const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      login: (user, token) => set({ user, token, isAuthenticated: true }),
      logout: () => set({ user: null, token: null, isAuthenticated: false }),
      updateUser: (user) => set({ user }),
    }),
    {
      name: 'auth-storage',
    }
  )
);

// Cart Store
export const useCartStore = create((set, get) => ({
  items: [],
  selectedStore: 'ville_avray',
  selectedClient: null,
  
  setSelectedStore: (store) => set({ selectedStore: store }),
  setSelectedClient: (client) => set({ selectedClient: client }),
  
  addItem: (product, quantity = 1) => {
    const { items } = get();
    const existingItem = items.find((item) => item.product.id === product.id);
    
    if (existingItem) {
      set({
        items: items.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        ),
      });
    } else {
      set({ items: [...items, { product, quantity }] });
    }
  },
  
  removeItem: (productId) =>
    set((state) => ({
      items: state.items.filter((item) => item.product.id !== productId),
    })),
  
  updateQuantity: (productId, quantity) =>
    set((state) => ({
      items: state.items.map((item) =>
        item.product.id === productId ? { ...item, quantity } : item
      ),
    })),
  
  clearCart: () => set({ items: [], selectedClient: null }),
  
  getTotal: () => {
    const { items } = get();
    return items.reduce(
      (total, item) => total + item.product.price_ttc * item.quantity,
      0
    );
  },
  
  getTotalHT: () => {
    const { items } = get();
    return items.reduce(
      (total, item) => total + item.product.price_ht * item.quantity,
      0
    );
  },
}));

// Products Store
export const useProductsStore = create((set) => ({
  products: [],
  viewMode: 'grid',
  searchQuery: '',
  selectedCategory: null,
  
  setProducts: (products) => set({ products }),
  setViewMode: (mode) => set({ viewMode: mode }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setSelectedCategory: (category) => set({ selectedCategory: category }),
  
  getFilteredProducts: () => {
    const { products, searchQuery, selectedCategory } = set.getState();
    return products.filter((product) => {
      const matchesSearch =
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.reference.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory =
        !selectedCategory || product.category?.id === selectedCategory;
      return matchesSearch && matchesCategory && product.is_visible;
    });
  },
}));
