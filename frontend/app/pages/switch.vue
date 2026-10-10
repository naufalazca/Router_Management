<script setup lang="ts">
import type { Switch } from '~/stores/switch'
import { AlertCircle } from 'lucide-vue-next'
import { computed, onMounted, ref, watch } from 'vue'
import { toast } from 'vue-sonner'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import SwitchCreateModal from '~/components/switch/SwitchCreateModal.vue'
import SwitchDeleteDialog from '~/components/switch/SwitchDeleteDialog.vue'
import SwitchEditModal from '~/components/switch/SwitchEditModal.vue'
import SwitchHeader from '~/components/switch/SwitchHeader.vue'
import SwitchStats from '~/components/switch/SwitchStats.vue'
import SwitchTable from '~/components/switch/SwitchTable.vue'
import SwitchViewModal from '~/components/switch/SwitchViewModal.vue'
import { useSwitchStore } from '~/stores/switch'

const switchStore = useSwitchStore()
const searchQuery = ref('')

// Watch for errors from store and show toast
watch(() => switchStore.error, (newError) => {
  if (newError) {
    toast.error(newError)
  }
})

// Modal states
const isCreateModalOpen = ref(false)
const isEditModalOpen = ref(false)
const isViewModalOpen = ref(false)
const isDeleteDialogOpen = ref(false)
const selectedSwitch = ref<Switch | null>(null)

// Load switches on mount
onMounted(async () => {
  await switchStore.fetchSwitches()
})

// Filtered switches based on search
const filteredSwitches = computed(() => {
  if (!searchQuery.value)
    return switchStore.switches

  const query = searchQuery.value.toLowerCase()
  return switchStore.switches.filter(sw =>
    sw.name.toLowerCase().includes(query)
    || sw.ipAddress.toLowerCase().includes(query)
    || sw.location?.toLowerCase().includes(query)
    || sw.model?.toLowerCase().includes(query)
    || sw.company?.name.toLowerCase().includes(query),
  )
})

// Open create modal
function openCreateModal() {
  isCreateModalOpen.value = true
}

// Open view modal
function openViewModal(sw: Switch) {
  selectedSwitch.value = sw
  isViewModalOpen.value = true
}

// Open edit modal
function openEditModal(sw: Switch) {
  selectedSwitch.value = sw
  isEditModalOpen.value = true
}

// Open delete dialog
function openDeleteDialog(sw: Switch) {
  selectedSwitch.value = sw
  isDeleteDialogOpen.value = true
}

// Handle successful create
function handleCreateSuccess() {
  isCreateModalOpen.value = false
  switchStore.fetchSwitches()
  toast.success('Switch created successfully')
}

// Handle successful edit
function handleEditSuccess() {
  isEditModalOpen.value = false
  switchStore.fetchSwitches()
  toast.success('Switch updated successfully')
}

// Handle successful delete
function handleDeleteSuccess() {
  isDeleteDialogOpen.value = false
  selectedSwitch.value = null
  toast.success('Switch deleted successfully')
}

// Stats
const stats = computed(() => ({
  total: switchStore.switchCount,
  active: switchStore.activeSwitches.length,
  inactive: switchStore.inactiveSwitches.length,
  maintenance: switchStore.maintenanceSwitches.length,
}))
</script>

<template>
  <div class="w-full space-y-6">
    <!-- Error Alert -->
    <Alert
      v-if="switchStore.error"
      variant="destructive"
      class="relative"
    >
      <AlertCircle class="h-4 w-4" />
      <AlertTitle class="flex items-center justify-between">
        <span>Error Loading Data</span>
        <button
          type="button"
          class="text-sm underline opacity-80 hover:opacity-100"
          @click="switchStore.clearError"
        >
          Dismiss
        </button>
      </AlertTitle>
      <AlertDescription class="mt-2">
        {{ switchStore.error }}
        <div class="mt-3 flex gap-2">
          <button
            type="button"
            class="inline-flex items-center rounded-md bg-background px-3 py-1.5 text-sm font-medium hover:bg-background/80"
            @click="switchStore.fetchSwitches()"
          >
            Retry
          </button>
        </div>
      </AlertDescription>
    </Alert>

    <!-- Header Section -->
    <SwitchHeader
      :total-devices="stats.total"
      :active-devices="stats.active"
      :search-query="searchQuery"
      @update:search-query="searchQuery = $event"
      @open-create-dialog="openCreateModal"
    />

    <!-- Stats Cards -->
    <SwitchStats
      :total="stats.total"
      :active="stats.active"
      :inactive="stats.inactive"
      :maintenance="stats.maintenance"
    />

    <!-- Switches Table -->
    <SwitchTable
      :switches="filteredSwitches"
      :is-loading="switchStore.isLoading"
      :search-query="searchQuery"
      @view="openViewModal"
      @edit="openEditModal"
      @delete="openDeleteDialog"
    />

    <!-- Modals -->
    <SwitchCreateModal
      v-model:open="isCreateModalOpen"
      @success="handleCreateSuccess"
    />

    <SwitchViewModal
      v-if="selectedSwitch"
      v-model:open="isViewModalOpen"
      :switch="selectedSwitch"
    />

    <SwitchEditModal
      v-if="selectedSwitch"
      v-model:open="isEditModalOpen"
      :switch="selectedSwitch"
      @success="handleEditSuccess"
    />

    <SwitchDeleteDialog
      v-if="selectedSwitch"
      v-model:open="isDeleteDialogOpen"
      :switch="selectedSwitch"
      @success="handleDeleteSuccess"
    />
  </div>
</template>
