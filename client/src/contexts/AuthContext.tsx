import React, { createContext, useContext, useState, useEffect } from "react";
import type { User } from "@shared/schema";
import { getAuthToken, setAuthToken, clearAuthToken, authApi, getStoredUser, setStoredUser, clearStoredUser } from "@/lib/auth";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (userData: any) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = getAuthToken();
    const cached = getStoredUser();
    if (cached) {
      setUser(cached);
    }
    if (token) {
      authApi
        .getCurrentUser()
        .then(u => { setUser(u); setStoredUser(u); })
        .catch(() => {
          clearAuthToken();
          clearStoredUser();
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  // Multi-tab sync & passive refresh
  useEffect(() => {
    function handleStorage(e: StorageEvent) {
      if (e.key === 'auth_token') {
        const token = getAuthToken();
        if (!token) {
          setUser(null);
          clearStoredUser();
          return;
        }
        // token added/changed: refetch to ensure user is current
        authApi.getCurrentUser()
          .then(u => { setUser(u); setStoredUser(u); })
          .catch(() => { clearAuthToken(); clearStoredUser(); setUser(null); });
      } else if (e.key === 'auth_user') {
        const cached = getStoredUser();
        if (cached) setUser(cached);
      }
    }
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const login = async (email: string, password: string) => {
    const response = await authApi.login({ email, password });
  if (!response.token) throw new Error("No token received from server");
  setAuthToken(response.token);
  setUser(response.user);
  setStoredUser(response.user);
  };

  const register = async (userData: any) => {
    const response = await authApi.register(userData);
  if (!response.token) throw new Error("No token received from server");
  setAuthToken(response.token);
  setUser(response.user);
  setStoredUser(response.user);
  };

  const logout = () => {
  clearAuthToken();
  clearStoredUser();
  setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
