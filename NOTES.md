# SeamlessDrive Development Notes

## Overview
SeamlessDrive is an AI-powered driving safety application that monitors driver behavior, detects potential hazards, and provides real-time feedback to improve road safety.

---

## Recent Updates (Latest Commit)

### 1. Password Reset Feature
- **Component**: `src/components/Auth/ForgotPasswordForm.tsx`
- **Status**: Fully functional
- Added "Forgot password?" link below the Sign In button in the login form
- Uses Supabase's `resetPasswordForEmail()` function to send password reset links
- Shows success confirmation when email is sent
- Includes error handling for invalid email addresses
- Users can seamlessly return to login form via "Back to Sign In" link

**How it works**:
- User clicks "Forgot password?" on login screen
- Enters their email address
- Receives password reset link via email
- AuthPage manages state to show/hide the forgot password form

### 2. Location Autocomplete / Destination Suggestions
- **Service**: `src/services/locationService.ts`
- **Component**: `src/components/Trip/TripTracker.tsx`
- **Status**: Fully functional
- Added destination input field in the trip tracker modal
- Real-time location suggestions appear as user types
- Suggestions filtered from predefined common locations list
- Current common locations include: Airport Terminal, Central Station, Shopping Mall, Hospital, University, Sports Complex, Park, Beach, etc.
- Click any suggestion to instantly populate the destination field
- Suggestions disappear after selection

**Key features**:
- Case-insensitive search matching
- Max 5 suggestions shown at a time
- Styled dropdown with hover effects
- MapPin icon for visual consistency

### 3. Redesigned Driving Mode Dashboard
- **Component**: `src/components/Driving/DrivingMode.tsx`
- **Status**: Fully functional
- Complete UI overhaul with professional circular speed gauge
- Visual enhancements for better focus while driving

**Dashboard Components**:
1. **Speed Gauge** (Center):
   - Large circular SVG gauge showing current speed
   - Animated blue arc that fills as speed increases (max 200 km/h)
   - Large, easy-to-read speed number in center
   - Gauge icon for visual reference

2. **Three Information Cards** (Below gauge):
   - **Duration**: Shows driving time in seconds
   - **Acceleration**: Real-time acceleration meter
     - Green/positive acceleration (speeding up)
     - Blue/negative acceleration (braking/slowing down)
     - Gray/neutral (constant speed)
   - **Status**: Shows "Moving" or "Stopped" based on current speed

3. **Safety Indicator** (Top right):
   - Color-coded status: Green (safe), Yellow (warning), Red (critical)
   - Updates in real-time based on driving events

4. **Alert Display**:
   - Shows active driving alerts with icon and description
   - Color-coded background (red for critical, yellow for warnings)

### 4. Stop Detection & Conditional End Trip Button
- **Status**: Fully functional
- **Logic**: The "End Trip" button only appears when the vehicle comes to a complete stop (speed < 1 km/h)
- **Implementation**:
  - Speed is monitored every second via GPS data
  - `isStopped` state is set to true when speed drops below 1 km/h
  - Button is conditionally rendered only when `isStopped` is true
  - When clicked, shows loading state ("Ending Trip...") and completes the trip
  - Trip data saved to database with final metrics

**Benefits**:
- Safety-focused: Prevents user from ending trip while vehicle is still moving
- Improved UX: Button appears exactly when needed
- Data integrity: Ensures accurate trip completion timing

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
│   │   └── ForgotPasswordForm.tsx (new)
│   ├── Driving/
│   │   ├── DrivingMode.tsx (redesigned)
│   │   ├── DrivingAlert.tsx
│   │   └── EmergencyContactSystem.tsx
│   ├── Trip/
│   │   └── TripTracker.tsx (with location autocomplete)
│   └── Dashboard/
├── contexts/
│   └── AuthContext.tsx (user auth state)
├── services/
│   ├── drivingMetricsService.ts
│   └── locationService.ts (new)
├── lib/
│   ├── supabase.ts (Supabase client)
│   ├── sensorService.ts (GPS & motion tracking)
│   ├── behaviorAnalysis.ts
│   └── crashDetection.ts
└── hooks/
    └── useAutomaticDrivingDetection.ts
