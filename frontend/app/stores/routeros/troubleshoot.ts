import { defineStore } from 'pinia'

/**
 * Single Ping Entry
 */
export interface PingEntry {
  sequence: number
  bytes: number
  time: number
  ttl?: number
  status: 'reply' | 'timeout' | 'error'
}

/**
 * Ping Result
 */
export interface PingResult {
  host: string
  sent: number
  received: number
  packetLoss: number
  rtt: {
    min: number
    avg: number
    max: number
    stddev: number
  }
  results: PingEntry[]
  rawOutput?: string
}

/**
 * Ping Request Parameters
 * Note: MikroTik ping does not support interval parameter
 */
export interface PingRequest {
  address: string
  count?: number
  size?: number
  ttl?: number
  srcAddress?: string
  interface?: string
  doNotFragment?: boolean
  dscp?: number
}

/**
 * Single Traceroute Hop (MikroTik format)
 */
export interface TracerouteHop {
  hop: number
  address: string
  loss: string
  sent: number
  last: number
  avg: number
  best: number
  worst: number
  stdDev: number
}

/**
 * Traceroute Result
 */
export interface TracerouteResult {
  target: string
  hops: TracerouteHop[]
  rawOutput?: string
}

/**
 * Traceroute Request Parameters (simplified)
 */
export interface TracerouteRequest {
  address: string
  count?: number
}

/**
 * Continuous Ping Request Parameters
 */
export interface ContinuousPingRequest extends PingRequest {
  iterations?: number
}

interface RouterOSTroubleshootState {
  pingResult: PingResult | null
  tracerouteResult: TracerouteResult | null
  continuousPingResults: PingResult[]
  isLoading: boolean
  error: string | null
  isContinuousRunning: boolean
}

export const useRouterOSTroubleshootStore = defineStore('routerosTroubleshoot', {
  state: (): RouterOSTroubleshootState => ({
    pingResult: null,
    tracerouteResult: null,
    continuousPingResults: [],
    isLoading: false,
    error: null,
    isContinuousRunning: false,
  }),

  actions: {
    /**
     * Execute ping command
     */
    async ping(routerId: string, params: PingRequest) {
      this.isLoading = true
      this.error = null

      try {
        const { $apiFetch } = useApiFetch()

        const response = await $apiFetch<{
          status: string
          data: PingResult
        }>(
          `/routeros/troubleshoot/${routerId}/ping`,
          {
            method: 'POST',
            body: params,
          },
        )

        this.pingResult = response.data

        return { success: true, data: this.pingResult }
      }
      catch (error: any) {
        console.error('Ping error:', error)
        this.error = error?.data?.message || error?.message || 'Failed to execute ping command'
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
     * Execute traceroute command
     */
    async traceroute(routerId: string, params: TracerouteRequest) {
      this.isLoading = true
      this.error = null

      try {
        const { $apiFetch } = useApiFetch()

        const response = await $apiFetch<{
          status: string
          data: TracerouteResult
        }>(
          `/routeros/troubleshoot/${routerId}/traceroute`,
          {
            method: 'POST',
            body: params,
          },
        )

        this.tracerouteResult = response.data

        return { success: true, data: this.tracerouteResult }
      }
      catch (error: any) {
        console.error('Traceroute error:', error)
        this.error = error?.data?.message || error?.message || 'Failed to execute traceroute command'
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
     * Execute continuous ping
     */
    async continuousPing(routerId: string, params: ContinuousPingRequest) {
      this.isLoading = true
      this.error = null
      this.isContinuousRunning = true
      this.continuousPingResults = []

      try {
        const { $apiFetch } = useApiFetch()

        const response = await $apiFetch<{
          status: string
          data: PingResult[]
          count: number
        }>(
          `/routeros/troubleshoot/${routerId}/ping/continuous`,
          {
            method: 'POST',
            body: params,
          },
        )

        this.continuousPingResults = response.data

        return { success: true, data: this.continuousPingResults, count: response.count }
      }
      catch (error: any) {
        console.error('Continuous ping error:', error)
        this.error = error?.data?.message || error?.message || 'Failed to execute continuous ping'
        return {
          success: false,
          error: this.error,
        }
      }
      finally {
        this.isLoading = false
        this.isContinuousRunning = false
      }
    },

    /**
     * Clear error state
     */
    clearError() {
      this.error = null
    },

    /**
     * Clear ping result
     */
    clearPingResult() {
      this.pingResult = null
    },

    /**
     * Clear traceroute result
     */
    clearTracerouteResult() {
      this.tracerouteResult = null
    },

    /**
     * Clear all results
     */
    clearAll() {
      this.pingResult = null
      this.tracerouteResult = null
      this.continuousPingResults = []
      this.error = null
      this.isContinuousRunning = false
    },
  },

  getters: {
    /**
     * Check if ping was successful (at least one reply)
     */
    pingSuccessful: state => state.pingResult !== null && state.pingResult.received > 0,

    /**
     * Get packet loss percentage
     */
    packetLossPercentage: state => state.pingResult?.packetLoss ?? 0,

    /**
     * Get average RTT
     */
    averageRtt: state => state.pingResult?.rtt.avg ?? 0,

    /**
     * Check if traceroute completed successfully (has hops)
     */
    tracerouteCompleted: state => (state.tracerouteResult?.hops.length ?? 0) > 0,

    /**
     * Get traceroute hop count
     */
    tracerouteHopCount: state => state.tracerouteResult?.hops.length ?? 0,

    /**
     * Get last continuous ping result
     */
    lastContinuousPingResult: state => state.continuousPingResults[state.continuousPingResults.length - 1] ?? null,
  },
})
