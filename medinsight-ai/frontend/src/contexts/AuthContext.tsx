import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, AuthState, UserRole } from '../types/clinical';
import { authService } from '../services/authService';

interface AuthContextType extends AuthState {
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (...permissions: string[]) => boolean;
  hasRole: (...roles: (UserRole | string)[]) => boolean;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => authService.getStoredUser());
  const [token, setToken] = useState<string | null>(() => authService.getStoredToken());
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshUser = useCallback(async () => {
    try {
      const currentUser = await authService.getCurrentUser();
      setUser(currentUser);
    } catch (err: any) {
      if (err?.response?.status === 401 || err?.response?.status === 403) {
        authService.logout();
        setUser(null);
        setToken(null);
      }
    }
  }, []);

  useEffect(() => {
    const initAuth = async () => {
      const storedToken = authService.getStoredToken();
      if (storedToken) {
        await refreshUser();
      } else {
        setUser(null);
      }
      setIsLoading(false);
    };

    initAuth();
  }, [refreshUser]);

  const login = async (username: string, password: string) => {
    setIsLoading(true);
    try {
      const res = await authService.login(username, password);
      setUser(res.user);
      setToken(res.access_token);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    await authService.logout();
    setUser(null);
    setToken(null);
  };

  const hasPermission = useCallback((permission: string): boolean => {
    if (!user) return false;
    if (user.role === 'administrator' || user.role === 'super_admin') return true;
    if (!user.permissions) return false;
    return user.permissions.includes(permission);
  }, [user]);

  const hasAnyPermission = useCallback((...permissions: string[]): boolean => {
    if (!user) return false;
    if (user.role === 'administrator' || user.role === 'super_admin') return true;
    if (!user.permissions) return false;
    return permissions.some(p => user.permissions?.includes(p));
  }, [user]);

  const hasRole = useCallback((...roles: (UserRole | string)[]): boolean => {
    if (!user) return false;
    const normalizedUserRole = user.role.toLowerCase().trim();
    if (normalizedUserRole === 'administrator' || normalizedUserRole === 'super_admin') return true;
    return roles.some(r => r.toLowerCase().trim() === normalizedUserRole);
  }, [user]);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        hasPermission,
        hasAnyPermission,
        hasRole,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
