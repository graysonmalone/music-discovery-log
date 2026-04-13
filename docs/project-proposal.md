# Project Proposal — Music Discovery Log

## What I'm Building

Music Discovery Log is a personal music journal web application. Users can search for artists and albums using the MusicBrainz API, save them to a personal collection with a tag, and write a short note about each one.

## The Problem

Music listeners discover new artists and albums constantly — through streaming recommendations, friends, playlists, and reviews. But there's no simple, lightweight way to keep a personal record of your opinions and discoveries. Streaming apps track listening history but don't let you tag something "overrated" or jot down why an album resonated with you. Note-taking apps work but aren't built for music.

## My Solution

A focused personal journal for music discovery. You search a global music database, save what you find, label it with how you feel about it, and write your take. Your full collection lives in one place and is filterable by tag so you can quickly find everything you've loved or everything you still want to check out.

## Target Audience

Music listeners who actively seek out new artists and albums and want an organized, searchable record of their opinions — not passive listeners, but people who treat music discovery as a hobby.

## Value Proposition

Music Discovery Log helps music listeners track and organize everything they discover by letting them search a global music database, save entries with personal tags and written takes, and browse their full collection in one place.

## MVP Features

1. **User authentication** — register and log in with email and password
2. **Music search** — search for artists and albums using the MusicBrainz API
3. **Save to collection** — save a search result with a tag (loved, want to listen, overrated)
4. **Write a take** — add or edit a short personal note on any saved entry
5. **Browse collection** — view all saved entries, filter by tag

## What I'm Not Building (Yet)

- Social or friends feed
- Last.fm integration
- Genre-based statistics or charts
- Listening history tracking
- Public profiles
- Mobile app

These are intentionally deferred to keep the MVP focused and achievable within the course timeline.

## Why MusicBrainz

MusicBrainz is a free, open music encyclopedia with a public API and no authentication required for read access. It has comprehensive data on artists and releases worldwide, making it a practical and realistic third-party API integration for this project.

## Course Context

This is my Module 4 project in a 7-module web development course. It demonstrates full-stack development with React, Go, MySQL, JWT authentication, a third-party API integration, and automated deployment via GitHub Actions to AWS Lightsail.
