/**
 * Authentication API Client
 */

const API_BASE = import.meta.env.VITE_API_BASE || '/api';

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  token?: string;
  message?: string;
}

export interface AuthStatusResponse {
  enabled: boolean;
  authenticated: boolean;
}

/**
 * Check if authentication is enabled
 */
export async function getAuthStatus(): Promise<AuthStatusResponse> {
  const response = await fetch(`${API_BASE}/auth/status`, {
    credentials: 'include',
  });
  if (!response.ok) {
    throw new Error('Failed to get auth status');
  }
  return response.json();
}

/**
 * Login with username and password
 */
export async function login(credentials: LoginRequest): Promise<LoginResponse> {
  const response = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(credentials),
  });
  
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.message || 'Login failed');
  }
  
  return data;
}

/**
 * Logout
 */
export async function logout(): Promise<void> {
  const response = await fetch(`${API_BASE}/auth/logout`, {
    method: 'POST',
    credentials: 'include',
  });
  
  if (!response.ok) {
    throw new Error('Logout failed');
  }
}

/**
 * Verify current session
 */
export async function verifySession(): Promise<{ valid: boolean }> {
  const response = await fetch(`${API_BASE}/auth/verify`, {
    credentials: 'include',
  });
  
  if (!response.ok) {
    return { valid: false };
  }
  
  return response.json();
}
