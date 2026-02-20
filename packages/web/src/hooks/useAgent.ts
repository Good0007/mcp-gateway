/**
 * React Query Hooks for Agent Status
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { agentApi } from '@/lib/api-endpoints';

export const QUERY_KEYS = {
  status: ['agent', 'status'] as const,
  services: ['services'] as const,
  service: (id: string) => ['services', id] as const,
  tools: ['tools'] as const,
  plugins: ['plugins'] as const,
  logs: (params?: any) => ['logs', params] as const,
};

/**
 * Get agent status
 */
export function useAgentStatus(refetchInterval = 5000) {
  return useQuery({
    queryKey: QUERY_KEYS.status,
    queryFn: agentApi.getStatus,
    refetchInterval,
  });
}

/**
 * Get all services
 */
export function useServices() {
  return useQuery({
    queryKey: QUERY_KEYS.services,
    queryFn: agentApi.getServices,
  });
}

/**
 * Get service detail
 */
export function useService(id: string) {
  return useQuery({
    queryKey: QUERY_KEYS.service(id),
    queryFn: () => agentApi.getService(id),
    enabled: !!id,
  });
}

/**
 * Start a service
 */
export function useStartService() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => agentApi.startService(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.services });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.status });
    },
  });
}

/**
 * Stop a service
 */
export function useStopService() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => agentApi.stopService(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.services });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.status });
    },
  });
}

/**
 * Delete a service
 */
export function useDeleteService() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => agentApi.deleteService(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.services });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.status });
    },
  });
}

/**
 * Add a new service
 */
export function useAddService() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (service: any) => agentApi.addService(service),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.services });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.status });
      queryClient.invalidateQueries({ queryKey: ['webConfig'] });
    },
  });
}

/**
 * Update a service
 */
export function useUpdateService() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: any }) => 
      agentApi.updateService(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.services });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.status });
    },
  });
}

/**
 * Get all tools
 */
export function useTools() {
  return useQuery({
    queryKey: QUERY_KEYS.tools,
    queryFn: agentApi.getTools,
    // Refresh tools every 10 seconds to keep up with dynamic changes
    refetchInterval: 10000, 
  });
}

/**
 * Call a tool
 */
export function useCallTool() {
  return useMutation({
    mutationFn: agentApi.callTool,
  });
}

/**
 * Get plugins
 */
export function usePlugins(params?: {
  wd?: string;
  type?: string;
  pn?: number;
  lg?: string;
  pl?: number;
}) {
  return useQuery({
    queryKey: [...QUERY_KEYS.plugins, params],
    queryFn: () => agentApi.getPlugins(params),
  });
}

/**
 * Get plugin detail
 */
export function usePluginDetail(id: string | null, lg: string = 'zh') {
  return useQuery({
    queryKey: ['pluginDetail', id, lg],
    queryFn: () => agentApi.getPluginDetail(id!, lg),
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // 5分钟内不重新请求
    gcTime: 10 * 60 * 1000, // 10分钟后清除缓存
  });
}

/**
 * Get logs with optional filters
 */
export function useLogs(
  params?: {
    level?: string;
    service?: string;
    search?: string;
    limit?: number;
  },
  refetchInterval?: number
) {
  return useQuery({
    queryKey: QUERY_KEYS.logs(params),
    queryFn: () => agentApi.getLogs(params),
    refetchInterval: refetchInterval || 3000, // Auto-refresh every 3 seconds
  });
}

/**
 * Clear all logs
 */
export function useClearLogs() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: agentApi.clearLogs,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.logs() });
    },
  });
}
