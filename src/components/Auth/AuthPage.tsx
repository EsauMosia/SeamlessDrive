import { useState } from 'react';
import { LoginForm } from './LoginForm';
import { RegisterForm } from './RegisterForm';
import { Shield, ArrowRight } from 'lucide-react';

export function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 relative overflow-hidden flex items-center justify-center">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-600 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse animation-delay-2000"></div>
      </div>

      <div className="relative z-10 w-full max-w-md px-4 sm:px-6">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className="bg-gradient-to-br from-blue-400 to-blue-600 p-3 rounded-2xl shadow-lg shadow-blue-500/50">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white">SeamlessDrive</h1>
          </div>
          <p className="text-lg text-gray-300 font-light">
            {isLogin ? 'Welcome back' : 'Join thousands of safer drivers'}
          </p>
          <p className="text-sm text-gray-400 mt-2">
            AI-powered safety for every journey
          </p>
        </div>

        {isLogin ? (
          <LoginForm onToggleForm={() => setIsLogin(false)} />
        ) : (
          <RegisterForm onToggleForm={() => setIsLogin(true)} />
        )}

        <div className="mt-8 text-center border-t border-white/10 pt-8">
          <p className="text-gray-400 text-sm mb-4">
            {isLogin ? "Don't have an account?" : 'Already signed up?'}
          </p>
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-medium transition-all border border-white/10 hover:border-white/20 group"
          >
            {isLogin ? 'Create Account' : 'Sign In'}
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>
    </div>
  );
}
