import React, { useState, useEffect } from 'react';
import { 
  ChartBarIcon, 
  CurrencyEuroIcon, 
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  DocumentArrowDownIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  CalendarIcon
} from '@heroicons/react/24/outline';

export default function Finance() {
  const [sales, setSales] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);

  // Formulaire dépense
  const [newExpense, setNewExpense] = useState({
    category: 'rent',
    description: '',
    amount: 0,
    date: new Date().toISOString().split('T')[0],
    payment_method: 'bank_transfer',
    notes: ''
  });

  // Catégories de dépenses
  const expenseCategories = {
    rent: { label: 'Loyer', icon: '🏠', color: 'blue' },
    salaries: { label: 'Salaires', icon: '💼', color: 'purple' },
    utilities: { label: 'Factures (eau, électricité, internet)', icon: '⚡', color: 'yellow' },
    insurance: { label: 'Assurances', icon: '🛡️', color: 'green' },
    maintenance: { label: 'Entretien & Réparations', icon: '🔧', color: 'orange' },
    marketing: { label: 'Marketing & Publicité', icon: '📢', color: 'pink' },
    other: { label: 'Autres dépenses', icon: '📝', color: 'gray' }
  };

  useEffect(() => {
    loadFinancialData();
  }, [selectedMonth, selectedYear, selectedPeriod]);

  const loadFinancialData = () => {
    // Données de démonstration - Ventes (CA)
    const demoSales = [
      { id: 1, date: '2024-11-05', amount_ht: 800, amount_ttc: 960, type: 'sale' },
      { id: 2, date: '2024-11-08', amount_ht: 1200, amount_ttc: 1440, type: 'sale' },
      { id: 3, date: '2024-11-12', amount_ht: 450, amount_ttc: 540, type: 'sale' },
      { id: 4, date: '2024-11-15', amount_ht: 2500, amount_ttc: 3000, type: 'sale' },
      { id: 5, date: '2024-11-18', amount_ht: 680, amount_ttc: 816, type: 'sale' },
      { id: 6, date: '2024-11-22', amount_ht: 1100, amount_ttc: 1320, type: 'sale' },
      { id: 7, date: '2024-11-25', amount_ht: 890, amount_ttc: 1068, type: 'sale' },
    ];

    // Données de démonstration - Achats
    const demoPurchases = [
      { id: 1, date: '2024-11-01', total_ht: 1250, total_ttc: 1500, supplier: 'Shimano Europe', status: 'received' },
      { id: 2, date: '2024-11-05', total_ht: 2400, total_ttc: 2880, supplier: 'Mavic Distribution', status: 'received' },
      { id: 3, date: '2024-11-10', total_ht: 800, total_ttc: 800, supplier: 'Vélos Occasion Pro', status: 'received' },
      { id: 4, date: '2024-11-20', total_ht: 1800, total_ttc: 2160, supplier: 'Continental France', status: 'received' },
    ];

    // Données de démonstration - Dépenses
    const demoExpenses = [
      { id: 1, category: 'rent', description: 'Loyer Novembre 2024', amount: 1500, date: '2024-11-01', payment_method: 'bank_transfer' },
      { id: 2, category: 'salaries', description: 'Salaire Employé 1', amount: 2200, date: '2024-11-01', payment_method: 'bank_transfer' },
      { id: 3, category: 'salaries', description: 'Salaire Employé 2', amount: 2000, date: '2024-11-01', payment_method: 'bank_transfer' },
      { id: 4, category: 'utilities', description: 'Électricité Octobre', amount: 180, date: '2024-11-05', payment_method: 'bank_transfer' },
      { id: 5, category: 'utilities', description: 'Internet & Téléphone', amount: 120, date: '2024-11-05', payment_method: 'bank_transfer' },
      { id: 6, category: 'insurance', description: 'Assurance locale', amount: 250, date: '2024-11-10', payment_method: 'bank_transfer' },
      { id: 7, category: 'marketing', description: 'Publicité Facebook', amount: 300, date: '2024-11-15', payment_method: 'card' },
      { id: 8, category: 'maintenance', description: 'Réparation vitrine', amount: 450, date: '2024-11-18', payment_method: 'card' },
    ];

    setSales(filterByPeriod(demoSales));
    setPurchases(filterByPeriod(demoPurchases.filter(p => p.status === 'received')));
    setExpenses(filterByPeriod(demoExpenses));
  };

  const filterByPeriod = (data) => {
    return data.filter(item => {
      const itemDate = new Date(item.date);
      const itemMonth = itemDate.getMonth();
      const itemYear = itemDate.getFullYear();

      if (selectedPeriod === 'month') {
        return itemMonth === selectedMonth && itemYear === selectedYear;
      } else if (selectedPeriod === 'year') {
        return itemYear === selectedYear;
      }
      return true;
    });
  };

  // Calculs financiers
  const calculateFinancials = () => {
    // Chiffre d'affaires (ventes HT)
    const ca_ht = sales.reduce((sum, sale) => sum + parseFloat(sale.amount_ht), 0);
    const ca_ttc = sales.reduce((sum, sale) => sum + parseFloat(sale.amount_ttc), 0);

    // Coût des achats (achats reçus)
    const purchases_ht = purchases.reduce((sum, purchase) => sum + parseFloat(purchase.total_ht), 0);
    const purchases_ttc = purchases.reduce((sum, purchase) => sum + parseFloat(purchase.total_ttc), 0);

    // Dépenses opérationnelles
    const total_expenses = expenses.reduce((sum, expense) => sum + parseFloat(expense.amount), 0);

    // Dépenses par catégorie
    const expenses_by_category = {};
    Object.keys(expenseCategories).forEach(cat => {
      expenses_by_category[cat] = expenses
        .filter(e => e.category === cat)
        .reduce((sum, e) => sum + parseFloat(e.amount), 0);
    });

    // Marge brute = CA HT - Coût des achats HT
    const gross_margin = ca_ht - purchases_ht;
    const gross_margin_rate = ca_ht > 0 ? (gross_margin / ca_ht) * 100 : 0;

    // Résultat d'exploitation = Marge brute - Dépenses opérationnelles
    const operating_result = gross_margin - total_expenses;
    const operating_margin_rate = ca_ht > 0 ? (operating_result / ca_ht) * 100 : 0;

    return {
      ca_ht,
      ca_ttc,
      purchases_ht,
      purchases_ttc,
      total_expenses,
      expenses_by_category,
      gross_margin,
      gross_margin_rate,
      operating_result,
      operating_margin_rate
    };
  };

  const financials = calculateFinancials();

  // Ajouter/Modifier une dépense
  const saveExpense = () => {
    if (!newExpense.description || newExpense.amount <= 0) {
      alert('Veuillez remplir tous les champs obligatoires');
      return;
    }

    if (editingExpense) {
      // Modification
      setExpenses(expenses.map(e => 
        e.id === editingExpense.id ? { ...newExpense, id: e.id } : e
      ));
    } else {
      // Création
      const expense = {
        ...newExpense,
        id: expenses.length + 1,
        amount: parseFloat(newExpense.amount)
      };
      setExpenses([...expenses, expense]);
    }

    resetExpenseForm();
    setShowExpenseModal(false);
  };

  const deleteExpense = (id) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cette dépense ?')) {
      setExpenses(expenses.filter(e => e.id !== id));
    }
  };

  const editExpense = (expense) => {
    setEditingExpense(expense);
    setNewExpense({ ...expense });
    setShowExpenseModal(true);
  };

  const resetExpenseForm = () => {
    setNewExpense({
      category: 'rent',
      description: '',
      amount: 0,
      date: new Date().toISOString().split('T')[0],
      payment_method: 'bank_transfer',
      notes: ''
    });
    setEditingExpense(null);
  };

  // Export P&L en CSV
  const exportPL = () => {
    const periodLabel = selectedPeriod === 'month' 
      ? `${getMonthName(selectedMonth)} ${selectedYear}`
      : `Année ${selectedYear}`;

    let csv = `COMPTE DE RÉSULTAT (P&L)\n`;
    csv += `Période: ${periodLabel}\n`;
    csv += `Date d'export: ${new Date().toLocaleDateString('fr-FR')}\n\n`;

    csv += `\nREVENUS\n`;
    csv += `Chiffre d'affaires HT,${financials.ca_ht.toFixed(2)}\n`;
    csv += `Chiffre d'affaires TTC,${financials.ca_ttc.toFixed(2)}\n\n`;

    csv += `\nCOÛT DES ACHATS\n`;
    csv += `Achats de marchandises HT,${financials.purchases_ht.toFixed(2)}\n`;
    csv += `Achats de marchandises TTC,${financials.purchases_ttc.toFixed(2)}\n\n`;

    csv += `\nMARGE BRUTE\n`;
    csv += `Marge brute (CA HT - Achats HT),${financials.gross_margin.toFixed(2)}\n`;
    csv += `Taux de marge brute,${financials.gross_margin_rate.toFixed(2)}%\n\n`;

    csv += `\nCHARGES D'EXPLOITATION\n`;
    Object.keys(expenseCategories).forEach(cat => {
      const amount = financials.expenses_by_category[cat];
      if (amount > 0) {
        csv += `${expenseCategories[cat].label},${amount.toFixed(2)}\n`;
      }
    });
    csv += `Total des charges,${financials.total_expenses.toFixed(2)}\n\n`;

    csv += `\nRÉSULTAT\n`;
    csv += `Résultat d'exploitation,${financials.operating_result.toFixed(2)}\n`;
    csv += `Taux de marge opérationnelle,${financials.operating_margin_rate.toFixed(2)}%\n\n`;

    csv += `\nDÉTAIL DES VENTES\n`;
    csv += `Date,Montant HT,Montant TTC\n`;
    sales.forEach(sale => {
      csv += `${new Date(sale.date).toLocaleDateString('fr-FR')},${sale.amount_ht.toFixed(2)},${sale.amount_ttc.toFixed(2)}\n`;
    });

    csv += `\n\nDÉTAIL DES ACHATS\n`;
    csv += `Date,Fournisseur,Montant HT,Montant TTC\n`;
    purchases.forEach(purchase => {
      csv += `${new Date(purchase.date).toLocaleDateString('fr-FR')},${purchase.supplier},${purchase.total_ht.toFixed(2)},${purchase.total_ttc.toFixed(2)}\n`;
    });

    csv += `\n\nDÉTAIL DES DÉPENSES\n`;
    csv += `Date,Catégorie,Description,Montant\n`;
    expenses.forEach(expense => {
      csv += `${new Date(expense.date).toLocaleDateString('fr-FR')},${expenseCategories[expense.category].label},"${expense.description}",${expense.amount.toFixed(2)}\n`;
    });

    // Télécharger le fichier
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `P&L_${periodLabel.replace(/ /g, '_')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getMonthName = (month) => {
    const months = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 
                    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
    return months[month];
  };

  const getCategoryColor = (category) => {
    const colors = {
      blue: 'bg-blue-100 text-blue-800 border-blue-300',
      purple: 'bg-purple-100 text-purple-800 border-purple-300',
      yellow: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      green: 'bg-green-100 text-green-800 border-green-300',
      orange: 'bg-orange-100 text-orange-800 border-orange-300',
      pink: 'bg-pink-100 text-pink-800 border-pink-300',
      gray: 'bg-gray-100 text-gray-800 border-gray-300'
    };
    return colors[expenseCategories[category]?.color] || colors.gray;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50">
      <div className="p-6 max-w-7xl mx-auto">
        {/* En-tête */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-purple-500 to-blue-600 rounded-xl shadow-lg">
                <ChartBarIcon className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                  Finance & P&L
                </h1>
                <p className="text-gray-600 mt-1">Suivi comptable et compte de résultat</p>
              </div>
            </div>

            <button
              onClick={exportPL}
              className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl hover:shadow-lg transition-all font-medium flex items-center gap-2"
            >
              <DocumentArrowDownIcon className="h-5 w-5" />
              Exporter P&L
            </button>
          </div>
        </div>

        {/* Sélection de période */}
        <div className="bg-white rounded-2xl shadow-lg p-4 mb-6 border border-gray-100">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5 text-gray-600" />
              <span className="font-medium text-gray-700">Période:</span>
            </div>

            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="px-4 py-2 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none font-medium"
            >
              <option value="month">Mensuel</option>
              <option value="year">Annuel</option>
            </select>

            {selectedPeriod === 'month' && (
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                className="px-4 py-2 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none font-medium"
              >
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i} value={i}>{getMonthName(i)}</option>
                ))}
              </select>
            )}

            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="px-4 py-2 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none font-medium"
            >
              {Array.from({ length: 5 }, (_, i) => {
                const year = new Date().getFullYear() - i;
                return <option key={year} value={year}>{year}</option>;
              })}
            </select>
          </div>
        </div>

        {/* KPIs principaux */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-6 rounded-2xl shadow-lg border-l-4 border-green-500 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <div className="p-3 bg-green-100 rounded-xl">
                <ArrowTrendingUpIcon className="h-6 w-6 text-green-600" />
              </div>
              <div className="text-right">
                <div className="text-sm font-medium text-gray-600">Chiffre d'affaires HT</div>
                <div className="text-3xl font-bold text-green-600">{financials.ca_ht.toFixed(2)}€</div>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-lg border-l-4 border-orange-500 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <div className="p-3 bg-orange-100 rounded-xl">
                <ArrowTrendingDownIcon className="h-6 w-6 text-orange-600" />
              </div>
              <div className="text-right">
                <div className="text-sm font-medium text-gray-600">Achats HT</div>
                <div className="text-3xl font-bold text-orange-600">{financials.purchases_ht.toFixed(2)}€</div>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-lg border-l-4 border-blue-500 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <div className="p-3 bg-blue-100 rounded-xl">
                <CurrencyEuroIcon className="h-6 w-6 text-blue-600" />
              </div>
              <div className="text-right">
                <div className="text-sm font-medium text-gray-600">Marge brute</div>
                <div className="text-3xl font-bold text-blue-600">{financials.gross_margin.toFixed(2)}€</div>
                <div className="text-xs text-gray-500 mt-1">{financials.gross_margin_rate.toFixed(1)}%</div>
              </div>
            </div>
          </div>

          <div className={`bg-white p-6 rounded-2xl shadow-lg border-l-4 ${financials.operating_result >= 0 ? 'border-purple-500' : 'border-red-500'} hover:shadow-xl transition-shadow`}>
            <div className="flex items-center justify-between mb-3">
              <div className={`p-3 rounded-xl ${financials.operating_result >= 0 ? 'bg-purple-100' : 'bg-red-100'}`}>
                <ChartBarIcon className={`h-6 w-6 ${financials.operating_result >= 0 ? 'text-purple-600' : 'text-red-600'}`} />
              </div>
              <div className="text-right">
                <div className="text-sm font-medium text-gray-600">Résultat</div>
                <div className={`text-3xl font-bold ${financials.operating_result >= 0 ? 'text-purple-600' : 'text-red-600'}`}>
                  {financials.operating_result.toFixed(2)}€
                </div>
                <div className="text-xs text-gray-500 mt-1">{financials.operating_margin_rate.toFixed(1)}%</div>
              </div>
            </div>
          </div>
        </div>

        {/* P&L détaillé */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Compte de résultat */}
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <ChartBarIcon className="h-6 w-6 text-purple-600" />
              Compte de Résultat (P&L)
            </h2>

            <div className="space-y-4">
              {/* Revenus */}
              <div className="border-b-2 border-gray-100 pb-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-bold text-gray-900">REVENUS</span>
                </div>
                <div className="flex justify-between items-center pl-4">
                  <span className="text-gray-700">Chiffre d'affaires HT</span>
                  <span className="font-semibold text-green-600">{financials.ca_ht.toFixed(2)}€</span>
                </div>
              </div>

              {/* Coût des ventes */}
              <div className="border-b-2 border-gray-100 pb-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-bold text-gray-900">COÛT DES VENTES</span>
                </div>
                <div className="flex justify-between items-center pl-4">
                  <span className="text-gray-700">Achats de marchandises HT</span>
                  <span className="font-semibold text-orange-600">-{financials.purchases_ht.toFixed(2)}€</span>
                </div>
              </div>

              {/* Marge brute */}
              <div className="bg-blue-50 rounded-xl p-3 border-2 border-blue-200">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-gray-900">MARGE BRUTE</span>
                  <div className="text-right">
                    <div className="font-bold text-blue-600">{financials.gross_margin.toFixed(2)}€</div>
                    <div className="text-xs text-gray-600">{financials.gross_margin_rate.toFixed(1)}%</div>
                  </div>
                </div>
              </div>

              {/* Charges d'exploitation */}
              <div className="border-b-2 border-gray-100 pb-4">
                <div className="flex justify-between items-center mb-3">
                  <span className="font-bold text-gray-900">CHARGES D'EXPLOITATION</span>
                </div>
                {Object.keys(expenseCategories).map(cat => {
                  const amount = financials.expenses_by_category[cat];
                  if (amount > 0) {
                    return (
                      <div key={cat} className="flex justify-between items-center pl-4 py-1">
                        <span className="text-gray-700 flex items-center gap-2">
                          <span>{expenseCategories[cat].icon}</span>
                          {expenseCategories[cat].label}
                        </span>
                        <span className="font-semibold text-red-600">-{amount.toFixed(2)}€</span>
                      </div>
                    );
                  }
                  return null;
                })}
                <div className="flex justify-between items-center pl-4 pt-2 mt-2 border-t border-gray-200">
                  <span className="font-semibold text-gray-900">Total des charges</span>
                  <span className="font-bold text-red-600">-{financials.total_expenses.toFixed(2)}€</span>
                </div>
              </div>

              {/* Résultat final */}
              <div className={`rounded-xl p-4 border-2 ${financials.operating_result >= 0 ? 'bg-purple-50 border-purple-200' : 'bg-red-50 border-red-200'}`}>
                <div className="flex justify-between items-center">
                  <span className="font-bold text-xl text-gray-900">RÉSULTAT D'EXPLOITATION</span>
                  <div className="text-right">
                    <div className={`font-bold text-3xl ${financials.operating_result >= 0 ? 'text-purple-600' : 'text-red-600'}`}>
                      {financials.operating_result.toFixed(2)}€
                    </div>
                    <div className="text-sm text-gray-600 mt-1">{financials.operating_margin_rate.toFixed(1)}% du CA</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Répartition des dépenses */}
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <CurrencyEuroIcon className="h-6 w-6 text-blue-600" />
                Dépenses par catégorie
              </h2>
              <button
                onClick={() => {
                  resetExpenseForm();
                  setShowExpenseModal(true);
                }}
                className="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl hover:shadow-lg transition-all font-medium flex items-center gap-2"
              >
                <PlusIcon className="h-5 w-5" />
                Nouvelle dépense
              </button>
            </div>

            <div className="space-y-3 mb-6">
              {Object.keys(expenseCategories).map(cat => {
                const amount = financials.expenses_by_category[cat];
                const percentage = financials.total_expenses > 0 ? (amount / financials.total_expenses) * 100 : 0;
                
                return (
                  <div key={cat} className="bg-gray-50 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{expenseCategories[cat].icon}</span>
                        <span className="font-semibold text-gray-900">{expenseCategories[cat].label}</span>
                      </div>
                      <span className="font-bold text-gray-900">{amount.toFixed(2)}€</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full bg-gradient-to-r from-${expenseCategories[cat].color}-400 to-${expenseCategories[cat].color}-600`}
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                    <div className="text-xs text-gray-600 mt-1">{percentage.toFixed(1)}% du total</div>
                  </div>
                );
              })}
            </div>

            <div className="border-t-2 border-gray-200 pt-4">
              <div className="flex justify-between items-center">
                <span className="text-lg font-bold text-gray-900">Total des dépenses</span>
                <span className="text-2xl font-bold text-red-600">{financials.total_expenses.toFixed(2)}€</span>
              </div>
            </div>
          </div>
        </div>

        {/* Liste des dépenses */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-2xl font-bold text-gray-900">Détail des dépenses</h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-purple-600 to-blue-600 text-white">
                <tr>
                  <th className="px-6 py-4 text-left font-bold">Date</th>
                  <th className="px-6 py-4 text-left font-bold">Catégorie</th>
                  <th className="px-6 py-4 text-left font-bold">Description</th>
                  <th className="px-6 py-4 text-right font-bold">Montant</th>
                  <th className="px-6 py-4 text-center font-bold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {expenses.map((expense) => (
                  <tr key={expense.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-gray-700">
                      {new Date(expense.date).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold border ${getCategoryColor(expense.category)}`}>
                        <span>{expenseCategories[expense.category].icon}</span>
                        {expenseCategories[expense.category].label}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-900">{expense.description}</td>
                    <td className="px-6 py-4 text-right font-bold text-red-600">
                      {parseFloat(expense.amount).toFixed(2)}€
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => editExpense(expense)}
                          className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                          title="Modifier"
                        >
                          <PencilIcon className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => deleteExpense(expense.id)}
                          className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                          title="Supprimer"
                        >
                          <TrashIcon className="h-5 w-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {expenses.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <CurrencyEuroIcon className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">Aucune dépense enregistrée</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal ajout/modification dépense */}
      {showExpenseModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl">
            <div className="p-8">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-gradient-to-br from-purple-500 to-blue-600 rounded-2xl shadow-lg">
                    <CurrencyEuroIcon className="h-7 w-7 text-white" />
                  </div>
                  <div>
                    <h2 className="text-3xl font-bold text-gray-900">
                      {editingExpense ? 'Modifier la dépense' : 'Nouvelle dépense'}
                    </h2>
                    <p className="text-gray-500 mt-1">Saisissez les informations de la dépense</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowExpenseModal(false);
                    resetExpenseForm();
                  }}
                  className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl p-2 transition-all"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Catégorie *</label>
                    <select
                      value={newExpense.category}
                      onChange={(e) => setNewExpense({ ...newExpense, category: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
                    >
                      {Object.keys(expenseCategories).map(cat => (
                        <option key={cat} value={cat}>
                          {expenseCategories[cat].icon} {expenseCategories[cat].label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Date *</label>
                    <input
                      type="date"
                      value={newExpense.date}
                      onChange={(e) => setNewExpense({ ...newExpense, date: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Description *</label>
                  <input
                    type="text"
                    value={newExpense.description}
                    onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
                    placeholder="Ex: Loyer Novembre 2024"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Montant *</label>
                    <input
                      type="number"
                      step="0.01"
                      value={newExpense.amount}
                      onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
                      placeholder="0.00"
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Mode de paiement</label>
                    <select
                      value={newExpense.payment_method}
                      onChange={(e) => setNewExpense({ ...newExpense, payment_method: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
                    >
                      <option value="bank_transfer">Virement bancaire</option>
                      <option value="card">Carte bancaire</option>
                      <option value="cash">Espèces</option>
                      <option value="check">Chèque</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Notes (optionnel)</label>
                  <textarea
                    value={newExpense.notes}
                    onChange={(e) => setNewExpense({ ...newExpense, notes: e.target.value })}
                    rows={3}
                    placeholder="Notes additionnelles..."
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
                  ></textarea>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-8 pt-6 border-t-2 border-gray-100">
                <button
                  onClick={() => {
                    setShowExpenseModal(false);
                    resetExpenseForm();
                  }}
                  className="px-6 py-3 border-2 border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 font-medium transition-all"
                >
                  Annuler
                </button>
                <button
                  onClick={saveExpense}
                  className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl hover:shadow-lg font-medium transition-all"
                >
                  {editingExpense ? 'Modifier' : 'Enregistrer'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}