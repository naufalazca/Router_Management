<script setup lang="ts">
import { ref, watch } from 'vue'
import { useCompanyStore, type Company, type CompanyRouter } from '~/stores/company'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Building2,
  MapPin,
  User,
  Key,
  Code,
  FileText,
  Image,
  Server,
  Wifi,
  CheckCircle2,
  XCircle,
  Wrench,
  Clock
} from 'lucide-vue-next'
import { toast } from 'vue-sonner'

const props = defineProps<{
  open: boolean
  company: Company | null
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
}>()

const companyStore = useCompanyStore()
const isLoadingRouters = ref(false)
const routersLoaded = ref(false)
const companyDetails = ref<Company | null>(null)

// Status badge config
const statusConfig = {
  ACTIVE: {
    icon: CheckCircle2,
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10 border-emerald-500/20'
  },
  INACTIVE: {
    icon: XCircle,
    color: 'text-slate-400',
    bgColor: 'bg-slate-500/10 border-slate-500/20'
  },
  MAINTENANCE: {
    icon: Wrench,
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10 border-amber-500/20'
  }
}

// Reset state when dialog closes
watch(() => props.open, (newVal) => {
  if (!newVal) {
    routersLoaded.value = false
    companyStore.clearCompanyRouters()
    companyDetails.value = null
  } else if (newVal && props.company) {
    // Fetch full company details when opening
    fetchCompanyDetails()
  }
})

async function fetchCompanyDetails() {
  if (!props.company) return

  try {
    const result = await companyStore.fetchCompanyById(props.company.id)
    if (result.success && result.data) {
      companyDetails.value = result.data
    }
  } catch (error) {
    console.error('Error fetching company details:', error)
  }
}

async function fetchRouters() {
  if (!props.company || isLoadingRouters.value) return

  isLoadingRouters.value = true

  try {
    const result = await companyStore.fetchCompanyRouters(props.company.id)
    if (result.success) {
      routersLoaded.value = true
      toast.success(`Loaded ${companyStore.companyRouters.length} routers`)
    } else {
      toast.error(result.error || 'Failed to load routers')
    }
  } catch (error) {
    toast.error('An unexpected error occurred')
  } finally {
    isLoadingRouters.value = false
  }
}

function formatDate(dateString: string | null | undefined) {
  if (!dateString) return 'Never'
  const date = new Date(dateString)
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date)
}
</script>

