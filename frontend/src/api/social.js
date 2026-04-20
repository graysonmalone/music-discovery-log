import client from './client'

export async function searchUsers(q) {
  const { data } = await client.get('/users/search', { params: { q } })
  return data
}

export async function getPublicProfile(id) {
  const { data } = await client.get(`/users/${id}`)
  return data
}

export async function followUser(id) {
  const { data } = await client.post(`/follows/${id}`)
  return data
}

export async function unfollowUser(id) {
  const { data } = await client.delete(`/follows/${id}`)
  return data
}

export async function getFollowing() {
  const { data } = await client.get('/follows')
  return data
}

export async function getFollowers() {
  const { data } = await client.get('/followers')
  return data
}

export async function getFeed() {
  const { data } = await client.get('/feed')
  return data
}

export async function getNotifications() {
  const { data } = await client.get('/notifications')
  return data
}

export async function markNotificationsRead() {
  const { data } = await client.post('/notifications/read')
  return data
}
