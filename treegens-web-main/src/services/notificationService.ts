import { axiosInstance } from './axiosInstance'

export async function fetchNotifications(page = 1, limit = 30) {
  return axiosInstance.get('/api/notifications', {
    params: { page, limit },
  })
}

export async function markNotificationRead(id: string) {
  return axiosInstance.post(`/api/notifications/${encodeURIComponent(id)}/read`)
}

export async function markAllNotificationsRead() {
  return axiosInstance.post('/api/notifications/read-all')
}

export async function fetchUnreadCount() {
  return axiosInstance.get<{ message?: string; data?: { count?: number } }>(
    '/api/notifications/unread-count',
  )
}
