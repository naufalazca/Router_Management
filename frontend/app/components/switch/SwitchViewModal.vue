<script setup lang="ts">
import type { Switch } from '~/stores/switch'
import {
  CheckCircle2,
  Clock,
  HardDrive,
  Lock,
  MapPin,
  Network,
  RadioTower,
  User,
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
  switch: Switch | null
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

// Brand badge config
const brandConfig: Record<string, { label: string, color: string, bgColor: string }> = {
  MIKROTIK: { label: 'MikroTik', color: 'text-white dark:text-sky-300', bgColor: 'bg-sky-600 dark:bg-sky-500/20 border-sky-600 dark:border-sky-500/30' },
  UBIVIQUITI: { label: 'Ubiquiti', color: 'text-white dark:text-teal-300', bgColor: 'bg-teal-600 dark:bg-teal-500/20 border-teal-600 dark:border-teal-500/30' },
}

function formatDate(dateString: string | null | undefined) {
  if (!dateString)
    return '—'
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
          Switch Details
        </DialogTitle>
        <DialogDescription class="font-mono text-xs">
          View network switch information
        </DialogDescription>
      </DialogHeader>

      <div v-if="props.switch" class="space-y-6 mt-4">
        <!-- Switch Information Card -->
        <Card>
          <CardHeader>
            <CardTitle class="font-mono text-lg flex items-center gap-2">
              <RadioTower class="h-5 w-5" />
              Switch Information
            </CardTitle>
          </CardHeader>
          <CardContent class="space-y-4">
            <div class="grid grid-cols-2 gap-4">
              <!-- Name -->
              <div class="space-y-1">
                <div class="flex items-center gap-2 text-xs text-muted-foreground font-mono uppercase">
                  <RadioTower class="h-3 w-3" />
                  Switch Name
                </div>
                <p class="font-mono text-sm font-medium">
                  {{ props.switch.name }}
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
                    statusConfig[props.switch.status].bgColor,
                    statusConfig[props.switch.status].color,
                  ]"
                >
                  <component
                    :is="statusConfig[props.switch.status].icon"
                    class="h-4 w-4"
                  />
                  {{ props.switch.status }}
                </Badge>
              </div>

              <!-- Brand -->
              <div class="space-y-1">
                <div class="flex items-center gap-2 text-xs text-muted-foreground font-mono uppercase">
                  <HardDrive class="h-3 w-3" />
                  Brand
                </div>
                <Badge
                  v-if="brandConfig[props.switch.brand]"
                  class="status-badge border font-medium font-mono text-xs"
                  :class="[
                    brandConfig[props.switch.brand].bgColor,
                    brandConfig[props.switch.brand].color,
                  ]"
                >
                  {{ brandConfig[props.switch.brand].label }}
                </Badge>
              </div>

              <!-- Model -->
              <div class="space-y-1">
                <div class="flex items-center gap-2 text-xs text-muted-foreground font-mono uppercase">
                  <HardDrive class="h-3 w-3" />
                  Model
                </div>
                <p class="font-mono text-sm">
                  {{ props.switch.model || '—' }}
                </p>
              </div>

              <!-- Port Count -->
              <div class="space-y-1">
                <div class="flex items-center gap-2 text-xs text-muted-foreground font-mono uppercase">
                  <Network class="h-3 w-3" />
                  Port Count
                </div>
                <p class="font-mono text-sm">
                  {{ props.switch.portCount || '—' }}
                </p>
              </div>

              <!-- Location -->
              <div class="space-y-1">
                <div class="flex items-center gap-2 text-xs text-muted-foreground font-mono uppercase">
                  <MapPin class="h-3 w-3" />
                  Location
                </div>
                <p class="font-mono text-sm">
                  {{ props.switch.location || '—' }}
                </p>
              </div>

              <!-- Company -->
              <div class="space-y-1">
                <div class="flex items-center gap-2 text-xs text-muted-foreground font-mono uppercase">
                  <RadioTower class="h-3 w-3" />
                  Company
                </div>
                <p class="font-mono text-sm">
                  <template v-if="props.switch.company">
                    {{ props.switch.company.name }} ({{ props.switch.company.code }})
                  </template>
                  <template v-else>
                    {{ props.switch.companyId }}
                  </template>
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
                  {{ props.switch.ipAddress }}
                </p>
              </div>

              <!-- MAC Address -->
              <div class="space-y-1">
                <div class="flex items-center gap-2 text-xs text-muted-foreground font-mono uppercase">
                  <Network class="h-3 w-3" />
                  MAC Address
                </div>
                <p class="font-mono text-sm">
                  {{ props.switch.macAddress || '—' }}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <!-- RouterOS Credentials Card -->
        <Card>
          <CardHeader>
            <CardTitle class="font-mono text-lg flex items-center gap-2">
              <Lock class="h-5 w-5" />
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
                  {{ props.switch.username }}
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
                  {{ props.switch.apiPort || 8728 }}
                </p>
              </div>

              <!-- SSH Port -->
              <div class="space-y-1">
                <div class="flex items-center gap-2 text-xs text-muted-foreground font-mono uppercase">
                  <Network class="h-3 w-3" />
                  SSH Port
                </div>
                <p class="font-mono text-sm">
                  {{ props.switch.sshPort || 22 }}
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
                  {{ formatDate(props.switch.createdAt) }}
                </p>
              </div>

              <!-- Updated At -->
              <div class="space-y-1">
                <div class="flex items-center gap-2 text-xs text-muted-foreground font-mono uppercase">
                  <Clock class="h-3 w-3" />
                  Updated At
                </div>
                <p class="font-mono text-sm">
                  {{ formatDate(props.switch.updatedAt) }}
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