<template>
  <Dialog :open="props.open" @update:open="(val) => emit('update:open', val)">
    <DialogContent class="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle class="font-mono">Company Details</DialogTitle>
        <DialogDescription class="font-mono text-xs">
          View company information and associated routers
        </DialogDescription>
      </DialogHeader>

      <div v-if="companyDetails || props.company" class="space-y-6 mt-4">
        <!-- Company Information Card -->
        <Card>
          <CardHeader>
            <CardTitle class="font-mono text-lg flex items-center gap-2">
              <Building2 class="h-5 w-5" />
              Company Information
            </CardTitle>
          </CardHeader>
          <CardContent class="space-y-4">
            <div class="grid grid-cols-2 gap-4">
              <!-- Name -->
              <div class="space-y-1">
                <div class="flex items-center gap-2 text-xs text-muted-foreground font-mono uppercase">
                  <Building2 class="h-3 w-3" />
                  Company Name
                </div>
                <p class="font-mono text-sm font-medium">{{ companyDetails?.name || props.company?.name }}</p>
              </div>

              <!-- Code -->
              <div class="space-y-1">
                <div class="flex items-center gap-2 text-xs text-muted-foreground font-mono uppercase">
                  <Code class="h-3 w-3" />
                  Company Code
                </div>
                <p class="font-mono text-sm font-medium text-cyan-400">{{ companyDetails?.code || props.company?.code }}</p>
              </div>

              <!-- Address -->
              <div class="col-span-2 space-y-1">
                <div class="flex items-center gap-2 text-xs text-muted-foreground font-mono uppercase">
                  <MapPin class="h-3 w-3" />
                  Address
                </div>
                <p class="font-mono text-sm">{{ companyDetails?.address || props.company?.address }}</p>
              </div>

              <!-- Description -->
              <div v-if="companyDetails?.description || props.company?.description" class="col-span-2 space-y-1">
                <div class="flex items-center gap-2 text-xs text-muted-foreground font-mono uppercase">
                  <FileText class="h-3 w-3" />
                  Description
                </div>
                <p class="font-mono text-sm text-muted-foreground">{{ companyDetails?.description || props.company?.description }}</p>
              </div>

              <!-- Logo URL -->
              <div v-if="companyDetails?.logo || props.company?.logo" class="col-span-2 space-y-1">
                <div class="flex items-center gap-2 text-xs text-muted-foreground font-mono uppercase">
                  <Image class="h-3 w-3" />
                  Logo URL
                </div>
                <a :href="companyDetails?.logo || props.company?.logo" target="_blank" class="font-mono text-sm text-blue-400 hover:underline break-all">
                  {{ companyDetails?.logo || props.company?.logo }}
                </a>
              </div>
            </div>
          </CardContent>
        </Card>

        <!-- Credentials Card -->
        <Card>
          <CardHeader>
            <CardTitle class="font-mono text-lg flex items-center gap-2">
              <Key class="h-5 w-5" />
              Master Credentials
            </CardTitle>
            <CardDescription class="font-mono text-xs">
              Default credentials for all routers in this company
            </CardDescription>
          </CardHeader>
          <CardContent class="space-y-4">
            <div class="grid grid-cols-2 gap-4">
              <!-- Username -->
              <div class="space-y-1">
                <div class="flex items-center gap-2 text-xs text-muted-foreground font-mono uppercase">
                  <User class="h-3 w-3" />
                  Master Username
                </div>
                <p class="font-mono text-sm font-medium">{{ companyDetails?.masterUsername || props.company?.masterUsername }}</p>
              </div>

              <!-- Password -->
              <div class="space-y-1">
                <div class="flex items-center gap-2 text-xs text-muted-foreground font-mono uppercase">
                  <Key class="h-3 w-3" />
                  Master Password
                </div>
                <p class="font-mono text-sm font-medium text-emerald-400">
                  {{ companyDetails?.masterPassword || '••••••••' }}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <!-- Routers Section -->
        <Card>
          <CardHeader>
            <div class="flex items-center justify-between">
              <div>
                <CardTitle class="font-mono text-lg flex items-center gap-2">
                  <Server class="h-5 w-5" />
                  Associated Routers
                </CardTitle>
                <CardDescription class="font-mono text-xs">
                  {{ props.company?.routerCount || 0 }} router(s) registered
                </CardDescription>
              </div>
              <Button
                @click="fetchRouters"
                :disabled="isLoadingRouters || routersLoaded"
                class="command-btn"
                size="sm"
              >
                {{ isLoadingRouters ? 'Loading...' : routersLoaded ? 'Loaded' : 'Load Routers' }}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div v-if="!routersLoaded" class="empty-state">
              <Server class="h-12 w-12 text-muted-foreground opacity-30" />
              <p class="text-muted-foreground font-mono text-sm">
                Click "Load Routers" to view associated devices
              </p>
            </div>

            <div v-else-if="companyStore.companyRouters.length === 0" class="empty-state">
              <Server class="h-12 w-12 text-muted-foreground opacity-30" />
              <p class="text-muted-foreground font-mono text-sm">
                No routers registered for this company
              </p>
            </div>

            <Table v-else class="router-table">
              <TableHeader>
                <TableRow class="table-header-row">
                  <TableHead class="font-mono text-xs">Device</TableHead>
                  <TableHead class="font-mono text-xs">Network</TableHead>
                  <TableHead class="font-mono text-xs">Location</TableHead>
                  <TableHead class="font-mono text-xs">Status</TableHead>
                  <TableHead class="font-mono text-xs">Last Seen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow
                  v-for="router in companyStore.companyRouters"
                  :key="router.id"
                  class="router-row"
                >
                  <TableCell class="font-medium">
                    <div class="flex items-center gap-2">
                      <div class="device-icon">
                        <Wifi class="h-3 w-3" />
                      </div>
                      <div>
                        <p class="font-mono text-sm">{{ router.name }}</p>
                        <p v-if="router.model" class="font-mono text-xs text-muted-foreground">{{ router.model }}</p>
                      </div>
                    </div>
                  </TableCell>

                  <TableCell>
                    <div class="space-y-0.5">
                      <p class="font-mono text-xs text-cyan-400">{{ router.ipAddress }}</p>
                      <p v-if="router.macAddress" class="font-mono text-xs text-muted-foreground">
                        {{ router.macAddress }}
                      </p>
                    </div>
                  </TableCell>

                  <TableCell>
                    <div v-if="router.location" class="flex items-center gap-1.5">
                      <MapPin class="h-3 w-3 text-muted-foreground" />
                      <span class="font-mono text-xs">{{ router.location }}</span>
                    </div>
                    <span v-else class="text-muted-foreground">—</span>
                  </TableCell>

                  <TableCell>
                    <Badge
                      :class="statusConfig[router.status as keyof typeof statusConfig]?.bgColor"
                      class="status-badge font-mono text-xs gap-1.5"
                    >
                      <component
                        :is="statusConfig[router.status as keyof typeof statusConfig]?.icon"
                        :class="statusConfig[router.status as keyof typeof statusConfig]?.color"
                        class="h-3 w-3"
                      />
                      {{ router.status }}
                    </Badge>
                  </TableCell>

                  <TableCell>
                    <div class="flex items-center gap-1.5">
                      <Clock class="h-3 w-3 text-muted-foreground" />
                      <span class="font-mono text-xs text-muted-foreground">
                        {{ formatDate(router.lastSeen) }}
                      </span>
                    </div>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
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
.command-btn {
  font-family: 'IBM Plex Mono', monospace;
  font-weight: 500;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  padding: 3rem 1rem;
}

.device-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.5rem;
  height: 1.5rem;
  background: hsl(var(--primary) / 0.1);
  border: 1px solid hsl(var(--primary) / 0.2);
  border-radius: 0.25rem;
  color: hsl(var(--primary));
}

.table-header-row {
  border-bottom: 2px solid hsl(var(--border) / 0.5);
  background: hsl(var(--muted) / 0.3);
}

.table-header-row th {
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-weight: 600;
  color: hsl(var(--muted-foreground));
}

.router-row {
  border-bottom: 1px solid hsl(var(--border) / 0.3);
  transition: background-color 0.15s;
}

.router-row:hover {
  background: hsl(var(--muted) / 0.3);
}

.status-badge {
  border: 1px solid;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
</style>
