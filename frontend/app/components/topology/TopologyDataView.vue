<script setup lang="ts">
import { computed } from 'vue'
import type { TopologyNode, TopologyEdge } from '~/stores/router/router.topology'
import { useTopologyStore } from '~/stores/router/router.topology'

// Use store directly for reactive data
const topologyStore = useTopologyStore()

// Computed stats - using topologyStore data directly
const activeRouters = computed(() =>
  topologyStore.topology.nodes.filter(n => n.status === 'ACTIVE').length
)

const inactiveRouters = computed(() =>
  topologyStore.topology.nodes.filter(n => n.status === 'INACTIVE').length
)

const maintenanceRouters = computed(() =>
  topologyStore.topology.nodes.filter(n => n.status === 'MAINTENANCE').length
)

const activeConnections = computed(() =>
  topologyStore.topology.edges.filter(e => e.linkStatus === 'ACTIVE').length
)

const plannedConnections = computed(() =>
  topologyStore.topology.edges.filter(e => e.linkStatus === 'PLANNED').length
)

const inactiveConnections = computed(() =>
  topologyStore.topology.edges.filter(e => e.linkStatus === 'INACTIVE').length
)

// Router type counts
const routerTypeCounts = computed(() => {
  const counts: Record<string, number> = {}
  topologyStore.topology.nodes.forEach(node => {
    counts[node.routerType] = (counts[node.routerType] || 0) + 1
  })
  return counts
})

// Connection type counts
const connectionTypeCounts = computed(() => {
  const counts: Record<string, number> = {}
  topologyStore.topology.edges.forEach(edge => {
    counts[edge.linkType] = (counts[edge.linkType] || 0) + 1
  })
  return counts
})
</script>

<template>
  <div class="space-y-6">
    <!-- Stats Cards -->
    <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <!-- Active Routers -->
      <div class="rounded-lg border bg-card p-4">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-muted-foreground">Active Routers</p>
            <p class="text-2xl font-bold text-green-600 mt-1">
              {{ activeRouters }}
            </p>
          </div>
          <div class="rounded-full bg-green-100 p-3">
            <svg class="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>
      </div>

      <!-- Inactive Routers -->
      <div class="rounded-lg border bg-card p-4">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-muted-foreground">Inactive Routers</p>
            <p class="text-2xl font-bold text-red-600 mt-1">
              {{ inactiveRouters }}
            </p>
          </div>
          <div class="rounded-full bg-red-100 p-3">
            <svg class="h-5 w-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
        </div>
      </div>

      <!-- Active Connections -->
      <div class="rounded-lg border bg-card p-4">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-muted-foreground">Active Links</p>
            <p class="text-2xl font-bold text-blue-600 mt-1">
              {{ activeConnections }}
            </p>
          </div>
          <div class="rounded-full bg-blue-100 p-3">
            <svg class="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
          </div>
        </div>
      </div>

      <!-- Planned Connections -->
      <div class="rounded-lg border bg-card p-4">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-muted-foreground">Planned Links</p>
            <p class="text-2xl font-bold text-gray-600 mt-1">
              {{ plannedConnections }}
            </p>
          </div>
          <div class="rounded-full bg-gray-100 p-3">
            <svg class="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
      </div>
    </div>

    <!-- Detailed Stats Grid -->
    <div class="grid gap-4 md:grid-cols-2">
      <!-- Router Types -->
      <div class="rounded-lg border bg-card p-4">
        <h3 class="text-sm font-semibold mb-4">Router Types</h3>
        <div class="space-y-3">
          <div
            v-for="(count, type) in routerTypeCounts"
            :key="type"
            class="flex items-center justify-between"
          >
            <div class="flex items-center gap-2">
              <div
                class="h-3 w-3 rounded-full"
                :class="{
                  'bg-blue-500': type === 'UPSTREAM',
                  'bg-green-500': type === 'CORE',
                  'bg-purple-500': type === 'DISTRIBUSI',
                  'bg-orange-500': type === 'WIRELESS',
                }"
              />
              <span class="text-sm">{{ type }}</span>
            </div>
            <span class="text-sm font-medium">{{ count }}</span>
          </div>
          <div v-if="Object.keys(routerTypeCounts).length === 0" class="text-sm text-muted-foreground">
            No routers
          </div>
        </div>
      </div>

      <!-- Connection Types -->
      <div class="rounded-lg border bg-card p-4">
        <h3 class="text-sm font-semibold mb-4">Connection Types</h3>
        <div class="space-y-3">
          <div
            v-for="(count, type) in connectionTypeCounts"
            :key="type"
            class="flex items-center justify-between"
          >
            <div class="flex items-center gap-2">
              <div
                class="h-0.5 w-6 rounded"
                :class="{
                  'bg-green-500': type === 'ETHERNET',
                  'bg-blue-500': type === 'FIBER',
                  'bg-orange-500': type === 'WIRELESS',
                  'bg-purple-500': type === 'VPN',
                }"
              />
              <span class="text-sm">{{ type }}</span>
            </div>
            <span class="text-sm font-medium">{{ count }}</span>
          </div>
          <div v-if="Object.keys(connectionTypeCounts).length === 0" class="text-sm text-muted-foreground">
            No connections
          </div>
        </div>
      </div>
    </div>

    <!-- Maintenance Routers Alert -->
    <div
      v-if="maintenanceRouters > 0"
      class="rounded-lg border border-yellow-200 bg-yellow-50 p-4"
    >
      <div class="flex items-center gap-3">
        <svg class="h-5 w-5 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <div>
          <p class="text-sm font-medium text-yellow-800">
            {{ maintenanceRouters }} router(s) in maintenance mode
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
