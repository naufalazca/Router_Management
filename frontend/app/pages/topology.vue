<script setup lang="ts">
import { onMounted, ref, watch, computed } from 'vue'
import { toast } from 'vue-sonner'
import { useTopologyStore } from '~/stores/router/router.topology'
import { useCompanyStore, type Company } from '~/stores/company'
import TopologyView from '~/components/topology/TopologyView.vue'

const topologyStore = useTopologyStore()
const companyStore = useCompanyStore()

// State
const selectedCompanyId = ref<string | undefined>(undefined)
const isLoadingTopology = ref(false)
const isLoadingCompanies = ref(false)

// Get selected company name
const selectedCompanyName = computed(() => {
  if (!selectedCompanyId.value) return null
  return companyStore.companies.find((c: Company) => c.id === selectedCompanyId.value)?.name
})

// Fetch companies on mount
onMounted(async () => {
  isLoadingCompanies.value = true
  try {
    await companyStore.fetchCompanies()
  } finally {
    isLoadingCompanies.value = false
  }
})

// Watch for company selection changes - only fetch when company is selected
watch(selectedCompanyId, async (newCompanyId) => {
  if (newCompanyId) {
    isLoadingTopology.value = true
    try {
      await topologyStore.fetchTopology(newCompanyId)
    } finally {
      isLoadingTopology.value = false
    }
  } else {
    // Clear topology when no company selected
    topologyStore.topology = { nodes: [], edges: [] }
  }
})

// Handle refresh
async function handleRefresh() {
  if (!selectedCompanyId.value) return
  isLoadingTopology.value = true
  try {
    await topologyStore.fetchTopology(selectedCompanyId.value)
    toast.success('Topology refreshed')
  } catch (err) {
    toast.error('Failed to refresh topology')
  } finally {
    isLoadingTopology.value = false
  }
}

// Handle company selection
function handleSelectCompany(companyId: string) {
  selectedCompanyId.value = companyId
}

// Handle reset company selection
function handleResetCompany() {
  selectedCompanyId.value = undefined
}

// Handle connection created - refresh topology data
async function handleConnectionCreated() {
  if (!selectedCompanyId.value) return
  isLoadingTopology.value = true
  try {
    await topologyStore.fetchTopology(selectedCompanyId.value)
  } finally {
    isLoadingTopology.value = false
  }
}
</script>

