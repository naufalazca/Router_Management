<script setup lang="ts">
import type { Connection, EdgeMouseEvent, NodeMouseEvent } from '@vue-flow/core'
import type { TopologyEdge, TopologyNode } from '~/stores/router/router.topology'
import { Background } from '@vue-flow/background'
import { Controls } from '@vue-flow/controls'
import { ConnectionMode, MarkerType, Position, useVueFlow, VueFlow } from '@vue-flow/core'
import { computed, onBeforeUnmount, onMounted, provide, ref, watch } from 'vue'
import { toast } from 'vue-sonner'
import { topologyFlowCss } from '~/components/topology/topology-visual'
import TopologyDetailPanel from '~/components/topology/TopologyDetailPanel.vue'
import TopologyEdgeComp from '~/components/topology/TopologyEdge.vue'
import TopologyLegend from '~/components/topology/TopologyLegend.vue'
import TopologyNodeComp from '~/components/topology/TopologyNode.vue'
import { useTopologyStore } from '~/stores/router/router.topology'

// Props
interface Props {
  nodes: TopologyNode[]
  edges: TopologyEdge[]
  companyId?: string
  companyName?: string
}

const props = defineProps<Props>()

// Emit
const emit = defineEmits<{
  connectionCreated: []
}>()

// Store
const topologyStore = useTopologyStore()

const { $apiFetch } = useApiFetch()

// Selected node/edge for the detail panel (declared early: remove handlers reference it)
const selectedNode = ref<TopologyNode | null>(null)
const selectedEdge = ref<TopologyEdge | null>(null)
const isDetailOpen = ref(false)
const detailMode = ref<'node' | 'edge' | 'connection'>('node')
const isCreatingConnection = ref(false)
const isRemovingNode = ref(false)
const connectionError = ref<string | null>(null)

// ==========================================
// Manual switch management (add/remove)
// ==========================================
interface AvailableSwitch {
  id: string
  name: string
  ipAddress: string
  status: string
  brand?: string
  portCount?: number
  company?: { id: string, name: string, code: string }
}

const isAddSwitchOpen = ref(false)
const availableSwitches = ref<AvailableSwitch[]>([])
const isLoadingAvailableSwitches = ref(false)
const isAddingSwitch = ref(false)

function ownerLabel(sw: AvailableSwitch): string | null {
  if (!sw.company || !props.companyId || sw.company.id === props.companyId)
    return null
  return sw.company.name
}

async function loadAvailableSwitches() {
  if (!props.companyId)
    return
  isLoadingAvailableSwitches.value = true
  try {
    const response = await $apiFetch<{ status: string, data: AvailableSwitch[] }>(
      `/router/topology/switch-layout/available?companyId=${props.companyId}`,
    )
    availableSwitches.value = response.data || []
  }
  catch (err: any) {
    toast.error(err?.data?.message || 'Failed to load available switches')
    availableSwitches.value = []
  }
  finally {
    isLoadingAvailableSwitches.value = false
  }
}

function openAddSwitchModal() {
  isAddSwitchOpen.value = true
  loadAvailableSwitches()
}

async function handleAddSwitch(sw: AvailableSwitch) {
  if (!props.companyId)
    return
  isAddingSwitch.value = true
  try {
    await $apiFetch('/router/topology/switch-layout/add', {
      method: 'POST',
      body: {
        switchId: sw.id,
        companyId: props.companyId,
      },
    })
    toast.success(`Switch "${sw.name}" added to topology`)
    isAddSwitchOpen.value = false
    emit('connectionCreated') // triggers parent refresh
  }
  catch (err: any) {
    toast.error(err?.data?.message || 'Failed to add switch to topology')
  }
  finally {
    isAddingSwitch.value = false
  }
}

