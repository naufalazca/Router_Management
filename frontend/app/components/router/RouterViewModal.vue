<script setup lang="ts">
import type { Router } from '~/stores/router'
import {
  CheckCircle2,
  Clock,
  HardDrive,
  Lock,
  MapPin,
  Network,
  Radio,
  Server,
  User,
  Wifi,
  Wrench,
  XCircle,
} from 'lucide-vue-next'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

const props = defineProps<{
  open: boolean
  router: Router | null
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
}>()

// Status badge config
const statusConfig = {
  ACTIVE: {
    icon: CheckCircle2,
    color: 'text-white dark:text-emerald-300',
    bgColor: 'bg-emerald-600 dark:bg-emerald-500/20 border-emerald-600 dark:border-emerald-500/30',
  },
  INACTIVE: {
    icon: XCircle,
    color: 'text-white dark:text-slate-300',
    bgColor: 'bg-slate-600 dark:bg-slate-500/20 border-slate-600 dark:border-slate-500/30',
  },
  MAINTENANCE: {
    icon: Wrench,
    color: 'text-white dark:text-amber-300',
    bgColor: 'bg-amber-600 dark:bg-amber-500/20 border-amber-600 dark:border-amber-500/30',
  },
}

// Router Type badge config
const routerTypeConfig: Record<string, { label: string, color: string, bgColor: string }> = {
  UPSTREAM: { label: 'Upstream (BGP)', color: 'text-white dark:text-violet-300', bgColor: 'bg-violet-600 dark:bg-violet-500/20 border-violet-600 dark:border-violet-500/30' },
  CORE: { label: 'Core Management', color: 'text-white dark:text-blue-300', bgColor: 'bg-blue-600 dark:bg-blue-500/20 border-blue-600 dark:border-blue-500/30' },
  DISTRIBUSI: { label: 'Distribusi', color: 'text-white dark:text-orange-300', bgColor: 'bg-orange-600 dark:bg-orange-500/20 border-orange-600 dark:border-orange-500/30' },
  WIRELESS: { label: 'Wireless PTP', color: 'text-white dark:text-cyan-300', bgColor: 'bg-cyan-600 dark:bg-cyan-500/20 border-cyan-600 dark:border-cyan-500/30' },
}

// Router Brand badge config
const routerBrandConfig: Record<string, { label: string, color: string, bgColor: string }> = {
  MIKROTIK: { label: 'MikroTik', color: 'text-white dark:text-sky-300', bgColor: 'bg-sky-600 dark:bg-sky-500/20 border-sky-600 dark:border-sky-500/30' },
  UBIVIQUITI: { label: 'Ubiquiti', color: 'text-white dark:text-teal-300', bgColor: 'bg-teal-600 dark:bg-teal-500/20 border-teal-600 dark:border-teal-500/30' },
}

function formatDate(dateString: string | null | undefined) {
  if (!dateString)
    return 'Never'
  const date = new Date(dateString)
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}
</script>

