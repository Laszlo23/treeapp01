import axios from 'axios'
import toast from 'react-hot-toast'

/** Reads `{ error }` or `{ message }` from typical API JSON bodies. */
export function apiErrorMessage(err: unknown, fallback: string): string {
  if (axios.isAxiosError(err)) {
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
