import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { itunesIdFromEntry } from '@/api/itunes'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getEntry, updateEntry, deleteEntry } from '@/api/collection'
import { ArtworkImage } from '@/components/ArtworkImage'
import { TagBadges } from '@/components/TagBadge'
import { ErrorMessage } from '@/components/ErrorMessage'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useTop3 } from '@/context/Top3Context'
import { TagCheckboxes } from '@/components/TagBadge'

function DetailSkeleton() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8 animate-pulse">
      <div className="h-4 w-32 bg-gray-800 rounded mb-8" />
      <div className="flex flex-col sm:flex-row gap-8">
        <div className="w-full sm:w-72 aspect-square bg-gray-800 rounded-xl shrink-0" />
        <div className="flex-1 space-y-4 pt-2">
          <div className="h-7 bg-gray-800 rounded w-3/4" />
          <div className="h-4 bg-gray-800 rounded w-1/2" />
          <div className="h-5 w-24 bg-gray-800 rounded-full" />
          <div className="h-24 bg-gray-800 rounded mt-6" />
        </div>
      </div>
    </div>
  )
}

export function CollectionDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { isInTop3, add: addToTop3, remove: removeFromTop3 } = useTop3()

  const [editing, setEditing] = useState(false)
  const [tags, setTags] = useState([])
  const [take, setTake] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState(false)

  const { data: entry, isLoading, error } = useQuery({
    queryKey: ['entry', id],
    queryFn: () => getEntry(id),
  })

  const updateMutation = useMutation({
    mutationFn: (updates) => updateEntry(id, updates),
    onSuccess: (updated) => {
      queryClient.setQueryData(['entry', id], updated)
      queryClient.invalidateQueries({ queryKey: ['collection'] })
      setEditing(false)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: () => deleteEntry(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collection'] })
      navigate('/collection', { replace: true })
    },
  })

  function startEdit() {
    setTags(entry.tags?.length ? entry.tags : [entry.tag])
    setTake(entry.take ?? '')
    setEditing(true)
  }

  function handleSave() {
    updateMutation.mutate({ tags, take: take || null })
  }

  if (isLoading) return <DetailSkeleton />

  if (error) return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <ErrorMessage message="Entry not found." />
    </div>
  )

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 animate-fadein">
      <button
        onClick={() => navigate('/collection')}
        className="text-sm text-gray-500 hover:text-gray-300 mb-8 flex items-center gap-1.5 transition-colors"
      >
        ← Back to collection
      </button>

      <div className="flex flex-col sm:flex-row gap-8">
        {/* Artwork */}
        <div className="w-full sm:w-72 shrink-0">
          <div className="rounded-xl overflow-hidden shadow-2xl shadow-black/50">
            <ArtworkImage
              name={entry.name}
              artistName={entry.artist_name}
              className="w-full aspect-square"
            />
          </div>
        </div>

        {/* Details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-3 mb-1">
            <h1 className="text-3xl font-bold text-white leading-tight flex-1">{entry.name}</h1>
          </div>

          {entry.artist_name && (
            <p className="text-lg text-gray-400 mb-3">{entry.artist_name}</p>
          )}

          <div className="flex items-center gap-2 mb-6 flex-wrap">
            <TagBadges tags={entry.tags} tag={entry.tag} />
            <span className="text-xs text-gray-600 capitalize">{entry.entity_type}</span>
          </div>

          {/* Take / Edit form */}
          {!editing ? (
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Your take</p>
              {entry.take ? (
                <p className="text-gray-300 leading-relaxed">{entry.take}</p>
              ) : (
                <p className="text-gray-600 italic">No take written yet.</p>
              )}

              <div className="flex gap-2 mt-8 flex-wrap">
                <Button
                  size="sm"
                  onClick={startEdit}
                  className="bg-purple-600 hover:bg-purple-700 text-white"
                >
                  Edit
                </Button>

                {(() => {
                  const itunesId = itunesIdFromEntry(entry)
                  if (!itunesId) return null
                  const inTop3 = isInTop3(itunesId)
                  return (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => inTop3
                        ? removeFromTop3(itunesId)
                        : addToTop3({
                            id: itunesId,
                            entityType: entry.entity_type === 'release' ? 'album' : entry.entity_type,
                            name: entry.name,
                            artworkUrl: null,
                            artistName: entry.artist_name,
                          })
                      }
                      className={inTop3
                        ? 'text-yellow-400 hover:text-yellow-300 hover:bg-yellow-950/30'
                        : 'text-gray-400 hover:text-yellow-400 hover:bg-yellow-950/30'
                      }
                    >
                      {inTop3 ? '★ In Top 3' : '☆ Add to Top 3'}
                    </Button>
                  )
                })()}

                {!deleteConfirm ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setDeleteConfirm(true)}
                    className="text-red-500 hover:text-red-400 hover:bg-red-950/30"
                  >
                    Delete
                  </Button>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-red-400">Delete this entry?</span>
                    <Button
                      size="sm"
                      onClick={() => deleteMutation.mutate()}
                      disabled={deleteMutation.isPending}
                      className="bg-red-700 hover:bg-red-600 text-white"
                    >
                      {deleteMutation.isPending ? 'Deleting…' : 'Yes, delete'}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setDeleteConfirm(false)}
                      className="text-gray-400 hover:text-white"
                    >
                      Cancel
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-gray-300">Tags</Label>
                <TagCheckboxes selected={tags} onChange={setTags} />
              </div>

              <div className="space-y-1.5">
                <Label className="text-gray-300">Personal take</Label>
                <Textarea
                  value={take}
                  onChange={(e) => setTake(e.target.value)}
                  placeholder="Write your thoughts…"
                  rows={5}
                  className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
                />
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleSave}
                  disabled={updateMutation.isPending}
                  className="bg-purple-600 hover:bg-purple-700 text-white"
                >
                  {updateMutation.isPending ? 'Saving…' : 'Save'}
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setEditing(false)}
                  className="text-gray-400 hover:text-white"
                >
                  Cancel
                </Button>
              </div>

              {updateMutation.isError && <ErrorMessage message="Failed to save changes." />}
            </div>
          )}

          {/* Link to iTunes profile if we have the ID */}
          {(() => {
            const itunesId = itunesIdFromEntry(entry)
            if (!itunesId) return null
            const path = entry.entity_type === 'artist' ? `/artist/${itunesId}` : `/album/${itunesId}`
            const label = entry.entity_type === 'artist' ? 'Browse discography →' : 'View full album →'
            return (
              <Link to={path} className="inline-block mt-4 text-sm text-purple-400 hover:text-purple-300 transition-colors">
                {label}
              </Link>
            )
          })()}

          <p className="text-xs text-gray-700 mt-4">
            Saved {new Date(entry.saved_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
      </div>
    </div>
  )
}