<template>
  <Dialog :open="props.open" @update:open="(val) => emit('update:open', val)">
    <DialogContent class="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle class="font-mono">
          Device Details
        </DialogTitle>
        <DialogDescription class="font-mono text-xs">
          View network device information
        </DialogDescription>
      </DialogHeader>

      <div v-if="props.router" class="space-y-6 mt-4">
        <!-- Device Information Card -->
        <Card>
          <CardHeader>
            <CardTitle class="font-mono text-lg flex items-center gap-2">
              <Server class="h-5 w-5" />
              Device Information
            </CardTitle>
          </CardHeader>
          <CardContent class="space-y-4">
            <div class="grid grid-cols-2 gap-4">
              <!-- Name -->
              <div class="space-y-1">
                <div class="flex items-center gap-2 text-xs text-muted-foreground font-mono uppercase">
                  <Wifi class="h-3 w-3" />
                  Device Name
                </div>
                <p class="font-mono text-sm font-medium">
                  {{ props.router.name }}
                </p>
              </div>

              <!-- Status -->
              <div class="space-y-1">
                <div class="flex items-center gap-2 text-xs text-muted-foreground font-mono uppercase">
                  <CheckCircle2 class="h-3 w-3" />
                  Status
                </div>
                <Badge
                  class="status-badge border font-medium font-mono text-xs gap-1.5"
                  :class="[
                    statusConfig[props.router.status].bgColor,
                    statusConfig[props.router.status].color,
                  ]"
                >
                  <component
                    :is="statusConfig[props.router.status].icon"
                    class="h-4 w-4"
                  />
                  {{ props.router.status }}
                </Badge>
              </div>

              <!-- Router Type -->
              <div class="space-y-1">
                <div class="flex items-center gap-2 text-xs text-muted-foreground font-mono uppercase">
                  <Server class="h-3 w-3" />
                  Router Type
                </div>
                <Badge
                  v-if="routerTypeConfig[props.router.routerType]"
                  class="status-badge border font-medium font-mono text-xs"
                  :class="[
                    routerTypeConfig[props.router.routerType].bgColor,
                    routerTypeConfig[props.router.routerType].color,
                  ]"
                >
                  {{ routerTypeConfig[props.router.routerType].label }}
                </Badge>
              </div>

              <!-- Router Brand -->
              <div class="space-y-1">
                <div class="flex items-center gap-2 text-xs text-muted-foreground font-mono uppercase">
                  <HardDrive class="h-3 w-3" />
                  Router Brand
                </div>
                <Badge
                  v-if="routerBrandConfig[props.router.routerBrand]"
                  class="status-badge border font-medium font-mono text-xs"
                  :class="[
                    routerBrandConfig[props.router.routerBrand].bgColor,
                    routerBrandConfig[props.router.routerBrand].color,
                  ]"
                >
                  {{ routerBrandConfig[props.router.routerBrand].label }}
                </Badge>
              </div>

              <!-- Model -->
              <div v-if="props.router.model" class="space-y-1">
                <div class="flex items-center gap-2 text-xs text-muted-foreground font-mono uppercase">
                  <HardDrive class="h-3 w-3" />
                  Model
                </div>
                <p class="font-mono text-sm">
                  {{ props.router.model }}
                </p>
              </div>

              <!-- Location -->
              <div v-if="props.router.location" class="space-y-1">
                <div class="flex items-center gap-2 text-xs text-muted-foreground font-mono uppercase">
                  <MapPin class="h-3 w-3" />
                  Location
                </div>
                <p class="font-mono text-sm">
                  {{ props.router.location }}
                </p>
              </div>

              <!-- Company ID -->
              <div v-if="props.router.companyId" class="space-y-1">
                <div class="flex items-center gap-2 text-xs text-muted-foreground font-mono uppercase">
                  <Server class="h-3 w-3" />
                  Company ID
                </div>
                <p class="font-mono text-sm text-blue-400">
                  {{ props.router.companyId }}
                </p>
              </div>

              <!-- Company Name -->
              <div v-if="props.router.company" class="space-y-1">
                <div class="flex items-center gap-2 text-xs text-muted-foreground font-mono uppercase">
                  <Server class="h-3 w-3" />
                  Company
                </div>
                <p class="font-mono text-sm">
                  {{ props.router.company.name }} ({{ props.router.company.code }})
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <!-- Network Information Card -->
        <Card>
          <CardHeader>
            <CardTitle class="font-mono text-lg flex items-center gap-2">
              <Network class="h-5 w-5" />
              Network Configuration
            </CardTitle>
          </CardHeader>
          <CardContent class="space-y-4">
            <div class="grid grid-cols-2 gap-4">
              <!-- IP Address -->
              <div class="space-y-1">
                <div class="flex items-center gap-2 text-xs text-muted-foreground font-mono uppercase">
                  <Network class="h-3 w-3" />
                  IP Address
                </div>
                <p class="font-mono text-sm font-medium text-cyan-400">
                  {{ props.router.ipAddress }}
                </p>
              </div>

              <!-- MAC Address -->
              <div class="space-y-1">
                <div class="flex items-center gap-2 text-xs text-muted-foreground font-mono uppercase">
                  <Network class="h-3 w-3" />
                  MAC Address
                </div>
                <p class="font-mono text-sm">
                  {{ props.router.macAddress || '—' }}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <!-- RouterOS Credentials Card -->
        <Card>
          <CardHeader>
            <CardTitle class="font-mono text-lg flex items-center gap-2">
              <Radio class="h-5 w-5" />
              RouterOS Credentials
            </CardTitle>
          </CardHeader>
          <CardContent class="space-y-4">
            <div class="grid grid-cols-2 gap-4">
              <!-- Username -->
              <div class="space-y-1">
                <div class="flex items-center gap-2 text-xs text-muted-foreground font-mono uppercase">
                  <User class="h-3 w-3" />
                  Username
                </div>
                <p class="font-mono text-sm font-medium">
                  {{ props.router.username }}
                </p>
              </div>

              <!-- Password (masked) -->
              <div class="space-y-1">
                <div class="flex items-center gap-2 text-xs text-muted-foreground font-mono uppercase">
                  <Lock class="h-3 w-3" />
                  Password
                </div>
                <p class="font-mono text-sm text-muted-foreground">
                  ••••••••••••
                </p>
              </div>

              <!-- API Port -->
              <div class="space-y-1">
                <div class="flex items-center gap-2 text-xs text-muted-foreground font-mono uppercase">
                  <Network class="h-3 w-3" />
                  API Port
                </div>
                <p class="font-mono text-sm">
                  {{ props.router.apiPort || 8728 }}
                </p>
              </div>

              <!-- SSH Port -->
              <div class="space-y-1">
                <div class="flex items-center gap-2 text-xs text-muted-foreground font-mono uppercase">
                  <Network class="h-3 w-3" />
                  SSH Port
                </div>
                <p class="font-mono text-sm">
                  {{ props.router.sshPort || 22 }}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <!-- Activity Information Card -->
        <Card>
          <CardHeader>
            <CardTitle class="font-mono text-lg flex items-center gap-2">
              <Clock class="h-5 w-5" />
              Activity Information
            </CardTitle>
          </CardHeader>
          <CardContent class="space-y-4">
            <div class="grid grid-cols-2 gap-4">
              <!-- Created At -->
              <div class="space-y-1">
                <div class="flex items-center gap-2 text-xs text-muted-foreground font-mono uppercase">
                  <Clock class="h-3 w-3" />
                  Created At
                </div>
                <p class="font-mono text-sm">
                  {{ formatDate(props.router.createdAt) }}
                </p>
              </div>

              <!-- Updated At -->
              <div class="space-y-1">
                <div class="flex items-center gap-2 text-xs text-muted-foreground font-mono uppercase">
                  <Clock class="h-3 w-3" />
                  Updated At
                </div>
                <p class="font-mono text-sm">
                  {{ formatDate(props.router.updatedAt) }}
                </p>
              </div>

              <!-- Last Seen -->
              <div class="col-span-2 space-y-1">
                <div class="flex items-center gap-2 text-xs text-muted-foreground font-mono uppercase">
                  <Clock class="h-3 w-3" />
                  Last Seen
                </div>
                <p class="font-mono text-sm text-emerald-400">
                  {{ formatDate(props.router.lastSeen) }}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div class="flex justify-end pt-4 border-t">
          <Button
            variant="outline"
            @click="emit('update:open', false)"
          >
            Close
          </Button>
        </div>
      </div>
    </DialogContent>
  </Dialog>
</template>

<style scoped>
.status-badge {
  border: 1px solid;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
</style>
