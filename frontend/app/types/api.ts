// Common API types

export interface ApiError {
  message: string
  status?: number
  code?: string
}

export interface ApiResponse<T = unknown> {
  status: 'success' | 'error'
  data?: T
  message?: string
}

export interface PaginationMeta {
  page: number
  limit: number
  total: number
  totalPages: number
}

export interface PaginatedResponse<T> {
  data: T[]
  meta: PaginationMeta
}
