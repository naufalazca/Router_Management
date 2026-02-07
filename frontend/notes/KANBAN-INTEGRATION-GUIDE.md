# Panduan Integrasi Kanban dengan Backend API

## Ringkasan Perubahan

Kanban telah direfactor dari localStorage-based menjadi backend API-based menggunakan Pinia stores.

## File yang Diubah

### 1. [app/pages/kanban.vue](app/pages/kanban.vue)
**Perubahan:**
- ✅ Menggunakan Pinia stores (`useKanbanStore`, `useKanbanBoardStore`, `useKanbanListStore`)
- ✅ Inisialisasi board pada `onMounted`
- ✅ Fitur board selector (pilih board dari beberapa board)
- ✅ Dialog create board baru
- ✅ Loading states dan empty states
- ✅ Auto-select first board jika belum ada yang dipilih

**Fitur Baru:**
- Board selector dropdown untuk pindah antar board
- Create board dengan nama, deskripsi, warna, dan icon
- Loading spinner saat fetch data
- Empty state ketika belum ada board

### 2. [app/components/kanban/KanbanBoard.vue](app/components/kanban/KanbanBoard.vue)
**Perubahan:**
- ✅ Refactor dari localStorage ke API calls
- ✅ Drag & drop tetap berfungsi dengan backend sync
- ✅ List (column) management via API
- ✅ Task CRUD operations via API
- ✅ Support untuk labels, comments, attachments display
- ✅ Priority dengan 4 level: LOW, MEDIUM, HIGH, URGENT
- ✅ Estimated hours untuk time tracking

**Fitur yang Dipertahankan:**
- Drag and drop lists (reorder)
- Drag and drop tasks (within list & between lists)
- Inline rename list
- Create/Edit/Delete tasks
- Priority indicators dengan warna
- Due date dengan relative time display
- Task metadata (attachments count, comments count)

**Fitur Baru:**
- Real-time sync dengan backend
- Label display dengan warna custom
- Creator avatar/initials
- Estimated hours field
- Auto-refresh setelah operations

## File yang Dibuat

### Pinia Stores (7 stores)
1. `app/stores/kanban.ts` - Main coordinator store
2. `app/stores/kanban-board.ts` - Board management
3. `app/stores/kanban-list.ts` - List management
4. `app/stores/kanban-task.ts` - Task management
5. `app/stores/kanban-label.ts` - Label management
6. `app/stores/kanban-comment.ts` - Comment management
7. `app/stores/kanban-time-entry.ts` - Time tracking
8. `app/stores/kanban-attachment.ts` - File attachments

### Type Definitions
- `app/types/kanban-api.ts` - TypeScript types untuk backend API

### Documentation
- `app/stores/README-KANBAN.md` - Usage guide untuk semua stores

## Cara Kerja Integrasi

### Flow Inisialisasi
```
User buka /kanban
  ↓
kanbanStore.initialize()
  ↓
Fetch all boards (boardStore.fetchBoards())
  ↓
Select first board (kanbanStore.selectBoard())
  ↓
Fetch board lists (listStore.fetchBoardLists())
  ↓
Fetch board labels (labelStore.fetchBoardLabels())
  ↓
Watch lists → Load tasks for each list
  ↓
Render KanbanBoard component
```

### Flow Operasi Task

#### Create Task
```
User click "Add Task"
  ↓
Fill form & submit
  ↓
taskStore.createTask(boardId, listId, payload)
  ↓
API: POST /api/kanban/boards/{boardId}/lists/{listId}/tasks
  ↓
Reload tasks for this list
  ↓
UI updated
```

#### Drag & Drop Task
```
User drag task ke list lain
  ↓
onTaskMovedBetweenLists event
  ↓
taskStore.moveTask(boardId, oldListId, taskId, {targetListId, position})
  ↓
API: PATCH /api/kanban/boards/{boardId}/lists/{listId}/tasks/{taskId}/move
  ↓
Reload tasks for both lists
  ↓
UI updated
```

