# SeamlessDrive

AI-powered driving safety co-pilot. Track trips, monitor driving behavior, get real-time safety alerts, and improve your driving over time with adaptive learning.

## Quick Start

```bash
npm install
npm run dev
```

Open the app in a browser. On mobile, use "Add to Home Screen" to install as a PWA.

## Features

### Core
- **Auth** -- Email/password signup, login, password reset (Supabase)
- **Driving Mode** -- Real-time speed gauge, safety status, GPS + motion sensor integration
- **Trip Tracking** -- Automatic trip recording with distance, duration, speed, safety score
- **Trip History** -- Expandable cards with route map visualization and PDF/CSV export
- **Safety Alerts** -- Severity-based (high/medium/low) with read/unread tracking
- **Profile** -- User profile with safety score, driving statistics, input validation

### Analytics
- **Insights** -- Summary stats (total trips, distance, avg speed, safety score, events)
- **Analytics Dashboard** -- Interactive charts: speed trends, safety score over time, events bar chart, route comparison (Recharts)

### Intelligence
- **Behavior Analysis** -- Detects harsh braking, rapid acceleration, aggressive turns, speeding
- **Crash Detection** -- G-force based crash detection with emergency alert
- **Adaptive Learning** -- Detection thresholds personalize per user over time. After 5 trips, the app calibrates to your driving style, reducing false positives and improving accuracy
- **Driving Detection** -- Automatic driving state detection via speed threshold analysis

### Integration Framework
- **OBD2 Scanner** -- Connect Bluetooth OBD2 adapter for real-time engine data (RPM, fuel, tire pressure, DTC codes)
- **Tesla** -- Connect your Tesla for vehicle telemetry and charging status
- **FordPass** -- Ford vehicle integration (coming soon)
- **Google Maps / Waze** -- Route and traffic data integration (coming soon / beta)
- **Insurance Report** -- Generate and share driving reports with insurance providers
- **Fleet Management** -- Enterprise fleet tracking (coming soon)

### Reliability
- **Offline Support** -- Trips record to localStorage when offline, auto-sync when connectivity returns
- **Error Boundaries** -- React error boundaries prevent white-screen crashes
- **Error Handling UI** -- All data fetches show error messages with retry buttons
- **Write Queue** -- Sensor metrics are batched (5s intervals) to prevent request pile-up
- **Orphaned Trip Cleanup** -- Stale in-progress trips auto-close on login (2h) and via edge function (24h)

### Mobile / PWA
- Installable as a native-like app on Android and iOS
- Service worker with stale-while-revalidate caching
- Apple mobile web app meta tags for iOS home screen
- Responsive design with mobile-first Tailwind breakpoints

## Architecture

```
src/
  App.tsx                          -- Root with auth routing + error boundaries
  main.tsx                         -- Entry point with AuthProvider
  contexts/
    AuthContext.tsx                 -- Auth state, session, orphaned trip cleanup
  components/
    Auth/                           -- Login, Register, ForgotPassword
    Dashboard/                      -- Home, Insights, Analytics, Settings
    Driving/                        -- DrivingMode, DrivingAlert, EmergencyContact
    Home/                           -- HomeScreen with navigation grid
    Integrations/                   -- IntegrationsView (providers, connections, adaptive learning)
    Layout/                         -- Navigation
    Profile/                        -- ProfileView with validation
    Trip/                           -- TripTracker, TripMapView, TripExport
    Trips/                          -- TripsView with expandable details
    Alerts/                         -- AlertsView
    ErrorBoundary.tsx               -- React error boundary with retry UI
  hooks/
    useAutomaticDrivingDetection.ts -- Auto driving state detection
  lib/
    supabase.ts                     -- Supabase client + TypeScript types
    sensorService.ts                -- GPS + DeviceMotion sensor abstraction
    behaviorAnalysis.ts             -- Driving event detection with adaptive thresholds
    crashDetection.ts               -- G-force crash detection
    drivingDetection.ts             -- Speed-based driving state detection
    adaptiveLearning.ts             -- Per-user threshold learning engine
    integrationGateway.ts           -- External app/vehicle connection manager
  services/
    drivingMetricsService.ts        -- Write queue for sensor metrics
    offlineStorage.ts               -- localStorage fallback + auto-sync
    locationService.ts              -- Destination suggestions
supabase/
  migrations/                       -- Database schema (2 migrations)
  functions/
    cleanup-orphaned-trips/         -- Edge function for stale trip cleanup
```

