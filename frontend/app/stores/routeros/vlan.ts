import { defineStore } from 'pinia'

/**
 * Single VLAN member port (annotated with interface comment/type)
 */
export interface ParsedVlanPort {
  name: string
  comment?: string
  type?: string
  tagged: boolean
}

/**
 * Merged VLAN entry: one per unique VLAN id across bridge table + L3 interfaces
 */
export interface MergedVlan {
  vlanId: number
  source: 'bridge' | 'interface' | 'both'
  bridge?: string
  disabled: boolean
  dynamic: boolean
  ports: ParsedVlanPort[]
}

/**
 * Annotated bridge VLAN row
 */
export interface ParsedBridgeVlanRow {
  id: string
  vlanIds: number[]
  bridge?: string
  disabled: boolean
  dynamic: boolean
  taggedPorts: ParsedVlanPort[]
  untaggedPorts: ParsedVlanPort[]
}

/**
 * L3 VLAN interface (from /interface vlan print)
 */
export interface ParsedVlanInterface {
  id: string
  name?: string
  comment?: string
  vlanId?: number
  parentInterface?: string
  parentComment?: string
  parentType?: string
  disabled: boolean
  dynamic: boolean
}

/**
 * Full VLAN availability report
 */
export interface VlanReport {
  deviceId: string
  deviceType: string
  deviceName: string
  fetchedAt: string
  interfaceMap: Record<
    string,
    { type?: string, comment?: string, running: boolean, disabled: boolean }
  >
  bridgeVlanRows: ParsedBridgeVlanRow[]
  vlanInterfaces: ParsedVlanInterface[]
  vlans: MergedVlan[]
}

interface RouterOSVlanState {
  report: VlanReport | null
  isLoading: boolean
  error: string | null
}

export const useRouterOSVlanStore = defineStore('routerosVlan', {
  state: (): RouterOSVlanState => ({
    report: null,
    isLoading: false,
    error: null,
  }),

  actions: {
    /**
     * Fetch the VLAN availability report for a device
     */
    async fetchVlans(deviceId: string) {
      this.isLoading = true
      this.error = null

      try {
        const { $apiFetch } = useApiFetch()

        const response = await $apiFetch<{
          status: string
          data: VlanReport
        }>(
          `/routeros/vlan/${deviceId}`,
          { method: 'GET' },
        )

        this.report = response.data

        return { success: true, data: this.report }
      }
      catch (error: any) {
        console.error('VLAN fetch error:', error)
        this.error = error?.data?.message || error?.message || 'Failed to fetch VLANs'
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
     * Clear error state
     */
    clearError() {
      this.error = null
    },

    /**
     * Clear the report
     */
    clearReport() {
      this.report = null
    },

    /**
     * Clear all state
     */
    clearAll() {
      this.report = null
      this.error = null
      this.isLoading = false
    },
  },

  getters: {
    /**
     * Total number of merged VLAN entries
     */
    vlanCount: state => state.report?.vlans.length ?? 0,

    /**
     * Unique VLAN ids, ascending
     */
    uniqueVlanIds: (state): number[] =>
      (state.report?.vlans ?? []).map(v => v.vlanId),

    /**
     * Total tagged ports across all VLANs (deduped per VLAN)
     */
    totalTaggedPorts: (state): number =>
      (state.report?.vlans ?? []).reduce(
        (sum, v) => sum + v.ports.filter(p => p.tagged).length,
        0,
      ),

    /**
     * Total untagged ports across all VLANs (deduped per VLAN)
     */
    totalUntaggedPorts: (state): number =>
      (state.report?.vlans ?? []).reduce(
        (sum, v) => sum + v.ports.filter(p => !p.tagged).length,
        0,
      ),
  },
})
