<script setup lang="ts">
import type { Connection, Edge, Node } from '@vue-flow/core'
import type { TopologyEdge, TopologyNode } from '~/stores/router/router.topology'
import { Background } from '@vue-flow/background'
import { Controls } from '@vue-flow/controls'
import { MarkerType, Position } from '@vue-flow/core'
import { useVueFlow, VueFlow } from '@vue-flow/core'
import { computed, ref, watch } from 'vue'
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
const { onNodeDragStop, onPaneReady } = useVueFlow()

// Flow nodes - use ref instead of computed for mutability
const flowNodes = ref<Node[]>([])

// Flow edges - can stay computed
const flowEdges = computed<Edge[]>(() => {
  return props.edges.map(edge => ({
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
})

// Debounced save function
const saveTimeout = ref<ReturnType<typeof setTimeout> | null>(null)

// Save positions to backend
async function savePositions() {
  if (saveTimeout.value) {
    clearTimeout(saveTimeout.value)
  }

  saveTimeout.value = setTimeout(async () => {
    const nodes = flowNodes.value
    const positions = nodes.map(node => ({
      routerId: node.id,
      positionX: Math.round(node.position.x),
      positionY: Math.round(node.position.y),
    }))

    await topologyStore.saveNodePositions({
      positions,
      companyId: props.companyId,
    })
  }, 500) // Debounce 500ms
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
})

const pendingConnection = ref<Connection | null>(null)

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
function onNodeClick(event: { node: Node }) {
  selectedNode.value = event.node.data as TopologyNode
  isNodeDetailOpen.value = true
}

// Handle edge click
function onEdgeClick(event: { edge: Edge }) {
  selectedEdge.value = event.edge.data as TopologyEdge
  isEdgeDetailOpen.value = true
}

// Handle connection creation - open form dialog
function handleConnect(connection: Connection) {
  if (!connection.source || !connection.target) {
    return
  }

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
    const result = await topologyStore.createConnection({
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

// Delete connection
async function handleDeleteEdge(_edgeId: string) {
  // This would call the store to delete
  // TODO: Implement actual delete functionality
  isEdgeDetailOpen.value = false
}

// Delete node (not implemented - nodes are routers)
// Routers should be deleted from the router page
</script>

<template>
  <div class="w-full space-y-4">
    <!-- Vue Flow Container -->
    <div class="w-full rounded-lg border bg-card overflow-hidden" style="height: 600px;">
      <VueFlow
        v-model:nodes="flowNodes"
        v-model:edges="flowEdges"
        :default-viewport="{ zoom: 1, x: 0, y: 0 }"
        :min-zoom="0.2"
        :max-zoom="2"
        fit-view-on-init
        @node-click="onNodeClick"
        @edge-click="onEdgeClick"
        @connect="handleConnect"
      >
        <!-- Background -->
        <Background />

        <!-- Controls -->
        <Controls />
      </VueFlow>
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
            Router Details
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
                {{ selectedNode.routerType }}
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

        <div class="mt-6 flex justify-end">
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
    <div
      v-if="isEdgeDetailOpen && selectedEdge"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      @click.self="isEdgeDetailOpen = false"
    >
      <div class="bg-card rounded-lg shadow-lg max-w-md w-full mx-4 p-6">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-semibold">
            Connection Details
          </h3>
          <button
            class="text-muted-foreground hover:text-foreground"
            @click="isEdgeDetailOpen = false"
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
                Type
              </p>
              <span
                class="inline-flex px-2 py-0.5 rounded text-xs font-medium"
                :class="{
                  'bg-green-100 text-green-800': selectedEdge.linkType === 'ETHERNET',
                  'bg-blue-100 text-blue-800': selectedEdge.linkType === 'FIBER',
                  'bg-orange-100 text-orange-800': selectedEdge.linkType === 'WIRELESS',
                  'bg-purple-100 text-purple-800': selectedEdge.linkType === 'VPN',
                }"
              >
                {{ selectedEdge.linkType }}
              </span>
            </div>
            <div>
              <p class="text-sm text-muted-foreground">
                Status
              </p>
              <span
                class="inline-flex px-2 py-0.5 rounded text-xs font-medium"
                :class="{
                  'bg-green-100 text-green-800': selectedEdge.linkStatus === 'ACTIVE',
                  'bg-red-100 text-red-800': selectedEdge.linkStatus === 'INACTIVE',
                  'bg-gray-100 text-gray-800': selectedEdge.linkStatus === 'PLANNED',
                }"
              >
                {{ selectedEdge.linkStatus }}
              </span>
            </div>
          </div>

          <div v-if="selectedEdge.bandwidth">
            <p class="text-sm text-muted-foreground">
              Bandwidth
            </p>
            <p class="font-medium">
              {{ selectedEdge.bandwidth }}
            </p>
          </div>

          <div v-if="selectedEdge.distance" class="grid grid-cols-2 gap-4">
            <div>
              <p class="text-sm text-muted-foreground">
                Distance
              </p>
              <p class="font-medium">
                {{ selectedEdge.distance }}m
              </p>
            </div>
          </div>

          <div v-if="selectedEdge.sourceInterface || selectedEdge.targetInterface" class="grid grid-cols-2 gap-4">
            <div v-if="selectedEdge.sourceInterface">
              <p class="text-sm text-muted-foreground">
                Source Interface
              </p>
              <p class="font-medium font-mono text-xs">
                {{ selectedEdge.sourceInterface }}
              </p>
            </div>
            <div v-if="selectedEdge.targetInterface">
              <p class="text-sm text-muted-foreground">
                Target Interface
              </p>
              <p class="font-medium font-mono text-xs">
                {{ selectedEdge.targetInterface }}
              </p>
            </div>
          </div>

          <div v-if="selectedEdge.isAutoDiscovered" class="flex items-center gap-2 text-sm text-blue-600">
            <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11-9 11zM4 14v6" />
            </svg>
            Auto-discovered connection
          </div>
        </div>

        <div class="mt-6 flex justify-between">
          <button
            class="px-4 py-2 bg-destructive text-destructive-foreground rounded-md hover:bg-destructive/90"
            @click="handleDeleteEdge(selectedEdge.id)"
          >
            Delete
          </button>
          <button
            class="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
            @click="isEdgeDetailOpen = false"
          >
            Close
          </button>
        </div>
      </div>
    </div>

    <!-- Legend -->
    <div class="mt-4 rounded-lg border bg-card p-4">
      <h4 class="text-sm font-semibold mb-3">
        Legend
      </h4>
      <div class="grid gap-4 md:grid-cols-2">
        <!-- Node Types -->
        <div>
          <p class="text-xs font-medium text-muted-foreground mb-2">
            Router Types
          </p>
          <div class="space-y-1">
            <div class="flex items-center gap-2">
              <div class="h-3 w-3 rounded bg-blue-600" />
              <span class="text-xs">Upstream</span>
            </div>
            <div class="flex items-center gap-2">
              <div class="h-3 w-3 rounded bg-green-600" />
              <span class="text-xs">Core</span>
            </div>
            <div class="flex items-center gap-2">
              <div class="h-3 w-3 rounded bg-purple-600" />
              <span class="text-xs">Distribution</span>
            </div>
            <div class="flex items-center gap-2">
              <div class="h-3 w-3 rounded bg-orange-600" />
              <span class="text-xs">Wireless</span>
            </div>
          </div>
        </div>

        <!-- Connection Types -->
        <div>
          <p class="text-xs font-medium text-muted-foreground mb-2">
            Connection Types
          </p>
          <div class="space-y-1">
            <div class="flex items-center gap-2">
              <div class="h-0.5 w-8 bg-green-600" />
              <span class="text-xs">Ethernet</span>
            </div>
            <div class="flex items-center gap-2">
              <div class="h-0.5 w-8 bg-blue-600" />
              <span class="text-xs">Fiber</span>
            </div>
            <div class="flex items-center gap-2">
              <div class="h-0.5 w-8 bg-orange-600" />
              <span class="text-xs">Wireless</span>
            </div>
            <div class="flex items-center gap-2">
              <div class="h-0.5 w-8 bg-purple-600" />
              <span class="text-xs">VPN</span>
            </div>
          </div>
        </div>
      </div>
    </div>
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

/* Dark mode adjustments */
@media (prefers-color-scheme: dark) {
  .custom-node {
    color: #fff;
  }
}
</style>
