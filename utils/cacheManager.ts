// Cache management utilities for handling browser and service worker caches

export interface CacheInvalidationOptions {
  clearLocalStorage?: boolean;
  clearSessionStorage?: boolean;
  clearServiceWorker?: boolean;
  reloadData?: boolean;
}

// Clear all browser caches
export const clearAllCaches = async (options: CacheInvalidationOptions = {}) => {
  const {
    clearLocalStorage = false,
    clearSessionStorage = false,
    clearServiceWorker = true,
    reloadData = false
  } = options;


  // Clear localStorage if requested
  if (clearLocalStorage) {
    localStorage.clear();
  }

  // Clear sessionStorage if requested
  if (clearSessionStorage) {
    sessionStorage.clear();
  }

  // Clear service worker caches
  if (clearServiceWorker && 'serviceWorker' in navigator && 'caches' in window) {
    try {
      // Unregister all service workers
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const registration of registrations) {
        await registration.unregister();
      }

      // Clear all cache storage
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map(name => caches.delete(name)));
    } catch (error) {
      // Service worker cache clearing failed - continue silently
    }
  }

  // Trigger page reload if requested
  if (reloadData) {
    window.location.reload();
  }
};

// Add cache-busting parameter to URLs
export const addCacheBusting = (url: string): string => {
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}_t=${Date.now()}`;
};

// Force refresh all data by clearing caches and reloading
export const forceRefresh = async () => {
  await clearAllCaches({
    clearServiceWorker: true,
    reloadData: true
  });
};

// Check if browser supports cache APIs
export const getCacheSupport = () => {
  return {
    serviceWorker: 'serviceWorker' in navigator,
    caches: 'caches' in window,
    localStorage: typeof localStorage !== 'undefined',
    sessionStorage: typeof sessionStorage !== 'undefined'
  };
};

// Get cache statistics
export const getCacheStats = async () => {
  const stats = {
    localStorage: 0,
    sessionStorage: 0,
    cacheStorage: 0,
    serviceWorkers: 0
  };

  // Calculate localStorage size
  if (typeof localStorage !== 'undefined') {
    let lsSize = 0;
    for (const key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        lsSize += localStorage[key].length;
      }
    }
    stats.localStorage = lsSize;
  }

  // Calculate sessionStorage size
  if (typeof sessionStorage !== 'undefined') {
    let ssSize = 0;
    for (const key in sessionStorage) {
      if (sessionStorage.hasOwnProperty(key)) {
        ssSize += sessionStorage[key].length;
      }
    }
    stats.sessionStorage = ssSize;
  }

  // Calculate cache storage size
  if ('caches' in window) {
    try {
      const cacheNames = await caches.keys();
      for (const name of cacheNames) {
        const cache = await caches.open(name);
        const keys = await cache.keys();
        stats.cacheStorage += keys.length;
      }
    } catch (error) {
      // Cache storage size calculation failed - continue silently
    }
  }

  // Count service workers
  if ('serviceWorker' in navigator) {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      stats.serviceWorkers = registrations.length;
    } catch (error) {
      // Service worker counting failed - continue silently
    }
  }

  return stats;
};