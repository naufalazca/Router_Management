<script setup lang="ts">
import type { Router } from '~/stores/router'
import { computed, onMounted, ref, watch } from 'vue'
import { toast } from 'vue-sonner'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { AlertCircle } from 'lucide-vue-next'
import RouterCreateModal from '~/components/router/RouterCreateModal.vue'
import RouterDeleteDialog from '~/components/router/RouterDeleteDialog.vue'
import RouterEditModal from '~/components/router/RouterEditModal.vue'
import RouterHeader from '~/components/router/RouterHeader.vue'
import RouterStats from '~/components/router/RouterStats.vue'
import RouterTable from '~/components/router/RouterTable.vue'
import RouterViewModal from '~/components/router/RouterViewModal.vue'
import { useRouterStore } from '~/stores/router'

const routerStore = useRouterStore()
const searchQuery = ref('')

// Watch for errors from store and show toast
watch(() => routerStore.error, (newError) => {
  if (newError) {
    toast.error(newError)
  }
})

// Modal states
const isCreateModalOpen = ref(false)
const isEditModalOpen = ref(false)
const isViewModalOpen = ref(false)
const isDeleteDialogOpen = ref(false)
const selectedRouter = ref<Router | null>(null)

// Load routers on mount
onMounted(async () => {
  await routerStore.fetchRouters()
})

// Filtered routers based on search
const filteredRouters = computed(() => {
  if (!searchQuery.value)
    return routerStore.routers

  const query = searchQuery.value.toLowerCase()
  return routerStore.routers.filter(router =>
    router.name.toLowerCase().includes(query)
    || router.ipAddress.toLowerCase().includes(query)
    || router.location?.toLowerCase().includes(query)
    || router.model?.toLowerCase().includes(query),
  )
})

// Open create modal
function openCreateModal() {
  isCreateModalOpen.value = true
}

// Open view modal
function openViewModal(router: Router) {
  selectedRouter.value = router
  isViewModalOpen.value = true
}

// Open edit modal
function openEditModal(router: Router) {
  selectedRouter.value = router
  isEditModalOpen.value = true
}

// Open delete dialog
function openDeleteDialog(router: Router) {
  selectedRouter.value = router
  isDeleteDialogOpen.value = true
}

// Handle successful create
function handleCreateSuccess() {
  isCreateModalOpen.value = false
  routerStore.fetchRouters()
  toast.success('Device created successfully')
}

// Handle successful edit
function handleEditSuccess() {
  isEditModalOpen.value = false
  routerStore.fetchRouters()
  toast.success('Device updated successfully')
}

// Handle successful delete
function handleDeleteSuccess() {
  isDeleteDialogOpen.value = false
  selectedRouter.value = null
  toast.success('Device deleted successfully')
}

// Stats
const stats = computed(() => ({
  total: routerStore.routerCount,
  active: routerStore.activeRouters.length,
  inactive: routerStore.inactiveRouters.length,
  maintenance: routerStore.maintenanceRouters.length,
}))
</script>

<template>
  <div class="w-full space-y-6">
    <!-- Error Alert -->
    <Alert
      v-if="routerStore.error"
      variant="destructive"
      class="relative"
    >
      <AlertCircle class="h-4 w-4" />
      <AlertTitle class="flex items-center justify-between">
        <span>Error Loading Data</span>
        <button
          type="button"
          class="text-sm underline opacity-80 hover:opacity-100"
          @click="routerStore.clearError"
        >
          Dismiss
        </button>
      </AlertTitle>
      <AlertDescription class="mt-2">
        {{ routerStore.error }}
        <div class="mt-3 flex gap-2">
          <button
            type="button"
            class="inline-flex items-center rounded-md bg-background px-3 py-1.5 text-sm font-medium hover:bg-background/80"
            @click="routerStore.fetchRouters()"
          >
            Retry
          </button>
        </div>
      </AlertDescription>
    </Alert>

    <!-- Header Section -->
    <RouterHeader
      :total-devices="stats.total"
      :active-devices="stats.active"
      :search-query="searchQuery"
      @update:search-query="searchQuery = $event"
      @open-create-dialog="openCreateModal"
    />

    <!-- Stats Cards -->
    <RouterStats
      :total="stats.total"
      :active="stats.active"
      :inactive="stats.inactive"
      :maintenance="stats.maintenance"
    />

    <!-- Devices Table -->
    <RouterTable
      :routers="filteredRouters"
      :is-loading="routerStore.isLoading"
      :search-query="searchQuery"
      @view="openViewModal"
      @edit="openEditModal"
      @delete="openDeleteDialog"
    />

    <!-- Modals -->
    <RouterCreateModal
      v-model:open="isCreateModalOpen"
      @success="handleCreateSuccess"
    />

    <RouterViewModal
      v-if="selectedRouter"
      v-model:open="isViewModalOpen"
      :router="selectedRouter"
    />

    <RouterEditModal
      v-if="selectedRouter"
      v-model:open="isEditModalOpen"
      :router="selectedRouter"
      @success="handleEditSuccess"
    />

    <RouterDeleteDialog
      v-if="selectedRouter"
      v-model:open="isDeleteDialogOpen"
      :router="selectedRouter"
      @success="handleDeleteSuccess"
    />
  </div>
</template>
