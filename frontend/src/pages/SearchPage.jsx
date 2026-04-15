import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { search } from '@/api/search'
import { createEntry } from '@/api/collection'
import { coverArtUrl } from '@/lib/coverArt'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
  const [searchParams] = useSearchParams()
  const queryClient = useQueryClient()

  const [q, setQ] = useState(searchParams.get('q') || '')
  const [type, setType] = useState(searchParams.get('type') || 'artist')
  const [submittedQ, setSubmittedQ] = useState(searchParams.get('q') || '')
  const [submittedType, setSubmittedType] = useState(searchParams.get('type') || 'artist')
  const [searched, setSearched] = useState(!!searchParams.get('q'))

  const [savingId, setSavingId] = useState(null)
  const [saveTag, setSaveTag] = useState('loved')
  const [saveTake, setSaveTake] = useState('')
  const [savedIds, setSavedIds] = useState(new Set())

  useEffect(() => {
    const paramQ = searchParams.get('q')
    const paramType = searchParams.get('type') || 'artist'
    if (paramQ) {
      setQ(paramQ)
      setType(paramType)
      setSubmittedQ(paramQ)
      setSubmittedType(paramType)
      setSearched(true)
    }
  }, [searchParams])

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
        <Button type="submit" className="bg-purple-600 hover:bg-purple-700 text-white">
          Search
        </Button>
      </form>

      {isLoading && <LoadingSpinner />}
      {error && <ErrorMessage message="Search failed. Please try again." />}
      {searched && !isLoading && results.length === 0 && (
        <p className="text-gray-500 text-center py-8">No results found.</p>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {results.map((result) => {
          const mbId = result.id
          const name = submittedType === 'release' ? result.title : result.name
          const artistName = getArtistName(result, submittedType)
          const isSaved = savedIds.has(mbId)
          const isSavingThis = savingId === mbId

          return (
            <div key={mbId} className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden flex flex-col">
              {/* Cover art */}
              <div className="aspect-square bg-gray-800 overflow-hidden">
                {submittedType === 'release' ? (
                  <img
                    src={coverArtUrl(mbId)}
                    alt={name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none'
                      e.currentTarget.parentElement.classList.add('flex', 'items-center', 'justify-center')
                      e.currentTarget.parentElement.innerHTML =
                        '<svg class="w-10 h-10 text-gray-600" fill="currentColor" viewBox="0 0 24 24"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>'
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <svg className="w-10 h-10 text-gray-600" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                    </svg>
                  </div>
                )}
              </div>

              <div className="p-3 flex flex-col flex-1">
                <p className="text-sm font-medium text-white line-clamp-1">{name}</p>
                {artistName && <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{artistName}</p>}

                {!isSavingThis && (
                  <div className="mt-auto pt-2">
                    {isSaved ? (
                      <span className="text-xs text-green-400">Saved ✓</span>
                    ) : (
                      <button
                        onClick={() => { setSavingId(mbId); setSaveTag('loved'); setSaveTake('') }}
                        className="text-xs text-purple-400 hover:text-purple-300 transition-colors"
                      >
                        + Save to collection
                      </button>
                    )}
                  </div>
                )}

                {isSavingThis && (
                  <div className="mt-2 space-y-2">
                    <Select value={saveTag} onValueChange={setSaveTag}>
                      <SelectTrigger className="bg-gray-800 border-gray-700 text-white text-xs h-7">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-800 border-gray-700">
                        <SelectItem value="loved" className="text-white text-xs">Loved</SelectItem>
                        <SelectItem value="want_to_listen" className="text-white text-xs">Want to Listen</SelectItem>
                        <SelectItem value="overrated" className="text-white text-xs">Overrated</SelectItem>
                      </SelectContent>
                    </Select>
                    <Textarea
                      value={saveTake}
                      onChange={(e) => setSaveTake(e.target.value)}
                      placeholder="Your take… (optional)"
                      rows={2}
                      className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 text-xs"
                    />
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        onClick={() => handleSave(result)}
                        disabled={saveMutation.isPending}
                        className="bg-purple-600 hover:bg-purple-700 text-white text-xs h-7"
                      >
                        {saveMutation.isPending ? 'Saving…' : 'Save'}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setSavingId(null)}
                        className="text-gray-400 hover:text-white text-xs h-7"
                      >
                        Cancel
                      </Button>
                    </div>
                    {saveMutation.isError && <ErrorMessage message="Failed to save." />}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
