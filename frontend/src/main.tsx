import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, HashRouter } from 'react-router-dom'
import App from './App'
import { AuthProvider } from './auth/AuthContext'
import { ApiStoreProvider } from './api/ApiStoreProvider'
import { HASH_ROUTER } from './api/config'
import ErrorBoundary from './components/ErrorBoundary'
import '@fontsource-variable/plus-jakarta-sans'
import './styles/global.css'
import './styles/pages.css'
import './styles/theme.css'

const Router = HASH_ROUTER ? HashRouter : BrowserRouter

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
    <Router>
      <AuthProvider>
        <ApiStoreProvider>
          <App />
        </ApiStoreProvider>
      </AuthProvider>
    </Router>
    </ErrorBoundary>
  </React.StrictMode>,
)
