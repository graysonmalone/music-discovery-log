import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  searchUsers, getFeed, followUser, unfollowUser, getFollowing,
  toggleLike, getComments, createComment, deleteComment,
} from '@/api/social'
import { ArtworkImage } from '@/components/ArtworkImage'
import { TagBadge } from '@/components/TagBadge'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/hooks/useAuth'

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function CommentSection({ entryId }) {
  const { user: currentUser } = useAuth()
  const queryClient = useQueryClient()
  const [text, setText] = useState('')

  const { data: comments = [], isLoading } = useQuery({
    queryKey: ['comments', entryId],
    queryFn: () => getComments(entryId),
  })

  const addMutation = useMutation({
    mutationFn: () => createComment(entryId, text),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', entryId] })
      queryClient.invalidateQueries({ queryKey: ['feed'] })
      setText('')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteComment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', entryId] })
      queryClient.invalidateQueries({ queryKey: ['feed'] })
    },
  })

  return (
    <div className="mt-3 pt-3 border-t border-gray-800">
      {isLoading && <p className="text-xs text-gray-600 px-1">Loading…</p>}

      {comments.length > 0 && (
        <div className="space-y-2 mb-3">
          {comments.map(c => (
            <div key={c.id} className="flex items-start gap-2 group">
              <Link to={`/users/${c.user_id}`} className="text-xs font-medium text-purple-400 hover:text-purple-300 shrink-0">
                {c.user_name}
              </Link>
              <p className="text-xs text-gray-300 flex-1">{c.content}</p>
              {currentUser && String(c.user_id) === String(currentUser.id) && (
                <button
                  onClick={() => deleteMutation.mutate(c.id)}
                  className="text-xs text-gray-700 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all shrink-0"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <form
        onSubmit={e => { e.preventDefault(); if (text.trim()) addMutation.mutate() }}
        className="flex gap-2"
      >
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Add a comment…"
          className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder:text-gray-600 outline-none focus:border-purple-600"
        />
        <button
          type="submit"
          disabled={!text.trim() || addMutation.isPending}
          className="text-xs bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg transition-colors"
        >
          Post
        </button>
      </form>
    </div>
  )
}

function FeedItem({ item }) {
  const queryClient = useQueryClient()
  const [showComments, setShowComments] = useState(false)
  const [liked, setLiked] = useState(item.liked)
  const [likeCount, setLikeCount] = useState(item.like_count)

  const itunesId = item.musicbrainz_id?.startsWith('itunes-')
    ? item.musicbrainz_id.replace('itunes-', '')
    : null
  const detailPath = itunesId
    ? item.entity_type === 'artist' ? `/artist/${itunesId}` : `/album/${itunesId}`
    : null

  const likeMutation = useMutation({
    mutationFn: () => toggleLike('entry', item.id),
    onSuccess: (data) => {
      setLiked(data.liked)
      setLikeCount(data.like_count)
    },
  })

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
      <div className="flex gap-4">
        <div className="w-14 h-14 rounded-lg overflow-hidden shrink-0">
          <ArtworkImage name={item.name} artistName={item.artist_name} className="w-full h-full" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Link to={`/users/${item.user_id}`} className="text-sm font-medium text-purple-400 hover:text-purple-300 transition-colors shrink-0">
              {item.user_name}
            </Link>
            <span className="text-xs text-gray-600">saved</span>
            <span className="text-xs text-gray-500 ml-auto shrink-0">{timeAgo(item.saved_at)}</span>
          </div>
          {detailPath ? (
            <Link to={detailPath} className="text-white font-medium hover:text-purple-400 transition-colors line-clamp-1 block">
              {item.name}
            </Link>
          ) : (
            <p className="text-white font-medium line-clamp-1">{item.name}</p>
          )}
          {item.artist_name && (
            <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{item.artist_name}</p>
          )}
          <div className="mt-1.5 flex items-center gap-3">
            <TagBadge tag={item.tag} />
            {item.take && (
              <p className="text-xs text-gray-500 italic line-clamp-1 flex-1">"{item.take}"</p>
            )}
          </div>

          {/* Like + comment actions */}
          <div className="flex items-center gap-4 mt-2">
            <button
              onClick={() => likeMutation.mutate()}
              disabled={likeMutation.isPending}
              className={`flex items-center gap-1.5 text-xs transition-colors ${
                liked ? 'text-pink-400' : 'text-gray-500 hover:text-pink-400'
              }`}
            >
              <svg className="w-4 h-4" fill={liked ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              {likeCount > 0 ? likeCount : 'Like'}
            </button>
            <button
              onClick={() => setShowComments(v => !v)}
              className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-white transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              {item.comment_count > 0 ? item.comment_count : 'Comment'}
            </button>
          </div>
        </div>
      </div>

      {showComments && <CommentSection entryId={item.id} />}
    </div>
  )
}

export function SocialPage() {
  const [tab, setTab] = useState('feed')
  const [searchQ, setSearchQ] = useState('')
  const [submittedQ, setSubmittedQ] = useState('')
  const queryClient = useQueryClient()

  const { data: feed = [], isLoading: feedLoading } = useQuery({
    queryKey: ['feed'],
    queryFn: getFeed,
    enabled: tab === 'feed',
  })

  const { data: following = [] } = useQuery({
    queryKey: ['following'],
    queryFn: getFollowing,
  })

  const { data: searchResults = [], isLoading: searchLoading } = useQuery({
    queryKey: ['userSearch', submittedQ],
    queryFn: () => searchUsers(submittedQ),
    enabled: submittedQ.length > 0,
  })

  const followingIds = new Set(following.map(u => u.id))

  const followMutation = useMutation({
    mutationFn: followUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['following'] })
      queryClient.invalidateQueries({ queryKey: ['feed'] })
    },
  })

  const unfollowMutation = useMutation({
    mutationFn: unfollowUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['following'] })
      queryClient.invalidateQueries({ queryKey: ['feed'] })
    },
  })

  function handleSearch(e) {
    e.preventDefault()
    setSubmittedQ(searchQ.trim())
  }

  function toggleFollow(userId) {
    if (followingIds.has(userId)) {
      unfollowMutation.mutate(userId)
    } else {
      followMutation.mutate(userId)
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 animate-fadein">
      <h1 className="text-2xl font-bold text-white mb-6">Social</h1>

      <div className="flex gap-2 mb-6">
        {[
          { id: 'feed', label: 'Friends Feed' },
          { id: 'find', label: 'Find People' },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`text-sm px-4 py-2 rounded-full transition-colors ${
              tab === t.id ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Find People */}
      {tab === 'find' && (
        <div>
          <form onSubmit={handleSearch} className="flex gap-2 mb-6">
            <Input
              type="text"
              placeholder="Search by name…"
              value={searchQ}
              onChange={e => setSearchQ(e.target.value)}
              className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 flex-1"
              autoFocus
            />
            <button
              type="submit"
              className="bg-purple-600 hover:bg-purple-700 text-white text-sm px-4 py-2 rounded-lg transition-colors"
            >
              Search
            </button>
          </form>

          {searchLoading && (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="bg-gray-900 border border-gray-800 rounded-xl p-4 animate-pulse h-16" />
              ))}
            </div>
          )}

          {!searchLoading && submittedQ && searchResults.length === 0 && (
            <p className="text-gray-500 text-center py-8">No users found for "{submittedQ}".</p>
          )}

          <div className="space-y-3">
            {searchResults.map(user => {
              const isFollowing = followingIds.has(user.id)
              return (
                <div key={user.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-center justify-between">
                  <div>
                    <Link to={`/users/${user.id}`} className="font-medium text-white hover:text-purple-400 transition-colors">
                      {user.name}
                    </Link>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Joined {new Date(user.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}
                    </p>
                  </div>
                  <button
                    onClick={() => toggleFollow(user.id)}
                    disabled={followMutation.isPending || unfollowMutation.isPending}
                    className={`text-sm px-4 py-1.5 rounded-lg transition-colors ${
                      isFollowing
                        ? 'bg-gray-700 hover:bg-red-900/40 text-gray-300 hover:text-red-400 border border-gray-600'
                        : 'bg-purple-600 hover:bg-purple-700 text-white'
                    }`}
                  >
                    {isFollowing ? 'Following' : '+ Follow'}
                  </button>
                </div>
              )
            })}
          </div>

          {following.length > 0 && submittedQ === '' && (
            <div className="mt-8">
              <h2 className="text-white font-semibold mb-3">People you follow</h2>
              <div className="space-y-3">
                {following.map(user => (
                  <div key={user.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-center justify-between">
                    <Link to={`/users/${user.id}`} className="font-medium text-white hover:text-purple-400 transition-colors">
                      {user.name}
                    </Link>
                    <button
                      onClick={() => unfollowMutation.mutate(user.id)}
                      disabled={unfollowMutation.isPending}
                      className="text-sm px-4 py-1.5 rounded-lg bg-gray-700 hover:bg-red-900/40 text-gray-300 hover:text-red-400 border border-gray-600 transition-colors"
                    >
                      Following
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Friends Feed */}
      {tab === 'feed' && (
        <div>
          {feedLoading && (
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="bg-gray-900 border border-gray-800 rounded-xl p-4 animate-pulse flex gap-4">
                  <div className="w-14 h-14 bg-gray-800 rounded-lg shrink-0" />
                  <div className="flex-1 space-y-2 pt-1">
                    <div className="h-3 bg-gray-800 rounded w-1/3" />
                    <div className="h-4 bg-gray-800 rounded w-2/3" />
                    <div className="h-3 bg-gray-800 rounded w-1/4" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {!feedLoading && following.length === 0 && (
            <div className="bg-gray-900 border border-dashed border-gray-700 rounded-xl p-10 text-center">
              <p className="text-gray-400 font-medium mb-2">No one in your feed yet</p>
              <p className="text-gray-500 text-sm mb-4">Follow people to see their recently saved music here.</p>
              <button
                onClick={() => setTab('find')}
                className="bg-purple-600 hover:bg-purple-700 text-white text-sm px-4 py-2 rounded-lg transition-colors"
              >
                Find people to follow
              </button>
            </div>
          )}

          {!feedLoading && following.length > 0 && feed.length === 0 && (
            <p className="text-gray-500 text-center py-8">The people you follow haven't saved anything yet.</p>
          )}

          <div className="space-y-4">
            {feed.map(item => <FeedItem key={item.id} item={item} />)}
          </div>
        </div>
      )}
    </div>
  )
}
