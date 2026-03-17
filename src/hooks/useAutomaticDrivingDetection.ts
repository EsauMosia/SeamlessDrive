import { useEffect, useState, useRef } from 'react';
import { SensorService, GPSData, MotionData } from '../lib/sensorService';
import { DrivingDetectionEngine } from '../lib/drivingDetection';

interface DetectionState {
  isDriving: boolean;
  message: string;
  speed: number;
  confidence: number;
  isInitializing: boolean;
  permissionDenied: boolean;
}

export function useAutomaticDrivingDetection() {
  const [state, setState] = useState<DetectionState>({
    isDriving: false,
    message: '',
    speed: 0,
    confidence: 0,
    isInitializing: true,
    permissionDenied: false,
  });

  const sensorServiceRef = useRef<SensorService | null>(null);
  const detectionEngineRef = useRef<DrivingDetectionEngine | null>(null);
  const monitoringIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    initializeDrivingDetection();

    return () => {
      cleanup();
    };
  }, []);

  const initializeDrivingDetection = async () => {
    try {
      // Initialize services
      sensorServiceRef.current = new SensorService();
      detectionEngineRef.current = new DrivingDetectionEngine();

      // Request permissions
      const hasPermission = await sensorServiceRef.current.getPermissions();

      if (!hasPermission) {
        setState((prev) => ({
          ...prev,
          isInitializing: false,
          permissionDenied: true,
          message: 'Sensor permissions are required for driving detection.',
        }));
        return;
      }

      // Start sensor tracking
      sensorServiceRef.current.startGPSTracking();
      sensorServiceRef.current.startMotionTracking();

      // Subscribe to driving detection events
      if (detectionEngineRef.current) {
        unsubscribeRef.current = detectionEngineRef.current.onDrivingDetected((result) => {
          setState((prev) => ({
            ...prev,
            isDriving: result.isDriving,
            speed: Math.round(result.speed),
            confidence: result.confidence,
            message: result.message || '',
          }));
        });
      }

      // Start monitoring loop
      startMonitoring();

      setState((prev) => ({
        ...prev,
        isInitializing: false,
        message: 'Waiting for driving detection...',
      }));
    } catch (error) {
      console.error('Error initializing driving detection:', error);
      setState((prev) => ({
        ...prev,
        isInitializing: false,
        permissionDenied: true,
        message: 'Error initializing driving detection.',
      }));
    }
  };

  const startMonitoring = () => {
    if (monitoringIntervalRef.current) {
      clearInterval(monitoringIntervalRef.current);
    }

    monitoringIntervalRef.current = setInterval(() => {
      if (!sensorServiceRef.current || !detectionEngineRef.current) return;

      const gps = sensorServiceRef.current.getCurrentGPS();
      const motion = sensorServiceRef.current.getCurrentMotion();

      if (gps) {
        const hasMotion = motion !== null;
        const result = detectionEngineRef.current.analyzeDrivingCondition(gps.speed, hasMotion);

        setState((prev) => ({
          ...prev,
          isDriving: result.isDriving,
          speed: Math.round(result.speed),
          confidence: result.confidence,
        }));
      }
    }, 1000);
  };

  const cleanup = () => {
    if (monitoringIntervalRef.current) {
      clearInterval(monitoringIntervalRef.current);
    }

    if (unsubscribeRef.current) {
      unsubscribeRef.current();
    }

    if (sensorServiceRef.current) {
      sensorServiceRef.current.destroy();
    }
  };

  const resetDetection = () => {
    if (detectionEngineRef.current) {
      detectionEngineRef.current.reset();
    }
    setState((prev) => ({
      ...prev,
      isDriving: false,
      message: '',
      speed: 0,
      confidence: 0,
    }));
  };

  return {
    ...state,
    resetDetection,
    sensorService: sensorServiceRef.current,
    detectionEngine: detectionEngineRef.current,
  };
}
