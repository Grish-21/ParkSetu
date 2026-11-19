import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { endpoints } from '../../api/endpoints';
import { Lot, Slot, CreateSlotInput, CreateLotInput } from '../../api/types';
import { SlotGrid } from '../../components/SlotGrid';
import { MapView } from '../../components/MapView';
import { subscribeLotSlots } from '../../api/ws';
import {
  Building2,
  Plus,
  MapPin,
  IndianRupee,
  Layers,
  Shield,
  CheckCircle2,
  AlertCircle,
  Radio,
  ArrowRight,
  Settings2,
} from 'lucide-react';

export const OwnerDashboard: React.FC = () => {
  const queryClient = useQueryClient();
  const [selectedLotId, setSelectedLotId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'slots' | 'define' | 'newLot'>('slots');

  // New lot form state
  const [newLotName, setNewLotName] = useState('');
  const [newLotAddress, setNewLotAddress] = useState('');
  const [newLotPrice, setNewLotPrice] = useState(30);
  const [newLotCoords, setNewLotCoords] = useState<{ lat: number; lng: number }>({
    lat: 19.2813,
    lng: 72.8689,
  });

  // Slot generation form state
  const [slotCount, setSlotCount] = useState(8);
  const [slotPrefix, setSlotPrefix] = useState('A');
  const [bufferSlotLabels, setBufferSlotLabels] = useState<Set<string>>(new Set());

  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );
  const [liveSlots, setLiveSlots] = useState<Slot[]>([]);

  // Fetch lots
  const { data: lots = [], isLoading: isLotsLoading } = useQuery({
    queryKey: ['owner-lots'],
    queryFn: () => endpoints.getNearbyLots({ lat: 19.2813, lng: 72.8689, radius_km: 20 }),
  });

  // Default to first lot if none selected
  useEffect(() => {
    if (lots.length > 0 && !selectedLotId) {
      setSelectedLotId(lots[0].id);
    }
  }, [lots, selectedLotId]);

  // Fetch slots for selected lot
  const { data: initialSlots = [], isLoading: isSlotsLoading } = useQuery({
    queryKey: ['lot-slots', selectedLotId],
    queryFn: () => (selectedLotId ? endpoints.getLotSlots(selectedLotId) : Promise.resolve([])),
    enabled: !!selectedLotId,
  });

  useEffect(() => {
    setLiveSlots(initialSlots);
  }, [initialSlots]);

  // Subscribe to live slot updates
  useEffect(() => {
    if (!selectedLotId) return;
    const unsub = subscribeLotSlots(selectedLotId, (msg) => {
      setLiveSlots((prev) => {
        const next = [...prev];
        msg.slots.forEach((update) => {
          const idx = next.findIndex((s) => s.id === update.slot_id);
          if (idx !== -1) {
            next[idx] = { ...next[idx], status: update.status };
          }
        });
        return next;
      });
    });
    return () => unsub();
  }, [selectedLotId]);

  // Create Lot Mutation
  const createLotMutation = useMutation({
    mutationFn: (data: CreateLotInput) => endpoints.createLot(data),
    onSuccess: (newLot) => {
      setFeedbackMsg({ type: 'success', text: `Lot "${newLot.name}" created successfully!` });
      queryClient.invalidateQueries({ queryKey: ['owner-lots'] });
      setSelectedLotId(newLot.id);
      setActiveTab('define');
      setNewLotName('');
      setNewLotAddress('');
    },
    onError: (err: any) => {
      setFeedbackMsg({ type: 'error', text: err.message || 'Failed to create lot.' });
    },
  });

  // Create/Replace Slots Mutation
  const defineSlotsMutation = useMutation({
    mutationFn: (data: { lotId: number; slots: CreateSlotInput[] }) =>
      endpoints.createSlots(data.lotId, data.slots),
    onSuccess: (createdSlots) => {
      setFeedbackMsg({
        type: 'success',
        text: `Configured ${createdSlots.length} slots for lot successfully!`,
      });
      queryClient.invalidateQueries({ queryKey: ['lot-slots', selectedLotId] });
      queryClient.invalidateQueries({ queryKey: ['owner-lots'] });
      setActiveTab('slots');
    },
    onError: (err: any) => {
      setFeedbackMsg({ type: 'error', text: err.message || 'Failed to define slots.' });
    },
  });

  const handleCreateLot = (e: React.FormEvent) => {
    e.preventDefault();
    createLotMutation.mutate({
      name: newLotName.trim(),
      address: newLotAddress.trim(),
      price_per_hour: Number(newLotPrice),
      lat: newLotCoords.lat,
      lng: newLotCoords.lng,
    });
  };

  const handleDefineSlots = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLotId) return;

    const slotsToCreate: CreateSlotInput[] = [];
    for (let i = 1; i <= slotCount; i++) {
      const label = `${slotPrefix}${i}`;
      slotsToCreate.push({
        label,
        polygon: null,
        is_buffer: bufferSlotLabels.has(label),
      });
    }

    defineSlotsMutation.mutate({
      lotId: selectedLotId,
      slots: slotsToCreate,
    });
  };

  const toggleBufferSlot = (label: string) => {
    const next = new Set(bufferSlotLabels);
    if (next.has(label)) {
      next.delete(label);
    } else {
      next.add(label);
    }
    setBufferSlotLabels(next);
  };

  const selectedLot = lots.find((l) => l.id === selectedLotId);

  return (
    <div className="space-y-4 pb-20 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between px-1">
        <div>
          <h1 className="text-xl font-black text-white tracking-tight">Owner Dashboard</h1>
          <p className="text-xs text-slate-400 mt-0.5">Manage parking lots, layout & buffer rules</p>
        </div>

        <button
          onClick={() => setActiveTab('newLot')}
          className="flex items-center gap-1.5 py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/30 transition"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add New Lot</span>
        </button>
      </div>

      {feedbackMsg && (
        <div
          className={`p-3 rounded-xl text-xs flex items-center justify-between gap-2 animate-in fade-in ${
            feedbackMsg.type === 'success'
              ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/15 border border-rose-500/30 text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedbackMsg.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{feedbackMsg.text}</span>
          </div>
          <button onClick={() => setFeedbackMsg(null)} className="font-bold text-xs p-1">
            ✕
          </button>
        </div>
      )}

      {/* Lot Selector Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {lots.map((lot) => (
          <button
            key={lot.id}
            onClick={() => {
              setSelectedLotId(lot.id);
              if (activeTab === 'newLot') setActiveTab('slots');
            }}
            className={`flex items-center gap-2 py-2 px-3 rounded-xl border text-xs font-semibold shrink-0 transition ${
              selectedLotId === lot.id && activeTab !== 'newLot'
                ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300 shadow-sm'
                : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>{lot.name}</span>
          </button>
        ))}
      </div>

      {/* Tab Navigation for Selected Lot */}
      {activeTab !== 'newLot' && (
        <div className="flex border-b border-slate-700/60 text-xs">
          <button
            onClick={() => setActiveTab('slots')}
            className={`py-2 px-4 font-bold border-b-2 transition ${
              activeTab === 'slots'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Live Slot Grid ({liveSlots.length})
          </button>
          <button
            onClick={() => setActiveTab('define')}
            className={`py-2 px-4 font-bold border-b-2 transition ${
              activeTab === 'define'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Configure Slots & Buffers
          </button>
        </div>
      )}

      {/* --- TAB 1: Live Slot Grid --- */}
      {activeTab === 'slots' && (
        <div className="space-y-4">
          {selectedLot && (
            <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-white tracking-tight">{selectedLot.name}</h2>
                <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                  <MapPin className="w-3.5 h-3.5 text-indigo-400" />
                  <span>{selectedLot.address}</span>
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-lg flex items-center gap-1">
                  <IndianRupee className="w-3.5 h-3.5" />
                  <span>{selectedLot.price_per_hour}/hr</span>
                </span>
                <span className="text-xs font-medium text-slate-300 bg-slate-900 px-2.5 py-1 rounded-lg">
                  {liveSlots.filter((s) => !s.is_buffer && s.status === 'free').length} Free
                </span>
              </div>
            </div>
          )}

          <div className="bg-slate-800/80 border border-slate-700/80 rounded-3xl p-5 shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                <span>Live YOLO Vision Grid</span>
              </span>
              <button
                onClick={() => setActiveTab('define')}
                className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
              >
                <Settings2 className="w-3.5 h-3.5" />
                <span>Edit Slots</span>
              </button>
            </div>
            <SlotGrid slots={liveSlots} />
          </div>
        </div>
      )}

      {/* --- TAB 2: Configure Slots & Buffer Rules --- */}
      {activeTab === 'define' && (
        <div className="bg-slate-800/80 border border-slate-700/80 rounded-3xl p-5 shadow-xl space-y-4">
          <div>
            <h2 className="text-base font-bold text-white tracking-tight">
              Define Slots for {selectedLot?.name}
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Specify the total slots and prefix. Buffer slots will be reserved for overstay safety
              and cannot be booked by drivers.
            </p>
          </div>

          <form onSubmit={handleDefineSlots} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Slot Label Prefix
                </label>
                <input
                  type="text"
                  required
                  value={slotPrefix}
                  onChange={(e) => setSlotPrefix(e.target.value.toUpperCase())}
                  placeholder="A"
                  maxLength={3}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-indigo-500 uppercase"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Total Slots Count
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  max={50}
                  value={slotCount}
                  onChange={(e) => setSlotCount(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Interactive buffer slot selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Toggle Buffer Slots (Reserved from Driver Booking)
              </label>
              <p className="text-[11px] text-slate-400 mb-2">
                Click slots below to toggle them as buffer reserve:
              </p>
              <div className="flex flex-wrap gap-2 p-3 bg-slate-900/60 rounded-2xl border border-slate-800">
                {Array.from({ length: slotCount }, (_, i) => `${slotPrefix}${i + 1}`).map(
                  (label) => {
                    const isBuffer = bufferSlotLabels.has(label);
                    return (
                      <button
                        key={label}
                        type="button"
                        onClick={() => toggleBufferSlot(label)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition flex items-center gap-1.5 ${
                          isBuffer
                            ? 'bg-slate-700 border-slate-500 text-slate-200 shadow-sm'
                            : 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300'
                        }`}
                      >
                        {isBuffer && <Shield className="w-3 h-3 text-slate-400" />}
                        <span>{label}</span>
                        <span className="text-[10px] font-normal opacity-70">
                          {isBuffer ? '(Buffer)' : '(Bookable)'}
                        </span>
                      </button>
                    );
                  }
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={defineSlotsMutation.isPending}
              className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition disabled:opacity-50"
            >
              {defineSlotsMutation.isPending ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Save & Generate Slots Layout</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>
      )}

      {/* --- TAB 3: Create New Lot Form --- */}
      {activeTab === 'newLot' && (
        <div className="bg-slate-800/80 border border-slate-700/80 rounded-3xl p-5 shadow-xl space-y-4 animate-in fade-in">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white tracking-tight">Register New Parking Lot</h2>
            <button
              onClick={() => setActiveTab('slots')}
              className="text-xs text-slate-400 hover:text-white"
            >
              Cancel
            </button>
          </div>

          <form onSubmit={handleCreateLot} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Lot / Business Name
              </label>
              <input
                type="text"
                required
                value={newLotName}
                onChange={(e) => setNewLotName(e.target.value)}
                placeholder="e.g. Maxus Cinema Basement Parking"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Full Street Address
              </label>
              <input
                type="text"
                required
                value={newLotAddress}
                onChange={(e) => setNewLotAddress(e.target.value)}
                placeholder="e.g. 150 Feet Road, Bhayandar West"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Hourly Rate (₹ / hour)
              </label>
              <input
                type="number"
                required
                min={10}
                max={500}
                value={newLotPrice}
                onChange={(e) => setNewLotPrice(Number(e.target.value))}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Click on Map to set Lat/Lng */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Pin Location on Map (Click to Set Coordinates)
              </label>
              <div className="flex items-center gap-2 text-[11px] text-slate-400 mb-2">
                <span>
                  Lat: <strong className="text-white">{newLotCoords.lat.toFixed(4)}</strong>
                </span>
                <span>
                  Lng: <strong className="text-white">{newLotCoords.lng.toFixed(4)}</strong>
                </span>
              </div>
              <MapView
                centerLat={newLotCoords.lat}
                centerLng={newLotCoords.lng}
                zoom={14}
                selectedCoord={newLotCoords}
                onMapClick={(lat, lng) => setNewLotCoords({ lat, lng })}
                className="h-56 w-full rounded-2xl overflow-hidden border border-slate-700"
              />
            </div>

            <button
              type="submit"
              disabled={createLotMutation.isPending}
              className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition disabled:opacity-50"
            >
              {createLotMutation.isPending ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Create Parking Lot</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
