import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { search } from '@/api/search'
import { createEntry } from '@/api/collection'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { ErrorMessage } from '@/components/ErrorMessage'

function getResults(data, type) {
  if (!data) return []
  if (type === 'artist') return data.artists ?? []
  if (type === 'release') return data.releases ?? []
  return []
}

function getArtistName(result, type) {
  if (type === 'release') {
    return result['artist-credit']?.map((c) => c.name || c.artist?.name).join(', ') || null
  }
  return null
}

export function SearchPage() {
  const queryClient = useQueryClient()

  const [q, setQ] = useState('')
  const [type, setType] = useState('artist')
  const [submittedQ, setSubmittedQ] = useState('')
  const [submittedType, setSubmittedType] = useState('artist')
  const [searched, setSearched] = useState(false)

  // Save form state: which result is being saved
  const [savingId, setSavingId] = useState(null)
  const [saveTag, setSaveTag] = useState('loved')
  const [saveTake, setSaveTake] = useState('')
  const [savedIds, setSavedIds] = useState(new Set())

  const { data, isLoading, error } = useQuery({
    queryKey: ['search', submittedQ, submittedType],
    queryFn: () => search(submittedQ, submittedType),
    enabled: searched && submittedQ !== '',
  })

  const saveMutation = useMutation({
    mutationFn: (entry) => createEntry(entry),
    onSuccess: (_, variables) => {
      setSavedIds((prev) => new Set(prev).add(variables.musicbrainz_id))
      setSavingId(null)
      setSaveTake('')
      setSaveTag('loved')
      queryClient.invalidateQueries({ queryKey: ['collection'] })
    },
  })

  function handleSearch(e) {
    e.preventDefault()
    if (!q.trim()) return
    setSubmittedQ(q.trim())
    setSubmittedType(type)
    setSearched(true)
    setSavingId(null)
  }

  function handleSave(result) {
    const artistName = getArtistName(result, submittedType)
    saveMutation.mutate({
      musicbrainz_id: result.id,
      entity_type: submittedType,
      name: submittedType === 'release' ? result.title : result.name,
      artist_name: artistName,
      tag: saveTag,
      take: saveTake || null,
    })
  }

  const results = getResults(data, submittedType)

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-white mb-6">Search</h1>

      <form onSubmit={handleSearch} className="flex gap-2 mb-8">
        <Input
          type="text"
          placeholder="Artist or album name…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 flex-1"
        />
        <Select value={type} onValueChange={setType}>
          <SelectTrigger className="bg-gray-800 border-gray-700 text-white w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-gray-800 border-gray-700">
            <SelectItem value="artist" className="text-white">Artist</SelectItem>
            <SelectItem value="release" className="text-white">Album</SelectItem>
          </SelectContent>
        </Select>
        <Button type="submit" className="bg-purple-600 hover:bg-purple-700">
          Search
        </Button>
      </form>

      {isLoading && <LoadingSpinner />}

      {error && <ErrorMessage message="Search failed. Please try again." />}

      {searched && !isLoading && results.length === 0 && (
        <p className="text-gray-500 text-center py-8">No results found.</p>
      )}

      <div className="space-y-3">
        {results.map((result) => {
          const mbId = result.id
          const name = submittedType === 'release' ? result.title : result.name
          const artistName = getArtistName(result, submittedType)
          const isSaved = savedIds.has(mbId)
          const isSavingThis = savingId === mbId

          return (
            <Card key={mbId} className="bg-gray-900 border-gray-800">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <CardTitle className="text-base text-white">{name}</CardTitle>
                    {artistName && (
                      <p className="text-sm text-gray-400 mt-0.5">{artistName}</p>
                    )}
                  </div>
                  {isSaved ? (
                    <span className="text-xs text-green-400 shrink-0 pt-1">Saved</span>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSavingId(mbId)
                        setSaveTag('loved')
                        setSaveTake('')
                      }}
                      className="border-gray-700 text-gray-300 hover:text-white shrink-0"
                    >
                      Save
                    </Button>
                  )}
                </div>
              </CardHeader>

              {isSavingThis && (
                <CardContent className="pt-0 space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-gray-300 text-sm">Tag</Label>
                    <Select value={saveTag} onValueChange={setSaveTag}>
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
                    <Label className="text-gray-300 text-sm">Personal take (optional)</Label>
                    <Textarea
                      value={saveTake}
                      onChange={(e) => setSaveTake(e.target.value)}
                      placeholder="What do you think of this?"
                      rows={2}
                      className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleSave(result)}
                      disabled={saveMutation.isPending}
                      className="bg-purple-600 hover:bg-purple-700"
                    >
                      {saveMutation.isPending ? 'Saving…' : 'Confirm save'}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setSavingId(null)}
                      className="text-gray-400 hover:text-white"
                    >
                      Cancel
                    </Button>
                  </div>

                  {saveMutation.isError && (
                    <ErrorMessage message="Failed to save. Please try again." />
                  )}
                </CardContent>
              )}
            </Card>
          )
        })}
      </div>
    </div>
  )
}
