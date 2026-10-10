<script setup lang="ts">
import type { Connection, EdgeMouseEvent, NodeMouseEvent } from '@vue-flow/core'
import type { TopologyEdge, TopologyNode } from '~/stores/router/router.topology'
import { Background } from '@vue-flow/background'
import { Controls } from '@vue-flow/controls'
import { ConnectionMode, MarkerType, Position, useVueFlow, VueFlow } from '@vue-flow/core'
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { toast } from 'vue-sonner'
import TopologyConnections from '~/components/topology/TopologyConnections.vue'
import { useTopologyStore } from '~/stores/router/router.topology'

// Props
interface Props {
  nodes: TopologyNode[]
  edges: TopologyEdge[]
  companyId?: string
}

const props = defineProps<Props>()

// Emit
const emit = defineEmits<{
  connectionCreated: []
}>()

// Store
const topologyStore = useTopologyStore()

// VueFlow instance for getting node positions
const { onNodeDragStop, onPaneReady, startConnection } = useVueFlow()

// Flow nodes/edges - any[] because motion-v's HTMLAttributes augmentation makes vue-flow Node/Edge
// literal checks explode (TS2589/TS2322). Restore Node[]/Edge[] when @vue-flow and motion-v types align.
const flowNodes = ref<any[]>([])

// Flow edges - ref so Vue Flow can write temp connect edges back
const flowEdges = ref<any[]>([])

// Sync flowEdges from props (does not clobber in-flight temp edges)
function syncEdges() {
  flowEdges.value = props.edges.map(edge => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    label: edge.bandwidth || '',
    labelStyle: { fontSize: '11px', fontWeight: 400 },
    labelBgStyle: { fill: '#fff', fillOpacity: 0.8 },
    data: edge,
    style: getEdgeStyle(edge),
    markerEnd: MarkerType.ArrowClosed,
    animated: edge.linkStatus === 'ACTIVE',
  }))
}

// Debounced save function
const saveTimeout = ref<ReturnType<typeof setTimeout> | null>(null)

// Save positions to backend
async function savePositions() {
  if (saveTimeout.value) {
    clearTimeout(saveTimeout.value)
  }

  saveTimeout.value = setTimeout(async () => {
    const nodes = flowNodes.value

    // Route positions to the correct layout endpoint by node type
    const routerPositions = nodes
      .filter(node => node.data?.nodeType !== 'SWITCH')
      .map(node => ({
        routerId: node.id,
        positionX: Math.round(node.position.x),
        positionY: Math.round(node.position.y),
      }))
    const switchPositions = nodes
      .filter(node => node.data?.nodeType === 'SWITCH')
      .map(node => ({
        switchId: node.id,
        positionX: Math.round(node.position.x),
        positionY: Math.round(node.position.y),
      }))

    if (routerPositions.length > 0) {
      await topologyStore.saveNodePositions({
        positions: routerPositions,
        companyId: props.companyId,
      })
    }
    if (switchPositions.length > 0) {
      await saveSwitchPositions(switchPositions)
    }
  }, 500) // Debounce 500ms
}

// Save switch node positions via the switch-layout endpoint
async function saveSwitchPositions(positions: Array<{ switchId: string, positionX: number, positionY: number }>) {
  const { $apiFetch } = useApiFetch()
  try {
    await $apiFetch('/router/topology/switch-layout/bulk', {
      method: 'POST',
      body: { positions, companyId: props.companyId },
    })
  }
  catch (err) {
    console.error('Failed to save switch positions:', err)
  }
}

// Handle node drag stop
onNodeDragStop(() => {
  savePositions()
})

// Handle pane ready - load saved positions
onPaneReady(() => {
  loadSavedPositions()
})

// Load saved positions from store
async function loadSavedPositions() {
  await topologyStore.fetchLayoutPositions(props.companyId)

  // Apply saved positions to flowNodes
  flowNodes.value.forEach((node) => {
    const savedPos = topologyStore.getNodePosition(node.id)
    if (savedPos) {
      node.position = { x: savedPos.x, y: savedPos.y }
    }
  })
}

