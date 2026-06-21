# HuddleHub — Project Context for Claude

## Project Goal

This project is an entry for the **FBLA 2025-2026 Coding & Programming** competitive event, topic: **"Byte-Sized Business Boost"**.

The goal is to build a tool that helps users discover and support small, local businesses in their community. All features and code quality must satisfy the FBLA judging rubric (see below). The app is a full-stack web application (React + Supabase) that runs standalone with no programming errors.

## Git Commit Rules

**Never add a Claude co-author line to commits.** Commits must appear as authored solely by the user (sabharwalainesh). Do not include any `Co-Authored-By: Claude` or similar attribution. No exceptions.

## CLAUDE.md Maintenance Rule

**Keep this file current.** Whenever you add, remove, or rename a file or directory in the codebase, update the Codebase Structure section of this file in the same session. If a new route is added to `App.tsx`, update the Route Map table. If a new FBLA feature is implemented, update the FBLA Feature Mapping table. This file is the source of truth for project structure — it must not drift from reality.

## AI Artifacts — Git Exclusions

The following are excluded from git via `.gitignore` and must never be committed:

- `.claude/` — agent memory, settings, hooks, skills
- `skills-lock.json` — agent skill lockfile
- `PRPs/` — agent planning documents
- `make_pptx.py` — utility script not part of the app

No trace of an AI agent should appear in the GitHub repository.

---

## FBLA Rubric Requirements (110 points total)

Full rubric PDF: `/Users/aineshsab/Downloads/coding-and-programming.pdf`

### Required Topic Features
- [x] Sorting businesses by category (food, retail, services, etc.)
- [x] Allowing users to leave reviews or ratings
- [x] Sorting businesses by reviews or ratings
- [x] Saving or bookmarking favorite businesses
- [ ] Display special deals or coupons
- [x] Verification step to prevent bot activity (reCAPTCHA + receipt/doc verification)

### Scoring Criteria (what to optimize for)

| Category | Item | Max Pts |
|---|---|---|
| **Code Quality** | Language selection explained with industry terms | 5 |
| | Comments, naming conventions, proper formatting | 5 |
| | Modular, logical, readable program structure | 10 |
| **User Experience** | UX design: user journey, design rationale, accessibility | 10 |
| | Intuitive UI with clear instructions | 5 |
| | Easy navigation + intelligent feature (Q&A / smart filters) | 5 |
| | Input validation (syntactic + semantic) | 5 |
| **Functionality** | Addresses all prompt requirements | 10 |
| | Generates presentable, customizable reports | 10 |
| | Data storage with arrays/lists, clear variable scope | 5 |
| **Presentation** | Well-organized, clearly stated delivery | 10 |
| | Confidence, body language, eye contact, voice | 10 |
| | Q&A answers | 10 |
| | Adherence to competition guidelines | 10 |

**Key "Exceeds Expectations" targets:**
- Language choice explained with industry terminology
- Comments are logical, useful, and complete
- Program exhibits advanced programming knowledge
- UX design includes design rationale, user journey, and accessibility features
- Interface includes an intelligent feature (Q&A → `AskHuddleWidget`)
- Input validation at both syntactical and semantic levels
- Output reports allow user to customize and analyze information
- Complex data storage (arrays/lists) with logical variable scope

---

## Codebase Structure

