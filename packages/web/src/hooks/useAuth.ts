/**
 * React Query Hooks for Authentication
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as authApi from '../api/auth';

/**
 * Hook to get authentication status (whether auth is enabled and if user is authenticated)
 */
export function useAuthStatus() {
  return useQuery({
    queryKey: ['authStatus'],
    queryFn: authApi.getAuthStatus,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: false,
  });
}

/**
 * Hook to login
 */
export function useLogin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: authApi.login,
    onSuccess: () => {
      // Invalidate auth status to refresh authentication state
      queryClient.invalidateQueries({ queryKey: ['authStatus'] });
    },
  });
}

/**
 * Hook to logout
 */
export function useLogout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: authApi.logout,
    onSuccess: () => {
      // Immediately update auth status to trigger login page
      queryClient.setQueryData(['authStatus'], { enabled: true, authenticated: false });
      // Clear all other queries
      queryClient.removeQueries({ predicate: (query) => query.queryKey[0] !== 'authStatus' });
    },
  });
}

/**
 * Hook to verify session
 */
export function useVerifySession() {
  return useQuery({
    queryKey: ['sessionVerify'],
    queryFn: authApi.verifySession,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: false,
  });
}
