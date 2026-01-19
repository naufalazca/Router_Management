# Kanban Pinia Stores

This directory contains all Pinia stores for the Kanban system. The stores are organized by feature for better maintainability.

## Store Structure

### Main Store
- **`kanban.ts`** - Main coordinator store that manages the overall Kanban state and coordinates between sub-stores

### Sub-Stores
- **`kanban-board.ts`** - Board management (CRUD, archive, restore, reorder)
- **`kanban-list.ts`** - List management within boards
- **`kanban-task.ts`** - Task management with activities
- **`kanban-label.ts`** - Label management and task label assignments
- **`kanban-comment.ts`** - Task comments
- **`kanban-time-entry.ts`** - Time tracking (timer and manual entries)
- **`kanban-attachment.ts`** - File attachments with R2 storage

## Usage Examples

### Basic Setup

```vue
<script setup lang="ts">
import { useKanbanBoardStore, useKanbanStore, useKanbanTaskStore } from '~/stores/kanban'

const kanbanStore = useKanbanStore()
const boardStore = useKanbanBoardStore()
const taskStore = useKanbanTaskStore()

// Initialize on mount
onMounted(async () => {
  await kanbanStore.initialize()
})
</script>
```

### Working with Boards

```typescript
// Fetch all boards
await boardStore.fetchBoards()

// Create a new board
const result = await boardStore.createBoard({
  name: 'My Project',
  description: 'Project description',
  color: '#3b82f6',
  icon: '📋'
})

// Update board
await boardStore.updateBoard(boardId, {
  name: 'Updated Project Name'
})

// Archive/Restore board
await boardStore.archiveBoard(boardId)
await boardStore.restoreBoard(boardId)

// Delete board
await boardStore.deleteBoard(boardId)

// Access boards
const activeBoards = boardStore.activeBoards
const archivedBoards = boardStore.archivedBoards
```

### Working with Lists

```typescript
// Fetch lists for a board
await listStore.fetchBoardLists(boardId)

// Create list
await listStore.createList(boardId, {
  name: 'To Do'
})

// Update list
await listStore.updateList(boardId, listId, {
  name: 'In Progress'
})

// Reorder lists
await listStore.reorderLists(boardId, [
  { listId: 'list1', position: 0 },
  { listId: 'list2', position: 1 }
])

// Archive/Delete list
await listStore.archiveList(boardId, listId)
await listStore.deleteList(boardId, listId)
```

### Working with Tasks

```typescript
// Fetch tasks in a list
await taskStore.fetchListTasks(boardId, listId)

// Create task
await taskStore.createTask(boardId, listId, {
  title: 'Implement feature',
  description: 'Detailed description',
  priority: 'HIGH',
  dueDate: '2026-01-25T10:00:00Z',
  estimatedHours: 4
})

// Update task
await taskStore.updateTask(boardId, listId, taskId, {
  title: 'Updated title',
  priority: 'URGENT'
})

// Move task to another list
await taskStore.moveTask(boardId, listId, taskId, {
  targetListId: 'list2',
  position: 0
})

// Complete/Uncomplete task
await taskStore.completeTask(boardId, listId, taskId)
await taskStore.uncompleteTask(boardId, listId, taskId)

// Archive/Restore task
await taskStore.archiveTask(boardId, listId, taskId)
await taskStore.restoreTask(boardId, listId, taskId)

// Get task activities (audit log)
await taskStore.fetchTaskActivities(taskId)

// Access tasks
const activeTasks = taskStore.activeTasks
const completedTasks = taskStore.completedTasks
const urgentTasks = taskStore.urgentTasks
const overdueTasks = taskStore.overdueTasks
```

### Working with Labels

```typescript
// Fetch labels for a board
await labelStore.fetchBoardLabels(boardId)

// Create label
await labelStore.createLabel(boardId, {
  name: 'Bug',
  color: '#ef4444'
})

// Update label
await labelStore.updateLabel(boardId, labelId, {
  name: 'Critical Bug',
  color: '#dc2626'
})

// Delete label
await labelStore.deleteLabel(boardId, labelId)

// Add/Remove label to/from task
await labelStore.addLabelToTask(taskId, labelId)
await labelStore.removeLabelFromTask(taskId, labelId)
```

### Working with Comments

```typescript
// Fetch comments for a task
await commentStore.fetchTaskComments(taskId)

// Create comment (supports Markdown)
await commentStore.createComment(taskId, {
  content: '## Update\n\nThis task is **in progress**.'
})

// Update comment
await commentStore.updateComment(taskId, commentId, {
  content: 'Updated comment content'
})

// Delete comment
await commentStore.deleteComment(taskId, commentId)

// Access sorted comments
const sortedComments = commentStore.sortedComments
```

