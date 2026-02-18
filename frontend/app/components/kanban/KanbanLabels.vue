<script setup lang="ts">
import type { Label } from '~/types/kanban-api'
import { useKanbanLabelStore } from '~/stores/kanban-label'

interface Props {
  boardId: string
  open?: boolean
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'update:open': [value: boolean]
}>()

const labelStore = useKanbanLabelStore()

const showCreateDialog = ref(false)
const editingLabel = ref<Label | null>(null)

const newLabelData = reactive({
  name: '',
  color: '#3b82f6',
})

const editingLabelData = reactive({
  name: '',
  color: '',
})

// Preset colors
const presetColors = [
  '#ef4444', // Red
  '#f97316', // Orange
  '#eab308', // Yellow
  '#22c55e', // Green
  '#06b6d4', // Cyan
  '#3b82f6', // Blue
  '#8b5cf6', // Violet
  '#ec4899', // Pink
  '#6b7280', // Gray
]

function openCreateDialog() {
  newLabelData.name = ''
  newLabelData.color = '#3b82f6'
  showCreateDialog.value = true
}

function openEditDialog(label: Label) {
  editingLabel.value = label
  editingLabelData.name = label.name
  editingLabelData.color = label.color
}

function closeEditDialog() {
  editingLabel.value = null
  editingLabelData.name = ''
  editingLabelData.color = ''
}

async function createLabel() {
  if (!newLabelData.name.trim() || !props.boardId)
    return

  const result = await labelStore.createLabel(props.boardId, {
    name: newLabelData.name.trim(),
    color: newLabelData.color,
  })

  if (result.success) {
    newLabelData.name = ''
    newLabelData.color = '#3b82f6'
    showCreateDialog.value = false
  }
}

async function updateLabel() {
  if (!editingLabel.value || !editingLabelData.name.trim() || !props.boardId)
    return

  const result = await labelStore.updateLabel(props.boardId, editingLabel.value.id, {
    name: editingLabelData.name.trim(),
    color: editingLabelData.color,
  })

  if (result.success) {
    closeEditDialog()
  }
}

async function deleteLabel(labelId: string) {
  if (!confirm('Are you sure you want to delete this label?'))
    return

  if (!props.boardId)
    return

  await labelStore.deleteLabel(props.boardId, labelId)
}

// Fetch labels on mount
onMounted(async () => {
  if (props.boardId) {
    await labelStore.fetchBoardLabels(props.boardId)
  }
})

// Watch boardId changes
watch(() => props.boardId, async (newBoardId) => {
  if (newBoardId) {
    await labelStore.fetchBoardLabels(newBoardId)
  }
})
</script>

