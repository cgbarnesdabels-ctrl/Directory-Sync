import React, { useState } from 'react';
import { Download, Smartphone, Share2, PlusSquare, X, CheckCircle, ShieldCheck } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, isAndroid, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [showAndroidGuide, setShowAndroidGuide] = useState(false);

  // If already installed and running as standalone app, don't show prompt
  if (isInstalled) {
    return (
      <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs border border-emerald-500/20">
        <CheckCircle className="w-3.5 h-3.5" />
        <span>PWA Installed</span>
      </div>
    );
  }

  return (
    <>
      {/* 1. Direct Web Prompt for Android & Chromium */}
      {isInstallable && (
        <button
          type="button"
          onClick={install}
          className="flex items-center gap-2 px-3 py-2 sm:py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-semibold shadow-sm hover:shadow-md transition-all min-h-[44px] sm:min-h-0 cursor-pointer"
          title="Install Dabels Tech Passkey Gateway on your mobile home screen"
        >
          <Download className="w-4 h-4" />
          <span>Install App</span>
        </button>
      )}

      {/* 2. iOS Safari Action Button */}
      {isIOS && !isInstallable && (
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className="flex items-center gap-1.5 px-3 py-2 sm:py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs sm:text-sm font-medium border border-slate-700 transition-all min-h-[44px] sm:min-h-0 cursor-pointer"
          title="Add to iOS Home Screen"
        >
          <Smartphone className="w-4 h-4 text-sky-400" />
          <span>Install on iOS</span>
        </button>
      )}

      {/* 3. Fallback Mobile Install launcher */}
      {!isInstallable && !isIOS && (
        <button
          type="button"
          onClick={() => (isAndroid ? setShowAndroidGuide(true) : setShowIOSGuide(true))}
          className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700/80 transition cursor-pointer"
          title="Mobile & PWA Setup"
        >
          <Smartphone className="w-3.5 h-3.5 text-indigo-400" />
          <span>Install Mobile</span>
        </button>
      )}

      {/* iOS Safari Installation Guide Modal */}
      {showIOSGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative w-full max-w-md rounded-2xl bg-slate-900 border border-slate-700 p-6 shadow-2xl text-white space-y-4">
            <button
              onClick={() => setShowIOSGuide(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400">
                <Smartphone className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Install on iPhone / iPad</h3>
                <p className="text-xs text-slate-400">Run as native iOS standalone app with Face ID / Touch ID</p>
              </div>
            </div>

            <div className="space-y-3 pt-2 text-sm">
              <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-800/60 border border-slate-700/60">
                <div className="p-1.5 rounded-lg bg-sky-500/10 text-sky-400 mt-0.5">
                  <Share2 className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-semibold text-slate-200 text-xs">Step 1: Open Share Sheet</p>
                  <p className="text-xs text-slate-400 mt-0.5">Tap the Safari <span className="text-sky-400 font-medium">Share button</span> (the box with an arrow) in the browser toolbar.</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-800/60 border border-slate-700/60">
                <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 mt-0.5">
                  <PlusSquare className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-semibold text-slate-200 text-xs">Step 2: Add to Home Screen</p>
                  <p className="text-xs text-slate-400 mt-0.5">Scroll down the share sheet and tap <span className="text-indigo-300 font-medium">"Add to Home Screen"</span>.</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-800/60 border border-slate-700/60">
                <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 mt-0.5">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-semibold text-slate-200 text-xs">Step 3: Launch Native Biometrics</p>
                  <p className="text-xs text-slate-400 mt-0.5">Tap <span className="text-emerald-300 font-medium">"Add"</span>. Launch from your home screen for full-screen Face ID / Touch ID hardware passkey authentication.</p>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowIOSGuide(false)}
              className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition shadow-sm cursor-pointer"
            >
              Got it
            </button>
          </div>
        </div>
      )}

      {/* Android Installation Guide Modal */}
      {showAndroidGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative w-full max-w-md rounded-2xl bg-slate-900 border border-slate-700 p-6 shadow-2xl text-white space-y-4">
            <button
              onClick={() => setShowAndroidGuide(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-600/20 border border-emerald-500/30 text-emerald-400">
                <Smartphone className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Install on Android</h3>
                <p className="text-xs text-slate-400">Install via Google Chrome with Fingerprint / Passkey support</p>
              </div>
            </div>

            <div className="space-y-3 pt-2 text-sm">
              <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-800/60 border border-slate-700/60">
                <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 mt-0.5">
                  <Download className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-semibold text-slate-200 text-xs">Step 1: Chrome Menu</p>
                  <p className="text-xs text-slate-400 mt-0.5">Tap the <span className="text-emerald-400 font-medium">three dots (⋮)</span> in the top right corner of Chrome.</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-800/60 border border-slate-700/60">
                <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 mt-0.5">
                  <PlusSquare className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-semibold text-slate-200 text-xs">Step 2: Install Application</p>
                  <p className="text-xs text-slate-400 mt-0.5">Tap <span className="text-indigo-300 font-medium">"Install app"</span> or <span className="text-indigo-300 font-medium">"Add to Home screen"</span>.</p>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowAndroidGuide(false)}
              className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm transition shadow-sm cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
};
