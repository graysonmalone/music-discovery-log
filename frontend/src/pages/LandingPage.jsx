import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { Input } from '@/components/ui/input'
import { Button, buttonVariants } from '@/components/ui/button'
import { ArtworkImage } from '@/components/ArtworkImage'
import { cn } from '@/lib/utils'

const FEATURED = [
  { name: 'Kendrick Lamar', sub: 'Hip-Hop', query: 'Kendrick Lamar', type: 'artist', artistName: null },
  { name: 'Sabrina Carpenter', sub: 'Pop', query: 'Sabrina Carpenter', type: 'artist', artistName: null },
  { name: 'Chappell Roan', sub: 'Pop', query: 'Chappell Roan', type: 'artist', artistName: null },
  { name: 'Tyler, the Creator', sub: 'Hip-Hop', query: 'Tyler the Creator', type: 'artist', artistName: null },
  { name: 'Short n\'Sweet', sub: 'Sabrina Carpenter', query: 'Short n Sweet Sabrina Carpenter', type: 'release', artistName: 'Sabrina Carpenter' },
  { name: 'GNX', sub: 'Kendrick Lamar', query: 'GNX Kendrick Lamar', type: 'release', artistName: 'Kendrick Lamar' },
  { name: 'Midwest Princess', sub: 'Chappell Roan', query: 'Rise Fall Midwest Princess Chappell Roan', type: 'release', artistName: 'Chappell Roan' },
  { name: 'Chromakopia', sub: 'Tyler, the Creator', query: 'Chromakopia Tyler Creator', type: 'release', artistName: 'Tyler, the Creator' },
]

export function LandingPage() {
  const { isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const [q, setQ] = useState('')

  function handleSearch(e) {
    e.preventDefault()
    if (!q.trim()) return
    navigate(`/search?q=${encodeURIComponent(q.trim())}`)
  }

  function handleFeaturedClick(item) {
    navigate(`/search?q=${encodeURIComponent(item.query)}`)
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      {/* Hero */}
      <div className="text-center mb-10">
        <h1 className="text-4xl sm:text-5xl font-bold text-white mb-3">
          Your personal music journal
        </h1>
        <p className="text-gray-400 text-lg mb-8">
          Search artists and albums, save them, tag them, and write your take.
        </p>

        <form onSubmit={handleSearch} className="flex gap-2 max-w-xl mx-auto">
          <Input
            type="text"
            placeholder="Search any artist, album, or song…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 flex-1"
          />
          <Button type="submit" className="bg-purple-600 hover:bg-purple-700 text-white shrink-0">
            Search
          </Button>
        </form>

        {!isAuthenticated && (
          <p className="mt-4 text-sm text-gray-500">
            <Link to="/register" className="text-purple-400 hover:text-purple-300">Create a free account</Link>
            {' '}to save your discoveries.
          </p>
        )}
      </div>

      {/* Trending */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-4">Trending now</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {FEATURED.map((item) => (
            <button
              key={item.name}
              onClick={() => handleFeaturedClick(item)}
              className="bg-gray-900 border border-gray-800 hover:border-purple-700 rounded-lg overflow-hidden text-left transition-colors group"
            >
              <ArtworkImage
                name={item.name}
                artistName={item.artistName}
                className="w-full aspect-square"
              />
              <div className="p-3">
                <p className="text-sm font-medium text-white group-hover:text-purple-400 transition-colors line-clamp-1">
                  {item.name}
                </p>
                <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{item.sub}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* CTA for logged-out users */}
      {!isAuthenticated && (
        <div className="mt-12 text-center">
          <p className="text-gray-400 mb-4">Ready to start logging your music?</p>
          <div className="flex gap-3 justify-center">
            <Link
              to="/register"
              className={cn(buttonVariants({ size: 'lg' }), 'bg-purple-600 hover:bg-purple-700 text-white')}
            >
              Get started
            </Link>
            <Link
              to="/login"
              className={cn(
                buttonVariants({ size: 'lg', variant: 'outline' }),
                'border-purple-700 text-purple-400 hover:bg-purple-900/30 hover:text-purple-300 hover:border-purple-500'
              )}
            >
              Log in
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
