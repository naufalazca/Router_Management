<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouterOSUserStore, type RouterOSUser } from '~/stores/routeros/user'
import { useRouterStore } from '~/stores/router'
import {
  Plus,
  Search,
  User,
  Users,
  Shield,
  Server,
  CheckCircle2,
  XCircle,
  Eye,
  Pencil,
  Trash2,
  Power,
  PowerOff
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
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'vue-sonner'
import RouterosUserCreateModal from '~/components/routeros/user/RouterosUserCreateModal.vue'
import RouterosUserEditModal from '~/components/routeros/user/RouterosUserEditModal.vue'
import RouterosUserViewModal from '~/components/routeros/user/RouterosUserViewModal.vue'
import RouterosDeleteDialog from '~/components/routeros/user/RouterosDeleteDialog.vue'

const routerosUserStore = useRouterOSUserStore()
const routerStore = useRouterStore()
const searchQuery = ref('')
const selectedRouterId = ref<string>('')

// Modal states
const isCreateModalOpen = ref(false)
const isEditModalOpen = ref(false)
const isViewModalOpen = ref(false)
const isDeleteDialogOpen = ref(false)
const selectedUser = ref<RouterOSUser | null>(null)

// Load routers on mount
onMounted(async () => {
  await routerStore.fetchRouters()

  // Auto-select first router if available
  if (routerStore.routers.length > 0) {
    selectedRouterId.value = routerStore.routers[0]?.id || ''
  }
})

// Watch for router selection changes
watch(selectedRouterId, async (newRouterId) => {
  if (newRouterId) {
    await routerosUserStore.fetchUsers(newRouterId)
  } else {
    routerosUserStore.clearUsers()
  }
})

// Get selected router info
const selectedRouter = computed(() => {
  return routerStore.routers.find(r => r.id === selectedRouterId.value)
})

// Filtered users based on search
const filteredUsers = computed(() => {
  if (!searchQuery.value) return routerosUserStore.users

  const query = searchQuery.value.toLowerCase()
  return routerosUserStore.users.filter(user =>
    user.name.toLowerCase().includes(query) ||
    user.group.toLowerCase().includes(query) ||
    user.address?.toLowerCase().includes(query) ||
    user.comment?.toLowerCase().includes(query)
  )
})

// Format date
function formatDate(date: Date | undefined) {
  if (!date) return 'Never'
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date)
}

// Open create modal
function openCreateModal() {
  if (!selectedRouterId.value) {
    toast.error('Please select a router first')
    return
  }
  isCreateModalOpen.value = true
}

// Open view modal
function openViewModal(user: RouterOSUser) {
  selectedUser.value = user
  isViewModalOpen.value = true
}

// Open edit modal
function openEditModal(user: RouterOSUser) {
  selectedUser.value = user
  isEditModalOpen.value = true
}

// Open delete dialog
function openDeleteDialog(user: RouterOSUser) {
  selectedUser.value = user
  isDeleteDialogOpen.value = true
}

// Handle enable/disable user
async function handleToggleUserStatus(user: RouterOSUser) {
  if (!selectedRouterId.value) return

  const action = user.disabled ? 'enable' : 'disable'
  const result = user.disabled
    ? await routerosUserStore.enableUser(selectedRouterId.value, user.id)
    : await routerosUserStore.disableUser(selectedRouterId.value, user.id)

  if (result.success) {
    toast.success(result.message || `User ${action}d successfully`)
  } else {
    toast.error(result.error || `Failed to ${action} user`)
  }
}

// Handle successful create
function handleCreateSuccess() {
  isCreateModalOpen.value = false
  if (selectedRouterId.value) {
    routerosUserStore.fetchUsers(selectedRouterId.value)
  }
}

// Handle successful edit
async function handleEditSuccess() {
  isEditModalOpen.value = false
  if (selectedRouterId.value) {
    await routerosUserStore.fetchUsers(selectedRouterId.value)
    // Clear selected user to force re-selection with fresh data
    selectedUser.value = null
  }
}

// Handle successful delete
function handleDeleteSuccess() {
  isDeleteDialogOpen.value = false
  selectedUser.value = null
}

// Stats
const stats = computed(() => ({
  total: routerosUserStore.userCount,
  active: routerosUserStore.activeUsers.length,
  disabled: routerosUserStore.disabledUsers.length,
}))
</script>

