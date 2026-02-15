import { useAuthStore } from '~/stores/auth'

/**
 * API Fetch Plugin - Intercepts all $fetch calls to handle authentication
 *
 * Features:
 * - Automatically adds Authorization header with JWT token
 * - Handles 401 Unauthorized responses by clearing auth and redirecting to login
 * - Handles 403 Forbidden responses
 * - Retries failed requests once after token refresh (if implemented in future)
 */

export default defineNuxtPlugin((nuxtApp) => {
  const authStore = useAuthStore()
  const config = useRuntimeConfig()
  const apiBase = config.public.apiBase || 'http://localhost:5000/api'

  // Track if we're already redirecting to prevent multiple redirects
  let isRedirecting = false

  // Flag to track if we need to skip auth (for login endpoint)
  const skipAuthEndpoints = ['/users/login', '/users/register']

  const apiFetch = $fetch.create({
    // Set base URL for all requests
    baseURL: apiBase,

    onRequest({ options }) {
      // Get current token from store (always fresh)
      const token = authStore.token

      // Add Authorization header if token exists
      if (token && options.headers) {
        options.headers = {
          ...options.headers,
          Authorization: `Bearer ${token}`,
        }
      }
    },

    async onResponseError({ response, request }) {
      const url = typeof request === 'string' ? request : request.url
      const isSkipAuth = skipAuthEndpoints.some(endpoint => url.includes(endpoint))

      // Skip auth error handling for login/register endpoints
      if (isSkipAuth) {
        return
      }

      // Handle 401 Unauthorized - Token expired or invalid
      if (response.status === 401) {
        // Prevent multiple redirects
        if (!isRedirecting) {
          isRedirecting = true

          // Clear auth state
          authStore.clearAuth()

          // Show toast notification
          if (import.meta.client) {
            const { toast } = await import('vue-sonner')
            toast.error('Session expired. Please login again.', {
              duration: 3000,
            })

            // Redirect to login (using window.location to avoid router issues)
            setTimeout(() => {
              window.location.href = '/login'
            }, 100)
          }

          // Reset redirect flag after delay
          setTimeout(() => {
            isRedirecting = false
          }, 1000)
        }
      }

      // Handle 403 Forbidden - Insufficient permissions
      if (response.status === 403 && import.meta.client) {
        const { toast } = await import('vue-sonner')
        toast.error('You do not have permission to access this resource.', {
          duration: 3000,
        })
      }
    },
  })

  // Provide the apiFetch instance globally
  return {
    provide: {
      apiFetch,
    },
  }
})

// Type declaration for the provided apiFetch
declare module '#app' {
  interface NuxtApp {
    $apiFetch: typeof $fetch
  }
}
