<script setup lang="ts">
import type { Router } from '~/stores/router'
import type { BackupStatus, RouterBackup } from '~/types/backup'
import {
  AlertCircle,
  Archive,
  CheckCircle2,
  Clock,
  Download,
  Eye,
  Pin,
  PinOff,
  RotateCcw,
  Trash2,
  XCircle,
} from 'lucide-vue-next'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

defineProps<{
  backups: RouterBackup[]
  isLoading: boolean
  routers: Router[]
}>()

const emit = defineEmits<{
  'view': [backup: RouterBackup]
  'download': [backup: RouterBackup]
  'restore': [backup: RouterBackup]
  'pinToggle': [backup: RouterBackup]
  'delete': [backup: RouterBackup]
  'status-filter': [status: BackupStatus | null]
  'pinned-filter': [isPinned: boolean | null]
  'router-filter': [routerId: string | undefined]
}>()

// Status badge config
const statusConfig = {
  COMPLETED: {
    icon: CheckCircle2,
    variant: 'default' as const,
    color: 'text-green-600',
    label: 'Completed',
  },
  PENDING: {
    icon: Clock,
    variant: 'secondary' as const,
    color: 'text-yellow-600',
    label: 'Pending',
  },
  FAILED: {
    icon: XCircle,
    variant: 'destructive' as const,
    color: 'text-red-600',
    label: 'Failed',
  },
  EXPIRED: {
    icon: AlertCircle,
    variant: 'outline' as const,
    color: 'text-gray-600',
    label: 'Expired',
  },
}

// Format date
function formatDate(dateString: string | null | undefined) {
  if (!dateString)
    return 'N/A'
  const date = new Date(dateString)
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

// Format file size
function formatFileSize(bytes: number) {
  if (bytes === 0)
    return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${(bytes / k ** i).toFixed(2)} ${sizes[i]}`
}

// Get trigger type badge
function getTriggerBadge(triggerType: string) {
  return triggerType === 'MANUAL' ? 'secondary' : 'outline'
}
</script>

<template>
  <Card>
    <CardHeader>
      <CardTitle>Backup History</CardTitle>
      <CardDescription>
        View and manage router configuration backups
      </CardDescription>
    </CardHeader>
    <CardContent>
      <div v-if="isLoading" class="flex items-center justify-center py-12">
        <div class="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
      </div>

      <div v-else-if="backups.length === 0" class="flex flex-col items-center justify-center gap-4 py-12">
        <Archive class="h-12 w-12 text-muted-foreground/30" />
        <p class="text-sm text-muted-foreground">
          No backups found
        </p>
      </div>

      <div v-else class="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Router</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Size</TableHead>
              <TableHead>Version</TableHead>
              <TableHead>Type</TableHead>
              <TableHead class="text-right">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow
              v-for="backup in backups"
              :key="backup.id"
              class="group"
            >
              <!-- Router -->
              <TableCell>
                <div class="flex items-start gap-2">
                  <Pin v-if="backup.isPinned" class="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  <div class="min-w-0">
                    <div class="font-medium truncate">
                      {{ backup.router?.name || 'Unknown' }}
                    </div>
                    <div class="text-sm text-muted-foreground truncate">
                      {{ backup.router?.ipAddress || 'N/A' }}
                    </div>
                  </div>
                </div>
              </TableCell>

              <!-- Status -->
              <TableCell>
                <Badge :variant="statusConfig[backup.backupStatus].variant">
                  <component
                    :is="statusConfig[backup.backupStatus].icon"
                    class="mr-1 h-3 w-3"
                  />
                  {{ statusConfig[backup.backupStatus].label }}
                </Badge>
              </TableCell>

              <!-- Created -->
              <TableCell>
                <div class="text-sm">
                  {{ formatDate(backup.createdAt) }}
                </div>
                <div v-if="backup.completedAt" class="text-xs text-muted-foreground">
                  Completed: {{ formatDate(backup.completedAt) }}
                </div>
              </TableCell>

              <!-- Size -->
              <TableCell>
                <div class="text-sm font-mono">
                  {{ formatFileSize(Number(backup.fileSize)) }}
                </div>
              </TableCell>

              <!-- Version -->
              <TableCell>
                <div class="text-sm">
                  {{ backup.routerVersion || 'N/A' }}
                </div>
              </TableCell>

              <!-- Type -->
              <TableCell>
                <Badge :variant="getTriggerBadge(backup.triggerType)">
                  {{ backup.triggerType }}
                </Badge>
              </TableCell>

              <!-- Actions -->
              <TableCell class="text-right">
                <div class="flex items-center justify-end gap-1">
                  <!-- View -->
                  <Button
                    variant="ghost"
                    size="icon"
                    title="View Details"
                    @click="emit('view', backup)"
                  >
                    <Eye class="h-4 w-4" />
                  </Button>

                  <!-- Download -->
                  <Button
                    variant="ghost"
                    size="icon"
                    :disabled="backup.backupStatus !== 'COMPLETED'"
                    title="Download Backup"
                    @click="emit('download', backup)"
                  >
                    <Download class="h-4 w-4" />
                  </Button>

                  <!-- Pin Toggle -->
                  <Button
                    variant="ghost"
                    size="icon"
                    :title="backup.isPinned ? 'Unpin Backup' : 'Pin Backup'"
                    @click="emit('pinToggle', backup)"
                  >
                    <component
                      :is="backup.isPinned ? PinOff : Pin"
                      class="h-4 w-4" :class="[backup.isPinned && 'text-primary']"
                    />
                  </Button>

                  <!-- More Actions -->
                  <DropdownMenu>
                    <DropdownMenuTrigger as-child>
                      <Button variant="ghost" size="icon">
                        <span class="sr-only">Open menu</span>
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="24"
                          height="24"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          stroke-width="2"
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          class="h-4 w-4"
                        >
                          <circle cx="12" cy="12" r="1" />
                          <circle cx="12" cy="5" r="1" />
                          <circle cx="12" cy="19" r="1" />
                        </svg>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        :disabled="backup.backupStatus !== 'COMPLETED'"
                        @click="emit('restore', backup)"
                      >
                        <RotateCcw class="mr-2 h-4 w-4" />
                        Restore
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        class="text-destructive"
                        :disabled="backup.isPinned"
                        @click="emit('delete', backup)"
                      >
                        <Trash2 class="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </CardContent>
  </Card>
</template>
