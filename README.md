# OnSite Eagle 🦅

AI-powered construction site monitoring and progress tracking system.

## Features

- **Plan Scanner**: Upload subdivision plans, AI extracts lot information and generates interactive SVG maps
- **Photo Validator**: AI validates construction phase photos against checklists
- **Interactive Site Map**: SVG-based map with color-coded house statuses
- **Timeline**: Chronological activity log for each house

## Tech Stack

- **Frontend**: Next.js 14, React, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: Supabase (PostgreSQL)
- **AI**: Claude API (Anthropic)
- **Icons**: Lucide React

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Setup Environment Variables

Edit `.env.local` and add your Anthropic API key:

```env
ANTHROPIC_API_KEY=your_anthropic_api_key
```

### 3. Setup Database

Run the SQL in `supabase-schema.sql` in your Supabase SQL Editor to create all tables.

### 4. Create Storage Bucket

In Supabase Dashboard > Storage, create a bucket called `eagle-files` (private).

### 5. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Project Structure

```
onsite-eagle/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── analyze-plan/     # AI plan analysis endpoint
│   │   │   ├── validate-photo/   # AI photo validation endpoint
│   │   │   └── generate-svg/     # SVG generation endpoint
│   │   ├── page.tsx              # Main dashboard
│   │   └── layout.tsx
│   ├── components/
│   │   ├── PlanScanner.tsx       # Plan upload & analysis
│   │   ├── PhotoValidator.tsx    # Photo validation UI
│   │   ├── SiteMap.tsx           # Interactive SVG map
│   │   └── Timeline.tsx          # Activity timeline
│   ├── lib/
│   │   └── supabase.ts           # Supabase client
│   └── types/
│       └── database.ts           # TypeScript types
├── supabase-schema.sql           # Database schema
└── .env.local                    # Environment variables
```

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

---

Built with ❤️ for the construction industry.
