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
  <div class="header-grid">
    <div class="space-y-1">
      <div class="flex items-center gap-3">
        <div class="status-pulse">
          <Server class="h-6 w-6" />
        </div>
        <h1 class="text-3xl font-bold tracking-tight terminal-text">
          Network Devices
        </h1>
      </div>
      <p class="text-muted-foreground text-sm font-mono">
        {{ totalDevices }} devices registered / {{ activeDevices }} online
      </p>
    </div>

    <div class="flex items-center gap-3">
      <div class="search-container">
        <Search class="search-icon h-4 w-4" />
        <Input
          :model-value="searchQuery"
          @update:model-value="emit('update:searchQuery', $event)"
          placeholder="Search devices..."
          class="search-input font-mono"
        />
      </div>
      <Button @click="emit('openCreateDialog')" class="command-btn gap-2">
        <Plus class="h-4 w-4" />
        <span class="hidden sm:inline">Add Device</span>
      </Button>
    </div>
  </div>
</template>

<style scoped>
/* Header Grid */
.header-grid {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 1rem;
  align-items: start;
}

/* Status Pulse Animation */
.status-pulse {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.5rem;
  height: 2.5rem;
  background: linear-gradient(135deg, hsl(var(--primary) / 0.1), hsl(var(--primary) / 0.05));
  border-radius: 0.5rem;
  border: 1px solid hsl(var(--primary) / 0.2);
}

.status-pulse::before {
  content: '';
  position: absolute;
  inset: -4px;
  border-radius: 0.625rem;
  background: linear-gradient(135deg, hsl(var(--primary) / 0.3), transparent);
  opacity: 0;
  animation: pulse-ring 2s ease-out infinite;
}

@keyframes pulse-ring {
  0% { opacity: 0; transform: scale(0.95); }
  50% { opacity: 1; }
  100% { opacity: 0; transform: scale(1.1); }
}

/* Search Container */
.search-container {
  position: relative;
  width: 280px;
}

.search-icon {
  position: absolute;
  left: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  color: hsl(var(--muted-foreground));
  pointer-events: none;
}

.search-input {
  padding-left: 2.5rem;
  background: hsl(var(--muted) / 0.3);
  border: 1px solid hsl(var(--border) / 0.5);
  transition: all 0.2s;
}

.search-input:focus {
  background: hsl(var(--background));
  border-color: hsl(var(--primary) / 0.5);
  box-shadow: 0 0 0 3px hsl(var(--primary) / 0.1);
}

/* Command Button */
.command-btn {
  font-family: 'IBM Plex Mono', monospace;
  font-weight: 500;
  background: linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.8));
  border: 1px solid hsl(var(--primary) / 0.3);
  box-shadow: 0 2px 8px -2px hsl(var(--primary) / 0.3);
  transition: all 0.2s;
}

.command-btn:hover {
  box-shadow: 0 4px 16px -4px hsl(var(--primary) / 0.4);
  transform: translateY(-1px);
}

.terminal-text {
  font-family: 'Outfit', sans-serif;
  letter-spacing: -0.02em;
}

/* Responsive */
@media (max-width: 640px) {
  .header-grid {
    grid-template-columns: 1fr;
  }

  .search-container {
    width: 100%;
  }
}
</style>
