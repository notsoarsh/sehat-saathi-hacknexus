import { apiRequest } from "./queryClient";
import type { User, LoginRequest, RegisterRequest } from "@shared/schema";

interface AuthResponse {
  user: User;
  token: string;
}

export const authApi = {
  login: async (data: LoginRequest): Promise<AuthResponse> => {
    const response = await apiRequest("POST", "/api/auth/login", data);
    return response.json();
  },

  register: async (data: RegisterRequest): Promise<AuthResponse> => {
    const response = await apiRequest("POST", "/api/auth/register", data);
    return response.json();
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
