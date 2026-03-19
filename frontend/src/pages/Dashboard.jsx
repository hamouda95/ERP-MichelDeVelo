import React, { useState, useEffect } from 'react';
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

  // Fonction pour charger toutes les données du dashboard
  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Charger les données en parallèle
      const [
        ordersData,
        clientsData,
        productsData,
        repairsData,
        quotesData,
        financeData,
        appointmentsData
      ] = await Promise.allSettled([
        ordersAPI.getAll({ limit: 5, ordering: '-created_at' }),
        clientsAPI.getAll(),
        productsAPI.getAll({ low_stock: true, limit: 10 }),
        repairsAPI.getAll(),
        quotesAPI.getAll().catch(() => ({ data: [] })), // Retirer le paramètre status qui cause l'erreur 400
        financeAPI.getDashboard(),
        // appointmentsAPI.getAll().catch(() => ({ data: [] })) // Désactivé temporairement - endpoint 500
      ]);

      // Extraire les données avec gestion des erreurs
      const orders = ordersData.status === 'fulfilled' ? (ordersData.value.data?.results || ordersData.value.data || []) : [];
      const clients = clientsData.status === 'fulfilled' ? (clientsData.value.data?.results || clientsData.value.data || []) : [];
      const products = productsData.status === 'fulfilled' ? (productsData.value.data?.results || productsData.value.data || []) : [];
      const repairs = repairsData.status === 'fulfilled' ? (repairsData.value.data?.results || repairsData.value.data || []) : [];
      const quotes = quotesData.status === 'fulfilled' ? (quotesData.value.data?.results || quotesData.value.data || []) : [];
      const finance = financeData.status === 'fulfilled' ? financeData.value.data : {};
      // const appointments = appointmentsData.status === 'fulfilled' ? (appointmentsData.value.data || []) : []; // Désactivé temporairement

      // Calculer les statistiques
      const completedOrders = orders.filter(order => order.status === 'completed');
      const totalRevenue = completedOrders.reduce((sum, order) => sum + (order.total_ttc || 0), 0);
      
      // Trier les produits par stock faible
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

      // Calculer les top produits (basé sur les commandes)
      const productSales = {};
      orders.forEach(order => {
        if (order.items) {
          order.items.forEach(item => {
            if (item.product) {
              productSales[item.product.name] = (productSales[item.product.name] || 0) + item.quantity;
            }
          });
        }
      });
      
      const topProducts = Object.entries(productSales)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 3)
        .map(([name, sales], index) => ({
          name,
          sales,
          revenue: sales * 45 // Prix moyen estimé
        }));

      // Créer les tâches à venir (basé sur les réparations et devis)
      const upcomingTasks = [];
      
      // Ajouter les réparations en cours
      repairs.slice(0, 2).forEach(repair => {
        upcomingTasks.push({
          type: 'repair',
          title: `Réparation - ${repair.client_name || 'Client'}`,
          time: repair.appointment_time || '10:00',
          priority: repair.priority || 'medium'
        });
      });

      // Ajouter les devis en attente
      quotes.slice(0, 1).forEach(quote => {
        upcomingTasks.push({
          type: 'quote',
          title: `Devis - ${quote.client_name || 'Client'}`,
          time: quote.created_at ? new Date(quote.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '14:00',
          priority: 'low'
        });
      });

      // Mettre à jour les stats
      setStats({
        totalRevenue: finance.total_revenue || totalRevenue,
        totalOrders: orders.length,
        totalClients: clients.length,
        totalProducts: products.length,
        totalRepairs: repairs.length,
        pendingQuotes: quotes.length,
        todayAppointments: 0, // Désactivé temporairement
        lowStockProducts,
        recentOrders: orders.slice(0, 5),
        monthlyTrend: {
          current: finance.monthly_revenue || totalRevenue,
          previous: finance.previous_month_revenue || Math.round(totalRevenue * 0.9),
          percentage: finance.monthly_growth || 11.7
        },
        weeklyStats: {
          revenue: finance.weekly_revenue || Math.round(totalRevenue * 0.3),
          orders: finance.weekly_orders || Math.round(orders.length * 0.3),
          newClients: finance.weekly_new_clients || Math.round(clients.length * 0.1),
          repairs: finance.weekly_repairs || Math.round(repairs.length * 0.3)
        },
        topProducts,
        upcomingTasks: upcomingTasks.slice(0, 3)
      });

    } catch (error) {
      console.error('Erreur lors du chargement du dashboard:', error);
      toast.error('Erreur lors du chargement des données du tableau de bord');
      
      // En cas d'erreur, utiliser des valeurs par défaut
      setStats({
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
    } finally {
      setLoading(false);
    }
  };

  // Charger les données au montage du composant
  useEffect(() => {
    loadDashboardData();
  }, []);

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
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority) => {
    switch(priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getTaskTypeColor = (type) => {
    switch(type) {
      case 'repair': return 'bg-orange-100 text-orange-700';
      case 'appointment': return 'bg-blue-100 text-blue-700';
      case 'quote': return 'bg-purple-100 text-purple-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="p-4 space-y-4 max-w-full">
      {/* État de chargement */}
      {loading && (
        <div className="flex items-center justify-center min-h-64">
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="text-gray-600">Chargement du tableau de bord...</p>
          </div>
        </div>
      )}
      
      {/* Contenu principal */}
      {!loading && (
        <>
          {/* En-tête compact avec date et toutes les actions rapides */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Tableau de bord</h1>
              <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                <span className="flex items-center gap-1">
                  <ClockIcon className="w-4 h-4" />
                  {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'short' })}
                </span>
                <span>•</span>
                <span>{stats.todayAppointments} RDV aujourd'hui</span>
                <span>•</span>
                <span className="text-red-600 font-medium">{stats.lowStockProducts.length} alertes stock</span>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {quickActions.map((action) => (
                <button
                  key={action.title}
                  onClick={() => navigate(action.route)}
                  className={`${action.color} text-white px-4 py-2 rounded-lg hover:opacity-90 transition-opacity flex items-center gap-2`}
                >
                  <action.icon className="w-4 h-4" />
                  <span className="text-sm font-medium">{action.title}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Vue d'ensemble - KPIs principaux */}
          <div className="bg-white rounded-lg shadow p-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Vue d'ensemble</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              <div className="text-center p-3 bg-blue-50 rounded-lg border border-blue-200 hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/appointments')}>
                <CalendarIcon className="w-5 h-5 text-blue-600 mx-auto mb-1" />
                <p className="text-lg font-bold text-blue-600">{stats.todayAppointments}</p>
                <p className="text-xs text-gray-600">RDV aujourd'hui</p>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg border border-green-200 hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/quotes')}>
                <DocumentTextIcon className="w-5 h-5 text-green-600 mx-auto mb-1" />
                <p className="text-lg font-bold text-green-600">{stats.pendingQuotes}</p>
                <p className="text-xs text-gray-600">Devis en attente</p>
              </div>
              <div className="text-center p-3 bg-orange-50 rounded-lg border border-orange-200 hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/products')}>
                <CubeIcon className="w-5 h-5 text-orange-600 mx-auto mb-1" />
                <p className="text-lg font-bold text-orange-600">{stats.lowStockProducts.length}</p>
                <p className="text-xs text-gray-600">Stock faible</p>
              </div>
              <div className="text-center p-3 bg-purple-50 rounded-lg border border-purple-200 hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/repairs')}>
                <WrenchScrewdriverIcon className="w-5 h-5 text-purple-600 mx-auto mb-1" />
                <p className="text-lg font-bold text-purple-600">{stats.totalRepairs}</p>
                <p className="text-xs text-gray-600">Réparations</p>
              </div>
              <div className="text-center p-3 bg-yellow-50 rounded-lg border border-yellow-200 hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/products')}>
                <ExclamationTriangleIcon className="w-5 h-5 text-yellow-600 mx-auto mb-1" />
                <p className="text-lg font-bold text-yellow-600">{stats.totalProducts}</p>
                <p className="text-xs text-gray-600">Produits</p>
              </div>
              <div className="text-center p-3 bg-red-50 rounded-lg border border-red-200 hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/cashier')}>
                <CurrencyDollarIcon className="w-5 h-5 text-red-600 mx-auto mb-1" />
                <p className="text-lg font-bold text-red-600">{stats.totalOrders}</p>
                <p className="text-xs text-gray-600">Commandes</p>
              </div>
            </div>
          </div>

          {/* Tâches du jour + Alertes stock côte à côte */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Tâches du jour */}
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold text-gray-900">Tâches du jour</h2>
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">{stats.upcomingTasks.length}</span>
              </div>
              <div className="space-y-2">
                {stats.upcomingTasks.map((task, index) => (
                  <div key={index} className={`p-2 rounded-lg border ${getPriorityColor(task.priority)} hover:shadow-sm transition-shadow`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{task.time}</span>
                        <span className="text-sm text-gray-700">{task.title}</span>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded ${getTaskTypeColor(task.type)}`}>
                        {task.type === 'repair' ? 'Réparation' : task.type === 'appointment' ? 'RDV' : 'Devis'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Alertes stock compactes */}
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <ExclamationTriangleIcon className="w-4 h-4 text-yellow-500" />
                  Alertes stock
                </h2>
                <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full font-semibold">
                  {stats.lowStockProducts.length}
                </span>
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {stats.lowStockProducts.map((product) => (
                  <div key={product.id} className={`flex items-center justify-between p-2 rounded border text-xs ${getUrgencyColor(product.urgency)}`}>
                    <div className="flex-1">
                      <p className="font-medium truncate">{product.name}</p>
                      <p className="opacity-75">{product.reference}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-1 bg-white bg-opacity-50 rounded-full font-semibold">
                        {product.total_stock}
                      </span>
                      <button onClick={() => navigate('/products')} className="text-xs font-medium hover:underline">
                        Commander
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Top produits + Dernières commandes en grille dense */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Top produits */}
            <div className="bg-white rounded-lg shadow p-4">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">Top produits</h2>
              <div className="space-y-3">
                {stats.topProducts.map((product, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xs font-bold">
                        {index + 1}
                      </span>
                      <div>
                        <p className="text-sm font-medium text-gray-900 truncate">{product.name}</p>
                        <p className="text-xs text-gray-600">{product.sales} ventes</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-gray-900">{product.revenue}€</p>
                      <p className="text-xs text-gray-500">{(product.revenue/product.sales).toFixed(1)}€/unit</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Dernières commandes compactes */}
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold text-gray-900">Dernières commandes</h2>
                <button onClick={() => navigate('/cashier')} className="text-xs text-blue-600 hover:text-blue-700 font-medium">
                  Voir tout
                </button>
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {stats.recentOrders.map((order) => (
                  <div key={order.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer" onClick={() => navigate('/cashier')}>
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                        <ShoppingCartIcon className="w-3 h-3 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{order.order_number}</p>
                        <p className="text-xs text-gray-600">{order.client_name}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-gray-900">{typeof order.total_ttc === 'number' ? order.total_ttc.toFixed(2) : '0.00'}€</p>
                      <div className="flex items-center gap-1 justify-end">
                        <span className={`text-xs px-1.5 py-0.5 rounded-full ${getStatusColor(order.status)}`}>
                          {order.status === 'completed' ? '✓' : '⏳'}
                        </span>
                        <span className="text-xs text-gray-500">
                          {order.store === 'ville_avray' ? "VAV" : 'GAR'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function CompactStatCard({ title, value, color, trend, trendUp, subtitle }) {
  return (
    <div className={`${color} border rounded-lg p-3 hover:shadow-md transition-all duration-200 hover:scale-105`}>
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs font-medium opacity-75">{title}</p>
        {trend && (
          <div className={`flex items-center gap-1 text-xs font-semibold ${
            trendUp ? 'text-green-600' : 'text-red-600'
          }`}>
            <ArrowTrendingUpIcon className={`w-3 h-3 ${!trendUp && 'rotate-180'}`} />
            {trend}
          </div>
        )}
      </div>
      <div>
        <p className="text-lg font-bold">{value}</p>
        {subtitle && <p className="text-xs opacity-75">{subtitle}</p>}
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, color, trend, trendUp, subtitle }) {
  return (
    <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all duration-200 hover:scale-105">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-lg ${color}`}>
          {icon}
        </div>
        {trend && (
          <div className={`flex items-center gap-1 text-sm font-semibold ${
            trendUp ? 'text-green-600' : 'text-red-600'
          }`}>
            <ArrowTrendingUpIcon className={`w-4 h-4 ${!trendUp && 'rotate-180'}`} />
            {trend}
          </div>
        )}
      </div>
      <div>
        <p className="text-gray-600 text-sm font-medium">{title}</p>
        <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>
        {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
      </div>
    </div>
  );
}
