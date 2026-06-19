# EcoGuardian AI Software Architecture Document

Version: 1.0  
Audience: Product, Engineering, Data, AI/ML, Security, DevOps  
Status: Architecture blueprint for production build

## 1. Executive Summary

EcoGuardian AI is an Android-first sustainability assistant that automatically tracks, predicts, and reduces a user's carbon footprint. The product combines mobile data collection, trusted integrations, deterministic carbon calculations, AI recommendations, forecasting, smart notifications, and user-controlled privacy.

The system must ingest signals from Gmail, SMS, notifications, manual inputs, Google Maps, GPS, activity recognition, OCR, weather APIs, and climate news APIs. These signals become normalized carbon events, category logs, dashboards, predictions, reports, and AI assistant context.

The recommended architecture uses a React Native Expo mobile app, Supabase Auth/Postgres/Storage/Edge Functions for the first production version, and service boundaries that can evolve into independent microservices as scale increases. The core design principle is to keep carbon calculations auditable, user data permissioned, and AI outputs explainable.

Primary goals:

- Capture user activities with minimal manual effort.
- Convert raw signals into validated carbon logs.
- Provide daily, weekly, monthly, and annual carbon insights.
- Recommend realistic behavior changes with measurable impact.
- Preserve trust through privacy controls, encryption, RLS, and transparent data provenance.
- Scale from MVP to 1 million users without redesigning core domains.

## 2. High-Level System Architecture

```text
┌──────────────────────────────────────────────────────────────────────────┐
│                            Android Mobile App                             │
│ React Native Expo, NativeWind, Navigation, Offline Queue, Secure Storage   │
│                                                                          │
│ ┌──────────┐ ┌──────────┐ ┌────────────┐ ┌──────────────┐ ┌───────────┐ │
│ │ Screens  │ │ Services │ │ Connectors │ │ Local Queue  │ │ Permissions│ │
│ └──────────┘ └──────────┘ └────────────┘ └──────────────┘ └───────────┘ │
└───────────────────────────────┬──────────────────────────────────────────┘
                                │ HTTPS + JWT
                                ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                                  API Layer                                │
│ Supabase Edge Functions / API Gateway / Rate Limits / Request Validation  │
└───────────────┬─────────────────────┬─────────────────────┬──────────────┘
                │                     │                     │
                ▼                     ▼                     ▼
┌──────────────────────┐ ┌──────────────────────┐ ┌──────────────────────┐
│ Authentication Layer │ │ Carbon Domain Layer  │ │ Integration Layer    │
│ Supabase Auth, OTP,  │ │ Calculation, Scores, │ │ Gmail, Maps, OCR,    │
│ Google, Apple        │ │ Reports, Goals       │ │ Weather, News, FCM   │
└──────────┬───────────┘ └──────────┬───────────┘ └──────────┬───────────┘
           │                        │                        │
           ▼                        ▼                        ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                              Data & AI Layer                              │
│                                                                          │
│ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────────┐ │
│ │ PostgreSQL   │ │ Carbon Engine│ │ Prediction   │ │ AI Assistant     │ │
│ │ Supabase RLS │ │ Factors + QA │ │ ML Forecasts │ │ OpenAI + Context │ │
│ └──────────────┘ └──────────────┘ └──────────────┘ └──────────────────┘ │
│                                                                          │
│ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐                      │
│ │ Object Store │ │ Job Queue    │ │ Analytics    │                      │
│ │ Bills/Tickets│ │ Async Parsing│ │ Events/KPIs  │                      │
│ └──────────────┘ └──────────────┘ └──────────────┘                      │
└──────────────────────────────────────────────────────────────────────────┘
```

### 2.1 External Integration Architecture

```text
                  ┌───────────── Google OAuth ─────────────┐
                  ▼                                         │
┌────────────┐  Gmail API      ┌───────────────┐            │
│ Gmail      │ ──────────────▶ │ Email Parser  │            │
└────────────┘                 └───────┬───────┘            │
                                       ▼                    │
┌────────────┐  SMS/Notif.     ┌───────────────┐            │
│ Android OS │ ──────────────▶ │ Signal Parser │            │
└────────────┘                 └───────┬───────┘            │
                                       ▼                    │
┌────────────┐  PDF/Image      ┌───────────────┐            │
│ ML Kit OCR │ ──────────────▶ │ OCR Processor │            │
└────────────┘                 └───────┬───────┘            │
                                       ▼                    │
┌────────────┐  Routes/Places  ┌───────────────┐            │
│ Google Map │ ──────────────▶ │ Route Service │            │
└────────────┘                 └───────┬───────┘            │
                                       ▼                    │
                                ┌──────────────┐
                                │ Carbon Event │
                                │ Generator    │
                                └──────┬───────┘
                                       ▼
                                ┌──────────────┐
                                │ Carbon Logs  │
                                │ + Scores     │
                                └──────────────┘
```

### 2.2 Data Flow

1. User authenticates through phone OTP, Google, or Apple.
2. User grants specific permissions in the Privacy Dashboard.
3. Mobile app collects signals from manual inputs, GPS, OCR, activity recognition, Gmail, SMS, notifications, or APIs.
4. Raw signals are normalized into typed domain payloads with provenance metadata.
5. API Layer validates the payload, checks consent, deduplicates events, and stores raw extraction metadata.
6. Carbon Calculation Service applies versioned emission factors and creates category-specific logs.
7. Carbon Score Service aggregates daily, weekly, monthly, category, and goal progress.
8. Prediction Service generates 7-day, 30-day, 90-day, and annual forecasts.
9. AI Assistant Service uses recent logs, goals, profile, weather, and preferences to generate recommendations.
10. Notification Service sends alerts when thresholds, anomalies, or habit opportunities are detected.
11. Reporting Service generates daily, weekly, and monthly summaries.
12. Analytics Service tracks product and model performance using privacy-preserving events.

## 3. Microservice Architecture

The first production version can deploy these services as Supabase Edge Functions and internal modules. At higher scale, each service can move behind an API gateway with its own deployment, queue workers, and observability.

