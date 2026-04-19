import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getAlbumDetail, formatDuration, releaseYear } from '@/api/itunes'
import { createEntry } from '@/api/collection'
import { ErrorMessage } from '@/components/ErrorMessage'

function PageSkeleton() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8 animate-pulse">
      <div className="flex gap-6 items-end mb-10">
        <div className="w-40 h-40 bg-gray-800 rounded-xl shrink-0" />
        <div className="space-y-3">
          <div className="h-7 w-48 bg-gray-800 rounded" />
          <div className="h-4 w-32 bg-gray-800 rounded" />
          <div className="h-3 w-20 bg-gray-800 rounded" />
        </div>
      </div>
      <div className="space-y-2">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="h-12 bg-gray-900 rounded-lg" />
        ))}
      </div>
    </div>
  )
}

export function AlbumPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data, isLoading, error } = useQuery({
    queryKey: ['album', id],
    queryFn: () => getAlbumDetail(id),
    staleTime: 5 * 60 * 1000,
  })

  const saveMutation = useMutation({
    mutationFn: (entry) => createEntry(entry),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collection'] })
    },
  })

  if (isLoading) return <PageSkeleton />
  if (error || !data?.album) return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <ErrorMessage message="Album not found." />
    </div>
  )

  const { album, tracks } = data
  const year = releaseYear(album.releaseDate)
  const totalMs = tracks.reduce((sum, t) => sum + (t.trackTimeMillis ?? 0), 0)

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 animate-fadein">
      <button
        onClick={() => navigate(-1)}
        className="text-sm text-gray-500 hover:text-gray-300 mb-8 flex items-center gap-1.5 transition-colors"
      >
        ← Back
      </button>

      {/* Album header */}
      <div className="flex gap-6 items-end mb-8">
        <div className="w-36 h-36 sm:w-48 sm:h-48 rounded-xl overflow-hidden shadow-2xl shadow-black/60 shrink-0">
          <img
            src={album.artworkUrl100?.replace('100x100bb', '500x500bb')}
            alt={album.collectionName}
            className="w-full h-full object-cover"
            onError={(e) => { e.currentTarget.style.display = 'none' }}
          />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">Album</p>
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1 leading-tight">
            {album.collectionName}
          </h1>
          <Link
            to={`/artist/${album.artistId}`}
            className="text-gray-400 hover:text-purple-400 transition-colors font-medium"
          >
            {album.artistName}
          </Link>
          <p className="text-sm text-gray-600 mt-1">
            {year}
            {album.primaryGenreName && ` · ${album.primaryGenreName}`}
            {tracks.length > 0 && ` · ${tracks.length} songs`}
            {totalMs > 0 && ` · ${formatDuration(totalMs)}`}
          </p>

          <div className="flex gap-2 mt-4">
            <button
              onClick={() => saveMutation.mutate({
                musicbrainz_id: `itunes-${album.collectionId}`,
                entity_type: 'release',
                name: album.collectionName,
                artist_name: album.artistName,
                tag: 'loved',
                take: null,
              })}
              disabled={saveMutation.isPending || saveMutation.isSuccess}
              className="text-sm bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white px-4 py-1.5 rounded-lg transition-colors"
            >
              {saveMutation.isSuccess ? 'Saved ✓' : saveMutation.isPending ? 'Saving…' : '+ Save to collection'}
            </button>
          </div>
        </div>
      </div>

      {/* Tracklist */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        {tracks.map((track, i) => (
          <div
            key={track.trackId}
            className="flex items-center gap-4 px-4 py-3 hover:bg-gray-800/50 transition-colors group border-b border-gray-800 last:border-0"
          >
            <span className="text-gray-600 w-6 text-right text-sm shrink-0">{track.trackNumber}</span>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium line-clamp-1">{track.trackName}</p>
              {track.artistName !== album.artistName && (
                <p className="text-gray-500 text-xs">{track.artistName}</p>
              )}
            </div>
            <button
              onClick={() => saveMutation.mutate({
                musicbrainz_id: `itunes-${track.trackId}`,
                entity_type: 'release',
                name: `${track.trackName} (${album.collectionName})`,
                artist_name: track.artistName,
                tag: 'loved',
                take: null,
              })}
              className="text-xs text-purple-400 hover:text-purple-300 opacity-0 group-hover:opacity-100 transition-all shrink-0"
            >
              + Save
            </button>
            <span className="text-gray-600 text-xs shrink-0 w-10 text-right">
              {formatDuration(track.trackTimeMillis)}
            </span>
          </div>
        ))}
      </div>

      {year && (
        <p className="text-xs text-gray-700 mt-4 text-center">Released {year}</p>
      )}
    </div>
  )
}
