<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRouterOSUserStore, type CreateRouterOSUserInput } from '~/stores/routeros/user'
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
import { Switch } from '@/components/ui/switch'
import { toast } from 'vue-sonner'

const props = defineProps<{
  open: boolean
  routerId: string
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  'success': []
}>()

const routerosUserStore = useRouterOSUserStore()
const isSubmitting = ref(false)

const formData = ref<CreateRouterOSUserInput>({
  name: '',
  password: '',
  group: 'full',
  address: '',
  comment: '',
  disabled: false
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
    password: '',
    group: 'full',
    address: '',
    comment: '',
    disabled: false
  }
}

async function handleSubmit() {
  // Validation
  if (!formData.value.name || !formData.value.password) {
    toast.error('Username and password are required')
    return
  }

  isSubmitting.value = true

  try {
    const result = await routerosUserStore.createUser(props.routerId, formData.value)

    if (result.success) {
      toast.success(result.message || 'User created successfully')
      emit('success')
      emit('update:open', false)
    } else {
      toast.error(result.error || 'Failed to create user')
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
        <DialogTitle class="font-mono">Create RouterOS User</DialogTitle>
        <DialogDescription class="font-mono text-xs">
          Add a new user account to the MikroTik router
        </DialogDescription>
      </DialogHeader>

      <form @submit.prevent="handleSubmit" class="space-y-4 mt-4">
        <div class="grid grid-cols-2 gap-4">
          <!-- Username -->
          <div class="col-span-2 space-y-2">
            <Label class="font-mono text-sm">Username *</Label>
            <Input
              v-model="formData.name"
              placeholder="newuser"
              required
              class="font-mono"
            />
          </div>

          <!-- Password -->
          <div class="col-span-2 space-y-2">
            <Label class="font-mono text-sm">Password *</Label>
            <Input
              v-model="formData.password"
              type="password"
              placeholder="••••••••"
              required
              class="font-mono"
            />
            <p class="text-xs text-muted-foreground font-mono">Strong password recommended</p>
          </div>

          <!-- Group -->
          <div class="space-y-2">
            <Label class="font-mono text-sm">Group</Label>
            <select
              v-model="formData.group"
              class="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 font-mono"
            >
              <option value="full">full (Administrator)</option>
              <option value="read">read (Read-only)</option>
              <option value="write">write (Read-write)</option>
            </select>
            <p class="text-xs text-muted-foreground font-mono">User permission group</p>
          </div>

          <!-- IP Address -->
          <div class="space-y-2">
            <Label class="font-mono text-sm">Allowed IP Address</Label>
            <Input
              v-model="formData.address"
              placeholder="0.0.0.0/0"
              class="font-mono"
            />
            <p class="text-xs text-muted-foreground font-mono">Leave empty for any IP</p>
          </div>

          <!-- Comment -->
          <div class="col-span-2 space-y-2">
            <Label class="font-mono text-sm">Comment</Label>
            <Textarea
              v-model="formData.comment"
              placeholder="Additional notes about this user..."
              class="font-mono resize-none"
              rows="2"
            />
          </div>

          <!-- Disabled Switch -->
          <div class="col-span-2 space-y-2">
            <div class="flex items-center justify-between rounded-lg border border-border/50 p-4">
              <div class="space-y-0.5">
                <Label class="font-mono text-sm">Create as Disabled</Label>
                <p class="text-xs text-muted-foreground font-mono">
                  User will be created but won't be able to login until enabled
                </p>
              </div>
              <Switch
                :checked="formData.disabled"
                @update:checked="(val) => formData.disabled = val"
              />
            </div>
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
            {{ isSubmitting ? 'Creating...' : 'Create User' }}
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