| Service | Purpose | Responsibilities | Input | Output | Tables Used | API Dependencies |
|---|---|---|---|---|---|---|
| Authentication Service | Manage identity and sessions | OTP login, Google login, Apple login, JWT issuance, token refresh, account deletion | Phone, OTP, OAuth tokens | Session, user id, auth errors | users, profiles, user_preferences | Supabase Auth, Google OAuth, Apple OAuth |
| User Service | Manage profile and privacy | Profile CRUD, preferences, consent, permissions, region, goals | Profile fields, privacy settings | Updated profile/preferences | profiles, user_preferences, carbon_goals | None |
| Carbon Calculation Service | Convert activities into emissions | Apply factors, validate units, create carbon logs, maintain factor versions | Category payloads | kgCO2e, factor metadata, carbon log | carbon_logs plus category logs | Internal factor registry |
| Transport Service | Track ground mobility | Manual trip, GPS trip, activity recognition, route comparison | Distance, mode, route, GPS segments | transport_logs, carbon_logs, route recommendations | transport_logs, carbon_logs | Google Maps, Directions, Places, Activity Recognition |
| Flight Service | Track air travel | Gmail ticket parsing, PDF OCR, flight route distance, cabin multiplier, offsets | Ticket PDF/email/OCR text | flight_logs, carbon_logs, train alternatives | flight_logs, carbon_logs | Gmail API, OCR, flight distance provider, Maps |
| Shopping Service | Track purchases | Receipt/email/SMS parsing, category mapping, packaging/delivery estimates | Receipt text, vendor, items | shopping_logs, carbon_logs, eco alternatives | shopping_logs, carbon_logs | Gmail API, SMS parser, OCR |
| Electricity Service | Track utility use | Bill upload, OCR, regional grid factor, trend analysis | Bill PDF/image, units, amount, period | electricity_logs, carbon_logs | electricity_logs, carbon_logs | ML Kit OCR, Gmail API |
| Food Service | Track meals | Food scan/manual entry/receipt mapping, diet category factors | Food items, serving size, meal type | food_logs, carbon_logs | food_logs, carbon_logs | OCR, optional image classifier |
| Food Waste Service | Track discarded food | Waste item/weight/type, methane impact, score | Weight, type, disposal method | food_waste_logs, carbon_logs | food_waste_logs, carbon_logs | None |
| Notification Service | Send alerts and reminders | Threshold alerts, FCM dispatch, notification preferences, quiet hours | Alert event, device token | Push notification, notification record | notifications, user_preferences | Firebase Cloud Messaging |
| Prediction Service | Forecast emissions | Feature generation, model inference, risk scoring, drift monitoring | Recent logs, seasonality, goals | prediction_logs | prediction_logs, carbon_logs, weather_data | ML model registry |
| AI Assistant Service | Conversational sustainability coach | Chat, action plan, recommendations, explanation, safety filtering | Chat text, context, logs | Assistant response, action plan | ai_chat_history, carbon_logs, prediction_logs | OpenAI API |
| Reporting Service | Produce reports | Daily/weekly/monthly summaries, PDF/CSV export, email-ready summaries | User id, period | report metadata, file URL | reports, carbon_logs, carbon_scores | Supabase Storage |
| Analytics Service | Product and system analytics | Funnel events, feature usage, model success, alert conversion | App events | Aggregated metrics | analytics_events, reports | Optional warehouse |

## 4. Database Architecture

### 4.1 Design Principles

- Use UUID primary keys for all user-owned records.
- Use Supabase Auth as source of truth for identity.
- Enforce Row Level Security on every user-owned table.
- Store calculation provenance: factor version, source, confidence, raw signal reference.
- Partition high-volume logs by month when usage grows.
- Keep raw sensitive payloads separate from normalized carbon facts.
- Prefer soft deletion for user-visible records and hard deletion for GDPR erase requests.

### 4.2 Entity Relationship Overview

```text
users
  │ 1:1
  ▼
profiles ───── 1:1 ───── user_preferences
  │
  ├── 1:N carbon_logs ─── category-specific logs
  │       ├── electricity_logs
  │       ├── transport_logs
  │       ├── flight_logs
  │       ├── shopping_logs
  │       ├── food_logs
  │       └── food_waste_logs
  │
  ├── 1:N carbon_scores
  ├── 1:N carbon_goals
  ├── 1:N prediction_logs
  ├── 1:N notifications
  ├── 1:N reports
  ├── 1:N weather_data
  └── 1:N ai_chat_history

climate_news is global plus optional personalized tags.
```

### 4.3 Table Specifications

#### users

Purpose: Logical application user projection of Supabase Auth.

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK, references auth.users(id) |
| email | text | Nullable for phone-only users |
| phone | text | Nullable for OAuth-only users |
| auth_provider | text | phone, google, apple |
| status | text | active, suspended, deleted |
| created_at | timestamptz | Default now |
| deleted_at | timestamptz | Nullable |

Indexes: unique email where not null, unique phone where not null, status.  
RLS: user can select own row; service role can manage all rows.  
Retention: delete/anonymize within 30 days of account deletion.

#### profiles

Purpose: User-facing identity, region, and sustainability baseline.

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| user_id | uuid | FK users.id, unique |
| full_name | text | Nullable |
| avatar_url | text | Nullable |
| home_region | text | Used for electricity factor |
| currency | text | Default INR or user locale |
| household_size | integer | Optional normalization |
| baseline_annual_kg | numeric(12,3) | Initial estimated footprint |
| sustainability_score | integer | 0-100 |
| created_at | timestamptz | Default now |
| updated_at | timestamptz | Default now |

Indexes: user_id, home_region.  
RLS: users can CRUD own profile.  
Retention: deleted with user.

#### carbon_logs

Purpose: Canonical ledger of all carbon-generating or carbon-saving events.

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| user_id | uuid | FK users.id |
| category | text | electricity, transport, flight, shopping, food, food_waste |
| source | text | manual, gmail, sms, notification, gps, activity, ocr, api, ai |
| source_record_id | uuid | Links category table or raw ingestion record |
| title | text | Display label |
| kg_co2e | numeric(12,3) | Positive emission |
| kg_co2e_saved | numeric(12,3) | Optional savings |
| factor_version | text | Emission factor version |
| confidence | numeric(4,3) | 0-1 |
| occurred_at | timestamptz | Event time |
| metadata | jsonb | Provenance and normalized details |
| created_at | timestamptz | Default now |
| deleted_at | timestamptz | Nullable |

