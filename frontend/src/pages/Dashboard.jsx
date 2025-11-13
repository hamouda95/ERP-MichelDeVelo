import React, { useState, useEffect } from 'react';
import { Line, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { analyticsAPI } from '../services/api';
import toast from 'react-hot-toast';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend);

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const response = await analyticsAPI.getDashboard();
      setStats(response.data);
    } catch (error) {
      toast.error('Erreur de chargement des données');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const topProductsData = {
    labels: stats?.topProducts?.map(p => p.name) || [],
    datasets: [
      {
        label: 'Quantité vendue',
        data: stats?.topProducts?.map(p => p.quantity) || [],
        backgroundColor: [
          'rgba(37, 99, 235, 0.8)',
          'rgba(59, 130, 246, 0.8)',
          'rgba(96, 165, 250, 0.8)',
          'rgba(147, 197, 253, 0.8)',
          'rgba(191, 219, 254, 0.8)',
        ],
      },
    ],
  };

  return (
    <div className="p-6 space-y-6">
      {/* En-tête */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Tableau de bord</h1>
        <p className="text-gray-600 mt-1">Vue d'ensemble de votre activité</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Chiffre d'affaires"
          value={`${stats?.totalRevenue?.toLocaleString('fr-FR')} €`}
          icon="💰"
          trend="+12%"
          trendUp={true}
        />
        <StatCard
          title="Commandes"
          value={stats?.totalOrders || 0}
          icon="📦"
          trend="+8%"
          trendUp={true}
        />
        <StatCard
          title="Clients"
          value={stats?.totalClients || 0}
          icon="👥"
          trend="+15%"
          trendUp={true}
        />
        <StatCard
          title="Produits"
          value={stats?.totalProducts || 0}
          icon="🚴"
          trend="-3%"
          trendUp={false}
        />
      </div>

      {/* Alertes + Dernières commandes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Alertes stock */}
        <div className="bg-white rounded-xl shadow-lg p-6 flex flex-col h-[500px]">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            Alertes stock {stats?.lowStockProducts?.length ? `(${stats.lowStockProducts.length})` : ''}
          </h2>
          <div className="space-y-3 overflow-y-auto pr-2">
            {stats?.lowStockProducts?.length > 0 ? (
              stats.lowStockProducts.map((product) => (
                <div
                  key={product.id}
                  className="flex items-center justify-between p-3 bg-red-50 rounded-lg"
                >
                  <div>
                    <p className="font-medium text-gray-900">{product.name}</p>
                    <p className="text-sm text-gray-600">Réf: {product.reference}</p>
                  </div>
                  <span className="px-3 py-1 bg-red-100 text-red-800 text-sm font-semibold rounded-full">
                    Stock: {product.total_stock}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-sm">Aucune alerte de stock 🎉</p>
            )}
          </div>
        </div>

        {/* Dernières commandes */}
        <div className="bg-white rounded-xl shadow-lg p-6 flex flex-col h-[500px]">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Dernières commandes</h2>
          <div className="overflow-y-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="sticky top-0 bg-white">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase">N°</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase">Client</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase">Magasin</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase">Montant</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {stats?.recentOrders?.length > 0 ? (
                  stats.recentOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2 font-medium">{order.order_number}</td>
                      <td className="px-4 py-2">{order.client_name}</td>
                      <td className="px-4 py-2">
                        {order.store === 'ville_avray' ? 'Ville d\'Avray' : 'Garches'}
                      </td>
                      <td className="px-4 py-2">{order.total_ttc.toFixed(2)} €</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" className="text-center py-4 text-gray-500">
                      Aucune commande récente 📭
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Top produits */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Top 5 produits</h2>
        <Bar data={topProductsData} options={{ responsive: true, maintainAspectRatio: true }} />
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, trend, trendUp }) {
  return (
    <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-600 text-sm font-medium">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>
          <p
            className={`text-sm mt-2 font-semibold ${
              trendUp ? 'text-green-600' : 'text-red-600'
            }`}
          >
            {trend} vs mois dernier
          </p>
        </div>
        <div className="text-4xl">{icon}</div>
      </div>
    </div>
  );
}
