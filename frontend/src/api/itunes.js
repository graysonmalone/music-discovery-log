const ITUNES_BASE = 'https://itunes.apple.com/search'
const ITUNES_LOOKUP = 'https://itunes.apple.com/lookup'

async function itunesFetch(params) {
  const url = new URL(ITUNES_BASE)
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  const res = await fetch(url.toString())
  if (!res.ok) throw new Error('iTunes request failed')
  return res.json()
}

async function itunesLookup(params) {
  const url = new URL(ITUNES_LOOKUP)
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  const res = await fetch(url.toString())
  if (!res.ok) throw new Error('iTunes lookup failed')
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
    releaseYear: r.releaseDate ? new Date(r.releaseDate).getFullYear() : null,
  }
}

function normalizeSong(r) {
  return {
    id: String(r.trackId),
    name: r.trackName,
    artistName: r.artistName,
    albumName: r.collectionName,
    entityType: 'release',
    artworkUrl: r.artworkUrl100?.replace('100x100bb', '500x500bb') ?? null,
    genre: r.primaryGenreName ?? null,
    isSong: true,
    releaseYear: r.releaseDate ? new Date(r.releaseDate).getFullYear() : null,
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

  const [artistData, albumData] = await Promise.all([
    itunesFetch({ term: q, entity: 'musicArtist', media: 'music', limit: 25 }),
    itunesFetch({ term: q, entity: 'album', media: 'music', limit: 25 }),
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

// Get all albums for an artist by iTunes artist ID
export async function getArtistProfile(artistId) {
  const [albumData, songData] = await Promise.all([
    itunesLookup({ id: artistId, entity: 'album', limit: 200 }),
    itunesLookup({ id: artistId, entity: 'song', limit: 6 }),
  ])

  const artist = albumData.results?.[0] ?? null
  const albums = (albumData.results ?? [])
    .slice(1)
    .filter(r => r.wrapperType === 'collection' && r.collectionType === 'Album')
    .sort((a, b) => new Date(b.releaseDate) - new Date(a.releaseDate))

  const topSongs = (songData.results ?? [])
    .slice(1)
    .filter(r => r.kind === 'song')
    .slice(0, 5)

  return { artist, albums, topSongs }
}

// Get tracklist for an album by iTunes collection ID
export async function getAlbumDetail(albumId) {
  const data = await itunesLookup({ id: albumId, entity: 'song' })
  const album = (data.results ?? []).find(r => r.wrapperType === 'collection') ?? null
  const tracks = (data.results ?? [])
    .filter(r => r.kind === 'song')
    .sort((a, b) => (a.discNumber - b.discNumber) || (a.trackNumber - b.trackNumber))

  return { album, tracks }
}

// Find an artist on iTunes by name (for old MusicBrainz-ID entries)
export async function findArtistByName(name) {
  const data = await itunesFetch({ term: name, entity: 'musicArtist', media: 'music', limit: 1 })
  return data.results?.[0] ?? null
}

// Find an album on iTunes by name + artist
export async function findAlbumByName(name, artistName) {
  const term = [name, artistName].filter(Boolean).join(' ')
  const data = await itunesFetch({ term, entity: 'album', media: 'music', limit: 1 })
  return data.results?.[0] ?? null
}

export function formatDuration(ms) {
  if (!ms) return ''
  const total = Math.floor(ms / 1000)
  const min = Math.floor(total / 60)
  const sec = total % 60
  return `${min}:${sec.toString().padStart(2, '0')}`
}

export function releaseYear(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr).getFullYear()
}

// Extract iTunes ID from a saved entry's musicbrainz_id field
const RANDOM_GENRES = ['pop', 'rock', 'hip-hop', 'r&b', 'country', 'electronic', 'jazz', 'soul', 'indie', 'alternative', 'latin', 'classical']

export async function getRandomSong() {
  const genre = RANDOM_GENRES[Math.floor(Math.random() * RANDOM_GENRES.length)]
  const data = await itunesFetch({ term: genre, entity: 'musicTrack', media: 'music', limit: 50 })
  const songs = (data.results ?? []).filter(r => r.kind === 'song')
  if (songs.length === 0) throw new Error('No songs found')
  const song = songs[Math.floor(Math.random() * songs.length)]
  return song
}

export function itunesIdFromEntry(entry) {
  if (entry.musicbrainz_id?.startsWith('itunes-')) {
    return entry.musicbrainz_id.replace('itunes-', '')
  }
  return null
}
