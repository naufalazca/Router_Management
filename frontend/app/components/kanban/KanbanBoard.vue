<script setup lang="ts">
import type { DateValue } from '@internationalized/date'
import type { UseTimeAgoMessages, UseTimeAgoOptions, UseTimeAgoUnitNamesDefault } from '@vueuse/core'
import type { Task as ApiTask, BoardList, TaskPriority } from '~/types/kanban-api'
import {
  CalendarDateTime,
  DateFormatter,
  getLocalTimeZone,
  parseAbsoluteToLocal,
} from '@internationalized/date'
import Draggable from 'vuedraggable'
import { useKanbanAttachmentStore, useKanbanListStore, useKanbanStore, useKanbanTaskStore } from '~/stores/kanban'
import CardFooter from '../ui/card/CardFooter.vue'

const kanbanStore = useKanbanStore()
const listStore = useKanbanListStore()
const taskStore = useKanbanTaskStore()
const attachmentStore = useKanbanAttachmentStore()

const df = new DateFormatter('en-US', {
  dateStyle: 'medium',
})
const dueDate = ref<DateValue | undefined>()
const dueTime = ref<string | undefined>('00:00')

watch(() => dueTime.value, (newVal) => {
  if (!newVal)
    return
  if (dueDate.value) {
    const [hours, minutes] = newVal.split(':').map(Number)
    dueDate.value = new CalendarDateTime(
      dueDate.value.year,
      dueDate.value.month,
      dueDate.value.day,
      hours,
      minutes,
    )
  }
})

const showModalTask = ref<{ type: 'create' | 'edit', open: boolean, listId: string | null, taskId?: string | null }>({
  type: 'create',
  open: false,
  listId: null,
  taskId: null,
})

const showViewTask = ref<{ open: boolean, listId: string | null, taskId: string | null }>({
  open: false,
  listId: null,
  taskId: null,
})

const newTask = reactive<{
  title: string
  description?: string
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  dueDate?: Date
  startDate?: Date
  estimatedHours?: number
}>({
  title: '',
  description: '',
  priority: undefined,
  dueDate: undefined,
  startDate: undefined,
  estimatedHours: undefined,
})

// File upload state
const fileInput = ref<HTMLInputElement | null>(null)
const selectedFile = ref<File | null>(null)

function resetData() {
  dueDate.value = undefined
  dueTime.value = '00:00'
  newTask.title = ''
  newTask.description = ''
  newTask.priority = undefined
  newTask.dueDate = undefined
  newTask.startDate = undefined
  newTask.estimatedHours = undefined
  selectedFile.value = null
  attachmentStore.clearAttachments()
}

function handleFileSelect(event: Event) {
  const target = event.target as HTMLInputElement
  if (target.files && target.files.length > 0) {
    selectedFile.value = target.files[0] || null
  }
}

async function uploadAttachment() {
  if (!selectedFile.value || !showModalTask.value.taskId)
    return

  const result = await attachmentStore.uploadAttachment(
    showModalTask.value.taskId,
    selectedFile.value,
  )

  if (result.success) {
    selectedFile.value = null
    if (fileInput.value) {
      fileInput.value.value = ''
    }
    // Refresh attachments
    await attachmentStore.fetchTaskAttachments(showModalTask.value.taskId)
  }
}

async function deleteAttachment(attachmentId: string) {
  if (!showModalTask.value.taskId)
    return

  const result = await attachmentStore.deleteAttachment(
    showModalTask.value.taskId,
    attachmentId,
  )

  if (result.success) {
    // Refresh attachments
    await attachmentStore.fetchTaskAttachments(showModalTask.value.taskId)
  }
}