// Initialize flowNodes with nodes
function initializeNodes() {
  flowNodes.value = props.nodes.map((node, index) => {
    // Check if we have a saved position
    const savedPos = topologyStore.getNodePosition(node.id)

    if (savedPos) {
      // Use saved position
      return {
        id: node.id,
        label: node.name,
        position: { x: savedPos.x, y: savedPos.y },
        data: node,
        style: getNodeStyle(node),
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
      }
    }

    // Default: Position nodes in a circular layout
    const angle = (index / props.nodes.length) * 2 * Math.PI
    const radius = Math.min(300, 50 + props.nodes.length * 30)
    const x = 400 + radius * Math.cos(angle) - 100
    const y = 300 + radius * Math.sin(angle) - 50

    return {
      id: node.id,
      label: node.name,
      position: { x, y },
      data: node,
      style: getNodeStyle(node),
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
    }
  })
}

// Watch for changes in props.nodes
watch(() => props.nodes, () => {
  initializeNodes()
}, { deep: true, immediate: true })

// Watch for changes in props.edges
watch(() => props.edges, () => {
  syncEdges()
}, { deep: true, immediate: true })

// Selected node/edge for details
const selectedNode = ref<TopologyNode | null>(null)
const selectedEdge = ref<TopologyEdge | null>(null)
const isNodeDetailOpen = ref(false)
const isEdgeDetailOpen = ref(false)
const isCreateConnectionOpen = ref(false)
const isCreatingConnection = ref(false)
const connectionError = ref<string | null>(null)

// New connection form data
const newConnection = ref<{
  sourceRouterId: string
  targetRouterId: string
  linkType: 'ETHERNET' | 'FIBER' | 'WIRELESS' | 'VPN'
  linkStatus: 'ACTIVE' | 'INACTIVE' | 'PLANNED'
  sourceInterface?: string
  targetInterface?: string
  bandwidth?: string
  distance?: number
  notes?: string
  // Switch detail (only used when a switch endpoint is involved)
  sourcePortNumber?: number
  targetPortNumber?: number
  vlan?: number
  speed?: string
}>({
  sourceRouterId: '',
  targetRouterId: '',
  linkType: 'ETHERNET',
  linkStatus: 'PLANNED',
  sourceInterface: '',
  targetInterface: '',
  bandwidth: '',
  distance: undefined,
  notes: '',
  sourcePortNumber: undefined,
  targetPortNumber: undefined,
  vlan: undefined,
  speed: '',
})

const pendingConnection = ref<Connection | null>(null)

// Whether the pending connection involves a switch endpoint
const involvesSwitch = computed(() => {
  if (!pendingConnection.value)
    return false
  const sourceNode = props.nodes.find(n => n.id === pendingConnection.value!.source)
  const targetNode = props.nodes.find(n => n.id === pendingConnection.value!.target)
  return sourceNode?.nodeType === 'SWITCH' || targetNode?.nodeType === 'SWITCH'
})

// Loose connection mode + click-to-connect state
const isConnecting = ref(false)
const connectingSource = ref<string | null>(null)
const isLegendOpen = ref(true)
const connectionMode = ConnectionMode.Loose

function handleConnectStart(params: { nodeId?: string }) {
  isConnecting.value = true
  connectingSource.value = params.nodeId ?? null
}

function handleConnectEnd() {
  isConnecting.value = false
  connectingSource.value = null
}

// Bandwidth presets
const bandwidthPresets = [
  '10Mbps',
  '100Mbps',
  '1Gbps',
  '10Gbps',
  '25Gbps',
  '40Gbps',
  '100Gbps',
]

