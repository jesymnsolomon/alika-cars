import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { getSavedKey } from './admin/api.js'

// If the owner opens a home-screen app that started on the booking page,
// send them to the dashboard. Customers never have an admin key, so they stay here.
const standalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true
if (standalone && getSavedKey()) {
  window.location.replace('/admin')
} else {
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}
