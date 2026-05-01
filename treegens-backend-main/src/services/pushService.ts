import webpush from 'web-push'
import env from '../config/environment'
import PushSubscription from '../models/PushSubscription'

let vapidConfigured = false

function ensureVapidConfigured(): boolean {
  const pub = env.VAPID_PUBLIC_KEY
  const priv = env.VAPID_PRIVATE_KEY
  if (!pub || !priv) return false
  if (!vapidConfigured) {
    webpush.setVapidDetails(
      env.VAPID_CONTACT_EMAIL || 'mailto:team@treegens.app',
      pub,
      priv,
    )
    vapidConfigured = true
  }
  return true
}

export async function sendWebPushToWallet(
  walletAddress: string,
  data: { title: string; body: string; url?: string },
): Promise<void> {
  if (!ensureVapidConfigured()) return

  const wallet = walletAddress.toLowerCase()
  const subs = await PushSubscription.find({ walletAddress: wallet }).lean()
  if (!subs.length) return

  const payload = JSON.stringify({
    title: data.title,
    body: data.body,
    url: data.url || '/inbox',
  })

  await Promise.all(
    subs.map(sub =>
      webpush
        .sendNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.keys.p256dh,
              auth: sub.keys.auth,
            },
          },
          payload,
        )
        .catch(() => {
          /* subscription may be stale */
        }),
    ),
  )
}
