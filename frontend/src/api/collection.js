import client from './client'

export async function getCollection(tag) {
  const params = tag ? { tag } : {}
  const { data } = await client.get('/collection', { params })
  return data
}

export async function getEntry(id) {
  const { data } = await client.get(`/collection/${id}`)
  return data.entry
}

export async function createEntry(entry) {
  const { data } = await client.post('/collection', entry)
  return data.entry
}

export async function updateEntry(id, updates) {
  const { data } = await client.put(`/collection/${id}`, updates)
  return data.entry
}

export async function deleteEntry(id) {
  const { data } = await client.delete(`/collection/${id}`)
  return data
}
