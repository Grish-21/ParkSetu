import React, { useEffect } from 'react';
import { useNotifications } from '../context/NotificationContext';
import { Bell, AlertTriangle, Clock, RefreshCw, X } from 'lucide-react';
import { BookingEventType } from '../api/types';

function getEventIcon(event: BookingEventType) {
  switch (event) {
    case 'reminder':
      return <Clock className="w-5 h-5 text-blue-400 shrink-0" />;
    case 'overstay':
      return <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />;
    case 'no_show_released':
      return <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />;
    case 'reroute_suggested':
      return <RefreshCw className="w-5 h-5 text-indigo-400 shrink-0 animate-spin" />;
    case 'extended':
      return <Clock className="w-5 h-5 text-emerald-400 shrink-0" />;
    default:
      return <Bell className="w-5 h-5 text-slate-400 shrink-0" />;
  }
}

function getEventTitle(event: BookingEventType) {
  switch (event) {
    case 'reminder':
      return 'Booking Reminder';
    case 'overstay':
      return 'Overstay Alert';
    case 'no_show_released':
      return 'Slot Released';
    case 'reroute_suggested':
      return 'Smart Reroute Suggestion';
    case 'extended':
      return 'Booking Extended';
    default:
      return 'Notification';
  }
}

export const NotificationToast: React.FC = () => {
  const { toasts, dismissToast } = useNotifications();

  useEffect(() => {
    if (toasts.length > 0) {
      const timer = setTimeout(() => {
        dismissToast(toasts.length - 1);
      }, 7000);
      return () => clearTimeout(timer);
    }
  }, [toasts, dismissToast]);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 left-4 sm:left-auto sm:w-96 z-50 space-y-2 pointer-events-none">
      {toasts.map((toast, index) => (
        <div
          key={`${toast.booking_id}-${index}`}
          className="pointer-events-auto bg-slate-800/95 backdrop-blur-md border border-slate-700/80 shadow-2xl rounded-2xl p-4 flex items-start gap-3 transform transition-all duration-300 animate-in slide-in-from-top-4"
        >
          {getEventIcon(toast.event)}
          <div className="flex-1 min-w-0">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              {getEventTitle(toast.event)}
            </h4>
            <p className="text-xs text-slate-200 mt-0.5 leading-relaxed">{toast.message}</p>
          </div>
          <button
            onClick={() => dismissToast(index)}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-700/50 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
};
