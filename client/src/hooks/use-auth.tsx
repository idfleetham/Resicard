import { createContext, useContext, ReactNode } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { authApi, homePathForRole, type AuthUser } from "@/lib/auth";

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string, returnTo?: string) => Promise<void>;
  register: (data: Record<string, unknown>) => Promise<void>;
  logout: () => void;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const { data: user, isLoading } = useQuery<AuthUser | null>({
    queryKey: ["/api/auth/me"],
    queryFn: async () => {
      if (!authApi.getToken()) return null;
      try {
        return await authApi.getProfile();
      } catch {
        authApi.removeToken();
        return null;
      }
    },
    retry: false,
    staleTime: 60_000,
  });

  const loginMutation = useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      const response = await authApi.login({ email, password });
      authApi.setToken(response.token);
      return response.user;
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const response = await authApi.register(data);
      authApi.setToken(response.token);
      return response.user;
    },
  });

  const login = async (email: string, password: string, returnTo?: string) => {
    const u = await loginMutation.mutateAsync({ email, password });
    queryClient.setQueryData(["/api/auth/me"], u);
    setLocation(returnTo && returnTo.startsWith("/") ? returnTo : homePathForRole(u.role));
  };

  const register = async (data: Record<string, unknown>) => {
    const u = await registerMutation.mutateAsync(data);
    queryClient.setQueryData(["/api/auth/me"], u);
    setLocation(homePathForRole(u.role));
  };

  const logout = () => {
    authApi.removeToken();
    queryClient.setQueryData(["/api/auth/me"], null);
    queryClient.clear();
    setLocation("/");
  };

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
  };

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        isLoading: isLoading || loginMutation.isPending || registerMutation.isPending,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        refresh,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

/**
 * Redirect to /login (remembering where the user was) unless signed in with
 * one of the given roles. Returns true when the page may render.
 */
export function useRequireRole(...roles: string[]): { ready: boolean; user: AuthUser | null } {
  const { user, isLoading } = useAuth();
  const [location, setLocation] = useLocation();
  if (isLoading) return { ready: false, user: null };
  if (!user) {
    setLocation(`/login?returnTo=${encodeURIComponent(location)}`);
    return { ready: false, user: null };
  }
  if (roles.length && !roles.includes(user.role)) {
    setLocation(homePathForRole(user.role));
    return { ready: false, user };
  }
  return { ready: true, user };
}