// Get node style based on status and type
function getNodeStyle(node: TopologyNode) {
  const colors = getNodeColor(node)
  return {
    backgroundColor: colors.background,
    borderLeft: `4px solid ${colors.border}`,
    borderRadius: '8px',
    color: '#1f2937',
    fontSize: '13px',
    fontWeight: '600',
    padding: '12px 16px',
    minWidth: '140px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  }
}

// Get node color based on status and type
function getNodeColor(node: TopologyNode) {
  // Switch nodes get a distinct teal look, then status overrides
  if (node.nodeType === 'SWITCH') {
    if (node.status === 'INACTIVE')
      return { background: '#fee2e2', border: '#ef4444' }
    if (node.status === 'MAINTENANCE')
      return { background: '#fef3c7', border: '#f59e0b' }
    return { background: '#ccfbf1', border: '#14b8a6' } // teal
  }

  if (node.status === 'INACTIVE') {
    return { background: '#fee2e2', border: '#ef4444' } // red
  }
  if (node.status === 'MAINTENANCE') {
    return { background: '#fef3c7', border: '#f59e0b' } // yellow
  }

  // Active - color by type
  switch (node.routerType) {
    case 'UPSTREAM':
      return { background: '#dbeafe', border: '#3b82f6' } // blue
    case 'CORE':
      return { background: '#dcfce7', border: '#22c55e' } // green
    case 'DISTRIBUSI':
      return { background: '#f3e8ff', border: '#8b5cf6' } // purple
    case 'WIRELESS':
      return { background: '#ffedd5', border: '#f97316' } // orange
    default:
      return { background: '#f1f5f9', border: '#64748b' } // gray
  }
}

// Get edge style
function getEdgeStyle(edge: TopologyEdge) {
  return {
    stroke: getEdgeColor(edge),
    strokeWidth: edge.linkStatus === 'ACTIVE' ? 2.5 : 2,
    strokeDasharray: edge.linkStatus === 'PLANNED' ? '5,5' : undefined,
  }
}

// Get edge color based on type and status
function getEdgeColor(edge: TopologyEdge): string {
  if (edge.linkStatus === 'INACTIVE')
    return '#ef4444'
  if (edge.linkStatus === 'PLANNED')
    return '#94a3b8'

  if (edge.edgeType === 'SWITCH')
    return '#14b8a6' // teal for switch links

  switch (edge.linkType) {
    case 'ETHERNET':
      return '#22c55e' // green
    case 'FIBER':
      return '#3b82f6' // blue
    case 'WIRELESS':
      return '#f97316' // orange
    case 'VPN':
      return '#8b5cf6' // purple
    default:
      return '#64748b'
  }
}

// Handle node click
function onNodeClick(event: NodeMouseEvent) {
  selectedNode.value = event.node.data as TopologyNode
  isNodeDetailOpen.value = true
}

// Start connect flow from node detail modal
function startConnectFromNode() {
  if (!selectedNode.value)
    return

  const node = flowNodes.value.find(n => n.id === selectedNode.value?.id)
  if (!node)
    return

  // Programmatically start a click-connect from this node's source handle
  startConnection(
    {
      nodeId: node.id,
      type: 'source',
      id: null,
      position: node.sourcePosition ?? Position.Right,
      x: node.position.x,
      y: node.position.y,
    },
    undefined,
    true,
  )
  isConnecting.value = true
  connectingSource.value = node.id
  isNodeDetailOpen.value = false
  toast.info(`Click a target router port to connect from ${selectedNode.value.name}`)
}

// Handle edge click
function onEdgeClick(event: EdgeMouseEvent) {
  selectedEdge.value = event.edge.data as TopologyEdge
  isEdgeDetailOpen.value = true
}

// Handle connection creation - open form dialog
function handleConnect(connection: Connection) {
  if (!connection.source || !connection.target) {
    return
  }

  if (connection.source === connection.target) {
    handleConnectEnd()
    toast.error('Cannot connect a router to itself')
    return
  }

  const exists = props.edges.some(
    e => (e.source === connection.source && e.target === connection.target)
      || (e.source === connection.target && e.target === connection.source),
  )
  if (exists) {
    handleConnectEnd()
    toast.error('Connection already exists between these devices')
    return
  }

  handleConnectEnd()

  // Store pending connection
  pendingConnection.value = connection

  // Get source and target node info
  const sourceNode = props.nodes.find(n => n.id === connection.source)
  const targetNode = props.nodes.find(n => n.id === connection.target)

  if (sourceNode && targetNode) {
    // Initialize form with connection data
    newConnection.value = {
      sourceRouterId: connection.source,
      targetRouterId: connection.target,
      linkType: 'ETHERNET',
      linkStatus: 'PLANNED',
      sourceInterface: '',
      targetInterface: '',
      bandwidth: '',
      distance: undefined,
      notes: '',
      sourcePortNumber: undefined,
      targetPortNumber: undefined,
      vlan: undefined,
      speed: '',
    }
    connectionError.value = null
    isCreateConnectionOpen.value = true
  }
}

// Submit new connection
async function submitConnection() {
  if (!pendingConnection.value)
    return

  isCreatingConnection.value = true
  connectionError.value = null

  try {
    let result: { success: boolean, error?: string }

    if (involvesSwitch.value) {
      // Any connection involving a switch goes through the switch-connections API
      const sourceNode = props.nodes.find(n => n.id === pendingConnection.value!.source)
      const targetNode = props.nodes.find(n => n.id === pendingConnection.value!.target)
      const endpointOf = (node?: TopologyNode) =>
        node?.nodeType === 'SWITCH' ? { switchId: node.id } : { routerId: node!.id }

      result = await topologyStore.createSwitchConnection({
        source: endpointOf(sourceNode),
        target: endpointOf(targetNode),
        linkType: newConnection.value.linkType,
        linkStatus: newConnection.value.linkStatus,
        sourceInterface: newConnection.value.sourceInterface || undefined,
        targetInterface: newConnection.value.targetInterface || undefined,
        sourcePortNumber: newConnection.value.sourcePortNumber,
        targetPortNumber: newConnection.value.targetPortNumber,
        vlan: newConnection.value.vlan,
        speed: newConnection.value.speed || undefined,
        bandwidth: newConnection.value.bandwidth || undefined,
        distance: newConnection.value.distance,
        notes: newConnection.value.notes,
      })
    }
    else {
      result = await topologyStore.createConnection({
        sourceRouterId: newConnection.value.sourceRouterId,
        targetRouterId: newConnection.value.targetRouterId,
        linkType: newConnection.value.linkType,
        linkStatus: newConnection.value.linkStatus,
        sourceInterface: newConnection.value.sourceInterface || undefined,
        targetInterface: newConnection.value.targetInterface || undefined,
        bandwidth: newConnection.value.bandwidth || undefined,
        distance: newConnection.value.distance,
        notes: newConnection.value.notes,
      })
    }

    if (result.success) {
      // Emit event to parent to refresh data
      emit('connectionCreated')
      // Close dialog and reset
      isCreateConnectionOpen.value = false
      pendingConnection.value = null
    }
    else {
      connectionError.value = result.error || 'Failed to create connection'
    }
  }
  catch (err) {
    connectionError.value = err instanceof Error ? err.message : 'Failed to create connection'
  }
  finally {
    isCreatingConnection.value = false
  }
}

// Cancel connection creation
function cancelConnection() {
  isCreateConnectionOpen.value = false
  pendingConnection.value = null
  connectionError.value = null
}

// Get node name by ID
function getNodeName(nodeId: string): string {
  const node = props.nodes.find(n => n.id === nodeId)
  return node?.name || nodeId
}

// Delete connection (routes by edge type)
async function handleDeleteEdge(edgeId: string) {
  const edge = props.edges.find(e => e.id === edgeId)
  if (edge?.edgeType === 'SWITCH') {
    await topologyStore.deleteSwitchConnection(edgeId)
  }
  else {
    await topologyStore.deleteConnection(edgeId)
  }
  isEdgeDetailOpen.value = false
  emit('connectionCreated') // Refresh topology after delete
}

// Delete node (not implemented - nodes are routers)
// Routers should be deleted from the router page

// Esc cancels an in-progress click-to-connect gesture
function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && isConnecting.value) {
    handleConnectEnd()
    flowEdges.value = flowEdges.value.filter(edge => props.edges.some(p => p.id === edge.id))
  }
}
onMounted(() => window.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))
</script>

