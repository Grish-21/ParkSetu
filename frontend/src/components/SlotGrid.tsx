import React from 'react';
import { Slot } from '../api/types';
import { Shield, Car, Check } from 'lucide-react';

interface SlotGridProps {
  slots: Slot[];
  selectedSlotId?: number;
  onSlotSelect?: (slot: Slot) => void;
  interactive?: boolean;
}

export const SlotGrid: React.FC<SlotGridProps> = ({
  slots,
  selectedSlotId,
  onSlotSelect,
  interactive = false,
}) => {
  if (slots.length === 0) {
    return (
      <div className="p-8 text-center bg-slate-800/40 border border-slate-700/60 rounded-2xl">
        <p className="text-slate-400 text-sm">No parking slots configured for this lot yet.</p>
      </div>
    );
  }

  // Sort slots naturally by label (A1, A2, A10)
  const sorted = [...slots].sort((a, b) =>
    a.label.localeCompare(b.label, undefined, { numeric: true })
  );

  return (
    <div className="space-y-4">
      {/* Legend */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-slate-800/60 backdrop-blur rounded-xl border border-slate-700/50 text-xs text-slate-300">
        <div className="flex items-center gap-2">
          <span className="w-3.5 h-3.5 rounded bg-emerald-500 shadow-sm shadow-emerald-500/50" />
          <span>Free</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3.5 h-3.5 rounded bg-rose-500 shadow-sm shadow-rose-500/50" />
          <span>Occupied</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3.5 h-3.5 rounded bg-slate-600 border border-slate-500" />
          <span>Buffer (Reserve)</span>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {sorted.map((slot) => {
          const isBuffer = slot.is_buffer;
          const isOccupied = slot.status === 'occupied';
          const isFree = !isBuffer && !isOccupied;
          const isSelected = selectedSlotId === slot.id;

          let baseBg = 'bg-slate-800 border-slate-700 text-slate-300';
          if (isBuffer) {
            baseBg = 'bg-slate-800/80 border-slate-600/70 text-slate-400';
          } else if (isOccupied) {
            baseBg = 'bg-rose-950/40 border-rose-600/60 text-rose-200';
          } else {
            baseBg = 'bg-emerald-950/40 border-emerald-500/60 text-emerald-200 hover:bg-emerald-900/40';
          }

          if (isSelected) {
            baseBg += ' ring-2 ring-indigo-400 border-indigo-400 shadow-lg shadow-indigo-500/20';
          }

          return (
            <button
              key={slot.id}
              type="button"
              disabled={!interactive && !onSlotSelect}
              onClick={() => onSlotSelect && onSlotSelect(slot)}
              className={`relative flex flex-col items-center justify-center min-h-[90px] p-3 rounded-2xl border transition-all duration-200 ${baseBg} ${
                onSlotSelect ? 'cursor-pointer active:scale-95' : 'cursor-default'
              }`}
            >
              <div className="flex items-center justify-between w-full mb-1">
                <span className="text-sm font-bold tracking-wide">{slot.label}</span>
                {isBuffer ? (
                  <Shield className="w-3.5 h-3.5 text-slate-400" />
                ) : isOccupied ? (
                  <Car className="w-3.5 h-3.5 text-rose-400" />
                ) : (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                )}
              </div>

              <div className="mt-1">
                {isBuffer ? (
                  <span className="text-[11px] px-1.5 py-0.5 rounded bg-slate-700 text-slate-300 font-medium">
                    Buffer
                  </span>
                ) : isOccupied ? (
                  <span className="text-[11px] px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 font-medium">
                    Occupied
                  </span>
                ) : (
                  <span className="text-[11px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-medium">
                    Available
                  </span>
                )}
              </div>

              {/* Status indicator pip */}
              <div
                className={`absolute top-2 right-2 w-2 h-2 rounded-full ${
                  isBuffer ? 'bg-slate-400' : isOccupied ? 'bg-rose-500' : 'bg-emerald-400 animate-pulse'
                }`}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
};
