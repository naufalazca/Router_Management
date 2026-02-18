import { defineStore } from 'pinia'

export interface IPInfoData {
  ip: string
  asn?: string
  as_name?: string
  as_domain?: string
  country_code?: string
  country?: string
  continent_code?: string
  continent?: string
  city?: string
  region?: string
  loc?: string
  org?: string
  postal?: string
  timezone?: string
}

interface IPInfoState {
  currentIPInfo: IPInfoData | null
  isLoading: boolean
  error: string | null
}

export const useIPInfoStore = defineStore('ipinfo', {
  state: (): IPInfoState => ({
    currentIPInfo: null,
    isLoading: false,
    error: null,
  }),

  actions: {
    /**
     * Get IP information by IP address
     * @param ip - IP address (e.g., "8.8.8.8")
     */
    async fetchIPInfo(ip: string) {
      this.isLoading = true
      this.error = null

      try {
        const { $apiFetch } = useApiFetch()

        const response = await $apiFetch<{ success: boolean, data: IPInfoData }>(`/ipinfo/ip/${ip}`)

        this.currentIPInfo = response.data
        return { success: true, data: response.data }
      }
      catch (error: any) {
        console.error('Fetch IP info error:', error)
        this.error = error?.data?.error || error?.message || 'Failed to fetch IP info'
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

    clearCurrentIPInfo() {
      this.currentIPInfo = null
    },
  },

  getters: {
    hasIPInfo: state => state.currentIPInfo !== null,
    asNumber: state => state.currentIPInfo?.asn || '',
    asName: state => state.currentIPInfo?.as_name || '',
    countryName: state => state.currentIPInfo?.country || '',
    countryCode: state => state.currentIPInfo?.country_code || '',
  },
})
