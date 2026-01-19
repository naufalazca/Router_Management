<script setup lang="ts">
import type { RouterBackup } from '~/types/backup'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from '~/components/ui/dialog'
import { Badge } from '~/components/ui/badge'
import { Separator } from '~/components/ui/separator'
import { CheckCircle2, XCircle, Clock, Pin, AlertCircle } from 'lucide-vue-next'

const props = defineProps<{
  open: boolean
  backup: RouterBackup
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
}>()

// Status config
const statusConfig = {
  COMPLETED: { icon: CheckCircle2, color: 'text-green-600', label: 'Completed' },
  PENDING: { icon: Clock, color: 'text-yellow-600', label: 'Pending' },
  FAILED: { icon: XCircle, color: 'text-red-600', label: 'Failed' },
  EXPIRED: { icon: AlertCircle, color: 'text-gray-600', label: 'Expired' }
}

// Format date
function formatDate(dateString: string | null | undefined) {
  if (!dateString) return 'N/A'
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  }).format(new Date(dateString))
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
  <Dialog :open="open" @update:open="emit('update:open', $event)">
    <DialogContent class="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle class="flex items-center gap-2">
          Backup Details
          <Pin v-if="backup.isPinned" class="h-4 w-4 text-primary" />
        </DialogTitle>
      </DialogHeader>

      <div class="space-y-4">
        <!-- Status -->
        <div class="flex items-center justify-between">
          <span class="text-sm font-medium">Status</span>
          <Badge :variant="backup.backupStatus === 'COMPLETED' ? 'default' : 'destructive'">
            <component
              :is="statusConfig[backup.backupStatus].icon"
              class="mr-1 h-3 w-3"
            />
            {{ statusConfig[backup.backupStatus].label }}
          </Badge>
        </div>

        <Separator />

        <!-- Router Info -->
        <div class="space-y-2">
          <h4 class="font-semibold">Router Information</h4>
          <div class="grid grid-cols-2 gap-2 text-sm">
            <div class="text-muted-foreground">Name:</div>
            <div class="font-medium">{{ backup.router?.name || 'N/A' }}</div>

            <div class="text-muted-foreground">IP Address:</div>
            <div class="font-mono">{{ backup.router?.ipAddress || 'N/A' }}</div>

            <div class="text-muted-foreground">Company:</div>
            <div>{{ backup.router?.company?.name || 'N/A' }}</div>
          </div>
        </div>

        <Separator />

        <!-- Backup Info -->
        <div class="space-y-2">
          <h4 class="font-semibold">Backup Information</h4>
          <div class="grid grid-cols-2 gap-2 text-sm">
            <div class="text-muted-foreground">Backup ID:</div>
            <div class="font-mono text-xs">{{ backup.id }}</div>

            <div class="text-muted-foreground">Type:</div>
            <div>{{ backup.backupType }}</div>

            <div class="text-muted-foreground">Trigger:</div>
            <div>{{ backup.triggerType }}</div>

            <div class="text-muted-foreground">File Size:</div>
            <div class="font-mono">{{ formatFileSize(Number(backup.fileSize)) }}</div>

            <div class="text-muted-foreground">RouterOS Version:</div>
            <div>{{ backup.routerVersion || 'N/A' }}</div>

            <div class="text-muted-foreground">Checksum:</div>
            <div class="font-mono text-xs truncate" :title="backup.checksum">
              {{ backup.checksum.substring(0, 16) }}...
            </div>
          </div>
        </div>

        <Separator />

        <!-- Timestamps -->
        <div class="space-y-2">
          <h4 class="font-semibold">Timestamps</h4>
          <div class="grid grid-cols-2 gap-2 text-sm">
            <div class="text-muted-foreground">Created:</div>
            <div>{{ formatDate(backup.createdAt) }}</div>

            <div v-if="backup.completedAt" class="text-muted-foreground">Completed:</div>
            <div v-if="backup.completedAt">{{ formatDate(backup.completedAt) }}</div>

            <div v-if="backup.expiresAt" class="text-muted-foreground">Expires:</div>
            <div v-if="backup.expiresAt">{{ formatDate(backup.expiresAt) }}</div>
          </div>
        </div>

        <!-- Pin Info -->
        <div v-if="backup.isPinned" class="space-y-2">
          <Separator />
          <h4 class="font-semibold flex items-center gap-2">
            <Pin class="h-4 w-4 text-primary" />
            Pin Information
          </h4>
          <div class="grid grid-cols-2 gap-2 text-sm">
            <div class="text-muted-foreground">Pinned At:</div>
            <div>{{ formatDate(backup.pinnedAt) }}</div>

            <div v-if="backup.pinnedReason" class="text-muted-foreground">Reason:</div>
            <div v-if="backup.pinnedReason" class="col-span-2">
              {{ backup.pinnedReason }}
            </div>
          </div>
        </div>

        <!-- Config Summary -->
        <div v-if="backup.configSummary" class="space-y-2">
          <Separator />
          <h4 class="font-semibold">Configuration Summary</h4>
          <div class="grid grid-cols-2 gap-2 text-sm">
            <div v-for="(value, key) in backup.configSummary" :key="key">
              <div class="text-muted-foreground capitalize">{{ key.replace(/([A-Z])/g, ' $1') }}:</div>
              <div class="font-medium">{{ value }}</div>
            </div>
          </div>
        </div>

        <!-- Safety Backup Badge -->
        <div v-if="backup.isSafetyBackup" class="rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950 p-3">
          <p class="text-sm text-blue-800 dark:text-blue-200">
            <strong>Safety Backup:</strong> This backup was automatically created before a restore operation.
          </p>
        </div>
      </div>
    </DialogContent>
  </Dialog>
</template>
