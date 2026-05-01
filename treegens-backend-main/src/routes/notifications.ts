import express, { Request, Response } from 'express'
import { authenticate } from '../middleware/auth'
import { notificationPollLimiter } from '../middleware/rateLimits'
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  unreadCount,
} from '../services/notificationService'
import {
  sendBadRequest,
  sendError,
  sendNotFound,
  sendSuccess,
} from '../utils/responseHelpers'

const router = express.Router()

router.get(
  '/',
  authenticate,
  notificationPollLimiter,
  async (req: Request, res: Response) => {
    try {
      const page = Math.max(1, Number(req.query.page) || 1)
      const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 30))
      const data = await listNotifications(req.user.walletAddress, page, limit)
      return sendSuccess(res, 'Notifications', data)
    } catch (error: unknown) {
      console.error('notifications list error', error)
      return sendError(res, 'Failed to load notifications')
    }
  },
)

router.get(
  '/unread-count',
  authenticate,
  notificationPollLimiter,
  async (req: Request, res: Response) => {
    try {
      const count = await unreadCount(req.user.walletAddress)
      return sendSuccess(res, 'Unread count', { count })
    } catch (error: unknown) {
      console.error('unread-count error', error)
      return sendError(res, 'Failed to load unread count')
    }
  },
)

router.post(
  '/:id/read',
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const id = String(req.params.id || '').trim()
      if (!id) return sendBadRequest(res, 'Invalid id')
      const doc = await markNotificationRead(req.user.walletAddress, id)
      if (!doc) return sendNotFound(res, 'Notification')
      return sendSuccess(res, 'Marked read', doc)
    } catch (error: unknown) {
      console.error('mark read error', error)
      return sendError(res, 'Failed to mark read')
    }
  },
)

router.post('/read-all', authenticate, async (req: Request, res: Response) => {
  try {
    await markAllNotificationsRead(req.user.walletAddress)
    return sendSuccess(res, 'All marked read', {})
  } catch (error: unknown) {
    console.error('mark all read error', error)
    return sendError(res, 'Failed to mark all read')
  }
})

export default router
