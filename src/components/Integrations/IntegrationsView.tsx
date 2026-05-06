import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { integrationGateway, INTEGRATION_PROVIDERS, VehicleConnection } from '../../lib/integrationGateway';
import { adaptiveLearning, DrivingProfile } from '../../lib/adaptiveLearning';
import { ArrowLeft, Cpu, Zap, Car, MapPin, Navigation, Shield, Truck, CheckCircle, Plus, X, Wifi, Brain, TrendingUp } from 'lucide-react';

type IntegrationsViewProps = { onBack: () => void };
const iconMap: Record<string, React.FC<{ className?: string }>> = { cpu: Cpu, zap: Zap, car: Car, map: MapPin, navigation: Navigation, shield: Shield, truck: Truck };

export function IntegrationsView({ onBack }: IntegrationsViewProps) {
  const { user } = useAuth();
  const [connections, setConnections] = useState<VehicleConnection[]>([]);
  const [drivingProfile, setDrivingProfile] = useState<DrivingProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showConnectModal, setShowConnectModal] = useState<string | null>(null);
  const [vehicleId, setVehicleId] = useState('');
  const [vehicleMake, setVehicleMake] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');
  const [vehicleYear, setVehicleYear] = useState('');

  useEffect(() => { loadData(); }, [user]);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    const [conns, profile] = await Promise.all([integrationGateway.loadConnections(user.id), adaptiveLearning.getOrCreateProfile(user.id)]);
    setConnections(conns);
    setDrivingProfile(profile);
    setLoading(false);
  };

  const handleConnect = async () => {
    if (!user || !showConnectModal || !vehicleId.trim()) return;
    const success = await integrationGateway.addConnection(user.id, showConnectModal, vehicleId.trim(), vehicleMake.trim() || undefined, vehicleModel.trim() || undefined, vehicleYear ? parseInt(vehicleYear) : undefined);
    if (success) { await loadData(); setShowConnectModal(null); setVehicleId(''); setVehicleMake(''); setVehicleModel(''); setVehicleYear(''); }
  };

  const handleDisconnect = async (connectionId: string) => { await integrationGateway.removeConnection(connectionId); await loadData(); };
  const connectedProviders = new Set(connections.map(c => c.provider));

  if (loading) { return <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950/50 to-slate-900 flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400"></div></div>; }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950/50 to-slate-900">
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="flex items-center gap-4 mb-8">
          <button onClick={onBack} className="p-2 hover:bg-white/10 rounded-lg transition-colors"><ArrowLeft className="w-6 h-6 text-gray-400" /></button>
          <div><h1 className="text-3xl font-light text-white">Integrations</h1><p className="text-gray-400 text-sm mt-1">Connect driving apps and vehicle systems</p></div>
        </div>

        <div className="mb-8 bg-gradient-to-br from-cyan-500/10 to-blue-600/5 border border-cyan-500/20 rounded-2xl p-6">
          <div className="flex items-start gap-4">
            <div className="bg-cyan-500/20 p-3 rounded-xl"><Brain className="w-6 h-6 text-cyan-400" /></div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-white mb-1">Adaptive Learning</h2>
              <p className="text-gray-400 text-sm mb-4">SeamlessDrive learns your driving patterns and adjusts detection sensitivity over time. The more you drive, the smarter it gets.</p>
              {drivingProfile && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="bg-slate-800/50 rounded-lg p-3"><p className="text-xs text-gray-400">Braking Threshold</p><p className="text-lg font-semibold text-white">{drivingProfile.braking_threshold.toFixed(2)}g</p></div>
                  <div className="bg-slate-800/50 rounded-lg p-3"><p className="text-xs text-gray-400">Accel Threshold</p><p className="text-lg font-semibold text-white">{drivingProfile.acceleration_threshold.toFixed(2)}g</p></div>
                  <div className="bg-slate-800/50 rounded-lg p-3"><p className="text-xs text-gray-400">Speed Alert</p><p className="text-lg font-semibold text-white">{drivingProfile.speed_threshold.toFixed(0)} km/h</p></div>
                  <div className="bg-slate-800/50 rounded-lg p-3"><p className="text-xs text-gray-400">Confidence</p><div className="flex items-center gap-2"><p className="text-lg font-semibold text-white">{(drivingProfile.confidence * 100).toFixed(0)}%</p>{drivingProfile.confidence >= 1 && <CheckCircle className="w-4 h-4 text-emerald-400" />}</div></div>
                </div>
              )}
              <div className="mt-3 flex items-center gap-2 text-xs text-gray-500"><TrendingUp className="w-3 h-3" /><span>Based on {drivingProfile?.sample_count ?? 0} trips</span>{drivingProfile && drivingProfile.sample_count < 5 && <span className="text-amber-400 ml-2">Needs {5 - drivingProfile.sample_count} more trips to calibrate</span>}</div>
            </div>
          </div>
        </div>

        {connections.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-light text-white mb-4 flex items-center gap-2"><Wifi className="w-5 h-5 text-emerald-400" />Active Connections</h2>
            <div className="space-y-3">
              {connections.map(conn => { const provider = INTEGRATION_PROVIDERS.find(p => p.id === conn.provider); const IconComp = provider ? iconMap[provider.icon] || Cpu : Cpu; return (
                <div key={conn.id} className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4"><div className="bg-blue-500/20 p-2.5 rounded-lg"><IconComp className="w-5 h-5 text-blue-400" /></div><div><p className="text-white font-medium">{provider?.name || conn.provider}</p><p className="text-gray-400 text-sm">{conn.vehicle_make} {conn.vehicle_model} {conn.vehicle_year}{conn.vehicle_id && ` - ${conn.vehicle_id}`}</p>{conn.last_sync && <p className="text-gray-500 text-xs mt-1">Last sync: {new Date(conn.last_sync).toLocaleDateString()}</p>}</div></div>
                  <button onClick={() => handleDisconnect(conn.id)} className="p-2 hover:bg-red-500/10 rounded-lg transition-colors text-gray-400 hover:text-red-400"><X className="w-5 h-5" /></button>
                </div>); })}
            </div>
          </div>
        )}

        <div>
          <h2 className="text-xl font-light text-white mb-4">Available Integrations</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {INTEGRATION_PROVIDERS.map(provider => { const IconComp = iconMap[provider.icon] || Cpu; const isConnected = connectedProviders.has(provider.id); const isComingSoon = provider.status === 'coming_soon'; const isBeta = provider.status === 'beta'; return (
              <div key={provider.id} className={`bg-slate-800/50 border rounded-xl p-5 transition-all ${isConnected ? 'border-emerald-500/30' : isComingSoon ? 'border-slate-700 opacity-60' : 'border-slate-700 hover:border-blue-500/50'}`}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3"><div className={`p-2 rounded-lg ${isConnected ? 'bg-emerald-500/20' : 'bg-blue-500/20'}`}><IconComp className={`w-5 h-5 ${isConnected ? 'text-emerald-400' : 'text-blue-400'}`} /></div><div><h3 className="text-white font-medium">{provider.name}</h3><div className="flex items-center gap-2 mt-0.5"><span className="text-xs text-gray-500 capitalize">{provider.category}</span>{isBeta && <span className="text-xs px-1.5 py-0.5 bg-amber-500/20 text-amber-400 rounded">Beta</span>}{isComingSoon && <span className="text-xs px-1.5 py-0.5 bg-slate-600/50 text-gray-400 rounded">Coming Soon</span>}</div></div></div>
                  {isConnected ? <CheckCircle className="w-5 h-5 text-emerald-400" /> : !isComingSoon ? <button onClick={() => setShowConnectModal(provider.id)} className="p-1.5 hover:bg-blue-500/10 rounded-lg transition-colors"><Plus className="w-5 h-5 text-blue-400" /></button> : null}
                </div>
                <p className="text-gray-400 text-sm">{provider.description}</p>
              </div>); })}
          </div>
        </div>
      </div>

      {showConnectModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6"><h3 className="text-lg font-semibold text-white">Connect Vehicle</h3><button onClick={() => setShowConnectModal(null)} className="p-1 hover:bg-white/10 rounded-lg"><X className="w-5 h-5 text-gray-400" /></button></div>
            <div className="space-y-4">
              <div><label className="block text-sm text-gray-400 mb-1.5">Vehicle ID / VIN *</label><input type="text" value={vehicleId} onChange={(e) => setVehicleId(e.target.value)} placeholder="e.g., 1HGBH41JXMN109186" className="w-full px-4 py-3 bg-white/5 border border-white/10 text-white rounded-lg focus:border-blue-400 focus:outline-none placeholder-gray-600" /></div>
              <div className="grid grid-cols-2 gap-3"><div><label className="block text-sm text-gray-400 mb-1.5">Make</label><input type="text" value={vehicleMake} onChange={(e) => setVehicleMake(e.target.value)} placeholder="Toyota" className="w-full px-4 py-3 bg-white/5 border border-white/10 text-white rounded-lg focus:border-blue-400 focus:outline-none placeholder-gray-600" /></div><div><label className="block text-sm text-gray-400 mb-1.5">Model</label><input type="text" value={vehicleModel} onChange={(e) => setVehicleModel(e.target.value)} placeholder="Camry" className="w-full px-4 py-3 bg-white/5 border border-white/10 text-white rounded-lg focus:border-blue-400 focus:outline-none placeholder-gray-600" /></div></div>
              <div><label className="block text-sm text-gray-400 mb-1.5">Year</label><input type="number" value={vehicleYear} onChange={(e) => setVehicleYear(e.target.value)} placeholder="2024" min="1990" max="2030" className="w-full px-4 py-3 bg-white/5 border border-white/10 text-white rounded-lg focus:border-blue-400 focus:outline-none placeholder-gray-600" /></div>
              <button onClick={handleConnect} disabled={!vehicleId.trim()} className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors">Connect</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
