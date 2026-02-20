import { useEffect, useState } from 'react'
import io from 'socket.io-client'
import StartSession from './components/StartSession'
import Create from './components/Create'
import Settings from './components/Settings'

const socket = io('http://localhost:3000')

type Page = 'session' | 'create' | 'settings'

const NAV_ITEMS: { key: Page; label: string; icon: string }[] = [
  { key: 'session', label: 'Start Session', icon: '▶' },
  { key: 'create', label: 'Create', icon: '📝' },
  { key: 'settings', label: 'Settings', icon: '⚙️' }
]

function App() {
  const [currentPage, setCurrentPage] = useState<Page>('session')
  const [serverUrl, setServerUrl] = useState<string>('')

  useEffect(() => {
    window.api.getServerUrl().then((url) => setServerUrl(url))
  }, [])

  const renderPage = () => {
    switch (currentPage) {
      case 'session':
        return <StartSession socket={socket} serverUrl={serverUrl} />
      case 'create':
        return <Create />
      case 'settings':
        return <Settings />
    }
  }

  return (
    <div className="app-layout">
      {/* Sidebar Navigation */}
      <nav className="sidebar">
        <div className="sidebar-brand">
          <span className="sidebar-brand-icon">📊</span>
          <span className="sidebar-brand-text">Pollster</span>
        </div>
        <div className="sidebar-nav">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.key}
              className={`nav-btn${currentPage === item.key ? ' nav-btn-active' : ''}`}
              onClick={() => setCurrentPage(item.key)}
            >
              <span className="nav-btn-icon">{item.icon}</span>
              <span className="nav-btn-label">{item.label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* Page Content */}
      <main className="page-content">{renderPage()}</main>
    </div>
  )
}

export default App