Indexes: user_id + occurred_at desc, user_id + category + occurred_at, source + source_record_id, GIN metadata.  
RLS: users can access own logs only.  
Retention: keep until account deletion; aggregate older than 24 months into summaries if user enables minimization.

#### electricity_logs

Purpose: Utility bill and electricity usage details.

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| user_id | uuid | FK users.id |
| carbon_log_id | uuid | FK carbon_logs.id |
| billing_provider | text | Optional |
| units_kwh | numeric(12,3) | Required |
| bill_amount | numeric(12,2) | Optional |
| billing_period_start | date | Required |
| billing_period_end | date | Required |
| region_factor | numeric(10,6) | kgCO2e/kWh |
| extraction_method | text | manual, ocr, gmail |
| document_url | text | Storage path, optional |
| raw_text_hash | text | Hash for dedupe |
| created_at | timestamptz | Default now |

Indexes: user_id + billing_period_start, raw_text_hash.  
RLS: own rows only.  
Retention: documents 12 months by default; normalized logs retained until deletion.

#### transport_logs

Purpose: Ground transport trips from manual, GPS, activity, or route APIs.

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| user_id | uuid | FK users.id |
| carbon_log_id | uuid | FK carbon_logs.id |
| mode | text | car, bike, bus, metro, train, walking, cycling |
| distance_km | numeric(12,3) | Required |
| duration_minutes | integer | Optional |
| origin_place_id | text | Optional |
| destination_place_id | text | Optional |
| route_polyline | text | Optional, minimize retention |
| activity_confidence | numeric(4,3) | Optional |
| tracking_method | text | manual, gps, maps, activity |
| created_at | timestamptz | Default now |

Indexes: user_id + created_at desc, mode, origin/destination.  
RLS: own rows only.  
Retention: precise route polylines deleted after 30-90 days; aggregate distance retained.

#### flight_logs

Purpose: Flight emissions from tickets, emails, or OCR.

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| user_id | uuid | FK users.id |
| carbon_log_id | uuid | FK carbon_logs.id |
| flight_number | text | Optional |
| origin_airport | text | IATA |
| destination_airport | text | IATA |
| distance_km | numeric(12,3) | Required |
| cabin_class | text | economy, premium, business, first |
| trip_type | text | one_way, return |
| departure_at | timestamptz | Optional |
| extraction_method | text | gmail, ocr, manual |
| document_url | text | Optional |
| created_at | timestamptz | Default now |

Indexes: user_id + departure_at, origin_airport + destination_airport.  
RLS: own rows only.  
Retention: document deleted after 12 months; route summary retained.

#### shopping_logs

Purpose: Purchase and delivery footprint.

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| user_id | uuid | FK users.id |
| carbon_log_id | uuid | FK carbon_logs.id |
| vendor | text | Amazon, Flipkart, Blinkit, etc. |
| order_id_hash | text | Dedupe without storing full order id |
| category | text | grocery, electronics, fashion, food_delivery |
| item_count | integer | Optional |
| delivery_type | text | normal, express, grouped |
| packaging_type | text | minimal, standard, heavy |
| amount | numeric(12,2) | Optional |
| extraction_method | text | gmail, sms, notification, ocr, manual |
| created_at | timestamptz | Default now |

Indexes: user_id + created_at, vendor, order_id_hash.  
RLS: own rows only.  
Retention: item-level details 12 months; aggregate category retained.

#### food_logs

Purpose: Meal and diet-related emissions.

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| user_id | uuid | FK users.id |
| carbon_log_id | uuid | FK carbon_logs.id |
| meal_type | text | breakfast, lunch, dinner, snack |
| food_category | text | vegetarian, non_vegetarian, processed, local |
| servings | numeric(8,2) | Required |
| grams | numeric(10,2) | Optional |
| scan_confidence | numeric(4,3) | Optional |
| entry_method | text | manual, scan, receipt |
| created_at | timestamptz | Default now |

Indexes: user_id + created_at, food_category.  
RLS: own rows only.  
Retention: retained until deletion; optional aggregate after 24 months.

#### food_waste_logs

Purpose: Discarded food and waste impact.

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| user_id | uuid | FK users.id |
| carbon_log_id | uuid | FK carbon_logs.id |
| food_type | text | vegetable, grain, dairy, meat, mixed |
| weight_kg | numeric(10,3) | Required |
| disposal_method | text | landfill, compost, animal_feed |
| waste_score | integer | 0-100 |
| created_at | timestamptz | Default now |

Indexes: user_id + created_at, food_type.  
RLS: own rows only.  
Retention: retained until deletion.

#### carbon_scores

Purpose: Precomputed dashboard scores and aggregates.

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| user_id | uuid | FK users.id |
| period | text | daily, weekly, monthly, yearly |
| period_start | date | Required |
| period_end | date | Required |
| total_kg_co2e | numeric(12,3) | Required |
| saved_kg_co2e | numeric(12,3) | Default 0 |
| sustainability_score | integer | 0-100 |
| category_breakdown | jsonb | Category totals |
| trend_delta_pct | numeric(8,3) | Optional |
| created_at | timestamptz | Default now |

Indexes: unique user_id + period + period_start, GIN category_breakdown.  
RLS: own rows only.  
Retention: retained while account is active.

#### carbon_goals

Purpose: User goals and roadmap progress.

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| user_id | uuid | FK users.id |
| category | text | Nullable for overall goal |
| target_kg | numeric(12,3) | Required |
| period | text | daily, weekly, monthly, yearly |
| starts_at | date | Required |
| ends_at | date | Required |
| status | text | active, achieved, missed, paused |
| created_at | timestamptz | Default now |

Indexes: user_id + status, user_id + starts_at.  
RLS: own rows only.  
Retention: retained until deletion.

#### prediction_logs

