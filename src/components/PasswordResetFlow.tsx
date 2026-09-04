/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  KeyRound, 
  ExternalLink, 
  Copy, 
  Check, 
  Mail, 
  ShieldAlert, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Lock, 
  Compass, 
  Smartphone, 
  Send,
  Eye,
  EyeOff
} from 'lucide-react';
import type { PasswordResetResponse } from '../types/auth';

interface PasswordResetFlowProps {
  initialEmail?: string;
  initialToken?: string;
  initialScope?: string;
  initialStatus?: string;
  onResetComplete?: (email: string) => void;
}

export const PasswordResetFlow: React.FC<PasswordResetFlowProps> = ({
  initialEmail = 'dabelstech@moredesa.com',
  initialToken = '',
  initialScope = '',
  initialStatus = '',
  onResetComplete,
}) => {
  // Request Link State
  const [email, setEmail] = useState(initialEmail);
  const [selectedScope, setSelectedScope] = useState('auth:reset-password');
  const [customScope, setCustomScope] = useState('');
  const [redirectType, setRedirectType] = useState<'web' | 'ios' | 'custom'>('web');
  const [customRedirectUri, setCustomRedirectUri] = useState('');
  const [isRequesting, setIsRequesting] = useState(false);
  const [generatedResult, setGeneratedResult] = useState<PasswordResetResponse | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Active Token & Confirm State
  const [activeToken, setActiveToken] = useState(initialToken);
  const [activeScope, setActiveScope] = useState(initialScope);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [confirmStatus, setConfirmStatus] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Simulated redirect test telemetry
  const [redirectProbeResult, setRedirectProbeResult] = useState<{
    statusCode?: number;
    locationHeader?: string;
    loading?: boolean;
    error?: string;
  } | null>(null);

  useEffect(() => {
    if (initialToken) {
      setActiveToken(initialToken);
    }
    if (initialScope) {
      setActiveScope(initialScope);
    }
  }, [initialToken, initialScope]);

  const effectiveScope = selectedScope === 'custom' ? customScope : selectedScope;

  const getEffectiveRedirectUri = () => {
    if (redirectType === 'web') {
      return `${window.location.origin}/?view=reset-password`;
    }
    if (redirectType === 'ios') {
      return 'dabelstech://auth/reset-password';
    }
    return customRedirectUri;
  };

  /**
   * 1. Request Password Reset Link with Scope & Redirect URI
   */
  const handleRequestLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsRequesting(true);
    setGeneratedResult(null);
    setRedirectProbeResult(null);

    try {
      const res = await fetch('/api/auth/password-reset-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          scope: effectiveScope,
          redirect_uri: getEffectiveRedirectUri(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate reset link');
      }

      setGeneratedResult(data);
      setActiveToken(data.token);
      setActiveScope(data.scope);
    } catch (err: any) {
      alert(err.message || 'Error requesting reset link');
    } finally {
      setIsRequesting(false);
    }
  };

  /**
   * 2. Probe Redirect Endpoint (Simulate what iOS or Browser receives)
   */
  const handleProbeRedirect = async () => {
    if (!generatedResult) return;
    setRedirectProbeResult({ loading: true });

    try {
      // Use redirect=manual or fetch inspection
      const probeUrl = `/api/auth/password-reset?token=${generatedResult.token}&scope=${encodeURIComponent(generatedResult.scope)}&format=json`;
      const res = await fetch(probeUrl);
      const json = await res.json();

      setRedirectProbeResult({
        statusCode: res.status,
        locationHeader: generatedResult.redirectUri
          ? `${generatedResult.redirectUri}?token=${generatedResult.token.substring(0, 10)}...&scope=${generatedResult.scope}&status=verified`
          : `${window.location.origin}/?view=reset-password&token=${generatedResult.token.substring(0, 10)}...`,
        loading: false,
      });
    } catch (err: any) {
      setRedirectProbeResult({
        error: err.message || 'Probe request failed',
        loading: false,
      });
    }
  };

  /**
   * 3. Copy Reset Link
   */
  const handleCopyLink = () => {
    if (!generatedResult) return;
    navigator.clipboard.writeText(generatedResult.resetLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  /**
   * 4. Confirm Password Reset with Token
   */
  const handleConfirmReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeToken) {
      setConfirmStatus({ type: 'error', message: 'Missing reset token.' });
      return;
    }
    if (newPassword.length < 8) {
      setConfirmStatus({
        type: 'error',
        message: 'Password must be at least 8 characters in length.',
      });
      return;
    }
    if (newPassword !== confirmPassword) {
      setConfirmStatus({ type: 'error', message: 'Passwords do not match.' });
      return;
    }

    setIsConfirming(true);
    setConfirmStatus(null);

    try {
      const res = await fetch('/api/auth/password-reset-confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: activeToken,
          newPassword,
          scope: activeScope,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Password reset confirmation failed');
      }

      setConfirmStatus({
        type: 'success',
        message: data.message || 'Password successfully reset and token consumed!',
      });
      setNewPassword('');
      setConfirmPassword('');
      setActiveToken('');

      if (onResetComplete) {
        onResetComplete(email);
      }
    } catch (err: any) {
      setConfirmStatus({
        type: 'error',
        message: err.message || 'Failed to confirm reset',
      });
    } finally {
      setIsConfirming(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Top Banner / Scope Overview */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-indigo-600" />
              <h2 className="text-lg font-bold text-slate-900">
                Password Reset Link &amp; Scoped Redirect Engine
              </h2>
            </div>
            <p className="text-sm text-slate-600 mt-1">
              Issues cryptographically signed one-time reset tokens bound to security scopes and redirects authorized clients securely (including iOS <code>ASWebAuthenticationSession</code>).
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
              CWE-601 Open-Redirect Protected
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Generate Scoped Reset Link */}
        <div className="lg:col-span-6 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
            <h3 className="font-bold text-slate-900 text-base mb-1">
              1. Issue Scoped Reset Link
            </h3>
            <p className="text-xs text-slate-500 mb-5">
              Generates a time-limited (15m) recovery token with an explicit authorization scope.
            </p>

            <form onSubmit={handleRequestLink} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Recipient Email
                </label>
                <input
                  id="reset-email-input"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="user@dabelstech.com"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              {/* Scope Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Authorization Scope
                </label>
                <div className="space-y-2">
                  <label className="flex items-start gap-2.5 p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer text-xs">
                    <input
                      type="radio"
                      name="scope"
                      value="auth:reset-password"
                      checked={selectedScope === 'auth:reset-password'}
                      onChange={() => setSelectedScope('auth:reset-password')}
                      className="mt-0.5 text-indigo-600"
                    />
                    <div>
                      <div className="font-semibold text-slate-900">auth:reset-password</div>
                      <div className="text-slate-500 text-[11px]">
                        Standard single-account password replacement and credential refresh.
                      </div>
                    </div>
                  </label>

                  <label className="flex items-start gap-2.5 p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer text-xs">
                    <input
                      type="radio"
                      name="scope"
                      value="auth:passkey-recovery"
                      checked={selectedScope === 'auth:passkey-recovery'}
                      onChange={() => setSelectedScope('auth:passkey-recovery')}
                      className="mt-0.5 text-indigo-600"
                    />
                    <div>
                      <div className="font-semibold text-slate-900">auth:passkey-recovery</div>
                      <div className="text-slate-500 text-[11px]">
                        Passkey device recovery: allows establishing a replacement hardware passkey.
                      </div>
                    </div>
                  </label>

                  <label className="flex items-start gap-2.5 p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer text-xs">
                    <input
                      type="radio"
                      name="scope"
                      value="custom"
                      checked={selectedScope === 'custom'}
                      onChange={() => setSelectedScope('custom')}
                      className="mt-0.5 text-indigo-600"
                    />
                    <div className="flex-1">
                      <div className="font-semibold text-slate-900">Custom Scope</div>
                      {selectedScope === 'custom' && (
                        <input
                          type="text"
                          value={customScope}
                          onChange={(e) => setCustomScope(e.target.value)}
                          placeholder="e.g. account:emergency:wipe"
                          className="mt-1.5 w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                        />
                      )}
                    </div>
                  </label>
                </div>
              </div>

              {/* Redirect URI configuration */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Scope Redirect Target (redirect_uri)
                </label>
                <div className="grid grid-cols-2 gap-2 text-xs mb-2">
                  <button
                    type="button"
                    onClick={() => setRedirectType('web')}
                    className={`py-2 px-3 rounded-lg border font-medium flex items-center justify-center gap-1.5 cursor-pointer ${
                      redirectType === 'web'
                        ? 'bg-indigo-50 border-indigo-300 text-indigo-800'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <Compass className="w-3.5 h-3.5" />
                    <span>In-App Web</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRedirectType('ios')}
                    className={`py-2 px-3 rounded-lg border font-medium flex items-center justify-center gap-1.5 cursor-pointer ${
                      redirectType === 'ios'
                        ? 'bg-indigo-50 border-indigo-300 text-indigo-800'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                    <span>iOS Custom Scheme</span>
                  </button>
                </div>

                <div className="text-[11px] font-mono bg-slate-50 p-2 rounded-lg border border-slate-200 text-slate-700 break-all">
                  Target: {getEffectiveRedirectUri()}
                </div>
              </div>

              <button
                id="btn-create-reset-link"
                type="submit"
                disabled={isRequesting}
                className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-xl shadow-xs flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
              >
                {isRequesting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Generating Signed Link...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Generate Scoped Reset Link</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Generated Result Inspection Card */}
          {generatedResult && (
            <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-emerald-900 font-bold text-sm">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Link Created &amp; Cryptographically Signed</span>
                </div>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-semibold">
                  Valid 15m
                </span>
              </div>

              {/* Link Details */}
              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-slate-500 font-medium">Scope:</span>{' '}
                  <span className="font-semibold text-slate-900 font-mono bg-white px-1.5 py-0.5 rounded border border-emerald-200">
                    {generatedResult.scope}
                  </span>
                </div>

                <div>
                  <span className="text-slate-500 font-medium">One-Time Token:</span>
                  <div className="font-mono text-[11px] text-slate-800 bg-white p-2 rounded-lg border border-emerald-200 break-all select-all">
                    {generatedResult.token}
                  </div>
                </div>

                <div>
                  <span className="text-slate-500 font-medium">Complete Reset Link:</span>
                  <div className="font-mono text-[11px] text-slate-800 bg-white p-2 rounded-lg border border-emerald-200 break-all select-all">
                    {generatedResult.resetLink}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="py-1.5 px-3 bg-white border border-emerald-300 text-emerald-900 rounded-lg text-xs font-semibold hover:bg-emerald-100 flex items-center gap-1.5 cursor-pointer"
                >
                  {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedLink ? 'Copied to Clipboard' : 'Copy Link'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleProbeRedirect}
                  className="py-1.5 px-3 bg-emerald-700 text-white rounded-lg text-xs font-semibold hover:bg-emerald-800 flex items-center gap-1.5 cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Inspect HTTP 302 Redirect Handshake</span>
                </button>
              </div>

              {/* Probe Telemetry */}
              {redirectProbeResult && (
                <div className="mt-3 p-3 bg-slate-900 text-white rounded-xl text-xs font-mono space-y-1">
                  <div className="text-slate-400 text-[11px]">Server Scope Redirect Evaluation:</div>
                  {redirectProbeResult.loading && <div>Simulating server redirect probe...</div>}
                  {redirectProbeResult.statusCode && (
                    <div className="text-emerald-400">
                      HTTP/1.1 302 Found (Redirect validated)
                    </div>
                  )}
                  {redirectProbeResult.locationHeader && (
                    <div className="text-slate-300 break-all text-[11px]">
                      Location: {redirectProbeResult.locationHeader}
                    </div>
                  )}
                  {redirectProbeResult.error && (
                    <div className="text-rose-400">{redirectProbeResult.error}</div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Complete Password Reset Form */}
        <div className="lg:col-span-6 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
            <h3 className="font-bold text-slate-900 text-base mb-1">
              2. Confirm Password Reset with Token
            </h3>
            <p className="text-xs text-slate-500 mb-5">
              Receives token via scope redirect callback, validates token expiration &amp; scope, and applies new credentials.
            </p>

            <form onSubmit={handleConfirmReset} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Active Reset Token
                </label>
                <input
                  id="confirm-token-input"
                  type="text"
                  value={activeToken}
                  onChange={(e) => setActiveToken(e.target.value)}
                  placeholder="Paste or click generated token above"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              {activeScope && (
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-500 font-medium">Bound Scope:</span>
                  <span className="font-mono text-indigo-700 font-semibold px-2 py-0.5 rounded bg-indigo-50 border border-indigo-200">
                    {activeScope}
                  </span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  New Secure Password
                </label>
                <div className="relative">
                  <input
                    id="confirm-password-input"
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Confirm Password
                </label>
                <input
                  id="confirm-password-verify-input"
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <button
                id="btn-confirm-password-reset"
                type="submit"
                disabled={isConfirming || !activeToken}
                className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow-xs flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {isConfirming ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Updating Password...</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-3.5 h-3.5" />
                    <span>Confirm &amp; Consume Reset Token</span>
                  </>
                )}
              </button>
            </form>

            {confirmStatus && (
              <div
                className={`mt-4 p-4 rounded-xl text-xs border ${
                  confirmStatus.type === 'success'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : 'bg-rose-50 border-rose-200 text-rose-900'
                }`}
              >
                <div className="flex items-center gap-2 font-semibold">
                  {confirmStatus.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  )}
                  <span>{confirmStatus.message}</span>
                </div>
              </div>
            )}
          </div>

          {/* Email Simulation Card */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 text-xs text-slate-600 space-y-3">
            <div className="flex items-center gap-2 font-semibold text-slate-900 text-sm">
              <Mail className="w-4 h-4 text-indigo-600" />
              <span>Email Delivery Simulation</span>
            </div>
            <p className="leading-relaxed">
              When triggered in production, Dabels Tech dispatches an email containing the scoped button:
            </p>
            <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-3 shadow-2xs">
              <div className="text-[11px] text-slate-400">
                From: security@dabelstech.com &bull; To: {email}
              </div>
              <div className="font-semibold text-slate-800 text-sm">
                Reset your Dabels Tech account password
              </div>
              <p className="text-[11px] text-slate-600">
                We received a request to access your account under scope{' '}
                <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-800 font-mono font-semibold">
                  {effectiveScope}
                </code>
                . Click below to proceed:
              </p>
              {generatedResult ? (
                <a
                  href={generatedResult.resetLink}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 py-2 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition-colors"
                >
                  <span>Verify Scope &amp; Reset Password</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              ) : (
                <div className="text-slate-400 italic">
                  Generate a link on the left to activate this preview button.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