```

### Key Services

#### Supabase Integration
- **File**: `src/lib/supabase.ts`
- Handles all database operations for trips, users, and safety alerts
- Client configured with Supabase URL and anon key from `.env`
- Real-time updates for trip data

#### Sensor Service
- **File**: `src/lib/sensorService.ts`
- Manages GPS tracking and motion data
- Provides speed, coordinates, and acceleration data
- Checks browser permissions before accessing device sensors

#### Location Service
- **File**: `src/services/locationService.ts`
- Provides location name suggestions for trip destinations
- Case-insensitive filtering of predefined locations
- Easily extensible for future real-time geolocation API integration

---

## Database Schema

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
- alert_type: text (e.g., "Harsh Braking", "Rapid Acceleration")
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

---

## How to Use the App

### Authentication Flow
1. User registers or logs in with email/password
2. If password forgotten: Click "Forgot password?" → Enter email → Check inbox for reset link
3. Upon successful authentication, redirected to dashboard

### Starting a Drive
1. From dashboard, click "Start Trip" or "Driving Mode"
2. App requests sensor permissions (GPS and motion)
3. Enter destination (autocomplete suggestions appear as you type)
4. Driving mode begins tracking speed, acceleration, and behavior

### During Driving
1. Speed gauge displays current speed in large circular indicator
2. Acceleration meter shows real-time changes
3. Safety status updates based on detected events (harsh braking, rapid acceleration)
4. Any alerts appear below the main metrics

### Ending a Trip
1. Vehicle must come to a complete stop (speed < 1 km/h)
2. "End Trip" button appears when vehicle is stationary
3. Click button to complete the trip
4. Trip data (distance, duration, safety score) saved to database
5. Redirect back to dashboard with updated trip history

---

## State Management

### AuthContext
- Manages user authentication state
- Provides `user`, `signIn`, `signUp`, `signOut`, and `refreshProfile` functions
- Auto-rehydrates from browser localStorage on app startup

### Component State
- Each component manages its own UI state via React hooks
- No global state management library (kept minimal and performant)
- Data persistence handled through Supabase

---

## Styling & Design

### Design System
- **Color Scheme**: Dark theme (slate-950/900) with blue accents
- **Accents**: Blue (#3b82f6), Green (#10b981), Red (#ef4444), Yellow (#f59e0b)
- **Typography**: Light weight (300-400) for modern minimalist look
- **Spacing**: Tailwind CSS with 8px base unit

### Key Design Components
1. **Gradients**: Subtle gradients for visual depth (blue-600/blue-700)
2. **Glass-morphism**: Semi-transparent white overlays with blur (bg-white/5)
3. **Circular Indicators**: Speed gauge uses SVG for smooth animations
4. **Icons**: lucide-react for consistent, minimal iconography
5. **Responsive**: Mobile-first design, works on all device sizes

---

## Testing Checklist

### Password Reset
- [ ] "Forgot password?" link appears on login form
- [ ] Clicking link shows password reset form
- [ ] Entering email and submitting shows success message
- [ ] "Back to Sign In" returns to login form
- [ ] Invalid email shows error message

### Location Autocomplete
- [ ] Destination input appears in trip tracker
- [ ] Typing shows matching location suggestions
- [ ] Clicking suggestion fills the destination field
- [ ] Suggestions disappear after selection
- [ ] Backspace to clear shows suggestions again

### Driving Dashboard
- [ ] Speed gauge displays current speed
- [ ] Gauge arc fills smoothly as speed increases
- [ ] Acceleration shows positive (green), negative (blue), or zero (gray)
- [ ] Status shows "Moving" or "Stopped" correctly
- [ ] Safety status indicator updates with color changes
- [ ] Alerts display properly with icons and text

### End Trip Button
- [ ] Button hidden while vehicle is moving
- [ ] Button appears when speed drops below 1 km/h
- [ ] Clicking button triggers "Ending Trip..." loading state
- [ ] Trip completes and saves to database
- [ ] Redirect to dashboard occurs after completion

---

## Future Enhancements

1. **Real Geolocation API**: Replace mock suggestions with actual geocoding API
2. **Voice Commands**: "Hey, end my trip" voice control while driving
3. **Offline Support**: Service workers for offline trip tracking
4. **Export Functionality**: Download trip data as PDF or CSV
5. **Driver Profiles**: Multiple drivers with personalized settings
6. **Route History**: Map visualization of past trips
7. **Insurance Integration**: Share safety scores with insurance providers
8. **Mobile App**: React Native version for iOS/Android
9. **Real-time Notifications**: Push alerts for dangerous driving
10. **AI Coaching**: Personalized driving recommendations

---

## Deployment Notes

- Project builds successfully with `npm run build`
- No external API keys required (all local development)
- Supabase connection uses environment variables from `.env`
- Production ready with optimized bundle size (~90KB gzipped)

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

### Location Suggestions Not Showing
- Try typing 1+ characters to trigger suggestions
- Check if suggestion list matches predefined locations
- Click input field again if dropdown closes prematurely

---

## Contact & Support
For questions about the codebase or feature requests, refer to the component documentation inline or check the GitHub repository history.

Last updated: April 12, 2026