async function handleRemoveSwitchFromTopology() {
  if (!props.companyId || !selectedNode.value || selectedNode.value.nodeType !== 'SWITCH' || isRemovingNode.value)
    return
  const node = selectedNode.value
  // eslint-disable-next-line no-alert -- legacy confirmation UX preserved
  if (!confirm(`Remove switch "${node.name}" from the topology? Its connections will also be removed.`))
    return
  isRemovingNode.value = true
  try {
    await $apiFetch('/router/topology/switch-layout/remove', {
      method: 'POST',
      body: {
        switchId: node.id,
        companyId: props.companyId,
      },
    })
    toast.success(`Switch "${node.name}" removed from topology`)
    isDetailOpen.value = false
    emit('connectionCreated') // triggers parent refresh
  }
  catch (err: any) {
    toast.error(err?.data?.message || 'Failed to remove switch from topology')
  }
  finally {
    isRemovingNode.value = false
  }
}

// ==========================================
// Manual router management (add/remove)
// ==========================================
interface AvailableRouter {
  id: string
  name: string
  ipAddress: string
  status: string
  routerType?: string
  routerBrand?: string
  company?: { id: string, name: string, code: string }
}

const isAddRouterOpen = ref(false)
const availableRouters = ref<AvailableRouter[]>([])
const isLoadingAvailableRouters = ref(false)
const isAddingRouter = ref(false)

function routerOwnerLabel(r: AvailableRouter): string | null {
  if (!r.company || !props.companyId || r.company.id === props.companyId)
    return null
  return r.company.name
}

async function loadAvailableRouters() {
  if (!props.companyId)
    return
  isLoadingAvailableRouters.value = true
  try {
    const response = await $apiFetch<{ status: string, data: AvailableRouter[] }>(
      `/router/topology/layout/available?companyId=${props.companyId}`,
    )
    availableRouters.value = response.data || []
  }
  catch (err: any) {
    toast.error(err?.data?.message || 'Failed to load available routers')
    availableRouters.value = []
  }
  finally {
    isLoadingAvailableRouters.value = false
  }
}

function openAddRouterModal() {
  isAddRouterOpen.value = true
  loadAvailableRouters()
}

async function handleAddRouter(r: AvailableRouter) {
  if (!props.companyId)
    return
  isAddingRouter.value = true
  try {
    await $apiFetch('/router/topology/layout/add', {
      method: 'POST',
      body: {
        routerId: r.id,
        companyId: props.companyId,
      },
    })
    toast.success(`Router "${r.name}" added to topology`)
    isAddRouterOpen.value = false
    emit('connectionCreated') // triggers parent refresh
  }
  catch (err: any) {
    toast.error(err?.data?.message || 'Failed to add router to topology')
  }
  finally {
    isAddingRouter.value = false
  }
}

async function handleRemoveRouterFromTopology() {
  if (!props.companyId || !selectedNode.value || selectedNode.value.nodeType !== 'ROUTER' || isRemovingNode.value)
    return
  const node = selectedNode.value
  // eslint-disable-next-line no-alert -- legacy confirmation UX preserved
  if (!confirm(`Remove router "${node.name}" from the topology? Its router connections will also be removed.`))
    return
  isRemovingNode.value = true
  try {
    await $apiFetch('/router/topology/layout/remove', {
      method: 'POST',
      body: {
        routerId: node.id,
        companyId: props.companyId,
      },
    })
    toast.success(`Router "${node.name}" removed from topology`)
    isDetailOpen.value = false
    emit('connectionCreated') // triggers parent refresh
  }
  catch (err: any) {
    toast.error(err?.data?.message || 'Failed to remove router from topology')
  }
  finally {
    isRemovingNode.value = false
  }
}

// VueFlow instance for getting node positions
const { onNodeDragStop, onPaneReady, startConnection, viewport } = useVueFlow()

// Hoisted label-visibility decision: one debounced zoom watcher instead of a
// per-edge viewport subscription (which re-rendered every edge on each zoom tick).
const showEdgeLabels = ref(true)
let zoomDebounce: ReturnType<typeof setTimeout> | null = null
watch(() => viewport.value.zoom, (zoom) => {
  if (zoomDebounce)
    clearTimeout(zoomDebounce)
  zoomDebounce = setTimeout(() => {
    showEdgeLabels.value = zoom >= 0.75
  }, 150)
})
provide('topologyShowEdgeLabels', showEdgeLabels)

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
    type: 'topology',
    data: edge,
    markerEnd: MarkerType.ArrowClosed,
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

