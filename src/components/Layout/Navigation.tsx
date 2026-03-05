import { Home, Route, Bell, User, LogOut, Shield } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

type NavigationProps = {
  currentView: string;
  onNavigate: (view: string) => void;
};

export function Navigation({ currentView, onNavigate }: NavigationProps) {
  const { signOut, profile } = useAuth();

  const navItems = [
    { id: 'dashboard', icon: Home, label: 'Dashboard' },
    { id: 'trips', icon: Route, label: 'Trips' },
    { id: 'alerts', icon: Bell, label: 'Alerts' },
    { id: 'profile', icon: User, label: 'Profile' },
  ];

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">SeamlessDrive</span>
          </div>

          <div className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-blue-50 text-blue-600'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-4">
            {profile && (
              <div className="hidden sm:block">
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">{profile.full_name}</p>
                  <p className="text-xs text-gray-500">Safety Score: {profile.safety_score}</p>
                </div>
              </div>
            )}
            <button
              onClick={signOut}
              className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <LogOut className="w-5 h-5" />
              <span className="hidden sm:inline font-medium">Sign Out</span>
            </button>
          </div>
        </div>
      </div>

      <div className="md:hidden border-t border-gray-200">
        <div className="flex items-center justify-around">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`flex flex-col items-center gap-1 py-3 px-2 flex-1 transition-colors ${
                  isActive ? 'text-blue-600' : 'text-gray-600'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-xs font-medium">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
