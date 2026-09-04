/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  ShieldAlert, 
  Cpu, 
  Fingerprint, 
  GitPullRequest, 
  GitCommit, 
  Play, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Key, 
  RefreshCw, 
  Zap, 
  ExternalLink, 
  Copy, 
  Check, 
  Lock, 
  Unlock, 
  Sparkles,
  ChevronRight,
  Sliders,
  Terminal,
  FileCode,
  Shield,
  Smartphone,
  Laptop,
  Download
} from 'lucide-react';
import type { CodeRabbitConfig, CodeRabbitPermissions } from '../types/github';
import { useAuthOverlay } from '../context/AuthOverlayContext';

interface CodeRabbitDeviceBindingProps {
  onWorkflowRunTriggered?: () => void;
  onPrApproved?: () => void;
  onViewWorkflowCode?: () => void;
}

export const CodeRabbitDeviceBinding: React.FC<CodeRabbitDeviceBindingProps> = ({
  onWorkflowRunTriggered,
  onPrApproved,
  onViewWorkflowCode
}) => {
  const { triggerSignIn, setPreferMode } = useAuthOverlay();
  const [config, setConfig] = useState<CodeRabbitConfig | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // Binding Form Modal / State
  const [isBindingModalOpen, setIsBindingModalOpen] = useState(false);
  const [bindDeviceName, setBindDeviceName] = useState('Apple Silicon MacBook Pro (Touch ID Secure Enclave)');
  const [bindBiometric, setBindBiometric] = useState<'Touch ID' | 'Face ID' | 'FIDO2 Security Key'>('Touch ID');
  const [bindGrantAllAccess, setBindGrantAllAccess] = useState(true);

  const fetchConfig = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/github/coderabbit/config');
      if (res.ok) {
        const data = await res.json();
        setConfig(data.config);
      }
    } catch (err) {
      console.error('Failed to load CodeRabbit config:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const showSuccess = (msg: string) => {
    setSuccessMessage(msg);
    setErrorMessage(null);
    setTimeout(() => setSuccessMessage(null), 4500);
  };

  const showError = (msg: string) => {
    setErrorMessage(msg);
    setSuccessMessage(null);
    setTimeout(() => setErrorMessage(null), 4500);
  };

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2000);
  };

  // 1. Authorize & Bind Device
  const handleConfirmBindDevice = async () => {
    setActionInProgress('binding');
    try {
      const res = await fetch('/api/github/coderabbit/bind-device', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceName: bindDeviceName,
          biometricType: bindBiometric,
          email: 'dabelstech@moredesa.com',
          grantAllAccess: bindGrantAllAccess
        })
      });

      if (!res.ok) throw new Error('Failed to bind device');
      const data = await res.json();
      setConfig(data.config);
      setIsBindingModalOpen(false);
      showSuccess(`Device "${bindDeviceName}" bound successfully with hardware assertion. CodeRabbit authorized with all-access.`);
    } catch (err: any) {
      showError(err.message || 'Device binding failed');
    } finally {
      setActionInProgress(null);
    }
  };

  // 2. Toggle Master All-Access
  const handleToggleAllAccess = async () => {
    if (!config) return;
    const newAllAccess = !config.allAccessGranted;
    setActionInProgress('toggle-access');
    try {
      const res = await fetch('/api/github/coderabbit/update-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          allAccessGranted: newAllAccess,
          canPushCommit: newAllAccess,
          canApproveRequest: newAllAccess,
          autoRunEnabled: newAllAccess
        })
      });

      if (!res.ok) throw new Error('Failed to update access');
      const data = await res.json();
      setConfig(data.config);
      showSuccess(newAllAccess 
        ? 'CodeRabbit granted ALL ACCESS (contents:write, pull-requests:write, push commit, approve request).'
        : 'CodeRabbit all-access disabled. Write permissions restricted to read-only.');
    } catch (err: any) {
      showError(err.message || 'Failed to toggle all-access');
    } finally {
      setActionInProgress(null);
    }
  };

  // 3. Autorun CodeRabbit Job in GitHub CI/CD
  const handleTriggerAutorun = async () => {
    setActionInProgress('autorun');
    try {
      const res = await fetch('/api/github/coderabbit/autorun-job', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          branch: 'feat/pip-overlay-screen',
          prNumber: 42,
          forcePushCommit: true,
          forceApprovePr: true
        })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || errorData.error || 'Failed to autorun job');
      }

      const data = await res.json();
      showSuccess(`🚀 CodeRabbit autorun job dispatched in GitHub CI/CD! Automated patch pushed and PR #42 approved.`);
      fetchConfig();
      if (onWorkflowRunTriggered) onWorkflowRunTriggered();
      if (onPrApproved) onPrApproved();
    } catch (err: any) {
      showError(err.message || 'Failed to autorun job');
    } finally {
      setActionInProgress(null);
    }
  };

  // 4. Push Commit via CodeRabbit
  const handlePushCommit = async () => {
    setActionInProgress('push-commit');
    try {
      const res = await fetch('/api/github/coderabbit/push-commit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          branch: 'feat/pip-overlay-screen',
          message: 'coderabbit(crypto): harden WebAuthn residentKey & device assertion'
        })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || errorData.error || 'Failed to push commit');
      }

      const data = await res.json();
      showSuccess(`📝 CodeRabbit pushed automated commit "${data.commitSha}" with hardware device signature!`);
      fetchConfig();
      if (onWorkflowRunTriggered) onWorkflowRunTriggered();
    } catch (err: any) {
      showError(err.message || 'Failed to push commit');
    } finally {
      setActionInProgress(null);
    }
  };

  // 5. Approve Request via CodeRabbit
  const handleApprovePr = async () => {
    setActionInProgress('approve-pr');
    try {
      const res = await fetch('/api/github/coderabbit/approve-pr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prNumber: 42,
          comment: '✅ CodeRabbit Review: WebAuthn Resident Key constraints, ATS conformance, and CI/CD gates satisfied. Device binding verified.'
        })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || errorData.error || 'Failed to approve pull request');
      }

      const data = await res.json();
      showSuccess(`✅ CodeRabbit approved Pull Request #42! Review registered with device-bound token.`);
      fetchConfig();
      if (onPrApproved) onPrApproved();
    } catch (err: any) {
      showError(err.message || 'Failed to approve pull request');
    } finally {
      setActionInProgress(null);
    }
  };

  // 6. Revoke Binding
  const handleRevokeBinding = async () => {
    if (!window.confirm('Are you sure you want to revoke device binding and remove CodeRabbit write access?')) {
      return;
    }
    setActionInProgress('revoke');
    try {
      const res = await fetch('/api/github/coderabbit/revoke', { method: 'POST' });
      if (!res.ok) throw new Error('Failed to revoke access');
      const data = await res.json();
      setConfig(data.config);
      showSuccess('Device binding revoked. CodeRabbit write access removed.');
    } catch (err: any) {
      showError(err.message || 'Failed to revoke access');
    } finally {
      setActionInProgress(null);
    }
  };

  const handleExportAuditLogs = () => {
    if (!config || config.recentAuditLogs.length === 0) return;
    
    const headers = ['Timestamp', 'Action', 'Status', 'Device Signature', 'Details'];
    const rows = config.recentAuditLogs.map(log => [
      new Date(log.timestamp).toLocaleString().replace(/,/g, ''),
      log.action,
      log.status,
      log.deviceFingerprint || 'enclave-hw-sig',
      log.details.replace(/,/g, ';') // Simple CSV escaping
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `github-audit-logs-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!config) {
    return (
      <div className="p-12 text-center text-slate-500 bg-white rounded-2xl border border-slate-200">
        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-3 text-indigo-600" />
        <p className="text-sm">Loading CodeRabbit device binding configuration...</p>
      </div>
    );
  }

  const isBound = config.deviceBinding?.isBound;
  const isAllAccess = config.allAccessGranted;

  return (
    <div className="space-y-6">
      {/* Alert Banners */}
      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-sm flex items-center justify-between animate-in fade-in duration-200">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span className="font-medium">{successMessage}</span>
          </div>
          <button 
            type="button" 
            onClick={() => setSuccessMessage(null)}
            className="text-xs text-emerald-700 hover:text-emerald-950 underline ml-4 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-sm flex items-center justify-between animate-in fade-in duration-200">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <span className="font-medium">{errorMessage}</span>
          </div>
          <button 
            type="button" 
            onClick={() => setErrorMessage(null)}
            className="text-xs text-rose-700 hover:text-rose-950 underline ml-4 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Hero Card: Device Binding & All Access Status */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 rounded-2xl p-6 text-white border border-slate-700 shadow-xl relative overflow-hidden">
        {/* Subtle decorative glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

        <div className="relative z-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-700/80">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-300 shadow-inner shrink-0">
                <Cpu className="w-7 h-7" />
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-bold tracking-tight">CodeRabbit CI/CD Device Binding</h2>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold tracking-wide uppercase flex items-center gap-1.5 ${
                    isBound && isAllAccess
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : isBound
                      ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  }`}>
                    <span className={`w-2 h-2 rounded-full ${isBound && isAllAccess ? 'bg-emerald-400 animate-pulse' : isBound ? 'bg-indigo-400' : 'bg-amber-400'}`} />
                    {isBound && isAllAccess ? 'Device Bound & All Access Granted' : isBound ? 'Device Bound' : 'Binding Required'}
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                  Cryptographically authorize CodeRabbit to automatically run CI/CD jobs, push review suggestion commits, and approve Pull Requests using hardware-attested device credentials.
                </p>
              </div>
            </div>

            {/* Quick Toggle / Re-bind button */}
            <div className="flex items-center gap-3 shrink-0">
              {isBound ? (
                <>
                  <button
                    id="btn-coderabbit-toggle-all-access"
                    type="button"
                    onClick={handleToggleAllAccess}
                    disabled={actionInProgress !== null}
                    className={`py-2.5 px-4 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer shadow-xs ${
                      isAllAccess
                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                        : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                    }`}
                  >
                    {isAllAccess ? <Check className="w-4 h-4" /> : <Zap className="w-4 h-4" />}
                    <span>{isAllAccess ? 'All Access Granted' : 'Grant All Access'}</span>
                  </button>

                  <button
                    id="btn-coderabbit-rebind-device"
                    type="button"
                    onClick={() => setIsBindingModalOpen(true)}
                    className="py-2.5 px-3.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold border border-slate-600 transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Re-bind</span>
                  </button>
                </>
              ) : (
                <button
                  id="btn-coderabbit-bind-device"
                  type="button"
                  onClick={() => setIsBindingModalOpen(true)}
                  className="py-2.5 px-5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-lg transition-all cursor-pointer"
                >
                  <Fingerprint className="w-4 h-4" />
                  <span>Bind Device &amp; Authorize CodeRabbit</span>
                </button>
              )}
            </div>
          </div>

          {/* Bound Device Hardware Metadata */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
            <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <Laptop className="w-3.5 h-3.5 text-indigo-400" />
                <span>Bound Hardware Device</span>
              </div>
              <div className="text-sm font-bold text-white truncate" title={config.deviceBinding.deviceName}>
                {config.deviceBinding.deviceName || 'No device bound'}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                Biometric: {config.deviceBinding.biometricType}
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Attestation Level</span>
              </div>
              <div className="text-sm font-bold text-emerald-300">
                {config.deviceBinding.attestationLevel}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                Platform: Apple Secure Enclave
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-amber-400" />
                <span>Key Fingerprint</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <code className="text-xs font-mono text-amber-200 truncate" title={config.deviceBinding.publicKeyFingerprint}>
                  {config.deviceBinding.publicKeyFingerprint.substring(0, 18)}...
                </code>
                <button
                  type="button"
                  onClick={() => handleCopy(config.deviceBinding.publicKeyFingerprint, 'fingerprint')}
                  className="text-slate-400 hover:text-white p-1 rounded transition-colors"
                  title="Copy Fingerprint"
                >
                  {copiedText === 'fingerprint' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                SHA-256 Public Key Assertion
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-sky-400" />
                <span>Bound Authority</span>
              </div>
              <div className="text-sm font-bold text-sky-200 truncate" title={config.deviceBinding.boundByEmail}>
                {config.deviceBinding.boundByEmail}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                {new Date(config.deviceBinding.boundAt).toLocaleDateString()} at {new Date(config.deviceBinding.boundAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Action Command Bar: Autorun, Push Commit, Approve PR */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Zap className="w-4 h-4 text-indigo-600" />
              <span>Direct CodeRabbit Operations (Device Bound)</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Execute real-time automated CI/CD actions authorized under the bound device's cryptographic credentials.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Target Branch: <strong className="text-slate-800 font-mono">feat/pip-overlay-screen</strong> (PR #42)</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Action 1: Autorun Job in CI/CD */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 hover:border-indigo-200 transition-all flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
                  CI/CD Pipeline
                </span>
                <span className="text-[11px] text-slate-400 font-mono">coderabbit.yml</span>
              </div>
              <div className="text-sm font-bold text-slate-900">Autorun Job in GitHub CI/CD</div>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                Dispatches full automated pipeline: verifies device binding, executes deep AST analysis, auto-pushes patch, and verifies gates.
              </p>
            </div>

            <button
              id="btn-coderabbit-autorun"
              type="button"
              onClick={handleTriggerAutorun}
              disabled={actionInProgress !== null || !isBound}
              className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs"
            >
              {actionInProgress === 'autorun' ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Executing Autorun Job...</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Autorun CodeRabbit Job</span>
                </>
              )}
            </button>
          </div>

          {/* Action 2: Push Commit */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 hover:border-indigo-200 transition-all flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                  contents: write
                </span>
                <span className="text-[11px] text-slate-400 font-mono">coderabbitai[bot]</span>
              </div>
              <div className="text-sm font-bold text-slate-900">Push Commit via CodeRabbit</div>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                Pushes an automated security hardening commit directly to PR #42 with verified device cryptographic signature.
              </p>
            </div>

            <button
              id="btn-coderabbit-push-commit"
              type="button"
              onClick={handlePushCommit}
              disabled={actionInProgress !== null || !isBound || (!config.canPushCommit && !config.allAccessGranted)}
              className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs"
            >
              {actionInProgress === 'push-commit' ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Pushing Automated Commit...</span>
                </>
              ) : (
                <>
                  <GitCommit className="w-3.5 h-3.5" />
                  <span>Push Commit (CodeRabbit)</span>
                </>
              )}
            </button>
          </div>

          {/* Action 3: Approve Request */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 hover:border-indigo-200 transition-all flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold uppercase tracking-wider text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-100">
                  pull-requests: write
                </span>
                <span className="text-[11px] text-slate-400 font-mono">Review State</span>
              </div>
              <div className="text-sm font-bold text-slate-900">Approve Request (CodeRabbit)</div>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                Submits a formal CodeRabbit review approval on PR #42 with WebAuthn compliance attestation.
              </p>
            </div>

            <button
              id="btn-coderabbit-approve-pr"
              type="button"
              onClick={handleApprovePr}
              disabled={actionInProgress !== null || !isBound || (!config.canApproveRequest && !config.allAccessGranted)}
              className="w-full py-2.5 px-4 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs"
            >
              {actionInProgress === 'approve-pr' ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Submitting Approval...</span>
                </>
              ) : (
                <>
                  <GitPullRequest className="w-3.5 h-3.5" />
                  <span>Approve Pull Request #42</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Permissions Matrix & Autorun Rules */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Granted Permissions (All Access breakdown) */}
        <div className="lg:col-span-6 bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-indigo-600" />
                <span>CodeRabbit GitHub CI/CD Permissions</span>
              </h3>
              <p className="text-xs text-slate-500">Granted via device binding hardware attestation</p>
            </div>
            <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${
              isAllAccess ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'
            }`}>
              {isAllAccess ? 'ALL ACCESS GRANTED' : 'CUSTOM SCOPES'}
            </span>
          </div>

          <div className="space-y-2.5">
            {[
              {
                scope: 'contents: write',
                label: 'Push Commits & Patches',
                desc: 'Allows CodeRabbit to push code fixes and suggestions directly to branches.',
                granted: config.permissions.contents === 'write'
              },
              {
                scope: 'pull-requests: write',
                label: 'Approve Pull Requests',
                desc: 'Allows CodeRabbit to approve PRs, submit reviews, and post inline comments.',
                granted: config.permissions.pullRequests === 'write'
              },
              {
                scope: 'checks: write',
                label: 'AST Check Runs',
                desc: 'Allows CodeRabbit to publish AST static analysis and security check statuses.',
                granted: config.permissions.checks === 'write'
              },
              {
                scope: 'statuses: write',
                label: 'Commit Status Gates',
                desc: 'Allows CodeRabbit to update CI/CD status badges and green-gate PRs.',
                granted: config.permissions.statuses === 'write'
              },
              {
                scope: 'id-token: write',
                label: 'OIDC Device Attestation',
                desc: 'Generates secure cryptographic tokens proving hardware device binding.',
                granted: config.permissions.idToken === 'write'
              },
              {
                scope: 'actions: write',
                label: 'CI/CD Autorun Dispatch',
                desc: 'Allows CodeRabbit to trigger and manage automated GitHub Actions workflow runs.',
                granted: config.permissions.actions === 'write'
              }
            ].map((perm) => (
              <div 
                key={perm.scope}
                className="flex items-start justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <code className="font-mono font-bold text-slate-900 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                      {perm.scope}
                    </code>
                    <span className="font-semibold text-slate-800">{perm.label}</span>
                  </div>
                  <p className="text-slate-500 text-[11px] leading-relaxed">{perm.desc}</p>
                </div>
                <div className="shrink-0 ml-3">
                  {perm.granted ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      <Check className="w-3 h-3 text-emerald-600" />
                      <span>Active</span>
                    </span>
                  ) : (
                    <span className="text-[11px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                      Read Only
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Autorun Rules & Last Run Summary */}
        <div className="lg:col-span-6 space-y-6">
          {/* Autorun Rules */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-indigo-600" />
                  <span>CI/CD Autorun Policies</span>
                </h3>
                <p className="text-xs text-slate-500">Triggers configured in .github/workflows/coderabbit.yml</p>
              </div>
              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                AUTORUN ACTIVE
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                <div>
                  <div className="font-semibold text-slate-900">Autorun on Pull Request</div>
                  <div className="text-slate-500 text-[11px]">Triggers on: opened, synchronize, ready_for_review</div>
                </div>
                <span className="font-bold text-emerald-600">Enabled</span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                <div>
                  <div className="font-semibold text-slate-900">Autorun on Commit Push</div>
                  <div className="text-slate-500 text-[11px]">Branches: main, release/*</div>
                </div>
                <span className="font-bold text-emerald-600">Enabled</span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                <div>
                  <div className="font-semibold text-slate-900">Auto-Apply &amp; Push Fixes</div>
                  <div className="text-slate-500 text-[11px]">Pushes verified patches using device token</div>
                </div>
                <span className="font-bold text-emerald-600">Enabled</span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                <div>
                  <div className="font-semibold text-slate-900">Auto-Approve PR on Green Gate</div>
                  <div className="text-slate-500 text-[11px]">Submits review state: APPROVED</div>
                </div>
                <span className="font-bold text-emerald-600">Enabled</span>
              </div>
            </div>
          </div>

          {/* Last Autorun Job Summary */}
          {config.lastAutorunSummary && (
            <div className="bg-slate-900 rounded-2xl p-5 text-white border border-slate-800 shadow-md space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-300">Last Autorun Result</span>
                </div>
                <span className="text-[11px] font-mono text-indigo-300">
                  {config.lastAutorunSummary.runId}
                </span>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed font-sans">
                {config.lastAutorunSummary.summary}
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-800 text-[11px]">
                {config.lastAutorunSummary.commitPushed && (
                  <div className="flex items-center gap-1.5 text-emerald-300">
                    <GitCommit className="w-3.5 h-3.5" />
                    <span>Pushed Commit: <strong className="font-mono">{config.lastAutorunSummary.commitPushed}</strong></span>
                  </div>
                )}
                {config.lastAutorunSummary.prApproved && (
                  <div className="flex items-center gap-1.5 text-purple-300">
                    <GitPullRequest className="w-3.5 h-3.5" />
                    <span>Approved PR: <strong className="font-mono">#{config.lastAutorunSummary.prApproved}</strong></span>
                  </div>
                )}
                <div className="text-slate-400 ml-auto">
                  {new Date(config.lastAutorunSummary.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Cryptographic Device-Bound Audit Log */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Key className="w-4 h-4 text-indigo-600" />
              <span>Hardware Device Binding Audit Trail</span>
            </h3>
            <p className="text-xs text-slate-500">Immutable record of all CodeRabbit CI/CD operations authorized by device credentials</p>
          </div>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={fetchConfig}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh Audit Logs</span>
            </button>
            <button
              type="button"
              onClick={handleExportAuditLogs}
              className="text-xs text-emerald-600 hover:text-emerald-800 font-semibold flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 font-semibold">
                <th className="py-2.5 px-3">Timestamp</th>
                <th className="py-2.5 px-3">Action</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Device Signature</th>
                <th className="py-2.5 px-3">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {config.recentAuditLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-3 text-slate-500 whitespace-nowrap">
                    {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </td>
                  <td className="py-3 px-3 font-semibold whitespace-nowrap">
                    <span className={`px-2 py-0.5 rounded-md font-mono text-[11px] ${
                      log.action === 'APPROVE_PR'
                        ? 'bg-purple-50 text-purple-700 border border-purple-200'
                        : log.action === 'PUSH_COMMIT'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : log.action === 'AUTORUN_JOB'
                        ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                        : 'bg-slate-100 text-slate-700'
                    }`}>
                      {log.action}
                    </span>
                  </td>
                  <td className="py-3 px-3 whitespace-nowrap">
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700">
                      <Check className="w-3 h-3 text-emerald-600" />
                      <span>verified</span>
                    </span>
                  </td>
                  <td className="py-3 px-3 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                    {log.deviceFingerprint ? `${log.deviceFingerprint.substring(0, 16)}...` : 'enclave-hw-sig'}
                  </td>
                  <td className="py-3 px-3 text-slate-700 max-w-md">
                    {log.details}
                    {log.commitSha && (
                      <span className="ml-2 font-mono text-emerald-600 bg-emerald-50 px-1 py-0.5 rounded border border-emerald-100 text-[10px]">
                        commit: {log.commitSha}
                      </span>
                    )}
                    {log.prNumber && (
                      <span className="ml-2 font-mono text-purple-600 bg-purple-50 px-1 py-0.5 rounded border border-purple-100 text-[10px]">
                        PR #{log.prNumber}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Device Binding Modal */}
      {isBindingModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600">
                  <Fingerprint className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Authorize Device for CodeRabbit</h4>
                  <p className="text-[11px] text-slate-500">Bind hardware credentials to CI/CD bot</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsBindingModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">
                  Device Hardware Identifier
                </label>
                <input
                  type="text"
                  value={bindDeviceName}
                  onChange={(e) => setBindDeviceName(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-slate-800 text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  placeholder="e.g. Apple Silicon MacBook Pro"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">
                  Biometric / Authenticator Type
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['Touch ID', 'Face ID', 'FIDO2 Security Key'] as const).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setBindBiometric(type)}
                      className={`p-2.5 rounded-xl border text-center font-semibold cursor-pointer transition-all ${
                        bindBiometric === type
                          ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-indigo-50/60 border border-indigo-100 flex items-center justify-between">
                <div>
                  <div className="font-bold text-indigo-950">Grant CodeRabbit All Access</div>
                  <div className="text-[11px] text-indigo-700">Authorizes commit pushing, PR approvals, and CI/CD autorun</div>
                </div>
                <input
                  type="checkbox"
                  checked={bindGrantAllAccess}
                  onChange={(e) => setBindGrantAllAccess(e.target.checked)}
                  className="w-4 h-4 accent-indigo-600 rounded cursor-pointer"
                />
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 text-[11px] leading-relaxed">
                By binding this device, your hardware authenticator will issue an attestation signature that authorizes CodeRabbit to automatically run CI/CD jobs and perform repository writes.
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsBindingModalOpen(false)}
                className="w-1/2 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-semibold hover:bg-slate-50 cursor-pointer text-xs"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleConfirmBindDevice}
                disabled={actionInProgress !== null}
                className="w-1/2 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold cursor-pointer text-xs flex items-center justify-center gap-1.5 shadow-xs"
              >
                {actionInProgress === 'binding' ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Binding...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Confirm Binding</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
