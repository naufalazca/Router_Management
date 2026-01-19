<script setup lang="ts">
import { type Router } from '~/stores/router'
import {
  Eye,
  Pencil,
  Trash2,
  Server,
  Wifi,
  MapPin,
  Clock,
  CheckCircle2,
  XCircle,
  Wrench
} from 'lucide-vue-next'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

defineProps<{
  routers: Router[]
  isLoading: boolean
  searchQuery: string
}>()

const emit = defineEmits<{
  'view': [router: Router]
  'edit': [router: Router]
  'delete': [router: Router]
}>()

// Status badge config
const statusConfig = {
  ACTIVE: {
    icon: CheckCircle2,
    variant: 'default' as const,
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10 border-emerald-500/20'
  },
  INACTIVE: {
    icon: XCircle,
    variant: 'secondary' as const,
    color: 'text-slate-400',
    bgColor: 'bg-slate-500/10 border-slate-500/20'
  },
  MAINTENANCE: {
    icon: Wrench,
    variant: 'outline' as const,
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10 border-amber-500/20'
  }
}

// Format date
function formatDate(dateString: string | null | undefined) {
  if (!dateString) return 'Never'
  const date = new Date(dateString)
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date)
}
</script>

<template>
  <Card class="devices-table-card">
    <CardHeader>
      <CardTitle class="font-mono text-lg">Device Registry</CardTitle>
      <CardDescription class="font-mono text-xs">
        Manage your network infrastructure
      </CardDescription>
    </CardHeader>
    <CardContent>
      <div v-if="isLoading" class="flex items-center justify-center py-12">
        <div class="loading-spinner"></div>
      </div>

      <div v-else-if="routers.length === 0" class="empty-state">
        <Server class="h-12 w-12 text-muted-foreground opacity-30" />
        <p class="text-muted-foreground font-mono">
          {{ searchQuery ? 'No devices match your search' : 'No devices registered' }}
        </p>
      </div>

      <Table v-else class="device-table">
        <TableHeader>
          <TableRow class="table-header-row">
            <TableHead class="font-mono text-xs">Device</TableHead>
            <TableHead class="font-mono text-xs">Network</TableHead>
            <TableHead class="font-mono text-xs">Hardware</TableHead>
            <TableHead class="font-mono text-xs">Location</TableHead>
            <TableHead class="font-mono text-xs">Status</TableHead>
            <TableHead class="font-mono text-xs">Last Seen</TableHead>
            <TableHead class="text-right font-mono text-xs">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow
            v-for="router in routers"
            :key="router.id"
            class="device-row"
          >
            <TableCell class="font-medium">
              <div class="flex items-center gap-2">
                <div class="device-icon">
                  <Wifi class="h-3 w-3" />
                </div>
                <span class="font-mono">{{ router.name }}</span>
              </div>
            </TableCell>

            <TableCell>
              <div class="space-y-0.5">
                <p class="font-mono text-xs text-cyan-400">{{ router.ipAddress }}</p>
                <p v-if="router.macAddress" class="font-mono text-xs text-muted-foreground">
                  {{ router.macAddress }}
                </p>
              </div>
            </TableCell>

            <TableCell>
              <p class="font-mono text-xs text-muted-foreground">
                {{ router.model || '—' }}
              </p>
            </TableCell>

            <TableCell>
              <div v-if="router.location" class="flex items-center gap-1.5">
                <MapPin class="h-3 w-3 text-muted-foreground" />
                <span class="font-mono text-xs">{{ router.location }}</span>
              </div>
              <span v-else class="text-muted-foreground">—</span>
            </TableCell>

            <TableCell>
              <Badge
                :class="statusConfig[router.status].bgColor"
                class="status-badge font-mono text-xs gap-1.5"
              >
                <component
                  :is="statusConfig[router.status].icon"
                  :class="statusConfig[router.status].color"
                  class="h-3 w-3"
                />
                {{ router.status }}
              </Badge>
            </TableCell>

            <TableCell>
              <div class="flex items-center gap-1.5">
                <Clock class="h-3 w-3 text-muted-foreground" />
                <span class="font-mono text-xs text-muted-foreground">
                  {{ formatDate(router.lastSeen) }}
                </span>
              </div>
            </TableCell>

            <TableCell class="text-right">
              <div class="flex items-center justify-end gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  @click="emit('view', router)"
                  class="action-btn h-8 w-8 p-0"
                  title="View Details"
                >
                  <Eye class="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  @click="emit('edit', router)"
                  class="action-btn h-8 w-8 p-0"
                  title="Edit"
                >
                  <Pencil class="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  @click="emit('delete', router)"
                  class="action-btn action-btn-danger h-8 w-8 p-0"
                  title="Delete"
                >
                  <Trash2 class="h-3.5 w-3.5" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </CardContent>
  </Card>
</template>

<style scoped>
/* Devices Table Card */
.devices-table-card {
  border: 1px solid hsl(var(--border) / 0.5);
  background: hsl(var(--card));
}

/* Table Styling */
.device-table {
  font-family: 'IBM Plex Mono', monospace;
}

.table-header-row {
  border-bottom: 2px solid hsl(var(--border) / 0.5);
  background: hsl(var(--muted) / 0.3);
}

.table-header-row th {
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-weight: 600;
  color: hsl(var(--muted-foreground));
}

.device-row {
  border-bottom: 1px solid hsl(var(--border) / 0.3);
  transition: background-color 0.15s;
}

.device-row:hover {
  background: hsl(var(--muted) / 0.3);
}

.device-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.5rem;
  height: 1.5rem;
  background: hsl(var(--primary) / 0.1);
  border: 1px solid hsl(var(--primary) / 0.2);
  border-radius: 0.25rem;
  color: hsl(var(--primary));
}

/* Status Badge */
.status-badge {
  border: 1px solid;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

/* Action Buttons */
.action-btn {
  opacity: 0.6;
  transition: all 0.2s;
}

.action-btn:hover {
  opacity: 1;
  background: hsl(var(--muted));
}

.action-btn-danger:hover {
  background: hsl(var(--destructive) / 0.1);
  color: hsl(var(--destructive));
}

/* Loading Spinner */
.loading-spinner {
  width: 2rem;
  height: 2rem;
  border: 3px solid hsl(var(--muted));
  border-top-color: hsl(var(--primary));
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Empty State */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  padding: 3rem 1rem;
}
</style>
