import { useState } from 'react'
import { Link } from 'react-router-dom'
import { TagBadge } from '@/components/TagBadge'
import { releaseCoverUrl } from '@/lib/coverArt'

function MusicIcon() {
  return (
    <svg className="w-10 h-10 text-gray-600" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
    </svg>
  )
}

function CoverImage({ entry }) {
  const [loaded, setLoaded] = useState(false)
  const [failed, setFailed] = useState(false)

  if (entry.entity_type !== 'release' || failed) {
    return (
      <div className="w-full aspect-square bg-gray-800 flex items-center justify-center">
        <MusicIcon />
      </div>
    )
  }

  return (
    <div className="w-full aspect-square bg-gray-800 relative">
      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-5 h-5 border-2 border-gray-600 border-t-purple-500 rounded-full animate-spin" />
        </div>
      )}
      <img
        src={releaseCoverUrl(entry.musicbrainz_id)}
        alt={entry.name}
        className={`w-full h-full object-cover transition-opacity duration-200 ${loaded ? 'opacity-100' : 'opacity-0'}`}
        onLoad={() => setLoaded(true)}
        onError={() => setFailed(true)}
      />
    </div>
  )
}

export function EntryCard({ entry }) {
  return (
    <Link to={`/collection/${entry.id}`} className="block group">
      <div className="bg-gray-900 border border-gray-800 hover:border-purple-700 transition-colors rounded-lg overflow-hidden">
        <CoverImage entry={entry} />
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
