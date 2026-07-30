# Project rules

## Database queries (Neon Postgres via Prisma)

This project previously exhausted Neon's free-tier data transfer quota because
`prisma.*.findMany()` calls fetched full rows (including large/unused columns)
on every page load, with no cross-request caching. To prevent a repeat:

- Never write a bare `findMany()`/`findUnique()` without an explicit `select`
  (or a deliberately scoped `include`). Only fetch the columns the caller
  actually uses.
- Never store binary/base64 data in a Postgres column (e.g. `data:image/...;base64,...`).
  Images/files belong in blob storage (Vercel Blob); the DB should only hold
  the resulting URL string.
- Data fetchers used by public pages (home, schedule, media, draws, etc.)
  should be wrapped in `unstable_cache` with a `revalidate` window and a tag,
  not left to hit Postgres on every request. Pair this with `revalidateTag(...)`
  calls in the write paths (POST/PATCH/DELETE routes) that mutate that data,
  so edits still show up immediately instead of waiting out the window.
- Admin-only dashboards that need live data can skip caching, but should still
  use `select` to trim unused columns — freshness and field-trimming are
  separate concerns.
