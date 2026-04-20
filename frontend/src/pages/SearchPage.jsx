import { useState, useEffect, useRef } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { searchItunes, getRandomSong } from '@/api/itunes'
import { createEntry, getCollection } from '@/api/collection'
import { ArtworkImage } from '@/components/ArtworkImage'
import { TagCheckboxes } from '@/components/TagBadge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { ErrorMessage } from '@/components/ErrorMessage'

const TYPES = [
  { value: 'all', label: 'All' },
  { value: 'artist', label: 'Artists' },
  { value: 'album', label: 'Albums' },
  { value: 'song', label: 'Songs' },
]

const GENRES = [
  'All Genres', 'Pop', 'Hip-Hop/Rap', 'Rock', 'R&B/Soul', 'Country',
  'Electronic', 'Jazz', 'Classical', 'Latin', 'Alternative', 'Metal',
  'Indie', 'Folk', 'Reggae', 'Blues',
]

const DECADES = [
  { value: '', label: 'Any Year' },
  { value: '2020', label: '2020s' },
  { value: '2010', label: '2010s' },
  { value: '2000', label: '2000s' },
  { value: '1990', label: '1990s' },
  { value: '1980', label: '1980s' },
  { value: '1970', label: '1970s' },
  { value: '1960', label: '1960s' },
]

const ALL_TIME = {
  artists: [
    { name: 'The Beatles', sub: 'Rock', query: 'The Beatles' },
    { name: 'Michael Jackson', sub: 'Pop', query: 'Michael Jackson' },
    { name: 'Queen', sub: 'Rock', query: 'Queen band' },
    { name: 'Elvis Presley', sub: 'Rock & Roll', query: 'Elvis Presley' },
    { name: 'Led Zeppelin', sub: 'Rock', query: 'Led Zeppelin' },
    { name: 'Whitney Houston', sub: 'R&B', query: 'Whitney Houston' },
    { name: 'Eminem', sub: 'Hip-Hop', query: 'Eminem' },
    { name: 'Beyoncé', sub: 'Pop/R&B', query: 'Beyoncé' },
  ],
  albums: [
    { name: 'Thriller', sub: 'Michael Jackson · 1982', query: 'Thriller Michael Jackson', type: 'album' },
    { name: 'Abbey Road', sub: 'The Beatles · 1969', query: 'Abbey Road Beatles', type: 'album' },
    { name: 'Back in Black', sub: 'AC/DC · 1980', query: 'Back in Black ACDC', type: 'album' },
    { name: 'The Dark Side of the Moon', sub: 'Pink Floyd · 1973', query: 'Dark Side of the Moon Pink Floyd', type: 'album' },
    { name: 'Rumours', sub: 'Fleetwood Mac · 1977', query: 'Rumours Fleetwood Mac', type: 'album' },
    { name: 'Purple Rain', sub: 'Prince · 1984', query: 'Purple Rain Prince', type: 'album' },
    { name: 'The Miseducation of Lauryn Hill', sub: 'Lauryn Hill · 1998', query: 'Miseducation Lauryn Hill', type: 'album' },
    { name: 'Nevermind', sub: 'Nirvana · 1991', query: 'Nevermind Nirvana', type: 'album' },
  ],
  songs: [
    { name: 'Bohemian Rhapsody', sub: 'Queen', query: 'Bohemian Rhapsody Queen', type: 'song' },
    { name: 'Billie Jean', sub: 'Michael Jackson', query: 'Billie Jean Michael Jackson', type: 'song' },
    { name: 'Smells Like Teen Spirit', sub: 'Nirvana', query: 'Smells Like Teen Spirit Nirvana', type: 'song' },
    { name: 'Hotel California', sub: 'Eagles', query: 'Hotel California Eagles', type: 'song' },
    { name: 'Imagine', sub: 'John Lennon', query: 'Imagine John Lennon', type: 'song' },
    { name: 'What\'s Going On', sub: 'Marvin Gaye', query: "What's Going On Marvin Gaye", type: 'song' },
    { name: 'I Will Always Love You', sub: 'Whitney Houston', query: 'I Will Always Love You Whitney Houston', type: 'song' },
    { name: 'Purple Haze', sub: 'Jimi Hendrix', query: 'Purple Haze Jimi Hendrix', type: 'song' },
  ],
}

const GENRE_SEARCH_TERMS = {
  'Pop': 'pop music',
  'Hip-Hop/Rap': 'hip hop rap',
  'Rock': 'rock music',
  'R&B/Soul': 'rnb soul',
  'Country': 'country music',
  'Electronic': 'electronic music',
  'Jazz': 'jazz music',
  'Classical': 'classical music',
  'Latin': 'latin music',
  'Alternative': 'alternative music',
  'Metal': 'metal music',
  'Indie': 'indie music',
  'Folk': 'folk music',
  'Reggae': 'reggae music',
  'Blues': 'blues music',
}

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

