/**
 * API-based KV storage hook
 * Provides the same interface as @github/spark useKV but uses the backend API
 */
import { useState, useEffect, useCallback } from 'react';

// API base URL from environment or default to /api
const API_URL = import.meta.env.VITE_API_URL || '/api';

// Track if API is available
let apiAvailable: boolean | null = null;

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

export function useApiKV<T>(key: string, defaultValue: T): [T, (value: T) => Promise<void>] {
  const [value, setValue] = useState<T>(defaultValue);
  const [useApi, setUseApi] = useState<boolean>(false);

  // Initialize - check API and load data
  useEffect(() => {
    let mounted = true;

    async function init() {
      const available = await checkApiAvailability();
      if (!mounted) return;
      
      setUseApi(available);

      if (available) {
        // Load from API
        try {
          const response = await fetch(`${API_URL}/kv/${encodeURIComponent(key)}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
          });

          if (response.ok) {
            const data = await response.json();
            if (mounted) {
              // Validate that loaded value matches expected type
              const loadedValue = data.value;
              
              // If defaultValue is an array, ensure loadedValue is also an array
              if (Array.isArray(defaultValue)) {
                setValue((Array.isArray(loadedValue) ? loadedValue : defaultValue) as T);
              } else if (typeof defaultValue === 'object' && defaultValue !== null) {
                // If defaultValue is an object, ensure loadedValue is also an object
                setValue((typeof loadedValue === 'object' && loadedValue !== null ? loadedValue : defaultValue) as T);
              } else {
                setValue((loadedValue !== undefined && loadedValue !== null ? loadedValue : defaultValue) as T);
              }
            }
          } else if (response.status === 404) {
            // Key not found, use default
            if (mounted) {
              setValue(defaultValue);
            }
          }
        } catch (error) {
          console.error('Error loading from API:', error);
          // Fallback to localStorage
          const stored = localStorage.getItem(key);
          if (stored && mounted) {
            try {
              const parsedValue = JSON.parse(stored);
              
              // Validate that loaded value matches expected type
              if (Array.isArray(defaultValue)) {
                setValue((Array.isArray(parsedValue) ? parsedValue : defaultValue) as T);
              } else if (typeof defaultValue === 'object' && defaultValue !== null) {
                setValue((typeof parsedValue === 'object' && parsedValue !== null ? parsedValue : defaultValue) as T);
              } else {
                setValue((parsedValue !== undefined && parsedValue !== null ? parsedValue : defaultValue) as T);
              }
            } catch {
              setValue(defaultValue);
            }
          }
        }
      } else {
        // Load from localStorage
        const stored = localStorage.getItem(key);
        if (stored && mounted) {
          try {
            const parsedValue = JSON.parse(stored);
            
            // Validate that loaded value matches expected type
            if (Array.isArray(defaultValue)) {
              setValue((Array.isArray(parsedValue) ? parsedValue : defaultValue) as T);
            } else if (typeof defaultValue === 'object' && defaultValue !== null) {
              setValue((typeof parsedValue === 'object' && parsedValue !== null ? parsedValue : defaultValue) as T);
            } else {
              setValue((parsedValue !== undefined && parsedValue !== null ? parsedValue : defaultValue) as T);
            }
          } catch {
            setValue(defaultValue);
          }
        }
      }
    }

    init();

    return () => {
      mounted = false;
    };
  }, [key, defaultValue]);

  // Update function
  const updateValue = useCallback(async (newValue: T) => {
    const previousValue = value;
    setValue(newValue);

    if (useApi) {
      // Save to API
      try {
        const response = await fetch(`${API_URL}/kv/${encodeURIComponent(key)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ value: newValue }),
        });
        
        if (!response.ok) {
          throw new Error('Failed to save to API');
        }
      } catch (error) {
        console.error('Error saving to API:', error);
        // Rollback state and fallback to localStorage
        setValue(previousValue);
        localStorage.setItem(key, JSON.stringify(newValue));
        console.warn('Saved to localStorage as fallback');
      }
    } else {
      // Save to localStorage
      localStorage.setItem(key, JSON.stringify(newValue));
    }
  }, [key, useApi, value]);

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
