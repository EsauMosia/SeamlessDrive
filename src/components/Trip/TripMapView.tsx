import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { MapPin, Navigation, Clock, Zap, AlertTriangle } from 'lucide-react';

type TripMapViewProps = {
  tripId: string;
};

type DrivingMetric = {
  latitude: number;
  longitude: number;
  speed: number;
  timestamp: string;
};

type TripData = {
  start_location: string;
  end_location: string | null;
  distance: number;
  duration: number;
  average_speed: number;
  safety_score: number;
  harsh_braking_count: number;
  rapid_acceleration_count: number;
};

export function TripMapView({ tripId }: TripMapViewProps) {
  const [trip, setTrip] = useState<TripData | null>(null);
  const [metrics, setMetrics] = useState<DrivingMetric[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTripData();
  }, [tripId]);

  const fetchTripData = async () => {
    try {
      const { data: tripData } = await supabase
        .from('trips')
        .select('*')
        .eq('id', tripId)
        .maybeSingle();

      const { data: metricsData } = await supabase
        .from('driving_metrics')
        .select('*')
        .eq('trip_id', tripId)
        .order('timestamp', { ascending: true });

      setTrip(tripData);
      setMetrics(metricsData || []);
    } catch (err) {
      console.error('Error fetching trip data:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-400"></div>
      </div>
    );
  }

  if (!trip || metrics.length === 0) {
    return (
      <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-8 text-center">
        <MapPin className="w-12 h-12 text-gray-600 mx-auto mb-3" />
        <p className="text-gray-400">No route data available for this trip</p>
        <p className="text-gray-500 text-sm mt-1">Route tracking data is recorded during driving</p>
      </div>
    );
  }

  const bounds = metrics.reduce(
    (acc, m) => ({
      minLat: Math.min(acc.minLat, m.latitude),
      maxLat: Math.max(acc.maxLat, m.latitude),
      minLon: Math.min(acc.minLon, m.longitude),
      maxLon: Math.max(acc.maxLon, m.longitude),
    }),
    {
      minLat: metrics[0].latitude,
      maxLat: metrics[0].latitude,
      minLon: metrics[0].longitude,
      maxLon: metrics[0].longitude,
    }
  );

  const latRange = bounds.maxLat - bounds.minLat;
  const lonRange = bounds.maxLon - bounds.minLon;
  const padding = Math.max(latRange, lonRange) * 0.15;
  const viewMinLon = bounds.minLon - padding;
  const viewMinLat = bounds.minLat - padding;
  const viewWidth = lonRange + padding * 2;
  const viewHeight = latRange + padding * 2;

  const maxSpeed = Math.max(...metrics.map(m => m.speed));

  const getSpeedColor = (speed: number) => {
    const ratio = speed / maxSpeed;
    if (ratio < 0.33) return '#10b981';
    if (ratio < 0.66) return '#f59e0b';
    return '#ef4444';
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl overflow-hidden border border-slate-700 shadow-xl">
        <div className="relative h-80 bg-slate-950 flex items-center justify-center overflow-hidden">
          <svg
            viewBox={`${viewMinLon} ${viewMinLat} ${viewWidth} ${viewHeight}`}
            className="w-full h-full"
            preserveAspectRatio="xMidYMid meet"
          >
            <rect
              x={viewMinLon}
              y={viewMinLat}
              width={viewWidth}
              height={viewHeight}
              fill="#0f172a"
            />

            <defs>
              <filter id="glow">
                <feGaussianBlur stdDeviation="0.0002" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {metrics.slice(0, -1).map((metric, idx) => {
              const next = metrics[idx + 1];
              return (
                <line
                  key={idx}
                  x1={metric.longitude}
                  y1={metric.latitude}
                  x2={next.longitude}
                  y2={next.latitude}
                  stroke={getSpeedColor(metric.speed)}
                  strokeWidth={viewWidth * 0.004}
                  strokeLinecap="round"
                  filter="url(#glow)"
                />
              );
            })}

            <circle
              cx={metrics[0].longitude}
              cy={metrics[0].latitude}
              r={viewWidth * 0.008}
              fill="#10b981"
              stroke="#fff"
              strokeWidth={viewWidth * 0.001}
            />

            <circle
              cx={metrics[metrics.length - 1].longitude}
              cy={metrics[metrics.length - 1].latitude}
              r={viewWidth * 0.008}
              fill="#ef4444"
              stroke="#fff"
              strokeWidth={viewWidth * 0.001}
            />
          </svg>

          <div className="absolute top-4 left-4 flex items-center gap-2 bg-slate-900/80 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-slate-700">
            <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
            <span className="text-xs text-gray-300">Start</span>
            <div className="w-3 h-3 rounded-full bg-red-500 ml-2"></div>
            <span className="text-xs text-gray-300">End</span>
          </div>

          <div className="absolute bottom-4 right-4 flex items-center gap-3 bg-slate-900/80 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-slate-700">
            <div className="flex items-center gap-1">
              <div className="w-3 h-1 rounded bg-emerald-500"></div>
              <span className="text-xs text-gray-400">Slow</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-1 rounded bg-amber-500"></div>
              <span className="text-xs text-gray-400">Medium</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-1 rounded bg-red-500"></div>
              <span className="text-xs text-gray-400">Fast</span>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-start gap-3">
              <Navigation className="w-5 h-5 text-emerald-400 mt-1 flex-shrink-0" />
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wider">Start</p>
                <p className="text-white font-medium mt-1">{trip.start_location}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-red-400 mt-1 flex-shrink-0" />
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wider">End</p>
                <p className="text-white font-medium mt-1">{trip.end_location || 'N/A'}</p>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-700">
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-slate-700/50 rounded-lg p-3">
                <p className="text-xs text-gray-400">Distance</p>
                <p className="text-lg font-semibold text-white mt-1">{trip.distance.toFixed(1)} km</p>
              </div>

              <div className="bg-slate-700/50 rounded-lg p-3">
                <p className="text-xs text-gray-400">Duration</p>
                <p className="text-lg font-semibold text-white mt-1">{formatDuration(trip.duration)}</p>
              </div>

              <div className="bg-slate-700/50 rounded-lg p-3">
                <p className="text-xs text-gray-400">Avg Speed</p>
                <p className="text-lg font-semibold text-white mt-1">{trip.average_speed.toFixed(0)} km/h</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-3 pt-4 border-t border-slate-700">
            <div className="text-center">
              <div className="bg-emerald-500/20 rounded-lg p-2 mb-2">
                <div className="text-emerald-400 font-bold">{trip.safety_score}</div>
              </div>
              <p className="text-xs text-gray-400">Safety</p>
            </div>

            <div className="text-center">
              <div className="bg-amber-500/20 rounded-lg p-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-amber-400 mx-auto" />
              </div>
              <p className="text-xs text-gray-400">Braking</p>
              <p className="text-sm font-semibold text-white mt-1">{trip.harsh_braking_count}</p>
            </div>

            <div className="text-center">
              <div className="bg-orange-500/20 rounded-lg p-2 mb-2">
                <Zap className="w-4 h-4 text-orange-400 mx-auto" />
              </div>
              <p className="text-xs text-gray-400">Accel</p>
              <p className="text-sm font-semibold text-white mt-1">{trip.rapid_acceleration_count}</p>
            </div>

            <div className="text-center">
              <div className="bg-blue-500/20 rounded-lg p-2 mb-2">
                <Clock className="w-4 h-4 text-blue-400 mx-auto" />
              </div>
              <p className="text-xs text-gray-400">Max</p>
              <p className="text-sm font-semibold text-white mt-1">{Math.round(maxSpeed)}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">Route Points</p>
          <p className="text-2xl font-bold text-white">{metrics.length}</p>
          <p className="text-xs text-gray-500 mt-1">tracking points recorded</p>
        </div>

        <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">Events</p>
          <p className="text-2xl font-bold text-white">{trip.harsh_braking_count + trip.rapid_acceleration_count}</p>
          <p className="text-xs text-gray-500 mt-1">safety events detected</p>
        </div>
      </div>
    </div>
  );
}
