import { useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getPublicProfile, followUser, unfollowUser, getFollowing, toggleLike, getUserCollection } from '@/api/social'
import { ArtworkImage } from '@/components/ArtworkImage'
import { TagBadges } from '@/components/TagBadge'
import { ErrorMessage } from '@/components/ErrorMessage'
import { useAuth } from '@/hooks/useAuth'

function ProfileSkeleton() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6 animate-pulse">
      <div className="h-7 w-40 bg-gray-800 rounded" />
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-3">
        <div className="h-6 w-48 bg-gray-800 rounded" />
        <div className="h-3 w-32 bg-gray-800 rounded" />
      </div>
      <div className="grid grid-cols-3 gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-gray-900 rounded-lg aspect-square bg-gray-800" />
        ))}
      </div>
    </div>
  )
}

function LikeButton({ itemType, itemId, liked, likeCount }) {
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: () => toggleLike(itemType, itemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['publicProfile'] })
      queryClient.invalidateQueries({ queryKey: ['top3'] })
    },
  })

  return (
    <button
      onClick={e => { e.preventDefault(); mutation.mutate() }}
      className={`flex items-center gap-1 text-xs transition-colors ${
        liked ? 'text-pink-400' : 'text-gray-500 hover:text-pink-400'
      }`}
    >
      <svg className="w-3.5 h-3.5" fill={liked ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
      </svg>
      {likeCount > 0 && <span>{likeCount}</span>}
    </button>
  )
}

