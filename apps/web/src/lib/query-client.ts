import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000,
      // Only retry on genuine network failures, not 4xx/5xx API errors
      retry: (failureCount, error) => {
        if (error instanceof Error && /^HTTP [45]/.test(error.message)) return false
        return failureCount < 2
      },
      refetchOnWindowFocus: false,
    },
    mutations: { retry: 0 },
  },
})
