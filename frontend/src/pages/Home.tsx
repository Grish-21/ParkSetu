import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { endpoints } from '../api/endpoints';
import { MapView } from '../components/MapView';
import { LotCard } from '../components/LotCard';
import { localInputToUtcIso, utcToLocalInput } from '../utils/date';
import {
  Compass,
  Filter,
  Search,
  Clock,
  Layers,
  MapPin,
  RefreshCw,
  AlertCircle,
  X,
} from 'lucide-react';

const FALLBACK_LAT = 19.2813;
const FALLBACK_LNG = 72.8689;

export const Home: React.FC = () => {
  const [coords, setCoords] = useState<{ lat: number; lng: number }>({
    lat: FALLBACK_LAT,
    lng: FALLBACK_LNG,
  });
  const [geoStatus, setGeoStatus] = useState<'prompt' | 'granted' | 'fallback'>('prompt');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Time window filter
  const [startInput, setStartInput] = useState(() => utcToLocalInput(new Date().toISOString()));
  const [endInput, setEndInput] = useState(() => {
    const end = new Date(Date.now() + 60 * 60 * 1000);
    return utcToLocalInput(end.toISOString());
  });
  const [isWindowFilterActive, setIsWindowFilterActive] = useState(false);

  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCoords({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          });
          setGeoStatus('granted');
        },
        (_err) => {
          setGeoStatus('fallback');
        },
        { timeout: 5000 }
      );
    } else {
      setGeoStatus('fallback');
    }
  }, []);

  const startUtc = isWindowFilterActive ? localInputToUtcIso(startInput) : undefined;
  const endUtc = isWindowFilterActive ? localInputToUtcIso(endInput) : undefined;

  const {
    data: lots = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['nearby-lots', coords.lat, coords.lng, startUtc, endUtc],
    queryFn: () =>
      endpoints.getNearbyLots({
        lat: coords.lat,
        lng: coords.lng,
        radius_km: 10,
        start: startUtc,
        end: endUtc,
      }),
    refetchInterval: 15000, // live polling fallback
  });

  const filteredLots = lots.filter(
    (lot) =>
      lot.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lot.address.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-4 pb-20">
      {/* Location header */}
      <div className="flex items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-1.5 text-xs text-slate-300">
          <MapPin className="w-4 h-4 text-indigo-400 shrink-0" />
          <span className="font-semibold truncate">
            {geoStatus === 'granted' ? 'Using Your GPS Location' : 'Mira Bhayandar, Maharashtra'}
          </span>
          {geoStatus === 'fallback' && (
            <span className="text-[10px] text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">
              Default
            </span>
          )}
        </div>

        <button
          onClick={() => {
            if ('geolocation' in navigator) {
              navigator.geolocation.getCurrentPosition(
                (pos) => {
                  setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
                  setGeoStatus('granted');
                },
                () => {}
              );
            }
            refetch();
          }}
          className="flex items-center gap-1 text-[11px] font-semibold text-indigo-400 hover:text-indigo-300 p-1.5 rounded-lg hover:bg-slate-800 transition"
        >
          <Compass className="w-3.5 h-3.5" />
          <span>Locate</span>
        </button>
      </div>

      {/* Map view */}
      <div className="relative">
        <MapView
          lots={lots}
          userLat={coords.lat}
          userLng={coords.lng}
          centerLat={coords.lat}
          centerLng={coords.lng}
          zoom={13}
          className="h-64 sm:h-72 w-full rounded-2xl overflow-hidden border border-slate-700/80 shadow-xl"
        />
        <div className="absolute top-3 left-3 bg-slate-900/85 backdrop-blur-md px-2.5 py-1 rounded-lg border border-slate-700 text-[11px] text-slate-300 flex items-center gap-1.5 z-[1000]">
          <Layers className="w-3.5 h-3.5 text-indigo-400" />
          <span>Live Lot Map</span>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search station, mall, petrol pump..."
              className="w-full bg-slate-800/80 border border-slate-700 rounded-xl pl-9 pr-8 py-2.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl border text-xs font-semibold transition ${
              isWindowFilterActive || showFilters
                ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300'
                : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Filter className="w-4 h-4" />
            <span className="hidden xs:inline">Filter</span>
            {isWindowFilterActive && (
              <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
            )}
          </button>
        </div>

        {/* Collapsible Time Window Filter */}
        {showFilters && (
          <div className="p-3.5 bg-slate-800/90 border border-slate-700/80 rounded-2xl space-y-3 animate-in fade-in">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-indigo-400" />
                <span>Reserve Time Window Filter</span>
              </span>
              <button
                onClick={() => {
                  setIsWindowFilterActive(!isWindowFilterActive);
                }}
                className={`text-[11px] font-bold px-2 py-0.5 rounded ${
                  isWindowFilterActive
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-slate-700 text-slate-400'
                }`}
              >
                {isWindowFilterActive ? 'Filter Active' : 'Enable Filter'}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Start Time</label>
                <input
                  type="datetime-local"
                  value={startInput}
                  onChange={(e) => setStartInput(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">End Time</label>
                <input
                  type="datetime-local"
                  value={endInput}
                  onChange={(e) => setEndInput(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Nearby Lots List */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <h2 className="text-sm font-bold text-white tracking-wide uppercase">
            Nearby Lots ({filteredLots.length})
          </h2>
          <span className="text-[11px] text-slate-400">Sorted by distance</span>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="h-28 rounded-2xl bg-slate-800/40 border border-slate-700/50 animate-pulse"
              />
            ))}
          </div>
        ) : isError ? (
          <div className="p-6 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-center space-y-2">
            <AlertCircle className="w-6 h-6 text-rose-400 mx-auto" />
            <p className="text-xs text-rose-300">
              {(error as any)?.message || 'Failed to load nearby lots'}
            </p>
            <button
              onClick={() => refetch()}
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-rose-600/30 text-rose-200 hover:bg-rose-600/50 transition"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry</span>
            </button>
          </div>
        ) : filteredLots.length === 0 ? (
          <div className="p-8 text-center bg-slate-800/40 rounded-2xl border border-slate-700/60">
            <p className="text-xs text-slate-400">No parking lots matched your criteria.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredLots.map((lot) => (
              <LotCard key={lot.id} lot={lot} hasFilterWindow={isWindowFilterActive} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
