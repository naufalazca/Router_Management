<script setup lang="ts">
import type { UseTimeAgoMessages, UseTimeAgoOptions, UseTimeAgoUnitNamesDefault } from '@vueuse/core'
import type { Task, TaskComment } from '~/types/kanban-api'
import { DateFormatter } from '@internationalized/date'
import { nextTick } from 'vue'
import { useAuthStore } from '~/stores/auth'
import { useKanbanAttachmentStore } from '~/stores/kanban-attachment'
import { useKanbanCommentStore } from '~/stores/kanban-comment'
import { useKanbanTaskStore } from '~/stores/kanban-task'

const props = defineProps<{
  boardId: string
  listId: string
  taskId: string
  open: boolean
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  'taskUpdated': []
}>()

const taskStore = useKanbanTaskStore()
const commentStore = useKanbanCommentStore()
const attachmentStore = useKanbanAttachmentStore()
const authStore = useAuthStore()

const df = new DateFormatter('en-US', {
  dateStyle: 'medium',
  timeStyle: 'short',
})

const task = ref<Task | null>(null)
const isLoadingDetails = ref(false)
const newCommentContent = ref('')
const editingCommentId = ref<string | null>(null)
const editingCommentContent = ref('')
const fullsizeImageUrl = ref<string | null>(null)
const fullsizeImageName = ref<string>('')

// Load task details when modal opens
watch(() => props.open, (newVal, oldVal) => {
  // Only trigger if state actually changed
  if (newVal === oldVal)
    return

  if (newVal && props.taskId) {
    // Reset loading state
    isLoadingDetails.value = false

    // Set initial data from task store if available (optimistic UI)
    const cachedTask = taskStore.getTaskById(props.taskId)
    if (cachedTask) {
      task.value = cachedTask
    }

    // Use nextTick to ensure DOM is ready
    nextTick(() => {
      loadTaskDetails()
    })
  }
  else {
    // Clean up when modal closes
    task.value = null
    isLoadingDetails.value = false
    commentStore.clearComments()
    attachmentStore.clearAttachments()
    newCommentContent.value = ''
    editingCommentId.value = null
  }
}, { immediate: true })

async function loadTaskDetails() {
  // Prevent multiple simultaneous fetches
  if (isLoadingDetails.value)
    return

  isLoadingDetails.value = true

  try {
    // Fetch all data in parallel for better performance
    const [taskResult] = await Promise.all([
      taskStore.fetchTaskById(props.boardId, props.listId, props.taskId),
      commentStore.fetchTaskComments(props.taskId),
      attachmentStore.fetchTaskAttachments(props.taskId),
    ])

    if (taskResult.success && taskResult.data) {
      task.value = taskResult.data
    }
  }
  catch (error) {
    console.error('Error loading task details:', error)
  }
  finally {
    isLoadingDetails.value = false
  }
}

function closeModal() {
  emit('update:open', false)
}

async function addComment() {
  if (!newCommentContent.value.trim())
    return

  const result = await commentStore.createComment(props.taskId, {
    content: newCommentContent.value.trim(),
  })

  if (result.success) {
    newCommentContent.value = ''
    // Refresh comments
    await commentStore.fetchTaskComments(props.taskId)
  }
}

function startEditComment(comment: TaskComment) {
  editingCommentId.value = comment.id
  editingCommentContent.value = comment.content
}

function cancelEditComment() {
  editingCommentId.value = null
  editingCommentContent.value = ''
}

async function saveEditComment(commentId: string) {
  if (!editingCommentContent.value.trim())
    return

  const result = await commentStore.updateComment(
    props.taskId,
    commentId,
    { content: editingCommentContent.value.trim() },
  )

  if (result.success) {
    editingCommentId.value = null
    editingCommentContent.value = ''
    // Refresh comments
    await commentStore.fetchTaskComments(props.taskId)
  }
}

async function deleteComment(commentId: string) {
  const result = await commentStore.deleteComment(props.taskId, commentId)
  if (result.success) {
    // Refresh comments
    await commentStore.fetchTaskComments(props.taskId)
  }
}

