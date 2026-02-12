<script setup lang="ts">
import type { CreateRouterInput } from '~/stores/router'
import { onMounted, ref, watch } from 'vue'
import { toast } from 'vue-sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { useCompanyStore } from '~/stores/company'
import { useRouterStore } from '~/stores/router'

const props = defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  'success': []
}>()

const routerStore = useRouterStore()
const companyStore = useCompanyStore()
const isSubmitting = ref(false)

const formData = ref<CreateRouterInput>({
  name: '',
  ipAddress: '',
  macAddress: '',
  model: '',
  location: '',
  status: 'ACTIVE',
  routerType: 'CORE',
  routerBrand: 'MIKROTIK',
  companyId: '',
  username: 'admin',
  password: '',
  apiPort: 8728,
  sshPort: 22,
})

// Load companies on mount
onMounted(async () => {
  if (companyStore.companies.length === 0) {
    await companyStore.fetchCompanies()
  }
})

// Reset form when dialog closes
watch(() => props.open, (newVal) => {
  if (!newVal) {
    resetForm()
  }
})

function resetForm() {
  formData.value = {
    name: '',
    ipAddress: '',
    macAddress: '',
    model: '',
    location: '',
    status: 'ACTIVE',
    routerType: 'CORE',
    routerBrand: 'MIKROTIK',
    companyId: '',
    username: 'admin',
    password: '',
    apiPort: 8728,
    sshPort: 22,
  }
}

async function handleSubmit() {
  // Validation
  if (!formData.value.name || !formData.value.ipAddress || !formData.value.username || !formData.value.password) {
    toast.error('Please fill in all required fields (name, IP, username, password)')
    return
  }

  isSubmitting.value = true

  try {
    const result = await routerStore.createRouter(formData.value)

    if (result.success) {
      emit('success')
      emit('update:open', false)
    }
    else {
      toast.error(result.error || 'Failed to create router')
    }
  }
  catch (error) {
    toast.error('An unexpected error occurred')
  }
  finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <Dialog :open="props.open" @update:open="(val) => emit('update:open', val)">
    <DialogContent class="sm:max-w-[500px] dialog-content">
      <DialogHeader>
        <DialogTitle class="font-mono">
          Register New Device
        </DialogTitle>
        <DialogDescription class="font-mono text-xs">
          Configure network device parameters
        </DialogDescription>
      </DialogHeader>

      <form class="space-y-4 mt-4" @submit.prevent="handleSubmit">
        <div class="grid grid-cols-2 gap-4">
          <div class="col-span-2 space-y-2">
            <label class="text-sm font-medium font-mono">Device Name *</label>
            <Input
              v-model="formData.name"
              placeholder="Router-01"
              required
              class="font-mono"
            />
          </div>

          <div class="space-y-2">
            <label class="text-sm font-medium font-mono">IP Address *</label>
            <Input
              v-model="formData.ipAddress"
              placeholder="192.168.1.1"
              required
              class="font-mono"
            />
          </div>

          <div class="space-y-2">
            <label class="text-sm font-medium font-mono">MAC Address</label>
            <Input
              v-model="formData.macAddress"
              placeholder="00:00:00:00:00:00"
              class="font-mono"
            />
          </div>

          <div class="space-y-2">
            <label class="text-sm font-medium font-mono">Model</label>
            <Input
              v-model="formData.model"
              placeholder="RB4011"
              class="font-mono"
            />
          </div>

          <div class="space-y-2">
            <label class="text-sm font-medium font-mono">Location</label>
            <Input
              v-model="formData.location"
              placeholder="Main Office"
              class="font-mono"
            />
          </div>

          <div class="space-y-2">
            <label class="text-sm font-medium font-mono">Company</label>
            <select
              v-model="formData.companyId"
              class="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 font-mono"
            >
              <option value="">
                No Company (Standalone)
              </option>
              <option
                v-for="company in companyStore.companies"
                :key="company.id"
                :value="company.id"
              >
                {{ company.name }} ({{ company.code }})
              </option>
            </select>
          </div>

          <div class="space-y-2">
            <label class="text-sm font-medium font-mono">Router Type</label>
            <select
              v-model="formData.routerType"
              class="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 font-mono"
            >
              <option value="UPSTREAM">
                Upstream (BGP)
              </option>
              <option value="CORE">
                Core Management
              </option>
              <option value="DISTRIBUSI">
                Distribusi
              </option>
              <option value="WIRELESS">
                Wireless PTP
              </option>
            </select>
          </div>

          <div class="space-y-2">
            <label class="text-sm font-medium font-mono">Router Brand</label>
            <select
              v-model="formData.routerBrand"
              class="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 font-mono"
            >
              <option value="MIKROTIK">
                MikroTik
              </option>
              <option value="UBIVIQUITI">
                Ubiquiti
              </option>
            </select>
          </div>

          <div class="space-y-2">
            <label class="text-sm font-medium font-mono">Status</label>
            <select
              v-model="formData.status"
              class="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 font-mono"
            >
              <option value="ACTIVE">
                Active
              </option>
              <option value="INACTIVE">
                Inactive
              </option>
              <option value="MAINTENANCE">
                Maintenance
              </option>
            </select>
          </div>

          <div class="col-span-2 pt-2 border-t">
            <h4 class="text-sm font-semibold font-mono mb-3 text-primary">
              RouterOS Credentials
            </h4>
          </div>

          <div class="space-y-2">
            <label class="text-sm font-medium font-mono">Username *</label>
            <Input
              v-model="formData.username"
              placeholder="admin"
              required
              class="font-mono"
            />
          </div>

          <div class="space-y-2">
            <label class="text-sm font-medium font-mono">Password *</label>
            <Input
              v-model="formData.password"
              type="password"
              placeholder="••••••••"
              required
              class="font-mono"
            />
          </div>

          <div class="space-y-2">
            <label class="text-sm font-medium font-mono">API Port</label>
            <Input
              v-model.number="formData.apiPort"
              type="number"
              placeholder="8728"
              class="font-mono"
            />
          </div>

          <div class="space-y-2">
            <label class="text-sm font-medium font-mono">SSH Port</label>
            <Input
              v-model.number="formData.sshPort"
              type="number"
              placeholder="22"
              class="font-mono"
            />
          </div>
        </div>

        <div class="flex justify-end gap-3 pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            :disabled="isSubmitting"
            @click="emit('update:open', false)"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            :disabled="isSubmitting"
            class="command-btn"
          >
            {{ isSubmitting ? 'Registering...' : 'Register Device' }}
          </Button>
        </div>
      </form>
    </DialogContent>
  </Dialog>
</template>

<style scoped>
.dialog-content {
  border: 1px solid hsl(var(--border) / 0.5);
  box-shadow: 0 20px 40px -12px hsl(var(--foreground) / 0.15);
}

.command-btn {
  font-family: 'IBM Plex Mono', monospace;
  font-weight: 500;
  background: hsl(var(--primary));
  color: hsl(var(--primary-foreground));
  border: 1px solid hsl(var(--primary));
  box-shadow: 0 2px 8px -2px hsl(var(--foreground) / 0.15);
  transition: all 0.2s;
}

.command-btn:hover {
  opacity: 0.9;
  box-shadow: 0 4px 12px -2px hsl(var(--foreground) / 0.2);
  transform: translateY(-1px);
}
</style>
