/**
 * API-based KV storage hook
 * Provides the same interface as @github/spark useKV but uses the backend API
 */
import { useState, useEffect, useCallback, useRef } from 'react';

// API base URL from environment or default to /api
const API_URL = import.meta.env.VITE_API_URL || '/api';

// Track if API is available
let apiAvailable: boolean | null = null;

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

// Check if API is available
async function checkApiAvailability(): Promise<boolean> {
  if (apiAvailable !== null) {
    return apiAvailable;
  }
  
  try {
    const response = await fetch(`${API_URL}/health`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    apiAvailable = response.ok;
    return apiAvailable;
  } catch (error) {
    console.warn('API not available, falling back to localStorage');
    apiAvailable = false;
    return false;
  }
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

export function useApiKV<T>(key: string, defaultValue: T): [T, (value: T | ((prevValue: T) => T)) => Promise<void>] {
  const [value, setValue] = useState<T>(defaultValue);
  const [useApi, setUseApi] = useState<boolean>(false);
  const defaultValueRef = useRef(defaultValue);

  useEffect(() => {
    defaultValueRef.current = defaultValue;
  }, [defaultValue]);

  // Initialize - check API and load data
  useEffect(() => {
    let mounted = true;

    async function init() {
      const available = await checkApiAvailability();
      if (!mounted) return;
      
      setUseApi(available);

      if (available) {
        // Load from API using queue to prevent rate limiting
        await queueRequest(async () => {
          try {
            const response = await fetch(`${API_URL}/kv/${encodeURIComponent(key)}`, {
              method: 'GET',
              headers: { 'Content-Type': 'application/json' },
            });

            if (response.ok) {
              const data = await response.json();
              if (mounted) {
                // validateLoadedValue handles null values by returning defaultValue
                setValue(validateLoadedValue(data.value, defaultValueRef.current));
              }
            } else if (response.status === 404) {
              // Legacy: Key not found (older API versions returned 404)
              if (mounted) {
                setValue(defaultValueRef.current);
              }
            }
          } catch (error) {
            console.error('Error loading from API:', error);
            // Fallback to localStorage
            const stored = localStorage.getItem(key);
            if (stored && mounted) {
              try {
                const parsedValue = JSON.parse(stored);
                setValue(validateLoadedValue(parsedValue, defaultValueRef.current));
              } catch {
                setValue(defaultValueRef.current);
              }
            }
          }
        });
      } else {
        // Load from localStorage
        const stored = localStorage.getItem(key);
        if (stored && mounted) {
          try {
            const parsedValue = JSON.parse(stored);
            setValue(validateLoadedValue(parsedValue, defaultValueRef.current));
          } catch {
            setValue(defaultValueRef.current);
          }
        }
      }
    }

    init();

    return () => {
      mounted = false;
    };
  }, [key]);

  // Update function - supports both direct values and updater functions
  const updateValue = useCallback(async (newValueOrUpdater: T | ((prevValue: T) => T)) => {
    // Compute the new value using setState's functional form to avoid race conditions
    // Initialize with defaultValue as fallback (setValue executes synchronously, so this should never be used)
    let computedValue: T = defaultValueRef.current;
    setValue(prev => {
      computedValue = typeof newValueOrUpdater === 'function' 
        ? (newValueOrUpdater as (prevValue: T) => T)(prev)
        : newValueOrUpdater;
      return computedValue;
    });
    
    // Save to API or localStorage (outside of setState to keep it pure)
    if (useApi) {
      // Save to API and await the result
      try {
        const response = await fetch(`${API_URL}/kv/${encodeURIComponent(key)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ value: computedValue }),
        });
        
        if (!response.ok) {
          throw new Error('Failed to save to API');
        }
      } catch (error) {
        console.error('Error saving to API:', error);
        // Fallback to localStorage to ensure data persistence
        // The app remains in API mode and will attempt API saves on subsequent updates
        localStorage.setItem(key, JSON.stringify(computedValue));
        console.warn('Saved to localStorage as fallback');
      }
    } else {
      // Save to localStorage
      localStorage.setItem(key, JSON.stringify(computedValue));
    }
  }, [key, useApi]);

  return [value, updateValue];
}

// Migration utility: export all localStorage data to API
export async function migrateToApi(): Promise<boolean> {
  const available = await checkApiAvailability();
  if (!available) {
    console.error('API not available for migration');
    return false;
  }

  try {
    // Get all localStorage data
    const data: Record<string, any> = {};
    const skipped: string[] = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        const value = localStorage.getItem(key);
        if (value) {
          try {
            data[key] = JSON.parse(value);
          } catch {
            // Skip non-JSON values
            skipped.push(key);
          }
        }
      }
    }

    if (skipped.length > 0) {
      console.warn('Migration: Skipped non-JSON values for keys:', skipped);
    }

    // Send to API
    const response = await fetch(`${API_URL}/kv`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error('Migration failed');
    }

    console.log('Migration completed successfully');
    return true;
  } catch (error) {
    console.error('Error during migration:', error);
    return false;
  }
}
