<script setup lang="ts">
import { ref } from 'vue'
import { useBackupStore } from '~/stores/routeros/backup'
import type { RouterBackup } from '~/types/backup'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '~/components/ui/dialog'
import { Button } from '~/components/ui/button'
import { AlertTriangle, Pin } from 'lucide-vue-next'

const props = defineProps<{
  open: boolean
  backup: RouterBackup
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  'success': []
}>()

const backupStore = useBackupStore()
const isDeleting = ref(false)

// Handle delete
async function handleDelete() {
  isDeleting.value = true

  try {
    await backupStore.deleteBackup(props.backup.id)
    emit('success')
  } catch (error) {
    console.error('Failed to delete backup:', error)
  } finally {
    isDeleting.value = false
  }
}

// Handle dialog close
function handleOpenChange(value: boolean) {
  emit('update:open', value)
}

// Format date
function formatDate(dateString: string) {
  return new Date(dateString).toLocaleString()
}

// Format file size
function formatFileSize(bytes: number) {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`
}
</script>

<template>
  <Dialog :open="open" @update:open="handleOpenChange">
    <DialogContent class="sm:max-w-[500px]">
      <DialogHeader>
        <DialogTitle>Delete Backup</DialogTitle>
        <DialogDescription>
          This action cannot be undone. The backup file will be permanently deleted from storage.
        </DialogDescription>
      </DialogHeader>

      <div class="space-y-4 py-4">
        <!-- Pinned Warning -->
        <div
          v-if="backup.isPinned"
          class="rounded-lg border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950 p-4"
        >
          <div class="flex items-start gap-3">
            <Pin class="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <div class="space-y-1">
              <p class="text-sm font-semibold text-red-800 dark:text-red-200">
                This backup is pinned
              </p>
              <p class="text-sm text-red-700 dark:text-red-300">
                You must unpin this backup before you can delete it.
                Pinned backups are protected from deletion.
              </p>
            </div>
          </div>
        </div>

        <!-- Warning (if not pinned) -->
        <div
          v-else
          class="rounded-lg border border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950 p-4"
        >
          <div class="flex items-start gap-3">
            <AlertTriangle class="h-5 w-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
            <div class="space-y-1">
              <p class="text-sm font-semibold text-yellow-800 dark:text-yellow-200">
                Warning: This action is irreversible
              </p>
              <p class="text-sm text-yellow-700 dark:text-yellow-300">
                The backup file will be permanently deleted from both the database and storage.
                Make sure you have another copy if needed.
              </p>
            </div>
          </div>
        </div>

        <!-- Backup Details -->
        <div class="rounded-lg border bg-muted/50 p-3 space-y-2">
          <div class="flex items-center justify-between text-sm">
            <span class="text-muted-foreground">Router:</span>
            <span class="font-medium">{{ backup.router?.name || 'Unknown' }}</span>
          </div>
          <div class="flex items-center justify-between text-sm">
            <span class="text-muted-foreground">IP Address:</span>
            <span class="font-mono">{{ backup.router?.ipAddress || 'N/A' }}</span>
          </div>
          <div class="flex items-center justify-between text-sm">
            <span class="text-muted-foreground">Created:</span>
            <span class="font-medium">{{ formatDate(backup.createdAt) }}</span>
          </div>
          <div class="flex items-center justify-between text-sm">
            <span class="text-muted-foreground">File Size:</span>
            <span class="font-mono">{{ formatFileSize(Number(backup.fileSize)) }}</span>
          </div>
          <div class="flex items-center justify-between text-sm">
            <span class="text-muted-foreground">Status:</span>
            <span class="font-medium capitalize">{{ backup.backupStatus }}</span>
          </div>
        </div>

        <!-- Safety Backup Notice -->
        <div
          v-if="backup.isSafetyBackup"
          class="rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950 p-3"
        >
          <p class="text-sm text-blue-800 dark:text-blue-200">
            <strong>Note:</strong> This is a safety backup that was created before a restore operation.
          </p>
        </div>
      </div>

      <DialogFooter>
        <Button
          variant="outline"
          @click="handleOpenChange(false)"
          :disabled="isDeleting"
        >
          Cancel
        </Button>
        <Button
          variant="destructive"
          @click="handleDelete"
          :disabled="isDeleting || backup.isPinned"
        >
          <span v-if="isDeleting">Deleting...</span>
          <span v-else>Delete Backup</span>
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