```
huddlehub-spark/
├── src/
│   ├── App.tsx                          # Root: providers, router, all routes
│   ├── main.tsx                         # Entry point
│   ├── index.css / App.css              # Global styles, Tailwind base
│   │
│   ├── pages/
│   │   ├── Landing.tsx                  # Home page with hero, featured businesses
│   │   ├── Discover.tsx                 # Browse/search/filter all businesses
│   │   ├── BusinessDetail.tsx           # Single business page: reviews, map, info
│   │   ├── GooglePlaceDetail.tsx        # Google Places-sourced business detail
│   │   ├── MyHuddle.tsx                 # Saved/bookmarked businesses for logged-in user
│   │   ├── BusinessDashboard.tsx        # Owner: list of owned businesses
│   │   ├── BusinessDashboardDetail.tsx  # Owner: manage single business
│   │   ├── BusinessOnboarding.tsx       # Register/submit a new business
│   │   ├── Insights.tsx                 # Analytics dashboard for business owners
│   │   ├── Account.tsx                  # User profile and settings
│   │   ├── Auth.tsx                     # Sign in / sign up
│   │   ├── Admin.tsx                    # Admin panel (role-gated)
│   │   ├── Dashboard.tsx                # Admin-only data dashboard (RequireAdmin)
│   │   ├── Ask.tsx                      # Full-page AI Q&A
│   │   ├── About.tsx                    # About Huddle page
│   │   └── NotFound.tsx                 # 404
│   │
│   ├── components/
│   │   ├── Navbar.tsx                   # Sticky nav: links, profile dropdown, notifications
│   │   ├── Footer.tsx                   # Site footer
│   │   ├── AskHuddleWidget.tsx          # Floating AI chatbot (huddle-bot edge fn)
│   │   ├── BusinessCard.tsx             # Card shown in Discover / lists
│   │   ├── BusinessOfTheWeek.tsx        # Featured business spotlight
│   │   ├── GooglePlaceCard.tsx          # Card for Google Places results
│   │   ├── StarRating.tsx               # Reusable star rating input/display
│   │   ├── ReviewThemes.tsx             # AI-extracted review theme tags
│   │   ├── AttentionMap.tsx             # Heatmap of business view activity
│   │   ├── PulseWidget.tsx              # Live activity pulse indicator
│   │   ├── RecaptchaBox.tsx             # Google reCAPTCHA v2 wrapper (bot prevention)
│   │   ├── ReceiptVerifier.tsx          # Receipt photo upload + AI verification
│   │   ├── FeaturedManager.tsx          # Admin: manage featured businesses
│   │   ├── AddressAutocomplete.tsx      # Google address autocomplete input
│   │   ├── AccessibilityPanel.tsx       # A11y controls (font size, contrast, lang)
│   │   ├── PreferencesBanner.tsx        # Personalization prompt banner
│   │   ├── PreferencesDialog.tsx        # Category/preference selection dialog
│   │   ├── NavLink.tsx                  # Styled nav link with active state
│   │   ├── Reveal.tsx                   # Scroll-triggered reveal animation
│   │   ├── RequireAdmin.tsx             # Route guard for admin-only pages
│   │   ├── ErrorBoundary.tsx            # React error boundary wrapper
│   │   └── ui/                          # shadcn/ui component library (40+ components)
│   │
│   ├── contexts/
│   │   ├── AuthContext.tsx              # Supabase auth state, user session
│   │   └── A11yContext.tsx              # Accessibility settings + i18n (en/es)
│   │
│   ├── hooks/
│   │   ├── use-toast.ts                 # Toast notification hook
│   │   ├── use-mobile.tsx               # Mobile breakpoint detection
│   │   ├── useUserRoles.ts              # Fetch/cache user role (admin check)
│   │   └── useUserPreferences.ts        # User category preferences
│   │
│   ├── lib/
│   │   ├── utils.ts                     # cn() class merge utility
│   │   ├── i18n.ts                      # Translation strings (en/es)
│   │   ├── sorting.ts                   # Business sort logic (rating, name, etc.)
│   │   ├── geo.ts                       # Haversine distance calculation
│   │   ├── phone.ts                     # Phone number formatting
│   │   ├── preferences.ts               # Preference scoring for recommendations
│   │   └── whyThisPlace.ts              # AI "why this place" snippet generator
│   │
│   └── integrations/supabase/
│       ├── client.ts                    # Supabase JS client init
│       └── types.ts                     # Auto-generated DB types
│
├── supabase/
│   ├── config.toml                      # Supabase project config
│   ├── migrations/                      # 14 SQL migrations (schema history)
│   └── functions/
│       ├── huddle-bot/index.ts          # AI chatbot: business Q&A + site navigation
│       ├── insights-summary/index.ts    # AI-generated insights summary for owners
│       ├── review-themes/index.ts       # Extract themes from reviews via AI
│       ├── verify-receipt/index.ts      # Verify purchase receipts via AI vision
│       ├── verify-business-doc/index.ts # Verify business ownership documents
│       ├── google-place-search/index.ts # Proxy: Google Places text search
│       ├── google-place-import/index.ts # Import Google Place into DB
│       ├── google-place-reviews/index.ts# Fetch Google Place reviews
│       ├── google-address-autocomplete/ # Google address autocomplete proxy
│       ├── geocode-address/index.ts     # Geocode address to lat/lng
│       └── mapbox-token/index.ts        # Serve Mapbox token securely
│
├── public/                              # Static assets
├── scripts/                             # Build/utility scripts
├── PRPs/                                # Project requirement/planning docs
├── index.html                           # HTML entry point
├── package.json                         # Dependencies (React 18, Vite, Tailwind, etc.)
├── tailwind.config.ts                   # Tailwind theme (custom colors, gradients)
├── vite.config.ts                       # Vite build config
└── vitest.config.ts                     # Test config
```

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite |
| Styling | Tailwind CSS, shadcn/ui |
| Routing | React Router v6 |
| Backend / DB | Supabase (PostgreSQL + RLS) |
| Auth | Supabase Auth |
| Edge Functions | Deno (Supabase Functions) |
| AI | Google Gemini via Lovable AI Gateway |
| Maps | Mapbox GL JS |
| Charts | Recharts |
| Bot Prevention | Google reCAPTCHA v2 |
| Deployment | Vercel |

## Route Map

| Path | Page | Auth Required |
|---|---|---|
| `/` | Landing | No |
| `/discover` | Discover businesses | No |
| `/business/:id` | Business detail | No |
| `/google/:placeId` | Google Place detail | No |
| `/about` | About | No |
| `/auth` | Sign in / Sign up | No |
| `/my-huddle` | Saved businesses | Yes |
| `/account` | Account settings | Yes |
| `/business/onboarding` | Register a business | Yes |
| `/business-dashboard` | My businesses | Yes |
| `/business-dashboard/:id` | Manage business | Yes |
| `/insights` | Business analytics | Yes |
| `/ask` | Full-page AI chat | No |
| `/admin` | Admin panel | Admin only |
| `/dashboard` | Data dashboard | Admin only |

## Key FBLA Feature Mapping

| FBLA Requirement | Implementation |
|---|---|
| Sort by category | `Discover.tsx` category filter + `lib/sorting.ts` |
| Reviews / ratings | `BusinessDetail.tsx` + `reviews` table + `StarRating.tsx` |
| Sort by rating | `lib/sorting.ts` + Discover sort controls |
| Bookmark businesses | `MyHuddle.tsx` + `bookmarks` table |
| Special deals/coupons | — (needs implementation) |
| Bot prevention | `RecaptchaBox.tsx` (reCAPTCHA v2) + `verify-receipt` edge fn |
| Intelligent feature | `AskHuddleWidget.tsx` + `huddle-bot` edge fn (AI Q&A) |
| Input validation | Form validation throughout + edge fn input checks |
| Accessibility | `AccessibilityPanel.tsx` + `A11yContext.tsx` (font, contrast, lang) |
| Output/reports | `Insights.tsx` (charts, CSV export, filters) |
