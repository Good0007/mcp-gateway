/**
 * React Query Hooks for Web Configuration
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as configApi from '../api/config';

// ==================== Configuration ====================

/**
 * Hook to get web configuration
 */
export function useWebConfig() {
  return useQuery({
    queryKey: ['webConfig'],
    queryFn: configApi.getWebConfig,
  });
}

/**
 * Hook to export configuration
 */
export function useExportConfig() {
  return useMutation({
    mutationFn: configApi.exportConfig,
  });
}

/**
 * Hook to import configuration
 */
export function useImportConfig() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: configApi.importConfig,
    onSuccess: () => {
      // Invalidate all config-related queries
      queryClient.invalidateQueries({ queryKey: ['webConfig'] });
      queryClient.invalidateQueries({ queryKey: ['endpoints'] });
      queryClient.invalidateQueries({ queryKey: ['preferences'] });
    },
  });
}

// ==================== Endpoints ====================

/**
 * Hook to get all endpoints
 */
export function useEndpoints() {
  return useQuery({
    queryKey: ['endpoints'],
    queryFn: configApi.getEndpoints,
  });
}

/**
 * Hook to add endpoint
 */
export function useAddEndpoint() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: configApi.addEndpoint,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['endpoints'] });
      queryClient.invalidateQueries({ queryKey: ['webConfig'] });
    },
  });
}

/**
 * Hook to remove endpoint
 */
export function useRemoveEndpoint() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: configApi.removeEndpoint,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['endpoints'] });
      queryClient.invalidateQueries({ queryKey: ['webConfig'] });
    },
  });
}

/**
 * Hook to select current endpoint
 */
export function useSelectEndpoint() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: configApi.selectEndpoint,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['endpoints'] });
      queryClient.invalidateQueries({ queryKey: ['webConfig'] });
    },
  });
}

// ==================== Preferences ====================

/**
 * Hook to get preferences
 */
export function usePreferences() {
  return useQuery({
    queryKey: ['preferences'],
    queryFn: configApi.getPreferences,
  });
}

/**
 * Hook to update preferences
 */
export function useUpdatePreferences() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: configApi.updatePreferences,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['preferences'] });
      queryClient.invalidateQueries({ queryKey: ['webConfig'] });
    },
  });
}
