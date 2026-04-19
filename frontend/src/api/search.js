import client from './client'

export async function search(q, type) {
  const { data } = await client.get('/search', { params: { q, type } })
  return data
}

export async function searchAll(q) {
  // Sequential requests — MusicBrainz rate-limits parallel calls from the same server IP
  let artistResults = []
  let releaseResults = []
  let errorCount = 0

  try {
    const res = await client.get('/search', { params: { q, type: 'artist' } })
    artistResults = (res.data.artists ?? []).map((a) => ({
      id: a.id,
      name: a.name,
      artistName: null,
      entityType: 'artist',
      score: a.score ?? 0,
    }))
  } catch {
    errorCount++
  }

  try {
    const res = await client.get('/search', { params: { q, type: 'release' } })
    releaseResults = (res.data.releases ?? []).map((r) => ({
      id: r.id,
      name: r.title,
      artistName: r['artist-credit']?.map((c) => c.name || c.artist?.name).join(', ') || null,
      entityType: 'release',
      score: r.score ?? 0,
    }))
  } catch {
    errorCount++
  }

  if (errorCount === 2) {
    throw new Error('Search failed. Please try again.')
  }

  return [...artistResults, ...releaseResults]
    .sort((a, b) => b.score - a.score)
    .slice(0, 24)
}
