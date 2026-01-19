// Backend API types for Kanban

export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
export type TimeEntryType = 'TIMER' | 'MANUAL'
export type TaskActivityAction
  = | 'CREATED'
    | 'UPDATED'
    | 'MOVED'
    | 'ARCHIVED'
    | 'RESTORED'
    | 'COMMENTED'
    | 'ATTACHMENT_ADDED'
    | 'ATTACHMENT_REMOVED'
    | 'LABEL_ADDED'
    | 'LABEL_REMOVED'
    | 'DUE_DATE_CHANGED'
    | 'PRIORITY_CHANGED'
    | 'DESCRIPTION_CHANGED'
    | 'TITLE_CHANGED'
    | 'TIME_ENTRY_ADDED'
    | 'TIME_ENTRY_UPDATED'
    | 'TIME_ENTRY_DELETED'

export interface User {
  id: string
  username: string
  fullName?: string | null
}

export interface Board {
  id: string
  userId: string
  name: string
  description?: string | null
  color?: string | null
  icon?: string | null
  position: number
  isArchived: boolean
  createdAt: string
  updatedAt: string
  lists?: BoardList[]
  labels?: Label[]
}

export interface BoardList {
  id: string
  boardId: string
  name: string
  position: number
  isArchived: boolean
  createdAt: string
  updatedAt: string
  tasks?: Task[]
}

export interface Task {
  id: string
  listId: string
  createdBy: string
  title: string
  description?: string | null
  position: number
  priority: TaskPriority
  dueDate?: string | null
  startDate?: string | null
  completedAt?: string | null
  estimatedHours?: number | null
  routerId?: string | null
  isArchived: boolean
  createdAt: string
  updatedAt: string
  creator?: User
  taskLabels?: TaskLabel[]
  comments?: TaskComment[]
  attachments?: TaskAttachment[]
  activities?: TaskActivity[]
  timeEntries?: TaskTimeEntry[]
}

export interface Label {
  id: string
  boardId: string
  name: string
  color: string
  createdAt: string
  updatedAt: string
}

export interface TaskLabel {
  id: string
  taskId: string
  labelId: string
  assignedAt: string
  label?: Label
}

export interface TaskComment {
  id: string
  taskId: string
  userId: string
  content: string
  createdAt: string
  updatedAt: string
  editedAt?: string | null
  user?: User
}

export interface TaskAttachment {
  id: string
  taskId: string
  uploadedBy: string
  fileName: string
  fileSize: bigint | number
  mimeType: string
  storageKey: string
  storageUrl: string
  checksum: string
  createdAt: string
  uploader?: User
}

export interface TaskActivity {
  id: string
  taskId: string
  userId: string
  action: TaskActivityAction
  metadata?: any
  oldValue?: string | null
  newValue?: string | null
  createdAt: string
  user?: User
}

export interface TaskTimeEntry {
  id: string
  taskId: string
  userId: string
  type: TimeEntryType
  startTime: string
  endTime?: string | null
  duration?: number | null
  description?: string | null
  createdAt: string
  updatedAt: string
  user?: User
}

// API Request/Response types
export interface CreateBoardInput {
  name: string
  description?: string
  color?: string
  icon?: string
}

export interface UpdateBoardInput {
  name?: string
  description?: string
  color?: string
  icon?: string
  position?: number
}

export interface CreateListInput {
  name: string
}

export interface UpdateListInput {
  name?: string
  position?: number
}

export interface CreateTaskInput {
  title: string
  description?: string
  priority?: TaskPriority
  dueDate?: string
  startDate?: string
  estimatedHours?: number
  routerId?: string
}

export interface UpdateTaskInput {
  title?: string
  description?: string
  priority?: TaskPriority
  dueDate?: string
  startDate?: string
  completedAt?: string
  estimatedHours?: number
  routerId?: string
  position?: number
}

export interface MoveTaskInput {
  targetListId: string
  position: number
}

export interface CreateLabelInput {
  name: string
  color: string
}

export interface UpdateLabelInput {
  name?: string
  color?: string
}

export interface CreateCommentInput {
  content: string
}

export interface UpdateCommentInput {
  content: string
}

export interface CreateTimeEntryInput {
  type: TimeEntryType
  startTime: string
  endTime?: string
  duration?: number
  description?: string
}

export interface UpdateTimeEntryInput {
  endTime?: string
  duration?: number
  description?: string
}

export interface StorageStats {
  totalSize: number
  totalSizeMB: string
  fileCount: number
}

export interface ApiResponse<T> {
  status: 'success' | 'error'
  data?: T
  message?: string
}
