<script setup lang="ts">
import type { Router } from '~/stores/router'
import type { RouterBackup } from '~/types/backup'
import { AlertTriangle } from 'lucide-vue-next'
import { ref } from 'vue'
import { Button } from '~/components/ui/button'
import { Checkbox } from '~/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog'
import { Label } from '~/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select'
import { useBackupStore } from '~/stores/routeros/backup'

const props = defineProps<{
  open: boolean
  backup: RouterBackup
  routers: Router[]
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  'success': []
}>()

const backupStore = useBackupStore()

// Form state
const selectedRouterId = ref<string>(props.backup.routerId)
const createSafetyBackup = ref(true)
const isSubmitting = ref(false)

// Handle submit
async function handleSubmit() {
  if (!selectedRouterId.value) {
    return
  }

  isSubmitting.value = true

  try {
    await backupStore.restoreBackup(props.backup.id, {
      routerId: selectedRouterId.value,
      createSafetyBackup: createSafetyBackup.value,
    })

    emit('success')
  }
  catch (error) {
    console.error('Failed to restore backup:', error)
  }
  finally {
    isSubmitting.value = false
  }
}

// Handle dialog close
function handleOpenChange(value: boolean) {
  emit('update:open', value)
}
</script>

<template>
  <Dialog :open="open" @update:open="handleOpenChange">
    <DialogContent class="sm:max-w-[500px]">
      <DialogHeader>
        <DialogTitle>Restore Backup</DialogTitle>
        <DialogDescription>
          Restore this backup to a router. This will replace the current configuration.
        </DialogDescription>
      </DialogHeader>

      <div class="space-y-4 py-4">
        <!-- Warning Banner -->
        <div class="rounded-lg border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950 p-4">
          <div class="flex items-start gap-3">
            <AlertTriangle class="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <div class="space-y-1">
              <p class="text-sm font-semibold text-red-800 dark:text-red-200">
                Warning: This action will replace the current router configuration
              </p>
              <p class="text-sm text-red-700 dark:text-red-300">
                Make sure you have reviewed the backup contents before proceeding.
                The router may restart during the restore process.
              </p>
            </div>
          </div>
        </div>

        <!-- Backup Info -->
        <div class="rounded-lg border bg-muted/50 p-3 space-y-2">
          <div class="flex items-center justify-between text-sm">
            <span class="text-muted-foreground">From Router:</span>
            <span class="font-medium">{{ backup.router?.name }}</span>
          </div>
          <div class="flex items-center justify-between text-sm">
            <span class="text-muted-foreground">Created:</span>
            <span class="font-medium">
              {{ new Date(backup.createdAt).toLocaleString() }}
            </span>
          </div>
          <div class="flex items-center justify-between text-sm">
            <span class="text-muted-foreground">RouterOS Version:</span>
            <span class="font-medium">{{ backup.routerVersion || 'N/A' }}</span>
          </div>
        </div>

        <!-- Target Router Selection -->
        <div class="space-y-2">
          <Label for="target-router">Target Router *</Label>
          <Select v-model="selectedRouterId">
            <SelectTrigger id="target-router">
              <SelectValue placeholder="Select target router" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem
                v-for="router in routers"
                :key="router.id"
                :value="router.id"
                :disabled="router.status !== 'ACTIVE'"
              >
                <div class="flex items-center gap-2">
                  <span class="font-medium">{{ router.name }}</span>
                  <span class="text-sm text-muted-foreground">{{ router.ipAddress }}</span>
                  <span v-if="router.status !== 'ACTIVE'" class="text-xs text-red-600">
                    ({{ router.status }})
                  </span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
          <p class="text-xs text-muted-foreground">
            Only active routers can be selected for restore
          </p>
        </div>

        <!-- Safety Backup Option -->
        <div class="space-y-3">
          <div class="flex items-center space-x-2">
            <Checkbox
              id="safety-backup"
              v-model:checked="createSafetyBackup"
            />
            <Label
              for="safety-backup"
              class="text-sm font-normal cursor-pointer"
            >
              Create safety backup before restore (Recommended)
            </Label>
          </div>
          <p class="text-xs text-muted-foreground ml-6">
            A backup of the current configuration will be created automatically before restoring.
            This allows you to rollback if something goes wrong.
          </p>
        </div>
      </div>

      <DialogFooter>
        <Button
          variant="outline"
          :disabled="isSubmitting"
          @click="handleOpenChange(false)"
        >
          Cancel
        </Button>
        <Button
          variant="destructive"
          :disabled="!selectedRouterId || isSubmitting"
          @click="handleSubmit"
        >
          <span v-if="isSubmitting">Restoring...</span>
          <span v-else>Restore Configuration</span>
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
