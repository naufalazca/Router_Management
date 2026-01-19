<script setup lang="ts">
import { Rocket } from 'lucide-vue-next'
import { useAuthStore } from '~/stores/auth'

const authStore = useAuthStore()
</script>

<template>
  <div class="flex min-h-[calc(100vh-200px)] items-center justify-center">
    <div class="flex flex-col items-center gap-6 text-center">
      <div class="rounded-full bg-primary/10 p-6">
        <Rocket class="h-16 w-16 text-primary" />
      </div>

      <div class="space-y-2">
        <h1 class="text-4xl font-bold tracking-tight">
          Coming Soon
        </h1>
        <p class="text-muted-foreground text-lg">
          MikroTik Router Management Dashboard
        </p>
      </div>

      <div class="text-muted-foreground max-w-md space-y-1 text-sm">
        <p>We're working hard to bring you an amazing dashboard experience.</p>
        <p>Monitor and manage your MikroTik routers from one centralized location.</p>
      </div>

      <div class="bg-muted/50 rounded-lg p-4">
        <p class="text-muted-foreground text-sm">
          Logged in as <span class="font-semibold text-foreground">{{ authStore.user?.username }}</span>
        </p>
      </div>
    </div>
  </div>
</template>
