type ErrorEntry = {
  message: string
  stack?: string
  componentStack?: string
  timestamp: number
}

const STORAGE_KEY = 'wms_error_logs'
const MAX_ENTRIES = 100

import type { ErrorInfo } from 'react'

export function reportError(error: Error, errorInfo?: ErrorInfo): void {
  const entry: ErrorEntry = {
    message: error?.message ?? String(error),
    stack: (error as any)?.stack,
    componentStack: errorInfo?.componentStack,
    timestamp: Date.now(),
  }
  try {
    const existing = localStorage.getItem(STORAGE_KEY)
    const list: ErrorEntry[] = existing ? JSON.parse(existing) : []
    list.unshift(entry)
    if (list.length > MAX_ENTRIES) list.length = MAX_ENTRIES
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
  } catch {}
}
