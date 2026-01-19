import { useAuthStore } from '~/stores/auth'

export default defineNuxtRouteMiddleware(async (to) => {
  // Skip middleware on server side
  if (import.meta.server) {
    return
  }

  const authStore = useAuthStore()

  // Initialize auth from localStorage on first load
  await authStore.initAuth()

  console.log('[Auth Middleware]', {
    path: to.path,
    isAuthenticated: authStore.isAuthenticated,
    hasToken: !!authStore.token,
    hasUser: !!authStore.user,
  })

  // Allow access to login page
  if (to.path === '/login') {
    // If already authenticated, redirect to home
    if (authStore.isAuthenticated) {
      console.log('[Auth Middleware] Already authenticated, redirecting to home')
      return navigateTo('/', { replace: true })
    }
    console.log('[Auth Middleware] Allowing access to login page')
    return
  }

  // Protect all other routes
  if (!authStore.isAuthenticated) {
    console.log('[Auth Middleware] Not authenticated, redirecting to login')
    return navigateTo('/login', { replace: true })
  }

  console.log('[Auth Middleware] Authenticated, allowing access')
})
