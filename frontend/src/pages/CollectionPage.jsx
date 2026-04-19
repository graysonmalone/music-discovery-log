import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getCollection } from '@/api/collection'
import { EntryCard } from '@/components/EntryCard'
import { ErrorMessage } from '@/components/ErrorMessage'
import { Button } from '@/components/ui/button'

const TAGS = [
  { value: '', label: 'All' },
  { value: 'loved', label: 'Loved' },
  { value: 'want_to_listen', label: 'Want to Listen' },
  { value: 'overrated', label: 'Overrated' },
]

const SORTS = [
  { value: 'newest', label: 'Newest' },
  { value: 'oldest', label: 'Oldest' },
  { value: 'az', label: 'A–Z' },
]

function CollectionSkeleton() {
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

export function CollectionPage() {
  const [activeTag, setActiveTag] = useState('')
  const [sort, setSort] = useState('newest')

  const { data: entries, isLoading, error } = useQuery({
    queryKey: ['collection', activeTag],
    queryFn: () => getCollection(activeTag),
  })

  const sorted = useMemo(() => {
    if (!entries) return []
    const copy = [...entries]
    if (sort === 'oldest') return copy.sort((a, b) => new Date(a.saved_at) - new Date(b.saved_at))
    if (sort === 'az') return copy.sort((a, b) => a.name.localeCompare(b.name))
    return copy // newest: backend already returns newest first
  }, [entries, sort])

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 animate-fadein">
      <h1 className="text-2xl font-bold text-white mb-6">My Collection</h1>

      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        {/* Tag filter */}
        <div className="flex gap-2 flex-wrap">
          {TAGS.map((t) => (
            <Button
              key={t.value}
              size="sm"
              onClick={() => setActiveTag(t.value)}
              className={
                activeTag === t.value
                  ? 'bg-purple-600 hover:bg-purple-700 text-white'
                  : 'bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white border-0'
              }
            >
              {t.label}
            </Button>
          ))}
        </div>

        {/* Sort */}
        <div className="flex gap-1">
          {SORTS.map((s) => (
            <button
              key={s.value}
              onClick={() => setSort(s.value)}
              className={`text-xs px-3 py-1.5 rounded-md transition-colors ${
                sort === s.value
                  ? 'bg-gray-700 text-white'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading && <CollectionSkeleton />}

      {error && <ErrorMessage message="Failed to load your collection." />}

      {!isLoading && sorted.length === 0 && (
        <p className="text-gray-500 text-center py-16">
          No entries yet.{' '}
          <a href="/search" className="text-purple-400 hover:text-purple-300">
            Search for music
          </a>{' '}
          to add some.
        </p>
      )}

      {sorted.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {sorted.map((entry) => (
            <EntryCard key={entry.id} entry={entry} />
          ))}
        </div>
      )}
    </div>
  )
}
