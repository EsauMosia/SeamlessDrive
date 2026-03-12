import { GPSData } from './sensorService';

export class DrivingDetectionEngine {
  private speedReadings: number[] = [];
  private isDriving = false;

  processSensorData(gps: GPSData): { isDriving: boolean; status: string } {
    this.speedReadings.push(gps.speed);
    if (this.speedReadings.length > 10) {
      this.speedReadings.shift();
    }

    const recentReadings = this.speedReadings.slice(-8);
    const consistentlyAboveThreshold =
      recentReadings.length >= 8 &&
      recentReadings.every((speed) => speed > 10);

    if (consistentlyAboveThreshold && !this.isDriving) {
      this.isDriving = true;
      return { isDriving: true, status: 'driving_started' };
    }

    if (this.isDriving && gps.speed < 1) {
      this.isDriving = false;
      return { isDriving: false, status: 'driving_ended' };
    }

    return {
      isDriving: this.isDriving,
      status: this.isDriving ? 'driving_active' : 'stationary',
    };
  }

  getIsDriving(): boolean {
    return this.isDriving;
  }
}
