<script setup lang="ts">
import type { RouterOSUser } from '~/stores/routeros/user'
import {
  CheckCircle2,
  Eye,
  Pencil,
  Plus,
  Power,
  PowerOff,
  Search,
  Server,
  Shield,
  Trash2,
  User,
  Users,
  XCircle,
} from 'lucide-vue-next'
import { computed, onMounted, ref, watch } from 'vue'
import { toast } from 'vue-sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import RouterosDeleteDialog from '~/components/routeros/user/RouterosDeleteDialog.vue'
import RouterosUserCreateModal from '~/components/routeros/user/RouterosUserCreateModal.vue'
import RouterosUserEditModal from '~/components/routeros/user/RouterosUserEditModal.vue'
import RouterosUserViewModal from '~/components/routeros/user/RouterosUserViewModal.vue'
import { useRouterStore } from '~/stores/router'
import { useRouterOSUserStore } from '~/stores/routeros/user'

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
  }
  else {
    routerosUserStore.clearUsers()
  }
})

// Get selected router info
const selectedRouter = computed(() => {
  return routerStore.routers.find(r => r.id === selectedRouterId.value)
})

// Filtered users based on search
const filteredUsers = computed(() => {
  if (!searchQuery.value)
    return routerosUserStore.users

  const query = searchQuery.value.toLowerCase()
  return routerosUserStore.users.filter(user =>
    user.name.toLowerCase().includes(query)
    || user.group.toLowerCase().includes(query)
    || user.address?.toLowerCase().includes(query)
    || user.comment?.toLowerCase().includes(query),
  )
})

