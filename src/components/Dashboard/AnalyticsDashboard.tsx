import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase, Trip } from '../../lib/supabase';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { TrendingUp, AlertTriangle, Zap, Calendar, ArrowLeft, RefreshCw } from 'lucide-react';

type AnalyticsDashboardProps = {
  onBack: () => void;
};

export function AnalyticsDashboard({ onBack }: AnalyticsDashboardProps) {
  const { user } = useAuth();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'all'>('month');

  useEffect(() => {
    if (user) {
      fetchTrips();
    }
  }, [user, timeRange]);

  const fetchTrips = async () => {
    if (!user) return;

    setLoading(true);
    setError(null);
    let query = supabase
      .from('trips')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'completed')
      .order('start_time', { ascending: false });

    if (timeRange !== 'all') {
      const daysAgo = timeRange === 'week' ? 7 : 30;
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysAgo);
      query = query.gte('start_time', cutoffDate.toISOString());
    }

    const { data, error: fetchError } = await query;

    if (fetchError) {
      setError('Failed to load analytics data. Please try again.');
    } else {
      setTrips(data || []);
    }
    setLoading(false);
  };

  const speedTrends = useMemo(() =>
    trips
      .slice()
      .reverse()
      .map((trip) => ({
        date: new Date(trip.start_time).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        average: Math.round(trip.average_speed),
        max: Math.round(trip.max_speed),
      })),
    [trips]
  );

  const safetyTrends = useMemo(() =>
    trips
      .slice()
      .reverse()
      .map((trip) => ({
        date: new Date(trip.start_time).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        score: trip.safety_score,
      })),
    [trips]
  );

  const routeTypeData = useMemo(() =>
    trips.reduce(
      (acc, trip) => {
        const routeName = trip.start_location?.split(' ').slice(0, 2).join(' ') || 'Other';
        const existing = acc.find(item => item.route === routeName);

        if (existing) {
          existing.trips += 1;
          existing.avgSpeed = (existing.avgSpeed * (existing.trips - 1) + trip.average_speed) / existing.trips;
        } else {
          acc.push({
            route: routeName,
            trips: 1,
            avgSpeed: trip.average_speed,
          });
        }
        return acc;
      },
      [] as Array<{ route: string; trips: number; avgSpeed: number }>
    ),
    [trips]
  );

  const eventData = useMemo(() =>
    trips
      .slice()
      .reverse()
      .slice(0, 10)
      .map((trip) => ({
        date: new Date(trip.start_time).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        braking: trip.harsh_braking_count,
        acceleration: trip.rapid_acceleration_count,
      })),
    [trips]
  );

  const stats = useMemo(() => ({
    avgSpeed: trips.length > 0 ? Math.round(trips.reduce((sum, t) => sum + t.average_speed, 0) / trips.length) : 0,
    avgSafety: trips.length > 0 ? Math.round(trips.reduce((sum, t) => sum + t.safety_score, 0) / trips.length) : 0,
    totalTrips: trips.length,
    totalEvents: trips.reduce((sum, t) => sum + t.harsh_braking_count + t.rapid_acceleration_count, 0),
  }), [trips]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950/50 to-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950/50 to-slate-900 flex items-center justify-center p-6">
        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-8 max-w-md w-full text-center">
          <div className="bg-red-500/10 p-4 rounded-xl inline-block mb-6">
            <AlertTriangle className="w-10 h-10 text-red-400" />
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">Failed to load analytics</h2>
          <p className="text-gray-400 text-sm mb-6">{error}</p>
          <button
            onClick={fetchTrips}
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950/50 to-slate-900">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={onBack}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-6 h-6 text-gray-400" />
          </button>
          <div>
            <h1 className="text-3xl font-light text-white">Driving Analytics</h1>
            <p className="text-gray-400 text-sm mt-1">Comprehensive insights into your driving patterns</p>
          </div>
        </div>

        <div className="flex gap-2 mb-8">
          {(['week', 'month', 'all'] as const).map(range => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                timeRange === range
                  ? 'bg-blue-500 text-white'
                  : 'bg-slate-800 text-gray-400 hover:text-white'
              }`}
            >
              {range === 'week' ? 'Last 7 Days' : range === 'month' ? 'Last 30 Days' : 'All Time'}
            </button>
          ))}
        </div>

        {trips.length === 0 ? (
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-12 text-center">
            <Calendar className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">No completed trips in this period</p>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/20 rounded-lg p-6">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm text-gray-400">Avg Speed</p>
                  <TrendingUp className="w-5 h-5 text-blue-400" />
                </div>
                <p className="text-3xl font-bold text-white">{stats.avgSpeed}</p>
                <p className="text-xs text-gray-500 mt-2">km/h</p>
              </div>

              <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border border-emerald-500/20 rounded-lg p-6">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm text-gray-400">Safety Score</p>
                  <AlertTriangle className="w-5 h-5 text-emerald-400" />
                </div>
                <p className="text-3xl font-bold text-white">{stats.avgSafety}</p>
                <p className="text-xs text-gray-500 mt-2">average</p>
              </div>

              <div className="bg-gradient-to-br from-cyan-500/10 to-cyan-600/5 border border-cyan-500/20 rounded-lg p-6">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm text-gray-400">Total Trips</p>
                  <Calendar className="w-5 h-5 text-cyan-400" />
                </div>
                <p className="text-3xl font-bold text-white">{stats.totalTrips}</p>
                <p className="text-xs text-gray-500 mt-2">in period</p>
              </div>

              <div className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 border border-amber-500/20 rounded-lg p-6">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm text-gray-400">Events</p>
                  <Zap className="w-5 h-5 text-amber-400" />
                </div>
                <p className="text-3xl font-bold text-white">{stats.totalEvents}</p>
                <p className="text-xs text-gray-500 mt-2">safety events</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-blue-400" />
                  Speed Trends
                </h3>
                {speedTrends.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={speedTrends}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} />
                      <YAxis stroke="#94a3b8" fontSize={12} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#1e293b',
                          border: '1px solid #475569',
                          borderRadius: '8px',
                          color: '#fff',
                        }}
                        labelStyle={{ color: '#fff' }}
                      />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="average"
                        stroke="#3b82f6"
                        name="Avg Speed"
                        dot={false}
                        strokeWidth={2}
                      />
                      <Line
                        type="monotone"
                        dataKey="max"
                        stroke="#ef4444"
                        name="Max Speed"
                        dot={false}
                        strokeWidth={2}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-gray-400 text-center py-12">No data available</p>
                )}
              </div>

              <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-emerald-400" />
                  Safety Score Over Time
                </h3>
                {safetyTrends.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={safetyTrends}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} />
                      <YAxis stroke="#94a3b8" domain={[0, 100]} fontSize={12} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#1e293b',
                          border: '1px solid #475569',
                          borderRadius: '8px',
                          color: '#fff',
                        }}
                        labelStyle={{ color: '#fff' }}
                      />
                      <Line
                        type="monotone"
                        dataKey="score"
                        stroke="#10b981"
                        name="Safety Score"
                        dot={false}
                        strokeWidth={2}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-gray-400 text-center py-12">No data available</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
                  <Zap className="w-5 h-5 text-amber-400" />
                  Safety Events Trend
                </h3>
                {eventData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={eventData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} />
                      <YAxis stroke="#94a3b8" fontSize={12} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#1e293b',
                          border: '1px solid #475569',
                          borderRadius: '8px',
                          color: '#fff',
                        }}
                        labelStyle={{ color: '#fff' }}
                      />
                      <Legend />
                      <Bar dataKey="braking" fill="#f59e0b" name="Harsh Braking" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="acceleration" fill="#ef4444" name="Rapid Accel" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-gray-400 text-center py-12">No data available</p>
                )}
              </div>

              <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-6">Routes Comparison</h3>
                {routeTypeData.length > 0 ? (
                  <div className="space-y-4">
                    {routeTypeData.slice(0, 5).map((route) => (
                      <div key={route.route} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-300">{route.route}</span>
                          <span className="text-sm font-medium text-white">{route.avgSpeed.toFixed(0)} km/h</span>
                        </div>
                        <div className="w-full bg-slate-700 rounded-full h-2">
                          <div
                            className="bg-gradient-to-r from-blue-500 to-blue-400 h-2 rounded-full transition-all"
                            style={{
                              width: `${Math.min((route.avgSpeed / Math.max(...routeTypeData.map(r => r.avgSpeed))) * 100, 100)}%`,
                            }}
                          />
                        </div>
                        <div className="flex justify-between text-xs text-gray-500">
                          <span>{route.trips} trip{route.trips !== 1 ? 's' : ''}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-400 text-center py-12">No data available</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
