import express, { Request, Response } from 'express'
import { authenticate } from '../middleware/auth'
import { notificationPollLimiter } from '../middleware/rateLimits'
import { listConversationsForWallet } from '../services/conversationService'
import { sendError, sendSuccess } from '../utils/responseHelpers'

const router = express.Router()

router.get(
  '/',
  authenticate,
  notificationPollLimiter,
  async (req: Request, res: Response) => {
    try {
      const rows = await listConversationsForWallet(req.user.walletAddress)
      return sendSuccess(res, 'Conversations', { conversations: rows })
    } catch (error: unknown) {
      console.error('conversations list error', error)
      return sendError(res, 'Failed to load conversations')
    }
  },
)

export default router
