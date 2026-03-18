import { supabase } from '../lib/supabase';

export async function saveDrivingMetrics({
  tripId,
  gps,
  motion,
}: {
  tripId: string;
  gps: any;
  motion: any;
}) {
  try {
    await supabase.from('driving_metrics').insert({
      trip_id: tripId,
      timestamp: new Date().toISOString(),
      speed: gps.speed,
      latitude: gps.latitude,
      longitude: gps.longitude,
      acceleration: motion
        ? Math.sqrt(
            motion.acceleration.x ** 2 +
            motion.acceleration.y ** 2 +
            motion.acceleration.z ** 2
          )
        : null,
    });
  } catch (err) {
    console.error('Error saving driving metrics:', err);
  }
}