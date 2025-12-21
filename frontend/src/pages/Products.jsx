import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { productsAPI } from '../services/api';
import toast from 'react-hot-toast';
import {
  MagnifyingGlassIcon,
  PlusIcon,
  ViewColumnsIcon,
  ListBulletIcon,
  PencilIcon,
  XMarkIcon,
  ArrowDownTrayIcon,
  FunnelIcon
} from '@heroicons/react/24/outline';

// ----- StatCard -----
function StatCard({ label, value, icon: Icon, color = 'blue' }) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    red: 'bg-red-50 text-red-600',
    yellow: 'bg-yellow-50 text-yellow-600',
  };

  return (
    <div className="bg-white rounded-xl shadow p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600">{label}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
        </div>
        {Icon && (
          <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
            <Icon className="w-6 h-6" />
          </div>
        )}
      </div>
    </div>
  );
}

// ----- Main Component -----
export default function Products() {
  const [products, setProducts] = useState([]);
  const [viewMode, setViewMode] = useState('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);

  const [filters, setFilters] = useState({
    productType: 'all',
    visibility: 'all',
    brand: 'all',
    stockLevel: 'all', // 'all', 'out', 'low', 'normal'
    store: 'all' // 'all', 'ville_avray', 'garches'
  });

  // Load products
  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      const response = await productsAPI.getAll();
      // support different response shapes
      const data = response?.data?.results ?? response?.data ?? response;
      setProducts(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
      toast.error('Erreur de chargement des produits');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  // Helpers
  const getTotalStock = (p) => {
    if (typeof p.total_stock === 'number') return p.total_stock;
    const a = Number(p.stock_garches) || 0;
    const b = Number(p.stock_ville_avray) || 0;
    return a + b;
  };

  // Stats memoized
  const stats = useMemo(() => {
    const total = products.length;
    const outOfStock = products.filter(p => getTotalStock(p) === 0).length;
    const lowStockProducts = products.filter(p => getTotalStock(p) > 0 && (typeof p.alert_stock === 'number' ? getTotalStock(p) < p.alert_stock : p.is_low_stock));
    const activeProducts = products.filter(p => p.is_visible).length;
    const totalStock = products.reduce((sum, p) => sum + getTotalStock(p), 0);
    //const stockValue = products.reduce((sum, p) => sum + (Number(p.price_ttc) || 0) * getTotalStock(p), 0);
    const stockValue = products.reduce((sum, p) => p.productType !== 'prestation'? sum + (Number(p.price_ttc) || 0) * getTotalStock(p) : sum,0);
    const totalStockVilleAvray = products.reduce((sum, p) => sum + (Number(p.stock_ville_avray) || 0), 0);
    const totalStockGarches = products.reduce((sum, p) => sum + (Number(p.stock_garches) || 0), 0);

    return {
      total,
      outOfStock,
      lowStock: lowStockProducts.length,
      lowStockProducts,
      activeProducts,
      totalStock,
      stockValue: stockValue.toFixed(2),
      totalStockVilleAvray,
      totalStockGarches
    };
  }, [products]);

  // Brands list
  const brands = useMemo(() => [...new Set(products.map(p => p.brand).filter(Boolean))], [products]);

  // Filtering
  const getFilteredProducts = useCallback(() => {
    let filtered = products;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(p => (
        (p.name || '').toString().toLowerCase().includes(q) ||
        (p.reference || '').toString().toLowerCase().includes(q) ||
        (p.barcode || '').toString().includes(q)
      ));
    }

    if (filters.productType !== 'all') {
      filtered = filtered.filter(p => p.product_type === filters.productType);
    }

    if (filters.visibility !== 'all') {
      filtered = filtered.filter(p => filters.visibility === 'visible' ? p.is_visible : !p.is_visible);
    }

    if (filters.brand !== 'all') {
      filtered = filtered.filter(p => p.brand === filters.brand);
    }

    if (filters.stockLevel === 'out') {
      filtered = filtered.filter(p => getTotalStock(p) === 0);
    } else if (filters.stockLevel === 'low') {
      filtered = filtered.filter(p => getTotalStock(p) > 0 && (p.is_low_stock || (typeof p.alert_stock === 'number' && getTotalStock(p) < p.alert_stock)));
    } else if (filters.stockLevel === 'normal') {
      filtered = filtered.filter(p => getTotalStock(p) > 0 && !(p.is_low_stock || (typeof p.alert_stock === 'number' && getTotalStock(p) < p.alert_stock)));
    }

    if (filters.store === 'ville_avray') {
      filtered = filtered.filter(p => (Number(p.stock_ville_avray) || 0) > 0);
    } else if (filters.store === 'garches') {
      filtered = filtered.filter(p => (Number(p.stock_garches) || 0) > 0);
    }

    return filtered;
  }, [products, searchQuery, filters]);

  const filteredProducts = useMemo(() => getFilteredProducts(), [getFilteredProducts]);

  // Toggle visibility
  const toggleVisibility = async (id, isVisible) => {
    try {
      await productsAPI.update(id, { is_visible: !isVisible });
      await loadProducts();
      toast.success(isVisible ? 'Produit masqué' : 'Produit affiché');
    } catch (error) {
      console.error(error);
      toast.error('Erreur de mise à jour');
    }
  };

  const handleEdit = (product) => {
    setSelectedProduct(product);
    setShowEditModal(true);
  };

  const exportToCSV = () => {
    const headers = ['Référence', 'Nom', 'Type', 'Marque', 'Prix TTC', 'Stock Ville d\'Avray', 'Stock Garches', 'Stock Total', 'Visible', 'Actif'];
    const rows = filteredProducts.map(p => [
      csvSafe(p.reference),
      csvSafe(p.name),
      csvSafe(p.product_type),
      csvSafe(p.brand || ''),
      p.price_ttc ?? '',
      Number(p.stock_ville_avray) || 0,
      Number(p.stock_garches) || 0,
      getTotalStock(p),
      p.is_visible ? 'Oui' : 'Non',
      p.is_active ? 'Oui' : 'Non'
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `produits_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();

    toast.success('Export CSV réussi');
  };

  const csvSafe = (val) => {
    if (val == null) return '';
    const s = String(val).replace(/\"/g, '""');
    // wrap if contains comma or newline
    return s.includes(',') || s.includes('\n') ? `"${s}"` : s;
  };

  const resetFilters = () => setFilters({ productType: 'all', visibility: 'all', brand: 'all', stockLevel: 'all', store: 'all' });

  const hasActiveFilters = useMemo(() => (
    filters.productType !== 'all' ||
    filters.visibility !== 'all' ||
    filters.brand !== 'all' ||
    filters.stockLevel !== 'all' ||
    filters.store !== 'all'
  ), [filters]);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gestion des Produits & Stocks</h1>
          <p className="text-gray-600 mt-1">{filteredProducts.length} produits affichés sur {products.length}</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={exportToCSV}
            className="flex items-center gap-2 bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg font-semibold hover:bg-gray-50 transition"
          >
            <ArrowDownTrayIcon className="w-5 h-5" />
            Exporter CSV
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
          >
            <PlusIcon className="w-5 h-5" />
            Ajouter un produit
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4">
        <StatCard label="Total produits" value={stats.total} color="blue" />
        <StatCard label="Produits actifs" value={stats.activeProducts} color="green" />
        <StatCard label="Rupture de stock" value={stats.outOfStock} color="red" />
        <StatCard label="Stock faible" value={stats.lowStock} color="yellow" />
        <StatCard label="Stock Ville d'Avray" value={stats.totalStockVilleAvray} color="blue" />
        <StatCard label="Stock Garches" value={stats.totalStockGarches} color="blue" />
        <StatCard label="Valeur totale" value={`${stats.stockValue} €`} color="green" />
      </div>

      {/* Search & Filters */}
      <div className="bg-white rounded-xl shadow-lg p-4 space-y-4">
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher par nom, référence ou code-barre..."
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded ${viewMode === 'list' ? 'bg-white shadow' : ''}`}
              title="Vue liste"
            >
              <ListBulletIcon className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded ${viewMode === 'grid' ? 'bg-white shadow' : ''}`}
              title="Vue grille"
            >
              <ViewColumnsIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <FunnelIcon className="w-5 h-5 text-gray-400" />
            <span className="text-sm font-medium text-gray-700">Filtres:</span>
          </div>

          <select
            value={filters.productType}
            onChange={(e) => setFilters({...filters, productType: e.target.value})}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Tous les types</option>
            <option value="bike">Vélos</option>
            <option value="accessory">Accessoires</option>
            <option value="part">Pièces détachées</option>
            <option value="prestation">Prestations</option>
            <option value="occasion">Occasions</option>
          </select>

          <select
            value={filters.visibility}
            onChange={(e) => setFilters({...filters, visibility: e.target.value})}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Toutes visibilités</option>
            <option value="visible">Visibles</option>
            <option value="hidden">Masqués</option>
          </select>

          <select
            value={filters.brand}
            onChange={(e) => setFilters({...filters, brand: e.target.value})}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Toutes les marques</option>
            {brands.map(brand => (
              <option key={brand} value={brand}>{brand}</option>
            ))}
          </select>

          <select
            value={filters.stockLevel}
            onChange={(e) => setFilters({...filters, stockLevel: e.target.value})}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Tous les niveaux de stock</option>
            <option value="out">Rupture de stock</option>
            <option value="low">Stock faible</option>
            <option value="normal">Stock normal</option>
          </select>

          <select
            value={filters.store}
            onChange={(e) => setFilters({...filters, store: e.target.value})}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Tous les magasins</option>
            <option value="ville_avray">Ville d'Avray uniquement</option>
            <option value="garches">Garches uniquement</option>
          </select>

          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Réinitialiser tous les filtres
            </button>
          )}
        </div>
      </div>

      {/* Products display */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600"></div>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onToggleVisibility={toggleVisibility}
              onEdit={handleEdit}
              getTotalStock={getTotalStock}
            />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Référence</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nom</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Marque</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Prix TTC</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ville d'Avray</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Garches</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Visible</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredProducts.map((product) => (
                  <tr key={product.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{product.reference}</td>
                    <td className="px-6 py-4 text-gray-900">{product.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded-full">
                        {product.product_type}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-600">{product.brand || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap font-semibold text-gray-900">{product.price_ttc} €</td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className="font-semibold text-gray-700">{Number(product.stock_ville_avray) || 0}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className="font-semibold text-gray-700">{Number(product.stock_garches) || 0}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className="font-semibold text-gray-900">{getTotalStock(product)}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => toggleVisibility(product.id, product.is_visible)}
                        className={`px-3 py-1 rounded-full text-sm font-semibold ${
                          product.is_visible ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {product.is_visible ? 'Visible' : 'Masqué'}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => handleEdit(product)}
                        className="text-blue-600 hover:text-blue-700 font-medium"
                        title="Modifier"
                      >
                        <PencilIcon className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-blue-50">
                <tr>
                  <td colSpan="5" className="px-6 py-4 text-right font-bold text-gray-900">
                    TOTAL :
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className="text-lg font-bold text-blue-600">
                      {filteredProducts.reduce((sum, p) => sum + (Number(p.stock_ville_avray) || 0), 0)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className="text-lg font-bold text-blue-600">
                      {filteredProducts.reduce((sum, p) => sum + (Number(p.stock_garches) || 0), 0)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className="text-lg font-bold text-blue-600">
                      {filteredProducts.reduce((sum, p) => sum + getTotalStock(p), 0)}
                    </span>
                  </td>
                  <td colSpan="2"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {!loading && filteredProducts.length === 0 && (
        <div className="bg-white rounded-xl shadow-lg p-12 text-center">
          <p className="text-gray-500 text-lg">Aucun produit ne correspond à vos critères</p>
          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="mt-4 text-blue-600 hover:text-blue-700 font-medium"
            >
              Réinitialiser les filtres
            </button>
          )}
        </div>
      )}

      {showAddModal && <ProductModal onClose={() => setShowAddModal(false)} onSave={loadProducts} />}
      {showEditModal && <ProductModal product={selectedProduct} onClose={() => setShowEditModal(false)} onSave={loadProducts} />}
    </div>
  );
}

// ----- ProductCard -----
function ProductCard({ product, onToggleVisibility, onEdit, getTotalStock }) {
  const totalStock = getTotalStock(product);

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition">
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold text-gray-500 uppercase">{product.reference}</span>
              <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">{product.product_type}</span>
            </div>
            <h3 className="text-lg font-bold text-gray-900 mt-1">{product.name}</h3>
            {product.brand && <p className="text-sm text-gray-600 mt-1">{product.brand}</p>}
          </div>
          <button
            onClick={() => onToggleVisibility(product.id, product.is_visible)}
            className={`px-2 py-1 rounded-full text-xs font-semibold ${
              product.is_visible ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
            }`}
          >
            {product.is_visible ? '👁️' : '🚫'}
          </button>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Prix TTC</span>
            <span className="text-lg font-bold text-gray-900">{product.price_ttc} €</span>
          </div>

          <div className="pt-3 border-t space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">📍 Ville d'Avray</span>
              <span className="font-semibold text-gray-900">{Number(product.stock_ville_avray) || 0}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">📍 Garches</span>
              <span className="font-semibold text-gray-900">{Number(product.stock_garches) || 0}</span>
            </div>
            <div className="flex items-center justify-between pt-2 border-t">
              <span className="text-sm font-medium text-gray-700">Stock Total</span>
              <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                totalStock === 0 ? 'bg-red-100 text-red-800' :
                (product.is_low_stock || (typeof product.alert_stock === 'number' && totalStock < product.alert_stock)) ? 'bg-yellow-100 text-yellow-800' :
                'bg-green-100 text-green-800'
              }`}>
                {totalStock}
              </span>
            </div>
          </div>
        </div>

        <div className="flex gap-2 mt-6 pt-4 border-t">
          <button
            onClick={() => onEdit(product)}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg font-semibold hover:bg-blue-100 transition"
          >
            <PencilIcon className="w-4 h-4" />
            Modifier
          </button>
        </div>
      </div>
    </div>
  );
}

// ----- ProductModal -----
function ProductModal({ product, onClose, onSave }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    reference: product?.reference || '',
    name: product?.name || '',
    description: product?.description || '',
    product_type: product?.product_type || 'bike',
    category: product?.category?.id || '',
    price_ttc: product?.price_ttc ?? '',
    tva_rate: product?.tva_rate ?? 20,
    price_ht: product?.price_ht ?? '',
    stock_ville_avray: product?.stock_ville_avray ?? 0,
    stock_garches: product?.stock_garches ?? 0,
    alert_stock: product?.alert_stock ?? 5,
    barcode: product?.barcode || '',
    brand: product?.brand || '',
    size: product?.size || '',
    weight: product?.weight || '',
    is_visible: product?.is_visible ?? true,
    is_active: product?.is_active ?? true
  });

  // auto-calc HT
  useEffect(() => {
    const ttc = parseFloat(formData.price_ttc);
    const tva = parseFloat(formData.tva_rate);
    if (!isNaN(ttc) && !isNaN(tva)) {
      const ht = (ttc / (1 + tva / 100)).toFixed(2);
      setFormData(prev => ({ ...prev, price_ht: ht }));
    }
  }, [formData.price_ttc, formData.tva_rate]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const dataToSend = {
        ...formData,
        category: formData.category || null,
        barcode: formData.barcode || null,
        weight: formData.weight || null,
        size: formData.size || null,
        price_ttc: formData.price_ttc === '' ? null : Number(formData.price_ttc),
        tva_rate: Number(formData.tva_rate || 0),
        stock_ville_avray: Number(formData.stock_ville_avray || 0),
        stock_garches: Number(formData.stock_garches || 0),
        alert_stock: Number(formData.alert_stock || 0),
        is_visible: Boolean(formData.is_visible),
        is_active: Boolean(formData.is_active)
      };

      if (product) {
        await productsAPI.update(product.id, dataToSend);
        toast.success('Produit mis à jour');
      } else {
        await productsAPI.create(dataToSend);
        toast.success('Produit créé');
      }

      onSave();
      onClose();
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || 'Erreur lors de l\'enregistrement');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-xl max-w-3xl w-full my-8">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-900">{product ? 'Modifier le produit' : 'Ajouter un produit'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><XMarkIcon className="w-6 h-6" /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Référence *</label>
              <input type="text" name="reference" value={formData.reference} onChange={handleChange} required className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Type de produit *</label>
              <select name="product_type" value={formData.product_type} onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                <option value="bike">Vélo</option>
                <option value="accessory">Accessoire</option>
                <option value="part">Pièce détachée</option>
                <option value="prestation">Prestation</option>
                <option value="occasion">Occasion</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Nom du produit *</label>
              <input type="text" name="name" value={formData.name} onChange={handleChange} required className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Code-barres</label>
              <input type="text" name="barcode" value={formData.barcode} onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
            <textarea name="description" value={formData.description} onChange={handleChange} rows="3" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Prix TTC *</label>
              <input type="number" name="price_ttc" value={formData.price_ttc} onChange={handleChange} step="0.01" required className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">TVA (%)</label>
              <input type="number" name="tva_rate" value={formData.tva_rate} onChange={handleChange} step="0.01" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Prix HT (auto)</label>
              <input type="number" name="price_ht" value={formData.price_ht} readOnly className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Stock Ville d'Avray</label>
              <input type="number" name="stock_ville_avray" value={formData.stock_ville_avray} onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Stock Garches</label>
              <input type="number" name="stock_garches" value={formData.stock_garches} onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Seuil d'alerte stock</label>
              <input type="number" name="alert_stock" value={formData.alert_stock} onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Marque</label>
              <input type="text" name="brand" value={formData.brand} onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Taille</label>
              <input type="text" name="size" value={formData.size} onChange={handleChange} placeholder="ex: M, L, 54cm" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Poids (kg)</label>
            <input type="number" name="weight" value={formData.weight} onChange={handleChange} step="0.01" placeholder="ex: 12.5" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
          </div>

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <input type="checkbox" name="is_visible" checked={formData.is_visible} onChange={handleChange} className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500" />
              <label className="text-sm font-medium text-gray-700">Produit visible</label>
            </div>
          </div>

          <div className="flex gap-4 pt-4 border-t">
            <button type="button" onClick={onClose} className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50">Annuler</button>
            <button type="submit" disabled={loading} className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50">{loading ? 'Enregistrement...' : 'Enregistrer'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
