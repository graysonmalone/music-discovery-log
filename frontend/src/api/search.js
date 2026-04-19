import client from './client'

export async function search(q, type) {
  const { data } = await client.get('/search', { params: { q, type } })
  return data
}

export async function searchAll(q) {
  const [artists, releases] = await Promise.allSettled([
    client.get('/search', { params: { q, type: 'artist' } }),
    client.get('/search', { params: { q, type: 'release' } }),
  ])

  const artistResults = artists.status === 'fulfilled'
    ? (artists.value.data.artists ?? []).map((a) => ({
        id: a.id,
        name: a.name,
        artistName: null,
        entityType: 'artist',
        score: a.score ?? 0,
        original: a,
      }))
    : []

  const releaseResults = releases.status === 'fulfilled'
    ? (releases.value.data.releases ?? []).map((r) => ({
        id: r.id,
        name: r.title,
        artistName: r['artist-credit']?.map((c) => c.name || c.artist?.name).join(', ') || null,
        entityType: 'release',
        score: r.score ?? 0,
        original: r,
      }))
    : []

  // Merge and sort by MusicBrainz relevance score, cap at 24 results
  return [...artistResults, ...releaseResults]
    .sort((a, b) => b.score - a.score)
    .slice(0, 24)
}
