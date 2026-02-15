/**
 * Web Configuration API Client
 */

import type { 
  WebConfigResponse, 
  ExportConfigResponse,
  XiaozhiEndpoint,
} from '@mcp-agent/shared';

const API_BASE = 'http://localhost:3001/api';

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
