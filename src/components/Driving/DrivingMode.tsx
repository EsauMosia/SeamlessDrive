import { saveDrivingMetrics } from '../../services/drivingMetricsService';
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

      // ✅ FIXED: now using service instead of direct Supabase call
      if (tripId && gps && (now - lastPersisted > 900)) {
        setLastPersisted(now);

        await saveDrivingMetrics({
          tripId,
          gps,
          motion,
        });
      }

    }, 1000);

    return () => clearInterval(interval);
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

  if (crashAlert) return null;
  if (sensorInterrupted) return null;

  return <div />; // UI unchanged (kept minimal here for clarity)
}