import { useAuthStore } from '~/stores/auth'

export default defineNuxtRouteMiddleware(async (to) => {
  const authStore = useAuthStore()

  // Initialize auth on first load
  if (import.meta.client && !authStore.isAuthenticated) {
    await authStore.initAuth()
  }

  // Allow access to login page
  if (to.path === '/login') {
    // If already authenticated, redirect to home
    if (authStore.isAuthenticated) {
      return navigateTo('/')
    }
    return
  }

  // Protect all other routes
  if (!authStore.isAuthenticated) {
    return navigateTo('/login')
  }
})
