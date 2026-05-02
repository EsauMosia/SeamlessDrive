import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { getSuggestedLocations } from '../../services/locationService';
import { X, MapPin, Clock, TrendingUp, Square, AlertTriangle, Award } from 'lucide-react';

type TripTrackerProps = {
  onClose: () => void;
};

export function TripTracker({ onClose }: TripTrackerProps) {
  const { user, refreshProfile } = useAuth();
  const [tripId, setTripId] = useState<string>('');
  const [duration, setDuration] = useState(0);
  const [distance, setDistance] = useState(0);
  const [currentSpeed, setCurrentSpeed] = useState(0);
  const [avgSpeed, setAvgSpeed] = useState(0);
  const [harshBraking, setHarshBraking] = useState(0);
  const [rapidAccel, setRapidAccel] = useState(0);
  const [ending, setEnding] = useState(false);
  const [destination, setDestination] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);

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
    const newSpeed = Math.floor(Math.random() * 40) + 40;
    setDistance((prev) => prev + (Math.random() * 0.02));
    setCurrentSpeed(newSpeed);
    setAvgSpeed((prev) => {
      if (prev === 0) return newSpeed;
      return Math.floor((prev * 0.9) + (newSpeed * 0.1));
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

  const handleDestinationChange = (value: string) => {
    setDestination(value);
    if (value.length > 0) {
      setSuggestions(getSuggestedLocations(value));
    } else {
      setSuggestions([]);
    }
  };

  const selectSuggestion = (suggestion: string) => {
    setDestination(suggestion);
    setSuggestions([]);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-gradient-to-br from-slate-900 to-slate-950 rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-white/10">
        <div className="sticky top-0 bg-gradient-to-r from-blue-600/20 to-blue-700/20 border-b border-white/10 text-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-light text-white">Trip in Progress</h2>
              <p className="text-gray-400 text-sm mt-1">Drive safely and stay alert</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <X className="w-6 h-6 text-gray-400" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/10 border border-blue-500/30 rounded-2xl p-8">
            <div className="flex items-center gap-3 mb-6">
              <MapPin className="w-5 h-5 text-blue-400" />
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide">Current Location</p>
                <p className="font-light text-white mt-1">Current Location</p>
              </div>
            </div>
            <div className="text-center">
              <p className="text-7xl font-light text-blue-300">{currentSpeed}</p>
              <p className="text-gray-400 font-light mt-2">km/h</p>
            </div>
          </div>

          <div className="relative">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Destination
            </label>
            <div className="relative">
              <MapPin className="absolute left-3.5 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500 pointer-events-none" />
              <input
                type="text"
                value={destination}
                onChange={(e) => handleDestinationChange(e.target.value)}
                placeholder="Where are you going?"
                className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 text-white rounded-lg focus:bg-white/10 focus:border-blue-400 focus:outline-none transition-all placeholder-gray-500"
              />
            </div>
            {suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-slate-800 border border-white/10 rounded-lg shadow-lg z-10">
                {suggestions.map((suggestion, idx) => (
                  <button
                    key={idx}
                    onClick={() => selectSuggestion(suggestion)}
                    className="w-full text-left px-4 py-3 hover:bg-white/10 transition-colors text-white text-sm border-b border-white/5 last:border-b-0"
                  >
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-gray-400" />
                      {suggestion}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">Duration</p>
                  <p className="text-xl font-light text-white mt-1">{formatDuration(duration)}</p>
                </div>
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">Distance</p>
                  <p className="text-xl font-light text-white mt-1">{distance.toFixed(1)} km</p>
                </div>
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">Avg Speed</p>
                  <p className="text-xl font-light text-white mt-1">{avgSpeed} km/h</p>
                </div>
              </div>
            </div>

            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4">
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-emerald-400" />
                <div>
                  <p className="text-xs text-emerald-300">Safety Score</p>
                  <p className="text-xl font-light text-emerald-300 mt-1">{calculateSafetyScore()}</p>
                </div>
              </div>
            </div>
          </div>

          {(harshBraking > 0 || rapidAccel > 0) && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
              <h3 className="font-light text-white mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                Driving Events
              </h3>
              <div className="space-y-2">
                {harshBraking > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-300">Harsh Braking</span>
                    <span className="font-light text-amber-300">{harshBraking}</span>
                  </div>
                )}
                {rapidAccel > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-300">Rapid Acceleration</span>
                    <span className="font-light text-amber-300">{rapidAccel}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          <button
            onClick={endTrip}
            disabled={ending}
            className="w-full bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 disabled:from-gray-700 disabled:to-gray-600 text-white font-light py-4 px-6 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
          >
            <Square className="w-5 h-5" />
            {ending ? 'Ending Trip...' : 'End Trip'}
          </button>
        </div>
      </div>
    </div>
  );
}
