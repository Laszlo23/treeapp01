import axios from 'axios'
import toast from 'react-hot-toast'

/** Reads `{ error }` or `{ message }` from typical API JSON bodies. */
export function apiErrorMessage(err: unknown, fallback: string): string {
  if (axios.isAxiosError(err)) {
    if (err.code === 'ECONNABORTED') {
      return 'Request timed out. Check your connection and try again.'
    }
    if (err.response?.status === 401) {
      return 'Session expired. Sign in again to load rewards.'
    }
    const status = err.response?.status
    if (status === 502 || status === 503) {
      return 'The TreeGens service is temporarily unavailable. Please try again in a few minutes.'
    }
    if (status === 504) {
      return 'The server took too long to respond. Try again shortly.'
    }
    if (
      !err.response &&
      (err.code === 'ERR_NETWORK' ||
        err.message?.toLowerCase().includes('network error'))
    ) {
      return 'Cannot reach the server. Check your connection or try again shortly.'
    }
    const data = err.response?.data as
      | { error?: string; message?: string }
      | undefined
    const msg = data?.error ?? data?.message
    if (typeof msg === 'string' && msg.trim()) return msg.trim()
  }
  if (err instanceof Error && err.message.trim()) return err.message.trim()
  return fallback
}

/** Short, unobtrusive error toast (call from client components only). */
export function notifyError(message: string) {
  toast.error(message, {
    duration: 2500,
    style: {
      fontSize: '13px',
      maxWidth: 'min(90vw, 22rem)',
      padding: '10px 14px',
    },
  })
}
