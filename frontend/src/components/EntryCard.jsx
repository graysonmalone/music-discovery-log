import { Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TagBadge } from '@/components/TagBadge'

export function EntryCard({ entry }) {
  return (
    <Link to={`/collection/${entry.id}`} className="block group">
      <Card className="bg-gray-900 border-gray-800 hover:border-purple-700 transition-colors">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-base text-white group-hover:text-purple-400 transition-colors leading-snug">
              {entry.name}
            </CardTitle>
            <TagBadge tag={entry.tag} />
          </div>
          {entry.artist_name && (
            <p className="text-sm text-gray-400">{entry.artist_name}</p>
          )}
        </CardHeader>

        <CardContent className="pt-0">
          <p className="text-xs text-gray-500 mb-2 capitalize">{entry.entity_type}</p>
          {entry.take && (
            <p className="text-sm text-gray-300 line-clamp-2">{entry.take}</p>
          )}
        </CardContent>
      </Card>
    </Link>
  )
}
