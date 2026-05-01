import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import { Toaster } from 'react-hot-toast'
import { AuthGuard } from '@/components/AuthGuard'
import { MobileAppShell } from '@/components/Layout/MobileAppShell'
import { ThirdwebAutoConnect } from '@/components/providers/ThirdwebAutoConnect'
import { TreeGensThirdwebProvider } from '@/components/providers/TreeGensThirdwebProvider'
import PWAInstaller from '@/components/PWAInstaller'
import { AuthProvider } from '@/contexts/AuthProvider'
import { ConnectivityProvider } from '@/contexts/ConnectivityProvider'
import { NotificationProvider } from '@/contexts/NotificationProvider'
import { UserProvider } from '@/contexts/UserProvider'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'TreeGens - Tree Planting Verification',
  description:
    'Decentralized tree planting verification platform with offline video upload capability',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'TreeGens',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#DFEA8A',
}

const RootLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <html lang="en">
      <body className={inter.className}>
        <TreeGensThirdwebProvider>
          <ThirdwebAutoConnect />
          <ConnectivityProvider>
            <AuthProvider>
              <UserProvider>
                <NotificationProvider>
                  <AuthGuard>
                    <PWAInstaller />
                    <MobileAppShell>{children}</MobileAppShell>
                    <div className="fixed inset-0 hidden items-center justify-center md:flex">
                      You can see the app only on mobile
                    </div>
                  </AuthGuard>
                </NotificationProvider>
              </UserProvider>
            </AuthProvider>
          </ConnectivityProvider>
        </TreeGensThirdwebProvider>
        <Toaster
          position="top-center"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#363636',
              color: '#fff',
            },
          }}
        />
      </body>
    </html>
  )
}

export default RootLayout
