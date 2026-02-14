import type { Board } from '~/types/kanban-api'
import { defineStore } from 'pinia'
import { useKanbanAttachmentStore } from './kanban-attachment'
import { useKanbanBoardStore } from './kanban-board'
import { useKanbanCommentStore } from './kanban-comment'
import { useKanbanLabelStore } from './kanban-label'
import { useKanbanListStore } from './kanban-list'
import { useKanbanTaskStore } from './kanban-task'
import { useKanbanTimeEntryStore } from './kanban-time-entry'

interface KanbanState {
  selectedBoardId: string | null
  viewMode: 'board' | 'list' | 'calendar'
  showArchived: boolean
}

/**
 * Main Kanban store that coordinates between all sub-stores
 * Provides a centralized way to manage the entire Kanban system
 */
export const useKanbanStore = defineStore('kanban', {
  state: (): KanbanState => ({
    selectedBoardId: null,
    viewMode: 'board',
    showArchived: false,
  }),

  actions: {
    /**
     * Initialize Kanban system - fetch boards and set first one as selected
     */
    async initialize() {
      const boardStore = useKanbanBoardStore()
      const result = await boardStore.fetchBoards()

      if (result.success && result.data && result.data.length > 0) {
        // Select first active board by default
        const firstActiveBoard = result.data.find(b => !b.isArchived)
        if (firstActiveBoard) {
          await this.selectBoard(firstActiveBoard.id)
        }
      }

      return result
    },

    /**
     * Select a board and load its data
     */
    async selectBoard(boardId: string) {
      this.selectedBoardId = boardId

      const boardStore = useKanbanBoardStore()
      const listStore = useKanbanListStore()
      const labelStore = useKanbanLabelStore()

      // Fetch board details
      await boardStore.fetchBoardById(boardId)

      // Fetch board lists
      await listStore.fetchBoardLists(boardId)

      // Fetch board labels
      await labelStore.fetchBoardLabels(boardId)

      // Save to localStorage for persistence
      if (import.meta.client) {
        localStorage.setItem('kanban.selectedBoardId', boardId)
      }
    },

    /**
     * Restore selected board from localStorage
     */
    restoreSelectedBoard() {
      if (import.meta.client) {
        const savedBoardId = localStorage.getItem('kanban.selectedBoardId')
        if (savedBoardId) {
          this.selectedBoardId = savedBoardId
          this.selectBoard(savedBoardId)
        }
      }
    },

    /**
     * Create a new board and select it
     */
    async createAndSelectBoard(data: { name: string, description?: string, color?: string, icon?: string }) {
      const boardStore = useKanbanBoardStore()
      const result = await boardStore.createBoard(data)

      if (result.success && result.data) {
        await this.selectBoard(result.data.id)
      }

      return result
    },

    /**
     * Delete current board and select another one
     */
    async deleteCurrentBoard() {
      if (!this.selectedBoardId)
        return { success: false, error: 'No board selected' }

      const boardStore = useKanbanBoardStore()
      const result = await boardStore.deleteBoard(this.selectedBoardId)

      if (result.success) {
        // Select another board if available
        const boards = boardStore.activeBoards
        if (boards.length > 0 && boards[0]) {
          await this.selectBoard(boards[0].id)
        }
        else {
          this.selectedBoardId = null
        }
      }

      return result
    },

    /**
     * Clear all data from all stores
     */
    clearAll() {
      const boardStore = useKanbanBoardStore()
      const listStore = useKanbanListStore()
      const taskStore = useKanbanTaskStore()
      const labelStore = useKanbanLabelStore()
      const commentStore = useKanbanCommentStore()
      const timeEntryStore = useKanbanTimeEntryStore()
      const attachmentStore = useKanbanAttachmentStore()

      boardStore.clearCurrentBoard()
      listStore.clearLists()
      taskStore.clearTasks()
      taskStore.clearCurrentTask()
      labelStore.clearLabels()
      commentStore.clearComments()
      timeEntryStore.clearTimeEntries()
      attachmentStore.clearAttachments()

      this.selectedBoardId = null
    },

    setViewMode(mode: 'board' | 'list' | 'calendar') {
      this.viewMode = mode

      // Save to localStorage
      if (import.meta.client) {
        localStorage.setItem('kanban.viewMode', mode)
      }
    },

    toggleShowArchived() {
      this.showArchived = !this.showArchived
    },
  },

  getters: {
    selectedBoard(): Board | null {
      const boardStore = useKanbanBoardStore()
      return this.selectedBoardId
        ? boardStore.getBoardById(this.selectedBoardId) || null
        : null
    },

    hasSelectedBoard(): boolean {
      return this.selectedBoardId !== null
    },

    isLoading(): boolean {
      const boardStore = useKanbanBoardStore()
      const listStore = useKanbanListStore()
      const taskStore = useKanbanTaskStore()

      return boardStore.isLoading || listStore.isLoading || taskStore.isLoading
    },
  },
})

// Note: Re-exports removed to avoid Nuxt auto-import duplication warnings
// Import stores directly from their individual files instead
