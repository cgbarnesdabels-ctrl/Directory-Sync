/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Fingerprint,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Activity,
  ChevronDown,
  ChevronUp,
  X,
  Sparkles,
  Smartphone,
  Maximize2,
  Minimize2,
  RefreshCw,
  Lock,
  BatteryCharging,
  Wifi,
  Sliders,
  Calendar,
} from 'lucide-react';
import { useAuthOverlay } from '../context/AuthOverlayContext';
import type { AuthAuditMetricsSummary } from '../types/auth';

interface IosMobilePopWidgetProps {
  metrics: AuthAuditMetricsSummary | null;
  email?: string;
  onSimulateAttempt?: (status: 'success' | 'failed') => Promise<void>;
  onRefresh?: () => void;
  isOpenDefault?: boolean;
}

export const IosMobilePopWidget: React.FC<IosMobilePopWidgetProps> = ({
  metrics,
  email = 'dabelstech@moredesa.com',
  onSimulateAttempt,
  onRefresh,
  isOpenDefault = false,
}) => {
  const { triggerSignIn, setPreferMode } = useAuthOverlay();
  const [isOpen, setIsOpen] = useState(isOpenDefault);
  const [widgetMode, setWidgetMode] = useState<'compact_widget' | 'expanded_sheet'>('compact_widget');
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authFeedback, setAuthFeedback] = useState<'idle' | 'success' | 'failed'>('idle');

  // Sparkline data generation from dailyMetrics
  const sparklineData = (metrics?.dailyMetrics || []).slice(-10);
  const maxAttempt = Math.max(...sparklineData.map(d => d.total), 1);

  const handleTriggerBiometrics = async () => {
    setIsAuthenticating(true);
    setPreferMode('pop');
    try {
      await triggerSignIn(email, 'dabelstech.com', 'pop');
      setAuthFeedback('success');
      setTimeout(() => setAuthFeedback('idle'), 2500);
    } catch (err) {
      setAuthFeedback('failed');
      setTimeout(() => setAuthFeedback('idle'), 2500);
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleSimulate = async (type: 'success' | 'failed') => {
    if (!onSimulateAttempt) return;
    try {
      await onSimulateAttempt(type);
      setAuthFeedback(type);
      setTimeout(() => setAuthFeedback('idle'), 1800);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <>
      {/* Floating Trigger Pill on Mobile / Desktop */}
      <aside
        aria-label="iOS Mobile Widget Launcher"
        className="fixed bottom-6 right-5 z-40 select-none transition-all duration-200"
      >
        {!isOpen ? (
          <button
            id="btn-open-ios-widget"
            type="button"
            onClick={() => setIsOpen(true)}
            className="flex items-center gap-2.5 px-3.5 py-2.5 bg-slate-900/90 hover:bg-slate-900 text-white rounded-full shadow-2xl border border-slate-700/80 backdrop-blur-xl transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer"
            style={{ minHeight: '44px', minWidth: '44px' }}
            title="Open iOS Mobile Passkey Widget"
          >
            {/* iOS Dynamic Island Style Icon */}
            <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-indigo-500 to-emerald-400 p-0.5 flex items-center justify-center">
              <div className="w-full h-full rounded-full bg-slate-950 flex items-center justify-center">
                <Fingerprint className="w-3.5 h-3.5 text-emerald-400" />
              </div>
            </div>

            <div className="text-left hidden sm:block">
              <div className="text-[11px] font-bold text-slate-100 flex items-center gap-1">
                <span>iOS Widget</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              </div>
              <div className="text-[10px] text-slate-400 font-mono">
                {metrics?.successRate || 100}% Auth Health
              </div>
            </div>

            <Smartphone className="w-4 h-4 text-slate-400 sm:hidden" />
          </button>
        ) : null}
      </aside>

      {/* Pop Widget Card / Mobile Bottom Sheet */}
      {isOpen && (
        <div
          id="ios-mobile-pop-widget-modal"
          role="dialog"
          aria-modal="true"
          className={`fixed z-50 transition-all duration-300 select-none ${
            widgetMode === 'expanded_sheet'
              ? 'inset-x-0 bottom-0 top-12 sm:inset-auto sm:bottom-6 sm:right-6 sm:w-96 sm:h-auto flex flex-col justify-end'
              : 'bottom-6 right-5 w-84 sm:w-92'
          }`}
        >
          {/* iOS Frosted Card */}
          <div className="w-full bg-slate-950/95 text-white border border-slate-700/80 shadow-2xl backdrop-blur-2xl rounded-t-[32px] sm:rounded-[28px] overflow-hidden flex flex-col border-t-2 border-t-indigo-500/50 animate-in fade-in zoom-in-95 duration-200">
            {/* iOS Drag Handle (Visible on Mobile or Expanded) */}
            <div className="pt-2.5 pb-1 flex justify-center sm:hidden">
              <div className="w-10 h-1 rounded-full bg-slate-700" />
            </div>

            {/* iOS Status Bar Header */}
            <div className="px-4 py-3 border-b border-slate-800/80 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-400">
                  <Fingerprint className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold tracking-tight text-slate-100">
                      Passkey Health
                    </span>
                    <span className="text-[9px] font-mono px-1.5 py-0.2 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full font-semibold">
                      iOS HIG
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400">
                    Secure Enclave · Level 2
                  </p>
                </div>
              </div>

              {/* Window Controls */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() =>
                    setWidgetMode(prev => (prev === 'compact_widget' ? 'expanded_sheet' : 'compact_widget'))
                  }
                  className="p-2 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                  style={{ minHeight: '44px', minWidth: '44px' }}
                  aria-label="Toggle widget mode"
                  title={widgetMode === 'compact_widget' ? 'Expand to sheet' : 'Compact widget'}
                >
                  {widgetMode === 'compact_widget' ? (
                    <Maximize2 className="w-4 h-4 mx-auto" />
                  ) : (
                    <Minimize2 className="w-4 h-4 mx-auto" />
                  )}
                </button>

                <button
                  id="btn-close-ios-widget"
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="p-2 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                  style={{ minHeight: '44px', minWidth: '44px' }}
                  aria-label="Close widget"
                >
                  <X className="w-4 h-4 mx-auto" />
                </button>
              </div>
            </div>

            {/* Widget Content Body */}
            <div className="p-4 space-y-3.5 max-h-[75vh] overflow-y-auto">
              {/* iOS Medium Widget Metric Block */}
              <div className="p-3.5 bg-slate-900/90 rounded-2xl border border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Past {metrics?.days || 30} Days Telemetry
                  </div>
                  <div className="flex items-center gap-1 text-[11px] font-mono text-emerald-400 font-bold">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>{metrics?.successRate || 100}% OK</span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="p-2 rounded-xl bg-slate-950 border border-slate-800/80 text-center">
                    <div className="text-[10px] text-slate-500 font-medium">Attempts</div>
                    <div className="text-base font-bold text-slate-100 font-mono">
                      {metrics?.totalAttempts || 0}
                    </div>
                  </div>

                  <div className="p-2 rounded-xl bg-slate-950 border border-emerald-900/40 text-center">
                    <div className="text-[10px] text-emerald-400 font-medium">Passed</div>
                    <div className="text-base font-bold text-emerald-400 font-mono">
                      {metrics?.successfulAttempts || 0}
                    </div>
                  </div>

                  <div className="p-2 rounded-xl bg-slate-950 border border-rose-900/40 text-center">
                    <div className="text-[10px] text-rose-400 font-medium">Failed</div>
                    <div className="text-base font-bold text-rose-400 font-mono">
                      {metrics?.failedAttempts || 0}
                    </div>
                  </div>
                </div>

                {/* Mini Visual Sparkline Bars */}
                <div className="pt-1">
                  <div className="text-[10px] text-slate-400 pb-1.5 flex justify-between">
                    <span>Recent Activity Trend</span>
                    <span className="text-slate-500 font-mono">10d Sparkline</span>
                  </div>
                  <div className="flex items-end gap-1.5 h-9 w-full bg-slate-950/60 p-1.5 rounded-lg border border-slate-800/60">
                    {sparklineData.map((d, i) => {
                      const heightPercent = Math.max(15, Math.round((d.total / maxAttempt) * 100));
                      const isFail = d.failed > 0;
                      return (
                        <div
                          key={i}
                          className="flex-1 h-full flex flex-col justify-end items-center group relative cursor-pointer"
                          title={`${d.date}: ${d.successful} pass, ${d.failed} fail`}
                        >
                          <div
                            style={{ height: `${heightPercent}%` }}
                            className={`w-full rounded-xs transition-all ${
                              isFail ? 'bg-rose-500' : 'bg-emerald-400'
                            }`}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Feedback Banner */}
              {authFeedback !== 'idle' && (
                <div
                  className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-200 ${
                    authFeedback === 'success'
                      ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300'
                      : 'bg-rose-950/80 border-rose-500 text-rose-300'
                  }`}
                >
                  {authFeedback === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <XCircle className="w-4 h-4 text-rose-400" />
                  )}
                  <span>
                    {authFeedback === 'success'
                      ? 'Biometric Passkey Verified on Device'
                      : 'Biometric Assertion Cancelled / Mismatch'}
                  </span>
                </div>
              )}

              {/* iOS 44px+ Touch Ergonomic Buttons */}
              <div className="space-y-2">
                <button
                  id="btn-ios-touch-auth"
                  type="button"
                  disabled={isAuthenticating}
                  onClick={handleTriggerBiometrics}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-emerald-500 hover:from-indigo-500 hover:to-emerald-400 text-white font-bold text-xs flex items-center justify-center gap-2.5 shadow-lg shadow-indigo-500/20 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50"
                  style={{ minHeight: '46px' }}
                >
                  <Fingerprint className="w-4 h-4 text-white" />
                  <span>
                    {isAuthenticating ? 'Scanning Biometrics...' : 'Authenticate with Touch ID / Face ID'}
                  </span>
                </button>

                {/* Quick Simulation & Refresh Row */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleSimulate('success')}
                    className="py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-emerald-400 border border-emerald-900/40 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    style={{ minHeight: '44px' }}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Test Success</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSimulate('failed')}
                    className="py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-rose-400 border border-rose-900/40 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    style={{ minHeight: '44px' }}
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Test Failure</span>
                  </button>
                </div>
              </div>

              {/* Additional Context in Expanded Mode */}
              {widgetMode === 'expanded_sheet' && (
                <div className="pt-2 border-t border-slate-800/80 space-y-2 text-xs">
                  <div className="flex items-center justify-between text-slate-400 text-[11px]">
                    <span>Target User ID:</span>
                    <span className="font-mono text-slate-200 font-semibold">{email}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-400 text-[11px]">
                    <span>Biometric Share:</span>
                    <span className="font-mono text-indigo-300 font-semibold">
                      {metrics?.passkeySharePercentage || 0}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-slate-400 text-[11px]">
                    <span>Security Attestation:</span>
                    <span className="text-emerald-400 font-medium">Apple T2 / A17 Secure Enclave</span>
                  </div>
                </div>
              )}
            </div>

            {/* iOS Footer Safe Area */}
            <div className="px-4 py-2.5 bg-slate-900/40 border-t border-slate-800/60 flex items-center justify-between text-[10px] text-slate-400">
              <span className="flex items-center gap-1">
                <Lock className="w-3 h-3 text-slate-500" />
                <span>WebAuthn FIDO2 Standard</span>
              </span>
              <button
                type="button"
                onClick={onRefresh}
                className="hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Sync Data</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
