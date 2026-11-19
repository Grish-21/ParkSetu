import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { Lock, Mail, Car, Building2, ShieldCheck, ArrowRight, AlertCircle } from 'lucide-react';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const { login, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const redirectAfterLogin = (role: string) => {
    const from = (location.state as any)?.from?.pathname;
    if (from) {
      navigate(from, { replace: true });
    } else if (role === 'owner') {
      navigate('/owner', { replace: true });
    } else if (role === 'admin') {
      navigate('/admin', { replace: true });
    } else {
      navigate('/', { replace: true });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const user = await login(email, password);
      redirectAfterLogin(user.role);
    } catch (err: any) {
      setError(err.message || 'Login failed');
    }
  };

  const handleQuickDemoLogin = async (demoEmail: string, demoRole: string) => {
    setError(null);
    try {
      const user = await login(demoEmail, 'demo1234');
      redirectAfterLogin(demoRole);
    } catch (err: any) {
      setError(err.message || 'Demo login failed');
    }
  };

  return (
    <div className="min-h-[85vh] flex flex-col justify-center px-4 py-8 max-w-md mx-auto">
      <div className="bg-slate-800/80 backdrop-blur-xl border border-slate-700/80 rounded-3xl p-6 sm:p-8 shadow-2xl">
        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg shadow-indigo-600/40">
            <span className="text-white font-black text-2xl">P</span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">Welcome to ParkSetu</h1>
          <p className="text-xs text-slate-400 mt-1">
            Smart IoT parking for Mira Bhayandar, India
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="driver@demo.com"
                className="w-full bg-slate-900/80 border border-slate-700 rounded-xl pl-10 pr-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-900/80 border border-slate-700 rounded-xl pl-10 pr-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-[0.99] text-white font-bold text-sm shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition disabled:opacity-50"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span>Sign In</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* 1-Click Demo Accounts */}
        <div className="mt-6 pt-5 border-t border-slate-700/60">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider text-center mb-3">
            Quick 1-Click Demo Login:
          </p>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => handleQuickDemoLogin('driver@demo.com', 'driver')}
              className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-slate-700/60 hover:bg-slate-700 border border-slate-600/50 text-slate-200 transition text-center"
            >
              <Car className="w-4 h-4 text-emerald-400 mb-1" />
              <span className="text-xs font-bold">Driver</span>
              <span className="text-[10px] text-slate-400">demo</span>
            </button>

            <button
              type="button"
              onClick={() => handleQuickDemoLogin('owner@demo.com', 'owner')}
              className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-slate-700/60 hover:bg-slate-700 border border-slate-600/50 text-slate-200 transition text-center"
            >
              <Building2 className="w-4 h-4 text-indigo-400 mb-1" />
              <span className="text-xs font-bold">Owner</span>
              <span className="text-[10px] text-slate-400">demo</span>
            </button>

            <button
              type="button"
              onClick={() => handleQuickDemoLogin('admin@demo.com', 'admin')}
              className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-slate-700/60 hover:bg-slate-700 border border-slate-600/50 text-slate-200 transition text-center"
            >
              <ShieldCheck className="w-4 h-4 text-amber-400 mb-1" />
              <span className="text-xs font-bold">Admin</span>
              <span className="text-[10px] text-slate-400">demo</span>
            </button>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-slate-400">
          Don't have an account?{' '}
          <Link to="/register" className="text-indigo-400 hover:text-indigo-300 font-bold">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
};
