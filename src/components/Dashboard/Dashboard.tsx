import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase, Trip, SafetyAlert } from '../../lib/supabase';
import {
  Play,
  Route,
  AlertTriangle,
  Award,
  TrendingUp,
  Clock,
  MapPin
} from 'lucide-react';

type DashboardProps = {
  onNavigate: (view: string) => void;
  onStartTrip: () => void;
};

export function Dashboard({ onNavigate, onStartTrip }: DashboardProps) {
  const { profile, user } = useAuth();
  const [recentTrips, setRecentTrips] = useState<Trip[]>([]);
  const [unreadAlerts, setUnreadAlerts] = useState<SafetyAlert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    if (!user) return;

    const [tripsResult, alertsResult] = await Promise.all([
      supabase
        .from('trips')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5),
      supabase
        .from('safety_alerts')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_read', false)
        .order('created_at', { ascending: false })
    ]);

    if (tripsResult.data) setRecentTrips(tripsResult.data);
    if (alertsResult.data) setUnreadAlerts(alertsResult.data);
    setLoading(false);
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const getSafetyScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600 bg-green-50 border-green-200';
    if (score >= 70) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome back, {profile?.full_name?.split(' ')[0] || 'Driver'}
          </h1>
          <p className="text-gray-600 mt-1">Stay safe on the road today</p>
        </div>
      </div>

      <button
        onClick={onStartTrip}
        className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-2xl p-8 shadow-lg transition-all transform hover:scale-[1.02] active:scale-[0.98]"
      >
        <div className="flex items-center justify-center gap-4">
          <div className="bg-white/20 p-4 rounded-full">
            <Play className="w-8 h-8" />
          </div>
          <div className="text-left">
            <h2 className="text-2xl font-bold">Start Driving</h2>
            <p className="text-blue-100 mt-1">Begin tracking your trip</p>
          </div>
        </div>
      </button>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-lg border-2 ${getSafetyScoreColor(profile?.safety_score || 100)}`}>
              <Award className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-gray-600 font-medium">Safety Score</p>
              <p className="text-3xl font-bold text-gray-900">{profile?.safety_score || 100}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-blue-50 border-2 border-blue-200">
              <Route className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600 font-medium">Total Trips</p>
              <p className="text-3xl font-bold text-gray-900">{profile?.total_trips || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-orange-50 border-2 border-orange-200">
              <AlertTriangle className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600 font-medium">Unread Alerts</p>
              <p className="text-3xl font-bold text-gray-900">{unreadAlerts.length}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">Recent Trips</h2>
              <button
                onClick={() => onNavigate('trips')}
                className="text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                View All
              </button>
            </div>
          </div>
          <div className="p-6">
            {recentTrips.length === 0 ? (
              <div className="text-center py-8">
                <Route className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No trips yet</p>
                <p className="text-sm text-gray-400 mt-1">Start your first trip to see it here</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentTrips.slice(0, 3).map((trip) => (
                  <div
                    key={trip.id}
                    className="flex items-start gap-3 p-4 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50/50 transition-all"
                  >
                    <div className="bg-blue-100 p-2 rounded-lg">
                      <MapPin className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">{trip.start_location}</p>
                      {trip.end_location && (
                        <p className="text-sm text-gray-600 truncate">to {trip.end_location}</p>
                      )}
                      <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDuration(trip.duration)}
                        </span>
                        <span className="flex items-center gap-1">
                          <TrendingUp className="w-3 h-3" />
                          {trip.distance.toFixed(1)} km
                        </span>
                      </div>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-sm font-semibold ${getSafetyScoreColor(trip.safety_score)}`}>
                      {trip.safety_score}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">Safety Alerts</h2>
              <button
                onClick={() => onNavigate('alerts')}
                className="text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                View All
              </button>
            </div>
          </div>
          <div className="p-6">
            {unreadAlerts.length === 0 ? (
              <div className="text-center py-8">
                <AlertTriangle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No new alerts</p>
                <p className="text-sm text-gray-400 mt-1">You're all caught up!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {unreadAlerts.slice(0, 3).map((alert) => (
                  <div
                    key={alert.id}
                    className={`p-4 rounded-lg border-2 ${
                      alert.severity === 'high'
                        ? 'bg-red-50 border-red-200'
                        : alert.severity === 'medium'
                        ? 'bg-yellow-50 border-yellow-200'
                        : 'bg-blue-50 border-blue-200'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <AlertTriangle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                        alert.severity === 'high'
                          ? 'text-red-600'
                          : alert.severity === 'medium'
                          ? 'text-yellow-600'
                          : 'text-blue-600'
                      }`} />
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 text-sm">{alert.alert_type}</p>
                        <p className="text-sm text-gray-600 mt-1">{alert.message}</p>
                      </div>
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
