export type FatigueState = {
  level: 'alert' | 'mild' | 'moderate' | 'severe';
  minutesDriving: number;
  minutesSinceBreak: number;
  reactionDegradation: number;
  message: string;
  shouldStop: boolean;
};

type SpeedSample = {
  speed: number;
  timestamp: number;
};

type SteeringCorrection = {
  timestamp: number;
  magnitude: number;
};

const CONTINUOUS_DRIVE_WARNING_MIN = 90;
const CONTINUOUS_DRIVE_CRITICAL_MIN = 120;
const BREAK_RECOMMENDATION_MIN = 120;
const MICRO_SLEEP_SPEED_DROP = 15;
const MICRO_SLEEP_WINDOW_MS = 3000;
const STEERING_CORRECTION_WINDOW_MS = 60000;
const FATIGUE_CORRECTION_THRESHOLD = 8;

export class FatigueDetectionEngine {
  private driveStartTime: number | null = null;
  private lastBreakTime: number | null = null;
  private speedSamples: SpeedSample[] = [];
  private steeringCorrections: SteeringCorrection[] = [];
  private maxSampleAge = 300000;

  startDrive(): void {
    this.driveStartTime = Date.now();
    this.lastBreakTime = Date.now();
    this.speedSamples = [];
    this.steeringCorrections = [];
  }

  recordBreak(): void {
    this.lastBreakTime = Date.now();
  }

  recordSpeed(speed: number): void {
    const now = Date.now();
    this.speedSamples.push({ speed, timestamp: now });
    this.speedSamples = this.speedSamples.filter(
      s => now - s.timestamp < this.maxSampleAge
    );
  }

  recordSteeringCorrection(magnitude: number): void {
    const now = Date.now();
    this.steeringCorrections.push({ timestamp: now, magnitude });
    this.steeringCorrections = this.steeringCorrections.filter(
      c => now - c.timestamp < STEERING_CORRECTION_WINDOW_MS
    );
  }

  analyze(motionX: number, _motionY: number): FatigueState {
    const now = Date.now();
    const minutesDriving = this.driveStartTime
      ? (now - this.driveStartTime) / 60000
      : 0;
    const minutesSinceBreak = this.lastBreakTime
      ? (now - this.lastBreakTime) / 60000
      : minutesDriving;

    const microSleeps = this.detectMicroSleeps();
    const correctionRate = this.getSteeringCorrectionRate();
    const laneDeviation = this.detectLaneDeviation(motionX);
    const speedVariability = this.getSpeedVariability();

    let fatigueScore = 0;

    if (minutesSinceBreak > BREAK_RECOMMENDATION_MIN) fatigueScore += 30;
    else if (minutesSinceBreak > CONTINUOUS_DRIVE_CRITICAL_MIN) fatigueScore += 40;
    else if (minutesSinceBreak > CONTINUOUS_DRIVE_WARNING_MIN) fatigueScore += 15;

    fatigueScore += microSleeps * 25;
    fatigueScore += Math.min(20, correctionRate / FATIGUE_CORRECTION_THRESHOLD * 20);
    fatigueScore += laneDeviation * 15;
    fatigueScore += Math.min(15, speedVariability * 3);

    const reactionDegradation = Math.min(1, fatigueScore / 100);

    let level: FatigueState['level'];
    let message: string;
    let shouldStop: boolean;

    if (fatigueScore >= 70) {
      level = 'severe';
      message = 'DANGER: Severe fatigue detected. Pull over immediately. You are a risk to yourself and others.';
      shouldStop = true;
    } else if (fatigueScore >= 45) {
      level = 'moderate';
      message = 'WARNING: Fatigue is impairing your driving. Take a break within the next 15 minutes.';
      shouldStop = false;
    } else if (fatigueScore >= 20) {
      level = 'mild';
      message = `You have been driving for ${Math.round(minutesSinceBreak)} minutes. Consider taking a break soon.`;
      shouldStop = false;
    } else {
      level = 'alert';
      message = '';
      shouldStop = false;
    }

    return { level, minutesDriving, minutesSinceBreak, reactionDegradation, message, shouldStop };
  }

  private detectMicroSleeps(): number {
    if (this.speedSamples.length < 3) return 0;
    let count = 0;
    for (let i = 2; i < this.speedSamples.length; i++) {
      const prev = this.speedSamples[i - 1];
      const curr = this.speedSamples[i];
      if (
        prev.speed > 30 &&
        curr.speed < prev.speed - MICRO_SLEEP_SPEED_DROP &&
        curr.timestamp - prev.timestamp < MICRO_SLEEP_WINDOW_MS
      ) {
        count++;
      }
    }
    return count;
  }

  private getSteeringCorrectionRate(): number {
    const now = Date.now();
    const recent = this.steeringCorrections.filter(
      c => now - c.timestamp < STEERING_CORRECTION_WINDOW_MS
    );
    return recent.length;
  }

  private detectLaneDeviation(motionX: number): number {
    const now = Date.now();
    const recent = this.steeringCorrections.filter(
      c => now - c.timestamp < STEERING_CORRECTION_WINDOW_MS
    );
    if (recent.length < 3) return 0;
    const avgMagnitude = recent.reduce((sum, c) => sum + c.magnitude, 0) / recent.length;
    return Math.abs(motionX) > 0.15 && avgMagnitude > 0.1 ? 1 : 0;
  }

  private getSpeedVariability(): number {
    if (this.speedSamples.length < 10) return 0;
    const recent = this.speedSamples.slice(-30);
    const avg = recent.reduce((sum, s) => sum + s.speed, 0) / recent.length;
    const variance = recent.reduce((sum, s) => sum + Math.pow(s.speed - avg, 2), 0) / recent.length;
    return Math.sqrt(variance) / Math.max(1, avg);
  }
}
