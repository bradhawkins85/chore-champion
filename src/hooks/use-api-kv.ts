/**
 * API-based KV storage hook
 * Provides the same interface as @github/spark useKV but uses the backend API
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';

// API base URL from environment or default to /api
const API_URL = import.meta.env.VITE_API_URL || '/api';

// Event emitter for auth token changes
const authTokenListeners = new Set<() => void>();

// Event emitter for manual data refresh requests
const refreshListeners = new Set<() => void>();

/**
 * Triggers all active useApiKV hooks to re-fetch their data from the API.
 * Call this when navigating between pages to ensure fresh data is displayed.
 */
export function refreshAllKVData() {
  refreshListeners.forEach(listener => listener());
}

// Track if API is available
let apiAvailable: boolean | null = null;
let apiCheckTimestamp: number | null = null;
const API_RECHECK_INTERVAL_MS = 30000; // Recheck API availability every 30 seconds if it was previously unavailable

function resetApiAvailability() {
  apiAvailable = null;
  apiCheckTimestamp = null;
}

// Notify all listeners when auth token changes
function notifyAuthTokenChange() {
  resetApiAvailability();
  authTokenListeners.forEach(listener => listener());
}

// Get auth token from localStorage
function getAuthToken(): string | null {
  return localStorage.getItem('auth_token');
}

// Get auth headers if token exists
function getAuthHeaders(): HeadersInit {
  const token = getAuthToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json'
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

// Override localStorage.setItem to detect auth token changes
// Note: This override is specifically for the 'auth_token' key to enable
// automatic data refresh after login. It's a minimal, targeted approach that
// avoids requiring changes to AuthContext or other parts of the codebase.
// The notification is deferred with setTimeout to prevent nested calls.
const originalSetItem = localStorage.setItem.bind(localStorage);
localStorage.setItem = function(key: string, value: string) {
  originalSetItem(key, value);
  if (key === 'auth_token') {
    // Defer notification to avoid nested calls and allow setState to complete
    setTimeout(() => notifyAuthTokenChange(), 0);
  }
};

// Override localStorage.removeItem to detect auth token removal
const originalRemoveItem = localStorage.removeItem.bind(localStorage);
localStorage.removeItem = function(key: string) {
  originalRemoveItem(key);
  if (key === 'auth_token') {
    // Defer notification to avoid nested calls
    setTimeout(() => notifyAuthTokenChange(), 0);
  }
};

// Request queue to throttle concurrent API requests
interface QueuedRequest {
  execute: () => Promise<void>;
  resolve: () => void;
  reject: (error: Error) => void;
}

const requestQueue: QueuedRequest[] = [];
let activeRequests = 0;
const MAX_CONCURRENT_REQUESTS = 5; // Limit concurrent requests to avoid overwhelming the server

// Process queued requests
function processQueue() {
  // Process requests to fill up to MAX_CONCURRENT_REQUESTS slots
  while (activeRequests < MAX_CONCURRENT_REQUESTS && requestQueue.length > 0) {
    const request = requestQueue.shift();
    if (!request) break; // Guard against race conditions

    activeRequests++;
    
    // Execute request without await to allow concurrent processing
    request.execute()
      .then(() => request.resolve())
      .catch((error) => request.reject(error))
      .finally(() => {
        activeRequests--;
        // Process next request from queue if available
        if (requestQueue.length > 0) {
          processQueue();
        }
      });
  }
}

// Queue an API request to avoid rate limiting
function queueRequest(execute: () => Promise<void>): Promise<void> {
  return new Promise((resolve, reject) => {
    requestQueue.push({ execute, resolve, reject });
    processQueue();
  });
}

// Check if API is available and authentication is valid
async function checkApiAvailability(forceRefresh = false): Promise<boolean> {
  const now = Date.now();
  const token = getAuthToken();

  if (!token) {
    return false;
  }
  
  // If API was previously determined to be available, trust that result
  if (apiAvailable === true) {
    return true;
  }
  
  // If API was previously unavailable, recheck after interval to handle API startup delays
  if (!forceRefresh && apiAvailable === false && apiCheckTimestamp !== null) {
    if (now - apiCheckTimestamp < API_RECHECK_INTERVAL_MS) {
      return false;
    }
    // Time to recheck - reset apiAvailable to allow retry
    console.log('Rechecking API availability after previous failure');
    apiAvailable = null;
  }
  
  // Perform the actual availability check
  if (forceRefresh) {
    apiAvailable = null;
  }

  if (apiAvailable === null) {
    try {
      // Check the /auth/me endpoint which requires valid authentication
      // This verifies both API availability and that our auth token is valid
      const response = await fetch(`${API_URL}/auth/me`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });
      
      apiAvailable = response.ok;
      apiCheckTimestamp = now;
      return apiAvailable;
    } catch (error) {
      console.warn('API not available:', error);
      apiAvailable = false;
      apiCheckTimestamp = now;
      return false;
    }
  }
  
  return apiAvailable;
}

