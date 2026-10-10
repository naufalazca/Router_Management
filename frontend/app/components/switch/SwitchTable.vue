<script setup lang="ts">
import type { Switch } from '~/stores/switch'
import {
  CheckCircle2,
  Eye,
  MapPin,
  Pencil,
  RadioTower,
  Trash2,
  Wrench,
  XCircle,
} from 'lucide-vue-next'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

defineProps<{
  switches: Switch[]
  isLoading: boolean
  searchQuery: string
}>()

const emit = defineEmits<{
  view: [sw: Switch]
  edit: [sw: Switch]
  delete: [sw: Switch]
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
</script>

<template>
  <Card>
    <CardHeader>
      <CardTitle>Switch Registry</CardTitle>
      <CardDescription>
        Manage your network switches
      </CardDescription>
    </CardHeader>
    <CardContent>
      <div v-if="isLoading" class="flex items-center justify-center py-12">
        <div class="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
      </div>

      <div v-else-if="switches.length === 0" class="flex flex-col items-center justify-center gap-4 py-12">
        <RadioTower class="h-12 w-12 text-muted-foreground/30" />
        <p class="text-sm text-muted-foreground">
          {{ searchQuery ? 'No switches match your search' : 'No switches registered' }}
        </p>
      </div>

      <Table v-else>
        <TableHeader>
          <TableRow>
            <TableHead>Switch</TableHead>
            <TableHead>Network</TableHead>
            <TableHead>Company</TableHead>
            <TableHead>Brand / Model</TableHead>
            <TableHead>Ports</TableHead>
            <TableHead>Location</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Connections</TableHead>
            <TableHead class="text-right">
              Actions
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow
            v-for="sw in switches"
            :key="sw.id"
          >
            <TableCell class="font-medium">
              <div class="flex items-center gap-2">
                <div class="flex h-6 w-6 items-center justify-center rounded border bg-primary/10 border-primary/20">
                  <RadioTower class="h-3 w-3 text-primary" />
                </div>
                <span>{{ sw.name }}</span>
              </div>
            </TableCell>

            <TableCell>
              <div class="space-y-0.5">
                <p class="text-sm text-cyan-600 dark:text-cyan-400">
                  {{ sw.ipAddress }}
                </p>
                <p v-if="sw.macAddress" class="text-xs text-muted-foreground">
                  {{ sw.macAddress }}
                </p>
              </div>
            </TableCell>

            <TableCell>
              <span v-if="sw.company" class="text-sm">{{ sw.company.name }} ({{ sw.company.code }})</span>
              <span v-else class="text-muted-foreground">—</span>
            </TableCell>

            <TableCell>
              <div class="flex flex-wrap gap-1">
                <Badge
                  v-if="brandConfig[sw.brand]"
                  class="border font-medium text-xs"
                  :class="[
                    brandConfig[sw.brand].bgColor,
                    brandConfig[sw.brand].color,
                  ]"
                >
                  {{ brandConfig[sw.brand].label }}
                </Badge>
                <span v-if="sw.model" class="text-sm text-muted-foreground">{{ sw.model }}</span>
              </div>
            </TableCell>

            <TableCell>
              <span class="text-sm text-muted-foreground">{{ sw.portCount || '—' }}</span>
            </TableCell>

            <TableCell>
              <div v-if="sw.location" class="flex items-center gap-1.5">
                <MapPin class="h-3 w-3 text-muted-foreground" />
                <span class="text-sm">{{ sw.location }}</span>
              </div>
              <span v-else class="text-muted-foreground">—</span>
            </TableCell>

            <TableCell>
              <Badge
                class="border gap-1.5 font-medium"
                :class="[
                  statusConfig[sw.status].bgColor,
                  statusConfig[sw.status].color,
                ]"
              >
                <component
                  :is="statusConfig[sw.status].icon"
                  class="h-4 w-4"
                />
                {{ sw.status }}
              </Badge>
            </TableCell>

            <TableCell>
              <span class="text-sm text-muted-foreground tabular-nums">{{ sw.connectionCount ?? 0 }}</span>
            </TableCell>

            <TableCell class="text-right">
              <div class="flex items-center justify-end gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  title="View Details"
                  @click="emit('view', sw)"
                >
                  <Eye class="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  title="Edit"
                  @click="emit('edit', sw)"
                >
                  <Pencil class="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  title="Delete"
                  class="text-destructive hover:text-destructive"
                  @click="emit('delete', sw)"
                >
                  <Trash2 class="h-4 w-4" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </CardContent>
  </Card>
</template>
