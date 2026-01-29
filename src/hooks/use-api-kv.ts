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
              setValue(data.value);
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
              setValue(JSON.parse(stored));
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
            setValue(JSON.parse(stored));
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
    setValue(newValue);

    if (useApi) {
      // Save to API
      try {
        await fetch(`${API_URL}/kv/${encodeURIComponent(key)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ value: newValue }),
        });
      } catch (error) {
        console.error('Error saving to API:', error);
        // Fallback to localStorage
        localStorage.setItem(key, JSON.stringify(newValue));
      }
    } else {
      // Save to localStorage
      localStorage.setItem(key, JSON.stringify(newValue));
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
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        const value = localStorage.getItem(key);
        if (value) {
          try {
            data[key] = JSON.parse(value);
          } catch {
            // Skip non-JSON values
          }
        }
      }
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
