# Supabase Setup Guide for EcoGuardian AI

## Prerequisites

1. Create a Supabase account at https://supabase.com
2. Create a new project in Supabase Dashboard
3. Note your Project ID and API keys

## Step 1: Configure Environment Variables

Copy `.env.example` to `.env` and fill in your Supabase credentials:

```bash
cp .env.example .env
```

Update these values:
- `EXPO_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `EXPO_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anonymous key

## Step 2: Enable Email Auth

1. Go to **Authentication** → **Providers** in Supabase Dashboard
2. Enable **Email** provider
3. Configure email settings:
   - Set OTP expiry to 300 seconds (5 minutes)
   - Customize email templates if needed
   - Enable "Confirm email" if you want email verification

## Step 3: Run Database Migrations

### Option A: Using Supabase CLI (Recommended)

```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref your-project-id

# Run all migrations
supabase db push
```

### Option B: Manual SQL Execution

Go to **SQL Editor** in Supabase Dashboard and run each migration file in order:

1. `supabase/migrations/20260610000000_initial_schema.sql`
2. `supabase/migrations/20260620000000_rls_policies.sql`
3. `supabase/migrations/20260621000000_edge_functions_data.sql`
4. `supabase/migrations/20260622000000_delivery_tracking.sql`
5. `supabase/migrations/005_complete_schema.sql` (NEW - adds all new tables)

## Step 4: Deploy Edge Functions

```bash
# Deploy all edge functions
supabase functions deploy carbon-ingest
supabase functions deploy prediction-generate
supabase functions deploy ai-carbon-coach
supabase functions deploy notification-dispatcher
```

## Step 5: Configure RLS Policies

The migrations include RLS policies, but verify they're enabled:

1. Go to **Authentication** → **Policies**
2. Check that all tables have RLS enabled
3. Verify policies are active for each table

## Step 6: Test the Setup

1. Start your Expo app:
   ```bash
   npx expo start
   ```

2. Try signing in with email OTP:
   - Enter your email
   - Check your email for the OTP code
   - Enter the code to verify

3. Check Supabase Dashboard:
   - Go to **Table Editor** to see your data
   - Check **Authentication** → **Users** for registered users

## Database Schema Overview

### Core Tables

| Table | Description |
|-------|-------------|
| `profiles` | User profiles (auto-created on signup) |
| `carbon_entries` | All carbon footprint entries |
| `carbon_goals` | User carbon reduction goals |

### Tracking Tables

| Table | Description |
|-------|-------------|
| `delivery_orders` | Delivery order lifecycle tracking |
| `food_delivery_logs` | Food delivery carbon tracking |
| `grocery_delivery_logs` | Grocery delivery tracking |
| `ride_bookings` | Ride booking tracking |
| `flight_logs` | Flight carbon tracking |
| `shopping_logs` | Shopping carbon tracking |
| `electricity_logs` | Electricity consumption tracking |

### Gamification Tables

| Table | Description |
|-------|-------------|
| `user_points` | User points and level |
| `points_events` | Points history |
| `user_badges` | Earned badges |
| `streaks` | Activity streaks |
| `challenges` | Carbon reduction challenges |

### Alert Tables

| Table | Description |
|-------|-------------|
| `smart_alerts` | Personalized carbon alerts |
| `notifications` | Notification history |

## Troubleshooting

### "Invalid API key" Error
- Verify `EXPO_PUBLIC_SUPABASE_ANON_KEY` is correct
- Check that the key matches your Supabase project

### Email OTP Not Received
- Check spam/junk folder
- Verify email provider is enabled in Supabase Dashboard
- Check SMTP settings if using custom email

### RLS Policy Errors
- Ensure RLS is enabled on the table
- Check that the user is authenticated
- Verify the policy allows the operation

### Migration Errors
- Run migrations in order (check timestamps)
- Check for conflicting types or functions
- Review error messages in Supabase Dashboard → Logs

## Advanced Configuration

### Custom Email Templates

Go to **Authentication** → **Email Templates** to customize:
- Confirmation email
- Magic link email
- Change email address email

### Webhooks

Configure webhooks for real-time updates:
1. Go to **Database** → **Webhooks**
2. Create webhook for `carbon_entries` table
3. Set URL to your backend API

### Realtime Subscriptions

Enable realtime for live updates:
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE smart_alerts;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
```

## Security Best Practices

1. **Never commit API keys** to version control
2. **Use environment variables** for all secrets
3. **Enable RLS** on all tables
4. **Regularly rotate keys** in production
5. **Monitor auth logs** for suspicious activity

## Production Checklist

- [ ] Environment variables configured
- [ ] Email provider enabled and tested
- [ ] All migrations applied
- [ ] Edge functions deployed
- [ ] RLS policies verified
- [ ] Email templates customized
- [ ] Monitoring enabled
- [ ] Backups configured
