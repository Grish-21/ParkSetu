import React from 'react';
import { BookingStatus } from '../api/types';
import { CheckCircle2, Clock, AlertTriangle, XCircle, ShieldAlert, Sparkles } from 'lucide-react';

interface StatusBadgeProps {
  status: BookingStatus;
  size?: 'sm' | 'md' | 'lg';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 gap-1',
    md: 'text-xs font-semibold px-2.5 py-1 gap-1.5',
    lg: 'text-sm font-bold px-3 py-1.5 gap-2',
  }[size];

  switch (status) {
    case 'BOOKED':
      return (
        <span
          className={`inline-flex items-center rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/30 ${sizeClasses}`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Booked</span>
        </span>
      );
    case 'CHECKED_IN':
      return (
        <span
          className={`inline-flex items-center rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 ${sizeClasses}`}
        >
          <CheckCircle2 className="w-3.5 h-3.5 animate-pulse" />
          <span>Parked (Checked In)</span>
        </span>
      );
    case 'OVERSTAY':
      return (
        <span
          className={`inline-flex items-center rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse ${sizeClasses}`}
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>Overstay</span>
        </span>
      );
    case 'COMPLETED':
      return (
        <span
          className={`inline-flex items-center rounded-full bg-slate-700/60 text-slate-300 border border-slate-600 ${sizeClasses}`}
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Completed</span>
        </span>
      );
    case 'NO_SHOW':
      return (
        <span
          className={`inline-flex items-center rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30 ${sizeClasses}`}
        >
          <ShieldAlert className="w-3.5 h-3.5" />
          <span>No Show</span>
        </span>
      );
    case 'CANCELLED':
      return (
        <span
          className={`inline-flex items-center rounded-full bg-slate-800 text-slate-400 border border-slate-700 ${sizeClasses}`}
        >
          <XCircle className="w-3.5 h-3.5" />
          <span>Cancelled</span>
        </span>
      );
    default:
      return (
        <span
          className={`inline-flex items-center rounded-full bg-slate-800 text-slate-300 border border-slate-700 ${sizeClasses}`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>{status}</span>
        </span>
      );
  }
};

interface AvailabilityBadgeProps {
  free: number;
  total: number;
  size?: 'sm' | 'md';
}

export const AvailabilityBadge: React.FC<AvailabilityBadgeProps> = ({
  free,
  total,
  size = 'md',
}) => {
  const ratio = total > 0 ? free / total : 0;
  const isGreen = ratio > 0.3;
  const isAmber = ratio > 0 && ratio <= 0.3;
  const isRed = free === 0;

  const sizeClass = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-xs font-semibold px-2.5 py-1';

  if (isGreen) {
    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 ${sizeClass}`}
      >
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        <span>{free} free</span>
      </span>
    );
  }

  if (isAmber) {
    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30 ${sizeClass}`}
      >
        <span className="w-2 h-2 rounded-full bg-amber-400" />
        <span>Only {free} left</span>
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full bg-rose-500/15 text-rose-400 border border-rose-500/30 ${sizeClass}`}
    >
      <span className="w-2 h-2 rounded-full bg-rose-400" />
      <span>Full</span>
    </span>
  );
};
