<script setup lang="ts">
import type { Company } from '~/stores/company'
import { computed, onMounted, ref, watch } from 'vue'
import { toast } from 'vue-sonner'
import TopologyView from '~/components/topology/TopologyView.vue'
import { useCompanyStore } from '~/stores/company'
import { useTopologyStore } from '~/stores/router/router.topology'

const topologyStore = useTopologyStore()
const companyStore = useCompanyStore()

// State
const selectedCompanyId = ref<string | undefined>(undefined)
const isLoadingTopology = ref(false)
const isLoadingCompanies = ref(false)

// Get selected company name
const selectedCompanyName = computed(() => {
  if (!selectedCompanyId.value)
    return null
  return companyStore.companies.find((c: Company) => c.id === selectedCompanyId.value)?.name
})

// Fetch companies on mount
onMounted(async () => {
  isLoadingCompanies.value = true
  try {
    await companyStore.fetchCompanies()
  }
  finally {
    isLoadingCompanies.value = false
  }
})

// Watch for company selection changes - only fetch when company is selected
watch(selectedCompanyId, async (newCompanyId) => {
  if (newCompanyId) {
    isLoadingTopology.value = true
    try {
      await topologyStore.fetchTopology(newCompanyId)
    }
    finally {
      isLoadingTopology.value = false
    }
  }
  else {
    // Clear topology when no company selected
    topologyStore.topology = { nodes: [], edges: [] }
  }
})

