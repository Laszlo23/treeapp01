/** Client-side Web Push subscription helper (uses service worker). */

export async function registerPushSubscription(): Promise<boolean> {
  if (typeof window === 'undefined') return false
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim()
  if (!pub || !('serviceWorker' in navigator) || !('PushManager' in window)) {
    return false
  }

  const reg = await navigator.serviceWorker.ready

  const existing = await reg.pushManager.getSubscription()
  if (existing) {
    await syncSubscriptionWithBackend(existing)
    return true
  }

  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(pub),
  })

  await syncSubscriptionWithBackend(sub)
  return true
}

export async function unsubscribePush(): Promise<void> {
  const reg = await navigator.serviceWorker.ready
  const sub = await reg.pushManager.getSubscription()
  if (!sub) return
  const endpoint = sub.endpoint
  await sub.unsubscribe()
  try {
    const { axiosInstance } = await import('./axiosInstance')
    await axiosInstance.post('/api/push/unsubscribe', { endpoint })
  } catch {
    /* ignore */
  }
}

async function syncSubscriptionWithBackend(sub: PushSubscription) {
  const json = sub.toJSON()
  const endpoint = json.endpoint
  const key = json.keys
  if (!endpoint || !key?.p256dh || !key?.auth) return

  const { axiosInstance } = await import('./axiosInstance')
  await axiosInstance.post('/api/push/subscribe', {
    endpoint,
    keys: { p256dh: key.p256dh, auth: key.auth },
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
  })
}

function urlBase64ToUint8Array(base64String: string): BufferSource {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}
