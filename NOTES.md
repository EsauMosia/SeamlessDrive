# SeamlessDrive Development Notes

## Overview
SeamlessDrive is an AI-powered driving safety application that monitors driver behavior, detects potential hazards, and provides real-time feedback to improve road safety. The system is preventive, not just reactive -- it warns drivers before crashes happen.

---

## Version History

### v2.0 -- Preventive Safety System + Stability Fixes

#### New Safety Engines

1. **Fatigue Detection** (`src/lib/fatigueDetection.ts`)
   - Monitors 5 fatigue indicators: time-on-road, micro-sleeps, steering correction rate, lane deviation, speed variability
   - 4 severity levels: alert, mild, moderate, severe
   - Warning at 90 minutes continuous driving, critical at 120 minutes
   - Severe fatigue triggers "PULL OVER" alert
   - Detects micro-sleeps via sudden speed drops (>15 km/h drop in <3 seconds)
   - Steering correction rate: >8 corrections per minute indicates fatigue

2. **Hazard Zone Detection** (`src/lib/hazardZoneDetection.ts`)
   - Queries `safety_zones` table for nearby high-risk areas
   - Haversine distance calculation for zone proximity
   - Alerts when approaching (within 500m) or inside hazard zones
   - 15 real US hazard zones seeded in database
   - Caches zones, refreshes every 30 seconds or 2km of movement
   - Dismissible alerts with 5-minute cooldown before re-alerting

3. **Distraction Detection** (`src/lib/distractionDetection.ts`)
   - Detects phone handling via lateral/vertical motion spikes (>0.8G threshold)
   - Counts rapid direction changes (phone fumbling pattern)
   - Detects erratic motion variance (>2.5 normalized variance)
   - Escalating severity: first warning, then "STOP" after 3+ events
   - 30-second alert cooldown to prevent alert fatigue

4. **Emergency Dispatch** (`supabase/functions/crash-alert/`)
   - Edge function deployed to Supabase
   - On crash: logs to `safety_alerts` table
   - Fetches user's emergency contacts from `emergency_contacts` table
   - Logs notification intent for each contact (SMS integration point for Twilio/Vonage)
   - Returns contact list and Google Maps location link
   - Logs full event to `integration_events` for audit trail

#### Driving Mode Overhaul (`src/components/Driving/DrivingMode.tsx`)
- Crash alert now shows real emergency flow: Call 911 button, Share Location link, contact notification status
- SOS button always visible in header for manual activation
- Fatigue indicator bar with time-since-break and severity
- Distraction indicator with escalating warnings
- Hazard zone alerts with dismiss capability
- Speed gauge color changes with safety status (blue/amber/red)
- Duration display in minutes+seconds format

#### Database Changes
- `emergency_contacts` table created with RLS (users can only read/write their own)
- 15 safety zones seeded across US cities (highway interchanges, school zones, construction, fog zones, wildlife crossings)
- Migration: `20260508232124_add_emergency_contacts_and_seed_zones.sql`

#### Stability Fixes (9 bugs fixed)
1. **CRITICAL**: `drivingMetricsService.ts` flushQueue race condition -- `isFlushing` was reset before async Supabase insert completed, allowing concurrent flushes and duplicate metric writes. Fixed by moving flag reset to `finally` block.
2. **HIGH**: Stale closure in DrivingMode monitoring interval -- `drivingTime` state was captured at mount (always 0), so hazard detection (every 10s) and fatigue detection (every 30s) never triggered. Fixed with `drivingTimeRef`.
3. **HIGH**: Memory leak in hazard detection -- async IIFE could call setState after component unmount. Fixed with `mountedRef` guard.
4. **HIGH**: Unhandled promise rejection in `offlineStorage.startAutoSync` -- sync function had no try/catch, so Supabase failures caused unhandled rejections and silently killed auto-sync. Fixed with try/catch.
5. **HIGH**: `shutdownMetricsService` was calling `flushQueue()` without await, losing the final metrics batch on trip end. Changed to async with await.
6. **MEDIUM**: Crash alert with 0,0 coordinates -- if GPS was never acquired, emergency contacts received Null Island coordinates. Now validates GPS before including.
7. **MEDIUM**: Negative speed in crash detection -- some GPS APIs return negative speeds, causing false crash alerts. Added `Math.max(0, speed)`.
8. **MEDIUM**: Zero GPS in hazard detection -- `checkHazards` now returns empty if lat/lng are both 0.
9. **MEDIUM**: Trip update before metrics sync -- added 500ms delay after `syncMetrics()` to ensure Supabase has committed all metrics before querying.

