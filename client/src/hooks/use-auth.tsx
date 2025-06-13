import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { authApi } from "@/lib/auth";
import { useLocation } from "wouter";

interface User {
  id: number;
  username: string;
  email: string;
  role: string;
  isVerified: boolean;
  postcode?: string;
  businessName?: string;
  businessCategory?: string;
  businessAddress?: string;
  businessPhone?: string;
  profilePhoto?: string;
  membershipExpiry?: string;
  documentType?: string;
  documentFile?: string;
  documentStatus?: string;
  documentSubmittedAt?: string;
  documentReviewedAt?: string;
  documentReviewedBy?: number;
  isResidencyVerified?: boolean;
  createdAt: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: any) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const { data: user, isLoading } = useQuery({
    queryKey: ['/api/auth/me'],
    queryFn: async () => {
      const token = authApi.getToken();
      if (!token) return null;
      
      try {
        return await authApi.getProfile();
      } catch (error: any) {
        console.warn('Auth check failed:', error.message);
        authApi.removeToken();
        
        // Only redirect if we're on a protected route
        const currentPath = window.location.pathname;
        const protectedRoutes = ['/resident', '/merchant', '/admin', '/edit-profile'];
        
        if (protectedRoutes.some(route => currentPath.startsWith(route))) {
          setTimeout(() => {
            window.location.href = '/login';
          }, 1000); // Delay to prevent immediate redirect during error handling
        }
        
        return null;
      }
    },
    retry: false,
    staleTime: 0,
    refetchInterval: 30000,
  });

  const loginMutation = useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      const response = await authApi.login({ email, password });
      authApi.setToken(response.token);
      return response.user;
    },
    onSuccess: (user) => {
      queryClient.setQueryData(['/api/auth/me'], user);
      
      // Redirect based on role
      switch (user.role) {
        case 'resident':
          setLocation('/resident');
          break;
        case 'merchant':
          setLocation('/merchant');
          break;
        case 'admin':
          setLocation('/admin');
          break;
        default:
          setLocation('/');
      }
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await authApi.register(data);
      authApi.setToken(response.token);
      return response.user;
    },
    onSuccess: (user) => {
      queryClient.setQueryData(['/api/auth/me'], user);
      
      // Redirect based on role
      switch (user.role) {
        case 'resident':
          setLocation('/resident');
          break;
        case 'merchant':
          setLocation('/merchant');
          break;
        case 'admin':
          setLocation('/admin');
          break;
        default:
          setLocation('/');
      }
    },
  });

  const logout = () => {
    authApi.removeToken();
    queryClient.setQueryData(['/api/auth/me'], null);
    queryClient.clear();
    setLocation('/');
  };

  const login = async (email: string, password: string) => {
    await loginMutation.mutateAsync({ email, password });
  };

  const register = async (data: any) => {
    await registerMutation.mutateAsync(data);
  };

  const value: AuthContextType = {
    user: user || null,
    isLoading: isLoading || loginMutation.isPending || registerMutation.isPending,
    login,
    register,
    logout,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
