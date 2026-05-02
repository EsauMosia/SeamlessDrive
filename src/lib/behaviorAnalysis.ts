import { DeviceMotion } from './sensorService';

export interface DrivingEvent {
  type: 'harsh_braking' | 'rapid_acceleration' | 'aggressive_turn' | 'speeding';
  severity: 'low' | 'medium' | 'high';
  message: string;
  timestamp: number;
  value: number;
}

export interface BehaviorMetrics {
  averageSpeed: number;
  maxSpeed: number;
  harshBrakingCount: number;
  rapidAccelerationCount: number;
  aggressiveTurningCount: number;
  speedingCount: number;
  overallSafetyScore: number;
}

export class BehaviorAnalysisEngine {
  private speedHistory: number[] = [];
  private accelerationHistory: number[] = [];
  private events: DrivingEvent[] = [];
  private maxHistorySize = 100;

  analyzeMotion(motion: DeviceMotion, _speed: number): DrivingEvent | null {
    const gForce = this.calculateGForce(motion);
    const rotationIntensity = this.calculateRotationIntensity(motion);

    this.accelerationHistory.push(gForce);
    if (this.accelerationHistory.length > this.maxHistorySize) {
      this.accelerationHistory.shift();
    }

    if (gForce > 0.5) {
      const event: DrivingEvent = {
        type: 'harsh_braking',
        severity: gForce > 1.0 ? 'high' : 'medium',
        message: gForce > 1.0 ? 'Harsh braking detected. Maintain safe distance.' : 'Reduce braking intensity.',
        timestamp: Date.now(),
        value: gForce,
      };
      this.events.push(event);
      return event;
    }

    if (gForce > 0.6 && motion.acceleration.x > 0.3) {
      const event: DrivingEvent = {
        type: 'rapid_acceleration',
        severity: 'medium',
        message: 'Rapid acceleration detected. Accelerate smoothly.',
        timestamp: Date.now(),
        value: gForce,
      };
      this.events.push(event);
      return event;
    }

    if (rotationIntensity > 3.5) {
      const event: DrivingEvent = {
        type: 'aggressive_turn',
        severity: rotationIntensity > 5.0 ? 'high' : 'low',
        message: 'Reduce turning speed. Turn smoothly.',
        timestamp: Date.now(),
        value: rotationIntensity,
      };
      this.events.push(event);
      return event;
    }

    return null;
  }

  analyzeSpeed(speed: number): DrivingEvent | null {
    this.speedHistory.push(speed);
    if (this.speedHistory.length > this.maxHistorySize) {
      this.speedHistory.shift();
    }

    if (speed > 55) {
      const event: DrivingEvent = {
        type: 'speeding',
        severity: speed > 62 ? 'high' : 'medium',
        message: `Reduce speed for safety. Current: ${Math.round(speed)} km/h`,
        timestamp: Date.now(),
        value: speed,
      };
      this.events.push(event);
      return event;
    }

    return null;
  }

  getMetrics(): BehaviorMetrics {
    const harshBrakingCount = this.events.filter((e) => e.type === 'harsh_braking').length;
    const rapidAccelerationCount = this.events.filter((e) => e.type === 'rapid_acceleration').length;
    const aggressiveTurningCount = this.events.filter((e) => e.type === 'aggressive_turn').length;
    const speedingCount = this.events.filter((e) => e.type === 'speeding').length;

    const averageSpeed =
      this.speedHistory.length > 0
        ? this.speedHistory.reduce((a, b) => a + b, 0) / this.speedHistory.length
        : 0;

    const maxSpeed = this.speedHistory.length > 0 ? Math.max(...this.speedHistory) : 0;

    let safetyScore = 100;
    safetyScore -= harshBrakingCount * 3;
    safetyScore -= rapidAccelerationCount * 2;
    safetyScore -= aggressiveTurningCount * 1.5;
    safetyScore -= speedingCount * 2;

    safetyScore = Math.max(0, Math.min(100, safetyScore));

    return {
      averageSpeed: Math.round(averageSpeed),
      maxSpeed: Math.round(maxSpeed),
      harshBrakingCount,
      rapidAccelerationCount,
      aggressiveTurningCount,
      speedingCount,
      overallSafetyScore: Math.round(safetyScore),
    };
  }

  getEvents(): DrivingEvent[] {
    return this.events;
  }

  clearEvents(): void {
    this.events = [];
    this.speedHistory = [];
    this.accelerationHistory = [];
  }

  private calculateGForce(motion: DeviceMotion): number {
    const acc = motion.acceleration;
    const g = Math.sqrt(acc.x * acc.x + acc.y * acc.y + acc.z * acc.z) / 9.81;
    return g;
  }

  private calculateRotationIntensity(motion: DeviceMotion): number {
    const rot = motion.rotationRate;
    return Math.sqrt(rot.alpha * rot.alpha + rot.beta * rot.beta + rot.gamma * rot.gamma);
  }
}
