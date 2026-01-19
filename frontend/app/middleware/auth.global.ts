import { useAuthStore } from '~/stores/auth'

export default defineNuxtRouteMiddleware((to) => {
  // Skip middleware on server side
  if (import.meta.server) {
    return
  }

  const authStore = useAuthStore()

  // Initialize auth from localStorage on first load
  authStore.initAuth()

  // Allow access to login page
  if (to.path === '/login') {
    // If already authenticated, redirect to home
    if (authStore.isAuthenticated) {
      return navigateTo('/', { replace: true })
    }
    return
  }

  // Protect all other routes
  if (!authStore.isAuthenticated) {
    return navigateTo('/login', { replace: true })
  }
})
