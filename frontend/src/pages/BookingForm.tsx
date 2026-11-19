import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { QRCodeSVG } from 'qrcode.react';
import { endpoints } from '../api/endpoints';
import { Booking, LotNearbyItem } from '../api/types';
import { localInputToUtcIso, utcToLocalInput, formatIST } from '../utils/date';
import { ApiError } from '../api/client';
import {
  ArrowLeft,
  Car,
  Clock,
  IndianRupee,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Calendar,
  Share2,
} from 'lucide-react';

export const BookingForm: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const lotId = Number(id);
  const navigate = useNavigate();

  // Pickers default: start = now, end = +1 hour
  const [startInput, setStartInput] = useState(() => utcToLocalInput(new Date().toISOString()));
  const [endInput, setEndInput] = useState(() => {
    const d = new Date(Date.now() + 60 * 60 * 1000);
    return utcToLocalInput(d.toISOString());
  });
  const [vehicleNo, setVehicleNo] = useState('MH04AB1234');

  const [isLoading, setIsLoading] = useState(false);
  const [confirmedBooking, setConfirmedBooking] = useState<Booking | null>(null);
  const [conflictError, setConflictError] = useState<{
    message: string;
    alternatives: LotNearbyItem[];
  } | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);

  const { data: lot, isLoading: isLotLoading } = useQuery({
    queryKey: ['lot', lotId],
    queryFn: () => endpoints.getLot(lotId),
    enabled: !!lotId,
  });

  // Calculate estimated duration & price
  const startDate = new Date(startInput);
  const endDate = new Date(endInput);
  const diffHours = Math.max(
    1,
    Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60))
  );
  const pricePerHour = lot?.price_per_hour || 30;
  const estimatedAmount = diffHours * pricePerHour;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setConflictError(null);
    setGeneralError(null);

    let startUtc = localInputToUtcIso(startInput);
    let endUtc = localInputToUtcIso(endInput);

    // Guard against stale form where start_time drifted > 4 min into past
    if (new Date(startUtc).getTime() < Date.now() - 4 * 60 * 1000) {
      startUtc = new Date().toISOString();
      if (new Date(endUtc).getTime() <= new Date(startUtc).getTime()) {
        endUtc = new Date(Date.now() + 60 * 60 * 1000).toISOString();
      }
    }

    try {
      const res = await endpoints.createBooking({
        lot_id: lotId,
        start_time: startUtc,
        end_time: endUtc,
        vehicle_no: vehicleNo.trim().toUpperCase(),
      });
      setConfirmedBooking(res);
    } catch (err: any) {
      if (err instanceof ApiError && err.status === 409) {
        setConflictError({
          message: err.message || 'No available slots for the selected timeframe.',
          alternatives: err.detail?.alternatives || [],
        });
      } else {
        setGeneralError(err.message || 'Failed to complete booking. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (isLotLoading) {
    return (
      <div className="py-12 flex justify-center">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // --- Success State: Render Booking & QR Code ---
  if (confirmedBooking) {
    return (
      <div className="max-w-md mx-auto space-y-5 pb-20 animate-in fade-in zoom-in-95">
        <div className="text-center pt-2">
          <div className="w-14 h-14 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg shadow-emerald-500/20">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">Booking Confirmed!</h1>
          <p className="text-xs text-slate-400 mt-1">
            Show this QR code at the parking gate for automatic sensor check-in.
          </p>
        </div>

        {/* QR Ticket Card */}
        <div className="bg-slate-800/90 backdrop-blur border border-slate-700/80 rounded-3xl p-6 shadow-2xl text-center space-y-5">
          <div className="inline-block p-4 bg-white rounded-2xl shadow-xl shadow-black/40">
            <QRCodeSVG
              value={confirmedBooking.qr_token}
              size={180}
              level="H"
              includeMargin={false}
            />
          </div>

          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-widest block">
              QR Token
            </span>
            <code className="text-xs font-mono font-bold text-indigo-300 bg-slate-900/80 px-3 py-1 rounded-lg border border-slate-700/60 inline-block mt-1">
              {confirmedBooking.qr_token}
            </code>
          </div>

          <div className="pt-4 border-t border-slate-700/60 grid grid-cols-2 gap-3 text-left">
            <div>
              <span className="text-[11px] text-slate-400 block">Assigned Slot</span>
              <span className="text-base font-black text-emerald-400">
                {confirmedBooking.slot_label || 'A1'}
              </span>
            </div>
            <div>
              <span className="text-[11px] text-slate-400 block">Vehicle Number</span>
              <span className="text-base font-bold text-white uppercase">
                {confirmedBooking.vehicle_no}
              </span>
            </div>
            <div>
              <span className="text-[11px] text-slate-400 block">Start Time</span>
              <span className="text-xs font-semibold text-slate-200">
                {formatIST(confirmedBooking.start_time)}
              </span>
            </div>
            <div>
              <span className="text-[11px] text-slate-400 block">End Time</span>
              <span className="text-xs font-semibold text-slate-200">
                {formatIST(confirmedBooking.end_time)}
              </span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-700/60 flex items-center justify-between">
            <span className="text-xs text-slate-400">Estimated Amount</span>
            <span className="text-base font-black text-white flex items-center">
              <IndianRupee className="w-4 h-4 text-emerald-400" />
              {confirmedBooking.amount}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2">
          <Link
            to="/bookings"
            className="w-full py-3.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition"
          >
            <span>View in My Bookings</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            to={`/gate?token=${encodeURIComponent(confirmedBooking.qr_token)}`}
            className="w-full py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-semibold text-xs flex items-center justify-center gap-2 transition"
          >
            <span>Simulate Gate Check-In</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto space-y-4 pb-20">
      {/* Back button */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-300 hover:text-white p-2 rounded-xl bg-slate-800/80 border border-slate-700/80 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>
      </div>

      {/* Lot Info summary */}
      <div className="bg-slate-800/80 backdrop-blur border border-slate-700/80 rounded-2xl p-4">
        <span className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider block">
          Reserving at
        </span>
        <h1 className="text-lg font-bold text-white tracking-tight mt-0.5">
          {lot?.name || `Lot #${lotId}`}
        </h1>
        <p className="text-xs text-slate-400 mt-0.5">{lot?.address}</p>
      </div>

      {/* 409 Conflict Alternatives Display */}
      {conflictError && (
        <div className="p-4 rounded-2xl bg-amber-500/15 border border-amber-500/40 space-y-3 animate-in fade-in">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-xs font-bold text-amber-300 uppercase tracking-wider">
                Slot Unavailable
              </h3>
              <p className="text-xs text-slate-200 mt-1 leading-relaxed">
                {conflictError.message}
              </p>
            </div>
          </div>

          {conflictError.alternatives.length > 0 && (
            <div className="pt-2 border-t border-amber-500/30 space-y-2">
              <span className="text-[11px] font-bold text-slate-300 block">
                Recommended Nearby Lots with Free Slots:
              </span>
              <div className="space-y-2">
                {conflictError.alternatives.map((alt) => (
                  <div
                    key={alt.id}
                    className="p-3 rounded-xl bg-slate-900/80 border border-slate-700 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="font-semibold text-xs text-white truncate">{alt.name}</div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                        <span>{alt.distance_km} km</span>
                        <span className="text-emerald-400 font-semibold">₹{alt.price_per_hour}/hr</span>
                        <span className="text-emerald-400">{alt.free_now} free slots</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => navigate(`/lots/${alt.id}/book`)}
                      className="shrink-0 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs py-1.5 px-3 rounded-lg shadow transition flex items-center gap-1"
                    >
                      <span>Select</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* General Error */}
      {generalError && (
        <div className="p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{generalError}</span>
        </div>
      )}

      {/* Booking Form */}
      <form
        onSubmit={handleSubmit}
        className="bg-slate-800/80 backdrop-blur border border-slate-700/80 rounded-2xl p-5 space-y-4 shadow-xl"
      >
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5">
            Vehicle Registration Number
          </label>
          <div className="relative">
            <Car className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              required
              value={vehicleNo}
              onChange={(e) => setVehicleNo(e.target.value)}
              placeholder="MH 04 AB 1234"
              className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-10 pr-3.5 py-2.5 text-xs font-mono font-bold uppercase tracking-wider text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-indigo-400" />
              <span>Start Time</span>
            </label>
            <input
              type="datetime-local"
              required
              value={startInput}
              onChange={(e) => setStartInput(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-indigo-400" />
              <span>End Time</span>
            </label>
            <input
              type="datetime-local"
              required
              value={endInput}
              onChange={(e) => setEndInput(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Price estimate breakdown */}
        <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-700/60 space-y-1.5 text-xs">
          <div className="flex items-center justify-between text-slate-400">
            <span>Rate</span>
            <span>₹{pricePerHour}/hour</span>
          </div>
          <div className="flex items-center justify-between text-slate-400">
            <span>Estimated Duration</span>
            <span>
              {diffHours} hour{diffHours > 1 ? 's' : ''}
            </span>
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-white font-bold">
            <span>Estimated Total</span>
            <span className="text-base text-emerald-400 flex items-center">
              <IndianRupee className="w-4 h-4" />
              {estimatedAmount}
            </span>
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-3.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-[0.99] text-white font-bold text-sm shadow-xl shadow-indigo-600/30 flex items-center justify-center gap-2 transition disabled:opacity-50"
        >
          {isLoading ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <span>Confirm & Generate QR Pass</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>
    </div>
  );
};
