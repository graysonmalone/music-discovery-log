# Music Discovery Log

A personal music journal web app. Search for artists and albums, save them to your collection, tag each entry, and write a short personal take on what you think.

## What It Does

- Search the global MusicBrainz music database for artists and albums
- Save entries to your personal collection with a tag: **loved**, **want to listen**, or **overrated**
- Write a short personal note (your "take") on any saved entry
- Browse your full collection and filter by tag
- View your profile with entry counts by tag

## Tech Stack

- **Frontend:** React + Vite, Tailwind CSS, Shadcn/ui, TanStack Query
- **Backend:** Go (Chi router)
- **Database:** MySQL on AWS Lightsail
- **Auth:** JWT tokens
- **Deployment:** AWS Lightsail + GitHub Actions

## Project Structure

```
music-discovery-log/
├── frontend/       # React/Vite app
├── backend/        # Go API server
├── docs/           # Project documentation
└── .github/        # GitHub Actions workflows
```

## Documentation

- [Project Proposal](docs/project-proposal.md)
- [Architecture](docs/architecture.md)
- [Database Schema](docs/database-schema.md)

## Live App

[https://grayson-webdev.org](https://grayson-webdev.org)

## Course Context

This is a Module 4 project for a web development course. The goal is a fully deployed MVP demonstrating a full-stack React + Go application with authentication, a third-party API integration, and a relational database.
