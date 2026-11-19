import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { endpoints } from '../api/endpoints';
import { Booking } from '../api/types';
import { mockDb } from '../api/mock';
import { StatusBadge } from '../components/StatusBadge';
import { formatIST } from '../utils/date';
import {
  QrCode,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Car,
  ArrowRight,
  Sparkles,
  Zap,
} from 'lucide-react';

export const GateSimulator: React.FC = () => {
  const [searchParams] = useSearchParams();
  const tokenFromQuery = searchParams.get('token') || '';

  const [qrToken, setQrToken] = useState(tokenFromQuery);
  const [isLoading, setIsLoading] = useState(false);
  const [successBooking, setSuccessBooking] = useState<Booking | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Available sample active tokens for instant demo selection
  const [sampleTokens, setSampleTokens] = useState<{ label: string; token: string }[]>([]);

  useEffect(() => {
    if (tokenFromQuery) {
      setQrToken(tokenFromQuery);
    }
    const bookings = mockDb.getBookings();
    const activeTokens = bookings.slice(0, 3).map((b) => ({
      label: `${b.lot_name?.split(' ')[0] || 'Lot'} - Slot ${b.slot_label || 'A1'} (${b.vehicle_no})`,
      token: b.qr_token,
    }));
    setSampleTokens(activeTokens);
  }, [tokenFromQuery]);

  const handleCheckin = async (tokenToUse?: string) => {
    const target = (tokenToUse || qrToken).trim();
    if (!target) return;

    setIsLoading(true);
    setErrorMessage(null);
    setSuccessBooking(null);

    try {
      const res = await endpoints.checkin(target);
      setSuccessBooking(res);
    } catch (err: any) {
      setErrorMessage(err.message || 'Check-in failed. Please verify QR token.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto space-y-5 pb-20">
      <div className="text-center pt-2">
        <div className="w-12 h-12 bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 rounded-2xl flex items-center justify-center mx-auto mb-2 shadow-lg shadow-indigo-600/20">
          <QrCode className="w-6 h-6" />
        </div>
        <h1 className="text-xl font-black text-white tracking-tight">Gate Entry Simulator</h1>
        <p className="text-xs text-slate-400 mt-1">
          Demo gate sensor that scans driver QR passes and opens the barrier
        </p>
      </div>

      {/* Simulator input box */}
      <div className="bg-slate-800/80 backdrop-blur border border-slate-700/80 rounded-3xl p-5 shadow-xl space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5">
            QR Pass Token
          </label>
          <div className="relative">
            <QrCode className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={qrToken}
              onChange={(e) => setQrToken(e.target.value)}
              placeholder="e.g. PST-M3K4J-9921 or QR-DEMO-101-ACTIVE"
              className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-10 pr-3.5 py-2.5 text-xs font-mono font-bold text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
            />
          </div>
        </div>

        {/* Quick select demo tokens */}
        {sampleTokens.length > 0 && (
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
              Or pick an active pass:
            </span>
            <div className="space-y-1.5">
              {sampleTokens.map((item, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setQrToken(item.token);
                    handleCheckin(item.token);
                  }}
                  className="w-full text-left p-2 rounded-xl bg-slate-900/60 hover:bg-slate-900 border border-slate-700/60 text-xs flex items-center justify-between transition group"
                >
                  <span className="text-slate-300 font-medium truncate">{item.label}</span>
                  <span className="font-mono text-[10px] text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded group-hover:bg-indigo-500/20">
                    {item.token}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        <button
          type="button"
          disabled={isLoading || !qrToken.trim()}
          onClick={() => handleCheckin()}
          className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-[0.99] text-white font-bold text-xs shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition disabled:opacity-50"
        >
          {isLoading ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <ShieldCheck className="w-4 h-4" />
              <span>Simulate Gate Scan & Check In</span>
            </>
          )}
        </button>
      </div>

      {/* Error state */}
      {errorMessage && (
        <div className="p-4 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2.5 animate-in fade-in">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Success Result */}
      {successBooking && (
        <div className="p-5 rounded-3xl bg-emerald-950/40 border border-emerald-500/40 shadow-xl space-y-4 animate-in fade-in zoom-in-95">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">
                Barrier Lifted
              </span>
              <h2 className="text-base font-bold text-white tracking-tight">
                Gate Check-In Approved!
              </h2>
            </div>
          </div>

          <div className="p-3.5 bg-slate-900/80 rounded-2xl border border-slate-700/80 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Assigned Slot:</span>
              <span className="text-base font-black text-emerald-400">
                Slot {successBooking.slot_label || 'A1'}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-400">Vehicle:</span>
              <span className="font-mono font-bold text-white uppercase">
                {successBooking.vehicle_no}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-400">Checked In At:</span>
              <span className="font-medium text-slate-200">
                {formatIST(successBooking.checked_in_at)}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-400">Status:</span>
              <StatusBadge status={successBooking.status} size="sm" />
            </div>
          </div>

          <Link
            to="/bookings"
            className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition"
          >
            <span>View Active Parking Session</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}
    </div>
  );
};
