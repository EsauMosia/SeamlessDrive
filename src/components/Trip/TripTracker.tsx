import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { X, MapPin, Clock, TrendingUp, Square, AlertTriangle, Zap } from 'lucide-react';

type TripTrackerProps = {
  onClose: () => void;
};

export function TripTracker({ onClose }: TripTrackerProps) {
  const { user, refreshProfile } = useAuth();
  const [tripId, setTripId] = useState<string>('');
  const [startTime, setStartTime] = useState<Date>(new Date());
  const [duration, setDuration] = useState(0);
  const [distance, setDistance] = useState(0);
  const [currentSpeed, setCurrentSpeed] = useState(0);
  const [avgSpeed, setAvgSpeed] = useState(0);
  const [harshBraking, setHarshBraking] = useState(0);
  const [rapidAccel, setRapidAccel] = useState(0);
  const [location, setLocation] = useState('Current Location');
  const [ending, setEnding] = useState(false);

  useEffect(() => {
    startTrip();
    const interval = setInterval(() => {
      setDuration((prev) => prev + 1);
      simulateDriving();
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const startTrip = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('trips')
      .insert({
        user_id: user.id,
        start_location: 'Current Location',
        status: 'in_progress',
      })
      .select()
      .single();

    if (error) {
      console.error('Error starting trip:', error);
    } else if (data) {
      setTripId(data.id);
    }
  };

  const simulateDriving = () => {
    setDistance((prev) => prev + (Math.random() * 0.02));
    setCurrentSpeed(Math.floor(Math.random() * 40) + 40);
    setAvgSpeed((prev) => {
      if (prev === 0) return Math.floor(Math.random() * 40) + 40;
      return Math.floor((prev * 0.9) + (currentSpeed * 0.1));
    });

    if (Math.random() < 0.02) {
      setHarshBraking((prev) => prev + 1);
      createAlert('Harsh Braking Detected', 'medium', 'Please brake more gradually for safer driving');
    }

    if (Math.random() < 0.015) {
      setRapidAccel((prev) => prev + 1);
      createAlert('Rapid Acceleration', 'low', 'Try to accelerate more smoothly');
    }
  };

  const createAlert = async (alertType: string, severity: string, message: string) => {
    if (!user) return;

    await supabase.from('safety_alerts').insert({
      user_id: user.id,
      trip_id: tripId,
      alert_type: alertType,
      severity: severity,
      message: message,
    });
  };

  const calculateSafetyScore = () => {
    let score = 100;
    score -= harshBraking * 5;
    score -= rapidAccel * 3;
    if (avgSpeed > 100) score -= 10;
    return Math.max(50, Math.min(100, score));
  };

  const endTrip = async () => {
    if (!tripId || !user) return;

    setEnding(true);
    const safetyScore = calculateSafetyScore();

    const { error } = await supabase
      .from('trips')
      .update({
        end_time: new Date().toISOString(),
        end_location: 'Destination',
        distance: distance,
        duration: duration,
        average_speed: avgSpeed,
        max_speed: Math.max(currentSpeed, avgSpeed + 10),
        harsh_braking_count: harshBraking,
        rapid_acceleration_count: rapidAccel,
        safety_score: safetyScore,
        status: 'completed',
      })
      .eq('id', tripId);

    if (error) {
      console.error('Error ending trip:', error);
      setEnding(false);
    } else {
      await refreshProfile();
      onClose();
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Trip in Progress</h2>
              <p className="text-blue-100 mt-1">Drive safely and stay alert</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <MapPin className="w-6 h-6 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">Current Location</p>
                <p className="font-bold text-gray-900">{location}</p>
              </div>
            </div>
            <div className="text-center">
              <p className="text-6xl font-bold text-blue-600">{currentSpeed}</p>
              <p className="text-gray-600 font-medium mt-1">km/h</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white border-2 border-gray-200 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="bg-gray-100 p-3 rounded-lg">
                  <Clock className="w-5 h-5 text-gray-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Duration</p>
                  <p className="text-2xl font-bold text-gray-900">{formatDuration(duration)}</p>
                </div>
              </div>
            </div>

            <div className="bg-white border-2 border-gray-200 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="bg-gray-100 p-3 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-gray-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Distance</p>
                  <p className="text-2xl font-bold text-gray-900">{distance.toFixed(1)} km</p>
                </div>
              </div>
            </div>

            <div className="bg-white border-2 border-gray-200 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="bg-gray-100 p-3 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-gray-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Avg Speed</p>
                  <p className="text-2xl font-bold text-gray-900">{avgSpeed} km/h</p>
                </div>
              </div>
            </div>

            <div className="bg-white border-2 border-gray-200 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="bg-green-100 p-3 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Safety Score</p>
                  <p className="text-2xl font-bold text-gray-900">{calculateSafetyScore()}</p>
                </div>
              </div>
            </div>
          </div>

          {(harshBraking > 0 || rapidAccel > 0) && (
            <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-4">
              <h3 className="font-bold text-gray-900 mb-3">Driving Events</h3>
              <div className="space-y-2">
                {harshBraking > 0 && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-yellow-600" />
                      <span className="text-sm text-gray-700">Harsh Braking</span>
                    </div>
                    <span className="font-bold text-gray-900">{harshBraking}</span>
                  </div>
                )}
                {rapidAccel > 0 && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-yellow-600" />
                      <span className="text-sm text-gray-700">Rapid Acceleration</span>
                    </div>
                    <span className="font-bold text-gray-900">{rapidAccel}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          <button
            onClick={endTrip}
            disabled={ending}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-4 px-6 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
          >
            <Square className="w-5 h-5" />
            {ending ? 'Ending Trip...' : 'End Trip'}
          </button>
        </div>
      </div>
    </div>
  );
}
