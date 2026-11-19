import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { USE_MOCK } from '../api/client';
import { useNotifications } from '../context/NotificationContext';
import { LogOut, User, Sparkles, Radio } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const { triggerDemoReroute } = useNotifications();
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800">
      <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-indigo-600/30 group-hover:scale-105 transition-transform">
            <span className="text-white font-black text-lg">P</span>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-lg tracking-tight text-white">ParkSetu</span>
              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                MVP
              </span>
            </div>
            <span className="text-[10px] text-slate-400 tracking-wide block -mt-0.5">
              Mira Bhayandar
            </span>
          </div>
        </Link>

        {/* Right Action Items */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Mode Indicator */}
          <div
            title={
              USE_MOCK
                ? 'Running in offline Mock Mode (VITE_USE_MOCK=true)'
                : 'Connecting to live FastAPI backend at http://localhost:8000'
            }
            className={`hidden xs:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${
              USE_MOCK
                ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
            }`}
          >
            <Radio className="w-3 h-3 animate-pulse" />
            <span>{USE_MOCK ? 'Mock' : 'Live'}</span>
          </div>

          {/* Quick Demo Trigger for Reroute Banner */}
          {isAuthenticated && (
            <button
              onClick={triggerDemoReroute}
              title="Test Reroute Notification Banner"
              className="hidden sm:flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-indigo-950/60 hover:bg-indigo-900/60 text-indigo-300 border border-indigo-700/50 transition"
            >
              <Sparkles className="w-3 h-3 text-indigo-400" />
              <span>Test Reroute</span>
            </button>
          )}

          {/* User info & Logout */}
          {isAuthenticated && user ? (
            <div className="flex items-center gap-2">
              <div className="hidden sm:flex flex-col text-right">
                <span className="text-xs font-semibold text-slate-200 truncate max-w-[120px]">
                  {user.name}
                </span>
                <span className="text-[10px] uppercase font-bold text-indigo-400">
                  {user.role}
                </span>
              </div>
              <button
                onClick={() => {
                  logout();
                  navigate('/login');
                }}
                title="Log Out"
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition border border-slate-700"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <Link
              to="/login"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/30 transition"
            >
              <User className="w-3.5 h-3.5" />
              <span>Log In</span>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
};
