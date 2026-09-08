import { apiRequest } from "./queryClient";
import type { Merchant, SelfUser } from "@shared/schema";

/** The signed-in user's own record, so it carries their own demographics. */
export type AuthUser = SelfUser & { merchant?: Merchant | null };

export interface AuthResponse {
  user: AuthUser;
  token: string;
}

const TOKEN_KEY = "auth_token";

export const authApi = {
  async login(credentials: { email: string; password: string }): Promise<AuthResponse> {
    const response = await apiRequest("POST", "/api/auth/login", credentials);
    return response.json();
  },

  async register(data: Record<string, unknown>): Promise<AuthResponse> {
    const response = await apiRequest("POST", "/api/auth/register", data);
    return response.json();
  },

  async getProfile(): Promise<AuthUser> {
    const response = await apiRequest("GET", "/api/auth/me");
    return response.json();
  },

  setToken(token: string) {
    localStorage.setItem(TOKEN_KEY, token);
  },

  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  },

  removeToken() {
    localStorage.removeItem(TOKEN_KEY);
  },
};

/** Where a signed-in user's home page is. */
export function homePathForRole(role?: string | null): string {
  switch (role) {
    case "resident":
      return "/resident";
    case "merchant":
      return "/merchant";
    case "admin":
      return "/admin";
    default:
      return "/";
  }
}
