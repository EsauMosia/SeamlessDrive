import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { AlertCircle, Mail, Lock } from 'lucide-react';

type LoginFormProps = {
  onToggleForm: () => void;
  onForgotPassword?: () => void;
};

export function LoginForm({ onForgotPassword }: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { error } = await signIn(email, password);

    if (error) {
      setError(error.message);
    }

    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-200">{error}</p>
        </div>
      )}

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
            placeholder="Enter your password"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white font-semibold py-3 px-4 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-600/50 hover:shadow-blue-600/70"
      >
        {loading ? 'Signing In...' : 'Sign In'}
      </button>

      {onForgotPassword && (
        <button
          type="button"
          onClick={onForgotPassword}
          className="w-full text-center text-blue-400 hover:text-blue-300 text-sm font-medium transition-colors py-2"
        >
          Forgot password?
        </button>
      )}
    </form>
  );
}
