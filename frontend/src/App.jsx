import { useEffect, useState } from 'react'

function App() {
  const [status, setStatus] = useState('checking...')

  useEffect(() => {
    fetch('/api/health')
      .then((res) => res.json())
      .then((data) => setStatus(data.status))
      .catch(() => setStatus('unreachable'))
  }, [])

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center gap-4">
      <h1 className="text-4xl font-bold">Music Discovery Log</h1>
      <p className="text-gray-400">Hello World</p>
      <p className="text-sm text-gray-500">
        API status: <span className="text-green-400">{status}</span>
      </p>
    </div>
  )
}

export default App
