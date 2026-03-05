import { useState } from 'react';
import { LoginForm } from './LoginForm';
import { RegisterForm } from './RegisterForm';
import { Shield } from 'lucide-react';

export function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-gray-50 flex items-center justify-center p-4">
      <div className="absolute top-8 left-8">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 p-2.5 rounded-xl">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <span className="text-2xl font-bold text-gray-900">SeamlessDrive</span>
        </div>
      </div>

      <div className="w-full max-w-md">
        {isLogin ? (
          <LoginForm onToggleForm={() => setIsLogin(false)} />
        ) : (
          <RegisterForm onToggleForm={() => setIsLogin(true)} />
        )}
      </div>
    </div>
  );
}