<template>
  <div class="w-full space-y-6">
    <!-- Header Section -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-bold tracking-tight">
          Network Topology
        </h1>
        <p class="text-muted-foreground mt-1">
          Visualize and manage network connections between routers
        </p>
      </div>
    </div>

    <!-- Error Alert -->
    <div
      v-if="topologyStore.error"
      class="relative rounded-lg border border-destructive/50 bg-destructive/10 p-4"
    >
      <div class="flex items-start gap-3">
        <svg
          class="h-5 w-5 text-destructive"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <div class="flex-1">
          <h3 class="font-semibold text-destructive">
            Error Loading Topology
          </h3>
          <p class="mt-1 text-sm text-destructive/80">
            {{ topologyStore.error }}
          </p>
          <button
            class="mt-3 inline-flex items-center rounded-md bg-destructive/20 px-3 py-1.5 text-sm font-medium text-destructive hover:bg-destructive/30"
            @click="topologyStore.clearError()"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>

    <!-- State: No Company Selected (Empty Canvas) -->
    <div
      v-if="!selectedCompanyId && !isLoadingCompanies"
      class="rounded-lg border bg-card p-12"
    >
      <div class="flex flex-col items-center justify-center py-16">
        <!-- Icon -->
        <div class="rounded-full bg-primary/10 p-6 mb-6">
          <svg
            class="h-16 w-16 text-primary"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="1.5"
              d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
            />
          </svg>
        </div>

        <!-- Title -->
        <h2 class="text-2xl font-semibold mb-2">
          Select a Company
        </h2>

        <!-- Description -->
        <p class="text-muted-foreground text-center max-w-md mb-8">
          Choose a company to view its network topology. The topology map will show routers and their connections.
        </p>

        <!-- Loading Companies -->
        <div
          v-if="isLoadingCompanies"
          class="flex items-center gap-3 text-muted-foreground"
        >
          <svg
            class="h-5 w-5 animate-spin"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              class="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              stroke-width="4"
            />
            <path
              class="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <span>Loading companies...</span>
        </div>

        <!-- Company Cards -->
        <div
          v-else-if="companyStore.companies.length > 0"
          class="grid gap-4 md:grid-cols-2 lg:grid-cols-3 w-full max-w-4xl"
        >
          <button
            v-for="company in companyStore.companies"
            :key="company.id"
            class="group relative rounded-lg border border-border bg-card p-6 text-left transition-all hover:border-primary hover:shadow-md"
            @click="handleSelectCompany(company.id)"
          >
            <div class="flex items-start justify-between mb-3">
              <div class="flex items-center gap-3">
                <div class="rounded-full bg-primary/10 p-2">
                  <svg
                    class="h-5 w-5 text-primary"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                    />
                  </svg>
                </div>
                <div>
                  <h3 class="font-semibold group-hover:text-primary transition-colors">
                    {{ company.name }}
                  </h3>
                  <p class="text-sm text-muted-foreground">
                    {{ company.code }}
                  </p>
                </div>
              </div>
              <svg
                class="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </div>
            <p v-if="company.address" class="text-sm text-muted-foreground line-clamp-1">
              {{ company.address }}
            </p>
          </button>
        </div>

        <!-- No Companies -->
        <div
          v-else
          class="text-center text-muted-foreground"
        >
          <p>No companies found. Please add a company first.</p>
        </div>
      </div>
    </div>

    <!-- State: Company Selected - Show Topology -->
    <div v-else class="space-y-6">
      <!-- Company Header with Actions -->
      <div class="rounded-lg border bg-card">
        <div class="border-b px-6 py-4 flex items-center justify-between">
          <div class="flex items-center gap-4">
            <div class="rounded-full bg-primary/10 p-2">
              <svg
                class="h-5 w-5 text-primary"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                />
              </svg>
            </div>
            <div>
              <h2 class="text-lg font-semibold">
                {{ selectedCompanyName || 'Selected Company' }}
              </h2>
              <p class="text-sm text-muted-foreground">
                Network Topology View
              </p>
            </div>
          </div>

          <div class="flex items-center gap-3">
            <!-- Change Company Button -->
            <button
              :disabled="isLoadingTopology"
              class="inline-flex items-center gap-2 rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2"
              @click="handleResetCompany"
            >
              <svg
                class="h-4 w-4"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              Change Company
            </button>

            <!-- Refresh Button -->
            <button
              :disabled="isLoadingTopology"
              class="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground shadow hover:bg-primary/90 h-9 px-4 py-2"
              @click="handleRefresh"
            >
              <svg
                v-if="isLoadingTopology"
                class="mr-2 h-4 w-4 animate-spin"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  class="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  stroke-width="4"
                />
                <path
                  class="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              <svg
                v-else
                class="mr-2 h-4 w-4"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              Refresh
            </button>
          </div>
        </div>

        <!-- Stats -->
        <div class="grid grid-cols-3 divide-x border-b">
          <div class="px-6 py-4">
            <p class="text-sm text-muted-foreground">
              Total Routers
            </p>
            <p class="text-2xl font-bold mt-1">
              {{ topologyStore.nodeCount }}
            </p>
          </div>
          <div class="px-6 py-4">
            <p class="text-sm text-muted-foreground">
              Total Connections
            </p>
            <p class="text-2xl font-bold mt-1">
              {{ topologyStore.edgeCount }}
            </p>
          </div>
          <div class="px-6 py-4">
            <p class="text-sm text-muted-foreground">
              Company
            </p>
            <p class="text-lg font-semibold mt-1 truncate">
              {{ selectedCompanyName }}
            </p>
          </div>
        </div>
      </div>

      <!-- Topology Visualization -->
      <div class="rounded-lg border bg-card">
        <div class="p-4">
          <TopologyView
            v-if="!isLoadingTopology && !topologyStore.error"
            :nodes="topologyStore.topology.nodes"
            :edges="topologyStore.topology.edges"
            :company-id="selectedCompanyId"
            @connection-created="handleConnectionCreated"
          />

          <!-- Loading State -->
          <div
            v-else-if="isLoadingTopology"
            class="flex h-96 items-center justify-center"
          >
            <div class="text-center">
              <svg
                class="mx-auto h-12 w-12 animate-spin text-primary"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  class="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  stroke-width="4"
                />
                <path
                  class="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              <p class="mt-4 text-muted-foreground">
                Loading topology...
              </p>
            </div>
          </div>

          <!-- Empty State (No Routers) -->
          <div
            v-else-if="!topologyStore.nodeCount"
            class="flex h-96 items-center justify-center"
          >
            <div class="text-center">
              <svg
                class="mx-auto h-16 w-16 text-muted-foreground/50"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="1.5"
                  d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6h18M5 15H3m2 6h18M7 19h10a2 2 0 002 2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6m-6 4h6"
                />
              </svg>
              <h3 class="mt-4 text-lg font-semibold">
                No Network Data
              </h3>
              <p class="mt-2 text-sm text-muted-foreground">
                Add routers to visualize your network topology.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
