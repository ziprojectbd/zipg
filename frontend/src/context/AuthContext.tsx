import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { User, LoginResponse } from '../types';
import { authApi } from '../services/api';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const clearStoredAuth = () => {
    localStorage.removeItem('zi-pay-token');
    localStorage.removeItem('zi-pay-refresh');
  };

  const fetchUser = useCallback(async () => {
    const token = localStorage.getItem('zi-pay-token');
    const refreshToken = localStorage.getItem('zi-pay-refresh');
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const { data } = await authApi.me();
      if (data.success) {
        setUser(data.data.user);
      }
    } catch {
      // Access token may have expired — try to refresh it once before logging out.
      if (refreshToken) {
        try {
          const { data: refreshData } = await authApi.refreshToken(refreshToken);
          const refreshed = refreshData.data as LoginResponse;
          if (refreshed?.accessToken) {
            localStorage.setItem('zi-pay-token', refreshed.accessToken);
            if (refreshed.refreshToken) {
              localStorage.setItem('zi-pay-refresh', refreshed.refreshToken);
            }
            if (refreshed.user) {
              setUser(refreshed.user);
            } else {
              const { data: meData } = await authApi.me();
              if (meData.success) setUser(meData.data.user);
            }
            setLoading(false);
            return;
          }
        } catch {
          // Refresh failed — token is truly invalid.
          clearStoredAuth();
        }
      } else {
        clearStoredAuth();
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const login = async (email: string, password: string) => {
    const { data } = await authApi.login(email, password);
    const res = data.data as LoginResponse;
    localStorage.setItem('zi-pay-token', res.accessToken);
    localStorage.setItem('zi-pay-refresh', res.refreshToken);
    setUser(res.user);
  };

  const logout = async () => {
    const refreshToken = localStorage.getItem('zi-pay-refresh');
    try {
      await authApi.logout(refreshToken || undefined);
    } catch {
      // Ignore logout errors
    }
    clearStoredAuth();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, isAuthenticated: !!user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
