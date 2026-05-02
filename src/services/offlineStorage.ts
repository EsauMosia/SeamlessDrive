import { supabase } from '../lib/supabase';

const STORAGE_KEY = 'seamlessdrive_offline_metrics';
const TRIP_KEY = 'seamlessdrive_offline_trips';
const MAX_QUEUE_SIZE = 500;
const SYNC_BATCH_SIZE = 20;
const SYNC_INTERVAL = 30000;

type QueuedMetric = {
  id: string;
  tripId: string;
  timestamp: string;
  speed: number;
  latitude: number;
  longitude: number;
  acceleration: number | null;
};

type OfflineTrip = {
  id: string;
  userId: string;
  startLocation: string;
  startTime: string;
  status: string;
};

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
}

function getQueue(): QueuedMetric[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveQueue(queue: QueuedMetric[]): void {
  try {
    if (queue.length > MAX_QUEUE_SIZE) {
      queue = queue.slice(queue.length - MAX_QUEUE_SIZE);
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
  } catch {
    // localStorage full - trim oldest entries
    const trimmed = queue.slice(Math.floor(MAX_QUEUE_SIZE / 2));
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
    } catch {
      // Give up silently
    }
  }
}

function getOfflineTrips(): OfflineTrip[] {
  try {
    const data = localStorage.getItem(TRIP_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveOfflineTrips(trips: OfflineTrip[]): void {
  try {
    localStorage.setItem(TRIP_KEY, JSON.stringify(trips));
  } catch {
    // Silently fail
  }
}

export const offlineStorage = {
  queueMetric(metric: Omit<QueuedMetric, 'id'>): void {
    const queue = getQueue();
    queue.push({ ...metric, id: generateId() });
    saveQueue(queue);
  },

  getPendingCount(): number {
    return getQueue().length;
  },

  async syncMetrics(): Promise<{ synced: number; failed: number }> {
    const queue = getQueue();
    if (queue.length === 0) return { synced: 0, failed: 0 };

    let synced = 0;
    let failed = 0;
    const remaining: QueuedMetric[] = [];

    for (let i = 0; i < queue.length; i += SYNC_BATCH_SIZE) {
      const batch = queue.slice(i, i + SYNC_BATCH_SIZE);
      const rows = batch.map((m) => ({
        trip_id: m.tripId,
        timestamp: m.timestamp,
        speed: m.speed,
        latitude: m.latitude,
        longitude: m.longitude,
        acceleration: m.acceleration,
      }));

      const { error } = await supabase.from('driving_metrics').insert(rows);

      if (error) {
        failed += batch.length;
        remaining.push(...batch);
      } else {
        synced += batch.length;
      }
    }

    saveQueue(remaining);
    return { synced, failed };
  },

  saveTrip(trip: OfflineTrip): void {
    const trips = getOfflineTrips();
    const existing = trips.findIndex((t) => t.id === trip.id);
    if (existing >= 0) {
      trips[existing] = trip;
    } else {
      trips.push(trip);
    }
    saveOfflineTrips(trips);
  },

  async syncTrips(): Promise<{ synced: number; failed: number }> {
    const trips = getOfflineTrips();
    if (trips.length === 0) return { synced: 0, failed: 0 };

    let synced = 0;
    let failed = 0;
    const remaining: OfflineTrip[] = [];

    for (const trip of trips) {
      const { data: existingTrip } = await supabase
        .from('trips')
        .select('id')
        .eq('id', trip.id)
        .maybeSingle();

      if (existingTrip) {
        // Trip already exists in Supabase, just remove from offline
        synced++;
      } else {
        const { error: insertError } = await supabase.from('trips').insert({
          id: trip.id,
          user_id: trip.userId,
          start_location: trip.startLocation,
          start_time: trip.startTime,
          status: trip.status,
        });

        if (insertError) {
          failed++;
          remaining.push(trip);
        } else {
          synced++;
        }
      }
    }

    saveOfflineTrips(remaining);
    return { synced, failed };
  },

  isOnline(): boolean {
    return navigator.onLine;
  },

  startAutoSync(onSync?: (result: { synced: number; failed: number }) => void): () => void {
    const sync = async () => {
      const result = await Promise.all([
        offlineStorage.syncMetrics(),
        offlineStorage.syncTrips(),
      ]);
      const total = {
        synced: result[0].synced + result[1].synced,
        failed: result[0].failed + result[1].failed,
      };
      if (total.synced > 0 && onSync) {
        onSync(total);
      }
    };

    const intervalId = setInterval(sync, SYNC_INTERVAL);

    const handleOnline = () => {
      sync();
    };

    window.addEventListener('online', handleOnline);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener('online', handleOnline);
    };
  },
};
