import React, { createContext, useContext, useState, useEffect } from "react";
import type { User } from "@shared/schema";
import { getAuthToken, setAuthToken, clearAuthToken, authApi } from "@/lib/auth";

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
    if (token) {
      authApi
        .getCurrentUser()
        .then(setUser)
        .catch(() => {
          clearAuthToken();
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = async (email: string, password: string) => {
    const { user, token } = await authApi.login({ email, password });
    setAuthToken(token);
    setUser(user);
  };

  const register = async (userData: any) => {
    const { user, token } = await authApi.register(userData);
    setAuthToken(token);
    setUser(user);
  };

  const logout = () => {
    clearAuthToken();
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
