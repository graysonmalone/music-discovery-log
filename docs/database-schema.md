# Database Schema — Music Discovery Log

**Database:** MySQL on AWS Lightsail

---

## Table: `users`

Stores registered user accounts.

```sql
CREATE TABLE users (
    id            INT          NOT NULL AUTO_INCREMENT,
    name          VARCHAR(100) NOT NULL,
    email         VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
);
```

| Column          | Type         | Constraints              | Description                        |
|-----------------|--------------|--------------------------|------------------------------------|
| id              | INT          | PK, AUTO_INCREMENT       | Unique user identifier             |
| name            | VARCHAR(100) | NOT NULL                 | Display name                       |
| email           | VARCHAR(255) | NOT NULL, UNIQUE         | Login credential                   |
| password_hash   | VARCHAR(255) | NOT NULL                 | bcrypt hash of the user's password |
| created_at      | DATETIME     | NOT NULL, DEFAULT NOW()  | Account creation timestamp         |

---

## Table: `collection_entries`

Stores each saved music entry in a user's collection.

```sql
CREATE TABLE collection_entries (
    id               INT                                        NOT NULL AUTO_INCREMENT,
    user_id          INT                                        NOT NULL,
    musicbrainz_id   VARCHAR(100)                               NOT NULL,
    entity_type      ENUM('artist', 'release')                  NOT NULL,
    name             VARCHAR(255)                               NOT NULL,
    artist_name      VARCHAR(255)                               NULL,
    tag              ENUM('loved', 'want_to_listen', 'overrated') NOT NULL,
    take             TEXT                                       NULL,
    saved_at         DATETIME                                   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at       DATETIME                                   NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

| Column          | Type                                      | Constraints              | Description                                       |
|-----------------|-------------------------------------------|--------------------------|---------------------------------------------------|
| id              | INT                                       | PK, AUTO_INCREMENT       | Unique entry identifier                           |
| user_id         | INT                                       | NOT NULL, FK → users.id  | Owner of this entry                               |
| musicbrainz_id  | VARCHAR(100)                              | NOT NULL                 | MusicBrainz MBID (e.g. artist or release UUID)    |
| entity_type     | ENUM('artist', 'release')                 | NOT NULL                 | Whether this entry is an artist or a release      |
| name            | VARCHAR(255)                              | NOT NULL                 | Artist name or release title                      |
| artist_name     | VARCHAR(255)                              | NULL                     | For releases: the artist name. Null for artists.  |
| tag             | ENUM('loved', 'want_to_listen','overrated')| NOT NULL                | User's tag for this entry                         |
| take            | TEXT                                      | NULL                     | User's personal note / opinion                    |
| saved_at        | DATETIME                                  | NOT NULL, DEFAULT NOW()  | When the entry was first saved                    |
| updated_at      | DATETIME                                  | NOT NULL, AUTO-UPDATED   | Last time the entry was edited                    |

---

## Relationships

```
users (1) ──────< collection_entries (many)
```

Each user can have many collection entries. Deleting a user cascades and deletes all their entries.

---

## Notes

- `musicbrainz_id` is stored as a string (UUID format from MusicBrainz, e.g. `a74b1b7f-71a5-4011-9441-d0b5e4122711`)
- `artist_name` is nullable because artist entries don't have a separate artist name field — the `name` column holds the artist's name directly
- `take` is nullable — users can save an entry without writing a note and add one later
- `updated_at` uses `ON UPDATE CURRENT_TIMESTAMP` so edits are tracked automatically without application-level logic
- Passwords are hashed with bcrypt before storage — the plaintext password is never persisted

---

## Index Recommendations

```sql
-- Speed up collection queries filtered by user and tag
CREATE INDEX idx_collection_user_id ON collection_entries(user_id);
CREATE INDEX idx_collection_tag ON collection_entries(user_id, tag);
```