<template>
  <div class="w-full space-y-4">
    <!-- Vue Flow Container -->
    <div
      class="relative w-full rounded-lg border bg-card overflow-hidden"
      style="height: max(60vh, 480px);"
    >
      <VueFlow
        v-model:nodes="flowNodes"
        v-model:edges="flowEdges"
        :default-viewport="{ zoom: 1, x: 0, y: 0 }"
        :min-zoom="0.2"
        :max-zoom="2"
        :connection-mode="connectionMode"
        :connect-on-click="true"
        :delete-key-code="null"
        fit-view-on-init
        @node-click="onNodeClick"
        @edge-click="onEdgeClick"
        @connect="handleConnect"
        @connect-start="handleConnectStart"
        @connect-end="handleConnectEnd"
      >
        <!-- Background -->
        <Background />

        <!-- Controls -->
        <Controls />
      </VueFlow>

      <!-- Connecting hint overlay -->
      <div
        v-if="isConnecting"
        class="pointer-events-none absolute top-3 left-1/2 z-20 -translate-x-1/2 rounded-full bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground shadow-lg"
      >
        Click a target router port to connect · Esc to cancel
      </div>

      <!-- Legend overlay -->
      <div class="absolute bottom-3 right-3 z-20">
        <div
          v-if="isLegendOpen"
          class="rounded-lg border bg-card/95 p-3 shadow-md backdrop-blur"
        >
          <div class="flex items-center justify-between gap-6 mb-2">
            <p class="text-xs font-semibold">
              Legend
            </p>
            <button
              class="text-muted-foreground hover:text-foreground"
              aria-label="Hide legend"
              @click="isLegendOpen = false"
            >
              <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div class="grid grid-cols-2 gap-x-6 gap-y-1">
            <div>
              <p class="text-[10px] font-medium text-muted-foreground mb-1">
                Router Types
              </p>
              <div class="space-y-0.5">
                <div class="flex items-center gap-1.5">
                  <div class="h-2 w-2 rounded bg-blue-600" />
                  <span class="text-[10px]">Upstream</span>
                </div>
                <div class="flex items-center gap-1.5">
                  <div class="h-2 w-2 rounded bg-green-600" />
                  <span class="text-[10px]">Core</span>
                </div>
                <div class="flex items-center gap-1.5">
                  <div class="h-2 w-2 rounded bg-purple-600" />
                  <span class="text-[10px]">Distribution</span>
                </div>
                <div class="flex items-center gap-1.5">
                  <div class="h-2 w-2 rounded bg-orange-600" />
                  <span class="text-[10px]">Wireless</span>
                </div>
              </div>
            </div>
            <div>
              <p class="text-[10px] font-medium text-muted-foreground mb-1">
                Connections
              </p>
              <div class="space-y-0.5">
                <div class="flex items-center gap-1.5">
                  <div class="h-0.5 w-5 bg-green-600" />
                  <span class="text-[10px]">Ethernet</span>
                </div>
                <div class="flex items-center gap-1.5">
                  <div class="h-0.5 w-5 bg-blue-600" />
                  <span class="text-[10px]">Fiber</span>
                </div>
                <div class="flex items-center gap-1.5">
                  <div class="h-0.5 w-5 bg-orange-600" />
                  <span class="text-[10px]">Wireless</span>
                </div>
                <div class="flex items-center gap-1.5">
                  <div class="h-0.5 w-5 bg-purple-600" />
                  <span class="text-[10px]">VPN</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        <button
          v-else
          class="flex items-center gap-1.5 rounded-md border bg-card/95 px-2 py-1 text-xs text-muted-foreground shadow-md backdrop-blur hover:text-foreground"
          @click="isLegendOpen = true"
        >
          <svg class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
          Legend
        </button>
      </div>
    </div>

    <!-- Create Connection Dialog -->
    <div
      v-if="isCreateConnectionOpen"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      @click.self="cancelConnection"
    >
      <div class="bg-card rounded-lg shadow-lg max-w-lg w-full mx-4 p-6 max-h-[90vh] overflow-y-auto">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-semibold">
            Create New Connection
          </h3>
          <button
            class="text-muted-foreground hover:text-foreground"
            @click="cancelConnection"
          >
            <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- Connection Info -->
        <div class="mb-4 p-3 bg-muted/50 rounded-lg">
          <p class="text-sm font-medium">
            Connecting:
          </p>
          <p class="text-sm text-muted-foreground">
            {{ getNodeName(newConnection.sourceRouterId) }} → {{ getNodeName(newConnection.targetRouterId) }}
          </p>
        </div>

        <!-- Error Message -->
        <div
          v-if="connectionError"
          class="mb-4 p-3 bg-destructive/10 text-destructive rounded-lg text-sm"
        >
          {{ connectionError }}
        </div>

        <!-- Connection Form -->
        <form class="space-y-4" @submit.prevent="submitConnection">
          <!-- Link Type -->
          <div>
            <label class="block text-sm font-medium mb-1.5">
              Link Type <span class="text-destructive">*</span>
            </label>
            <select
              v-model="newConnection.linkType"
              required
              class="w-full px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="ETHERNET">
                Ethernet
              </option>
              <option value="FIBER">
                Fiber Optic
              </option>
              <option value="WIRELESS">
                Wireless
              </option>
              <option value="VPN">
                VPN Tunnel
              </option>
            </select>
          </div>

          <!-- Link Status -->
          <div>
            <label class="block text-sm font-medium mb-1.5">
              Link Status <span class="text-destructive">*</span>
            </label>
            <select
              v-model="newConnection.linkStatus"
              required
              class="w-full px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="PLANNED">
                Planned
              </option>
              <option value="ACTIVE">
                Active
              </option>
              <option value="INACTIVE">
                Inactive
              </option>
            </select>
          </div>

          <!-- Source & Target Interface -->
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium mb-1.5">
                Source Interface
              </label>
              <input
                v-model="newConnection.sourceInterface"
                type="text"
                placeholder="e.g., ether1"
                class="w-full px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              >
            </div>
            <div>
              <label class="block text-sm font-medium mb-1.5">
                Target Interface
              </label>
              <input
                v-model="newConnection.targetInterface"
                type="text"
                placeholder="e.g., ether2"
                class="w-full px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              >
            </div>
          </div>

          <!-- Switch Detail (only when a switch endpoint is involved) -->
          <template v-if="involvesSwitch">
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium mb-1.5">
                  Source Port Number
                </label>
                <input
                  v-model.number="newConnection.sourcePortNumber"
                  type="number"
                  min="1"
                  placeholder="e.g., 1"
                  class="w-full px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                >
              </div>
              <div>
                <label class="block text-sm font-medium mb-1.5">
                  Target Port Number
                </label>
                <input
                  v-model.number="newConnection.targetPortNumber"
                  type="number"
                  min="1"
                  placeholder="e.g., 24"
                  class="w-full px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                >
              </div>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium mb-1.5">
                  VLAN
                </label>
                <input
                  v-model.number="newConnection.vlan"
                  type="number"
                  min="1"
                  placeholder="e.g., 10"
                  class="w-full px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                >
              </div>
              <div>
                <label class="block text-sm font-medium mb-1.5">
                  Speed
                </label>
                <input
                  v-model="newConnection.speed"
                  type="text"
                  placeholder="e.g., 1Gbps"
                  class="w-full px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                >
              </div>
            </div>
          </template>

          <!-- Bandwidth -->
          <div>
            <label class="block text-sm font-medium mb-1.5">
              Bandwidth
            </label>
            <div class="flex gap-2">
              <input
                v-model="newConnection.bandwidth"
                type="text"
                list="bandwidth-presets"
                placeholder="e.g., 1Gbps"
                class="flex-1 px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              >
              <datalist id="bandwidth-presets">
                <option v-for="preset in bandwidthPresets" :key="preset" :value="preset" />
              </datalist>
            </div>
            <p class="text-xs text-muted-foreground mt-1">
              Common values: 10Mbps, 100Mbps, 1Gbps, 10Gbps
            </p>
          </div>

          <!-- Distance (for wireless) -->
          <div>
            <label class="block text-sm font-medium mb-1.5">
              Distance (meters)
            </label>
            <input
              v-model.number="newConnection.distance"
              type="number"
              min="0"
              step="0.01"
              placeholder="e.g., 500"
              class="w-full px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            >
            <p class="text-xs text-muted-foreground mt-1">
              Especially useful for wireless links
            </p>
          </div>

          <!-- Notes -->
          <div>
            <label class="block text-sm font-medium mb-1.5">
              Notes
            </label>
            <textarea
              v-model="newConnection.notes"
              rows="3"
              placeholder="Additional information about this connection..."
              class="w-full px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
          </div>

          <!-- Actions -->
          <div class="flex justify-end gap-3 pt-2">
            <button
              type="button"
              :disabled="isCreatingConnection"
              class="px-4 py-2 border border-input rounded-md hover:bg-accent hover:text-accent-foreground disabled:opacity-50"
              @click="cancelConnection"
            >
              Cancel
            </button>
            <button
              type="submit"
              :disabled="isCreatingConnection"
              class="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2"
            >
              <svg
                v-if="isCreatingConnection"
                class="h-4 w-4 animate-spin"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              {{ isCreatingConnection ? 'Creating...' : 'Create Connection' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Node Detail Dialog -->
    <div
      v-if="isNodeDetailOpen && selectedNode"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      @click.self="isNodeDetailOpen = false"
    >
      <div class="bg-card rounded-lg shadow-lg max-w-md w-full mx-4 p-6">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-semibold">
            {{ selectedNode.nodeType === 'SWITCH' ? 'Switch Details' : 'Router Details' }}
          </h3>
          <button
            class="text-muted-foreground hover:text-foreground"
            @click="isNodeDetailOpen = false"
          >
            <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div class="space-y-3">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <p class="text-sm text-muted-foreground">
                Name
              </p>
              <p class="font-medium">
                {{ selectedNode.name }}
              </p>
            </div>
            <div>
              <p class="text-sm text-muted-foreground">
                IP Address
              </p>
              <p class="font-medium">
                {{ selectedNode.ipAddress }}
              </p>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <p class="text-sm text-muted-foreground">
                Type
              </p>
              <p class="font-medium">
                {{ selectedNode.nodeType === 'SWITCH' ? 'Switch' : (selectedNode.routerType || 'Router') }}
              </p>
            </div>
            <div>
              <p class="text-sm text-muted-foreground">
                Status
              </p>
              <span
                class="inline-flex px-2 py-0.5 rounded text-xs font-medium"
                :class="{
                  'bg-green-100 text-green-800': selectedNode.status === 'ACTIVE',
                  'bg-red-100 text-red-800': selectedNode.status === 'INACTIVE',
                  'bg-yellow-100 text-yellow-800': selectedNode.status === 'MAINTENANCE',
                }"
              >
                {{ selectedNode.status }}
              </span>
            </div>
          </div>

          <!-- Switch-specific fields -->
          <div v-if="selectedNode.nodeType === 'SWITCH'" class="grid grid-cols-2 gap-4">
            <div>
              <p class="text-sm text-muted-foreground">
                Brand
              </p>
              <p class="font-medium">
                {{ selectedNode.brand || '—' }}
              </p>
            </div>
            <div>
              <p class="text-sm text-muted-foreground">
                Port Count
              </p>
              <p class="font-medium">
                {{ selectedNode.portCount || '—' }}
              </p>
            </div>
          </div>

          <div v-if="selectedNode.location">
            <p class="text-sm text-muted-foreground">
              Location
            </p>
            <p class="font-medium">
              {{ selectedNode.location }}
            </p>
          </div>

          <div v-if="selectedNode.companyName">
            <p class="text-sm text-muted-foreground">
              Company
            </p>
            <p class="font-medium">
              {{ selectedNode.companyName }}
            </p>
          </div>
        </div>

        <div class="mt-6 flex justify-between">
          <button
            class="inline-flex items-center gap-2 px-4 py-2 border border-input rounded-md hover:bg-accent hover:text-accent-foreground"
            @click="startConnectFromNode"
          >
            <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11-9 11z" />
            </svg>
            Create Connection
          </button>
          <button
            class="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
            @click="isNodeDetailOpen = false"
          >
            Close
          </button>
        </div>
      </div>
    </div>

    <!-- Edge Detail Dialog -->
    <TopologyConnections
      :is-open="isEdgeDetailOpen"
      :edge="selectedEdge"
      @close="isEdgeDetailOpen = false"
      @delete="handleDeleteEdge"
      @updated="emit('connectionCreated')"
    />
  </div>
</template>

<style>
/* Import Vue Flow styles */
@import '@vue-flow/core/dist/style.css';
@import '@vue-flow/core/dist/theme-default.css';
@import '@vue-flow/controls/dist/style.css';

.custom-node {
  cursor: pointer;
  transition: all 0.2s;
}

.custom-node:hover {
  filter: brightness(0.95);
}

/* Enlarge connection handle hit targets (default ~6px, below WCAG target size) */
.vue-flow__handle {
  width: 12px;
  height: 12px;
  border-radius: 9999px;
  transition: box-shadow 0.15s, background-color 0.15s;
}

/* Invisible hit zone ~3x visual size for easy grabbing */
.vue-flow__handle::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 28px;
  height: 28px;
  transform: translate(-50%, -50%);
  border-radius: 9999px;
}

.vue-flow__handle:hover {
  box-shadow: 0 0 0 4px rgb(59 130 246 / 0.3);
}

/* Dark mode adjustments */
@media (prefers-color-scheme: dark) {
  .custom-node {
    color: #fff;
  }
}
</style>
