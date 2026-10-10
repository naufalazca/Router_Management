<script setup lang="ts">
import type { BackupStatus, RouterBackup } from '~/types/backup'
import { onMounted, ref } from 'vue'
import { toast } from 'vue-sonner'
import RouterosBackupDeleteDialog from '~/components/routeros/backup/RouterosBackupDeleteDialog.vue'
import RouterosBackupGenerateModal from '~/components/routeros/backup/RouterosBackupGenerateModal.vue'
import RouterosBackupHeader from '~/components/routeros/backup/RouterosBackupHeader.vue'
import RouterosBackupRestoreDialog from '~/components/routeros/backup/RouterosBackupRestoreDialog.vue'
import RouterosBackupStats from '~/components/routeros/backup/RouterosBackupStats.vue'
import RouterosBackupTable from '~/components/routeros/backup/RouterosBackupTable.vue'
import RouterosBackupViewModal from '~/components/routeros/backup/RouterosBackupViewModal.vue'
import { useRouterosDevices } from '~/composables/useRouterosDevices'
import { useBackupStore } from '~/stores/routeros/backup'

const backupStore = useBackupStore()
const { devices, fetchDevices } = useRouterosDevices()
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
    fetchDevices(),
  ])
})

// Update search query in store
function handleSearchChange(value: string) {
  searchQuery.value = value
  backupStore.setFilters({ searchQuery: value })
}

// Filter by status
function handleStatusFilter(status: BackupStatus | null) {
  backupStore.setFilters({ status })
}

// Filter by pinned
function handlePinnedFilter(isPinned: boolean | null) {
  backupStore.setFilters({ isPinned })
}

// Filter by device (router or switch)
function handleRouterFilter(deviceId: string | undefined) {
  backupStore.setFilters({ deviceId })
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
    const url = await backupStore.getDownloadUrl(backup.id)
    window.open(url, '_blank', 'noopener,noreferrer')
  }
  catch (error) {
    toast.error('Failed to download backup')
  }
}

// Handle pin toggle
async function handlePinToggle(backup: RouterBackup) {
  try {
    await backupStore.togglePin(backup.id)
    toast.success(backup.isPinned ? 'Backup unpinned' : 'Backup pinned')
  }
  catch (error) {
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
      :routers="devices"
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
      :devices="devices"
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
      :devices="devices"
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
