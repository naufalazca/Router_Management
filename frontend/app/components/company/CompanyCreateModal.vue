<script setup lang="ts">
import { ref, watch } from 'vue'
import { useCompanyStore, type CreateCompanyInput } from '~/stores/company'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { toast } from 'vue-sonner'

const props = defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  'success': []
}>()

const companyStore = useCompanyStore()
const isSubmitting = ref(false)

const formData = ref<CreateCompanyInput>({
  name: '',
  code: '',
  address: '',
  description: '',
  logo: '',
  masterUsername: '',
  masterPassword: ''
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
    code: '',
    address: '',
    description: '',
    logo: '',
    masterUsername: '',
    masterPassword: ''
  }
}

async function handleSubmit() {
  // Validation
  if (!formData.value.name || !formData.value.code || !formData.value.address ||
      !formData.value.masterUsername || !formData.value.masterPassword) {
    toast.error('Please fill in all required fields')
    return
  }

  isSubmitting.value = true

  try {
    const result = await companyStore.createCompany(formData.value)

    if (result.success) {
      emit('success')
      emit('update:open', false)
    } else {
      toast.error(result.error || 'Failed to create company')
    }
  } catch (error) {
    toast.error('An unexpected error occurred')
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <Dialog :open="props.open" @update:open="(val) => emit('update:open', val)">
    <DialogContent class="sm:max-w-[600px]">
      <DialogHeader>
        <DialogTitle class="font-mono">Create New Company</DialogTitle>
        <DialogDescription class="font-mono text-xs">
          Register a new company with master credentials for router management
        </DialogDescription>
      </DialogHeader>

      <form @submit.prevent="handleSubmit" class="space-y-4 mt-4">
        <div class="grid grid-cols-2 gap-4">
          <!-- Company Name -->
          <div class="col-span-2 space-y-2">
            <Label class="font-mono text-sm">Company Name *</Label>
            <Input
              v-model="formData.name"
              placeholder="PT Example Company"
              required
              class="font-mono"
            />
          </div>

          <!-- Company Code -->
          <div class="space-y-2">
            <Label class="font-mono text-sm">Company Code *</Label>
            <Input
              v-model="formData.code"
              placeholder="EXAMPLE-001"
              required
              class="font-mono uppercase"
              @input="(e: any) => formData.code = e.target.value.toUpperCase()"
            />
            <p class="text-xs text-muted-foreground font-mono">Uppercase letters, numbers, hyphens, underscores</p>
          </div>

          <!-- Master Username -->
          <div class="space-y-2">
            <Label class="font-mono text-sm">Master Username *</Label>
            <Input
              v-model="formData.masterUsername"
              placeholder="admin"
              required
              class="font-mono"
            />
          </div>

          <!-- Master Password -->
          <div class="col-span-2 space-y-2">
            <Label class="font-mono text-sm">Master Password *</Label>
            <Input
              v-model="formData.masterPassword"
              type="password"
              placeholder="••••••••"
              required
              class="font-mono"
            />
            <p class="text-xs text-muted-foreground font-mono">Default credentials for all routers in this company</p>
          </div>

          <!-- Address -->
          <div class="col-span-2 space-y-2">
            <Label class="font-mono text-sm">Address *</Label>
            <Textarea
              v-model="formData.address"
              placeholder="Street, City, Province, Postal Code"
              required
              class="font-mono resize-none"
              rows="2"
            />
          </div>

          <!-- Description -->
          <div class="col-span-2 space-y-2">
            <Label class="font-mono text-sm">Description</Label>
            <Textarea
              v-model="formData.description"
              placeholder="Additional notes about this company..."
              class="font-mono resize-none"
              rows="2"
            />
          </div>

          <!-- Logo URL -->
          <div class="col-span-2 space-y-2">
            <Label class="font-mono text-sm">Logo URL</Label>
            <Input
              v-model="formData.logo"
              type="url"
              placeholder="https://example.com/logo.png"
              class="font-mono"
            />
          </div>
        </div>

        <div class="flex justify-end gap-3 pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            @click="emit('update:open', false)"
            :disabled="isSubmitting"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            :disabled="isSubmitting"
            class="command-btn"
          >
            {{ isSubmitting ? 'Creating...' : 'Create Company' }}
          </Button>
        </div>
      </form>
    </DialogContent>
  </Dialog>
</template>

<style scoped>
.command-btn {
  font-family: 'IBM Plex Mono', monospace;
  font-weight: 500;
}
</style>