Purpose: Forecast outputs and model provenance.

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| user_id | uuid | FK users.id |
| model_version | text | Required |
| forecast_7d_kg | numeric(12,3) | Required |
| forecast_30d_kg | numeric(12,3) | Required |
| forecast_90d_kg | numeric(12,3) | Required |
| forecast_annual_kg | numeric(12,3) | Required |
| risk_level | text | low, medium, high |
| features_hash | text | Reproducibility |
| explanation | jsonb | Top drivers |
| created_at | timestamptz | Default now |

Indexes: user_id + created_at desc, model_version.  
RLS: own rows only.  
Retention: 24 months or until deletion.

#### notifications

Purpose: In-app and push notification history.

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| user_id | uuid | FK users.id |
| type | text | alert, reminder, recommendation, report |
| title | text | Required |
| body | text | Required |
| severity | text | info, warning, critical |
| action_route | text | Optional app deep link |
| delivered_at | timestamptz | Nullable |
| read_at | timestamptz | Nullable |
| metadata | jsonb | Optional |
| created_at | timestamptz | Default now |

Indexes: user_id + created_at desc, user_id + read_at.  
RLS: own rows only.  
Retention: 12 months by default.

#### reports

Purpose: Generated daily, weekly, and monthly summaries.

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| user_id | uuid | FK users.id |
| report_type | text | daily, weekly, monthly, yearly |
| period_start | date | Required |
| period_end | date | Required |
| summary | jsonb | Metrics and recommendations |
| pdf_url | text | Optional |
| csv_url | text | Optional |
| status | text | pending, ready, failed |
| created_at | timestamptz | Default now |

Indexes: user_id + report_type + period_start.  
RLS: own rows only.  
Retention: report files 24 months unless user deletes.

#### climate_news

Purpose: Cached climate news feed.

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| provider | text | Required |
| title | text | Required |
| url | text | Required |
| category | text | global_warming, renewable_energy, green_technology, sustainability |
| summary | text | Optional |
| published_at | timestamptz | Required |
| locale | text | Optional |
| created_at | timestamptz | Default now |

Indexes: category + published_at desc, locale.  
RLS: readable by authenticated users; writes service role only.  
Retention: 90 days cache.

#### weather_data

Purpose: Weather and climate context for predictions and recommendations.

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| user_id | uuid | FK users.id |
| latitude_bucket | numeric(8,3) | Rounded for privacy |
| longitude_bucket | numeric(8,3) | Rounded for privacy |
| temperature_c | numeric(6,2) | Required |
| humidity_pct | numeric(5,2) | Required |
| aqi | integer | Optional |
| uv_index | numeric(4,2) | Optional |
| observed_at | timestamptz | Required |
| provider | text | Required |

Indexes: user_id + observed_at desc, lat/lon bucket.  
RLS: own rows only.  
Retention: 90 days raw, aggregate retained.

#### ai_chat_history

Purpose: AI assistant messages and recommendation context.

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| user_id | uuid | FK users.id |
| session_id | uuid | Conversation grouping |
| role | text | user, assistant, system |
| content | text | Redacted text |
| context_refs | jsonb | References to logs/predictions |
| safety_flags | jsonb | Optional |
| created_at | timestamptz | Default now |

Indexes: user_id + session_id + created_at.  
RLS: own rows only.  
Retention: user configurable; default 12 months.

#### user_preferences

Purpose: Consent, notification, privacy, and personalization settings.

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| user_id | uuid | FK users.id, unique |
| permissions | jsonb | Gmail, SMS, GPS, OCR, notifications |
| notification_settings | jsonb | Quiet hours, alert types |
| privacy_settings | jsonb | Retention, AI use, data minimization |
| dietary_preferences | jsonb | Vegetarian, vegan, etc. |
| transport_preferences | jsonb | Owns car, metro access |
| created_at | timestamptz | Default now |
| updated_at | timestamptz | Default now |

Indexes: user_id unique, GIN permissions.  
RLS: own rows only.  
Retention: deleted with user.

## 5. REST API Design

### 5.1 API Standards

