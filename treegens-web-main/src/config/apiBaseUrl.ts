/**
 * Public API origin for axios — **must** match how nginx proxies `/api/*` in production.
 *
 * Without `NEXT_PUBLIC_API_URL` at build time, older bundles defaulted to `localhost`,
 * which breaks sign-in and API calls from real devices.
 *
 * Local dev: set `NEXT_PUBLIC_API_URL=http://localhost:5000` (or your backend port).
 */
export const apiBaseUrl =
  process.env.NEXT_PUBLIC_API_URL?.trim() ||
  process.env.NEXT_PUBLIC_APP_URL?.trim() ||
  'https://treegens.app'
