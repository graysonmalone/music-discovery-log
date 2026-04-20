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

export async function toggleLike(itemType, itemId) {
  const { data } = await client.post('/like', { item_type: itemType, item_id: itemId })
  return data // { liked, like_count }
}

export async function getComments(entryId) {
  const { data } = await client.get(`/entries/${entryId}/comments`)
  return data
}

export async function createComment(entryId, content) {
  const { data } = await client.post(`/entries/${entryId}/comments`, { content })
  return data
}

export async function deleteComment(commentId) {
  const { data } = await client.delete(`/comments/${commentId}`)
  return data
}

export async function getUserCollection(userId, tag) {
  const params = tag ? { tag } : {}
  const { data } = await client.get(`/users/${userId}/collection`, { params })
  return data
}