Base path: `/v1`  
Auth: Bearer JWT for all user APIs except login/verify.  
Idempotency: required for ingestion endpoints via `Idempotency-Key`.  
Errors:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "distance_km must be greater than 0",
    "details": {}
  }
}
```

Common status codes: `400`, `401`, `403`, `404`, `409`, `422`, `429`, `500`.

### 5.2 Authentication APIs

| Method | Route | Purpose | Auth |
|---|---|---|---|
| POST | `/auth/login` | Start phone OTP | Public |
| POST | `/auth/verify-otp` | Verify OTP and create session | Public |
| POST | `/auth/google` | Exchange Google OAuth token | Public |
| POST | `/auth/apple` | Exchange Apple token | Public |
| POST | `/auth/logout` | Revoke session | User |
| DELETE | `/auth/account` | Delete account and data | User |

POST `/auth/login`

Request:

```json
{ "phone": "+919999999999" }
```

Response:

```json
{ "otp_sent": true, "expires_in_seconds": 300 }
```

Validation: E.164 phone required, rate limited by phone/device/IP.

POST `/auth/verify-otp`

Request:

```json
{ "phone": "+919999999999", "otp": "123456" }
```

Response:

```json
{ "access_token": "jwt", "refresh_token": "jwt", "user": { "id": "uuid" } }
```

### 5.3 User and Preferences APIs

| Method | Route | Purpose |
|---|---|---|
| GET | `/me` | Current user, profile, preferences |
| PATCH | `/profile` | Update profile |
| GET | `/preferences` | Get permissions and preferences |
| PATCH | `/preferences` | Update consent/settings |
| POST | `/permissions/sync` | Sync device permission states |

PATCH `/preferences`

Request:

```json
{
  "permissions": {
    "gmail": true,
    "sms": false,
    "gps": true,
    "ocr": true,
    "notifications": true
  },
  "notification_settings": {
    "quiet_hours": { "start": "22:00", "end": "07:00" }
  }
}
```

Response:

```json
{ "updated": true }
```

### 5.4 Dashboard APIs

| Method | Route | Purpose |
|---|---|---|
| GET | `/dashboard` | Full home dashboard |
| GET | `/dashboard/score?period=daily` | Carbon score by period |
| GET | `/dashboard/trends?range=30d` | Trend graph |
| GET | `/dashboard/categories?range=7d` | Category breakdown |

GET `/dashboard`

Response:

```json
{
  "score": {
    "daily_kg": 12.4,
    "weekly_kg": 82.8,
    "monthly_kg": 312.6,
    "sustainability_score": 92,
    "saved_kg": 12
  },
  "trend": [{ "date": "2026-06-11", "kg": 12.4 }],
  "categories": [{ "category": "transport", "kg": 4.1 }],
  "recommendations": [{ "id": "uuid", "title": "Take metro tomorrow", "impact_kg": 2.4 }]
}
```

### 5.5 Carbon Log APIs

| Method | Route | Purpose |
|---|---|---|
| GET | `/carbon/logs` | List logs |
| POST | `/carbon/logs` | Manual carbon event |
| GET | `/carbon/logs/{id}` | Log detail |
| DELETE | `/carbon/logs/{id}` | Soft delete log |
| POST | `/carbon/recalculate` | Recalculate affected period |

Validation: category enum, kg values non-negative, occurred_at not far future, metadata size limit.

### 5.6 Transport APIs

| Method | Route | Purpose |
|---|---|---|
| POST | `/transport/calculate` | Calculate trip emissions |
| POST | `/transport/log` | Save transport log |
| POST | `/transport/gps-session/start` | Start background trip session |
| POST | `/transport/gps-session/end` | End and summarize session |
| GET | `/transport/routes/compare` | Compare route alternatives |

POST `/transport/calculate`

Request:

```json
{ "mode": "metro", "distance_km": 18, "occurred_at": "2026-06-11T08:30:00Z" }
```

Response:

```json
{ "kg_co2e": 0.504, "factor": 0.028, "factor_version": "IN-2026-v1" }
```

### 5.7 Flight APIs

| Method | Route | Purpose |
|---|---|---|
| POST | `/flight/calculate` | Calculate route emissions |
| POST | `/flight/upload-ticket` | Upload and parse ticket |
| POST | `/flight/gmail/import` | Import flight tickets from Gmail |
| GET | `/flight/alternatives` | Train/offset alternatives |

POST `/flight/upload-ticket`

Request: multipart file PDF/image.  
Response:

```json
{
  "flight": {
    "flight_number": "AI101",
    "origin_airport": "DEL",
    "destination_airport": "BOM",
    "distance_km": 1148,
    "kg_co2e": 292.74
  },
  "confidence": 0.91
}
```

### 5.8 Electricity APIs

| Method | Route | Purpose |
|---|---|---|
| POST | `/electricity/calculate` | Units to emissions |
| POST | `/electricity/upload-bill` | OCR bill upload |
| POST | `/electricity/gmail/import` | Import utility bills |
| GET | `/electricity/trends` | Monthly/yearly trends |

POST `/electricity/upload-bill`

Request: multipart bill file.  
Response:

```json
{
  "units_kwh": 214,
  "bill_amount": 1680,
  "billing_period": { "start": "2026-05-01", "end": "2026-05-31" },
  "kg_co2e": 153.224,
  "recommendations": ["Switch standby loads off", "Replace old fan"]
}
```

### 5.9 Shopping APIs

| Method | Route | Purpose |
|---|---|---|
| POST | `/shopping/analyze` | Analyze receipt/order text |
| POST | `/shopping/upload-receipt` | OCR receipt |
| POST | `/shopping/gmail/import` | Import shopping receipts |
| POST | `/shopping/sms/import` | Import SMS receipts |
| GET | `/shopping/alternatives` | Eco-friendly options |

### 5.10 Food and Waste APIs

| Method | Route | Purpose |
|---|---|---|
| POST | `/food/calculate` | Calculate meal emissions |
| POST | `/food/log` | Save meal |
| POST | `/food/scan` | Analyze food image |
| POST | `/food-waste/calculate` | Estimate waste impact |
| POST | `/food-waste/log` | Save waste event |

### 5.11 Prediction APIs

| Method | Route | Purpose |
|---|---|---|
| POST | `/prediction/generate` | Generate latest forecast |
| GET | `/prediction/latest` | Latest prediction |
| GET | `/prediction/history` | Prediction history |

POST `/prediction/generate`

Response:

```json
{
  "forecast_7d_kg": 76.2,
  "forecast_30d_kg": 296.1,
  "forecast_90d_kg": 891.3,
  "forecast_annual_kg": 3548,
  "risk_level": "medium",
  "drivers": ["transport increased 18%", "electricity stable"]
}
```

### 5.12 AI Assistant APIs

| Method | Route | Purpose |
|---|---|---|
| POST | `/assistant/chat` | Ask AI assistant |
| GET | `/assistant/sessions` | List sessions |
| GET | `/assistant/sessions/{id}` | Session history |
| POST | `/assistant/action-plan` | Generate roadmap |

POST `/assistant/chat`

Request:

```json
{ "session_id": "uuid", "message": "How can I reduce carbon this week?" }
```

Response:

```json
{
  "message": "Your fastest win is replacing two short car trips with metro, saving about 3.2 kg CO2e.",
  "actions": [{ "title": "Metro commute twice", "impact_kg": 3.2 }]
}
```

### 5.13 Notification APIs

| Method | Route | Purpose |
|---|---|---|
| POST | `/notifications/register-device` | Save FCM token |
| GET | `/notifications` | List notifications |
| PATCH | `/notifications/{id}/read` | Mark as read |
| POST | `/notifications/test` | Test push |

### 5.14 Reports APIs

| Method | Route | Purpose |
|---|---|---|
| GET | `/reports/daily` | Daily report |
| GET | `/reports/weekly` | Weekly report |
| GET | `/reports/monthly` | Monthly report |
| POST | `/reports/export` | Generate PDF/CSV |
| GET | `/reports/{id}` | Report status/download |

### 5.15 Weather and News APIs

| Method | Route | Purpose |
|---|---|---|
| GET | `/weather/current` | Current weather/AQI/UV |
| GET | `/news/climate` | Personalized climate feed |
| POST | `/news/refresh` | Service-role refresh cache |

## 6. External Integrations

### 6.1 Google Login

Purpose: OAuth identity provider.  
Authentication flow: Mobile obtains Google ID token, backend verifies token, Supabase creates or links user.  
Data flow: ID token -> Auth Service -> user/session.  
Security: verify audience, issuer, expiry, nonce; never trust profile fields without verification.  
Rate limits: OAuth provider limits and abuse detection.  
Fallback: phone OTP login.

### 6.2 Gmail API

Purpose: Import flight tickets, shopping receipts, and utility bills.  
Authentication flow: Google OAuth with minimal Gmail readonly scopes, explicit user consent.  
Data flow: Gmail query -> candidate messages -> parser -> extraction confidence -> carbon event.  
Security: request least privilege, store refresh tokens encrypted, allow disconnect/delete, hash message ids for dedupe.  
Rate limits: per-user and project Gmail quotas; batch imports and incremental sync.  
Fallback: manual upload, OCR, manual input.

### 6.3 Google Maps, Directions, Places

Purpose: Place search, distance, routes, alternatives, savings.  
Authentication flow: API key restricted by Android package/SHA and backend key for server calls.  
Data flow: origin/destination -> route options -> distance/duration -> transport emissions.  
Security: restrict keys, avoid storing exact routes long-term, round location for analytics.  
Rate limits: cache route comparisons, debounce place search, enforce quotas.  
Fallback: manual distance and mode entry.

### 6.4 Firebase Cloud Messaging

Purpose: Push alerts, reminders, reports, habit nudges.  
Authentication flow: device obtains FCM token; backend stores token; server sends via FCM HTTP v1.  
Data flow: alert event -> Notification Service -> FCM -> mobile notification.  
Security: service account only server-side, token rotation, user opt-in, quiet hours.  
Rate limits: batch dispatch, suppress duplicates.  
Fallback: in-app notifications.

### 6.5 Google ML Kit OCR

Purpose: Extract text from bills, tickets, and receipts on device.  
Authentication flow: on-device SDK, no server auth required for local OCR.  
Data flow: image/PDF -> OCR text -> extraction parser -> user confirmation -> carbon log.  
Security: prefer on-device OCR; upload documents only after explicit consent.  
Rate limits: device performance constraints.  
Fallback: manual entry or cloud OCR.

### 6.6 OpenWeather API

Purpose: Temperature, humidity, AQI, UV context.  
Authentication flow: API key, preferably backend proxy for production.  
Data flow: rounded location -> weather API -> weather_data -> prediction/recommendations.  
Security: round coordinates, do not expose high-privilege keys.  
Rate limits: cache by geohash/time bucket.  
Fallback: last known weather or city-level defaults.

### 6.7 Climate News API

Purpose: Daily climate news and personalized feed.  
Authentication flow: backend API key.  
Data flow: scheduled refresh -> climate_news cache -> mobile feed.  
Security: sanitize article summaries and URLs.  
Rate limits: refresh cache every few hours.  
Fallback: cached news.

### 6.8 OpenAI API

Purpose: AI assistant, recommendations, explanations, report summaries.  
Authentication flow: server-side API key in Edge Function secrets.  
Data flow: redacted user context -> OpenAI -> response -> safety filter -> user.  
Security: no private keys on mobile, redact raw emails/SMS/location, store prompts/responses per preference.  
Rate limits: per-user quotas, response caching for reports.  
Fallback: deterministic recommendation templates.

## 7. Carbon Calculation Engine

### 7.1 Architecture

```text
┌───────────────┐
│ Raw Activity  │
└──────┬────────┘
       ▼
