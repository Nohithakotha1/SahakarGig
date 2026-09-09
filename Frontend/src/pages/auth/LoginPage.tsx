import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { 
  Building2, 
  Lock, 
  Mail, 
  UserCheck, 
  Wrench, 
  ShieldAlert, 
  ArrowRight,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login, loginAs, isLoading } = useAuth();
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState('priya.sharma@example.com');
  const [password, setPassword] = useState('demo1234');
  const [rememberMe, setRememberMe] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    try {
      await login(identifier, password);
      const savedRole = localStorage.getItem('sahakar_user_role') || '';
      if (savedRole === 'worker' || identifier.includes('worker') || identifier.includes('ravi')) {
        navigate('/worker/dashboard');
      } else if (savedRole === 'admin' || savedRole === 'coop_admin' || identifier.includes('admin') || identifier.includes('gov')) {
        navigate('/admin/dashboard');
      } else {
        navigate('/customer/dashboard');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Unable to sign in. Please verify your credentials.');
    }
  };

  const handleQuickRole = async (role: 'customer' | 'worker' | 'admin') => {
    setErrorMessage(null);
    try {
      await loginAs(role);
      if (role === 'customer') navigate('/customer/dashboard');
      if (role === 'worker') navigate('/worker/dashboard');
      if (role === 'admin') navigate('/admin/dashboard');
    } catch (err: any) {
      setErrorMessage(err.message || 'Quick login failed.');
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-emerald-700 text-white font-bold mb-1 shadow-xs">
            <Building2 className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Sign in to SahakarGig</h1>
          <p className="text-xs text-gray-700">
            Cooperative Gig Services Platform • Labour Cooperative Federations
          </p>
        </div>

        {/* Quick Role Selectors for Demo */}
        <div className="bg-emerald-50/80 border border-emerald-200 rounded-xl p-3.5 space-y-2">
          <p className="text-[11px] font-bold text-emerald-950 uppercase tracking-wider text-center">
            1-Click Quick Demo Login
          </p>
          <div className="grid grid-cols-3 gap-1.5">
            <button
              type="button"
              onClick={() => handleQuickRole('customer')}
              className="p-2 bg-white hover:bg-emerald-100/70 border border-emerald-200 rounded-lg text-center transition-colors cursor-pointer"
            >
              <UserCheck className="w-4 h-4 mx-auto text-emerald-700 mb-1" />
              <p className="text-[11px] font-bold text-gray-900">Customer</p>
              <p className="text-[9px] text-gray-500">Priya Sharma</p>
            </button>

            <button
              type="button"
              onClick={() => handleQuickRole('worker')}
              className="p-2 bg-white hover:bg-teal-100/70 border border-teal-200 rounded-lg text-center transition-colors cursor-pointer"
            >
              <Wrench className="w-4 h-4 mx-auto text-teal-700 mb-1" />
              <p className="text-[11px] font-bold text-gray-900">Worker</p>
              <p className="text-[9px] text-gray-500">Ravi (Plumber)</p>
            </button>

            <button
              type="button"
              onClick={() => handleQuickRole('admin')}
              className="p-2 bg-white hover:bg-blue-100/70 border border-blue-200 rounded-lg text-center transition-colors cursor-pointer"
            >
              <ShieldAlert className="w-4 h-4 mx-auto text-blue-700 mb-1" />
              <p className="text-[11px] font-bold text-gray-900">Admin</p>
              <p className="text-[9px] text-gray-500">NCCT Federation</p>
            </button>
          </div>
        </div>

        {/* Standard Login Card */}
        <Card className="p-6 sm:p-8 space-y-5">
          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Email or Mobile Number"
              type="text"
              required
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="e.g. priya.sharma@example.com"
              leftIcon={<Mail className="w-4 h-4" />}
            />

            <Input
              label="Password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              leftIcon={<Lock className="w-4 h-4" />}
            />

            <div className="flex items-center justify-between text-xs">
              <label className="flex items-center gap-2 cursor-pointer text-gray-600">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-gray-300 text-emerald-700 focus:ring-emerald-500"
                />
                <span>Remember me</span>
              </label>

              <Link to="/forgot-password" className="font-semibold text-emerald-700 hover:text-emerald-800">
                Forgot password?
              </Link>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full"
              isLoading={isLoading}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Login to Account
            </Button>
          </form>

          <div className="pt-4 border-t border-gray-100 text-center text-xs text-gray-600">
            <span>Don't have an account yet? </span>
            <Link to="/register" className="font-bold text-emerald-700 hover:text-emerald-800">
              Register here
            </Link>
          </div>
        </Card>

        {/* Security Assurance */}
        <div className="flex items-center justify-center gap-2 text-xs text-gray-600">
          <ShieldCheck className="w-4 h-4 text-emerald-700" />
          <span>Encrypted Session • Ministry of Cooperation Standards</span>
        </div>
      </div>
    </div>
  );
};