---

### v1.0 -- MVP Application

#### Core Features
- Auth: Email/password signup, login, password reset (Supabase)
- Dashboard: Home, Insights, Analytics (lazy-loaded), Settings, Integrations
- Driving Mode: Real-time speed gauge, safety status, GPS/motion sensors
- Trip Tracking: GPS-based recording with safety scoring
- Trip History: Expandable cards with route map and PDF/CSV export
- Safety Alerts: Severity-based with read/unread tracking
- Profile: User profile with safety score and input validation
- Analytics Dashboard: Speed trends, safety score, events charts (Recharts)
- Adaptive Learning: Personalized thresholds that improve after 5 trips
- Integration Framework: OBD2, Tesla, FordPass, Google Maps, Waze, Insurance, Fleet
- Offline Support: localStorage fallback with auto-sync on reconnect
- Error Boundaries: Prevents white-screen crashes
- PWA: manifest.json, service worker, Add to Home Screen

---

## Architecture Overview

### Component Structure
```
src/
├── components/
│   ├── Auth/
│   │   ├── AuthPage.tsx (main auth router)
│   │   ├── LoginForm.tsx (with forgot password link)
│   │   ├── RegisterForm.tsx
│   │   └── ForgotPasswordForm.tsx
│   ├── Driving/
│   │   ├── DrivingMode.tsx (preventive safety dashboard)
│   │   ├── DrivingAlert.tsx
│   │   ├── EmergencyContactSystem.tsx
│   │   └── VoiceFeedbackRecorder.tsx
│   ├── Trip/
│   │   ├── TripTracker.tsx (with location autocomplete)
│   │   ├── TripMapView.tsx (SVG route visualization)
│   │   └── TripExport.tsx (PDF/CSV export)
│   ├── Trips/
│   │   └── TripsView.tsx (expandable trip history)
│   ├── Dashboard/
│   │   ├── Dashboard.tsx (tab navigation)
│   │   ├── HomeScreen.tsx
│   │   ├── InsightsScreen.tsx
│   │   ├── AnalyticsDashboard.tsx (lazy-loaded)
│   │   └── SettingsScreen.tsx
│   ├── Alerts/
│   │   └── AlertsView.tsx
│   ├── Integrations/
│   │   └── IntegrationsView.tsx
│   ├── Profile/
│   │   └── ProfileView.tsx
│   ├── Layout/
│   │   └── Navigation.tsx
│   ├── Home/
│   │   └── HomeScreen.tsx
│   └── ErrorBoundary.tsx
├── contexts/
│   └── AuthContext.tsx (user auth state)
├── services/
│   ├── drivingMetricsService.ts (batched metric writes)
│   ├── locationService.ts (destination autocomplete)
│   └── offlineStorage.ts (localStorage fallback + auto-sync)
├── lib/
│   ├── supabase.ts (Supabase client)
│   ├── sensorService.ts (GPS & motion tracking)
│   ├── behaviorAnalysis.ts (event detection with adaptive thresholds)
│   ├── crashDetection.ts (G-force + speed drop detection)
│   ├── fatigueDetection.ts (5-indicator fatigue analysis)
│   ├── hazardZoneDetection.ts (proximity-based zone alerts)
│   ├── distractionDetection.ts (phone handling + erratic motion)
│   ├── adaptiveLearning.ts (personalized threshold calibration)
│   ├── drivingDetection.ts (automatic driving state detection)
│   └── integrationGateway.ts (vehicle connection management)
└── hooks/
    └── useAutomaticDrivingDetection.ts
```

### Key Services

#### Supabase Integration
- **File**: `src/lib/supabase.ts`
- Handles all database operations for trips, users, and safety alerts
- Client configured with Supabase URL and anon key from `.env`

