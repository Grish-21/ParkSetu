import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { Map, CalendarCheck, QrCode, LayoutDashboard, BarChart3 } from 'lucide-react';

export const BottomNav: React.FC = () => {
  const { user } = useAuth();

  const getDashboardLink = () => {
    if (user?.role === 'admin') {
      return { to: '/admin', label: 'Admin', icon: BarChart3 };
    }
    if (user?.role === 'owner') {
      return { to: '/owner', label: 'Lots', icon: LayoutDashboard };
    }
    return { to: '/owner', label: 'Owner', icon: LayoutDashboard };
  };

  const dash = getDashboardLink();
  const DashIcon = dash.icon;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-lg border-t border-slate-800 pb-safe">
      <div className="max-w-md mx-auto grid grid-cols-4 h-16">
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            `flex flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors ${
              isActive ? 'text-indigo-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
            }`
          }
        >
          <Map className="w-5 h-5" />
          <span>Nearby</span>
        </NavLink>

        <NavLink
          to="/bookings"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors ${
              isActive ? 'text-indigo-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
            }`
          }
        >
          <CalendarCheck className="w-5 h-5" />
          <span>Bookings</span>
        </NavLink>

        <NavLink
          to="/gate"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors ${
              isActive ? 'text-indigo-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
            }`
          }
        >
          <QrCode className="w-5 h-5" />
          <span>Gate Demo</span>
        </NavLink>

        <NavLink
          to={dash.to}
          className={({ isActive }) =>
            `flex flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors ${
              isActive ? 'text-indigo-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
            }`
          }
        >
          <DashIcon className="w-5 h-5" />
          <span>{dash.label}</span>
        </NavLink>
      </div>
    </nav>
  );
};
