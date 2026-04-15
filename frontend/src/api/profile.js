import client from './client'

export async function getProfile() {
  const { data } = await client.get('/profile')
  return data
}
