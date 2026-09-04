/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  startRegistration, 
  startAuthentication,
} from '@simplewebauthn/browser';
import { 
  Fingerprint, 
  Key, 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  ArrowRight, 
  RefreshCw, 
  Lock, 
  Code2, 
  Sparkles,
  HelpCircle,
  Laptop,
  Maximize2,
  Minimize2
} from 'lucide-react';
import type { UserSession, RegisteredPasskey } from '../types/auth';
import { useAuthOverlay } from '../context/AuthOverlayContext';
import { logSecurityEvent } from '../lib/audit-service';

interface PasskeyAuthProps {
  currentRpId: string;
  detectedHost: string;
  onAuthSuccess: (session: UserSession) => void;
  onPasskeyRegistered: (passkey: RegisteredPasskey) => void;
  onNavigateToReset: (email: string) => void;
  defaultEmail?: string;
}

export const PasskeyAuth: React.FC<PasskeyAuthProps> = ({
  currentRpId,
  detectedHost,
  onAuthSuccess,
  onPasskeyRegistered,
  onNavigateToReset,
  defaultEmail = 'dabelstech@moredesa.com',
}) => {
  const [email, setEmail] = useState(defaultEmail);
  const [activeMode, setActiveMode] = useState<'register' | 'signin'>('register');
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error' | 'info';
    text: string;
    details?: string;
  } | null>(null);

  const { triggerSignIn, overlayState } = useAuthOverlay();

  // Synchronize auth session if verified through overlay
  React.useEffect(() => {
    if (overlayState.stage === 'success' && overlayState.verifiedUser) {
      onAuthSuccess(overlayState.verifiedUser);
    }
  }, [overlayState.stage, overlayState.verifiedUser, onAuthSuccess]);

  // Live handshake telemetry state
  const [handshakeLog, setHandshakeLog] = useState<{
    step: number;
    title: string;
    status: 'idle' | 'running' | 'success' | 'error';
    payload?: any;
  }[]>([
    { step: 1, title: 'Server Options & Cryptographic Challenge', status: 'idle' },
    { step: 2, title: 'Platform Biometric / FIDO2 Handshake', status: 'idle' },
    { step: 3, title: 'Cryptographic Signature Verification', status: 'idle' },
  ]);

  const updateHandshakeStep = (stepNumber: number, status: 'running' | 'success' | 'error', payload?: any) => {
    setHandshakeLog(prev =>
      prev.map(item =>
        item.step === stepNumber ? { ...item, status, payload: payload || item.payload } : item
      )
    );
  };

  const resetHandshake = () => {
    setHandshakeLog([
      { step: 1, title: 'Server Options & Cryptographic Challenge', status: 'idle' },
      { step: 2, title: 'Platform Biometric / FIDO2 Handshake', status: 'idle' },
      { step: 3, title: 'Cryptographic Signature Verification', status: 'idle' },
    ]);
    setStatusMessage(null);
  };

  /**
   * 1. Register Passkey
   */
  const handleRegister = async () => {
    if (!email) {
      setStatusMessage({ type: 'error', text: 'Email is required to register a passkey' });
      return;
    }

    setIsLoading(true);
    resetHandshake();

    try {
      // Step 1: Get Registration Options from Server
      updateHandshakeStep(1, 'running');
      const optRes = await fetch(
        `/api/auth/registration-options?email=${encodeURIComponent(email)}&rpID=${encodeURIComponent(currentRpId)}`,
        {
          headers: {
            'x-webauthn-rpid': currentRpId,
          },
        }
      );

      if (!optRes.ok) {
        const errJson = await optRes.json();
        throw new Error(errJson.error || 'Failed to fetch registration options');
      }

      const options = await optRes.json();
      updateHandshakeStep(1, 'success', {
        rpID: options.rp.id,
        challenge: `${options.challenge.substring(0, 16)}...`,
        userVerification: options.authenticatorSelection.userVerification,
        residentKey: options.authenticatorSelection.residentKey,
      });

      // Step 2: Invoke Browser WebAuthn API (Apple Keychain / Google Password Manager / Windows Hello)
      updateHandshakeStep(2, 'running');
      let attResp;
      try {
        attResp = await startRegistration({ optionsJSON: options });
        updateHandshakeStep(2, 'success', {
          id: attResp.id.substring(0, 20) + '...',
          type: attResp.type,
          transports: attResp.response?.transports || ['internal'],
        });
      } catch (browserErr: any) {
        updateHandshakeStep(2, 'error');
        // Handle common WebAuthn mismatch
        if (browserErr.name === 'SecurityError' && currentRpId !== detectedHost) {
          throw new Error(
            `WebAuthn Security Constraint: The RP ID "${currentRpId}" does not match the active browser domain "${detectedHost}". Please switch the RP ID selector in the top header to "Current Host (${detectedHost})" to test biometric prompts in this preview window.`
          );
        }
        if (browserErr.name === 'NotAllowedError') {
          throw new Error('Biometric or PIN verification was canceled or timed out.');
        }
        throw browserErr;
      }

      // Step 3: Send Attestation Payload to Server for Verification
      updateHandshakeStep(3, 'running');
      const verifyRes = await fetch('/api/auth/verify-registration', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-webauthn-rpid': currentRpId,
        },
        body: JSON.stringify({
          email,
          credentialPayload: attResp,
        }),
      });

      const verifyData = await verifyRes.json();
      if (!verifyRes.ok) {
        throw new Error(verifyData.error || 'Registration verification rejected by server');
      }

      updateHandshakeStep(3, 'success', {
        verified: true,
        credentialId: verifyData.passkey.credentialId.substring(0, 18) + '...',
        deviceType: verifyData.passkey.deviceType,
      });

      setStatusMessage({
        type: 'success',
        text: 'Passkey successfully created and synced!',
        details: `Your device key has been registered with Dabels Tech under RP ID "${currentRpId}". You can now use biometric sign-in without a password.`,
      });

      onPasskeyRegistered(verifyData.passkey);
      onAuthSuccess({
        email,
        displayName: email.split('@')[0],
        authenticatedVia: 'passkey',
        authenticatedAt: new Date().toLocaleTimeString(),
      });

      // Log successful registration to Firestore
      logSecurityEvent({
        email,
        type: 'Passkey Registration',
        deviceType: verifyData.passkey.deviceType,
        result: 'Success',
        details: `Successfully registered a new passkey under RP ID: ${currentRpId}`
      });
    } catch (err: any) {
      console.error('Registration failed:', err);
      setStatusMessage({
        type: 'error',
        text: 'Registration failed',
        details: err.message || 'An unexpected error occurred during passkey registration.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * 2. Sign In with Passkey (Assertion) with PiP & Pop Screen Overlay Trigger
   */
  const handleSignIn = async (mode: 'pop' | 'pip' = 'pop') => {
    if (!email) {
      setStatusMessage({ type: 'error', text: 'Email is required to sign in' });
      return;
    }

    setIsLoading(true);
    resetHandshake();

    try {
      updateHandshakeStep(1, 'running');
      const session = await triggerSignIn(email, currentRpId, mode);
      if (session) {
        updateHandshakeStep(1, 'success', { rpID: currentRpId, email });
        updateHandshakeStep(2, 'success', { biometricVerified: true });
        updateHandshakeStep(3, 'success', { verified: true });
        setStatusMessage({
          type: 'success',
          text: 'Identity verified successfully!',
          details: `Authenticated as ${email} via on-device passkey biometric signature.`,
        });

        // Log successful sign-in to Firestore
        logSecurityEvent({
          email,
          type: 'Passkey Authentication',
          deviceType: 'Hardware-bound Device',
          result: 'Success',
          details: `Successfully authenticated via biometric signature on RP ID: ${currentRpId}`
        });

        onAuthSuccess(session);
      }
    } catch (err: any) {
      console.error('Sign-in failed:', err);
      setStatusMessage({
        type: 'error',
        text: 'Authentication failed',
        details: err.message || 'Failed to authenticate with passkey.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* Left Column: Primary Auth Card */}
      <div className="lg:col-span-6 space-y-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs">
          {/* Mode Switcher */}
          <div className="flex p-1 bg-slate-100 rounded-xl mb-6">
            <button
              id="tab-mode-register"
              type="button"
              onClick={() => {
                setActiveMode('register');
                setStatusMessage(null);
              }}
              className={`flex-1 py-2.5 px-3 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
                activeMode === 'register'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Fingerprint className="w-4 h-4 text-indigo-600" />
              <span>Register Passkey</span>
            </button>
            <button
              id="tab-mode-signin"
              type="button"
              onClick={() => {
                setActiveMode('signin');
                setStatusMessage(null);
              }}
              className={`flex-1 py-2.5 px-3 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
                activeMode === 'signin'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ShieldCheck className="w-4 h-4 text-indigo-600" />
              <span>Sign In with Passkey</span>
            </button>
          </div>

          {/* Heading */}
          <div className="mb-6">
            <h2 className="text-xl font-bold text-slate-900">
              {activeMode === 'register'
                ? 'Create a Google / Apple Passkey'
                : 'Biometric & PIN Authentication'}
            </h2>
            <p className="text-sm text-slate-600 mt-1">
              {activeMode === 'register'
                ? 'Creates a platform-bound, resident public-key credential synced via your password manager.'
                : 'Instantly sign in using Touch ID, Face ID, Windows Hello, or your device screen lock.'}
            </p>
          </div>

          {/* Input Form */}
          <div className="space-y-4">
            <div>
              <label htmlFor="auth-email-input" className="block text-xs font-semibold text-slate-700 mb-1.5">
                User Email Address
              </label>
              <div className="relative">
                <input
                  id="auth-email-input"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="user@dabelstech.com"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                />
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Associated with Relying Party:{' '}
                <span className="font-mono text-slate-700 font-semibold">{currentRpId}</span>
              </p>
            </div>

            {/* Notice if RP ID differs from current host */}
            {currentRpId !== detectedHost && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold">RP ID Domain Mismatch:</span> You have selected{' '}
                  <code>{currentRpId}</code> while viewing from <code>{detectedHost}</code>. The browser WebAuthn API requires domain alignment. To trigger physical prompts here, switch the header selector to &quot;Current Host&quot;.
                </div>
              </div>
            )}

            {/* Action Button */}
            <div className="pt-2">
              {activeMode === 'register' ? (
                <button
                  id="btn-register-passkey"
                  type="button"
                  disabled={isLoading}
                  onClick={handleRegister}
                  className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm shadow-sm flex items-center justify-center gap-2 transition-all disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Creating Resident Passkey...</span>
                    </>
                  ) : (
                    <>
                      <Fingerprint className="w-4 h-4" />
                      <span>Register On-Device Passkey</span>
                    </>
                  )}
                </button>
              ) : (
                <div className="space-y-2">
                  <button
                    id="btn-signin-passkey-pop"
                    type="button"
                    disabled={isLoading}
                    onClick={() => handleSignIn('pop')}
                    className="w-full py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm shadow-sm flex items-center justify-center gap-2 transition-all disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {isLoading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Scanning Biometrics...</span>
                      </>
                    ) : (
                      <>
                        <Maximize2 className="w-4 h-4 text-indigo-400" />
                        <span>Sign In (Trigger Pop Screen Overlay)</span>
                      </>
                    )}
                  </button>

                  <button
                    id="btn-signin-passkey-pip"
                    type="button"
                    disabled={isLoading}
                    onClick={() => handleSignIn('pip')}
                    className="w-full py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs flex items-center justify-center gap-2 transition-all disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer border border-slate-200"
                  >
                    <Minimize2 className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Launch in Picture-in-Picture (PiP HUD)</span>
                  </button>
                </div>
              )}
            </div>

            {/* Recovery / Forgot Passkey Link */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-500">Lost your device or passkey?</span>
              <button
                id="btn-switch-to-reset"
                type="button"
                onClick={() => onNavigateToReset(email)}
                className="font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
              >
                <span>Password Reset Link &amp; Recovery</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Status Message Banner */}
          {statusMessage && (
            <div
              className={`mt-6 p-4 rounded-xl text-sm border ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : statusMessage.type === 'error'
                  ? 'bg-rose-50 border-rose-200 text-rose-900'
                  : 'bg-indigo-50 border-indigo-200 text-indigo-900'
              }`}
            >
              <div className="flex items-center gap-2 font-semibold">
                {statusMessage.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                )}
                <span>{statusMessage.text}</span>
              </div>
              {statusMessage.details && (
                <p className="mt-1 text-xs opacity-90 leading-relaxed pl-6">
                  {statusMessage.details}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Dabels Tech Security Standards Notice */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-slate-600 space-y-2">
          <div className="flex items-center gap-2 font-semibold text-slate-900">
            <Sparkles className="w-4 h-4 text-indigo-600" />
            <span>Google Password Manager &amp; FIDO2 Compliance</span>
          </div>
          <p className="leading-relaxed">
            In accordance with Dabels Tech specifications, registration requests enforce{' '}
            <code className="bg-white px-1 py-0.5 rounded border border-slate-200 text-slate-800">residentKey: &apos;required&apos;</code>{' '}
            and{' '}
            <code className="bg-white px-1 py-0.5 rounded border border-slate-200 text-slate-800">authenticatorAttachment: &apos;platform&apos;</code>.
            This guarantees synchronization across Google Password Manager, Apple iCloud Keychain, and Windows Hello.
          </p>
        </div>
      </div>

      {/* Right Column: Live WebAuthn Handshake Inspector */}
      <div className="lg:col-span-6 space-y-6">
        <div className="bg-slate-900 rounded-2xl p-6 sm:p-7 text-white shadow-md border border-slate-800">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Code2 className="w-5 h-5 text-indigo-400" />
              <h3 className="font-semibold text-slate-100 text-base">
                FIDO2 Cryptographic Handshake
              </h3>
            </div>
            <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider px-2 py-0.5 rounded bg-slate-800 border border-slate-700">
              Live Monitor
            </span>
          </div>

          {/* Stepper Display */}
          <div className="mt-6 space-y-5">
            {handshakeLog.map((item) => (
              <div
                key={item.step}
                className={`p-4 rounded-xl border transition-all ${
                  item.status === 'running'
                    ? 'bg-indigo-950/40 border-indigo-500/50'
                    : item.status === 'success'
                    ? 'bg-emerald-950/30 border-emerald-500/40'
                    : item.status === 'error'
                    ? 'bg-rose-950/30 border-rose-500/40'
                    : 'bg-slate-800/40 border-slate-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center ${
                        item.status === 'running'
                          ? 'bg-indigo-500 text-white animate-pulse'
                          : item.status === 'success'
                          ? 'bg-emerald-500 text-slate-950'
                          : item.status === 'error'
                          ? 'bg-rose-500 text-white'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {item.step}
                    </span>
                    <span className="font-medium text-sm text-slate-200">{item.title}</span>
                  </div>
                  <div>
                    {item.status === 'running' && (
                      <span className="text-xs text-indigo-400 flex items-center gap-1.5 font-mono">
                        <RefreshCw className="w-3 h-3 animate-spin" /> In Progress
                      </span>
                    )}
                    {item.status === 'success' && (
                      <span className="text-xs text-emerald-400 flex items-center gap-1 font-mono">
                        <CheckCircle2 className="w-3.5 h-3.5" /> OK
                      </span>
                    )}
                    {item.status === 'error' && (
                      <span className="text-xs text-rose-400 font-mono">Failed</span>
                    )}
                    {item.status === 'idle' && (
                      <span className="text-xs text-slate-500 font-mono">Waiting</span>
                    )}
                  </div>
                </div>

                {/* Sub-payload telemetry display */}
                {item.payload && (
                  <div className="mt-3 pt-3 border-t border-slate-700/50 text-[11px] font-mono text-slate-300">
                    <pre className="overflow-x-auto whitespace-pre-wrap leading-relaxed">
                      {JSON.stringify(item.payload, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Architecture info */}
          <div className="mt-6 pt-5 border-t border-slate-800 flex items-start gap-3 text-xs text-slate-400">
            <Laptop className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              Your device private key remains stored securely inside your secure enclave (Apple Secure Enclave, Android Titan M2, or Windows TPM). Dabels Tech servers exclusively store and verify the public key.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
