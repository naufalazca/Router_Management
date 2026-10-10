<script setup lang="ts">
import type { TopologyEdge, TopologyNode } from '~/stores/router/router.topology'
import { computed, ref, watch } from 'vue'
import { toast } from 'vue-sonner'
import { useTopologyStore } from '~/stores/router/router.topology'
import {
  getLinkTypeVisual,
  getNodeVisual,
  linkStatusBadgeClass,
  linkStatusDotClass,
  nodeStatusBadgeClass,
  switchLinkAccent,
} from './topology-visual'

const props = defineProps<{
  open: boolean
  mode: 'node' | 'edge' | 'connection'
  node?: TopologyNode | null
  edge?: TopologyEdge | null
  nodes: TopologyNode[]
  edges: TopologyEdge[]
  /** show the switch-specific extra fields for the pending connection */
  involvesSwitch: boolean
  isSubmitting?: boolean
  error?: string | null
  isRemoving?: boolean
  /** display names for the pending connection endpoints */
  sourceName?: string
  targetName?: string
  /** identity of the pending connection; form resets when this changes */
  connectionKey?: string
}>()

const emit = defineEmits<{
  close: []
  createConnection: []
  removeNode: []
  connectionSubmit: [payload: Record<string, unknown>]
  edgeDelete: [edgeId: string]
  /** a saved edge edit changed topology data; parent should refresh */
  edgeUpdated: []
}>()

const topologyStore = useTopologyStore()

// ---------- Shared helpers ----------

const bandwidthPresets = [
  '10Mbps',
  '100Mbps',
  '1Gbps',
  '10Gbps',
  '25Gbps',
  '40Gbps',
  '100Gbps',
]

function getNodeName(nodeId: string): string {
  return props.nodes.find(n => n.id === nodeId)?.name || nodeId
}

const nodeConnections = computed(() => {
  if (!props.node)
    return []
  return props.edges
    .filter(e => e.source === props.node!.id || e.target === props.node!.id)
    .map((e) => {
      const otherId = e.source === props.node!.id ? e.target : e.source
      return { edge: e, other: props.nodes.find(n => n.id === otherId) }
    })
})

// ---------- Edge edit state (absorbed from TopologyConnections.vue) ----------

const isEditing = ref(false)
const isSubmittingEdit = ref(false)
const editError = ref<string | null>(null)

const editData = ref({
  linkType: 'ETHERNET' as 'ETHERNET' | 'FIBER' | 'WIRELESS' | 'VPN',
  linkStatus: 'PLANNED' as 'ACTIVE' | 'INACTIVE' | 'PLANNED',
  sourceInterface: '',
  targetInterface: '',
  bandwidth: '',
  distance: undefined as number | undefined,
  sourcePortNumber: undefined as number | undefined,
  targetPortNumber: undefined as number | undefined,
  vlan: undefined as number | undefined,
  speed: '',
})

const isSwitchEdge = computed(() => props.edge?.edgeType === 'SWITCH')

watch(() => props.edge, (newEdge) => {
  if (newEdge) {
    editData.value = {
      linkType: newEdge.linkType,
      linkStatus: newEdge.linkStatus,
      sourceInterface: newEdge.sourceInterface || '',
      targetInterface: newEdge.targetInterface || '',
      bandwidth: newEdge.bandwidth || '',
      distance: newEdge.distance,
      sourcePortNumber: newEdge.sourcePortNumber,
      targetPortNumber: newEdge.targetPortNumber,
      vlan: newEdge.vlan,
      speed: newEdge.speed || '',
    }
  }
}, { immediate: true })

watch(() => props.open, (open) => {
  if (!open) {
    isEditing.value = false
    editError.value = null
  }
})

function resetEditFromEdge() {
  if (props.edge) {
    editData.value = {
      linkType: props.edge.linkType,
      linkStatus: props.edge.linkStatus,
      sourceInterface: props.edge.sourceInterface || '',
      targetInterface: props.edge.targetInterface || '',
      bandwidth: props.edge.bandwidth || '',
      distance: props.edge.distance,
      sourcePortNumber: props.edge.sourcePortNumber,
      targetPortNumber: props.edge.targetPortNumber,
      vlan: props.edge.vlan,
      speed: props.edge.speed || '',
    }
  }
}

function handleStartEdit() {
  isEditing.value = true
  editError.value = null
}

