import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase, SafetyAlert } from '../../lib/supabase';
import { AlertTriangle, CheckCircle, MapPin, Clock } from 'lucide-react';

export function AlertsView() {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState<SafetyAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  useEffect(() => {
    if (user) {
      fetchAlerts();
    }
  }, [user, filter]);

  const fetchAlerts = async () => {
    if (!user) return;

    setLoading(true);
    let query = supabase
      .from('safety_alerts')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (filter === 'unread') {
      query = query.eq('is_read', false);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching alerts:', error);
    } else {
      setAlerts(data || []);
    }
    setLoading(false);
  };

  const markAsRead = async (alertId: string) => {
    const { error } = await supabase
      .from('safety_alerts')
      .update({ is_read: true })
      .eq('id', alertId);

    if (!error) {
      setAlerts(alerts.map(alert =>
        alert.id === alertId ? { ...alert, is_read: true } : alert
      ));
    }
  };

  const markAllAsRead = async () => {
    if (!user) return;

    const { error } = await supabase
      .from('safety_alerts')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('is_read', false);

    if (!error) {
      fetchAlerts();
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getSeverityStyles = (severity: string) => {
    switch (severity) {
      case 'high':
        return {
          container: 'bg-red-50 border-red-200',
          icon: 'text-red-600',
          badge: 'bg-red-100 text-red-700'
        };
      case 'medium':
        return {
          container: 'bg-yellow-50 border-yellow-200',
          icon: 'text-yellow-600',
          badge: 'bg-yellow-100 text-yellow-700'
        };
      default:
        return {
          container: 'bg-blue-50 border-blue-200',
          icon: 'text-blue-600',
          badge: 'bg-blue-100 text-blue-700'
        };
    }
  };

  const unreadCount = useMemo(() => alerts.filter(a => !a.is_read).length, [alerts]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Safety Alerts</h1>
          <p className="text-gray-600 mt-1">
            {unreadCount > 0 ? `${unreadCount} unread alert${unreadCount !== 1 ? 's' : ''}` : 'All caught up!'}
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllAsRead}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            <CheckCircle className="w-4 h-4" />
            Mark All Read
          </button>
        )}
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            filter === 'all'
              ? 'bg-blue-600 text-white'
              : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
          }`}
        >
          All Alerts
        </button>
        <button
          onClick={() => setFilter('unread')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            filter === 'unread'
              ? 'bg-blue-600 text-white'
              : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
          }`}
        >
          Unread {unreadCount > 0 && `(${unreadCount})`}
        </button>
      </div>

      {alerts.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12">
          <div className="text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">No alerts</h3>
            <p className="text-gray-600">
              {filter === 'unread'
                ? "You're all caught up! No unread alerts."
                : "You don't have any safety alerts yet."}
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {alerts.map((alert) => {
            const styles = getSeverityStyles(alert.severity);
            return (
              <div
                key={alert.id}
                className={`bg-white rounded-xl shadow-sm border-2 p-6 transition-all ${
                  alert.is_read ? 'border-gray-200 opacity-75' : styles.container
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4 flex-1">
                    <div className={`p-3 rounded-lg ${alert.is_read ? 'bg-gray-100' : styles.container}`}>
                      <AlertTriangle className={`w-6 h-6 ${alert.is_read ? 'text-gray-600' : styles.icon}`} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-bold text-gray-900">{alert.alert_type}</h3>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${styles.badge}`}>
                          {alert.severity.charAt(0).toUpperCase() + alert.severity.slice(1)}
                        </span>
                        {!alert.is_read && (
                          <span className="px-2 py-1 bg-blue-600 text-white rounded-full text-xs font-semibold">
                            New
                          </span>
                        )}
                      </div>
                      <p className="text-gray-700 mb-3">{alert.message}</p>
                      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          <span>{formatDate(alert.created_at)}</span>
                        </div>
                        {alert.latitude && alert.longitude && (
                          <div className="flex items-center gap-1">
                            <MapPin className="w-4 h-4" />
                            <span>Location: {alert.latitude.toFixed(4)}, {alert.longitude.toFixed(4)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  {!alert.is_read && (
                    <button
                      onClick={() => markAsRead(alert.id)}
                      className="px-4 py-2 bg-white hover:bg-gray-50 border border-gray-300 text-gray-700 rounded-lg font-medium transition-colors text-sm"
                    >
                      Mark Read
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
