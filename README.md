# WeldSync

Robotic welding planning system for Curval Metalworks. Built with Next.js 14+ (App Router), TypeScript, Supabase, and Tailwind CSS.

## Stack

- **Framework:** Next.js 14+ with App Router
- **Language:** TypeScript (strict mode)
- **Styling:** Tailwind CSS
- **Database:** Supabase (PostgreSQL)
- **Drag & Drop:** @dnd-kit/core + @dnd-kit/sortable
- **Charts:** Recharts
- **Validation:** Zod
- **Deployment:** Vercel

## Getting Started

### 1. Clone the repo

```bash
git clone https://github.com/freskhu/weldsync.git
cd weldsync
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables

```bash
cp .env.example .env.local
```

Edit `.env.local` with your Supabase project credentials:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

### 4. Set up Supabase

1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. Run the migration files in order in the Supabase SQL Editor:
   - `supabase/migrations/00001_create_enums.sql`
   - `supabase/migrations/00002_create_tables.sql`
   - `supabase/migrations/00003_create_indexes.sql`
   - `supabase/migrations/00004_seed_robots.sql`

### 5. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

The app runs in offline mode without Supabase credentials — you can develop UI without a database connection.

## Project Structure

```
src/
  app/                    # App Router pages
    dashboard/            # Production overview
    projects/             # Project & piece management
    planning/             # Drag-and-drop robot allocation
    calendar/             # Weekly schedule view
    programs/             # Welding program library
    robots/               # Robot configuration
  components/             # Shared UI components
  lib/                    # Utilities
    supabase.ts           # Browser Supabase client
    supabase-server.ts    # Server Supabase client
    types.ts              # TypeScript domain types
    validations/          # Zod schemas
supabase/
  migrations/             # SQL migration files
```

## Database Schema

- **Robot** — Welding robots with capacity, setup type, and capabilities
- **Project** — Client projects with deadline and status tracking
- **Piece** — Individual pieces to weld, linked to projects and optionally to robots/programs
- **Program** — Welding programs (TP/LS files) with template support and full-text search

See `supabase/migrations/` for the full schema.