function ClassicsGrid({ items, type }) {
  const navigate = useNavigate()
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {items.map((item) => (
        <button
          key={item.name}
          onClick={() => navigate(`/search?q=${encodeURIComponent(item.query)}&type=${item.type || (type === 'artists' ? 'artist' : type === 'albums' ? 'album' : 'song')}`)}
          className="bg-gray-900 border border-gray-800 hover:border-purple-700 rounded-lg overflow-hidden text-left transition-colors group"
        >
          <ArtworkImage
            name={item.name}
            artistName={item.sub?.split(' · ')[0]}
            className="w-full aspect-square"
          />
          <div className="p-2.5">
            <p className="text-sm font-medium text-white group-hover:text-purple-400 transition-colors line-clamp-1">{item.name}</p>
            <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{item.sub}</p>
          </div>
        </button>
      ))}
    </div>
  )
}

export function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [q, setQ] = useState(searchParams.get('q') || '')
  const [type, setType] = useState(searchParams.get('type') || 'all')
  const [genre, setGenre] = useState('All Genres')
  const [decade, setDecade] = useState('')
  const [submittedQ, setSubmittedQ] = useState(searchParams.get('q') || '')
  const [submittedType, setSubmittedType] = useState(searchParams.get('type') || 'all')
  const [searched, setSearched] = useState(!!searchParams.get('q'))
  const [randomLoading, setRandomLoading] = useState(false)

  const [savingId, setSavingId] = useState(null)
  const [saveTags, setSaveTags] = useState(['loved'])
  const [saveTake, setSaveTake] = useState('')
  const [savedIds, setSavedIds] = useState(new Set())
  const [activeClassicsTab, setActiveClassicsTab] = useState('artists')

  useEffect(() => {
    const paramQ = searchParams.get('q')
    const paramType = searchParams.get('type') || 'all'
    if (paramQ) {
      setQ(paramQ)
      setType(paramType)
      setSubmittedQ(paramQ)
      setSubmittedType(paramType)
      setSearched(true)
    }
  }, [searchParams])

  // Keep a ref to the current query so the filter effect can read it without being a dependency
  const qRef = useRef(q)
  useEffect(() => { qRef.current = q }, [q])

  // Auto-search when genre or decade is changed
  useEffect(() => {
    const hasGenre = genre !== 'All Genres'
    const hasDecade = decade !== ''
    if (!hasGenre && !hasDecade) return
    const searchTerm = qRef.current.trim() || (hasGenre ? GENRE_SEARCH_TERMS[genre] ?? genre.toLowerCase() : 'popular music')
    setSubmittedQ(searchTerm)
    setSubmittedType(type)
    setSearched(true)
    setSavingId(null)
  }, [genre, decade]) // eslint-disable-line react-hooks/exhaustive-deps

  const { data: rawResults = [], isLoading, error } = useQuery({
    queryKey: ['search', submittedQ, submittedType],
    queryFn: () => searchItunes(submittedQ, submittedType),
    enabled: searched && submittedQ !== '',
  })

  const { data: collection } = useQuery({
    queryKey: ['collection', ''],
    queryFn: () => getCollection(''),
  })

  const collectionIds = new Set((collection ?? []).map(e => e.musicbrainz_id.replace('itunes-', '')))

  // Apply client-side filters
  const results = rawResults.filter(r => {
    if (genre !== 'All Genres') {
      const g = r.genre?.toLowerCase() ?? ''
      if (!g.includes(genre.toLowerCase().split('/')[0].toLowerCase())) return false
    }
    if (decade && r.releaseYear) {
      const start = parseInt(decade)
      if (r.releaseYear < start || r.releaseYear >= start + 10) return false
    }
    return true
  })

  const saveMutation = useMutation({
    mutationFn: (entry) => createEntry(entry),
    onSuccess: (_, variables) => {
      setSavedIds((prev) => new Set(prev).add(variables.musicbrainz_id.replace('itunes-', '')))
      setSavingId(null)
      setSaveTake('')
      setSaveTags(['loved'])
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
    setSearchParams({ q: q.trim(), type })
  }

  async function handleRandomSong() {
    setRandomLoading(true)
    try {
      const song = await getRandomSong()
      navigate(`/album/${song.collectionId}`)
    } catch {
      // silent fail
    } finally {
      setRandomLoading(false)
    }
  }

  function handleSave(result) {
    saveMutation.mutate({
      musicbrainz_id: `itunes-${result.id}`,
      entity_type: result.entityType,
      name: result.isSong ? `${result.name} (${result.albumName ?? 'Single'})` : result.name,
      artist_name: result.artistName,
      tags: saveTags,
      take: saveTake || null,
    })
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 animate-fadein">
      <h1 className="text-2xl font-bold text-white mb-6">Search</h1>

      {/* Search bar + random */}
      <div className="flex gap-2 mb-4">
        <form onSubmit={handleSearch} className="flex gap-2 flex-1">
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
        <Button
          type="button"
          onClick={handleRandomSong}
          disabled={randomLoading}
          className="bg-gray-700 hover:bg-gray-600 text-white shrink-0"
          title="Random song"
        >
          {randomLoading ? '…' : '🎲 Random'}
        </Button>
      </div>

      {/* Type + filters row */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="flex gap-1.5">
          {TYPES.map((t) => (
            <button
              key={t.value}
              onClick={() => setType(t.value)}
              className={`text-sm px-3 py-1.5 rounded-full transition-colors ${
                type === t.value ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex gap-2 ml-auto">
          <select
            value={genre}
            onChange={(e) => setGenre(e.target.value)}
            className="bg-gray-800 border border-gray-700 text-gray-300 rounded-lg px-3 py-1.5 text-sm"
          >
            {GENRES.map(g => <option key={g}>{g}</option>)}
          </select>

          <select
            value={decade}
            onChange={(e) => setDecade(e.target.value)}
            className="bg-gray-800 border border-gray-700 text-gray-300 rounded-lg px-3 py-1.5 text-sm"
          >
            {DECADES.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
          </select>
        </div>
      </div>

      {isLoading && <SearchSkeleton />}
      {error && <ErrorMessage message="Search failed. Please try again." />}
      {searched && !isLoading && !error && results.length === 0 && rawResults.length > 0 && (
        <p className="text-gray-500 text-center py-8">No results match the selected filters.</p>
      )}
      {searched && !isLoading && !error && rawResults.length === 0 && (
        <p className="text-gray-500 text-center py-8">No results found for "{submittedQ}".</p>
      )}

      {/* Search results */}
      {results.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mb-12">
          {results.map((result) => {
            const isSaved = savedIds.has(result.id) || collectionIds.has(result.id)
            const isSavingThis = savingId === result.id
            const detailPath = result.entityType === 'artist'
              ? `/artist/${result.id}`
              : result.isSong ? null : `/album/${result.id}`

            return (
              <div key={result.id} className="bg-gray-900 border border-gray-800 hover:border-purple-700 transition-colors rounded-lg overflow-hidden flex flex-col">
                <div className={`relative ${detailPath ? 'cursor-pointer' : ''}`} onClick={() => detailPath && navigate(detailPath)}>
                  <ArtworkImage name={result.name} artistName={result.artistName} directUrl={result.artworkUrl} className="w-full aspect-square" />
                  {isSaved && (
                    <div className="absolute top-2 right-2 bg-green-500 rounded-full w-6 h-6 flex items-center justify-center">
                      <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                    </div>
                  )}
                </div>

                <div className="p-3 flex flex-col flex-1">
                  <div className="flex items-start gap-1 mb-0.5">
                    <p className={`text-sm font-medium text-white line-clamp-1 flex-1 ${detailPath ? 'cursor-pointer hover:text-purple-400 transition-colors' : ''}`} onClick={() => detailPath && navigate(detailPath)}>
                      {result.name}
                    </p>
                    <span className={`text-xs px-1.5 py-0.5 rounded shrink-0 ${result.isSong ? 'bg-green-900/50 text-green-300' : result.entityType === 'artist' ? 'bg-purple-900/50 text-purple-300' : 'bg-blue-900/50 text-blue-300'}`}>
                      {result.isSong ? 'Song' : result.entityType === 'artist' ? 'Artist' : 'Album'}
                    </span>
                  </div>
                  {result.artistName && <p className="text-xs text-gray-400 line-clamp-1">{result.artistName}</p>}
                  {result.isSong && result.albumName && <p className="text-xs text-gray-600 line-clamp-1">{result.albumName}</p>}

                  {!isSavingThis && (
                    <div className="mt-auto pt-2">
                      {isSaved ? (
                        <span className="text-xs text-green-400">Saved ✓</span>
                      ) : (
                        <button onClick={() => { setSavingId(result.id); setSaveTags(['loved']); setSaveTake('') }} className="text-xs text-purple-400 hover:text-purple-300 transition-colors">
                          + Save to collection
                        </button>
                      )}
                    </div>
                  )}

                  {isSavingThis && (
                    <div className="mt-2 space-y-2">
                      <TagCheckboxes selected={saveTags} onChange={setSaveTags} />
                      <Textarea value={saveTake} onChange={(e) => setSaveTake(e.target.value)} placeholder="Your take… (optional)" rows={2} className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 text-xs" />
                      <div className="flex gap-1">
                        <Button size="sm" onClick={() => handleSave(result)} disabled={saveMutation.isPending} className="bg-purple-600 hover:bg-purple-700 text-white text-xs h-7">{saveMutation.isPending ? 'Saving…' : 'Save'}</Button>
                        <Button size="sm" variant="ghost" onClick={() => setSavingId(null)} className="text-gray-400 hover:text-white text-xs h-7">Cancel</Button>
                      </div>
                      {saveMutation.isError && <ErrorMessage message="Failed to save." />}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* All-time classics — shown when not searching */}
      {!searched && (
        <div>
          <h2 className="text-lg font-semibold text-white mb-1">All time favorites</h2>
          <p className="text-sm text-gray-500 mb-4">Iconic artists, albums, and songs from music history</p>

          <div className="flex gap-2 mb-4">
            {['artists', 'albums', 'songs'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveClassicsTab(tab)}
                className={`text-sm px-4 py-1.5 rounded-full capitalize transition-colors ${
                  activeClassicsTab === tab ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <ClassicsGrid items={ALL_TIME[activeClassicsTab]} type={activeClassicsTab} />
        </div>
      )}
    </div>
  )
}
