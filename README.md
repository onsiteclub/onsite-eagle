# OnSite Eagle

AI-powered construction site monitoring and progress tracking system.

## Apps

| App | Description | Target Users |
|-----|-------------|--------------|
| **Web** | Full dashboard with plan scanner, site map, analytics | Managers, Supervisors |
| **Dashboard** | Mobile version of the dashboard | Managers on-site |
| **Worker** | Photo submission and task tracking | Field workers |

## Features

- **Plan Scanner**: Upload subdivision plans, AI extracts lot information and generates interactive SVG maps
- **Photo Validator**: AI validates construction phase photos against 66 checklist items
- **Interactive Site Map**: SVG-based map with color-coded house statuses
- **Timeline**: Chronological activity log for each house
- **Worker App**: Native app for field workers to capture and submit photos

## Tech Stack

- **Monorepo**: Turborepo
- **Web**: Next.js 16, React 19, Tailwind CSS 4
- **Mobile**: Expo (React Native) - 2 apps
- **Database**: Supabase (PostgreSQL)
- **AI**: OpenAI GPT-4o Vision
- **Shared**: TypeScript types and utilities

## Project Structure

```
onsite-eagle/
├── apps/
│   ├── web/                    # Next.js web dashboard
│   │   └── src/
│   │       ├── app/api/        # AI endpoints
│   │       └── components/     # React components
│   ├── dashboard/              # Manager mobile app (Expo)
│   │   └── app/                # Screens with Expo Router
│   └── worker/                 # Worker mobile app (Expo)
│       └── app/
│           ├── (tabs)/         # Tab navigation
│           │   ├── index.tsx   # House cards/agenda
│           │   └── submit.tsx  # Photo submission
│           └── house/[id].tsx  # House details + timeline
├── packages/
│   └── shared/                 # Shared code
│       └── src/
│           ├── types/          # Database types
│           ├── constants/      # 66 phase items
│           └── utils/          # Status helpers
├── package.json
├── turbo.json
└── supabase-schema.sql
```

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Setup Environment Variables

Create `.env.local` in `apps/web/`:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_key
OPENAI_API_KEY=your_openai_api_key
```

Create `.env.local` in `apps/dashboard/` and `apps/worker/`:

```env
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

### 3. Setup Database

Run the SQL in `supabase-schema.sql` in your Supabase SQL Editor.

### 4. Run Development

```bash
# Run all apps
npm run dev

# Run only web
npm run dev:web

# Run only dashboard mobile app
npm run dev:dashboard

# Run only worker mobile app
npm run dev:worker
```

- Web: [http://localhost:3000](http://localhost:3000)
- Mobile: Use Expo Go app to scan QR code

## Construction Phases & Items

The system tracks **7 phases** with **66 total items**:

| Phase | Items | Required Photos |
|-------|-------|-----------------|
| 1. First Floor | 10 | 3 |
| 2. 1st Floor Walls | 12 | 4 |
| 3. Second Floor | 8 | 3 |
| 4. 2nd Floor Walls | 9 | 2 |
| 5. Roof | 10 | 3 |
| 6. Stairs Landing | 7 | 2 |
| 7. Backing Frame | 10 | 2 |

**AI can identify multiple items from a single photo**, reducing the total photos needed to ~15.

## Worker App Features

- **Agenda**: Cards of assigned houses with progress
- **Timeline**: Chronological history of each house
- **Files**: All photos and documents per house
- **Phases**: Current phase with checklist items
- **Camera**: Phase-aware photo capture
- **AI Validation**: Automatic checklist verification

## Part of OnSite Ecosystem

- **Timekeeper** - Worker hours per house
- **SheetChat** - Issue reporting
- **Calculator** - Material calculations
- **Dashboard** - Central authentication
