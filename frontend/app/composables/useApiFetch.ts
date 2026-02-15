/**
 * Composable for making authenticated API calls
 *
 * Uses the $apiFetch plugin which automatically:
 * - Adds Authorization header with JWT token
 * - Handles 401 responses by clearing auth and redirecting to login
 * - Handles 403 responses with permission error toast
 *
 * @returns $apiFetch instance
 */
export function useApiFetch() {
  const nuxtApp = useNuxtApp()

  return {
    $apiFetch: nuxtApp.$apiFetch as typeof $fetch,
  }
}
