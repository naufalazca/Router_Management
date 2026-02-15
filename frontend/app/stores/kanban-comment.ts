import type {
  ApiResponse,
  CreateCommentInput,
  TaskComment,
  UpdateCommentInput,
} from '~/types/kanban-api'
import { defineStore } from 'pinia'

interface CommentState {
  comments: TaskComment[]
  isLoading: boolean
  error: string | null
}

export const useKanbanCommentStore = defineStore('kanban-comment', {
  state: (): CommentState => ({
    comments: [],
    isLoading: false,
    error: null,
  }),

  actions: {
    async fetchTaskComments(taskId: string) {
      this.isLoading = true
      this.error = null

      try {
        const { $apiFetch } = useApiFetch()

        const response = await $apiFetch<ApiResponse<TaskComment[]>>(
          `/kanban/tasks/${taskId}/comments`,
        )

        this.comments = response.data || []
        return { success: true, data: response.data }
      }
      catch (error: any) {
        console.error('Fetch comments error:', error)
        this.error = error?.data?.message || 'Failed to fetch comments'
        return {
          success: false,
          error: this.error,
        }
      }
      finally {
        this.isLoading = false
      }
    },

    async createComment(taskId: string, data: CreateCommentInput) {
      this.isLoading = true
      this.error = null

      try {
        const { $apiFetch } = useApiFetch()

        const response = await $apiFetch<ApiResponse<TaskComment>>(
          `/kanban/tasks/${taskId}/comments`,
          {
            method: 'POST',
            body: data,
          },
        )

        if (response.data) {
          this.comments.push(response.data)
        }
        return { success: true, data: response.data }
      }
      catch (error: any) {
        console.error('Create comment error:', error)
        this.error = error?.data?.message || 'Failed to create comment'
        return {
          success: false,
          error: this.error,
        }
      }
      finally {
        this.isLoading = false
      }
    },

    async updateComment(taskId: string, commentId: string, data: UpdateCommentInput) {
      this.isLoading = true
      this.error = null

      try {
        const { $apiFetch } = useApiFetch()

        const response = await $apiFetch<ApiResponse<TaskComment>>(
          `/kanban/tasks/${taskId}/comments/${commentId}`,
          {
            method: 'PUT',
            body: data,
          },
        )

        // Update comment in the array
        const index = this.comments.findIndex(c => c.id === commentId)
        if (index !== -1 && response.data) {
          this.comments[index] = response.data
        }

        return { success: true, data: response.data }
      }
      catch (error: any) {
        console.error('Update comment error:', error)
        this.error = error?.data?.message || 'Failed to update comment'
        return {
          success: false,
          error: this.error,
        }
      }
      finally {
        this.isLoading = false
      }
    },

    async deleteComment(taskId: string, commentId: string) {
      this.isLoading = true
      this.error = null

      try {
        const { $apiFetch } = useApiFetch()

        await $apiFetch(`/kanban/tasks/${taskId}/comments/${commentId}`, {
          method: 'DELETE',
        })

        // Remove comment from the array
        this.comments = this.comments.filter(c => c.id !== commentId)

        return { success: true }
      }
      catch (error: any) {
        console.error('Delete comment error:', error)
        this.error = error?.data?.message || 'Failed to delete comment'
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

    clearComments() {
      this.comments = []
    },
  },

  getters: {
    commentCount: state => state.comments.length,

    getCommentById: state => (id: string) =>
      state.comments.find(c => c.id === id),

    sortedComments: state =>
      [...state.comments].sort((a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      ),
  },
})
