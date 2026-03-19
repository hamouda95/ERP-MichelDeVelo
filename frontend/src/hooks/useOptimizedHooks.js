/**
 * Hook personnalisé pour le debounce des recherches
 * Évite les appels API multiples lors de la saisie
 */
import { useState, useEffect, useCallback } from 'react';

export const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

/**
 * Hook pour la recherche avec cache local
 * Améliore les performances en évitant les requêtes répétitives
 */
export const useSearchWithCache = (searchFunction, cacheKey = 'search_cache') => {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [cache, setCache] = useState({});

  const debouncedSearchTerm = useDebounce('', 300);

  const search = useCallback(async (searchTerm) => {
    if (searchTerm.length < 2) {
      setResults([]);
      return;
    }

    // Vérifier le cache
    const cacheKey = `${cacheKey}_${searchTerm}`;
    if (cache[cacheKey]) {
      setResults(cache[cacheKey]);
      return;
    }

    setLoading(true);
    try {
      const response = await searchFunction(searchTerm);
      const newResults = response.data.results || [];
      
      // Mettre en cache
      setCache(prev => ({ ...prev, [cacheKey]: newResults }));
      setResults(newResults);
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [searchFunction, cacheKey]);

  return { results, loading, search };
};

/**
 * Hook pour la gestion des formulaires avec validation
 * Centralise la logique de validation et d'erreurs
 */
export const useFormWithValidation = (initialValues, validationRules = {}) => {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  const validate = useCallback((fieldValues = values) => {
    const newErrors = {};
    
    Object.keys(validationRules).forEach(field => {
      const rules = validationRules[field];
      const value = fieldValues[field];
      
      if (rules.required && (!value || (typeof value === 'string' && value.trim() === ''))) {
        newErrors[field] = 'Ce champ est obligatoire';
      } else if (rules.minLength && value && value.length < rules.minLength) {
        newErrors[field] = `Minimum ${rules.minLength} caractères requis`;
      } else if (rules.email && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        newErrors[field] = 'Format d\'email invalide';
      } else if (rules.phone && value && !/^(?:\+?\d{1,3}[-.\s]?)?\d{10,14}$/.test(value)) {
        newErrors[field] = 'Format de téléphone invalide';
      } else if (rules.positiveNumber && value && parseFloat(value) <= 0) {
        newErrors[field] = 'Le montant doit être positif';
      }
    });
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [values, validationRules]);

  const setValue = useCallback((field, value) => {
    setValues(prev => ({ ...prev, [field]: value }));
    setTouched(prev => ({ ...prev, [field]: true }));
    
    // Valider le champ modifié
    validate({ ...values, [field]: value });
  }, [values, validate]);

  const setValues = useCallback((newValues) => {
    setValues(newValues);
    setTouched(Object.keys(newValues).reduce((acc, field) => ({ ...acc, [field]: true }), {}));
    validate(newValues);
  }, [validate]);

  const resetForm = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
  }, [initialValues]);

  const isValid = Object.keys(errors).length === 0;

  return {
    values,
    errors,
    touched,
    isValid,
    setValue,
    setValues,
    resetForm,
    validate
  };
};

/**
 * Hook pour la gestion du mode hors ligne
 * Détecte la connexion et gère le cache offline
 */
export const useOfflineMode = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [offlineActions, setOfflineActions] = useState([]);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Synchroniser les actions offline quand on retrouve la connexion
  useEffect(() => {
    if (isOnline && offlineActions.length > 0) {
      // TODO: Implémenter la synchronisation avec le backend
      console.log('Syncing offline actions:', offlineActions);
      setOfflineActions([]);
    }
  }, [isOnline, offlineActions]);

  const addOfflineAction = useCallback((action) => {
    setOfflineActions(prev => [...prev, { ...action, timestamp: Date.now() }]);
  }, []);

  return {
    isOnline,
    offlineActions,
    addOfflineAction
  };
};

/**
 * Hook pour les notifications locales
 * Affiche des notifications même en mode hors ligne
 */
export const useLocalNotifications = () => {
  const [permission, setPermission] = useState('default');

  useEffect(() => {
    if ('Notification' in window) {
      Notification.requestPermission().then(setPermission);
    }
  }, []);

  const showNotification = useCallback((title, body, icon = null) => {
    if (permission === 'granted') {
      new Notification(title, {
        body,
        icon: icon || '/favicon.ico',
        badge: '/favicon.ico',
        tag: 'erp-notification'
      });
    }
  }, [permission]);

  const scheduleNotification = useCallback((title, body, delay) => {
    setTimeout(() => {
      showNotification(title, body);
    }, delay);
  }, [showNotification]);

  return {
    permission,
    showNotification,
    scheduleNotification
  };
};

/**
 * Hook pour la gestion du clavier (accessibilité)
 * Améliore l'accessibilité au clavier
 */
export const useKeyboardNavigation = (items, onSelect) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    const handleKeyDown = (event) => {
      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault();
          setSelectedIndex(prev => (prev + 1) % items.length);
          break;
        case 'ArrowUp':
          event.preventDefault();
          setSelectedIndex(prev => (prev - 1 + items.length) % items.length);
          break;
        case 'Enter':
        case ' ':
          event.preventDefault();
          if (items[selectedIndex]) {
            onSelect(items[selectedIndex]);
          }
          break;
        case 'Escape':
          event.preventDefault();
          // Fermer la modale ou annuler l'action
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [items, selectedIndex, onSelect]);

  useEffect(() => {
    if (items[selectedIndex]) {
      onSelect(items[selectedIndex]);
    }
  }, [selectedIndex, items, onSelect]);

  return {
    selectedIndex,
    setSelectedIndex,
    focusedItem: items[selectedIndex]
  };
};
