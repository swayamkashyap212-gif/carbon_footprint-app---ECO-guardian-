# EcoGuardian AI Advanced Modules

This document maps the production modules to app screens, service boundaries, Supabase tables, and API functions.

## Module Map

| Module | Screen | Mobile Service | Backend Target | Tables |
|---|---|---|---|---|
| Flight Tracking | `FlightScreen` | `flightTracking`, `gmailIntegration`, `ocr` | `carbon-ingest` | `flight_logs`, `carbon_entries` |
| Shopping Carbon | `ShoppingScreen` | `shoppingTracking`, `gmailIntegration` | `carbon-ingest` | `shopping_logs`, `carbon_entries` |
| AI Prediction | `AnalyticsScreen` | `predictionEngine` | `prediction-generate` | `prediction_logs`, `carbon_entries` |
| AI Recommendations | `RecommendationsScreen` | `recommendationEngine`, `ai` | `/v1/recommendations/*` | `recommendations`, `recommendation_events`, `carbon_records`, `orders`, `predictions` |
| Automatic Monitoring | `MonitoringScreen` | `monitoringEngine` | `carbon-ingest` | `transport_logs`, `carbon_entries` |
| Smart Alerts | `AlertsScreen` | `smartAlertEngine`, `notifications` | `notification-dispatcher` | `notifications`, `device_tokens` |
| AI Eco Assistant | `CoachScreen` | `ai` | `ai-carbon-coach` | `ai_chat_history`, `recommendations` |
| Core Trackers | `TrackScreen` | `carbonEngine`, `ocr`, `maps` | `carbon-ingest` | `electricity_logs`, `food_logs`, `food_waste_logs`, `transport_logs` |

## Database Alignment

The production schema now includes the requested domain tables:

- `users`
- `carbon_logs` as a canonical compatibility view over `carbon_entries`
- `flight_logs`
- `shopping_logs`
- `transport_logs`
- `electricity_logs`
- `food_logs`
- `food_waste_logs`
- `prediction_logs`
- `recommendations`
- `recommendation_events`
- `notifications`
- `carbon_goals`
- `carbon_scores`
- `sustainability_scores`
- `ai_chat_history`

## API Contracts

### POST `/functions/v1/carbon-ingest`

Creates a canonical carbon entry from any module.

Request:

```json
{
  "category": "flight",
  "label": "6E 2134 DEL to BOM",
  "kg_co2e": 292.74,
  "source": "gmail",
  "occurred_at": "2026-06-18T08:00:00Z",
  "metadata": {
    "flight_number": "6E 2134",
    "departure_airport": "DEL",
    "destination_airport": "BOM",
    "confidence": 0.92
  }
}
```

### POST `/functions/v1/prediction-generate`

Generates and stores a baseline forecast for the authenticated user.

Response:

```json
{
  "forecast_7d_kg": 76.2,
  "forecast_30d_kg": 296.1,
  "forecast_90d_kg": 888.3,
  "forecast_annual_kg": 3548,
  "risk_level": "medium",
  "sustainability_score": 86
}
```

### Recommendation Engine API

The recommendation engine is exposed from the Node backend and keeps the learning loop server-side.

- `GET /v1/recommendations/dashboard` returns the current ranked dashboard bundle.
- `POST /v1/recommendations/generate` rebuilds and persists recommendations using the latest user context.
- `POST /v1/recommendations/feedback` records shown, clicked, adopted, completed, and dismissed events.
- `POST /v1/recommendations/coach` returns a personalized coach response from the same context bundle.

## Production Integration Notes

- Gmail uses readonly scope only and should import messages incrementally with history IDs.
- ML Kit OCR should run on device first; upload documents only after explicit consent.
- Notification listener and SMS parsing must be opt-in and reviewed against Play Store policy before production.
- GPS tracking should prefer activity recognition and adaptive sampling to protect battery life.
- AI assistant requests must be server-side, redacted, rate-limited, and auditable.
- Recommendation feedback should be recorded for shown/clicked/adopted/completed events so ranking can learn from user behavior.
