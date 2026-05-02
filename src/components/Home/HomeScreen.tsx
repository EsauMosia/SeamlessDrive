import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { BarChart3, Settings, Shield, ArrowRight, TrendingUp } from 'lucide-react';

type HomeScreenProps = {
  onStartDriving: () => void;
  onNavigate: (view: string) => void;
};

export function HomeScreen({ onStartDriving, onNavigate }: HomeScreenProps) {
  const { profile } = useAuth();
  const [destination, setDestination] = useState('');

  const getSafetyStatusColor = (score: number) => {
    if (score >= 90) return 'text-emerald-400';
    if (score >= 70) return 'text-amber-400';
    return 'text-red-400';
  };

  const getSafetyStatusText = (score: number) => {
    if (score >= 90) return 'Excellent';
    if (score >= 70) return 'Good';
    return 'Needs Improvement';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950/50 to-slate-900 flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 space-y-12">
        <div className="text-center space-y-4 w-full max-w-md">
          <div className="flex items-center justify-center gap-2 mb-8">
            <Shield className="w-8 h-8 text-blue-400" />
            <h1 className="text-4xl font-light text-white">SeamlessDrive</h1>
          </div>

          <p className="text-gray-400 text-lg font-light">
            Your AI-powered driving safety co-pilot
          </p>

          <div className={`inline-block ${getSafetyStatusColor(profile?.safety_score || 100)}`}>
            <p className="text-sm font-medium opacity-75">Your Safety Status</p>
            <p className="text-3xl font-light tracking-tight">
              {getSafetyStatusText(profile?.safety_score || 100)}
            </p>
          </div>
        </div>

        <div className="w-full max-w-md space-y-6">
          <div>
            <label className="block text-sm text-gray-400 mb-3 uppercase tracking-wide">
              Where are you driving?
            </label>
            <input
              type="text"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder="Enter destination or leave blank"
              className="w-full px-6 py-4 bg-white/5 border border-white/10 text-white rounded-2xl focus:border-blue-400 focus:outline-none transition-all placeholder-gray-600 text-center"
            />
          </div>

          <button
            onClick={onStartDriving}
            className="w-full group relative"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-blue-500 rounded-2xl blur-xl opacity-75 group-hover:opacity-100 transition-opacity"></div>
            <div className="relative bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 rounded-2xl p-6 transition-all transform group-hover:scale-[1.02] active:scale-[0.98] flex items-center justify-between">
              <span className="text-lg font-semibold text-white">DRIVE</span>
              <ArrowRight className="w-5 h-5 text-white/80 group-hover:translate-x-1 transition-transform" />
            </div>
          </button>
        </div>

        <div className="grid grid-cols-3 gap-3 w-full max-w-md pt-8">
          <button
            onClick={() => onNavigate('insights')}
            className="group p-5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 transition-all"
          >
            <BarChart3 className="w-6 h-6 text-blue-400 mb-2 group-hover:text-blue-300 transition-colors" />
            <p className="text-sm text-gray-300 font-medium">Insights</p>
            <p className="text-xs text-gray-500 mt-1">Driving data</p>
          </button>

          <button
            onClick={() => onNavigate('analytics')}
            className="group p-5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 transition-all"
          >
            <TrendingUp className="w-6 h-6 text-emerald-400 mb-2 group-hover:text-emerald-300 transition-colors" />
            <p className="text-sm text-gray-300 font-medium">Analytics</p>
            <p className="text-xs text-gray-500 mt-1">Charts & trends</p>
          </button>

          <button
            onClick={() => onNavigate('settings')}
            className="group p-5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 transition-all"
          >
            <Settings className="w-6 h-6 text-blue-400 mb-2 group-hover:text-blue-300 transition-colors" />
            <p className="text-sm text-gray-300 font-medium">Settings</p>
            <p className="text-xs text-gray-500 mt-1">Preferences</p>
          </button>
        </div>
      </div>

      <div className="px-6 py-8 border-t border-white/10">
        <p className="text-center text-xs text-gray-500">
          {profile?.total_trips || 0} trips · {profile?.total_distance?.toFixed(0) || 0} km driven · Safety score {profile?.safety_score || 100}
        </p>
      </div>
    </div>
  );
}