// Initialize flowNodes with nodes (custom node type, saved position or circular layout)
function initializeNodes() {
  flowNodes.value = props.nodes.map((node, index) => {
    // Check if we have a saved position
    const savedPos = topologyStore.getNodePosition(node.id)

    if (savedPos) {
      return {
        id: node.id,
        type: 'topology',
        position: { x: savedPos.x, y: savedPos.y },
        data: node,
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
      }
    }

    // Default: Position nodes in a circular layout (wider spacing for cards)
    const angle = (index / props.nodes.length) * 2 * Math.PI
    const radius = Math.min(420, 90 + props.nodes.length * 45)
    const x = 500 + radius * Math.cos(angle) - 110
    const y = 400 + radius * Math.sin(angle) - 55

    return {
      id: node.id,
      type: 'topology',
      position: { x, y },
      data: node,
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

const pendingConnection = ref<Connection | null>(null)

// Re-sync the open node panel after a topology refresh: the panel otherwise
// keeps a stale snapshot while props.edges is fresh. Closes if node was removed.
watch(() => props.nodes, () => {
  if (isDetailOpen.value && detailMode.value === 'node' && selectedNode.value) {
    const fresh = props.nodes.find(n => n.id === selectedNode.value!.id)
    if (fresh) {
      selectedNode.value = fresh
    }
    else {
      selectedNode.value = null
      isDetailOpen.value = false
    }
  }
})

// Clear abandoned connection-form state when the panel closes
watch(isDetailOpen, (open) => {
  if (!open && detailMode.value === 'connection') {
    pendingConnection.value = null
    connectionError.value = null
  }
})

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
const connectionMode = ConnectionMode.Loose

function handleConnectStart(params: { nodeId?: string }) {
  isConnecting.value = true
  connectingSource.value = params.nodeId ?? null
}

function handleConnectEnd() {
  isConnecting.value = false
  connectingSource.value = null
}

// Handle node click
function onNodeClick(event: NodeMouseEvent) {
  selectedNode.value = event.node.data as TopologyNode
  detailMode.value = 'node'
  isDetailOpen.value = true
}

// Start connect flow from node detail panel
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
  isDetailOpen.value = false
  toast.info(`Click a target router port to connect from ${selectedNode.value.name}`)
}

// Handle edge click
function onEdgeClick(event: EdgeMouseEvent) {
  selectedEdge.value = event.edge.data as TopologyEdge
  detailMode.value = 'edge'
  isDetailOpen.value = true
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

  const sourceNode = props.nodes.find(n => n.id === connection.source)
  const targetNode = props.nodes.find(n => n.id === connection.target)

  if (sourceNode && targetNode) {
    connectionError.value = null
    detailMode.value = 'connection'
    isDetailOpen.value = true
  }
}

// Submit new connection (payload comes from the detail panel form)
async function submitConnection(payload: Record<string, unknown>) {
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
        linkType: payload.linkType as any,
        linkStatus: payload.linkStatus as any,
        sourceInterface: (payload.sourceInterface as string) || undefined,
        targetInterface: (payload.targetInterface as string) || undefined,
        sourcePortNumber: (payload.sourcePortNumber as number) || undefined,
        targetPortNumber: (payload.targetPortNumber as number) || undefined,
        vlan: (payload.vlan as number) || undefined,
        speed: (payload.speed as string) || undefined,
        bandwidth: (payload.bandwidth as string) || undefined,
        distance: payload.distance as number | undefined,
        notes: payload.notes as string | undefined,
      }, props.companyId)
    }
    else {
      result = await topologyStore.createConnection({
        sourceRouterId: pendingConnection.value.source,
        targetRouterId: pendingConnection.value.target,
        linkType: payload.linkType as any,
        linkStatus: payload.linkStatus as any,
        sourceInterface: (payload.sourceInterface as string) || undefined,
        targetInterface: (payload.targetInterface as string) || undefined,
        bandwidth: (payload.bandwidth as string) || undefined,
        distance: payload.distance as number | undefined,
        notes: payload.notes as string | undefined,
      })
    }

    if (result.success) {
      // Emit event to parent to refresh data
      emit('connectionCreated')
      // Close dialog and reset
      isDetailOpen.value = false
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

// Delete connection (routes by edge type)
async function handleDeleteEdge(edgeId: string) {
  const edge = props.edges.find(e => e.id === edgeId)
  if (edge?.edgeType === 'SWITCH') {
    await topologyStore.deleteSwitchConnection(edgeId, props.companyId)
  }
  else {
    await topologyStore.deleteConnection(edgeId)
  }
  isDetailOpen.value = false
  emit('connectionCreated') // Refresh topology after delete
}

// Esc cancels an in-progress click-to-connect gesture
function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && isConnecting.value) {
    handleConnectEnd()
    flowEdges.value = flowEdges.value.filter(edge => props.edges.some(p => p.id === edge.id))
  }
}
// Inject the shared flow animation CSS once per app session (static constant, non-scoped)
let flowCssInjected = false

