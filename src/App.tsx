import { useState } from 'react';
import { useAuth } from './contexts/AuthContext';
import { AuthPage } from './components/Auth/AuthPage';
import { Dashboard } from './components/Dashboard/Dashboard';
import { DrivingMode } from './components/Driving/DrivingMode';
import { ErrorBoundary } from './components/ErrorBoundary';

function App() {
  const { user, loading } = useAuth();
  const [isDrivingMode, setIsDrivingMode] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-400"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <ErrorBoundary>
        <AuthPage />
      </ErrorBoundary>
    );
  }

  if (isDrivingMode) {
    return (
      <ErrorBoundary>
        <DrivingMode onExit={() => setIsDrivingMode(false)} />
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <Dashboard onStartDriving={() => setIsDrivingMode(true)} />
    </ErrorBoundary>
  );
}

export default App;
