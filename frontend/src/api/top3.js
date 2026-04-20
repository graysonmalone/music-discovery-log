import client from './client'

export async function getTop3() {
  const { data } = await client.get('/top3')
  return data
}

export async function addTop3(item) {
  // item = { id (iTunes), entityType, name, artworkUrl, artistName }
  const { data } = await client.post('/top3', {
    itunes_id: item.id,
    entity_type: item.entityType,
    name: item.name,
    artist_name: item.artistName ?? null,
    artwork_url: item.artworkUrl ?? null,
  })
  return data
}

export async function removeTop3(itunesId) {
  const { data } = await client.delete(`/top3/${itunesId}`)
  return data
}

export async function getPublicTop3(userId) {
  const { data } = await client.get(`/users/${userId}/top3`)
  return data
}
