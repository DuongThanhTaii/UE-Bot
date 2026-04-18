import { StrictMode } from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider, createRouter } from '@tanstack/react-router'

// Import the generated route tree
import { routeTree } from './routeTree.gen'

import './index.css'
import './i18n'

const showBootstrapError = (message: string) => {
  const loader = document.getElementById('initial-loader')
  if (loader) {
    loader.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;gap:12px;max-width:520px;padding:24px;text-align:center;">
        <img src="./images/ue-bot-logo.png" alt="UE Bot Logo" style="width:64px;height:64px;" />
        <strong style="font: 600 16px sans-serif; color: #1f2937;">UE Bot failed to start</strong>
        <div style="font: 400 13px sans-serif; color: #4b5563; line-height: 1.5;">${message}</div>
      </div>
    `
  }
}

window.addEventListener('error', (event) => {
  const error = event.error instanceof Error ? event.error.message : event.message
  console.error('Unhandled bootstrap error:', event.error ?? event.message)
  showBootstrapError(error || 'An unexpected startup error occurred.')
})

window.addEventListener('unhandledrejection', (event) => {
  const reason =
    event.reason instanceof Error
      ? event.reason.message
      : String(event.reason ?? 'Unknown startup error')
  console.error('Unhandled startup rejection:', event.reason)
  showBootstrapError(reason)
})

// Mobile-specific viewport and styling setup
const setupMobileViewport = () => {
  // Check if running on mobile platform (iOS/Android via Tauri)
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ||
                   window.matchMedia('(max-width: 768px)').matches

  if (isMobile) {
    // Update viewport meta tag to disable zoom
    const viewportMeta = document.querySelector('meta[name="viewport"]')
    if (viewportMeta) {
      viewportMeta.setAttribute('content',
        'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover'
      )
    }

    // Add mobile-specific styles for status bar
    const style = document.createElement('style')
    style.textContent = `
      body {
        padding-top: env(safe-area-inset-top);
        padding-bottom: env(safe-area-inset-bottom);
        padding-left: env(safe-area-inset-left);
        padding-right: env(safe-area-inset-right);
      }

      #root {
        min-height: calc(100vh - env(safe-area-inset-top) - env(safe-area-inset-bottom));
      }

      /* Prevent zoom on input focus */
      input, textarea, select {
        font-size: 16px !important;
      }
    `
    document.head.appendChild(style)
  }
}

// Prevent browser from opening dropped files
const preventDefaultFileDrop = () => {
  document.addEventListener('dragover', (e) => {
    e.preventDefault()
  })
  document.addEventListener('drop', (e) => {
    e.preventDefault()
  })
}

// Initialize mobile setup
setupMobileViewport()

// Prevent files from opening when dropped
preventDefaultFileDrop()

// Create a new router instance
const router = createRouter({ routeTree })

// Register the router instance for type safety
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

// Render the app
const rootElement = document.getElementById('root')!
if (!rootElement.innerHTML) {
  const root = ReactDOM.createRoot(rootElement)
  root.render(
    <StrictMode>
      <RouterProvider router={router} />
    </StrictMode>
  )
}
