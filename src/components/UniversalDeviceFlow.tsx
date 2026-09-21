/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Cpu, 
  Smartphone, 
  Monitor, 
  Laptop, 
  QrCode, 
  CheckCircle2, 
  Clock, 
  ShieldCheck, 
  Key, 
  Copy, 
  Check, 
  RefreshCw, 
  Send, 
  Globe,
  Lock,
  ExternalLink,
  Share2
} from 'lucide-react';
import { useToast } from '../context/ToastContext';

interface ActiveDeviceSession {
  id: string;
  deviceName: string;
  deviceType: 'ios' | 'android' | 'desktop' | 'tablet';
  browser: string;
  ipAddress: string;
  lastActive: string;
  isCurrent: boolean;
}

export const UniversalDeviceFlow: React.FC = () => {
  const { showToast } = useToast();
  const [copiedCode, setCopiedCode] = useState(false);
  const [deviceCode, setDeviceCode] = useState('DABELS-8842');
  const [verificationUri, setVerificationUri] = useState('https://dabelstech.com/activate');
  const [authStatus, setAuthStatus] = useState<'waiting' | 'authorized' | 'expired'>('waiting');
  const [isPolling, setIsPolling] = useState(true);

  const [activeSessions, setActiveSessions] = useState<ActiveDeviceSession[]>([
    {
      id: 'sess-1',
      deviceName: 'iPhone 16 Pro (iOS Safari)',
      deviceType: 'ios',
      browser: 'Safari Mobile 18.2',
      ipAddress: '192.168.1.45',
      lastActive: 'Just now',
      isCurrent: true
    },
    {
      id: 'sess-2',
      deviceName: 'iPhone 15 (iOS Chrome CriOS)',
      deviceType: 'ios',
      browser: 'Chrome iOS 122',
      ipAddress: '192.168.1.88',
      lastActive: '5 mins ago',
      isCurrent: false
    },
    {
      id: 'sess-3',
      deviceName: 'MacBook Pro (macOS Sonoma)',
      deviceType: 'desktop',
      browser: 'Google Chrome 124',
      ipAddress: '192.168.1.12',
      lastActive: '2 hours ago',
      isCurrent: false
    }
  ]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isPolling && authStatus === 'waiting') {
      timer = setTimeout(() => {
        // Automatically simulate authorization after 8 seconds for demonstration
        setAuthStatus('authorized');
        setIsPolling(false);
        showToast('Device successfully authenticated via Universal OAuth Device Flow!', 'success');
      }, 7000);
    }
    return () => clearTimeout(timer);
  }, [isPolling, authStatus]);

  const handleRegenerateCode = () => {
    const randomCode = `DABELS-${Math.floor(1000 + Math.random() * 9000)}`;
    setDeviceCode(randomCode);
    setAuthStatus('waiting');
    setIsPolling(true);
    showToast(`Generated new device code: ${randomCode}`, 'info');
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(deviceCode);
    setCopiedCode(true);
    showToast('Device code copied to clipboard!', 'success');
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleRevokeSession = (sessionId: string) => {
    setActiveSessions(prev => prev.filter(s => s.id !== sessionId));
    showToast('Device session revoked successfully', 'success');
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 rounded-2xl shadow-lg border border-indigo-900/40 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2 max-w-2xl">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center gap-1 font-mono">
              <Cpu className="w-3.5 h-3.5 text-indigo-400" />
              RFC 8628 OAUTH DEVICE GRANT
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono">
              Universal Cross-Device Compatibility
            </span>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-white">
            Universal Device Flow &amp; Cross-Device Authentication
          </h2>
          <p className="text-xs text-slate-300 leading-relaxed">
            Securely sign in on input-constrained devices (smart displays, iOS Safari, iOS Chrome, TV browsers) by pairing with a primary authenticated phone or desktop.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleRegenerateCode}
            className="py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer shadow-xs"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Generate New Device Code</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Device Code Pairing Box */}
        <div className="lg:col-span-6 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <QrCode className="w-4 h-4 text-indigo-600" />
                  <span>Device Authorization Pairing</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Enter code on your phone or scan QR code to authorize this device
                </p>
              </div>
              <span className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-bold flex items-center gap-1.5 ${
                authStatus === 'authorized' 
                  ? 'bg-emerald-100 text-emerald-700' 
                  : 'bg-indigo-100 text-indigo-700 animate-pulse'
              }`}>
                <span className={`w-2 h-2 rounded-full ${authStatus === 'authorized' ? 'bg-emerald-500' : 'bg-indigo-500 animate-ping'}`} />
                {authStatus === 'authorized' ? 'Authorized' : 'Waiting for Device...'}
              </span>
            </div>

            {/* Big Code Display */}
            <div className="bg-slate-900 text-white rounded-2xl p-6 text-center space-y-4 border border-slate-800 shadow-inner">
              <span className="text-[11px] font-mono text-slate-400 uppercase tracking-widest block">
                Your Unique Device User Code
              </span>
              <div className="text-3xl sm:text-4xl font-extrabold tracking-widest font-mono text-indigo-400">
                {deviceCode}
              </div>
              <div className="flex items-center justify-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="py-2 px-4 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-700"
                >
                  {copiedCode ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedCode ? 'Copied Code!' : 'Copy Code'}</span>
                </button>
                <a
                  href={verificationUri}
                  target="_blank"
                  rel="noreferrer"
                  className="py-2 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Open Verification URL</span>
                </a>
              </div>
            </div>

            {/* Status Steps */}
            <div className="space-y-3 pt-2">
              <div className="flex items-start gap-3">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                  authStatus === 'authorized' ? 'bg-emerald-100 text-emerald-700' : 'bg-indigo-600 text-white'
                }`}>
                  1
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-800 block">Navigate to Verification URL</span>
                  <span className="text-[11px] text-slate-500 font-mono">{verificationUri}</span>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                  authStatus === 'authorized' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'
                }`}>
                  2
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-800 block">Enter Code {deviceCode}</span>
                  <span className="text-[11px] text-slate-500">Approve permission request on your primary smartphone or browser.</span>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                  authStatus === 'authorized' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'
                }`}>
                  3
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-800 block">Automatic Session Exchange</span>
                  <span className="text-[11px] text-slate-500">Secure JWT tokens and Passkey bindings are instantly synced to this client.</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Connected Cross-Device Sessions */}
        <div className="lg:col-span-6 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-indigo-600" />
                <span>Active Cross-Device Sessions</span>
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold">
                {activeSessions.length} Devices Connected
              </span>
            </div>

            <div className="space-y-3">
              {activeSessions.map((session) => (
                <div 
                  key={session.id}
                  className="p-4 rounded-xl border border-slate-100 bg-slate-50/70 hover:bg-slate-50 transition-colors flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
                      {session.deviceType === 'ios' ? <Smartphone className="w-5 h-5 text-sky-600" /> : <Laptop className="w-5 h-5" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900">{session.deviceName}</span>
                        {session.isCurrent && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800 font-mono">
                            Current
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-500 block font-mono mt-0.5">
                        {session.browser} &bull; {session.ipAddress}
                      </span>
                    </div>
                  </div>

                  {!session.isCurrent && (
                    <button
                      type="button"
                      onClick={() => handleRevokeSession(session.id)}
                      className="py-1.5 px-3 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer border border-rose-200 shrink-0"
                    >
                      Revoke
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div className="p-4 rounded-xl bg-indigo-50/50 border border-indigo-100 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-indigo-600 shrink-0" />
                <span className="text-xs text-indigo-900 font-medium">
                  Universal compatibility enabled for iOS Safari, iOS Chrome (CriOS), Android, and Desktop clients.
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
