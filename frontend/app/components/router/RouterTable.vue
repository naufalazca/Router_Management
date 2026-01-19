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
  <Card>
    <CardHeader>
      <CardTitle>Device Registry</CardTitle>
      <CardDescription>
        Manage your network infrastructure
      </CardDescription>
    </CardHeader>
    <CardContent>
      <div v-if="isLoading" class="flex items-center justify-center py-12">
        <div class="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary"></div>
      </div>

      <div v-else-if="routers.length === 0" class="flex flex-col items-center justify-center gap-4 py-12">
        <Server class="h-12 w-12 text-muted-foreground/30" />
        <p class="text-sm text-muted-foreground">
          {{ searchQuery ? 'No devices match your search' : 'No devices registered' }}
        </p>
      </div>

      <Table v-else>
        <TableHeader>
          <TableRow>
            <TableHead>Device</TableHead>
            <TableHead>Network</TableHead>
            <TableHead>Hardware</TableHead>
            <TableHead>Location</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Last Seen</TableHead>
            <TableHead class="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow
            v-for="router in routers"
            :key="router.id"
          >
            <TableCell class="font-medium">
              <div class="flex items-center gap-2">
                <div class="flex h-6 w-6 items-center justify-center rounded border bg-primary/10 border-primary/20">
                  <Wifi class="h-3 w-3 text-primary" />
                </div>
                <span>{{ router.name }}</span>
              </div>
            </TableCell>

            <TableCell>
              <div class="space-y-0.5">
                <p class="text-sm text-cyan-600 dark:text-cyan-400">{{ router.ipAddress }}</p>
                <p v-if="router.macAddress" class="text-xs text-muted-foreground">
                  {{ router.macAddress }}
                </p>
              </div>
            </TableCell>

            <TableCell>
              <p class="text-sm text-muted-foreground">
                {{ router.model || '—' }}
              </p>
            </TableCell>

            <TableCell>
              <div v-if="router.location" class="flex items-center gap-1.5">
                <MapPin class="h-3 w-3 text-muted-foreground" />
                <span class="text-sm">{{ router.location }}</span>
              </div>
              <span v-else class="text-muted-foreground">—</span>
            </TableCell>

            <TableCell>
              <Badge
                :class="statusConfig[router.status].bgColor"
                class="gap-1.5"
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
                <span class="text-sm text-muted-foreground">
                  {{ formatDate(router.lastSeen) }}
                </span>
              </div>
            </TableCell>

            <TableCell class="text-right">
              <div class="flex items-center justify-end gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  @click="emit('view', router)"
                  title="View Details"
                >
                  <Eye class="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  @click="emit('edit', router)"
                  title="Edit"
                >
                  <Pencil class="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  @click="emit('delete', router)"
                  title="Delete"
                  class="text-destructive hover:text-destructive"
                >
                  <Trash2 class="h-4 w-4" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </CardContent>
  </Card>
</template>
