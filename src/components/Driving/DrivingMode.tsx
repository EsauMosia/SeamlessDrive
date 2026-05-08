import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { SensorService, GPSData } from '../../lib/sensorService';
import { BehaviorAnalysisEngine, DrivingEvent } from '../../lib/behaviorAnalysis';
import { CrashDetectionEngine } from '../../lib/crashDetection';
import { adaptiveLearning } from '../../lib/adaptiveLearning';
import { FatigueDetectionEngine, FatigueState } from '../../lib/fatigueDetection';
import { HazardZoneEngine, HazardAlert } from '../../lib/hazardZoneDetection';
import { DistractionDetectionEngine, DistractionState } from '../../lib/distractionDetection';
import { saveDrivingMetrics, shutdownMetricsService } from '../../services/drivingMetricsService';
import { offlineStorage } from '../../services/offlineStorage';
import { Gauge, AlertTriangle, X, WifiOff, Phone, MapPin, Eye, Coffee, Shield } from 'lucide-react';

type DrivingModeProps = { onExit: () => void };

type PreventiveAlert = {
  id: string;
  type: 'fatigue' | 'hazard' | 'distraction' | 'behavior';
  severity: 'info' | 'warning' | 'danger';
  message: string;
  timestamp: number;
  dismissed?: boolean;
};

