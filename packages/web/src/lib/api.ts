/**
 * API Client Configuration
 * Uses relative paths - proxied to API server in development, served together in production
 */

function resolveBaseUrl(): string {
  if (typeof window === 'undefined') return '';

  // Electron production: apiPort passed via query param
  const params = new URLSearchParams(window.location.search);
  const apiPort = params.get('apiPort');
  if (apiPort) {
    return `http://localhost:${apiPort}`;
  }

  // Web dev / web prod: same origin, Vite proxy handles /api
  return '';
}

/** Resolved API base URL, shared across all API modules */
export const API_BASE_URL = resolveBaseUrl();

/** Resolved /api prefix */
export const API_BASE = `${API_BASE_URL}${import.meta.env.VITE_API_BASE || '/api'}`;

const BASE_URL = API_BASE_URL;

class ApiClient {
  private async request<T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<T> {
    // Use relative path - Vite proxy will forward to API server
    // Or use absolute path if in Electron
    const url = endpoint.startsWith('http') ? endpoint : `${BASE_URL}${endpoint}`;
    
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({
          error: `HTTP ${response.status}: ${response.statusText}`,
        }));
        throw new Error(error.error || error.message || 'API request failed');
      }

      return response.json();
    } catch (error) {
      // 网络错误或连接失败
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('无法连接到服务器，请确保后端服务已启动', { cause: error });
      }
      throw error;
    }
  }

  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  async post<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

export const apiClient = new ApiClient();
