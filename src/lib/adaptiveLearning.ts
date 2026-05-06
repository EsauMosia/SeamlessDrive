import { supabase } from '../lib/supabase';

export type DrivingProfile = {
  id: string;
  user_id: string;
  braking_threshold: number;
  acceleration_threshold: number;
  turn_threshold: number;
  speed_threshold: number;
  sample_count: number;
  confidence: number;
  created_at: string;
  updated_at: string;
};

type TripMetrics = {
  harshBrakingCount: number;
  rapidAccelerationCount: number;
  aggressiveTurningCount: number;
  speedingCount: number;
  averageSpeed: number;
  maxSpeed: number;
  duration: number;
  distance: number;
};

const DEFAULT_THRESHOLDS = {
  braking: 0.5,
  acceleration: 0.6,
  turn: 3.5,
  speed: 55,
};

const MIN_SAMPLE_FOR_CONFIDENCE = 5;
const MAX_CONFIDENCE = 1.0;
const LEARNING_RATE = 0.15;

class AdaptiveLearningEngine {
  private profile: DrivingProfile | null = null;
  private userId: string | null = null;

  async loadProfile(userId: string): Promise<DrivingProfile | null> {
    this.userId = userId;
    const { data, error } = await supabase
      .from('driving_profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    if (error) { console.error('Error loading driving profile:', error); return null; }
    this.profile = data;
    return data;
  }

  async getOrCreateProfile(userId: string): Promise<DrivingProfile> {
    const existing = await this.loadProfile(userId);
    if (existing) return existing;
    const { data, error } = await supabase
      .from('driving_profiles')
      .insert({ user_id: userId, braking_threshold: DEFAULT_THRESHOLDS.braking, acceleration_threshold: DEFAULT_THRESHOLDS.acceleration, turn_threshold: DEFAULT_THRESHOLDS.turn, speed_threshold: DEFAULT_THRESHOLDS.speed, sample_count: 0, confidence: 0 })
      .select().single();
    if (error) {
      console.error('Error creating driving profile:', error);
      return { id: '', user_id: userId, braking_threshold: DEFAULT_THRESHOLDS.braking, acceleration_threshold: DEFAULT_THRESHOLDS.acceleration, turn_threshold: DEFAULT_THRESHOLDS.turn, speed_threshold: DEFAULT_THRESHOLDS.speed, sample_count: 0, confidence: 0, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
    }
    this.profile = data;
    return data;
  }

  async learnFromTrip(tripMetrics: TripMetrics): Promise<DrivingProfile | null> {
    if (!this.userId || !this.profile) return null;
    const newSampleCount = this.profile.sample_count + 1;
    const eventRate = tripMetrics.duration > 0 ? (tripMetrics.harshBrakingCount + tripMetrics.rapidAccelerationCount) / (tripMetrics.duration / 60) : 0;
    let newBraking = this.profile.braking_threshold;
    let newAcceleration = this.profile.acceleration_threshold;
    let newTurn = this.profile.turn_threshold;
    let newSpeed = this.profile.speed_threshold;
    if (eventRate > 2) {
      newBraking = this.profile.braking_threshold * (1 + LEARNING_RATE * 0.3);
      newAcceleration = this.profile.acceleration_threshold * (1 + LEARNING_RATE * 0.3);
      newTurn = this.profile.turn_threshold * (1 + LEARNING_RATE * 0.2);
    } else if (eventRate < 0.5 && tripMetrics.duration > 120) {
      newBraking = this.profile.braking_threshold * (1 - LEARNING_RATE * 0.1);
      newAcceleration = this.profile.acceleration_threshold * (1 - LEARNING_RATE * 0.1);
      newTurn = this.profile.turn_threshold * (1 - LEARNING_RATE * 0.05);
    }
    if (tripMetrics.averageSpeed > this.profile.speed_threshold * 1.2 && tripMetrics.speedingCount === 0) {
      newSpeed = this.profile.speed_threshold * (1 + LEARNING_RATE * 0.1);
    } else if (tripMetrics.speedingCount > 3) {
      newSpeed = this.profile.speed_threshold * (1 - LEARNING_RATE * 0.05);
    }
    newBraking = Math.max(0.3, Math.min(1.5, newBraking));
    newAcceleration = Math.max(0.3, Math.min(1.5, newAcceleration));
    newTurn = Math.max(2.0, Math.min(6.0, newTurn));
    newSpeed = Math.max(30, Math.min(120, newSpeed));
    const confidence = Math.min(MAX_CONFIDENCE, newSampleCount / MIN_SAMPLE_FOR_CONFIDENCE);
    const { data, error } = await supabase
      .from('driving_profiles')
      .update({ braking_threshold: newBraking, acceleration_threshold: newAcceleration, turn_threshold: newTurn, speed_threshold: newSpeed, sample_count: newSampleCount, confidence })
      .eq('id', this.profile.id).select().single();
    if (error) { console.error('Error updating driving profile:', error); return null; }
    this.profile = data;
    return data;
  }

  getThresholds(): { braking: number; acceleration: number; turn: number; speed: number } {
    if (!this.profile) return { ...DEFAULT_THRESHOLDS };
    return { braking: this.profile.braking_threshold, acceleration: this.profile.acceleration_threshold, turn: this.profile.turn_threshold, speed: this.profile.speed_threshold };
  }

  getConfidence(): number { return this.profile?.confidence ?? 0; }
  getSampleCount(): number { return this.profile?.sample_count ?? 0; }
  isCalibrated(): boolean { return (this.profile?.sample_count ?? 0) >= MIN_SAMPLE_FOR_CONFIDENCE; }
}

export const adaptiveLearning = new AdaptiveLearningEngine();
