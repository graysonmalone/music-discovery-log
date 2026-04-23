import { useState, useMemo } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { Input } from '@/components/ui/input'
import { Button, buttonVariants } from '@/components/ui/button'
import { ArtworkImage } from '@/components/ArtworkImage'
import { cn } from '@/lib/utils'

const ALL_TRENDING = [
  { name: 'Kendrick Lamar', sub: 'Hip-Hop', query: 'Kendrick Lamar', type: 'artist', artistName: null },
  { name: 'Sabrina Carpenter', sub: 'Pop', query: 'Sabrina Carpenter', type: 'artist', artistName: null },
  { name: 'Chappell Roan', sub: 'Pop', query: 'Chappell Roan', type: 'artist', artistName: null },
  { name: 'Tyler, the Creator', sub: 'Hip-Hop', query: 'Tyler the Creator', type: 'artist', artistName: null },
  { name: 'Drake', sub: 'Hip-Hop', query: 'Drake', type: 'artist', artistName: null },
  { name: 'Taylor Swift', sub: 'Pop', query: 'Taylor Swift', type: 'artist', artistName: null },
  { name: 'SZA', sub: 'R&B', query: 'SZA', type: 'artist', artistName: null },
  { name: 'Bad Bunny', sub: 'Latin', query: 'Bad Bunny', type: 'artist', artistName: null },
  { name: 'Billie Eilish', sub: 'Pop/Alternative', query: 'Billie Eilish', type: 'artist', artistName: null },
  { name: 'The Weeknd', sub: 'R&B', query: 'The Weeknd', type: 'artist', artistName: null },
  { name: 'Olivia Rodrigo', sub: 'Pop/Rock', query: 'Olivia Rodrigo', type: 'artist', artistName: null },
  { name: 'Post Malone', sub: 'Hip-Hop/Pop', query: 'Post Malone', type: 'artist', artistName: null },
  { name: 'Doja Cat', sub: 'Pop/Hip-Hop', query: 'Doja Cat', type: 'artist', artistName: null },
  { name: 'J. Cole', sub: 'Hip-Hop', query: 'J Cole', type: 'artist', artistName: null },
  { name: 'Ariana Grande', sub: 'Pop', query: 'Ariana Grande', type: 'artist', artistName: null },
  { name: 'Harry Styles', sub: 'Pop/Rock', query: 'Harry Styles', type: 'artist', artistName: null },
  { name: 'Short n\'Sweet', sub: 'Sabrina Carpenter', query: 'Short n Sweet Sabrina Carpenter', type: 'release', artistName: 'Sabrina Carpenter' },
  { name: 'GNX', sub: 'Kendrick Lamar', query: 'GNX Kendrick Lamar', type: 'release', artistName: 'Kendrick Lamar' },
  { name: 'The Rise and Fall of a Midwest Princess', sub: 'Chappell Roan', query: 'Rise Fall Midwest Princess Chappell Roan', type: 'release', artistName: 'Chappell Roan' },
  { name: 'Chromakopia', sub: 'Tyler, the Creator', query: 'Chromakopia Tyler Creator', type: 'release', artistName: 'Tyler, the Creator' },
  { name: 'Midnights', sub: 'Taylor Swift', query: 'Midnights Taylor Swift', type: 'release', artistName: 'Taylor Swift' },
  { name: 'SOS', sub: 'SZA', query: 'SOS SZA', type: 'release', artistName: 'SZA' },
  { name: 'Un Verano Sin Ti', sub: 'Bad Bunny', query: 'Un Verano Sin Ti Bad Bunny', type: 'release', artistName: 'Bad Bunny' },
  { name: 'After Hours', sub: 'The Weeknd', query: 'After Hours The Weeknd', type: 'release', artistName: 'The Weeknd' },
  { name: 'GUTS', sub: 'Olivia Rodrigo', query: 'GUTS Olivia Rodrigo', type: 'release', artistName: 'Olivia Rodrigo' },
  { name: 'Hit Me Hard and Soft', sub: 'Billie Eilish', query: 'Hit Me Hard and Soft Billie Eilish', type: 'release', artistName: 'Billie Eilish' },
  { name: 'Austin', sub: 'Post Malone', query: 'Austin Post Malone', type: 'release', artistName: 'Post Malone' },
  { name: 'Scarlet', sub: 'Doja Cat', query: 'Scarlet Doja Cat', type: 'release', artistName: 'Doja Cat' },
]

export function LandingPage() {
  const { isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const [q, setQ] = useState('')

  // Shuffle and pick 16 random trending items on each page load
  const trending = useMemo(() => {
    return [...ALL_TRENDING].sort(() => Math.random() - 0.5).slice(0, 16)
  }, [])

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
          Discover music, share your taste
        </h1>
        <p className="text-gray-400 text-lg mb-8">
          Save artists and albums, tag what you love, follow friends, and see what the people you know are listening to.
        </p>

        <form onSubmit={handleSearch} className="flex gap-2 max-w-xl mx-auto">
          <label htmlFor="landing-search" className="sr-only">Search artists, albums, or songs</label>
          <Input
            id="landing-search"
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
            {' '}to build your collection and connect with friends.
          </p>
        )}
      </div>

      {/* Trending */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-4">Trending now</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {trending.map((item) => (
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
          <p className="text-gray-400 mb-4">Ready to join the community?</p>
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
