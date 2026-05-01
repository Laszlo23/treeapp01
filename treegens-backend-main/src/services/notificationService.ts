import Notification from '../models/Notification'
import { sendWebPushToWallet } from './pushService'

export async function enqueueNotification(input: {
  recipientWalletAddress: string
  kind: string
  title: string
  body: string
  link?: string
  payload?: Record<string, unknown>
}) {
  const recipientWalletAddress = input.recipientWalletAddress.toLowerCase()
  await Notification.create({
    recipientWalletAddress,
    kind: input.kind,
    title: input.title,
    body: input.body,
    link: input.link,
    payload: input.payload,
    isRead: false,
  })

  await sendWebPushToWallet(recipientWalletAddress, {
    title: input.title,
    body: input.body,
    url: input.link,
  }).catch(() => {})
}

export async function listNotifications(
  walletAddress: string,
  page = 1,
  limit = 30,
) {
  const w = walletAddress.toLowerCase()
  const skip = (Math.max(1, page) - 1) * Math.min(50, Math.max(1, limit))
  const take = Math.min(50, Math.max(1, limit))
  const [items, total] = await Promise.all([
    Notification.find({ recipientWalletAddress: w })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(take)
      .lean(),
    Notification.countDocuments({ recipientWalletAddress: w }),
  ])
  return { items, total, page: Math.max(1, page), limit: take }
}

export async function markNotificationRead(
  walletAddress: string,
  notificationId: string,
) {
  const w = walletAddress.toLowerCase()
  const doc = await Notification.findOneAndUpdate(
    { _id: notificationId, recipientWalletAddress: w },
    { $set: { isRead: true } },
    { new: true },
  ).lean()
  return doc
}

export async function markAllNotificationsRead(walletAddress: string) {
  const w = walletAddress.toLowerCase()
  await Notification.updateMany(
    { recipientWalletAddress: w, isRead: false },
    { $set: { isRead: true } },
  )
}

export async function unreadCount(walletAddress: string): Promise<number> {
  const w = walletAddress.toLowerCase()
  return Notification.countDocuments({
    recipientWalletAddress: w,
    isRead: false,
  })
}
