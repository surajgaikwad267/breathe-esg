import { Link, useLocation } from 'react-router-dom'

function Navbar() {
  const location = useLocation()
  const links = [
    { path: '/dashboard', label: '📊 Dashboard' },
    { path: '/ingest', label: '📥 Ingest Data' },
    { path: '/review', label: '✅ Review' },
  ]

  return (
    <nav style={{background: 'linear-gradient(135deg, #1a5c38 0%, #2d9e6b 100%)' }} className="text-white shadow-xl">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-white rounded-xl p-2">
            <span className="text-2xl">🌿</span>
          </div>
          <div>
            <div className="text-xl font-bold tracking-tight">Breathe ESG</div>
            <div className="text-xs text-green-200">Emissions Management Platform</div>
          </div>
        </div>
        <div className="flex gap-2">
          {links.map(link => (
            <Link
              key={link.path}
              to={link.path}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                location.pathname === link.path
                  ? 'bg-white text-green-800 shadow-md'
                  : 'text-green-100 hover:bg-white/20'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  )
}

export default Navbar