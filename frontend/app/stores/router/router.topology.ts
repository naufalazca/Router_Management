import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

import { useApiFetch } from '@/composables/useApiFetch'

// Types
export interface TopologyNode {
  id: string
  name: string
  ipAddress: string
  location?: string
  routerType: 'UPSTREAM' | 'CORE' | 'DISTRIBUSI' | 'WIRELESS'
  routerBrand: 'MIKROTIK' | 'UBIVIQUITI'
  status: 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE'
  companyId?: string
  companyName?: string
  positionX?: number
  positionY?: number
}

export interface TopologyEdge {
  id: string
  source: string
  target: string
  linkType: 'ETHERNET' | 'FIBER' | 'WIRELESS' | 'VPN'
  linkStatus: 'ACTIVE' | 'INACTIVE' | 'PLANNED'
  sourceInterface?: string
  targetInterface?: string
  bandwidth?: string
  distance?: number
  isAutoDiscovered: boolean
}

export interface TopologyData {
  nodes: TopologyNode[]
  edges: TopologyEdge[]
}

export interface ConnectionDetail {
  id: string
  sourceRouterId: string
  targetRouterId: string
  linkType: 'ETHERNET' | 'FIBER' | 'WIRELESS' | 'VPN'
  linkStatus: 'ACTIVE' | 'INACTIVE' | 'PLANNED'
  sourceInterface?: string
  targetInterface?: string
  bandwidth?: string
  distance?: number
  isAutoDiscovered: boolean
  notes?: string
  createdAt: string
  updatedAt: string
  sourceRouter: {
    id: string
    name: string
    ipAddress: string
    company?: {
      id: string
      name: string
      code: string
    }
  }
  targetRouter: {
    id: string
    name: string
    ipAddress: string
    company?: {
      id: string
      name: string
      code: string
    }
  }
}

