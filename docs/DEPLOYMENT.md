# Deployment Guide

## Environment

Create `.env` from `.env.example`.

Required mobile values:

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `EXPO_PUBLIC_API_BASE_URL`
- `EXPO_PUBLIC_OPENWEATHER_API_KEY`
- `EXPO_PUBLIC_CLIMATE_NEWS_API_KEY`
- `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY`
- `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`

Required server secrets:

- `OPENAI_API_KEY`
- `FCM_SERVER_KEY` or FCM HTTP v1 service account config
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

## Supabase

Run:

```bash
supabase link --project-ref your-project-ref
supabase db push
supabase secrets set OPENAI_API_KEY=...
supabase functions deploy ai-carbon-coach
supabase functions deploy notification-dispatcher
```

Enable auth providers in Supabase:

- Email OTP
- Google OAuth
- Apple OAuth

Set redirect URLs:

- `ecoguardian://auth`
- `ecoguardian://auth/callback`

## Android

Run:

```bash
npm install
npx expo prebuild --platform android
npx expo run:android
```

For EAS:

```bash
npx eas build --platform android --profile production
```

Before Play Store release:

- Add a real adaptive icon and splash assets.
- Configure Firebase project and `google-services.json`.
- Verify location, camera, notification, and storage permission copy.
- Complete privacy policy and data safety declarations.
- Run a production build on a physical Android device.
