import { defineStore } from 'pinia'
import { useAuthStore } from '../auth'

/**
 * RouterOS User Interface
 * Matches ParsedRouterUser from backend
 */
export interface RouterOSUser {
  id: string
  name: string
  group: string
  address?: string
  comment?: string
  disabled: boolean
  lastLoggedIn?: Date
}

/**
 * Create User Input
 */
export interface CreateRouterOSUserInput {
  name: string
  password: string
  group?: string
  address?: string
  comment?: string
  disabled?: boolean
}

/**
 * Update User Input
 */
export interface UpdateRouterOSUserInput {
  name?: string
  password?: string
  group?: string
  address?: string
  comment?: string
  disabled?: boolean
}

interface RouterOSUserState {
  users: RouterOSUser[]
  currentUser: RouterOSUser | null
  isLoading: boolean
  error: string | null
}

export const useRouterOSUserStore = defineStore('routerosUser', {
  state: (): RouterOSUserState => ({
    users: [],
    currentUser: null,
    isLoading: false,
    error: null,
  }),

  actions: {
    /**
     * Fetch all users from a router
     */
    async fetchUsers(routerId: string) {
      this.isLoading = true
      this.error = null

      try {
        const config = useRuntimeConfig()
        const authStore = useAuthStore()
        const apiBase = config.public.apiBase || 'http://localhost:5000/api'

        const response = await $fetch<{ status: string; data: RouterOSUser[] }>(
          `${apiBase}/routeros/${routerId}/users`,
          {
            headers: {
              Authorization: `Bearer ${authStore.token}`,
            },
          }
        )

        // Parse lastLoggedIn to Date objects
        this.users = response.data.map((user) => ({
          ...user,
          lastLoggedIn: user.lastLoggedIn ? new Date(user.lastLoggedIn) : undefined,
        }))

        return { success: true, data: this.users }
      } catch (error: any) {
        console.error('Fetch RouterOS users error:', error)
        this.error = error?.data?.message || 'Failed to fetch users'
        return {
          success: false,
          error: this.error,
        }
      } finally {
        this.isLoading = false
      }
    },

    /**
     * Get a specific user by name
     */
    async fetchUserByName(routerId: string, username: string) {
      this.isLoading = true
      this.error = null

      try {
        const config = useRuntimeConfig()
        const authStore = useAuthStore()
        const apiBase = config.public.apiBase || 'http://localhost:5000/api'

        const response = await $fetch<{ status: string; data: RouterOSUser }>(
          `${apiBase}/routeros/${routerId}/users/${username}`,
          {
            headers: {
              Authorization: `Bearer ${authStore.token}`,
            },
          }
        )

        this.currentUser = {
          ...response.data,
          lastLoggedIn: response.data.lastLoggedIn
            ? new Date(response.data.lastLoggedIn)
            : undefined,
        }

        return { success: true, data: this.currentUser }
      } catch (error: any) {
        console.error('Fetch RouterOS user error:', error)
        this.error = error?.data?.message || 'Failed to fetch user'
        return {
          success: false,
          error: this.error,
        }
      } finally {
        this.isLoading = false
      }
    },

    /**
     * Create a new user on the router
     */
    async createUser(routerId: string, data: CreateRouterOSUserInput) {
      this.isLoading = true
      this.error = null

      try {
        const config = useRuntimeConfig()
        const authStore = useAuthStore()
        const apiBase = config.public.apiBase || 'http://localhost:5000/api'

        const response = await $fetch<{
          status: string
          data: RouterOSUser
          message: string
        }>(`${apiBase}/routeros/${routerId}/users`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${authStore.token}`,
          },
          body: data,
        })

        const newUser = {
          ...response.data,
          lastLoggedIn: response.data.lastLoggedIn
            ? new Date(response.data.lastLoggedIn)
            : undefined,
        }

        // Add to local state
        this.users.push(newUser)

        return { success: true, data: newUser, message: response.message }
      } catch (error: any) {
        console.error('Create RouterOS user error:', error)
        this.error = error?.data?.message || 'Failed to create user'
        return {
          success: false,
          error: this.error,
        }
      } finally {
        this.isLoading = false
      }
    },

    /**
     * Update an existing user
     */
    async updateUser(
      routerId: string,
      userId: string,
      data: UpdateRouterOSUserInput
    ) {
      this.isLoading = true
      this.error = null

      try {
        const config = useRuntimeConfig()
        const authStore = useAuthStore()
        const apiBase = config.public.apiBase || 'http://localhost:5000/api'

        const response = await $fetch<{
          status: string
          data: RouterOSUser
          message: string
        }>(`${apiBase}/routeros/${routerId}/users/${userId}`, {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${authStore.token}`,
          },
          body: data,
        })

        const updatedUser = {
          ...response.data,
          lastLoggedIn: response.data.lastLoggedIn
            ? new Date(response.data.lastLoggedIn)
            : undefined,
        }

        // Update in local state
        const index = this.users.findIndex((u) => u.id === userId)
        if (index !== -1) {
          this.users[index] = updatedUser
        }

        // Update current user if it's the one being updated
        if (this.currentUser?.id === userId) {
          this.currentUser = updatedUser
        }

        return { success: true, data: updatedUser, message: response.message }
      } catch (error: any) {
        console.error('Update RouterOS user error:', error)
        this.error = error?.data?.message || 'Failed to update user'
        return {
          success: false,
          error: this.error,
        }
      } finally {
        this.isLoading = false
      }
    },

    /**
     * Delete a user from the router
     */
    async deleteUser(routerId: string, userId: string) {
      this.isLoading = true
      this.error = null

      try {
        const config = useRuntimeConfig()
        const authStore = useAuthStore()
        const apiBase = config.public.apiBase || 'http://localhost:5000/api'

        await $fetch(`${apiBase}/routeros/${routerId}/users/${userId}`, {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${authStore.token}`,
          },
        })

        // Remove from local state
        this.users = this.users.filter((u) => u.id !== userId)

        // Clear current user if it's the one being deleted
        if (this.currentUser?.id === userId) {
          this.currentUser = null
        }

        return { success: true }
      } catch (error: any) {
        console.error('Delete RouterOS user error:', error)
        this.error = error?.data?.message || 'Failed to delete user'
        return {
          success: false,
          error: this.error,
        }
      } finally {
        this.isLoading = false
      }
    },

    /**
     * Enable a user
     */
    async enableUser(routerId: string, userId: string) {
      this.isLoading = true
      this.error = null

      try {
        const config = useRuntimeConfig()
        const authStore = useAuthStore()
        const apiBase = config.public.apiBase || 'http://localhost:5000/api'

        const response = await $fetch<{
          status: string
          data: RouterOSUser
          message: string
        }>(`${apiBase}/routeros/${routerId}/users/${userId}/enable`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${authStore.token}`,
          },
        })

        const updatedUser = {
          ...response.data,
          lastLoggedIn: response.data.lastLoggedIn
            ? new Date(response.data.lastLoggedIn)
            : undefined,
        }

        // Update in local state
        const index = this.users.findIndex((u) => u.id === userId)
        if (index !== -1) {
          this.users[index] = updatedUser
        }

        return { success: true, data: updatedUser, message: response.message }
      } catch (error: any) {
        console.error('Enable RouterOS user error:', error)
        this.error = error?.data?.message || 'Failed to enable user'
        return {
          success: false,
          error: this.error,
        }
      } finally {
        this.isLoading = false
      }
    },

    /**
     * Disable a user
     */
    async disableUser(routerId: string, userId: string) {
      this.isLoading = true
      this.error = null

      try {
        const config = useRuntimeConfig()
        const authStore = useAuthStore()
        const apiBase = config.public.apiBase || 'http://localhost:5000/api'

        const response = await $fetch<{
          status: string
          data: RouterOSUser
          message: string
        }>(`${apiBase}/routeros/${routerId}/users/${userId}/disable`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${authStore.token}`,
          },
        })

        const updatedUser = {
          ...response.data,
          lastLoggedIn: response.data.lastLoggedIn
            ? new Date(response.data.lastLoggedIn)
            : undefined,
        }

        // Update in local state
        const index = this.users.findIndex((u) => u.id === userId)
        if (index !== -1) {
          this.users[index] = updatedUser
        }

        return { success: true, data: updatedUser, message: response.message }
      } catch (error: any) {
        console.error('Disable RouterOS user error:', error)
        this.error = error?.data?.message || 'Failed to disable user'
        return {
          success: false,
          error: this.error,
        }
      } finally {
        this.isLoading = false
      }
    },

    /**
     * Clear error state
     */
    clearError() {
      this.error = null
    },

    /**
     * Clear current user
     */
    clearCurrentUser() {
      this.currentUser = null
    },

    /**
     * Clear all users (useful when switching routers)
     */
    clearUsers() {
      this.users = []
      this.currentUser = null
      this.error = null
    },
  },

  getters: {
    /**
     * Get active (enabled) users
     */
    activeUsers: (state) => state.users.filter((u) => !u.disabled),

    /**
     * Get disabled users
     */
    disabledUsers: (state) => state.users.filter((u) => u.disabled),

    /**
     * Get users by group
     */
    getUsersByGroup: (state) => (group: string) =>
      state.users.filter((u) => u.group === group),

    /**
     * Total user count
     */
    userCount: (state) => state.users.length,

    /**
     * Get user by ID
     */
    getUserById: (state) => (id: string) => state.users.find((u) => u.id === id),

    /**
     * Get user by name
     */
    getUserByName: (state) => (name: string) =>
      state.users.find((u) => u.name === name),
  },
})
