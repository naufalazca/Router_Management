<script setup lang="ts">
import type { SwitchFormErrors } from '~/composables/validator/switch/useSwitchValidation'
import type { CreateSwitchInput } from '~/stores/switch'
import { Building2, KeyRound, Network, RadioTower } from 'lucide-vue-next'
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
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { validateSwitchField, validateSwitchForm } from '~/composables/validator/switch/useSwitchValidation'
import { useCompanyStore } from '~/stores/company'
import { useSwitchStore } from '~/stores/switch'

const props = defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  'success': []
}>()

const switchStore = useSwitchStore()
const companyStore = useCompanyStore()
const isSubmitting = ref(false)
const errors = ref<SwitchFormErrors>({})

const touched = ref<Record<string, boolean>>({})

const formData = ref<CreateSwitchInput>({
  name: '',
  ipAddress: '',
  macAddress: '',
  model: '',
  location: '',
  portCount: undefined,
  status: 'ACTIVE',
  brand: 'MIKROTIK',
  companyId: '',
  username: 'admin',
  password: '',
  apiPort: 8728,
  sshPort: 22,
})

function touch(field: string) {
  touched.value[field] = true
  errors.value = validateSwitchForm(formData.value)
}

// Re-validate a field as the user types (after it has been touched once)
function revalidate(field: keyof SwitchFormErrors) {
  if (touched.value[field]) {
    const error = validateSwitchField(field, formData.value)
    if (error)
      errors.value[field] = error
    else
      delete errors.value[field]
  }
}

function showFieldError(field: keyof SwitchFormErrors) {
  return touched.value[field] ? errors.value[field] : undefined
}

const brands = [
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
    portCount: undefined,
    status: 'ACTIVE',
    brand: 'MIKROTIK',
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
  errors.value = validateSwitchForm(formData.value)
  touched.value = Object.fromEntries(Object.keys(formData.value).map(k => [k, true]))

  if (Object.keys(errors.value).length > 0) {
    const firstError = Object.values(errors.value)[0]
    toast.error(firstError || 'Please fix the highlighted fields before submitting')
    return
  }

  isSubmitting.value = true

  try {
    const result = await switchStore.createSwitch(formData.value)

    if (result.success) {
      emit('success')
      emit('update:open', false)
    }
    else {
      toast.error(result.error || 'Failed to create switch')

      // Map backend field errors (Zod validation) onto the form fields
      const fieldErrors = (result as { fieldErrors?: Record<string, string> }).fieldErrors
      if (fieldErrors) {
        for (const [field, message] of Object.entries(fieldErrors)) {
          errors.value[field as keyof SwitchFormErrors] = message
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
          Register New Switch
        </DialogTitle>
        <DialogDescription class="font-mono text-xs">
          Configure network switch parameters
        </DialogDescription>
      </DialogHeader>

      <form class="space-y-6 mt-2" novalidate @submit.prevent="handleSubmit">
        <!-- Identity -->
        <div class="space-y-3">
          <div class="flex items-center gap-2 text-xs font-medium text-muted-foreground font-mono uppercase tracking-wider">
            <RadioTower class="h-3.5 w-3.5" />
            Switch Identity
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div class="col-span-2 space-y-1.5">
              <Label class="text-sm">Switch Name <span class="text-destructive">*</span></Label>
              <Input
                v-model="formData.name"
                placeholder="Switch-01"
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
                placeholder="CRS326"
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
            <div class="space-y-1.5">
              <Label class="text-sm">Port Count</Label>
              <Input
                v-model.number="formData.portCount"
                type="number"
                placeholder="24"
                class="font-mono"
                :class="{ 'border-destructive': showFieldError('portCount') }"
                @blur="touch('portCount')"
                @input="revalidate('portCount')"
              />
              <p v-if="showFieldError('portCount')" class="text-xs text-destructive">
                {{ showFieldError('portCount') }}
              </p>
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
                placeholder="192.168.1.2 or aaa.sabawave.net"
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
              <Label class="text-sm">Company <span class="text-destructive">*</span></Label>
              <Select v-model="formData.companyId">
                <SelectTrigger class="font-mono">
                  <SelectValue placeholder="Select a company" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem
                    v-for="company in companyStore.companies"
                    :key="company.id"
                    :value="company.id"
                  >
                    {{ company.name }} ({{ company.code }})
                  </SelectItem>
                </SelectContent>
              </Select>
              <p v-if="showFieldError('companyId')" class="text-xs text-destructive">
                {{ showFieldError('companyId') }}
              </p>
            </div>
            <div class="space-y-1.5">
              <Label class="text-sm">Brand</Label>
              <Select v-model="formData.brand">
                <SelectTrigger class="font-mono">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem
                    v-for="brand in brands"
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
                :class="{ 'border-destructive': showFieldError('username') }"
                @blur="touch('username')"
                @input="revalidate('username')"
              />
              <p v-if="showFieldError('username')" class="text-xs text-destructive">
                {{ showFieldError('username') }}
              </p>
            </div>
            <div class="space-y-1.5">
              <Label class="text-sm">Password <span class="text-destructive">*</span></Label>
              <Input
                v-model="formData.password"
                type="password"
                placeholder="••••••••"
                required
                class="font-mono"
                :class="{ 'border-destructive': showFieldError('password') }"
                @blur="touch('password')"
                @input="revalidate('password')"
              />
              <p v-if="showFieldError('password')" class="text-xs text-destructive">
                {{ showFieldError('password') }}
              </p>
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
            {{ isSubmitting ? 'Registering...' : 'Register Switch' }}
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
