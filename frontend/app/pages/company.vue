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
  <div class="w-full space-y-6">
    <!-- Header Section -->
    <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div class="space-y-1">
        <div class="flex items-center gap-3">
          <div class="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 border border-primary/20">
            <Building2 class="h-5 w-5 text-primary" />
          </div>
          <h1 class="text-3xl font-bold tracking-tight">
            Company Management
          </h1>
        </div>
        <p class="text-sm text-muted-foreground">
          {{ stats.total }} companies registered / {{ stats.totalRouters }} total routers
        </p>
      </div>

      <div class="flex items-center gap-3">
        <div class="relative w-full sm:w-[280px]">
          <Search class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            v-model="searchQuery"
            placeholder="Search companies..."
            class="pl-9"
          />
        </div>
        <Button @click="openCreateModal" class="gap-2">
          <Plus class="h-4 w-4" />
          <span class="hidden sm:inline">Add Company</span>
        </Button>
      </div>
    </div>

    <!-- Stats Cards -->
    <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardContent class="pt-6">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-xs text-muted-foreground uppercase tracking-wider">Total Companies</p>
              <p class="text-3xl font-bold tabular-nums mt-1">{{ stats.total }}</p>
            </div>
            <Building2 class="h-8 w-8 text-muted-foreground/50" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent class="pt-6">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-xs text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">With Routers</p>
              <p class="text-3xl font-bold tabular-nums mt-1 text-emerald-600 dark:text-emerald-400">{{ stats.withRouters }}</p>
            </div>
            <Server class="h-8 w-8 text-emerald-600/50 dark:text-emerald-400/50" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent class="pt-6">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-xs text-muted-foreground uppercase tracking-wider">No Routers</p>
              <p class="text-3xl font-bold tabular-nums mt-1 text-muted-foreground">{{ stats.withoutRouters }}</p>
            </div>
            <Users class="h-8 w-8 text-muted-foreground/50" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent class="pt-6">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-xs text-cyan-600 dark:text-cyan-400 uppercase tracking-wider">Total Routers</p>
              <p class="text-3xl font-bold tabular-nums mt-1 text-cyan-600 dark:text-cyan-400">{{ stats.totalRouters }}</p>
            </div>
            <Server class="h-8 w-8 text-cyan-600/50 dark:text-cyan-400/50" />
          </div>
        </CardContent>
      </Card>
    </div>

    <!-- Companies Table -->
    <Card>
      <CardHeader>
        <CardTitle>Company Registry</CardTitle>
        <CardDescription>
          Manage your client companies and their network infrastructure
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div v-if="companyStore.isLoading" class="flex items-center justify-center py-12">
          <div class="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary"></div>
        </div>

        <div v-else-if="filteredCompanies.length === 0" class="flex flex-col items-center justify-center gap-4 py-12">
          <Building2 class="h-12 w-12 text-muted-foreground/30" />
          <p class="text-sm text-muted-foreground">
            {{ searchQuery ? 'No companies match your search' : 'No companies registered' }}
          </p>
        </div>

        <Table v-else>
          <TableHeader>
            <TableRow>
              <TableHead>Company</TableHead>
              <TableHead>Code</TableHead>
              <TableHead>Address</TableHead>
              <TableHead>Master User</TableHead>
              <TableHead class="text-center">Routers</TableHead>
              <TableHead>Created</TableHead>
              <TableHead class="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow
              v-for="company in filteredCompanies"
              :key="company.id"
            >
              <TableCell class="font-medium">
                <div class="flex items-center gap-2">
                  <div class="flex h-6 w-6 items-center justify-center rounded border bg-primary/10 border-primary/20">
                    <Building2 class="h-3 w-3 text-primary" />
                  </div>
                  <div>
                    <p class="font-semibold">{{ company.name }}</p>
                    <p v-if="company.description" class="text-xs text-muted-foreground truncate max-w-[200px]">
                      {{ company.description }}
                    </p>
                  </div>
                </div>
              </TableCell>

              <TableCell>
                <Badge variant="outline" class="gap-1.5">
                  <Code class="h-3 w-3" />
                  {{ company.code }}
                </Badge>
              </TableCell>

              <TableCell>
                <div class="flex items-center gap-1.5">
                  <MapPin class="h-3 w-3 text-muted-foreground flex-shrink-0" />
                  <span class="text-sm truncate max-w-[200px]">{{ company.address }}</span>
                </div>
              </TableCell>

              <TableCell>
                <p class="text-sm text-cyan-600 dark:text-cyan-400">{{ company.masterUsername }}</p>
              </TableCell>

              <TableCell class="text-center">
                <Badge
                  :variant="(company.routerCount ?? 0) > 0 ? 'default' : 'secondary'"
                >
                  {{ company.routerCount ?? 0 }}
                </Badge>
              </TableCell>

              <TableCell>
                <span class="text-sm text-muted-foreground">
                  {{ formatDate(company.createdAt) }}
                </span>
              </TableCell>

              <TableCell class="text-right">
                <div class="flex items-center justify-end gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    @click="openViewModal(company)"
                    title="View Details"
                  >
                    <Eye class="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    @click="openEditModal(company)"
                    title="Edit"
                  >
                    <Pencil class="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    @click="openDeleteDialog(company)"
                    title="Delete"
                    class="text-destructive hover:text-destructive"
                  >
                    <Trash2 class="h-4 w-4" />
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