┌───────────────┐     ┌────────────────────┐
│ Normalizer    │◀──▶ │ Unit Conversion     │
└──────┬────────┘     └────────────────────┘
       ▼
┌───────────────┐     ┌────────────────────┐
│ Factor Lookup │◀──▶ │ Versioned Factors  │
└──────┬────────┘     └────────────────────┘
       ▼
┌───────────────┐
│ Calculator    │
└──────┬────────┘
       ▼
┌───────────────┐
│ QA + Explain  │
└──────┬────────┘
       ▼
┌───────────────┐
│ Carbon Log    │
└───────────────┘
```

### 7.2 Emission Factors

Factor records should include:

- category
- region
- unit
- factor value
- source organization
- effective date
- version
- uncertainty range

Example factor units:

- Electricity: kgCO2e/kWh
- Ground transport: kgCO2e/km/passenger
- Flight: kgCO2e/km/passenger with cabin multiplier
- Food: kgCO2e/serving or kgCO2e/kg
- Waste: kgCO2e/kg by disposal method
- Shopping: packaging + delivery + category estimate

### 7.3 Formulas

Electricity:

```text
emissions_kg = units_kwh * regional_grid_factor
```

Transport:

```text
emissions_kg = distance_km * mode_factor * occupancy_adjustment
```

Flight:

```text
emissions_kg = distance_km * flight_factor * cabin_multiplier * trip_multiplier
```

Shopping:

```text
emissions_kg = packaging_factor + delivery_factor + category_item_estimate
```

Food:

```text
emissions_kg = quantity * food_category_factor * locality_adjustment
```

Food waste:

```text
emissions_kg = weight_kg * food_type_factor * disposal_multiplier
```

Savings:

```text
savings_kg = baseline_option_kg - selected_option_kg
```

### 7.4 Calculation Service Design

Inputs:

- category
- normalized activity payload
- region and user profile
- source and confidence

Outputs:

- kgCO2e
- kgCO2e saved
- factor version
- explanation
- warnings

Rules:

- Reject impossible values.
- Flag low-confidence OCR/email extraction for user confirmation.
- Store calculation provenance.
- Recalculate affected scores asynchronously.

## 8. AI Prediction Engine

### 8.1 Inputs

- Transport logs by mode, distance, time, route category
- Flight frequency, cabin, distance
- Electricity usage, weather, billing season
- Shopping vendor/category/delivery type
- Food category and meal timing
- Food waste type and weight
- Goals, preferences, household size, region

### 8.2 Outputs

- 7-day forecast
- 30-day forecast
- 90-day forecast
- Annual forecast
- Risk level
- Top drivers
- Recommended interventions

### 8.3 Data Pipeline

```text
Carbon Logs + Weather + Goals
          │
          ▼