export function DrivingMode({ onExit }: DrivingModeProps) {
  const { user, refreshProfile } = useAuth();
  const [currentSpeed, setCurrentSpeed] = useState(0);
  const [acceleration, setAcceleration] = useState(0);
  const [isStopped, setIsStopped] = useState(false);
  const [sensorInterrupted, setSensorInterrupted] = useState(false);
  const [safetyStatus, setSafetyStatus] = useState<'safe' | 'warning' | 'critical'>('safe');
  const [lastAlert, setLastAlert] = useState<DrivingEvent | null>(null);
  const [crashAlert, setCrashAlert] = useState(false);
  const [crashNotifying, setCrashNotifying] = useState(false);
  const [crashNotified, setCrashNotified] = useState(false);
  const [crashContacts, setCrashContacts] = useState<{ name: string; phone: string }[]>([]);
  const [drivingTime, setDrivingTime] = useState(0);
  const [tripId, setTripId] = useState<string>('');
  const [isEnding, setIsEnding] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [pendingSync, setPendingSync] = useState(0);
  const [tripError, setTripError] = useState<string | null>(null);
  const [fatigueState, setFatigueState] = useState<FatigueState | null>(null);
  const [distractionState, setDistractionState] = useState<DistractionState | null>(null);
  const [hazardAlerts, setHazardAlerts] = useState<HazardAlert[]>([]);
  const [preventiveAlerts, setPreventiveAlerts] = useState<PreventiveAlert[]>([]);
  const [showSOS, setShowSOS] = useState(false);

  const sensorService = useState(new SensorService())[0];
  const behaviorEngine = useState(new BehaviorAnalysisEngine())[0];
  const crashEngine = useState(new CrashDetectionEngine())[0];
  const fatigueEngine = useState(new FatigueDetectionEngine())[0];
  const hazardEngine = useState(new HazardZoneEngine())[0];
  const distractionEngine = useState(new DistractionDetectionEngine())[0];
  const monitoringIntervalRef = useRef<number | null>(null);
  const watchdogRef = useRef<number | null>(null);
  const prevSpeedRef = useRef(0);
  const tripIdRef = useRef('');
  const autoSyncCleanupRef = useRef<(() => void) | null>(null);
  const lastGpsRef = useRef<GPSData | null>(null);
  const drivingTimeRef = useRef(0);
  const mountedRef = useRef(true);

  useEffect(() => { tripIdRef.current = tripId; }, [tripId]);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => { window.removeEventListener('online', handleOnline); window.removeEventListener('offline', handleOffline); };
  }, []);

  useEffect(() => {
    initializeTrip();
    loadAdaptiveThresholds();
    startSensors();
    startMonitoring();
    startSensorWatchdog();
    fatigueEngine.startDrive();

    autoSyncCleanupRef.current = offlineStorage.startAutoSync((result) => {
      if (result.synced > 0) { setPendingSync(offlineStorage.getPendingCount()); }
    });
    setPendingSync(offlineStorage.getPendingCount());

    return () => {
      mountedRef.current = false;
      if (monitoringIntervalRef.current) clearInterval(monitoringIntervalRef.current);
      if (watchdogRef.current) clearInterval(watchdogRef.current);
      if (autoSyncCleanupRef.current) autoSyncCleanupRef.current();
      shutdownMetricsService();
      sensorService.destroy();
    };
  }, []);

  const loadAdaptiveThresholds = async () => {
    if (!user) return;
    const profile = await adaptiveLearning.getOrCreateProfile(user.id);
    if (profile) { behaviorEngine.setThresholds({ braking: profile.braking_threshold, acceleration: profile.acceleration_threshold, turn: profile.turn_threshold, speed: profile.speed_threshold }); }
  };

  const initializeTrip = async () => {
    if (!user) return;
    const tripIdLocal = crypto.randomUUID();
    if (offlineStorage.isOnline()) {
      const { error } = await supabase.from('trips').insert({ id: tripIdLocal, user_id: user.id, start_location: 'Driving Mode', status: 'in_progress' }).select().single();
      if (error) { offlineStorage.saveTrip({ id: tripIdLocal, userId: user.id, startLocation: 'Driving Mode', startTime: new Date().toISOString(), status: 'in_progress' }); setIsOffline(true); }
      setTripId(tripIdLocal);
    } else {
      offlineStorage.saveTrip({ id: tripIdLocal, userId: user.id, startLocation: 'Driving Mode', startTime: new Date().toISOString(), status: 'in_progress' });
      setTripId(tripIdLocal); setIsOffline(true);
    }
  };

  const startSensors = async () => {
    const hasPermission = await sensorService.getPermissions();
    if (!hasPermission) { setSensorInterrupted(true); return; }
    sensorService.startGPSTracking((gps: GPSData) => { setCurrentSpeed(Math.round(gps.speed)); });
    sensorService.startMotionTracking(() => {});
  };

  const addPreventiveAlert = (alert: Omit<PreventiveAlert, 'id' | 'timestamp'>) => {
    const id = `${alert.type}-${Date.now()}`;
    setPreventiveAlerts(prev => {
      const filtered = prev.filter(a => a.type !== alert.type || Date.now() - a.timestamp < 30000);
      return [...filtered, { ...alert, id, timestamp: Date.now() }].slice(-5);
    });
  };

  const dismissPreventiveAlert = (id: string) => {
    setPreventiveAlerts(prev => prev.map(a => a.id === id ? { ...a, dismissed: true } : a));
  };
  void dismissPreventiveAlert;

  const handleCrashDetected = useCallback(async () => {
    if (!user || crashNotifying) return;
    setCrashNotifying(true);

    const gps = lastGpsRef.current;
    const hasValidGps = gps && gps.latitude !== 0 && gps.longitude !== 0;
    const lat = hasValidGps ? gps.latitude : null;
    const lng = hasValidGps ? gps.longitude : null;

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      const response = await fetch(`${supabaseUrl}/functions/v1/crash-alert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${anonKey}` },
        body: JSON.stringify({ userId: user.id, latitude: lat, longitude: lng, confidence: 0.7, tripId: tripIdRef.current }),
      });
      const result = await response.json();
      if (result.contacts) { setCrashContacts(result.contacts.map((c: { name: string; phone: string }) => ({ name: c.name, phone: c.phone }))); }
      setCrashNotified(true);
    } catch {
      setCrashNotified(false);
    }
    setCrashNotifying(false);
  }, [user, crashNotifying]);

  const handleManualSOS = async () => {
    setShowSOS(false);
    setCrashAlert(true);
    await handleCrashDetected();
  };

  const startMonitoring = () => {
    monitoringIntervalRef.current = window.setInterval(() => {
      if (!mountedRef.current) return;
      const gps = sensorService.getCurrentGPS();
      const motion = sensorService.getCurrentMotion();

      if (!gps && !motion) { setSensorInterrupted(true); }

      if (gps) {
        lastGpsRef.current = gps;
        drivingTimeRef.current += 1;
        setDrivingTime(drivingTimeRef.current);
        behaviorEngine.analyzeSpeed(gps.speed);
        fatigueEngine.recordSpeed(gps.speed);

        const newAccel = gps.speed - prevSpeedRef.current;
        prevSpeedRef.current = gps.speed;
        setAcceleration(newAccel);
        setIsStopped(gps.speed < 1);

        // Hazard zone detection (every 10 seconds)
        if (drivingTimeRef.current % 10 === 0) {
          (async () => {
            try {
              await hazardEngine.loadNearbyZones(gps.latitude, gps.longitude);
              if (!mountedRef.current) return;
              const hazards = hazardEngine.checkHazards(gps.latitude, gps.longitude, gps.speed);
              setHazardAlerts(hazards);
              if (hazards.length > 0 && hazards[0].severity === 'danger') {
                addPreventiveAlert({ type: 'hazard', severity: 'danger', message: hazards[0].message });
                setSafetyStatus('critical');
              } else if (hazards.length > 0) {
                addPreventiveAlert({ type: 'hazard', severity: 'warning', message: hazards[0].message });
              }
            } catch (err) {
              console.error('Hazard detection error:', err);
            }
          })();
        }
      }

      if (motion && gps) {
        const motionEvent = behaviorEngine.analyzeMotion(motion, gps.speed);
        if (motionEvent) {
          setLastAlert(motionEvent);
          setSafetyStatus(motionEvent.severity === 'high' ? 'critical' : 'warning');
          setTimeout(() => { if (mountedRef.current) { setSafetyStatus('safe'); setLastAlert(null); } }, 4000);
        }

        // Distraction detection
        distractionEngine.recordMotion(motion.acceleration.x, motion.acceleration.y, motion.acceleration.z);
        const distraction = distractionEngine.analyze(gps.speed);
        setDistractionState(distraction);
        if (distraction.isDistracted && distractionEngine.shouldAlert()) {
          addPreventiveAlert({ type: 'distraction', severity: distraction.severity, message: distraction.message });
          distractionEngine.markAlerted();
          if (distraction.severity === 'danger') setSafetyStatus('critical');
          else setSafetyStatus('warning');
        }

        // Fatigue detection (every 30 seconds)
        if (drivingTimeRef.current % 30 === 0) {
          const fatigue = fatigueEngine.analyze(motion.acceleration.x, motion.acceleration.y);
          setFatigueState(fatigue);
          if (fatigue.level !== 'alert') {
            addPreventiveAlert({ type: 'fatigue', severity: fatigue.level === 'severe' ? 'danger' : 'warning', message: fatigue.message });
            if (fatigue.shouldStop) setSafetyStatus('critical');
            else if (fatigue.level === 'moderate') setSafetyStatus('warning');
          }
        }

        // Crash detection
        const crash = crashEngine.detectCrash(motion, gps);
        if (crash.isCrash) {
          setCrashAlert(true);
          handleCrashDetected();
        }
      }

      if (tripIdRef.current && gps) {
        saveDrivingMetrics({ tripId: tripIdRef.current, gps, motion });
        setPendingSync(offlineStorage.getPendingCount());
      }
    }, 1000);
  };

  const startSensorWatchdog = () => {
    watchdogRef.current = window.setInterval(() => {
      const gps = sensorService.getCurrentGPS();
      const motion = sensorService.getCurrentMotion();
      if (!gps && !motion) { setSensorInterrupted(true); }
    }, 3000);
  };

  const handleEndTrip = useCallback(async () => {
    if (!tripId || !user) return;
    setIsEnding(true); setTripError(null);
    try {
      shutdownMetricsService();
      if (!offlineStorage.isOnline()) {
        offlineStorage.saveTrip({ id: tripId, userId: user.id, startLocation: 'Driving Mode', startTime: new Date().toISOString(), status: 'completed' });
        setTripError('Trip saved offline. Data will sync when you reconnect.');
        await new Promise((resolve) => setTimeout(resolve, 2000));
        await refreshProfile(); onExit(); return;
      }
      await offlineStorage.syncMetrics();
      // Brief delay to ensure Supabase has committed synced metrics before querying
      await new Promise((resolve) => setTimeout(resolve, 500));
      const { data: metricsData, error: metricsError } = await supabase.from('driving_metrics').select('*').eq('trip_id', tripId);
      let totalDistance = 0, maxSpeed = 0, avgSpeed = 0, duration = drivingTime;
      if (!metricsError && metricsData && metricsData.length > 0) {
        let prevMetric: { latitude: number; longitude: number } | null = null, speedSum = 0;
        metricsData.forEach((m: { latitude: number; longitude: number; speed: number }) => {
          speedSum += m.speed; if (m.speed > maxSpeed) maxSpeed = m.speed;
          if (prevMetric) { const dx = m.latitude - prevMetric.latitude; const dy = m.longitude - prevMetric.longitude; totalDistance += Math.sqrt(dx * dx + dy * dy) * 111; }
          prevMetric = m;
        });
        avgSpeed = Math.round(speedSum / metricsData.length);
        totalDistance = Math.round(totalDistance * 100) / 100;
        duration = metricsData.length;
      } else { totalDistance = currentSpeed * (drivingTime / 3600); avgSpeed = currentSpeed; maxSpeed = currentSpeed; }
      const metrics = behaviorEngine.getMetrics();
      const { error: updateError } = await supabase.from('trips').update({ end_time: new Date().toISOString(), end_location: 'Trip Ended', distance: totalDistance, duration, average_speed: avgSpeed, max_speed: maxSpeed, harsh_braking_count: metrics.harshBrakingCount, rapid_acceleration_count: metrics.rapidAccelerationCount, safety_score: metrics.overallSafetyScore, status: 'completed' }).eq('id', tripId);
      if (updateError) { setTripError('Failed to save trip. Data is preserved locally and will sync later.'); await new Promise((resolve) => setTimeout(resolve, 2000)); }
      await refreshProfile();
      if (user) { await adaptiveLearning.learnFromTrip({ harshBrakingCount: metrics.harshBrakingCount, rapidAccelerationCount: metrics.rapidAccelerationCount, aggressiveTurningCount: metrics.aggressiveTurningCount ?? 0, speedingCount: metrics.speedingCount ?? 0, averageSpeed: avgSpeed, maxSpeed, duration, distance: totalDistance }); }
      onExit();
    } catch (err) { console.error('Error ending trip:', err); setTripError('An error occurred. Trip data is preserved locally.'); await new Promise((resolve) => setTimeout(resolve, 2000)); onExit(); }
  }, [tripId, user, drivingTime, currentSpeed, behaviorEngine, refreshProfile, onExit]);

  const speedPercentage = useMemo(() => Math.min((currentSpeed / 200) * 100, 100), [currentSpeed]);

  // CRASH ALERT SCREEN - Real emergency flow
  if (crashAlert) {
    return (
      <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
        <div className="bg-gradient-to-b from-red-950 to-red-900 border-2 border-red-500 rounded-2xl p-8 max-w-md w-full text-center">
          <div className="bg-red-500/20 p-4 rounded-full w-20 h-20 mx-auto mb-6 flex items-center justify-center">
            <AlertTriangle className="w-10 h-10 text-red-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Crash Detected</h2>

          {crashNotifying && (
            <div className="mb-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
              <p className="text-red-200 text-sm">Notifying emergency contacts...</p>
            </div>
          )}

          {crashNotified && (
            <div className="mb-4">
              <p className="text-emerald-300 text-sm font-medium mb-2">
                Emergency contacts notified
              </p>
              {crashContacts.length > 0 && (
                <div className="space-y-1">
                  {crashContacts.map((c, i) => (
                    <p key={i} className="text-gray-300 text-xs">{c.name} ({c.phone})</p>
                  ))}
                </div>
              )}
              {crashContacts.length === 0 && (
                <p className="text-amber-300 text-xs">No emergency contacts found. Add contacts in your profile.</p>
              )}
            </div>
          )}

          {!crashNotifying && !crashNotified && (
            <p className="text-red-200 mb-4 text-sm">Attempting to notify emergency contacts...</p>
          )}

          <div className="space-y-3 mt-6">
            <a
              href="tel:911"
              className="block w-full py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl transition-colors"
            >
              <Phone className="w-4 h-4 inline mr-2" />Call 911
            </a>
            {lastGpsRef.current && lastGpsRef.current.latitude !== 0 && lastGpsRef.current.longitude !== 0 && (
              <a
                href={`https://www.google.com/maps?q=${lastGpsRef.current.latitude},${lastGpsRef.current.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors text-sm"
              >
                <MapPin className="w-4 h-4 inline mr-2" />Share My Location
              </a>
            )}
            <button
              onClick={() => setCrashAlert(false)}
              className="block w-full py-3 bg-white/10 hover:bg-white/20 text-white font-medium rounded-xl transition-colors text-sm"
            >
              I'm OK - Dismiss
            </button>
          </div>
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
          <button onClick={onExit} className="px-6 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg">Exit Driving Mode</button>
        </div>
      </div>
    );
  }

  const activePreventiveAlerts = preventiveAlerts.filter(a => !a.dismissed);
  void activePreventiveAlerts;

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 text-white p-6 flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div>
          <h1 className="text-3xl font-light mb-1">Driving Mode</h1>
          <p className="text-gray-400 text-sm">Stay focused and safe</p>
        </div>
        <div className="flex items-center gap-3">
          {isOffline && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 border border-amber-500/30 rounded-lg">
              <WifiOff className="w-4 h-4 text-amber-400" />
              <span className="text-xs text-amber-400">Offline{pendingSync > 0 ? ` (${pendingSync})` : ''}</span>
            </div>
          )}
          <div className="text-right">
            <p className="text-gray-400 text-xs">Safety</p>
            <p className={`text-lg font-semibold capitalize ${safetyStatus === 'safe' ? 'text-emerald-400' : safetyStatus === 'warning' ? 'text-amber-400' : 'text-red-400'}`}>{safetyStatus}</p>
          </div>
          {/* SOS Button */}
          <button onClick={() => setShowSOS(true)} className="p-2.5 bg-red-600/20 hover:bg-red-600/40 border border-red-500/30 rounded-lg transition-colors" title="Emergency SOS">
            <Shield className="w-5 h-5 text-red-400" />
          </button>
          <button onClick={onExit} className="p-2 hover:bg-white/10 rounded-lg transition-colors"><X className="w-6 h-6" /></button>
        </div>
      </div>

      {/* Fatigue Indicator */}
      {fatigueState && fatigueState.level !== 'alert' && (
        <div className={`mb-3 p-3 rounded-xl border flex items-center gap-3 ${
          fatigueState.level === 'severe' ? 'bg-red-500/10 border-red-500/30' :
          fatigueState.level === 'moderate' ? 'bg-amber-500/10 border-amber-500/30' :
          'bg-blue-500/10 border-blue-500/30'
        }`}>
          <Coffee className={`w-5 h-5 flex-shrink-0 ${
            fatigueState.level === 'severe' ? 'text-red-400' :
            fatigueState.level === 'moderate' ? 'text-amber-400' : 'text-blue-400'
          }`} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">{Math.round(fatigueState.minutesSinceBreak)}min since break</p>
            <p className="text-xs text-gray-400 truncate">{fatigueState.message}</p>
          </div>
          {fatigueState.shouldStop && <span className="text-xs text-red-400 font-bold animate-pulse">PULL OVER</span>}
        </div>
      )}

      {/* Distraction Indicator */}
      {distractionState && distractionState.isDistracted && (
        <div className={`mb-3 p-3 rounded-xl border flex items-center gap-3 ${
          distractionState.severity === 'danger' ? 'bg-red-500/10 border-red-500/30' : 'bg-amber-500/10 border-amber-500/30'
        }`}>
          <Eye className={`w-5 h-5 flex-shrink-0 ${distractionState.severity === 'danger' ? 'text-red-400' : 'text-amber-400'}`} />
          <p className="text-sm flex-1">{distractionState.message}</p>
        </div>
      )}

      {/* Hazard Zone Alert */}
      {hazardAlerts.length > 0 && hazardAlerts[0].severity !== 'info' && (
        <div className={`mb-3 p-3 rounded-xl border flex items-center gap-3 ${
          hazardAlerts[0].severity === 'danger' ? 'bg-red-500/10 border-red-500/30' : 'bg-amber-500/10 border-amber-500/30'
        }`}>
          <MapPin className={`w-5 h-5 flex-shrink-0 ${hazardAlerts[0].severity === 'danger' ? 'text-red-400' : 'text-amber-400'}`} />
          <p className="text-sm flex-1">{hazardAlerts[0].message}</p>
          <button onClick={() => hazardEngine.dismissZone(hazardAlerts[0].zone.id)} className="text-xs text-gray-500 hover:text-gray-300">Dismiss</button>
        </div>
      )}

      {/* Speed Gauge */}
      <div className="flex-1 flex items-center justify-center mb-4">
        <div className="relative w-72 h-72">
          <svg className="w-full h-full" viewBox="0 0 300 300">
            <circle cx="150" cy="150" r="140" fill="none" stroke="#1e293b" strokeWidth="2" />
            <circle cx="150" cy="150" r="140" fill="none" stroke={safetyStatus === 'critical' ? '#ef4444' : safetyStatus === 'warning' ? '#f59e0b' : '#3b82f6'} strokeWidth="8" strokeDasharray={`${(speedPercentage / 100) * 879} 879`} strokeLinecap="round" opacity="0.7" className="transition-all duration-500" />
            <text x="150" y="150" fontSize="72" fontWeight="300" textAnchor="middle" dominantBaseline="middle" className="text-blue-300">{currentSpeed}</text>
            <text x="150" y="190" fontSize="24" textAnchor="middle" className="text-gray-400">km/h</text>
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <Gauge className="w-20 h-20 text-blue-500/30 absolute" />
          </div>
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
          <p className="text-xs text-gray-400 uppercase mb-2">Duration</p>
          <p className="text-xl font-light text-blue-300">{Math.floor(drivingTime / 60)}m {drivingTime % 60}s</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
          <p className="text-xs text-gray-400 uppercase mb-2">Acceleration</p>
          <p className={`text-xl font-light ${acceleration > 0 ? 'text-amber-400' : acceleration < 0 ? 'text-blue-400' : 'text-gray-300'}`}>{acceleration.toFixed(1)}</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
          <p className="text-xs text-gray-400 uppercase mb-2">Status</p>
          <p className={`text-xl font-light ${isStopped ? 'text-emerald-400' : 'text-gray-300'}`}>{isStopped ? 'Stopped' : 'Moving'}</p>
        </div>
      </div>

      {/* Behavior Alert */}
      {tripError && (
        <div className="mb-3 p-3 rounded-xl border bg-amber-500/10 border-amber-500/30 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-amber-200">{tripError}</p>
        </div>
      )}

      {lastAlert && (
        <div className={`mb-3 p-3 rounded-xl border flex items-start gap-3 ${lastAlert.severity === 'high' ? 'bg-red-500/10 border-red-500/30' : 'bg-amber-500/10 border-amber-500/30'}`}>
          <AlertTriangle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${lastAlert.severity === 'high' ? 'text-red-400' : 'text-amber-400'}`} />
          <div>
            <p className="font-medium text-sm">{lastAlert.type.replace(/_/g, ' ')}</p>
            <p className="text-xs text-gray-300 mt-1">{lastAlert.message}</p>
          </div>
        </div>
      )}

      {/* End Trip Button */}
      {isStopped && (
        <button onClick={handleEndTrip} disabled={isEnding} className="w-full py-4 px-6 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 disabled:from-gray-700 disabled:to-gray-600 text-white font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed">
          {isEnding ? 'Ending Trip...' : 'End Trip'}
        </button>
      )}

      {/* SOS Confirmation Modal */}
      {showSOS && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-sm w-full p-6 text-center">
            <div className="bg-red-500/20 p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <Shield className="w-8 h-8 text-red-400" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Emergency SOS</h3>
            <p className="text-gray-400 text-sm mb-6">This will notify your emergency contacts with your current location.</p>
            <div className="space-y-3">
              <button onClick={handleManualSOS} className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl transition-colors">Send SOS Alert</button>
              <a href="tel:911" className="block w-full py-3 bg-red-800 hover:bg-red-900 text-white font-medium rounded-xl transition-colors text-sm"><Phone className="w-4 h-4 inline mr-2" />Call 911</a>
              <button onClick={() => setShowSOS(false)} className="w-full py-3 bg-white/10 hover:bg-white/20 text-white font-medium rounded-xl transition-colors text-sm">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
