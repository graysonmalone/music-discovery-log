import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getArtistProfile, formatDuration, releaseYear } from '@/api/itunes'
import { createEntry, getCollection } from '@/api/collection'
import { ArtworkImage } from '@/components/ArtworkImage'
import { ErrorMessage } from '@/components/ErrorMessage'
import { useTop3 } from '@/context/Top3Context'

function PageSkeleton() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-8 animate-pulse space-y-8">
      <div className="flex gap-6 items-end">
        <div className="w-40 h-40 bg-gray-800 rounded-xl shrink-0" />
        <div className="space-y-3">
          <div className="h-8 w-48 bg-gray-800 rounded" />
          <div className="h-4 w-24 bg-gray-800 rounded" />
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="bg-gray-900 rounded-lg overflow-hidden">
            <div className="aspect-square bg-gray-800" />
            <div className="p-3 space-y-2">
              <div className="h-3 bg-gray-800 rounded w-3/4" />
              <div className="h-2 bg-gray-800 rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function ArtistPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { top3, add: addToTop3, remove: removeFromTop3, isInTop3, isFull } = useTop3()

  const { data, isLoading, error } = useQuery({
    queryKey: ['artist', id],
    queryFn: () => getArtistProfile(id),
    staleTime: 5 * 60 * 1000,
  })

  const { data: collection } = useQuery({
    queryKey: ['collection', ''],
    queryFn: () => getCollection(''),
  })

  const saveMutation = useMutation({
    mutationFn: (entry) => createEntry(entry),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collection'] })
    },
  })

  if (isLoading) return <PageSkeleton />
  if (error || !data?.artist) return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <ErrorMessage message="Artist not found." />
    </div>
  )

  const { artist, albums, topSongs } = data
  const artistName = artist.artistName
  const itunesId = `itunes-${id}`
  const isAlreadySaved = collection?.some(e => e.musicbrainz_id === itunesId && e.entity_type === 'artist')
  const inTop3 = isInTop3(id)

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 animate-fadein">
      <button
        onClick={() => navigate(-1)}
        className="text-sm text-gray-500 hover:text-gray-300 mb-8 flex items-center gap-1.5 transition-colors"
      >
        ← Back
      </button>

      {/* Artist header */}
      <div className="flex gap-6 items-end mb-10">
        <div className="w-36 h-36 sm:w-48 sm:h-48 rounded-xl overflow-hidden shadow-2xl shadow-black/60 shrink-0">
          <ArtworkImage
            name={artistName}
            artistName={null}
            className="w-full h-full"
          />
        </div>
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">Artist</p>
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">{artistName}</h1>
          {artist.primaryGenreName && (
            <p className="text-gray-400">{artist.primaryGenreName}</p>
          )}
          <p className="text-sm text-gray-600 mt-1">{albums.length} releases</p>

          <div className="flex gap-2 mt-4">
            {isAlreadySaved ? (
              <span className="text-sm text-green-400 flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                Saved
              </span>
            ) : (
              <button
                onClick={() => saveMutation.mutate({
                  musicbrainz_id: itunesId,
                  entity_type: 'artist',
                  name: artistName,
                  artist_name: null,
                  tag: 'loved',
                  take: null,
                })}
                disabled={saveMutation.isPending || saveMutation.isSuccess}
                className="text-sm bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white px-4 py-1.5 rounded-lg transition-colors"
              >
                {saveMutation.isSuccess ? 'Saved ✓' : saveMutation.isPending ? 'Saving…' : '+ Save to collection'}
              </button>
            )}

            <button
              onClick={() => inTop3
                ? removeFromTop3(id)
                : addToTop3({ id, entityType: 'artist', name: artistName, artworkUrl: null, artistName: null })
              }
              disabled={!inTop3 && isFull}
              className={`text-sm px-4 py-1.5 rounded-lg transition-colors border ${
                inTop3
                  ? 'border-yellow-500 text-yellow-400 hover:bg-yellow-500/10'
                  : isFull
                  ? 'border-gray-700 text-gray-600 cursor-not-allowed'
                  : 'border-gray-600 text-gray-300 hover:border-yellow-500 hover:text-yellow-400'
              }`}
              title={isFull && !inTop3 ? 'Top 3 is full' : undefined}
            >
              {inTop3 ? '★ In Top 3' : '☆ Add to Top 3'}
            </button>
          </div>
        </div>
      </div>

      {/* Top Songs */}
      {topSongs.length > 0 && (
        <section className="mb-10">
          <h2 className="text-lg font-semibold text-white mb-4">Popular songs</h2>
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            {topSongs.map((song, i) => (
              <div
                key={song.trackId}
                className="flex items-center gap-4 px-4 py-3 hover:bg-gray-800/50 transition-colors group border-b border-gray-800 last:border-0"
              >
                <span className="text-gray-600 w-5 text-right text-sm shrink-0">{i + 1}</span>
                <div className="w-10 h-10 rounded overflow-hidden shrink-0">
                  <img
                    src={song.artworkUrl100?.replace('100x100bb', '60x60bb')}
                    alt={song.collectionName}
                    className="w-full h-full object-cover"
                    onError={(e) => { e.currentTarget.style.display = 'none' }}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium line-clamp-1">{song.trackName}</p>
                  <p className="text-gray-500 text-xs line-clamp-1">{song.collectionName}</p>
                </div>
                <span className="text-gray-600 text-xs shrink-0">{formatDuration(song.trackTimeMillis)}</span>
                <button
                  onClick={() => saveMutation.mutate({
                    musicbrainz_id: `itunes-${song.trackId}`,
                    entity_type: 'release',
                    name: `${song.trackName} (${song.collectionName})`,
                    artist_name: artistName,
                    tag: 'loved',
                    take: null,
                  })}
                  className="text-xs text-purple-400 hover:text-purple-300 opacity-0 group-hover:opacity-100 transition-all shrink-0 ml-2"
                >
                  + Save
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Discography */}
      <section>
        <h2 className="text-lg font-semibold text-white mb-4">Discography</h2>
        {albums.length === 0 ? (
          <p className="text-gray-500">No albums found.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {albums.map((album) => (
              <Link
                key={album.collectionId}
                to={`/album/${album.collectionId}`}
                className="group bg-gray-900 border border-gray-800 hover:border-purple-700 rounded-lg overflow-hidden transition-colors"
              >
                <div className="aspect-square overflow-hidden">
                  <img
                    src={album.artworkUrl100?.replace('100x100bb', '500x500bb')}
                    alt={album.collectionName}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none'
                    }}
                  />
                </div>
                <div className="p-3">
                  <p className="text-sm font-medium text-white group-hover:text-purple-400 transition-colors line-clamp-1">
                    {album.collectionName}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {releaseYear(album.releaseDate)}
                    {album.primaryGenreName && ` · ${album.primaryGenreName}`}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
