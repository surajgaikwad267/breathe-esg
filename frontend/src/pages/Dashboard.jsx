import { useEffect, useState } from 'react'
import axios from 'axios'

const API = 'https://surajgaikwad219.pythonanywhere.com/api'

function StatCard({ label, value, color, bg, icon }) {
  return (
    <div className={`${bg} rounded-2xl p-6 shadow-sm border border-white`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-2xl">{icon}</span>
        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${color}`}>LIVE</span>
      </div>
      <p className="text-3xl font-bold text-gray-800 mt-1">{value}</p>
      <p className="text-sm text-gray-500 mt-1">{label}</p>
    </div>
  )
}

function ScopeBar({ label, value, total, color }) {
  const pct = total > 0 ? (value / total * 100).toFixed(1) : 0
  return (
    <div className="mb-4">
      <div className="flex justify-between text-sm mb-1">
        <span className="font-medium text-gray-700">{label}</span>
        <span className="text-gray-500">{value.toLocaleString()} kg CO₂e ({pct}%)</span>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-3">
        <div className={`${color} h-3 rounded-full transition-all`} style={{width: `${pct}%`}}></div>
      </div>
    </div>
  )
}

function Dashboard() {
  const [stats, setStats] = useState(null)
  const [batches, setBatches] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      axios.get(`${API}/review/stats/`),
      axios.get(`${API}/batches/`)
    ]).then(([s, b]) => {
      setStats(s.data)
      setBatches(b.data.slice(0, 8))
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="flex justify-center items-center h-64">
      <div className="text-center">
        <div className="text-4xl mb-3">🌿</div>
        <p className="text-gray-400">Loading dashboard...</p>
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-gray-800">Emissions Dashboard</h1>
        <p className="text-gray-400 text-sm mt-1">Real-time overview of ingested and reviewed emission data</p>
      </div>

      {/* Stat Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard icon="📋" label="Total Records" value={stats.total} bg="bg-white" color="bg-blue-100 text-blue-700" />
          <StatCard icon="⏳" label="Pending Review" value={stats.pending} bg="bg-yellow-50" color="bg-yellow-100 text-yellow-700" />
          <StatCard icon="✅" label="Approved" value={stats.approved} bg="bg-green-50" color="bg-green-100 text-green-700" />
          <StatCard icon="🚩" label="Flagged" value={stats.flagged} bg="bg-orange-50" color="bg-orange-100 text-orange-700" />
        </div>
      )}

      {/* Emissions Summary */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Total CO2e */}
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-700 mb-2">Total Carbon Footprint</h2>
            <div className="text-5xl font-bold text-green-700 mt-4">
              {(stats.total_co2e_kg / 1000).toFixed(2)}
              <span className="text-xl font-normal text-gray-400 ml-2">tCO₂e</span>
            </div>
            <p className="text-gray-400 text-sm mt-2">Across all scopes and sources</p>
            <div className="mt-4 p-3 bg-green-50 rounded-xl text-sm text-green-700">
              🌍 Equivalent to {Math.round(stats.total_co2e_kg / 404)} car trips around the world
            </div>
          </div>

          {/* Scope Breakdown */}
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-700 mb-4">Emissions by Scope</h2>
            <ScopeBar
              label="🔴 Scope 1 — Direct (Fuel)"
              value={stats.scope1_co2e_kg}
              total={stats.total_co2e_kg}
              color="bg-red-400"
            />
            <ScopeBar
              label="🟡 Scope 2 — Electricity"
              value={stats.scope2_co2e_kg}
              total={stats.total_co2e_kg}
              color="bg-yellow-400"
            />
            <ScopeBar
              label="🔵 Scope 3 — Travel"
              value={stats.scope3_co2e_kg}
              total={stats.total_co2e_kg}
              color="bg-blue-400"
            />
          </div>
        </div>
      )}

      {/* Recent Batches */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-700">Recent Ingestion Batches</h2>
        </div>
        {batches.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            <div className="text-4xl mb-2">📭</div>
            <p>No batches yet. Upload data from Ingest page.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>
                <th className="px-6 py-3 text-left">Batch</th>
                <th className="px-6 py-3 text-left">Source</th>
                <th className="px-6 py-3 text-left">Status</th>
                <th className="px-6 py-3 text-left">Rows</th>
                <th className="px-6 py-3 text-left">Uploaded</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {batches.map(b => (
                <tr key={b.id} className="hover:bg-gray-50 transition">
                  <td className="px-6 py-3 font-medium text-gray-700">#{b.id}</td>
                  <td className="px-6 py-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      b.source_type === 'sap' ? 'bg-purple-100 text-purple-700' :
                      b.source_type === 'utility' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {b.source_type.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      b.status === 'done' ? 'bg-green-100 text-green-700' :
                      b.status === 'failed' ? 'bg-red-100 text-red-700' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {b.status === 'done' ? '✓ Done' : b.status === 'failed' ? '✗ Failed' : b.status}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-gray-600">{b.row_count}</td>
                  <td className="px-6 py-3 text-gray-400">{new Date(b.uploaded_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

export default Dashboard