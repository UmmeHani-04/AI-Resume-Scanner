import React from 'react'
import ReactDOM from 'react-dom/client'
import { App } from './App'
import { AuthProvider } from './lib/auth'
import { ToastProvider } from './lib/toast'
import { ErrorBoundary } from './components/ErrorBoundary'
import './styles/global.css'
import './styles/gender-avatar.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary
      fallbackTitle="Application encountered an error"
      fallbackMessage="An unexpected issue occurred. Please refresh the page to continue."
    >
      <AuthProvider>
        <ToastProvider>
          <App />
        </ToastProvider>
      </AuthProvider>
    </ErrorBoundary>
  </React.StrictMode>,
)
