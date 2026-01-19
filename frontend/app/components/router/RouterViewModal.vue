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
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10 border-emerald-500/20',
  },
  INACTIVE: {
    icon: XCircle,
    color: 'text-slate-400',
    bgColor: 'bg-slate-500/10 border-slate-500/20',
  },
  MAINTENANCE: {
    icon: Wrench,
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10 border-amber-500/20',
  },
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
                  :class="statusConfig[props.router.status].bgColor"
                  class="status-badge font-mono text-xs gap-1.5"
                >
                  <component
                    :is="statusConfig[props.router.status].icon"
                    :class="statusConfig[props.router.status].color"
                    class="h-3 w-3"
                  />
                  {{ props.router.status }}
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
