/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  X,
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  ShieldCheck,
  AlertTriangle,
  Search,
  Copy,
  Check,
  HardDrive,
  Globe,
  Filter,
  Download,
  Fingerprint,
} from 'lucide-react';
import type { DailyAuthMetric, AuditLog } from '../types/auth';

interface AuthEventsModalProps {
  isOpen: boolean;
  onClose: () => void;
  day: DailyAuthMetric | null;
  email?: string;
  fallbackLogs?: AuditLog[];
}

export const AuthEventsModal: React.FC<AuthEventsModalProps> = ({
  isOpen,
  onClose,
  day,
  email,
  fallbackLogs = [],
}) => {
  const [events, setEvents] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filterType, setFilterType] = useState<'all' | 'success' | 'failed'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedSummary, setCopiedSummary] = useState(false);

  // Fetch events for the specific date
  const fetchDayEvents = useCallback(async () => {
    if (!day) return;
    setIsLoading(true);
    try {
      const emailQuery = email ? `&email=${encodeURIComponent(email)}` : '';
      const res = await fetch(`/api/auth/audit-logs?date=${encodeURIComponent(day.fullDate)}${emailQuery}`);
      if (res.ok) {
        const data = await res.json();
        setEvents(data.logs || []);
      } else {
        // Fallback to locally filtered logs
        const local = fallbackLogs.filter(l => l.timestamp.startsWith(day.fullDate));
        setEvents(local);
      }
    } catch (err) {
      console.warn('Failed to fetch day events, using fallback:', err);
      const local = fallbackLogs.filter(l => l.timestamp.startsWith(day.fullDate));
      setEvents(local);
    } finally {
      setIsLoading(false);
    }
  }, [day, email, fallbackLogs]);

  useEffect(() => {
    if (isOpen && day) {
      fetchDayEvents();
      setFilterType('all');
      setSearchQuery('');
    }
  }, [isOpen, day, fetchDayEvents]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Filtered list
  const filteredEvents = useMemo(() => {
    return events.filter(e => {
      const isFail = e.type === 'assertion_failed' || e.type.includes('failed');
      const isSuccess = !isFail;

      if (filterType === 'success' && !isSuccess) return false;
      if (filterType === 'failed' && !isFail) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesDetails = e.details.toLowerCase().includes(q);
        const matchesIp = e.ip?.toLowerCase().includes(q);
        const matchesUa = e.userAgent?.toLowerCase().includes(q);
        const matchesType = e.type.toLowerCase().includes(q);
        return matchesDetails || matchesIp || matchesUa || matchesType;
      }

      return true;
    });
  }, [events, filterType, searchQuery]);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleExportSummary = () => {
    if (!day) return;
    const summaryText = [
      `Authentication Audit Summary for ${day.fullDate} (${day.date})`,
      `Total Attempts: ${day.total}`,
      `Successful: ${day.successful} (${day.successRate}%)`,
      `Failed: ${day.failed}`,
      `Passkeys: ${day.passkeySuccessful}`,
      `----------------------------------------`,
      ...events.map(
        e => `[${e.timestamp}] ${e.type.toUpperCase()}: ${e.details} | IP: ${e.ip || 'N/A'}`
      ),
    ].join('\n');

    navigator.clipboard.writeText(summaryText);
    setCopiedSummary(true);
    setTimeout(() => setCopiedSummary(false), 2000);
  };

  if (!isOpen || !day) return null;

  // Format date display
  const dateObj = new Date(`${day.fullDate}T12:00:00`);
  const formattedDayTitle = dateObj.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div
      id="modal-auth-events"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-xs transition-opacity duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-3xl max-h-[90vh] rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                <Calendar className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Authentication Events: {formattedDayTitle}
                </h3>
                <p className="text-xs text-slate-500">
                  Timeframe: <span className="font-mono font-semibold text-slate-700">{day.fullDate}</span> (UTC 24h Window)
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="btn-export-day-summary"
              type="button"
              onClick={handleExportSummary}
              className="inline-flex items-center gap-1.5 py-1.5 px-3 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              {copiedSummary ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700">Copied</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5 text-slate-500" />
                  <span>Copy Log Summary</span>
                </>
              )}
            </button>

            <button
              id="btn-close-modal"
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Metric Summary Bar */}
        <div className="px-6 py-3 bg-slate-100/60 border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <span className="text-slate-600 font-medium">Day Totals:</span>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-white border border-slate-200 font-bold text-slate-800">
              {day.total} Attempts
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 font-bold text-emerald-700">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              <span>{day.successful} Successful</span>
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-rose-50 border border-rose-200 font-bold text-rose-700">
              <XCircle className="w-3 h-3 text-rose-600" />
              <span>{day.failed} Failed</span>
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-indigo-50 border border-indigo-200 font-bold text-indigo-700">
              <Fingerprint className="w-3 h-3 text-indigo-600" />
              <span>{day.passkeySuccessful} Passkey</span>
            </span>
          </div>

          <div className="font-semibold text-slate-700">
            Success Rate: <span className="font-bold text-emerald-600">{day.successRate}%</span>
          </div>
        </div>

        {/* Filters & Search Toolbar */}
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Segment Filter */}
          <div className="inline-flex rounded-xl p-1 bg-slate-100 border border-slate-200 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setFilterType('all')}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                filterType === 'all'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Events ({events.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterType('success')}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                filterType === 'success'
                  ? 'bg-white text-emerald-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Successful ({events.filter(e => !e.type.includes('failed')).length})
            </button>
            <button
              type="button"
              onClick={() => setFilterType('failed')}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                filterType === 'failed'
                  ? 'bg-white text-rose-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Failed ({events.filter(e => e.type.includes('failed')).length})
            </button>
          </div>

          {/* Search Input */}
          <div className="relative flex-1 max-w-xs">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search details, IP, UA..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            />
          </div>
        </div>

        {/* Events List Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {isLoading ? (
            <div className="py-16 text-center space-y-3">
              <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs text-slate-500">Loading timeframe audit logs...</p>
            </div>
          ) : filteredEvents.length === 0 ? (
            <div className="py-16 text-center border-2 border-dashed border-slate-200 rounded-xl space-y-2">
              <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                <Filter className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-semibold text-slate-700">No events found</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {searchQuery
                  ? `No logs match "${searchQuery}" for this timeframe.`
                  : `No ${filterType === 'all' ? '' : filterType} authentication events were recorded on ${day.date}.`}
              </p>
            </div>
          ) : (
            filteredEvents.map(event => {
              const isFailed = event.type === 'assertion_failed' || event.type.includes('failed');
              const timeStr = new Date(event.timestamp).toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              });

              return (
                <div
                  key={event.id}
                  className={`p-4 rounded-xl border transition-all ${
                    isFailed
                      ? 'bg-rose-50/40 border-rose-200/80 hover:border-rose-300'
                      : 'bg-white border-slate-200/80 hover:border-indigo-200 shadow-xs'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      {isFailed ? (
                        <div className="w-7 h-7 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center shrink-0 mt-0.5">
                          <XCircle className="w-4 h-4" />
                        </div>
                      ) : (
                        <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                          <CheckCircle2 className="w-4 h-4" />
                        </div>
                      )}

                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`text-xs font-bold px-2 py-0.5 rounded-md ${
                              isFailed
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {isFailed ? 'FAILED ATTEMPT' : 'SUCCESSFUL AUTH'}
                          </span>
                          <span className="text-xs font-mono font-semibold text-slate-800">
                            {event.type}
                          </span>
                          <span className="text-[11px] text-slate-400 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>{timeStr}</span>
                          </span>
                        </div>

                        <p className="text-xs text-slate-700 leading-relaxed font-normal">
                          {event.details}
                        </p>

                        <div className="flex items-center gap-4 text-[11px] text-slate-500 pt-1">
                          {event.ip && (
                            <span className="flex items-center gap-1 font-mono">
                              <Globe className="w-3 h-3 text-slate-400" />
                              <span>IP: {event.ip}</span>
                            </span>
                          )}
                          {event.userAgent && (
                            <span className="flex items-center gap-1 truncate max-w-md">
                              <HardDrive className="w-3 h-3 text-slate-400 shrink-0" />
                              <span className="truncate">{event.userAgent}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleCopy(JSON.stringify(event, null, 2), event.id)}
                      className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer shrink-0"
                      title="Copy event JSON"
                    >
                      {copiedId === event.id ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <div className="text-xs text-slate-500 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Showing {filteredEvents.length} of {events.length} cryptographic records</span>
          </div>
          <button
            id="btn-close-modal-bottom"
            type="button"
            onClick={onClose}
            className="py-1.5 px-4 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer shadow-xs"
          >
            Close Timeframe View
          </button>
        </div>
      </div>
    </div>
  );
};
