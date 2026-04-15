import client from './client'

export async function search(q, type) {
  const { data } = await client.get('/search', { params: { q, type } })
  return data
}
