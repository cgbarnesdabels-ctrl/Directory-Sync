/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Fingerprint,
  TrendingUp,
  Activity,
  Layers,
  BarChart3,
  PieChart as PieIcon,
  Sparkles,
  AlertTriangle,
  RotateCw,
  ExternalLink,
  Smartphone,
} from 'lucide-react';
import type { AuthAuditMetricsSummary, DailyAuthMetric, AuditLog, DateRangeSelection } from '../types/auth';
import { AuthEventsModal } from './AuthEventsModal';
import { DateRangePicker } from './DateRangePicker';
import { IosMobilePopWidget } from './IosMobilePopWidget';

interface AuthMetricsDashboardProps {
  metrics: AuthAuditMetricsSummary | null;
  isLoading: boolean;
  onRefresh: () => void;
  onSimulateAttempt?: (status: 'success' | 'failed') => Promise<void>;
  email?: string;
  auditLogs?: AuditLog[];
  dateRange?: DateRangeSelection;
  onDateRangeChange?: (newRange: DateRangeSelection) => void;
}

// Custom High-Contrast Tooltip adhering to Anti-Slop Guidelines
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload || !payload.length) return null;

  const data: DailyAuthMetric = payload[0]?.payload;
  if (!data) return null;

  return (
    <div className="bg-slate-900 text-white rounded-xl p-3.5 shadow-xl border border-slate-800 text-xs space-y-2 min-w-[210px] pointer-events-none">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <span className="font-bold text-slate-200">{data.date}</span>
        <span className="text-[10px] font-mono text-slate-400">{data.fullDate}</span>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-emerald-400 font-medium">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>Successful Logins</span>
          </span>
          <span className="font-mono font-bold">{data.successful}</span>
        </div>

        <div className="flex items-center justify-between text-rose-400 font-medium">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-400" />
            <span>Failed Attempts</span>
          </span>
          <span className="font-mono font-bold">{data.failed}</span>
        </div>

        <div className="pt-1.5 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-300">
          <span>Success Rate</span>
          <span className={`font-mono font-bold ${data.successRate >= 90 ? 'text-emerald-400' : 'text-amber-400'}`}>
            {data.successRate}%
          </span>
        </div>

        <div className="text-[10px] text-slate-400 flex justify-between">
          <span>Passkey WebAuthn:</span>
          <span className="font-mono text-indigo-300">{data.passkeySuccessful}</span>
        </div>

        <div className="pt-1.5 border-t border-slate-800 text-[10px] text-indigo-300 font-semibold flex items-center justify-between">
          <span>👆 Click point to view events</span>
          <ExternalLink className="w-3 h-3 text-indigo-400" />
        </div>
      </div>
    </div>
  );
};

