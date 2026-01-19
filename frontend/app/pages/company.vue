<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useCompanyStore, type Company } from '~/stores/company'
import {
  Plus,
  Search,
  Building2,
  Users,
  Server,
  MapPin,
  Code,
  Eye,
  Pencil,
  Trash2
} from 'lucide-vue-next'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { toast } from 'vue-sonner'
import CompanyCreateModal from '~/components/company/CompanyCreateModal.vue'
import CompanyEditModal from '~/components/company/CompanyEditModal.vue'
import CompanyViewModal from '~/components/company/CompanyViewModal.vue'
import CompanyDeleteDialog from '~/components/company/CompanyDeleteDialog.vue'

const companyStore = useCompanyStore()
const searchQuery = ref('')

// Modal states
const isCreateModalOpen = ref(false)
const isEditModalOpen = ref(false)
const isViewModalOpen = ref(false)
const isDeleteDialogOpen = ref(false)
const selectedCompany = ref<Company | null>(null)

// Load companies on mount
onMounted(async () => {
  await companyStore.fetchCompanies()
})

// Filtered companies based on search
const filteredCompanies = computed(() => {
  if (!searchQuery.value) return companyStore.companies

  const query = searchQuery.value.toLowerCase()
  return companyStore.companies.filter(company =>
    company.name.toLowerCase().includes(query) ||
    company.code.toLowerCase().includes(query) ||
    company.address.toLowerCase().includes(query)
  )
})

// Format date
function formatDate(dateString: string) {
  const date = new Date(dateString)
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }).format(date)
}

// Open create modal
function openCreateModal() {
  isCreateModalOpen.value = true
}

// Open view modal
function openViewModal(company: Company) {
  selectedCompany.value = company
  isViewModalOpen.value = true
}

// Open edit modal
function openEditModal(company: Company) {
  selectedCompany.value = company
  isEditModalOpen.value = true
}

// Open delete dialog
function openDeleteDialog(company: Company) {
  selectedCompany.value = company
  isDeleteDialogOpen.value = true
}

// Handle successful create
function handleCreateSuccess() {
  isCreateModalOpen.value = false
  companyStore.fetchCompanies()
  toast.success('Company created successfully')
}

// Handle successful edit
function handleEditSuccess() {
  isEditModalOpen.value = false
  companyStore.fetchCompanies()
  toast.success('Company updated successfully')
}

// Handle successful delete
function handleDeleteSuccess() {
  isDeleteDialogOpen.value = false
  selectedCompany.value = null
  toast.success('Company deleted successfully')
}

// Stats
const stats = computed(() => ({
  total: companyStore.companyCount,
  withRouters: companyStore.companiesWithRouters.length,
  withoutRouters: companyStore.companiesWithoutRouters.length,
  totalRouters: companyStore.totalRoutersAcrossCompanies
}))
</script>

