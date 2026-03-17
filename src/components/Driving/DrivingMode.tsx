import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { SensorService, GPSData } from '../../lib/sensorService';
import { DrivingDetectionEngine } from '../../lib/drivingDetection';
import { BehaviorAnalysisEngine, DrivingEvent } from '../../lib/behaviorAnalysis';
import { CrashDetectionEngine } from '../../lib/crashDetection';
import { AlertTriangle, Shield, Zap, MapPin, X } from 'lucide-react';
import { VoiceFeedbackRecorder } from './VoiceFeedbackRecorder';
import { EmergencyContactSystem } from './EmergencyContactSystem';

type DrivingModeProps = {
  onExit: () => void;
};

export function DrivingMode({ onExit }: DrivingModeProps) {
  const { user, refreshProfile } = useAuth();
  const [currentSpeed, setCurrentSpeed] = useState(0);
  const [sensorInterrupted, setSensorInterrupted] = useState(false);
  const [safetyStatus, setSafetyStatus] = useState<'safe' | 'warning' | 'critical'>('safe');
  const [lastAlert, setLastAlert] = useState<DrivingEvent | null>(null);
  const [crashAlert, setCrashAlert] = useState(false);
  const [showVoiceFeedback, setShowVoiceFeedback] = useState(false);
  const [drivingTime, setDrivingTime] = useState(0);
  const [tripId, setTripId] = useState<string>('');

  const sensorService = useState(new SensorService())[0];
  const detectionEngine = useState(new DrivingDetectionEngine())[0];
  const behaviorEngine = useState(new BehaviorAnalysisEngine())[0];
  const crashEngine = useState(new CrashDetectionEngine())[0];
  // Track last persisted metric timestamp
  const [lastPersisted, setLastPersisted] = useState<number>(0);

  useEffect(() => {
    initializeTrip();
    startSensors();
    startMonitoring();
    startSensorWatchdog();

    return () => {
      sensorService.destroy();
    };
  }, []);

  const initializeTrip = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('trips')
      .insert({
        user_id: user.id,
        start_location: 'Driving Mode',
        status: 'in_progress',
      })
      .select()
      .single();

    if (!error && data) {
      setTripId(data.id);
    }
  };

  const startSensors = async () => {
    const hasPermission = await sensorService.getPermissions();
    if (!hasPermission) {
      console.error('Sensor permissions denied');
      setSensorInterrupted(true);
      return;
    }

    sensorService.startGPSTracking((gps: GPSData) => {
      setCurrentSpeed(Math.round(gps.speed));
    });

    sensorService.startMotionTracking(() => {});
  };

  const startMonitoring = () => {
    const interval = setInterval(async () => {
      const gps = sensorService.getCurrentGPS();
      const motion = sensorService.getCurrentMotion();
      const now = Date.now();

      if (!gps && !motion) {
        setSensorInterrupted(true);
      }

      if (gps) {
        setDrivingTime((prev) => prev + 1);
        behaviorEngine.analyzeSpeed(gps.speed);
      }

      if (motion && gps) {
        const motionEvent = behaviorEngine.analyzeMotion(motion, gps.speed);
        if (motionEvent) {
          setLastAlert(motionEvent);
          setSafetyStatus(motionEvent.severity === 'high' ? 'critical' : 'warning');
          setTimeout(() => {
            setSafetyStatus('safe');
            setLastAlert(null);
          }, 4000);
        }

        const crash = crashEngine.detectCrash(motion, gps);
        if (crash.isCrash) {
          setCrashAlert(true);
        }
      }

      // Persist driving metrics every second
      if (tripId && gps && (now - lastPersisted > 900)) {
        setLastPersisted(now);
        try {
          await supabase.from('driving_metrics').insert({
            trip_id: tripId,
            timestamp: new Date().toISOString(),
            speed: gps.speed,
            latitude: gps.latitude,
            longitude: gps.longitude,
            acceleration: motion ? Math.sqrt(
              motion.acceleration.x ** 2 +
              motion.acceleration.y ** 2 +
              motion.acceleration.z ** 2
            ) : null,
          });
        } catch (err) {
          // Optionally add retry logic or error reporting
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  };

  // Watchdog for sensor interruption
  const startSensorWatchdog = () => {
    const watchdog = setInterval(() => {
      const gps = sensorService.getCurrentGPS();
      const motion = sensorService.getCurrentMotion();
      if (!gps && !motion) {
        setSensorInterrupted(true);
      }
    }, 3000);
    return () => clearInterval(watchdog);
  };

  const handleEndTrip = async () => {
    if (!tripId || !user) return;

    // Fetch all driving metrics for this trip
    const { data: metricsData, error: metricsError } = await supabase
      .from('driving_metrics')
      .select('*')
      .eq('trip_id', tripId);

    let totalDistance = 0;
    let maxSpeed = 0;
    let avgSpeed = 0;
    let duration = drivingTime;
    if (!metricsError && metricsData && metricsData.length > 0) {
      // Calculate total distance, max speed, avg speed
      let prev = null;
      let speedSum = 0;
      metricsData.forEach((m, idx) => {
        speedSum += m.speed;
        if (m.speed > maxSpeed) maxSpeed = m.speed;
        if (prev) {
          // Estimate distance using haversine formula or simple approximation
          const dx = m.latitude - prev.latitude;
          const dy = m.longitude - prev.longitude;
          const dist = Math.sqrt(dx * dx + dy * dy) * 111; // rough km conversion
          totalDistance += dist;
        }
        prev = m;
      });
      avgSpeed = Math.round(speedSum / metricsData.length);
      totalDistance = Math.round(totalDistance * 100) / 100;
      duration = metricsData.length;
    } else {
      // fallback to previous calculation
      totalDistance = currentSpeed * (drivingTime / 3600);
      avgSpeed = currentSpeed;
      maxSpeed = currentSpeed;
    }

    const metrics = behaviorEngine.getMetrics();
    await supabase
      .from('trips')
      .update({
        end_time: new Date().toISOString(),
        end_location: 'Trip Ended',
        distance: totalDistance,
        duration: duration,
        average_speed: avgSpeed,
        max_speed: maxSpeed,
        harsh_braking_count: metrics.harshBrakingCount,
        rapid_acceleration_count: metrics.rapidAccelerationCount,
        safety_score: metrics.overallSafetyScore,
        status: 'completed',
      })
      .eq('id', tripId);

    await refreshProfile();
    onExit();
  };

  const handleVoiceFeedback = async (audioBlob: Blob, transcript: string) => {
    if (!tripId) return;

    await supabase.from('safety_alerts').insert({
      trip_id: tripId,
      user_id: user?.id,
      alert_type: 'Voice Feedback',
      severity: 'low',
      message: transcript || 'Audio feedback recorded',
    });

    setShowVoiceFeedback(false);
  };

  const handleCrashResponse = () => {
    setCrashAlert(false);
  };

  if (crashAlert) {
    return (
      <div className="fixed inset-0 bg-red-950/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
        <div className="bg-red-900/50 border-2 border-red-500 rounded-3xl p-8 max-w-md w-full text-center space-y-6">
          <div className="w-20 h-20 bg-red-500 rounded-full mx-auto flex items-center justify-center animate-pulse">
            <AlertTriangle className="w-10 h-10 text-white" />
          </div>
          <div>
            <h2 className="text-3xl font-bold text-white mb-2">Crash Detected</h2>
            <p className="text-red-100">Are you safe? Responding in 20 seconds...</p>
          </div>
          <div className="space-y-3">
            <button
              onClick={handleCrashResponse}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg transition-colors"
            >
              I'm Safe
            </button>
            <EmergencyContactSystem userId={user?.id || ''} />
          </div>
        </div>
      </div>
    );
  }

  if (sensorInterrupted) {
    return (
      <div className="fixed inset-0 bg-yellow-950/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
        <div className="bg-yellow-900/50 border-2 border-yellow-500 rounded-3xl p-8 max-w-md w-full text-center space-y-6">
          <div className="w-20 h-20 bg-yellow-500 rounded-full mx-auto flex items-center justify-center animate-pulse">
            <AlertTriangle className="w-10 h-10 text-white" />
          </div>
          <div>
            <h2 className="text-3xl font-bold text-white mb-2">Sensor Tracking Interrupted</h2>
            <p className="text-yellow-100">Driving sensors have stopped. Please check permissions or restart Driving Mode.</p>
          </div>
          <div className="space-y-3">
            <button
              onClick={() => { setSensorInterrupted(false); onExit(); }}
              className="w-full bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-3 px-6 rounded-lg transition-colors"
            >
              Exit Driving Mode
            </button>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="fixed inset-0 bg-gradient-to-br from-slate-950 via-blue-950/50 to-slate-900 z-50 flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center px-6 space-y-12">
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-3 mb-8">
            <Shield className="w-8 h-8 text-blue-400" />
            <h1 className="text-4xl font-light text-white">Driving</h1>
          </div>

          <div className="text-6xl font-light text-blue-300 tabular-nums">
            {currentSpeed}
            <span className="text-3xl ml-2 text-gray-400">km/h</span>
          </div>
        </div>

        <div
          className={`w-full max-w-xs p-8 rounded-3xl transition-all ${
            safetyStatus === 'safe'
              ? 'bg-emerald-500/10 border-2 border-emerald-500/30'
              : safetyStatus === 'warning'
              ? 'bg-amber-500/10 border-2 border-amber-500/30'
              : 'bg-red-500/10 border-2 border-red-500/30 animate-pulse'
          }`}
        >
          <div className="text-center">
            <p className="text-sm text-gray-400 uppercase tracking-wide mb-2">Safety Status</p>
            <p
              className={`text-2xl font-light ${
                safetyStatus === 'safe'
                  ? 'text-emerald-300'
                  : safetyStatus === 'warning'
                  ? 'text-amber-300'
                  : 'text-red-300'
              }`}
            >
              {safetyStatus === 'safe' ? 'Excellent' : safetyStatus === 'warning' ? 'Warning' : 'Alert'}
            </p>

            {lastAlert && (
              <div className="mt-4 pt-4 border-t border-white/10">
                <p className="text-sm text-gray-300">{lastAlert.message}</p>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 w-full max-w-xs">
          <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-center">
            <Zap className="w-5 h-5 text-gray-400 mx-auto mb-2" />
            <p className="text-xs text-gray-500">Trip Time</p>
            <p className="text-xl font-light text-white mt-1">
              {Math.floor(drivingTime / 60)}:{(drivingTime % 60).toString().padStart(2, '0')}
            </p>
          </div>
          <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-center">
            <MapPin className="w-5 h-5 text-gray-400 mx-auto mb-2" />
            <p className="text-xs text-gray-500">Alerts</p>
            <p className="text-xl font-light text-white mt-1">
              {behaviorEngine.getEvents().length}
            </p>
          </div>
        </div>

        {!showVoiceFeedback && (
          <button
            onClick={() => setShowVoiceFeedback(true)}
            className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors text-sm font-medium"
          >
            Leave Voice Feedback
          </button>
        )}

        {showVoiceFeedback && (
          <div className="w-full max-w-xs p-6 bg-white/5 border border-white/10 rounded-2xl">
            <VoiceFeedbackRecorder onSubmit={handleVoiceFeedback} />
          </div>
        )}
      </div>

      <div className="px-6 py-6 border-t border-white/10">
        <button
          onClick={handleEndTrip}
          className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 text-white font-semibold rounded-2xl transition-all"
        >
          <X className="w-5 h-5" />
          End Driving Mode
        </button>
      </div>
    </div>
  );
}