<template>
  <div class="routeros-user-management w-full flex flex-col gap-6">
    <!-- Header Section -->
    <div class="header-grid">
      <div class="space-y-1">
        <div class="flex items-center gap-3">
          <div class="status-pulse">
            <Users class="h-6 w-6" />
          </div>
          <h1 class="text-3xl font-bold tracking-tight terminal-text">
            RouterOS User Management
          </h1>
        </div>
        <p class="text-muted-foreground text-sm font-mono">
          {{ selectedRouter ? `Managing users on ${selectedRouter.name}` : 'Select a router to manage users' }}
        </p>
      </div>

      <div class="flex items-center gap-3">
        <div class="search-container">
          <Search class="search-icon h-4 w-4" />
          <Input
            v-model="searchQuery"
            placeholder="Search users..."
            class="search-input font-mono"
            :disabled="!selectedRouterId"
          />
        </div>
        <Button @click="openCreateModal" class="command-btn gap-2" :disabled="!selectedRouterId">
          <Plus class="h-4 w-4" />
          <span class="hidden sm:inline">Add User</span>
        </Button>
      </div>
    </div>

    <!-- Router Selection -->
    <Card>
      <CardHeader>
        <CardTitle class="font-mono text-lg flex items-center gap-2">
          <Server class="h-5 w-5" />
          Router Selection
        </CardTitle>
        <CardDescription class="font-mono text-xs">
          Select a router to view and manage its users
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div class="flex items-center gap-4">
          <div class="flex-1">
            <Select v-model="selectedRouterId">
              <SelectTrigger class="font-mono">
                <SelectValue placeholder="Select a router..." />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem
                    v-for="router in routerStore.routers"
                    :key="router.id"
                    :value="router.id"
                    class="font-mono"
                  >
                    <div class="flex items-center gap-2">
                      <Server class="h-4 w-4" />
                      <span>{{ router.name }}</span>
                      <span class="text-xs text-muted-foreground">{{ router.ipAddress }}</span>
                    </div>
                  </SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          <div v-if="selectedRouter" class="flex items-center gap-2">
            <Badge
              :class="selectedRouter.status === 'ACTIVE' ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-slate-500/10 border-slate-500/20'"
              class="font-mono text-xs"
            >
              {{ selectedRouter.status }}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>

    <!-- Stats Cards -->
    <div class="stats-grid" v-if="selectedRouterId">
      <Card class="stat-card">
        <CardContent class="pt-6">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-xs font-mono text-muted-foreground uppercase tracking-wider">Total Users</p>
              <p class="text-3xl font-bold tabular-nums mt-1">{{ stats.total }}</p>
            </div>
            <Users class="h-8 w-8 text-muted-foreground opacity-50" />
          </div>
        </CardContent>
      </Card>

      <Card class="stat-card stat-active">
        <CardContent class="pt-6">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-xs font-mono text-emerald-400 uppercase tracking-wider">Active Users</p>
              <p class="text-3xl font-bold tabular-nums mt-1 text-emerald-400">{{ stats.active }}</p>
            </div>
            <CheckCircle2 class="h-8 w-8 text-emerald-400 opacity-50" />
          </div>
        </CardContent>
      </Card>

      <Card class="stat-card">
        <CardContent class="pt-6">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-xs font-mono text-slate-400 uppercase tracking-wider">Disabled Users</p>
              <p class="text-3xl font-bold tabular-nums mt-1 text-slate-400">{{ stats.disabled }}</p>
            </div>
            <XCircle class="h-8 w-8 text-slate-400 opacity-50" />
          </div>
        </CardContent>
      </Card>
    </div>

    <!-- Users Table -->
    <Card class="users-table-card">
      <CardHeader>
        <CardTitle class="font-mono text-lg">User Accounts</CardTitle>
        <CardDescription class="font-mono text-xs">
          Manage RouterOS user accounts and permissions
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div v-if="!selectedRouterId" class="empty-state">
          <Server class="h-12 w-12 text-muted-foreground opacity-30" />
          <p class="text-muted-foreground font-mono">
            Please select a router to view its users
          </p>
        </div>

        <div v-else-if="routerosUserStore.isLoading" class="flex items-center justify-center py-12">
          <div class="loading-spinner"></div>
        </div>

        <div v-else-if="filteredUsers.length === 0" class="empty-state">
          <Users class="h-12 w-12 text-muted-foreground opacity-30" />
          <p class="text-muted-foreground font-mono">
            {{ searchQuery ? 'No users match your search' : 'No users found on this router' }}
          </p>
        </div>

        <Table v-else class="user-table">
          <TableHeader>
            <TableRow class="table-header-row">
              <TableHead class="font-mono text-xs">User</TableHead>
              <TableHead class="font-mono text-xs">Group</TableHead>
              <TableHead class="font-mono text-xs">IP Address</TableHead>
              <TableHead class="font-mono text-xs">Last Login</TableHead>
              <TableHead class="font-mono text-xs">Status</TableHead>
              <TableHead class="text-right font-mono text-xs">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow
              v-for="user in filteredUsers"
              :key="user.id"
              class="user-row"
            >
              <TableCell class="font-medium">
                <div class="flex items-center gap-2">
                  <div class="user-icon">
                    <User class="h-3 w-3" />
                  </div>
                  <div>
                    <p class="font-mono font-semibold">{{ user.name }}</p>
                    <p v-if="user.comment" class="font-mono text-xs text-muted-foreground truncate max-w-[200px]">
                      {{ user.comment }}
                    </p>
                  </div>
                </div>
              </TableCell>

              <TableCell>
                <Badge variant="outline" class="font-mono text-xs gap-1.5">
                  <Shield class="h-3 w-3" />
                  {{ user.group }}
                </Badge>
              </TableCell>

              <TableCell>
                <span class="font-mono text-xs">{{ user.address || '0.0.0.0/0' }}</span>
              </TableCell>

              <TableCell>
                <span class="font-mono text-xs text-muted-foreground">
                  {{ formatDate(user.lastLoggedIn) }}
                </span>
              </TableCell>

              <TableCell>
                <Badge
                  :class="!user.disabled ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-slate-500/10 border-slate-500/20'"
                  class="status-badge font-mono text-xs gap-1.5"
                >
                  <component
                    :is="!user.disabled ? CheckCircle2 : XCircle"
                    :class="!user.disabled ? 'text-emerald-400' : 'text-slate-400'"
                    class="h-3 w-3"
                  />
                  {{ user.disabled ? 'DISABLED' : 'ENABLED' }}
                </Badge>
              </TableCell>

              <TableCell class="text-right">
                <div class="flex items-center justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    @click="openViewModal(user)"
                    class="action-btn h-8 w-8 p-0"
                    title="View Details"
                  >
                    <Eye class="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    @click="openEditModal(user)"
                    class="action-btn h-8 w-8 p-0"
                    title="Edit"
                  >
                    <Pencil class="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    @click="handleToggleUserStatus(user)"
                    class="action-btn h-8 w-8 p-0"
                    :class="!user.disabled ? 'action-btn-warning' : 'action-btn-success'"
                    :title="user.disabled ? 'Enable User' : 'Disable User'"
                  >
                    <component :is="user.disabled ? Power : PowerOff" class="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    @click="openDeleteDialog(user)"
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
    <RouterosUserCreateModal
      v-if="selectedRouterId"
      v-model:open="isCreateModalOpen"
      :router-id="selectedRouterId"
      @success="handleCreateSuccess"
    />

    <RouterosUserViewModal
      v-if="selectedUser"
      v-model:open="isViewModalOpen"
      :user="selectedUser"
    />

    <RouterosUserEditModal
      v-if="selectedUser && selectedRouterId"
      v-model:open="isEditModalOpen"
      :user="selectedUser"
      :router-id="selectedRouterId"
      @success="handleEditSuccess"
    />

    <RouterosDeleteDialog
      v-if="selectedUser && selectedRouterId"
      v-model:open="isDeleteDialogOpen"
      :user="selectedUser"
      :router-id="selectedRouterId"
      @success="handleDeleteSuccess"
    />
  </div>
</template>

<style scoped>
/* Typography - IBM Plex Mono + Outfit */
@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=Outfit:wght@600;700;800&display=swap');

.routeros-user-management {
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

/* Users Table Card */
.users-table-card {
  border: 1px solid hsl(var(--border) / 0.5);
  background: hsl(var(--card));
}

/* Table Styling */
.user-table {
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

.user-row {
  border-bottom: 1px solid hsl(var(--border) / 0.3);
  transition: background-color 0.15s;
}

.user-row:hover {
  background: hsl(var(--muted) / 0.3);
}

.user-icon {
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

.status-badge {
  border: 1px solid;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.05em;
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

.action-btn-warning:hover {
  background: hsl(var(--amber-500) / 0.1);
  color: rgb(251 191 36);
}

.action-btn-success:hover {
  background: hsl(var(--emerald-500) / 0.1);
  color: rgb(52 211 153);
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
