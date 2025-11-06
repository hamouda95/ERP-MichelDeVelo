import React, { useState, useEffect } from 'react';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend } from 'chart.js';
import { analyticsAPI } from '../services/api';
import toast from 'react-hot-toast';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend);

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

  const salesChartData = {
    labels: stats?.salesByMonth?.map(s => s.month) || [],
    datasets: [
      {
        label: 'Ventes (€)',
        data: stats?.salesByMonth?.map(s => s.total) || [],
        borderColor: 'rgb(37, 99, 235)',
        backgroundColor: 'rgba(37, 99, 235, 0.1)',
        tension: 0.4,
      },
    ],
  };

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

  const storeDistributionData = {
    labels: ['Ville d\'Avray', 'Garches'],
    datasets: [
      {
        data: [stats?.storeStats?.ville_avray || 0, stats?.storeStats?.garches || 0],
        backgroundColor: ['rgba(37, 99, 235, 0.8)', 'rgba(59, 130, 246, 0.8)'],
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

      {/* Graphiques */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Ventes mensuelles */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Évolution des ventes</h2>
          <Line data={salesChartData} options={{ responsive: true, maintainAspectRatio: true }} />
        </div>

        {/* Top produits */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Top 5 produits</h2>
          <Bar data={topProductsData} options={{ responsive: true, maintainAspectRatio: true }} />
        </div>

        {/* Répartition magasins */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Ventes par magasin</h2>
          <div className="max-w-xs mx-auto">
            <Doughnut data={storeDistributionData} options={{ responsive: true, maintainAspectRatio: true }} />
          </div>
        </div>

        {/* Alertes stock */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Alertes stock</h2>
          <div className="space-y-3">
            {stats?.lowStockProducts?.map((product) => (
              <div key={product.id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">{product.name}</p>
                  <p className="text-sm text-gray-600">Réf: {product.reference}</p>
                </div>
                <span className="px-3 py-1 bg-red-100 text-red-800 text-sm font-semibold rounded-full">
                  Stock: {product.total_stock}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Dernières commandes */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Dernières commandes</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">N° Commande</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Client</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Magasin</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Montant</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {stats?.recentOrders?.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap font-medium">{order.order_number}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{order.client_name}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{order.store === 'ville_avray' ? 'Ville d\'Avray' : 'Garches'}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{order.total_ttc.toFixed(2)} €</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                      order.status === 'completed' ? 'bg-green-100 text-green-800' :
                      order.status === 'processing' ? 'bg-blue-100 text-blue-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {order.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
          <p className={`text-sm mt-2 font-semibold ${trendUp ? 'text-green-600' : 'text-red-600'}`}>
            {trend} vs mois dernier
          </p>
        </div>
        <div className="text-4xl">{icon}</div>
      </div>
    </div>
  );
}
