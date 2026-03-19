import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// ============================================================================
// REPPAIRS REDIRECTEUR - VERS MODULE UNIFIÉ
// ============================================================================

// Ce fichier remplace l'ancien Repairs.jsx (1830 lignes)
// Les fonctionnalités uniques ont été migrées dans RepairsModule.jsx :
// - Recherche avancée de clients avec autocomplete
// - Gestion des pièces nécessaires avec recherche produits
// - Impression PDF de bons de réparation
// - Filtrage multiple (statut, magasin, client, date)
// - Validation de formulaire robuste
// - Gestion des notifications toast

export default function Repairs() {
  const navigate = useNavigate();
  
  useEffect(() => {
    // Rediriger vers le module unifié qui contient toutes les fonctionnalités
    navigate('/repairs-module');
  }, [navigate]);
  
  return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <p className="text-gray-600">Redirection vers le module réparations...</p>
        <p className="text-sm text-gray-500 mt-2">
          Toutes les fonctionnalités sont maintenant dans RepairsModule
        </p>
      </div>
    </div>
  );
}
