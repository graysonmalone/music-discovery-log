const ITUNES_BASE = 'https://itunes.apple.com/search'

async function itunesFetch(params) {
  const url = new URL(ITUNES_BASE)
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  const res = await fetch(url.toString())
  if (!res.ok) throw new Error('iTunes request failed')
  return res.json()
}

function normalizeArtist(r) {
  return {
    id: String(r.artistId),
    name: r.artistName,
    artistName: null,
    entityType: 'artist',
    artworkUrl: null,
    genre: r.primaryGenreName ?? null,
  }
}

function normalizeAlbum(r) {
  return {
    id: String(r.collectionId),
    name: r.collectionName,
    artistName: r.artistName,
    entityType: 'release',
    artworkUrl: r.artworkUrl100?.replace('100x100bb', '500x500bb') ?? null,
    genre: r.primaryGenreName ?? null,
  }
}

function normalizeSong(r) {
  return {
    id: String(r.trackId),
    name: r.trackName,
    artistName: r.artistName,
    albumName: r.collectionName,
    entityType: 'release', // save as release (album) since our backend only supports artist/release
    artworkUrl: r.artworkUrl100?.replace('100x100bb', '500x500bb') ?? null,
    genre: r.primaryGenreName ?? null,
    isSong: true,
  }
}

export async function searchItunes(q, type = 'all') {
  if (type === 'artist') {
    const data = await itunesFetch({ term: q, entity: 'musicArtist', media: 'music', limit: 20 })
    return (data.results ?? []).map(normalizeArtist).slice(0, 20)
  }

  if (type === 'album') {
    const data = await itunesFetch({ term: q, entity: 'album', media: 'music', limit: 20 })
    return (data.results ?? []).filter(r => r.wrapperType === 'collection').map(normalizeAlbum).slice(0, 20)
  }

  if (type === 'song') {
    const data = await itunesFetch({ term: q, entity: 'musicTrack', media: 'music', limit: 20 })
    return (data.results ?? []).filter(r => r.kind === 'song').map(normalizeSong).slice(0, 20)
  }

  // 'all': search artist + album in parallel, show top results from each
  const [artistData, albumData] = await Promise.all([
    itunesFetch({ term: q, entity: 'musicArtist', media: 'music', limit: 6 }),
    itunesFetch({ term: q, entity: 'album', media: 'music', limit: 6 }),
  ])

  const artists = (artistData.results ?? []).map(normalizeArtist)
  const albums = (albumData.results ?? []).map(normalizeAlbum)

  const merged = []
  const max = Math.max(artists.length, albums.length)
  for (let i = 0; i < max; i++) {
    if (artists[i]) merged.push(artists[i])
    if (albums[i]) merged.push(albums[i])
  }
  return merged.slice(0, 20)
}
