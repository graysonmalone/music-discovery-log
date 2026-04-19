const ITUNES_BASE = 'https://itunes.apple.com/search'

async function itunesFetch(params) {
  const url = new URL(ITUNES_BASE)
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  const res = await fetch(url.toString())
  if (!res.ok) throw new Error('iTunes request failed')
  return res.json()
}

export async function searchItunes(q) {
  const [artistData, albumData] = await Promise.all([
    itunesFetch({ term: q, entity: 'musicArtist', media: 'music', limit: 12 }),
    itunesFetch({ term: q, entity: 'album', media: 'music', limit: 12 }),
  ])

  const artists = (artistData.results ?? []).map((r) => ({
    id: String(r.artistId),
    name: r.artistName,
    artistName: null,
    entityType: 'artist',
    artworkUrl: null, // artists don't have direct artwork in iTunes
    genre: r.primaryGenreName ?? null,
  }))

  const albums = (albumData.results ?? []).map((r) => ({
    id: String(r.collectionId),
    name: r.collectionName,
    artistName: r.artistName,
    entityType: 'release',
    artworkUrl: r.artworkUrl100?.replace('100x100bb', '500x500bb') ?? null,
    genre: r.primaryGenreName ?? null,
  }))

  // Interleave artists and albums so results feel balanced
  const merged = []
  const max = Math.max(artists.length, albums.length)
  for (let i = 0; i < max; i++) {
    if (artists[i]) merged.push(artists[i])
    if (albums[i]) merged.push(albums[i])
  }

  return merged.slice(0, 24)
}
