# EcoGuardian AI

EcoGuardian AI is a production-oriented React Native Expo Android application for carbon footprint tracking, prediction, and personalized sustainability coaching.

The visual direction is adapted from the supplied `stitch_carbon_tracking_dashboard.zip` homepage reference: forest-to-sky palette, soft off-white surfaces, glass cards, editorial Literata headings, Hanken Grotesk UI text, an animated earth dashboard, compact carbon gauge, alert cards, and a floating bottom navigation shell.

## Stack

- React Native Expo with TypeScript
- Node.js Express backend in `backend/`
- Prisma ORM with PostgreSQL schema
- BullMQ and Redis for background jobs
- AWS S3 storage boundary for screenshots, PDFs, and invoices
- NativeWind for Tailwind-style native styling
- React Navigation for auth and tab flows
- React Native Reanimated for earth motion
- Victory Native for carbon charts
- Supabase Auth, Postgres, Row Level Security, and Edge Functions
- OpenAI API through Supabase Edge Functions
- Google Maps/Directions/Places service boundary
- Expo Notifications with an FCM-ready backend dispatcher
- OCR integration boundary for Google ML Kit or cloud document extraction
- OpenWeather and climate news service boundaries

## Main App Areas

- Smart Carbon Dashboard: daily, weekly, monthly score surfaces, trend graph, sustainability score, savings, goals, and AI recommendation card.
- Automation Engine: flight tracking, shopping carbon, background monitoring, smart alerts, prediction analytics, and ingestion APIs.
- AI Carbon Coach: chat assistant plus generated weekly action plan.
- Insights: prediction engine, weather and climate impact, climate news, gamification, badges, levels, challenges, and roadmap data.
- Profile & Privacy: permissions, data controls, report export, offline queue, push notifications, and sign out.

## Quick Start

1. Install dependencies:

```bash
npm install
```

2. Create `.env` from `.env.example` and fill Supabase, Google, OpenWeather, news, and server-side OpenAI values.

3. Start the app:

```bash
npm run android:dev
```

4. Apply the database schema:

```bash
supabase start
supabase db reset
supabase functions serve
```

## Important Files

- `App.tsx`: app entry, fonts, providers, navigation container.
- `src/navigation/AppNavigator.tsx`: Supabase-authenticated stack and bottom tabs.
- `src/screens/DashboardScreen.tsx`: homepage-inspired production dashboard.
- `src/screens/AutomationHubScreen.tsx`: entry point for flight, shopping, monitoring, alerts, and prediction modules.
- `src/screens/FlightScreen.tsx`: Gmail ticket import, PDF ticket OCR, flight emissions, history, and suggestions.
- `src/screens/ShoppingScreen.tsx`: Gmail/receipt/SMS/notification shopping carbon tracker.
- `src/services/carbonEngine.ts`: deterministic carbon calculations and prediction helpers.
- `supabase/migrations/001_initial_schema.sql`: Postgres schema, RLS, summaries, and profile trigger.
- `supabase/functions/ai-carbon-coach/index.ts`: OpenAI-powered sustainability coach.
- `docs/DEPLOYMENT.md`: release and environment guide.
- `docs/API_ARCHITECTURE.md`: mobile/backend/API integration map.
- `docs/ADVANCED_MODULES.md`: advanced module wiring for flights, shopping, prediction, monitoring, alerts, and AI.
- `docs/NODE_PLATFORM_LINKAGE.md`: Node/Express/Prisma backend and Android native listener linkage.
- `docs/SOFTWARE_ARCHITECTURE_DOCUMENT.md`: complete startup-grade architecture blueprint.
- `docs/TESTING_STRATEGY.md`: test plan.
- `docs/SECURITY.md`: privacy and compliance architecture.

## Production Notes

The repository includes working service boundaries and fallback data for development. For store release, connect actual Google ML Kit native modules, Google Directions/Places responses, FCM HTTP v1 credentials, and climate news provider endpoints in the service files.

## Node Backend

The production Node.js backend lives in `backend/`. It includes Express APIs, Prisma schema, BullMQ workers, Dockerfile, and local Docker Compose dependencies for PostgreSQL and Redis.

```bash
docker compose up postgres redis
cd backend
npm install
npm run prisma:generate
npm run prisma:migrate
npm run dev
```
