# EcoGuardian AI Node Platform Linkage

This project now has two backend paths:

- Existing Supabase path for fast MVP and Edge Function compatibility.
- New Node.js + Express + Prisma + PostgreSQL platform under `backend/` for the requested production stack.

The React Native app can call either path. `src/services/supabase.ts` handles Supabase Edge Functions. `src/services/backendApi.ts` handles the Node API at `EXPO_PUBLIC_API_BASE_URL`.

## Runtime Architecture

```text
React Native Expo App
  |
  | HTTPS JWT
  v
Node.js Express API :4000
  |
  +-- Prisma ORM -> PostgreSQL
  +-- BullMQ -> Redis
  +-- Google APIs -> Gmail, Maps, Vision
  +-- OpenAI API -> assistant, entity extraction, recommendations
  +-- AWS S3 -> screenshots, PDFs, invoices
  +-- Android Native Module -> notification listener events
```

## Backend Modules

| Area | Files | Purpose |
|---|---|---|
| API server | `backend/src/app.ts`, `backend/src/server.ts` | Express app and route mounting |
| Database | `backend/prisma/schema.prisma` | PostgreSQL schema with Prisma models |
| Notifications | `backend/src/routes/notifications.ts`, `notificationIntelligence.ts` | Swiggy, Zomato, Blinkit, Zepto, Amazon, Flipkart, Uber, Ola detection |
| Orders and routes | `backend/src/routes/orders.ts`, `mapsService.ts` | Destination, route distance, travel time, vehicle prediction |
| Carbon engine | `backend/src/routes/carbon.ts`, `carbonEngine.ts` | Delivery, grocery, e-commerce carbon calculations and Eco Score |
| Gmail | `backend/src/routes/gmail.ts`, `gmailParser.ts` | Gmail message classification and extraction storage |
| OCR/PDF | `backend/src/routes/uploads.ts`, `ocrPipeline.ts` | Screenshot/PDF pipeline placeholders for Google Vision + OpenAI extraction |
| Prediction | `backend/src/routes/predictions.ts`, `predictionEngine.ts` | Daily, weekly, monthly, yearly prediction baseline |
| Workers | `backend/src/workers/index.ts` | BullMQ queues for Gmail, OCR, predictions, and alerts |
| Native Android | `android-native/notification-listener/*` | Notification Listener Service blueprint |

## API Endpoints

- `GET /health`
- `POST /v1/notifications/events`
- `POST /v1/orders`
- `POST /v1/carbon/delivery/calculate`
- `GET /v1/carbon/dashboard`
- `POST /v1/predictions/generate`
- `POST /v1/uploads/screenshot`
- `POST /v1/uploads/pdf`
- `POST /v1/gmail/messages/analyze`

## Local Startup

1. Create `backend/.env` from `backend/.env.example`.
2. Start infrastructure:

```bash
docker compose up postgres redis
```

3. Install backend dependencies:

```bash
cd backend
npm install
npm run prisma:generate
npm run prisma:migrate
npm run dev
```

4. Start workers:

```bash
cd backend
npm run worker
```

5. Start mobile app:

```bash
npm run start
```

## Native Notification Listener

The Android listener cannot run in Expo Go. Use an Expo development build or prebuild/bare workflow and copy the files from `android-native/notification-listener` into the generated Android project.

Production steps:

- Add manifest service snippet.
- Build a React Native native module bridge.
- Request notification listener access through Android settings.
- Filter supported packages before any upload.
- Sync normalized payloads to `POST /v1/notifications/events`.

## Security Notes

- Store Google refresh tokens encrypted.
- Restrict Google Maps and Vision credentials to backend usage where possible.
- Upload screenshots/PDFs to S3 with private ACL and short-lived signed URLs.
- Redact notification/email/OCR text before OpenAI calls.
- Never process unsupported notification packages.
- Use JWT auth for all backend endpoints.

