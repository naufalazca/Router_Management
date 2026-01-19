import type {
  ApiResponse,
  Board,
  CreateBoardInput,
  UpdateBoardInput,
} from '~/types/kanban-api'
import { defineStore } from 'pinia'
import { useAuthStore } from './auth'

interface BoardState {
  boards: Board[]
  currentBoard: Board | null
  isLoading: boolean
  error: string | null
}

export const useKanbanBoardStore = defineStore('kanban-board', {
  state: (): BoardState => ({
    boards: [],
    currentBoard: null,
    isLoading: false,
    error: null,
  }),

  actions: {
    async fetchBoards() {
      this.isLoading = true
      this.error = null

      try {
        const config = useRuntimeConfig()
        const authStore = useAuthStore()
        const apiBase = config.public.apiBase || 'http://localhost:5000/api'

        const response = await $fetch<ApiResponse<Board[]>>(
          `${apiBase}/kanban/boards`,
          {
            headers: {
              Authorization: `Bearer ${authStore.token}`,
            },
          },
        )

        this.boards = response.data || []
        return { success: true, data: response.data }
      }
      catch (error: any) {
        console.error('Fetch boards error:', error)
        this.error = error?.data?.message || 'Failed to fetch boards'
        return {
          success: false,
          error: this.error,
        }
      }
      finally {
        this.isLoading = false
      }
    },

    async fetchBoardById(boardId: string) {
      this.isLoading = true
      this.error = null

      try {
        const config = useRuntimeConfig()
        const authStore = useAuthStore()
        const apiBase = config.public.apiBase || 'http://localhost:5000/api'

        const response = await $fetch<ApiResponse<Board>>(
          `${apiBase}/kanban/boards/${boardId}`,
          {
            headers: {
              Authorization: `Bearer ${authStore.token}`,
            },
          },
        )

        this.currentBoard = response.data || null
        return { success: true, data: response.data }
      }
      catch (error: any) {
        console.error('Fetch board error:', error)
        this.error = error?.data?.message || 'Failed to fetch board'
        return {
          success: false,
          error: this.error,
        }
      }
      finally {
        this.isLoading = false
      }
    },

    async createBoard(data: CreateBoardInput) {
      this.isLoading = true
      this.error = null

      try {
        const config = useRuntimeConfig()
        const authStore = useAuthStore()
        const apiBase = config.public.apiBase || 'http://localhost:5000/api'

        const response = await $fetch<ApiResponse<Board>>(
          `${apiBase}/kanban/boards`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${authStore.token}`,
            },
            body: data,
          },
        )

        if (response.data) {
          this.boards.push(response.data)
        }
        return { success: true, data: response.data }
      }
      catch (error: any) {
        console.error('Create board error:', error)
        this.error = error?.data?.message || 'Failed to create board'
        return {
          success: false,
          error: this.error,
        }
      }
      finally {
        this.isLoading = false
      }
    },

    async updateBoard(boardId: string, data: UpdateBoardInput) {
      this.isLoading = true
      this.error = null

      try {
        const config = useRuntimeConfig()
        const authStore = useAuthStore()
        const apiBase = config.public.apiBase || 'http://localhost:5000/api'

        const response = await $fetch<ApiResponse<Board>>(
          `${apiBase}/kanban/boards/${boardId}`,
          {
            method: 'PUT',
            headers: {
              Authorization: `Bearer ${authStore.token}`,
            },
            body: data,
          },
        )

        // Update board in the list
        const index = this.boards.findIndex(b => b.id === boardId)
        if (index !== -1 && response.data) {
          this.boards[index] = response.data
        }

        // Update current board if it's the one being updated
        if (this.currentBoard?.id === boardId && response.data) {
          this.currentBoard = response.data
        }

        return { success: true, data: response.data }
      }
      catch (error: any) {
        console.error('Update board error:', error)
        this.error = error?.data?.message || 'Failed to update board'
        return {
          success: false,
          error: this.error,
        }
      }
      finally {
        this.isLoading = false
      }
    },

    async deleteBoard(boardId: string) {
      this.isLoading = true
      this.error = null

      try {
        const config = useRuntimeConfig()
        const authStore = useAuthStore()
        const apiBase = config.public.apiBase || 'http://localhost:5000/api'

        await $fetch(`${apiBase}/kanban/boards/${boardId}`, {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${authStore.token}`,
          },
        })

        // Remove board from the list
        this.boards = this.boards.filter(b => b.id !== boardId)

        // Clear current board if it's the one being deleted
        if (this.currentBoard?.id === boardId) {
          this.currentBoard = null
        }

        return { success: true }
      }
      catch (error: any) {
        console.error('Delete board error:', error)
        this.error = error?.data?.message || 'Failed to delete board'
        return {
          success: false,
          error: this.error,
        }
      }
      finally {
        this.isLoading = false
      }
    },

    async archiveBoard(boardId: string) {
      this.isLoading = true
      this.error = null

      try {
        const config = useRuntimeConfig()
        const authStore = useAuthStore()
        const apiBase = config.public.apiBase || 'http://localhost:5000/api'

        const response = await $fetch<ApiResponse<Board>>(
          `${apiBase}/kanban/boards/${boardId}/archive`,
          {
            method: 'PATCH',
            headers: {
              Authorization: `Bearer ${authStore.token}`,
            },
          },
        )

        // Update board in the list
        const index = this.boards.findIndex(b => b.id === boardId)
        if (index !== -1 && response.data) {
          this.boards[index] = response.data
        }

        return { success: true, data: response.data }
      }
      catch (error: any) {
        console.error('Archive board error:', error)
        this.error = error?.data?.message || 'Failed to archive board'
        return {
          success: false,
          error: this.error,
        }
      }
      finally {
        this.isLoading = false
      }
    },

    async restoreBoard(boardId: string) {
      this.isLoading = true
      this.error = null

      try {
        const config = useRuntimeConfig()
        const authStore = useAuthStore()
        const apiBase = config.public.apiBase || 'http://localhost:5000/api'

        const response = await $fetch<ApiResponse<Board>>(
          `${apiBase}/kanban/boards/${boardId}/restore`,
          {
            method: 'PATCH',
            headers: {
              Authorization: `Bearer ${authStore.token}`,
            },
          },
        )

        // Update board in the list
        const index = this.boards.findIndex(b => b.id === boardId)
        if (index !== -1 && response.data) {
          this.boards[index] = response.data
        }

        return { success: true, data: response.data }
      }
      catch (error: any) {
        console.error('Restore board error:', error)
        this.error = error?.data?.message || 'Failed to restore board'
        return {
          success: false,
          error: this.error,
        }
      }
      finally {
        this.isLoading = false
      }
    },

    async reorderBoards(positions: { boardId: string, position: number }[]) {
      this.isLoading = true
      this.error = null

      try {
        const config = useRuntimeConfig()
        const authStore = useAuthStore()
        const apiBase = config.public.apiBase || 'http://localhost:5000/api'

        const response = await $fetch<ApiResponse<Board[]>>(
          `${apiBase}/kanban/boards/reorder`,
          {
            method: 'PATCH',
            headers: {
              Authorization: `Bearer ${authStore.token}`,
            },
            body: { positions },
          },
        )

        if (response.data) {
          this.boards = response.data
        }

        return { success: true, data: response.data }
      }
      catch (error: any) {
        console.error('Reorder boards error:', error)
        this.error = error?.data?.message || 'Failed to reorder boards'
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

    clearCurrentBoard() {
      this.currentBoard = null
    },

    setCurrentBoard(board: Board | null) {
      this.currentBoard = board
    },
  },

  getters: {
    activeBoards: state =>
      state.boards.filter(b => !b.isArchived),

    archivedBoards: state =>
      state.boards.filter(b => b.isArchived),

    boardCount: state => state.boards.length,

    getBoardById: state => (id: string) =>
      state.boards.find(b => b.id === id),
  },
})
