import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { User, Phone, Shield, Save, AlertCircle, CheckCircle } from 'lucide-react';

export function ProfileView() {
  const { user, profile, refreshProfile } = useAuth();
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [emergencyContact, setEmergencyContact] = useState(profile?.emergency_contact || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    setError('');
    setSuccess(false);

    const { error: updateError } = await supabase
      .from('user_profiles')
      .update({
        full_name: fullName,
        phone: phone,
        emergency_contact: emergencyContact,
      })
      .eq('id', user.id);

    if (updateError) {
      setError(updateError.message);
    } else {
      setSuccess(true);
      await refreshProfile();
      setTimeout(() => setSuccess(false), 3000);
    }

    setLoading(false);
  };

  const getSafetyScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600 bg-green-50 border-green-200';
    if (score >= 70) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  const getSafetyScoreMessage = (score: number) => {
    if (score >= 90) return 'Excellent! Keep up the safe driving.';
    if (score >= 70) return 'Good job! There\'s room for improvement.';
    return 'Focus on safer driving habits to improve your score.';
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Profile Settings</h1>
        <p className="text-gray-600 mt-1">Manage your account and preferences</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className={`bg-white rounded-xl shadow-sm border-2 p-6 ${getSafetyScoreColor(profile?.safety_score || 100)}`}>
          <div className="flex items-center gap-4">
            <div className="p-4 bg-white rounded-xl">
              <Shield className={`w-8 h-8 ${
                profile?.safety_score && profile.safety_score >= 90
                  ? 'text-green-600'
                  : profile?.safety_score && profile.safety_score >= 70
                  ? 'text-yellow-600'
                  : 'text-red-600'
              }`} />
            </div>
            <div>
              <p className="text-sm font-medium opacity-75">Your Safety Score</p>
              <p className="text-4xl font-bold">{profile?.safety_score || 100}</p>
            </div>
          </div>
          <p className="text-sm mt-4 opacity-90">
            {getSafetyScoreMessage(profile?.safety_score || 100)}
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="font-bold text-gray-900 mb-4">Driving Statistics</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Total Trips</span>
              <span className="font-bold text-gray-900">{profile?.total_trips || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Total Distance</span>
              <span className="font-bold text-gray-900">{profile?.total_distance?.toFixed(1) || 0} km</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Account Created</span>
              <span className="font-bold text-gray-900">
                {profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : '-'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-6">Personal Information</h2>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {success && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-green-800">Profile updated successfully!</p>
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <User className="h-5 w-5 text-gray-400" />
              </div>
              <input
                id="email"
                type="email"
                value={user?.email || ''}
                disabled
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 cursor-not-allowed"
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
          </div>

          <div>
            <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-2">
              Full Name
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <User className="h-5 w-5 text-gray-400" />
              </div>
              <input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="John Doe"
              />
            </div>
          </div>

          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
              Phone Number
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Phone className="h-5 w-5 text-gray-400" />
              </div>
              <input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="+1 (555) 123-4567"
              />
            </div>
          </div>

          <div>
            <label htmlFor="emergencyContact" className="block text-sm font-medium text-gray-700 mb-2">
              Emergency Contact
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Phone className="h-5 w-5 text-gray-400" />
              </div>
              <input
                id="emergencyContact"
                type="tel"
                value={emergencyContact}
                onChange={(e) => setEmergencyContact(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="+1 (555) 987-6543"
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">This contact will be notified in case of an emergency</p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Save className="w-5 h-5" />
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </div>
    </div>
  );
}
