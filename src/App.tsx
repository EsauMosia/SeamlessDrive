import { useState } from 'react';
import { useAuth } from './contexts/AuthContext';
import { AuthPage } from './components/Auth/AuthPage';
import { Dashboard } from './components/Dashboard/Dashboard';
import { TripTracker } from './components/Trip/TripTracker';

function App() {
  const { user, loading } = useAuth();
  const [isTripActive, setIsTripActive] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-400"></div>
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  return (
    <>
      <Dashboard onStartTrip={() => setIsTripActive(true)} />
      {isTripActive && <TripTracker onClose={() => setIsTripActive(false)} />}
    </>
  );
}

export default App;
