# OnSite Calculator

Construction-grade calculator with imperial measurements and voice input.

Part of the [OnSite Club](https://onsiteclub.ca) ecosystem.

## Features

- 📐 **Imperial Math** - Feet, inches, and fractions (1/2, 1/4, 1/8, 1/16)
- 🎙️ **Voice Input** - Speak your measurements in English or Portuguese
- 📱 **Cross-platform** - Web, Android, iOS
- 🔐 **OnSite Integration** - Single sign-on with OnSite ecosystem

## Quick Start

```bash
# Clone
git clone https://github.com/onsiteclub/onsite-calculator.git
cd onsite-calculator

# Install
npm install

# Setup environment
cp .env.example .env.local
# Edit .env.local with your Supabase keys

# Run
npm run dev
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `VITE_SUPABASE_URL` | Supabase project URL | Yes |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon key | Yes |
| `OPENAI_API_KEY` | OpenAI API key (Vercel only) | For voice |
| `VITE_STRIPE_CHECKOUT_URL` | Stripe checkout URL | For billing |

## Development

```bash
npm run dev          # Start dev server
npm run test         # Run tests
npm run lint         # Lint code
npm run build        # Production build
npm run cap:android  # Open in Android Studio
npm run cap:ios      # Open in Xcode
```

## Building for Mobile

### Android

```bash
# Build web assets
npm run build

# Add Android platform (first time only)
npx cap add android

# Sync and open
npx cap sync android
npx cap open android
```

Then build APK/AAB in Android Studio.

### iOS

```bash
npm run build
npx cap add ios
npx cap sync ios
npx cap open ios
```

Then archive in Xcode.

## Project Structure

```
src/
├── components/     # React components
├── hooks/          # Custom React hooks
├── lib/
│   ├── calculator/ # Calculation engine
│   └── supabase.ts # Auth client
├── styles/         # CSS
├── types/          # TypeScript types
├── App.tsx         # Main component
└── main.tsx        # Entry point

api/
└── interpret.ts    # Voice API (Vercel)

tests/
└── unit/           # Unit tests
```

## How It Works

### Calculator Engine

The calculator handles imperial measurements using a custom tokenizer and PEMDAS-compliant parser:

1. **Tokenize** - Breaks `"5 1/2 + 3 1/4"` into `["5 1/2", "+", "3 1/4"]`
2. **Parse** - Converts each value to decimal inches
3. **Evaluate** - Processes operations respecting PEMDAS
4. **Format** - Outputs as feet/inches and total inches

### Voice Input

1. User holds voice button
2. Audio recorded as WebM
3. Sent to `/api/interpret`
4. Whisper transcribes audio
5. GPT-4o-mini extracts expression
6. Calculator engine evaluates

## Security

- ✅ No `eval()` or `Function()` - Safe expression parsing
- ✅ Rate limited API (30 req/min)
- ✅ CORS whitelist
- ✅ Supabase RLS for user data

## License

Proprietary - OnSite Club © 2025

## Links

- [OnSite Club](https://onsiteclub.ca)
- [Privacy Policy](https://onsiteclub.ca/legal/calculator/privacy.html)
- [Terms of Service](https://onsiteclub.ca/legal/calculator/terms.html)
