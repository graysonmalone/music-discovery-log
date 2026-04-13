# Architecture — Music Discovery Log

## Overview

A standard single-page application backed by a REST API. The React frontend communicates with the Go backend over HTTP. The backend handles authentication, proxies MusicBrainz search requests, and manages all database operations.

```
Browser (React/Vite SPA)
        │
        │ HTTP/JSON
        ▼
Go API Server (Chi router)
        │
        ├──► MySQL Database (users, collection_entries)
        │
        └──► MusicBrainz API (search proxy)
```

## Frontend

**Tech:** React + Vite, Tailwind CSS, Shadcn/ui, TanStack Query

TanStack Query manages all server state — fetching, caching, and invalidating API responses. No manual fetch logic in components.

JWT tokens are stored in localStorage and attached as `Authorization: Bearer <token>` headers on all authenticated requests.

### Pages and Routes

| Path               | Component         | Auth Required | Description                                      |
|--------------------|-------------------|---------------|--------------------------------------------------|
| `/`                | Landing           | No            | Marketing/intro page. Redirects to /collection if logged in. |
| `/register`        | Register          | No            | Registration form                                |
| `/login`           | Login             | No            | Login form                                       |
| `/search`          | Search            | Yes           | Search MusicBrainz, view results as cards, save with a tag |
| `/collection`      | Collection        | Yes           | All saved entries with tag filter tabs           |
| `/collection/:id`  | EntryDetail       | Yes           | Single entry — view, edit take, change tag, delete |
| `/profile`         | Profile           | Yes           | User info and entry counts grouped by tag        |

### User Flow

1. A new visitor lands on `/` and sees the landing page. They click Register.
2. After registering at `/register`, they are redirected to `/collection` (empty state).
3. They navigate to `/search`, type an artist or album name, and see results as cards.
4. They click Save on a result, choose a tag (loved / want to listen / overrated), optionally write a take, and confirm.
5. They navigate to `/collection` to see everything they've saved. They use the tag filter tabs to narrow the list.
6. They click an entry to open `/collection/:id` where they can edit the tag or take, or delete the entry.
7. They visit `/profile` to see their name, email, and a count of entries by tag.
8. A logout button in the nav clears the JWT and redirects to `/`.

### Navigation

A persistent top navigation bar is present on all authenticated pages with links to Search, Collection, and Profile. Unauthenticated users only see Login and Register.

### Component Structure (planned)

```
src/
├── components/
│   ├── ui/              # Shadcn/ui primitives
│   ├── NavBar.jsx
│   ├── SearchCard.jsx   # Single search result with Save button
│   ├── EntryCard.jsx    # Single collection entry card
│   └── TagBadge.jsx     # Colored tag label
├── pages/
│   ├── Landing.jsx
│   ├── Login.jsx
│   ├── Register.jsx
│   ├── Search.jsx
│   ├── Collection.jsx
│   ├── EntryDetail.jsx
│   └── Profile.jsx
├── hooks/
│   └── useAuth.js       # Auth state and token management
├── api/
│   └── client.js        # Axios/fetch instance with auth headers
└── main.jsx
```

## Backend

**Tech:** Go with Chi router

The server exposes a JSON REST API. All `/api/collection` and `/api/profile` routes require a valid JWT. The `/api/search` route proxies requests to MusicBrainz and also requires auth.

### Directory Structure (planned)

```
backend/
├── main.go              # Entry point, server setup
├── routes/
│   └── routes.go        # Route registration
├── handlers/
│   ├── auth.go          # Register, Login
│   ├── search.go        # MusicBrainz proxy
│   ├── collection.go    # CRUD for collection entries
│   └── profile.go       # Profile and counts
├── middleware/
│   └── auth.go          # JWT validation middleware
├── db/
│   └── db.go            # MySQL connection and helpers
└── models/
    ├── user.go
    └── entry.go
```

### API Endpoints

