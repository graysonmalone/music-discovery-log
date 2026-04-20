import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getPublicProfile, followUser, unfollowUser, getFollowing } from '@/api/social'
import { ArtworkImage } from '@/components/ArtworkImage'
import { TagBadge } from '@/components/TagBadge'
import { ErrorMessage } from '@/components/ErrorMessage'
import { useAuth } from '@/hooks/useAuth'

function ProfileSkeleton() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6 animate-pulse">
      <div className="h-7 w-40 bg-gray-800 rounded" />
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-3">
        <div className="h-4 w-24 bg-gray-800 rounded" />
        <div className="h-6 w-48 bg-gray-800 rounded" />
        <div className="h-3 w-32 bg-gray-800 rounded" />
      </div>
      <div className="grid grid-cols-3 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-gray-900 rounded-lg aspect-square bg-gray-800" />
        ))}
      </div>
    </div>
  )
}

export function PublicProfilePage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user: currentUser } = useAuth()
  const queryClient = useQueryClient()

  // If viewing your own profile, redirect
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

  if (isLoading) return <ProfileSkeleton />
  if (error) return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <ErrorMessage message="User not found." />
    </div>
  )

  const { user, counts, recent } = profile
  const total = counts.loved + counts.want_to_listen + counts.overrated

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6 animate-fadein">
      <button
        onClick={() => navigate(-1)}
        className="text-sm text-gray-500 hover:text-gray-300 flex items-center gap-1.5 transition-colors"
      >
        ← Back
      </button>

      {/* User info + follow button */}
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

function StatBox({ label, value, color }) {
  return (
    <div className="bg-gray-800 rounded-lg p-4 text-center">
      <p className={`text-3xl font-bold ${color}`}>{value}</p>
      <p className="text-xs text-gray-500 mt-1">{label}</p>
    </div>
  )
}
