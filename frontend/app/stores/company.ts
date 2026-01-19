import { defineStore } from 'pinia'
import { useAuthStore } from './auth'

export interface Company {
  id: string
  name: string
  code: string
  address: string
  description?: string | null
  logo?: string | null
  masterUsername: string
  masterPassword?: string // Only available when fetching single company
  routerCount?: number
  createdAt: string
  updatedAt: string
}

export interface CreateCompanyInput {
  name: string
  code: string
  address: string
  description?: string
  logo?: string
  masterUsername: string
  masterPassword: string
}

export interface UpdateCompanyInput {
  name?: string
  code?: string
  address?: string
  description?: string
  logo?: string
  masterUsername?: string
  masterPassword?: string
}

export interface CompanyRouter {
  id: string
  name: string
  ipAddress: string
  macAddress?: string | null
  model?: string | null
  location?: string | null
  status: string
  lastSeen?: string | null
  companyId?: string | null
  createdAt: string
  updatedAt: string
}

interface CompanyState {
  companies: Company[]
  currentCompany: Company | null
  companyRouters: CompanyRouter[]
  isLoading: boolean
  error: string | null
}

export const useCompanyStore = defineStore('company', {
  state: (): CompanyState => ({
    companies: [],
    currentCompany: null,
    companyRouters: [],
    isLoading: false,
    error: null,
  }),

  actions: {
    async fetchCompanies() {
      this.isLoading = true
      this.error = null

      try {
        const config = useRuntimeConfig()
        const authStore = useAuthStore()
        const apiBase = config.public.apiBase || 'http://localhost:5000/api'

        const response = await $fetch<{ status: string; data: Company[] }>(
          `${apiBase}/companies`,
          {
            headers: {
              Authorization: `Bearer ${authStore.token}`,
            },
          }
        )

        this.companies = response.data
        return { success: true, data: response.data }
      } catch (error: any) {
        console.error('Fetch companies error:', error)
        this.error = error?.data?.message || 'Failed to fetch companies'
        return {
          success: false,
          error: this.error,
        }
      } finally {
        this.isLoading = false
      }
    },

    async fetchCompanyById(id: string) {
      this.isLoading = true
      this.error = null

      try {
        const config = useRuntimeConfig()
        const authStore = useAuthStore()
        const apiBase = config.public.apiBase || 'http://localhost:5000/api'

        const response = await $fetch<{ status: string; data: Company }>(
          `${apiBase}/companies/${id}`,
          {
            headers: {
              Authorization: `Bearer ${authStore.token}`,
            },
          }
        )

        this.currentCompany = response.data
        return { success: true, data: response.data }
      } catch (error: any) {
        console.error('Fetch company error:', error)
        this.error = error?.data?.message || 'Failed to fetch company'
        return {
          success: false,
          error: this.error,
        }
      } finally {
        this.isLoading = false
      }
    },

    async fetchCompanyByCode(code: string) {
      this.isLoading = true
      this.error = null

      try {
        const config = useRuntimeConfig()
        const authStore = useAuthStore()
        const apiBase = config.public.apiBase || 'http://localhost:5000/api'

        const response = await $fetch<{ status: string; data: Company }>(
          `${apiBase}/companies/code/${code}`,
          {
            headers: {
              Authorization: `Bearer ${authStore.token}`,
            },
          }
        )

        this.currentCompany = response.data
        return { success: true, data: response.data }
      } catch (error: any) {
        console.error('Fetch company by code error:', error)
        this.error = error?.data?.message || 'Failed to fetch company'
        return {
          success: false,
          error: this.error,
        }
      } finally {
        this.isLoading = false
      }
    },

    async createCompany(data: CreateCompanyInput) {
      this.isLoading = true
      this.error = null

      try {
        const config = useRuntimeConfig()
        const authStore = useAuthStore()
        const apiBase = config.public.apiBase || 'http://localhost:5000/api'

        const response = await $fetch<{ status: string; data: Company }>(
          `${apiBase}/companies`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${authStore.token}`,
            },
            body: data,
          }
        )

        // Add new company to the list
        this.companies.push(response.data)
        return { success: true, data: response.data }
      } catch (error: any) {
        console.error('Create company error:', error)
        this.error = error?.data?.message || 'Failed to create company'
        return {
          success: false,
          error: this.error,
        }
      } finally {
        this.isLoading = false
      }
    },

    async updateCompany(id: string, data: UpdateCompanyInput) {
      this.isLoading = true
      this.error = null

      try {
        const config = useRuntimeConfig()
        const authStore = useAuthStore()
        const apiBase = config.public.apiBase || 'http://localhost:5000/api'

        const response = await $fetch<{ status: string; data: Company }>(
          `${apiBase}/companies/${id}`,
          {
            method: 'PUT',
            headers: {
              Authorization: `Bearer ${authStore.token}`,
            },
            body: data,
          }
        )

        // Update company in the list
        const index = this.companies.findIndex((c) => c.id === id)
        if (index !== -1) {
          this.companies[index] = response.data
        }

        // Update current company if it's the one being updated
        if (this.currentCompany?.id === id) {
          this.currentCompany = response.data
        }

        return { success: true, data: response.data }
      } catch (error: any) {
        console.error('Update company error:', error)
        this.error = error?.data?.message || 'Failed to update company'
        return {
          success: false,
          error: this.error,
        }
      } finally {
        this.isLoading = false
      }
    },

    async deleteCompany(id: string) {
      this.isLoading = true
      this.error = null

      try {
        const config = useRuntimeConfig()
        const authStore = useAuthStore()
        const apiBase = config.public.apiBase || 'http://localhost:5000/api'

        await $fetch(`${apiBase}/companies/${id}`, {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${authStore.token}`,
          },
        })

        // Remove company from the list
        this.companies = this.companies.filter((c) => c.id !== id)

        // Clear current company if it's the one being deleted
        if (this.currentCompany?.id === id) {
          this.currentCompany = null
        }

        return { success: true }
      } catch (error: any) {
        console.error('Delete company error:', error)
        this.error = error?.data?.message || 'Failed to delete company'
        return {
          success: false,
          error: this.error,
        }
      } finally {
        this.isLoading = false
      }
    },

    async fetchCompanyRouters(companyId: string) {
      this.isLoading = true
      this.error = null

      try {
        const config = useRuntimeConfig()
        const authStore = useAuthStore()
        const apiBase = config.public.apiBase || 'http://localhost:5000/api'

        const response = await $fetch<{ status: string; data: CompanyRouter[] }>(
          `${apiBase}/companies/${companyId}/routers`,
          {
            headers: {
              Authorization: `Bearer ${authStore.token}`,
            },
          }
        )

        this.companyRouters = response.data
        return { success: true, data: response.data }
      } catch (error: any) {
        console.error('Fetch company routers error:', error)
        this.error = error?.data?.message || 'Failed to fetch company routers'
        return {
          success: false,
          error: this.error,
        }
      } finally {
        this.isLoading = false
      }
    },

    clearError() {
      this.error = null
    },

    clearCurrentCompany() {
      this.currentCompany = null
    },

    clearCompanyRouters() {
      this.companyRouters = []
    },
  },

  getters: {
    companyCount: (state) => state.companies.length,

    getCompanyById: (state) => (id: string) =>
      state.companies.find((c) => c.id === id),

    getCompanyByCode: (state) => (code: string) =>
      state.companies.find((c) => c.code === code),

    companiesWithRouters: (state) =>
      state.companies.filter((c) => (c.routerCount ?? 0) > 0),

    companiesWithoutRouters: (state) =>
      state.companies.filter((c) => (c.routerCount ?? 0) === 0),

    totalRoutersAcrossCompanies: (state) =>
      state.companies.reduce((sum, c) => sum + (c.routerCount ?? 0), 0),
  },
})