#### Update Task
```
User edit task
  ↓
Fill form & submit
  ↓
taskStore.updateTask(boardId, listId, taskId, payload)
  ↓
API: PUT /api/kanban/boards/{boardId}/lists/{listId}/tasks/{taskId}
  ↓
Reload tasks for this list
  ↓
UI updated
```

## API Endpoints yang Digunakan

### Boards
- `GET /api/kanban/boards` - Fetch all boards
- `GET /api/kanban/boards/:id` - Fetch board by ID
- `POST /api/kanban/boards` - Create board
- `PUT /api/kanban/boards/:id` - Update board
- `DELETE /api/kanban/boards/:id` - Delete board

### Lists
- `GET /api/kanban/boards/:boardId/lists` - Fetch lists for board
- `POST /api/kanban/boards/:boardId/lists` - Create list
- `PUT /api/kanban/boards/:boardId/lists/:id` - Update list
- `DELETE /api/kanban/boards/:boardId/lists/:id` - Delete list
- `PATCH /api/kanban/boards/:boardId/lists/reorder` - Reorder lists

### Tasks
- `GET /api/kanban/boards/:boardId/lists/:listId/tasks` - Fetch tasks for list
- `POST /api/kanban/boards/:boardId/lists/:listId/tasks` - Create task
- `PUT /api/kanban/boards/:boardId/lists/:listId/tasks/:id` - Update task
- `DELETE /api/kanban/boards/:boardId/lists/:listId/tasks/:id` - Delete task
- `PATCH /api/kanban/boards/:boardId/lists/:listId/tasks/:id/move` - Move task to another list

## Data Mapping

### Priority Mapping
```
Old (localStorage) → New (API)
'low'              → 'LOW'
'medium'           → 'MEDIUM'
'high'             → 'HIGH'
-                  → 'URGENT' (new)
```

### Task Structure Changes
```typescript
// Old (localStorage)
interface Task {
  id: string // Generated locally (TASK-001)
  title: string
  description?: string
  priority?: 'low' | 'medium' | 'high'
  dueDate?: Date
  status?: string // List ID stored here
  labels?: string[] // Array of label names
}

// New (API)
interface Task {
  id: string // UUID from database
  listId: string // Proper foreign key
  title: string
  description?: string
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  dueDate?: string // ISO string
  startDate?: string // New field
  completedAt?: string // New field
  estimatedHours?: number // New field
  taskLabels?: TaskLabel[] // Proper relations
  comments?: TaskComment[]
  attachments?: TaskAttachment[]
  creator?: User
}
```

## Persistence

### Before (localStorage)
```javascript
// Data stored in browser localStorage
localStorage.setItem('kanban.board.v1', JSON.stringify(board))
```

### After (API + localStorage for preferences)
```javascript
// Board data from API
// Only selected board ID saved to localStorage
localStorage.setItem('kanban.selectedBoardId', boardId)
```

## Testing Guide

### 1. Test Board Management
```
1. Open /kanban
2. Click "New Board"
3. Create board dengan nama "Test Board"
4. Board muncul dan auto-selected
5. Click board selector dropdown
6. Create another board
7. Switch between boards
```

### 2. Test List Management
```
1. Select a board
2. Click "Add List"
3. Create list "To Do"
4. Inline rename list dengan click title
5. Drag list untuk reorder
6. Delete list dari dropdown menu
```

### 3. Test Task Management
```
1. Click "Add Task" di list
2. Fill form:
   - Title: "Test Task"
   - Description: "Test description"
   - Priority: HIGH
   - Due Date: Tomorrow
   - Estimated Hours: 2
3. Submit
4. Task muncul di list
5. Edit task
6. Drag task ke list lain
7. Task pindah dan API sync
8. Delete task
```

### 4. Test Drag & Drop
```
1. Drag list untuk reorder
   → API call: PATCH /boards/:id/lists/reorder

2. Drag task dalam satu list
   → API call: PUT /tasks/:id (update position)

3. Drag task ke list lain
   → API call: PATCH /tasks/:id/move
```