onMounted(() => {
  window.addEventListener('keydown', onKeydown)
  if (!flowCssInjected) {
    const style = document.createElement('style')
    style.textContent = topologyFlowCss
    document.head.appendChild(style)
    flowCssInjected = true
  }
})
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))

// Pending connection endpoint names for the create form
const pendingSourceName = computed(() =>
  pendingConnection.value ? props.nodes.find(n => n.id === pendingConnection.value!.source)?.name : '',
)
const pendingTargetName = computed(() =>
  pendingConnection.value ? props.nodes.find(n => n.id === pendingConnection.value!.target)?.name : '',
)

const nodeCount = computed(() => props.nodes.length)
const edgeCount = computed(() => props.edges.length)

// Identity of the pending connection; the panel's form resets when this changes
const connectionKey = computed(() =>
  pendingConnection.value ? `${pendingConnection.value.source}->${pendingConnection.value.target}` : '',
)
</script>

<template>
  <div class="w-full">
    <!-- Vue Flow Container: full-bleed glass canvas -->
    <div
      class="topology-canvas relative w-full overflow-hidden rounded-xl border border-border/60 bg-background"
      style="height: max(70vh, 560px);"
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
        <!-- Custom node/edge renderers -->
        <template #node-topology="nodeProps">
          <TopologyNodeComp v-bind="nodeProps" />
        </template>
        <template #edge-topology="edgeProps">
          <TopologyEdgeComp v-bind="edgeProps" />
        </template>

        <!-- Background -->
        <Background pattern-color="var(--border)" :gap="24" />
        <!-- gap 24 & themed dot color keeps the grid subtle in both themes -->

        <!-- Controls -->
        <Controls position="bottom-left" />
      </VueFlow>

      <!-- Floating glass toolbar (top-left) -->
      <div class="pointer-events-none absolute top-3 left-3 z-20 flex items-center gap-2">
        <div class="pointer-events-auto flex items-center gap-1 rounded-xl border border-border/60 bg-card/70 p-1 shadow-md backdrop-blur-md">
          <Button
            size="sm"
            class="gap-1.5"
            :disabled="!companyId"
            @click="openAddRouterModal"
          >
            <Icon name="lucide:router" class="size-4" aria-hidden="true" />
            <span class="hidden sm:inline">Add Router</span>
            <span class="sr-only sm:hidden">Add Router</span>
          </Button>
          <Button
            size="sm"
            class="gap-1.5"
            :disabled="!companyId"
            @click="openAddSwitchModal"
          >
            <Icon name="lucide:hard-drive" class="size-4" aria-hidden="true" />
            <span class="hidden sm:inline">Add Switch</span>
            <span class="sr-only sm:hidden">Add Switch</span>
          </Button>
          <span class="mx-1 h-5 w-px bg-border" aria-hidden="true" />
          <span class="px-2 text-xs font-medium text-muted-foreground">
            <span class="font-semibold text-foreground">{{ nodeCount }}</span> devices
            ·
            <span class="font-semibold text-foreground">{{ edgeCount }}</span> links
          </span>
        </div>
      </div>

      <!-- Connecting hint pill (center-top) -->
      <div
        v-if="isConnecting"
        class="pointer-events-none absolute top-3 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2 rounded-full border border-primary/30 bg-card/90 px-4 py-1.5 text-sm font-medium text-foreground shadow-lg backdrop-blur-md"
        role="status"
      >
        <Icon name="lucide:zap" class="size-4 text-primary" aria-hidden="true" />
        Click a target router port to connect · Esc to cancel
      </div>

      <!-- Company chip (top-right) -->
      <div
        v-if="companyName"
        class="pointer-events-none absolute top-3 right-3 z-20 flex items-center gap-1.5 rounded-full border border-border/60 bg-card/70 px-3 py-1.5 text-xs font-medium text-muted-foreground shadow-md backdrop-blur-md"
      >
        <Icon name="lucide:building-2" class="size-3.5" aria-hidden="true" />
        {{ companyName }}
      </div>

      <!-- Floating glass legend + guide (bottom-right) -->
      <div class="absolute right-3 bottom-3 z-20">
        <TopologyLegend />
      </div>
    </div>

    <!-- Detail panel (node / edge / create-connection) -->
    <TopologyDetailPanel
      :open="isDetailOpen"
      :mode="detailMode"
      :node="selectedNode"
      :edge="selectedEdge"
      :nodes="props.nodes"
      :edges="props.edges"
      :involves-switch="involvesSwitch"
      :is-submitting="isCreatingConnection"
      :is-removing="isRemovingNode"
      :error="connectionError"
      :source-name="pendingSourceName"
      :target-name="pendingTargetName"
      :connection-key="connectionKey"
      @close="isDetailOpen = false"
      @create-connection="startConnectFromNode"
      @remove-node="selectedNode?.nodeType === 'SWITCH' ? handleRemoveSwitchFromTopology() : handleRemoveRouterFromTopology()"
      @connection-submit="submitConnection"
      @edge-delete="handleDeleteEdge"
      @edge-updated="emit('connectionCreated')"
    />

    <!-- Add Switch Modal -->
    <Dialog :open="isAddSwitchOpen" @update:open="(v: boolean) => (isAddSwitchOpen = v)">
      <DialogContent class="max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Switch to Topology</DialogTitle>
          <DialogDescription>
            Select a switch to add to the topology. Switches are not added automatically.
          </DialogDescription>
        </DialogHeader>

        <!-- Loading -->
        <div v-if="isLoadingAvailableSwitches" class="flex items-center justify-center py-8">
          <Icon name="lucide:loader-circle" class="size-8 animate-spin text-primary" aria-hidden="true" />
        </div>

        <!-- Available Switches -->
        <div v-else-if="availableSwitches.length > 0" class="space-y-2">
          <button
            v-for="sw in availableSwitches"
            :key="sw.id"
            class="flex w-full cursor-pointer items-center justify-between rounded-lg border border-border p-3 text-left transition-colors hover:border-primary hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
            :disabled="isAddingSwitch"
            @click="handleAddSwitch(sw)"
          >
            <div>
              <p class="font-medium">
                {{ sw.name }}
              </p>
              <p class="text-xs text-muted-foreground">
                {{ sw.ipAddress }}<template v-if="sw.brand">
                  · {{ sw.brand }}
                </template><template v-if="ownerLabel(sw)">
                  · {{ ownerLabel(sw) }}
                </template>
              </p>
            </div>
            <Icon name="lucide:plus" class="size-5 text-muted-foreground" aria-hidden="true" />
          </button>
        </div>

        <!-- Empty -->
        <div v-else class="py-8 text-center text-muted-foreground">
          <p>No switches available to add. Either every switch is already in your topology, or no switches exist yet.</p>
        </div>
      </DialogContent>
    </Dialog>

    <!-- Add Router Modal -->
    <Dialog :open="isAddRouterOpen" @update:open="(v: boolean) => (isAddRouterOpen = v)">
      <DialogContent class="max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Router to Topology</DialogTitle>
          <DialogDescription>
            Select a router to add to the topology. Routers are not added automatically.
          </DialogDescription>
        </DialogHeader>

        <!-- Loading -->
        <div v-if="isLoadingAvailableRouters" class="flex items-center justify-center py-8">
          <Icon name="lucide:loader-circle" class="size-8 animate-spin text-primary" aria-hidden="true" />
        </div>

        <!-- Available Routers -->
        <div v-else-if="availableRouters.length > 0" class="space-y-2">
          <button
            v-for="r in availableRouters"
            :key="r.id"
            class="flex w-full cursor-pointer items-center justify-between rounded-lg border border-border p-3 text-left transition-colors hover:border-primary hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
            :disabled="isAddingRouter"
            @click="handleAddRouter(r)"
          >
            <div>
              <p class="font-medium">
                {{ r.name }}
              </p>
              <p class="text-xs text-muted-foreground">
                {{ r.ipAddress }}<template v-if="r.routerBrand">
                  · {{ r.routerBrand }}
                </template><template v-if="routerOwnerLabel(r)">
                  · {{ routerOwnerLabel(r) }}
                </template>
              </p>
            </div>
            <Icon name="lucide:plus" class="size-5 text-muted-foreground" aria-hidden="true" />
          </button>
        </div>

        <!-- Empty -->
        <div v-else class="py-8 text-center text-muted-foreground">
          <p>No routers available to add. Either every router is already in your topology, or no routers exist yet.</p>
        </div>
      </DialogContent>
    </Dialog>
  </div>
