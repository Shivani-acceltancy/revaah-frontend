# Backend handoff: Project posts (like TBS blog)

> **Full guide for backend + database teams:** [`REVAAH_BACKEND_IMPLEMENTATION_GUIDE.md`](./REVAAH_BACKEND_IMPLEMENTATION_GUIDE.md)  
> **TBS reference backend:** https://github.com/shubham-brideside/tbs-backend.git

**Date:** 26 May 2026  
**Frontend:** `revaah frontend` (Revaah Decor Atelier)  
**Backend:** `revaah project backend` (Spring Boot — already started)  
**Reference product:** [TBS Website](https://github.com/shubham-brideside/tbs-frontend) — blog create at `/blog/create-tbs-blog-2025` → posts appear on `/blog`

---

## What we want (product)

| TBS (blog) | Revaah (projects) |
|------------|-------------------|
| Staff opens hidden create URL | Staff: **Admin → New project** (`UploadView`) |
| Writes post, publishes | Fills project form, **Publish to library** |
| Post appears in blog list | Project appears in **Atelier** hero grid and **Projects** section |
| Detail at `/blog/:slug` | Detail when user clicks a card (`GET /projects/:id`) |

---

## Database (database team)

**Table name:** `projects` (same role as `blog_posts` on TBS — not a separate `project_posts` table unless you prefer a view name).

Minimum columns for Phase 1 (see full spec in [`DATABASE_SCHEMA_SPEC.md`](./DATABASE_SCHEMA_SPEC.md)):

| Column | Purpose |
|--------|---------|
| `id` UUID PK | |
| `title` | Card title |
| `theme` | Subtitle / theme line |
| `status` | `DRAFT` \| `PUBLISHED` \| `ARCHIVED` |
| `event_types` | `text[]` e.g. `{WEDDING,MEHENDI}` |
| `event_date` | |
| `guest_count` | |
| `narrative` | Long description on detail page |
| `venue_id` / `city_id` or denormalized names | Location on card |
| `cover_asset_id` OR `cover_url` | **Required for publish** — grid image |
| `published_at` | Set on publish |
| `created_by` | Staff user FK |
| `created_at`, `updated_at` | |

**Index for library:** `(status, published_at DESC) WHERE status = 'PUBLISHED'`

Related tables (later): `assets`, `project_palette`, `project_tags` — already in schema doc.

---

## API (backend team)

Base path: `/v1`  
Auth: `Authorization: Bearer <access_token>` on staff routes

### Endpoints the frontend calls today

| Method | Path | When |
|--------|------|------|
| `POST` | `/projects` | Save draft / create |
| `PATCH` | `/projects/:id` | Update draft |
| `POST` | `/projects/:id/publish` | **Publish** → must set `status=PUBLISHED`, `published_at=now()` |
| `GET` | `/projects?status=PUBLISHED` | **Projects grid** (Atelier + Projects nav) |
| `GET` | `/projects?status=PUBLISHED&event_type=WEDDING` | Filter chips |
| `GET` | `/projects/:id` | Project detail page |
| `GET` | `/projects/stats` | Hero counters |

### Request body (create / update) — snake_case

```json
{
  "title": "Of Tigers & Twilight",
  "theme": "Forest Royal",
  "event_types": ["WEDDING"],
  "event_date": "2025-12-15",
  "guest_count": 380,
  "venue_name": "Aman-i-Khás",
  "city_name": "Ranthambore",
  "narrative": "A four-day affair…",
  "cover_url": "https://cdn.example.com/cover.jpg"
}
```

**MVP note:** Frontend sends `cover_url` until presigned upload is built. Backend should either:

- Store `cover_url` on `projects` and return it as `cover_url` in list/detail, **or**
- Create a synthetic `assets` row and set `cover_asset_id`

Publish validation (align with TBS “post must be complete”):

- `title` present  
- `cover_url` or `cover_asset_id` present (relax `NO_COVER` only if product agrees)  
- Optional: at least one `event_types` value  

### List response shape

```json
{
  "items": [
    {
      "id": "uuid",
      "title": "Of Tigers & Twilight",
      "theme": "Forest Royal",
      "city": { "id": "uuid", "name": "Ranthambore" },
      "venue": { "id": "uuid", "name": "Aman-i-Khás" },
      "event_types": ["WEDDING"],
      "event_date": "2025-12-15",
      "subtitle": "Wedding · Forest Royal · Dec 2025",
      "cover_url": "https://…",
      "palette": ["#5C1A2B", "#B8893A"],
      "published_at": "2026-05-26T10:30:00Z"
    }
  ],
  "total": 1,
  "page": 1
}
```

Frontend also accepts a bare array `[{ ... }]` for compatibility.

### Stats response

Either shape works (frontend normalizes both):

```json
{ "project_count": 412, "city_count": 31, "venue_count": 87, "asset_count": 24000 }
```

or

```json
{ "stats": { "projects": 412, "cities": 31, "venues": 87, "assets": 24000 } }
```

### Publish response

```json
{
  "id": "uuid",
  "status": "PUBLISHED",
  "published_at": "2026-05-26T10:30:00Z"
}
```

On failure (e.g. no cover):

```json
{
  "error": {
    "code": "PUBLISH_VALIDATION_FAILED",
    "message": "Project is not ready to publish",
    "details": [{ "code": "NO_COVER", "message": "Cover image required" }]
  }
}
```

### System status (existing)

`GET /v1/system/status` → `{ "database_ready": true, ... }`  
When `database_ready` is false, frontend shows sample cards and preview login.

---

## What frontend implemented

| File | Change |
|------|--------|
| `src/lib/api.ts` | `listProjectsApi`, `fetchProjectDetailApi`, `fetchProjectStatsApi`; snake_case bodies |
| `src/lib/projects.ts` | Map API → grid cards; stats normalization |
| `src/types/project.ts` | TypeScript types |
| `src/components/views/UploadView.tsx` | Create / draft / publish + cover URL field |
| `src/components/views/LibraryView.tsx` | Loads `GET /projects?status=PUBLISHED`; refreshes after publish |
| `src/components/views/ProjectView.tsx` | Loads `GET /projects/:id` |
| `src/hooks/useAtelier.ts` | `openProject(id)`, `projectsRefreshKey`, Atelier vs Projects mode |
| `src/components/layout/TopBar.tsx` | Separate **Atelier** / **Projects** nav |

---

## Acceptance test (E2E)

1. Apply migrations → `projects` table exists; `database_ready=true`.
2. Login as curator → Admin → New project.
3. Fill title, cover URL, city, venue → **Publish to library**.
4. Open **Projects** nav → new card appears with title and cover.
5. Click card → detail shows narrative and metadata.
6. Filter **Wedding** → only projects with `WEDDING` in `event_types`.

---

## Future sections (same pattern)

| Section | Suggested table | List endpoint |
|---------|-----------------|---------------|
| Moodboards | `moodboard_items` | `GET /moodboard/items` |
| Collections | `collections`, `collection_projects` | `GET /collections` |
| Blog / journal | `journal_posts` (if needed) | `GET /journal/posts` |

Use the same **DRAFT → PUBLISHED** flow and list-by-status pattern as projects.

---

## Related docs

- [`BACKEND_API_SPEC.md`](./BACKEND_API_SPEC.md) — full API modules  
- [`DATABASE_SCHEMA_SPEC.md`](./DATABASE_SCHEMA_SPEC.md) — `projects`, `assets`, indexes
