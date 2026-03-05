/*
  # SeamlessDrive Database Schema

  ## Overview
  Creates the core database structure for SeamlessDrive, a driver safety application
  that tracks trips, monitors driving behavior, and provides safety alerts.

  ## New Tables
  
  ### `user_profiles`
  - `id` (uuid, primary key, references auth.users)
  - `full_name` (text)
  - `phone` (text)
  - `emergency_contact` (text)
  - `safety_score` (integer, default 100)
  - `total_trips` (integer, default 0)
  - `total_distance` (numeric, default 0)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)
  
  ### `trips`
  - `id` (uuid, primary key)
  - `user_id` (uuid, references user_profiles)
  - `start_time` (timestamptz)
  - `end_time` (timestamptz, nullable)
  - `start_location` (text)
  - `end_location` (text, nullable)
  - `distance` (numeric, default 0)
  - `duration` (integer, default 0, in seconds)
  - `average_speed` (numeric, default 0)
  - `max_speed` (numeric, default 0)
  - `harsh_braking_count` (integer, default 0)
  - `rapid_acceleration_count` (integer, default 0)
  - `safety_score` (integer, default 100)
  - `status` (text, default 'in_progress')
  - `created_at` (timestamptz)
  
  ### `safety_alerts`
  - `id` (uuid, primary key)
  - `trip_id` (uuid, references trips, nullable)
  - `user_id` (uuid, references user_profiles)
  - `alert_type` (text)
  - `severity` (text)
  - `message` (text)
  - `latitude` (numeric, nullable)
  - `longitude` (numeric, nullable)
  - `is_read` (boolean, default false)
  - `created_at` (timestamptz)
  
  ### `driving_metrics`
  - `id` (uuid, primary key)
  - `trip_id` (uuid, references trips)
  - `timestamp` (timestamptz)
  - `speed` (numeric)
  - `latitude` (numeric)
  - `longitude` (numeric)
  - `acceleration` (numeric, nullable)
  - `created_at` (timestamptz)
  
  ### `safety_zones`
  - `id` (uuid, primary key)
  - `name` (text)
  - `zone_type` (text)
  - `latitude` (numeric)
  - `longitude` (numeric)
  - `radius` (numeric, in meters)
  - `accident_count` (integer, default 0)
  - `risk_level` (text)
  - `description` (text, nullable)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ## Security
  - Enable RLS on all tables
  - Users can only access their own data
  - Safety zones are publicly readable
  - Driving metrics are only accessible to trip owners
*/

-- Create user_profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  full_name text,
  phone text,
  emergency_contact text,
  safety_score integer DEFAULT 100,
  total_trips integer DEFAULT 0,
  total_distance numeric DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON user_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Create trips table
CREATE TABLE IF NOT EXISTS trips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  start_time timestamptz DEFAULT now(),
  end_time timestamptz,
  start_location text,
  end_location text,
  distance numeric DEFAULT 0,
  duration integer DEFAULT 0,
  average_speed numeric DEFAULT 0,
  max_speed numeric DEFAULT 0,
  harsh_braking_count integer DEFAULT 0,
  rapid_acceleration_count integer DEFAULT 0,
  safety_score integer DEFAULT 100,
  status text DEFAULT 'in_progress',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE trips ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own trips"
  ON trips FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own trips"
  ON trips FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own trips"
  ON trips FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own trips"
  ON trips FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create safety_alerts table
CREATE TABLE IF NOT EXISTS safety_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid REFERENCES trips(id) ON DELETE CASCADE,
  user_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  alert_type text NOT NULL,
  severity text DEFAULT 'medium',
  message text NOT NULL,
  latitude numeric,
  longitude numeric,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE safety_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own alerts"
  ON safety_alerts FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own alerts"
  ON safety_alerts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own alerts"
  ON safety_alerts FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own alerts"
  ON safety_alerts FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create driving_metrics table
CREATE TABLE IF NOT EXISTS driving_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid REFERENCES trips(id) ON DELETE CASCADE NOT NULL,
  timestamp timestamptz DEFAULT now(),
  speed numeric NOT NULL,
  latitude numeric NOT NULL,
  longitude numeric NOT NULL,
  acceleration numeric,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE driving_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view metrics for own trips"
  ON driving_metrics FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trips
      WHERE trips.id = driving_metrics.trip_id
      AND trips.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert metrics for own trips"
  ON driving_metrics FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM trips
      WHERE trips.id = driving_metrics.trip_id
      AND trips.user_id = auth.uid()
    )
  );

-- Create safety_zones table
CREATE TABLE IF NOT EXISTS safety_zones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  zone_type text NOT NULL,
  latitude numeric NOT NULL,
  longitude numeric NOT NULL,
  radius numeric DEFAULT 500,
  accident_count integer DEFAULT 0,
  risk_level text DEFAULT 'low',
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE safety_zones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view safety zones"
  ON safety_zones FOR SELECT
  TO authenticated
  USING (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_trips_user_id ON trips(user_id);
CREATE INDEX IF NOT EXISTS idx_trips_status ON trips(status);
CREATE INDEX IF NOT EXISTS idx_safety_alerts_user_id ON safety_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_safety_alerts_trip_id ON safety_alerts(trip_id);
CREATE INDEX IF NOT EXISTS idx_driving_metrics_trip_id ON driving_metrics(trip_id);
CREATE INDEX IF NOT EXISTS idx_safety_zones_type ON safety_zones(zone_type);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for user_profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_user_profiles_updated_at'
  ) THEN
    CREATE TRIGGER update_user_profiles_updated_at
      BEFORE UPDATE ON user_profiles
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- Create trigger for safety_zones
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_safety_zones_updated_at'
  ) THEN
    CREATE TRIGGER update_safety_zones_updated_at
      BEFORE UPDATE ON safety_zones
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;