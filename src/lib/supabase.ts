import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type UserProfile = {
  id: string;
  full_name: string | null;
  phone: string | null;
  emergency_contact: string | null;
  safety_score: number;
  total_trips: number;
  total_distance: number;
  created_at: string;
  updated_at: string;
};

export type Trip = {
  id: string;
  user_id: string;
  start_time: string;
  end_time: string | null;
  start_location: string;
  end_location: string | null;
  distance: number;
  duration: number;
  average_speed: number;
  max_speed: number;
  harsh_braking_count: number;
  rapid_acceleration_count: number;
  safety_score: number;
  status: string;
  created_at: string;
};

export type SafetyAlert = {
  id: string;
  trip_id: string | null;
  user_id: string;
  alert_type: string;
  severity: string;
  message: string;
  latitude: number | null;
  longitude: number | null;
  is_read: boolean;
  created_at: string;
};
