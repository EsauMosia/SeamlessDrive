import { lazy, Suspense, useState } from 'react';
import { HomeScreen } from '../Home/HomeScreen';
import { InsightsScreen } from './InsightsScreen';
import { SettingsScreen } from './SettingsScreen';
import { IntegrationsView } from '../Integrations/IntegrationsView';

const AnalyticsDashboard = lazy(() => import('./AnalyticsDashboard').then(m => ({ default: m.AnalyticsDashboard })));

type DashboardProps = { onStartDriving: () => void };
type View = 'home' | 'insights' | 'analytics' | 'settings' | 'integrations';

export function Dashboard({ onStartDriving }: DashboardProps) {
  const [currentView, setCurrentView] = useState<View>('home');
  const handleNavigate = (view: string) => { setCurrentView(view as View); };
  const handleBack = () => { setCurrentView('home'); };

  switch (currentView) {
    case 'insights': return <InsightsScreen onBack={handleBack} />;
    case 'analytics': return <Suspense fallback={<div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950/50 to-slate-900 flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400"></div></div>}><AnalyticsDashboard onBack={handleBack} /></Suspense>;
    case 'settings': return <SettingsScreen onBack={handleBack} />;
    case 'integrations': return <IntegrationsView onBack={handleBack} />;
    default: return <HomeScreen onStartDriving={onStartDriving} onNavigate={handleNavigate} />;
  }
}
