# Testing Strategy

## Unit Tests

- Carbon formulas: electricity, transport, flight, food, waste, shopping.
- Prediction risk bands.
- Route recommendation sorting and savings calculation.
- Recommendation template coverage for food, grocery, and baseline lifestyle actions.
- Recommendation dashboard ranking and feedback event persistence.
- Offline queue persistence.

## Component Tests

- Dashboard renders score, gauge, trend chart, alerts, and recommendations.
- Recommendations screen renders the ranked engine output, summary metrics, and coach chat.
- Tracker forms calculate and add entries.
- Coach handles loading, fallback, and assistant responses.
- Privacy toggles and export actions render correctly.

## Integration Tests

- Supabase OTP request and verification.
- Row Level Security prevents cross-user reads.
- Edge Function calls OpenAI only with server-side key.
- Notification dispatcher reads alerts and targets registered devices.

## Device QA

- Android small screen, large screen, and dark mode.
- Offline entry creation and sync replay.
- Permission denial states for camera, location, notifications, email/SMS parsing.
- OCR upload flow for electricity bills, tickets, and receipts.
- Route comparison with Google Directions API.

## Accessibility

- Text contrast against glass surfaces.
- Tap targets at least 44 px.
- Screen reader labels for icon-only actions.
- Reduced motion fallback for animated earth and chart transitions.
