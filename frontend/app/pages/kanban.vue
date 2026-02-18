<script setup lang="ts">
import KanbanBoard from '~/components/kanban/KanbanBoard.vue'
import KanbanLabels from '~/components/kanban/KanbanLabels.vue'
import { useKanbanBoardStore } from '~/stores/kanban-board'
import { useKanbanListStore } from '~/stores/kanban-list'
import { useKanbanStore } from '~/stores/kanban'

const kanbanStore = useKanbanStore()
const boardStore = useKanbanBoardStore()
const listStore = useKanbanListStore()

const showNewColumn = ref(false)
const showNewBoard = ref(false)
const showBoardSelector = ref(false)
const showLabelsPanel = ref(false)
const newColumnTitle = ref('')
const newColumnColor = ref('')
const newBoardData = reactive({
  name: '',
  description: '',
  color: '',
  icon: '',
})

// Initialize on mount
onMounted(async () => {
  await kanbanStore.initialize()

  // If no board selected and boards exist, select first one
  if (!kanbanStore.selectedBoardId && boardStore.boards.length > 0) {
    const firstBoard = boardStore.boards[0]
    if (firstBoard) {
      await kanbanStore.selectBoard(firstBoard.id)
    }
  }
})

async function createColumn() {
  if (!newColumnTitle.value.trim() || !kanbanStore.selectedBoardId)
    return

  const result = await listStore.createList(kanbanStore.selectedBoardId, {
    name: newColumnTitle.value.trim(),
    color: newColumnColor.value || undefined,
  })

  if (result.success) {
    newColumnTitle.value = ''
    newColumnColor.value = ''
    showNewColumn.value = false
  }
}

function createPresetList(name: string, color: string) {
  if (!kanbanStore.selectedBoardId)
    return

  listStore.createList(kanbanStore.selectedBoardId, { name, color })
  showNewColumn.value = false
}

// Preset list templates
const listPresets = [
  { name: 'Done', color: '#22c55e' },      // Green
  { name: 'Selesai', color: '#22c55e' },   // Green
  { name: 'Finish', color: '#22c55e' },    // Green
]

async function createBoard() {
  if (!newBoardData.name.trim())
    return

  const result = await kanbanStore.createAndSelectBoard({
    name: newBoardData.name.trim(),
    description: newBoardData.description.trim() || undefined,
    color: newBoardData.color || undefined,
    icon: newBoardData.icon || undefined,
  })

  if (result.success) {
    newBoardData.name = ''
    newBoardData.description = ''
    newBoardData.color = ''
    newBoardData.icon = ''
    showNewBoard.value = false
  }
}

async function selectBoard(boardId: string) {
  await kanbanStore.selectBoard(boardId)
  showBoardSelector.value = false
}

const isLoading = computed(() => boardStore.isLoading || listStore.isLoading)
</script>

