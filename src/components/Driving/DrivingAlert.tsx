import { useEffect, useState } from 'react';
import { CheckCircle, Shield } from 'lucide-react';

interface DrivingDetectionAlertProps {
  isDetected: boolean;
  message: string;
  speed: number;
  confidence: number;
}

export function DrivingDetectionAlert({
  isDetected,
  message,
  speed,
  confidence,
}: DrivingDetectionAlertProps) {
  const [showAlert, setShowAlert] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    if (isDetected && message) {
      setShowAlert(true);
      setFadeOut(false);

      const timer = setTimeout(() => {
        setFadeOut(true);
        setTimeout(() => {
          setShowAlert(false);
        }, 500);
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [isDetected, message]);

  if (!showAlert) return null;

  return (
    <div
      className={`fixed top-4 left-4 right-4 z-40 transition-all duration-500 ${
        fadeOut ? 'opacity-0 translate-y-2' : 'opacity-100 translate-y-0'
      }`}
    >
      <div className="bg-gradient-to-r from-blue-600 to-blue-500 rounded-xl shadow-lg p-4 flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          {isDetected ? (
            <Shield className="w-6 h-6 text-white" />
          ) : (
            <CheckCircle className="w-6 h-6 text-white" />
          )}
        </div>
        <div className="flex-1">
          <p className="text-white font-semibold text-sm">{message}</p>
          {isDetected && (
            <div className="mt-2 flex items-center gap-4 text-xs text-blue-100">
              <span>Speed: {speed} km/h</span>
              <span>Confidence: {Math.round(confidence * 100)}%</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