/**
 * Validates that a loaded value matches the expected type based on the default value.
 * This prevents corrupted data from causing runtime errors.
 * 
 * Note: This performs shallow type checking (array vs object vs primitive).
 * It does not validate the structure or properties of complex types.
 */
function validateLoadedValue<T>(loadedValue: any, defaultValue: T): T {
  // If loadedValue is null or undefined, return defaultValue
  if (loadedValue === null || loadedValue === undefined) {
    return defaultValue;
  }
  
  // If defaultValue is an array, ensure loadedValue is also an array
  if (Array.isArray(defaultValue)) {
    return (Array.isArray(loadedValue) ? loadedValue : defaultValue) as T;
  }
  
  // If defaultValue is an object (but not null), ensure loadedValue is also an object (but not an array)
  if (typeof defaultValue === 'object' && defaultValue !== null) {
    const isValidObject = typeof loadedValue === 'object' && 
                          loadedValue !== null && 
                          !Array.isArray(loadedValue);
    return (isValidObject ? loadedValue : defaultValue) as T;
  }
  
  // For primitive types, validate type matches
  if (typeof loadedValue === typeof defaultValue) {
    return loadedValue as T;
  }
  
  // Type mismatch - return default value
  return defaultValue;
}

function isAuthFailure(status: number): boolean {
  return status === 401 || status === 403;
}

