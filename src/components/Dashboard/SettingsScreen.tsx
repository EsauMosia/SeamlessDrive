import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { ArrowLeft, User, Phone, AlertCircle, LogOut, Bell } from 'lucide-react';

type SettingsScreenProps = {
  onBack: () => void;
};

export function SettingsScreen({ onBack }: SettingsScreenProps) {
  const { user, profile, refreshProfile, signOut } = useAuth();
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [emergencyContact, setEmergencyContact] = useState(profile?.emergency_contact || '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    if (!user) return;

    setSaving(true);
    const { error } = await supabase
      .from('user_profiles')
      .update({
        full_name: fullName,
        phone: phone,
        emergency_contact: emergencyContact,
      })
      .eq('id', user.id);

    if (!error) {
      await refreshProfile();
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
    setSaving(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950/50 to-slate-900">
      <div className="max-w-2xl mx-auto px-6 py-8">
        <div className="flex items-center gap-4 mb-12">
          <button
            onClick={onBack}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-6 h-6 text-gray-400" />
          </button>
          <div>
            <h1 className="text-3xl font-light text-white">Settings</h1>
            <p className="text-gray-400 text-sm mt-1">Manage your preferences</p>
          </div>
        </div>

        <div className="space-y-8">
          <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
            <h2 className="text-lg font-medium text-white mb-6 flex items-center gap-2">
              <User className="w-5 h-5 text-blue-400" />
              Profile Information
            </h2>

            {saved && (
              <div className="mb-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-sm text-emerald-300">
                Changes saved successfully
              </div>
            )}

            <div className="space-y-5">
              <div>
                <label className="block text-sm text-gray-300 mb-2.5">Email</label>
                <input
                  type="email"
                  value={user?.email || ''}
                  disabled
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 text-gray-500 rounded-lg cursor-not-allowed"
                />
                <p className="text-xs text-gray-500 mt-1.5">Email cannot be changed</p>
              </div>

              <div>
                <label className="block text-sm text-gray-300 mb-2.5">Full Name</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 text-white rounded-lg focus:border-blue-400 focus:outline-none transition-colors"
                  placeholder="John Doe"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-300 mb-2.5 flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 text-white rounded-lg focus:border-blue-400 focus:outline-none transition-colors"
                  placeholder="+1 (555) 000-0000"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-300 mb-2.5 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  Emergency Contact
                </label>
                <input
                  type="tel"
                  value={emergencyContact}
                  onChange={(e) => setEmergencyContact(e.target.value)}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 text-white rounded-lg focus:border-blue-400 focus:outline-none transition-colors"
                  placeholder="+1 (555) 000-0000"
                />
                <p className="text-xs text-gray-500 mt-1.5">Called in case of emergency</p>
              </div>

              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full mt-6 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 disabled:from-gray-700 disabled:to-gray-600 text-white font-medium py-3 px-4 rounded-lg transition-all"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
            <h2 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
              <Bell className="w-5 h-5 text-blue-400" />
              Preferences
            </h2>
            <div className="space-y-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" defaultChecked className="w-5 h-5 rounded bg-white/10 border-white/20" />
                <span className="text-sm text-gray-300">Safety alerts during trips</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" defaultChecked className="w-5 h-5 rounded bg-white/10 border-white/20" />
                <span className="text-sm text-gray-300">Weekly driving summary</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" defaultChecked className="w-5 h-5 rounded bg-white/10 border-white/20" />
                <span className="text-sm text-gray-300">Safety tips and recommendations</span>
              </label>
            </div>
          </div>

          <button
            onClick={signOut}
            className="w-full p-4 rounded-2xl bg-red-500/10 border border-red-500/30 hover:bg-red-500/20 text-red-400 font-medium transition-all flex items-center justify-center gap-2"
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
