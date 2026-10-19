# HuddleHub

**Discover and support small, local businesses in your community.**

HuddleHub is a full-stack web application built as an entry for the **FBLA 2025-2026 Coding & Programming** competitive event ("Byte-Sized Business Boost"). It lets users browse, search, review, and bookmark local businesses, while giving business owners a dashboard to manage their listings and track analytics.

---

## Features

- **Browse and search** local businesses with category and keyword filters
- **Sort** businesses by rating, name, or category
- **Star ratings and reviews** — leave, read, and sort by community reviews
- **Bookmarks** — save favorite businesses to a personal "My Huddle" list
- **AI chatbot** (AskHuddleWidget) — ask natural-language questions about businesses and site navigation
- **Business owner dashboard** — manage listings, view analytics, and export insights
- **AI-powered insights** — auto-generated summaries and review theme extraction for owners
- **Google Places integration** — search and import external business listings
- **Receipt and document verification** — AI vision checks for purchase receipts and ownership docs
- **Accessibility panel** — adjustable font size, contrast modes, and English/Spanish language toggle
- **Admin panel** — manage featured businesses and view platform-wide data
- **Bot prevention** — reCAPTCHA-style verification step on sensitive forms

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite 5 |
| Styling | Tailwind CSS 3, shadcn/ui (Radix UI) |
| Routing | React Router v6 |
| Backend / Database | Supabase (PostgreSQL with Row-Level Security) |
| Auth | Supabase Auth |
| Edge Functions | Deno (Supabase Functions) |
| AI | Google Gemini via an OpenAI-compatible AI gateway |
| Maps | Mapbox GL JS |
| Charts | Recharts |
| Data Fetching | TanStack Query v5 |
| Forms | React Hook Form + Zod |
| Deployment | Vercel |

---

## Getting Started

### Prerequisites

- Node.js 18 or later
- npm or a compatible package manager
- A Supabase project (for database, auth, and edge functions)
- An AI gateway API key (for Gemini-powered edge functions)
- A Google Places API key (for business search and address autocomplete)
- A Mapbox public token (for the interactive map)

### Installation

```bash
git clone https://github.com/sabharwalainesh/huddlehub-spark.git
cd huddlehub-spark
npm install
```

### Environment Variables

The frontend Supabase credentials are embedded in `src/integrations/supabase/client.ts` for this project's deployment. If you are connecting to your own Supabase project, update that file or create a `.env` file at the project root:

```env
VITE_SUPABASE_URL=https://<your-project-ref>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<your-supabase-anon-key>
VITE_SUPABASE_PROJECT_ID=<your-project-ref>
```

The Supabase edge functions require the following secrets, set via `supabase secrets set` or the Supabase dashboard:

| Secret | Purpose |
|---|---|
| `GOOGLE_PLACES_API_KEY` | Google Places search, address autocomplete, and geocoding |
| `AI_GATEWAY_API_KEY` | AI gateway — Gemini model access for chatbot, insights, and receipt verification |
| `MAPBOX_PUBLIC_TOKEN` | Served to the client by the `mapbox-token` edge function |
| `SUPABASE_SERVICE_ROLE_KEY` | Service-role database access used internally by edge functions |

### Running the Development Server

```bash
npm run dev
```

The app starts at `http://localhost:8080`.

### Other Scripts

| Command | Description |
|---|---|
| `npm run build` | Production build |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Run ESLint |
| `npm test` | Run the test suite once (Vitest) |
| `npm run test:watch` | Run tests in watch mode |

---

## Project Structure

```
src/
├── pages/          # Route-level page components (Landing, Discover, BusinessDetail, etc.)
├── components/     # Reusable UI components (Navbar, AskHuddleWidget, StarRating, etc.)
│   └── ui/         # shadcn/ui component library
├── contexts/       # React contexts (AuthContext, A11yContext)
├── hooks/          # Custom hooks (useUserRoles, useUserPreferences, use-toast)
├── lib/            # Utility functions (sorting, geo, i18n, phone formatting)
└── integrations/
    └── supabase/   # Supabase client and auto-generated database types

supabase/
├── migrations/     # SQL migration history
└── functions/      # Deno edge functions (huddle-bot, verify-receipt, google-place-search, etc.)
```

---

## Route Map

| Path | Page | Auth Required |
|---|---|---|
| `/` | Landing | No |
| `/discover` | Browse businesses | No |
| `/business/:id` | Business detail | No |
| `/google/:placeId` | Google Place detail | No |
| `/about` | About | No |
| `/auth` | Sign in / Sign up | No |
| `/ask` | Full-page AI chat | No |
| `/my-huddle` | Saved businesses | Yes |
| `/account` | Account settings | Yes |
| `/business/onboarding` | Register a business | Yes |
| `/business-dashboard` | My businesses | Yes |
| `/business-dashboard/:id` | Manage a business | Yes |
| `/insights` | Business analytics | Yes |
| `/admin` | Admin panel | Admin only |
| `/dashboard` | Data dashboard | Admin only |

---

## Deployment

The project is deployed on **Vercel**. Connect the repository to a Vercel project and configure environment variables in the Vercel dashboard. Edge functions are deployed separately to Supabase using the Supabase CLI:

```bash
supabase functions deploy
```

---

## License

This project is a student competition entry and is not licensed for redistribution.