function handleCancelEdit() {
  isEditing.value = false
  editError.value = null
  resetEditFromEdge()
}

async function handleSaveEdit() {
  if (!props.edge)
    return

  isSubmittingEdit.value = true
  editError.value = null

  try {
    const commonPayload = {
      linkType: editData.value.linkType,
      linkStatus: editData.value.linkStatus,
      sourceInterface: editData.value.sourceInterface || undefined,
      targetInterface: editData.value.targetInterface || undefined,
      bandwidth: editData.value.bandwidth || undefined,
      distance: editData.value.distance,
    }

    const result = isSwitchEdge.value
      ? await topologyStore.updateSwitchConnection(props.edge.id, {
          ...commonPayload,
          sourcePortNumber: editData.value.sourcePortNumber,
          targetPortNumber: editData.value.targetPortNumber,
          vlan: editData.value.vlan,
          speed: editData.value.speed || undefined,
        })
      : await topologyStore.updateConnection(props.edge.id, commonPayload)

    if (result.success) {
      toast.success('Connection updated successfully')
      isEditing.value = false
      // Notify parent so the topology refreshes with fresh edge data
      emit('edgeUpdated')
    }
    else {
      editError.value = result.error || 'Failed to update connection'
      toast.error(editError.value)
    }
  }
  catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Failed to update connection'
    editError.value = errorMsg
    toast.error(errorMsg)
  }
  finally {
    isSubmittingEdit.value = false
  }
}

// ---------- Create connection form state ----------

function emptyConnection() {
  return {
    linkType: 'ETHERNET' as 'ETHERNET' | 'FIBER' | 'WIRELESS' | 'VPN',
    linkStatus: 'PLANNED' as 'ACTIVE' | 'INACTIVE' | 'PLANNED',
    sourceInterface: '',
    targetInterface: '',
    bandwidth: '',
    distance: undefined as number | undefined,
    sourcePortNumber: undefined as number | undefined,
    targetPortNumber: undefined as number | undefined,
    vlan: undefined as number | undefined,
    speed: '',
    notes: '',
  }
}

const newConnection = ref(emptyConnection())

// Reset the form whenever a (different) pending connection is presented,
// covering both fresh opens and re-connection while the panel is already open.
watch(() => props.connectionKey, () => {
  if (props.mode === 'connection')
    newConnection.value = emptyConnection()
})

function submitConnection() {
  emit('connectionSubmit', { ...newConnection.value })
}

// Plain-language summary for an edge
const edgeSummary = computed(() => {
  if (!props.edge)
    return ''
  const t = getLinkTypeVisual(props.edge)
  const s = props.edge.linkStatus
  const statusText = s === 'ACTIVE'
    ? 'is up and carrying traffic'
    : s === 'PLANNED'
      ? 'is planned but not installed yet'
      : 'is down and not passing traffic'
  const via = props.edge.edgeType === 'SWITCH' ? ` through ${switchLinkAccent.label.toLowerCase()}` : ''
  return `A ${t.label.toLowerCase()} link${via} between ${getNodeName(props.edge.source)} and ${getNodeName(props.edge.target)} that ${statusText}.`
})
</script>

