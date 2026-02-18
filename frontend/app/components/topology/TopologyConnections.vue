<script setup lang="ts">
import type { TopologyEdge } from '~/stores/router/router.topology'
import { ref, watch } from 'vue'
import { toast } from 'vue-sonner'
import { useTopologyStore } from '~/stores/router/router.topology'

// Props
interface Props {
  isOpen: boolean
  edge: TopologyEdge | null
}

const props = defineProps<Props>()

// Emit
const emit = defineEmits<{
  close: []
  delete: [edgeId: string]
  updated: []
}>()

// Store
const topologyStore = useTopologyStore()

// State
const isEditing = ref(false)
const isSubmitting = ref(false)
const editError = ref<string | null>(null)

// Edit form data
const editData = ref<{
  linkType: 'ETHERNET' | 'FIBER' | 'WIRELESS' | 'VPN'
  linkStatus: 'ACTIVE' | 'INACTIVE' | 'PLANNED'
  sourceInterface: string
  targetInterface: string
  bandwidth: string
  distance: number | undefined
}>({
  linkType: 'ETHERNET',
  linkStatus: 'PLANNED',
  sourceInterface: '',
  targetInterface: '',
  bandwidth: '',
  distance: undefined,
})

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

// Initialize edit data when edge changes
watch(() => props.edge, (newEdge) => {
  if (newEdge) {
    editData.value = {
      linkType: newEdge.linkType,
      linkStatus: newEdge.linkStatus,
      sourceInterface: newEdge.sourceInterface || '',
      targetInterface: newEdge.targetInterface || '',
      bandwidth: newEdge.bandwidth || '',
      distance: newEdge.distance,
    }
  }
}, { immediate: true })

// Reset state when dialog closes
watch(() => props.isOpen, (isOpen) => {
  if (!isOpen) {
    isEditing.value = false
    editError.value = null
  }
})

// Handle delete edge
function handleDeleteEdge() {
  if (props.edge) {
    emit('delete', props.edge.id)
  }
}

// Handle close
function handleClose() {
  emit('close')
}

// Handle start edit
function handleStartEdit() {
  isEditing.value = true
  editError.value = null
}

// Handle cancel edit
function handleCancelEdit() {
  isEditing.value = false
  editError.value = null
  // Reset form data
  if (props.edge) {
    editData.value = {
      linkType: props.edge.linkType,
      linkStatus: props.edge.linkStatus,
      sourceInterface: props.edge.sourceInterface || '',
      targetInterface: props.edge.targetInterface || '',
      bandwidth: props.edge.bandwidth || '',
      distance: props.edge.distance,
    }
  }
}

