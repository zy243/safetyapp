// services/api.ts
import { API_BASE_URL } from '../config/api';

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  user?: T;
  token?: string;
}

class ApiService {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const defaultOptions: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, defaultOptions);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || `HTTP error! status: ${response.status}`);
      }
      
      return data;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Network error occurred');
    }
  }

  // Auth endpoints
  async register(userData: {
    name: string;
    email: string;
    password: string;
    role: string;
    phone?: string;
    studentId?: string;
    staffId?: string;
  }): Promise<ApiResponse> {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async login(credentials: {
    email: string;
    password: string;
  }): Promise<ApiResponse> {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  }

  async logout(token: string): Promise<ApiResponse> {
    return this.request('/auth/logout', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
  }

  async getMe(token: string): Promise<ApiResponse> {
    return this.request('/auth/me', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
  }

  async verifyEmail(token: string): Promise<ApiResponse> {
    return this.request(`/auth/verify-email/${token}`, {
      method: 'GET',
    });
  }

  async resendVerification(email: string): Promise<ApiResponse> {
    return this.request('/auth/resend-verification', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  // Update base URL for different environments
  setBaseUrl(url: string) {
    this.baseUrl = url;
  }
}

export const apiService = new ApiService();
export default apiService;