function formatFileSize(bytes: number): string {
  if (bytes === 0)
    return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${Math.round(bytes / k ** i * 100) / 100} ${sizes[i]}`
}

watch(() => showModalTask.value.open, (newVal) => {
  if (!newVal)
    resetData()
})

function openNewTask(listId: string) {
  showModalTask.value = { type: 'create', open: true, listId }
  resetData()
}

async function createTask() {
  if (!showModalTask.value.listId || !newTask.title.trim() || !kanbanStore.selectedBoardId)
    return

  const payload = {
    title: newTask.title.trim(),
    description: newTask.description?.trim(),
    priority: newTask.priority,
    dueDate: dueDate.value?.toDate(getLocalTimeZone()).toISOString(),
    startDate: newTask.startDate?.toISOString(),
    estimatedHours: newTask.estimatedHours,
  }

  const result = await taskStore.createTask(
    kanbanStore.selectedBoardId,
    showModalTask.value.listId,
    payload,
  )

  if (result.success && result.data) {
    // If there's a file selected, upload it after creating the task
    if (selectedFile.value) {
      await attachmentStore.uploadAttachment(
        result.data.id,
        selectedFile.value,
      )
    }

    showModalTask.value.open = false
    // Refresh tasks for this list
    await loadTasksForList(showModalTask.value.listId)
  }
}

async function editTask() {
  if (!showModalTask.value.listId || !showModalTask.value.taskId || !newTask.title.trim() || !kanbanStore.selectedBoardId)
    return

  const payload = {
    title: newTask.title.trim(),
    description: newTask.description?.trim(),
    priority: newTask.priority,
    dueDate: dueDate.value?.toDate(getLocalTimeZone()).toISOString(),
    startDate: newTask.startDate?.toISOString(),
    estimatedHours: newTask.estimatedHours,
  }

  const result = await taskStore.updateTask(
    kanbanStore.selectedBoardId,
    showModalTask.value.listId,
    showModalTask.value.taskId,
    payload,
  )

  if (result.success) {
    showModalTask.value.open = false
    // Refresh tasks for this list
    await loadTasksForList(showModalTask.value.listId)
  }
}

function showViewTaskModal(listId: string, taskId: string) {
  showViewTask.value = { open: true, listId, taskId }
}

async function showEditTask(listId: string, taskId: string) {
  const task = getTaskFromList(listId, taskId)
  if (!task)
    return

  newTask.title = task.title
  newTask.description = task.description || ''
  newTask.priority = task.priority
  newTask.estimatedHours = task.estimatedHours ? Number(task.estimatedHours) : undefined

  if (task.dueDate) {
    dueDate.value = parseAbsoluteToLocal(task.dueDate)
    dueTime.value = `${dueDate.value.hour < 10 ? `0${dueDate.value?.hour}` : dueDate.value?.hour}:${dueDate.value.minute < 10 ? `0${dueDate.value?.minute}` : dueDate.value?.minute}`
  }

  showModalTask.value = { type: 'edit', open: true, listId, taskId }

  // Fetch attachments for this task
  await attachmentStore.fetchTaskAttachments(taskId)
}

async function onTaskUpdated() {
  // Refresh tasks when a task is updated from the view modal
  if (showViewTask.value.listId) {
    await loadTasksForList(showViewTask.value.listId)
  }
}

async function onColumnDrop() {
  // Reorder lists based on new positions
  if (!kanbanStore.selectedBoardId)
    return

  const positions = listStore.lists.map((list, index) => ({
    listId: list.id,
    position: index,
  }))

  await listStore.reorderLists(kanbanStore.selectedBoardId, positions)
}

async function renameColumn(id: string) {
  const titleRef = document.getElementById(`col-title-${id}`) as HTMLElement
  if (titleRef)
    setTimeout(() => titleRef.focus(), 500)
}

async function onUpdateColumn(evt: any, id: string) {
  if (!evt.target.textContent?.trim() || !kanbanStore.selectedBoardId)
    return

  await listStore.updateList(kanbanStore.selectedBoardId, id, {
    name: evt.target.textContent?.trim(),
  })
}

function updateListTasks(listId: string, newValue: ApiTask[]) {
  // Update local state immediately for smooth UI
  listTasks.value[listId] = newValue
}

async function onTaskChange(evt: any, currentListId: string) {
  if (!kanbanStore.selectedBoardId)
    return

  // Draggable change event types: 'add', 'remove', 'moved'
  if (evt.added) {
    // Task was added to this list (moved from another list)
    const taskId = evt.added.element.id
    const newIndex = evt.added.newIndex
    const oldListId = evt.added.element.listId // Original list ID

    // Move task to new list
    await taskStore.moveTask(
      kanbanStore.selectedBoardId,
      oldListId,
      taskId,
      {
        targetListId: currentListId,
        position: newIndex,
      },
    )

    // Reload both lists to sync with backend
    await loadTasksForList(oldListId)
    await loadTasksForList(currentListId)
  }
  else if (evt.moved) {
    // Task was reordered within the same list
    const taskId = evt.moved.element.id
    const newIndex = evt.moved.newIndex

    // Update task position
    await taskStore.updateTask(
      kanbanStore.selectedBoardId,
      currentListId,
      taskId,
      {
        position: newIndex,
      },
    )

    // Reload list to sync with backend
    await loadTasksForList(currentListId)
  }
}

async function removeColumn(id: string) {
  if (!kanbanStore.selectedBoardId)
    return
  await listStore.deleteList(kanbanStore.selectedBoardId, id)
}

async function removeTask(listId: string, taskId: string) {
  if (!kanbanStore.selectedBoardId)
    return

  await taskStore.deleteTask(kanbanStore.selectedBoardId, listId, taskId)
  await loadTasksForList(listId)
}

// Load tasks for a specific list
const listTasks = ref<Record<string, ApiTask[]>>({})

async function loadTasksForList(listId: string) {
  if (!kanbanStore.selectedBoardId)
    return

  const result = await taskStore.fetchListTasks(kanbanStore.selectedBoardId, listId)
  if (result.success && result.data) {
    listTasks.value[listId] = result.data
  }
}

// Load all tasks when board or lists change
watch(() => listStore.lists, async (newLists, oldLists) => {
  if (!kanbanStore.selectedBoardId)
    return

  // Only reload if the number of lists changed or board changed
  // Deep watch is removed to prevent unnecessary reloads
  const oldLength = oldLists?.length || 0
  if (newLists.length !== oldLength) {
    // Load tasks for each list
    for (const list of newLists) {
      await loadTasksForList(list.id)
    }
  }
}, { immediate: true })

function getTasksForList(listId: string): ApiTask[] {
  return listTasks.value[listId] || []
}

function getTaskFromList(listId: string, taskId: string): ApiTask | undefined {
  return getTasksForList(listId).find(t => t.id === taskId)
}

function colorPriority(p?: TaskPriority) {
  if (!p || p === 'LOW')
    return 'text-blue-500'
  if (p === 'MEDIUM')
    return 'text-warning'
  if (p === 'HIGH')
    return 'text-orange-500'
  return 'text-destructive'
}

function iconPriority(p?: TaskPriority) {
  if (!p || p === 'LOW')
    return 'lucide:chevron-down'
  if (p === 'MEDIUM')
    return 'lucide:equal'
  if (p === 'HIGH')
    return 'lucide:chevron-up'
  return 'lucide:chevrons-up'
}

const SHORT_MESSAGES = {
  justNow: 'now',
  past: (n: string, _isPast: boolean) => n,
  future: (n: string, _isPast: boolean) => n,
  invalid: '',

  second: (n: number, _isPast: boolean) => `${n}sec`,
  minute: (n: number, _isPast: boolean) => `${n}min`,
  hour: (n: number, _isPast: boolean) => `${n}h`,
  day: (n: number, _isPast: boolean) => `${n}d`,
  week: (n: number, _isPast: boolean) => `${n}w`,
  month: (n: number, _isPast: boolean) => `${n}m`,
  year: (n: number, _isPast: boolean) => `${n}y`,
} as const satisfies UseTimeAgoMessages<UseTimeAgoUnitNamesDefault>

const OPTIONS: UseTimeAgoOptions<false, UseTimeAgoUnitNamesDefault> = {
  messages: SHORT_MESSAGES,
  showSecond: true,
  rounding: 'floor',
  updateInterval: 1000,
}

function isCompletedList(listName: string): boolean {
  const completedKeywords = ['selesai', 'done', 'finish']
  return completedKeywords.some(keyword => listName.toLowerCase().includes(keyword))
}
</script>

<template>
  <div class="flex gap-4 overflow-x-auto overflow-y-hidden pb-4">
    <!-- Columns Draggable wrapper -->
    <Draggable
      v-model="listStore.lists"
      class="flex gap-4 min-w-max"
      item-key="id"
      :animation="180"
      handle=".col-handle"
      ghost-class="opacity-50"
      @end="onColumnDrop"
    >
      <template #item="{ element: list }: { element: BoardList }">
        <Card class="w-[272px] shrink-0 py-2 gap-4 self-start">
          <CardHeader class="flex flex-row items-center justify-between gap-2 px-2">
            <CardTitle class="font-semibold text-base flex items-center gap-2">
              <Icon name="lucide:grip-vertical" class="col-handle cursor-grab opacity-60" />
              <span
                :id="`col-title-${list.id}`"
                contenteditable="true" class="hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50 px-1 rounded"
                @blur="onUpdateColumn($event, list.id)" @keydown.enter.prevent
              >{{ list.name }}</span>
              <Badge variant="secondary" class="h-5 min-w-5 px-1 font-mono tabular-nums">
                {{ getTasksForList(list.id).length }}
              </Badge>
            </CardTitle>
            <CardAction class="flex">
              <Button size="icon-sm" variant="ghost" class="size-7 text-muted-foreground" @click="openNewTask(list.id)">
                <Icon name="lucide:plus" />
              </Button>
              <DropdownMenu modal>
                <DropdownMenuTrigger as-child>
                  <Button size="icon-sm" variant="ghost" class="size-7 text-muted-foreground">
                    <Icon name="lucide:ellipsis-vertical" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent class="w-20" align="start">
                  <DropdownMenuItem @click="renameColumn(list.id)">
                    <Icon name="lucide:edit-2" class="size-4" />
                    Rename
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem variant="destructive" class="text-destructive" @click="removeColumn(list.id)">
                    <Icon name="lucide:trash-2" class="size-4" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </CardAction>
          </CardHeader>
          <CardContent class="px-2 overflow-y-auto overflow-x-hidden flex-1">
            <!-- Tasks within the column -->
            <Draggable
              :id="list.id"
              :model-value="getTasksForList(list.id)"
              :group="{ name: 'kanban-tasks', pull: true, put: true }"
              item-key="id"
              :animation="180"
              class="flex flex-col gap-3 min-h-[24px] p-0.5"
              ghost-class="opacity-50"
              @update:model-value="(newValue: ApiTask[]) => updateListTasks(list.id, newValue)"
              @change="(evt: any) => onTaskChange(evt, list.id)"
            >
              <template #item="{ element: task }: { element: ApiTask }">
                <div class="rounded-xl border bg-card px-3 py-2 shadow-sm hover:bg-accent/50 cursor-pointer" @click="showViewTaskModal(list.id, task.id)">
                  <div class="flex items-start justify-between gap-2">
                    <div class="text-xs text-muted-foreground font-mono">
                      #{{ task.id.substring(0, 8) }}
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger as-child @click.stop>
                        <Button size="icon-sm" variant="ghost" class="size-7 text-muted-foreground" title="More actions">
                          <Icon name="lucide:ellipsis-vertical" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent class="w-20" align="start">
                        <DropdownMenuItem @click="showViewTaskModal(list.id, task.id)">
                          <Icon name="lucide:eye" class="size-4" />
                          View
                        </DropdownMenuItem>
                        <DropdownMenuItem @click="showEditTask(list.id, task.id)">
                          <Icon name="lucide:edit-2" class="size-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem variant="destructive" class="text-destructive" @click="removeTask(list.id, task.id)">
                          <Icon name="lucide:trash-2" class="size-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <!-- Show only title with strikethrough for completed lists -->
                  <template v-if="isCompletedList(list.name)">
                    <p class="font-medium leading-5 mt-1 line-through text-muted-foreground">
                      {{ task.title }}
                    </p>
                  </template>
                  <!-- Show full task details for non-completed lists -->
                  <template v-else>
                    <p class="font-medium leading-5 mt-1">
                      {{ task.title }}
                    </p>
                    <div v-if="task.description" class="mt-2 text-sm text-muted-foreground line-clamp-2">
                      {{ task.description }}
                    </div>
                    <div v-if="task.taskLabels && task.taskLabels.length > 0" class="mt-3 flex items-center gap-1.5 flex-wrap">
                      <Badge
                        v-for="taskLabel in task.taskLabels"
                        :key="taskLabel.id"
                        variant="outline"
                        :style="{ borderColor: taskLabel.label?.color, color: taskLabel.label?.color }"
                      >
                        {{ taskLabel.label?.name }}
                      </Badge>
                    </div>
                    <div class="mt-3 flex items-center justify-between gap-2">
                      <div class="flex items-center gap-2">
                        <div v-if="task.attachments && task.attachments.length > 0" class="flex items-center text-sm text-muted-foreground gap-1">
                          <Icon name="lucide:paperclip" class="size-3.5" />
                          <span>{{ task.attachments.length }}</span>
                        </div>
                        <div v-if="task.comments && task.comments.length > 0" class="flex items-center text-sm text-muted-foreground gap-1">
                          <Icon name="lucide:message-square" class="size-3.5" />
                          <span>{{ task.comments.length }}</span>
                        </div>
                        <div v-if="task.dueDate" class="flex items-center text-sm text-muted-foreground gap-1">
                          <Icon name="lucide:clock" class="size-3.5" />
                          <span>{{ useTimeAgo(task.dueDate, OPTIONS) }}</span>
                        </div>
                      </div>
                      <div class="flex items-center gap-2">
                        <Tooltip v-if="task.priority">
                          <TooltipTrigger as-child>
                            <Icon :name="iconPriority(task.priority)" class="size-4" :class="colorPriority(task.priority)" />
                          </TooltipTrigger>
                          <TooltipContent class="capitalize">
                            {{ task.priority.toLowerCase() }}
                          </TooltipContent>
                        </Tooltip>
                        <Avatar v-if="task.creator" class="size-6">
                          <AvatarFallback class="text-[10px]">
                            {{ task.creator.username.substring(0, 2).toUpperCase() }}
                          </AvatarFallback>
                        </Avatar>
                      </div>
                    </div>
                  </template>
                </div>
              </template>
            </Draggable>
          </CardContent>
          <CardFooter class="px-2 mt-auto">
            <Button size="sm" variant="ghost" class="text-muted-foreground w-full" @click="openNewTask(list.id)">
              <Icon name="lucide:plus" />
              Add Task
            </Button>
          </CardFooter>
        </Card>
      </template>
    </Draggable>
  </div>

  <!-- New/Edit Task Dialog -->
  <Dialog v-model:open="showModalTask.open">
    <DialogContent class="sm:max-w-[520px]">
      <DialogHeader>
        <DialogTitle>{{ showModalTask.type === 'create' ? 'New Task' : 'Edit Task' }}</DialogTitle>
        <DialogDescription class="sr-only">
          {{ showModalTask.type === 'create' ? 'Add a new task to the list' : 'Edit the task' }}
        </DialogDescription>
      </DialogHeader>
      <div class="flex flex-col gap-3">
        <div class="grid items-baseline grid-cols-1 md:grid-cols-4 md:[&>label]:col-span-1 *:col-span-3 gap-3">
          <Label>Title</Label>
          <Input v-model="newTask.title" placeholder="Task title" />

          <Label>Description</Label>
          <Textarea v-model="newTask.description" placeholder="Description (optional)" rows="4" />

          <Label>Priority</Label>
          <Select v-model="newTask.priority">
            <SelectTrigger class="w-full">
              <SelectValue placeholder="Select a priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="LOW">
                Low
              </SelectItem>
              <SelectItem value="MEDIUM">
                Medium
              </SelectItem>
              <SelectItem value="HIGH">
                High
              </SelectItem>
              <SelectItem value="URGENT">
                Urgent
              </SelectItem>
            </SelectContent>
          </Select>

          <Label>Due Date</Label>
          <div class="flex items-center gap-1">
            <Popover>
              <PopoverTrigger as-child>
                <Button
                  variant="outline"
                  :class="cn(
                    'flex-1 justify-start text-left font-normal px-3',
                    !dueDate && 'text-muted-foreground',
                  )"
                >
                  <Icon name="lucide:calendar" class="mr-2" />
                  {{ dueDate ? df.format(dueDate.toDate(getLocalTimeZone())) : "Pick a date" }}
                </Button>
              </PopoverTrigger>
              <PopoverContent class="w-auto p-0">
                <Calendar v-model="dueDate" initial-focus />
              </PopoverContent>
            </Popover>
            <Input
              id="time-picker"
              v-model="dueTime"
              type="time"
              step="60"
              default-value="00:00"
              class="flex-1 bg-background appearance-none [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
            />
          </div>

          <Label>Estimated Hours</Label>
          <Input v-model.number="newTask.estimatedHours" type="number" min="0" step="0.5" placeholder="Hours (optional)" />
        </div>

        <!-- Attachments Section -->
        <div class="border-t pt-4 mt-2">
          <div class="flex items-center justify-between mb-3">
            <Label class="text-sm font-semibold">Attachments</Label>
            <span v-if="showModalTask.type === 'edit'" class="text-xs text-muted-foreground">{{ attachmentStore.attachmentCount }} file(s)</span>
          </div>

          <!-- File Upload (Create Mode - single file selection) -->
          <div v-if="showModalTask.type === 'create'" class="flex gap-2 mb-3">
            <Input
              ref="fileInput"
              type="file"
              class="flex-1"
              @change="handleFileSelect"
            />
            <Button
              v-if="selectedFile"
              size="sm"
              variant="ghost"
              @click="selectedFile = null; if (fileInput) fileInput.value = ''"
            >
              <Icon name="lucide:x" class="mr-2" />
              Clear
            </Button>
          </div>

          <!-- Selected File Preview (Create Mode) -->
          <div v-if="showModalTask.type === 'create' && selectedFile" class="p-3 border rounded-lg bg-accent/10 mb-3">
            <div class="flex items-center gap-2">
              <Icon name="lucide:paperclip" class="text-muted-foreground" />
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium truncate">{{ selectedFile.name }}</p>
                <p class="text-xs text-muted-foreground">{{ formatFileSize(selectedFile.size) }}</p>
              </div>
            </div>
            <p class="text-xs text-muted-foreground mt-2">
              File will be uploaded after task is created
            </p>
          </div>

          <!-- File Upload (Edit Mode - upload directly) -->
          <div v-if="showModalTask.type === 'edit'" class="flex gap-2 mb-3">
            <Input
              ref="fileInput"
              type="file"
              class="flex-1"
              @change="handleFileSelect"
            />
            <Button
              size="sm"
              :disabled="!selectedFile || attachmentStore.isUploading"
              @click="uploadAttachment"
            >
              <Icon v-if="attachmentStore.isUploading" name="lucide:loader-2" class="mr-2 animate-spin" />
              Upload
            </Button>
          </div>

          <!-- Upload Progress (Edit Mode only) -->
          <div v-if="showModalTask.type === 'edit' && attachmentStore.isUploading" class="mb-3">
            <div class="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <span>Uploading...</span>
              <span>{{ attachmentStore.uploadProgress }}%</span>
            </div>
            <div class="w-full bg-secondary rounded-full h-2">
              <div
                class="bg-primary h-2 rounded-full transition-all duration-300"
                :style="{ width: `${attachmentStore.uploadProgress}%` }"
              />
            </div>
          </div>

          <!-- Attachments List (Edit Mode only) -->
          <div v-if="showModalTask.type === 'edit' && attachmentStore.attachments.length > 0" class="space-y-2 max-h-48 overflow-y-auto">
            <div
              v-for="attachment in attachmentStore.attachments"
              :key="attachment.id"
              class="flex items-center justify-between p-2 border rounded hover:bg-accent/50"
            >
              <div class="flex items-center gap-2 flex-1 min-w-0">
                <Icon
                  :name="attachment.mimeType.startsWith('image/') ? 'lucide:image' : 'lucide:file'"
                  class="flex-shrink-0 text-muted-foreground"
                />
                <div class="flex-1 min-w-0">
                  <p class="text-sm truncate">{{ attachment.fileName }}</p>
                  <p class="text-xs text-muted-foreground">{{ formatFileSize(Number(attachment.fileSize)) }}</p>
                </div>
              </div>
              <div class="flex items-center gap-1">
                <Button
                  size="icon"
                  variant="ghost"
                  class="h-8 w-8"
                  @click="attachmentStore.downloadAttachment(showModalTask.taskId!, attachment.id)"
                >
                  <Icon name="lucide:download" class="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  class="h-8 w-8 text-destructive hover:text-destructive"
                  @click="deleteAttachment(attachment.id)"
                >
                  <Icon name="lucide:trash-2" class="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          <div v-else-if="showModalTask.type === 'edit'" class="text-center py-6 text-sm text-muted-foreground">
            No attachments yet
          </div>
        </div>
      </div>
      <DialogFooter>
        <Button variant="secondary" @click="showModalTask.open = false">
          Cancel
        </Button>
        <Button :disabled="taskStore.isLoading" @click="showModalTask.type === 'create' ? createTask() : editTask()">
          <Icon v-if="taskStore.isLoading" name="lucide:loader-2" class="mr-2 animate-spin" />
          {{ showModalTask.type === 'create' ? 'Create' : 'Update' }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>

  <!-- View Task Dialog -->
  <KanbanViewTask
    v-if="showViewTask.taskId"
    :board-id="kanbanStore.selectedBoardId || ''"
    :list-id="showViewTask.listId || ''"
    :task-id="showViewTask.taskId"
    :open="showViewTask.open"
    @update:open="(val) => showViewTask.open = val"
    @task-updated="onTaskUpdated"
  />
</template>
