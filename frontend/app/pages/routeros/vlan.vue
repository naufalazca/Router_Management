<script setup lang="ts">
import type { RouterosDevice } from '~/composables/useRouterosDevices'
import type { MergedVlan, ParsedVlanPort, VlanReport } from '~/stores/routeros/vlan'
import {
  AlertCircle,
  ArrowRight,
  ChevronDown,
  CircleCheck,
  CircleSlash,
  Copy,
  Info,
  Layers,
  Network,
  RefreshCw,
  Router,
  Search,
  Server,
  Tag,
  Tags,
  X,
} from 'lucide-vue-next'
import { computed, onMounted, ref, watch } from 'vue'
import { toast } from 'vue-sonner'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useRouterosDevices } from '~/composables/useRouterosDevices'
import { useRouterOSVlanStore } from '~/stores/routeros/vlan'

const vlanStore = useRouterOSVlanStore()
const { devices, findDevice, fetchDevices } = useRouterosDevices()

const selectedDeviceId = ref<string>('')
const vlanQuery = ref<string>('')
const portFilter = ref<'all' | 'tagged' | 'untagged'>('all')

// Load devices (routers + switches) on mount
onMounted(async () => {
  await fetchDevices()
})

// Watch for errors from store and show toast
watch(() => vlanStore.error, (newError) => {
  if (newError) {
    toast.error(newError)
  }
})

// Get selected device info
const selectedDevice = computed<RouterosDevice | undefined>(() => {
  return findDevice(selectedDeviceId.value)
})

// Load VLANs
async function loadVlans() {
  if (!selectedDeviceId.value) {
    toast.error('Please select a device')
    return
  }

  const result = await vlanStore.fetchVlans(selectedDeviceId.value)

  if (result.success) {
    toast.success('VLANs loaded')
  }
  else {
    toast.error(result.error || 'Failed to fetch VLANs')
  }
}

function clearResults() {
  vlanStore.clearReport()
}

const report = computed<VlanReport | null>(() => vlanStore.report)

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

// Split ports into tagged / untagged groups per VLAN
function taggedPorts(vlan: MergedVlan) {
  return vlan.ports.filter(p => p.tagged)
}

function untaggedPorts(vlan: MergedVlan) {
  return vlan.ports.filter(p => !p.tagged)
}

// Full line "name | comment" as a single string — rendered as one text node
function portLine(port: ParsedVlanPort) {
  return port.comment ? `${port.name} | ${port.comment}` : port.name
}

// Short explanation of where the VLAN was discovered
function sourceLabel(vlan: MergedVlan) {
  if (vlan.source === 'both')
    return { text: 'Bridge + L3', hint: 'Defined as a bridge VLAN and as an /interface vlan' }
  if (vlan.source === 'bridge')
    return { text: 'Bridge VLAN', hint: 'Defined in /interface bridge vlan' }
  return { text: 'L3 Interface', hint: 'Defined in /interface vlan' }
}

// VLAN health flags surfaced as pills
function vlanFlags(vlan: MergedVlan) {
  const flags: { key: string, text: string, hint: string, tone: 'warn' | 'info' }[] = []
  if (vlan.disabled)
    flags.push({ key: 'disabled', text: 'Disabled', hint: 'This VLAN row is disabled on the device', tone: 'warn' })
  if (vlan.dynamic)
    flags.push({ key: 'dynamic', text: 'Dynamic', hint: 'Created automatically by the device', tone: 'info' })
  return flags
}

// L3 interface that carries the same VLAN id, when present
function l3ForVlan(vlan: MergedVlan) {
  return report.value?.vlanInterfaces.filter(iface => iface.vlanId === vlan.vlanId) ?? []
}

// Aggregate figures across the report, for the overview strip
const tagSummary = computed(() => {
  const vlans = report.value?.vlans ?? []
  const portIds = new Set<string>()
  let tagged = 0
  let untagged = 0
  let accessVlan: number | null = null
  let accessCount = 0

  for (const vlan of vlans) {
    const t = taggedPorts(vlan)
    const u = untaggedPorts(vlan)
    tagged += t.length
    untagged += u.length
    for (const p of vlan.ports) portIds.add(p.name)

    // VLAN with the most untagged (access) members — NOT a native/PVID value.
    if (u.length > accessCount) {
      accessCount = u.length
      accessVlan = vlan.vlanId
    }
  }

  // VLANs that exist only as an L3 interface (no bridge membership, no member ports).
  const l3Only = vlans.filter(v => v.source === 'interface' && v.ports.length === 0).length

  return { portCount: portIds.size, tagged, untagged, accessVlan, accessCount, l3Only }
})

