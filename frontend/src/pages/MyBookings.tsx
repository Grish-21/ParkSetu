import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { endpoints } from '../api/endpoints';
import { Booking } from '../api/types';
import { StatusBadge } from '../components/StatusBadge';
import { Countdown } from '../components/Countdown';
import { formatIST } from '../utils/date';
import { QRCodeSVG } from 'qrcode.react';
import { Link } from 'react-router-dom';
import {
  Calendar,
  Clock,
  Car,
  QrCode,
  IndianRupee,
  AlertTriangle,
  RefreshCw,
  LogOut,
  XCircle,
  PlusCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

export const MyBookings: React.FC = () => {
  const queryClient = useQueryClient();
  const [expandedQrId, setExpandedQrId] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const {
    data: bookings = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['my-bookings'],
    queryFn: () => endpoints.getMyBookings(),
    refetchInterval: 10000,
  });

  // Extend booking (+30 min)
  const extendMutation = useMutation({
    mutationFn: async (booking: Booking) => {
      const currentEnd = new Date(booking.end_time);
      const newEnd = new Date(currentEnd.getTime() + 30 * 60 * 1000).toISOString();
      return endpoints.extendBooking(booking.id, newEnd);
    },
    onSuccess: () => {
      setActionError(null);
      queryClient.invalidateQueries({ queryKey: ['my-bookings'] });
    },
    onError: (err: any) => {
      setActionError(err.message || 'Cannot extend: a consecutive driver has reserved this slot.');
    },
  });

  // Cancel booking
  const cancelMutation = useMutation({
    mutationFn: (id: number) => endpoints.cancelBooking(id),
    onSuccess: () => {
      setActionError(null);
      queryClient.invalidateQueries({ queryKey: ['my-bookings'] });
    },
    onError: (err: any) => {
      setActionError(err.message || 'Failed to cancel booking.');
    },
  });

  // Exit booking
  const exitMutation = useMutation({
    mutationFn: (id: number) => endpoints.exitBooking(id),
    onSuccess: () => {
      setActionError(null);
      queryClient.invalidateQueries({ queryKey: ['my-bookings'] });
    },
    onError: (err: any) => {
      setActionError(err.message || 'Failed to record exit.');
    },
  });

  return (
    <div className="space-y-4 pb-20 max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between px-1">
        <div>
          <h1 className="text-xl font-black text-white tracking-tight">My Bookings</h1>
          <p className="text-xs text-slate-400 mt-0.5">Manage passes, QR access & timers</p>
        </div>
        <button
          onClick={() => refetch()}
          className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
          title="Refresh"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {actionError && (
        <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{actionError}</span>
          </div>
          <button
            onClick={() => setActionError(null)}
            className="text-rose-400 hover:text-white text-xs font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="h-44 rounded-3xl bg-slate-800/40 border border-slate-700/50 animate-pulse"
            />
          ))}
        </div>
      ) : isError ? (
        <div className="p-6 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-center space-y-2">
          <AlertTriangle className="w-6 h-6 text-rose-400 mx-auto" />
          <p className="text-xs text-rose-300">
            {(error as any)?.message || 'Failed to load bookings'}
          </p>
          <button
            onClick={() => refetch()}
            className="text-xs font-bold text-white bg-slate-800 px-3 py-1.5 rounded-lg"
          >
            Retry
          </button>
        </div>
      ) : bookings.length === 0 ? (
        <div className="p-8 text-center bg-slate-800/40 rounded-3xl border border-slate-700/60 space-y-3">
          <Calendar className="w-10 h-10 text-slate-500 mx-auto" />
          <h3 className="font-bold text-white text-sm">No Active Bookings</h3>
          <p className="text-xs text-slate-400 max-w-xs mx-auto">
            You don't have any bookings yet. Search nearby lots to find and reserve a parking spot.
          </p>
          <Link
            to="/"
            className="inline-block py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition"
          >
            Find a Parking Lot
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {bookings.map((booking) => {
            const isBooked = booking.status === 'BOOKED';
            const isCheckedIn = booking.status === 'CHECKED_IN';
            const isOverstay = booking.status === 'OVERSTAY';
            const isActive = isBooked || isCheckedIn || isOverstay;
            const isExpanded = expandedQrId === booking.id;

            return (
              <div
                key={booking.id}
                className={`bg-slate-800/85 backdrop-blur border rounded-3xl p-5 shadow-xl transition space-y-4 ${
                  booking.at_risk
                    ? 'border-amber-500/60 ring-1 ring-amber-500/30'
                    : isOverstay
                    ? 'border-rose-500/60 ring-1 ring-rose-500/30'
                    : isCheckedIn
                    ? 'border-emerald-500/40'
                    : 'border-slate-700/80'
                }`}
              >
                {/* At-risk reroute warning banner */}
                {booking.at_risk && (
                  <div className="p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5 font-medium">
                      <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>Previous driver may overstay this slot.</span>
                    </span>
                    <Link
                      to="/"
                      className="font-bold underline text-amber-300 hover:text-white shrink-0"
                    >
                      Reroute
                    </Link>
                  </div>
                )}

                {/* Card Top: Lot Name & Status */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                      Slot {booking.slot_label || 'A1'}
                    </span>
                    <h3 className="font-bold text-base text-white tracking-tight">
                      {booking.lot_name || `Lot #${booking.lot_id}`}
                    </h3>
                    <div className="flex items-center gap-1.5 text-xs text-slate-300 mt-0.5">
                      <Car className="w-3.5 h-3.5 text-indigo-400" />
                      <span className="font-mono font-bold uppercase">{booking.vehicle_no}</span>
                    </div>
                  </div>
                  <StatusBadge status={booking.status} />
                </div>

                {/* Countdown or Status Timeline */}
                {isActive && (
                  <div className="p-3 rounded-2xl bg-slate-900/70 border border-slate-700/60">
                    {isBooked ? (
                      <Countdown targetIso={booking.start_time} type="start" />
                    ) : (
                      <Countdown targetIso={booking.end_time} type="end" />
                    )}
                  </div>
                )}

                {/* Details Grid */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-slate-900/40 p-2.5 rounded-xl border border-slate-800">
                    <span className="text-[11px] text-slate-400 block">Start (IST)</span>
                    <span className="font-semibold text-slate-200">
                      {formatIST(booking.start_time)}
                    </span>
                  </div>

                  <div className="bg-slate-900/40 p-2.5 rounded-xl border border-slate-800">
                    <span className="text-[11px] text-slate-400 block">End (IST)</span>
                    <span className="font-semibold text-slate-200">
                      {formatIST(booking.end_time)}
                    </span>
                  </div>

                  <div className="bg-slate-900/40 p-2.5 rounded-xl border border-slate-800">
                    <span className="text-[11px] text-slate-400 block">Current Amount</span>
                    <span className="font-bold text-emerald-400 flex items-center">
                      <IndianRupee className="w-3.5 h-3.5" />
                      {booking.amount}
                    </span>
                  </div>

                  <div className="bg-slate-900/40 p-2.5 rounded-xl border border-slate-800">
                    <span className="text-[11px] text-slate-400 block">Overstay</span>
                    <span
                      className={`font-bold ${
                        booking.overstay_minutes > 0 ? 'text-rose-400' : 'text-slate-300'
                      }`}
                    >
                      {booking.overstay_minutes > 0 ? `+${booking.overstay_minutes} min` : '0 min'}
                    </span>
                  </div>
                </div>

                {/* QR Access Code Box */}
                <div className="border-t border-slate-700/60 pt-3">
                  <button
                    type="button"
                    onClick={() => setExpandedQrId(isExpanded ? null : booking.id)}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl bg-slate-900/60 hover:bg-slate-900 border border-slate-700/60 transition text-xs font-semibold text-slate-200"
                  >
                    <div className="flex items-center gap-2">
                      <QrCode className="w-4 h-4 text-indigo-400" />
                      <span>Gate Pass QR Code</span>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    )}
                  </button>

                  {isExpanded && (
                    <div className="mt-3 p-4 bg-slate-900/90 rounded-2xl border border-slate-700 text-center space-y-3 animate-in fade-in">
                      <div className="inline-block p-3 bg-white rounded-xl shadow-lg">
                        <QRCodeSVG value={booking.qr_token} size={150} level="M" />
                      </div>
                      <div className="text-[11px] font-mono text-slate-300 bg-slate-800 px-2 py-1 rounded inline-block">
                        {booking.qr_token}
                      </div>
                      <p className="text-[11px] text-slate-400">
                        Scan at entry sensor or input in Gate Demo.
                      </p>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                {isActive && (
                  <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-700/60">
                    {/* Extend Button */}
                    <button
                      type="button"
                      disabled={extendMutation.isPending}
                      onClick={() => extendMutation.mutate(booking)}
                      className="flex-1 min-w-[120px] flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 text-xs font-bold transition disabled:opacity-50"
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      <span>Extend (+30m)</span>
                    </button>

                    {/* Cancel (BOOKED only) */}
                    {isBooked && (
                      <button
                        type="button"
                        disabled={cancelMutation.isPending}
                        onClick={() => cancelMutation.mutate(booking.id)}
                        className="flex-1 min-w-[100px] flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-slate-700 hover:bg-rose-950/40 hover:border-rose-500/50 hover:text-rose-300 text-slate-300 border border-slate-600 text-xs font-semibold transition disabled:opacity-50"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Cancel</span>
                      </button>
                    )}

                    {/* Exit (CHECKED_IN or OVERSTAY) */}
                    {(isCheckedIn || isOverstay) && (
                      <button
                        type="button"
                        disabled={exitMutation.isPending}
                        onClick={() => exitMutation.mutate(booking.id)}
                        className="flex-1 min-w-[100px] flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/30 transition disabled:opacity-50"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Exit Gate</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
