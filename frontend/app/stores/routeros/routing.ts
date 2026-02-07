import { defineStore } from 'pinia'
import { useAuthStore } from '../auth'

/**
 * BGP Connection Interface
 * Matches ParsedBGPConnection from backend
 */
export interface BGPConnection {
  id: string
  name?: string
  remoteAddress?: string
  remoteAs?: string
  localAddress?: string
  localAs?: string
  state?: string
  uptime?: string
  prefixCount?: number
  disabled: boolean
  inFilter?: string
  outFilter?: string
}

/**
 * BGP Advertisement Interface
 * Matches ParsedBGPAdvertisement from backend
 */
export interface BGPAdvertisement {
  id: string
  dstAddress?: string
  prefix?: string
  gateway?: string
  interface?: string
  scope?: string
  from?: string
  asPath?: string
  origin?: string
  localPref?: number
  med?: number
  bgpCommunities?: string
}

/**
 * BGP Session Interface
 * Matches ParsedBGPSession from backend
 */
export interface BGPSession {
  id: string
  name?: string
  remoteAddress?: string
  remotePort?: number
  remoteAs?: string
  localAddress?: string
  localPort?: number
  localAs?: string
  established?: string
  state?: string
  uptime?: string
  receivedUpdate?: string
  sentUpdate?: string
  withdrawn?: string
  keepalive?: string
  opensent?: string
  openconfirm?: string
  active?: string
  connect?: string
  idle?: string
  disabled: boolean
  prefixCount?: number
}

/**
 * BGP Session Statistics
 */
export interface BGPSessionStats {
  totalSessions: number
  establishedSessions: number
  activeSessions: number
  idleSessions: number
  downSessions: number
}

/**
 * All BGP Data
 */
export interface ALLBGPData {
  connections: BGPConnection[]
  advertisements: BGPAdvertisement[]
  sessions: BGPSession[]
}

/**
 * BGP Advertisement Filter
 */
export interface BGPAdvertisementFilter {
  prefix?: string
  dstAddress?: string
  fromPeer?: string
}

interface RouterOSRoutingState {
  connections: BGPConnection[]
  advertisements: BGPAdvertisement[]
  sessions: BGPSession[]
  currentConnection: BGPConnection | null
  currentSession: BGPSession | null
  sessionStats: BGPSessionStats | null
  allBGPData: ALLBGPData | null
  isLoading: boolean
  error: string | null
}

