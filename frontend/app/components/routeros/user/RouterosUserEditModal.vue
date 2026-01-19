<script setup lang="ts">
import type { RouterOSUser, UpdateRouterOSUserInput } from '~/stores/routeros/user'
import { ref, watch } from 'vue'
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
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { useRouterOSUserStore } from '~/stores/routeros/user'

const props = defineProps<{
  open: boolean
  user: RouterOSUser | null
  routerId: string
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  'success': []
}>()

const routerosUserStore = useRouterOSUserStore()
const isSubmitting = ref(false)

const formData = ref<UpdateRouterOSUserInput & { name: string }>({
  name: '',
  password: '',
  group: '',
  address: '',
  comment: '',
  disabled: false,
})

// Pre-fill form when user changes or dialog opens
watch([() => props.open, () => props.user], ([newOpen, newUser]) => {
  if (newOpen && newUser) {
    formData.value = {
      name: newUser.name,
      password: '', // Don't pre-fill password for security
      group: newUser.group,
      address: newUser.address || '',
      comment: newUser.comment || '',
      disabled: newUser.disabled,
    }
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
    password: '',
    group: '',
    address: '',
    comment: '',
    disabled: false,
  }
}

async function handleSubmit() {
  if (!props.user)
    return

  isSubmitting.value = true

  try {
    const updateData: UpdateRouterOSUserInput = {
      group: formData.value.group,
      address: formData.value.address,
      comment: formData.value.comment,
      disabled: formData.value.disabled,
    }

    // Only include name if it's been changed
    if (formData.value.name && formData.value.name !== props.user.name) {
      updateData.name = formData.value.name
    }

    // Only include password if user entered a new one
    if (formData.value.password && formData.value.password.trim() !== '') {
      updateData.password = formData.value.password
    }

    const result = await routerosUserStore.updateUser(props.routerId, props.user.id, updateData)

    if (result.success) {
      toast.success(result.message || 'User updated successfully')
      emit('success')
      emit('update:open', false)
    }
    else {
      toast.error(result.error || 'Failed to update user')
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
    <DialogContent class="sm:max-w-[600px]">
      <DialogHeader>
        <DialogTitle class="font-mono">
          Edit RouterOS User
        </DialogTitle>
        <DialogDescription class="font-mono text-xs">
          Update user account settings
        </DialogDescription>
      </DialogHeader>

      <form class="space-y-4 mt-4" @submit.prevent="handleSubmit">
        <div class="grid grid-cols-2 gap-4">
          <!-- Username -->
          <div class="col-span-2 space-y-2">
            <Label class="font-mono text-sm">Username</Label>
            <Input
              v-model="formData.name"
              placeholder="username"
              required
              class="font-mono"
            />
            <p class="text-xs text-muted-foreground font-mono">
              Change the username for this account
            </p>
          </div>

          <!-- Password -->
          <div class="col-span-2 space-y-2">
            <Label class="font-mono text-sm">Password</Label>
            <Input
              v-model="formData.password"
              type="password"
              placeholder="Leave blank to keep current password"
              class="font-mono"
            />
            <p class="text-xs text-muted-foreground font-mono">
              Only enter a new password if you want to change it
            </p>
          </div>

          <!-- Group -->
          <div class="space-y-2">
            <Label class="font-mono text-sm">Group</Label>
            <select
              v-model="formData.group"
              class="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 font-mono"
            >
              <option value="full">
                full (Administrator)
              </option>
              <option value="read">
                read (Read-only)
              </option>
              <option value="write">
                write (Read-write)
              </option>
            </select>
          </div>

          <!-- IP Address -->
          <div class="space-y-2">
            <Label class="font-mono text-sm">Allowed IP Address</Label>
            <Input
              v-model="formData.address"
              placeholder="0.0.0.0/0"
              class="font-mono"
            />
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
                <Label class="font-mono text-sm">Disabled Status</Label>
                <p class="text-xs text-muted-foreground font-mono">
                  {{ formData.disabled ? 'User is currently disabled and cannot login' : 'User is currently enabled' }}
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
            {{ isSubmitting ? 'Updating...' : 'Update User' }}
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
