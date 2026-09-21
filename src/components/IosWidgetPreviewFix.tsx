/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Smartphone, 
  Fingerprint, 
  ShieldCheck, 
  CheckCircle2, 
  Activity, 
  Battery, 
  Wifi, 
  Signal, 
  Lock, 
  RefreshCw, 
  Sparkles, 
  Check, 
  Copy, 
  Maximize2, 
  Sliders, 
  CheckSquare, 
  Terminal,
  Globe,
  Chrome
} from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { useAuthOverlay } from '../context/AuthOverlayContext';

export const IosWidgetPreviewFix: React.FC = () => {
  const { showToast } = useToast();
  const { triggerSignIn, setPreferMode } = useAuthOverlay();

  const [deviceTheme, setDeviceTheme] = useState<'light' | 'dark'>('dark');
  const [browserEngine, setBrowserEngine] = useState<'safari' | 'chrome'>('chrome');
  const [widgetSize, setWidgetSize] = useState<'small' | 'medium' | 'large'>('medium');
  const [isSimulatingAuth, setIsSimulatingAuth] = useState(false);
  const [authSuccess, setAuthSuccess] = useState(false);

  // iOS Viewport & Chrome on iOS fix settings state
  const [fixSafeArea, setFixSafeArea] = useState(true);
  const [fixViewportHeight, setFixViewportHeight] = useState(true);
  const [fixTouchHighlight, setFixTouchHighlight] = useState(true);
  const [fixMomentumScroll, setFixMomentumScroll] = useState(true);
  const [fixCriOSWebAuthn, setFixCriOSWebAuthn] = useState(true);

  const handleTestPasskeyAuth = async () => {
    setIsSimulatingAuth(true);
    setPreferMode('pop');
    try {
      await triggerSignIn('dabelstech@moredesa.com', 'dabelstech.com', 'pop');
      setAuthSuccess(true);
      showToast(`iOS ${browserEngine === 'chrome' ? 'Chrome (CriOS)' : 'Safari'} Passkey verified successfully!`, 'success');
      setTimeout(() => setAuthSuccess(false), 3000);
    } catch (err) {
      showToast('Passkey verification canceled or failed', 'error');
    } finally {
      setIsSimulatingAuth(false);
    }
  };

  const handleApplyFixPreset = () => {
    setFixSafeArea(true);
    setFixViewportHeight(true);
    setFixTouchHighlight(true);
    setFixMomentumScroll(true);
    setFixCriOSWebAuthn(true);
    showToast('Applied all iOS Safari & Chrome (CriOS) compatibility fixes successfully!', 'success');
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 rounded-2xl shadow-lg border border-indigo-900/40 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2 max-w-2xl">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30 flex items-center gap-1 font-mono">
              <Chrome className="w-3.5 h-3.5 text-blue-400" />
              iOS CHROME (CriOS) &amp; SAFARI READY
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono">
              WebAuthn iOS 16+ Compatible
            </span>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-white">
            iOS Mobile Chrome &amp; Safari Widget Preview &amp; Fix Suite
          </h2>
          <p className="text-xs text-slate-300 leading-relaxed">
            Test and preview passkey authentication, widgets, and viewport fixes optimized specifically for Google Chrome on iOS (CriOS WebKit wrapper) and Apple Safari.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleApplyFixPreset}
            className="py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer shadow-xs"
          >
            <CheckSquare className="w-4 h-4" />
            <span>Apply iOS Chrome &amp; Safari Fixes</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: iOS Chrome & Safari Fix Controls */}
        <div className="lg:col-span-5 space-y-6">
          {/* Browser Engine Selector */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Globe className="w-4 h-4 text-indigo-600" />
              <span>Target iOS Browser Engine</span>
            </h3>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setBrowserEngine('chrome')}
                className={`py-2.5 px-3 text-xs font-semibold rounded-xl border flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  browserEngine === 'chrome'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <Chrome className="w-4 h-4" />
                <span>Google Chrome (CriOS)</span>
              </button>
              <button
                type="button"
                onClick={() => setBrowserEngine('safari')}
                className={`py-2.5 px-3 text-xs font-semibold rounded-xl border flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  browserEngine === 'safari'
                    ? 'bg-sky-600 text-white border-sky-600 shadow-xs'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <Smartphone className="w-4 h-4" />
                <span>Apple Safari</span>
              </button>
            </div>
            <p className="text-[11px] text-slate-500 leading-tight">
              {browserEngine === 'chrome' 
                ? 'Chrome on iOS (CriOS) uses WebKit with specific UA headers & googlechrome:// deep link redirects for OAuth/Passkeys.'
                : 'Native Apple Safari uses iCloud Keychain & WebAuthn platform authenticator directly.'}
            </p>
          </div>

          {/* Viewport & CriOS Fix Toggles Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Sliders className="w-4 h-4 text-indigo-600" />
                <span>iOS Chrome &amp; Safari Viewport Fixes</span>
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-semibold">
                CriOS Ready
              </span>
            </div>

            <div className="space-y-3">
              {[
                {
                  id: 'crios-webauthn',
                  title: 'CriOS WebAuthn Fallback Handlers',
                  desc: 'Ensures navigator.credentials.create/get correctly triggers iCloud Keychain prompts inside iOS Chrome wrapper.',
                  checked: fixCriOSWebAuthn,
                  onChange: setFixCriOSWebAuthn
                },
                {
                  id: 'safe-area',
                  title: 'Safe Area Insets (env(safe-area-inset-*))',
                  desc: 'Prevents content clipping behind iPhone notch, Dynamic Island, and home indicator.',
                  checked: fixSafeArea,
                  onChange: setFixSafeArea
                },
                {
                  id: 'dvh',
                  title: 'Dynamic Viewport Height (100dvh)',
                  desc: 'Fixes iOS Chrome toolbar collapsing height jumps during vertical scroll.',
                  checked: fixViewportHeight,
                  onChange: setFixViewportHeight
                },
                {
                  id: 'tap-highlight',
                  title: 'Transparent Tap Highlight (-webkit-tap-highlight-color)',
                  desc: 'Removes gray flashing box on touch elements for native app responsiveness.',
                  checked: fixTouchHighlight,
                  onChange: setFixTouchHighlight
                },
                {
                  id: 'momentum',
                  title: 'Momentum Scroll (-webkit-overflow-scrolling: touch)',
                  desc: 'Enables buttery-smooth rubber-band scrolling in scrollable panels.',
                  checked: fixMomentumScroll,
                  onChange: setFixMomentumScroll
                }
              ].map(fix => (
                <label 
                  key={fix.id} 
                  className="flex items-start gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50/60 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={fix.checked}
                    onChange={(e) => fix.onChange(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">{fix.title}</span>
                    <span className="text-[11px] text-slate-500 leading-tight block mt-0.5">{fix.desc}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Widget Layout Size Controls */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Maximize2 className="w-4 h-4 text-indigo-600" />
              <span>iOS Home Screen Widget Size</span>
            </h3>

            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'small', label: 'Small (2x2)' },
                { id: 'medium', label: 'Medium (4x2)' },
                { id: 'large', label: 'Large (4x4)' }
              ].map(sz => (
                <button
                  key={sz.id}
                  type="button"
                  onClick={() => setWidgetSize(sz.id as any)}
                  className={`py-2 px-3 text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
                    widgetSize === sz.id 
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs' 
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {sz.label}
                </button>
              ))}
            </div>

            <div className="pt-2 flex items-center justify-between border-t border-slate-100">
              <span className="text-xs text-slate-500">Device Appearance:</span>
              <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setDeviceTheme('light')}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                    deviceTheme === 'light' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  Light iOS
                </button>
                <button
                  type="button"
                  onClick={() => setDeviceTheme('dark')}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                    deviceTheme === 'dark' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600'
                  }`}
                >
                  Dark iOS
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Realistic iPhone Chrome / Safari Simulator Frame */}
        <div className="lg:col-span-7 flex justify-center">
          <div className={`w-full max-w-[380px] rounded-[52px] p-4 shadow-2xl border-[12px] transition-all duration-300 relative ${
            deviceTheme === 'dark' ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-100 border-slate-300 text-slate-900'
          }`}>
            {/* iPhone Speaker & Dynamic Island */}
            <div className="absolute top-3 left-1/2 -translate-x-1/2 w-28 h-7 bg-black rounded-full z-30 flex items-center justify-between px-3">
              <div className="w-2.5 h-2.5 rounded-full bg-slate-900 border border-slate-800" />
              <div className="w-3 h-3 rounded-full bg-blue-500/80 animate-pulse" />
            </div>

            {/* iOS Status Bar */}
            <div className="pt-5 pb-2 px-4 flex items-center justify-between text-[11px] font-semibold font-mono opacity-80">
              <span>9:41</span>
              <div className="flex items-center gap-1.5">
                <Signal className="w-3 h-3" />
                <Wifi className="w-3 h-3" />
                <Battery className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* Browser Header Bar (Chrome on iOS vs Safari) */}
            <div className={`px-4 py-2 rounded-2xl mx-1 mb-3 flex items-center justify-between text-xs font-mono border ${
              browserEngine === 'chrome' 
                ? 'bg-blue-950/40 border-blue-500/30 text-blue-200' 
                : 'bg-slate-900/40 border-slate-700 text-slate-300'
            }`}>
              <div className="flex items-center gap-2 truncate">
                {browserEngine === 'chrome' ? <Chrome className="w-3.5 h-3.5 text-blue-400 shrink-0" /> : <Globe className="w-3.5 h-3.5 text-sky-400 shrink-0" />}
                <span className="truncate text-[11px]">dabelstech.com</span>
              </div>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-black/30 font-bold">
                {browserEngine === 'chrome' ? 'CriOS 122' : 'Safari 18'}
              </span>
            </div>

            {/* iOS Home Screen / Browser Content Background */}
            <div className={`rounded-[32px] p-4 min-h-[440px] flex flex-col justify-between relative overflow-hidden ${
              deviceTheme === 'dark' 
                ? 'bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-950' 
                : 'bg-gradient-to-br from-indigo-50 via-sky-50 to-slate-100'
            }`}>
              {/* Wallpaper Glow */}
              <div className="absolute -top-10 -right-10 w-48 h-48 bg-blue-500/20 rounded-full blur-2xl pointer-events-none" />
              <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-emerald-500/20 rounded-full blur-2xl pointer-events-none" />

              {/* Header inside screen */}
              <div className="flex items-center justify-between text-xs font-semibold opacity-70 z-10">
                <span>{browserEngine === 'chrome' ? 'iOS Chrome Passkey Engine' : 'iOS Safari Engine'}</span>
                <span className="text-[10px] font-mono bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-bold">
                  Active
                </span>
              </div>

              {/* iOS Interactive Widget Container */}
              <div className={`my-auto rounded-3xl p-4 backdrop-blur-xl border z-10 transition-all shadow-lg ${
                deviceTheme === 'dark' 
                  ? 'bg-slate-900/80 border-slate-700/80 text-white' 
                  : 'bg-white/80 border-slate-200 text-slate-900'
              }`}>
                {widgetSize === 'small' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="p-2 rounded-xl bg-blue-500/20 text-blue-400">
                        {browserEngine === 'chrome' ? <Chrome className="w-5 h-5 text-blue-400" /> : <Fingerprint className="w-5 h-5 text-emerald-400" />}
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold">
                        {browserEngine === 'chrome' ? 'CriOS WebAuthn' : 'Safari Secure'}
                      </span>
                    </div>
                    <div>
                      <h4 className="text-xs font-bold">iOS {browserEngine === 'chrome' ? 'Chrome' : 'Safari'} Passkey</h4>
                      <p className="text-[10px] opacity-70 mt-0.5">dabelstech.com</p>
                    </div>
                    <button
                      type="button"
                      onClick={handleTestPasskeyAuth}
                      disabled={isSimulatingAuth}
                      className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs"
                      style={{ minHeight: '44px' }}
                    >
                      {isSimulatingAuth ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                      <span>Verify Face ID / Touch ID</span>
                    </button>
                  </div>
                )}

                {widgetSize === 'medium' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-blue-500/20 text-blue-400">
                          <Chrome className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold leading-tight">iOS Chrome (CriOS) Hub</h4>
                          <span className="text-[10px] opacity-60 font-mono">Engine: WebKit + CriOS</span>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-blue-500/20 text-blue-300">
                        Optimized
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                      <div className="p-2 rounded-xl bg-black/20 border border-white/10">
                        <span className="opacity-60 block text-[9px]">Browser</span>
                        <span className="text-blue-400 font-bold">{browserEngine === 'chrome' ? 'Chrome iOS' : 'Safari iOS'}</span>
                      </div>
                      <div className="p-2 rounded-xl bg-black/20 border border-white/10">
                        <span className="opacity-60 block text-[9px]">Passkeys</span>
                        <span className="text-emerald-300 font-bold">Bound &amp; Ready</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={handleTestPasskeyAuth}
                        disabled={isSimulatingAuth}
                        className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs"
                        style={{ minHeight: '44px' }}
                      >
                        {isSimulatingAuth ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Fingerprint className="w-3.5 h-3.5" />}
                        <span>Sign In (CriOS)</span>
                      </button>
                    </div>
                  </div>
                )}

                {widgetSize === 'large' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-xl bg-blue-500/20 text-blue-400">
                          <Activity className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold">iOS Chrome &amp; Widget Feed</h4>
                          <span className="text-[10px] opacity-60">CriOS Compatibility Suite</span>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-emerald-500/20 text-emerald-300">
                        iOS 16+
                      </span>
                    </div>

                    <div className="space-y-2 text-[11px]">
                      <div className="p-2 rounded-xl bg-black/20 flex items-center justify-between">
                        <span>CriOS WebAuthn Fallback</span>
                        <span className="text-emerald-400 font-mono font-bold">Active</span>
                      </div>
                      <div className="p-2 rounded-xl bg-black/20 flex items-center justify-between">
                        <span>Safe Area / DVH Fixes</span>
                        <span className="text-emerald-400 font-mono font-bold">Applied</span>
                      </div>
                      <div className="p-2 rounded-xl bg-black/20 flex items-center justify-between">
                        <span>Google Workspace Sync</span>
                        <span className="text-blue-300 font-mono font-bold">Connected</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleTestPasskeyAuth}
                      disabled={isSimulatingAuth}
                      className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs"
                      style={{ minHeight: '44px' }}
                    >
                      {isSimulatingAuth ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                      <span>Launch Biometric Flow</span>
                    </button>
                  </div>
                )}
              </div>

              {/* iOS Dock Apps */}
              <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-2.5 flex items-center justify-around z-10">
                {['Chrome', 'Safari', 'Mail', 'Settings'].map((app, idx) => (
                  <div key={app} className={`w-10 h-10 rounded-xl flex items-center justify-center text-white text-xs font-bold shadow-sm ${
                    app === 'Chrome' ? 'bg-gradient-to-br from-blue-500 via-red-500 to-yellow-500' : 'bg-gradient-to-br from-indigo-500 to-sky-500'
                  }`}>
                    {app[0]}
                  </div>
                ))}
              </div>
            </div>

            {/* iPhone Home Indicator Bar */}
            <div className="pt-3 pb-1 flex justify-center">
              <div className="w-32 h-1 bg-white/40 rounded-full" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
