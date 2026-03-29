# LESAVI VI SURAMADU — AM Dashboard

Dashboard monitoring performa Account Manager Telkom Witel Suramadu.

## Stack
- **Frontend**: React 19 + Vite + Tailwind + shadcn/ui
- **Backend**: Express 5 + Drizzle ORM (PostgreSQL)
- **Struktur**: pnpm monorepo

## Struktur Direktori
```
artifacts/
  telkom-am-dashboard/   # Frontend React
  api-server/            # Backend Express API
lib/
  db/                    # Drizzle schema & config
  api-spec/              # OpenAPI spec
  api-zod/               # Zod types (generated)
  api-client-react/      # React Query hooks (generated)
```
