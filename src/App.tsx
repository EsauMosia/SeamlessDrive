import { useState } from 'react';
import { useAuth } from './contexts/AuthContext';
import { AuthPage } from './components/Auth/AuthPage';
import { Navigation } from './components/Layout/Navigation';
import { Dashboard } from './components/Dashboard/Dashboard';
import { TripsView } from './components/Trips/TripsView';
import { AlertsView } from './components/Alerts/AlertsView';
import { ProfileView } from './components/Profile/ProfileView';
import { TripTracker } from './components/Trip/TripTracker';

function App() {
  const { user, loading } = useAuth();
  const [currentView, setCurrentView] = useState('dashboard');
  const [isTripActive, setIsTripActive] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard onNavigate={setCurrentView} onStartTrip={() => setIsTripActive(true)} />;
      case 'trips':
        return <TripsView />;
      case 'alerts':
        return <AlertsView />;
      case 'profile':
        return <ProfileView />;
      default:
        return <Dashboard onNavigate={setCurrentView} onStartTrip={() => setIsTripActive(true)} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation currentView={currentView} onNavigate={setCurrentView} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {renderView()}
      </main>
      {isTripActive && <TripTracker onClose={() => setIsTripActive(false)} />}
    </div>
  );
}

export default App;