/* ------------------------------------------------------------------ */
/* Filtering                                                           */
/* ------------------------------------------------------------------ */

const filteredVlans = computed<MergedVlan[]>(() => {
  const vlans = report.value?.vlans ?? []
  const q = vlanQuery.value.trim().toLowerCase()

  return vlans
    .map((vlan) => {
      let ports = vlan.ports
      if (portFilter.value === 'tagged')
        ports = ports.filter(p => p.tagged)
      else if (portFilter.value === 'untagged')
        ports = ports.filter(p => !p.tagged)
      return { ...vlan, ports }
    })
    .filter((vlan) => {
      if (q && !String(vlan.vlanId).includes(q) && !vlan.ports.some(p => p.name.toLowerCase().includes(q)))
        return false
      // When a port filter hides every port, keep the VLAN only if it still has ports
      if (portFilter.value !== 'all' && vlan.ports.length === 0)
        return false
      return true
    })
})

// VLANs matching only the text query (ignoring the port-type filter), so the
// tagged/untagged counts stay comparable to the unfiltered summary cards.
const queryMatchedVlans = computed<MergedVlan[]>(() => {
  const vlans = report.value?.vlans ?? []
  const q = vlanQuery.value.trim().toLowerCase()
  if (!q)
    return vlans
  return vlans.filter(vlan =>
    String(vlan.vlanId).includes(q) || vlan.ports.some(p => p.name.toLowerCase().includes(q)),
  )
})

const visibleTagged = computed(() =>
  queryMatchedVlans.value.reduce((sum, v) => sum + taggedPorts(v).length, 0),
)
const visibleUntagged = computed(() =>
  queryMatchedVlans.value.reduce((sum, v) => sum + untaggedPorts(v).length, 0),
)

async function copyReport() {
  const current = report.value
  if (!current)
    return

  const lines: string[] = []
  lines.push(`VLAN report: ${current.deviceName} (${current.deviceType})`)
  lines.push(`Fetched at: ${new Date(current.fetchedAt).toLocaleString()}`)
  lines.push('')

  for (const vlan of filteredVlans.value) {
    lines.push(`VLAN ${vlan.vlanId} [${sourceLabel(vlan).text}]`)
    for (const port of taggedPorts(vlan))
      lines.push(`  TAG    ${portLine(port)}`)
    for (const port of untaggedPorts(vlan))
      lines.push(`  UNTAG  ${portLine(port)}`)
    if (vlan.ports.length === 0)
      lines.push('  (no member ports)')
  }

  try {
    await navigator.clipboard.writeText(lines.join('\n'))
    toast.success('VLAN list copied')
  }
  catch {
    toast.error('Clipboard not available')
  }
}
</script>

