import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { endpoints } from '../api/endpoints';
import { Slot } from '../api/types';
import { subscribeLotSlots } from '../api/ws';
import { SlotGrid } from '../components/SlotGrid';
import { formatIST } from '../utils/date';
import {
  ArrowLeft,
  MapPin,
  IndianRupee,
  Sparkles,
  Zap,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  AlertCircle,
  Radio,
} from 'lucide-react';

export const LotDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const lotId = Number(id);
  const navigate = useNavigate();

  const [liveSlots, setLiveSlots] = useState<Slot[]>([]);
  const [lastWsUpdate, setLastWsUpdate] = useState<string | null>(null);

  const {
    data: lot,
    isLoading: isLotLoading,
    isError: isLotError,
    error: lotError,
  } = useQuery({
    queryKey: ['lot', lotId],
    queryFn: () => endpoints.getLot(lotId),
    enabled: !!lotId,
  });

  const { data: initialSlots = [], isLoading: isSlotsLoading } = useQuery({
    queryKey: ['lot-slots', lotId],
    queryFn: () => endpoints.getLotSlots(lotId),
    enabled: !!lotId,
  });

  const { data: forecast, isLoading: isForecastLoading } = useQuery({
    queryKey: ['lot-forecast', lotId],
    queryFn: () => endpoints.getLotForecast(lotId),
    enabled: !!lotId,
    refetchInterval: 30000,
  });

  useEffect(() => {
    if (initialSlots.length > 0) {
      setLiveSlots(initialSlots);
    }
  }, [initialSlots]);

  // WebSocket live slot subscription
  useEffect(() => {
    if (!lotId) return;

    const unsubscribe = subscribeLotSlots(lotId, (msg) => {
      setLiveSlots((prev) => {
        const next = [...prev];
        msg.slots.forEach((update) => {
          const index = next.findIndex((s) => s.id === update.slot_id);
          if (index !== -1) {
            next[index] = {
              ...next[index],
              status: update.status,
              updated_at: new Date().toISOString(),
            };
          }
        });
        return next;
      });
      setLastWsUpdate(new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' }));
    });

    return () => unsubscribe();
  }, [lotId]);

  if (isLotLoading || isSlotsLoading) {
    return (
      <div className="py-12 flex flex-col items-center justify-center space-y-3">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-slate-400">Loading lot information...</p>
      </div>
    );
  }

  if (isLotError || !lot) {
    return (
      <div className="p-6 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-center space-y-3 my-8">
        <AlertCircle className="w-8 h-8 text-rose-400 mx-auto" />
        <h3 className="font-bold text-white text-sm">Failed to Load Lot</h3>
        <p className="text-xs text-rose-300">{(lotError as any)?.message || 'Lot not found'}</p>
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-xl bg-slate-800 text-white hover:bg-slate-700 transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Lots</span>
        </Link>
      </div>
    );
  }

  const nonBufferSlots = liveSlots.filter((s) => !s.is_buffer);
  const freeCount = nonBufferSlots.filter((s) => s.status === 'free').length;
  const isLotFull = freeCount === 0;

  return (
    <div className="space-y-5 pb-24">
      {/* Header Bar */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-300 hover:text-white p-2 rounded-xl bg-slate-800/80 border border-slate-700/80 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>

        <div className="flex items-center gap-2">
          {lastWsUpdate && (
            <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
              <Radio className="w-3 h-3 animate-pulse" />
              <span>CCTV Live {lastWsUpdate}</span>
            </div>
          )}
        </div>
      </div>

      {/* Lot Summary Card */}
      <div className="bg-slate-800/80 backdrop-blur border border-slate-700/80 rounded-2xl p-4 sm:p-5 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <div>
            <h1 className="text-xl font-black text-white tracking-tight">{lot.name}</h1>
            <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-1">
              <MapPin className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              <span>{lot.address}</span>
            </p>
          </div>

          <div className="flex items-center gap-3 self-start sm:self-auto">
            <div className="flex items-center gap-1 bg-indigo-500/10 border border-indigo-500/30 px-3 py-1.5 rounded-xl text-indigo-300 font-bold text-sm">
              <IndianRupee className="w-4 h-4" />
              <span>{lot.price_per_hour}/hr</span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-slate-700/60 text-xs">
          <span className="flex items-center gap-1.5 text-slate-300 bg-slate-900/60 px-2.5 py-1 rounded-lg">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>
              <strong>{freeCount}</strong> Free
            </span>
          </span>
          <span className="flex items-center gap-1.5 text-slate-300 bg-slate-900/60 px-2.5 py-1 rounded-lg">
            <span className="w-2 h-2 rounded-full bg-rose-400" />
            <span>
              <strong>{nonBufferSlots.length - freeCount}</strong> Occupied
            </span>
          </span>
          <span className="flex items-center gap-1.5 text-slate-300 bg-slate-900/60 px-2.5 py-1 rounded-lg">
            <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
            <span>
              <strong>{lot.buffer_slots || 1}</strong> Buffer
            </span>
          </span>
        </div>
      </div>

      {/* AI / ML Forecast Card */}
      {forecast && (
        <div className="bg-gradient-to-r from-indigo-950/70 via-slate-900 to-purple-950/70 border border-indigo-500/30 rounded-2xl p-4 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-300 uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>Smart Availability Forecast</span>
            </div>
            <span className="text-[10px] text-indigo-400 bg-indigo-500/20 px-2 py-0.5 rounded-full font-semibold">
              {Math.round(forecast.confidence * 100)}% Confidence
            </span>
          </div>

          <p className="text-xs text-slate-200 leading-relaxed">
            {forecast.free_now > 0 ? (
              <span>
                <strong>{forecast.free_now} spots available right now</strong>. Ample space for immediate parking.
              </span>
            ) : forecast.next_free_at ? (
              <span>
                All regular spots currently occupied. Next spot likely to open around{' '}
                <strong className="text-amber-300 font-semibold">
                  {formatIST(forecast.next_free_at, false)}
                </strong>{' '}
                based on scheduled turnover patterns.
              </span>
            ) : (
              <span>High occupancy detected. Turnaround predicted in 15–20 minutes.</span>
            )}
          </p>

          <div className="mt-2 text-[10px] text-slate-400 flex items-center gap-1">
            <Zap className="w-3 h-3 text-amber-400" />
            <span>Method: {forecast.method}</span>
          </div>
        </div>
      )}

      {/* Slot Grid Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-sm font-bold text-white tracking-wide uppercase">
            Live Slot Layout ({liveSlots.length} Slots)
          </h2>
          <span className="text-[11px] text-slate-400">YOLO Vision Synced</span>
        </div>

        <SlotGrid slots={liveSlots} />
      </div>

      {/* Fixed / Sticky Book CTA at bottom */}
      <div className="fixed bottom-16 sm:bottom-6 left-0 right-0 max-w-md mx-auto px-4 z-30">
        <Link
          to={`/lots/${lot.id}/book`}
          className="w-full py-3.5 px-5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 active:scale-[0.99] text-white font-bold text-sm shadow-xl shadow-indigo-600/40 flex items-center justify-center gap-2 transition"
        >
          <span>{isLotFull ? 'Check Availability & Reserve' : 'Book a Slot Now'}</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
};
