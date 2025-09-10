import { apiRequest } from "./queryClient";
import type { User, LoginRequest, RegisterRequest } from "@shared/schema";

interface AuthResponse {
  user: User;
  token: string;
}

export const authApi = {
  login: async (data: LoginRequest): Promise<AuthResponse> => {
    const response = await apiRequest("POST", "/api/auth/login", data);
    const authResponse = await response.json();
    // Store token immediately after successful login
    if (authResponse.token) {
      setAuthToken(authResponse.token);
  setStoredUser(authResponse.user);
    }
    return authResponse;
  },

  register: async (data: RegisterRequest): Promise<AuthResponse> => {
    const response = await apiRequest("POST", "/api/auth/register", data);
    const authResponse = await response.json();
    // Store token immediately after successful registration
    if (authResponse.token) {
      setAuthToken(authResponse.token);
  setStoredUser(authResponse.user);
    }
    return authResponse;
  },

  getCurrentUser: async (): Promise<User> => {
    const response = await apiRequest("GET", "/api/auth/me");
    return response.json();
  },
};

export const getAuthToken = (): string | null => {
  return localStorage.getItem("auth_token");
};

export const setAuthToken = (token: string): void => {
  localStorage.setItem("auth_token", token);
};

export const clearAuthToken = (): void => {
  localStorage.removeItem("auth_token");
};

// Persisted user helpers
const USER_KEY = "auth_user";

export const getStoredUser = (): User | null => {
  try {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
};

export const setStoredUser = (user: User): void => {
  try {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch {
    // ignore quota errors
  }
};

export const clearStoredUser = (): void => {
  localStorage.removeItem(USER_KEY);
};
