/**
 * API Endpoints and Types
 */

import type {
  AgentStatusResponse,
  ServiceListResponse,
  ServiceDetailResponse,
  ServiceConfig,
  ToolListResponse,
  ToolCallRequestBody,
  ToolCallResponse,
  PluginMetadata,
} from '@mcp-agent/shared';
import { apiClient } from './api';

export const agentApi = {
  // Agent Status
  getStatus: () => apiClient.get<AgentStatusResponse>('/api/status'),

  // Services
  getServices: () => apiClient.get<ServiceListResponse>('/api/services'),
  getService: (id: string) =>
    apiClient.get<ServiceDetailResponse>(`/api/services/${id}`),
  addService: (service: ServiceConfig) =>
    apiClient.post<{ success: boolean; message: string; service: ServiceConfig }>('/api/services', service),
  updateService: (id: string, updates: Partial<ServiceConfig>) =>
    apiClient.put<{ success: boolean; message: string }>(`/api/services/${id}`, updates),
  startService: (id: string) =>
    apiClient.post<{ success: boolean; message: string }>(`/api/services/${id}/start`),
  stopService: (id: string) =>
    apiClient.post<{ success: boolean; message: string }>(`/api/services/${id}/stop`),
  deleteService: (id: string) =>
    apiClient.delete<{ success: boolean; message: string }>(`/api/services/${id}`),

  // Tools
  getTools: () => apiClient.get<ToolListResponse>('/api/tools'),
  callTool: (request: ToolCallRequestBody) =>
    apiClient.post<ToolCallResponse>('/api/tools/call', request),

  // Plugins
  getPlugins: () =>
    apiClient.get<{ plugins: PluginMetadata[] }>('/api/plugins'),

  // Logs
  getLogs: (params?: {
    level?: string;
    service?: string;
    search?: string;
    limit?: number;
  }) => {
    const query = new URLSearchParams();
    if (params?.level) query.append('level', params.level);
    if (params?.service) query.append('service', params.service);
    if (params?.search) query.append('search', params.search);
    if (params?.limit) query.append('limit', params.limit.toString());
    
    const queryString = query.toString();
    return apiClient.get<{
      logs: Array<{
        timestamp: string;
        level: 'error' | 'warn' | 'info' | 'debug';
        message: string;
        service?: string;
        meta?: Record<string, any>;
      }>;
      total: number;
      bufferSize: number;
    }>(`/api/logs${queryString ? `?${queryString}` : ''}`);
  },
  
  clearLogs: () =>
    apiClient.delete<{ success: boolean; message: string }>('/api/logs'),
};