// Handle refresh
async function handleRefresh() {
  if (!selectedCompanyId.value)
    return
  isLoadingTopology.value = true
  try {
    await topologyStore.fetchTopology(selectedCompanyId.value)
    toast.success('Topology refreshed')
  }
  catch {
    toast.error('Failed to refresh topology')
  }
  finally {
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
  if (!selectedCompanyId.value)
    return
  isLoadingTopology.value = true
  try {
    await topologyStore.fetchTopology(selectedCompanyId.value)
  }
  finally {
    isLoadingTopology.value = false
  }
}
</script>

<template>
  <div class="w-full space-y-4">
    <!-- Error Alert -->
    <Alert v-if="topologyStore.error" variant="destructive">
      <Icon name="lucide:triangle-alert" aria-hidden="true" />
      <AlertTitle>Error Loading Topology</AlertTitle>
      <AlertDescription>
        {{ topologyStore.error }}
        <Button
          variant="outline"
          size="sm"
          class="mt-2"
          @click="topologyStore.clearError()"
        >
          Dismiss
        </Button>
      </AlertDescription>
    </Alert>

    <!-- State: No Company Selected — glass hero with company cards -->
    <div
      v-if="!selectedCompanyId && !isLoadingCompanies"
      class="rounded-2xl border border-border/60 bg-card/60 p-10 shadow-sm backdrop-blur-md"
    >
      <div class="flex flex-col items-center justify-center py-10">
        <div class="mb-6 rounded-2xl border border-primary/20 bg-primary/10 p-5">
          <Icon name="lucide:network" class="size-12 text-primary" aria-hidden="true" />
        </div>

        <h2 class="mb-2 text-2xl font-semibold tracking-tight">
          Select a Company
        </h2>
        <p class="mb-8 max-w-md text-center text-muted-foreground">
          Choose a company to view its network topology. The map shows routers, switches and their connections.
        </p>

        <div v-if="companyStore.companies.length > 0" class="grid w-full max-w-4xl gap-4 md:grid-cols-2 lg:grid-cols-3">
          <button
            v-for="company in companyStore.companies"
            :key="company.id"
            class="group relative cursor-pointer rounded-xl border border-border/60 bg-card/80 p-5 text-left shadow-sm backdrop-blur transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            @click="handleSelectCompany(company.id)"
          >
            <div class="mb-3 flex items-start justify-between">
              <div class="flex items-center gap-3">
                <div class="rounded-lg border border-primary/20 bg-primary/10 p-2">
                  <Icon name="lucide:building-2" class="size-5 text-primary" aria-hidden="true" />
                </div>
                <div>
                  <h3 class="font-semibold transition-colors group-hover:text-primary">
                    {{ company.name }}
                  </h3>
                  <p class="text-sm text-muted-foreground">
                    {{ company.code }}
                  </p>
                </div>
              </div>
              <Icon
                name="lucide:chevron-right"
                class="size-5 text-muted-foreground transition-colors group-hover:text-primary"
                aria-hidden="true"
              />
            </div>
            <p v-if="company.address" class="line-clamp-1 text-sm text-muted-foreground">
              {{ company.address }}
            </p>
          </button>
        </div>

        <div v-else class="text-center text-muted-foreground">
          <p>No companies found. Please add a company first.</p>
        </div>
      </div>
    </div>

    <!-- State: Company Selected — full-bleed canvas with slim glass context header -->
    <div v-else class="space-y-4">
      <!-- Slim glass context header -->
      <div class="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/60 bg-card/70 px-4 py-3 shadow-sm backdrop-blur-md">
        <div class="flex items-center gap-3">
          <div class="rounded-lg border border-primary/20 bg-primary/10 p-1.5">
            <Icon name="lucide:building-2" class="size-4 text-primary" aria-hidden="true" />
          </div>
          <div>
            <h2 class="text-sm font-semibold leading-tight">
              {{ selectedCompanyName || 'Selected Company' }}
            </h2>
            <p class="text-xs text-muted-foreground">
              {{ topologyStore.nodeCount }} devices · {{ topologyStore.edgeCount }} connections
            </p>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <!-- Loading indicator inline -->
          <Icon
            v-if="isLoadingTopology"
            name="lucide:loader-circle"
            class="size-4 animate-spin text-primary"
            aria-hidden="true"
          />
          <Button variant="outline" size="sm" :disabled="isLoadingTopology" @click="handleResetCompany">
            <Icon name="lucide:arrow-left" class="size-4" aria-hidden="true" />
            Change Company
          </Button>
          <Button size="sm" :disabled="isLoadingTopology" @click="handleRefresh">
            <Icon
              :name="isLoadingTopology ? 'lucide:loader-circle' : 'lucide:refresh-cw'"
              class="size-4"
              :class="{ 'animate-spin': isLoadingTopology }"
              aria-hidden="true"
            />
            Refresh
          </Button>
        </div>
      </div>

      <!-- Topology Visualization (glass overlays render inside the canvas) -->
      <div v-if="!isLoadingTopology && !topologyStore.error" class="relative">
        <TopologyView
          :nodes="topologyStore.topology.nodes"
          :edges="topologyStore.topology.edges"
          :company-id="selectedCompanyId"
          :company-name="selectedCompanyName ?? undefined"
          @connection-created="handleConnectionCreated"
        />

        <!-- Glass empty state overlay (No Routers) -->
        <div
          v-if="!topologyStore.nodeCount"
          class="pointer-events-none absolute inset-0 z-10 flex items-center justify-center"
        >
          <div class="pointer-events-auto flex flex-col items-center rounded-2xl border border-border/60 bg-card/85 px-10 py-8 text-center shadow-lg backdrop-blur-xl">
            <Icon name="lucide:server-off" class="size-14 text-muted-foreground/50" aria-hidden="true" />
            <h3 class="mt-4 text-lg font-semibold">
              No Network Data
            </h3>
            <p class="mt-2 text-sm text-muted-foreground">
              Add routers to visualize your network topology.
            </p>
          </div>
        </div>
      </div>

      <!-- Loading state as glass overlay -->
      <div
        v-else-if="isLoadingTopology"
        class="flex min-h-[560px] items-center justify-center rounded-xl border border-border/60 bg-card/50 backdrop-blur-md"
      >
        <div class="text-center">
          <Icon name="lucide:loader-circle" class="mx-auto size-10 animate-spin text-primary" aria-hidden="true" />
          <p class="mt-4 text-muted-foreground">
            Loading topology...
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
