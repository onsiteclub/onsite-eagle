# OnSite Eagle

AI-powered construction site monitoring and progress tracking system.

## Features

- **Plan Scanner**: Upload subdivision plans, AI extracts lot information and generates interactive SVG maps
- **Photo Validator**: AI validates construction phase photos against checklists
- **Interactive Site Map**: SVG-based map with color-coded house statuses
- **Timeline**: Chronological activity log for each house
- **Mobile App**: Native app for field workers to capture and submit photos

## Tech Stack

- **Monorepo**: Turborepo
- **Web**: Next.js 16, React 19, Tailwind CSS 4
- **Mobile**: Expo (React Native)
- **Database**: Supabase (PostgreSQL)
- **AI**: OpenAI GPT-4o Vision
- **Shared**: TypeScript types and utilities

## Project Structure

```
onsite-eagle/
├── apps/
│   ├── web/                    # Next.js web application
│   │   ├── src/
│   │   │   ├── app/
│   │   │   │   ├── api/        # AI endpoints
│   │   │   │   └── page.tsx    # Dashboard
│   │   │   └── components/     # React components
│   │   └── package.json
│   └── mobile/                 # Expo mobile app
│       ├── app/                # Expo Router screens
│       ├── src/
│       └── package.json
├── packages/
│   └── shared/                 # Shared types & utilities
│       └── src/
│           ├── types/          # Database types
│           ├── constants/      # Phase definitions
│           └── utils/          # Status helpers
├── package.json                # Workspace root
├── turbo.json                  # Turborepo config
└── supabase-schema.sql         # Database schema
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

Create `.env.local` in `apps/mobile/`:

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

# Run only mobile
npm run dev:mobile
```

- Web: [http://localhost:3000](http://localhost:3000)
- Mobile: Expo DevTools

## Construction Phases

The system tracks 7 construction phases:

1. **First Floor** - Joists, subfloor, blocking
2. **First Floor Walls** - Studs, headers, corners
3. **Second Floor** - Joists, subfloor, stairwell
4. **Second Floor Walls** - Studs, headers
5. **Roof** - Trusses, sheathing, fascia
6. **Stairs Landing** - Stringers, landing framing
7. **Backing Frame** - Blocking for fixtures

## AI Capabilities

### Plan Analysis
- Detects lot boundaries and numbers
- Identifies streets and orientation
- Generates interactive SVG map

### Photo Validation
- Checks for required construction elements
- Identifies missing or incomplete work
- Flags safety concerns
- Provides worker feedback

## Part of OnSite Ecosystem

OnSite Eagle connects with:
- **Timekeeper** - Worker hours per house
- **SheetChat** - Issue reporting
- **Calculator** - Material calculations
- **Dashboard** - Central authentication
