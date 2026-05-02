import { supabase } from '../lib/supabase';
import { offlineStorage } from './offlineStorage';

type MetricPayload = {
  tripId: string;
  gps: { speed: number; latitude: number; longitude: number };
  motion: { acceleration: { x: number; y: number; z: number } } | null;
};

let writeQueue: MetricPayload[] = [];
let isFlushing = false;
const FLUSH_INTERVAL = 5000;
const MAX_QUEUE_BEFORE_FLUSH = 10;
let flushTimerId: ReturnType<typeof setInterval> | null = null;

function computeAcceleration(motion: MetricPayload['motion']): number | null {
  if (!motion) return null;
  return Math.sqrt(
    motion.acceleration.x ** 2 +
    motion.acceleration.y ** 2 +
    motion.acceleration.z ** 2
  );
}

async function flushQueue(): Promise<void> {
  if (isFlushing || writeQueue.length === 0) return;

  isFlushing = true;
  const batch = writeQueue.splice(0, writeQueue.length);
  isFlushing = false;

  if (batch.length === 0) return;

  if (!offlineStorage.isOnline()) {
    for (const item of batch) {
      offlineStorage.queueMetric({
        tripId: item.tripId,
        timestamp: new Date().toISOString(),
        speed: item.gps.speed,
        latitude: item.gps.latitude,
        longitude: item.gps.longitude,
        acceleration: computeAcceleration(item.motion),
      });
    }
    return;
  }

  const rows = batch.map((item) => ({
    trip_id: item.tripId,
    timestamp: new Date().toISOString(),
    speed: item.gps.speed,
    latitude: item.gps.latitude,
    longitude: item.gps.longitude,
    acceleration: computeAcceleration(item.motion),
  }));

  const { error } = await supabase.from('driving_metrics').insert(rows);

  if (error) {
    console.error('Error flushing metrics batch, queuing offline:', error);
    for (const item of batch) {
      offlineStorage.queueMetric({
        tripId: item.tripId,
        timestamp: new Date().toISOString(),
        speed: item.gps.speed,
        latitude: item.gps.latitude,
        longitude: item.gps.longitude,
        acceleration: computeAcceleration(item.motion),
      });
    }
  }
}

function startFlushTimer(): void {
  if (flushTimerId) return;
  flushTimerId = setInterval(() => {
    flushQueue();
  }, FLUSH_INTERVAL);
}

function stopFlushTimer(): void {
  if (flushTimerId) {
    clearInterval(flushTimerId);
    flushTimerId = null;
  }
}

export async function saveDrivingMetrics(payload: MetricPayload): Promise<void> {
  writeQueue.push(payload);

  if (writeQueue.length >= MAX_QUEUE_BEFORE_FLUSH) {
    flushQueue();
  } else {
    startFlushTimer();
  }
}

export function shutdownMetricsService(): void {
  stopFlushTimer();
  flushQueue();
}

export { flushQueue };