export const AuthMetricsDashboard: React.FC<AuthMetricsDashboardProps> = ({
  metrics,
  isLoading,
  onRefresh,
  onSimulateAttempt,
  email = 'dabelstech@moredesa.com',
  auditLogs,
  dateRange,
  onDateRangeChange,
}) => {
  const [localRange, setLocalRange] = useState<DateRangeSelection>({
    preset: '30',
    startDate: '',
    endDate: '',
  });
  const [chartType, setChartType] = useState<'area' | 'bar' | 'factors'>('area');
  const [isSimulating, setIsSimulating] = useState(false);
  const [selectedDay, setSelectedDay] = useState<DailyAuthMetric | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isIosWidgetOpen, setIsIosWidgetOpen] = useState(false);

  const activeRange = dateRange || localRange;

  const handleRangeChange = (newRange: DateRangeSelection) => {
    if (onDateRangeChange) {
      onDateRangeChange(newRange);
    } else {
      setLocalRange(newRange);
    }
  };

  const handleSelectDay = (day: DailyAuthMetric) => {
    if (!day) return;
    setSelectedDay(day);
    setIsModalOpen(true);
  };

  const handleChartClick = (state: any) => {
    if (state && state.activePayload && state.activePayload.length > 0) {
      const payloadData: DailyAuthMetric = state.activePayload[0].payload;
      if (payloadData) {
        handleSelectDay(payloadData);
      }
    }
  };

  // Metrics array returned from the server for the exact requested range
  const filteredDailyMetrics = useMemo(() => {
    return metrics?.dailyMetrics || [];
  }, [metrics]);

  const xAxisInterval = useMemo(() => {
    const len = filteredDailyMetrics.length;
    if (len > 60) return Math.ceil(len / 8);
    if (len > 30) return 4;
    if (len > 15) return 2;
    return 0;
  }, [filteredDailyMetrics]);

  // Aggregate totals for the active range
  const rangeTotals = useMemo(() => {
    const list = filteredDailyMetrics;
    const total = list.reduce((acc, d) => acc + d.total, 0);
    const successful = list.reduce((acc, d) => acc + d.successful, 0);
    const failed = list.reduce((acc, d) => acc + d.failed, 0);
    const passkeys = list.reduce((acc, d) => acc + d.passkeySuccessful, 0);
    const rate = total > 0 ? Math.round((successful / total) * 1000) / 10 : 100;
    const passkeyShare = successful > 0 ? Math.round((passkeys / successful) * 1000) / 10 : 0;

    return {
      total,
      successful,
      failed,
      passkeys,
      rate,
      passkeyShare,
    };
  }, [filteredDailyMetrics]);

  const handleSimulate = async (status: 'success' | 'failed') => {
    if (!onSimulateAttempt) return;
    setIsSimulating(true);
    try {
      await onSimulateAttempt(status);
    } finally {
      setIsSimulating(false);
    }
  };

  const factorColors = ['#4f46e5', '#0ea5e9', '#10b981'];
  const failureColors = ['#f43f5e', '#fb7185', '#fda4af'];

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
      {/* Header & Range Controls */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Activity className="w-4 h-4 text-indigo-600" />
              <span>Authentication Performance &amp; Security Analytics</span>
            </h3>
            <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 font-semibold flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
              <span>
                {activeRange.preset === 'custom'
                  ? `Custom Range (${metrics?.days || 0} Days)`
                  : `${activeRange.preset}-Day Window`}
              </span>
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Visualizing successful vs failed authentication attempts across WebAuthn passkeys and fallback channels.
            {metrics?.startDate && metrics?.endDate && (
              <span className="ml-1.5 font-medium text-slate-700">
                ({metrics.startDate} – {metrics.endDate})
              </span>
            )}
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Customizable Date Range Picker */}
          <DateRangePicker
            selection={activeRange}
            onChange={handleRangeChange}
            isLoading={isLoading}
          />

          {/* Chart View Switcher */}
          <div className="inline-flex rounded-xl p-1 bg-slate-100 border border-slate-200 text-xs">
            <button
              type="button"
              onClick={() => setChartType('area')}
              title="Area Trend Chart"
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                chartType === 'area'
                  ? 'bg-white text-indigo-600 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setChartType('bar')}
              title="Bar Chart"
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                chartType === 'bar'
                  ? 'bg-white text-indigo-600 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setChartType('factors')}
              title="Factor & Failure Breakdown"
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                chartType === 'factors'
                  ? 'bg-white text-indigo-600 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <PieIcon className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* iOS Mobile Pop Widget Trigger & Live Simulators */}
          <div className="flex items-center gap-1.5 pl-1 border-l border-slate-200">
            <button
              id="btn-open-ios-widget-header"
              type="button"
              onClick={() => setIsIosWidgetOpen(prev => !prev)}
              className="py-1 px-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-[11px] font-semibold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
              title="Open iOS Mobile Pop Widget"
            >
              <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">iOS Widget</span>
            </button>

            <button
              id="btn-simulate-auth-success"
              type="button"
              disabled={isSimulating}
              onClick={() => handleSimulate('success')}
              className="py-1 px-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
              title="Simulate successful passkey authentication"
            >
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              <span>+ Success</span>
            </button>

            <button
              id="btn-simulate-auth-failed"
              type="button"
              disabled={isSimulating}
              onClick={() => handleSimulate('failed')}
              className="py-1 px-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
              title="Simulate failed authentication attempt"
            >
              <XCircle className="w-3 h-3 text-rose-600" />
              <span>+ Fail</span>
            </button>

            <button
              type="button"
              onClick={onRefresh}
              disabled={isLoading}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              title="Refresh metrics data"
            >
              <RotateCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* KPI Stat Cards (4 columns) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Attempts */}
        <div className="p-4 bg-slate-50/80 rounded-xl border border-slate-100 space-y-1">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>Total Attempts</span>
            <Activity className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="text-xl font-bold text-slate-900">
            {rangeTotals.total.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-500">
            Across {metrics?.days || activeRange.preset} calendar days
          </div>
        </div>

        {/* Successful Logins */}
        <div className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-100 space-y-1">
          <div className="flex items-center justify-between text-xs font-semibold text-emerald-800">
            <span>Successful Logins</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div className="text-xl font-bold text-emerald-700">
            {rangeTotals.successful.toLocaleString()}
          </div>
          <div className="text-[11px] text-emerald-700 font-medium flex items-center gap-1">
            <span>{rangeTotals.rate}% success rate</span>
          </div>
        </div>

        {/* Failed Attempts */}
        <div className="p-4 bg-rose-50/50 rounded-xl border border-rose-100 space-y-1">
          <div className="flex items-center justify-between text-xs font-semibold text-rose-800">
            <span>Failed Attempts</span>
            <XCircle className="w-3.5 h-3.5 text-rose-600" />
          </div>
          <div className="text-xl font-bold text-rose-700">
            {rangeTotals.failed.toLocaleString()}
          </div>
          <div className="text-[11px] text-rose-700 font-medium">
            {rangeTotals.total > 0 ? (100 - rangeTotals.rate).toFixed(1) : 0}% failure rate
          </div>
        </div>

        {/* Passkey Biometric Adoption */}
        <div className="p-4 bg-indigo-50/50 rounded-xl border border-indigo-100 space-y-1">
          <div className="flex items-center justify-between text-xs font-semibold text-indigo-800">
            <span>Passkey Adoption</span>
            <Fingerprint className="w-3.5 h-3.5 text-indigo-600" />
          </div>
          <div className="text-xl font-bold text-indigo-700">
            {rangeTotals.passkeyShare}%
          </div>
          <div className="text-[11px] text-indigo-700 font-medium">
            {rangeTotals.passkeys} of {rangeTotals.successful} were passwordless
          </div>
        </div>
      </div>

      {/* Main Chart Area */}
      <div className="pt-2 space-y-3">
        {/* Interactive Click Helper Banner with Quick Date Selectors */}
        <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs">
          <div className="flex items-center gap-1.5 text-slate-600 font-medium">
            <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse" />
            <span>Click any bar or line segment to inspect the cryptographic events for that date.</span>
          </div>
          <div className="flex items-center gap-1 text-[11px] text-slate-400">
            <span>Quick inspect:</span>
            {filteredDailyMetrics.slice(-5).map(day => (
              <button
                key={day.fullDate}
                type="button"
                onClick={() => handleSelectDay(day)}
                className="px-2 py-0.5 rounded-md bg-white hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-300 border border-slate-200 text-slate-700 font-mono text-[10px] font-semibold transition-colors cursor-pointer shadow-2xs"
                title={`Inspect events for ${day.date} (${day.fullDate})`}
              >
                {day.date}
              </button>
            ))}
          </div>
        </div>

        {chartType === 'area' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span className="font-semibold text-slate-700">Daily Authentication Trend (Successful vs Failed)</span>
              <div className="flex items-center gap-4 text-[11px]">
                <span className="flex items-center gap-1.5 text-slate-600">
                  <span className="w-2.5 h-2.5 rounded-xs bg-emerald-500" />
                  <span>Successful Logins</span>
                </span>
                <span className="flex items-center gap-1.5 text-slate-600">
                  <span className="w-2.5 h-2.5 rounded-xs bg-rose-500" />
                  <span>Failed Attempts</span>
                </span>
              </div>
            </div>

            <div className="h-64 w-full cursor-pointer">
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <AreaChart
                  data={filteredDailyMetrics}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  onClick={handleChartClick}
                >
                  <defs>
                    <linearGradient id="colorSuccess" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="colorFailed" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis
                    dataKey="date"
                    stroke="#94a3b8"
                    fontSize={11}
                    tickLine={false}
                    axisLine={{ stroke: '#e2e8f0' }}
                    interval={xAxisInterval}
                  />
                  <YAxis
                    stroke="#94a3b8"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="successful"
                    stroke="#10b981"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#colorSuccess)"
                    name="Successful"
                    activeDot={{
                      r: 6,
                      stroke: '#ffffff',
                      strokeWidth: 2,
                      cursor: 'pointer',
                      onClick: (_: any, payload: any) => {
                        if (payload?.payload) handleSelectDay(payload.payload);
                      },
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="failed"
                    stroke="#f43f5e"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorFailed)"
                    name="Failed"
                    activeDot={{
                      r: 6,
                      stroke: '#ffffff',
                      strokeWidth: 2,
                      cursor: 'pointer',
                      onClick: (_: any, payload: any) => {
                        if (payload?.payload) handleSelectDay(payload.payload);
                      },
                    }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {chartType === 'bar' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span className="font-semibold text-slate-700">Stacked Daily Volume Comparison</span>
              <div className="flex items-center gap-4 text-[11px]">
                <span className="flex items-center gap-1.5 text-slate-600">
                  <span className="w-2.5 h-2.5 rounded-xs bg-emerald-500" />
                  <span>Successful</span>
                </span>
                <span className="flex items-center gap-1.5 text-slate-600">
                  <span className="w-2.5 h-2.5 rounded-xs bg-rose-500" />
                  <span>Failed</span>
                </span>
              </div>
            </div>

            <div className="h-64 w-full cursor-pointer">
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <BarChart
                  data={filteredDailyMetrics}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  onClick={handleChartClick}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis
                    dataKey="date"
                    stroke="#94a3b8"
                    fontSize={11}
                    tickLine={false}
                    axisLine={{ stroke: '#e2e8f0' }}
                    interval={xAxisInterval}
                  />
                  <YAxis
                    stroke="#94a3b8"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar
                    dataKey="successful"
                    stackId="a"
                    fill="#10b981"
                    radius={[0, 0, 0, 0]}
                    name="Successful"
                    cursor="pointer"
                    onClick={(data: any) => {
                      if (data) handleSelectDay(data);
                    }}
                  />
                  <Bar
                    dataKey="failed"
                    stackId="a"
                    fill="#f43f5e"
                    radius={[3, 3, 0, 0]}
                    name="Failed"
                    cursor="pointer"
                    onClick={(data: any) => {
                      if (data) handleSelectDay(data);
                    }}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {chartType === 'factors' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-2">
            {/* Authentication Factor Share */}
            <div className="p-4 bg-slate-50/70 rounded-xl border border-slate-100 space-y-3">
              <div className="text-xs font-bold text-slate-800 flex items-center justify-between">
                <span>Successful Auth Method Distribution</span>
                <span className="text-[10px] text-indigo-600 font-semibold uppercase tracking-wider">Passkey Leading</span>
              </div>
              <div className="h-44 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                  <PieChart>
                    <Pie
                      data={metrics?.factorDistribution || []}
                      cx="50%"
                      cy="50%"
                      innerRadius={44}
                      outerRadius={68}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {(metrics?.factorDistribution || []).map((entry, index) => (
                        <Cell key={`cell-factor-${index}`} fill={entry.color || factorColors[index % factorColors.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val: any, name: any) => [`${val} attempts`, name]}
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '10px', fontSize: '11px', color: '#fff' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-1.5 pt-1 border-t border-slate-200/60 text-xs">
                {(metrics?.factorDistribution || []).map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between text-[11px] text-slate-600">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                      <span>{item.name}</span>
                    </span>
                    <span className="font-mono font-semibold text-slate-800">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Failure Mode Classification */}
            <div className="p-4 bg-slate-50/70 rounded-xl border border-slate-100 space-y-3">
              <div className="text-xs font-bold text-slate-800 flex items-center justify-between">
                <span>Failure Reasons Breakdown</span>
                <span className="text-[10px] text-rose-600 font-semibold uppercase tracking-wider">Security Telemetry</span>
              </div>
              <div className="h-44 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                  <PieChart>
                    <Pie
                      data={metrics?.failureDistribution || []}
                      cx="50%"
                      cy="50%"
                      innerRadius={44}
                      outerRadius={68}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {(metrics?.failureDistribution || []).map((entry, index) => (
                        <Cell key={`cell-fail-${index}`} fill={entry.color || failureColors[index % failureColors.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val: any, name: any) => [`${val} failures`, name]}
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '10px', fontSize: '11px', color: '#fff' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-1.5 pt-1 border-t border-slate-200/60 text-xs">
                {(metrics?.failureDistribution || []).map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between text-[11px] text-slate-600">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                      <span>{item.name}</span>
                    </span>
                    <span className="font-mono font-semibold text-slate-800">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Subtle Footer Telemetry Note */}
      <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-[11px] text-slate-400">
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>FIDO2 WebAuthn Level 2 attestation &amp; HMAC-secret counter audit tracking active.</span>
        </div>
        {metrics?.peakDay && (
          <div className="text-slate-500">
            Peak volume: <strong className="text-slate-700">{metrics.peakDay.attempts} attempts</strong> on {metrics.peakDay.date}
          </div>
        )}
      </div>

      {/* Timeframe Event Inspection Modal */}
      <AuthEventsModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        day={selectedDay}
        email={email}
        fallbackLogs={auditLogs}
      />

      {/* iOS Mobile Pop Widget (HIG-compliant, compact & mobile touch friendly) */}
      <IosMobilePopWidget
        metrics={metrics}
        email={email}
        onSimulateAttempt={onSimulateAttempt}
        onRefresh={onRefresh}
        isOpenDefault={isIosWidgetOpen}
        key={isIosWidgetOpen ? 'open' : 'closed'}
      />
    </div>
  );
};