<template>
  <div class="w-full space-y-6">
    <!-- Error Alert -->
    <Alert
      v-if="vlanStore.error"
      variant="destructive"
      class="relative"
    >
      <AlertCircle class="h-4 w-4" />
      <AlertTitle class="flex items-center justify-between">
        <span>VLAN Error</span>
        <Button
          variant="ghost"
          size="sm"
          class="h-7 text-destructive hover:bg-destructive/10"
          @click="vlanStore.clearError"
        >
          <X class="h-3.5 w-3.5" />
          Dismiss
        </Button>
      </AlertTitle>
      <AlertDescription class="mt-2">
        {{ vlanStore.error }}
      </AlertDescription>
    </Alert>

    <!-- Header Section -->
    <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div class="space-y-1">
        <div class="flex items-center gap-3">
          <div class="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 border border-primary/20">
            <Layers class="h-5 w-5 text-primary" />
          </div>
          <h1 class="text-3xl font-bold tracking-tight">
            VLAN Availability
          </h1>
        </div>
        <p class="text-sm text-muted-foreground">
          {{ selectedDevice ? `VLAN membership map for ${selectedDevice.name}` : 'Select a device to inspect where each VLAN is tagged and untagged' }}
        </p>
      </div>
      <div class="flex items-center gap-2">
        <Button
          v-if="report"
          variant="outline"
          size="sm"
          @click="copyReport"
        >
          <Copy class="h-4 w-4" />
          Copy list
        </Button>
        <Button
          v-if="report"
          variant="outline"
          size="sm"
          :disabled="vlanStore.isLoading"
          @click="loadVlans"
        >
          <RefreshCw class="h-4 w-4" :class="{ 'animate-spin': vlanStore.isLoading }" />
          Refresh
        </Button>
        <Button
          v-if="report"
          variant="ghost"
          size="sm"
          @click="clearResults"
        >
          <X class="h-4 w-4" />
          Clear
        </Button>
      </div>
    </div>

    <!-- Device Selection -->
    <Card>
      <CardHeader>
        <CardTitle class="flex items-center gap-2">
          <Server class="h-5 w-5" />
          Device Selection
        </CardTitle>
        <CardDescription>
          Select the router or switch to inspect VLANs on
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div class="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div class="flex-1">
            <Select v-model="selectedDeviceId">
              <SelectTrigger class="w-full">
                <SelectValue placeholder="Select a device..." />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem
                    v-for="device in devices"
                    :key="device.id"
                    :value="device.id"
                  >
                    <div class="flex items-center gap-2">
                      <Network v-if="device.deviceType === 'switch'" class="h-4 w-4" aria-hidden="true" />
                      <Server v-else class="h-4 w-4" aria-hidden="true" />
                      <span>{{ device.name }}</span>
                      <span class="text-xs text-muted-foreground">{{ device.ipAddress }}</span>
                      <span class="text-xs text-muted-foreground uppercase">({{ device.deviceType }})</span>
                    </div>
                  </SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          <div v-if="selectedDevice" class="flex items-center gap-2">
            <Badge
              :variant="selectedDevice.status === 'ACTIVE' ? 'default' : 'secondary'"
            >
              {{ selectedDevice.status }}
            </Badge>
          </div>
          <Button
            :disabled="!selectedDeviceId || vlanStore.isLoading"
            class="sm:min-w-[140px]"
            @click="loadVlans"
          >
            <RefreshCw v-if="vlanStore.isLoading" class="h-4 w-4 animate-spin" />
            <Layers v-else class="h-4 w-4" />
            {{ vlanStore.isLoading ? 'Loading...' : 'Load VLANs' }}
          </Button>
        </div>
      </CardContent>
    </Card>

    <!-- Summary Stats -->
    <div v-if="report" class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div class="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
        <div class="flex items-center justify-center w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30">
          <Layers class="h-5 w-5 text-blue-600 dark:text-blue-400" aria-hidden="true" />
        </div>
        <div>
          <p class="text-xs text-muted-foreground">
            Total VLANs
          </p>
          <p class="text-xl font-bold tabular-nums">
            {{ vlanStore.vlanCount }}
          </p>
        </div>
      </div>

      <div class="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
        <div class="flex items-center justify-center w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30">
          <Tag class="h-5 w-5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
        </div>
        <div>
          <p class="text-xs text-muted-foreground">
            Tagged Ports
          </p>
          <p class="text-xl font-bold tabular-nums">
            {{ vlanStore.totalTaggedPorts }}
          </p>
        </div>
      </div>

      <div class="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
        <div class="flex items-center justify-center w-10 h-10 rounded-full bg-sky-100 dark:bg-sky-900/30">
          <Tags class="h-5 w-5 text-sky-600 dark:text-sky-400" aria-hidden="true" />
        </div>
        <div>
          <p class="text-xs text-muted-foreground">
            Untagged Ports
          </p>
          <p class="text-xl font-bold tabular-nums">
            {{ vlanStore.totalUntaggedPorts }}
          </p>
        </div>
      </div>

      <div class="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
        <div class="flex items-center justify-center w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/30">
          <Router class="h-5 w-5 text-purple-600 dark:text-purple-400" aria-hidden="true" />
        </div>
        <div>
          <p class="text-xs text-muted-foreground">
            L3 VLAN Interfaces
          </p>
          <p class="text-xl font-bold tabular-nums">
            {{ report.vlanInterfaces.length }}
          </p>
        </div>
      </div>
    </div>

    <!-- VLAN Map -->
    <Card v-if="report">
      <CardHeader>
        <div class="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div class="space-y-1.5">
            <CardTitle class="flex items-center gap-2">
              <Layers class="h-5 w-5" />
              VLAN Map
            </CardTitle>
            <CardDescription>
              Where each VLAN is tagged and untagged on {{ report.deviceName }}
              ({{ report.deviceType }})
            </CardDescription>
          </div>
          <!-- Legend: color is never the only signal -->
          <div class="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
            <span class="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
              <Tag class="h-3.5 w-3.5" aria-hidden="true" />
              <span class="font-semibold uppercase tracking-wide">Tagged</span>
              <span class="text-muted-foreground">= 802.1Q trunk port</span>
            </span>
            <span class="flex items-center gap-1.5 text-sky-700 dark:text-sky-400">
              <Tags class="h-3.5 w-3.5" aria-hidden="true" />
              <span class="font-semibold uppercase tracking-wide">Untagged</span>
              <span class="text-muted-foreground">= access port (PVID)</span>
            </span>
          </div>
        </div>
      </CardHeader>

      <CardContent class="space-y-4">
        <!-- VLAN topology overview: uplink -> VLANs -> access ports -->
        <div
          v-if="report.vlans.length > 0"
          class="rounded-lg border bg-muted/30 p-4"
        >
          <div class="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <Info class="h-3.5 w-3.5" aria-hidden="true" />
            Topology overview
          </div>
          <div class="flex flex-wrap items-center gap-x-4 gap-y-3">
            <div class="flex items-center gap-2 rounded-md border bg-background px-3 py-2">
              <ArrowRight class="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <div class="leading-tight">
                <p class="text-[11px] uppercase tracking-wide text-muted-foreground">
                  Trunk uplink
                </p>
                <p class="font-semibold tabular-nums">
                  {{ tagSummary.tagged }} <span class="text-xs font-normal text-muted-foreground">tagged members</span>
                </p>
              </div>
            </div>

            <div class="flex items-center gap-2 rounded-md border bg-background px-3 py-2">
              <Network class="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <div class="leading-tight">
                <p class="text-[11px] uppercase tracking-wide text-muted-foreground">
                  VLANs in use
                </p>
                <p class="font-semibold tabular-nums">
                  {{ report.vlans.length }} <span class="text-xs font-normal text-muted-foreground">across {{ tagSummary.portCount }} ports</span>
                </p>
              </div>
            </div>

            <div class="flex items-center gap-2 rounded-md border bg-background px-3 py-2">
              <Tags class="h-4 w-4 text-sky-600 dark:text-sky-400" aria-hidden="true" />
              <div class="leading-tight">
                <p class="text-[11px] uppercase tracking-wide text-muted-foreground">
                  Access ports
                </p>
                <p class="font-semibold tabular-nums">
                  {{ tagSummary.untagged }} <span class="text-xs font-normal text-muted-foreground">untagged members</span>
                </p>
              </div>
            </div>

            <div
              v-if="tagSummary.accessVlan !== null"
              class="flex items-center gap-2 rounded-md border bg-background px-3 py-2"
            >
              <Layers class="h-4 w-4 text-amber-600 dark:text-amber-400" aria-hidden="true" />
              <div class="leading-tight">
                <p class="text-[11px] uppercase tracking-wide text-muted-foreground">
                  VLAN with most access ports
                </p>
                <p class="font-semibold tabular-nums">
                  {{ tagSummary.accessVlan }}
                </p>
              </div>
            </div>

            <div
              v-if="tagSummary.l3Only > 0"
              class="flex items-center gap-2 rounded-md border bg-background px-3 py-2"
            >
              <Router class="h-4 w-4 text-purple-600 dark:text-purple-400" aria-hidden="true" />
              <div class="leading-tight">
                <p class="text-[11px] uppercase tracking-wide text-muted-foreground">
                  L3-only VLANs
                </p>
                <p class="font-semibold tabular-nums">
                  {{ tagSummary.l3Only }} <span class="text-xs font-normal text-muted-foreground">bridge has no members</span>
                </p>
              </div>
            </div>
          </div>
        </div>

        <!-- Toolbar -->
        <div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div class="relative w-full lg:max-w-xs">
            <Search class="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input
              v-model="vlanQuery"
              type="search"
              class="pl-8"
              placeholder="Search VLAN ID or port name..."
              aria-label="Search VLAN ID or port name"
            />
          </div>
          <div class="flex flex-wrap items-center gap-3">
            <div class="inline-flex rounded-md border p-0.5" role="group" aria-label="Filter by port tagging">
              <Button
                size="sm"
                :variant="portFilter === 'all' ? 'secondary' : 'ghost'"
                class="h-7 px-2.5 text-xs"
                :aria-pressed="portFilter === 'all'"
                @click="portFilter = 'all'"
              >
                All
              </Button>
              <Button
                size="sm"
                :variant="portFilter === 'tagged' ? 'secondary' : 'ghost'"
                class="h-7 px-2.5 text-xs"
                :aria-pressed="portFilter === 'tagged'"
                @click="portFilter = 'tagged'"
              >
                <Tag class="h-3.5 w-3.5" aria-hidden="true" />
                Tagged
              </Button>
              <Button
                size="sm"
                :variant="portFilter === 'untagged' ? 'secondary' : 'ghost'"
                class="h-7 px-2.5 text-xs"
                :aria-pressed="portFilter === 'untagged'"
                @click="portFilter = 'untagged'"
              >
                <Tags class="h-3.5 w-3.5" aria-hidden="true" />
                Untagged
              </Button>
            </div>
            <p class="text-xs text-muted-foreground tabular-nums">
              Showing <span class="font-medium text-foreground">{{ filteredVlans.length }}</span> of {{ report.vlans.length }} VLANs
              · <span class="font-medium text-emerald-600 dark:text-emerald-400">{{ visibleTagged }}</span> tagged
              · <span class="font-medium text-sky-600 dark:text-sky-400">{{ visibleUntagged }}</span> untagged
              <span class="opacity-70">(all ports, ignoring the port filter)</span>
            </p>
          </div>
        </div>

        <!-- VLAN cards -->
        <div v-if="filteredVlans.length > 0" class="space-y-3">
          <Collapsible
            v-for="vlan in filteredVlans"
            :key="vlan.vlanId"
            v-slot="{ open }"
            as-child
          >
            <div class="overflow-hidden rounded-lg border bg-card">
              <CollapsibleTrigger as-child>
                <button
                  type="button"
                  class="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                  :aria-label="`VLAN ${vlan.vlanId} details`"
                >
                  <ChevronDown
                    class="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200"
                    :class="open ? 'rotate-0' : '-rotate-90'"
                    aria-hidden="true"
                  />

                  <!-- VLAN identity -->
                  <span class="flex shrink-0 items-center gap-3">
                    <span class="inline-flex h-9 min-w-[3rem] items-center justify-center rounded-md bg-primary/10 px-2 font-mono text-base font-semibold text-primary">
                      {{ vlan.vlanId }}
                    </span>
                  </span>
                  <span class="min-w-0 flex-1">
                    <span class="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" class="gap-1 text-xs">
                        <Layers class="h-3 w-3" aria-hidden="true" />
                        {{ sourceLabel(vlan).text }}
                      </Badge>
                      <Badge
                        v-for="flag in vlanFlags(vlan)"
                        :key="flag.key"
                        :variant="flag.tone === 'warn' ? 'destructive' : 'secondary'"
                        class="gap-1 text-xs"
                      >
                        <CircleSlash v-if="flag.tone === 'warn'" class="h-3 w-3" aria-hidden="true" />
                        <Info v-else class="h-3 w-3" aria-hidden="true" />
                        {{ flag.text }}
                      </Badge>
                      <Badge v-if="l3ForVlan(vlan).length > 0" variant="secondary" class="gap-1 text-xs">
                        <Router class="h-3 w-3" aria-hidden="true" />
                        {{ l3ForVlan(vlan).length }} L3 iface
                      </Badge>
                    </span>
                    <span class="mt-1 block text-xs text-muted-foreground">
                      {{ sourceLabel(vlan).hint }}
                    </span>
                    <!-- Tidy inline preview of member ports (tagged + untagged) -->
                    <span
                      v-if="vlan.ports.length > 0"
                      class="mt-1.5 flex flex-wrap items-center gap-1"
                    >
                      <span
                        v-for="port in taggedPorts(vlan).slice(0, 4)"
                        :key="`pt-${port.name}`"
                        class="inline-flex max-w-[14rem] items-center gap-1 rounded border border-emerald-200/70 bg-emerald-50 px-1.5 py-0.5 text-[10px] text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-400"
                        :title="portLine(port)"
                      >
                        <Tag class="h-2.5 w-2.5 shrink-0" aria-hidden="true" />
                        <span class="shrink-0 font-mono font-semibold">{{ port.name }}</span>
                        <span v-if="port.comment" class="truncate opacity-80">· {{ port.comment }}</span>
                      </span>
                      <span
                        v-for="port in untaggedPorts(vlan).slice(0, 4)"
                        :key="`pu-${port.name}`"
                        class="inline-flex max-w-[14rem] items-center gap-1 rounded border border-sky-200/70 bg-sky-50 px-1.5 py-0.5 text-[10px] text-sky-700 dark:border-sky-900/40 dark:bg-sky-950/30 dark:text-sky-400"
                        :title="portLine(port)"
                      >
                        <Tags class="h-2.5 w-2.5 shrink-0" aria-hidden="true" />
                        <span class="shrink-0 font-mono font-semibold">{{ port.name }}</span>
                        <span v-if="port.comment" class="truncate opacity-80">· {{ port.comment }}</span>
                      </span>
                      <span
                        v-if="vlan.ports.length > 8"
                        class="text-[10px] text-muted-foreground"
                      >+{{ vlan.ports.length - 8 }} more</span>
                    </span>
                  </span>

                  <!-- Port counts per VLAN -->
                  <span class="flex shrink-0 flex-wrap items-center gap-2">
                    <span class="inline-flex items-center gap-1.5 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-400">
                      <Tag class="h-3.5 w-3.5" aria-hidden="true" />
                      <span class="tabular-nums">{{ taggedPorts(vlan).length }}</span>
                      <span class="hidden sm:inline">tagged</span>
                    </span>
                    <span class="inline-flex items-center gap-1.5 rounded-md border border-sky-200 bg-sky-50 px-2 py-1 text-xs font-medium text-sky-700 dark:border-sky-900/50 dark:bg-sky-950/40 dark:text-sky-400">
                      <Tags class="h-3.5 w-3.5" aria-hidden="true" />
                      <span class="tabular-nums">{{ untaggedPorts(vlan).length }}</span>
                      <span class="hidden sm:inline">untagged</span>
                    </span>
                  </span>
                </button>
              </CollapsibleTrigger>

              <CollapsibleContent>
                <div class="border-t bg-muted/20 px-4 py-4">
                  <div
                    v-if="vlan.ports.length > 0"
                    class="grid gap-4 lg:grid-cols-2"
                  >
                    <!-- Tagged column -->
                    <div class="rounded-lg border border-emerald-200/70 bg-emerald-50/50 p-3 dark:border-emerald-900/40 dark:bg-emerald-950/20">
                      <div class="mb-2 flex items-center gap-2">
                        <Tag class="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                        <span class="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
                          Tagged
                        </span>
                        <Badge variant="secondary" class="ml-auto text-[11px] tabular-nums">
                          {{ taggedPorts(vlan).length }}
                        </Badge>
                      </div>
                      <p class="mb-2 text-[11px] text-muted-foreground">
                        VLAN tag is kept on egress — typically trunk / uplink towards another switch or router.
                      </p>
                      <ul v-if="taggedPorts(vlan).length > 0" class="space-y-1.5">
                        <li
                          v-for="port in taggedPorts(vlan)"
                          :key="`t-${port.name}`"
                          class="flex items-start gap-2.5 rounded-md border border-emerald-200/60 bg-background px-2.5 py-2 dark:border-emerald-900/40"
                          :title="portLine(port)"
                        >
                          <Tag class="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                          <div class="min-w-0 flex-1">
                            <div class="flex items-center gap-2">
                              <span class="truncate font-mono text-xs font-semibold">{{ port.name }}</span>
                              <Badge v-if="port.type" variant="outline" class="shrink-0 text-[10px] uppercase">
                                {{ port.type }}
                              </Badge>
                            </div>
                            <p
                              v-if="port.comment"
                              class="mt-0.5 truncate text-[11px] text-muted-foreground"
                            >
                              {{ port.comment }}
                            </p>
                          </div>
                        </li>
                      </ul>
                      <p v-else class="text-xs italic text-muted-foreground">
                        This VLAN is not carried tagged on any port.
                      </p>
                    </div>

                    <!-- Untagged column -->
                    <div class="rounded-lg border border-sky-200/70 bg-sky-50/50 p-3 dark:border-sky-900/40 dark:bg-sky-950/20">
                      <div class="mb-2 flex items-center gap-2">
                        <Tags class="h-4 w-4 text-sky-600 dark:text-sky-400" aria-hidden="true" />
                        <span class="text-xs font-semibold uppercase tracking-wide text-sky-700 dark:text-sky-400">
                          Untagged
                        </span>
                        <Badge variant="secondary" class="ml-auto text-[11px] tabular-nums">
                          {{ untaggedPorts(vlan).length }}
                        </Badge>
                      </div>
                      <p class="mb-2 text-[11px] text-muted-foreground">
                        Frames leave untagged — usually access ports for end devices on this VLAN.
                      </p>
                      <ul v-if="untaggedPorts(vlan).length > 0" class="space-y-1.5">
                        <li
                          v-for="port in untaggedPorts(vlan)"
                          :key="`u-${port.name}`"
                          class="flex items-start gap-2.5 rounded-md border border-sky-200/60 bg-background px-2.5 py-2 dark:border-sky-900/40"
                          :title="portLine(port)"
                        >
                          <Tags class="mt-0.5 h-3.5 w-3.5 shrink-0 text-sky-600 dark:text-sky-400" aria-hidden="true" />
                          <div class="min-w-0 flex-1">
                            <div class="flex items-center gap-2">
                              <span class="truncate font-mono text-xs font-semibold">{{ port.name }}</span>
                              <Badge v-if="port.type" variant="outline" class="shrink-0 text-[10px] uppercase">
                                {{ port.type }}
                              </Badge>
                            </div>
                            <p
                              v-if="port.comment"
                              class="mt-0.5 truncate text-[11px] text-muted-foreground"
                            >
                              {{ port.comment }}
                            </p>
                          </div>
                        </li>
                      </ul>
                      <p v-else class="text-xs italic text-muted-foreground">
                        This VLAN is not used untagged on any port.
                      </p>
                    </div>
                  </div>

                  <!-- No member ports -->
                  <div
                    v-else
                    class="flex items-center gap-2 text-xs italic text-muted-foreground"
                  >
                    <CircleSlash class="h-4 w-4" aria-hidden="true" />
                    No member ports — this VLAN only exists as an L3 interface entry.
                  </div>

                  <!-- L3 interface details for this VLAN -->
                  <div
                    v-if="l3ForVlan(vlan).length > 0"
                    class="mt-4 border-t pt-3"
                  >
                    <p class="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      L3 VLAN interface
                    </p>
                    <ul class="space-y-1.5">
                      <li
                        v-for="iface in l3ForVlan(vlan)"
                        :key="iface.id"
                        class="flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-md border bg-background px-3 py-2 text-xs"
                      >
                        <Router class="h-3.5 w-3.5 shrink-0 text-purple-600 dark:text-purple-400" aria-hidden="true" />
                        <span class="font-mono font-semibold">{{ iface.name ?? '—' }}</span>
                        <span v-if="iface.comment" class="truncate text-[11px] text-muted-foreground">
                          {{ iface.comment }}
                        </span>
                        <span class="flex items-center gap-1.5 text-muted-foreground">
                          <span>on</span>
                          <span class="font-mono text-foreground">{{ iface.parentInterface ?? '—' }}</span>
                          <span v-if="iface.parentComment" class="text-[11px]">| {{ iface.parentComment }}</span>
                          <Badge v-if="iface.parentType" variant="outline" class="text-[10px] uppercase">
                            {{ iface.parentType }}
                          </Badge>
                        </span>
                        <Badge
                          class="ml-auto"
                          :variant="iface.disabled ? 'destructive' : 'secondary'"
                        >
                          {{ iface.disabled ? 'Disabled' : 'Enabled' }}
                        </Badge>
                      </li>
                    </ul>
                  </div>
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>
        </div>

        <!-- Filtered out everything -->
        <div
          v-else-if="report.vlans.length > 0"
          class="flex flex-col items-center justify-center gap-2 rounded-lg border py-10 text-muted-foreground"
        >
          <Search class="h-8 w-8 opacity-40" aria-hidden="true" />
          <p class="text-sm">
            No VLAN matches the current search or filter
          </p>
          <Button
            variant="ghost"
            size="sm"
            @click="vlanQuery = ''; portFilter = 'all'"
          >
            Reset filters
          </Button>
        </div>

        <!-- No VLANs at all -->
        <div v-else class="flex flex-col items-center justify-center gap-2 py-8 text-muted-foreground">
          <Layers class="h-10 w-10 opacity-30" aria-hidden="true" />
          <p class="text-sm">
            No VLANs found on this device
          </p>
        </div>
      </CardContent>
    </Card>

    <!-- L3 VLAN Interfaces Table -->
    <Card v-if="report && report.vlanInterfaces.length > 0">
      <CardHeader>
        <CardTitle class="flex items-center gap-2">
          <Router class="h-5 w-5" />
          L3 VLAN Interfaces
        </CardTitle>
        <CardDescription>
          VLAN interfaces defined under /interface vlan
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div class="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead class="w-[100px]">
                  VLAN ID
                </TableHead>
                <TableHead>Parent Interface</TableHead>
                <TableHead class="w-[110px]">
                  Status
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow
                v-for="vlanIf in report.vlanInterfaces"
                :key="vlanIf.id"
              >
                <TableCell class="text-sm">
                  <div class="flex items-start gap-2">
                    <CircleCheck
                      v-if="!vlanIf.disabled"
                      class="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400"
                      aria-hidden="true"
                    />
                    <CircleSlash
                      v-else
                      class="mt-0.5 h-3.5 w-3.5 shrink-0 text-destructive"
                      aria-hidden="true"
                    />
                    <div class="min-w-0">
                      <div class="truncate font-mono font-semibold">
                        {{ vlanIf.name ?? '—' }}
                      </div>
                      <p
                        v-if="vlanIf.comment"
                        class="truncate text-[11px] text-muted-foreground"
                      >
                        {{ vlanIf.comment }}
                      </p>
                    </div>
                  </div>
                </TableCell>
                <TableCell class="font-mono text-sm tabular-nums">
                  {{ vlanIf.vlanId ?? '—' }}
                </TableCell>
                <TableCell class="text-sm">
                  <div class="flex items-center gap-2">
                    <span class="font-mono">{{ vlanIf.parentInterface ?? '—' }}</span>
                    <Badge v-if="vlanIf.parentType" variant="outline" class="text-[10px] uppercase">
                      {{ vlanIf.parentType }}
                    </Badge>
                  </div>
                  <p
                    v-if="vlanIf.parentComment"
                    class="text-[11px] text-muted-foreground"
                  >
                    {{ vlanIf.parentComment }}
                  </p>
                </TableCell>
                <TableCell>
                  <Badge
                    :variant="vlanIf.disabled ? 'destructive' : 'secondary'"
                  >
                    {{ vlanIf.disabled ? 'Disabled' : 'Enabled' }}
                  </Badge>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>

    <!-- Empty State -->
    <Card v-if="!report && !vlanStore.isLoading">
      <CardContent class="flex flex-col items-center justify-center gap-4 py-12">
        <Layers class="h-12 w-12 text-muted-foreground/30" aria-hidden="true" />
        <div class="space-y-1 text-center">
          <p class="text-sm font-medium">
            No VLAN data loaded yet
          </p>
          <p class="text-sm text-muted-foreground">
            Select a device and click "Load VLANs" to see which ports are tagged and untagged per VLAN
          </p>
        </div>
      </CardContent>
    </Card>
  </div>
</template>
