# CLAUDE.md — Music Discovery Log

This file gives AI assistants context about the project. Read it before making any suggestions or changes.

## What This Project Is

Music Discovery Log is a personal music journal web app. Users search for artists and albums via the MusicBrainz API, save them to a personal collection, tag each entry (loved, want to listen, overrated), and write a short personal take on each one.

This is a course project (Module 4 of 7) for a web development curriculum. The goal is a working, deployed MVP — not a production-scale system.

## Tech Stack

| Layer      | Technology                                      |
|------------|-------------------------------------------------|
| Frontend   | React + Vite, Tailwind CSS, Shadcn/ui, TanStack Query |
| Backend    | Go (standard library or Chi router)             |
| Database   | MySQL on AWS Lightsail                          |
| Auth       | JWT tokens stored in localStorage               |
| Deployment | AWS Lightsail, GitHub Actions, HTTPS via Let's Encrypt |

## Repository Structure

```
music-discovery-log/
├── frontend/          # React/Vite app
├── backend/           # Go API server
├── docs/              # Project documentation
│   ├── project-proposal.md
│   ├── architecture.md
│   └── database-schema.md
├── .github/
│   └── workflows/
│       └── deploy.yml
├── CLAUDE.md          # This file
└── README.md
```

## Pages

| Path               | Description                                              |
|--------------------|----------------------------------------------------------|
| `/`                | Landing page — redirects to /collection if logged in     |
| `/register`        | Registration form                                        |
| `/login`           | Login form                                               |
| `/search`          | Search MusicBrainz, display results, save with a tag     |
| `/collection`      | All saved entries with tag filter                        |
| `/collection/:id`  | Single entry detail with Edit/Delete                     |
| `/profile`         | User info and entry counts by tag                        |

## API Endpoints

| Method | Path                    | Description                              |
|--------|-------------------------|------------------------------------------|
| POST   | /api/auth/register      | Register — { name, email, password }     |
| POST   | /api/auth/login         | Login — { email, password } → JWT        |
| GET    | /api/search             | Proxy to MusicBrainz (?q=&type=)         |
| GET    | /api/collection         | Get user's collection (optional tag=)    |
| POST   | /api/collection         | Save new entry                           |
| GET    | /api/collection/:id     | Get single entry                         |
| PUT    | /api/collection/:id     | Update entry (tag, take)                 |
| DELETE | /api/collection/:id     | Delete entry                             |
| GET    | /api/profile            | User info and counts by tag              |

## Database Tables

**users** — id, name, email, password_hash, created_at

**collection_entries** — id, user_id (FK), musicbrainz_id, entity_type (artist|release), name, artist_name, tag (loved|want_to_listen|overrated), take, saved_at, updated_at

## MVP Features (in scope)

1. User authentication (register + login)
2. MusicBrainz music search
3. Save to collection with a tag
4. Write/edit a personal take on each entry
5. Browse collection filtered by tag

## Out of Scope (do not add)

- Social/friends feed
- Last.fm integration
- Genre statistics or charts
- Listening history tracking
- Public profiles
- Mobile app

## Development Guidelines

- Keep it simple — this is a course project, not a production system
- No over-engineering: avoid abstractions that aren't needed for the MVP
- Backend: standard Go patterns, no heavy frameworks
- Frontend: use TanStack Query for all server state; avoid manual fetch logic scattered in components
- Auth: JWT in localStorage is intentional for this course context
- Do not add features, refactoring, or "improvements" beyond what is explicitly requested
- Do not create extra files or folders beyond the defined structure

## Deployment

The app deploys to an existing AWS Lightsail server at **grayson-webdev.org** via GitHub Actions on push to `main`. The server already has Nginx and Let's Encrypt configured from a previous project.
