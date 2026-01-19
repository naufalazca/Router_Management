<script setup lang="ts">
import { Plus, RefreshCw, Search } from 'lucide-vue-next'
import { ref } from 'vue'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'

defineProps<{
  searchQuery: string
}>()

const emit = defineEmits<{
  'update:searchQuery': [value: string]
  'open-generate-dialog': []
  'refresh': []
}>()

const isRefreshing = ref(false)

async function handleRefresh() {
  isRefreshing.value = true
  emit('refresh')
  setTimeout(() => {
    isRefreshing.value = false
  }, 1000)
}
</script>

<template>
  <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
    <!-- Title & Description -->
    <div>
      <h1 class="text-3xl font-bold tracking-tight">
        Router Backups
      </h1>
      <p class="text-muted-foreground mt-1">
        Manage and restore router configuration backups
      </p>
    </div>

    <!-- Actions -->
    <div class="flex items-center gap-2">
      <!-- Search -->
      <div class="relative w-full md:w-64">
        <Search class="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search backups..."
          class="pl-8"
          :model-value="searchQuery"
          @update:model-value="emit('update:searchQuery', $event)"
        />
      </div>

      <!-- Refresh Button -->
      <Button
        variant="outline"
        size="icon"
        :disabled="isRefreshing"
        @click="handleRefresh"
      >
        <RefreshCw class="h-4 w-4" :class="[isRefreshing && 'animate-spin']" />
      </Button>

      <!-- Generate Backup Button -->
      <Button @click="emit('open-generate-dialog')">
        <Plus class="mr-2 h-4 w-4" />
        Generate Backup
      </Button>
    </div>
  </div>
</template>
