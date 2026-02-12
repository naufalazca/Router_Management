<script setup lang="ts">
import type { Router } from '~/stores/router'
import {
  CheckCircle2,
  Clock,
  Eye,
  MapPin,
  Network,
  Pencil,
  Server,
  Trash2,
  Wifi,
  Wrench,
  XCircle,
} from 'lucide-vue-next'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
  testingRouterId: string | null
}>()

const emit = defineEmits<{
  view: [router: Router]
  edit: [router: Router]
  delete: [router: Router]
  test: [router: Router]
}>()

// Status badge config
const statusConfig = {
  ACTIVE: {
    icon: CheckCircle2,
    variant: 'default' as const,
    color: 'text-white dark:text-emerald-300',
    bgColor: 'bg-emerald-600 dark:bg-emerald-500/20 border-emerald-600 dark:border-emerald-500/30',
  },
  INACTIVE: {
    icon: XCircle,
    variant: 'secondary' as const,
    color: 'text-white dark:text-slate-300',
    bgColor: 'bg-slate-600 dark:bg-slate-500/20 border-slate-600 dark:border-slate-500/30',
  },
  MAINTENANCE: {
    icon: Wrench,
    variant: 'outline' as const,
    color: 'text-white dark:text-amber-300',
    bgColor: 'bg-amber-600 dark:bg-amber-500/20 border-amber-600 dark:border-amber-500/30',
  },
}

// Router Type badge config
const routerTypeConfig: Record<string, { label: string; color: string; bgColor: string }> = {
  UPSTREAM: { label: 'Upstream', color: 'text-white dark:text-violet-300', bgColor: 'bg-violet-600 dark:bg-violet-500/20 border-violet-600 dark:border-violet-500/30' },
  CORE: { label: 'Core', color: 'text-white dark:text-blue-300', bgColor: 'bg-blue-600 dark:bg-blue-500/20 border-blue-600 dark:border-blue-500/30' },
  DISTRIBUSI: { label: 'Distribusi', color: 'text-white dark:text-orange-300', bgColor: 'bg-orange-600 dark:bg-orange-500/20 border-orange-600 dark:border-orange-500/30' },
  WIRELESS: { label: 'Wireless', color: 'text-white dark:text-cyan-300', bgColor: 'bg-cyan-600 dark:bg-cyan-500/20 border-cyan-600 dark:border-cyan-500/30' },
}

// Router Brand badge config
const routerBrandConfig: Record<string, { label: string; color: string; bgColor: string }> = {
  MIKROTIK: { label: 'MikroTik', color: 'text-white dark:text-sky-300', bgColor: 'bg-sky-600 dark:bg-sky-500/20 border-sky-600 dark:border-sky-500/30' },
  UBIVIQUITI: { label: 'Ubiquiti', color: 'text-white dark:text-teal-300', bgColor: 'bg-teal-600 dark:bg-teal-500/20 border-teal-600 dark:border-teal-500/30' },
}

// Format date
function formatDate(dateString: string | null | undefined) {
  if (!dateString)
    return 'Never'
  const date = new Date(dateString)
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
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
        <div class="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
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
            <TableHead>Type / Brand</TableHead>
            <TableHead>Hardware</TableHead>
            <TableHead>Location</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Last Seen</TableHead>
            <TableHead class="text-right">
              Actions
            </TableHead>
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
                <p class="text-sm text-cyan-600 dark:text-cyan-400">
                  {{ router.ipAddress }}
                </p>
                <p v-if="router.macAddress" class="text-xs text-muted-foreground">
                  {{ router.macAddress }}
                </p>
              </div>
            </TableCell>

            <TableCell>
              <div class="flex flex-wrap gap-1">
                <Badge
                  v-if="routerTypeConfig[router.routerType]"
                  :class="[
                    routerTypeConfig[router.routerType].bgColor,
                    routerTypeConfig[router.routerType].color,
                    'border font-medium'
                  ]"
                  class="text-xs"
                >
                  {{ routerTypeConfig[router.routerType].label }}
                </Badge>
                <Badge
                  v-if="routerBrandConfig[router.routerBrand]"
                  :class="[
                    routerBrandConfig[router.routerBrand].bgColor,
                    routerBrandConfig[router.routerBrand].color,
                    'border font-medium'
                  ]"
                  class="text-xs"
                >
                  {{ routerBrandConfig[router.routerBrand].label }}
                </Badge>
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
                :class="[
                  statusConfig[router.status].bgColor,
                  statusConfig[router.status].color,
                  'border gap-1.5 font-medium'
                ]"
              >
                <component
                  :is="statusConfig[router.status].icon"
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
                  title="Test Connection"
                  :disabled="testingRouterId === router.id"
                  @click="emit('test', router)"
                >
                  <Network
                    :class="['h-4 w-4', testingRouterId === router.id && 'animate-pulse']"
                  />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  title="View Details"
                  @click="emit('view', router)"
                >
                  <Eye class="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  title="Edit"
                  @click="emit('edit', router)"
                >
                  <Pencil class="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  title="Delete"
                  class="text-destructive hover:text-destructive"
                  @click="emit('delete', router)"
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