export function useApiKV<T>(key: string, defaultValue: T): [T, (value: T | ((prevValue: T) => T)) => Promise<void>, boolean] {
  const [value, setValue] = useState<T>(defaultValue);
  const [isLoaded, setIsLoaded] = useState<boolean>(false);
  const defaultValueRef = useRef(defaultValue);
  // Track the latest committed value synchronously so updateValue can compute
  // the next value without relying on React's async reconciliation cycle.
  const currentValueRef = useRef<T>(defaultValue);
  // Keep currentValueRef in sync with state on every render
  currentValueRef.current = value;
  // Track auth token to re-fetch data when it changes (e.g., after login)
  const [authToken, setAuthToken] = useState<string | null>(getAuthToken());
  // Track refresh requests triggered by page navigation
  const [refreshCount, setRefreshCount] = useState<number>(0);

  useEffect(() => {
    defaultValueRef.current = defaultValue;
  }, [defaultValue]);

  // Listen for auth token changes
  useEffect(() => {
    const handleAuthTokenChange = () => {
      setAuthToken(getAuthToken());
    };

    authTokenListeners.add(handleAuthTokenChange);

    return () => {
      authTokenListeners.delete(handleAuthTokenChange);
    };
  }, []);

  // Listen for manual refresh requests (e.g., on page navigation)
  useEffect(() => {
    const handleRefresh = () => {
      setRefreshCount(c => c + 1);
    };

    refreshListeners.add(handleRefresh);

    return () => {
      refreshListeners.delete(handleRefresh);
    };
  }, []);

  // Initialize - check API and load data
  useEffect(() => {
    let mounted = true;

    async function loadValueFromApi() {
      await queueRequest(async () => {
        try {
          const response = await fetch(`${API_URL}/kv/${encodeURIComponent(key)}`, {
            method: 'GET',
            headers: getAuthHeaders(),
          });

          if (response.ok) {
            const data = await response.json();
            if (mounted) {
              // validateLoadedValue handles null values by returning defaultValue
              setValue(validateLoadedValue(data.value, defaultValueRef.current));
            }
          } else if (isAuthFailure(response.status)) {
            apiAvailable = false;
            apiCheckTimestamp = Date.now();
            if (mounted) {
              setValue(defaultValueRef.current);
              toast.error('Session expired', {
                description: 'Please log in again to view your data.'
              });
            }
          } else if (response.status === 404) {
            // Key not found — use default value (no data stored yet)
            if (mounted) {
              setValue(defaultValueRef.current);
            }
          } else {
            // Unexpected server error
            console.error(`API returned ${response.status} for key "${key}"`);
            if (mounted) {
              setValue(defaultValueRef.current);
              toast.error('Server error', {
                description: 'Data could not be loaded from the server.'
              });
            }
          }
        } catch (error) {
          console.error('Error loading from API:', error);
          if (mounted) {
            setValue(defaultValueRef.current);
            toast.error('Unable to reach server', {
              description: 'Check your connection and try again.'
            });
          }
        }
      });
    }

    async function syncValue() {
      setIsLoaded(false);
      const available = await checkApiAvailability();
      if (!mounted) return;

      if (available) {
        await loadValueFromApi();
      } else {
        setValue(defaultValueRef.current);
        // Only show an error when the user has a token but the API is unreachable,
        // not during the initial unauthenticated state.
        if (getAuthToken()) {
          toast.error('Unable to reach server', {
            description: 'Check your connection and try again.'
          });
        }
      }

      if (mounted) {
        setIsLoaded(true);
      }
    }

    syncValue();

    const handleStorageUpdate = (event: StorageEvent) => {
      if (event.key === 'auth_token') {
        notifyAuthTokenChange();
      }
    };

    window.addEventListener('storage', handleStorageUpdate);

    return () => {
      mounted = false;
      window.removeEventListener('storage', handleStorageUpdate);
    };
  }, [key, authToken, refreshCount]);

  // Update function - supports both direct values and updater functions
  const updateValue = useCallback(async (newValueOrUpdater: T | ((prevValue: T) => T)) => {
    // Compute the new value synchronously using currentValueRef so it is
    // available immediately for the API call.  We cannot rely on React's
    // setState updater callback here because React 18 calls that callback
    // during the reconciliation phase (asynchronously), which happens AFTER
    // queueRequest has already evaluated the request body - resulting in the
    // default value (e.g. []) being sent to the API instead of the real data.
    const computedValue: T = typeof newValueOrUpdater === 'function'
      ? (newValueOrUpdater as (prevValue: T) => T)(currentValueRef.current)
      : newValueOrUpdater;
    // Update the ref immediately so rapid successive calls before a re-render
    // each see the latest value rather than the stale state.
    currentValueRef.current = computedValue;
    setValue(computedValue);

    const apiIsAvailable = await checkApiAvailability(true);

    if (apiIsAvailable) {
      // Save to API and await the result (queued to prevent out-of-order writes)
      try {
        await queueRequest(async () => {
          const response = await fetch(`${API_URL}/kv/${encodeURIComponent(key)}`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ value: computedValue }),
          });
          
          if (!response.ok) {
            if (isAuthFailure(response.status)) {
              apiAvailable = false;
              apiCheckTimestamp = Date.now();
              toast.error('Session expired', {
                description: 'Changes could not be saved. Please log in again.'
              });
              return;
            }
            throw new Error('Failed to save to API');
          }
        });
      } catch (error) {
        console.error('Error saving to API:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        toast.error('Failed to save to server', {
          description: `Changes were not saved: ${errorMessage}`
        });
      }
    } else {
      toast.error('Unable to reach server', {
        description: 'Changes could not be saved. Check your connection and try again.'
      });
    }
  }, [key]);

  return [value, updateValue, isLoaded];
}
