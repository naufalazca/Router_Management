<script setup lang="ts">
import type { CreateRouterInput } from '~/stores/router'
import { Building2, KeyRound, Monitor, Network } from 'lucide-vue-next'
import { computed, onMounted, ref, watch } from 'vue'
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
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { useCompanyStore } from '~/stores/company'
import { useRouterStore } from '~/stores/router'
import { type RouterFormErrors, validateField, validateRouterForm } from '~/composables/validator/router/useRouterValidation'

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
const errors = ref<RouterFormErrors>({})

const touched = ref<Record<string, boolean>>({})

function touch(field: string) {
  touched.value[field] = true
  errors.value = validateRouterForm(formData.value)
}

// Re-validate a field as the user types (after it has been touched once)
function revalidate(field: keyof RouterFormErrors) {
  if (touched.value[field]) {
    const error = validateField(field, formData.value)
    if (error)
      errors.value[field] = error
    else
      delete errors.value[field]
  }
}

function showFieldError(field: keyof RouterFormErrors) {
  return touched.value[field] ? errors.value[field] : undefined
}

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

const NONE = '__none__'

const companyIdProxy = computed({
  get: () => formData.value.companyId || NONE,
  set: (val: string) => {
    formData.value.companyId = val === NONE ? '' : val
  },
})

const routerTypes = [
  { value: 'UPSTREAM', label: 'Upstream (BGP)' },
  { value: 'CORE', label: 'Core Management' },
  { value: 'DISTRIBUSI', label: 'Distribusi' },
  { value: 'WIRELESS', label: 'Wireless PTP' },
]

const routerBrands = [
  { value: 'MIKROTIK', label: 'MikroTik' },
  { value: 'UBIVIQUITI', label: 'Ubiquiti' },
]

const statuses = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'INACTIVE', label: 'Inactive' },
  { value: 'MAINTENANCE', label: 'Maintenance' },
]

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
  errors.value = {}
  touched.value = {}
}