#### Sensor Service
- **File**: `src/lib/sensorService.ts`
- Manages GPS tracking and motion data
- Provides speed, coordinates, and acceleration data
- Checks browser permissions before accessing device sensors

#### Driving Metrics Service
- **File**: `src/services/drivingMetricsService.ts`
- Batches metric writes every 5 seconds or when queue reaches 10 items
- Falls back to offline storage when network is unavailable
- `isFlushing` flag prevents concurrent writes (fixed in v2.0)

#### Offline Storage
- **File**: `src/services/offlineStorage.ts`
- Queues driving metrics to localStorage when offline
- Syncs metrics in batches (20 per batch) when online
- Max queue size 500, trims oldest entries on overflow
- Auto-sync runs every 30 seconds and on 'online' event
- Error handling in sync loop (fixed in v2.0)

---

## Database Schema

### user_profiles table
```
- id: uuid (primary key, references auth.users)
- full_name: text
- phone: text
- emergency_contact: text
- total_trips: integer (default 0)
- total_distance: numeric (default 0)
- safety_score: numeric (default 100)
- created_at: timestamptz
- updated_at: timestamptz
```

### trips table
```
- id: uuid (primary key)
- user_id: uuid (foreign key)
- start_time: timestamp
- end_time: timestamp
- start_location: text
- end_location: text
- distance: numeric
- duration: integer (seconds)
- average_speed: numeric
- max_speed: numeric
- harsh_braking_count: integer
- rapid_acceleration_count: integer
- safety_score: numeric (0-100)
- status: text (in_progress/completed)
```

### safety_alerts table
```
- id: uuid (primary key)
- user_id: uuid (foreign key)
- trip_id: uuid (foreign key)
- alert_type: text (e.g., "Crash Detected", "Harsh Braking")
- severity: text (low/medium/high)
- message: text
- created_at: timestamp
```

### driving_metrics table
```
- id: uuid (primary key)
- trip_id: uuid (foreign key)
- timestamp: timestamp
- latitude: numeric
- longitude: numeric
- speed: numeric
- acceleration: numeric
```

### safety_zones table
```
- id: uuid (primary key)
- name: text
- zone_type: text (highway_interchange, school_zone, construction_zone, etc.)
- latitude: numeric
- longitude: numeric
- radius: numeric (default 500, in meters)
- accident_count: integer (default 0)
- risk_level: text (low/medium/high)
- description: text
- created_at: timestamptz
- updated_at: timestamptz
```

### emergency_contacts table
```
- id: uuid (primary key)
- user_id: uuid (foreign key, references auth.users)
- name: text
- phone: text
- relationship: text (optional)
- created_at: timestamptz
```

### integration_events table
```
- id: uuid (primary key)
- user_id: uuid (foreign key)
- provider: text
- event_type: text
- payload: jsonb
- created_at: timestamptz
```

---

## Edge Functions

### crash-alert
- **File**: `supabase/functions/crash-alert/index.ts`
- **Trigger**: POST from DrivingMode when crash detected or SOS pressed
- **Actions**:
  1. Logs crash event to `safety_alerts` table
  2. Fetches user's emergency contacts from `emergency_contacts`
  3. Fetches user's name from `user_profiles`
  4. Logs notification intent for each contact (SMS integration point)
  5. Logs full event to `integration_events` for audit trail
  6. Returns contact list and Google Maps location link
- **JWT verification**: Enabled (requires authenticated user)

### cleanup-orphaned-trips
- **Trigger**: Scheduled or manual
- **Actions**: Closes trips stuck in `in_progress` status for more than 24 hours

---

## How to Use the App

### Authentication Flow
1. User registers or logs in with email/password
2. If password forgotten: Click "Forgot password?" -> Enter email -> Check inbox for reset link
3. Upon successful authentication, redirected to dashboard

### Starting a Drive
1. From dashboard, click "Start Trip" or "Driving Mode"
2. App requests sensor permissions (GPS and motion)
3. Enter destination (autocomplete suggestions appear as you type)
4. Driving mode begins tracking speed, acceleration, and behavior

### During Driving
1. Speed gauge displays current speed in large circular indicator
2. Acceleration meter shows real-time changes
3. Safety status updates based on detected events
4. Fatigue indicator shows time since last break
5. Distraction detection warns about phone handling
6. Hazard zone alerts appear when approaching high-risk areas
7. SOS button available for manual emergency activation

