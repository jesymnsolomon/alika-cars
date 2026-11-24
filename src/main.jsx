import { StrictMode, Suspense, lazy } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

const AdminApp = lazy(() => import('./admin/AdminApp.jsx'))

const isAdmin = window.location.pathname.replace(/\/+$/, '') === '/admin'

if (isAdmin) {
  // Its own name and icon when added to the home screen.
  document.getElementById('manifest-link')?.setAttribute('href', '/admin.webmanifest')
  document.getElementById('apple-title')?.setAttribute('content', 'Alika Admin')
  document.getElementById('apple-icon')?.setAttribute('href', '/admin-apple-touch-icon.png')
  document.title = 'Alika Admin'
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {isAdmin ? (
      <Suspense fallback={<div className="min-h-dvh bg-brand" />}>
        <AdminApp />
      </Suspense>
    ) : (
      <App />
    )}
  </StrictMode>,
)
