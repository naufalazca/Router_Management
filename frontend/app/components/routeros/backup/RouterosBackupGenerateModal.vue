<script setup lang="ts">
import { ref, computed } from 'vue'
import { useBackupStore } from '~/stores/routeros/backup'
import { BackupType } from '~/types/backup'
import type { Router } from '~/stores/router'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '~/components/ui/dialog'
import { Button } from '~/components/ui/button'
import { Label } from '~/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '~/components/ui/select'
import { Checkbox } from '~/components/ui/checkbox'

const props = defineProps<{
  open: boolean
  routers: Router[]
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  'success': []
}>()

const backupStore = useBackupStore()

// Form state
const selectedRouterId = ref<string>('')
const compact = ref(false)
const backupType = ref<BackupType>(BackupType.EXPORT)
const isSubmitting = ref(false)

// Active routers only
const activeRouters = computed(() => {
  return props.routers.filter(r => r.status === 'ACTIVE')
})

// Selected router info
const selectedRouter = computed(() => {
  return activeRouters.value.find(r => r.id === selectedRouterId.value)
})

// Handle submit
async function handleSubmit() {
  if (!selectedRouterId.value) {
    return
  }

  isSubmitting.value = true

  try {
    await backupStore.triggerBackup({
      routerId: selectedRouterId.value,
      compact: compact.value,
      backupType: backupType.value
    })

    emit('success')
    resetForm()
  } catch (error) {
    console.error('Failed to create backup:', error)
  } finally {
    isSubmitting.value = false
  }
}

// Reset form
function resetForm() {
  selectedRouterId.value = ''
  compact.value = false
  backupType.value = BackupType.EXPORT
}

// Handle dialog close
function handleOpenChange(value: boolean) {
  emit('update:open', value)
  if (!value) {
    resetForm()
  }
}
</script>

<template>
  <Dialog :open="open" @update:open="handleOpenChange">
    <DialogContent class="sm:max-w-[500px]">
      <DialogHeader>
        <DialogTitle>Generate Backup</DialogTitle>
        <DialogDescription>
          Create a new backup for a router. The configuration will be exported and stored securely.
        </DialogDescription>
      </DialogHeader>

      <div class="space-y-4 py-4">
        <!-- Router Selection -->
        <div class="space-y-2">
          <Label for="router">Select Router *</Label>
          <Select v-model="selectedRouterId">
            <SelectTrigger id="router">
              <SelectValue placeholder="Choose a router" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem
                v-for="router in activeRouters"
                :key="router.id"
                :value="router.id"
              >
                <div class="flex items-center gap-2">
                  <span class="font-medium">{{ router.name }}</span>
                  <span class="text-sm text-muted-foreground">{{ router.ipAddress }}</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
          <p v-if="activeRouters.length === 0" class="text-sm text-muted-foreground">
            No active routers available
          </p>
        </div>

        <!-- Selected Router Info -->
        <div
          v-if="selectedRouter"
          class="rounded-lg border bg-muted/50 p-3 space-y-1"
        >
          <div class="flex items-center justify-between text-sm">
            <span class="text-muted-foreground">Model:</span>
            <span class="font-medium">{{ selectedRouter.model || 'N/A' }}</span>
          </div>
          <div class="flex items-center justify-between text-sm">
            <span class="text-muted-foreground">Location:</span>
            <span class="font-medium">{{ selectedRouter.location || 'N/A' }}</span>
          </div>
          <div class="flex items-center justify-between text-sm">
            <span class="text-muted-foreground">Status:</span>
            <span class="font-medium capitalize">{{ selectedRouter.status }}</span>
          </div>
        </div>

        <!-- Backup Type -->
        <div class="space-y-2">
          <Label for="backup-type">Backup Type</Label>
          <Select v-model="backupType">
            <SelectTrigger id="backup-type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem :value="BackupType.EXPORT">
                <div>
                  <div class="font-medium">Export (.rsc)</div>
                  <div class="text-sm text-muted-foreground">
                    Text-based configuration script
                  </div>
                </div>
              </SelectItem>
              <SelectItem :value="BackupType.BINARY" disabled>
                <div>
                  <div class="font-medium">Binary (.backup)</div>
                  <div class="text-sm text-muted-foreground">
                    Full system backup (coming soon)
                  </div>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <!-- Compact Option -->
        <div class="flex items-center space-x-2">
          <Checkbox
            id="compact"
            v-model:checked="compact"
          />
          <Label
            for="compact"
            class="text-sm font-normal cursor-pointer"
          >
            Compact format (no comments, smaller file size)
          </Label>
        </div>

        <!-- Warning -->
        <div class="rounded-lg border border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950 p-3">
          <p class="text-sm text-yellow-800 dark:text-yellow-200">
            <strong>Note:</strong> The backup process will export the router's configuration.
            Ensure the router is accessible and not under heavy load.
          </p>
        </div>
      </div>

      <DialogFooter>
        <Button
          variant="outline"
          @click="handleOpenChange(false)"
          :disabled="isSubmitting"
        >
          Cancel
        </Button>
        <Button
          @click="handleSubmit"
          :disabled="!selectedRouterId || isSubmitting || activeRouters.length === 0"
        >
          <span v-if="isSubmitting">Creating Backup...</span>
          <span v-else>Create Backup</span>
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
