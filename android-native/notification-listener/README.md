# Android Notification Listener Module

EcoGuardian AI needs Android notification access to detect food delivery, grocery delivery, e-commerce, Uber/Ola, and order lifecycle events.

Expo Go cannot run a Notification Listener Service. Production requires an Expo development build or bare/prebuild Android project with this native module added.

## Permission Flow

1. Show an in-app explanation screen before asking for access.
2. Open Android notification listener settings with `Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS`.
3. User enables `EcoGuardianNotificationListenerService`.
4. Native service receives notification events.
5. Native module forwards normalized events to React Native and backend `/v1/notifications/events`.

## Supported Packages

- `in.swiggy.android`
- `com.application.zomato`
- `com.grofers.customerapp`
- `com.zeptoconsumerapp`
- `in.amazon.mShop.android.shopping`
- `com.flipkart.android`
- `com.ubercab`
- `com.olacabs.customer`

## Data Captured

- App package name
- Notification title
- Notification body
- Timestamp
- Merchant/platform
- Order lifecycle status
- Raw payload metadata

## Privacy Rules

- Only process supported package names.
- Do not upload unrelated notifications.
- Let users pause monitoring anytime.
- Store raw payloads encrypted or minimized in production.
- Redact personal names, phone numbers, and addresses before AI processing.

