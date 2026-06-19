# Security, Privacy, and Compliance

## Data Protection

- Supabase Auth manages user identity.
- Row Level Security is enabled on all user-owned tables.
- Private API keys stay in Supabase Edge Functions.
- The mobile app stores session data in AsyncStorage through Supabase; sensitive future tokens should move to SecureStore wrappers.
- Offline queue payloads should be minimized and encrypted before storing high-risk data.

## Permission Management

EcoGuardian AI asks for permissions only when a feature needs them:

- Location: automatic transport tracking and route recommendations.
- Camera: bill, food, ticket, and receipt scanning.
- Notifications: high-carbon alerts and reminders.
- Email/SMS parsing: opt-in ingestion of bills, tickets, and purchase receipts.

## GDPR Controls

- Privacy Dashboard exposes user-level feature toggles.
- Users can request export via PDF/CSV reports.
- Account deletion should cascade via `auth.users` foreign keys.
- Carbon entries store metadata as JSONB, making deletion and minimization policies enforceable.

## AI Safety

- AI responses are advisory and should show measurable lifestyle suggestions.
- Server prompts instruct the coach to avoid medical, legal, or financial certainty.
- High-impact recommendations should include calculation provenance.

## Production Hardening

- Add encrypted offline storage for sensitive OCR/email/SMS payloads.
- Add audit logs for exports and account deletion.
- Add rate limits on Edge Functions.
- Add backend verification for all client-submitted carbon calculations.
- Add consent records for each data connector.
