import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import {
  ShoppingCartIcon,
  UserGroupIcon,
  CubeIcon,
  WrenchScrewdriverIcon,
  CurrencyDollarIcon,
  DocumentTextIcon,
  CalendarIcon,
  ExclamationTriangleIcon,
  ArrowTrendingUpIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import { 
  ordersAPI, 
  clientsAPI, 
  productsAPI, 
  repairsAPI, 
  quotesAPI,
  financeAPI,
  appointmentsAPI 
} from '../services/api';

export default function Dashboard() {
  const navigate = useNavigate();
  
  // États pour les données chargées
  const [loading, setLoading] = useState(true);
  const [criticalLoading, setCriticalLoading] = useState(true);
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalOrders: 0,
    totalClients: 0,
    totalProducts: 0,
    totalRepairs: 0,
    pendingQuotes: 0,
    todayAppointments: 0,
    lowStockProducts: [],
    recentOrders: [],
    monthlyTrend: { current: 0, previous: 0, percentage: 0 },
    weeklyStats: { revenue: 0, orders: 0, newClients: 0, repairs: 0 },
    topProducts: [],
    upcomingTasks: []
  });

  // Phase 1: Load critical data first (stats that affect LCP)
  const loadCriticalData = useCallback(async () => {
    try {
      setCriticalLoading(true);
      
      // Load only essential stats first
      const [
        ordersData,
        clientsData,
        financeData
      ] = await Promise.allSettled([
        ordersAPI.getAll({ limit: 5, ordering: '-created_at' }),
        clientsAPI.getAll(),
        financeAPI.getDashboard().catch(() => ({ data: {} }))
      ]);

      const orders = ordersData.status === 'fulfilled' ? (ordersData.value.data?.results || ordersData.value.data || []) : [];
      const clients = clientsData.status === 'fulfilled' ? (clientsData.value.data?.results || clientsData.value.data || []) : [];
      const finance = financeData.status === 'fulfilled' ? financeData.value.data : {};

      const completedOrders = orders.filter(order => order.status === 'completed');
      const totalRevenue = completedOrders.reduce((sum, order) => sum + (order.total_ttc || 0), 0);

      // Update critical stats immediately for LCP
      setStats(prev => ({
        ...prev,
        totalRevenue: finance.total_revenue || totalRevenue,
        totalOrders: orders.length,
        totalClients: clients.length,
        totalProducts: prev.totalProducts, // Will be updated in phase 2
        totalRepairs: prev.totalRepairs, // Will be updated in phase 2
      }));
      
      setCriticalLoading(false);
    } catch (error) {
      console.error('Error loading critical data:', error);
      setCriticalLoading(false);
    }
  }, []);

  // Phase 2: Load remaining data after initial render
  const loadSecondaryData = useCallback(async () => {
    try {
      const [
        productsData,
        repairsData,
        quotesData
      ] = await Promise.allSettled([
        productsAPI.getAll({ low_stock: true, limit: 10 }),
        repairsAPI.getAll(),
        quotesAPI.getAll().catch(() => ({ data: [] }))
      ]);

      const products = productsData.status === 'fulfilled' ? (productsData.value.data?.results || productsData.value.data || []) : [];
      const repairs = repairsData.status === 'fulfilled' ? (repairsData.value.data?.results || repairsData.value.data || []) : [];
      const quotes = quotesData.status === 'fulfilled' ? (quotesData.value.data?.results || quotesData.value.data || []) : [];

      // Process products
      const lowStockProducts = products
        .filter(product => {
          const totalStock = (product.stock_ville_avray || 0) + (product.stock_garches || 0);
          return totalStock < 5;
        })
        .map(product => {
          const totalStock = (product.stock_ville_avray || 0) + (product.stock_garches || 0);
          return {
            ...product,
            total_stock: totalStock,
            urgency: totalStock <= 1 ? 'high' : totalStock <= 3 ? 'medium' : 'low'
          };
        })
        .sort((a, b) => a.total_stock - b.total_stock)
        .slice(0, 5);

      // Update with remaining data
      setStats(prev => ({
        ...prev,
        totalProducts: products.length,
        totalRepairs: repairs.length,
        pendingQuotes: quotes.filter(q => q.status === 'pending').length,
        lowStockProducts
      }));
      
      setLoading(false);
    } catch (error) {
      console.error('Error loading secondary data:', error);
      setLoading(false);
    }
  }, []);

  // Load critical data immediately, then secondary data
  useEffect(() => {
    loadCriticalData();
    // Use setTimeout to defer secondary loading and prevent blocking
    const timer = setTimeout(() => {
      loadSecondaryData();
    }, 100);
    
    return () => clearTimeout(timer);
  }, [loadCriticalData, loadSecondaryData]);

  const quickActions = [
    { title: 'Nouvelle vente', icon: ShoppingCartIcon, color: 'bg-blue-500', route: '/cashier', description: 'Encaisser une vente' },
    { title: 'Nouvelle réparation', icon: WrenchScrewdriverIcon, color: 'bg-green-500', route: '/repairs', description: 'Créer un ticket SAV' },
    { title: 'Nouveau devis', icon: DocumentTextIcon, color: 'bg-purple-500', route: '/quotes', description: 'Générer un devis' },
    { title: 'Gestion stock', icon: CubeIcon, color: 'bg-orange-500', route: '/products', description: 'Gérer les stocks' }
  ];

  const getUrgencyColor = (urgency) => {
    switch(urgency) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Show loading state while critical data loads
  if (criticalLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement du tableau de bord...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* En-tête compact avec date et toutes les actions rapides */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tableau de bord</h1>
          <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
            <span className="flex items-center gap-1">
              <ClockIcon className="w-4 h-4" />
              {new Date().toLocaleDateString('fr-FR', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </span>
          </div>
        </div>
      </div>

      {/* Actions rapides */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {quickActions.map((action, index) => {
          const Icon = action.icon;
          return (
            <button
              key={index}
              onClick={() => navigate(action.route)}
              className={`${action.color} text-white p-4 rounded-xl hover:shadow-lg transition-all duration-200 hover:scale-105`}
            >
              <Icon className="w-8 h-8 mb-2" />
              <div className="text-sm font-semibold">{action.title}</div>
              <div className="text-xs opacity-90 mt-1">{action.description}</div>
            </button>
          );
        })}
      </div>

      {/* Statistiques principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all duration-200">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-blue-100 rounded-lg">
              <CurrencyDollarIcon className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <div>
            <p className="text-gray-600 text-sm font-medium">Chiffre d'affaires</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">
              {stats.totalRevenue.toLocaleString('fr-FR')} €
            </p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all duration-200">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-green-100 rounded-lg">
              <ShoppingCartIcon className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <div>
            <p className="text-gray-600 text-sm font-medium">Commandes</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalOrders}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all duration-200">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-purple-100 rounded-lg">
              <UserGroupIcon className="w-6 h-6 text-purple-600" />
            </div>
          </div>
          <div>
            <p className="text-gray-600 text-sm font-medium">Clients</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalClients}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all duration-200">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-orange-100 rounded-lg">
              <WrenchScrewdriverIcon className="w-6 h-6 text-orange-600" />
            </div>
          </div>
          <div>
            <p className="text-gray-600 text-sm font-medium">Réparations</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalRepairs}</p>
          </div>
        </div>
      </div>

      {/* Alertes stocks bas */}
      {stats.lowStockProducts.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <ExclamationTriangleIcon className="w-5 h-5 text-yellow-600" />
            <h3 className="text-lg font-semibold text-yellow-800">Stocks faibles</h3>
          </div>
          <div className="space-y-2">
            {stats.lowStockProducts.slice(0, 3).map((product, index) => (
              <div key={index} className={`flex items-center justify-between p-3 rounded-lg border ${getUrgencyColor(product.urgency)}`}>
                <div>
                  <p className="font-medium">{product.name}</p>
                  <p className="text-sm opacity-75">Stock: {product.total_stock}</p>
                </div>
                <button
                  onClick={() => navigate('/products')}
                  className="px-3 py-1 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
                >
                  Commander
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Loading indicator for secondary data */}
      {loading && (
        <div className="text-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-sm text-gray-600 mt-2">Chargement des données complémentaires...</p>
        </div>
      )}
    </div>
  );
}
