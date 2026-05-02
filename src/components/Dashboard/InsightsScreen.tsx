import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase, Trip } from '../../lib/supabase';
import { TrendingUp, AlertTriangle, Zap, Clock, MapPin, BarChart3, ArrowLeft } from 'lucide-react';

type InsightsScreenProps = {
  onBack: () => void;
};

export function InsightsScreen({ onBack }: InsightsScreenProps) {
  const { user } = useAuth();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchTrips();
    }
  }, [user]);

  const fetchTrips = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('trips')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    setTrips(data || []);
    setLoading(false);
  };

  const stats = useMemo(() => ({
    totalTrips: trips.length,
    totalDistance: trips.reduce((sum, t) => sum + t.distance, 0),
    avgSpeed: trips.length > 0 ? Math.round(trips.reduce((sum, t) => sum + t.average_speed, 0) / trips.length) : 0,
    avgSafetyScore: trips.length > 0 ? Math.round(trips.reduce((sum, t) => sum + t.safety_score, 0) / trips.length) : 100,
    totalHarshBraking: trips.reduce((sum, t) => sum + t.harsh_braking_count, 0),
    totalRapidAccel: trips.reduce((sum, t) => sum + t.rapid_acceleration_count, 0),
  }), [trips]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950/50 to-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950/50 to-slate-900">
      <div className="max-w-2xl mx-auto px-6 py-8">
        <div className="flex items-center gap-4 mb-12">
          <button
            onClick={onBack}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-6 h-6 text-gray-400" />
          </button>
          <div>
            <h1 className="text-3xl font-light text-white">Your Insights</h1>
            <p className="text-gray-400 text-sm mt-1">Deep dive into your driving data</p>
          </div>
        </div>

        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="group relative p-6 rounded-2xl bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/20 hover:border-blue-400/50 transition-all">
              <BarChart3 className="w-5 h-5 text-blue-400 mb-3" />
              <p className="text-sm text-gray-400 font-medium">Total Trips</p>
              <p className="text-4xl font-light text-white mt-2">{stats.totalTrips}</p>
            </div>

            <div className="group relative p-6 rounded-2xl bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/20 hover:border-blue-400/50 transition-all">
              <MapPin className="w-5 h-5 text-blue-400 mb-3" />
              <p className="text-sm text-gray-400 font-medium">Distance Driven</p>
              <p className="text-4xl font-light text-white mt-2">{stats.totalDistance.toFixed(0)} <span className="text-lg">km</span></p>
            </div>

            <div className="group relative p-6 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border border-emerald-500/20 hover:border-emerald-400/50 transition-all">
              <TrendingUp className="w-5 h-5 text-emerald-400 mb-3" />
              <p className="text-sm text-gray-400 font-medium">Average Speed</p>
              <p className="text-4xl font-light text-white mt-2">{stats.avgSpeed} <span className="text-lg">km/h</span></p>
            </div>

            <div className="group relative p-6 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border border-emerald-500/20 hover:border-emerald-400/50 transition-all">
              <AlertTriangle className="w-5 h-5 text-emerald-400 mb-3" />
              <p className="text-sm text-gray-400 font-medium">Avg Safety Score</p>
              <p className="text-4xl font-light text-white mt-2">{stats.avgSafetyScore}</p>
            </div>

            <div className="group relative p-6 rounded-2xl bg-gradient-to-br from-amber-500/10 to-amber-600/5 border border-amber-500/20 hover:border-amber-400/50 transition-all">
              <AlertTriangle className="w-5 h-5 text-amber-400 mb-3" />
              <p className="text-sm text-gray-400 font-medium">Harsh Braking Events</p>
              <p className="text-4xl font-light text-white mt-2">{stats.totalHarshBraking}</p>
            </div>

            <div className="group relative p-6 rounded-2xl bg-gradient-to-br from-amber-500/10 to-amber-600/5 border border-amber-500/20 hover:border-amber-400/50 transition-all">
              <Zap className="w-5 h-5 text-amber-400 mb-3" />
              <p className="text-sm text-gray-400 font-medium">Rapid Acceleration</p>
              <p className="text-4xl font-light text-white mt-2">{stats.totalRapidAccel}</p>
            </div>
          </div>

          <div className="pt-4">
            <h2 className="text-xl font-light text-white mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-gray-400" />
              Recent Trips
            </h2>

            {trips.length === 0 ? (
              <div className="text-center py-12">
                <MapPin className="w-12 h-12 text-gray-700 mx-auto mb-4" />
                <p className="text-gray-400">No trips yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {trips.slice(0, 5).map((trip) => (
                  <div
                    key={trip.id}
                    className="p-4 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-all"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="font-medium text-white">{trip.start_location}</p>
                        {trip.end_location && (
                          <p className="text-sm text-gray-400">to {trip.end_location}</p>
                        )}
                      </div>
                      <span className="text-sm font-medium text-emerald-400">{trip.safety_score}</span>
                    </div>
                    <div className="flex flex-wrap gap-4 text-xs text-gray-400">
                      <span>{trip.distance.toFixed(1)} km</span>
                      <span>{Math.round(trip.duration / 60)} min</span>
                      <span>{trip.average_speed.toFixed(0)} km/h avg</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