## Troubleshooting

### Issue: Board tidak muncul
**Check:**
1. Backend server running? `npm run dev:backend`
2. API endpoint correct? Check `.env` → `NUXT_PUBLIC_API_BASE`
3. User authenticated? Check localStorage for token
4. Browser console errors?

### Issue: Drag & drop tidak sync
**Check:**
1. Network tab → API calls berhasil?
2. Check response dari move/reorder endpoints
3. Tasks reload setelah operation?

### Issue: Tasks tidak muncul
**Check:**
1. `listTasks.value` populated?
2. `loadTasksForList()` dipanggil?
3. API response includes tasks array?
4. Check watcher di line 248-255

### Issue: Create task gagal
**Check:**
1. `kanbanStore.selectedBoardId` ada?
2. `showModalTask.value.listId` ada?
3. Payload format sesuai backend validator?
4. Backend logs untuk error details

## Next Steps (Optional Enhancements)

### 1. Real-time Updates via WebSocket
```typescript
// Subscribe to board updates
const ws = useWebSocket(`/kanban/boards/${boardId}`)
ws.on('task:created', (task) => {
  // Update UI
})
```

### 2. Optimistic Updates
```typescript
// Update UI immediately, rollback on error
const optimisticTaskId = `temp-${Date.now()}`
listTasks.value[listId].push({ id: optimisticTaskId, ...newTask })

try {
  await taskStore.createTask(...)
} catch {
  // Rollback
  listTasks.value[listId] = listTasks.value[listId].filter(t => t.id !== optimisticTaskId)
}
```

### 3. Offline Support
```typescript
// Queue operations when offline
if (!navigator.onLine) {
  await offlineQueue.push({ type: 'createTask', payload })
}

// Sync when back online
window.addEventListener('online', () => {
  offlineQueue.sync()
})
```

### 4. Label & Comment Management UI
- Create label management modal
- Inline add labels to tasks
- Comment section in task detail modal

### 5. Time Tracking UI
- Start/stop timer button
- Display total tracked time
- Manual time entry form

### 6. Attachments UI
- File upload dropzone
- Preview images
- Download button

## Migration dari localStorage

Jika ada data lama di localStorage, bisa migrate dengan:

```typescript
// Optional migration script
async function migrateFromLocalStorage() {
  const oldBoard = localStorage.getItem('kanban.board.v1')
  if (!oldBoard)
    return

  const board = JSON.parse(oldBoard)

  // Create board
  const newBoard = await boardStore.createBoard({
    name: 'Migrated Board',
    description: 'Migrated from localStorage'
  })

  // Create lists
  for (const col of board.columns) {
    const list = await listStore.createList(newBoard.id, {
      name: col.title
    })

    // Create tasks
    for (const task of col.tasks) {
      await taskStore.createTask(newBoard.id, list.id, {
        title: task.title,
        description: task.description,
        priority: task.priority?.toUpperCase(),
        dueDate: task.dueDate
      })
    }
  }

  // Clear old data
  localStorage.removeItem('kanban.board.v1')
}
```

## Summary

✅ **Selesai:**
- Pinia stores created (7 stores)
- Type definitions untuk API
- kanban.vue refactored untuk board management
- KanbanBoard.vue refactored untuk API integration
- Drag & drop tetap berfungsi dengan API sync
- Loading states & error handling
- Board selector & create board UI

✅ **Ready to use:**
- Board CRUD
- List CRUD & reorder
- Task CRUD, move, & reorder
- Priority dengan 4 levels
- Due date tracking
- Estimated hours

🔄 **Belum diimplementasikan (optional):**
- Label management UI (stores ready, tinggal UI)
- Comment section UI (stores ready, tinggal UI)
- Time tracking UI (stores ready, tinggal UI)
- Attachment upload UI (stores ready, tinggal UI)

Semua stores sudah siap dan bisa digunakan kapan saja! 🚀
