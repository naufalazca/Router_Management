<script setup lang="ts">
import type { PingEntry, PingRequest } from '~/stores/routeros/troubleshoot'
import {
  Activity,
  AlertCircle,
  ArrowRight,
  Network,
  Play,
  RefreshCw,
  Server,
  Settings2,
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
const targetAddress = ref<string>('8.8.8.8')
const pingCount = ref<number>(4)
const pingSize = ref<number>(64)
const pingTtl = ref<number>(64)
const srcAddress = ref<string>('')
const pingInterface = ref<string>('')
const doNotFragment = ref<boolean>(false)

// Advanced settings visibility
const showAdvanced = ref(false)

// Common presets
const presets = [
  { label: 'Quick (4 pings)', count: 4 },
  { label: 'Standard (10 pings)', count: 10 },
  { label: 'Extended (50 pings)', count: 50 },
  { label: 'Stress Test (100 pings)', count: 100 },
]

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

// Execute ping
async function executePing() {
  if (!selectedRouterId.value) {
    toast.error('Please select a router')
    return
  }

  if (!targetAddress.value) {
    toast.error('Please enter a target address')
    return
  }

  const params: PingRequest = {
    address: targetAddress.value,
    count: pingCount.value,
    size: pingSize.value,
  }

  if (srcAddress.value)
    params.srcAddress = srcAddress.value

  if (pingTtl.value)
    params.ttl = pingTtl.value

  if (pingInterface.value)
    params.interface = pingInterface.value

  if (doNotFragment.value)
    params.doNotFragment = true

  const result = await troubleshootStore.ping(selectedRouterId.value, params)

  if (result.success) {
    toast.success(`Ping completed to ${targetAddress.value}`)
  }
  else {
    toast.error(result.error || 'Ping failed')
  }
}

// Apply preset
function applyPreset(preset: typeof presets[0]) {
  pingCount.value = preset.count
}

// Clear results
function clearResults() {
  troubleshootStore.clearPingResult()
}

// Get packet loss variant
function getPacketLossVariant(loss: number) {
  if (loss === 0)
    return 'default'
  if (loss < 25)
    return 'secondary'
  if (loss < 50)
    return 'outline'
  return 'destructive'
}

// Get ping status color
function getPingStatusColor(entry: PingEntry) {
  if (entry.status === 'reply')
    return 'text-green-600 dark:text-green-400'
  if (entry.status === 'timeout')
    return 'text-amber-600 dark:text-amber-400'
  return 'text-red-600 dark:text-red-400'
}

// Get ping status icon
function getPingStatusIcon(entry: PingEntry) {
  if (entry.status === 'reply')
    return '✓'
  if (entry.status === 'timeout')
    return '○'
  return '✗'
}

// Format time for display
function formatTime(ms: number) {
  if (ms < 1)
    return `${(ms * 1000).toFixed(2)}µs`
  return `${ms.toFixed(2)}ms`
}
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
            <Activity class="h-5 w-5 text-primary" />
          </div>
          <h1 class="text-3xl font-bold tracking-tight">
            Ping Test
          </h1>
        </div>
        <p class="text-sm text-muted-foreground">
          {{ selectedRouter ? `Execute ping test from ${selectedRouter.name}` : 'Select a router to execute ping test' }}
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
          Select the router to execute ping from
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

    <!-- Ping Configuration -->
    <Card>
      <CardHeader>
        <div class="flex items-center justify-between">
          <div>
            <CardTitle class="flex items-center gap-2">
              <Network class="h-5 w-5" />
              Ping Configuration
            </CardTitle>
            <CardDescription>
              Configure ping test parameters
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            @click="showAdvanced = !showAdvanced"
          >
            <Settings2 class="h-4 w-4 mr-2" />
            {{ showAdvanced ? 'Simple' : 'Advanced' }}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div class="space-y-6">
          <!-- Target Address -->
          <div class="flex gap-4 items-end">
            <div class="flex-1 space-y-2">
              <Label for="target">Target Address *</Label>
              <Input
                id="target"
                v-model="targetAddress"
                placeholder="e.g., 8.8.8.8 or google.com"
                :disabled="!selectedRouterId || troubleshootStore.isLoading"
              />
            </div>
            <Button
              @click="executePing"
              :disabled="!selectedRouterId || troubleshootStore.isLoading"
              class="min-w-[120px]"
            >
              <Play v-if="!troubleshootStore.isLoading" class="h-4 w-4 mr-2" />
              <RefreshCw v-else class="h-4 w-4 mr-2 animate-spin" />
              {{ troubleshootStore.isLoading ? 'Running...' : 'Start Ping' }}
            </Button>
            <Button
              v-if="troubleshootStore.pingResult"
              variant="outline"
              @click="clearResults"
            >
              <X class="h-4 w-4 mr-2" />
              Clear
            </Button>
          </div>

          <!-- Presets -->
          <div class="space-y-2">
            <Label>Quick Presets</Label>
            <div class="flex flex-wrap gap-2">
              <Button
                v-for="preset in presets"
                :key="preset.label"
                variant="outline"
                size="sm"
                :disabled="!selectedRouterId"
                @click="applyPreset(preset)"
              >
                {{ preset.label }}
              </Button>
            </div>
          </div>

          <!-- Basic Settings -->
          <div class="grid gap-4 sm:grid-cols-3">
            <div class="space-y-2">
              <Label for="count">Ping Count</Label>
              <Input
                id="count"
                v-model.number="pingCount"
                type="number"
                min="1"
                max="1000"
                :disabled="!selectedRouterId"
              />
            </div>
            <div class="space-y-2">
              <Label for="size">Packet Size (bytes)</Label>
              <Input
                id="size"
                v-model.number="pingSize"
                type="number"
                min="1"
                max="65000"
                :disabled="!selectedRouterId"
              />
            </div>
          </div>

          <!-- Advanced Settings -->
          <div v-if="showAdvanced" class="space-y-4 pt-4 border-t">
            <div class="grid gap-4 sm:grid-cols-2">
              <div class="space-y-2">
                <Label for="ttl">TTL</Label>
                <Input
                  id="ttl"
                  v-model.number="pingTtl"
                  type="number"
                  min="1"
                  max="255"
                  placeholder="64"
                  :disabled="!selectedRouterId"
                />
              </div>
              <div class="space-y-2">
                <Label for="srcAddress">Source Address (optional)</Label>
                <Input
                  id="srcAddress"
                  v-model="srcAddress"
                  placeholder="e.g., 192.168.1.1"
                  :disabled="!selectedRouterId"
                />
              </div>
              <div class="space-y-2 sm:col-span-2">
                <Label for="pingInterface">Interface (optional)</Label>
                <Input
                  id="pingInterface"
                  v-model="pingInterface"
                  placeholder="e.g., ether1"
                  :disabled="!selectedRouterId"
                />
              </div>
              <div class="flex items-center gap-2">
                <input
                  id="doNotFragment"
                  v-model="doNotFragment"
                  type="checkbox"
                  class="h-4 w-4"
                  :disabled="!selectedRouterId"
                />
                <Label for="doNotFragment" class="cursor-pointer">Do Not Fragment</Label>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>

    <!-- Ping Results -->
    <Card v-if="troubleshootStore.pingResult">
      <CardHeader>
        <div class="flex items-center justify-between">
          <div>
            <CardTitle>Ping Results</CardTitle>
            <CardDescription>
              Results from {{ troubleshootStore.pingResult.host }}
            </CardDescription>
          </div>
          <Badge :variant="getPacketLossVariant(troubleshootStore.pingResult.packetLoss)">
            {{ troubleshootStore.pingResult.packetLoss }}% packet loss
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div class="space-y-6">
          <!-- Summary Stats -->
          <div class="grid gap-4 md:grid-cols-4">
            <div class="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
              <div class="flex items-center justify-center w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30">
                <ArrowRight class="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p class="text-xs text-muted-foreground">Sent</p>
                <p class="text-xl font-bold tabular-nums">{{ troubleshootStore.pingResult.sent }}</p>
              </div>
            </div>

            <div class="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
              <div class="flex items-center justify-center w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30">
                <Activity class="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p class="text-xs text-muted-foreground">Received</p>
                <p class="text-xl font-bold tabular-nums">{{ troubleshootStore.pingResult.received }}</p>
              </div>
            </div>

            <div class="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
              <div class="flex items-center justify-center w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30">
                <RefreshCw class="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p class="text-xs text-muted-foreground">Avg RTT</p>
                <p class="text-xl font-bold tabular-nums">{{ formatTime(troubleshootStore.pingResult.rtt.avg) }}</p>
              </div>
            </div>

            <div class="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
              <div class="flex items-center justify-center w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/30">
                <Network class="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p class="text-xs text-muted-foreground">Min / Max</p>
                <p class="text-xl font-bold tabular-nums">
                  {{ formatTime(troubleshootStore.pingResult.rtt.min) }} / {{ formatTime(troubleshootStore.pingResult.rtt.max) }}
                </p>
              </div>
            </div>
          </div>

          <!-- Individual Ping Results -->
          <div>
            <h3 class="text-sm font-medium mb-3">Individual Pings</h3>
            <div class="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead class="w-[80px]">Seq</TableHead>
                    <TableHead class="w-[100px]">Status</TableHead>
                    <TableHead class="w-[100px]">Bytes</TableHead>
                    <TableHead class="w-[120px]">RTT</TableHead>
                    <TableHead>TTL</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow
                    v-for="entry in troubleshootStore.pingResult.results"
                    :key="entry.sequence"
                  >
                    <TableCell class="font-mono text-sm">
                      #{{ entry.sequence }}
                    </TableCell>
                    <TableCell>
                      <span :class="getPingStatusColor(entry)" class="flex items-center gap-1 font-medium">
                        <span class="text-lg">{{ getPingStatusIcon(entry) }}</span>
                        {{ entry.status }}
                      </span>
                    </TableCell>
                    <TableCell class="font-mono text-sm">
                      {{ entry.bytes }} B
                    </TableCell>
                    <TableCell class="font-mono text-sm">
                      <span v-if="entry.status === 'reply'" class="font-medium">
                        {{ formatTime(entry.time) }}
                      </span>
                      <span v-else class="text-muted-foreground">-</span>
                    </TableCell>
                    <TableCell class="font-mono text-sm">
                      {{ entry.ttl ?? '-' }}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>

    <!-- Empty State -->
    <Card v-if="!troubleshootStore.pingResult && !troubleshootStore.isLoading">
      <CardContent class="flex flex-col items-center justify-center gap-4 py-12">
        <Activity class="h-12 w-12 text-muted-foreground/30" />
        <p class="text-sm text-muted-foreground">
          Enter a target address and click "Start Ping" to begin
        </p>
      </CardContent>
    </Card>
  </div>
</template>