export function PublicProfilePage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user: currentUser } = useAuth()
  const queryClient = useQueryClient()
  const [tagFilter, setTagFilter] = useState(null)

  if (currentUser && String(currentUser.id) === String(id)) {
    navigate('/profile', { replace: true })
    return null
  }

  const { data: profile, isLoading, error } = useQuery({
    queryKey: ['publicProfile', id],
    queryFn: () => getPublicProfile(id),
  })

  const { data: following = [] } = useQuery({
    queryKey: ['following'],
    queryFn: getFollowing,
  })

  const isFollowing = following.some(u => String(u.id) === String(id)) || profile?.following

  const followMutation = useMutation({
    mutationFn: () => followUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['following'] })
      queryClient.invalidateQueries({ queryKey: ['publicProfile', id] })
      queryClient.invalidateQueries({ queryKey: ['feed'] })
    },
  })

  const unfollowMutation = useMutation({
    mutationFn: () => unfollowUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['following'] })
      queryClient.invalidateQueries({ queryKey: ['publicProfile', id] })
      queryClient.invalidateQueries({ queryKey: ['feed'] })
    },
  })

  const { data: taggedEntries = [], isLoading: taggedLoading } = useQuery({
    queryKey: ['userCollection', id, tagFilter],
    queryFn: () => getUserCollection(id, tagFilter === 'all' ? null : tagFilter),
    enabled: !!tagFilter,
  })

  if (isLoading) return <ProfileSkeleton />
  if (error) return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <ErrorMessage message="User not found." />
    </div>
  )

  const { user, counts, recent, top3 = [] } = profile
  const total = (counts.loved ?? 0) + (counts.want_to_listen ?? 0) + (counts.overrated ?? 0) + (counts.put_on ?? 0)

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6 animate-fadein">
      <button
        onClick={() => navigate(-1)}
        className="text-sm text-gray-500 hover:text-gray-300 flex items-center gap-1.5 transition-colors"
      >
        ← Back
      </button>

      {/* User info + follow */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white mb-1">{user.name}</h1>
            <p className="text-sm text-gray-500">
              Joined {new Date(user.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}
            </p>
            <p className="text-xs text-gray-600 mt-1">
              {profile.followers_count} {profile.followers_count === 1 ? 'follower' : 'followers'} · {profile.following_count} following
            </p>
          </div>
          <button
            onClick={() => isFollowing ? unfollowMutation.mutate() : followMutation.mutate()}
            disabled={followMutation.isPending || unfollowMutation.isPending}
            className={`text-sm px-5 py-2 rounded-lg transition-colors shrink-0 ${
              isFollowing
                ? 'bg-gray-700 hover:bg-red-900/40 text-gray-300 hover:text-red-400 border border-gray-600'
                : 'bg-purple-600 hover:bg-purple-700 text-white'
            }`}
          >
            {followMutation.isPending ? 'Following…'
              : unfollowMutation.isPending ? 'Unfollowing…'
              : isFollowing ? 'Following' : '+ Follow'}
          </button>
        </div>
      </div>

      {/* Top 3 */}
      {top3.length > 0 && (
        <div>
          <h2 className="text-white font-semibold mb-1">Top 3</h2>
          <p className="text-xs text-gray-500 mb-3">{user.name}'s picks</p>
          <div className="grid grid-cols-3 gap-3">
            {top3.map(item => {
              const path = item.entity_type === 'artist' ? `/artist/${item.itunes_id}` : `/album/${item.itunes_id}`
              return (
                <div key={item.itunes_id} className="bg-gray-900 border border-yellow-600/40 rounded-lg overflow-hidden relative">
                  <Link to={path}>
                    {item.artwork_url ? (
                      <img src={item.artwork_url} alt={item.name} className="w-full aspect-square object-cover hover:opacity-90 transition-opacity" />
                    ) : (
                      <ArtworkImage name={item.name} artistName={item.artist_name} className="w-full aspect-square" />
                    )}
                  </Link>
                  <div className="p-2">
                    <p className="text-xs font-medium text-white line-clamp-1">{item.name}</p>
                    {item.artist_name && <p className="text-xs text-gray-500 line-clamp-1">{item.artist_name}</p>}
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs text-yellow-500">{item.entity_type === 'artist' ? 'Artist' : 'Album'}</span>
                      <LikeButton itemType="top3" itemId={item.id} liked={item.liked} likeCount={item.like_count} />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <h2 className="text-white font-semibold mb-4">Collection</h2>
        <div className="grid grid-cols-2 gap-3">
          <StatBox label="Total" value={total} color="text-white" onClick={() => setTagFilter(f => f === 'all' ? null : 'all')} active={tagFilter === 'all'} />
          <StatBox label="Loved" value={counts.loved ?? 0} color="text-pink-400" onClick={() => setTagFilter(f => f === 'loved' ? null : 'loved')} active={tagFilter === 'loved'} />
          <StatBox label="Want to Listen" value={counts.want_to_listen ?? 0} color="text-blue-400" onClick={() => setTagFilter(f => f === 'want_to_listen' ? null : 'want_to_listen')} active={tagFilter === 'want_to_listen'} />
          <StatBox label="Overrated" value={counts.overrated ?? 0} color="text-amber-400" onClick={() => setTagFilter(f => f === 'overrated' ? null : 'overrated')} active={tagFilter === 'overrated'} />
          <StatBox label="Put On" value={counts.put_on ?? 0} color="text-teal-400" onClick={() => setTagFilter(f => f === 'put_on' ? null : 'put_on')} active={tagFilter === 'put_on'} />
        </div>
      </div>

      {/* Tag-filtered entries panel */}
      {tagFilter && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
            <p className="text-sm font-semibold text-white">
              {{ all: 'All entries', loved: 'Loved', want_to_listen: 'Want to Listen', overrated: 'Overrated', put_on: 'Put On' }[tagFilter]}
            </p>
            <button onClick={() => setTagFilter(null)} className="text-gray-500 hover:text-white text-xs">Close</button>
          </div>
          {taggedLoading ? (
            <p className="text-xs text-gray-600 px-4 py-6 text-center">Loading…</p>
          ) : taggedEntries.length === 0 ? (
            <p className="text-gray-500 text-sm px-4 py-6 text-center">No entries here yet.</p>
          ) : (
            <div className="divide-y divide-gray-800 max-h-80 overflow-y-auto">
              {taggedEntries.map(entry => {
                const itunesId = entry.musicbrainz_id?.startsWith('itunes-')
                  ? entry.musicbrainz_id.replace('itunes-', '')
                  : null
                const detailPath = itunesId
                  ? entry.entity_type === 'artist' ? `/artist/${itunesId}` : `/album/${itunesId}`
                  : null
                const inner = (
                  <div className="flex items-center gap-3 px-4 py-3 hover:bg-gray-800/50 transition-colors">
                    <ArtworkImage name={entry.name} artistName={entry.artist_name} className="w-10 h-10 rounded shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white truncate">{entry.name}</p>
                      {entry.artist_name && <p className="text-xs text-gray-500 truncate">{entry.artist_name}</p>}
                    </div>
                    <TagBadges tags={entry.tags} tag={entry.tag} />
                  </div>
                )
                return detailPath ? (
                  <Link key={entry.id} to={detailPath}>{inner}</Link>
                ) : (
                  <div key={entry.id}>{inner}</div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Recent entries */}
      {recent.length > 0 && (
        <div>
          <h2 className="text-white font-semibold mb-4">Recently saved</h2>
          <div className="grid grid-cols-3 gap-3">
            {recent.map(entry => {
              const itunesId = entry.musicbrainz_id?.startsWith('itunes-')
                ? entry.musicbrainz_id.replace('itunes-', '')
                : null
              const detailPath = itunesId
                ? entry.entity_type === 'artist' ? `/artist/${itunesId}` : `/album/${itunesId}`
                : null

              const card = (
                <div className="bg-gray-900 border border-gray-800 hover:border-purple-700 rounded-lg overflow-hidden transition-colors group">
                  <ArtworkImage name={entry.name} artistName={entry.artist_name} className="w-full aspect-square" />
                  <div className="p-2">
                    <p className="text-xs font-medium text-white group-hover:text-purple-400 transition-colors line-clamp-1">
                      {entry.name}
                    </p>
                    <div className="mt-1 flex items-center justify-between">
                      <TagBadges tags={entry.tags} tag={entry.tag} />
                      <LikeButton itemType="entry" itemId={entry.id} liked={entry.liked} likeCount={entry.like_count} />
                    </div>
                  </div>
                </div>
              )

              return detailPath ? (
                <Link key={entry.id} to={detailPath}>{card}</Link>
              ) : (
                <div key={entry.id}>{card}</div>
              )
            })}
          </div>
        </div>
      )}

      {total === 0 && (
        <p className="text-gray-500 text-center py-4">No entries in this collection yet.</p>
      )}
    </div>
  )
}

function StatBox({ label, value, color, onClick, active }) {
  return (
    <button
      onClick={onClick}
      className={`bg-gray-800 rounded-lg p-4 text-center w-full transition-colors hover:bg-gray-750 ${active ? 'ring-2 ring-purple-500' : ''}`}
    >
      <p className={`text-3xl font-bold ${color}`}>{value}</p>
      <p className="text-xs text-gray-500 mt-1">{label}</p>
    </button>
  )
}
