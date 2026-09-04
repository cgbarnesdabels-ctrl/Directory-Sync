/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  Fingerprint, 
  ShieldCheck, 
  AlertCircle, 
  X, 
  Maximize2, 
  Minimize2, 
  RefreshCw, 
  CheckCircle2, 
  Cpu, 
  Key, 
  Lock, 
  Sparkles,
  ExternalLink,
  Clock
} from 'lucide-react';
import { useAuthOverlay } from '../context/AuthOverlayContext';

export const BiometricScreenOverlay: React.FC = () => {
  const { 
    overlayState, 
    switchMode, 
    closeOverlay, 
    retryAuth, 
    simulateHardwareAuth 
  } = useAuthOverlay();

  if (!overlayState.isOpen) return null;

  const isPiP = overlayState.mode === 'pip';

  // -------------------------------------------------------------
  // 1. Picture-in-Picture (PiP) Floating HUD
  // -------------------------------------------------------------
  if (isPiP) {
    return (
      <aside 
        aria-label="Biometric Verification Picture in Picture"
        className="fixed bottom-6 right-6 z-50 w-84 sm:w-96 rounded-2xl bg-slate-950/95 text-white border border-slate-700/80 shadow-2xl backdrop-blur-xl p-4 transition-all duration-300 animate-in fade-in slide-in-from-bottom-5"
      >
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                overlayState.stage === 'error' ? 'bg-rose-400' :
                overlayState.stage === 'success' ? 'bg-emerald-400' : 'bg-indigo-400'
              }`} />
              <span className={`relative inline-flex rounded-full h-3 w-3 ${
                overlayState.stage === 'error' ? 'bg-rose-500' :
                overlayState.stage === 'success' ? 'bg-emerald-500' : 'bg-indigo-500'
              }`} />
            </span>
            <span className="text-xs font-bold tracking-wide text-slate-200">
              Biometric PiP Authenticator
            </span>
          </div>

          <div className="flex items-center gap-1">
            {/* Pop Out to Modal Button */}
            <button
              type="button"
              onClick={() => switchMode('pop')}
              title="Pop out to full screen overlay"
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
            {/* Close Button */}
            <button
              type="button"
              onClick={closeOverlay}
              title="Cancel authentication"
              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="py-3.5 flex items-center gap-3">
          {/* Mini Radar / Fingerprint Visual */}
          <div className="relative w-12 h-12 rounded-xl bg-indigo-950/60 border border-indigo-500/30 flex items-center justify-center shrink-0 overflow-hidden">
            <div className="absolute inset-0 bg-indigo-500/10 animate-pulse" />
            {overlayState.stage === 'success' ? (
              <CheckCircle2 className="w-6 h-6 text-emerald-400 relative z-10" />
            ) : overlayState.stage === 'error' ? (
              <AlertCircle className="w-6 h-6 text-rose-400 relative z-10" />
            ) : (
              <>
                <Fingerprint className="w-6 h-6 text-indigo-400 relative z-10 animate-pulse" />
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-indigo-400/80 animate-[scan_1.5s_ease-in-out_infinite]" />
              </>
            )}
          </div>

          {/* Status info */}
          <div className="flex-1 min-w-0">
            <div className="text-[11px] text-slate-400 truncate font-mono">
              {overlayState.email}
            </div>
            <div className="text-xs font-semibold text-white mt-0.5 truncate">
              {overlayState.stage === 'requesting-challenge' && 'Requesting FIDO2 Nonce...'}
              {overlayState.stage === 'biometric-scanning' && 'Scanning Platform Sensor...'}
              {overlayState.stage === 'verifying-signature' && 'Verifying Hardware Signature...'}
              {overlayState.stage === 'success' && 'Biometric Identity Verified!'}
              {overlayState.stage === 'error' && 'Authentication Issue'}
            </div>
            <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-400">
              <span className="font-mono bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">
                RP: {overlayState.rpId}
              </span>
              <span>&bull;</span>
              <span className="flex items-center gap-1 font-mono">
                <Clock className="w-2.5 h-2.5" />
                {overlayState.elapsedSeconds}s
              </span>
            </div>
          </div>
        </div>

        {/* Action footer */}
        {overlayState.stage === 'error' ? (
          <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={retryAuth}
              className="flex-1 py-1.5 px-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Retry Scan</span>
            </button>
            <button
              type="button"
              onClick={simulateHardwareAuth}
              className="py-1.5 px-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium transition-colors cursor-pointer"
              title="Test with simulated hardware passkey"
            >
              Simulate
            </button>
          </div>
        ) : overlayState.stage !== 'success' ? (
          <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
            <span>Touch ID / Face ID Active</span>
            <button
              type="button"
              onClick={() => switchMode('pop')}
              className="text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1"
            >
              <span>Expand to Pop</span>
              <Maximize2 className="w-3 h-3" />
            </button>
          </div>
        ) : null}
      </aside>
    );
  }

  // -------------------------------------------------------------
  // 2. Pop Screen Overlay (Full Modal Security Canvas)
  // -------------------------------------------------------------
  return (
    <div 
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-overlay-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 transition-all duration-200 animate-in fade-in"
    >
      <div 
        id="modal-screen-overlay"
        className="relative w-full max-w-lg rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl text-white overflow-hidden"
      >
        {/* Top Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/50">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-indigo-600/30 border border-indigo-500/40 text-indigo-400 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 id="modal-overlay-title" className="text-sm font-bold text-white tracking-tight">
                Dabels Tech Passkey Security Enclave
              </h3>
              <p className="text-[11px] text-slate-400 font-mono">
                FIDO2 WebAuthn &bull; RP: {overlayState.rpId}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Switch to Picture-in-Picture Button */}
            <button
              id="btn-switch-pip"
              type="button"
              onClick={() => switchMode('pip')}
              className="py-1.5 px-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition-colors cursor-pointer"
              title="Dock into Picture-in-Picture corner widget"
            >
              <Minimize2 className="w-3.5 h-3.5 text-indigo-400" />
              <span>Switch to PiP</span>
            </button>

            {/* Close Button */}
            <button
              id="btn-close-overlay"
              type="button"
              onClick={closeOverlay}
              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Radar & Biometric Scanner Core */}
        <div className="px-6 py-8 flex flex-col items-center text-center space-y-6">
          {/* Animated Biometric Radar Visual */}
          <div className="relative w-36 h-36 flex items-center justify-center">
            {/* Concentric pulsating rings */}
            <div className={`absolute inset-0 rounded-full border border-indigo-500/20 ${
              overlayState.stage === 'biometric-scanning' ? 'animate-ping duration-1000' : ''
            }`} />
            <div className="absolute inset-3 rounded-full border border-indigo-500/30 animate-pulse" />
            <div className="absolute inset-6 rounded-full bg-indigo-950/40 border border-indigo-500/40" />

            {/* Central Biometric Icon with laser sweep */}
            <div className="relative z-10 w-20 h-20 rounded-2xl bg-gradient-to-b from-indigo-600/20 to-indigo-950/80 border border-indigo-400/40 flex items-center justify-center overflow-hidden shadow-inner">
              {overlayState.stage === 'success' ? (
                <CheckCircle2 className="w-10 h-10 text-emerald-400 animate-in zoom-in-50" />
              ) : overlayState.stage === 'error' ? (
                <AlertCircle className="w-10 h-10 text-rose-400 animate-in shake" />
              ) : (
                <>
                  <Fingerprint className="w-10 h-10 text-indigo-400 animate-pulse" />
                  {/* Laser scan line */}
                  <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-bounce opacity-80" />
                </>
              )}
            </div>
          </div>

          {/* Status Message */}
          <div className="space-y-1.5 max-w-sm">
            <h4 className="text-base font-bold text-white">
              {overlayState.stage === 'requesting-challenge' && 'Generating FIDO2 Cryptographic Challenge'}
              {overlayState.stage === 'biometric-scanning' && 'Touch ID / Face ID Biometric Verification'}
              {overlayState.stage === 'verifying-signature' && 'Validating Signature & Replay Protection'}
              {overlayState.stage === 'success' && 'Passkey Authenticated Successfully'}
              {overlayState.stage === 'error' && 'Biometric Verification Needed'}
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              {overlayState.stage === 'requesting-challenge' && 
                `Negotiating with Dabels Tech RP "${overlayState.rpId}" to issue a secure one-time cryptographic nonce.`}
              {overlayState.stage === 'biometric-scanning' && 
                'Please scan your fingerprint or face using your device biometric sensor or security key.'}
              {overlayState.stage === 'verifying-signature' && 
                'Checking hardware attestation signature and verifying resident key credentials on server.'}
              {overlayState.stage === 'success' && 
                `Welcome back, ${overlayState.verifiedUser?.displayName || overlayState.email}. You are securely authenticated.`}
              {overlayState.stage === 'error' && 
                (overlayState.errorMessage || 'The biometric platform sensor could not verify your passkey.')}
            </p>
          </div>

          {/* User & Security Metadata Pill */}
          <div className="w-full bg-slate-950/60 rounded-2xl p-3.5 border border-slate-800 text-left space-y-2 text-xs">
            <div className="flex items-center justify-between text-slate-400">
              <span className="flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-indigo-400" />
                <span>Account:</span>
              </span>
              <span className="font-mono text-slate-200">{overlayState.email}</span>
            </div>

            <div className="flex items-center justify-between text-slate-400">
              <span className="flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-emerald-400" />
                <span>Hardware Enclave:</span>
              </span>
              <span className="font-semibold text-emerald-400">Apple Secure Enclave / TPM 2.0</span>
            </div>

            {overlayState.challengePreview && (
              <div className="flex items-center justify-between text-slate-400">
                <span className="flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-amber-400" />
                  <span>Challenge Nonce:</span>
                </span>
                <span className="font-mono text-[11px] text-amber-300">{overlayState.challengePreview}</span>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-950/70 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-ping" />
            <span>Time active: {overlayState.elapsedSeconds}s</span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {overlayState.stage === 'error' ? (
              <>
                <button
                  type="button"
                  onClick={retryAuth}
                  className="flex-1 sm:flex-none py-2 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Retry Passkey</span>
                </button>
                <button
                  type="button"
                  onClick={simulateHardwareAuth}
                  className="py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                >
                  Simulate Enclave
                </button>
              </>
            ) : overlayState.stage === 'success' ? (
              <button
                type="button"
                onClick={closeOverlay}
                className="w-full sm:w-auto py-2 px-5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                Continue to App
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={simulateHardwareAuth}
                  className="py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                  title="Simulate successful biometric scan without hardware sensor"
                >
                  Simulate Enclave
                </button>
                <button
                  type="button"
                  onClick={closeOverlay}
                  className="py-2 px-3 text-slate-400 hover:text-white rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