// Format date
function formatDate(date: Date | undefined) {
  if (!date)
    return 'Never'
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
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
  if (!selectedRouterId.value)
    return

  const action = user.disabled ? 'enable' : 'disable'
  const result = user.disabled
    ? await routerosUserStore.enableUser(selectedRouterId.value, user.id)
    : await routerosUserStore.disableUser(selectedRouterId.value, user.id)

  if (result.success) {
    toast.success(result.message || `User ${action}d successfully`)
  }
  else {
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
  <div class="w-full space-y-6">
    <!-- Header Section -->
    <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div class="space-y-1">
        <div class="flex items-center gap-3">
          <div class="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 border border-primary/20">
            <Users class="h-5 w-5 text-primary" />
          </div>
          <h1 class="text-3xl font-bold tracking-tight">
            RouterOS User Management
          </h1>
        </div>
        <p class="text-sm text-muted-foreground">
          {{ selectedRouter ? `Managing users on ${selectedRouter.name}` : 'Select a router to manage users' }}
        </p>
      </div>

      <div class="flex items-center gap-3">
        <div class="relative w-full sm:w-[280px]">
          <Search class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            v-model="searchQuery"
            placeholder="Search users..."
            class="pl-9"
            :disabled="!selectedRouterId"
          />
        </div>
        <Button class="gap-2" :disabled="!selectedRouterId" @click="openCreateModal">
          <Plus class="h-4 w-4" />
          <span class="hidden sm:inline">Add User</span>
        </Button>
      </div>
    </div>

    <!-- Router Selection -->
    <Card>
      <CardHeader>
        <CardTitle class="flex items-center gap-2">
          <Server class="h-5 w-5" />
          Router Selection
        </CardTitle>
        <CardDescription>
          Select a router to view and manage its users
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div class="flex items-center gap-4">
          <div class="flex-1">
            <Select v-model="selectedRouterId">
              <SelectTrigger>
                <SelectValue placeholder="Select a router..." />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem
                    v-for="router in routerStore.routers"
                    :key="router.id"
                    :value="router.id"
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
              :variant="selectedRouter.status === 'ACTIVE' ? 'default' : 'secondary'"
            >
              {{ selectedRouter.status }}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>

    <!-- Stats Cards -->
    <div v-if="selectedRouterId" class="grid gap-4 md:grid-cols-3">
      <Card>
        <CardContent class="pt-6">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-xs text-muted-foreground uppercase tracking-wider">
                Total Users
              </p>
              <p class="text-3xl font-bold tabular-nums mt-1">
                {{ stats.total }}
              </p>
            </div>
            <Users class="h-8 w-8 text-muted-foreground/50" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent class="pt-6">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-xs text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                Active Users
              </p>
              <p class="text-3xl font-bold tabular-nums mt-1 text-emerald-600 dark:text-emerald-400">
                {{ stats.active }}
              </p>
            </div>
            <CheckCircle2 class="h-8 w-8 text-emerald-600/50 dark:text-emerald-400/50" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent class="pt-6">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-xs text-muted-foreground uppercase tracking-wider">
                Disabled Users
              </p>
              <p class="text-3xl font-bold tabular-nums mt-1 text-muted-foreground">
                {{ stats.disabled }}
              </p>
            </div>
            <XCircle class="h-8 w-8 text-muted-foreground/50" />
          </div>
        </CardContent>
      </Card>
    </div>

    <!-- Users Table -->
    <Card>
      <CardHeader>
        <CardTitle>User Accounts</CardTitle>
        <CardDescription>
          Manage RouterOS user accounts and permissions
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div v-if="!selectedRouterId" class="flex flex-col items-center justify-center gap-4 py-12">
          <Server class="h-12 w-12 text-muted-foreground/30" />
          <p class="text-sm text-muted-foreground">
            Please select a router to view its users
          </p>
        </div>

        <div v-else-if="routerosUserStore.isLoading" class="flex items-center justify-center py-12">
          <div class="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
        </div>

        <div v-else-if="filteredUsers.length === 0" class="flex flex-col items-center justify-center gap-4 py-12">
          <Users class="h-12 w-12 text-muted-foreground/30" />
          <p class="text-sm text-muted-foreground">
            {{ searchQuery ? 'No users match your search' : 'No users found on this router' }}
          </p>
        </div>

        <Table v-else>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Group</TableHead>
              <TableHead>IP Address</TableHead>
              <TableHead>Last Login</TableHead>
              <TableHead>Status</TableHead>
              <TableHead class="text-right">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow
              v-for="user in filteredUsers"
              :key="user.id"
            >
              <TableCell class="font-medium">
                <div class="flex items-center gap-2">
                  <div class="flex h-6 w-6 items-center justify-center rounded border bg-primary/10 border-primary/20">
                    <User class="h-3 w-3 text-primary" />
                  </div>
                  <div>
                    <p class="font-semibold">
                      {{ user.name }}
                    </p>
                    <p v-if="user.comment" class="text-xs text-muted-foreground truncate max-w-[200px]">
                      {{ user.comment }}
                    </p>
                  </div>
                </div>
              </TableCell>

              <TableCell>
                <Badge variant="outline" class="gap-1.5">
                  <Shield class="h-3 w-3" />
                  {{ user.group }}
                </Badge>
              </TableCell>

              <TableCell>
                <span class="text-sm">{{ user.address || '0.0.0.0/0' }}</span>
              </TableCell>

              <TableCell>
                <span class="text-sm text-muted-foreground">
                  {{ formatDate(user.lastLoggedIn) }}
                </span>
              </TableCell>

              <TableCell>
                <Badge
                  :class="!user.disabled ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-slate-500/10 border-slate-500/20'"
                  class="gap-1.5"
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
                <div class="flex items-center justify-end gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    title="View Details"
                    @click="openViewModal(user)"
                  >
                    <Eye class="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    title="Edit"
                    @click="openEditModal(user)"
                  >
                    <Pencil class="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    :class="!user.disabled ? 'text-amber-600 hover:text-amber-600' : 'text-emerald-600 hover:text-emerald-600'"
                    :title="user.disabled ? 'Enable User' : 'Disable User'"
                    @click="handleToggleUserStatus(user)"
                  >
                    <component :is="user.disabled ? Power : PowerOff" class="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    title="Delete"
                    class="text-destructive hover:text-destructive"
                    @click="openDeleteDialog(user)"
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
