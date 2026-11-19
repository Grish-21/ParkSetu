import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../context/NotificationContext';
import { AlertTriangle, ArrowRight, X, MapPin, IndianRupee } from 'lucide-react';

export const RerouteBanner: React.FC = () => {
  const { rerouteAlert, dismissReroute } = useNotifications();
  const navigate = useNavigate();

  if (!rerouteAlert) return null;

  return (
    <div className="mx-4 my-3 bg-gradient-to-r from-amber-950/70 via-slate-900 to-indigo-950/70 border border-amber-500/40 rounded-2xl p-4 shadow-xl backdrop-blur-md">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
          <AlertTriangle className="w-4 h-4 shrink-0 animate-bounce" />
          <span>Smart Reroute Recommendation</span>
        </div>
        <button
          onClick={dismissReroute}
          className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          title="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <p className="text-xs text-slate-300 leading-relaxed mb-3">{rerouteAlert.message}</p>

      {rerouteAlert.alternatives && rerouteAlert.alternatives.length > 0 && (
        <div className="space-y-2">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            Recommended Alternatives:
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {rerouteAlert.alternatives.map((lot) => (
              <div
                key={lot.id}
                className="bg-slate-800/90 hover:bg-slate-800 border border-slate-700 p-2.5 rounded-xl flex items-center justify-between gap-2 transition"
              >
                <div className="min-w-0">
                  <div className="font-semibold text-xs text-white truncate">{lot.name}</div>
                  <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                    <span className="flex items-center gap-0.5">
                      <MapPin className="w-3 h-3 text-indigo-400" />
                      {lot.distance_km} km
                    </span>
                    <span className="flex items-center gap-0.5 text-emerald-400">
                      <IndianRupee className="w-3 h-3" />
                      {lot.price_per_hour}/hr
                    </span>
                    <span className="text-emerald-400 font-semibold">{lot.free_now} free</span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    dismissReroute();
                    navigate(`/lots/${lot.id}/book`);
                  }}
                  className="shrink-0 flex items-center gap-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs py-1.5 px-3 rounded-lg shadow-md transition"
                >
                  <span>Switch</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
