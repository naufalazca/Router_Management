<script setup lang="ts">
import { Plus, Search, Server } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

defineProps<{
  totalDevices: number
  activeDevices: number
  searchQuery: string
}>()

const emit = defineEmits<{
  'update:searchQuery': [value: string]
  'openCreateDialog': []
}>()
</script>

<template>
  <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
    <div class="space-y-1">
      <div class="flex items-center gap-3">
        <div class="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 border border-primary/20">
          <Server class="h-5 w-5 text-primary" />
        </div>
        <h1 class="text-3xl font-bold tracking-tight">
          Network Devices
        </h1>
      </div>
      <p class="text-sm text-muted-foreground">
        {{ totalDevices }} devices registered / {{ activeDevices }} online
      </p>
    </div>

    <div class="flex items-center gap-3">
      <div class="relative w-full sm:w-[280px]">
        <Search class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          :model-value="searchQuery"
          placeholder="Search devices..."
          class="pl-9"
          @update:model-value="emit('update:searchQuery', $event)"
        />
      </div>
      <Button class="gap-2" @click="emit('openCreateDialog')">
        <Plus class="h-4 w-4" />
        <span class="hidden sm:inline">Add Device</span>
      </Button>
    </div>
  </div>
</template>