<template>
  <div class="company-management w-full flex flex-col gap-6">
    <!-- Header Section -->
    <div class="header-grid">
      <div class="space-y-1">
        <div class="flex items-center gap-3">
          <div class="status-pulse">
            <Building2 class="h-6 w-6" />
          </div>
          <h1 class="text-3xl font-bold tracking-tight terminal-text">
            Company Management
          </h1>
        </div>
        <p class="text-muted-foreground text-sm font-mono">
          {{ stats.total }} companies registered / {{ stats.totalRouters }} total routers
        </p>
      </div>

      <div class="flex items-center gap-3">
        <div class="search-container">
          <Search class="search-icon h-4 w-4" />
          <Input
            v-model="searchQuery"
            placeholder="Search companies..."
            class="search-input font-mono"
          />
        </div>
        <Button @click="openCreateModal" class="command-btn gap-2">
          <Plus class="h-4 w-4" />
          <span class="hidden sm:inline">Add Company</span>
        </Button>
      </div>
    </div>

    <!-- Stats Cards -->
    <div class="stats-grid">
      <Card class="stat-card">
        <CardContent class="pt-6">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-xs font-mono text-muted-foreground uppercase tracking-wider">Total Companies</p>
              <p class="text-3xl font-bold tabular-nums mt-1">{{ stats.total }}</p>
            </div>
            <Building2 class="h-8 w-8 text-muted-foreground opacity-50" />
          </div>
        </CardContent>
      </Card>

      <Card class="stat-card stat-active">
        <CardContent class="pt-6">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-xs font-mono text-emerald-400 uppercase tracking-wider">With Routers</p>
              <p class="text-3xl font-bold tabular-nums mt-1 text-emerald-400">{{ stats.withRouters }}</p>
            </div>
            <Server class="h-8 w-8 text-emerald-400 opacity-50" />
          </div>
        </CardContent>
      </Card>

      <Card class="stat-card">
        <CardContent class="pt-6">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-xs font-mono text-slate-400 uppercase tracking-wider">No Routers</p>
              <p class="text-3xl font-bold tabular-nums mt-1 text-slate-400">{{ stats.withoutRouters }}</p>
            </div>
            <Users class="h-8 w-8 text-slate-400 opacity-50" />
          </div>
        </CardContent>
      </Card>

      <Card class="stat-card">
        <CardContent class="pt-6">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-xs font-mono text-cyan-400 uppercase tracking-wider">Total Routers</p>
              <p class="text-3xl font-bold tabular-nums mt-1 text-cyan-400">{{ stats.totalRouters }}</p>
            </div>
            <Server class="h-8 w-8 text-cyan-400 opacity-50" />
          </div>
        </CardContent>
      </Card>
    </div>

    <!-- Companies Table -->
    <Card class="companies-table-card">
      <CardHeader>
        <CardTitle class="font-mono text-lg">Company Registry</CardTitle>
        <CardDescription class="font-mono text-xs">
          Manage your client companies and their network infrastructure
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div v-if="companyStore.isLoading" class="flex items-center justify-center py-12">
          <div class="loading-spinner"></div>
        </div>

        <div v-else-if="filteredCompanies.length === 0" class="empty-state">
          <Building2 class="h-12 w-12 text-muted-foreground opacity-30" />
          <p class="text-muted-foreground font-mono">
            {{ searchQuery ? 'No companies match your search' : 'No companies registered' }}
          </p>
        </div>

        <Table v-else class="company-table">
          <TableHeader>
            <TableRow class="table-header-row">
              <TableHead class="font-mono text-xs">Company</TableHead>
              <TableHead class="font-mono text-xs">Code</TableHead>
              <TableHead class="font-mono text-xs">Address</TableHead>
              <TableHead class="font-mono text-xs">Master User</TableHead>
              <TableHead class="font-mono text-xs text-center">Routers</TableHead>
              <TableHead class="font-mono text-xs">Created</TableHead>
              <TableHead class="text-right font-mono text-xs">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow
              v-for="company in filteredCompanies"
              :key="company.id"
              class="company-row"
            >
              <TableCell class="font-medium">
                <div class="flex items-center gap-2">
                  <div class="company-icon">
                    <Building2 class="h-3 w-3" />
                  </div>
                  <div>
                    <p class="font-mono font-semibold">{{ company.name }}</p>
                    <p v-if="company.description" class="font-mono text-xs text-muted-foreground truncate max-w-[200px]">
                      {{ company.description }}
                    </p>
                  </div>
                </div>
              </TableCell>

              <TableCell>
                <Badge variant="outline" class="font-mono text-xs gap-1.5">
                  <Code class="h-3 w-3" />
                  {{ company.code }}
                </Badge>
              </TableCell>

              <TableCell>
                <div class="flex items-center gap-1.5">
                  <MapPin class="h-3 w-3 text-muted-foreground flex-shrink-0" />
                  <span class="font-mono text-xs truncate max-w-[200px]">{{ company.address }}</span>
                </div>
              </TableCell>

              <TableCell>
                <p class="font-mono text-xs text-cyan-400">{{ company.masterUsername }}</p>
              </TableCell>

              <TableCell class="text-center">
                <Badge
                  :variant="(company.routerCount ?? 0) > 0 ? 'default' : 'secondary'"
                  class="font-mono text-xs"
                >
                  {{ company.routerCount ?? 0 }}
                </Badge>
              </TableCell>

              <TableCell>
                <span class="font-mono text-xs text-muted-foreground">
                  {{ formatDate(company.createdAt) }}
                </span>
              </TableCell>

              <TableCell class="text-right">
                <div class="flex items-center justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    @click="openViewModal(company)"
                    class="action-btn h-8 w-8 p-0"
                    title="View Details"
                  >
                    <Eye class="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    @click="openEditModal(company)"
                    class="action-btn h-8 w-8 p-0"
                    title="Edit"
                  >
                    <Pencil class="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    @click="openDeleteDialog(company)"
                    class="action-btn action-btn-danger h-8 w-8 p-0"
                    title="Delete"
                  >
                    <Trash2 class="h-3.5 w-3.5" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>

    <!-- Modals -->
    <CompanyCreateModal
      v-model:open="isCreateModalOpen"
      @success="handleCreateSuccess"
    />

    <CompanyViewModal
      v-if="selectedCompany"
      v-model:open="isViewModalOpen"
      :company="selectedCompany"
    />

    <CompanyEditModal
      v-if="selectedCompany"
      v-model:open="isEditModalOpen"
      :company="selectedCompany"
      @success="handleEditSuccess"
    />

    <CompanyDeleteDialog
      v-if="selectedCompany"
      v-model:open="isDeleteDialogOpen"
      :company="selectedCompany"
      @success="handleDeleteSuccess"
    />
  </div>
