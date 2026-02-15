import type {
  ApiResponse,
  CreateTaskInput,
  MoveTaskInput,
  Task,
  TaskActivity,
  UpdateTaskInput,
} from '~/types/kanban-api'
import { defineStore } from 'pinia'

interface TaskState {
  tasks: Task[]
  currentTask: Task | null
  taskActivities: TaskActivity[]
  isLoading: boolean
  error: string | null
}

export const useKanbanTaskStore = defineStore('kanban-task', {
  state: (): TaskState => ({
    tasks: [],
    currentTask: null,
    taskActivities: [],
    isLoading: false,
    error: null,
  }),

  actions: {
    async fetchListTasks(boardId: string, listId: string) {
      this.isLoading = true
      this.error = null

      try {
        const { $apiFetch } = useApiFetch()

        const response = await $apiFetch<ApiResponse<Task[]>>(
          `/kanban/boards/${boardId}/lists/${listId}/tasks`,
        )

        // Return a copy of the data to avoid shared references between lists
        const tasksData = response.data ? [...response.data] : []
        return { success: true, data: tasksData }
      }
      catch (error: any) {
        console.error('Fetch tasks error:', error)
        this.error = error?.data?.message || 'Failed to fetch tasks'
        return {
          success: false,
          error: this.error,
        }
      }
      finally {
        this.isLoading = false
      }
    },

    async fetchTaskById(boardId: string, listId: string, taskId: string) {
      this.isLoading = true
      this.error = null

      try {
        const { $apiFetch } = useApiFetch()

        const response = await $apiFetch<ApiResponse<Task>>(
          `/kanban/boards/${boardId}/lists/${listId}/tasks/${taskId}`,
        )

        this.currentTask = response.data || null
        return { success: true, data: response.data }
      }
      catch (error: any) {
        console.error('Fetch task error:', error)
        this.error = error?.data?.message || 'Failed to fetch task'
        return {
          success: false,
          error: this.error,
        }
      }
      finally {
        this.isLoading = false
      }
    },

    async createTask(boardId: string, listId: string, data: CreateTaskInput) {
      this.isLoading = true
      this.error = null

      try {
        const { $apiFetch } = useApiFetch()

        const response = await $apiFetch<ApiResponse<Task>>(
          `/kanban/boards/${boardId}/lists/${listId}/tasks`,
          {
            method: 'POST',
            body: data,
          },
        )

        // Don't modify this.tasks here - KanbanBoard manages list-specific tasks
        // This global tasks array is only used for single-list views
        return { success: true, data: response.data }
      }
      catch (error: any) {
        console.error('Create task error:', error)
        this.error = error?.data?.message || 'Failed to create task'
        return {
          success: false,
          error: this.error,
        }
      }
      finally {
        this.isLoading = false
      }
    },

    async updateTask(boardId: string, listId: string, taskId: string, data: UpdateTaskInput) {
      this.isLoading = true
      this.error = null

      try {
        const { $apiFetch } = useApiFetch()

        const response = await $apiFetch<ApiResponse<Task>>(
          `/kanban/boards/${boardId}/lists/${listId}/tasks/${taskId}`,
          {
            method: 'PUT',
            body: data,
          },
        )

        // Update task in the array
        const index = this.tasks.findIndex(t => t.id === taskId)
        if (index !== -1 && response.data) {
          this.tasks[index] = response.data
        }

        // Update current task if it's the one being updated
        if (this.currentTask?.id === taskId && response.data) {
          this.currentTask = response.data
        }

        return { success: true, data: response.data }
      }
      catch (error: any) {
        console.error('Update task error:', error)
        this.error = error?.data?.message || 'Failed to update task'
        return {
          success: false,
          error: this.error,
        }
      }
      finally {
        this.isLoading = false
      }
    },

    async deleteTask(boardId: string, listId: string, taskId: string) {
      this.isLoading = true
      this.error = null

      try {
        const { $apiFetch } = useApiFetch()

        await $apiFetch(
          `/kanban/boards/${boardId}/lists/${listId}/tasks/${taskId}`,
          {
            method: 'DELETE',
          },
        )

        // Clear current task if it's the one being deleted
        if (this.currentTask?.id === taskId) {
          this.currentTask = null
        }

        // Don't modify this.tasks - KanbanBoard manages list-specific tasks
        return { success: true }
      }
      catch (error: any) {
        console.error('Delete task error:', error)
        this.error = error?.data?.message || 'Failed to delete task'
        return {
          success: false,
          error: this.error,
        }
      }
      finally {
        this.isLoading = false
      }
    },

    async moveTask(boardId: string, listId: string, taskId: string, data: MoveTaskInput) {
      this.isLoading = true
      this.error = null

      try {
        const { $apiFetch } = useApiFetch()

        const response = await $apiFetch<ApiResponse<Task>>(
          `/kanban/boards/${boardId}/lists/${listId}/tasks/${taskId}/move`,
          {
            method: 'POST',
            body: data,
          },
        )

        // Don't modify this.tasks - KanbanBoard manages list-specific tasks
        return { success: true, data: response.data }
      }
      catch (error: any) {
        console.error('Move task error:', error)
        this.error = error?.data?.message || 'Failed to move task'
        return {
          success: false,
          error: this.error,
        }
      }
      finally {
        this.isLoading = false
      }
    },

    async archiveTask(boardId: string, listId: string, taskId: string) {
      this.isLoading = true
      this.error = null

      try {
        const { $apiFetch } = useApiFetch()

        const response = await $apiFetch<ApiResponse<Task>>(
          `/kanban/boards/${boardId}/lists/${listId}/tasks/${taskId}/archive`,
          {
            method: 'PATCH',
          },
        )

        // Update task in the array
        const index = this.tasks.findIndex(t => t.id === taskId)
        if (index !== -1 && response.data) {
          this.tasks[index] = response.data
        }

        return { success: true, data: response.data }
      }
      catch (error: any) {
        console.error('Archive task error:', error)
        this.error = error?.data?.message || 'Failed to archive task'
        return {
          success: false,
          error: this.error,
        }
      }
      finally {
        this.isLoading = false
      }
    },

    async restoreTask(boardId: string, listId: string, taskId: string) {
      this.isLoading = true
      this.error = null

      try {
        const { $apiFetch } = useApiFetch()

        const response = await $apiFetch<ApiResponse<Task>>(
          `/kanban/boards/${boardId}/lists/${listId}/tasks/${taskId}/restore`,
          {
            method: 'PATCH',
          },
        )

        // Update task in the array
        const index = this.tasks.findIndex(t => t.id === taskId)
        if (index !== -1 && response.data) {
          this.tasks[index] = response.data
        }

        return { success: true, data: response.data }
      }
      catch (error: any) {
        console.error('Restore task error:', error)
        this.error = error?.data?.message || 'Failed to restore task'
        return {
          success: false,
          error: this.error,
        }
      }
      finally {
        this.isLoading = false
      }
    },

    async completeTask(boardId: string, listId: string, taskId: string) {
      this.isLoading = true
      this.error = null

      try {
        const { $apiFetch } = useApiFetch()

        const response = await $apiFetch<ApiResponse<Task>>(
          `/kanban/boards/${boardId}/lists/${listId}/tasks/${taskId}/complete`,
          {
            method: 'PATCH',
          },
        )

        // Update task in the array
        const index = this.tasks.findIndex(t => t.id === taskId)
        if (index !== -1 && response.data) {
          this.tasks[index] = response.data
        }

        // Update current task if it's the one being completed
        if (this.currentTask?.id === taskId && response.data) {
          this.currentTask = response.data
        }

        return { success: true, data: response.data }
      }
      catch (error: any) {
        console.error('Complete task error:', error)
        this.error = error?.data?.message || 'Failed to complete task'
        return {
          success: false,
          error: this.error,
        }
      }
      finally {
        this.isLoading = false
      }
    },

    async uncompleteTask(boardId: string, listId: string, taskId: string) {
      this.isLoading = true
      this.error = null

      try {
        const { $apiFetch } = useApiFetch()

        const response = await $apiFetch<ApiResponse<Task>>(
          `/kanban/boards/${boardId}/lists/${listId}/tasks/${taskId}/uncomplete`,
          {
            method: 'PATCH',
          },
        )

        // Update task in the array
        const index = this.tasks.findIndex(t => t.id === taskId)
        if (index !== -1 && response.data) {
          this.tasks[index] = response.data
        }

        // Update current task if it's the one being uncompleted
        if (this.currentTask?.id === taskId && response.data) {
          this.currentTask = response.data
        }

        return { success: true, data: response.data }
      }
      catch (error: any) {
        console.error('Uncomplete task error:', error)
        this.error = error?.data?.message || 'Failed to uncomplete task'
        return {
          success: false,
          error: this.error,
        }
      }
      finally {
        this.isLoading = false
      }
    },

    async fetchTaskActivities(taskId: string) {
      this.isLoading = true
      this.error = null

      try {
        const { $apiFetch } = useApiFetch()

        const response = await $apiFetch<ApiResponse<TaskActivity[]>>(
          `/kanban/tasks/${taskId}/activities`,
        )

        this.taskActivities = response.data || []
        return { success: true, data: response.data }
      }
      catch (error: any) {
        console.error('Fetch activities error:', error)
        this.error = error?.data?.message || 'Failed to fetch activities'
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

    clearTasks() {
      this.tasks = []
    },

    clearCurrentTask() {
      this.currentTask = null
    },

    setCurrentTask(task: Task | null) {
      this.currentTask = task
    },
  },

  getters: {
    activeTasks: state =>
      state.tasks.filter(t => !t.isArchived && !t.completedAt),

    completedTasks: state =>
      state.tasks.filter(t => t.completedAt),

    archivedTasks: state =>
      state.tasks.filter(t => t.isArchived),

    taskCount: state => state.tasks.length,

    getTaskById: state => (id: string) =>
      state.tasks.find(t => t.id === id),

    urgentTasks: state =>
      state.tasks.filter(t => t.priority === 'URGENT' && !t.completedAt),

    overdueTasks: state =>
      state.tasks.filter((t) => {
        if (!t.dueDate || t.completedAt)
          return false
        return new Date(t.dueDate) < new Date()
      }),
  },
})
