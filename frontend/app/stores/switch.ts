import { defineStore } from 'pinia'
import { extractApiErrorMessage } from '~/stores/router'

export type SwitchStatus = 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE'
export type SwitchBrand = 'MIKROTIK' | 'UBIVIQUITI'

export interface SwitchCompanyInfo {
  id: string
  name: string
  code: string
}

export interface Switch {
  id: string
  name: string
  ipAddress: string
  macAddress?: string | null
  model?: string | null
  location?: string | null
  portCount?: number | null
  status: SwitchStatus
  brand: SwitchBrand
  companyId: string
  company?: SwitchCompanyInfo | null
  username: string
  password?: string
  apiPort?: number | null
  sshPort?: number | null
  connectionCount?: number
  createdAt: string
  updatedAt: string
}

export interface CreateSwitchInput {
  name: string
  ipAddress: string
  macAddress?: string
  model?: string
  location?: string
  portCount?: number
  status?: SwitchStatus
  brand?: SwitchBrand
  companyId: string
  username: string
  password: string
  apiPort?: number
  sshPort?: number
}

export interface UpdateSwitchInput {
  name?: string
  ipAddress?: string
  macAddress?: string
  model?: string
  location?: string
  portCount?: number
  status?: SwitchStatus
  brand?: SwitchBrand
  companyId?: string
  username?: string
  password?: string
  apiPort?: number
  sshPort?: number
}

interface SwitchState {
  switches: Switch[]
  currentSwitch: Switch | null
  isLoading: boolean
  error: string | null
}

export const useSwitchStore = defineStore('switch', {
  state: (): SwitchState => ({
    switches: [],
    currentSwitch: null,
    isLoading: false,
    error: null,
  }),

  actions: {
    async fetchSwitches() {
      this.isLoading = true
      this.error = null

      try {
        const { $apiFetch } = useApiFetch()

        const response = await $apiFetch<{ status: string, data: Switch[] }>('/switches')

        this.switches = response.data || []
        return { success: true, data: response.data || [] }
      }
      catch (error: any) {
        console.error('Fetch switches error:', error)
        this.error = error?.data?.message || error?.message || 'Failed to fetch switches. Please check your connection.'
        this.switches = []
        return {
          success: false,
          error: this.error,
        }
      }
      finally {
        this.isLoading = false
      }
    },

    async fetchSwitchById(id: string) {
      this.isLoading = true
      this.error = null

      try {
        const { $apiFetch } = useApiFetch()

        const response = await $apiFetch<{ status: string, data: Switch }>(`/switches/${id}`)

        this.currentSwitch = response.data
        return { success: true, data: response.data }
      }
      catch (error: any) {
        console.error('Fetch switch error:', error)
        this.error = error?.data?.message || error?.message || 'Failed to fetch switch details'
        return {
          success: false,
          error: this.error,
        }
      }
      finally {
        this.isLoading = false
      }
    },

    async createSwitch(data: CreateSwitchInput) {
      this.isLoading = true
      this.error = null

      try {
        const { $apiFetch } = useApiFetch()

        const response = await $apiFetch<{ status: string, data: Switch }>('/switches', {
          method: 'POST',
          body: data,
        })

        this.switches.push(response.data)
        return { success: true, data: response.data }
      }
      catch (error: any) {
        console.error('Create switch error:', error)
        const message = extractApiErrorMessage(error, 'Failed to create switch')

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

    async updateSwitch(id: string, data: UpdateSwitchInput) {
      this.isLoading = true
      this.error = null

      try {
        const { $apiFetch } = useApiFetch()

        const response = await $apiFetch<{ status: string, data: Switch }>(`/switches/${id}`, {
          method: 'PUT',
          body: data,
        })

        const index = this.switches.findIndex(s => s.id === id)
        if (index !== -1) {
          this.switches[index] = response.data
        }

        if (this.currentSwitch?.id === id) {
          this.currentSwitch = response.data
        }

        return { success: true, data: response.data }
      }
      catch (error: any) {
        console.error('Update switch error:', error)
        return {
          success: false,
          error: extractApiErrorMessage(error, 'Failed to update switch'),
        }
      }
      finally {
        this.isLoading = false
      }
    },

    async deleteSwitch(id: string) {
      this.isLoading = true
      this.error = null

      try {
        const { $apiFetch } = useApiFetch()

        await $apiFetch(`/switches/${id}`, {
          method: 'DELETE',
        })

        this.switches = this.switches.filter(s => s.id !== id)

        if (this.currentSwitch?.id === id) {
          this.currentSwitch = null
        }

        return { success: true }
      }
      catch (error: any) {
        console.error('Delete switch error:', error)
        return {
          success: false,
          error: extractApiErrorMessage(error, 'Failed to delete switch'),
        }
      }
      finally {
        this.isLoading = false
      }
    },

    clearError() {
      this.error = null
    },

    clearCurrentSwitch() {
      this.currentSwitch = null
    },
  },

  getters: {
    activeSwitches: state =>
      state.switches.filter(s => s.status === 'ACTIVE'),

    inactiveSwitches: state =>
      state.switches.filter(s => s.status === 'INACTIVE'),

    maintenanceSwitches: state =>
      state.switches.filter(s => s.status === 'MAINTENANCE'),

    switchCount: state => state.switches?.length ?? 0,

    switchesByCompany: state => (companyId: string) =>
      state.switches.filter(s => s.companyId === companyId),

    getSwitchById: state => (id: string) =>
      state.switches.find(s => s.id === id),
  },
})