async function toggleComplete() {
  if (!task.value)
    return

  const isCompleted = !!task.value.completedAt

  if (isCompleted) {
    await taskStore.uncompleteTask(props.boardId, props.listId, props.taskId)
  }
  else {
    await taskStore.completeTask(props.boardId, props.listId, props.taskId)
  }

  // Reload task details
  await loadTaskDetails()
  emit('taskUpdated')
}

function colorPriority(p?: string) {
  if (!p || p === 'LOW')
    return 'text-blue-500'
  if (p === 'MEDIUM')
    return 'text-warning'
  if (p === 'HIGH')
    return 'text-orange-500'
  return 'text-destructive'
}

function iconPriority(p?: string) {
  if (!p || p === 'LOW')
    return 'lucide:chevron-down'
  if (p === 'MEDIUM')
    return 'lucide:equal'
  if (p === 'HIGH')
    return 'lucide:chevron-up'
  return 'lucide:chevrons-up'
}

function formatFileSize(bytes: number): string {
  if (bytes === 0)
    return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${Math.round(bytes / k ** i * 100) / 100} ${sizes[i]}`
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

function canEditComment(comment: TaskComment): boolean {
  return comment.userId === authStore.user?.id
}

function openFullsizeImage(url: string, name: string) {
  fullsizeImageUrl.value = url
  fullsizeImageName.value = name
}

function closeFullsizeImage() {
  fullsizeImageUrl.value = null
  fullsizeImageName.value = ''
}
</script>

<template>
  <Dialog :open="open" @update:open="closeModal">
    <DialogContent class="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle class="flex items-center gap-2">
          <Icon name="lucide:file-text" class="size-5" />
          <span v-if="task">{{ task.title }}</span>
          <span v-else>Loading...</span>
        </DialogTitle>
        <DialogDescription class="sr-only">
          Task details and comments
        </DialogDescription>
      </DialogHeader>

      <div v-if="task" class="flex flex-col gap-6 py-4">
        <!-- Task Meta Info -->
        <div class="flex items-center justify-between gap-2 flex-wrap">
          <div class="flex items-center gap-2">
            <Badge variant="outline" class="font-mono">
              #{{ task.id.substring(0, 8) }}
            </Badge>
            <Badge v-if="task.priority" variant="secondary" class="flex items-center gap-1" :class="colorPriority(task.priority)">
              <Icon :name="iconPriority(task.priority)" class="size-3" />
              <span class="capitalize">{{ task.priority.toLowerCase() }}</span>
            </Badge>
            <Badge v-if="task.completedAt" variant="default" class="bg-green-600">
              <Icon name="lucide:check-circle" class="size-3 mr-1" />
              Completed
            </Badge>
          </div>
          <Button
            size="sm"
            :variant="task.completedAt ? 'outline' : 'default'"
            @click="toggleComplete"
          >
            <Icon :name="task.completedAt ? 'lucide:x-circle' : 'lucide:check-circle'" class="mr-2" />
            {{ task.completedAt ? 'Mark Incomplete' : 'Mark Complete' }}
          </Button>
        </div>

        <!-- Task Description -->
        <div v-if="task.description" class="space-y-2">
          <Label class="text-sm font-semibold">Description</Label>
          <p class="text-sm text-muted-foreground whitespace-pre-wrap">
            {{ task.description }}
          </p>
        </div>

        <!-- Task Details Grid -->
        <div class="grid grid-cols-2 gap-4">
          <div class="space-y-1">
            <Label class="text-xs text-muted-foreground">Created By</Label>
            <div class="flex items-center gap-2">
              <Avatar class="size-6">
                <AvatarFallback class="text-[10px]">
                  {{ task.creator?.username.substring(0, 2).toUpperCase() || '??' }}
                </AvatarFallback>
              </Avatar>
              <span class="text-sm">{{ task.creator?.username || 'Unknown' }}</span>
            </div>
          </div>

          <div class="space-y-1">
            <Label class="text-xs text-muted-foreground">Created At</Label>
            <p class="text-sm">
              {{ df.format(new Date(task.createdAt)) }}
            </p>
          </div>

          <div v-if="task.dueDate" class="space-y-1">
            <Label class="text-xs text-muted-foreground">Due Date</Label>
            <p class="text-sm flex items-center gap-1">
              <Icon name="lucide:clock" class="size-3.5" />
              {{ df.format(new Date(task.dueDate)) }}
              <span class="text-xs text-muted-foreground">
                ({{ useTimeAgo(task.dueDate, OPTIONS) }})
              </span>
            </p>
          </div>

          <div v-if="task.estimatedHours" class="space-y-1">
            <Label class="text-xs text-muted-foreground">Estimated Hours</Label>
            <p class="text-sm">
              {{ task.estimatedHours }}h
            </p>
          </div>

          <div v-if="task.completedAt" class="space-y-1">
            <Label class="text-xs text-muted-foreground">Completed At</Label>
            <p class="text-sm">
              {{ df.format(new Date(task.completedAt)) }}
            </p>
          </div>
        </div>

        <!-- Labels -->
        <div v-if="task.taskLabels && task.taskLabels.length > 0" class="space-y-2">
          <Label class="text-sm font-semibold">Labels</Label>
          <div class="flex items-center gap-2 flex-wrap">
            <Badge
              v-for="taskLabel in task.taskLabels"
              :key="taskLabel.id"
              variant="outline"
              :style="{ borderColor: taskLabel.label?.color, color: taskLabel.label?.color }"
            >
              {{ taskLabel.label?.name }}
            </Badge>
          </div>
        </div>

        <!-- Attachments -->
        <div v-if="attachmentStore.attachments.length > 0" class="space-y-3">
          <Label class="text-sm font-semibold">
            Attachments ({{ attachmentStore.attachmentCount }})
          </Label>

          <!-- Image Attachments Grid -->
          <div
            v-if="attachmentStore.attachments.some(a => a.mimeType.startsWith('image/'))"
            class="grid grid-cols-2 gap-3"
          >
            <div
              v-for="attachment in attachmentStore.attachments.filter(a => a.mimeType.startsWith('image/'))"
              :key="attachment.id"
              class="relative group border rounded-lg overflow-hidden bg-muted cursor-pointer"
              @click="openFullsizeImage(attachment.storageUrl, attachment.fileName)"
            >
              <img
                :src="attachment.storageUrl"
                :alt="attachment.fileName"
                class="w-full h-48 object-cover hover:opacity-90 transition-opacity"
              >
              <div class="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                <Icon name="lucide:maximize-2" class="h-8 w-8 text-white drop-shadow-lg" />
              </div>
              <div class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                <p class="text-xs text-white truncate">
                  {{ attachment.fileName }}
                </p>
                <p class="text-[10px] text-white/70">
                  {{ formatFileSize(Number(attachment.fileSize)) }}
                </p>
              </div>
            </div>
          </div>

          <!-- Non-Image Attachments List -->
          <div
            v-if="attachmentStore.attachments.some(a => !a.mimeType.startsWith('image/'))"
            class="space-y-2"
          >
            <div
              v-for="attachment in attachmentStore.attachments.filter(a => !a.mimeType.startsWith('image/'))"
              :key="attachment.id"
              class="flex items-center justify-between p-2 border rounded hover:bg-accent/50"
            >
              <div class="flex items-center gap-2 flex-1 min-w-0">
                <Icon
                  name="lucide:file"
                  class="flex-shrink-0 text-muted-foreground"
                />
                <div class="flex-1 min-w-0">
                  <p class="text-sm truncate">
                    {{ attachment.fileName }}
                  </p>
                  <p class="text-xs text-muted-foreground">
                    {{ formatFileSize(Number(attachment.fileSize)) }}
                  </p>
                </div>
              </div>
              <Button
                size="icon"
                variant="ghost"
                class="h-8 w-8"
                @click="attachmentStore.downloadAttachment(taskId, attachment.id)"
              >
                <Icon name="lucide:download" class="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <Separator />

        <!-- Comments Section -->
        <div class="space-y-4">
          <div class="flex items-center justify-between">
            <Label class="text-sm font-semibold">
              Comments ({{ commentStore.commentCount }})
            </Label>
            <Icon v-if="isLoadingDetails" name="lucide:loader-2" class="size-4 animate-spin text-muted-foreground" />
          </div>

          <!-- Add Comment -->
          <div class="flex gap-2">
            <Avatar class="size-8">
              <AvatarFallback class="text-xs">
                {{ authStore.user?.username.substring(0, 2).toUpperCase() || '??' }}
              </AvatarFallback>
            </Avatar>
            <div class="flex-1 space-y-2">
              <Textarea
                v-model="newCommentContent"
                placeholder="Write a comment..."
                rows="3"
                @keydown.ctrl.enter="addComment"
                @keydown.meta.enter="addComment"
              />
              <div class="flex justify-end">
                <Button
                  size="sm"
                  :disabled="!newCommentContent.trim() || commentStore.isLoading"
                  @click="addComment"
                >
                  <Icon v-if="commentStore.isLoading" name="lucide:loader-2" class="mr-2 animate-spin" />
                  Add Comment
                </Button>
              </div>
            </div>
          </div>

          <!-- Comments List -->
          <div v-if="commentStore.sortedComments.length > 0" class="space-y-4">
            <div
              v-for="comment in commentStore.sortedComments"
              :key="comment.id"
              class="flex gap-2 p-3 border rounded hover:bg-accent/20"
            >
              <Avatar class="size-8">
                <AvatarFallback class="text-xs">
                  {{ comment.user?.username.substring(0, 2).toUpperCase() || '??' }}
                </AvatarFallback>
              </Avatar>
              <div class="flex-1 space-y-2">
                <div class="flex items-center justify-between gap-2">
                  <div class="flex items-center gap-2 text-sm">
                    <span class="font-semibold">{{ comment.user?.username || 'Unknown' }}</span>
                    <span class="text-xs text-muted-foreground">
                      {{ useTimeAgo(comment.createdAt, OPTIONS) }}
                    </span>
                    <span v-if="comment.editedAt" class="text-xs text-muted-foreground italic">
                      (edited)
                    </span>
                  </div>
                  <DropdownMenu v-if="canEditComment(comment)">
                    <DropdownMenuTrigger as-child>
                      <Button size="icon-sm" variant="ghost" class="size-6">
                        <Icon name="lucide:more-vertical" class="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem @click="startEditComment(comment)">
                        <Icon name="lucide:edit-2" class="size-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        variant="destructive"
                        class="text-destructive"
                        @click="deleteComment(comment.id)"
                      >
                        <Icon name="lucide:trash-2" class="size-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <!-- Comment Content (View Mode) -->
                <p v-if="editingCommentId !== comment.id" class="text-sm whitespace-pre-wrap">
                  {{ comment.content }}
                </p>

                <!-- Comment Content (Edit Mode) -->
                <div v-else class="space-y-2">
                  <Textarea
                    v-model="editingCommentContent"
                    rows="3"
                    @keydown.esc="cancelEditComment"
                  />
                  <div class="flex justify-end gap-2">
                    <Button size="sm" variant="ghost" @click="cancelEditComment">
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      :disabled="!editingCommentContent.trim()"
                      @click="saveEditComment(comment.id)"
                    >
                      Save
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div v-else class="text-center py-8 text-sm text-muted-foreground">
            No comments yet. Be the first to comment!
          </div>
        </div>
      </div>

      <!-- Loading State -->
      <div v-else class="flex items-center justify-center py-12">
        <Icon name="lucide:loader-2" class="size-8 animate-spin text-muted-foreground" />
      </div>

      <DialogFooter>
        <Button variant="outline" @click="closeModal">
          Close
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>

  <!-- Fullsize Image Viewer -->
  <Dialog :open="!!fullsizeImageUrl" @update:open="(val) => !val && closeFullsizeImage()">
    <DialogContent class="max-w-[95vw] max-h-[95vh] p-0 overflow-hidden">
      <DialogHeader class="px-6 py-4 border-b">
        <DialogTitle class="truncate">
          {{ fullsizeImageName }}
        </DialogTitle>
        <DialogDescription class="sr-only">
          Fullsize image view
        </DialogDescription>
      </DialogHeader>
      <div class="flex items-center justify-center bg-black/5 p-4 max-h-[calc(95vh-80px)] overflow-auto">
        <img
          v-if="fullsizeImageUrl"
          :src="fullsizeImageUrl"
          :alt="fullsizeImageName"
          class="max-w-full max-h-full object-contain"
        >
      </div>
    </DialogContent>
  </Dialog>
</template>
