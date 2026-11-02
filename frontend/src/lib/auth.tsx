import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api, clearAuthToken } from './api';

interface AuthContextType {
  authEnabled: boolean;
  authenticated: boolean;
  loading: boolean;
  login: (password: string) => Promise<{ success: boolean; message: string }>;
  logout: () => Promise<void>;
  checkStatus: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  authEnabled: false,
  authenticated: true,
  loading: true,
  login: async () => ({ success: false, message: '' }),
  logout: async () => {},
  checkStatus: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [authEnabled, setAuthEnabled] = useState<boolean>(true);
  const [authenticated, setAuthenticated] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  const checkStatus = useCallback(async () => {
    try {
      const res = await api.getAuthStatus();
      setAuthEnabled(res.auth_enabled);
      setAuthenticated(res.authenticated);
    } catch {
      // Fail closed: if status check fails or backend errors out, protect the system
      setAuthEnabled(true);
      setAuthenticated(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkStatus();

    const handleUnauthorized = () => {
      setAuthenticated(false);
    };

    window.addEventListener('orchestra:unauthorized', handleUnauthorized);
    return () => {
      window.removeEventListener('orchestra:unauthorized', handleUnauthorized);
    };
  }, [checkStatus]);

  const login = async (password: string) => {
    const res = await api.login(password);
    if (res.success) {
      setAuthenticated(true);
    }
    return res;
  };

  const logout = async () => {
    try {
      await api.logout();
    } finally {
      clearAuthToken();
      setAuthenticated(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        authEnabled,
        authenticated,
        loading,
        login,
        logout,
        checkStatus,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

