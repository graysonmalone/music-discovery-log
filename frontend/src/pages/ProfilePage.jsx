import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { getProfile } from '@/api/profile'
import { getCollection } from '@/api/collection'
import { ArtworkImage } from '@/components/ArtworkImage'
import { TagBadge } from '@/components/TagBadge'
import { ErrorMessage } from '@/components/ErrorMessage'
import { useTop3 } from '@/context/Top3Context'

function ProfileSkeleton() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6 animate-pulse">
      <div className="h-7 w-32 bg-gray-800 rounded" />
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="space-y-1">
            <div className="h-2 w-16 bg-gray-800 rounded" />
            <div className="h-4 w-48 bg-gray-800 rounded" />
          </div>
        ))}
      </div>
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <div className="h-5 w-24 bg-gray-800 rounded mb-4" />
        <div className="grid grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-gray-800 rounded-lg h-20" />
          ))}
        </div>
      </div>
    </div>
  )
}

export function ProfilePage() {
  const { top3, remove: removeFromTop3 } = useTop3()

  const { data: profile, isLoading: profileLoading, error: profileError } = useQuery({
    queryKey: ['profile'],
    queryFn: getProfile,
  })

  const { data: allEntries } = useQuery({
    queryKey: ['collection', ''],
    queryFn: () => getCollection(''),
  })

  if (profileLoading) return <ProfileSkeleton />
  if (profileError) return (
    <div className="max-w-xl mx-auto px-4 py-8">
      <ErrorMessage message="Failed to load profile." />
    </div>
  )

  const { user, counts } = profile
  const total = counts.loved + counts.want_to_listen + counts.overrated
  const recent = allEntries ? [...allEntries].slice(0, 6) : []

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6 animate-fadein">
      <h1 className="text-2xl font-bold text-white">Profile</h1>

      {/* User info */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-3">
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-0.5">Name</p>
          <p className="text-white font-medium">{user.name}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-0.5">Email</p>
          <p className="text-gray-300">{user.email}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-0.5">Member since</p>
          <p className="text-gray-300">
            {new Date(user.created_at).toLocaleDateString('en-US', {
              year: 'numeric', month: 'long', day: 'numeric',
            })}
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <h2 className="text-white font-semibold mb-4">Collection</h2>
        <div className="grid grid-cols-2 gap-3">
          <StatBox label="Total" value={total} color="text-white" />
          <StatBox label="Loved" value={counts.loved} color="text-pink-400" />
          <StatBox label="Want to Listen" value={counts.want_to_listen} color="text-blue-400" />
          <StatBox label="Overrated" value={counts.overrated} color="text-amber-400" />
        </div>
      </div>

      {/* Top 3 */}
      <div>
        <h2 className="text-white font-semibold mb-1">My Top 3</h2>
        <p className="text-xs text-gray-500 mb-4">Pin up to 3 artists, albums, or songs</p>
        {top3.length === 0 ? (
          <div className="bg-gray-900 border border-dashed border-gray-700 rounded-xl p-6 text-center">
            <p className="text-gray-500 text-sm">No picks yet — add up to 3 from an artist or album page.</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {top3.map((item) => {
              const path = item.entityType === 'artist' ? `/artist/${item.id}` : `/album/${item.id}`
              return (
                <div key={item.id} className="bg-gray-900 border border-yellow-600/40 rounded-lg overflow-hidden group relative">
                  <Link to={path}>
                    {item.artworkUrl ? (
                      <img src={item.artworkUrl} alt={item.name} className="w-full aspect-square object-cover group-hover:opacity-90 transition-opacity" />
                    ) : (
                      <ArtworkImage name={item.name} artistName={item.artistName} className="w-full aspect-square" />
                    )}
                  </Link>
                  <div className="p-2">
                    <p className="text-xs font-medium text-white line-clamp-1">{item.name}</p>
                    {item.artistName && <p className="text-xs text-gray-500 line-clamp-1">{item.artistName}</p>}
                    <span className="text-xs text-yellow-500 capitalize">{item.entityType === 'artist' ? 'Artist' : 'Album'}</span>
                  </div>
                  <button
                    onClick={() => removeFromTop3(item.id)}
                    className="absolute top-1.5 right-1.5 bg-black/60 hover:bg-red-900/80 text-gray-400 hover:text-white rounded-full w-6 h-6 flex items-center justify-center text-xs transition-colors"
                    title="Remove from Top 3"
                  >
                    ✕
                  </button>
                </div>
              )
            })}
            {Array.from({ length: 3 - top3.length }).map((_, i) => (
              <div key={`empty-${i}`} className="bg-gray-900 border border-dashed border-gray-800 rounded-lg aspect-square flex items-center justify-center">
                <p className="text-gray-700 text-xs text-center px-2">Empty slot</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent entries */}
      {recent.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-semibold">Recently saved</h2>
            <Link to="/collection" className="text-xs text-purple-400 hover:text-purple-300">
              View all →
            </Link>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {recent.map((entry) => (
              <Link
                key={entry.id}
                to={`/collection/${entry.id}`}
                className="bg-gray-900 border border-gray-800 hover:border-purple-700 rounded-lg overflow-hidden transition-colors group"
              >
                <ArtworkImage
                  name={entry.name}
                  artistName={entry.artist_name}
                  className="w-full aspect-square"
                />
                <div className="p-2">
                  <p className="text-xs font-medium text-white group-hover:text-purple-400 transition-colors line-clamp-1">
                    {entry.name}
                  </p>
                  <div className="mt-1">
                    <TagBadge tag={entry.tag} />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function StatBox({ label, value, color }) {
  return (
    <div className="bg-gray-800 rounded-lg p-4 text-center">
      <p className={`text-3xl font-bold ${color}`}>{value}</p>
      <p className="text-xs text-gray-500 mt-1">{label}</p>
    </div>
  )
}
