# Sakhi — continuous safety, SMS alerts and location history

Sakhi already has SOS, a one-shot safe-arrival timer, trusted contacts, live sharing and helplines. This adds the continuous behaviours, real SMS delivery, a distinct alert sound and a 10-day location history page.

## 1. Repeating safety check-ins
- Replace the one-shot countdown with a repeating check-in session: pick an interval (5 / 10 / 15 / 30 min) and start.
- At each interval the app prompts "Are you safe?" with a large **I'm safe** button and a grace period (default 2 min).
- No response within the grace period → automatic SOS alert (location + SMS to contacts), then the session keeps running until stopped.
- The session lives in the database, so it survives page reloads and navigation between tabs, and a banner showing the next check-in time appears on every screen.

## 2. Continuous live location sharing
- Live sharing keeps running in the background across pages while the app is open, pinging position every few seconds.
- Auto-starts with SOS and with a check-in session; stays on until stopped manually or the session ends.
- The public share link keeps auto-refreshing as it does today.

## 3. Distinct alert sound
- A unique rising siren tone (generated in-browser, no audio file) plays for SOS and missed check-ins — clearly different from ordinary success/error toasts.
- Plays for the user in the app and for anyone watching the public share link when the alert goes active.
- Fully suppressed when Silent Alarm mode is on (user side only — contacts still hear it).
- Toggle in Safety settings for the alert tone.

## 4. SMS alerts to trusted contacts
- On SOS and on a missed check-in, every trusted contact gets an SMS with the user's name, alert type and the live-location link.
- Also used for the contact verification step in onboarding, replacing today's manual "mark verified".
- Delivery attempts are logged so the dashboard can show "sent / failed" per contact.
- Requires connecting a Twilio account (SMS provider). Twilio charges per message; I'll walk you through connecting it during the build.

## 5. Location history page (10 days)
- New **History** tab: map trail plus a day-by-day timeline of recorded points.
- Points are recorded periodically while the app is open and tracking is enabled, deduplicated so only meaningful movement is stored.
- Anything older than 10 days is deleted automatically by a scheduled cleanup job.
- Per-day filter, and a "Delete my history" button for full control.

## Technical notes
- New tables: `checkin_sessions` (interval, next due, grace, active), `location_history` (user, lat/lng, accuracy, recorded_at), `alert_deliveries` (alert, contact, channel, status, provider id). All RLS-scoped to `auth.uid()` with explicit grants.
- Scheduled `pg_cron` jobs: one to escalate overdue check-ins server-side, one nightly to purge `location_history` older than 10 days.
- SMS sending via a `createServerFn` calling Twilio through the Lovable connector gateway; contact phone numbers normalized to E.164 before sending.
- Alert tone built with the Web Audio API (same approach as the existing fake-call ringtone) in a shared `useAlertTone` hook.
- Live share and check-in state move into shared providers mounted in the root layout so they persist across route changes; the dashboard keeps its current rose/plum design system and large touch targets.
