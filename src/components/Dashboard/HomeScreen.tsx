import { useAuth } from '../../contexts/AuthContext';
import { Play, BarChart3, Settings } from 'lucide-react';

type HomeScreenProps = {
  onStartTrip: () => void;
  onNavigate: (view: string) => void;
};

export function HomeScreen({ onStartTrip, onNavigate }: HomeScreenProps) {
  const { profile } = useAuth();

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
        <div className="text-center space-y-6 w-full max-w-md">
          <div className="space-y-2">
            <h1 className="text-5xl font-light text-white tracking-tight">
              Ready to Drive?
            </h1>
            <p className="text-gray-400 text-lg font-light">
              Your journey to safer roads starts here
            </p>
          </div>

          <div className="pt-4">
            <div className={`inline-block ${getSafetyStatusColor(profile?.safety_score || 100)}`}>
              <p className="text-sm font-medium opacity-75">Safety Status</p>
              <p className="text-4xl font-light tracking-tight">
                {getSafetyStatusText(profile?.safety_score || 100)}
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={onStartTrip}
          className="w-full max-w-xs group relative"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-blue-500 rounded-2xl blur-xl opacity-75 group-hover:opacity-100 transition-opacity"></div>
          <div className="relative bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 rounded-2xl p-8 transition-all transform group-hover:scale-[1.02] active:scale-[0.98]">
            <div className="flex items-center justify-center gap-4">
              <Play className="w-6 h-6 text-white fill-white" />
              <span className="text-lg font-medium text-white">Start Trip</span>
            </div>
          </div>
        </button>

        <div className="grid grid-cols-2 gap-4 w-full max-w-md pt-8">
          <button
            onClick={() => onNavigate('insights')}
            className="group p-6 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 transition-all"
          >
            <BarChart3 className="w-6 h-6 text-blue-400 mb-3 group-hover:text-blue-300 transition-colors" />
            <p className="text-sm text-gray-300 font-medium">Insights</p>
            <p className="text-xs text-gray-500 mt-1">Your data</p>
          </button>

          <button
            onClick={() => onNavigate('settings')}
            className="group p-6 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 transition-all"
          >
            <Settings className="w-6 h-6 text-blue-400 mb-3 group-hover:text-blue-300 transition-colors" />
            <p className="text-sm text-gray-300 font-medium">Settings</p>
            <p className="text-xs text-gray-500 mt-1">Preferences</p>
          </button>
        </div>
      </div>

      <div className="px-6 py-8 border-t border-white/10">
        <p className="text-center text-xs text-gray-500">
          {profile?.total_trips || 0} trips • {profile?.total_distance?.toFixed(0) || 0} km driven
        </p>
      </div>
    </div>
  );
}
