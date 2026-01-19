import type {
  ApiResponse,
  BoardList,
  CreateListInput,
  UpdateListInput,
} from '~/types/kanban-api'
import { defineStore } from 'pinia'
import { useAuthStore } from './auth'

interface ListState {
  lists: BoardList[]
  isLoading: boolean
  error: string | null
}

export const useKanbanListStore = defineStore('kanban-list', {
  state: (): ListState => ({
    lists: [],
    isLoading: false,
    error: null,
  }),

  actions: {
    async fetchBoardLists(boardId: string) {
      this.isLoading = true
      this.error = null

      try {
        const config = useRuntimeConfig()
        const authStore = useAuthStore()
        const apiBase = config.public.apiBase || 'http://localhost:5000/api'

        const response = await $fetch<ApiResponse<BoardList[]>>(
          `${apiBase}/kanban/boards/${boardId}/lists`,
          {
            headers: {
              Authorization: `Bearer ${authStore.token}`,
            },
          },
        )

        this.lists = response.data || []
        return { success: true, data: response.data }
      }
      catch (error: any) {
        console.error('Fetch lists error:', error)
        this.error = error?.data?.message || 'Failed to fetch lists'
        return {
          success: false,
          error: this.error,
        }
      }
      finally {
        this.isLoading = false
      }
    },

    async createList(boardId: string, data: CreateListInput) {
      this.isLoading = true
      this.error = null

      try {
        const config = useRuntimeConfig()
        const authStore = useAuthStore()
        const apiBase = config.public.apiBase || 'http://localhost:5000/api'

        const response = await $fetch<ApiResponse<BoardList>>(
          `${apiBase}/kanban/boards/${boardId}/lists`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${authStore.token}`,
            },
            body: data,
          },
        )

        if (response.data) {
          this.lists.push(response.data)
        }
        return { success: true, data: response.data }
      }
      catch (error: any) {
        console.error('Create list error:', error)
        this.error = error?.data?.message || 'Failed to create list'
        return {
          success: false,
          error: this.error,
        }
      }
      finally {
        this.isLoading = false
      }
    },

    async updateList(boardId: string, listId: string, data: UpdateListInput) {
      this.isLoading = true
      this.error = null

      try {
        const config = useRuntimeConfig()
        const authStore = useAuthStore()
        const apiBase = config.public.apiBase || 'http://localhost:5000/api'

        const response = await $fetch<ApiResponse<BoardList>>(
          `${apiBase}/kanban/boards/${boardId}/lists/${listId}`,
          {
            method: 'PUT',
            headers: {
              Authorization: `Bearer ${authStore.token}`,
            },
            body: data,
          },
        )

        // Update list in the array
        const index = this.lists.findIndex(l => l.id === listId)
        if (index !== -1 && response.data) {
          this.lists[index] = response.data
        }

        return { success: true, data: response.data }
      }
      catch (error: any) {
        console.error('Update list error:', error)
        this.error = error?.data?.message || 'Failed to update list'
        return {
          success: false,
          error: this.error,
        }
      }
      finally {
        this.isLoading = false
      }
    },

    async deleteList(boardId: string, listId: string) {
      this.isLoading = true
      this.error = null

      try {
        const config = useRuntimeConfig()
        const authStore = useAuthStore()
        const apiBase = config.public.apiBase || 'http://localhost:5000/api'

        await $fetch(`${apiBase}/kanban/boards/${boardId}/lists/${listId}`, {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${authStore.token}`,
          },
        })

        // Remove list from the array
        this.lists = this.lists.filter(l => l.id !== listId)

        return { success: true }
      }
      catch (error: any) {
        console.error('Delete list error:', error)
        this.error = error?.data?.message || 'Failed to delete list'
        return {
          success: false,
          error: this.error,
        }
      }
      finally {
        this.isLoading = false
      }
    },

    async archiveList(boardId: string, listId: string) {
      this.isLoading = true
      this.error = null

      try {
        const config = useRuntimeConfig()
        const authStore = useAuthStore()
        const apiBase = config.public.apiBase || 'http://localhost:5000/api'

        const response = await $fetch<ApiResponse<BoardList>>(
          `${apiBase}/kanban/boards/${boardId}/lists/${listId}/archive`,
          {
            method: 'PATCH',
            headers: {
              Authorization: `Bearer ${authStore.token}`,
            },
          },
        )

        // Update list in the array
        const index = this.lists.findIndex(l => l.id === listId)
        if (index !== -1 && response.data) {
          this.lists[index] = response.data
        }

        return { success: true, data: response.data }
      }
      catch (error: any) {
        console.error('Archive list error:', error)
        this.error = error?.data?.message || 'Failed to archive list'
        return {
          success: false,
          error: this.error,
        }
      }
      finally {
        this.isLoading = false
      }
    },

    async restoreList(boardId: string, listId: string) {
      this.isLoading = true
      this.error = null

      try {
        const config = useRuntimeConfig()
        const authStore = useAuthStore()
        const apiBase = config.public.apiBase || 'http://localhost:5000/api'

        const response = await $fetch<ApiResponse<BoardList>>(
          `${apiBase}/kanban/boards/${boardId}/lists/${listId}/restore`,
          {
            method: 'PATCH',
            headers: {
              Authorization: `Bearer ${authStore.token}`,
            },
          },
        )

        // Update list in the array
        const index = this.lists.findIndex(l => l.id === listId)
        if (index !== -1 && response.data) {
          this.lists[index] = response.data
        }

        return { success: true, data: response.data }
      }
      catch (error: any) {
        console.error('Restore list error:', error)
        this.error = error?.data?.message || 'Failed to restore list'
        return {
          success: false,
          error: this.error,
        }
      }
      finally {
        this.isLoading = false
      }
    },

    async reorderLists(boardId: string, positions: { listId: string, position: number }[]) {
      this.isLoading = true
      this.error = null

      try {
        const config = useRuntimeConfig()
        const authStore = useAuthStore()
        const apiBase = config.public.apiBase || 'http://localhost:5000/api'

        const response = await $fetch<ApiResponse<BoardList[]>>(
          `${apiBase}/kanban/boards/${boardId}/lists/reorder`,
          {
            method: 'PATCH',
            headers: {
              Authorization: `Bearer ${authStore.token}`,
            },
            body: { positions },
          },
        )

        if (response.data) {
          this.lists = response.data
        }

        return { success: true, data: response.data }
      }
      catch (error: any) {
        console.error('Reorder lists error:', error)
        this.error = error?.data?.message || 'Failed to reorder lists'
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

    clearLists() {
      this.lists = []
    },
  },

  getters: {
    activeLists: state =>
      state.lists.filter(l => !l.isArchived),

    archivedLists: state =>
      state.lists.filter(l => l.isArchived),

    listCount: state => state.lists.length,

    getListById: state => (id: string) =>
      state.lists.find(l => l.id === id),
  },
})
