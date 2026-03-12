import { DeviceMotion, GPSData } from './sensorService';

export class CrashDetectionEngine {
  private gForceThreshold = 2.5;
  private speedDropThreshold = 0.8;
  private lastSpeed = 0;

  detectCrash(motion: DeviceMotion, gps: GPSData): { isCrash: boolean; confidence: number } {
    const gForce = this.calculateGForce(motion);
    let confidence = 0;

    if (gForce > this.gForceThreshold) {
      confidence += 0.4;
    }

    if (this.lastSpeed > 20 && gps.speed < this.lastSpeed * this.speedDropThreshold) {
      confidence += 0.3;
    }

    this.lastSpeed = gps.speed;

    return {
      isCrash: confidence > 0.6,
      confidence: Math.min(1.0, confidence),
    };
  }

  private calculateGForce(motion: DeviceMotion): number {
    const acc = motion.acceleration;
    const g = Math.sqrt(acc.x * acc.x + acc.y * acc.y + acc.z * acc.z) / 9.81;
    return g;
  }
}
