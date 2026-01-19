/**
 * Backup Management Types
 */

export enum BackupType {
  EXPORT = 'EXPORT',
  BINARY = 'BINARY',
  PARTIAL = 'PARTIAL',
}

export enum BackupStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  EXPIRED = 'EXPIRED',
}

export enum TriggerType {
  MANUAL = 'MANUAL',
  SCHEDULED = 'SCHEDULED',
  PRE_UPDATE = 'PRE_UPDATE',
}

export enum RestoreStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  ROLLED_BACK = 'ROLLED_BACK',
}

export enum RestoreType {
  FULL = 'FULL',
  PREVIEW = 'PREVIEW',
  PARTIAL = 'PARTIAL',
}

export interface ConfigSummary {
  interfaces?: number
  ipAddresses?: number
  firewallRules?: number
  natRules?: number
  routes?: number
  dhcpServers?: number
  users?: number
  scripts?: number
  scheduler?: number
  queues?: number
}

export interface RouterBackup {
  id: string
  routerId: string
  backupType: BackupType
  storageKey: string
  storageUrl: string | null
  fileSize: number
  checksum: string
  routerVersion: string | null
  backupStatus: BackupStatus
  triggerType: TriggerType
  triggeredBy: string | null
  configSummary: ConfigSummary | null
  isPinned: boolean
  pinnedBy: string | null
  pinnedAt: string | null
  pinnedReason: string | null
  isSafetyBackup: boolean
  createdAt: string
  completedAt: string | null
  expiresAt: string | null
  router?: {
    id: string
    name: string
    ipAddress: string
    company?: {
      id: string
      name: string
    }
  }
  restoreHistory?: BackupRestore[]
}

export interface BackupRestore {
  id: string
  backupId: string
  routerId: string
  restoreStatus: RestoreStatus
  restoredBy: string
  restoreType: RestoreType
  safetyBackupId: string | null
  errorMessage: string | null
  restoreLog: string | null
  createdAt: string
  completedAt: string | null
  backup?: RouterBackup
  router?: {
    id: string
    name: string
    ipAddress: string
  }
}

export interface BackupSchedule {
  id: string
  routerId: string | null
  companyId: string | null
  isEnabled: boolean
  cronExpression: string
  timezone: string
  retentionDays: number
  retentionWeeks: number
  retentionMonths: number
  lastRunAt: string | null
  nextRunAt: string | null
  createdAt: string
  updatedAt: string
  router?: {
    id: string
    name: string
  }
  company?: {
    id: string
    name: string
  }
}

// API Request/Response Types

export interface TriggerBackupRequest {
  routerId: string
  compact?: boolean
  backupType?: BackupType
}

export interface TriggerBackupResponse {
  success: boolean
  message: string
  data: RouterBackup
}

export interface ListBackupsQuery {
  routerId?: string
  companyId?: string
  status?: BackupStatus
  isPinned?: boolean
  limit?: number
  offset?: number
}

export interface ListBackupsResponse {
  success: boolean
  data: RouterBackup[]
  pagination: {
    total: number
    limit: number
    offset: number
    hasMore: boolean
  }
}

export interface GetBackupResponse {
  success: boolean
  data: RouterBackup
}

export interface GetDownloadUrlResponse {
  success: boolean
  data: {
    url: string
    expiresIn: number
  }
}

export interface RestoreBackupRequest {
  routerId: string
  createSafetyBackup?: boolean
  restoreType?: RestoreType
}

export interface RestoreBackupResponse {
  success: boolean
  message: string
  data: BackupRestore
}

export interface PinBackupRequest {
  reason?: string
}

export interface PinBackupResponse {
  success: boolean
  message: string
  data: RouterBackup
}

export interface DeleteBackupResponse {
  success: boolean
  message: string
}

export interface GetRestoreHistoryResponse {
  success: boolean
  data: BackupRestore[]
}

// UI State Types

export interface BackupFilters {
  routerId?: string
  companyId?: string
  status?: BackupStatus | null
  isPinned?: boolean | null
  searchQuery?: string
}

export interface BackupStats {
  total: number
  completed: number
  failed: number
  pending: number
  pinned: number
  totalSize: number
  totalSizeMB: number
}
