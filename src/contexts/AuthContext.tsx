import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

const API_URL = import.meta.env.VITE_API_URL || '/api';

interface User {
  id: string;
  email: string;
  tenantId: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithDevice: (deviceGuid: string) => Promise<void>;
  signup: (email: string, password: string) => Promise<void>;
  logout: () => void;
  addParent: (email: string, password: string) => Promise<void>;
  getTenantUsers: () => Promise<any[]>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Load token from localStorage on mount
  useEffect(() => {
    const storedToken = localStorage.getItem('auth_token');
    if (storedToken) {
      setToken(storedToken);
      // Verify token and load user info
      fetchUserInfo(storedToken);
    } else {
      setLoading(false);
    }
  }, []);

  const fetchUserInfo = async (authToken: string) => {
    try {
      const response = await fetch(`${API_URL}/auth/me`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
      } else {
        // Token invalid, clear it
        localStorage.removeItem('auth_token');
        setToken(null);
        setUser(null);
      }
    } catch (error) {
      console.error('Error fetching user info:', error);
      // Don't clear token on network error, just set loading to false
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      // Handle service unavailable error
      if (response.status === 503) {
        throw new Error('Service is starting up. Please wait a moment and try again.');
      }
      
      // Handle other errors
      try {
        const error = await response.json();
        throw new Error(error.error || error.message || 'Login failed');
      } catch (parseError) {
        // If response is not JSON (e.g., HTML error page from nginx)
        if (parseError instanceof SyntaxError) {
          throw new Error(`Unable to connect to the server. Please try again later.`);
        }
        // Re-throw if it's the Error we threw above
        throw parseError;
      }
    }

    const data = await response.json();
    setToken(data.token);
    setUser(data.user);
    localStorage.setItem('auth_token', data.token);
  };

  const loginWithDevice = async (deviceGuid: string) => {
    const response = await fetch(`${API_URL}/auth/device-login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ deviceGuid }),
    });

    if (!response.ok) {
      // Handle service unavailable error
      if (response.status === 503) {
        throw new Error('Service is starting up. Please wait a moment and try again.');
      }
      
      // Handle other errors
      try {
        const error = await response.json();
        throw new Error(error.error || error.message || 'Device login failed');
      } catch (parseError) {
        // If response is not JSON (e.g., HTML error page from nginx)
        if (parseError instanceof SyntaxError) {
          throw new Error(`Server error (${response.status}). Please check if the service is running.`);
        }
        // Re-throw if it's the Error we threw above
        throw parseError;
      }
    }

    const data = await response.json();
    setToken(data.token);
    setUser(data.user);
    localStorage.setItem('auth_token', data.token);
  };

  const signup = async (email: string, password: string) => {
    const response = await fetch(`${API_URL}/auth/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      // Handle service unavailable error
      if (response.status === 503) {
        throw new Error('Service is starting up. Please wait a moment and try again.');
      }
      
      // Handle other errors
      try {
        const error = await response.json();
        throw new Error(error.error || error.message || 'Signup failed');
      } catch (parseError) {
        // If response is not JSON (e.g., HTML error page from nginx)
        if (parseError instanceof SyntaxError) {
          throw new Error(`Unable to connect to the server. Please try again later.`);
        }
        // Re-throw if it's the Error we threw above
        throw parseError;
      }
    }

    const data = await response.json();
    setToken(data.token);
    setUser(data.user);
    localStorage.setItem('auth_token', data.token);
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('auth_token');
  };

  const addParent = async (email: string, password: string) => {
    if (!token) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(`${API_URL}/auth/add-parent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to add parent');
    }

    return await response.json();
  };

  const getTenantUsers = async () => {
    if (!token) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(`${API_URL}/auth/tenant-users`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to get tenant users');
    }

    const data = await response.json();
    return data.users;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        loginWithDevice,
        signup,
        logout,
        addParent,
        getTenantUsers,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