</template>

<style scoped>
/* Typography - IBM Plex Mono + Outfit */
@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=Outfit:wght@600;700;800&display=swap');

.company-management {
  font-family: 'Inter', system-ui, sans-serif;
}

.terminal-text {
  font-family: 'Outfit', sans-serif;
  letter-spacing: -0.02em;
}

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

/* Stats Grid */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.stat-card {
  position: relative;
  border: 1px solid hsl(var(--border) / 0.5);
  background: linear-gradient(135deg, hsl(var(--card)), hsl(var(--muted) / 0.1));
  transition: all 0.3s;
  overflow: hidden;
}

.stat-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(90deg, transparent, hsl(var(--primary) / 0.3), transparent);
}

.stat-active::before {
  background: linear-gradient(90deg, transparent, rgb(52 211 153 / 0.5), transparent);
}

.stat-card:hover {
  border-color: hsl(var(--primary) / 0.3);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px -2px hsl(var(--foreground) / 0.1);
}

/* Companies Table Card */
.companies-table-card {
  border: 1px solid hsl(var(--border) / 0.5);
  background: hsl(var(--card));
}

/* Table Styling */
.company-table {
  font-family: 'IBM Plex Mono', monospace;
}

.table-header-row {
  border-bottom: 2px solid hsl(var(--border) / 0.5);
  background: hsl(var(--muted) / 0.3);
}

.table-header-row th {
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-weight: 600;
  color: hsl(var(--muted-foreground));
}

.company-row {
  border-bottom: 1px solid hsl(var(--border) / 0.3);
  transition: background-color 0.15s;
}

.company-row:hover {
  background: hsl(var(--muted) / 0.3);
}

.company-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.5rem;
  height: 1.5rem;
  background: hsl(var(--primary) / 0.1);
  border: 1px solid hsl(var(--primary) / 0.2);
  border-radius: 0.25rem;
  color: hsl(var(--primary));
}

/* Action Buttons */
.action-btn {
  opacity: 0.6;
  transition: all 0.2s;
}

.action-btn:hover {
  opacity: 1;
  background: hsl(var(--muted));
}

.action-btn-danger:hover {
  background: hsl(var(--destructive) / 0.1);
  color: hsl(var(--destructive));
}

/* Loading Spinner */
.loading-spinner {
  width: 2rem;
  height: 2rem;
  border: 3px solid hsl(var(--muted));
  border-top-color: hsl(var(--primary));
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Empty State */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  padding: 3rem 1rem;
}

/* Responsive */
@media (max-width: 640px) {
  .header-grid {
    grid-template-columns: 1fr;
  }

  .search-container {
    width: 100%;
  }

  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
