export interface DeviceMotion {
  acceleration: { x: number; y: number; z: number };
  accelerationIncludingGravity: { x: number; y: number; z: number };
  rotationRate: { alpha: number; beta: number; gamma: number };
}

export interface GPSData {
  latitude: number;
  longitude: number;
  speed: number;
  accuracy: number;
  heading: number;
}

export interface SensorReadings {
  gps: GPSData | null;
  motion: DeviceMotion | null;
  timestamp: number;
}

export class SensorService {
  private gpsWatchId: number | null = null;
  private motionListener: ((event: DeviceMotionEvent) => void) | null = null;
  private currentGPS: GPSData | null = null;
  private currentMotion: DeviceMotion | null = null;

  startGPSTracking(callback: (gps: GPSData) => void): void {
    if (!navigator.geolocation) {
      console.error('Geolocation not supported');
      return;
    }

    this.gpsWatchId = navigator.geolocation.watchPosition(
      (position) => {
        const gps: GPSData = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          speed: (position.coords.speed || 0) * 3.6,
          accuracy: position.coords.accuracy,
          heading: position.coords.heading || 0,
        };
        this.currentGPS = gps;
        callback(gps);
      },
      (error) => {
        console.error('GPS error:', error);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 5000,
      }
    );
  }

  stopGPSTracking(): void {
    if (this.gpsWatchId !== null) {
      navigator.geolocation.clearWatch(this.gpsWatchId);
      this.gpsWatchId = null;
    }
  }

  startMotionTracking(callback: (motion: DeviceMotion) => void): void {
    this.motionListener = (event: DeviceMotionEvent) => {
      const motion: DeviceMotion = {
        acceleration: {
          x: event.acceleration?.x || 0,
          y: event.acceleration?.y || 0,
          z: event.acceleration?.z || 0,
        },
        accelerationIncludingGravity: {
          x: event.accelerationIncludingGravity?.x || 0,
          y: event.accelerationIncludingGravity?.y || 0,
          z: event.accelerationIncludingGravity?.z || 0,
        },
        rotationRate: {
          alpha: event.rotationRate?.alpha || 0,
          beta: event.rotationRate?.beta || 0,
          gamma: event.rotationRate?.gamma || 0,
        },
      };
      this.currentMotion = motion;
      callback(motion);
    };

    window.addEventListener('devicemotion', this.motionListener);
  }

  stopMotionTracking(): void {
    if (this.motionListener) {
      window.removeEventListener('devicemotion', this.motionListener);
      this.motionListener = null;
    }
  }

  getPermissions(): Promise<boolean> {
    return new Promise((resolve) => {
      if (typeof (DeviceMotionEvent as any) !== 'undefined' && typeof (DeviceMotionEvent as any).requestPermission === 'function') {
        (DeviceMotionEvent as any)
          .requestPermission()
          .then((permissionState: string) => {
            resolve(permissionState === 'granted');
          })
          .catch(() => {
            resolve(false);
          });
      } else {
        resolve(true);
      }
    });
  }

  getCurrentGPS(): GPSData | null {
    return this.currentGPS;
  }

  getCurrentMotion(): DeviceMotion | null {
    return this.currentMotion;
  }

  destroy(): void {
    this.stopGPSTracking();
    this.stopMotionTracking();
  }
}