### Working with Time Entries

```typescript
// Fetch time entries for a task
await timeEntryStore.fetchTaskTimeEntries(taskId)

// Start timer
await timeEntryStore.startTimer(taskId, 'Working on implementation')

// Stop timer
await timeEntryStore.stopTimer(taskId, timeEntryId)

// Add manual time entry
await timeEntryStore.createTimeEntry(taskId, {
  type: 'MANUAL',
  startTime: '2026-01-20T09:00:00Z',
  endTime: '2026-01-20T11:30:00Z',
  duration: 9000, // seconds
  description: 'Morning work session'
})

// Update time entry
await timeEntryStore.updateTimeEntry(taskId, timeEntryId, {
  description: 'Updated description'
})

// Delete time entry
await timeEntryStore.deleteTimeEntry(taskId, timeEntryId)

// Check for active timer
const hasTimer = timeEntryStore.hasActiveTimer
const activeTimer = timeEntryStore.activeTimer

// Get total time tracked
const totalHours = timeEntryStore.totalTrackedHours
```

### Working with Attachments

```typescript
// Fetch attachments for a task
await attachmentStore.fetchTaskAttachments(taskId)

// Upload file
const file = event.target.files[0] // File from input
await attachmentStore.uploadAttachment(taskId, file)

// Monitor upload progress
const progress = attachmentStore.uploadProgress // 0-100
const isUploading = attachmentStore.isUploading

// Download attachment
await attachmentStore.downloadAttachment(taskId, attachmentId)

// Delete attachment (only uploader can delete)
await attachmentStore.deleteAttachment(taskId, attachmentId)

// Get storage stats
await attachmentStore.fetchTaskStorageStats(taskId)
await attachmentStore.fetchUserStorageStats()

// Access attachments
const imageFiles = attachmentStore.imageAttachments
const documentFiles = attachmentStore.documentAttachments
const totalSize = attachmentStore.totalSizeMB
```

### Using the Main Store

```typescript
// Initialize entire Kanban system
await kanbanStore.initialize()

// Select a board (loads lists, labels, etc.)
await kanbanStore.selectBoard(boardId)

// Create and select board
await kanbanStore.createAndSelectBoard({
  name: 'New Board',
  color: '#10b981'
})

// Delete current board
await kanbanStore.deleteCurrentBoard()

// Access current board
const currentBoard = kanbanStore.selectedBoard
const hasBoard = kanbanStore.hasSelectedBoard

// Change view mode
kanbanStore.setViewMode('list') // 'board' | 'list' | 'calendar'

// Toggle archived items visibility
kanbanStore.toggleShowArchived()

// Clear all data
kanbanStore.clearAll()
```

## Error Handling

All stores include error handling. Check the `error` property after operations:

```typescript
const result = await boardStore.createBoard(data)

if (!result.success) {
  console.error(result.error)
  // Show error to user
  toast.error(result.error)
}
```

## Loading States

All stores include loading indicators:

```typescript
if (boardStore.isLoading) {
  // Show loading spinner
}
```

## Type Safety

All stores use TypeScript types defined in `~/types/kanban-api.ts`:
- `Board`, `BoardList`, `Task`
- `Label`, `TaskComment`, `TaskAttachment`
- `TaskActivity`, `TaskTimeEntry`
- `TaskPriority`, `TimeEntryType`, `TaskActivityAction`

## API Response Format

All API calls return consistent response format:

```typescript
interface ApiResponse<T> {
  status: 'success' | 'error'
  data?: T
  message?: string
}
```

## Authentication

All stores automatically include the JWT token from `useAuthStore()` in API requests. Make sure the user is authenticated before using Kanban stores.

## Data Persistence

- Board selection is persisted to localStorage
- View mode preference is saved to localStorage
- All other data is fetched from the backend API

## Performance Tips

1. **Lazy Loading**: Only load task details when needed
2. **Selective Fetching**: Fetch comments/attachments only when viewing a task
3. **Clear Data**: Use `clearAll()` when navigating away from Kanban
4. **Pagination**: Consider implementing pagination for tasks if boards grow large

## Best Practices

1. Always check `result.success` after store actions
2. Clear errors using `clearError()` after showing to user
3. Use getters for computed data (e.g., `activeBoards`, `completedTasks`)
4. Initialize the main store once in the Kanban page component
5. Use the main store for board selection to ensure proper data loading
