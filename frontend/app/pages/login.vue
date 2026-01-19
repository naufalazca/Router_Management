<script setup lang="ts">
import { ref } from 'vue'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { toast } from 'vue-sonner'
import { useAuthStore } from '~/stores/auth'

definePageMeta({
  layout: false,
})

const authStore = useAuthStore()
const router = useRouter()

const username = ref('')
const password = ref('')
const isLoading = ref(false)

async function handleLogin() {
  if (!username.value || !password.value) {
    toast.error('Please fill in all fields')
    return
  }

  isLoading.value = true

  try {
    const result = await authStore.login(username.value, password.value)

    if (result.success) {
      toast.success('Login successful!')
      router.push('/')
    } else {
      toast.error(result.error || 'Login failed')
    }
  } catch (error) {
    toast.error('An unexpected error occurred')
  } finally {
    isLoading.value = false
  }
}

function handleKeyPress(event: KeyboardEvent) {
  if (event.key === 'Enter') {
    handleLogin()
  }
}
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-background p-4">
    <Card class="w-full max-w-md">
      <CardHeader>
        <CardTitle class="text-center text-2xl">
          MikroTik Router Management
        </CardTitle>
        <p class="text-muted-foreground text-center text-sm">
          Sign in to your account to continue
        </p>
      </CardHeader>
      <CardContent>
        <form @submit.prevent="handleLogin" class="space-y-4">
          <div class="space-y-2">
            <label for="username" class="text-sm font-medium">
              Username
            </label>
            <Input
              id="username"
              v-model="username"
              type="text"
              placeholder="Enter your username"
              :disabled="isLoading"
              @keypress="handleKeyPress"
              autocomplete="username"
            />
          </div>

          <div class="space-y-2">
            <label for="password" class="text-sm font-medium">
              Password
            </label>
            <Input
              id="password"
              v-model="password"
              type="password"
              placeholder="Enter your password"
              :disabled="isLoading"
              @keypress="handleKeyPress"
              autocomplete="current-password"
            />
          </div>

          <Button
            type="submit"
            class="w-full"
            :disabled="isLoading"
          >
            {{ isLoading ? 'Signing in...' : 'Sign in' }}
          </Button>
        </form>
      </CardContent>
    </Card>
  </div>
</template>
