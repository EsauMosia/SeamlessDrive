export type DistractionState = {
  isDistracted: boolean;
  type: 'none' | 'phone_handling' | 'erratic_motion' | 'prolonged_inattention';
  confidence: number;
  message: string;
  severity: 'info' | 'warning' | 'danger';
};

type MotionSample = {
  x: number;
  y: number;
  z: number;
  timestamp: number;
};

const PHONE_HANDLING_G_THRESHOLD = 0.8;
const PHONE_HANDLING_WINDOW_MS = 5000;
const ERRATIC_VARIANCE_THRESHOLD = 2.5;
const ERRATIC_WINDOW_MS = 10000;
const MAX_SAMPLES = 200;
const PROLONGED_LOW_ACTIVITY_MS = 30000;

export class DistractionDetectionEngine {
  private motionSamples: MotionSample[] = [];
  private lastPhoneHandlingTime = 0;
  private phoneHandlingCount = 0;
  private lastAlertTime = 0;
  private alertCooldownMs = 30000;

  recordMotion(x: number, y: number, z: number): void {
    const now = Date.now();
    this.motionSamples.push({ x, y, z, timestamp: now });
    if (this.motionSamples.length > MAX_SAMPLES) {
      this.motionSamples.shift();
    }
  }

  analyze(currentSpeed: number): DistractionState {
    const now = Date.now();
    if (currentSpeed < 5) {
      return { isDistracted: false, type: 'none', confidence: 0, message: '', severity: 'info' };
    }

    const phoneHandling = this.detectPhoneHandling(now);
    const erraticMotion = this.detectErraticMotion(now);

    if (phoneHandling.isDetected) {
      this.phoneHandlingCount++;
      this.lastPhoneHandlingTime = now;
      const message = this.phoneHandlingCount > 3
        ? 'STOP: Put your phone down. Repeated phone handling detected while driving.'
        : 'WARNING: Phone handling detected. Keep your hands on the wheel.';

      return {
        isDistracted: true,
        type: 'phone_handling',
        confidence: phoneHandling.confidence,
        message,
        severity: this.phoneHandlingCount > 3 ? 'danger' : 'warning',
      };
    }

    if (erraticMotion.isDetected) {
      return {
        isDistracted: true,
        type: 'erratic_motion',
        confidence: erraticMotion.confidence,
        message: 'Distracted driving pattern detected. Focus on the road.',
        severity: 'warning',
      };
    }

    if (now - this.lastPhoneHandlingTime > PROLONGED_LOW_ACTIVITY_MS && this.phoneHandlingCount > 0) {
      this.phoneHandlingCount = Math.max(0, this.phoneHandlingCount - 1);
    }

    return { isDistracted: false, type: 'none', confidence: 0, message: '', severity: 'info' };
  }

  shouldAlert(): boolean {
    const now = Date.now();
    return now - this.lastAlertTime > this.alertCooldownMs;
  }

  markAlerted(): void {
    this.lastAlertTime = Date.now();
  }

  getPhoneHandlingCount(): number {
    return this.phoneHandlingCount;
  }

  reset(): void {
    this.motionSamples = [];
    this.phoneHandlingCount = 0;
    this.lastPhoneHandlingTime = 0;
    this.lastAlertTime = 0;
  }

  private detectPhoneHandling(now: number): { isDetected: boolean; confidence: number } {
    const recent = this.motionSamples.filter(
      s => now - s.timestamp < PHONE_HANDLING_WINDOW_MS
    );
    if (recent.length < 3) return { isDetected: false, confidence: 0 };

    let confidence = 0;

    const lateralMotion = recent.filter(s => Math.abs(s.x) > PHONE_HANDLING_G_THRESHOLD);
    if (lateralMotion.length >= 2) confidence += 0.4;

    const verticalMotion = recent.filter(s => Math.abs(s.y) > PHONE_HANDLING_G_THRESHOLD * 0.7);
    if (verticalMotion.length >= 2) confidence += 0.3;

    const rapidChanges = this.countRapidDirectionChanges(recent);
    if (rapidChanges >= 3) confidence += 0.3;

    return { isDetected: confidence >= 0.5, confidence: Math.min(1, confidence) };
  }

  private detectErraticMotion(now: number): { isDetected: boolean; confidence: number } {
    const recent = this.motionSamples.filter(
      s => now - s.timestamp < ERRATIC_WINDOW_MS
    );
    if (recent.length < 5) return { isDetected: false, confidence: 0 };

    const variance = this.calculateVariance(recent);
    const normalizedVariance = variance / 9.81;

    if (normalizedVariance > ERRATIC_VARIANCE_THRESHOLD) {
      return { isDetected: true, confidence: Math.min(1, normalizedVariance / ERRATIC_VARIANCE_THRESHOLD) };
    }

    return { isDetected: false, confidence: 0 };
  }

  private countRapidDirectionChanges(samples: MotionSample[]): number {
    let count = 0;
    for (let i = 2; i < samples.length; i++) {
      const prev = samples[i - 1];
      const curr = samples[i];
      if (
        (prev.x > 0 && curr.x < -0.3) ||
        (prev.x < 0 && curr.x > 0.3) ||
        (prev.y > 0 && curr.y < -0.3) ||
        (prev.y < 0 && curr.y > 0.3)
      ) {
        count++;
      }
    }
    return count;
  }

  private calculateVariance(samples: MotionSample[]): number {
    const magnitudes = samples.map(s => Math.sqrt(s.x * s.x + s.y * s.y + s.z * s.z));
    const mean = magnitudes.reduce((a, b) => a + b, 0) / magnitudes.length;
    return magnitudes.reduce((sum, m) => sum + Math.pow(m - mean, 2), 0) / magnitudes.length;
  }
}
