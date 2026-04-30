const path = require('path')

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Avoid inferring workspace root from a parent lockfile (e.g. ~/yarn.lock)
  outputFileTracingRoot: path.join(__dirname),
  async redirects() {
    return [
      {
        source: '/dashboard/stake',
        destination: '/stake',
        permanent: true,
      },
      { source: '/dashboard', destination: '/', permanent: false },
      {
        source: '/dashboard/how-to-plant',
        destination: '/tutorial',
        permanent: true,
      },
      {
        source: '/dashboard/new-plant',
        destination: '/submissions/create',
        permanent: true,
      },
      {
        source: '/dashboard/my-plants',
        destination: '/submissions',
        permanent: true,
      },
      {
        source: '/dashboard/submissions',
        destination: '/submissions/review',
        permanent: true,
      },
      {
        source: '/dashboard/submissions/:userWalletAddress/:submissionId',
        destination: '/submissions/review/:userWalletAddress/:submissionId',
        permanent: true,
      },
      {
        source: '/dashboard/leaderboard',
        destination: '/leaderboard',
        permanent: true,
      },
    ]
  },
}

module.exports = nextConfig
