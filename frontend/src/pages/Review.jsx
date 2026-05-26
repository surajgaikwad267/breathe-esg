import { useState, useEffect, useCallback } from 'react'
import axios from 'axios'

const API = 'https://surajgaikwad219.pythonanywhere.com/api'

const scopeColors = {
  '1': 'bg-red-100 text-red-700',
  '2': 'bg-yellow-100 text-yellow-700',
  '3': 'bg-blue-100 text-blue-700',
}

const statusColors = {
  pending: 'bg-gray-100 text-gray-600',
  approved: 'bg-green-100 text-green-700',
  flagged: 'bg-orange-100 text-orange-700',
  rejected: 'bg-red-100 text-red-700',
}

const sourceColors = {
  sap: 'bg-purple-100 text-purple-700',
  utility: 'bg-yellow-100 text-yellow-700',
  travel: 'bg-blue-100 text-blue-700',
}

const sourceIcons = { sap: '🏭', utility: '⚡', travel: '✈️' }

function Review() {
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({ source_type: '', scope: '', status: '' })
  const [actionLoading, setActionLoading] = useState(null)
  const [stats, setStats] = useState({ total: 0, pending: 0, approved: 0, flagged: 0, rejected: 0 })

  const fetchRecords = useCallback(() => {
    const params = new URLSearchParams()
    if (filters.source_type) params.append('source_type', filters.source_type)
    if (filters.scope) params.append('scope', filters.scope)
    if (filters.status) params.append('status', filters.status)

    Promise.all([
      axios.get(`${API}/emissions/?${params.toString()}`),
      axios.get(`${API}/review/stats/`)
    ]).then(([r, s]) => {
      setRecords(r.data)
      setStats(s.data)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [filters])

  useEffect(() => { fetchRecords() }, [fetchRecords])

  const handleAction = async (id, action) => {
    setActionLoading(`${id}-${action}`)
    try {
      await axios.patch(`${API}/review/${id}/`, { action })
      fetchRecords()
    } catch {
      alert('Action failed')
    } finally {
      setActionLoading(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-gray-800">Review Records</h1>
        <p className="text-gray-400 text-sm mt-1">Approve, flag, or reject emission records before they are locked for audit</p>
      </div>

      {/* Mini Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total', value: stats.total, color: 'bg-white', text: 'text-gray-800' },
          { label: 'Pending', value: stats.pending, color: 'bg-yellow-50', text: 'text-yellow-700' },
          { label: 'Approved', value: stats.approved, color: 'bg-green-50', text: 'text-green-700' },
          { label: 'Flagged', value: stats.flagged, color: 'bg-orange-50', text: 'text-orange-700' },
        ].map(s => (
          <div key={s.label} className={`${s.color} rounded-2xl p-4 shadow-sm text-center`}>
            <p className={`text-2xl font-bold ${s.text}`}>{s.value}</p>
            <p className="text-xs text-gray-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-sm p-4 flex gap-3 flex-wrap items-center">
        <span className="text-sm font-medium text-gray-500">Filter by:</span>

        <select
          className="text-sm border border-gray-200 rounded-xl px-3 py-2 text-gray-600 bg-gray-50"
          value={filters.source_type}
          onChange={e => setFilters({ ...filters, source_type: e.target.value })}
        >
          <option value="">All Sources</option>
          <option value="sap">🏭 SAP</option>
          <option value="utility">⚡ Utility</option>
          <option value="travel">✈️ Travel</option>
        </select>

        <select
          className="text-sm border border-gray-200 rounded-xl px-3 py-2 text-gray-600 bg-gray-50"
          value={filters.scope}
          onChange={e => setFilters({ ...filters, scope: e.target.value })}
        >
          <option value="">All Scopes</option>
          <option value="1">Scope 1</option>
          <option value="2">Scope 2</option>
          <option value="3">Scope 3</option>
        </select>

        <select
          className="text-sm border border-gray-200 rounded-xl px-3 py-2 text-gray-600 bg-gray-50"
          value={filters.status}
          onChange={e => setFilters({ ...filters, status: e.target.value })}
        >
          <option value="">All Status</option>
          <option value="pending">⏳ Pending</option>
          <option value="approved">✅ Approved</option>
          <option value="flagged">🚩 Flagged</option>
          <option value="rejected">❌ Rejected</option>
        </select>

        {(filters.source_type || filters.scope || filters.status) && (
          <button
            onClick={() => setFilters({ source_type: '', scope: '', status: '' })}
            className="text-sm text-red-400 hover:text-red-600 font-medium"
          >
            ✕ Clear
          </button>
        )}

        <span className="ml-auto text-sm text-gray-400">{records.length} records</span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="text-4xl mb-3">⏳</div>
            <p className="text-gray-400">Loading records...</p>
          </div>
        ) : records.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-4xl mb-3">📭</div>
            <p className="text-gray-400">No records found. Upload data from the Ingest page.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase border-b border-gray-100">
              <tr>
                <th className="px-4 py-4 text-left">Source</th>
                <th className="px-4 py-4 text-left">Scope</th>
                <th className="px-4 py-4 text-left">Category</th>
                <th className="px-4 py-4 text-left">Activity</th>
                <th className="px-4 py-4 text-left">CO₂e (kg)</th>
                <th className="px-4 py-4 text-left">Period</th>
                <th className="px-4 py-4 text-left">Facility</th>
                <th className="px-4 py-4 text-left">Status</th>
                <th className="px-4 py-4 text-left">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {records.map(r => (
                <tr key={r.id} className="hover:bg-gray-50 transition">
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-lg text-xs font-semibold ${sourceColors[r.source_type]}`}>
                      {sourceIcons[r.source_type]} {r.source_type.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-lg text-xs font-semibold ${scopeColors[r.scope]}`}>
                      S{r.scope}
                    </span>
                  </td>
                  <td className="px-4 py-3 capitalize text-gray-700 font-medium">{r.category}</td>
                  <td className="px-4 py-3 text-gray-600 font-mono text-xs">
                    {parseFloat(r.activity_value).toFixed(2)} {r.activity_unit}
                  </td>
                  <td className="px-4 py-3 font-bold text-gray-800">
                    {parseFloat(r.co2e_kg).toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs font-mono">
                    {r.period_start}<br/>{r.period_end}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{r.facility || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-lg text-xs font-semibold ${statusColors[r.status]}`}>
                      {r.status === 'pending' ? '⏳' : r.status === 'approved' ? '✅' : r.status === 'flagged' ? '🚩' : '❌'} {r.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {r.is_locked ? (
                      <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-lg">🔒 Locked</span>
                    ) : (
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleAction(r.id, 'approved')}
                          disabled={actionLoading === `${r.id}-approved`}
                          title="Approve"
                          className="px-2 py-1 bg-green-100 text-green-700 rounded-lg text-xs hover:bg-green-200 transition font-medium"
                        >
                          ✅
                        </button>
                        <button
                          onClick={() => handleAction(r.id, 'flagged')}
                          disabled={actionLoading === `${r.id}-flagged`}
                          title="Flag for review"
                          className="px-2 py-1 bg-orange-100 text-orange-700 rounded-lg text-xs hover:bg-orange-200 transition font-medium"
                        >
                          🚩
                        </button>
                        <button
                          onClick={() => handleAction(r.id, 'rejected')}
                          disabled={actionLoading === `${r.id}-rejected`}
                          title="Reject"
                          className="px-2 py-1 bg-red-100 text-red-700 rounded-lg text-xs hover:bg-red-200 transition font-medium"
                        >
                          ❌
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

export default Review