<script setup lang="ts">
import type { BGPAdvertisement, BGPAdvertisementFilter } from '~/stores/routeros/routing'
import {
  AlertCircle,
  ArrowDownUp,
  Filter,
  RefreshCw,
  Search,
  Server,
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

// Filter states
const filterPrefix = ref('')
const filterDstAddress = ref('')
const filterFromPeer = ref('')
const showFilters = ref(false)

// Load BGP routers on mount
onMounted(async () => {
  await routerStore.fetchBgpRouters()

  // Auto-select first router if available
  if (routerStore.bgpRouters.length > 0) {
    selectedRouterId.value = routerStore.bgpRouters[0]?.id || ''
  }
})

// Watch for router selection changes
watch(selectedRouterId, async (newRouterId) => {
  if (newRouterId) {
    await routingStore.fetchBGPAdvertisements(newRouterId)
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
  return routerStore.bgpRouters.find(r => r.id === selectedRouterId.value)
})

// Filtered advertisements based on search and filters
const filteredAdvertisements = computed(() => {
  let result = routingStore.advertisements

  // Apply search query
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(adv =>
      adv.prefix?.toLowerCase().includes(query)
      || adv.dstAddress?.toLowerCase().includes(query)
      || adv.gateway?.toLowerCase().includes(query)
      || adv.from?.toLowerCase().includes(query)
      || adv.asPath?.toLowerCase().includes(query),
    )
  }

  // Apply advanced filters
  if (filterPrefix.value) {
    result = result.filter(adv =>
      adv.prefix?.toLowerCase().includes(filterPrefix.value.toLowerCase()),
    )
  }
  if (filterDstAddress.value) {
    result = result.filter(adv =>
      adv.dstAddress?.toLowerCase().includes(filterDstAddress.value.toLowerCase()),
    )
  }
  if (filterFromPeer.value) {
    result = result.filter(adv =>
      adv.from?.toLowerCase().includes(filterFromPeer.value.toLowerCase()),
    )
  }

  return result
})

// Get origin badge variant
function getOriginVariant(origin: string | undefined) {
  if (!origin)
    return 'secondary'

  const originLower = origin.toLowerCase()
  if (originLower === 'igp')
    return 'default'
  if (originLower === 'egp')
    return 'secondary'

  return 'outline'
}

// Apply advanced filters
async function applyFilters() {
  if (!selectedRouterId.value)
    return

  const filters: BGPAdvertisementFilter = {}
  if (filterPrefix.value)
    filters.prefix = filterPrefix.value
  if (filterDstAddress.value)
    filters.dstAddress = filterDstAddress.value
  if (filterFromPeer.value)
    filters.fromPeer = filterFromPeer.value

  await routingStore.fetchBGPAdvertisementsFiltered(selectedRouterId.value, filters)
  toast.success('Filters applied')
}

// Clear all filters
function clearFilters() {
  filterPrefix.value = ''
  filterDstAddress.value = ''
  filterFromPeer.value = ''
  if (selectedRouterId.value) {
    routingStore.fetchBGPAdvertisements(selectedRouterId.value)
  }
}

// Refresh advertisements
async function refreshAdvertisements() {
  if (selectedRouterId.value) {
    await routingStore.fetchBGPAdvertisements(selectedRouterId.value)
    toast.success('BGP Advertisements refreshed')
  }
}

// Unique prefixes count
const uniquePrefixesCount = computed(() => {
  const prefixes = new Set(routingStore.advertisements.map(a => a.prefix).filter(Boolean))
  return prefixes.size
})

// Unique gateways count
const uniqueGatewaysCount = computed(() => {
  const gateways = new Set(routingStore.advertisements.map(a => a.gateway).filter(Boolean))
  return gateways.size
})
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
        <span>BGP Advertisement Error</span>
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
            @click="routingStore.fetchBGPAdvertisements(selectedRouterId)"
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
            <ArrowDownUp class="h-5 w-5 text-primary" />
          </div>
          <h1 class="text-3xl font-bold tracking-tight">
            BGP Advertisements
          </h1>
        </div>
        <p class="text-sm text-muted-foreground">
          {{ selectedRouter ? `Viewing BGP advertisements on ${selectedRouter.name}` : 'Select a router to view BGP advertisements' }}
        </p>
      </div>

      <div class="flex items-center gap-3">
        <div class="relative w-full sm:w-[280px]">
          <Search class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            v-model="searchQuery"
            placeholder="Search advertisements..."
            class="pl-9"
            :disabled="!selectedRouterId"
          />
        </div>
        <Button
          variant="outline"
          size="icon"
          :disabled="!selectedRouterId"
          :class="{ 'bg-primary/10': showFilters }"
          title="Toggle Filters"
          @click="showFilters = !showFilters"
        >
          <Filter class="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          :disabled="!selectedRouterId || routingStore.isLoading"
          title="Refresh"
          @click="refreshAdvertisements"
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
          Select a router to view its BGP advertisements
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
                    v-for="router in routerStore.bgpRouters"
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

    <!-- Advanced Filters -->
    <Card v-if="showFilters">
      <CardHeader>
        <CardTitle class="flex items-center gap-2 text-base">
          <Filter class="h-4 w-4" />
          Advanced Filters
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div class="grid gap-4 md:grid-cols-3">
          <div class="space-y-2">
            <label class="text-sm font-medium">Prefix</label>
            <Input
              v-model="filterPrefix"
              placeholder="e.g., 192.168.0.0/24"
              :disabled="!selectedRouterId"
            />
          </div>
          <div class="space-y-2">
            <label class="text-sm font-medium">Destination Address</label>
            <Input
              v-model="filterDstAddress"
              placeholder="e.g., 10.0.0.0"
              :disabled="!selectedRouterId"
            />
          </div>
          <div class="space-y-2">
            <label class="text-sm font-medium">From Peer</label>
            <Input
              v-model="filterFromPeer"
              placeholder="e.g., 192.168.1.1"
              :disabled="!selectedRouterId"
            />
          </div>
        </div>
        <div class="flex justify-end gap-2 mt-4">
          <Button
            variant="outline"
            size="sm"
            :disabled="!selectedRouterId"
            @click="clearFilters"
          >
            Clear Filters
          </Button>
          <Button
            size="sm"
            :disabled="!selectedRouterId"
            @click="applyFilters"
          >
            Apply Filters
          </Button>
        </div>
      </CardContent>
    </Card>

    <!-- Stats Cards -->
    <div v-if="selectedRouterId" class="grid gap-4 md:grid-cols-3">
      <Card>
        <CardContent class="pt-6">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-xs text-muted-foreground uppercase tracking-wider">
                Total Advertisements
              </p>
              <p class="text-3xl font-bold tabular-nums mt-1">
                {{ routingStore.advertisementCount }}
              </p>
            </div>
            <ArrowDownUp class="h-8 w-8 text-muted-foreground/50" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent class="pt-6">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-xs text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                Unique Prefixes
              </p>
              <p class="text-3xl font-bold tabular-nums mt-1 text-blue-600 dark:text-blue-400">
                {{ uniquePrefixesCount }}
              </p>
            </div>
            <Filter class="h-8 w-8 text-blue-600/50 dark:text-blue-400/50" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent class="pt-6">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-xs text-purple-600 dark:text-purple-400 uppercase tracking-wider">
                Unique Gateways
              </p>
              <p class="text-3xl font-bold tabular-nums mt-1 text-purple-600 dark:text-purple-400">
                {{ uniqueGatewaysCount }}
              </p>
            </div>
            <ArrowDownUp class="h-8 w-8 text-purple-600/50 dark:text-purple-400/50" />
          </div>
        </CardContent>
      </Card>
    </div>

    <!-- Advertisements Table -->
    <Card>
      <CardHeader>
        <CardTitle>BGP Route Advertisements</CardTitle>
        <CardDescription>
          View and filter BGP route advertisements and their attributes
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div v-if="!selectedRouterId" class="flex flex-col items-center justify-center gap-4 py-12">
          <Server class="h-12 w-12 text-muted-foreground/30" />
          <p class="text-sm text-muted-foreground">
            Please select a router to view its BGP advertisements
          </p>
        </div>

        <div v-else-if="routingStore.isLoading" class="flex items-center justify-center py-12">
          <div class="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
        </div>

        <div v-else-if="filteredAdvertisements.length === 0" class="flex flex-col items-center justify-center gap-4 py-12">
          <ArrowDownUp class="h-12 w-12 text-muted-foreground/30" />
          <p class="text-sm text-muted-foreground">
            {{ searchQuery || filterPrefix || filterDstAddress || filterFromPeer ? 'No advertisements match your filters' : 'No BGP advertisements found on this router' }}
          </p>
        </div>

        <Table v-else>
          <TableHeader>
            <TableRow>
              <TableHead>Prefix</TableHead>
              <TableHead>Destination</TableHead>
              <TableHead>Gateway</TableHead>
              <TableHead>Interface</TableHead>
              <TableHead>From Peer</TableHead>
              <TableHead>AS Path</TableHead>
              <TableHead>Origin</TableHead>
              <TableHead>Local Pref</TableHead>
              <TableHead>MED</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow
              v-for="adv in filteredAdvertisements"
              :key="adv.id"
            >
              <TableCell class="font-medium">
                <span class="font-mono text-sm">{{ adv.prefix || '-' }}</span>
              </TableCell>

              <TableCell>
                <span class="text-sm font-mono">{{ adv.dstAddress || '-' }}</span>
              </TableCell>

              <TableCell>
                <span class="text-sm font-mono">{{ adv.gateway || '-' }}</span>
              </TableCell>

              <TableCell>
                <span class="text-sm">{{ adv.interface || '-' }}</span>
              </TableCell>

              <TableCell>
                <span class="text-sm font-mono">{{ adv.from || '-' }}</span>
              </TableCell>

              <TableCell>
                <Badge variant="outline" class="font-mono text-xs max-w-[200px] truncate">
                  {{ adv.asPath || '-' }}
                </Badge>
              </TableCell>

              <TableCell>
                <Badge :variant="getOriginVariant(adv.origin)">
                  {{ adv.origin || '-' }}
                </Badge>
              </TableCell>

              <TableCell>
                <span class="text-sm font-mono">{{ adv.localPref ?? '-' }}</span>
              </TableCell>

              <TableCell>
                <span class="text-sm font-mono">{{ adv.med ?? '-' }}</span>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  </div>
</template>
