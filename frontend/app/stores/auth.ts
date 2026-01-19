import { defineStore } from 'pinia'

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
}

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({
    user: null,
    token: null,
    isAuthenticated: false,
    isInitialized: false,
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
      }
    },

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
            const user = JSON.parse(userStr)
            this.user = user
            this.token = token
            this.isAuthenticated = true
          } catch (error) {
            console.error('Failed to parse stored auth data:', error)
            this.clearAuth()
          }
        }
      }

      this.isInitialized = true
    },

    async login(username: string, password: string) {
      try {
        const config = useRuntimeConfig()
        const apiBase = config.public.apiBase || 'http://localhost:5000/api'

        const response = await $fetch<{ success: boolean; data: { token: string; user: User } }>(`${apiBase}/users/login`, {
          method: 'POST',
          body: { username, password },
        })

        this.setAuth(response.data.user, response.data.token)
        return { success: true }
      } catch (error: any) {
        console.error('Login error:', error)
        return {
          success: false,
          error: error?.data?.message || 'Login failed. Please check your credentials.'
        }
      }
    },

    async logout() {
      this.clearAuth()
      navigateTo('/login')
    },
  },

  getters: {
    isAdmin: (state) => state.user?.role === 'ADMIN',
    isUser: (state) => state.user?.role === 'USER',
    isViewer: (state) => state.user?.role === 'VIEWER',
  },
})