export const useRouterOSRoutingStore = defineStore('routerosRouting', {
  state: (): RouterOSRoutingState => ({
    connections: [],
    advertisements: [],
    sessions: [],
    currentConnection: null,
    currentSession: null,
    sessionStats: null,
    allBGPData: null,
    isLoading: false,
    error: null,
  }),

  getters: {
    /**
     * Get active (enabled) BGP connections
     */
    activeConnections: state => state.connections.filter(c => !c.disabled),

    /**
     * Get disabled BGP connections
     */
    disabledConnections: state => state.connections.filter(c => c.disabled),

    /**
     * Get established BGP sessions
     */
    establishedSessions: state =>
      state.sessions.filter(s =>
        s.state?.toLowerCase().includes('established'),
      ),

    /**
     * Get active BGP sessions
     */
    activeBgpSessions: state =>
      state.sessions.filter(s =>
        s.state?.toLowerCase().includes('active'),
      ),

    /**
     * Get idle BGP sessions
     */
    idleSessions: state =>
      state.sessions.filter(s =>
        s.state?.toLowerCase().includes('idle'),
      ),

    /**
     * Total BGP connection count
     */
    connectionCount: state => state.connections.length,

    /**
     * Total BGP session count
     */
    sessionCount: state => state.sessions.length,

    /**
     * Total BGP advertisement count
     */
    advertisementCount: state => state.advertisements.length,

    /**
     * Get BGP connection by ID
     */
    getConnectionById: state => (id: string) =>
      state.connections.find(c => c.id === id),

    /**
     * Get BGP session by ID
     */
    getSessionById: state => (id: string) =>
      state.sessions.find(s => s.id === id),

    /**
     * Get unique AS numbers from connections
     */
    uniqueRemoteAs: state => {
      const asSet = new Set<string>()
      state.connections.forEach(c => {
        if (c.remoteAs)
          asSet.add(c.remoteAs)
      })
      return Array.from(asSet)
    },

    /**
     * Get connections by remote AS
     */
    getConnectionsByRemoteAs: state => (as: string) =>
      state.connections.filter(c => c.remoteAs === as),
  },

  actions: {
    /**
     * Fetch all BGP connections from a router
     */
    async fetchBGPConnections(routerId: string) {
      this.isLoading = true
      this.error = null

      try {
        const config = useRuntimeConfig()
        const authStore = useAuthStore()
        const apiBase = config.public.apiBase || 'http://localhost:5000/api'

        const response = await $fetch<{ status: string, data: BGPConnection[] }>(
          `${apiBase}/routeros/${routerId}/bgp/connections`,
          {
            headers: {
              Authorization: `Bearer ${authStore.token}`,
            },
          },
        )

        this.connections = response.data

        return { success: true, data: this.connections }
      }
      catch (error: any) {
        console.error('Fetch BGP connections error:', error)
        this.error = error?.data?.message || error?.message || 'Failed to fetch BGP connections'
        this.connections = []
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
     * Fetch a specific BGP connection by ID
     */
    async fetchBGPConnectionById(routerId: string, connectionId: string) {
      this.isLoading = true
      this.error = null

      try {
        const config = useRuntimeConfig()
        const authStore = useAuthStore()
        const apiBase = config.public.apiBase || 'http://localhost:5000/api'

        const response = await $fetch<{ status: string, data: BGPConnection }>(
          `${apiBase}/routeros/${routerId}/bgp/connections/${connectionId}`,
          {
            headers: {
              Authorization: `Bearer ${authStore.token}`,
            },
          },
        )

        this.currentConnection = response.data

        return { success: true, data: this.currentConnection }
      }
      catch (error: any) {
        console.error('Fetch BGP connection error:', error)
        this.error = error?.data?.message || error?.message || 'Failed to fetch BGP connection'
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
     * Enable a BGP connection
     */
    async enableBGPConnection(routerId: string, connectionId: string) {
      this.isLoading = true
      this.error = null

      try {
        const config = useRuntimeConfig()
        const authStore = useAuthStore()
        const apiBase = config.public.apiBase || 'http://localhost:5000/api'

        const response = await $fetch<{
          status: string
          message: string
        }>(`${apiBase}/routeros/${routerId}/bgp/connections/${connectionId}/enable`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${authStore.token}`,
          },
        })

        // Update local state
        const index = this.connections.findIndex(c => c.id === connectionId)
        if (index !== -1) {
          const conn = this.connections[index]
          this.connections[index] = { ...conn, disabled: false } as BGPConnection
        }

        return { success: true, message: response.message }
      }
      catch (error: any) {
        console.error('Enable BGP connection error:', error)
        this.error = error?.data?.message || error?.message || 'Failed to enable BGP connection'
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
     * Disable a BGP connection
     */
    async disableBGPConnection(routerId: string, connectionId: string) {
      this.isLoading = true
      this.error = null

      try {
        const config = useRuntimeConfig()
        const authStore = useAuthStore()
        const apiBase = config.public.apiBase || 'http://localhost:5000/api'

        const response = await $fetch<{
          status: string
          message: string
        }>(`${apiBase}/routeros/${routerId}/bgp/connections/${connectionId}/disable`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${authStore.token}`,
          },
        })

        // Update local state
        const index = this.connections.findIndex(c => c.id === connectionId)
        if (index !== -1) {
          const conn = this.connections[index]
          this.connections[index] = { ...conn, disabled: true } as BGPConnection
        }

        return { success: true, message: response.message }
      }
      catch (error: any) {
        console.error('Disable BGP connection error:', error)
        this.error = error?.data?.message || error?.message || 'Failed to disable BGP connection'
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
     * Reset a BGP connection
     */
    async resetBGPConnection(routerId: string, connectionId: string) {
      this.isLoading = true
      this.error = null

      try {
        const config = useRuntimeConfig()
        const authStore = useAuthStore()
        const apiBase = config.public.apiBase || 'http://localhost:5000/api'

        const response = await $fetch<{
          status: string
          message: string
        }>(`${apiBase}/routeros/${routerId}/bgp/connections/${connectionId}/reset`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${authStore.token}`,
          },
        })

        return { success: true, message: response.message }
      }
      catch (error: any) {
        console.error('Reset BGP connection error:', error)
        this.error = error?.data?.message || error?.message || 'Failed to reset BGP connection'
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
     * Fetch all BGP advertisements from a router
     */
    async fetchBGPAdvertisements(routerId: string) {
      this.isLoading = true
      this.error = null

      try {
        const config = useRuntimeConfig()
        const authStore = useAuthStore()
        const apiBase = config.public.apiBase || 'http://localhost:5000/api'

        const response = await $fetch<{ status: string, data: BGPAdvertisement[] }>(
          `${apiBase}/routeros/${routerId}/bgp/advertisements`,
          {
            headers: {
              Authorization: `Bearer ${authStore.token}`,
            },
          },
        )

        this.advertisements = response.data

        return { success: true, data: this.advertisements }
      }
      catch (error: any) {
        console.error('Fetch BGP advertisements error:', error)
        this.error = error?.data?.message || error?.message || 'Failed to fetch BGP advertisements'
        this.advertisements = []
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
     * Fetch BGP advertisements with filters
     */
    async fetchBGPAdvertisementsFiltered(routerId: string, filters: BGPAdvertisementFilter) {
      this.isLoading = true
      this.error = null

      try {
        const config = useRuntimeConfig()
        const authStore = useAuthStore()
        const apiBase = config.public.apiBase || 'http://localhost:5000/api'

        const params = new URLSearchParams()
        if (filters.prefix)
          params.append('prefix', filters.prefix)
        if (filters.dstAddress)
          params.append('dstAddress', filters.dstAddress)
        if (filters.fromPeer)
          params.append('fromPeer', filters.fromPeer)

        const queryString = params.toString()
        const url = `${apiBase}/routeros/${routerId}/bgp/advertisements/filter${queryString ? `?${queryString}` : ''}`

        const response = await $fetch<{ status: string, data: BGPAdvertisement[] }>(
          url,
          {
            headers: {
              Authorization: `Bearer ${authStore.token}`,
            },
          },
        )

        this.advertisements = response.data

        return { success: true, data: this.advertisements }
      }
      catch (error: any) {
        console.error('Fetch filtered BGP advertisements error:', error)
        this.error = error?.data?.message || error?.message || 'Failed to fetch filtered BGP advertisements'
        this.advertisements = []
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
     * Fetch all BGP sessions from a router
     */
    async fetchBGPSessions(routerId: string) {
      this.isLoading = true
      this.error = null

      try {
        const config = useRuntimeConfig()
        const authStore = useAuthStore()
        const apiBase = config.public.apiBase || 'http://localhost:5000/api'

        const response = await $fetch<{ status: string, data: BGPSession[] }>(
          `${apiBase}/routeros/${routerId}/bgp/sessions`,
          {
            headers: {
              Authorization: `Bearer ${authStore.token}`,
            },
          },
        )

        this.sessions = response.data

        return { success: true, data: this.sessions }
      }
      catch (error: any) {
        console.error('Fetch BGP sessions error:', error)
        this.error = error?.data?.message || error?.message || 'Failed to fetch BGP sessions'
        this.sessions = []
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
     * Fetch a specific BGP session by ID
     */
    async fetchBGPSessionById(routerId: string, sessionId: string) {
      this.isLoading = true
      this.error = null

      try {
        const config = useRuntimeConfig()
        const authStore = useAuthStore()
        const apiBase = config.public.apiBase || 'http://localhost:5000/api'

        const response = await $fetch<{ status: string, data: BGPSession }>(
          `${apiBase}/routeros/${routerId}/bgp/sessions/${sessionId}`,
          {
            headers: {
              Authorization: `Bearer ${authStore.token}`,
            },
          },
        )

        this.currentSession = response.data

        return { success: true, data: this.currentSession }
      }
      catch (error: any) {
        console.error('Fetch BGP session error:', error)
        this.error = error?.data?.message || error?.message || 'Failed to fetch BGP session'
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
     * Fetch all BGP data (connections, advertisements, sessions) for a router
     */
    async fetchALLBGPData(routerId: string) {
      this.isLoading = true
      this.error = null

      try {
        const config = useRuntimeConfig()
        const authStore = useAuthStore()
        const apiBase = config.public.apiBase || 'http://localhost:5000/api'

        const response = await $fetch<{ status: string, data: ALLBGPData }>(
          `${apiBase}/routeros/${routerId}/bgp/all`,
          {
            headers: {
              Authorization: `Bearer ${authStore.token}`,
            },
          },
        )

        this.allBGPData = response.data
        this.connections = response.data.connections
        this.advertisements = response.data.advertisements
        this.sessions = response.data.sessions

        return { success: true, data: this.allBGPData }
      }
      catch (error: any) {
        console.error('Fetch all BGP data error:', error)
        this.error = error?.data?.message || error?.message || 'Failed to fetch BGP data'
        this.connections = []
        this.advertisements = []
        this.sessions = []
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
     * Fetch BGP session statistics
     */
    async fetchBGPSessionStats(routerId: string) {
      this.isLoading = true
      this.error = null

      try {
        const config = useRuntimeConfig()
        const authStore = useAuthStore()
        const apiBase = config.public.apiBase || 'http://localhost:5000/api'

        const response = await $fetch<{ status: string, data: BGPSessionStats }>(
          `${apiBase}/routeros/${routerId}/bgp/sessions/stats`,
          {
            headers: {
              Authorization: `Bearer ${authStore.token}`,
            },
          },
        )

        this.sessionStats = response.data

        return { success: true, data: this.sessionStats }
      }
      catch (error: any) {
        console.error('Fetch BGP session stats error:', error)
        this.error = error?.data?.message || error?.message || 'Failed to fetch BGP session statistics'
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
     * Refresh all BGP data for a router
     */
    async refreshBGPData(routerId: string) {
      return await this.fetchALLBGPData(routerId)
    },

    /**
     * Clear error state
     */
    clearError() {
      this.error = null
    },

    /**
     * Clear all BGP data (useful when switching routers)
     */
    clearBGPData() {
      this.connections = []
      this.advertisements = []
      this.sessions = []
      this.currentConnection = null
      this.currentSession = null
      this.sessionStats = null
      this.allBGPData = null
      this.error = null
    },
  },
})
