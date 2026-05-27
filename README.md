# Revaah Decor Atelier

This is the initial scaffold for the Revaah Decor Atelier website built with Vite + React + TypeScript + Tailwind CSS.

## Project publish flow (like TBS blog)

1. **Admin → New project** — create draft, optional cover image URL  
2. **Publish to library** — calls `POST /v1/projects/:id/publish`  
3. Published items appear under **Atelier** and **Projects** via `GET /v1/projects?status=PUBLISHED`

Backend handoff for your API/DB team:

- **Complete guide:** [`docs/REVAAH_BACKEND_IMPLEMENTATION_GUIDE.md`](docs/REVAAH_BACKEND_IMPLEMENTATION_GUIDE.md)
- **Short checklist:** [`docs/BACKEND_TEAM_PROJECT_POSTS.md`](docs/BACKEND_TEAM_PROJECT_POSTS.md)

## Commands

- **dev**: Start the development server
- **build**: Build the production bundle
- **preview**: Preview the production build
- **lint**: Run ESLint
- **typecheck**: Run TypeScript project references build

## Engineering documentation

| Team | Document |
|------|----------|
| **Backend / API** | [`docs/BACKEND_API_SPEC.md`](docs/BACKEND_API_SPEC.md) |
| **Database** | [`docs/DATABASE_SCHEMA_SPEC.md`](docs/DATABASE_SCHEMA_SPEC.md) |
| Index | [`docs/BACKEND_ENGINEERING_SPEC.md`](docs/BACKEND_ENGINEERING_SPEC.md) |

## Local dev (current team setup)

**Port 8080 = frontend only.** The API runs on **8081**. Swagger: http://localhost:8081/swagger-ui.html

Copy `.env.example` → `.env` (or use the values below), then:

```bash
# Terminal 1 — backend (repo path may vary on your machine)
cd "/Users/shivani/backend revaah"
mvn spring-boot:run -Dspring-boot.run.profiles=dev

# Terminal 2 — frontend
cd "/Users/shivani/revaah frontend"
npm run dev
```

### `.env` (frontend)

```bash
VITE_DEV_PORT=8080
VITE_API_PROXY_TARGET=http://localhost:8081
VITE_API_BASE_URL=
```

Restart `npm run dev` after changing `.env`. Open **http://localhost:8080** (not 8081).

| What | URL |
|------|-----|
| Frontend UI | http://localhost:8080 |
| API + Swagger | http://localhost:8081/swagger-ui.html |
| System status | http://localhost:8081/v1/system/status |

When connected, the green banner shows: **API connected · Database ready**.

### Staff login

| Field | Value |
|-------|--------|
| Email | `curator@revaahdecor.in` |
| Password | `marigold-twilight-2026` |

Then: **Admin → New project** → Save draft → **Publish** → check **Projects**.

### Alternate setup (optional)

If the API runs on **8080** instead, use `VITE_DEV_PORT=5173` and `VITE_API_PROXY_TARGET=http://localhost:8080` — stop the frontend before starting the backend on 8080.

## Demo bar

The floating demo bar at the bottom switches views during UI development (login, library, admin, etc.).