Feature Builder
          │
          ▼
Training/Inference Dataset
          │
          ▼
Model Inference
          │
          ▼
Risk + Explanation Layer
          │
          ▼
prediction_logs + Dashboard + Alerts
```

### 8.4 Feature Engineering

- Rolling 7/14/30-day category totals.
- Day-of-week and weekend features.
- Weather cooling/heating degree indicators.
- Route commute regularity.
- Shopping delivery frequency.
- Food delivery streaks.
- Recent anomalies vs personal baseline.
- Goal adherence and prior recommendation acceptance.

### 8.5 Model Selection

MVP:

- Rule-based baseline plus exponential smoothing.
- Category-specific rolling averages.
- Anomaly detection using z-score vs personal history.

Phase 2:

- Gradient boosted trees for tabular forecasting.
- Quantile forecasts for uncertainty.

Phase 3:

- Sequence model or temporal fusion transformer if data volume justifies it.
- Federated/on-device personalization for privacy-sensitive signals.

### 8.6 Storage and Monitoring

Store every prediction in `prediction_logs` with model version and features hash. Track forecast error once actual emissions arrive. Monitor drift by category, region, device type, and data source. Alert the ML team when forecast error exceeds thresholds.

## 9. Automatic Monitoring System

### 9.1 Real-Time Data Flow

```text
GPS / Activity / Notification / SMS / Gmail / OCR
          │
          ▼
Consent + Permission Check
          │
          ▼
Local Signal Normalizer
          │
          ▼
Offline Queue
          │
          ▼
API Ingestion
          │
          ▼
Deduplication + Confidence Scoring
          │
          ▼
Carbon Event Generation
          │
          ▼
Scores + Prediction + Alerts
```

### 9.2 Background Processing

- Use OS-friendly background tasks for sync windows.
- Batch GPS points and upload summarized segments.
- Import Gmail incrementally using history IDs.
- Process notification/SMS events locally first, then upload normalized metadata.
- Defer OCR uploads until Wi-Fi unless user requests immediate processing.

### 9.3 Battery Optimization

- Prefer Activity Recognition over continuous GPS.
- Use significant location changes, geofencing, and adaptive sampling.
- Stop tracking after inactivity.
- Batch writes and network requests.
- Respect Android background limits and foreground service rules for active trip tracking.

### 9.4 Privacy Protection

- Every monitoring source is opt-in.
- Show current permission status in Privacy Dashboard.
- Minimize raw data retention.
- Hash identifiers for dedupe.
- Redact email/SMS bodies after extraction.
- Store exact GPS only when required; aggregate and delete precise routes quickly.

## 10. Security Architecture

### 10.1 Authentication

- Phone OTP, Google OAuth, Apple OAuth.
- Short-lived access tokens and refresh tokens.
- Device token registration bound to user session.
- Account deletion cascades user-owned data.

### 10.2 Authorization

- Supabase RLS for every user-owned table.
- Service role only for backend jobs.
- API checks user id from JWT, never request body.
- Admin operations require separate admin role and audit log.

### 10.3 Encryption

- TLS for all network traffic.
- Supabase encryption at rest.
- SecureStore for sensitive mobile tokens.
- Encrypted server storage for OAuth refresh tokens and documents.
- Optional app-level encryption for raw OCR/email payloads.

### 10.4 Data Protection by Domain

Location data:

- Round coordinates for weather.
- Delete route polylines after 30-90 days.
- Do not send precise route to AI by default.

Emails:

- Use least-privilege Gmail scopes.
- Store extraction output, not full email body.
- Let users disconnect Gmail and delete imported records.

Shopping data:

- Hash order IDs.
- Avoid storing unnecessary item names for sensitive purchases.
- Use category-level summaries where possible.

Travel data:

- Store airport codes and dates, not full ticket details after parsing.
- Delete uploaded tickets by retention policy.

AI data:

- Redact PII before model calls.
- Store chat history based on preference.
- Use safety prompts and output filters.

### 10.5 Threat Protection

- Rate limits on login, ingestion, AI chat, and uploads.
- File type and size validation.
- Malware scanning for uploaded files in later phases.
- Replay protection with idempotency keys.
- Audit logs for exports, deletion, and connector changes.

## 11. Scalability Architecture

### 11.1 10,000 Users

- Supabase managed Postgres.
- Edge Functions for AI, parsing, reports.
- Scheduled jobs for reports and predictions.
- Basic indexes and RLS.
- Cache climate news and weather.

### 11.2 100,000 Users

- Queue system for OCR, Gmail imports, reports, and notifications.
- Read replicas for analytics-heavy queries.
- Monthly partitioning for carbon logs.
- Materialized views for dashboard aggregates.
- Redis cache for dashboard and factor lookups.
- Dedicated observability stack.

### 11.3 1 Million Users

- API Gateway with horizontally scaled services.
- Event streaming for ingestion and analytics.
- Data warehouse for analytics and ML training.
- Partitioned Postgres or distributed OLTP strategy.
- Separate operational DB from analytics DB.
- Multi-region CDN/object storage for reports.
- Model inference service with autoscaling.

### 11.4 Cost Optimization

- On-device OCR where possible.
- Cache weather/news by region and time bucket.
- Use deterministic recommendations before AI calls.
- Batch Gmail imports.
- Summarize old logs into aggregates.
- Apply per-user AI quotas and prompt compression.

## 12. React Native App Architecture

### 12.1 Folder Structure

```text
src/
  app/
    AppProviders.tsx
    bootstrap.ts
  assets/
    images/
    animations/
  components/
    charts/
    forms/
    cards/
    navigation/
    feedback/
  config/
    env.ts
    featureFlags.ts
  contexts/
    AuthContext.tsx
    PermissionContext.tsx
    ThemeContext.tsx
  data/
    emissionFactors.ts
    constants.ts
  hooks/
    useAuth.ts
    useCarbonScore.ts
    useOfflineSync.ts
    usePermissions.ts
    useBackgroundTracking.ts
  navigation/
    RootNavigator.tsx
    AuthNavigator.tsx
    MainTabs.tsx
    linking.ts
  screens/
    auth/
    dashboard/
    tracking/
    assistant/
    reports/
    insights/
    profile/
    privacy/
  services/
    api/
    auth/
    carbon/
    gps/
    gmail/
    maps/
    ocr/
    notifications/
    weather/
    news/
    ai/
  store/
    authStore.ts
    carbonStore.ts
    preferenceStore.ts
    syncStore.ts
  theme/
    colors.ts
    typography.ts
    spacing.ts
    nativewind.ts
  types/
    api.ts
    domain.ts
    database.ts
  utils/
    validation.ts
    date.ts
    privacy.ts