## Database Schema

| Table | Purpose | RLS |
|-------|---------|-----|
| `user_profiles` | User name, phone, safety score, stats | User-scoped |
| `trips` | Trip records with metrics and safety score | User-scoped |
| `safety_alerts` | Driving event alerts with severity | User-scoped |
| `driving_metrics` | Per-second GPS + acceleration telemetry | Trip-owner scoped |
| `safety_zones` | Hazard zones with risk levels | Public read |
| `vehicle_connections` | Third-party app/vehicle connections | User-scoped |
| `vehicle_telemetry` | OBD2/car data (RPM, fuel, DTC codes) | Connection-owner scoped |
| `driving_profiles` | Per-user adaptive learning thresholds | User-scoped |
| `integration_events` | Webhook/API event log | User-scoped |

## Adaptive Learning

The adaptive learning engine personalizes detection thresholds for each user:

1. **Default thresholds**: braking 0.5g, acceleration 0.6g, turn 3.5, speed 55 km/h
2. **After each trip**: The engine analyzes event rates and adjusts thresholds
3. **High event rate** (>2 events/min): Thresholds increase (more lenient) to reduce false positives
4. **Low event rate** (<0.5 events/min): Thresholds decrease (tighter) for better detection
5. **Confidence**: Reaches 100% after 5 trips, shown in the Integrations screen
6. **Bounds**: Thresholds are clamped to safe ranges (e.g., braking: 0.3-1.5g)

## Integration Framework

Adding a new integration provider:

1. Add an entry to `INTEGRATION_PROVIDERS` in `src/lib/integrationGateway.ts`
2. Specify `id`, `name`, `description`, `icon`, `category`, `authType`, `status`
3. If OAuth2: Add a Supabase edge function to handle the OAuth callback
4. If Bluetooth/OBD2: Implement a Web Bluetooth connection handler
5. The IntegrationsView UI automatically renders all providers from the registry

## Environment Variables

Required in `.env`:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run typecheck` | TypeScript type checking |
| `npm run lint` | ESLint |
| `npm run preview` | Preview production build |

## MVP Readiness

- [x] User can sign up and log in
- [x] User can start a driving session with real GPS/motion data
- [x] Driving events are detected and scored in real-time
- [x] Trip data is persisted to Supabase with offline fallback
- [x] User can view trip history with route maps
- [x] User can export trips as PDF or CSV
- [x] Safety alerts are tracked and filterable
- [x] Analytics charts show driving trends
- [x] Adaptive learning personalizes detection over time
- [x] Integration framework supports external apps
- [x] PWA installable on mobile devices
- [x] Error boundaries prevent white-screen crashes
- [x] All data fetches have error handling with retry

### Known Limitations

1. Desktop browsers lack GPS/motion APIs -- Driving Mode shows "Sensors Unavailable"
2. TripTracker uses simulated driving data (demo mode)
3. No automated tests yet
4. No push notifications (crash alerts are in-app only)
5. SVG route map (not real map tiles)

### Post-MVP Roadmap

1. Unit tests for behaviorAnalysis, crashDetection, adaptiveLearning, offlineStorage
2. Leaflet/Mapbox for real map tiles
3. Web push notifications for crash alerts
4. Real OAuth2 flows for Tesla and other providers
5. Web Bluetooth API for OBD2 scanner connection
6. Capacitor wrapper for native Android/iOS distribution