<template>
  <div class="h-full">
    <div class="flex flex-col gap-4 h-full">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <div class="flex items-center gap-3">
          <Button
            v-if="kanbanStore.selectedBoard"
            variant="outline"
            size="sm"
            class="gap-1.5"
            @click="showBoardSelector = true"
          >
            <Icon :name="kanbanStore.selectedBoard?.icon || 'lucide:layout-dashboard'" />
            <span
              v-if="kanbanStore.selectedBoard?.color"
              class="size-2.5 rounded-full"
              :style="{ backgroundColor: kanbanStore.selectedBoard.color }"
            />
            <span :style="{ color: kanbanStore.selectedBoard?.color || undefined }">
              {{ kanbanStore.selectedBoard?.name }}
            </span>
            <Icon name="lucide:chevron-down" class="text-muted-foreground" />
          </Button>
          <div v-else>
            <h2 class="text-2xl font-bold tracking-tight">
              Kanban Board
            </h2>
            <p class="text-muted-foreground">
              Create your first board to get started!
            </p>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <Button v-if="kanbanStore.selectedBoardId" size="sm" variant="outline" @click="showLabelsPanel = true">
            <Icon name="lucide:tags" class="mr-2" />
            Labels
          </Button>
          <Button v-if="kanbanStore.selectedBoardId" size="sm" variant="outline" @click="showNewColumn = true">
            <Icon name="lucide:plus" />
            Add List
          </Button>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="isLoading" class="flex items-center justify-center h-64">
        <Icon name="lucide:loader-2" class="animate-spin size-8 text-muted-foreground" />
      </div>

      <!-- No Board Selected -->
      <div v-else-if="!kanbanStore.selectedBoardId" class="flex flex-col items-center justify-center h-64 text-center">
        <Icon name="lucide:layout-dashboard" class="size-16 text-muted-foreground mb-4" />
        <h3 class="text-lg font-semibold mb-2">
          No boards yet
        </h3>
        <p class="text-muted-foreground mb-4">
          Create your first board to start organizing tasks
        </p>
        <Button @click="showBoardSelector = true">
          <Icon name="lucide:plus" class="mr-2" />
          Create Board
        </Button>
      </div>

      <!-- Kanban Board -->
      <ClientOnly v-else>
        <KanbanBoard />
        <template #fallback>
          <div class="flex items-center justify-center h-64">
            <Icon name="lucide:loader-2" class="animate-spin size-8 text-muted-foreground" />
          </div>
        </template>
      </ClientOnly>
    </div>

    <!-- New List Dialog -->
    <Dialog v-model:open="showNewColumn">
      <DialogContent class="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Add New List</DialogTitle>
          <DialogDescription class="sr-only">
            Add a new list to the board
          </DialogDescription>
        </DialogHeader>
        <form name="newColumnForm" class="flex flex-col gap-4" @submit.prevent="createColumn">
          <div class="grid gap-2">
            <Label for="list-name">List Name</Label>
            <Input
              id="list-name"
              v-model="newColumnTitle"
              placeholder="e.g., To Do, In Progress, Done"
              required
            />
          </div>
          <div class="grid gap-2">
            <Label for="list-color">Color (optional)</Label>
            <div class="flex items-center gap-3">
              <Input
                id="list-color"
                v-model="newColumnColor"
                type="color"
                class="size-12 p-1 cursor-pointer"
              />
              <Input
                v-model="newColumnColor"
                type="text"
                placeholder="#3b82f6"
                pattern="^#[0-9A-Fa-f]{6}$"
                class="flex-1"
              />
            </div>
          </div>
          <!-- Quick Presets -->
          <div class="grid gap-2">
            <Label>Quick Presets</Label>
            <div class="flex flex-wrap gap-2">
              <Button
                v-for="preset in listPresets"
                :key="preset.name"
                type="button"
                variant="outline"
                size="sm"
                class="gap-1.5"
                :style="{
                  borderColor: preset.color,
                  color: preset.color,
                }"
                @click="createPresetList(preset.name, preset.color)"
              >
                <span class="size-2 rounded-full" :style="{ backgroundColor: preset.color }" />
                {{ preset.name }}
              </Button>
            </div>
          </div>
        </form>
        <DialogFooter>
          <Button variant="secondary" @click="showNewColumn = false">
            Cancel
          </Button>
          <Button type="submit" form="newColumnForm" :disabled="listStore.isLoading" @click="createColumn">
            <Icon v-if="listStore.isLoading" name="lucide:loader-2" class="mr-2 animate-spin" />
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- New Board Dialog -->
    <Dialog v-model:open="showNewBoard">
      <DialogContent class="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Create New Board</DialogTitle>
          <DialogDescription>
            Create a new board to organize your tasks
          </DialogDescription>
        </DialogHeader>
        <form name="newBoardForm" class="flex flex-col gap-4" @submit.prevent="createBoard">
          <div class="grid gap-2">
            <Label for="board-name">Name</Label>
            <Input
              id="board-name"
              v-model="newBoardData.name"
              placeholder="My Project Board"
              required
            />
          </div>
          <div class="grid gap-2">
            <Label for="board-description">Description (optional)</Label>
            <Textarea
              id="board-description"
              v-model="newBoardData.description"
              placeholder="Describe your board..."
              rows="3"
            />
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div class="grid gap-2">
              <Label for="board-color">Color (optional)</Label>
              <Input
                id="board-color"
                v-model="newBoardData.color"
                type="color"
                placeholder="#3b82f6"
              />
            </div>
            <div class="grid gap-2">
              <Label for="board-icon">Icon (optional)</Label>
              <Input
                id="board-icon"
                v-model="newBoardData.icon"
                placeholder="📋"
              />
            </div>
          </div>
        </form>
        <DialogFooter>
          <Button variant="secondary" @click="showNewBoard = false">
            Cancel
          </Button>
          <Button type="submit" form="newBoardForm" :disabled="boardStore.isLoading" @click="createBoard">
            <Icon v-if="boardStore.isLoading" name="lucide:loader-2" class="mr-2 animate-spin" />
            Create Board
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- Board Selector Dialog -->
    <Dialog v-model:open="showBoardSelector">
      <DialogContent class="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Select Board</DialogTitle>
          <DialogDescription>
            Choose a board to view or create a new one
          </DialogDescription>
        </DialogHeader>
        <div class="grid gap-2 max-h-[400px] overflow-y-auto">
          <button
            v-for="board in boardStore.activeBoards"
            :key="board.id"
            class="flex items-center gap-3 p-3 rounded-lg border hover:bg-accent transition-colors text-left"
            :class="{ 'bg-accent': board.id === kanbanStore.selectedBoardId }"
            :style="{
              borderColor: board.color || undefined,
              ...(board.id === kanbanStore.selectedBoardId && board.color ? {
                backgroundColor: `${board.color}20`,
                borderColor: board.color,
              } : {}),
            }"
            @click="selectBoard(board.id)"
          >
            <Icon
              :name="board.icon || 'lucide:layout-dashboard'"
              class="size-6"
              :style="{ color: board.color || undefined }"
            />
            <div
              v-if="board.color"
              class="size-3 rounded-full shrink-0"
              :style="{ backgroundColor: board.color }"
            />
            <div class="flex-1 min-w-0">
              <div class="font-medium truncate">
                {{ board.name }}
              </div>
              <div v-if="board.description" class="text-sm text-muted-foreground line-clamp-1">
                {{ board.description }}
              </div>
            </div>
            <Icon
              v-if="board.id === kanbanStore.selectedBoardId"
              name="lucide:check"
              class="size-5 shrink-0"
              :style="{ color: board.color || 'hsl(var(--primary))' }"
            />
          </button>
        </div>
        <DialogFooter class="gap-2">
          <Button variant="outline" @click="showNewBoard = true; showBoardSelector = false">
            <Icon name="lucide:plus" class="mr-2" />
            New Board
          </Button>
          <Button variant="secondary" @click="showBoardSelector = false">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- Labels Panel Dialog -->
    <Dialog v-model:open="showLabelsPanel">
      <DialogContent class="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage Labels</DialogTitle>
          <DialogDescription>
            Create and manage labels for your tasks
          </DialogDescription>
        </DialogHeader>
        <KanbanLabels v-if="kanbanStore.selectedBoardId" :board-id="kanbanStore.selectedBoardId" />
        <DialogFooter>
          <Button variant="secondary" @click="showLabelsPanel = false">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
