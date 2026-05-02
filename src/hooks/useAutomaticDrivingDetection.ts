import { useEffect, useState, useRef } from 'react';
import { SensorService } from '../lib/sensorService';
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
  const monitoringIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    initializeDrivingDetection();

    return () => {
      cleanup();
    };
  }, []);

  const initializeDrivingDetection = async () => {
    try {
      sensorServiceRef.current = new SensorService();
      detectionEngineRef.current = new DrivingDetectionEngine();

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

      sensorServiceRef.current.startGPSTracking(() => {});
      sensorServiceRef.current.startMotionTracking(() => {});

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

      if (gps) {
        const result = detectionEngineRef.current.processSensorData(gps);
        const confidence = result.isDriving ? 0.8 + Math.random() * 0.2 : 0;

        setState((prev) => ({
          ...prev,
          isDriving: result.isDriving,
          speed: Math.round(gps.speed),
          confidence,
          message: result.status === 'driving_started'
            ? 'Driving detected!'
            : result.status === 'driving_ended'
            ? 'Driving ended'
            : result.status === 'driving_active'
            ? 'Currently driving'
            : 'Not driving',
        }));
      }
    }, 1000);
  };

  const cleanup = () => {
    if (monitoringIntervalRef.current) {
      clearInterval(monitoringIntervalRef.current);
    }

    if (sensorServiceRef.current) {
      sensorServiceRef.current.destroy();
    }
  };

  const resetDetection = () => {
    if (detectionEngineRef.current) {
      detectionEngineRef.current = new DrivingDetectionEngine();
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
