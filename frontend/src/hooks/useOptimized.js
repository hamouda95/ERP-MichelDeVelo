/**
 * ============================================================================ 
 * HOOKS OPTIMISÉS - PERFORMANCE ET UTILISATION
 * ============================================================================ 
 * 
 * Hooks personnalisés pour optimiser les performances :
 * - useApi : Hook unifié pour les appels API
 * - useCache : Hook de gestion de cache
 * - useDebounce : Hook pour debounce des recherches
 * - useLocalStorage : Hook pour le stockage local
 * 
 * ============================================================================ 
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';

// ============================================
// HOOK API UNIFIÉ
// ============================================

export const useApi = (apiFunction, options = {}) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastFetched, setLastFetched] = useState(null);
  
  const {
    immediate = true,
    dependencies = [],
    onSuccess,
    onError,
    cacheKey,
    cacheTTL = 5 * 60 * 1000, // 5 minutes
    retryCount = 0,
    retryDelay = 1000
  } = options;
  
  const retryTimeoutRef = useRef(null);
  const abortControllerRef = useRef(null);
  
  const execute = useCallback(async (...args) => {
    // Annuler la requête précédente
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    abortControllerRef.current = new AbortController();
    
    setLoading(true);
    setError(null);
    
    try {
      const result = await apiFunction(...args);
      setData(result);
      setLastFetched(Date.now());
      
      if (onSuccess) {
        onSuccess(result);
      }
      
      return result;
    } catch (err) {
      setError(err);
      
      if (onError) {
        onError(err);
      }
      
      // Retry logic
      if (retryCount > 0 && !err.message?.includes('401')) {
        retryTimeoutRef.current = setTimeout(() => {
          execute(...args);
        }, retryDelay);
      }
      
      throw err;
    } finally {
      setLoading(false);
    }
  }, [apiFunction, onSuccess, onError, retryCount, retryDelay]);
  
  useEffect(() => {
    if (immediate) {
      execute();
    }
    
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, dependencies);
  
  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setLoading(false);
    setLastFetched(null);
  }, []);
  
  return {
    data,
    loading,
    error,
    execute,
    reset,
    lastFetched
  };
};

// ============================================
// HOOK CACHE
// ============================================

export const useCache = (key, ttl = 5 * 60 * 1000) => {
  const [cache, setCache] = useState(() => {
    const stored = localStorage.getItem(`cache_${key}`);
    if (stored) {
      const { data, timestamp } = JSON.parse(stored);
      if (Date.now() - timestamp < ttl) {
        return data;
      }
    }
    return null;
  });
  
  const setCacheData = useCallback((data) => {
    const cacheData = {
      data,
      timestamp: Date.now()
    };
    localStorage.setItem(`cache_${key}`, JSON.stringify(cacheData));
    setCache(data);
  }, [key]);
  
  const clearCache = useCallback(() => {
    localStorage.removeItem(`cache_${key}`);
    setCache(null);
  }, [key]);
  
  const isExpired = useCallback(() => {
    const stored = localStorage.getItem(`cache_${key}`);
    if (stored) {
      const { timestamp } = JSON.parse(stored);
      return Date.now() - timestamp >= ttl;
    }
    return true;
  }, [key, ttl]);
  
  return {
    cache,
    setCache: setCacheData,
    clearCache,
    isExpired
  };
};

// ============================================
// HOOK DEBOUNCE
// ============================================

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

// ============================================
// HOOK LOCAL STORAGE
// ============================================

export const useLocalStorage = (key, initialValue) => {
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });
  
  const setValue = useCallback((value) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error);
    }
  }, [key, storedValue]);
  
  const removeValue = useCallback(() => {
    try {
      setStoredValue(initialValue);
      window.localStorage.removeItem(key);
    } catch (error) {
      console.error(`Error removing localStorage key "${key}":`, error);
    }
  }, [key, initialValue]);
  
  return [storedValue, setValue, removeValue];
};

// ============================================
// HOOK INFINITE SCROLL
// ============================================

export const useInfiniteScroll = (apiFunction, options = {}) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [error, setError] = useState(null);
  
  const {
    pageSize = 20,
    dependencies = [],
    onSuccess,
    onError
  } = options;
  
  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const result = await apiFunction({
        page,
        page_size: pageSize
      });
      
      const newData = result.results || result;
      
      if (newData.length < pageSize) {
        setHasMore(false);
      }
      
      setData(prev => page === 1 ? newData : [...prev, ...newData]);
      setPage(prev => prev + 1);
      
      if (onSuccess) {
        onSuccess(newData, page);
      }
    } catch (err) {
      setError(err);
      if (onError) {
        onError(err);
      }
    } finally {
      setLoading(false);
    }
  }, [apiFunction, loading, hasMore, page, pageSize, onSuccess, onError]);
  
  const reset = useCallback(() => {
    setData([]);
    setPage(1);
    setHasMore(true);
    setError(null);
  }, []);
  
  useEffect(() => {
    reset();
    loadMore();
  }, dependencies);
  
  return {
    data,
    loading,
    hasMore,
    error,
    loadMore,
    reset
  };
};

// ============================================
// HOOK FORM VALIDATION
// ============================================

export const useForm = (initialValues, validationSchema) => {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const setValue = useCallback((name, value) => {
    setValues(prev => ({ ...prev, [name]: value }));
  }, []);
  
  const setTouchedField = useCallback((name) => {
    setTouched(prev => ({ ...prev, [name]: true }));
  }, []);
  
  const validateField = useCallback((name, value) => {
    if (!validationSchema || !validationSchema[name]) {
      return '';
    }
    
    const validator = validationSchema[name];
    const error = validator(value);
    return error || '';
  }, [validationSchema]);
  
  const validateForm = useCallback(() => {
    if (!validationSchema) return true;
    
    const newErrors = {};
    let isValid = true;
    
    Object.keys(validationSchema).forEach(field => {
      const error = validateField(field, values[field]);
      if (error) {
        newErrors[field] = error;
        isValid = false;
      }
    });
    
    setErrors(newErrors);
    return isValid;
  }, [validationSchema, validateField, values]);
  
  const handleChange = useCallback((e) => {
    const { name, value, type, checked } = e.target;
    const fieldValue = type === 'checkbox' ? checked : value;
    
    setValue(name, fieldValue);
    
    if (touched[name]) {
      const error = validateField(name, fieldValue);
      setErrors(prev => ({ ...prev, [name]: error }));
    }
  }, [setValue, touched, validateField]);
  
  const handleBlur = useCallback((e) => {
    const { name } = e.target;
    setTouchedField(name);
    
    const error = validateField(name, values[name]);
    setErrors(prev => ({ ...prev, [name]: error }));
  }, [setTouchedField, validateField, values]);
  
  const handleSubmit = useCallback(async (onSubmit) => {
    setIsSubmitting(true);
    
    const isValid = validateForm();
    
    if (isValid) {
      try {
        await onSubmit(values);
      } catch (error) {
        console.error('Form submission error:', error);
      }
    }
    
    setIsSubmitting(false);
  }, [validateForm, values]);
  
  const reset = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
    setIsSubmitting(false);
  }, [initialValues]);
  
  return {
    values,
    errors,
    touched,
    isSubmitting,
    handleChange,
    handleBlur,
    handleSubmit,
    setValue,
    setTouchedField,
    validateForm,
    reset
  };
};

// ============================================
// HOOK PERFORMANCE
// ============================================

export const usePerformance = (name) => {
  const startTime = useRef(Date.now());
  
  useEffect(() => {
    const endTime = Date.now();
    console.log(`${name} took ${endTime - startTime.current}ms`);
  }, [name]);
  
  return startTime.current;
};

// ============================================
// HOOK MEDIA QUERY
// ============================================

export const useMediaQuery = (query) => {
  const [matches, setMatches] = useState(false);
  
  useEffect(() => {
    const media = window.matchMedia(query);
    setMatches(media.matches);
    
    const listener = (e) => setMatches(e.matches);
    media.addEventListener('change', listener);
    
    return () => media.removeEventListener('change', listener);
  }, [query]);
  
  return matches;
};

// ============================================
// HOOK PREVIOUS VALUE
// ============================================

export const usePrevious = (value) => {
  const ref = useRef();
  useEffect(() => {
    ref.current = value;
  });
  return ref.current;
};
