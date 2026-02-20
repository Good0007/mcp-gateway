/**
 * Web Configuration API Client
 */

import type { 
  WebConfigResponse, 
  ExportConfigResponse,
  XiaozhiEndpoint,
} from '@mcp-gateway/shared';

// 使用相对路径，支持生产环境和开发环境
// 生产环境：前后端在同一端口，直接使用 /api
// 开发环境：通过 Vite proxy 代理到后端端口
const API_BASE = import.meta.env.VITE_API_BASE || '/api';

/**
 * Get full web configuration
 */
export async function getWebConfig(): Promise<WebConfigResponse> {
  const response = await fetch(`${API_BASE}/config`);
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to get configuration');
  }
  return response.json();
}

/**
 * Export configuration as JSON
 */
export async function exportConfig(): Promise<ExportConfigResponse> {
  const response = await fetch(`${API_BASE}/config/export`);
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to export configuration');
  }
  return response.json();
}

/**
 * Import configuration from JSON
 */
export async function importConfig(content: string): Promise<{ success: boolean; message: string }> {
  const response = await fetch(`${API_BASE}/config/import`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to import configuration');
  }
  
  return response.json();
}

// ==================== Endpoint Management ====================

/**
 * Get all endpoints
 */
export async function getEndpoints(): Promise<{ endpoints: XiaozhiEndpoint[]; currentEndpointId?: string }> {
  const response = await fetch(`${API_BASE}/config/endpoints`);
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to get endpoints');
  }
  return response.json();
}

/**
 * Add new endpoint
 */
export async function addEndpoint(
  endpoint: Omit<XiaozhiEndpoint, 'id' | 'createdAt'>
): Promise<{ success: boolean; message: string; endpoint: XiaozhiEndpoint }> {
  const response = await fetch(`${API_BASE}/config/endpoints`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(endpoint),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to add endpoint');
  }
  
  return response.json();
}

/**
 * Remove endpoint
 */
export async function removeEndpoint(id: string): Promise<{ success: boolean; message: string }> {
  const response = await fetch(`${API_BASE}/config/endpoints/${id}`, {
    method: 'DELETE',
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to remove endpoint');
  }
  
  return response.json();
}

/**
 * Set current endpoint
 */
export async function selectEndpoint(id: string): Promise<{ success: boolean; message: string }> {
  const response = await fetch(`${API_BASE}/config/endpoints/${id}/select`, {
    method: 'POST',
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to select endpoint');
  }
  
  return response.json();
}

// ==================== Preferences Management ====================

/**
 * Get preferences
 */
export async function getPreferences(): Promise<{ preferences: Record<string, any> }> {
  const response = await fetch(`${API_BASE}/config/preferences`);
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to get preferences');
  }
  return response.json();
}

/**
 * Update preferences
 */
export async function updatePreferences(
  updates: Record<string, any>
): Promise<{ success: boolean; message: string }> {
  const response = await fetch(`${API_BASE}/config/preferences`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to update preferences');
  }
  
  return response.json();
}

// ==================== MCP Proxy Management ====================

/**
 * Get MCP proxy configuration
 */
export async function getMcpProxy(): Promise<{ mcpProxy: { enabled: boolean; token?: string } }> {
  const response = await fetch(`${API_BASE}/config/mcp-proxy`);
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to get MCP proxy config');
  }
  return response.json();
}

/**
 * Update MCP proxy configuration
 */
export async function updateMcpProxy(
  updates: { enabled?: boolean; token?: string; enabledServices?: string[] }
): Promise<{ success: boolean; message: string }> {
  const response = await fetch(`${API_BASE}/config/mcp-proxy`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to update MCP proxy config');
  }
  
  return response.json();
}

/**
 * Update Xiaozhi configuration
 */
export async function updateXiaozhi(
  updates: { enabledServices?: string[] }
): Promise<{ success: boolean; message: string }> {
  const response = await fetch(`${API_BASE}/config/xiaozhi`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to update Xiaozhi config');
  }
  
  return response.json();
}

/**
 * Generate a new random token
 */
export async function generateProxyToken(): Promise<{ success: boolean; token: string }> {
  const response = await fetch(`${API_BASE}/config/mcp-proxy/generate-token`, {
    method: 'POST',
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to generate token');
  }
  
  return response.json();
}
