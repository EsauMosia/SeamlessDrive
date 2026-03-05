import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { AlertCircle, CheckCircle, User, Mail, Lock } from 'lucide-react';

type RegisterFormProps = {
  onToggleForm: () => void;
};

export function RegisterForm({ onToggleForm }: RegisterFormProps) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const { signUp } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    const { error } = await signUp(email, password, fullName);

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      setSuccess(true);
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="space-y-8 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-green-400/20 to-green-600/20 border border-green-400/30 rounded-full">
          <CheckCircle className="w-8 h-8 text-green-400" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">Account Created!</h2>
          <p className="text-gray-400">
            Welcome to SeamlessDrive. Ready to start your safer driving journey?
          </p>
        </div>
        <button
          onClick={onToggleForm}
          className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white font-semibold py-3 px-4 rounded-lg transition-all shadow-lg shadow-blue-600/50"
        >
          Continue to Sign In
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-200">{error}</p>
        </div>
      )}

      <div>
        <label htmlFor="fullName" className="block text-sm font-medium text-gray-300 mb-2.5">
          Full Name
        </label>
        <div className="relative">
          <User className="absolute left-3.5 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
          <input
            id="fullName"
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 text-white rounded-lg focus:bg-white/10 focus:border-blue-400 focus:outline-none transition-all placeholder-gray-500"
            placeholder="John Doe"
          />
        </div>
      </div>

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2.5">
          Email
        </label>
        <div className="relative">
          <Mail className="absolute left-3.5 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 text-white rounded-lg focus:bg-white/10 focus:border-blue-400 focus:outline-none transition-all placeholder-gray-500"
            placeholder="you@example.com"
          />
        </div>
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2.5">
          Password
        </label>
        <div className="relative">
          <Lock className="absolute left-3.5 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 text-white rounded-lg focus:bg-white/10 focus:border-blue-400 focus:outline-none transition-all placeholder-gray-500"
            placeholder="At least 6 characters"
          />
        </div>
      </div>

      <div>
        <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300 mb-2.5">
          Confirm Password
        </label>
        <div className="relative">
          <Lock className="absolute left-3.5 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
          <input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 text-white rounded-lg focus:bg-white/10 focus:border-blue-400 focus:outline-none transition-all placeholder-gray-500"
            placeholder="Repeat your password"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white font-semibold py-3 px-4 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-600/50 hover:shadow-blue-600/70"
      >
        {loading ? 'Creating Account...' : 'Create Account'}
      </button>
    </form>
  );
}
