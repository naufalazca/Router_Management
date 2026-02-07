<script setup lang="ts">
import type { TracerouteRequest } from '~/stores/routeros/troubleshoot'
import {
  AlertCircle,
  GitBranch,
  Globe,
  Play,
  RefreshCw,
  Search,
  Server,
  X,
} from 'lucide-vue-next'
import { computed, onMounted, ref, watch } from 'vue'
import { toast } from 'vue-sonner'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import { useRouterOSTroubleshootStore } from '~/stores/routeros/troubleshoot'

const troubleshootStore = useRouterOSTroubleshootStore()
const routerStore = useRouterStore()

const selectedRouterId = ref<string>('')
const targetAddress = ref<string>('1.1.1.1')
const probeCount = ref<number>(10)

// Load routers on mount
onMounted(async () => {
  await routerStore.fetchRouters()

  // Auto-select first router if available
  if (routerStore.routers.length > 0) {
    selectedRouterId.value = routerStore.routers[0]?.id || ''
  }
})

// Watch for errors from store and show toast
watch(() => troubleshootStore.error, (newError) => {
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

// Execute traceroute
async function executeTraceroute() {
  if (!selectedRouterId.value) {
    toast.error('Please select a router')
    return
  }

  if (!targetAddress.value) {
    toast.error('Please enter a target address')
    return
  }

  const params: TracerouteRequest = {
    address: targetAddress.value,
    count: probeCount.value,
  }

  const result = await troubleshootStore.traceroute(selectedRouterId.value, params)

  if (result.success) {
    toast.success(`Traceroute completed to ${targetAddress.value}`)
  }
  else {
    toast.error(result.error || 'Traceroute failed')
  }
}

// Clear results
function clearResults() {
  troubleshootStore.clearTracerouteResult()
}

// Format time for display
function formatTime(ms: number) {
  if (ms < 1)
    return `${(ms * 1000).toFixed(0)}µs`
  return `${ms.toFixed(1)}ms`
}

// Check if destination was reached (last hop matches target)
const destinationReached = computed(() => {
  const result = troubleshootStore.tracerouteResult
  if (!result || result.hops.length === 0)
    return false
  const lastHop = result.hops[result.hops.length - 1]
  if (!lastHop)
    return false
  return lastHop.address === targetAddress.value
})
</script>

<template>
  <div class="w-full space-y-6">
    <!-- Error Alert -->
    <Alert
      v-if="troubleshootStore.error"
      variant="destructive"
      class="relative"
    >
      <AlertCircle class="h-4 w-4" />
      <AlertTitle class="flex items-center justify-between">
        <span>Troubleshoot Error</span>
        <button
          type="button"
          class="text-sm underline opacity-80 hover:opacity-100"
          @click="troubleshootStore.clearError"
        >
          Dismiss
        </button>
      </AlertTitle>
      <AlertDescription class="mt-2">
        {{ troubleshootStore.error }}
      </AlertDescription>
    </Alert>

    <!-- Header Section -->
    <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div class="space-y-1">
        <div class="flex items-center gap-3">
          <div class="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 border border-primary/20">
            <GitBranch class="h-5 w-5 text-primary" />
          </div>
          <h1 class="text-3xl font-bold tracking-tight">
            Traceroute
          </h1>
        </div>
        <p class="text-sm text-muted-foreground">
          {{ selectedRouter ? `Trace network path from ${selectedRouter.name}` : 'Select a router to trace network path' }}
        </p>
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
          Select the router to execute traceroute from
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

    <!-- Traceroute Configuration -->
    <Card>
      <CardHeader>
        <CardTitle class="flex items-center gap-2">
          <Search class="h-5 w-5" />
          Traceroute Configuration
        </CardTitle>
        <CardDescription>
          Configure traceroute parameters
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div class="space-y-4">
          <!-- Target Address -->
          <div class="flex gap-4 items-end">
            <div class="flex-1 space-y-2">
              <Label for="target">Target Address *</Label>
              <Input
                id="target"
                v-model="targetAddress"
                placeholder="e.g., 1.1.1.1 or google.com"
                :disabled="!selectedRouterId || troubleshootStore.isLoading"
              />
            </div>
            <div class="w-32 space-y-2">
              <Label for="count">Count</Label>
              <Input
                id="count"
                v-model.number="probeCount"
                type="number"
                min="1"
                max="100"
                :disabled="!selectedRouterId"
              />
            </div>
            <Button
              @click="executeTraceroute"
              :disabled="!selectedRouterId || troubleshootStore.isLoading"
              class="min-w-[140px]"
            >
              <Play v-if="!troubleshootStore.isLoading" class="h-4 w-4 mr-2" />
              <RefreshCw v-else class="h-4 w-4 mr-2 animate-spin" />
              {{ troubleshootStore.isLoading ? 'Tracing...' : 'Start Trace' }}
            </Button>
            <Button
              v-if="troubleshootStore.tracerouteResult"
              variant="outline"
              @click="clearResults"
            >
              <X class="h-4 w-4 mr-2" />
              Clear
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>

    <!-- Traceroute Results -->
    <Card v-if="troubleshootStore.tracerouteResult">
      <CardHeader>
        <div class="flex items-center justify-between">
          <div>
            <CardTitle>Route Path</CardTitle>
            <CardDescription>
              Network path to {{ troubleshootStore.tracerouteResult.target }}
            </CardDescription>
          </div>
          <Badge
            :variant="destinationReached ? 'default' : 'secondary'"
          >
            <Globe v-if="destinationReached" class="h-3 w-3 mr-1" />
            {{ destinationReached ? 'Destination Reached' : 'Incomplete' }}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div class="space-y-4">
          <!-- Summary -->
          <div class="flex gap-4 p-4 rounded-lg bg-muted/50">
            <div>
              <p class="text-xs text-muted-foreground">Total Hops</p>
              <p class="text-2xl font-bold tabular-nums">{{ troubleshootStore.tracerouteResult.hops.length }}</p>
            </div>
            <div>
              <p class="text-xs text-muted-foreground">Status</p>
              <p class="text-lg font-medium">{{ destinationReached ? 'Complete' : 'Incomplete' }}</p>
            </div>
          </div>

          <!-- Results Table (MikroTik format) -->
          <div class="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead class="w-[60px]">#</TableHead>
                  <TableHead>ADDRESS</TableHead>
                  <TableHead class="w-[70px]">LOSS</TableHead>
                  <TableHead class="w-[70px]">SENT</TableHead>
                  <TableHead class="w-[80px]">LAST</TableHead>
                  <TableHead class="w-[80px]">AVG</TableHead>
                  <TableHead class="w-[80px]">BEST</TableHead>
                  <TableHead class="w-[80px]">WORST</TableHead>
                  <TableHead class="w-[80px]">STD-DEV</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow
                  v-for="hop in troubleshootStore.tracerouteResult.hops"
                  :key="hop.hop"
                >
                  <TableCell class="font-medium">
                    {{ hop.hop }}
                  </TableCell>
                  <TableCell class="font-mono text-sm">
                    {{ hop.address }}
                  </TableCell>
                  <TableCell>
                    <Badge
                      :variant="parseFloat(hop.loss) === 0 ? 'default' : 'destructive'"
                      size="sm"
                    >
                      {{ hop.loss }}
                    </Badge>
                  </TableCell>
                  <TableCell class="tabular-nums">
                    {{ hop.sent }}
                  </TableCell>
                  <TableCell class="tabular-nums">
                    {{ formatTime(hop.last) }}
                  </TableCell>
                  <TableCell class="tabular-nums">
                    {{ formatTime(hop.avg) }}
                  </TableCell>
                  <TableCell class="tabular-nums">
                    {{ formatTime(hop.best) }}
                  </TableCell>
                  <TableCell class="tabular-nums">
                    {{ formatTime(hop.worst) }}
                  </TableCell>
                  <TableCell class="tabular-nums">
                    {{ formatTime(hop.stdDev) }}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </div>
      </CardContent>
    </Card>

    <!-- Empty State -->
    <Card v-if="!troubleshootStore.tracerouteResult && !troubleshootStore.isLoading">
      <CardContent class="flex flex-col items-center justify-center gap-4 py-12">
        <GitBranch class="h-12 w-12 text-muted-foreground/30" />
        <p class="text-sm text-muted-foreground">
          Enter a target address and click "Start Trace" to begin
        </p>
      </CardContent>
    </Card>
  </div>
</template>