async function handleSubmit() {
  errors.value = validateRouterForm(formData.value)
  touched.value = Object.fromEntries(Object.keys(formData.value).map(k => [k, true]))

  if (Object.keys(errors.value).length > 0) {
    const firstError = Object.values(errors.value)[0]
    toast.error(firstError || 'Please fix the highlighted fields before submitting')
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

      // Map backend field errors (Zod validation) onto the form fields
      const fieldErrors = (result as { fieldErrors?: Record<string, string> }).fieldErrors
      if (fieldErrors) {
        for (const [field, message] of Object.entries(fieldErrors)) {
          errors.value[field as keyof RouterFormErrors] = message
          touched.value[field] = true
        }
      }
    }
  }
  catch {
    toast.error('An unexpected error occurred')
  }
  finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <Dialog :open="props.open" @update:open="(val) => emit('update:open', val)">
    <DialogContent class="sm:max-w-[640px] max-h-[90vh] overflow-y-auto dialog-content">
      <DialogHeader>
        <DialogTitle class="font-mono">
          Register New Device
        </DialogTitle>
        <DialogDescription class="font-mono text-xs">
          Configure network device parameters
        </DialogDescription>
      </DialogHeader>

      <form class="space-y-6 mt-2" novalidate @submit.prevent="handleSubmit">
        <!-- Identity -->
        <div class="space-y-3">
          <div class="flex items-center gap-2 text-xs font-medium text-muted-foreground font-mono uppercase tracking-wider">
            <Monitor class="h-3.5 w-3.5" />
            Device Identity
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div class="col-span-2 space-y-1.5">
              <Label class="text-sm">Device Name <span class="text-destructive">*</span></Label>
              <Input
                v-model="formData.name"
                placeholder="Router-01"
                required
                class="font-mono"
                :class="{ 'border-destructive': showFieldError('name') }"
                @blur="touch('name')"
                @input="revalidate('name')"
              />
              <p v-if="showFieldError('name')" class="text-xs text-destructive">
                {{ showFieldError('name') }}
              </p>
            </div>
            <div class="space-y-1.5">
              <Label class="text-sm">Model</Label>
              <Input
                v-model="formData.model"
                placeholder="RB4011"
                class="font-mono"
              />
            </div>
            <div class="space-y-1.5">
              <Label class="text-sm">Location</Label>
              <Input
                v-model="formData.location"
                placeholder="Main Office"
                class="font-mono"
              />
            </div>
          </div>
        </div>

        <Separator />

        <!-- Network -->
        <div class="space-y-3">
          <div class="flex items-center gap-2 text-xs font-medium text-muted-foreground font-mono uppercase tracking-wider">
            <Network class="h-3.5 w-3.5" />
            Network Configuration
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div class="space-y-1.5">
              <Label class="text-sm">IP Address / Hostname <span class="text-destructive">*</span></Label>
              <Input
                v-model="formData.ipAddress"
                placeholder="192.168.1.1 or aaa.sabawave.net"
                required
                class="font-mono"
                :class="{ 'border-destructive': showFieldError('ipAddress') }"
                @blur="touch('ipAddress')"
                @input="revalidate('ipAddress')"
              />
              <p v-if="showFieldError('ipAddress')" class="text-xs text-destructive">
                {{ showFieldError('ipAddress') }}
              </p>
            </div>
            <div class="space-y-1.5">
              <Label class="text-sm">MAC Address</Label>
              <Input
                v-model="formData.macAddress"
                placeholder="00:00:00:00:00:00"
                class="font-mono"
                :class="{ 'border-destructive': showFieldError('macAddress') }"
                @blur="touch('macAddress')"
                @input="revalidate('macAddress')"
              />
              <p v-if="showFieldError('macAddress')" class="text-xs text-destructive">
                {{ showFieldError('macAddress') }}
              </p>
            </div>
          </div>
        </div>

        <Separator />

        <!-- Management -->
        <div class="space-y-3">
          <div class="flex items-center gap-2 text-xs font-medium text-muted-foreground font-mono uppercase tracking-wider">
            <Building2 class="h-3.5 w-3.5" />
            Management
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div class="space-y-1.5">
              <Label class="text-sm">Company</Label>
              <Select v-model="companyIdProxy">
                <SelectTrigger class="font-mono">
                  <SelectValue placeholder="No Company (Standalone)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem :value="NONE">
                    No Company (Standalone)
                  </SelectItem>
                  <SelectItem
                    v-for="company in companyStore.companies"
                    :key="company.id"
                    :value="company.id"
                  >
                    {{ company.name }} ({{ company.code }})
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div class="space-y-1.5">
              <Label class="text-sm">Router Type</Label>
              <Select v-model="formData.routerType">
                <SelectTrigger class="font-mono">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem
                    v-for="type in routerTypes"
                    :key="type.value"
                    :value="type.value"
                  >
                    {{ type.label }}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div class="space-y-1.5">
              <Label class="text-sm">Router Brand</Label>
              <Select v-model="formData.routerBrand">
                <SelectTrigger class="font-mono">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem
                    v-for="brand in routerBrands"
                    :key="brand.value"
                    :value="brand.value"
                  >
                    {{ brand.label }}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div class="space-y-1.5">
              <Label class="text-sm">Status</Label>
              <Select v-model="formData.status">
                <SelectTrigger class="font-mono">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem
                    v-for="status in statuses"
                    :key="status.value"
                    :value="status.value"
                  >
                    {{ status.label }}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <Separator />

        <!-- Credentials -->
        <div class="space-y-3">
          <div class="flex items-center gap-2 text-xs font-medium text-muted-foreground font-mono uppercase tracking-wider">
            <KeyRound class="h-3.5 w-3.5" />
            RouterOS Credentials
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div class="space-y-1.5">
              <Label class="text-sm">Username <span class="text-destructive">*</span></Label>
              <Input
                v-model="formData.username"
                placeholder="admin"
                required
                class="font-mono"
              />
            </div>
            <div class="space-y-1.5">
              <Label class="text-sm">Password <span class="text-destructive">*</span></Label>
              <Input
                v-model="formData.password"
                type="password"
                placeholder="••••••••"
                required
                class="font-mono"
              />
            </div>
            <div class="space-y-1.5">
              <Label class="text-sm">API Port</Label>
              <Input
                v-model.number="formData.apiPort"
                type="number"
                placeholder="8728"
                class="font-mono"
                :class="{ 'border-destructive': showFieldError('apiPort') }"
                @blur="touch('apiPort')"
                @input="revalidate('apiPort')"
              />
              <p v-if="showFieldError('apiPort')" class="text-xs text-destructive">
                {{ showFieldError('apiPort') }}
              </p>
            </div>
            <div class="space-y-1.5">
              <Label class="text-sm">SSH Port</Label>
              <Input
                v-model.number="formData.sshPort"
                type="number"
                placeholder="22"
                class="font-mono"
                :class="{ 'border-destructive': showFieldError('sshPort') }"
                @blur="touch('sshPort')"
                @input="revalidate('sshPort')"
              />
              <p v-if="showFieldError('sshPort')" class="text-xs text-destructive">
                {{ showFieldError('sshPort') }}
              </p>
            </div>
          </div>
        </div>

        <div class="flex justify-end gap-3 pt-2">
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