</template>

<style>
/* Import Vue Flow styles (must stay global; not in nuxt.config) */
@import '@vue-flow/core/dist/style.css';
@import '@vue-flow/core/dist/theme-default.css';
@import '@vue-flow/controls/dist/style.css';

/* Subtle glass/grid backdrop behind the canvas */
.topology-canvas {
  background-image:
    radial-gradient(circle at 1px 1px, color-mix(in oklch, var(--border) 55%, transparent) 1px, transparent 0);
  background-size: 24px 24px;
}

/* Hide Vue Flow's default dot pattern duplication: our CSS grid above is the backdrop */
.topology-canvas .vue-flow__background {
  opacity: 0.55;
}

/* Node card base (custom node uses its own component; keep generic cursor here) */
.vue-flow__node-topology,
.vue-flow__edge-topology {
  cursor: pointer;
}

/* Themed controls */
.vue-flow__controls {
  border-radius: 0.75rem;
  overflow: hidden;
  border: 1px solid var(--border);
  box-shadow: 0 4px 12px rgb(0 0 0 / 0.08);
  background: color-mix(in oklch, var(--card) 80%, transparent);
  backdrop-filter: blur(8px);
}

.vue-flow__controls-button {
  background: transparent;
  border-bottom: 1px solid var(--border);
  fill: var(--foreground);
}

