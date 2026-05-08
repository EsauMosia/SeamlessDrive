import { supabase } from '../lib/supabase';

export type SafetyZone = {
  id: string;
  name: string;
  zone_type: string;
  latitude: number;
  longitude: number;
  radius: number;
  accident_count: number;
  risk_level: string;
  description: string | null;
};

export type HazardAlert = {
  zone: SafetyZone;
  distanceMeters: number;
  direction: 'approaching' | 'inside' | 'leaving';
  message: string;
  severity: 'info' | 'warning' | 'danger';
};

const ALERT_APPROACH_RADIUS = 500;
const MAX_QUERY_RADIUS_KM = 10;

export class HazardZoneEngine {
  private cachedZones: SafetyZone[] = [];
  private lastQueryLat: number = 0;
  private lastQueryLng: number = 0;
  private lastQueryTime = 0;
  private queryIntervalMs = 30000;
  private activeAlerts: Map<string, HazardAlert> = new Map();
  private dismissedZones: Set<string> = new Set();

  async loadNearbyZones(latitude: number, longitude: number): Promise<SafetyZone[]> {
    const now = Date.now();
    const movedEnough = this.lastQueryTime === 0 ||
      this.haversineKm(latitude, longitude, this.lastQueryLat, this.lastQueryLng) > 2;

    if (!movedEnough && now - this.lastQueryTime < this.queryIntervalMs && this.cachedZones.length > 0) {
      return this.cachedZones;
    }

    const { data, error } = await supabase
      .from('safety_zones')
      .select('*')
      .gte('latitude', latitude - 0.1)
      .lte('latitude', latitude + 0.1)
      .gte('longitude', longitude - 0.1)
      .lte('longitude', longitude + 0.1);

    if (error) {
      console.error('Error loading safety zones:', error);
      return this.cachedZones;
    }

    this.cachedZones = (data || []).filter(z => {
      const dist = this.haversineKm(latitude, longitude, z.latitude, z.longitude);
      return dist <= MAX_QUERY_RADIUS_KM;
    });

    this.lastQueryLat = latitude;
    this.lastQueryLng = longitude;
    this.lastQueryTime = now;

    return this.cachedZones;
  }

  checkHazards(latitude: number, longitude: number, speedKmh: number): HazardAlert[] {
    const alerts: HazardAlert[] = [];

    for (const zone of this.cachedZones) {
      const distanceM = this.haversineM(latitude, longitude, zone.latitude, zone.longitude);
      const zoneRadius = zone.radius || 500;

      if (this.dismissedZones.has(zone.id)) continue;

      let direction: HazardAlert['direction'];
      let severity: HazardAlert['severity'];
      let message: string;

      if (distanceM <= zoneRadius) {
        direction = 'inside';
        severity = zone.risk_level === 'high' ? 'danger' : zone.risk_level === 'medium' ? 'warning' : 'info';
        message = this.getInsideMessage(zone);
      } else if (distanceM <= zoneRadius + ALERT_APPROACH_RADIUS) {
        direction = 'approaching';
        const timeToZone = speedKmh > 0 ? (distanceM / 1000) / speedKmh * 60 : 999;
        severity = zone.risk_level === 'high' ? 'danger' : 'warning';
        message = this.getApproachingMessage(zone, distanceM, timeToZone);
      } else {
        this.activeAlerts.delete(zone.id);
        continue;
      }

      const alert: HazardAlert = { zone, distanceMeters: Math.round(distanceM), direction, message, severity };
      this.activeAlerts.set(zone.id, alert);
      alerts.push(alert);
    }

    return alerts.sort((a, b) => a.distanceMeters - b.distanceMeters);
  }

  dismissZone(zoneId: string): void {
    this.dismissedZones.add(zoneId);
    setTimeout(() => { this.dismissedZones.delete(zoneId); }, 300000);
  }

  getActiveAlerts(): HazardAlert[] {
    return Array.from(this.activeAlerts.values());
  }

  private getInsideMessage(zone: SafetyZone): string {
    const riskEmoji = zone.risk_level === 'high' ? 'HIGH RISK' : zone.risk_level === 'medium' ? 'CAUTION' : 'NOTE';
    return `${riskEmoji}: ${zone.name} - ${zone.description || `${zone.accident_count} reported incidents`}. Drive with extra caution.`;
  }

  private getApproachingMessage(zone: SafetyZone, distanceM: number, timeMin: number): string {
    const distStr = distanceM < 1000 ? `${Math.round(distanceM)}m` : `${(distanceM / 1000).toFixed(1)}km`;
    return `Approaching ${zone.name} (${distStr}, ~${Math.round(timeMin)}min). ${zone.risk_level === 'high' ? 'High accident zone - slow down.' : 'Use caution.'}`;
  }

  private haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
    return this.haversineM(lat1, lng1, lat2, lng2) / 1000;
  }

  private haversineM(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371000;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }
}
