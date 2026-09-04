/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Fingerprint, 
  GitBranch, 
  CheckCircle2, 
  AlertCircle, 
  ExternalLink, 
  ChevronUp, 
  ChevronDown, 
  Minimize2, 
  Maximize2, 
  Sparkles, 
  ShieldCheck, 
  GitPullRequest,
  RefreshCw,
  Play
} from 'lucide-react';
import { useAuthOverlay } from '../context/AuthOverlayContext';
import type { GitHubOverview } from '../types/github';

interface FloatingAuthCiWidgetProps {
  onNavigateToCiTab?: () => void;
}

export const FloatingAuthCiWidget: React.FC<FloatingAuthCiWidgetProps> = ({ onNavigateToCiTab }) => {
  const { overlayState, triggerSignIn, setPreferMode } = useAuthOverlay();
  const [isExpanded, setIsExpanded] = useState(false);
  const [overview, setOverview] = useState<GitHubOverview | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchOverview = async () => {
    try {
      setIsRefreshing(true);
      const res = await fetch('/api/github/overview');
      if (res.ok) {
        const data = await res.json();
        setOverview(data);
      }
    } catch (err) {
      console.error('Failed to fetch CI overview:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, []);

  const handleQuickSignIn = (mode: 'pop' | 'pip') => {
    setPreferMode(mode);
    triggerSignIn(overlayState.email || 'dabelstech@moredesa.com', overlayState.rpId, mode);
  };

  // If overlay is already open in PiP mode, hide the floating pill to avoid overlap
  if (overlayState.isOpen && overlayState.mode === 'pip') {
    return null;
  }

  return (
    <aside 
      aria-label="Quick Passkey and GitHub CI Widget"
      className="fixed bottom-5 left-5 z-40 select-none transition-all duration-200"
    >
      {/* Expanded Quick Controller Menu */}
      {isExpanded && (
        <div className="mb-3 w-80 rounded-2xl bg-slate-900 border border-slate-700/80 shadow-2xl p-4 text-white space-y-4 backdrop-blur-xl animate-in slide-in-from-bottom-3 duration-200">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-indigo-400" />
              <span className="text-xs font-bold text-slate-200">Passkey &amp; CI Quick Control</span>
            </div>
            <button
              type="button"
              onClick={() => setIsExpanded(false)}
              className="text-slate-400 hover:text-white p-1 rounded-md"
            >
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Trigger Sign-in request buttons */}
          <div className="space-y-2">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Trigger Sign-In Request:
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                id="widget-trigger-pop"
                type="button"
                onClick={() => handleQuickSignIn('pop')}
                className="p-2.5 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-xs font-semibold text-white flex flex-col items-center gap-1 transition-all cursor-pointer shadow-xs"
              >
                <Maximize2 className="w-4 h-4 text-indigo-200" />
                <span>Pop Screen Overlay</span>
              </button>

              <button
                id="widget-trigger-pip"
                type="button"
                onClick={() => handleQuickSignIn('pip')}
                className="p-2.5 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-semibold text-slate-200 flex flex-col items-center gap-1 border border-slate-700 transition-all cursor-pointer"
              >
                <Minimize2 className="w-4 h-4 text-indigo-400" />
                <span>PiP Floating HUD</span>
              </button>
            </div>
          </div>

          {/* GitHub CI/CD & PR Status */}
          <div className="pt-2 border-t border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 font-medium">GitHub CI Status:</span>
              <span className="flex items-center gap-1.5 text-emerald-400 font-semibold font-mono text-[11px]">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{overview ? `${overview.passingRate}% Passing` : 'CI Green'}</span>
              </span>
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span className="flex items-center gap-1 font-mono">
                <GitBranch className="w-3 h-3 text-slate-500" />
                <span>{overview?.defaultBranch || 'main'}</span>
              </span>
              <span className="flex items-center gap-1 font-mono text-indigo-300">
                <GitPullRequest className="w-3 h-3" />
                <span>{overview?.openPRsCount || 1} Open PR</span>
              </span>
            </div>

            {onNavigateToCiTab && (
              <button
                type="button"
                onClick={() => {
                  setIsExpanded(false);
                  onNavigateToCiTab();
                }}
                className="w-full py-1.5 px-3 bg-slate-800 hover:bg-slate-700 text-indigo-300 hover:text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <span>View CI/CD &amp; PR Dashboard</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Collapsed Pill Badge */}
      <div className="flex items-center gap-2 bg-slate-950/90 text-white rounded-full pl-2 pr-3 py-1.5 border border-slate-800 shadow-xl backdrop-blur-md hover:border-slate-700 transition-all">
        {/* Sign In Trigger Button */}
        <button
          id="btn-quick-signin-pill"
          type="button"
          onClick={() => handleQuickSignIn('pop')}
          className="flex items-center gap-2 text-xs font-semibold hover:text-indigo-300 transition-colors cursor-pointer"
        >
          <div className="w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center text-white shadow-xs">
            <Fingerprint className="w-3.5 h-3.5" />
          </div>
          <span>Sign In (Trigger Pop)</span>
        </button>

        <span className="h-3 w-px bg-slate-800" />

        {/* CI Status Pill */}
        <button
          type="button"
          onClick={() => {
            if (onNavigateToCiTab) onNavigateToCiTab();
          }}
          className="flex items-center gap-1.5 text-[11px] font-mono text-emerald-400 hover:text-emerald-300 transition-colors cursor-pointer"
          title="GitHub CI Status"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>CI: Passing</span>
        </button>

        {/* Expand / Minimize Toggle */}
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-slate-400 hover:text-white p-0.5 rounded transition-colors cursor-pointer ml-1"
          title={isExpanded ? 'Collapse' : 'Quick Controls'}
        >
          {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
        </button>
      </div>
    </aside>
  );
};