<template>
  <Sheet :open="open" @update:open="(v: boolean) => !v && emit('close')">
    <SheetContent
      side="right"
      class="w-full gap-0 border-l border-border/60 bg-card/90 backdrop-blur-xl sm:max-w-sm"
    >
      <SheetHeader class="border-b border-border/60 px-4 py-3">
        <SheetTitle class="flex items-center gap-2 text-base">
          <template v-if="mode === 'node' && node">
            <Icon :name="getNodeVisual(node).icon" class="size-4 text-primary" aria-hidden="true" />
            {{ node.nodeType === 'SWITCH' ? 'Switch Details' : 'Router Details' }}
          </template>
          <template v-else-if="mode === 'edge' && edge">
            <Icon name="lucide:git-branch" class="size-4 text-primary" aria-hidden="true" />
            Connection Details
          </template>
          <template v-else>
            <Icon name="lucide:plus" class="size-4 text-primary" aria-hidden="true" />
            Create New Connection
          </template>
        </SheetTitle>
        <SheetDescription v-if="mode === 'node' && node" class="sr-only">
          Details and actions for {{ node.name }}
        </SheetDescription>
        <SheetDescription v-else-if="mode === 'edge' && edge" class="sr-only">
          Details for the connection between {{ getNodeName(edge.source) }} and {{ getNodeName(edge.target) }}
        </SheetDescription>
        <SheetDescription v-else class="sr-only">
          Configure the new connection
        </SheetDescription>
      </SheetHeader>

      <div class="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        <!-- ============ NODE MODE ============ -->
        <div v-if="mode === 'node' && node" class="space-y-4">
          <div class="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p class="text-xs text-muted-foreground">
                Name
              </p>
              <p class="font-medium">
                {{ node.name }}
              </p>
            </div>
            <div>
              <p class="text-xs text-muted-foreground">
                IP Address
              </p>
              <p class="font-mono text-[13px]">
                {{ node.ipAddress }}
              </p>
            </div>
            <div>
              <p class="text-xs text-muted-foreground">
                Type
              </p>
              <p class="font-medium">
                {{ node.nodeType === 'SWITCH' ? 'Switch' : (getNodeVisual(node).label) }}
              </p>
            </div>
            <div>
              <p class="text-xs text-muted-foreground">
                Status
              </p>
              <span
                class="inline-flex rounded-full border px-2 py-0.5 text-xs font-medium"
                :class="nodeStatusBadgeClass(node.status)"
              >
                {{ node.status }}
              </span>
            </div>
            <template v-if="node.nodeType === 'SWITCH'">
              <div>
                <p class="text-xs text-muted-foreground">
                  Brand
                </p>
                <p class="font-medium">
                  {{ node.brand || '—' }}
                </p>
              </div>
              <div>
                <p class="text-xs text-muted-foreground">
                  Port Count
                </p>
                <p class="font-medium">
                  {{ node.portCount || '—' }}
                </p>
              </div>
            </template>
            <div v-if="node.routerBrand && node.nodeType !== 'SWITCH'">
              <p class="text-xs text-muted-foreground">
                Brand
              </p>
              <p class="font-medium">
                {{ node.routerBrand }}
              </p>
            </div>
            <div v-if="node.location">
              <p class="text-xs text-muted-foreground">
                Location
              </p>
              <p class="font-medium">
                {{ node.location }}
              </p>
            </div>
            <div v-if="node.companyName">
              <p class="text-xs text-muted-foreground">
                Company
              </p>
              <p class="font-medium">
                {{ node.companyName }}
              </p>
            </div>
          </div>

          <!-- Connections list -->
          <div>
            <p class="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Connections ({{ nodeConnections.length }})
            </p>
            <div v-if="nodeConnections.length" class="space-y-1.5">
              <div
                v-for="c in nodeConnections"
                :key="c.edge.id"
                class="flex items-center justify-between gap-2 rounded-lg border border-border/60 bg-background/50 px-2.5 py-1.5 text-xs"
              >
                <div class="min-w-0">
                  <p class="truncate font-medium">
                    {{ c.other?.name || 'Unknown' }}
                  </p>
                  <p class="truncate text-muted-foreground">
                    {{ getLinkTypeVisual(c.edge).label }}<template v-if="c.edge.bandwidth">
                      · {{ c.edge.bandwidth }}
                    </template>
                  </p>
                </div>
                <span
                  class="size-2 shrink-0 rounded-full"
                  :class="linkStatusDotClass(c.edge.linkStatus)"
                  :aria-label="c.edge.linkStatus"
                />
              </div>
            </div>
            <p v-else class="text-sm text-muted-foreground">
              No connections yet.
            </p>
          </div>
        </div>

        <!-- ============ EDGE MODE: VIEW ============ -->
        <div v-else-if="mode === 'edge' && edge && !isEditing" class="space-y-4">
          <p class="rounded-lg border border-border/60 bg-background/50 px-3 py-2 text-sm text-muted-foreground">
            {{ edgeSummary }}
          </p>

          <div class="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p class="text-xs text-muted-foreground">
                Type
              </p>
              <span
                class="inline-flex rounded-full border px-2 py-0.5 text-xs font-medium"
                :style="{
                  backgroundColor: `color-mix(in oklch, ${getLinkTypeVisual(edge).light} 15%, transparent)`,
                  color: getLinkTypeVisual(edge).light,
                  borderColor: `color-mix(in oklch, ${getLinkTypeVisual(edge).light} 35%, transparent)`,
                }"
              >
                {{ getLinkTypeVisual(edge).label }}
              </span>
            </div>
            <div>
              <p class="text-xs text-muted-foreground">
                Status
              </p>
              <span
                class="inline-flex rounded-full border px-2 py-0.5 text-xs font-medium"
                :class="linkStatusBadgeClass(edge.linkStatus)"
              >
                {{ edge.linkStatus }}
              </span>
            </div>
            <div v-if="edge.bandwidth">
              <p class="text-xs text-muted-foreground">
                Bandwidth
              </p>
              <p class="font-medium">
                {{ edge.bandwidth }}
              </p>
            </div>
            <div v-if="edge.distance">
              <p class="text-xs text-muted-foreground">
                Distance
              </p>
              <p class="font-medium">
                {{ edge.distance }}m
              </p>
            </div>
          </div>

          <!-- Switch detail -->
          <div v-if="edge.edgeType === 'SWITCH'" class="grid grid-cols-2 gap-3 text-sm">
            <div v-if="edge.sourcePortNumber">
              <p class="text-xs text-muted-foreground">
                Source Port
              </p>
              <p class="font-mono text-[13px]">
                {{ edge.sourcePortNumber }}
              </p>
            </div>
            <div v-if="edge.targetPortNumber">
              <p class="text-xs text-muted-foreground">
                Target Port
              </p>
              <p class="font-mono text-[13px]">
                {{ edge.targetPortNumber }}
              </p>
            </div>
            <div v-if="edge.vlan">
              <p class="text-xs text-muted-foreground">
                VLAN
              </p>
              <p class="font-mono text-[13px]">
                {{ edge.vlan }}
              </p>
            </div>
            <div v-if="edge.speed">
              <p class="text-xs text-muted-foreground">
                Speed
              </p>
              <p class="font-mono text-[13px]">
                {{ edge.speed }}
              </p>
            </div>
          </div>

          <div v-if="edge.sourceInterface || edge.targetInterface" class="grid grid-cols-2 gap-3 text-sm">
            <div v-if="edge.sourceInterface">
              <p class="text-xs text-muted-foreground">
                Source Interface
              </p>
              <p class="font-mono text-[13px]">
                {{ edge.sourceInterface }}
              </p>
            </div>
            <div v-if="edge.targetInterface">
              <p class="text-xs text-muted-foreground">
                Target Interface
              </p>
              <p class="font-mono text-[13px]">
                {{ edge.targetInterface }}
              </p>
            </div>
          </div>

          <div v-if="edge.notes" class="text-sm">
            <p class="text-xs text-muted-foreground">
              Notes
            </p>
            <p class="mt-0.5">
              {{ edge.notes }}
            </p>
          </div>

          <div v-if="edge.isAutoDiscovered" class="flex items-center gap-2 text-sm text-primary">
            <Icon name="lucide:sparkles" class="size-4" aria-hidden="true" />
            Auto-discovered connection
          </div>
        </div>

        <!-- ============ EDGE MODE: EDIT ============ -->
        <form v-else-if="mode === 'edge' && edge && isEditing" class="space-y-4" @submit.prevent="handleSaveEdit">
          <div
            v-if="editError"
            class="rounded-lg bg-destructive/10 p-3 text-sm text-destructive"
            role="alert"
          >
            {{ editError }}
          </div>

          <div class="space-y-1.5">
            <Label for="edit-link-type">Link Type</Label>
            <Select v-model="editData.linkType">
              <SelectTrigger id="edit-link-type" class="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ETHERNET">
                  Ethernet
                </SelectItem>
                <SelectItem value="FIBER">
                  Fiber Optic
                </SelectItem>
                <SelectItem value="WIRELESS">
                  Wireless
                </SelectItem>
                <SelectItem value="VPN">
                  VPN Tunnel
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div class="space-y-1.5">
            <Label for="edit-link-status">Link Status</Label>
            <Select v-model="editData.linkStatus">
              <SelectTrigger id="edit-link-status" class="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ACTIVE">
                  Active
                </SelectItem>
                <SelectItem value="INACTIVE">
                  Inactive
                </SelectItem>
                <SelectItem value="PLANNED">
                  Planned
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div class="space-y-1.5">
              <Label for="edit-source-interface">Source Interface</Label>
              <Input id="edit-source-interface" v-model="editData.sourceInterface" placeholder="e.g., ether1" />
            </div>
            <div class="space-y-1.5">
              <Label for="edit-target-interface">Target Interface</Label>
              <Input id="edit-target-interface" v-model="editData.targetInterface" placeholder="e.g., ether2" />
            </div>
          </div>

          <div class="space-y-1.5">
            <Label for="edit-bandwidth">Bandwidth</Label>
            <Input
              id="edit-bandwidth"
              v-model="editData.bandwidth"
              list="bandwidth-presets-edit"
              placeholder="e.g., 1Gbps"
            />
            <datalist id="bandwidth-presets-edit">
              <option v-for="preset in bandwidthPresets" :key="preset" :value="preset" />
            </datalist>
          </div>

          <template v-if="isSwitchEdge">
            <div class="grid grid-cols-2 gap-3">
              <div class="space-y-1.5">
                <Label for="edit-source-port">Source Port Number</Label>
                <Input id="edit-source-port" v-model.number="editData.sourcePortNumber" type="number" min="1" placeholder="e.g., 1" />
              </div>
              <div class="space-y-1.5">
                <Label for="edit-target-port">Target Port Number</Label>
                <Input id="edit-target-port" v-model.number="editData.targetPortNumber" type="number" min="1" placeholder="e.g., 24" />
              </div>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div class="space-y-1.5">
                <Label for="edit-vlan">VLAN</Label>
                <Input id="edit-vlan" v-model.number="editData.vlan" type="number" min="1" placeholder="e.g., 10" />
              </div>
              <div class="space-y-1.5">
                <Label for="edit-speed">Speed</Label>
                <Input id="edit-speed" v-model="editData.speed" placeholder="e.g., 1Gbps" />
              </div>
            </div>
          </template>

          <div class="space-y-1.5">
            <Label for="edit-distance">Distance (meters)</Label>
            <Input id="edit-distance" v-model.number="editData.distance" type="number" min="0" step="0.01" placeholder="e.g., 500" />
          </div>

          <div class="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" :disabled="isSubmittingEdit" @click="handleCancelEdit">
              Cancel
            </Button>
            <Button type="submit" :disabled="isSubmittingEdit">
              <Icon v-if="isSubmittingEdit" name="lucide:loader-circle" class="size-4 animate-spin" aria-hidden="true" />
              {{ isSubmittingEdit ? 'Saving...' : 'Save Changes' }}
            </Button>
          </div>
        </form>

        <!-- ============ CREATE CONNECTION MODE ============ -->
        <form v-else-if="mode === 'connection'" class="space-y-4" @submit.prevent="submitConnection">
          <div class="rounded-lg border border-border/60 bg-background/50 p-3">
            <p class="text-sm font-medium">
              Connecting:
            </p>
            <p class="text-sm text-muted-foreground">
              {{ sourceName || '—' }} → {{ targetName || '—' }}
            </p>
          </div>

          <div
            v-if="error"
            class="rounded-lg bg-destructive/10 p-3 text-sm text-destructive"
            role="alert"
          >
            {{ error }}
          </div>

          <div class="space-y-1.5">
            <Label for="new-link-type">Link Type <span class="text-destructive">*</span></Label>
            <Select v-model="newConnection.linkType">
              <SelectTrigger id="new-link-type" class="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ETHERNET">
                  Ethernet
                </SelectItem>
                <SelectItem value="FIBER">
                  Fiber Optic
                </SelectItem>
                <SelectItem value="WIRELESS">
                  Wireless
                </SelectItem>
                <SelectItem value="VPN">
                  VPN Tunnel
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div class="space-y-1.5">
            <Label for="new-link-status">Link Status <span class="text-destructive">*</span></Label>
            <Select v-model="newConnection.linkStatus">
              <SelectTrigger id="new-link-status" class="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PLANNED">
                  Planned
                </SelectItem>
                <SelectItem value="ACTIVE">
                  Active
                </SelectItem>
                <SelectItem value="INACTIVE">
                  Inactive
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div class="space-y-1.5">
              <Label for="new-source-interface">Source Interface</Label>
              <Input id="new-source-interface" v-model="newConnection.sourceInterface" placeholder="e.g., ether1" />
            </div>
            <div class="space-y-1.5">
              <Label for="new-target-interface">Target Interface</Label>
              <Input id="new-target-interface" v-model="newConnection.targetInterface" placeholder="e.g., ether2" />
            </div>
          </div>

          <template v-if="involvesSwitch">
            <div class="grid grid-cols-2 gap-3">
              <div class="space-y-1.5">
                <Label for="new-source-port">Source Port Number</Label>
                <Input id="new-source-port" v-model.number="newConnection.sourcePortNumber" type="number" min="1" placeholder="e.g., 1" />
              </div>
              <div class="space-y-1.5">
                <Label for="new-target-port">Target Port Number</Label>
                <Input id="new-target-port" v-model.number="newConnection.targetPortNumber" type="number" min="1" placeholder="e.g., 24" />
              </div>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div class="space-y-1.5">
                <Label for="new-vlan">VLAN</Label>
                <Input id="new-vlan" v-model.number="newConnection.vlan" type="number" min="1" placeholder="e.g., 10" />
              </div>
              <div class="space-y-1.5">
                <Label for="new-speed">Speed</Label>
                <Input id="new-speed" v-model="newConnection.speed" placeholder="e.g., 1Gbps" />
              </div>
            </div>
          </template>

          <div class="space-y-1.5">
            <Label for="new-bandwidth">Bandwidth</Label>
            <Input
              id="new-bandwidth"
              v-model="newConnection.bandwidth"
              list="bandwidth-presets-new"
              placeholder="e.g., 1Gbps"
            />
            <datalist id="bandwidth-presets-new">
              <option v-for="preset in bandwidthPresets" :key="preset" :value="preset" />
            </datalist>
            <p class="text-xs text-muted-foreground">
              Common values: 10Mbps, 100Mbps, 1Gbps, 10Gbps
            </p>
          </div>

          <div class="space-y-1.5">
            <Label for="new-distance">Distance (meters)</Label>
            <Input id="new-distance" v-model.number="newConnection.distance" type="number" min="0" step="0.01" placeholder="e.g., 500" />
            <p class="text-xs text-muted-foreground">
              Especially useful for wireless links
            </p>
          </div>

          <div class="space-y-1.5">
            <Label for="new-notes">Notes</Label>
            <Textarea id="new-notes" v-model="newConnection.notes" rows="3" placeholder="Additional information about this connection..." class="resize-none" />
          </div>

          <div class="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" :disabled="isSubmitting" @click="emit('close')">
              Cancel
            </Button>
            <Button type="submit" :disabled="isSubmitting">
              <Icon v-if="isSubmitting" name="lucide:loader-circle" class="size-4 animate-spin" aria-hidden="true" />
              {{ isSubmitting ? 'Creating...' : 'Create Connection' }}
            </Button>
          </div>
        </form>
      </div>

      <!-- Footer actions (node view / edge view only) -->
      <SheetFooter
        v-if="mode === 'node' && node && !isEditing"
        class="flex-row items-center justify-between gap-2 border-t border-border/60 px-4 py-3"
      >
        <div class="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            :disabled="isRemoving"
            @click="emit('createConnection')"
          >
            <Icon name="lucide:zap" class="size-4" aria-hidden="true" />
            Create Connection
          </Button>
        </div>
        <div class="flex items-center gap-2">
          <Button
            variant="destructive"
            size="sm"
            :disabled="isRemoving"
            @click="emit('removeNode')"
          >
            <Icon
              :name="isRemoving ? 'lucide:loader-circle' : 'lucide:trash-2'"
              class="size-4"
              :class="{ 'animate-spin': isRemoving }"
              aria-hidden="true"
            />
            Remove
          </Button>
        </div>
      </SheetFooter>

      <SheetFooter
        v-else-if="mode === 'edge' && edge && !isEditing"
        class="flex-row items-center justify-between gap-2 border-t border-border/60 px-4 py-3"
      >
        <Button variant="destructive" size="sm" @click="emit('edgeDelete', edge.id)">
          <Icon name="lucide:trash-2" class="size-4" aria-hidden="true" />
          Delete
        </Button>
        <div class="flex items-center gap-2">
          <Button variant="outline" size="sm" @click="handleStartEdit">
            <Icon name="lucide:pencil" class="size-4" aria-hidden="true" />
            Edit
          </Button>
          <Button size="sm" @click="emit('close')">
            Close
          </Button>
        </div>
      </SheetFooter>
    </SheetContent>
  </Sheet>
</template>
