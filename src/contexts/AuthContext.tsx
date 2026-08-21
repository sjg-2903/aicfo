import React, { createContext, useContext, useEffect, useState } from 'react';
import authService, { type AuthUser } from '@/services/authService';
import apiClient from '@/lib/axios';

/**
 * Authentication context — backed by the FastAPI backend.
 *
 * No silent fallback: login/register errors are surfaced to the UI, and the
 * "Explore Demo" flow logs in with a real demo account (seeded server-side).
 */

export interface UserProfile extends AuthUser {
  business_name?: string;
}

export interface AuthContextType {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, business_name: string, owner_name: string) => Promise<void>;
  loginAsDemo: () => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

export const DEMO_EMAIL = 'owner@acmeindustries.com';
export const DEMO_PASSWORD = 'demo12345';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

async function loadBusinessName(user: AuthUser): Promise<UserProfile> {
  if (!user.business_id) return user;
  try {
    const response = await apiClient.get('/api/business');
    const business = response.data as { business_name?: string } | undefined;
    return { ...user, business_name: business?.business_name || undefined };
  } catch {
    return user;
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const initAuth = async () => {
      const token = authService.getToken();
      if (token) {
        try {
          const currentUser = await authService.getCurrentUser();
          const enriched = await loadBusinessName(currentUser);
          if (active) setUser(enriched);
        } catch {
          // Token invalid/expired and could not be refreshed — start clean.
          authService.clearSession();
        }
      }
      if (active) setIsLoading(false);
    };
    initAuth();
    return () => {
      active = false;
    };
  }, []);

  const persist = (u: AuthUser) => {
    const enriched = { ...u };
    setUser(enriched);
    authService.saveUser(u);
  };

  const login = async (email: string, password: string) => {
    const response = await authService.login({ email, password });
    authService.saveToken(response.access_token);
    authService.saveRefreshToken(response.refresh_token);
    persist(response.user);
    // Enrich with the business profile (business_name) without blocking UI.
    const enriched = await loadBusinessName(response.user);
    setUser(enriched);
  };

  const register = async (email: string, password: string, business_name: string, owner_name: string) => {
    const response = await authService.register({ email, password, business_name, owner_name });
    authService.saveToken(response.access_token);
    authService.saveRefreshToken(response.refresh_token);
    persist(response.user);
    const enriched = await loadBusinessName(response.user);
    setUser(enriched);
  };

  const loginAsDemo = async () => {
    // Real login against the demo account seeded by the backend.
    await login(DEMO_EMAIL, DEMO_PASSWORD);
  };

  const logout = async () => {
    try {
      await authService.logout();
    } catch {
      // Ignore backend errors on logout — clear locally regardless.
    } finally {
      authService.clearSession();
      setUser(null);
    }
  };

  const refreshUser = async () => {
    try {
      const currentUser = await authService.getCurrentUser();
      const enriched = await loadBusinessName(currentUser);
      setUser(enriched);
      authService.saveUser(currentUser);
    } catch {
      // Keep existing state; token refresh is handled by the axios layer.
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        loginAsDemo,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
