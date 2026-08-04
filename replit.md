# HVCG — Lead Magnet Builder

A web app that lets small business owners create professional lead capture pages in minutes — no web designer needed. Owners either link an existing page or build a Give-Away Page (teaser copy + downloadable file behind a name/phone/email capture form). Includes template selection, AI pre-fill helpers, an example gallery, and a review/approval flow before anything goes live.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080, proxied at /api)
- `pnpm --filter @workspace/hvcg run dev` — run the frontend (Vite dev server)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string (auto-provisioned)
- Required env: `CLERK_SECRET_KEY`, `CLERK_PUBLISHABLE_KEY`, `VITE_CLERK_PUBLISHABLE_KEY` — auto-provisioned by Clerk setup

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite + Wouter (routing) + TanStack Query + Framer Motion
- Auth: Clerk (Replit-managed, cookie-based on web)
- API: Express 5 + Clerk middleware
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (v3), drizzle-zod
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — source of truth for all API contracts
- `lib/db/src/schema/` — Drizzle table definitions (leadMagnets, templates, industries, examples)
- `artifacts/api-server/src/routes/` — Express route handlers (leadMagnets, templates, industries, examples, ai)
- `artifacts/hvcg/src/` — React frontend
  - `App.tsx` — Clerk provider, routing
  - `pages/` — Landing, Dashboard, NewPath, Create, Review, Live
  - `components/layout/Shell.tsx` — authenticated app shell

## Architecture decisions

- OpenAPI-first: `lib/api-spec/openapi.yaml` drives both Zod validation schemas (server) and React Query hooks (client) via Orval codegen.
- Orval generates `zod.int()` for integer types (Zod v4 API) — OpenAPI spec uses `number` instead of `integer` to stay compatible with Zod v3.
- File uploads stored as base64 data URLs for the first build; swap to object storage for production.
- AI prefill/branding endpoints are stubbed — wire up a real LLM or web-scraping service when ready.
- Clerk proxy path is `/api/__clerk` (handled by clerkProxyMiddleware in the Express server).

## Product

- **Two paths to a live lead magnet**: paste an existing URL (live immediately) or build a Give-Away Page (form → review → approve).
- **Give-Away flow**: teaser title + description + give-away file upload + business name/location + template picker. Two optional AI helpers (pre-fill from URL, extract logo/tagline).
- **Template picker**: 5 templates (Bold Split, Clean Banner, Overlay Dark, Stacked Light, Minimal Pro).
- **Example gallery**: 12 real examples across 7 industries — filter by industry for inspiration.
- **Review screen**: live mock preview of the page. Approve to go live, or edit look/fields.
- **Post-approval**: stable share URL + copy button.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- **Zod v3 / Orval integer mismatch**: Use `type: number` (not `type: integer`) in `openapi.yaml`. Orval 8.23 emits `zod.int()` for `integer` types, but Zod v3 doesn't have that method.
- After modifying `lib/db/src/schema/`, run `pnpm run typecheck:libs` before checking artifact typechecks — otherwise new table exports aren't visible.
- Clerk dev-key warning in the browser console is expected and harmless in development.
- `json({ limit: "10mb" })` set on Express body parser to allow base64 file uploads.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
- See the `clerk-auth` skill for auth setup and troubleshooting
