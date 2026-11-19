import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { endpoints } from '../../api/endpoints';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import {
  BarChart3,
  TrendingUp,
  CalendarCheck,
  IndianRupee,
  AlertTriangle,
  UserX,
  Building2,
  Clock,
  Filter,
} from 'lucide-react';

export const AdminStats: React.FC = () => {
  const [selectedLotId, setSelectedLotId] = useState<number | undefined>(undefined);

  // Fetch lots list for dropdown filter
  const { data: lots = [] } = useQuery({
    queryKey: ['admin-lots-list'],
    queryFn: () => endpoints.getNearbyLots({ lat: 19.2813, lng: 72.8689, radius_km: 20 }),
  });

  const { data: stats, isLoading, isError, error } = useQuery({
    queryKey: ['admin-stats', selectedLotId],
    queryFn: () => endpoints.getAdminStats(selectedLotId),
  });

  // Format hour for charts (e.g. 9 -> '9 AM')
  const formattedHourlyData = (stats?.occupancy_by_hour || []).map((item) => {
    const hr = item.hour;
    const label = hr === 12 ? '12 PM' : hr > 12 ? `${hr - 12} PM` : `${hr} AM`;
    return {
      hourLabel: label,
      occupancy: item.avg_occupancy,
    };
  });

  // Prepare peak hours bar data
  const peakHoursData = (stats?.peak_hours || [11, 17, 18, 19]).map((hr) => {
    const label = hr === 12 ? '12 PM' : hr > 12 ? `${hr - 12} PM` : `${hr} AM`;
    const matched = stats?.occupancy_by_hour.find((o) => o.hour === hr);
    return {
      hourLabel: label,
      occupancy: matched ? matched.avg_occupancy : 90,
    };
  });

  return (
    <div className="space-y-5 pb-20 max-w-4xl mx-auto">
      {/* Header & Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
        <div>
          <h1 className="text-xl font-black text-white tracking-tight">
            City Analytics & Stats
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Mira Bhayandar Municipal Corporation Parking Insights
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={selectedLotId || ''}
            onChange={(e) => setSelectedLotId(e.target.value ? Number(e.target.value) : undefined)}
            className="bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-500"
          >
            <option value="">All Lots (City Aggregate)</option>
            {lots.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 rounded-2xl bg-slate-800/40 animate-pulse border border-slate-700/50" />
          ))}
        </div>
      ) : isError || !stats ? (
        <div className="p-6 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-center text-xs text-rose-300">
          {(error as any)?.message || 'Failed to load analytics'}
        </div>
      ) : (
        <>
          {/* KPI Stat Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Total Bookings */}
            <div className="bg-slate-800/80 backdrop-blur border border-slate-700/80 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Bookings
                </span>
                <CalendarCheck className="w-4 h-4 text-indigo-400" />
              </div>
              <div className="text-2xl font-black text-white">{stats.bookings_total}</div>
              <div className="text-[11px] text-emerald-400 flex items-center gap-1 mt-1 font-semibold">
                <TrendingUp className="w-3 h-3" />
                <span>+18% this week</span>
              </div>
            </div>

            {/* Total Revenue */}
            <div className="bg-slate-800/80 backdrop-blur border border-slate-700/80 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Revenue
                </span>
                <IndianRupee className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-2xl font-black text-white flex items-center">
                <span>₹{stats.revenue.toLocaleString('en-IN')}</span>
              </div>
              <div className="text-[11px] text-slate-400 mt-1">From parking turnover</div>
            </div>

            {/* No Show Rate */}
            <div className="bg-slate-800/80 backdrop-blur border border-slate-700/80 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  No-Show Rate
                </span>
                <UserX className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-2xl font-black text-white">
                {(stats.no_show_rate * 100).toFixed(1)}%
              </div>
              <div className="text-[11px] text-amber-400/90 mt-1">Auto-released by timer</div>
            </div>

            {/* Overstay Rate */}
            <div className="bg-slate-800/80 backdrop-blur border border-slate-700/80 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Overstay Rate
                </span>
                <AlertTriangle className="w-4 h-4 text-rose-400" />
              </div>
              <div className="text-2xl font-black text-white">
                {(stats.overstay_rate * 100).toFixed(1)}%
              </div>
              <div className="text-[11px] text-rose-400/90 mt-1">1.5x penalty rate applied</div>
            </div>
          </div>

          {/* Line Chart: Occupancy By Hour */}
          <div className="bg-slate-800/80 backdrop-blur border border-slate-700/80 rounded-3xl p-5 shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white tracking-wide uppercase">
                  Occupancy by Hour (%)
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Hourly average utilization across parking spots
                </p>
              </div>
              <span className="text-[11px] text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-full font-semibold border border-indigo-500/20">
                Peak: 98% at 6 PM
              </span>
            </div>

            <div className="h-64 w-full pt-3">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={formattedHourlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                  <XAxis
                    dataKey="hourLabel"
                    stroke="#94a3b8"
                    fontSize={11}
                    tickLine={false}
                  />
                  <YAxis
                    stroke="#94a3b8"
                    fontSize={11}
                    tickLine={false}
                    domain={[0, 100]}
                    unit="%"
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      borderColor: '#475569',
                      borderRadius: '12px',
                      fontSize: '12px',
                      color: '#fff',
                    }}
                    formatter={(val: any) => [`${val}% Occupancy`, 'Occupancy']}
                  />
                  <Line
                    type="monotone"
                    dataKey="occupancy"
                    stroke="#6366f1"
                    strokeWidth={3}
                    dot={{ fill: '#818cf8', r: 4 }}
                    activeDot={{ r: 6, fill: '#4f46e5' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Bar Chart: Peak Hours Load */}
          <div className="bg-slate-800/80 backdrop-blur border border-slate-700/80 rounded-3xl p-5 shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white tracking-wide uppercase">
                  Top Congestion / Peak Windows
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Hours requiring active driver rerouting
                </p>
              </div>
              <Clock className="w-4 h-4 text-amber-400" />
            </div>

            <div className="h-52 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={peakHoursData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                  <XAxis
                    dataKey="hourLabel"
                    stroke="#94a3b8"
                    fontSize={11}
                    tickLine={false}
                  />
                  <YAxis
                    stroke="#94a3b8"
                    fontSize={11}
                    tickLine={false}
                    domain={[0, 100]}
                    unit="%"
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      borderColor: '#475569',
                      borderRadius: '12px',
                      fontSize: '12px',
                      color: '#fff',
                    }}
                    formatter={(val: any) => [`${val}% Capacity`, 'Occupancy']}
                  />
                  <Bar
                    dataKey="occupancy"
                    fill="#f59e0b"
                    radius={[6, 6, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
