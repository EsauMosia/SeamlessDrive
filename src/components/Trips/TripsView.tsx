import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase, Trip } from '../../lib/supabase';
import { MapPin, Clock, TrendingUp, Award, Calendar, AlertTriangle, Zap } from 'lucide-react';

export function TripsView() {
  const { user } = useAuth();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'completed' | 'in_progress'>('all');

  useEffect(() => {
    if (user) {
      fetchTrips();
    }
  }, [user, filter]);

  const fetchTrips = async () => {
    if (!user) return;

    setLoading(true);
    let query = supabase
      .from('trips')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (filter !== 'all') {
      query = query.eq('status', filter);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching trips:', error);
    } else {
      setTrips(data || []);
    }
    setLoading(false);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
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

  const getStatusBadge = (status: string) => {
    if (status === 'completed') {
      return <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">Completed</span>;
    }
    return <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">In Progress</span>;
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
          <h1 className="text-3xl font-bold text-gray-900">Trip History</h1>
          <p className="text-gray-600 mt-1">View and analyze your driving trips</p>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            filter === 'all'
              ? 'bg-blue-600 text-white'
              : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
          }`}
        >
          All Trips
        </button>
        <button
          onClick={() => setFilter('completed')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            filter === 'completed'
              ? 'bg-blue-600 text-white'
              : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
          }`}
        >
          Completed
        </button>
        <button
          onClick={() => setFilter('in_progress')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            filter === 'in_progress'
              ? 'bg-blue-600 text-white'
              : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
          }`}
        >
          In Progress
        </button>
      </div>

      {trips.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12">
          <div className="text-center">
            <MapPin className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">No trips found</h3>
            <p className="text-gray-600">Start driving to see your trips here</p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {trips.map((trip) => (
            <div
              key={trip.id}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-4">
                  <div className="bg-blue-100 p-3 rounded-xl">
                    <MapPin className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-lg">{trip.start_location}</h3>
                    {trip.end_location && (
                      <p className="text-gray-600 mt-1">to {trip.end_location}</p>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-500">{formatDate(trip.start_time)}</span>
                      {getStatusBadge(trip.status)}
                    </div>
                  </div>
                </div>
                <div className={`px-4 py-2 rounded-xl border-2 ${getSafetyScoreColor(trip.safety_score)}`}>
                  <div className="flex items-center gap-2">
                    <Award className="w-5 h-5" />
                    <span className="text-2xl font-bold">{trip.safety_score}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 pt-4 border-t border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="bg-gray-100 p-2 rounded-lg">
                    <Clock className="w-4 h-4 text-gray-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Duration</p>
                    <p className="font-semibold text-gray-900">{formatDuration(trip.duration)}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="bg-gray-100 p-2 rounded-lg">
                    <TrendingUp className="w-4 h-4 text-gray-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Distance</p>
                    <p className="font-semibold text-gray-900">{trip.distance.toFixed(1)} km</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="bg-gray-100 p-2 rounded-lg">
                    <TrendingUp className="w-4 h-4 text-gray-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Avg Speed</p>
                    <p className="font-semibold text-gray-900">{trip.average_speed.toFixed(0)} km/h</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="bg-gray-100 p-2 rounded-lg">
                    <AlertTriangle className="w-4 h-4 text-gray-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Harsh Braking</p>
                    <p className="font-semibold text-gray-900">{trip.harsh_braking_count}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="bg-gray-100 p-2 rounded-lg">
                    <Zap className="w-4 h-4 text-gray-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Rapid Accel</p>
                    <p className="font-semibold text-gray-900">{trip.rapid_acceleration_count}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
