import { useQuery } from '@tanstack/react-query'

async function fetchArtwork(name, artistName) {
  const term = [name, artistName].filter(Boolean).join(' ')
  const res = await fetch(
    `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&entity=album&limit=1&media=music`
  )
  if (!res.ok) return null
  const data = await res.json()
  const artwork = data.results?.[0]?.artworkUrl100
  if (!artwork) return null
  // Upgrade from 100px thumbnail to 500px
  return artwork.replace('100x100bb', '500x500bb')
}

export function ArtworkImage({ name, artistName, alt, className = '' }) {
  const { data: url, isLoading } = useQuery({
    queryKey: ['artwork', name, artistName],
    queryFn: () => fetchArtwork(name, artistName),
    staleTime: Infinity,
    retry: false,
    enabled: !!name,
  })

  if (isLoading) {
    return (
      <div className={`bg-gray-800 flex items-center justify-center ${className}`}>
        <div className="w-5 h-5 border-2 border-gray-600 border-t-purple-500 rounded-full animate-spin" />
      </div>
    )
  }

  if (!url) {
    return (
      <div className={`bg-gray-800 flex items-center justify-center ${className}`}>
        <svg className="w-10 h-10 text-gray-600" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
        </svg>
      </div>
    )
  }

  return (
    <img
      src={url}
      alt={alt || name}
      className={`object-cover ${className}`}
    />
  )
}
