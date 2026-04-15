import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getEntry, updateEntry, deleteEntry } from '@/api/collection'
import { TagBadge } from '@/components/TagBadge'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { ErrorMessage } from '@/components/ErrorMessage'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export function CollectionDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [editing, setEditing] = useState(false)
  const [tag, setTag] = useState('')
  const [take, setTake] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState(false)

  const { data: entry, isLoading, error } = useQuery({
    queryKey: ['entry', id],
    queryFn: () => getEntry(id),
    onSuccess: (data) => {
      setTag(data.tag)
      setTake(data.take ?? '')
    },
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
    setTag(entry.tag)
    setTake(entry.take ?? '')
    setEditing(true)
  }

  function handleSave() {
    updateMutation.mutate({ tag, take: take || null })
  }

  if (isLoading) return <LoadingSpinner />
  if (error) return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <ErrorMessage message="Entry not found." />
    </div>
  )

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <button
        onClick={() => navigate('/collection')}
        className="text-sm text-gray-500 hover:text-gray-300 mb-6 flex items-center gap-1"
      >
        ← Back to collection
      </button>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">{entry.name}</h1>
            {entry.artist_name && (
              <p className="text-gray-400 mt-1">{entry.artist_name}</p>
            )}
          </div>
          <TagBadge tag={entry.tag} />
        </div>

        <p className="text-xs text-gray-500 capitalize">{entry.entity_type}</p>

        {!editing && (
          <div className="pt-2">
            {entry.take ? (
              <p className="text-gray-300 leading-relaxed">{entry.take}</p>
            ) : (
              <p className="text-gray-600 italic">No personal take written yet.</p>
            )}
          </div>
        )}

        {editing && (
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-gray-300">Tag</Label>
              <Select value={tag} onValueChange={setTag}>
                <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  <SelectItem value="loved" className="text-white">Loved</SelectItem>
                  <SelectItem value="want_to_listen" className="text-white">Want to Listen</SelectItem>
                  <SelectItem value="overrated" className="text-white">Overrated</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-gray-300">Personal take</Label>
              <Textarea
                value={take}
                onChange={(e) => setTake(e.target.value)}
                placeholder="Write your thoughts…"
                rows={4}
                className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
              />
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleSave}
                disabled={updateMutation.isPending}
                className="bg-purple-600 hover:bg-purple-700"
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

            {updateMutation.isError && (
              <ErrorMessage message="Failed to save changes." />
            )}
          </div>
        )}

        {!editing && (
          <div className="flex gap-2 pt-4 border-t border-gray-800">
            <Button
              size="sm"
              variant="outline"
              onClick={startEdit}
              className="border-gray-700 text-gray-300 hover:text-white"
            >
              Edit
            </Button>

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
                <span className="text-sm text-red-400">Are you sure?</span>
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
        )}
      </div>
    </div>
  )
}
