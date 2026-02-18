import type {
  ApiResponse,
  CreateLabelInput,
  Label,
  UpdateLabelInput,
} from '~/types/kanban-api'
import { defineStore } from 'pinia'

interface LabelState {
  labels: Label[]
  isLoading: boolean
  error: string | null
}

export const useKanbanLabelStore = defineStore('kanban-label', {
  state: (): LabelState => ({
    labels: [],
    isLoading: false,
    error: null,
  }),

  actions: {
    async fetchBoardLabels(boardId: string) {
      this.isLoading = true
      this.error = null

      try {
        const { $apiFetch } = useApiFetch()

        const response = await $apiFetch<ApiResponse<Label[]>>(
          `/kanban/boards/${boardId}/labels`,
        )

        this.labels = response.data || []
        return { success: true, data: response.data }
      }
      catch (error: any) {
        console.error('Fetch labels error:', error)
        this.error = error?.data?.message || 'Failed to fetch labels'
        return {
          success: false,
          error: this.error,
        }
      }
      finally {
        this.isLoading = false
      }
    },

    async createLabel(boardId: string, data: CreateLabelInput) {
      this.isLoading = true
      this.error = null

      try {
        const { $apiFetch } = useApiFetch()

        const response = await $apiFetch<ApiResponse<Label>>(
          `/kanban/boards/${boardId}/labels`,
          {
            method: 'POST',
            body: data,
          },
        )

        if (response.data) {
          this.labels.push(response.data)
        }
        return { success: true, data: response.data }
      }
      catch (error: any) {
        console.error('Create label error:', error)
        this.error = error?.data?.message || 'Failed to create label'
        return {
          success: false,
          error: this.error,
        }
      }
      finally {
        this.isLoading = false
      }
    },

    async updateLabel(boardId: string, labelId: string, data: UpdateLabelInput) {
      this.isLoading = true
      this.error = null

      try {
        const { $apiFetch } = useApiFetch()

        const response = await $apiFetch<ApiResponse<Label>>(
          `/kanban/boards/${boardId}/labels/${labelId}`,
          {
            method: 'PUT',
            body: data,
          },
        )

        // Update label in the array
        const index = this.labels.findIndex(l => l.id === labelId)
        if (index !== -1 && response.data) {
          this.labels[index] = response.data
        }

        return { success: true, data: response.data }
      }
      catch (error: any) {
        console.error('Update label error:', error)
        this.error = error?.data?.message || 'Failed to update label'
        return {
          success: false,
          error: this.error,
        }
      }
      finally {
        this.isLoading = false
      }
    },

    async deleteLabel(boardId: string, labelId: string) {
      this.isLoading = true
      this.error = null

      try {
        const { $apiFetch } = useApiFetch()

        await $apiFetch(`/kanban/boards/${boardId}/labels/${labelId}`, {
          method: 'DELETE',
        })

        // Remove label from the array
        this.labels = this.labels.filter(l => l.id !== labelId)

        return { success: true }
      }
      catch (error: any) {
        console.error('Delete label error:', error)
        this.error = error?.data?.message || 'Failed to delete label'
        return {
          success: false,
          error: this.error,
        }
      }
      finally {
        this.isLoading = false
      }
    },

    async addLabelToTask(boardId: string, taskId: string, labelId: string) {
      this.isLoading = true
      this.error = null

      try {
        const { $apiFetch } = useApiFetch()

        const response = await $apiFetch<ApiResponse<any>>(
          `/kanban/boards/${boardId}/tasks/${taskId}/labels/${labelId}`,
          {
            method: 'POST',
          },
        )

        return { success: true, data: response.data }
      }
      catch (error: any) {
        console.error('Add label to task error:', error)
        this.error = error?.data?.message || 'Failed to add label to task'
        return {
          success: false,
          error: this.error,
        }
      }
      finally {
        this.isLoading = false
      }
    },

    async removeLabelFromTask(boardId: string, taskId: string, labelId: string) {
      this.isLoading = true
      this.error = null

      try {
        const { $apiFetch } = useApiFetch()

        await $apiFetch(`/kanban/boards/${boardId}/tasks/${taskId}/labels/${labelId}`, {
          method: 'DELETE',
        })

        return { success: true }
      }
      catch (error: any) {
        console.error('Remove label from task error:', error)
        this.error = error?.data?.message || 'Failed to remove label from task'
        return {
          success: false,
          error: this.error,
        }
      }
      finally {
        this.isLoading = false
      }
    },

    clearError() {
      this.error = null
    },

    clearLabels() {
      this.labels = []
    },
  },

  getters: {
    labelCount: state => state.labels.length,

    getLabelById: state => (id: string) =>
      state.labels.find(l => l.id === id),

    getLabelsByColor: state => (color: string) =>
      state.labels.filter(l => l.color === color),
  },
})
