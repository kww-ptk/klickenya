# Klickenya

Kenya's all-in-one booking and property marketplace. Stays, experiences, events, rentals, services, and real estate — built for Kenya, paid via M-Pesa.

## Monorepo Structure

```
klickenya/
├── apps/
│   ├── web/          → Next.js 14 App Router (klickenya.com)
│   └── studio/       → Sanity Studio (studio.klickenya.com)
├── packages/
│   └── shared/       → Shared TypeScript types
├── reference/        → Design HTML files (read-only spec)
└── docs/             → Project documentation
```

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 9+

### Setup

```bash
# 1. Install dependencies
pnpm install

# 2. Copy environment variables
cp apps/web/.env.local.example apps/web/.env.local
cp apps/studio/.env.example apps/studio/.env

# 3. Fill in your environment variables in both .env files

# 4. Start the web app
pnpm dev

# 5. Start Sanity Studio (separate terminal)
pnpm dev:studio

# 6. Or start both simultaneously
pnpm dev:all
```

### Commands

| Command | Description |
|---|---|
| `pnpm dev` | Start Next.js dev server (port 3000) |
| `pnpm dev:studio` | Start Sanity Studio dev server (port 3333) |
| `pnpm dev:all` | Start both dev servers in parallel |
| `pnpm build` | Build Next.js for production |
| `pnpm build:studio` | Build Sanity Studio for deployment |
| `pnpm lint` | Run ESLint on web app |

## Service Dashboards

- **Vercel**: https://vercel.com/dashboard
- **Supabase**: https://supabase.com/dashboard
- **Sanity**: https://sanity.io/manage
- **Resend**: https://resend.com/overview
- **GoHighLevel**: https://app.gohighlevel.com

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14, TypeScript, Tailwind CSS |
| CMS | Sanity.io |
| Database | Supabase (Postgres + pgvector) |
| Auth | Supabase Auth (admin-only in V1) |
| Email | Resend + React Email |
| Hosting | Vercel |
