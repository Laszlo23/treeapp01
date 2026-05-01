import express, { Request, Response } from 'express'
import { authenticate } from '../middleware/auth'
import { pushSubscribeLimiter } from '../middleware/rateLimits'
import PushSubscription from '../models/PushSubscription'
import { sendBadRequest, sendError, sendSuccess } from '../utils/responseHelpers'

const router = express.Router()

router.post(
  '/subscribe',
  authenticate,
  pushSubscribeLimiter,
  async (req: Request, res: Response) => {
    try {
      const { endpoint, keys, userAgent } = req.body || {}
      const endpointStr = typeof endpoint === 'string' ? endpoint.trim() : ''
      const p256dh = keys?.p256dh
      const auth = keys?.auth
      if (!endpointStr || typeof p256dh !== 'string' || typeof auth !== 'string') {
        return sendBadRequest(res, 'endpoint and keys required')
      }

      const wallet = req.user.walletAddress.toLowerCase()
      await PushSubscription.findOneAndUpdate(
        { endpoint: endpointStr },
        {
          wallet,
          endpoint: endpointStr,
          keys: { p256dh, auth },
          userAgent:
            typeof userAgent === 'string' ? userAgent.slice(0, 512) : undefined,
        },
        { upsert: true, new: true, runValidators: true },
      )

      return sendSuccess(res, 'Subscribed', {})
    } catch (error: unknown) {
      console.error('push subscribe error', error)
      return sendError(res, 'Subscribe failed')
    }
  },
)

router.post(
  '/unsubscribe',
  authenticate,
  pushSubscribeLimiter,
  async (req: Request, res: Response) => {
    try {
      const endpointStr =
        typeof req.body?.endpoint === 'string' ? req.body.endpoint.trim() : ''
      if (!endpointStr) return sendBadRequest(res, 'endpoint required')

      await PushSubscription.deleteOne({
        endpoint: endpointStr,
        walletAddress: req.user.walletAddress.toLowerCase(),
      })

      return sendSuccess(res, 'Unsubscribed', {})
    } catch (error: unknown) {
      console.error('push unsubscribe error', error)
      return sendError(res, 'Unsubscribe failed')
    }
  },
)

export default router
