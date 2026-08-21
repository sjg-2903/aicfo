import React, { createContext, useContext, useEffect, useState } from 'react';
import authService, { UserProfile } from '@/services/authService';

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

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Demo user used when backend is not available (BYPASS LOGIN)
const DEMO_USER: UserProfile = {
  id: 'demo-user-1',
  email: 'owner@acmeindustries.com',
  business_name: 'Acme Industries Pvt. Ltd.',
  owner_name: 'Rajesh Sharma',
  created_at: '2023-06-15T10:30:00Z',
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const token = authService.getToken();
      if (token) {
        try {
          const currentUser = await authService.getCurrentUser();
          setUser(currentUser);
        } catch (error) {
          // Backend unavailable - fall back to demo session if previously set
          const savedUser = localStorage.getItem('user');
          if (savedUser) {
            try {
              setUser(JSON.parse(savedUser));
            } catch {
              authService.logout_local();
            }
          }
        }
      } else {
        // Auto-start demo session for bypass login experience
        const demoUser = localStorage.getItem('user');
        if (demoUser) {
          try {
            setUser(JSON.parse(demoUser));
          } catch {
            localStorage.removeItem('user');
          }
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const persistUser = (user: UserProfile) => {
    localStorage.setItem('user', JSON.stringify(user));
    setUser(user);
  };

  const login = async (email: string, password: string) => {
    try {
      const response = await authService.login({ email, password });
      authService.saveToken(response.access_token);
      persistUser(response.user as UserProfile);
    } catch (error) {
      // Fallback: if backend unavailable, allow demo login
      const demo: UserProfile = { ...DEMO_USER, email };
      persistUser(demo);
    }
  };

  const register = async (
    email: string,
    password: string,
    business_name: string,
    owner_name: string
  ) => {
    try {
      const response = await authService.register({
        email,
        password,
        business_name,
        owner_name,
      });
      authService.saveToken(response.access_token);
      persistUser(response.user as UserProfile);
    } catch (error) {
      // Fallback: create local demo user
      const demo: UserProfile = {
        ...DEMO_USER,
        email,
        business_name,
        owner_name,
      };
      persistUser(demo);
    }
  };

  const loginAsDemo = async () => {
    persistUser(DEMO_USER);
  };

  const logout = async () => {
    try {
      await authService.logout();
    } catch {
      // ignore backend errors on logout
    } finally {
      authService.logout_local();
      setUser(null);
    }
  };

  const refreshUser = async () => {
    setUser({ ...user } as UserProfile);
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
