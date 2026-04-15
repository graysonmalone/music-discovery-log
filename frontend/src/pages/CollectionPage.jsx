import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getCollection } from '@/api/collection'
import { EntryCard } from '@/components/EntryCard'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { ErrorMessage } from '@/components/ErrorMessage'
import { Button } from '@/components/ui/button'

const TAGS = [
  { value: '', label: 'All' },
  { value: 'loved', label: 'Loved' },
  { value: 'want_to_listen', label: 'Want to Listen' },
  { value: 'overrated', label: 'Overrated' },
]

export function CollectionPage() {
  const [activeTag, setActiveTag] = useState('')

  const { data: entries, isLoading, error } = useQuery({
    queryKey: ['collection', activeTag],
    queryFn: () => getCollection(activeTag),
  })

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-white mb-6">My Collection</h1>

      <div className="flex gap-2 mb-6 flex-wrap">
        {TAGS.map((t) => (
          <Button
            key={t.value}
            size="sm"
            variant={activeTag === t.value ? 'default' : 'outline'}
            onClick={() => setActiveTag(t.value)}
            className={
              activeTag === t.value
                ? 'bg-purple-600 hover:bg-purple-700 text-white'
                : 'border-gray-700 text-gray-300 hover:text-white hover:border-gray-500'
            }
          >
            {t.label}
          </Button>
        ))}
      </div>

      {isLoading && <LoadingSpinner />}

      {error && <ErrorMessage message="Failed to load your collection." />}

      {entries && entries.length === 0 && (
        <p className="text-gray-500 text-center py-16">
          No entries yet.{' '}
          <a href="/search" className="text-purple-400 hover:text-purple-300">
            Search for music
          </a>{' '}
          to add some.
        </p>
      )}

      {entries && entries.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {entries.map((entry) => (
            <EntryCard key={entry.id} entry={entry} />
          ))}
        </div>
      )}
    </div>
  )
}
