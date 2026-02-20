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
} from '@mcp-gateway/shared';
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

  // Plugins (proxy through server to avoid CORS)
  getPlugins: (params?: {
    wd?: string;
    type?: string;
    pn?: number;
    lg?: string;
    pl?: number;
  }) => {
    const query = new URLSearchParams();
    query.append('wd', params?.wd || 'all');
    query.append('type', params?.type || 'tag');
    query.append('pn', (params?.pn || 0).toString());
    query.append('lg', params?.lg || 'zh');
    query.append('pl', (params?.pl || 100).toString());
    
    return apiClient.get<{
      category: Array<{
        key: string;
        name: string;
        value: Array<{ key: string; name: string; total: number }>;
        total: number;
      }>;
      count: number;
      mcpList: Array<{
        query: string;
        total: number;
        servers: Array<{
          id: string;
          serverName: string;
          description: string;
          serverIcon: string;
          serverUrl: string;
          labels: string[];
          creator: string;
          updateTime: string;
          star: number;
          favoritesNumber: number;
          level: number;
        }>;
      }>;
    }>(`/api/plugins?${query}`);
  },

  getPluginDetail: (id: string, lg: string = 'zh') =>
    apiClient.get<{
      detail: {
        id: string;
        serverName: string;
        description: string;
        serverIcon: string;
        serverUrl: string;
        labels: string[];
        abstract: Array<{
          key: string;
          name: string;
          value: string;
        }>;
        creator: string;
        updateTime: string;
        star: number;
        favoritesNumber: number;
        level: string;
        levelDesc: string;
        levelDetail: Array<{
          key: string;
          name: string;
          status: string;
          description: string;
        }>;
      };
      recommended: any[];
    }>(`/api/plugins/detail/${id}?lg=${lg}`),

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
        meta?: Record<string, unknown>;
      }>;
      total: number;
      bufferSize: number;
    }>(`/api/logs${queryString ? `?${queryString}` : ''}`);
  },
  
  clearLogs: () =>
    apiClient.delete<{ success: boolean; message: string }>('/api/logs'),
};
