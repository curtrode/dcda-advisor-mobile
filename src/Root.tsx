import { lazy, Suspense, useState, useEffect } from 'react'
import App from './App.tsx'
import { DCDADataProvider } from './components/DCDADataProvider'

const AdminApp = lazy(() => import('./admin/AdminApp'))

export default function Root() {
  const [isAdmin, setIsAdmin] = useState(
    window.location.hash.startsWith('#/admin')
  )

  useEffect(() => {
    const handler = () => setIsAdmin(window.location.hash.startsWith('#/admin'))
    window.addEventListener('hashchange', handler)
    return () => window.removeEventListener('hashchange', handler)
  }, [])

  if (isAdmin) {
    return (
      <Suspense fallback={
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-muted-foreground">Loading admin...</div>
        </div>
      }>
        <AdminApp />
      </Suspense>
    )
  }

  return (
    <DCDADataProvider>
      <App />
    </DCDADataProvider>
  )
}
