/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Key, 
  Trash2, 
  ShieldAlert, 
  RefreshCw, 
  Clock, 
  Smartphone, 
  HardDrive, 
  Cloud, 
  CheckCircle2, 
  AlertOctagon, 
  Copy, 
  Check, 
  History
} from 'lucide-react';
import type { RegisteredPasskey, AuditLog, AuthAuditMetricsSummary, DateRangeSelection } from '../types/auth';
import { AuthMetricsDashboard } from './AuthMetricsDashboard';

interface CredentialsAuditProps {
  email: string;
}

export const CredentialsAudit: React.FC<CredentialsAuditProps> = ({ email }) => {
  const [passkeys, setPasskeys] = useState<RegisteredPasskey[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [metrics, setMetrics] = useState<AuthAuditMetricsSummary | null>(null);
  const [dateRange, setDateRange] = useState<DateRangeSelection>({
    preset: '30',
    startDate: '',
    endDate: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchData = useCallback(async (customRange?: DateRangeSelection) => {
    setIsLoading(true);
    try {
      const activeRange = customRange || dateRange;
      let metricsUrl = `/api/auth/audit-metrics?email=${encodeURIComponent(email)}`;
      if (activeRange.preset === 'custom' && activeRange.startDate && activeRange.endDate) {
        metricsUrl += `&startDate=${encodeURIComponent(activeRange.startDate)}&endDate=${encodeURIComponent(activeRange.endDate)}`;
      } else {
        metricsUrl += `&days=${encodeURIComponent(activeRange.preset || '30')}`;
      }

      const [keysRes, logsRes, metricsRes] = await Promise.all([
        fetch(`/api/auth/user-passkeys?email=${encodeURIComponent(email)}`),
        fetch('/api/auth/audit-logs'),
        fetch(metricsUrl),
      ]);

      if (keysRes.ok) {
        const keysData = await keysRes.json();
        setPasskeys(keysData.passkeys || []);
      }

      if (logsRes.ok) {
        const logsData = await logsRes.json();
        setAuditLogs(logsData.logs || []);
      }

      if (metricsRes.ok) {
        const metricsData = await metricsRes.json();
        setMetrics(metricsData);
      }
    } catch (err) {
      console.error('Failed to load credentials, audit logs, or metrics:', err);
    } finally {
      setIsLoading(false);
    }
  }, [email, dateRange]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDateRangeChange = (newRange: DateRangeSelection) => {
    setDateRange(newRange);
    fetchData(newRange);
  };

  const handleSimulateAttempt = async (status: 'success' | 'failed') => {
    try {
      const res = await fetch('/api/auth/simulate-auth-attempt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          status,
          type: status === 'success' ? 'assertion_verified' : 'assertion_failed',
          reason: status === 'failed' ? 'Biometric sensor timeout after 30s' : undefined,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.metrics) {
          setMetrics(data.metrics);
        }
        if (data.log) {
          setAuditLogs(prev => [data.log, ...prev]);
        }
      }
    } catch (err) {
      console.error('Failed to simulate auth attempt:', err);
    }
  };

  const handleDeletePasskey = async (credentialId: string) => {
    if (!confirm('Are you sure you want to revoke this passkey? You will no longer be able to authenticate with this biometric credential.')) {
      return;
    }

    try {
      const res = await fetch(`/api/auth/user-passkeys/${encodeURIComponent(credentialId)}?email=${encodeURIComponent(email)}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setPasskeys(prev => prev.filter(p => p.credentialId !== credentialId));
        fetchData();
      }
    } catch (err) {
      console.error('Failed to delete passkey:', err);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(text);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-lg font-bold text-slate-900">
            Registered Credentials &amp; Security Audit Trail
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Active FIDO2 credentials, 30-day authentication analytics, and tamper-evident event log for <span className="font-semibold text-slate-800">{email}</span>.
          </p>
        </div>
        <button
          id="btn-refresh-audit-records"
          type="button"
          onClick={fetchData}
          disabled={isLoading}
          className="inline-flex items-center gap-2 py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh Records</span>
        </button>
      </div>

      {/* Mini Dashboard with Recharts */}
      <div id="credentials-metrics-dashboard">
        <AuthMetricsDashboard
          metrics={metrics}
          isLoading={isLoading}
          onRefresh={() => fetchData()}
          onSimulateAttempt={handleSimulateAttempt}
          email={email}
          auditLogs={auditLogs}
          dateRange={dateRange}
          onDateRangeChange={handleDateRangeChange}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Passkeys Column */}
        <div className="lg:col-span-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Key className="w-4 h-4 text-indigo-600" />
              <span>Active Registered Passkeys ({passkeys.length})</span>
            </h3>
          </div>

          {passkeys.length === 0 ? (
            <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-8 text-center">
              <Key className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <div className="text-sm font-semibold text-slate-700">No passkeys registered yet</div>
              <p className="text-xs text-slate-500 mt-1">
                Go to the &quot;Passkey Auth&quot; tab to register your first on-device biometric passkey.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {passkeys.map((pk) => (
                <div
                  key={pk.credentialId}
                  className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                        <Smartphone className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-semibold text-xs text-slate-900">
                          {pk.nickname || 'Platform Passkey'}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          Created {new Date(pk.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeletePasskey(pk.credentialId)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      title="Revoke passkey"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Metadata pills */}
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                      <div className="text-slate-400">Replay Counter:</div>
                      <div className="font-mono font-semibold text-slate-800">{pk.counter}</div>
                    </div>
                    <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                      <div className="text-slate-400">Cloud Sync (Multi-Device):</div>
                      <div className="font-semibold text-emerald-700 flex items-center gap-1">
                        <Cloud className="w-3 h-3" />
                        <span>{pk.backedUp ? 'Yes (Synced)' : 'Device-Bound'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Credential ID */}
                  <div>
                    <div className="text-[11px] text-slate-400 mb-1">Credential ID:</div>
                    <div className="flex items-center gap-2 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-200">
                      <code className="text-[10px] font-mono text-slate-700 truncate flex-1">
                        {pk.credentialId}
                      </code>
                      <button
                        type="button"
                        onClick={() => handleCopy(pk.credentialId)}
                        className="text-slate-400 hover:text-slate-700"
                        title="Copy credential ID"
                      >
                        {copiedId === pk.credentialId ? (
                          <Check className="w-3 h-3 text-emerald-600" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Security Audit Log Column */}
        <div className="lg:col-span-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <History className="w-4 h-4 text-indigo-600" />
              <span>Real-Time Security Audit Log ({auditLogs.length})</span>
            </h3>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs max-h-[580px] overflow-y-auto divide-y divide-slate-100">
            {auditLogs.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                No security events logged yet.
              </div>
            ) : (
              auditLogs.map((log) => {
                const isError = log.type.includes('failed');
                const isReset = log.type.includes('password_reset');
                const isPasskey = log.type.includes('passkey') || log.type.includes('assertion');

                return (
                  <div key={log.id} className="py-3 first:pt-0 last:pb-0 space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span
                        className={`font-semibold text-[11px] font-mono px-2 py-0.5 rounded ${
                          isError
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : isReset
                            ? 'bg-amber-50 text-amber-800 border border-amber-200'
                            : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                        }`}
                      >
                        {log.type}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-xs text-slate-700 leading-relaxed break-words">
                      {log.details}
                    </p>
                    <div className="text-[10px] text-slate-400">
                      User: <span className="font-mono text-slate-600">{log.email}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
