/**
 * TreeGens API origin for browser clients (axios, SW uploads, `/health`).
 *
 * Resolved **at call time** in the browser:
 * - On `treegens.app` (any subdomain) → `window.location.origin` (nginx `/api/*`; avoids
 *   calling `https://` before TLS is configured on the host).
 * - On `localhost` / `127.0.0.1` → `http://127.0.0.1:${port}` when env URLs are unset.
 * - `NEXT_PUBLIC_API_URL` / `NEXT_PUBLIC_APP_URL` when set (tunnel / staging / SSR).
 */
function isTreegensHostname(host: string): boolean {
  return (
    host === 'treegens.app' ||
    host === 'www.treegens.app' ||
    host.endsWith('.treegens.app')
  )
}

export function getApiBaseUrl(): string {
  // In the browser, always use the page origin on TreeGens hosts so API calls
  // match http vs https (nginx proxies /api on the same host). A baked-in
  // NEXT_PUBLIC_API_URL=https://… breaks login until TLS is live on 443.
  if (
    typeof window !== 'undefined' &&
    typeof window.location?.hostname === 'string'
  ) {
    const host = window.location.hostname
    if (host === 'localhost' || host === '127.0.0.1') {
      const port =
        typeof process.env.NEXT_PUBLIC_DEV_API_PORT === 'string'
          ? process.env.NEXT_PUBLIC_DEV_API_PORT.trim()
          : '5000'
      return `http://127.0.0.1:${port}`
    }
    if (isTreegensHostname(host) && typeof window.location.origin === 'string') {
      return window.location.origin.replace(/\/$/, '')
    }
  }

  const explicit =
    typeof process.env.NEXT_PUBLIC_API_URL === 'string'
      ? process.env.NEXT_PUBLIC_API_URL.trim()
      : ''
  if (explicit) return explicit.replace(/\/$/, '')

  const appUrl =
    typeof process.env.NEXT_PUBLIC_APP_URL === 'string'
      ? process.env.NEXT_PUBLIC_APP_URL.trim().replace(/\/$/, '')
      : ''
  if (appUrl) return appUrl

  return 'https://treegens.app'
}
