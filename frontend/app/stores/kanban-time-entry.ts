import type {
  ApiResponse,
  CreateTimeEntryInput,
  TaskTimeEntry,
  UpdateTimeEntryInput,
} from '~/types/kanban-api'
import { defineStore } from 'pinia'
import { useAuthStore } from './auth'

interface TimeEntryState {
  timeEntries: TaskTimeEntry[]
  activeTimer: TaskTimeEntry | null
  isLoading: boolean
  error: string | null
}

export const useKanbanTimeEntryStore = defineStore('kanban-time-entry', {
  state: (): TimeEntryState => ({
    timeEntries: [],
    activeTimer: null,
    isLoading: false,
    error: null,
  }),

  actions: {
    async fetchTaskTimeEntries(taskId: string) {
      this.isLoading = true
      this.error = null

      try {
        const config = useRuntimeConfig()
        const authStore = useAuthStore()
        const apiBase = config.public.apiBase || 'http://localhost:5000/api'

        const response = await $fetch<ApiResponse<TaskTimeEntry[]>>(
          `${apiBase}/kanban/tasks/${taskId}/time-entries`,
          {
            headers: {
              Authorization: `Bearer ${authStore.token}`,
            },
          },
        )

        this.timeEntries = response.data || []

        // Check for active timer
        this.activeTimer = this.timeEntries.find(te => te.type === 'TIMER' && !te.endTime) || null

        return { success: true, data: response.data }
      }
      catch (error: any) {
        console.error('Fetch time entries error:', error)
        this.error = error?.data?.message || 'Failed to fetch time entries'
        return {
          success: false,
          error: this.error,
        }
      }
      finally {
        this.isLoading = false
      }
    },

    async createTimeEntry(taskId: string, data: CreateTimeEntryInput) {
      this.isLoading = true
      this.error = null

      try {
        const config = useRuntimeConfig()
        const authStore = useAuthStore()
        const apiBase = config.public.apiBase || 'http://localhost:5000/api'

        const response = await $fetch<ApiResponse<TaskTimeEntry>>(
          `${apiBase}/kanban/tasks/${taskId}/time-entries`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${authStore.token}`,
            },
            body: data,
          },
        )

        if (response.data) {
          this.timeEntries.push(response.data)

          // Set as active timer if it's a timer without end time
          if (response.data.type === 'TIMER' && !response.data.endTime) {
            this.activeTimer = response.data
          }
        }
        return { success: true, data: response.data }
      }
      catch (error: any) {
        console.error('Create time entry error:', error)
        this.error = error?.data?.message || 'Failed to create time entry'
        return {
          success: false,
          error: this.error,
        }
      }
      finally {
        this.isLoading = false
      }
    },

    async updateTimeEntry(taskId: string, timeEntryId: string, data: UpdateTimeEntryInput) {
      this.isLoading = true
      this.error = null

      try {
        const config = useRuntimeConfig()
        const authStore = useAuthStore()
        const apiBase = config.public.apiBase || 'http://localhost:5000/api'

        const response = await $fetch<ApiResponse<TaskTimeEntry>>(
          `${apiBase}/kanban/tasks/${taskId}/time-entries/${timeEntryId}`,
          {
            method: 'PUT',
            headers: {
              Authorization: `Bearer ${authStore.token}`,
            },
            body: data,
          },
        )

        // Update time entry in the array
        const index = this.timeEntries.findIndex(te => te.id === timeEntryId)
        if (index !== -1 && response.data) {
          this.timeEntries[index] = response.data

          // Clear active timer if it was stopped
          if (this.activeTimer?.id === timeEntryId && response.data.endTime) {
            this.activeTimer = null
          }
        }

        return { success: true, data: response.data }
      }
      catch (error: any) {
        console.error('Update time entry error:', error)
        this.error = error?.data?.message || 'Failed to update time entry'
        return {
          success: false,
          error: this.error,
        }
      }
      finally {
        this.isLoading = false
      }
    },

    async deleteTimeEntry(taskId: string, timeEntryId: string) {
      this.isLoading = true
      this.error = null

      try {
        const config = useRuntimeConfig()
        const authStore = useAuthStore()
        const apiBase = config.public.apiBase || 'http://localhost:5000/api'

        await $fetch(`${apiBase}/kanban/tasks/${taskId}/time-entries/${timeEntryId}`, {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${authStore.token}`,
          },
        })

        // Remove time entry from the array
        this.timeEntries = this.timeEntries.filter(te => te.id !== timeEntryId)

        // Clear active timer if it was deleted
        if (this.activeTimer?.id === timeEntryId) {
          this.activeTimer = null
        }

        return { success: true }
      }
      catch (error: any) {
        console.error('Delete time entry error:', error)
        this.error = error?.data?.message || 'Failed to delete time entry'
        return {
          success: false,
          error: this.error,
        }
      }
      finally {
        this.isLoading = false
      }
    },

    async startTimer(taskId: string, description?: string) {
      return this.createTimeEntry(taskId, {
        type: 'TIMER',
        startTime: new Date().toISOString(),
        description,
      })
    },

    async stopTimer(taskId: string, timeEntryId: string) {
      return this.updateTimeEntry(taskId, timeEntryId, {
        endTime: new Date().toISOString(),
      })
    },

    clearError() {
      this.error = null
    },

    clearTimeEntries() {
      this.timeEntries = []
      this.activeTimer = null
    },
  },

  getters: {
    timeEntryCount: state => state.timeEntries.length,

    totalTrackedTime: state =>
      state.timeEntries.reduce((total, te) => total + (te.duration || 0), 0),

    totalTrackedHours: state =>
      (state.timeEntries.reduce((total, te) => total + (te.duration || 0), 0) / 3600).toFixed(2),

    hasActiveTimer: state => state.activeTimer !== null,

    timerEntries: state =>
      state.timeEntries.filter(te => te.type === 'TIMER'),

    manualEntries: state =>
      state.timeEntries.filter(te => te.type === 'MANUAL'),

    getTimeEntryById: state => (id: string) =>
      state.timeEntries.find(te => te.id === id),
  },
})
