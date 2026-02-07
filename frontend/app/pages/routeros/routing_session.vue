<script setup lang="ts">
import type { BGPSession } from '~/stores/routeros/routing'
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  Globe,
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
import RouterosSessionViewModal from '~/components/routeros/routing/session/RouterosSessionViewModal.vue'

const routingStore = useRouterOSRoutingStore()
const routerStore = useRouterStore()
const searchQuery = ref('')
const selectedRouterId = ref<string>('')

// Modal states
const isViewModalOpen = ref(false)
const selectedSession = ref<BGPSession | null>(null)

// Track if initial load has completed
const hasInitialLoaded = ref(false)

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
    // Reset initial load flag for new router
    hasInitialLoaded.value = false
    await routingStore.fetchBGPSessions(newRouterId)
    // Also fetch session stats
    await routingStore.fetchBGPSessionStats(newRouterId)
    // Mark initial load as complete
    hasInitialLoaded.value = true
  }
  else {
    routingStore.clearBGPData()
    hasInitialLoaded.value = false
  }
})

// Watch for errors from store and show toast
// Only show toast for errors that occur after initial load
watch(() => routingStore.error, (newError) => {
  // Only show error toast if:
  // 1. There is actually an error (not null/undefined)
  // 2. Initial load has completed (prevents showing errors during first load)
  if (newError && hasInitialLoaded.value) {
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

// Filtered sessions based on search
const filteredSessions = computed(() => {
  if (!searchQuery.value)
    return routingStore.sessions

  const query = searchQuery.value.toLowerCase()
  return routingStore.sessions.filter(session =>
    session.name?.toLowerCase().includes(query)
    || session.remoteAddress?.toLowerCase().includes(query)
    || session.remoteAs?.toLowerCase().includes(query)
    || session.localAddress?.toLowerCase().includes(query)
    || session.localAs?.toLowerCase().includes(query),
  )
})

// Get state badge variant
function getStateVariant(state: string | undefined) {
  if (!state)
    return 'secondary'

  const stateLower = state.toLowerCase()
  if (stateLower.includes('established'))
    return 'default'
  if (stateLower.includes('active'))
    return 'secondary'
  if (stateLower.includes('idle') || stateLower.includes('connect'))
    return 'secondary'
  if (stateLower.includes('error'))
    return 'destructive'

  return 'outline'
}

// Get state icon
function getStateIcon(state: string | undefined) {
  if (!state)
    return XCircle

  const stateLower = state.toLowerCase()
  if (stateLower.includes('established'))
    return CheckCircle2
  if (stateLower.includes('active') || stateLower.includes('connect'))
    return RefreshCw

  return XCircle
}

// Open view modal
function openViewModal(session: BGPSession) {
  selectedSession.value = session
  isViewModalOpen.value = true
}

// Refresh sessions
async function refreshSessions() {
  if (selectedRouterId.value) {
    hasInitialLoaded.value = true // Prevent showing error toast during refresh
    await routingStore.fetchBGPSessions(selectedRouterId.value)
    await routingStore.fetchBGPSessionStats(selectedRouterId.value)
    toast.success('BGP Sessions refreshed')
  }
}

// Stats
const stats = computed(() => ({
  total: routingStore.sessionCount,
  established: routingStore.establishedSessions.length,
  active: routingStore.activeBgpSessions.length,
  idle: routingStore.idleSessions.length,
}))

// Get session stats from store
const sessionStats = computed(() => routingStore.sessionStats)
</script>

<template>
  <div class="w-full space-y-6">
    <!-- Error Alert for BGP Operations -->
    <Alert
      v-if="routingStore.error && hasInitialLoaded"
      variant="destructive"
      class="relative"
    >
      <AlertCircle class="h-4 w-4" />
      <AlertTitle class="flex items-center justify-between">
        <span>BGP Session Error</span>
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
            @click="routingStore.fetchBGPSessions(selectedRouterId)"
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
            <Globe class="h-5 w-5 text-primary" />
          </div>
          <h1 class="text-3xl font-bold tracking-tight">
            BGP Sessions
          </h1>
        </div>
        <p class="text-sm text-muted-foreground">
          {{ selectedRouter ? `Managing BGP sessions on ${selectedRouter.name}` : 'Select a router to manage BGP sessions' }}
        </p>
      </div>

      <div class="flex items-center gap-3">
        <div class="relative w-full sm:w-[280px]">
          <Search class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            v-model="searchQuery"
            placeholder="Search sessions..."
            class="pl-9"
            :disabled="!selectedRouterId"
          />
        </div>
        <Button
          variant="outline"
          size="icon"
          :disabled="!selectedRouterId || routingStore.isLoading"
          title="Refresh"
          @click="refreshSessions"
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
          Select a router to view and manage its BGP sessions
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
    <div v-if="selectedRouterId" class="grid gap-4 md:grid-cols-5">
      <Card>
        <CardContent class="pt-6">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-xs text-muted-foreground uppercase tracking-wider">
                Total Sessions
              </p>
              <p class="text-3xl font-bold tabular-nums mt-1">
                {{ stats.total }}
              </p>
            </div>
            <Globe class="h-8 w-8 text-muted-foreground/50" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent class="pt-6">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-xs text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                Established
              </p>
              <p class="text-3xl font-bold tabular-nums mt-1 text-emerald-600 dark:text-emerald-400">
                {{ stats.established }}
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
                Active
              </p>
              <p class="text-3xl font-bold tabular-nums mt-1 text-blue-600 dark:text-blue-400">
                {{ stats.active }}
              </p>
            </div>
            <RefreshCw class="h-8 w-8 text-blue-600/50 dark:text-blue-400/50" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent class="pt-6">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-xs text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                Idle
              </p>
              <p class="text-3xl font-bold tabular-nums mt-1 text-amber-600 dark:text-amber-400">
                {{ stats.idle }}
              </p>
            </div>
            <XCircle class="h-8 w-8 text-amber-600/50 dark:text-amber-400/50" />
          </div>
        </CardContent>
      </Card>

      <Card v-if="sessionStats">
        <CardContent class="pt-6">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-xs text-red-600 dark:text-red-400 uppercase tracking-wider">
                Down
              </p>
              <p class="text-3xl font-bold tabular-nums mt-1 text-red-600 dark:text-red-400">
                {{ sessionStats.downSessions }}
              </p>
            </div>
            <XCircle class="h-8 w-8 text-red-600/50 dark:text-red-400/50" />
          </div>
        </CardContent>
      </Card>
    </div>

    <!-- Sessions Table -->
    <Card>
      <CardHeader>
        <CardTitle>BGP Sessions</CardTitle>
        <CardDescription>
          Manage BGP peer sessions and monitor their status
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div v-if="!selectedRouterId" class="flex flex-col items-center justify-center gap-4 py-12">
          <Server class="h-12 w-12 text-muted-foreground/30" />
          <p class="text-sm text-muted-foreground">
            Please select a router to view its BGP sessions
          </p>
        </div>

        <div v-else-if="routingStore.isLoading" class="flex items-center justify-center py-12">
          <div class="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
        </div>

        <div v-else-if="filteredSessions.length === 0" class="flex flex-col items-center justify-center gap-4 py-12">
          <Globe class="h-12 w-12 text-muted-foreground/30" />
          <p class="text-sm text-muted-foreground">
            {{ searchQuery ? 'No sessions match your search' : 'No BGP sessions found on this router' }}
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
              <TableHead>Prefix Count</TableHead>
              <TableHead>Sent Updates</TableHead>
              <TableHead>Rcvd Updates</TableHead>
              <TableHead>Status</TableHead>
              <TableHead class="text-right">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow
              v-for="session in filteredSessions"
              :key="session.id"
            >
              <TableCell class="font-medium">
                {{ session.name || '-' }}
              </TableCell>

              <TableCell>
                <span class="text-sm font-mono">{{ session.remoteAddress || '-' }}</span>
              </TableCell>

              <TableCell>
                <Badge variant="outline" class="font-mono">
                  AS{{ session.remoteAs || '-' }}
                </Badge>
              </TableCell>

              <TableCell>
                <span class="text-sm font-mono">{{ session.localAddress || '-' }}</span>
              </TableCell>

              <TableCell>
                <Badge variant="outline" class="font-mono">
                  AS{{ session.localAs || '-' }}
                </Badge>
              </TableCell>

              <TableCell>
                <Badge
                  :variant="getStateVariant(session.state)"
                  class="gap-1.5"
                >
                  <component
                    :is="getStateIcon(session.state)"
                    class="h-3 w-3"
                  />
                  {{ session.state || 'Unknown' }}
                </Badge>
              </TableCell>

              <TableCell>
                <span class="text-sm text-muted-foreground">
                  {{ session.uptime || '-' }}
                </span>
              </TableCell>

              <TableCell>
                <span class="text-sm font-mono">{{ session.prefixCount ?? '-' }}</span>
              </TableCell>

              <TableCell>
                <span class="text-sm font-mono">{{ session.sentUpdate || '-' }}</span>
              </TableCell>

              <TableCell>
                <span class="text-sm font-mono">{{ session.receivedUpdate || '-' }}</span>
              </TableCell>

              <TableCell>
                <Badge
                  :variant="session.disabled ? 'secondary' : 'default'"
                  :class="session.disabled ? 'bg-slate-500/10 border-slate-500/20' : 'bg-emerald-500/10 border-emerald-500/20'"
                  class="gap-1.5"
                >
                  <component
                    :is="session.disabled ? XCircle : CheckCircle2"
                    :class="session.disabled ? 'text-slate-400' : 'text-emerald-400'"
                    class="h-3 w-3"
                  />
                  {{ session.disabled ? 'DISABLED' : 'ENABLED' }}
                </Badge>
              </TableCell>

              <TableCell class="text-right">
                <Button
                  variant="ghost"
                  size="icon"
                  title="View Details"
                  @click="openViewModal(session)"
                >
                  <Eye class="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>

    <!-- View Modal -->
    <RouterosSessionViewModal
      v-if="selectedSession"
      :session="selectedSession"
      :open="isViewModalOpen"
      @update:open="(value) => { isViewModalOpen = value; if (!value) selectedSession = null }"
    />
  </div>
</template>
