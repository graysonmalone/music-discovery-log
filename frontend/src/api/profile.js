import client from './client'

export async function getProfile() {
  const { data } = await client.get('/profile')
  return data
}

export async function updateName(name) {
  const { data } = await client.put('/profile', { name })
  return data
}
