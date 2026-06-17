# Architecture — nobame Web

Personal bio site with visitor tracking and an admin analytics dashboard.

## Overview

```mermaid
flowchart TB
    subgraph Client
        A[index.html + script.js]
        B[admin.html + admin-script.js]
    end

    subgraph Server["Express (server.js) / Vercel Serverless"]
        T[/api/track]
        L[/api/login]
        S[/api/stats]
        V[/api/visitors]
        E[/api/export]
        P[/api/change-password]
    end

    subgraph Storage
        PG[(PostgreSQL)]
        KV[(Vercel KV / Redis)]
    end

    A --> T
    B --> L
    B --> S
    B --> V
    B --> E
    B --> P
    T --> PG
    T --> KV
    L --> PG
    L --> KV
    S --> PG
    S --> KV
    V --> PG
    V --> KV
```

## Deployment Modes

| Mode | Entry | Storage | Use case |
|------|-------|---------|----------|
| **Railway / self-hosted** | `server.js` | PostgreSQL | Full Express app |
| **Vercel** | `api/*.js` | Vercel KV | Serverless functions |

Both modes share `lib/auth.js` for JWT-based admin authentication.

## Components

### Frontend (`public/`)

- **Landing page** — theme toggle, session tracking, PWA manifest
- **Admin panel** — login, stats charts (Chart.js), visitor table, CSV/JSON export

### Backend

| Module | Responsibility |
|--------|----------------|
| `server.js` | Express app, PostgreSQL pool, rate limiting, Helmet |
| `lib/auth.js` | JWT sign/verify, admin password resolution |
| `lib/cors.js` | CORS helpers for serverless routes |
| `api/*.js` | Vercel-compatible serverless handlers |

### Data Model (PostgreSQL)

- `visitors` — IP, geo, browser, OS, session duration
- `admin_password` — single-row bcrypt hash
- `sessions` — visitor session tracking

### Authentication Flow

1. Admin submits password → `POST /api/login`
2. Server validates bcrypt hash → returns signed JWT
3. Client stores JWT in `localStorage` as `admin_token`
4. Protected requests send `Authorization: Bearer <token>`
5. Server verifies HMAC signature and expiry

## Security Layers

- Helmet HTTP headers (Express mode)
- Rate limiting on `/api/login` (5 attempts / 15 min)
- General API rate limit (100 req/min)
- CORS restricted to `ALLOWED_ORIGINS`
- Admin routes require valid JWT

## Configuration

See `.env.example` for all environment variables.

## Tests

```bash
npm test
```

Jest + Supertest against exported Express `app`.
