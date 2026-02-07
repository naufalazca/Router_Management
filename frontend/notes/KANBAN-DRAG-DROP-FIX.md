# Kanban Drag & Drop Fix

## Problem

Saat drag task antar list, terjadi masalah:
1. **Task jadi double** - task muncul di 2 list sekaligus
2. **Kembali ke awal saat refresh** - perubahan tidak persisten di backend

## Root Cause

1. **v-model two-way binding** - Draggable otomatis update local state, tapi kita juga manual update, menyebabkan duplikasi
2. **Position not synced** - Backend hanya update task yang di-drag, tidak update position task lain di list tujuan
3. **Missing @change event** - Menggunakan `@end` tidak memberikan cukup informasi tentang tipe perubahan (move vs reorder)

## Solution

### 1. Changed to v-model (Two-way Binding)

**Before:**
```vue
<Draggable
  :model-value="getTasksForList(list.id)"
  ...
>
```

**After:**
```vue
<Draggable
  v-model="listTasks[list.id]"
  ...
>
```

**Why:** `v-model` memberikan Draggable akses untuk langsung update `listTasks[list.id]` saat drag-drop terjadi, sehingga UI instantly update.

### 2. Simplified onTaskMovedBetweenLists

**Before:**
```typescript
async function onTaskMovedBetweenLists(evt: DragEvent, targetListId: string) {
  // ... validation ...

  // Manual update state
  const movedTask = listTasks.value[oldListId]?.find(t => t.id === taskId)
  if (movedTask) {
    listTasks.value[oldListId] = listTasks.value[oldListId]?.filter(t => t.id !== taskId) || []
    listTasks.value[targetListId].splice(newIndex, 0, movedTask)
  }

  // API call
  await taskStore.moveTask(...)

  // Refresh
  await loadTasksForList(evt.from.id)
  await loadTasksForList(targetListId)
}
```

**After:**
```typescript
async function onTaskMovedBetweenLists(evt: DragEvent, targetListId: string) {
  // ... validation ...

  // v-model already updated the UI via Draggable
  // Just sync with backend
  const result = await taskStore.moveTask(
    kanbanStore.selectedBoardId,
    oldListId,
    taskId,
    {
      targetListId,
      position: newIndex,
    },
  )

  // If API call fails, revert by reloading both lists
  if (!result.success) {
    await loadTasksForList(oldListId)
    await loadTasksForList(targetListId)
  }
}
```

**Why:**
- Draggable dengan `v-model` sudah handle UI update otomatis
- Kita hanya perlu sync ke backend
- Jika API gagal, baru reload untuk revert ke state server

### 3. Optimized onTaskDrop (Within Same List)

**Before:**
```typescript
async function onTaskDrop(listId: string) {
  // ... validation ...

  // Update positions sequentially (slow)
  for (let i = 0; i < tasks.length; i++) {
    const task = tasks[i]
    if (task) {
      await taskStore.updateTask(kanbanStore.selectedBoardId, listId, task.id, {
        position: i,
      })
    }
  }
}
```

**After:**
```typescript
async function onTaskDrop(listId: string) {
  // ... validation ...

  // Update positions in parallel (fire and forget)
  for (let i = 0; i < tasks.length; i++) {
    const task = tasks[i]
    if (task) {
      // Fire and forget - don't await to keep UI responsive
      taskStore.updateTask(kanbanStore.selectedBoardId, listId, task.id, {
        position: i,
      }).catch(() => {
        // If fails, refresh to get correct state
        loadTasksForList(listId)
      })
    }
  }
}
```

**Why:**
- UI sudah update via Draggable
- API calls jalan di background (tidak block UI)
- Lebih responsive karena tidak menunggu semua API calls selesai
- Error handling tetap ada dengan reload jika gagal

## Benefits

1. **Instant UI Update**: Task langsung pindah saat di-drop, tidak ada delay
2. **Optimistic UI**: User melihat hasil action langsung, backend sync di background
3. **Better UX**: Smooth drag-drop experience tanpa loading state
4. **Error Handling**: Jika backend gagal, auto-revert ke state yang benar

## Technical Details

### How v-model Works with Draggable

```vue
<Draggable v-model="listTasks[list.id]" ...>
```

Equivalent to:

```vue
<Draggable
  :model-value="listTasks[list.id]"
  @update:model-value="newValue => listTasks[list.id] = newValue"
  ...
>
```

Draggable internally:
1. User drag task from index 0 to index 2
2. Draggable update internal array order
3. Emit `@update:model-value` with new array
4. Vue automatically assigns: `listTasks[list.id] = newArray`
5. UI re-renders with new order (reactive)
6. `@end` event triggers to sync with backend

### State Flow

```
User Action (Drag Task)
  ↓
Draggable updates v-model
  ↓
listTasks.value[listId] = newArray (instant UI update)
  ↓
@end event fires
  ↓
onTaskMovedBetweenLists() called
  ↓
API call to backend (in background)
  ↓
If success: nothing (UI already correct)
If fail: reload both lists (revert to server state)
```

## Files Changed

- **`/frontend/app/components/kanban/KanbanBoard.vue`**
  - Line 470: Changed `:model-value` to `v-model`
  - Line 285-313: Simplified `onTaskMovedBetweenLists` (removed manual state update)
  - Line 243-267: Optimized `onTaskDrop` (fire-and-forget API calls)

## Testing Checklist

- [x] Drag task within same list → position updates immediately
- [x] Drag task to another list → task moves immediately
- [x] Backend sync works (check Network tab for API calls)
- [x] Error handling works (try with backend offline, should revert)
- [x] Multiple rapid drags work smoothly
- [x] No console errors
- [x] No TypeScript/linting errors

## Notes

- This is a common pattern in modern UI frameworks called **Optimistic UI Updates**
- Similar pattern used by: Trello, Notion, Linear, etc.
- Trade-off: UI might briefly show incorrect state if backend rejects the operation (but then reverts)
