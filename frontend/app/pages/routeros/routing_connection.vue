<script setup lang="ts">
import type { BGPConnection } from '~/stores/routeros/routing'
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  Network,
  Power,
  PowerOff,
  RefreshCw,
  Search,
  Server,
  XCircle,
} from 'lucide-vue-next'
import { computed, onMounted, ref, watch } from 'vue'
import { toast } from 'vue-sonner'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useRouterStore } from '~/stores/router'
import { useRouterOSRoutingStore } from '~/stores/routeros/routing'

const routingStore = useRouterOSRoutingStore()
const routerStore = useRouterStore()
const searchQuery = ref('')
const selectedRouterId = ref<string>('')

// Modal states
const isViewModalOpen = ref(false)
const selectedConnection = ref<BGPConnection | null>(null)

// Load routers on mount
onMounted(async () => {
  await routerStore.fetchRouters()

  // Auto-select first router if available
  if (routerStore.routers.length > 0) {
    selectedRouterId.value = routerStore.routers[0]?.id || ''
  }
})

// Watch for router selection changes
watch(selectedRouterId, async (newRouterId) => {
  if (newRouterId) {
    await routingStore.fetchBGPConnections(newRouterId)
  }
  else {
    routingStore.clearBGPData()
  }
})

// Watch for errors from store and show toast
watch(() => routingStore.error, (newError) => {
  if (newError) {
    toast.error(newError)
  }
})

// Watch for router store errors
watch(() => routerStore.error, (newError) => {
  if (newError) {
    toast.error(`Router error: ${newError}`)
  }
})

// Get selected router info
const selectedRouter = computed(() => {
  return routerStore.routers.find(r => r.id === selectedRouterId.value)
})

// Filtered connections based on search
const filteredConnections = computed(() => {
  if (!searchQuery.value)
    return routingStore.connections

  const query = searchQuery.value.toLowerCase()
  return routingStore.connections.filter(conn =>
    conn.name?.toLowerCase().includes(query)
    || conn.remoteAddress?.toLowerCase().includes(query)
    || conn.remoteAs?.toLowerCase().includes(query)
    || conn.localAddress?.toLowerCase().includes(query)
    || conn.localAs?.toLowerCase().includes(query),
  )
})

// Get state badge variant
function getStateVariant(state: string | undefined) {
  if (!state)
    return 'secondary'

  const stateLower = state.toLowerCase()
  if (stateLower.includes('established') || stateLower.includes('active'))
    return 'default'
  if (stateLower.includes('idle') || stateLower.includes('connect'))
    return 'secondary'
  if (stateLower.includes('error') || stateLower.includes('down'))
    return 'destructive'

  return 'outline'
}

// Get state icon
function getStateIcon(state: string | undefined) {
  if (!state)
    return XCircle

  const stateLower = state.toLowerCase()
  if (stateLower.includes('established') || stateLower.includes('active'))
    return CheckCircle2
  if (stateLower.includes('idle') || stateLower.includes('connect'))
    return RefreshCw

  return XCircle
}

// Open view modal
function openViewModal(connection: BGPConnection) {
  selectedConnection.value = connection
  isViewModalOpen.value = true
}

// Handle enable/disable connection
async function handleToggleConnectionStatus(connection: BGPConnection) {
  if (!selectedRouterId.value)
    return

  const action = connection.disabled ? 'enable' : 'disable'
  const result = connection.disabled
    ? await routingStore.enableBGPConnection(selectedRouterId.value, connection.id)
    : await routingStore.disableBGPConnection(selectedRouterId.value, connection.id)

  if (result.success) {
    toast.success(result.message || `BGP Connection ${action}d successfully`)
  }
  else {
    toast.error(result.error || `Failed to ${action} BGP connection`)
  }
}

// Handle reset connection
async function handleResetConnection(connection: BGPConnection) {
  if (!selectedRouterId.value)
    return

  const result = await routingStore.resetBGPConnection(selectedRouterId.value, connection.id)

  if (result.success) {
    toast.success(result.message || 'BGP Connection reset successfully')
  }
  else {
    toast.error(result.error || 'Failed to reset BGP connection')
  }
}

// Refresh connections
async function refreshConnections() {
  if (selectedRouterId.value) {
    await routingStore.fetchBGPConnections(selectedRouterId.value)
    toast.success('BGP Connections refreshed')
  }
}

// Stats
const stats = computed(() => ({
  total: routingStore.connectionCount,
  active: routingStore.activeConnections.length,
  disabled: routingStore.disabledConnections.length,
  established: routingStore.establishedSessions.length,
}))
</script>

