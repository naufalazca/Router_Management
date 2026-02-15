import { defineStore } from 'pinia'
import { isTokenExpired, getUserFromToken } from '~/lib/jwt'

interface User {
  id: string
  username: string
  email: string
  role: 'ADMIN' | 'USER' | 'VIEWER'
  fullName?: string
}

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isInitialized: boolean
  tokenExpiryCheckInterval: ReturnType<typeof setInterval> | null
}

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({
    user: null,
    token: null,
    isAuthenticated: false,
    isInitialized: false,
    tokenExpiryCheckInterval: null,
  }),

  actions: {
    setAuth(user: User, token: string) {
      this.user = user
      this.token = token
      this.isAuthenticated = true

      // Save to localStorage
      if (import.meta.client) {
        localStorage.setItem('token', token)
        localStorage.setItem('user', JSON.stringify(user))

        // Setup periodic token expiry check
        this.setupTokenExpiryCheck()
      }
    },

    clearAuth() {
      this.user = null
      this.token = null
      this.isAuthenticated = false

      // Clear localStorage
      if (import.meta.client) {
        localStorage.removeItem('token')
        localStorage.removeItem('user')

        // Clear interval if exists
        if (this.tokenExpiryCheckInterval) {
          clearInterval(this.tokenExpiryCheckInterval)
          this.tokenExpiryCheckInterval = null
        }
      }
    },

    /**
     * Initialize auth from localStorage and validate token
     * This checks if the stored token is still valid before setting auth state
     */
    initAuth() {
      // Skip if already initialized in this session
      if (this.isInitialized) {
        return
      }

      if (import.meta.client) {
        const token = localStorage.getItem('token')
        const userStr = localStorage.getItem('user')

        if (token && userStr) {
          try {
            // Check if token is expired
            if (isTokenExpired(token)) {
              console.log('Token expired, clearing auth')
              this.clearAuth()
              this.isInitialized = true
              return
            }

            // Verify token contains expected user data
            const tokenPayload = getUserFromToken(token)
            if (!tokenPayload) {
              console.log('Invalid token format, clearing auth')
              this.clearAuth()
              this.isInitialized = true
              return
            }

            const user = JSON.parse(userStr)
            this.user = user
            this.token = token
            this.isAuthenticated = true

            // Setup periodic token expiry check
            this.setupTokenExpiryCheck()
          }
          catch (error) {
            console.error('Failed to parse stored auth data:', error)
            this.clearAuth()
          }
        }
      }

      this.isInitialized = true
    },

    /**
     * Setup periodic check for token expiry
     * Logs user out automatically when token expires
     */
    setupTokenExpiryCheck() {
      // Clear any existing interval
      if (this.tokenExpiryCheckInterval) {
        clearInterval(this.tokenExpiryCheckInterval)
      }

      // Check every minute
      if (import.meta.client && this.token) {
        this.tokenExpiryCheckInterval = setInterval(() => {
          if (this.token && isTokenExpired(this.token)) {
            console.log('Token expired during session, logging out')
            this.logout()
          }
        }, 60000) // Check every 60 seconds
      }
    },

    /**
     * Check if current token is expired without clearing auth
     * Useful for proactive checks before API calls
     */
    isExpired(): boolean {
      if (!this.token) {
        return true
      }
      return isTokenExpired(this.token)
    },

    /**
     * Get time remaining until token expires (in milliseconds)
     */
    getTimeUntilExpiry(): number {
      if (!this.token) {
        return 0
      }
      const decoded = getUserFromToken(this.token)
      if (!decoded || !decoded.exp) {
        return 0
      }
      const expirationTime = decoded.exp * 1000
      const currentTime = Date.now()
      return Math.max(0, expirationTime - currentTime)
    },

    async login(username: string, password: string) {
      try {
        const config = useRuntimeConfig()
        const apiBase = config.public.apiBase || 'http://localhost:5000/api'

        const response = await $fetch<{ success: boolean, data: { token: string, user: User } }>(`${apiBase}/users/login`, {
          method: 'POST',
          body: { username, password },
        })

        this.setAuth(response.data.user, response.data.token)
        return { success: true }
      }
      catch (error: any) {
        console.error('Login error:', error)
        return {
          success: false,
          error: error?.data?.message || 'Login failed. Please check your credentials.',
        }
      }
    },

    async logout() {
      this.clearAuth()
      navigateTo('/login')
    },
  },

  getters: {
    isAdmin: state => state.user?.role === 'ADMIN',
    isUser: state => state.user?.role === 'USER',
    isViewer: state => state.user?.role === 'VIEWER',
  },
})
