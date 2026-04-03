import { saveDrivingMetrics } from '../../services/drivingMetricsService';
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { SensorService, GPSData } from '../../lib/sensorService';
import { BehaviorAnalysisEngine, DrivingEvent } from '../../lib/behaviorAnalysis';
import { CrashDetectionEngine } from '../../lib/crashDetection';

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
  const [drivingTime, setDrivingTime] = useState(0);
  const [tripId, setTripId] = useState<string>('');

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

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 text-white p-4">
      <div className="h-full flex flex-col justify-between">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-4xl font-bold mb-2">Driving Mode Active</h1>
            <p className="text-blue-200">Current Speed: {currentSpeed} km/h</p>
          </div>
          <button
            onClick={handleEndTrip}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold"
          >
            End Trip
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-white/10 rounded-lg p-6">
            <p className="text-sm text-blue-200 mb-2">Safety Status</p>
            <p className="text-2xl font-bold capitalize">{safetyStatus}</p>
          </div>
          <div className="bg-white/10 rounded-lg p-6">
            <p className="text-sm text-blue-200 mb-2">Driving Time</p>
            <p className="text-2xl font-bold">{drivingTime}s</p>
          </div>
        </div>

        {lastAlert && (
          <div className={`p-6 rounded-lg mb-4 ${lastAlert.severity === 'high' ? 'bg-red-500/20 border border-red-500' : 'bg-yellow-500/20 border border-yellow-500'}`}>
            <p className="font-semibold">{lastAlert.type}</p>
            <p className="text-sm mt-2">{lastAlert.description}</p>
          </div>
        )}
      </div>
    </div>
  );
}