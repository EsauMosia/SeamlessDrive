/*
  # Add emergency contacts table and seed safety zones

  1. New Tables
    - `emergency_contacts`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `name` (text)
      - `phone` (text)
      - `relationship` (text, optional)
      - `created_at` (timestamp)

  2. Safety Zones Seed Data
    - 15 high-risk zones across major US cities
    - Includes school zones, highway interchanges, accident hotspots
    - Risk levels: high, medium, low
    - Accident counts based on realistic data

  3. Security
    - RLS enabled on emergency_contacts
    - Users can only read/write their own contacts
    - Safety zones remain publicly readable (already configured)
*/

-- Create emergency_contacts table
CREATE TABLE IF NOT EXISTS emergency_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  phone text NOT NULL,
  relationship text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE emergency_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own emergency contacts"
  ON emergency_contacts FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own emergency contacts"
  ON emergency_contacts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own emergency contacts"
  ON emergency_contacts FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own emergency contacts"
  ON emergency_contacts FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Seed safety zones with realistic hazard data
INSERT INTO safety_zones (name, zone_type, latitude, longitude, radius, accident_count, risk_level, description) VALUES
  ('I-405 / I-10 Interchange', 'highway_interchange', 34.0321, -118.4655, 300, 47, 'high', 'One of the most congested interchanges in the US. Frequent rear-end and lane-change collisions.'),
  ('School Zone - Lincoln Elementary', 'school_zone', 34.0522, -118.2437, 200, 12, 'high', 'Active school zone with high pedestrian traffic. Reduced speed limits during school hours.'),
  ('Highway 101 / Highway 92 Merge', 'highway_merge', 37.5585, -122.2711, 400, 38, 'high', 'High-speed merge zone with limited visibility. Frequent sideswipe collisions.'),
  ('Downtown Intersection - 5th & Main', 'urban_intersection', 40.7128, -74.0060, 150, 29, 'high', 'High pedestrian and cyclist traffic. Frequent right-turn and crosswalk incidents.'),
  ('I-95 Construction Zone', 'construction_zone', 39.9526, -75.1652, 800, 22, 'high', 'Active construction with lane shifts and reduced shoulders. Speed fines doubled.'),
  ('Mountain Pass - Route 2', 'mountain_road', 42.3601, -71.0589, 1000, 15, 'medium', 'Steep grades, sharp curves, and frequent ice patches in winter. Reduced visibility.'),
  ('Railroad Crossing - Mill Ave', 'railroad_crossing', 33.4255, -111.9400, 100, 8, 'medium', 'Active rail crossing with limited queue space. Trains pass 20+ times daily.'),
  ('Hospital Zone - City Medical Center', 'hospital_zone', 41.8781, -87.6298, 250, 6, 'medium', 'Ambulance and emergency vehicle traffic. Frequent sudden stops near entrance.'),
  ('I-285 Perimeter Curve', 'highway_curve', 33.7490, -84.3880, 500, 34, 'high', 'Notorious curve with frequent speed-related rollover accidents, especially in wet conditions.'),
  ('Pedestrian District - French Quarter', 'pedestrian_zone', 29.9584, -90.0644, 300, 18, 'medium', 'Heavy pedestrian traffic day and night. Narrow streets with limited sight lines.'),
  ('Bridge Approach - Memorial Bridge', 'bridge_zone', 38.8899, -77.0500, 200, 11, 'medium', 'Bridge approach with lane reduction. Frequent rear-end collisions during peak hours.'),
  ('I-35W / I-94 Interchange', 'highway_interchange', 44.9813, -93.2730, 350, 41, 'high', 'Complex multi-lane interchange with short merge distances. High accident rate year-round.'),
  ('School Zone - Westlake High', 'school_zone', 30.2672, -97.7431, 200, 9, 'medium', 'Active school zone with bus traffic. Student drivers in the area.'),
  ('Fog Prone Valley - Route 99', 'low_visibility', 36.7378, -119.7871, 2000, 52, 'high', 'Tule fog zone with near-zero visibility Nov-Feb. Multi-vehicle pileups common.'),
  ('Wildlife Crossing - Blue Ridge Pkwy', 'wildlife_zone', 35.5653, -83.4985, 1500, 14, 'medium', 'Active deer and bear crossing zone, especially dawn and dusk. Limited lighting.')
ON CONFLICT DO NOTHING;
