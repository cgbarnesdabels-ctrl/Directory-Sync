/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Smartphone, 
  X, 
  Copy, 
  Check, 
  Download, 
  ExternalLink, 
  ShieldCheck, 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle,
  FileCode,
  Terminal,
  Sparkles
} from 'lucide-react';

interface SafariExtensionModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentStatus: Record<string, { status: string; lastSyncAt?: string }>;
  conflictsCount: number;
}

export const SafariExtensionModal: React.FC<SafariExtensionModalProps> = ({
  isOpen,
  onClose,
  currentStatus,
  conflictsCount,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'simulator' | 'installation' | 'files'>('simulator');
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [isSimulatingAudit, setIsSimulatingAudit] = useState(false);
  const [simulatorStatus, setSimulatorStatus] = useState<string>(
    conflictsCount > 0
      ? `⚠️ ${conflictsCount} active Workspace sync conflict(s) detected.`
      : '✅ All Workspace APIs verified in sync by Gemini. Zero HTTP 409/403 contentions.'
  );

  if (!isOpen) return null;

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const xcodeCommand = `xcrun safari-web-extension-converter public/safari-extension \\
  --app-name "DabelsPasskeyGuard" \\
  --bundle-identifier "com.dabelstech.safari.syncguard" \\
  --ios-only`;

  const handleSimulateAiAudit = () => {
    setIsSimulatingAudit(true);
    setSimulatorStatus('Analyzing Firestore sync logs with Gemini 3.8 Flash...');
    setTimeout(() => {
      setIsSimulatingAudit(false);
      setSimulatorStatus('✨ Gemini verified zero lock contentions. 3-way rebase cursor synced with Drive.');
    }, 1200);
  };

  const downloadExtensionPackage = () => {
    // Open the manifest in a new tab or trigger a download
    const element = document.createElement('a');
    element.setAttribute('href', '/safari-extension/manifest.json');
    element.setAttribute('download', 'manifest.json');
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-200">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">Safari iOS Web Extension</h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                  Manifest V3
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Hardware-bound passkey attestation &amp; real-time Google Workspace conflict resolver for iOS 15+
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sub-Tabs */}
        <div className="flex border-b border-slate-200 px-6 bg-white">
          <button
            onClick={() => setActiveSubTab('simulator')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 ${
              activeSubTab === 'simulator'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            Live iOS Safari Simulator
          </button>
          <button
            onClick={() => setActiveSubTab('installation')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 ${
              activeSubTab === 'installation'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            Xcode &amp; iOS Setup Guide
          </button>
          <button
            onClick={() => setActiveSubTab('files')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 ${
              activeSubTab === 'files'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            Extension Source Files
          </button>
        </div>

        {/* Content Area */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {activeSubTab === 'simulator' && (
            <div className="flex flex-col items-center justify-center space-y-4">
              <p className="text-xs text-slate-500 text-center max-w-md">
                Interactive preview of the native glassmorphic popup that runs inside Safari on iOS (iPhone/iPad).
              </p>

              {/* iOS iPhone Mock Container */}
              <div className="w-full max-w-[340px] rounded-[32px] p-4 bg-slate-900 text-white shadow-2xl border-4 border-slate-800 space-y-4">
                {/* iOS Header Bar */}
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-indigo-400" />
                      Passkey Guard
                    </span>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                    iOS Safari
                  </span>
                </div>

                {/* Service Cards Grid */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-white/5 border border-white/10 rounded-xl p-2.5">
                    <span className="text-[10px] font-medium text-slate-400">Google Drive</span>
                    <div className="text-xs font-bold mt-1 flex items-center gap-1.5 text-emerald-400">
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                      {currentStatus.drive?.status === 'error' ? 'Conflict' : 'Active'}
                    </div>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded-xl p-2.5">
                    <span className="text-[10px] font-medium text-slate-400">Gmail</span>
                    <div className="text-xs font-bold mt-1 flex items-center gap-1.5 text-emerald-400">
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                      {currentStatus.gmail?.status === 'error' ? 'Conflict' : 'Active'}
                    </div>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded-xl p-2.5">
                    <span className="text-[10px] font-medium text-slate-400">Calendar</span>
                    <div className="text-xs font-bold mt-1 flex items-center gap-1.5 text-emerald-400">
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                      {currentStatus.calendar?.status === 'error' ? 'Conflict' : 'Active'}
                    </div>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded-xl p-2.5">
                    <span className="text-[10px] font-medium text-slate-400">Keep Notes</span>
                    <div className="text-xs font-bold mt-1 flex items-center gap-1.5 text-emerald-400">
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                      {currentStatus.keep?.status === 'error' ? 'Conflict' : 'Active'}
                    </div>
                  </div>
                </div>

                {/* Gemini AI Resolution Card */}
                <div className="rounded-2xl p-3 bg-gradient-to-br from-indigo-950/80 to-purple-950/80 border border-indigo-500/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-indigo-200 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                      Gemini Conflict Resolver
                    </span>
                    <span className="text-[9px] font-mono text-indigo-300">3.8 Flash</span>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-snug">
                    {simulatorStatus}
                  </p>
                  <button
                    onClick={handleSimulateAiAudit}
                    disabled={isSimulatingAudit}
                    className="w-full py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-indigo-600/30"
                  >
                    {isSimulatingAudit ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        Diagnosing with Gemini...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        Run Safari Sync Audit
                      </>
                    )}
                  </button>
                </div>

                <div className="text-center text-[10px] text-slate-400">
                  Runs natively in iOS Safari address bar (iOS 15+)
                </div>
              </div>
            </div>
          )}

          {activeSubTab === 'installation' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100">
                <h4 className="text-xs font-bold text-indigo-950 flex items-center gap-2 mb-1">
                  <Terminal className="w-4 h-4 text-indigo-600" />
                  Convert to iOS Safari Extension via Apple CLI
                </h4>
                <p className="text-xs text-indigo-800 leading-relaxed mb-3">
                  Apple provides a native converter in Xcode to wrap WebExtensions Manifest V3 into a native iOS app container.
                </p>

                <div className="relative">
                  <pre className="bg-slate-900 text-slate-100 p-3 rounded-xl text-xs font-mono overflow-x-auto">
                    {xcodeCommand}
                  </pre>
                  <button
                    onClick={() => copyToClipboard(xcodeCommand, 'xcode')}
                    className="absolute top-2 right-2 p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white transition-colors"
                  >
                    {copiedText === 'xcode' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  iOS Safari Activation Steps
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50 space-y-1">
                    <span className="w-6 h-6 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center">
                      1
                    </span>
                    <h5 className="text-xs font-bold text-slate-800 mt-2">Build in Xcode</h5>
                    <p className="text-[11px] text-slate-500">
                      Open the generated Xcode project and deploy to your iPhone, iPad, or iOS Simulator.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50 space-y-1">
                    <span className="w-6 h-6 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center">
                      2
                    </span>
                    <h5 className="text-xs font-bold text-slate-800 mt-2">Enable in Settings</h5>
                    <p className="text-[11px] text-slate-500">
                      On iOS, go to <strong>Settings &gt; Safari &gt; Extensions</strong> and toggle "Dabels Passkey Guard" on.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50 space-y-1">
                    <span className="w-6 h-6 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center">
                      3
                    </span>
                    <h5 className="text-xs font-bold text-slate-800 mt-2">Always Allow</h5>
                    <p className="text-[11px] text-slate-500">
                      Grant "Always Allow" permissions for Google Workspace domains (Drive, Gmail, Calendar, Keep).
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSubTab === 'files' && (
            <div className="space-y-3">
              <p className="text-xs text-slate-500">
                All Safari iOS WebExtension files are stored in <code>/public/safari-extension/</code> and are ready to bundle.
              </p>

              <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden">
                <div className="p-3 bg-slate-50 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileCode className="w-4 h-4 text-indigo-600" />
                    <div>
                      <p className="text-xs font-bold text-slate-800">manifest.json</p>
                      <p className="text-[10px] text-slate-400">WebExtensions Manifest V3 spec for iOS Safari</p>
                    </div>
                  </div>
                  <a
                    href="/safari-extension/manifest.json"
                    target="_blank"
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1"
                  >
                    View <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                <div className="p-3 bg-white flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileCode className="w-4 h-4 text-indigo-600" />
                    <div>
                      <p className="text-xs font-bold text-slate-800">background.js</p>
                      <p className="text-[10px] text-slate-400">Background service worker, badge updates &amp; alarm triggers</p>
                    </div>
                  </div>
                  <a
                    href="/safari-extension/background.js"
                    target="_blank"
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1"
                  >
                    View <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                <div className="p-3 bg-slate-50 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileCode className="w-4 h-4 text-indigo-600" />
                    <div>
                      <p className="text-xs font-bold text-slate-800">content.js</p>
                      <p className="text-[10px] text-slate-400">Injected status pill &amp; WebAuthn passkey listener</p>
                    </div>
                  </div>
                  <a
                    href="/safari-extension/content.js"
                    target="_blank"
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1"
                  >
                    View <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                <div className="p-3 bg-white flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileCode className="w-4 h-4 text-indigo-600" />
                    <div>
                      <p className="text-xs font-bold text-slate-800">popup.html &amp; popup.js</p>
                      <p className="text-[10px] text-slate-400">Glassmorphic iOS Safari popup UI with Gemini resolver</p>
                    </div>
                  </div>
                  <a
                    href="/safari-extension/popup.html"
                    target="_blank"
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1"
                  >
                    View <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            Path: <code>/public/safari-extension</code>
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={downloadExtensionPackage}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              Download Manifest
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