```

### 12.2 Screens

- Auth: welcome, OTP login, OAuth callback.
- Dashboard: carbon score, trend graph, alerts, goals, recommendations.
- Tracking: electricity, transport, flight, shopping, food, waste, routine.
- Assistant: chat, action plan, recommendation detail.
- Insights: prediction, weather, news, gamification.
- Reports: daily, weekly, monthly, exports.
- Profile: account, permissions, privacy, data controls.

### 12.3 State Management

- Server state: React Query or equivalent cache layer.
- Client state: Zustand for UI/session/offline queue.
- Form state: local screen state plus schema validation.
- Persistent state: AsyncStorage for non-sensitive cache, SecureStore for sensitive tokens.

### 12.4 Offline Support

- Queue mutations with idempotency keys.
- Store pending carbon events locally.
- Optimistically update dashboard with local records.
- Replay on network reconnect.
- Resolve conflicts by server timestamp and source confidence.

### 12.5 Theme System

- Nature-inspired light and dark modes.
- Design tokens for color, typography, spacing, radius, elevation.
- Accessibility-first contrast and text sizing.
- Reduced motion mode for animations.

## 13. Development Roadmap

### Phase 1: MVP, 8-10 Weeks

Features:

- Phone OTP and Google login.
- Dashboard with daily/weekly/monthly score.
- Manual electricity, transport, food, waste, shopping inputs.
- OCR bill upload.
- Carbon calculation engine v1.
- AI assistant with template-backed fallback.
- Push notification registration.
- Daily/weekly report summaries.
- Privacy dashboard.

Dependencies:

- Supabase project.
- Emission factor registry.
- OpenAI key.
- Firebase project.
- Google Maps key.

Risks:

- Incorrect factor assumptions.
- OCR confidence and bill format variance.
- Permission trust.

Testing:

- Unit tests for formulas.
- Component tests for dashboard/tracking.
- RLS tests.
- Physical Android QA.

Deployment:

- Internal testing APK.
- Supabase staging and production.
- Feature flags for AI and integrations.

### Phase 2: Automation, 10-12 Weeks

Features:

- Gmail import for flights, receipts, bills.
- SMS parsing and notification listener.
- GPS trip tracking and activity recognition.
- Route alternatives with Maps/Directions/Places.
- Monthly reports and CSV/PDF export.
- Recommendation engine v2.

Dependencies:

- Google OAuth verification.
- Android permissions policy review.
- Background task implementation.

Risks:

- Battery usage.
- Play Store privacy scrutiny.
- Gmail API quota and consent screen approval.

Testing:

- Connector integration tests.
- Battery and background behavior tests.
- Parser golden datasets.

Deployment:

- Gradual rollout to beta users.
- Monitoring dashboards and crash reporting.

### Phase 3: Prediction and Personalization, 12-16 Weeks

Features:

- ML prediction engine with 7/30/90/annual forecast.
- Anomaly detection and smart alerts.
- Personalized carbon roadmap.
- Gamification, badges, challenges, leaderboard.
- Weather-aware recommendations.

Dependencies:

- Sufficient historical data.
- ML evaluation pipeline.
- Analytics event collection.

Risks:

- Forecast accuracy.
- Over-notification.
- Recommendation fatigue.

Testing:

- Backtesting forecasts.
- Notification precision/recall.
- A/B tests for recommendations.

Deployment:

- Shadow-mode prediction first.
- Enable alerts after accuracy threshold.

### Phase 4: Scale and Platform, 16+ Weeks

Features:

- Dedicated microservices and queue workers.
- Data warehouse and advanced analytics.
- Enterprise/family plans.
- Regional factor marketplace.
- Carbon offset partnerships.
- On-device personalization.

Dependencies:

- Mature observability.
- Data governance.
- Partnership APIs.

Risks:

- Cost growth from AI/API calls.
- Multi-region compliance.
- Data quality at scale.

Testing:

- Load tests for 1M-user target.
- Security penetration test.
- Disaster recovery exercises.

Deployment:

- Blue-green deployments.
- Regional rollout.
- SLA and incident response process.

## 14. Architecture Decisions

| Decision | Choice | Reason |
|---|---|---|
| Mobile framework | React Native Expo | Faster Android delivery, strong ecosystem, OTA-friendly development |
| Backend MVP | Supabase | Auth, Postgres, RLS, Storage, Edge Functions reduce startup complexity |
| Data model | Canonical carbon ledger plus category logs | Auditable calculations and flexible dashboards |
| AI access | Server-side only | Protect keys and redact sensitive context |
| OCR | On-device first | Better privacy and lower cost |
| Predictions | Baseline rules first, ML later | Avoid premature ML before enough data |
| Scaling path | Modular services to microservices | Startup speed now, scale later |

## 15. Open Product Decisions

- Exact carbon factor sources by launch region.
- Whether Gmail import is required for MVP or Phase 2.
- Whether SMS/notification parsing is allowed under target Play Store policies.
- Default retention periods for raw emails, tickets, receipts, and route data.
- Whether leaderboard is global, friends-only, city-level, or anonymous cohort.
- Which climate news provider will be used commercially.

## 16. Build Readiness Checklist

- Product requirements approved.
- Consent copy and privacy policy drafted.
- Emission factor registry selected.
- Supabase schema finalized.
- API contracts agreed.
- AI prompt and safety policy approved.
- Android permission strategy approved.
- MVP analytics events defined.
- Test fixtures collected for bills, tickets, receipts, and SMS formats.
- Release environments created: local, staging, production.

