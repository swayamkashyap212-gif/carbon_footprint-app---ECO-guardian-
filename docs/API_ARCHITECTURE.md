# API Architecture

## Mobile Client

The Expo client owns presentation, local input validation, offline queueing, and privacy prompts. It never sends the OpenAI key directly from the device. Public API keys use `EXPO_PUBLIC_*`; private keys live in Supabase Edge Function secrets.

## Supabase

Postgres stores user profiles, carbon entries, goals, recommendations, alerts, device tokens, and gamification events. Every user-owned table has Row Level Security enabled so users can only read and mutate their own rows.

## Edge Functions

- `ai-carbon-coach`: accepts recent entries, user profile context, and chat messages, then calls OpenAI server-side.
- `notification-dispatcher`: scheduled function that reads unread alerts and dispatches them through FCM HTTP v1.

## External Integrations

- Google Maps SDK renders maps in native screens.
- Google Directions API powers route comparison and carbon alternatives.
- Google Places API powers origin/destination search.
- Google ML Kit powers bill, ticket, food, and receipt OCR in native builds.
- OpenWeather powers temperature, humidity, AQI, and UV surfaces.
- Climate News API powers personalized sustainability feed.

## Carbon Engine

`src/services/carbonEngine.ts` keeps deterministic calculations client-side for instant feedback. Backend jobs should repeat calculations for integrity before storing verified report values.

Key formulas:

- Electricity: `units_kwh * regional_emission_factor`
- Transport: `distance_km * mode_factor`
- Flight: `distance_km * flight_factor * cabin_multiplier`
- Food: `servings * food_type_factor`
- Food waste: `weight_kg * methane_multiplier`
- Shopping: `packaging_factor + delivery_factor`
