import { useState } from 'react';
import { HomeScreen } from '../Home/HomeScreen';
import { InsightsScreen } from './InsightsScreen';
import { SettingsScreen } from './SettingsScreen';

type DashboardProps = {
  onStartDriving: () => void;
};

type View = 'home' | 'insights' | 'settings';

export function Dashboard({ onStartDriving }: DashboardProps) {
  const [currentView, setCurrentView] = useState<View>('home');

  const handleNavigate = (view: string) => {
    setCurrentView(view as View);
  };

  const handleBack = () => {
    setCurrentView('home');
  };

  switch (currentView) {
    case 'insights':
      return <InsightsScreen onBack={handleBack} />;
    case 'settings':
      return <SettingsScreen onBack={handleBack} />;
    default:
      return <HomeScreen onStartDriving={onStartDriving} onNavigate={handleNavigate} />;
  }
}
