import { defineStore } from 'pinia'
import { useAuthStore } from './auth'

export type RouterStatus = 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE'

export interface CompanyInfo {
  id: string
  name: string
  code: string
}

export interface Router {
  id: string
  name: string
  ipAddress: string
  macAddress?: string | null
  model?: string | null
  location?: string | null
  status: RouterStatus
  lastSeen?: string | null
  companyId?: string | null
  company?: CompanyInfo | null
  username: string
  password: string
  apiPort?: number | null
  sshPort?: number | null
  createdAt: string
  updatedAt: string
}

export interface CreateRouterInput {
  name: string
  ipAddress: string
  macAddress?: string
  model?: string
  location?: string
  status?: RouterStatus
  companyId?: string
  username: string
  password: string
  apiPort?: number
  sshPort?: number
}

export interface UpdateRouterInput {
  name?: string
  ipAddress?: string
  macAddress?: string
  model?: string
  location?: string
  status?: RouterStatus
  lastSeen?: string
  companyId?: string
  username?: string
  password?: string
  apiPort?: number
  sshPort?: number
}

interface RouterState {
  routers: Router[]
  currentRouter: Router | null
  isLoading: boolean
  error: string | null
}

export const useRouterStore = defineStore('router', {
  state: (): RouterState => ({
    routers: [],
    currentRouter: null,
    isLoading: false,
    error: null,
  }),

  actions: {
    async fetchRouters() {
      this.isLoading = true
      this.error = null

      try {
        const config = useRuntimeConfig()
        const authStore = useAuthStore()
        const apiBase = config.public.apiBase || 'http://localhost:5000/api'

        const response = await $fetch<{ status: string, data: Router[] }>(
          `${apiBase}/routers`,
          {
            headers: {
              Authorization: `Bearer ${authStore.token}`,
            },
          },
        )

        this.routers = response.data
        return { success: true, data: response.data }
      }
      catch (error: any) {
        console.error('Fetch routers error:', error)
        this.error = error?.data?.message || error?.message || 'Failed to fetch routers. Please check your connection.'
        // Clear old data on error to avoid confusion
        this.routers = []
        return {
          success: false,
          error: this.error,
        }
      }
      finally {
        this.isLoading = false
      }
    },

    async fetchRouterById(id: string) {
      this.isLoading = true
      this.error = null

      try {
        const config = useRuntimeConfig()
        const authStore = useAuthStore()
        const apiBase = config.public.apiBase || 'http://localhost:5000/api'

        const response = await $fetch<{ status: string, data: Router }>(
          `${apiBase}/routers/${id}`,
          {
            headers: {
              Authorization: `Bearer ${authStore.token}`,
            },
          },
        )

        this.currentRouter = response.data
        return { success: true, data: response.data }
      }
      catch (error: any) {
        console.error('Fetch router error:', error)
        this.error = error?.data?.message || error?.message || 'Failed to fetch router details'
        return {
          success: false,
          error: this.error,
        }
      }
      finally {
        this.isLoading = false
      }
    },

    async createRouter(data: CreateRouterInput) {
      this.isLoading = true
      this.error = null

      try {
        const config = useRuntimeConfig()
        const authStore = useAuthStore()
        const apiBase = config.public.apiBase || 'http://localhost:5000/api'

        const response = await $fetch<{ status: string, data: Router }>(
          `${apiBase}/routers`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${authStore.token}`,
            },
            body: data,
          },
        )

        // Add new router to the list
        this.routers.push(response.data)
        return { success: true, data: response.data }
      }
      catch (error: any) {
        console.error('Create router error:', error)
        this.error = error?.data?.message || error?.message || 'Failed to create router'
        return {
          success: false,
          error: this.error,
        }
      }
      finally {
        this.isLoading = false
      }
    },

    async updateRouter(id: string, data: UpdateRouterInput) {
      this.isLoading = true
      this.error = null

      try {
        const config = useRuntimeConfig()
        const authStore = useAuthStore()
        const apiBase = config.public.apiBase || 'http://localhost:5000/api'

        const response = await $fetch<{ status: string, data: Router }>(
          `${apiBase}/routers/${id}`,
          {
            method: 'PUT',
            headers: {
              Authorization: `Bearer ${authStore.token}`,
            },
            body: data,
          },
        )

        // Update router in the list
        const index = this.routers.findIndex(r => r.id === id)
        if (index !== -1) {
          this.routers[index] = response.data
        }

        // Update current router if it's the one being updated
        if (this.currentRouter?.id === id) {
          this.currentRouter = response.data
        }

        return { success: true, data: response.data }
      }
      catch (error: any) {
        console.error('Update router error:', error)
        this.error = error?.data?.message || error?.message || 'Failed to update router'
        return {
          success: false,
          error: this.error,
        }
      }
      finally {
        this.isLoading = false
      }
    },

    async deleteRouter(id: string) {
      this.isLoading = true
      this.error = null

      try {
        const config = useRuntimeConfig()
        const authStore = useAuthStore()
        const apiBase = config.public.apiBase || 'http://localhost:5000/api'

        await $fetch(`${apiBase}/routers/${id}`, {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${authStore.token}`,
          },
        })

        // Remove router from the list
        this.routers = this.routers.filter(r => r.id !== id)

        // Clear current router if it's the one being deleted
        if (this.currentRouter?.id === id) {
          this.currentRouter = null
        }

        return { success: true }
      }
      catch (error: any) {
        console.error('Delete router error:', error)
        this.error = error?.data?.message || error?.message || 'Failed to delete router'
        return {
          success: false,
          error: this.error,
        }
      }
      finally {
        this.isLoading = false
      }
    },

    clearError() {
      this.error = null
    },

    clearCurrentRouter() {
      this.currentRouter = null
    },
  },

  getters: {
    activeRouters: state =>
      state.routers.filter(r => r.status === 'ACTIVE'),

    inactiveRouters: state =>
      state.routers.filter(r => r.status === 'INACTIVE'),

    maintenanceRouters: state =>
      state.routers.filter(r => r.status === 'MAINTENANCE'),

    routerCount: state => state.routers.length,

    getRouterById: state => (id: string) =>
      state.routers.find(r => r.id === id),
  },
})
