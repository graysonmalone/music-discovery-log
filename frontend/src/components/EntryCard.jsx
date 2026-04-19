import { Link } from 'react-router-dom'
import { TagBadge } from '@/components/TagBadge'
import { ArtworkImage } from '@/components/ArtworkImage'

export function EntryCard({ entry }) {
  return (
    <Link to={`/collection/${entry.id}`} className="block group">
      <div className="bg-gray-900 border border-gray-800 hover:border-purple-700 transition-colors rounded-lg overflow-hidden">
        <ArtworkImage
          name={entry.name}
          artistName={entry.artist_name}
          className="w-full aspect-square"
        />
        <div className="p-3">
          <div className="flex items-start justify-between gap-2 mb-1">
            <p className="text-sm font-medium text-white group-hover:text-purple-400 transition-colors leading-snug line-clamp-1">
              {entry.name}
            </p>
            <TagBadge tag={entry.tag} />
          </div>
          {entry.artist_name && (
            <p className="text-xs text-gray-400 line-clamp-1">{entry.artist_name}</p>
          )}
          {entry.take && (
            <p className="text-xs text-gray-500 mt-1.5 line-clamp-2">{entry.take}</p>
          )}
        </div>
      </div>
    </Link>
  )
}
