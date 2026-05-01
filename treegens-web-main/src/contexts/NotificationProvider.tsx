'use client'

import { axiosInstance } from '@/services/axiosInstance'
import { getJwtToken } from '@/services/jwtTokenStore'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'

type NotificationContextValue = {
  unreadCount: number
  refreshUnread: () => Promise<void>
}

const NotificationContext = createContext<NotificationContextValue | undefined>(
  undefined,
)

export function useNotifications() {
  const ctx = useContext(NotificationContext)
  if (!ctx) {
    return { unreadCount: 0, refreshUnread: async () => {} }
  }
  return ctx
}

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [unreadCount, setUnreadCount] = useState(0)
  const streamRef = useRef<EventSource | null>(null)

  const refreshUnread = useCallback(async () => {
    if (typeof window === 'undefined') return
    const token = getJwtToken()
    if (!token) {
      setUnreadCount(0)
      return
    }
    try {
      const res = await axiosInstance.get<{
        message?: string
        data?: { count?: number }
      }>('/api/notifications/unread-count')
      const n = Number(res.data?.data?.count ?? 0)
      setUnreadCount(Number.isFinite(n) ? n : 0)
    } catch {
      /* endpoint may be unavailable during deploy */
    }
  }, [])

  useEffect(() => {
    void refreshUnread()
    const id = window.setInterval(() => void refreshUnread(), 30_000)
    return () => window.clearInterval(id)
  }, [refreshUnread])

  useEffect(() => {
    const streamUrl = process.env.NEXT_PUBLIC_NOTIF_STREAM_URL?.trim()
    if (!streamUrl || typeof window === 'undefined') return

    const token = getJwtToken()
    if (!token) return

    try {
      const es = new EventSource(streamUrl, { withCredentials: true })
      streamRef.current = es
      es.onmessage = ev => {
        try {
          const data = JSON.parse(ev.data as string)
          if (typeof data?.count === 'number') setUnreadCount(data.count)
        } catch {
          void refreshUnread()
        }
      }
      es.onerror = () => {
        void refreshUnread()
      }
      return () => {
        es.close()
        streamRef.current = null
      }
    } catch {
      return undefined
    }
  }, [refreshUnread])

  const value = useMemo(
    () => ({ unreadCount, refreshUnread }),
    [unreadCount, refreshUnread],
  )

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  )
}