// Handle save edit
async function handleSaveEdit() {
  if (!props.edge)
    return

  isSubmitting.value = true
  editError.value = null

  try {
    const result = await topologyStore.updateConnection(props.edge.id, {
      linkType: editData.value.linkType,
      linkStatus: editData.value.linkStatus,
      sourceInterface: editData.value.sourceInterface || undefined,
      targetInterface: editData.value.targetInterface || undefined,
      bandwidth: editData.value.bandwidth || undefined,
      distance: editData.value.distance,
    })

    if (result.success) {
      toast.success('Connection updated successfully')
      isEditing.value = false
      emit('updated')
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
    isSubmitting.value = false
  }
}
</script>

<template>
  <!-- Edge Detail Dialog -->
  <div
    v-if="isOpen && edge"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
    @click.self="handleClose"
  >
    <div class="bg-card rounded-lg shadow-lg max-w-md w-full mx-4 p-6 max-h-[90vh] overflow-y-auto">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-semibold">
          Connection Details
        </h3>
        <button
          class="text-muted-foreground hover:text-foreground"
          @click="handleClose"
        >
          <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- View Mode -->
      <div v-if="!isEditing" class="space-y-3">
        <div class="grid grid-cols-2 gap-4">
          <div>
            <p class="text-sm text-muted-foreground">
              Type
            </p>
            <span
              class="inline-flex px-2 py-0.5 rounded text-xs font-medium"
              :class="{
                'bg-green-100 text-green-800': edge.linkType === 'ETHERNET',
                'bg-blue-100 text-blue-800': edge.linkType === 'FIBER',
                'bg-orange-100 text-orange-800': edge.linkType === 'WIRELESS',
                'bg-purple-100 text-purple-800': edge.linkType === 'VPN',
              }"
            >
              {{ edge.linkType }}
            </span>
          </div>
          <div>
            <p class="text-sm text-muted-foreground">
              Status
            </p>
            <span
              class="inline-flex px-2 py-0.5 rounded text-xs font-medium"
              :class="{
                'bg-green-100 text-green-800': edge.linkStatus === 'ACTIVE',
                'bg-red-100 text-red-800': edge.linkStatus === 'INACTIVE',
                'bg-gray-100 text-gray-800': edge.linkStatus === 'PLANNED',
              }"
            >
              {{ edge.linkStatus }}
            </span>
          </div>
        </div>

        <div v-if="edge.bandwidth">
          <p class="text-sm text-muted-foreground">
            Bandwidth
          </p>
          <p class="font-medium">
            {{ edge.bandwidth }}
          </p>
        </div>

        <div v-if="edge.distance">
          <p class="text-sm text-muted-foreground">
            Distance
          </p>
          <p class="font-medium">
            {{ edge.distance }}m
          </p>
        </div>

        <div v-if="edge.sourceInterface || edge.targetInterface" class="grid grid-cols-2 gap-4">
          <div v-if="edge.sourceInterface">
            <p class="text-sm text-muted-foreground">
              Source Interface
            </p>
            <p class="font-medium font-mono text-xs">
              {{ edge.sourceInterface }}
            </p>
          </div>
          <div v-if="edge.targetInterface">
            <p class="text-sm text-muted-foreground">
              Target Interface
            </p>
            <p class="font-medium font-mono text-xs">
              {{ edge.targetInterface }}
            </p>
          </div>
        </div>

        <div v-if="edge.isAutoDiscovered" class="flex items-center gap-2 text-sm text-blue-600">
          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11-9 11zM4 14v6" />
          </svg>
          Auto-discovered connection
        </div>
      </div>

      <!-- Edit Mode -->
      <form v-else class="space-y-4" @submit.prevent="handleSaveEdit">
        <!-- Error Message -->
        <div
          v-if="editError"
          class="p-3 bg-destructive/10 text-destructive rounded-lg text-sm"
        >
          {{ editError }}
        </div>

        <!-- Link Type -->
        <div>
          <label class="block text-sm font-medium mb-1.5">
            Link Type
          </label>
          <select
            v-model="editData.linkType"
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
            Link Status
          </label>
          <select
            v-model="editData.linkStatus"
            class="w-full px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="ACTIVE">
              Active
            </option>
            <option value="INACTIVE">
              Inactive
            </option>
            <option value="PLANNED">
              Planned
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
              v-model="editData.sourceInterface"
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
              v-model="editData.targetInterface"
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
          <input
            v-model="editData.bandwidth"
            type="text"
            list="bandwidth-presets"
            placeholder="e.g., 1Gbps"
            class="w-full px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          >
          <datalist id="bandwidth-presets">
            <option v-for="preset in bandwidthPresets" :key="preset" :value="preset" />
          </datalist>
        </div>

        <!-- Distance -->
        <div>
          <label class="block text-sm font-medium mb-1.5">
            Distance (meters)
          </label>
          <input
            v-model.number="editData.distance"
            type="number"
            min="0"
            step="0.01"
            placeholder="e.g., 500"
            class="w-full px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          >
        </div>

        <!-- Notes -->
        <!-- Edit Actions -->
        <div class="flex justify-end gap-3 pt-2">
          <button
            type="button"
            :disabled="isSubmitting"
            class="px-4 py-2 border border-input rounded-md hover:bg-accent hover:text-accent-foreground disabled:opacity-50"
            @click="handleCancelEdit"
          >
            Cancel
          </button>
          <button
            type="submit"
            :disabled="isSubmitting"
            class="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2"
          >
            <svg
              v-if="isSubmitting"
              class="h-4 w-4 animate-spin"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            {{ isSubmitting ? 'Saving...' : 'Save Changes' }}
          </button>
        </div>
      </form>

      <!-- View Actions -->
      <div v-if="!isEditing" class="mt-6 flex justify-between">
        <button
          class="px-4 py-2 bg-destructive text-destructive-foreground rounded-md hover:bg-destructive/90"
          @click="handleDeleteEdge"
        >
          Delete
        </button>
        <div class="flex gap-3">
          <button
            class="px-4 py-2 border border-input rounded-md hover:bg-accent hover:text-accent-foreground"
            @click="handleStartEdit"
          >
            <svg class="h-4 w-4 inline mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Edit
          </button>
          <button
            class="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
            @click="handleClose"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
