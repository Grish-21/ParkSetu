import React from 'react';
import { Link } from 'react-router-dom';
import { LotNearbyItem } from '../api/types';
import { AvailabilityBadge } from './StatusBadge';
import { MapPin, IndianRupee, ArrowRight, ShieldCheck } from 'lucide-react';

interface LotCardProps {
  lot: LotNearbyItem;
  hasFilterWindow?: boolean;
}

export const LotCard: React.FC<LotCardProps> = ({ lot, hasFilterWindow }) => {
  const freeSlots = hasFilterWindow ? lot.free_for_window : lot.free_now;

  return (
    <div className="bg-slate-800/80 hover:bg-slate-800 border border-slate-700/70 hover:border-indigo-500/50 rounded-2xl p-4 transition-all duration-200 shadow-lg shadow-black/20 flex flex-col justify-between gap-4">
      <div>
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-semibold text-base text-white tracking-tight line-clamp-1">
            {lot.name}
          </h3>
          <AvailabilityBadge free={freeSlots} total={lot.total_slots} />
        </div>

        <p className="text-xs text-slate-400 flex items-center gap-1.5 line-clamp-1 mb-3">
          <MapPin className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
          <span>{lot.address}</span>
        </p>

        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300">
          <div className="flex items-center gap-1 bg-slate-700/50 px-2.5 py-1 rounded-lg">
            <span className="text-slate-400">Dist:</span>
            <span className="font-semibold text-white">{lot.distance_km} km</span>
          </div>

          <div className="flex items-center gap-0.5 bg-slate-700/50 px-2.5 py-1 rounded-lg text-emerald-400 font-semibold">
            <IndianRupee className="w-3.5 h-3.5" />
            <span>{lot.price_per_hour}/hr</span>
          </div>

          <div className="flex items-center gap-1 bg-slate-700/50 px-2.5 py-1 rounded-lg">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
            <span>{lot.total_slots} total</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 pt-2 border-t border-slate-700/50">
        <Link
          to={`/lots/${lot.id}`}
          className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-xs font-semibold transition-colors"
        >
          <span>View Slots</span>
        </Link>
        <Link
          to={`/lots/${lot.id}/book`}
          className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/30 transition-colors"
        >
          <span>Book Spot</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
};