.vue-flow__controls-button:hover {
  background: var(--accent);
}

/* Connection line while dragging a new connection */
.vue-flow__connection-path {
  stroke: var(--primary);
  stroke-width: 2;
  stroke-dasharray: 6 4;
}

/* Edge hover emphasis without moving endpoints */
.topology-edge .topology-edge-stroke {
  transition: stroke-width 0.15s ease, opacity 0.15s ease;
}

@media (prefers-reduced-motion: reduce) {
  .topology-edge .topology-edge-stroke {
    transition: none;
  }

  .topology-node,
  .vue-flow__node-topology,
  .vue-flow__edge-topology {
    /* Only disable transitions — `transform` is functional in Vue Flow
       (nodes are positioned via inline transform: translate(x, y)), so
       `transform: none` would freeze nodes and break dragging entirely. */
    transition: none !important;
  }
}

/* Enlarge connection handle hit targets (default ~6px, below WCAG target size) */
.vue-flow__handle {
  width: 12px;
  height: 12px;
  border-radius: 9999px;
  border: 2px solid var(--card);
  background: var(--ring);
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
  background: var(--primary);
  box-shadow: 0 0 0 4px color-mix(in oklch, var(--ring) 35%, transparent);
}

/* Remove the default theme node label look (custom component draws its own) */
.vue-flow__node-topology {
  padding: 0;
  border: none;
  background: transparent;
  width: auto;
}
</style>
