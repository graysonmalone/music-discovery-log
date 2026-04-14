-- name: GetUserByEmail :one
SELECT id, name, email, password_hash, created_at
FROM users
WHERE email = ?
LIMIT 1;

-- name: GetUserByID :one
SELECT id, name, email, password_hash, created_at
FROM users
WHERE id = ?
LIMIT 1;

-- name: CreateUser :execresult
INSERT INTO users (name, email, password_hash)
VALUES (?, ?, ?);

-- name: ListEntriesByUser :many
SELECT id, user_id, musicbrainz_id, entity_type, name, artist_name, tag, take, saved_at, updated_at
FROM collection_entries
WHERE user_id = ?
ORDER BY saved_at DESC;

-- name: ListEntriesByUserAndTag :many
SELECT id, user_id, musicbrainz_id, entity_type, name, artist_name, tag, take, saved_at, updated_at
FROM collection_entries
WHERE user_id = ? AND tag = ?
ORDER BY saved_at DESC;

-- name: GetEntryByID :one
SELECT id, user_id, musicbrainz_id, entity_type, name, artist_name, tag, take, saved_at, updated_at
FROM collection_entries
WHERE id = ? AND user_id = ?
LIMIT 1;

-- name: CreateEntry :execresult
INSERT INTO collection_entries (user_id, musicbrainz_id, entity_type, name, artist_name, tag, take)
VALUES (?, ?, ?, ?, ?, ?, ?);

-- name: UpdateEntry :exec
UPDATE collection_entries
SET tag = ?, take = ?
WHERE id = ? AND user_id = ?;

-- name: DeleteEntry :exec
DELETE FROM collection_entries
WHERE id = ? AND user_id = ?;

-- name: CountEntriesByTag :many
SELECT tag, COUNT(*) AS count
FROM collection_entries
WHERE user_id = ?
GROUP BY tag;
