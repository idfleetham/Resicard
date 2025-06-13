import { apiRequest } from "./queryClient";

interface LoginCredentials {
  email: string;
  password: string;
}

interface RegisterData {
  username: string;
  email: string;
  password: string;
  role: 'resident' | 'merchant';
  postcode?: string;
  businessName?: string;
  businessCategory?: string;
  businessAddress?: string;
  businessPhone?: string;
}

interface AuthResponse {
  user: {
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
    createdAt: string;
  };
  token: string;
}

export const authApi = {
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await apiRequest('POST', '/api/auth/login', credentials);
    return response.json();
  },

  async register(data: RegisterData): Promise<AuthResponse> {
    const response = await apiRequest('POST', '/api/auth/register', data);
    return response.json();
  },

  async getProfile(): Promise<AuthResponse['user']> {
    const response = await apiRequest('GET', '/api/auth/me');
    return response.json();
  },

  setToken(token: string) {
    localStorage.setItem('auth_token', token);
  },

  getToken(): string | null {
    return localStorage.getItem('auth_token');
  },

  removeToken() {
    localStorage.removeItem('auth_token');
  },

  isAuthenticated(): boolean {
    return !!this.getToken();
  },
};

// Add token to API requests
const originalApiRequest = apiRequest;
export { originalApiRequest as baseApiRequest };

export async function apiRequestWithAuth(
  method: string,
  url: string,
  data?: unknown
): Promise<Response> {
  const token = authApi.getToken();
  const headers: Record<string, string> = data ? { "Content-Type": "application/json" } : {};
  
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  // Handle 401 responses by removing invalid token
  if (res.status === 401) {
    authApi.removeToken();
    window.location.href = '/login';
    throw new Error('Authentication required');
  }

  return res;
}
