import type {
  ApiResponse,
  StorageStats,
  TaskAttachment,
} from '~/types/kanban-api'
import { defineStore } from 'pinia'

interface AttachmentState {
  attachments: TaskAttachment[]
  storageStats: StorageStats | null
  isLoading: boolean
  isUploading: boolean
  uploadProgress: number
  error: string | null
}

export const useKanbanAttachmentStore = defineStore('kanban-attachment', {
  state: (): AttachmentState => ({
    attachments: [],
    storageStats: null,
    isLoading: false,
    isUploading: false,
    uploadProgress: 0,
    error: null,
  }),

  actions: {
    async fetchTaskAttachments(taskId: string) {
      this.isLoading = true
      this.error = null

      try {
        const { $apiFetch } = useApiFetch()

        const response = await $apiFetch<ApiResponse<TaskAttachment[]>>(
          `/kanban/tasks/${taskId}/attachments`,
        )

        this.attachments = response.data || []
        return { success: true, data: response.data }
      }
      catch (error: any) {
        console.error('Fetch attachments error:', error)
        this.error = error?.data?.message || 'Failed to fetch attachments'
        return {
          success: false,
          error: this.error,
        }
      }
      finally {
        this.isLoading = false
      }
    },

    async uploadAttachment(taskId: string, file: File) {
      this.isUploading = true
      this.uploadProgress = 0
      this.error = null

      try {
        const { $apiFetch } = useApiFetch()

        const formData = new FormData()
        formData.append('file', file)

        const response = await $apiFetch<ApiResponse<TaskAttachment>>(
          `/kanban/tasks/${taskId}/attachments`,
          {
            method: 'POST',
            body: formData,
            // Note: $fetch doesn't support onUploadProgress
            // You can use XMLHttpRequest or axios if you need upload progress
          } as any,
        )

        if (response.data) {
          this.attachments.push(response.data)
        }

        this.uploadProgress = 100

        // Reset upload progress after a short delay
        setTimeout(() => {
          this.uploadProgress = 0
        }, 1000)

        return { success: true, data: response.data }
      }
      catch (error: any) {
        console.error('Upload attachment error:', error)
        this.error = error?.data?.message || 'Failed to upload attachment'
        return {
          success: false,
          error: this.error,
        }
      }
      finally {
        this.isUploading = false
        this.uploadProgress = 0
      }
    },

    async getAttachmentById(taskId: string, attachmentId: string) {
      this.isLoading = true
      this.error = null

      try {
        const { $apiFetch } = useApiFetch()

        const response = await $apiFetch<ApiResponse<TaskAttachment>>(
          `/kanban/tasks/${taskId}/attachments/${attachmentId}`,
        )

        return { success: true, data: response.data }
      }
      catch (error: any) {
        console.error('Get attachment error:', error)
        this.error = error?.data?.message || 'Failed to get attachment'
        return {
          success: false,
          error: this.error,
        }
      }
      finally {
        this.isLoading = false
      }
    },

    async downloadAttachment(taskId: string, attachmentId: string) {
      this.isLoading = true
      this.error = null

      try {
        const { useAuthStore } = await import('./auth')
        const authStore = useAuthStore()
        const config = useRuntimeConfig()
        const apiBase = config.public.apiBase || 'http://localhost:5000/api'

        // Download endpoint returns the file directly
        const response = await fetch(
          `${apiBase}/kanban/tasks/${taskId}/attachments/${attachmentId}/download`,
          {
            headers: {
              Authorization: `Bearer ${authStore.token}`,
            },
          },
        )

        if (!response.ok) {
          throw new Error('Download failed')
        }

        const blob = await response.blob()
        const contentDisposition = response.headers.get('Content-Disposition')
        const filename = contentDisposition
          ? contentDisposition.split('filename=')[1]?.replace(/"/g, '')
          : 'download'

        // Create download link
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = filename || 'download'
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)

        return { success: true }
      }
      catch (error: any) {
        console.error('Download attachment error:', error)
        this.error = error?.message || 'Failed to download attachment'
        return {
          success: false,
          error: this.error,
        }
      }
      finally {
        this.isLoading = false
      }
    },

    async deleteAttachment(taskId: string, attachmentId: string) {
      this.isLoading = true
      this.error = null

      try {
        const { $apiFetch } = useApiFetch()

        await $apiFetch(`/kanban/tasks/${taskId}/attachments/${attachmentId}`, {
          method: 'DELETE',
        })

        // Remove attachment from the array
        this.attachments = this.attachments.filter(a => a.id !== attachmentId)

        return { success: true }
      }
      catch (error: any) {
        console.error('Delete attachment error:', error)
        this.error = error?.data?.message || 'Failed to delete attachment'
        return {
          success: false,
          error: this.error,
        }
      }
      finally {
        this.isLoading = false
      }
    },

    async fetchTaskStorageStats(taskId: string) {
      this.isLoading = true
      this.error = null

      try {
        const { $apiFetch } = useApiFetch()

        const response = await $apiFetch<ApiResponse<StorageStats>>(
          `/kanban/tasks/${taskId}/attachments/stats`,
        )

        this.storageStats = response.data || null
        return { success: true, data: response.data }
      }
      catch (error: any) {
        console.error('Fetch storage stats error:', error)
        this.error = error?.data?.message || 'Failed to fetch storage stats'
        return {
          success: false,
          error: this.error,
        }
      }
      finally {
        this.isLoading = false
      }
    },

    async fetchUserStorageStats() {
      this.isLoading = true
      this.error = null

      try {
        const { $apiFetch } = useApiFetch()

        const response = await $apiFetch<ApiResponse<StorageStats>>(
          `/kanban/attachments/stats`,
        )

        this.storageStats = response.data || null
        return { success: true, data: response.data }
      }
      catch (error: any) {
        console.error('Fetch user storage stats error:', error)
        this.error = error?.data?.message || 'Failed to fetch user storage stats'
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

    clearAttachments() {
      this.attachments = []
    },

    clearStorageStats() {
      this.storageStats = null
    },
  },

  getters: {
    attachmentCount: state => state.attachments.length,

    totalSize: state =>
      state.attachments.reduce((total, a) => total + Number(a.fileSize), 0),

    totalSizeMB: state =>
      (state.attachments.reduce((total, a) => total + Number(a.fileSize), 0) / (1024 * 1024)).toFixed(2),

    getAttachmentById: state => (id: string) =>
      state.attachments.find(a => a.id === id),

    imageAttachments: state =>
      state.attachments.filter(a => a.mimeType.startsWith('image/')),

    documentAttachments: state =>
      state.attachments.filter(a =>
        a.mimeType.includes('pdf')
        || a.mimeType.includes('document')
        || a.mimeType.includes('text'),
      ),
  },
})