export const useTopologyStore = defineStore('topology', () => {
  // API fetch composable
  const { $apiFetch } = useApiFetch()

  // State
  const topology = ref<TopologyData>({ nodes: [], edges: [] })
  const connections = ref<ConnectionDetail[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // Computed
  const nodeCount = computed(() => topology.value.nodes.length)
  const edgeCount = computed(() => topology.value.edges.length)

  // Get node by ID
  function getNodeById(id: string): TopologyNode | undefined {
    return topology.value.nodes.find(n => n.id === id)
  }

  // Get edges for a specific node (both incoming and outgoing)
  function getEdgesForNode(nodeId: string): TopologyEdge[] {
    return topology.value.edges.filter(
      e => e.source === nodeId || e.target === nodeId,
    )
  }

  // Get connected nodes for a specific node
  function getConnectedNodes(nodeId: string): TopologyNode[] {
    const connectedIds = new Set<string>()
    topology.value.edges.forEach((edge) => {
      if (edge.source === nodeId)
        connectedIds.add(edge.target)
      if (edge.target === nodeId)
        connectedIds.add(edge.source)
    })
    return topology.value.nodes.filter(n => connectedIds.has(n.id))
  }

  // Fetch all topology data
  async function fetchTopology(companyId?: string) {
    isLoading.value = true
    error.value = null

    try {
      const query = companyId ? `?companyId=${companyId}` : ''
      const response = await $apiFetch<{ status: string, data: TopologyData }>(
        `/router/topology${query}`,
      )

      if (response && response.status === 'success') {
        topology.value = response.data
      }
      else {
        throw new Error('Failed to fetch topology')
      }
    }
    catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to fetch topology'
      console.error('Failed to fetch topology:', err)
    }
    finally {
      isLoading.value = false
    }
  }

  // Fetch all connections (detailed)
  async function fetchConnections(companyId?: string) {
    isLoading.value = true
    error.value = null

    try {
      const query = companyId ? `?companyId=${companyId}` : ''
      const response = await $apiFetch<{ status: string, data: ConnectionDetail[] }>(
        `/router/topology/connections${query}`,
      )

      if (response && response.status === 'success') {
        connections.value = response.data
      }
      else {
        throw new Error('Failed to fetch connections')
      }
    }
    catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to fetch connections'
      console.error('Failed to fetch connections:', err)
    }
    finally {
      isLoading.value = false
    }
  }

  // Fetch single connection by ID
  async function fetchConnection(id: string) {
    try {
      const response = await $apiFetch<{ status: string, data: ConnectionDetail }>(
        `/router/topology/connections/${id}`,
      )

      if (response && response.status === 'success') {
        return response.data
      }
      else {
        throw new Error('Failed to fetch connection')
      }
    }
    catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to fetch connection'
      console.error('Failed to fetch connection:', err)
      throw err
    }
  }

  // Create new connection
  async function createConnection(data: {
    sourceRouterId: string
    targetRouterId: string
    linkType?: 'ETHERNET' | 'FIBER' | 'WIRELESS' | 'VPN'
    linkStatus?: 'ACTIVE' | 'INACTIVE' | 'PLANNED'
    sourceInterface?: string
    targetInterface?: string
    bandwidth?: string
    distance?: number
    notes?: string
  }) {
    isLoading.value = true
    error.value = null

    try {
      const response = await $apiFetch<{
        status: string
        message: string
        data: ConnectionDetail
      }>(`/router/topology/connections`, {
        method: 'POST',
        body: data,
      })

      if (response && response.status === 'success') {
        // Refresh topology data
        await fetchTopology()
        await fetchConnections()
        return { success: true, data: response.data }
      }
      else {
        throw new Error(response?.message || 'Failed to create connection')
      }
    }
    catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to create connection'
      error.value = errorMsg
      return { success: false, error: errorMsg }
    }
    finally {
      isLoading.value = false
    }
  }

  // Update connection
  async function updateConnection(
    id: string,
    data: Partial<{
      linkType: 'ETHERNET' | 'FIBER' | 'WIRELESS' | 'VPN'
      linkStatus: 'ACTIVE' | 'INACTIVE' | 'PLANNED'
      sourceInterface: string
      targetInterface: string
      bandwidth: string
      distance: number
      notes: string
    }>,
  ) {
    isLoading.value = true
    error.value = null

    try {
      const response = await $apiFetch<{
        status: string
        message: string
        data: ConnectionDetail
      }>(`/router/topology/connections/${id}`, {
        method: 'PUT',
        body: data,
      })

      if (response && response.status === 'success') {
        // Refresh topology data
        await fetchTopology()
        await fetchConnections()
        return { success: true, data: response.data }
      }
      else {
        throw new Error(response?.message || 'Failed to update connection')
      }
    }
    catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to update connection'
      error.value = errorMsg
      return { success: false, error: errorMsg }
    }
    finally {
      isLoading.value = false
    }
  }

  // Delete connection
  async function deleteConnection(id: string) {
    isLoading.value = true
    error.value = null

    try {
      const response = await $apiFetch<{
        status: string
        message: string
      }>(`/router/topology/connections/${id}`, {
        method: 'DELETE',
      })

      if (response && response.status === 'success') {
        // Refresh topology data
        await fetchTopology()
        await fetchConnections()
        return { success: true }
      }
      else {
        throw new Error(response?.message || 'Failed to delete connection')
      }
    }
    catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to delete connection'
      error.value = errorMsg
      return { success: false, error: errorMsg }
    }
    finally {
      isLoading.value = false
    }
  }

  // Clear error
  function clearError() {
    error.value = null
  }

  // ==========================================
  // TOPOLOGY LAYOUT FUNCTIONS
  // ==========================================

  interface NodePosition {
    routerId: string
    positionX: number
    positionY: number
  }

  const layoutPositions = ref<Map<string, { x: number, y: number }>>(new Map())

  // Fetch layout positions for a company
  async function fetchLayoutPositions(companyId?: string) {
    try {
      const query = companyId ? `?companyId=${companyId}` : ''
      const response = await $apiFetch<{
        status: string
        data: Array<{
          routerId: string
          positionX: number
          positionY: number
          router?: { id: string, name: string }
        }>
      }>(`/router/topology/layout${query}`)

      if (response && response.status === 'success') {
        // Build map of positions
        const map = new Map<string, { x: number, y: number }>()
        response.data.forEach((pos) => {
          map.set(pos.routerId, { x: Number(pos.positionX), y: Number(pos.positionY) })
        })
        layoutPositions.value = map
        return map
      }
    }
    catch (err) {
      console.error('Failed to fetch layout positions:', err)
    }
    return new Map()
  }

  // Save a single node position
  async function saveNodePosition(data: {
    routerId: string
    positionX: number
    positionY: number
    companyId?: string
  }) {
    try {
      const response = await $apiFetch<{
        status: string
        message: string
      }>(`/router/topology/layout`, {
        method: 'POST',
        body: data,
      })

      if (response && response.status === 'success') {
        // Update local cache
        layoutPositions.value.set(data.routerId, { x: data.positionX, y: data.positionY })
        return { success: true }
      }
      return { success: false, error: response?.message || 'Failed to save position' }
    }
    catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to save position'
      console.error('Failed to save node position:', err)
      return { success: false, error: errorMsg }
    }
  }

  // Save multiple node positions (bulk)
  async function saveNodePositions(data: {
    positions: NodePosition[]
    companyId?: string
  }) {
    try {
      const response = await $apiFetch<{
        status: string
        message: string
      }>(`/router/topology/layout/bulk`, {
        method: 'POST',
        body: data,
      })

      if (response && response.status === 'success') {
        // Update local cache
        data.positions.forEach((pos) => {
          layoutPositions.value.set(pos.routerId, { x: pos.positionX, y: pos.positionY })
        })
        return { success: true }
      }
      return { success: false, error: response?.message || 'Failed to save positions' }
    }
    catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to save positions'
      console.error('Failed to save node positions:', err)
      return { success: false, error: errorMsg }
    }
  }

  // Get cached position for a node
  function getNodePosition(nodeId: string): { x: number, y: number } | undefined {
    return layoutPositions.value.get(nodeId)
  }

  // Clear layout cache
  function clearLayoutCache() {
    layoutPositions.value.clear()
  }

  return {
    // State
    topology,
    connections,
    isLoading,
    error,
    layoutPositions,

    // Computed
    nodeCount,
    edgeCount,

    // Actions
    fetchTopology,
    fetchConnections,
    fetchConnection,
    createConnection,
    updateConnection,
    deleteConnection,
    getNodeById,
    getEdgesForNode,
    getConnectedNodes,
    clearError,
    fetchLayoutPositions,
    saveNodePosition,
    saveNodePositions,
    getNodePosition,
    clearLayoutCache,
  }
})
