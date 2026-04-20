import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { getProfile, updateName } from '@/api/profile'
import { getCollection } from '@/api/collection'
import { getFollowing, getFollowers } from '@/api/social'
import { ArtworkImage } from '@/components/ArtworkImage'
import { TagBadges } from '@/components/TagBadge'
import { ErrorMessage } from '@/components/ErrorMessage'
import { useTop3 } from '@/context/Top3Context'

function ProfileSkeleton() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6 animate-pulse">
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 bg-gray-800 rounded-full shrink-0" />
          <div className="space-y-2">
            <div className="h-5 w-36 bg-gray-800 rounded" />
            <div className="h-3 w-24 bg-gray-800 rounded" />
          </div>
        </div>
        {[1, 2].map((i) => (
          <div key={i} className="flex items-center gap-3 py-3 border-t border-gray-800">
            <div className="w-4 h-4 bg-gray-800 rounded" />
            <div className="h-3 w-48 bg-gray-800 rounded" />
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

// SVG icons
function IconUser() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
    </svg>
  )
}

function IconMail() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
    </svg>
  )
}

function IconCalendar() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
    </svg>
  )
}

function IconPencil() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
    </svg>
  )
}

function IconCheck() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  )
}

function IconX() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  )
}

export function ProfilePage() {
  const { top3, remove: removeFromTop3 } = useTop3()
  const [socialPanel, setSocialPanel] = useState(null)
  const [tagFilter, setTagFilter] = useState(null)
  const [editingName, setEditingName] = useState(false)
  const [nameInput, setNameInput] = useState('')
  const queryClient = useQueryClient()

  const { data: profile, isLoading: profileLoading, error: profileError } = useQuery({
    queryKey: ['profile'],
    queryFn: getProfile,
  })

  const { data: allEntries } = useQuery({
    queryKey: ['collection', ''],
    queryFn: () => getCollection(''),
  })

  const { data: following = [] } = useQuery({
    queryKey: ['following'],
    queryFn: getFollowing,
  })

  const { data: followers = [] } = useQuery({
    queryKey: ['followers'],
    queryFn: getFollowers,
  })

  const updateNameMutation = useMutation({
    mutationFn: updateName,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] })
      setEditingName(false)
    },
  })

  function startEditing(currentName) {
    setNameInput(currentName)
    setEditingName(true)
  }

  function cancelEditing() {
    setEditingName(false)
    setNameInput('')
  }

  function submitName() {
    const trimmed = nameInput.trim()
    if (!trimmed || trimmed === profile?.user?.name) {
      cancelEditing()
      return
    }
    updateNameMutation.mutate(trimmed)
  }

  if (profileLoading) return <ProfileSkeleton />
  if (profileError) return (
    <div className="max-w-xl mx-auto px-4 py-8">
      <ErrorMessage message="Failed to load profile." />
    </div>
  )

  const { user, counts } = profile
  const total = counts.loved + counts.want_to_listen + counts.overrated + (counts.put_on ?? 0)
  const recent = allEntries ? [...allEntries].slice(0, 6) : []
  const initials = user.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  const joinDate = new Date(user.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6 animate-fadein">

      {/* User info card */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        {/* Header band */}
        <div className="h-16 bg-gradient-to-r from-purple-900/60 to-gray-900" />

        {/* Avatar + name row */}
        <div className="px-6 pb-5">
          <div className="flex items-end gap-4 -mt-8 mb-4">
            <div className="w-16 h-16 rounded-full bg-purple-700 border-4 border-gray-900 flex items-center justify-center shrink-0">
              <span className="text-xl font-bold text-white">{initials}</span>
            </div>
            <div className="pb-1 flex-1 min-w-0">
              {editingName ? (
                <div className="flex items-center gap-2">
                  <input
                    autoFocus
                    value={nameInput}
                    onChange={e => setNameInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') submitName(); if (e.key === 'Escape') cancelEditing() }}
                    className="bg-gray-800 border border-purple-600 rounded-lg px-2 py-1 text-white text-sm flex-1 min-w-0 outline-none"
                    maxLength={100}
                  />
                  <button
                    onClick={submitName}
                    disabled={updateNameMutation.isPending}
                    className="p-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                    title="Save"
                  >
                    <IconCheck />
                  </button>
                  <button
                    onClick={cancelEditing}
                    className="p-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg transition-colors"
                    title="Cancel"
                  >
                    <IconX />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <p className="text-lg font-bold text-white truncate">{user.name}</p>
                  <button
                    onClick={() => startEditing(user.name)}
                    className="p-1 text-gray-600 hover:text-purple-400 transition-colors shrink-0"
                    title="Edit name"
                  >
                    <IconPencil />
                  </button>
                </div>
              )}
              {updateNameMutation.isError && (
                <p className="text-xs text-red-400 mt-1">Failed to update name.</p>
              )}
            </div>
          </div>

          {/* Info rows */}
          <div className="space-y-2.5">
            <div className="flex items-center gap-3 text-sm">
              <span className="text-purple-400 shrink-0"><IconMail /></span>
              <span className="text-gray-300">{user.email}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <span className="text-purple-400 shrink-0"><IconCalendar /></span>
              <span className="text-gray-400">Joined {joinDate}</span>
            </div>
          </div>

          {/* Following / Followers */}
          <div className="flex gap-5 mt-4 pt-4 border-t border-gray-800">
            <button
              onClick={() => setSocialPanel(p => p === 'following' ? null : 'following')}
              className="text-sm text-gray-400 hover:text-white transition-colors"
            >
              <span className="font-semibold text-white">{following.length}</span> Following
            </button>
            <button
              onClick={() => setSocialPanel(p => p === 'followers' ? null : 'followers')}
              className="text-sm text-gray-400 hover:text-white transition-colors"
            >
              <span className="font-semibold text-white">{followers.length}</span> {followers.length === 1 ? 'Follower' : 'Followers'}
            </button>
          </div>
        </div>
      </div>

      {/* Following/followers panel */}
      {socialPanel && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
            <p className="text-sm font-semibold text-white capitalize">{socialPanel}</p>
            <button onClick={() => setSocialPanel(null)} className="text-gray-500 hover:text-white text-xs">Close</button>
          </div>
          {(socialPanel === 'following' ? following : followers).length === 0 ? (
            <p className="text-gray-500 text-sm px-4 py-6 text-center">
              {socialPanel === 'following' ? "You're not following anyone yet." : "No followers yet."}
            </p>
          ) : (
            <div className="divide-y divide-gray-800">
              {(socialPanel === 'following' ? following : followers).map(u => (
                <Link
                  key={u.id}
                  to={`/users/${u.id}`}
                  className="flex items-center px-4 py-3 hover:bg-gray-800/50 transition-colors"
                >
                  <span className="text-sm text-white hover:text-purple-400 transition-colors">{u.name}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Collection stats */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <h2 className="text-white font-semibold mb-1">Collection</h2>
        <p className="text-xs text-gray-500 mb-4">Click any tag to browse those entries</p>
        <div className="grid grid-cols-2 gap-3">
          <StatBox label="Total saved" value={total} color="text-white" accent="hover:border-gray-600" onClick={() => setTagFilter(tagFilter === 'all' ? null : 'all')} active={tagFilter === 'all'} />
          <StatBox label="Loved" value={counts.loved} color="text-pink-400" accent="hover:border-pink-700" onClick={() => setTagFilter(tagFilter === 'loved' ? null : 'loved')} active={tagFilter === 'loved'} />
          <StatBox label="Want to Listen" value={counts.want_to_listen} color="text-blue-400" accent="hover:border-blue-700" onClick={() => setTagFilter(tagFilter === 'want_to_listen' ? null : 'want_to_listen')} active={tagFilter === 'want_to_listen'} />
          <StatBox label="Overrated" value={counts.overrated} color="text-amber-400" accent="hover:border-amber-700" onClick={() => setTagFilter(tagFilter === 'overrated' ? null : 'overrated')} active={tagFilter === 'overrated'} />
          <StatBox label="Put On" value={counts.put_on ?? 0} color="text-teal-400" accent="hover:border-teal-700" onClick={() => setTagFilter(tagFilter === 'put_on' ? null : 'put_on')} active={tagFilter === 'put_on'} />
        </div>
      </div>

      {/* Tag-filtered entries panel */}
      {tagFilter && (
        <TaggedEntriesPanel
          entries={allEntries ?? []}
          tag={tagFilter === 'all' ? null : tagFilter}
          label={tagFilter === 'all' ? 'All entries' : { loved: 'Loved', want_to_listen: 'Want to Listen', overrated: 'Overrated', put_on: 'Put On' }[tagFilter]}
          onClose={() => setTagFilter(null)}
        />
      )}

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
              const path = item.entity_type === 'artist' ? `/artist/${item.itunes_id}` : `/album/${item.itunes_id}`
              return (
                <div key={item.itunes_id} className="bg-gray-900 border border-yellow-600/40 rounded-lg overflow-hidden group relative">
                  <Link to={path}>
                    {item.artwork_url ? (
                      <img src={item.artwork_url} alt={item.name} className="w-full aspect-square object-cover group-hover:opacity-90 transition-opacity" />
                    ) : (
                      <ArtworkImage name={item.name} artistName={item.artist_name} className="w-full aspect-square" />
                    )}
                  </Link>
                  <div className="p-2">
                    <p className="text-xs font-medium text-white line-clamp-1">{item.name}</p>
                    {item.artist_name && <p className="text-xs text-gray-500 line-clamp-1">{item.artist_name}</p>}
                    <div className="flex items-center justify-between mt-0.5">
                      <span className="text-xs text-yellow-500">{item.entity_type === 'artist' ? 'Artist' : 'Album'}</span>
                      {item.like_count > 0 && (
                        <span className="text-xs text-gray-500">♥ {item.like_count}</span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => removeFromTop3(item.itunes_id)}
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
                    <TagBadges tags={entry.tags} tag={entry.tag} />
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

function StatBox({ label, value, color, accent, onClick, active }) {
  return (
    <button
      onClick={onClick}
      className={`
        bg-gray-800 border rounded-xl p-4 text-center w-full
        transition-all duration-200
        hover:scale-[1.03] hover:shadow-lg hover:bg-gray-750
        active:scale-[0.98]
        ${active
          ? 'border-purple-500 ring-1 ring-purple-500/50 shadow-purple-900/30 shadow-md'
          : `border-gray-700 ${accent}`
        }
      `}
    >
      <p className={`text-3xl font-bold ${color}`}>{value}</p>
      <p className="text-xs text-gray-400 mt-1">{label}</p>
      <p className="text-xs text-gray-600 mt-0.5">{active ? 'Click to close ↑' : 'Click to view →'}</p>
    </button>
  )
}

function TaggedEntriesPanel({ entries, tag, label, onClose }) {
  const filtered = tag ? entries.filter(e => (e.tags ?? [e.tag]).includes(tag)) : entries
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
        <p className="text-sm font-semibold text-white">{label}</p>
        <button onClick={onClose} className="text-gray-500 hover:text-white text-xs">Close</button>
      </div>
      {filtered.length === 0 ? (
        <p className="text-gray-500 text-sm px-4 py-6 text-center">No entries here yet.</p>
      ) : (
        <div className="divide-y divide-gray-800 max-h-80 overflow-y-auto">
          {filtered.map(entry => (
            <Link
              key={entry.id}
              to={`/collection/${entry.id}`}
              className="flex items-center gap-3 px-4 py-3 hover:bg-gray-800/50 transition-colors"
            >
              <ArtworkImage name={entry.name} artistName={entry.artist_name} className="w-10 h-10 rounded shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white truncate">{entry.name}</p>
                {entry.artist_name && <p className="text-xs text-gray-500 truncate">{entry.artist_name}</p>}
              </div>
              <TagBadges tags={entry.tags} tag={entry.tag} />
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
