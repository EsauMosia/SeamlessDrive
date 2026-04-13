import { saveDrivingMetrics } from '../../services/drivingMetricsService';
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { SensorService, GPSData } from '../../lib/sensorService';
import { BehaviorAnalysisEngine, DrivingEvent } from '../../lib/behaviorAnalysis';
import { CrashDetectionEngine } from '../../lib/crashDetection';
import { Gauge, AlertTriangle, X } from 'lucide-react';

type DrivingModeProps = {
  onExit: () => void;
};

export function DrivingMode({ onExit }: DrivingModeProps) {
  const { user, refreshProfile } = useAuth();
  const [currentSpeed, setCurrentSpeed] = useState(0);
  const [acceleration, setAcceleration] = useState(0);
  const [prevSpeed, setPrevSpeed] = useState(0);
  const [isStopped, setIsStopped] = useState(false);
  const [sensorInterrupted, setSensorInterrupted] = useState(false);
  const [safetyStatus, setSafetyStatus] = useState<'safe' | 'warning' | 'critical'>('safe');
  const [lastAlert, setLastAlert] = useState<DrivingEvent | null>(null);
  const [crashAlert, setCrashAlert] = useState(false);
  const [drivingTime, setDrivingTime] = useState(0);
  const [tripId, setTripId] = useState<string>('');
  const [isEnding, setIsEnding] = useState(false);

  const sensorService = useState(new SensorService())[0];
  const behaviorEngine = useState(new BehaviorAnalysisEngine())[0];
  const crashEngine = useState(new CrashDetectionEngine())[0];
  const [lastPersisted, setLastPersisted] = useState<number>(0);
  const monitoringIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    initializeTrip();
    startSensors();
    startMonitoring();
    startSensorWatchdog();

    return () => {
      if (monitoringIntervalRef.current) {
        clearInterval(monitoringIntervalRef.current);
      }
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
      setSensorInterrupted(true);
      return;
    }

    sensorService.startGPSTracking((gps: GPSData) => {
      setCurrentSpeed(Math.round(gps.speed));
    });

    sensorService.startMotionTracking(() => {});
  };

  const startMonitoring = () => {
    monitoringIntervalRef.current = window.setInterval(async () => {
      const gps = sensorService.getCurrentGPS();
      const motion = sensorService.getCurrentMotion();
      const now = Date.now();

      if (!gps && !motion) {
        setSensorInterrupted(true);
      }

      if (gps) {
        setDrivingTime((prev) => prev + 1);
        behaviorEngine.analyzeSpeed(gps.speed);

        setAcceleration((prev) => {
          const accel = gps.speed - prevSpeed;
          setPrevSpeed(gps.speed);
          return accel;
        });

        if (gps.speed === 0 || gps.speed < 1) {
          setIsStopped(true);
        } else {
          setIsStopped(false);
        }
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

      if (tripId && gps && (now - lastPersisted > 900)) {
        setLastPersisted(now);

        await saveDrivingMetrics({
          tripId,
          gps,
          motion,
        });
      }

    }, 1000);
  };

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
    setIsEnding(true);

    const { data: metricsData, error: metricsError } = await supabase
      .from('driving_metrics')
      .select('*')
      .eq('trip_id', tripId);

    let totalDistance = 0;
    let maxSpeed = 0;
    let avgSpeed = 0;
    let duration = drivingTime;

    if (!metricsError && metricsData && metricsData.length > 0) {
      let prev = null;
      let speedSum = 0;

      metricsData.forEach((m) => {
        speedSum += m.speed;
        if (m.speed > maxSpeed) maxSpeed = m.speed;

        if (prev) {
          const dx = m.latitude - prev.latitude;
          const dy = m.longitude - prev.longitude;
          const dist = Math.sqrt(dx * dx + dy * dy) * 111;
          totalDistance += dist;
        }

        prev = m;
      });

      avgSpeed = Math.round(speedSum / metricsData.length);
      totalDistance = Math.round(totalDistance * 100) / 100;
      duration = metricsData.length;
    } else {
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
        duration,
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

  if (crashAlert) {
    return (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
        <div className="bg-red-900 border-2 border-red-500 rounded-lg p-8 max-w-md text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Crash Detected!</h2>
          <p className="text-red-100 mb-6">Emergency services have been notified.</p>
          <button
            onClick={() => setCrashAlert(false)}
            className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg"
          >
            Dismiss
          </button>
        </div>
      </div>
    );
  }

  if (sensorInterrupted) {
    return (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
        <div className="bg-yellow-900 border-2 border-yellow-500 rounded-lg p-8 max-w-md text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Sensors Unavailable</h2>
          <p className="text-yellow-100 mb-6">Could not access device sensors. Please check permissions.</p>
          <button
            onClick={onExit}
            className="px-6 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg"
          >
            Exit Driving Mode
          </button>
        </div>
      </div>
    );
  }

  const speedPercentage = Math.min((currentSpeed / 200) * 100, 100);

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 text-white p-6 flex flex-col">
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-3xl font-light mb-1">Driving Mode</h1>
          <p className="text-gray-400 text-sm">Stay focused and safe</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-gray-400 text-xs">Safety</p>
            <p className={`text-lg font-semibold capitalize ${
              safetyStatus === 'safe' ? 'text-emerald-400' :
              safetyStatus === 'warning' ? 'text-amber-400' : 'text-red-400'
            }`}>
              {safetyStatus}
            </p>
          </div>
          <button
            onClick={onExit}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center mb-8">
        <div className="relative w-80 h-80">
          <svg className="w-full h-full" viewBox="0 0 300 300">
            <circle cx="150" cy="150" r="140" fill="none" stroke="#1e293b" strokeWidth="2" />
            <circle cx="150" cy="150" r="140" fill="none" stroke="#3b82f6" strokeWidth="8" strokeDasharray={`${(speedPercentage / 100) * 879} 879`} strokeLinecap="round" opacity="0.7" className="transition-all duration-500" />
            <text x="150" y="150" fontSize="72" fontWeight="300" textAnchor="middle" dominantBaseline="middle" className="text-blue-300">
              {currentSpeed}
            </text>
            <text x="150" y="190" fontSize="24" textAnchor="middle" className="text-gray-400">
              km/h
            </text>
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <Gauge className="w-20 h-20 text-blue-500/30 absolute" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-white/5 border border-white/10 rounded-xl p-6 text-center">
          <p className="text-xs text-gray-400 uppercase mb-3">Duration</p>
          <p className="text-2xl font-light text-blue-300">{drivingTime}s</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-6 text-center">
          <p className="text-xs text-gray-400 uppercase mb-3">Acceleration</p>
          <p className={`text-2xl font-light ${acceleration > 0 ? 'text-amber-400' : acceleration < 0 ? 'text-blue-400' : 'text-gray-300'}`}>
            {acceleration.toFixed(1)}
          </p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-6 text-center">
          <p className="text-xs text-gray-400 uppercase mb-3">Status</p>
          <p className={`text-2xl font-light ${isStopped ? 'text-emerald-400' : 'text-gray-300'}`}>
            {isStopped ? 'Stopped' : 'Moving'}
          </p>
        </div>
      </div>

      {lastAlert && (
        <div className={`mb-6 p-4 rounded-xl border flex items-start gap-3 ${
          lastAlert.severity === 'high'
            ? 'bg-red-500/10 border-red-500/30'
            : 'bg-amber-500/10 border-amber-500/30'
        }`}>
          <AlertTriangle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
            lastAlert.severity === 'high' ? 'text-red-400' : 'text-amber-400'
          }`} />
          <div>
            <p className="font-medium text-sm">{lastAlert.type}</p>
            <p className="text-xs text-gray-300 mt-1">{lastAlert.description}</p>
          </div>
        </div>
      )}

      {isStopped && (
        <button
          onClick={handleEndTrip}
          disabled={isEnding}
          className="w-full py-4 px-6 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 disabled:from-gray-700 disabled:to-gray-600 text-white font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isEnding ? 'Ending Trip...' : 'End Trip'}
        </button>
      )}
    </div>
  );
}