### Ending a Trip
1. Vehicle must come to a complete stop (speed < 1 km/h)
2. "End Trip" button appears when vehicle is stationary
3. Click button to complete the trip
4. Trip data (distance, duration, safety score) saved to database
5. Adaptive learning updates personalized thresholds
6. Redirect back to dashboard with updated trip history

### Crash Detection Flow
1. G-force > 2.5G + 80% speed drop detected
2. Crash alert screen appears with Call 911 button
3. Edge function notifies emergency contacts with location
4. Share Location link opens Google Maps with GPS coordinates
5. "I'm OK - Dismiss" button to close if false alarm

---

## Known Limitations

1. Desktop browsers lack GPS/motion APIs -- Driving Mode shows "Sensors Unavailable"
2. TripTracker uses simulated data (demo mode, not real sensors)
3. No automated tests yet
4. No push notifications (crash alerts are in-app only)
5. Route map is SVG-based (not real map tiles like Leaflet/Mapbox)
6. No pagination on trip history (loads all trips)
7. SMS notifications are logged but not actually sent (needs Twilio/Vonage integration)
8. Speed limit awareness not yet implemented (needs OpenStreetMap/HERE API)

---

## Testing Checklist

### Authentication
- [ ] Register with valid email/password
- [ ] Login with correct credentials
- [ ] Login with wrong password shows error
- [ ] "Forgot password?" link shows reset form
- [ ] Password reset email sent successfully
- [ ] "Back to Sign In" returns to login

### Driving Mode
- [ ] Speed gauge displays current speed
- [ ] Gauge arc fills smoothly as speed increases
- [ ] Acceleration shows positive/negative/zero correctly
- [ ] Status shows "Moving" or "Stopped" correctly
- [ ] Safety status indicator updates with color changes
- [ ] Fatigue indicator appears after 90 minutes
- [ ] Distraction detection warns on phone handling
- [ ] Hazard zone alerts appear near seeded zones
- [ ] SOS button opens emergency confirmation modal
- [ ] Crash detection triggers emergency flow
- [ ] End Trip button only appears when stopped

### Trip History
- [ ] Completed trips appear in trip list
- [ ] Filter by completed/in-progress works
- [ ] Expandable trip details show correctly
- [ ] Trip map renders route visualization
- [ ] PDF export generates downloadable file
- [ ] CSV export generates downloadable file

### Offline
- [ ] Trip starts and records while offline
- [ ] Metrics queue in localStorage when offline
- [ ] Auto-sync runs when connection restored
- [ ] Pending sync count displays correctly

### Profile
- [ ] Profile data loads and displays
- [ ] Name validation (max 100 chars)
- [ ] Phone validation (7-20 chars, allowed symbols)
- [ ] Save shows success feedback
- [ ] Emergency contacts can be added/removed

---

## Deployment Notes

- Project builds successfully with `npm run build`
- Supabase connection uses environment variables from `.env`
- Production bundle: ~360KB main + ~391KB analytics (lazy-loaded)
- Gzipped: ~102KB main + ~115KB analytics
- Edge functions deployed via Supabase MCP tools
- Migrations applied via Supabase MCP tools

---

## Common Issues & Troubleshooting

### Sensors Not Available
- Browser may not support Geolocation or DeviceMotion APIs
- User must grant permissions when prompted
- Test on HTTPS-only environments (required for sensor access)

### Trip Data Not Saving
- Check Supabase connection and authentication status
- Verify `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `.env`
- Check browser console for specific error messages
- If offline, data is queued in localStorage and syncs on reconnect

### Hazard/Fatigue Alerts Not Appearing
- Hazard detection runs every 10 seconds (requires GPS data)
- Fatigue detection runs every 30 seconds (requires motion data)
- Ensure GPS and motion permissions are granted
- Check that `safety_zones` table has data for your area

### Crash Alert Shows "No Emergency Contacts"
- Add emergency contacts in Profile or Emergency Contact System
- Contacts are stored in `emergency_contacts` table with RLS

---

Last updated: May 8, 2026
