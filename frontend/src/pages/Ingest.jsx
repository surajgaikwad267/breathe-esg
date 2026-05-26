import { useState } from 'react'
import axios from 'axios'

const API = 'http://127.0.0.1:8000/api'

function UploadCard({ title, subtitle, endpoint, color, icon, columns }) {
  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  const handleUpload = async () => {
    if (!file) return
    setLoading(true)
    setResult(null)
    setError(null)
    const formData = new FormData()
    formData.append('file', file)
    try {
      const res = await axios.post(`${API}/${endpoint}/`, formData)
      setResult(res.data)
    } catch {
      setError('Upload failed. Check file format.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      <div className={`${color} p-6 text-white`}>
        <div className="text-4xl mb-2">{icon}</div>
        <h2 className="text-lg font-bold">{title}</h2>
        <p className="text-sm opacity-80 mt-1">{subtitle}</p>
      </div>

      <div className="p-6 space-y-4">
        {/* Expected columns */}
        <div className="bg-gray-50 rounded-xl p-3">
          <p className="text-xs font-semibold text-gray-500 mb-2">EXPECTED COLUMNS</p>
          <div className="flex flex-wrap gap-1">
            {columns.map(col => (
              <span key={col} className="px-2 py-1 bg-white border border-gray-200 rounded text-xs text-gray-600 font-mono">
                {col}
              </span>
            ))}
          </div>
        </div>

        {/* File upload */}
        <div className="border-2 border-dashed border-gray-200 rounded-xl p-4 text-center hover:border-gray-300 transition">
          <div className="text-2xl mb-2">📎</div>
          <input
            type="file"
            accept=".csv"
            onChange={e => { setFile(e.target.files[0]); setResult(null); setError(null) }}
            className="text-sm text-gray-500 w-full"
          />
          <p className="text-xs text-gray-400 mt-1">CSV files only</p>
        </div>

        {file && (
          <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-2">
            <span>📄</span>
            <span className="truncate">{file.name}</span>
          </div>
        )}

        <button
          onClick={handleUpload}
          disabled={!file || loading}
          className={`w-full py-3 rounded-xl text-white font-semibold text-sm transition-all ${
            !file || loading
              ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
              : 'bg-green-600 hover:bg-green-700 shadow-md hover:shadow-lg'
          }`}
        >
          {loading ? '⏳ Processing...' : '🚀 Upload & Process'}
        </button>

        {result && (
          <div className="p-4 bg-green-50 border border-green-100 rounded-xl text-sm">
            <p className="font-semibold text-green-700 mb-2">✅ Upload Successful!</p>
            <div className="space-y-1 text-gray-600">
              <p>Batch ID: <span className="font-mono font-medium">#{result.batch_id}</span></p>
              <p>✓ Processed: <span className="font-semibold text-green-600">{result.success_rows} rows</span></p>
              {result.failed_rows > 0 && (
                <p>✗ Failed: <span className="font-semibold text-red-500">{result.failed_rows} rows</span></p>
              )}
            </div>
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600">
            ❌ {error}
          </div>
        )}
      </div>
    </div>
  )
}

function Ingest() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-gray-800">Ingest Data</h1>
        <p className="text-gray-400 text-sm mt-1">Upload CSV files from each emission data source</p>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex gap-3">
        <span className="text-xl">💡</span>
        <div className="text-sm text-blue-700">
          <p className="font-semibold">How it works</p>
          <p className="text-blue-600 mt-1">Upload a CSV file from any source below. The system will parse, normalize units, assign emission scopes, and calculate CO₂e automatically. Records will appear in the Review page for analyst sign-off.</p>
        </div>
      </div>

      {/* Upload Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <UploadCard
          icon="🏭"
          title="SAP — Fuel & Procurement"
          subtitle="SAP flat file export with fuel consumption data"
          endpoint="ingest/sap"
          color="bg-gradient-to-br from-purple-600 to-purple-800"
          columns={['BUKRS', 'WERKS', 'MATNR', 'MENGE', 'MEINS', 'BLDAT', 'LIFNR']}
        />
        <UploadCard
          icon="⚡"
          title="Utility — Electricity"
          subtitle="Utility portal CSV with meter and consumption data"
          endpoint="ingest/utility"
          color="bg-gradient-to-br from-yellow-500 to-orange-600"
          columns={['meter_id', 'facility_name', 'billing_period_start', 'billing_period_end', 'consumption_kwh']}
        />
        <UploadCard
          icon="✈️"
          title="Travel — Flights & Hotels"
          subtitle="Corporate travel platform export (Concur/Navan style)"
          endpoint="ingest/travel"
          color="bg-gradient-to-br from-blue-500 to-blue-700"
          columns={['trip_id', 'employee_id', 'travel_date', 'origin', 'destination', 'transport_mode']}
        />
      </div>
    </div>
  )
}

export default Ingest