<template>
  <div class="space-y-4">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h3 class="text-lg font-semibold">
          Labels
        </h3>
        <p class="text-sm text-muted-foreground">
          Create and manage labels for your tasks
        </p>
      </div>
      <Button size="sm" @click="openCreateDialog">
        <Icon name="lucide:plus" class="mr-2" />
        New Label
      </Button>
    </div>

    <!-- Labels Grid -->
    <div v-if="labelStore.labels.length > 0" class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
      <div
        v-for="label in labelStore.labels"
        :key="label.id"
        class="group flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
        :style="{ borderColor: label.color }"
      >
        <div
          class="size-4 rounded-full shrink-0"
          :style="{ backgroundColor: label.color }"
        />
        <span class="flex-1 font-medium truncate">
          {{ label.name }}
        </span>
        <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            size="icon-sm"
            variant="ghost"
            class="size-7"
            @click="openEditDialog(label)"
          >
            <Icon name="lucide:edit-2" class="size-3.5" />
          </Button>
          <Button
            size="icon-sm"
            variant="ghost"
            class="size-7 text-destructive hover:text-destructive"
            @click="deleteLabel(label.id)"
          >
            <Icon name="lucide:trash-2" class="size-3.5" />
          </Button>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="flex flex-col items-center justify-center py-12 text-center border border-dashed rounded-lg">
      <Icon name="lucide:tag" class="size-12 text-muted-foreground mb-3" />
      <h4 class="font-medium mb-1">
        No labels yet
      </h4>
      <p class="text-sm text-muted-foreground mb-4">
        Create labels to categorize and organize your tasks
      </p>
      <Button size="sm" variant="outline" @click="openCreateDialog">
        <Icon name="lucide:plus" class="mr-2" />
        Create First Label
      </Button>
    </div>

    <!-- Create Label Dialog -->
    <Dialog v-model:open="showCreateDialog">
      <DialogContent class="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Create New Label</DialogTitle>
          <DialogDescription>
            Add a new label to organize your tasks
          </DialogDescription>
        </DialogHeader>
        <div class="flex flex-col gap-4">
          <div class="grid gap-2">
            <Label for="label-name">Name</Label>
            <Input
              id="label-name"
              v-model="newLabelData.name"
              placeholder="e.g., Bug, Feature, Urgent"
              required
            />
          </div>
          <div class="grid gap-2">
            <Label for="label-color">Color</Label>
            <div class="flex items-center gap-3">
              <Input
                id="label-color"
                v-model="newLabelData.color"
                type="color"
                class="size-12 p-1 cursor-pointer"
              />
              <Input
                v-model="newLabelData.color"
                type="text"
                placeholder="#3b82f6"
                pattern="^#[0-9A-Fa-f]{6}$"
                class="flex-1"
              />
            </div>
          </div>
          <div class="grid gap-2">
            <Label>Preset Colors</Label>
            <div class="flex flex-wrap gap-2">
              <button
                v-for="color in presetColors"
                :key="color"
                type="button"
                class="size-8 rounded-full border-2 transition-all hover:scale-110"
                :class="newLabelData.color === color ? 'border-foreground scale-110' : 'border-transparent'"
                :style="{ backgroundColor: color }"
                @click="newLabelData.color = color"
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="secondary" @click="showCreateDialog = false">
            Cancel
          </Button>
          <Button :disabled="labelStore.isLoading || !newLabelData.name.trim()" @click="createLabel">
            <Icon v-if="labelStore.isLoading" name="lucide:loader-2" class="mr-2 animate-spin" />
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- Edit Label Dialog -->
    <Dialog :open="editingLabel !== null" @update:open="closeEditDialog">
      <DialogContent class="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Edit Label</DialogTitle>
          <DialogDescription>
            Update label name and color
          </DialogDescription>
        </DialogHeader>
        <div v-if="editingLabel" class="flex flex-col gap-4">
          <div class="grid gap-2">
            <Label for="edit-label-name">Name</Label>
            <Input
              id="edit-label-name"
              v-model="editingLabelData.name"
              placeholder="Label name"
              required
            />
          </div>
          <div class="grid gap-2">
            <Label for="edit-label-color">Color</Label>
            <div class="flex items-center gap-3">
              <Input
                id="edit-label-color"
                v-model="editingLabelData.color"
                type="color"
                class="size-12 p-1 cursor-pointer"
              />
              <Input
                v-model="editingLabelData.color"
                type="text"
                placeholder="#3b82f6"
                pattern="^#[0-9A-Fa-f]{6}$"
                class="flex-1"
              />
            </div>
          </div>
          <div class="grid gap-2">
            <Label>Preset Colors</Label>
            <div class="flex flex-wrap gap-2">
              <button
                v-for="color in presetColors"
                :key="color"
                type="button"
                class="size-8 rounded-full border-2 transition-all hover:scale-110"
                :class="editingLabelData.color === color ? 'border-foreground scale-110' : 'border-transparent'"
                :style="{ backgroundColor: color }"
                @click="editingLabelData.color = color"
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="secondary" @click="closeEditDialog">
            Cancel
          </Button>
          <Button :disabled="labelStore.isLoading || !editingLabelData.name.trim()" @click="updateLabel">
            <Icon v-if="labelStore.isLoading" name="lucide:loader-2" class="mr-2 animate-spin" />
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
