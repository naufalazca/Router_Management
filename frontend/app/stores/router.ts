import { defineStore } from 'pinia'

export interface ApiFieldError {
  field: string
  message: string
}

/**
 * Build a readable error message from an API error response.
 * For Zod validation errors (400) the backend sends:
 *   { status: 'error', message: 'Validation error', errors: [{ field, message }] }
 * so we join the per-field details into the message.
 */
export function extractApiErrorMessage(error: any, fallback: string): string {
  const data = error?.data ?? error?.response?._data

  const fieldErrors: ApiFieldError[] | undefined = Array.isArray(data?.errors)
    ? data.errors
    : undefined

  if (fieldErrors && fieldErrors.length > 0) {
    const details = fieldErrors
      .map((e) => {
        const field = e.field?.replace(/^body\./, '') || 'field'
        return `${field}: ${e.message}`
      })
      .join(', ')
    return `Validation failed — ${details}`
  }

  return data?.message || error?.message || fallback
}

export type RouterStatus = 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE'
export type RouterType = 'UPSTREAM' | 'CORE' | 'DISTRIBUSI' | 'WIRELESS'
export type RouterBrand = 'MIKROTIK' | 'UBIVIQUITI'

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
  routerType: RouterType
  routerBrand: RouterBrand
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
  routerType?: RouterType
  routerBrand?: RouterBrand
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
  routerType?: RouterType
  routerBrand?: RouterBrand
  lastSeen?: string
  companyId?: string
  username?: string
  password?: string
  apiPort?: number
  sshPort?: number
}

interface RouterState {
  routers: Router[]
  bgpRouters: Router[] // Routers that support BGP (MikroTik + Upstream + Active)
  currentRouter: Router | null
  isLoading: boolean
  error: string | null
}

export const useRouterStore = defineStore('router', {
  state: (): RouterState => ({
    routers: [],
    bgpRouters: [],
    currentRouter: null,
    isLoading: false,
    error: null,
  }),

  actions: {
    async fetchRouters() {
      this.isLoading = true
      this.error = null

      try {
        const { $apiFetch } = useApiFetch()

        const response = await $apiFetch<{ status: string, data: Router[] }>('/routers')

        // Ensure response.data is an array
        this.routers = response.data || []
        return { success: true, data: response.data || [] }
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

    /**
     * Fetch routers that support BGP operations
     * Only returns MikroTik routers with type UPSTREAM and status ACTIVE
     */
    async fetchBgpRouters() {
      this.isLoading = true
      this.error = null

      try {
        const { $apiFetch } = useApiFetch()

        const response = await $apiFetch<{ status: string, data: Router[] }>('/routers/bgp')

        this.bgpRouters = response.data
        return { success: true, data: response.data }
      }
      catch (error: any) {
        console.error('Fetch BGP routers error:', error)
        this.error = error?.data?.message || error?.message || 'Failed to fetch BGP routers. Please check your connection.'
        this.bgpRouters = []
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
        const { $apiFetch } = useApiFetch()

        const response = await $apiFetch<{ status: string, data: Router }>(`/routers/${id}`)

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
        const { $apiFetch } = useApiFetch()

        const response = await $apiFetch<{ status: string, data: Router }>('/routers', {
          method: 'POST',
          body: data,
        })

        // Add new router to the list
        this.routers.push(response.data)
        return { success: true, data: response.data }
      }
      catch (error: any) {
        console.error('Create router error:', error)
        // Note: do NOT set this.error here — the create modal shows the toast,
        // and this.error drives the page-level "Error Loading Data" alert.
        const message = extractApiErrorMessage(error, 'Failed to create router')

        // Collect per-field errors from backend validation (Zod)
        const rawErrors = error?.data?.errors ?? error?.response?._data?.errors
        const fieldErrors: Record<string, string> | undefined = Array.isArray(rawErrors) && rawErrors.length > 0
          ? Object.fromEntries(rawErrors.map((e: any) => [String(e.field ?? '').replace(/^body\./, ''), e.message]))
          : undefined

        return {
          success: false,
          error: message,
          fieldErrors,
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
        const { $apiFetch } = useApiFetch()

        const response = await $apiFetch<{ status: string, data: Router }>(`/routers/${id}`, {
          method: 'PUT',
          body: data,
        })

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
        // Same as createRouter: the edit modal shows the toast itself.
        return {
          success: false,
          error: extractApiErrorMessage(error, 'Failed to update router'),
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
        const { $apiFetch } = useApiFetch()

        await $apiFetch(`/routers/${id}`, {
          method: 'DELETE',
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
        // Do NOT set this.error — the delete dialog shows the toast itself,
        // and this.error drives the page-level "Error Loading Data" alert.
        return {
          success: false,
          error: extractApiErrorMessage(error, 'Failed to delete router'),
        }
      }
      finally {
        this.isLoading = false
      }
    },

    async testConnection(routerId: string, type: 'API' | 'SSH' | 'BOTH' = 'BOTH') {
      this.isLoading = true
      this.error = null

      try {
        const { $apiFetch } = useApiFetch()

        const response = await $apiFetch<{ status: string, data: any }>(`/routers/${routerId}/test?type=${type}`, {
          method: 'POST',
        })

        return { success: true, data: response.data }
      }
      catch (error: any) {
        console.error('Test connection error:', error)
        // Do NOT set this.error — the page shows the toast itself.
        return {
          success: false,
          error: extractApiErrorMessage(error, 'Failed to test router connection'),
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

    // Filter by RouterType
    upstreamRouters: state =>
      state.routers.filter(r => r.routerType === 'UPSTREAM'),

    coreRouters: state =>
      state.routers.filter(r => r.routerType === 'CORE'),

    distribusiRouters: state =>
      state.routers.filter(r => r.routerType === 'DISTRIBUSI'),

    wirelessRouters: state =>
      state.routers.filter(r => r.routerType === 'WIRELESS'),

    // Filter by RouterBrand
    mikrotikRouters: state =>
      state.routers.filter(r => r.routerBrand === 'MIKROTIK'),

    ubiquitiRouters: state =>
      state.routers.filter(r => r.routerBrand === 'UBIVIQUITI'),

    routerCount: state => state.routers?.length ?? 0,

    getRouterById: state => (id: string) =>
      state.routers.find(r => r.id === id),
  },
})