| Method | Path                    | Auth | Request Body / Params                          | Response                        |
|--------|-------------------------|------|------------------------------------------------|---------------------------------|
| POST   | /api/auth/register      | No   | `{ name, email, password }`                    | `{ user, token }`               |
| POST   | /api/auth/login         | No   | `{ email, password }`                          | `{ user, token }`               |
| GET    | /api/search             | Yes  | `?q=QUERY&type=artist\|release`                | MusicBrainz results (proxied)   |
| GET    | /api/collection         | Yes  | `?tag=loved\|want_to_listen\|overrated` (opt.) | `[ ...entries ]`                |
| POST   | /api/collection         | Yes  | `{ musicbrainz_id, entity_type, name, artist_name, tag, take }` | `{ entry }` |
| GET    | /api/collection/:id     | Yes  | —                                              | `{ entry }`                     |
| PUT    | /api/collection/:id     | Yes  | `{ tag, take }`                                | `{ entry }`                     |
| DELETE | /api/collection/:id     | Yes  | —                                              | `{ message }`                   |
| GET    | /api/profile            | Yes  | —                                              | `{ user, counts: { loved, want_to_listen, overrated } }` |

### Example Requests and Responses

**POST /api/auth/register**
```json
// Request
{ "name": "Grayson", "email": "grayson@example.com", "password": "hunter2" }

// Response 201
{ "user": { "id": 1, "name": "Grayson", "email": "grayson@example.com" }, "token": "eyJhbGci..." }
```

**POST /api/auth/login**
```json
// Request
{ "email": "grayson@example.com", "password": "hunter2" }

// Response 200
{ "user": { "id": 1, "name": "Grayson", "email": "grayson@example.com" }, "token": "eyJhbGci..." }
```

**POST /api/collection**
```json
// Request
{
  "musicbrainz_id": "a74b1b7f-71a5-4011-9441-d0b5e4122711",
  "entity_type": "artist",
  "name": "Radiohead",
  "artist_name": null,
  "tag": "loved",
  "take": "One of the most important bands of the 90s."
}

// Response 201
{
  "entry": {
    "id": 42,
    "musicbrainz_id": "a74b1b7f-71a5-4011-9441-d0b5e4122711",
    "entity_type": "artist",
    "name": "Radiohead",
    "tag": "loved",
    "take": "One of the most important bands of the 90s.",
    "saved_at": "2026-04-13T17:00:00Z"
  }
}
```

**GET /api/collection?tag=loved**
```json
// Response 200
[
  {
    "id": 42,
    "entity_type": "artist",
    "name": "Radiohead",
    "tag": "loved",
    "take": "One of the most important bands of the 90s.",
    "saved_at": "2026-04-13T17:00:00Z"
  }
]
```

**GET /api/profile**
```json
// Response 200
{
  "user": { "id": 1, "name": "Grayson", "email": "grayson@example.com", "created_at": "2026-04-13T12:00:00Z" },
  "counts": { "loved": 12, "want_to_listen": 5, "overrated": 3 }
}
```

### Authentication Flow

1. User registers or logs in → backend returns a signed JWT
2. Frontend stores JWT in localStorage
3. All subsequent requests include `Authorization: Bearer <token>`
4. JWT middleware validates the token and injects the user ID into the request context

### MusicBrainz Proxy

The `/api/search` endpoint forwards the query to the MusicBrainz API and returns the results. This keeps the API key–free MusicBrainz calls server-side and allows for future rate-limiting or caching.

MusicBrainz base URL: `https://musicbrainz.org/ws/2/`

Example: `GET /api/search?q=radiohead&type=artist` proxies to `https://musicbrainz.org/ws/2/artist?query=radiohead&fmt=json`

## Database

MySQL hosted on AWS Lightsail. See [database-schema.md](database-schema.md) for full table definitions.

## Deployment

- **Server:** AWS Lightsail (existing server, shared with previous course project)
- **Domain:** grayson-webdev.org
- **TLS:** Let's Encrypt (already configured)
- **Web server:** Nginx (reverse proxy to Go backend, serves React build)
- **CI/CD:** GitHub Actions — on push to `main`, SSH into Lightsail, pull, build, and restart

### Deployment Flow

```
git push → GitHub Actions
               │
               ▼
        SSH into Lightsail
               │
        ├── pull latest code
        ├── build React (npm run build)
        ├── build Go binary (go build)
        └── restart Go server (systemd)
```
