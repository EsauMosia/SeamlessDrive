import { supabase } from '../lib/supabase';

export type VehicleConnection = { id: string; user_id: string; provider: string; vehicle_id: string; vehicle_make: string | null; vehicle_model: string | null; vehicle_year: number | null; status: string; last_sync: string | null; created_at: string; };
export type VehicleTelemetry = { rpm: number | null; fuel_level: number | null; engine_temp: number | null; tire_pressure_fl: number | null; tire_pressure_fr: number | null; tire_pressure_rl: number | null; tire_pressure_rr: number | null; odometer: number | null; dtc_codes: string[] | null; battery_voltage: number | null; throttle_position: number | null; };
export type IntegrationProvider = { id: string; name: string; description: string; icon: string; category: 'obd2' | 'ev' | 'insurance' | 'navigation' | 'fleet'; authType: 'oauth2' | 'api_key' | 'bluetooth' | 'none'; status: 'available' | 'coming_soon' | 'beta'; };

export const INTEGRATION_PROVIDERS: IntegrationProvider[] = [
  { id: 'obd2-generic', name: 'OBD2 Scanner', description: 'Connect via Bluetooth OBD2 adapter for real-time engine data', icon: 'cpu', category: 'obd2', authType: 'bluetooth', status: 'available' },
  { id: 'tesla', name: 'Tesla', description: 'Connect your Tesla for vehicle data, charging status, and climate', icon: 'zap', category: 'ev', authType: 'oauth2', status: 'available' },
  { id: 'ford-pass', name: 'FordPass', description: 'Ford vehicle telemetry, fuel level, and remote commands', icon: 'car', category: 'obd2', authType: 'oauth2', status: 'coming_soon' },
  { id: 'google-maps', name: 'Google Maps', description: 'Import routes and traffic data from Google Maps', icon: 'map', category: 'navigation', authType: 'oauth2', status: 'coming_soon' },
  { id: 'waze', name: 'Waze', description: 'Real-time traffic alerts and hazard reports', icon: 'navigation', category: 'navigation', authType: 'api_key', status: 'beta' },
  { id: 'insurance-report', name: 'Insurance Report', description: 'Generate and share driving reports with your insurance provider', icon: 'shield', category: 'insurance', authType: 'none', status: 'available' },
  { id: 'fleet-management', name: 'Fleet Management', description: 'Enterprise fleet tracking and driver management', icon: 'truck', category: 'fleet', authType: 'api_key', status: 'coming_soon' },
];

class IntegrationGateway {
  private connections: VehicleConnection[] = [];
  async loadConnections(userId: string): Promise<VehicleConnection[]> {
    const { data, error } = await supabase.from('vehicle_connections').select('*').eq('user_id', userId).eq('status', 'active');
    if (error) { console.error('Error loading connections:', error); return []; }
    this.connections = data || [];
    return this.connections;
  }
  async addConnection(userId: string, provider: string, vehicleId: string, vehicleMake?: string, vehicleModel?: string, vehicleYear?: number): Promise<VehicleConnection | null> {
    const { data, error } = await supabase.from('vehicle_connections').insert({ user_id: userId, provider, vehicle_id: vehicleId, vehicle_make: vehicleMake || null, vehicle_model: vehicleModel || null, vehicle_year: vehicleYear || null }).select().single();
    if (error) { console.error('Error adding connection:', error); return null; }
    this.connections.push(data);
    return data;
  }
  async removeConnection(connectionId: string): Promise<boolean> {
    const { error } = await supabase.from('vehicle_connections').update({ status: 'disconnected' }).eq('id', connectionId);
    if (error) { console.error('Error removing connection:', error); return false; }
    this.connections = this.connections.filter(c => c.id !== connectionId);
    return true;
  }
  async saveTelemetry(connectionId: string, tripId: string | null, telemetry: VehicleTelemetry): Promise<boolean> {
    const { error } = await supabase.from('vehicle_telemetry').insert({ connection_id: connectionId, trip_id: tripId, ...telemetry });
    if (error) { console.error('Error saving telemetry:', error); return false; }
    return true;
  }
  async logEvent(userId: string, provider: string, eventType: string, payload: Record<string, unknown>): Promise<boolean> {
    const { error } = await supabase.from('integration_events').insert({ user_id: userId, provider, event_type: eventType, payload });
    if (error) { console.error('Error logging event:', error); return false; }
    return true;
  }
  getActiveConnections(): VehicleConnection[] { return this.connections.filter(c => c.status === 'active'); }
  getConnectionsByProvider(provider: string): VehicleConnection[] { return this.connections.filter(c => c.provider === provider); }
  hasProvider(provider: string): boolean { return this.connections.some(c => c.provider === provider && c.status === 'active'); }
}

export const integrationGateway = new IntegrationGateway();
