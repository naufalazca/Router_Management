<script setup lang="ts">
import type { Component } from 'vue'
import type { BadgeVariants } from '@/components/ui/badge'
import type { BGPSession } from '~/stores/routeros/routing'
import {
  BadgeCheck,
  Clock,
  Eye,
  Globe,
  Info,
  Network,
  RefreshCw,
  Server,
  X,
} from 'lucide-vue-next'
import { computed } from 'vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface Props {
  session: BGPSession
  open: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:open': [value: boolean]
}>()

function handleClose() {
  emit('update:open', false)
}

// Stat item types
interface StatItemBase {
  label: string
  value: string
  icon: Component
}

interface StatItemWithVariant extends StatItemBase {
  variant: BadgeVariants['variant']
}

type StatItem = StatItemBase | StatItemWithVariant

// Helper to check if stat has variant
function hasVariant(stat: StatItem): stat is StatItemWithVariant {
  return 'variant' in stat
}

// Format uptime to human readable
function formatUptime(uptime?: string): string {
  if (!uptime)
    return '-'

  // Already formatted from RouterOS (e.g., "1w2d10h38m22s750ms")
  return uptime
}

// Get state color variant
function getStateVariant(state?: string): BadgeVariants['variant'] {
  if (!state)
    return 'secondary'

  const stateLower = state.toLowerCase()
  if (stateLower.includes('established'))
    return 'default'
  if (stateLower.includes('active'))
    return 'secondary'
  if (stateLower.includes('idle'))
    return 'outline'
  if (stateLower.includes('connect'))
    return 'secondary'

  return 'destructive'
}

// Get state icon
function getStateIcon(state?: string): Component {
  if (!state)
    return X

  const stateLower = state.toLowerCase()
  if (stateLower.includes('established'))
    return BadgeCheck
  if (stateLower.includes('active') || stateLower.includes('connect'))
    return RefreshCw

  return X
}

// Compute statistics
const stats = computed((): StatItem[] => [
  {
    label: 'State',
    value: props.session.state || 'Unknown',
    icon: getStateIcon(props.session.state),
    variant: getStateVariant(props.session.state),
  },
  {
    label: 'Uptime',
    value: formatUptime(props.session.uptime),
    icon: Clock,
  },
  {
    label: 'Prefix Count',
    value: props.session.prefixCount?.toLocaleString() || '-',
    icon: Network,
  },
  {
    label: 'Status',
    value: props.session.disabled ? 'Disabled' : 'Enabled',
    icon: props.session.disabled ? X : BadgeCheck,
    variant: props.session.disabled ? 'destructive' : 'default',
  },
])

// Compute connection info
const connectionInfo = computed(() => [
  {
    label: 'Remote Address',
    value: props.session.remoteAddress || '-',
    icon: Globe,
  },
  {
    label: 'Remote AS',
    value: props.session.remoteAs ? `AS${props.session.remoteAs}` : '-',
    icon: Server,
  },
  {
    label: 'Local Address',
    value: props.session.localAddress || '-',
    icon: Network,
  },
  {
    label: 'Local AS',
    value: props.session.localAs ? `AS${props.session.localAs}` : '-',
    icon: Server,
  },
])
</script>

<template>
  <Dialog :open="open" @update:open="emit('update:open', $event)">
    <DialogContent class="max-w-lg">
      <DialogHeader>
        <DialogTitle class="flex items-center gap-3">
          <div class="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 border border-primary/20">
            <Globe class="h-5 w-5 text-primary" />
          </div>
          <div class="flex-1">
            <h2 class="text-xl font-semibold">
              {{ session.name || 'Unnamed Session' }}
            </h2>
            <p class="text-sm text-muted-foreground">
              BGP Session Details
            </p>
          </div>
          <Badge :variant="getStateVariant(session.state)">
            <component :is="getStateIcon(session.state)" class="h-3 w-3 mr-1" />
            {{ session.state || 'Unknown' }}
          </Badge>
        </DialogTitle>
        <DialogDescription v-if="session.uptime" class="text-sm">
          Uptime: {{ formatUptime(session.uptime) }}
        </DialogDescription>
      </DialogHeader>

      <div class="space-y-4">
        <!-- Stats Grid -->
        <div class="grid grid-cols-2 gap-4">
          <div
            v-for="stat in stats"
            :key="stat.label"
            class="flex items-center gap-3 p-3 rounded-lg border bg-muted/30"
          >
            <div class="flex items-center justify-center w-10 h-10 rounded-lg bg-background">
              <component :is="stat.icon" class="h-5 w-5 text-muted-foreground" />
            </div>
            <div class="flex-1">
              <p class="text-xs text-muted-foreground uppercase">
                {{ stat.label }}
              </p>
              <p class="text-sm font-medium">
                <Badge v-if="hasVariant(stat)" :variant="stat.variant" class="font-mono">
                  {{ stat.value }}
                </Badge>
                <span v-else class="font-mono">{{ stat.value }}</span>
              </p>
            </div>
          </div>
        </div>

        <!-- BGP Peering Information -->
        <div>
          <h3 class="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3">
            BGP Peering Information
          </h3>
          <div class="space-y-2">
            <div
              v-for="info in connectionInfo"
              :key="info.label"
              class="flex items-center justify-between p-3 rounded-lg border bg-muted/30"
            >
              <div class="flex items-center gap-3">
                <div class="flex items-center justify-center w-8 h-8 rounded-lg bg-background">
                  <component :is="info.icon" class="h-4 w-4 text-muted-foreground" />
                </div>
                <span class="text-sm font-medium">{{ info.label }}</span>
              </div>
              <span class="text-sm font-mono">{{ info.value }}</span>
            </div>
          </div>
        </div>

        <!-- Session ID -->
        <div class="flex items-center gap-2 p-3 rounded-lg border bg-muted/20">
          <Info class="h-4 w-4 text-muted-foreground" />
          <span class="text-sm text-muted-foreground">Session ID:</span>
          <code class="text-xs font-mono bg-background px-2 py-1 rounded">{{ session.id }}</code>
        </div>
      </div>

      <DialogFooter class="flex justify-between">
        <div class="flex items-center gap-2 text-sm text-muted-foreground">
          <Eye class="h-4 w-4" />
          <span>Viewing details for {{ session.name || 'Unnamed Session' }}</span>
        </div>
        <Button @click="handleClose">
          Close
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