<template>
  <div class="w-full space-y-6">
    <!-- Error Alert for BGP Operations -->
    <Alert
      v-if="routingStore.error"
      variant="destructive"
      class="relative"
    >
      <AlertCircle class="h-4 w-4" />
      <AlertTitle class="flex items-center justify-between">
        <span>BGP Connection Error</span>
        <button
          type="button"
          class="text-sm underline opacity-80 hover:opacity-100"
          @click="routingStore.clearError"
        >
          Dismiss
        </button>
      </AlertTitle>
      <AlertDescription class="mt-2">
        {{ routingStore.error }}
        <div v-if="selectedRouterId" class="mt-3 flex gap-2">
          <button
            type="button"
            class="inline-flex items-center rounded-md bg-background px-3 py-1.5 text-sm font-medium hover:bg-background/80"
            @click="routingStore.fetchBGPConnections(selectedRouterId)"
          >
            Retry Connection
          </button>
        </div>
      </AlertDescription>
    </Alert>

    <!-- Error Alert for Router Selection -->
    <Alert
      v-if="routerStore.error && !routingStore.error"
      variant="destructive"
      class="relative"
    >
      <AlertCircle class="h-4 w-4" />
      <AlertTitle class="flex items-center justify-between">
        <span>Router List Error</span>
        <button
          type="button"
          class="text-sm underline opacity-80 hover:opacity-100"
          @click="routerStore.clearError"
        >
          Dismiss
        </button>
      </AlertTitle>
      <AlertDescription class="mt-2">
        {{ routerStore.error }}
        <div class="mt-3 flex gap-2">
          <button
            type="button"
            class="inline-flex items-center rounded-md bg-background px-3 py-1.5 text-sm font-medium hover:bg-background/80"
            @click="routerStore.fetchRouters()"
          >
            Retry
          </button>
        </div>
      </AlertDescription>
    </Alert>

    <!-- Header Section -->
    <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div class="space-y-1">
        <div class="flex items-center gap-3">
          <div class="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 border border-primary/20">
            <Network class="h-5 w-5 text-primary" />
          </div>
          <h1 class="text-3xl font-bold tracking-tight">
            BGP Connections
          </h1>
        </div>
        <p class="text-sm text-muted-foreground">
          {{ selectedRouter ? `Managing BGP connections on ${selectedRouter.name}` : 'Select a router to manage BGP connections' }}
        </p>
      </div>

      <div class="flex items-center gap-3">
        <div class="relative w-full sm:w-[280px]">
          <Search class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            v-model="searchQuery"
            placeholder="Search connections..."
            class="pl-9"
            :disabled="!selectedRouterId"
          />
        </div>
        <Button
          variant="outline"
          size="icon"
          :disabled="!selectedRouterId || routingStore.isLoading"
          title="Refresh"
          @click="refreshConnections"
        >
          <RefreshCw :class="['h-4 w-4', routingStore.isLoading && 'animate-spin']" />
        </Button>
      </div>
    </div>

    <!-- Router Selection -->
    <Card>
      <CardHeader>
        <CardTitle class="flex items-center gap-2">
          <Server class="h-5 w-5" />
          Router Selection
        </CardTitle>
        <CardDescription>
          Select a router to view and manage its BGP connections
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div class="flex items-center gap-4">
          <div class="flex-1">
            <Select v-model="selectedRouterId">
              <SelectTrigger>
                <SelectValue placeholder="Select a router..." />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem
                    v-for="router in routerStore.routers"
                    :key="router.id"
                    :value="router.id"
                  >
                    <div class="flex items-center gap-2">
                      <Server class="h-4 w-4" />
                      <span>{{ router.name }}</span>
                      <span class="text-xs text-muted-foreground">{{ router.ipAddress }}</span>
                    </div>
                  </SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          <div v-if="selectedRouter" class="flex items-center gap-2">
            <Badge
              :variant="selectedRouter.status === 'ACTIVE' ? 'default' : 'secondary'"
            >
              {{ selectedRouter.status }}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>

    <!-- Stats Cards -->
    <div v-if="selectedRouterId" class="grid gap-4 md:grid-cols-4">
      <Card>
        <CardContent class="pt-6">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-xs text-muted-foreground uppercase tracking-wider">
                Total Connections
              </p>
              <p class="text-3xl font-bold tabular-nums mt-1">
                {{ stats.total }}
              </p>
            </div>
            <Network class="h-8 w-8 text-muted-foreground/50" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent class="pt-6">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-xs text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                Active Connections
              </p>
              <p class="text-3xl font-bold tabular-nums mt-1 text-emerald-600 dark:text-emerald-400">
                {{ stats.active }}
              </p>
            </div>
            <CheckCircle2 class="h-8 w-8 text-emerald-600/50 dark:text-emerald-400/50" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent class="pt-6">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-xs text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                Established Sessions
              </p>
              <p class="text-3xl font-bold tabular-nums mt-1 text-blue-600 dark:text-blue-400">
                {{ stats.established }}
              </p>
            </div>
            <CheckCircle2 class="h-8 w-8 text-blue-600/50 dark:text-blue-400/50" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent class="pt-6">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-xs text-muted-foreground uppercase tracking-wider">
                Disabled Connections
              </p>
              <p class="text-3xl font-bold tabular-nums mt-1 text-muted-foreground">
                {{ stats.disabled }}
              </p>
            </div>
            <XCircle class="h-8 w-8 text-muted-foreground/50" />
          </div>
        </CardContent>
      </Card>
    </div>

    <!-- Connections Table -->
    <Card>
      <CardHeader>
        <CardTitle>BGP Connections</CardTitle>
        <CardDescription>
          Manage BGP peer connections and their status
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div v-if="!selectedRouterId" class="flex flex-col items-center justify-center gap-4 py-12">
          <Server class="h-12 w-12 text-muted-foreground/30" />
          <p class="text-sm text-muted-foreground">
            Please select a router to view its BGP connections
          </p>
        </div>

        <div v-else-if="routingStore.isLoading" class="flex items-center justify-center py-12">
          <div class="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
        </div>

        <div v-else-if="filteredConnections.length === 0" class="flex flex-col items-center justify-center gap-4 py-12">
          <Network class="h-12 w-12 text-muted-foreground/30" />
          <p class="text-sm text-muted-foreground">
            {{ searchQuery ? 'No connections match your search' : 'No BGP connections found on this router' }}
          </p>
        </div>

        <Table v-else>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Remote Address</TableHead>
              <TableHead>Remote AS</TableHead>
              <TableHead>Local Address</TableHead>
              <TableHead>Local AS</TableHead>
              <TableHead>State</TableHead>
              <TableHead>Uptime</TableHead>
              <TableHead>Status</TableHead>
              <TableHead class="text-right">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow
              v-for="conn in filteredConnections"
              :key="conn.id"
            >
              <TableCell class="font-medium">
                {{ conn.name || '-' }}
              </TableCell>

              <TableCell>
                <span class="text-sm font-mono">{{ conn.remoteAddress || '-' }}</span>
              </TableCell>

              <TableCell>
                <Badge variant="outline" class="font-mono">
                  AS{{ conn.remoteAs || '-' }}
                </Badge>
              </TableCell>

              <TableCell>
                <span class="text-sm font-mono">{{ conn.localAddress || '-' }}</span>
              </TableCell>

              <TableCell>
                <Badge variant="outline" class="font-mono">
                  AS{{ conn.localAs || '-' }}
                </Badge>
              </TableCell>

              <TableCell>
                <Badge
                  :variant="getStateVariant(conn.state)"
                  class="gap-1.5"
                >
                  <component
                    :is="getStateIcon(conn.state)"
                    class="h-3 w-3"
                  />
                  {{ conn.state || 'Unknown' }}
                </Badge>
              </TableCell>

              <TableCell>
                <span class="text-sm text-muted-foreground">
                  {{ conn.uptime || '-' }}
                </span>
              </TableCell>

              <TableCell>
                <Badge
                  :variant="conn.disabled ? 'secondary' : 'default'"
                  :class="conn.disabled ? 'bg-slate-500/10 border-slate-500/20' : 'bg-emerald-500/10 border-emerald-500/20'"
                  class="gap-1.5"
                >
                  <component
                    :is="conn.disabled ? XCircle : CheckCircle2"
                    :class="conn.disabled ? 'text-slate-400' : 'text-emerald-400'"
                    class="h-3 w-3"
                  />
                  {{ conn.disabled ? 'DISABLED' : 'ENABLED' }}
                </Badge>
              </TableCell>

              <TableCell class="text-right">
                <div class="flex items-center justify-end gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    title="View Details"
                    @click="openViewModal(conn)"
                  >
                    <Eye class="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    title="Reset Connection"
                    :disabled="conn.disabled"
                    @click="handleResetConnection(conn)"
                  >
                    <RefreshCw class="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    :class="conn.disabled ? 'text-emerald-600 hover:text-emerald-600' : 'text-amber-600 hover:text-amber-600'"
                    :title="conn.disabled ? 'Enable Connection' : 'Disable Connection'"
                    @click="handleToggleConnectionStatus(conn)"
                  >
                    <component :is="conn.disabled ? Power : PowerOff" class="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>

    <!-- View Modal -->
    <!-- TODO: Create RouterosBgpConnectionViewModal component -->
  </div>
</template>
