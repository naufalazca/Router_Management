<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useBackupStore } from '~/stores/routeros/backup'
import { useRouterStore } from '~/stores/router'
import { toast } from 'vue-sonner'
import { BackupStatus, type RouterBackup } from '~/types/backup'
import RouterosBackupGenerateModal from '~/components/routeros/backup/RouterosBackupGenerateModal.vue'
import RouterosBackupTable from '~/components/routeros/backup/RouterosBackupTable.vue'
import RouterosBackupHeader from '~/components/routeros/backup/RouterosBackupHeader.vue'
import RouterosBackupStats from '~/components/routeros/backup/RouterosBackupStats.vue'
import RouterosBackupViewModal from '~/components/routeros/backup/RouterosBackupViewModal.vue'
import RouterosBackupRestoreDialog from '~/components/routeros/backup/RouterosBackupRestoreDialog.vue'
import RouterosBackupDeleteDialog from '~/components/routeros/backup/RouterosBackupDeleteDialog.vue'

const backupStore = useBackupStore()
const routerStore = useRouterStore()
const searchQuery = ref('')

// Modal states
const isGenerateModalOpen = ref(false)
const isViewModalOpen = ref(false)
const isRestoreDialogOpen = ref(false)
const isDeleteDialogOpen = ref(false)
const selectedBackup = ref<RouterBackup | null>(null)

// Load data on mount
onMounted(async () => {
  await Promise.all([
    backupStore.fetchBackups({ limit: 50, offset: 0 }),
    routerStore.fetchRouters()
  ])
})

// Update search query in store
const handleSearchChange = (value: string) => {
  searchQuery.value = value
  backupStore.setFilters({ searchQuery: value })
}

// Filter by status
const handleStatusFilter = (status: BackupStatus | null) => {
  backupStore.setFilters({ status })
}

// Filter by pinned
const handlePinnedFilter = (isPinned: boolean | null) => {
  backupStore.setFilters({ isPinned })
}

// Filter by router
const handleRouterFilter = (routerId: string | undefined) => {
  backupStore.setFilters({ routerId })
}

// Open generate modal
function openGenerateModal() {
  isGenerateModalOpen.value = true
}

// Open view modal
function openViewModal(backup: RouterBackup) {
  selectedBackup.value = backup
  isViewModalOpen.value = true
}

// Open restore dialog
function openRestoreDialog(backup: RouterBackup) {
  selectedBackup.value = backup
  isRestoreDialogOpen.value = true
}

// Open delete dialog
function openDeleteDialog(backup: RouterBackup) {
  selectedBackup.value = backup
  isDeleteDialogOpen.value = true
}

// Handle download
async function handleDownload(backup: RouterBackup) {
  try {
    const filename = `${backup.router?.name || 'router'}-${new Date(backup.createdAt).toISOString().split('T')[0]}.rsc`
    await backupStore.downloadBackup(backup.id, filename)
    toast.success('Download started')
  } catch (error) {
    toast.error('Failed to download backup')
  }
}

// Handle pin toggle
async function handlePinToggle(backup: RouterBackup) {
  try {
    await backupStore.togglePin(backup.id)
    toast.success(backup.isPinned ? 'Backup unpinned' : 'Backup pinned')
  } catch (error) {
    toast.error('Failed to toggle pin')
  }
}

// Handle successful generate
function handleGenerateSuccess() {
  isGenerateModalOpen.value = false
  backupStore.fetchBackups({ limit: 50, offset: 0 })
  toast.success('Backup created successfully')
}

// Handle successful restore
function handleRestoreSuccess() {
  isRestoreDialogOpen.value = false
  selectedBackup.value = null
  toast.success('Backup restored successfully')
}

// Handle successful delete
function handleDeleteSuccess() {
  isDeleteDialogOpen.value = false
  selectedBackup.value = null
  toast.success('Backup deleted successfully')
}

// Refresh data
async function handleRefresh() {
  await backupStore.fetchBackups({ limit: 50, offset: 0 })
  toast.success('Backups refreshed')
}
</script>

<template>
  <div class="w-full space-y-6">
    <!-- Header Section -->
    <RouterosBackupHeader
      :search-query="searchQuery"
      @update:search-query="handleSearchChange"
      @open-generate-dialog="openGenerateModal"
      @refresh="handleRefresh"
    />

    <!-- Stats Cards -->
    <RouterosBackupStats
      :total="backupStore.stats.total"
      :completed="backupStore.stats.completed"
      :failed="backupStore.stats.failed"
      :pinned="backupStore.stats.pinned"
      :total-size-mb="backupStore.stats.totalSizeMB"
    />

    <!-- Backups Table -->
    <RouterosBackupTable
      :backups="backupStore.filteredBackups"
      :is-loading="backupStore.loading"
      :routers="routerStore.routers"
      @view="openViewModal"
      @download="handleDownload"
      @restore="openRestoreDialog"
      @pin-toggle="handlePinToggle"
      @delete="openDeleteDialog"
      @status-filter="handleStatusFilter"
      @pinned-filter="handlePinnedFilter"
      @router-filter="handleRouterFilter"
    />

    <!-- Modals & Dialogs -->
    <RouterosBackupGenerateModal
      v-model:open="isGenerateModalOpen"
      :routers="routerStore.routers"
      @success="handleGenerateSuccess"
    />

    <RouterosBackupViewModal
      v-if="selectedBackup"
      v-model:open="isViewModalOpen"
      :backup="selectedBackup"
    />

    <RouterosBackupRestoreDialog
      v-if="selectedBackup"
      v-model:open="isRestoreDialogOpen"
      :backup="selectedBackup"
      :routers="routerStore.routers"
      @success="handleRestoreSuccess"
    />

    <RouterosBackupDeleteDialog
      v-if="selectedBackup"
      v-model:open="isDeleteDialogOpen"
      :backup="selectedBackup"
      @success="handleDeleteSuccess"
    />
  </div>
</template>
