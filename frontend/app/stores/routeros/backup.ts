import type {
  BackupFilters,
  BackupRestore,
  BackupStats,
  ListBackupsQuery,
  PinBackupRequest,
  RestoreBackupRequest,
  RouterBackup,
  TriggerBackupRequest,
} from '~/types/backup'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

/**
 * RouterOS Backup Store
 * Manages backup state and API interactions
 */
export const useBackupStore = defineStore('routeros-backup', () => {
  const config = useRuntimeConfig()
  const API_BASE = config.public.apiBase

  // State
  const backups = ref<RouterBackup[]>([])
  const currentBackup = ref<RouterBackup | null>(null)
  const restoreHistory = ref<BackupRestore[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Pagination
  const total = ref(0)
  const limit = ref(50)
  const offset = ref(0)
  const hasMore = ref(false)

  // Filters
  const filters = ref<BackupFilters>({
    routerId: undefined,
    companyId: undefined,
    status: null,
    isPinned: null,
    searchQuery: '',
  })

  // Computed
  const stats = computed<BackupStats>(() => {
    const completed = backups.value.filter(b => b.backupStatus === 'COMPLETED').length
    const failed = backups.value.filter(b => b.backupStatus === 'FAILED').length
    const pending = backups.value.filter(b => b.backupStatus === 'PENDING').length
    const pinned = backups.value.filter(b => b.isPinned).length
    const totalSize = backups.value.reduce((sum, b) => sum + Number(b.fileSize), 0)

    return {
      total: backups.value.length,
      completed,
      failed,
      pending,
      pinned,
      totalSize,
      totalSizeMB: Math.round((totalSize / 1024 / 1024) * 100) / 100,
    }
  })

  const filteredBackups = computed(() => {
    let result = [...backups.value]

    // Apply filters
    if (filters.value.routerId) {
      result = result.filter(b => b.routerId === filters.value.routerId)
    }

    if (filters.value.status) {
      result = result.filter(b => b.backupStatus === filters.value.status)
    }

    if (filters.value.isPinned !== null) {
      result = result.filter(b => b.isPinned === filters.value.isPinned)
    }

    if (filters.value.searchQuery) {
      const query = filters.value.searchQuery.toLowerCase()
      result = result.filter(b =>
        b.router?.name.toLowerCase().includes(query)
        || b.router?.ipAddress.includes(query)
        || b.checksum.toLowerCase().includes(query),
      )
    }

    return result
  })

  // Actions

  /**
   * Fetch all backups with filters
   */
  async function fetchBackups(query?: ListBackupsQuery) {
    loading.value = true
    error.value = null

    try {
      const params = new URLSearchParams()

      if (query?.routerId)
        params.append('routerId', query.routerId)
      if (query?.companyId)
        params.append('companyId', query.companyId)
      if (query?.status)
        params.append('status', query.status)
      if (query?.isPinned !== undefined)
        params.append('isPinned', String(query.isPinned))
      if (query?.limit)
        params.append('limit', String(query.limit))
      if (query?.offset)
        params.append('offset', String(query.offset))

      const response = await fetch(`${API_BASE}/routeros/backup?${params}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      })

      if (!response.ok) {
        throw new Error('Failed to fetch backups')
      }

      const result = await response.json()

      backups.value = result.data
      total.value = result.pagination.total
      limit.value = result.pagination.limit
      offset.value = result.pagination.offset
      hasMore.value = result.pagination.hasMore

      return result.data
    }
    catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error'
      throw err
    }
    finally {
      loading.value = false
    }
  }

  /**
   * Fetch single backup by ID
   */
  async function fetchBackupById(backupId: string) {
    loading.value = true
    error.value = null

    try {
      const response = await fetch(`${API_BASE}/routeros/backup/${backupId}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      })

      if (!response.ok) {
        throw new Error('Failed to fetch backup')
      }

      const result = await response.json()
      currentBackup.value = result.data

      return result.data
    }
    catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error'
      throw err
    }
    finally {
      loading.value = false
    }
  }

  /**
   * Trigger manual backup
   */
  async function triggerBackup(data: TriggerBackupRequest) {
    loading.value = true
    error.value = null

    try {
      const response = await fetch(`${API_BASE}/routeros/backup/${data.routerId}/trigger`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to trigger backup')
      }

      const result = await response.json()

      // Add new backup to list
      backups.value.unshift(result.data)

      return result.data
    }
    catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error'
      throw err
    }
    finally {
      loading.value = false
    }
  }

  /**
   * Get presigned download URL
   */
  async function getDownloadUrl(backupId: string, expiresIn: number = 3600) {
    loading.value = true
    error.value = null

    try {
      const response = await fetch(`${API_BASE}/routeros/backup/${backupId}/download?expiresIn=${expiresIn}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      })

      if (!response.ok) {
        throw new Error('Failed to get download URL')
      }

      const result = await response.json()

      return result.data.url
    }
    catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error'
      throw err
    }
    finally {
      loading.value = false
    }
  }

  /**
   * Download backup file
   */
  async function downloadBackup(backupId: string, filename?: string) {
    try {
      const url = await getDownloadUrl(backupId)

      // Trigger browser download
      const link = document.createElement('a')
      link.href = url
      link.download = filename || `backup-${backupId}.rsc`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
    catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error'
      throw err
    }
  }

  /**
   * Restore backup to router
   */
  async function restoreBackup(backupId: string, data: RestoreBackupRequest) {
    loading.value = true
    error.value = null

    try {
      const response = await fetch(`${API_BASE}/routeros/backup/${backupId}/restore`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to restore backup')
      }

      const result = await response.json()

      // Refresh restore history
      await fetchRestoreHistory(backupId)

      return result.data
    }
    catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error'
      throw err
    }
    finally {
      loading.value = false
    }
  }

  /**
   * Fetch restore history for a backup
   */
  async function fetchRestoreHistory(backupId: string) {
    loading.value = true
    error.value = null

    try {
      const response = await fetch(`${API_BASE}/routeros/backup/${backupId}/restore-history`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      })

      if (!response.ok) {
        throw new Error('Failed to fetch restore history')
      }

      const result = await response.json()
      restoreHistory.value = result.data

      return result.data
    }
    catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error'
      throw err
    }
    finally {
      loading.value = false
    }
  }

  /**
   * Pin or unpin backup
   */
  async function togglePin(backupId: string, data?: PinBackupRequest) {
    loading.value = true
    error.value = null

    try {
      const response = await fetch(`${API_BASE}/routeros/backup/${backupId}/pin`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(data || {}),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to toggle pin')
      }

      const result = await response.json()

      // Update backup in list
      const index = backups.value.findIndex(b => b.id === backupId)
      if (index !== -1) {
        backups.value[index] = result.data
      }

      // Update current backup if it's the same
      if (currentBackup.value?.id === backupId) {
        currentBackup.value = result.data
      }

      return result.data
    }
    catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error'
      throw err
    }
    finally {
      loading.value = false
    }
  }

  /**
   * Delete backup
   */
  async function deleteBackup(backupId: string) {
    loading.value = true
    error.value = null

    try {
      const response = await fetch(`${API_BASE}/routeros/backup/${backupId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to delete backup')
      }

      // Remove from list
      backups.value = backups.value.filter(b => b.id !== backupId)

      // Clear current backup if it's the same
      if (currentBackup.value?.id === backupId) {
        currentBackup.value = null
      }
    }
    catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error'
      throw err
    }
    finally {
      loading.value = false
    }
  }

  /**
   * Update filters
   */
  function setFilters(newFilters: Partial<BackupFilters>) {
    filters.value = { ...filters.value, ...newFilters }
  }

  /**
   * Reset filters
   */
  function resetFilters() {
    filters.value = {
      routerId: undefined,
      companyId: undefined,
      status: null,
      isPinned: null,
      searchQuery: '',
    }
  }

  /**
   * Clear error
   */
  function clearError() {
    error.value = null
  }

  /**
   * Reset store
   */
  function $reset() {
    backups.value = []
    currentBackup.value = null
    restoreHistory.value = []
    loading.value = false
    error.value = null
    total.value = 0
    limit.value = 50
    offset.value = 0
    hasMore.value = false
    resetFilters()
  }

  return {
    // State
    backups,
    currentBackup,
    restoreHistory,
    loading,
    error,
    total,
    limit,
    offset,
    hasMore,
    filters,

    // Computed
    stats,
    filteredBackups,

    // Actions
    fetchBackups,
    fetchBackupById,
    triggerBackup,
    getDownloadUrl,
    downloadBackup,
    restoreBackup,
    fetchRestoreHistory,
    togglePin,
    deleteBackup,
    setFilters,
    resetFilters,
    clearError,
    $reset,
  }
})
