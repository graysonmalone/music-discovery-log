import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { searchItunes } from '@/api/itunes'
import { createEntry } from '@/api/collection'
import { ArtworkImage } from '@/components/ArtworkImage'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ErrorMessage } from '@/components/ErrorMessage'

const TYPES = [
  { value: 'all', label: 'All' },
  { value: 'artist', label: 'Artists' },
  { value: 'album', label: 'Albums' },
  { value: 'song', label: 'Songs' },
]

function SearchSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden animate-pulse">
          <div className="w-full aspect-square bg-gray-800" />
          <div className="p-3 space-y-2">
            <div className="h-3 bg-gray-800 rounded w-3/4" />
            <div className="h-2 bg-gray-800 rounded w-1/2" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function SearchPage() {
  const [searchParams] = useSearchParams()
  const queryClient = useQueryClient()

  const [q, setQ] = useState(searchParams.get('q') || '')
  const [type, setType] = useState('all')
  const [submittedQ, setSubmittedQ] = useState(searchParams.get('q') || '')
  const [submittedType, setSubmittedType] = useState('all')
  const [searched, setSearched] = useState(!!searchParams.get('q'))

  const [savingId, setSavingId] = useState(null)
  const [saveTag, setSaveTag] = useState('loved')
  const [saveTake, setSaveTake] = useState('')
  const [savedIds, setSavedIds] = useState(new Set())

  useEffect(() => {
    const paramQ = searchParams.get('q')
    if (paramQ) {
      setQ(paramQ)
      setSubmittedQ(paramQ)
      setSearched(true)
    }
  }, [searchParams])

  const { data: results = [], isLoading, error } = useQuery({
    queryKey: ['search', submittedQ, submittedType],
    queryFn: () => searchItunes(submittedQ, submittedType),
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
    saveMutation.mutate({
      musicbrainz_id: `itunes-${result.id}`,
      entity_type: result.entityType,
      name: result.isSong ? `${result.name} (${result.albumName ?? 'Single'})` : result.name,
      artist_name: result.artistName,
      tag: saveTag,
      take: saveTake || null,
    })
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 animate-fadein">
      <h1 className="text-2xl font-bold text-white mb-6">Search</h1>

      <form onSubmit={handleSearch} className="flex gap-2 mb-6">
        <Input
          type="text"
          placeholder="Search music…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 flex-1"
          autoFocus
        />
        <Button type="submit" className="bg-purple-600 hover:bg-purple-700 text-white shrink-0">
          Search
        </Button>
      </form>

      {/* Type filter tabs */}
      <div className="flex gap-2 mb-6">
        {TYPES.map((t) => (
          <button
            key={t.value}
            onClick={() => setType(t.value)}
            className={`text-sm px-4 py-1.5 rounded-full transition-colors ${
              type === t.value
                ? 'bg-purple-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:text-white'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {isLoading && <SearchSkeleton />}
      {error && <ErrorMessage message="Search failed. Please try again." />}
      {searched && !isLoading && !error && results.length === 0 && (
        <p className="text-gray-500 text-center py-8">No results found for "{submittedQ}".</p>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {results.map((result) => {
          const isSaved = savedIds.has(result.id)
          const isSavingThis = savingId === result.id

          return (
            <div key={result.id} className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden flex flex-col">
              <ArtworkImage
                name={result.name}
                artistName={result.artistName}
                directUrl={result.artworkUrl}
                className="w-full aspect-square"
              />

              <div className="p-3 flex flex-col flex-1">
                <div className="flex items-start gap-1 mb-0.5">
                  <p className="text-sm font-medium text-white line-clamp-1 flex-1">{result.name}</p>
                  <span className={`text-xs px-1.5 py-0.5 rounded shrink-0 ${
                    result.isSong
                      ? 'bg-green-900/50 text-green-300'
                      : result.entityType === 'artist'
                        ? 'bg-purple-900/50 text-purple-300'
                        : 'bg-blue-900/50 text-blue-300'
                  }`}>
                    {result.isSong ? 'Song' : result.entityType === 'artist' ? 'Artist' : 'Album'}
                  </span>
                </div>
                {result.artistName && (
                  <p className="text-xs text-gray-400 line-clamp-1">{result.artistName}</p>
                )}
                {result.isSong && result.albumName && (
                  <p className="text-xs text-gray-600 line-clamp-1">{result.albumName}</p>
                )}

                {!isSavingThis && (
                  <div className="mt-auto pt-2">
                    {isSaved ? (
                      <span className="text-xs text-green-400">Saved ✓</span>
                    ) : (
                      <button
                        onClick={() => { setSavingId(result.id); setSaveTag('loved'); setSaveTake('') }}
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
