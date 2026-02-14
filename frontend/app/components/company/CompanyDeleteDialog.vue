<script setup lang="ts">
import type { Company } from '~/stores/company'
import { AlertTriangle } from 'lucide-vue-next'
import { ref } from 'vue'
import { toast } from 'vue-sonner'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useCompanyStore } from '~/stores/company'

const props = defineProps<{
  open: boolean
  company: Company | null
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  'success': []
}>()

const companyStore = useCompanyStore()
const isDeleting = ref(false)

async function handleDelete() {
  if (!props.company)
    return

  isDeleting.value = true

  try {
    const result = await companyStore.deleteCompany(props.company.id)

    if (result.success) {
      toast.success(`Company "${props.company.name}" deleted successfully`)
      emit('success')
      emit('update:open', false)
    }
    else {
      toast.error(result.error || 'Failed to delete company')
    }
  }
  catch {
    toast.error('An unexpected error occurred')
  }
  finally {
    isDeleting.value = false
  }
}

function handleCancel() {
  if (!isDeleting.value) {
    emit('update:open', false)
  }
}
</script>

<template>
  <AlertDialog :open="props.open" @update:open="(val) => emit('update:open', val)">
    <AlertDialogContent class="sm:max-w-[500px]">
      <AlertDialogHeader>
        <div class="flex items-center gap-3">
          <div class="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 border border-destructive/20">
            <AlertTriangle class="h-6 w-6 text-destructive" />
          </div>
          <div class="flex-1">
            <AlertDialogTitle class="font-mono text-lg">
              Delete Company
            </AlertDialogTitle>
            <AlertDialogDescription class="font-mono text-xs mt-1">
              This action cannot be undone
            </AlertDialogDescription>
          </div>
        </div>
      </AlertDialogHeader>

      <div v-if="props.company" class="space-y-4 py-4">
        <div class="rounded-lg border border-destructive/20 bg-destructive/5 p-4 space-y-3">
          <p class="font-mono text-sm">
            You are about to permanently delete:
          </p>
          <div class="space-y-2">
            <div class="flex items-center justify-between bg-background/50 rounded px-3 py-2">
              <span class="font-mono text-xs text-muted-foreground">Company Name:</span>
              <span class="font-mono text-sm font-medium">{{ props.company.name }}</span>
            </div>
            <div class="flex items-center justify-between bg-background/50 rounded px-3 py-2">
              <span class="font-mono text-xs text-muted-foreground">Company Code:</span>
              <span class="font-mono text-sm font-medium text-cyan-400">{{ props.company.code }}</span>
            </div>
            <div class="flex items-center justify-between bg-background/50 rounded px-3 py-2">
              <span class="font-mono text-xs text-muted-foreground">Associated Routers:</span>
              <span class="font-mono text-sm font-medium text-destructive">{{ props.company.routerCount || 0 }}</span>
            </div>
          </div>
        </div>

        <div class="rounded-lg border border-amber-500/20 bg-amber-500/5 p-4">
          <div class="flex gap-3">
            <AlertTriangle class="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
            <div class="space-y-2">
              <p class="font-mono text-sm font-medium text-amber-400">
                Warning: Cascade Deletion
              </p>
              <p class="font-mono text-xs text-muted-foreground">
                All routers associated with this company will also be permanently deleted.
                This includes all router configurations, monitoring data, and historical records.
              </p>
            </div>
          </div>
        </div>

        <div class="rounded-lg border border-border/50 bg-muted/30 p-4">
          <p class="font-mono text-xs text-muted-foreground leading-relaxed">
            This action is <span class="text-destructive font-medium">irreversible</span>.
            All data associated with this company and its routers will be permanently removed from the system.
            Please ensure you have backed up any important information before proceeding.
          </p>
        </div>
      </div>

      <AlertDialogFooter>
        <AlertDialogCancel
          :disabled="isDeleting"
          class="font-mono"
          @click="handleCancel"
        >
          Cancel
        </AlertDialogCancel>
        <AlertDialogAction
          :disabled="isDeleting"
          class="bg-destructive text-destructive-foreground hover:bg-destructive/90 font-mono"
          @click="handleDelete"
        >
          {{ isDeleting ? 'Deleting...' : 'Delete Company' }}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>

<style scoped>
/* Additional styles if needed */
</style>
