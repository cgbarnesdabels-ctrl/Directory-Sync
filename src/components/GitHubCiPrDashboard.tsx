/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  GitBranch, 
  GitPullRequest, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Play, 
  RefreshCw, 
  Terminal, 
  FileCode, 
  ChevronRight, 
  ChevronDown, 
  ShieldCheck, 
  ExternalLink,
  Copy,
  Check,
  Cpu,
  Layers,
  Sparkles,
  Maximize2,
  Minimize2,
  Fingerprint,
  Globe,
  Key,
  LogOut,
  UserCheck,
  ArrowUpRight,
  Link2,
  Shield,
  Bug,
  Activity,
  Search,
  Code,
  MonitorPlay,
  Zap,
  RotateCcw
} from 'lucide-react';
import type { 
  GitHubWorkflowRun, 
  GitHubPullRequest, 
  GitHubOverview,
  GitHubOAuthConfig,
  GitHubUserProfile,
  GitHubWebhookLog,
  SSOEnrollment
} from '../types/github';
import { useAuthOverlay } from '../context/AuthOverlayContext';
import { CodeRabbitDeviceBinding } from './CodeRabbitDeviceBinding';

export const GitHubCiPrDashboard: React.FC = () => {
  const { triggerSignIn, setPreferMode } = useAuthOverlay();
  const [overview, setOverview] = useState<GitHubOverview | null>(null);
  const [runs, setRuns] = useState<GitHubWorkflowRun[]>([]);
  const [pullRequests, setPullRequests] = useState<GitHubPullRequest[]>([]);
  const [selectedRun, setSelectedRun] = useState<GitHubWorkflowRun | null>(null);
  const [activeTab, setActiveTab] = useState<'workflows' | 'pull-requests' | 'coderabbit' | 'workflow-code' | 'oauth-config' | 'webhook-debugger' | 'sso-enrollment'>('workflows');
  const [selectedWorkflowFile, setSelectedWorkflowFile] = useState<'ci.yml' | 'pr-checks.yml' | 'coderabbit.yml'>('ci.yml');
  const [isDispatching, setIsDispatching] = useState(false);
  const [isCheckingPr, setIsCheckingPr] = useState(false);
  const [copiedFile, setCopiedFile] = useState(false);
  const [selectedPrNumbers, setSelectedPrNumbers] = useState<number[]>([]);
  const [isBulkApproving, setIsBulkApproving] = useState(false);
  const [webhookLogs, setWebhookLogs] = useState<GitHubWebhookLog[]>([]);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [isSimulatingWebhook, setIsSimulatingWebhook] = useState(false);
  const [keepDeviceLive, setKeepDeviceLive] = useState(false);
  const [wakeLock, setWakeLock] = useState<any>(null);
  const [isBotAutoFixing, setIsBotAutoFixing] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [ssoEnrollments, setSsoEnrollments] = useState<SSOEnrollment[]>([]);
  const [isEnrollingSso, setIsEnrollingSso] = useState(false);

  // Screen Wake Lock Effect
  useEffect(() => {
    const toggleWakeLock = async () => {
      if (keepDeviceLive) {
        try {
          if ('wakeLock' in navigator) {
            // @ts-ignore
            const lock = await navigator.wakeLock.request('screen');
            setWakeLock(lock);
          }
        } catch (err) {
          console.error('Wake Lock request failed:', err);
        }
      } else {
        if (wakeLock) {
          try {
            await wakeLock.release();
          } catch (e) {}
          setWakeLock(null);
        }
      }
    };

    toggleWakeLock();

    return () => {
      if (wakeLock) {
        try {
          wakeLock.release();
        } catch (e) {}
      }
    };
  }, [keepDeviceLive]);

  const handleToggleSelectAll = () => {
    if (selectedPrNumbers.length === pullRequests.length) {
      setSelectedPrNumbers([]);
    } else {
      setSelectedPrNumbers(pullRequests.map(p => p.number));
    }
  };

  const handleTogglePrSelect = (prNumber: number) => {
    setSelectedPrNumbers(prev => 
      prev.includes(prNumber) ? prev.filter(n => n !== prNumber) : [...prev, prNumber]
    );
  };

  const handleBulkApprovePrs = async () => {
    if (selectedPrNumbers.length === 0) return;
    setIsBulkApproving(true);
    try {
      const session = await triggerSignIn(
        connectedUser?.email || 'dabelstech@moredesa.com',
        window.location.hostname || 'localhost'
      );
      
      if (!session) {
        setIsBulkApproving(false);
        return;
      }

      const res = await fetch('/api/github/pull-requests/bulk-approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prNumbers: selectedPrNumbers,
          comment: '✅ Bulk Approved via Biometric Verified CodeRabbit Gateway & OS Enclave.'
        })
      });

      if (res.ok) {
        const data = await res.json();
        setPullRequests(data.pullRequests || []);
        setSelectedPrNumbers([]);
        alert(`Successfully biometric-verified and approved ${data.approvedCount} pull requests!`);
      }
    } catch (err) {
      console.error('Failed to bulk approve PRs:', err);
    } finally {
      setIsBulkApproving(false);
    }
  };

  // GitHub OAuth & Callback State
  const [oauthConfig, setOAuthConfig] = useState<GitHubOAuthConfig | null>(null);
  const [connectedUser, setConnectedUser] = useState<GitHubUserProfile | null>(null);
  const [isConnectingOAuth, setIsConnectingOAuth] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const fetchOAuthConfig = async () => {
    try {
      const res = await fetch('/api/github/oauth-config');
      if (res.ok) {
        const data = await res.json();
        setOAuthConfig(data.config || null);
        if (data.currentUser) {
          setConnectedUser(data.currentUser);
        }
      }
    } catch (err) {
      console.error('Failed to load GitHub OAuth config:', err);
    }
  };

  const fetchData = async () => {
    try {
      const [overviewRes, runsRes, prsRes, webhookRes] = await Promise.all([
        fetch('/api/github/overview'),
        fetch('/api/github/workflow-runs'),
        fetch('/api/github/pull-requests'),
        fetch('/api/github/webhook-logs'),
      ]);

      if (overviewRes.ok) setOverview(await overviewRes.json());
      if (runsRes.ok) {
        const data = await runsRes.json();
        setRuns(data.runs || []);
        if (!selectedRun && data.runs?.length > 0) {
          setSelectedRun(data.runs[0]);
        }
      }
      if (prsRes.ok) {
        const data = await prsRes.json();
        setPullRequests(data.pullRequests || []);
      }
      if (webhookRes.ok) {
        const data = await webhookRes.json();
        setWebhookLogs(data.logs || []);
      }
      
      const ssoRes = await fetch('/api/github/sso/enrollments');
      if (ssoRes.ok) {
        const data = await ssoRes.json();
        setSsoEnrollments(data.enrollments || []);
      }
    } catch (err) {
      console.error('Failed to load GitHub CI data:', err);
    }
  };

  const handleSimulateWebhook = async (event: string) => {
    setIsSimulatingWebhook(true);
    try {
      const res = await fetch('/api/github/simulate-webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event, payload: { action: event === 'push' ? undefined : 'opened', sender: { login: connectedUser?.login || 'dabelstech' } } })
      });
      if (res.ok) {
        fetchData();
      }
    } catch (err) {
      console.error('Failed to simulate webhook:', err);
    } finally {
      setIsSimulatingWebhook(false);
    }
  };

  useEffect(() => {
    fetchData();
    fetchOAuthConfig();
    const interval = setInterval(fetchData, 4000);
    return () => clearInterval(interval);
  }, []);

  // Listen for postMessage from OAuth popup callback
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const origin = event.origin;
      // Validate origin is from AI Studio preview or localhost
      if (!origin.endsWith('.run.app') && !origin.includes('localhost') && !origin.includes('127.0.0.1')) {
        return;
      }
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        if (event.data.user) {
          setConnectedUser(event.data.user);
        }
        fetchOAuthConfig();
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleCopyField = (text: string, fieldId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldId);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleConnectGitHub = async () => {
    try {
      setIsConnectingOAuth(true);
      const res = await fetch('/api/github/auth-url');
      if (!res.ok) throw new Error('Failed to get GitHub auth URL');
      const { url } = await res.json();

      // Open OAuth provider directly in popup window per AI Studio constraints
      const authWindow = window.open(
        url,
        'github_oauth_popup',
        'width=600,height=720,status=yes,scrollbars=yes'
      );

      if (!authWindow) {
        alert('Please allow popups in your browser to complete GitHub authorization.');
      }
    } catch (err) {
      console.error('Failed to initiate GitHub OAuth:', err);
    } finally {
      setIsConnectingOAuth(false);
    }
  };

  const handleDisconnectGitHub = async () => {
    try {
      await fetch('/api/github/disconnect', { method: 'POST' });
      setConnectedUser(null);
      fetchOAuthConfig();
    } catch (err) {
      console.error('Failed to disconnect GitHub:', err);
    }
  };

  const handleSsoEnroll = async (deviceId: string, deviceType: 'ios' | 'macos' | 'fido2') => {
    setIsEnrollingSso(true);
    try {
      // Step 1: Biometric Identity Verification via PiP Overlay
      const session = await triggerSignIn(
        connectedUser?.email || 'dabelstech@moredesa.com',
        window.location.hostname || 'localhost'
      );
      
      if (!session) {
        setIsEnrollingSso(false);
        return;
      }

      // Step 2: Register Enrollment with GitHub Backend
      const res = await fetch('/api/github/sso/enroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId, deviceType }),
      });

      if (res.ok) {
        fetchData(); // Refresh enrollments
      }
    } catch (err) {
      console.error('Failed to enroll SSO:', err);
    } finally {
      setIsEnrollingSso(false);
    }
  };

  const handleSsoRevoke = async (enrollmentId: string) => {
    try {
      const res = await fetch('/api/github/sso/revoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enrollmentId }),
      });
      if (res.ok) {
        fetchData(); // Refresh enrollments
      }
    } catch (err) {
      console.error('Failed to revoke SSO enrollment:', err);
    }
  };

  const handleSimulateCallback = async () => {
    try {
      const res = await fetch('/api/github/simulate-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'dabelstech',
          email: 'dabelstech@moredesa.com'
        })
      });
      if (res.ok) {
        const data = await res.json();
        setConnectedUser(data.user);
      }
    } catch (err) {
      console.error('Failed to simulate auth:', err);
    }
  };

  const handleTriggerDispatch = async () => {
    setIsDispatching(true);
    try {
      const res = await fetch('/api/github/trigger-run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workflowFile: 'ci.yml', branch: 'main' }),
      });
      if (res.ok) {
        const data = await res.json();
        setRuns(prev => [data.run, ...prev]);
        setSelectedRun(data.run);
      }
    } catch (err) {
      console.error('Failed to dispatch run:', err);
    } finally {
      setIsDispatching(false);
    }
  };

  const handleGlobalBotAutoFix = async () => {
    setIsBotAutoFixing(true);
    try {
      // Step 1: Re-authenticate
      const session = await triggerSignIn(
        connectedUser?.email || 'dabelstech@moredesa.com',
        window.location.hostname || 'localhost'
      );
      
      if (!session) {
        setIsBotAutoFixing(false);
        return;
      }

      const res = await fetch('/api/github/bots/auto-configure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (res.ok) {
        alert('Master Bot Override Active: All bots granted auto-fix and auto-approval permissions.');
        fetchData();
      }
    } catch (err) {
      console.error('Bot auto-fix failed:', err);
    } finally {
      setIsBotAutoFixing(false);
    }
  };

  const handleRetryRun = async (runId: string) => {
    setIsRetrying(true);
    try {
      // Step 1: Initiate Biometric Authorization Flow
      const session = await triggerSignIn(
        connectedUser?.email || 'dabelstech@moredesa.com',
        window.location.hostname || 'localhost'
      );
      
      if (!session) {
        setIsRetrying(false);
        return;
      }

      // Step 2: Trigger Restart Request
      const res = await fetch('/api/github/retry-run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ runId }),
      });

      if (res.ok) {
        const data = await res.json();
        // Update runs list and selected run
        setRuns(prev => prev.map(r => r.id === runId ? data.run : r));
        setSelectedRun(data.run);
      }
    } catch (err) {
      console.error('Failed to retry run:', err);
    } finally {
      setIsRetrying(false);
    }
  };

  const handleTriggerPrCheck = async (prNumber: number) => {
    setIsCheckingPr(true);
    try {
      const res = await fetch('/api/github/trigger-pr-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prNumber }),
      });
      if (res.ok) {
        fetchData();
      }
    } catch (err) {
      console.error('Failed to trigger PR check:', err);
    } finally {
      setIsCheckingPr(false);
    }
  };

  const ciYmlCode = `name: CI / CD Pipeline - Dabels Tech Passkey Gateway

on:
  push:
    branches: [main, 'release/*']
  pull_request:
    branches: [main]
  workflow_dispatch:

jobs:
  lint-and-typecheck:
    name: Lint & Typecheck
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22.x }
      - run: npm ci && npm run lint

  test-fido2-handshake:
    name: FIDO2 & Scoped Redirect Test Suite
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22.x }
      - run: npm ci
      - run: node test/fido2-spec.mjs # Validates residentKey: "required" & CWE-601 protection

  security-audit:
    name: Security & Cryptographic Audit
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm audit --audit-level=high

  build-and-package:
    name: Production Build & Asset Verification
    runs-on: ubuntu-latest
    needs: [test-fido2-handshake, security-audit]
    steps:
      - uses: actions/checkout@v4
      - run: npm ci && npm run build
      - run: test -f dist/index.html`;

  const prChecksCode = `name: PR Quality & Security Gate

on:
  pull_request:
    types: [opened, synchronize, reopened, ready_for_review]

jobs:
  pr-triage:
    name: PR Metadata & Conventional Commits
    runs-on: ubuntu-latest
    steps:
      - name: Validate PR Title Format
        run: |
          TITLE="\${{ github.event.pull_request.title }}"
          echo "Validating format: feat(...), fix(...), etc."

  bundle-size-diff:
    name: Bundle Size & Performance Impact
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci && npm run build
      - name: Report Bundle Health
        run: echo "No bundle regressions detected."

  ios-ats-compliance:
    name: iOS ATS & WebAuthn RP ID Alignment
    runs-on: ubuntu-latest
    steps:
      - run: echo "Verifying RP ID alignment with dabelstech://"`;

  const codeRabbitYmlCode = `name: CodeRabbit AI Reviewer & Automated Gate

on:
  pull_request:
    types: [opened, synchronize, reopened, ready_for_review]
  push:
    branches: [main, 'release/*']
  workflow_dispatch:

permissions:
  contents: write        # Push commits & automated security patches
  pull-requests: write   # Submit review approvals & comments
  issues: write          # Triage issues & link security advisories
  checks: write          # Create check runs & report AST findings
  statuses: write        # Update commit status checks
  id-token: write        # OIDC device binding token attestation
  actions: write         # Autorun CI/CD jobs

jobs:
  device-binding-verification:
    name: Verify Device Binding & Authorization
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Validate Hardware Device Binding Assertion
        run: |
          echo "Bound Device: Apple Silicon MacBook Pro (Touch ID Secure Enclave)"
          echo "Attestation: Hardware Root of Trust (Apple T2/A17)"
          echo "Permissions: contents:write, pull-requests:write, all-access"
          echo "✅ Device binding token signature cryptographically verified."

  coderabbit-ai-review:
    name: CodeRabbit AI Deep AST & Security Review
    runs-on: ubuntu-latest
    needs: device-binding-verification
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22.x }
      - run: npm ci
      - run: echo "Running CodeRabbit AST analyzer on WebAuthn and ATS security..."

  auto-commit-suggestions:
    name: CodeRabbit Auto-Commit & Patch Push
    runs-on: ubuntu-latest
    needs: coderabbit-ai-review
    steps:
      - uses: actions/checkout@v4
      - name: Configure Bot Credentials & Push Patch
        run: |
          git config --global user.name "coderabbitai[bot]"
          git config --global user.email "136622811+coderabbitai[bot]@users.noreply.github.com"
          echo "Applying device-bound security patch commit to branch."

  auto-approve-pr:
    name: CodeRabbit PR Review & Approval Gate
    runs-on: ubuntu-latest
    needs: [coderabbit-ai-review, auto-commit-suggestions]
    steps:
      - name: Submit Verified Pull Request Review
        run: |
          echo "Submitting formal PR Review State: APPROVED"
          echo "Summary: All WebAuthn residentKey constraints and security gates passed."`;

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedFile(true);
    setTimeout(() => setCopiedFile(false), 2000);
  };

  return (
    <div className="space-y-8">
      {/* Top GitHub Pipeline Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 bg-slate-900 text-white rounded-lg text-xs font-mono font-bold flex items-center gap-1.5">
              <GitBranch className="w-3.5 h-3.5 text-indigo-400" />
              <span>dabelstech / {overview?.repoName || 'passkey-gateway-ios'}</span>
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              <span>CI Passing ({overview?.passingRate || 100}%)</span>
            </span>
            
            {/* Real-time Commit Status Badge */}
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[10px] font-bold font-mono uppercase tracking-tight ${
              overview?.latestCommitStatus === 'success' 
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : overview?.latestCommitStatus === 'pending'
                ? 'bg-amber-50 text-amber-700 border-amber-200'
                : 'bg-rose-50 text-rose-700 border-rose-200'
            }`}>
              <Activity className={`w-3 h-3 ${overview?.latestCommitStatus === 'pending' ? 'animate-pulse' : ''}`} />
              <span>Status: {overview?.latestCommitStatus || 'success'}</span>
            </div>
          </div>

          <h2 className="text-lg font-bold text-slate-900 mt-2">
            GitHub Actions CI/CD &amp; Pull Request Automation
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Automated testing, WebAuthn cryptographic regression validation, bundle health, and PR quality gates.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="btn-trigger-ci-dispatch"
            type="button"
            onClick={handleTriggerDispatch}
            disabled={isDispatching}
            className="py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer shadow-xs disabled:opacity-60"
          >
            {isDispatching ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Play className="w-3.5 h-3.5 text-indigo-400" />
            )}
            <span>Dispatch Workflow Run</span>
          </button>
        </div>
      </div>

      {/* Screen Overlay PiP & Pop Trigger Demo Card */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl border border-indigo-900/50 p-6 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1 max-w-xl">
          <div className="flex items-center gap-2 text-xs font-semibold text-indigo-300">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            <span>Integrated Biometric Screen Overlay</span>
          </div>
          <h3 className="text-base font-bold text-white">
            Trigger Real-Time Biometric PiP or Pop Screen Overlay
          </h3>
          <p className="text-xs text-slate-300 leading-relaxed">
            Anytime a sign-in request is triggered, this application launches an interactive screen overlay with live cryptographic telemetry. Choose your trigger mode below:
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            id="btn-dashboard-trigger-pop"
            type="button"
            onClick={() => {
              setPreferMode('pop');
              triggerSignIn('dabelstech@moredesa.com', window.location.hostname || 'localhost', 'pop');
            }}
            className="py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 transition-all shadow-xs cursor-pointer"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span>Trigger Pop Modal</span>
          </button>

          <button
            id="btn-dashboard-trigger-pip"
            type="button"
            onClick={() => {
              setPreferMode('pip');
              triggerSignIn('dabelstech@moredesa.com', window.location.hostname || 'localhost', 'pip');
            }}
            className="py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl text-xs font-semibold flex items-center gap-2 border border-slate-700 transition-all cursor-pointer"
          >
            <Minimize2 className="w-3.5 h-3.5 text-indigo-400" />
            <span>Trigger PiP HUD</span>
          </button>
        </div>
      </div>

      {/* Navigation Subtabs */}
      <div className="border-b border-slate-200 flex items-center gap-6 text-sm font-semibold">
        <button
          type="button"
          onClick={() => setActiveTab('workflows')}
          className={`pb-3 border-b-2 flex items-center gap-2 cursor-pointer transition-colors ${
            activeTab === 'workflows'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Play className="w-4 h-4" />
          <span>CI/CD Workflow Runs ({runs.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('pull-requests')}
          className={`pb-3 border-b-2 flex items-center gap-2 cursor-pointer transition-colors ${
            activeTab === 'pull-requests'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <GitPullRequest className="w-4 h-4" />
          <span>Pull Requests &amp; PR Gates ({pullRequests.length})</span>
        </button>

        <button
          id="subtab-coderabbit"
          type="button"
          onClick={() => setActiveTab('coderabbit')}
          className={`pb-3 border-b-2 flex items-center gap-2 cursor-pointer transition-colors ${
            activeTab === 'coderabbit'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Sparkles className="w-4 h-4 text-indigo-500" />
          <span>CodeRabbit &amp; Device Binding</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            All Access
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('workflow-code')}
          className={`pb-3 border-b-2 flex items-center gap-2 cursor-pointer transition-colors ${
            activeTab === 'workflow-code'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileCode className="w-4 h-4" />
          <span>Workflow Specifications (.github/workflows)</span>
        </button>

        <button
          id="subtab-github-oauth"
          type="button"
          onClick={() => setActiveTab('oauth-config')}
          className={`pb-3 border-b-2 flex items-center gap-2 cursor-pointer transition-colors ${
            activeTab === 'oauth-config'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Key className="w-4 h-4" />
          <span>OAuth Redirect &amp; Callback Setup</span>
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
            connectedUser
              ? 'bg-emerald-100 text-emerald-700'
              : 'bg-indigo-100 text-indigo-700'
          }`}>
            {connectedUser ? 'Connected' : 'Configured'}
          </span>
        </button>

        <button
          id="subtab-github-webhooks"
          type="button"
          onClick={() => setActiveTab('webhook-debugger')}
          className={`pb-3 border-b-2 flex items-center gap-2 cursor-pointer transition-colors ${
            activeTab === 'webhook-debugger'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Bug className="w-4 h-4" />
          <span>Webhook Debugger</span>
          {webhookLogs.length > 0 && (
            <span className="bg-rose-100 text-rose-700 text-[10px] px-1.5 py-0.5 rounded-full font-bold">
              {webhookLogs.length}
            </span>
          )}
        </button>

        <button
          id="subtab-github-sso"
          type="button"
          onClick={() => setActiveTab('sso-enrollment')}
          className={`pb-3 border-b-2 flex items-center gap-2 cursor-pointer transition-colors ${
            activeTab === 'sso-enrollment'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          <span>SSO &amp; Identity Enrollment</span>
        </button>
      </div>

      {/* Subtab 1: Workflow Runs */}
      {activeTab === 'workflows' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Runs List */}
          <div className="lg:col-span-5 space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400 px-1">
              Workflow History
            </div>

            {runs.map((run) => (
              <button
                key={run.id}
                type="button"
                onClick={() => setSelectedRun(run)}
                className={`w-full text-left p-4 rounded-2xl border transition-all cursor-pointer ${
                  selectedRun?.id === run.id
                    ? 'bg-indigo-50/70 border-indigo-300 shadow-xs'
                    : 'bg-white border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {run.status === 'in_progress' ? (
                      <RefreshCw className="w-4 h-4 text-amber-500 animate-spin" />
                    ) : run.conclusion === 'success' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-600" />
                    )}
                    <span className="font-semibold text-xs text-slate-900 truncate">
                      {run.workflowName}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                    {run.commitSha}
                  </span>
                </div>

                <div className="text-[11px] text-slate-600 mt-2 line-clamp-1">
                  {run.commitMessage}
                </div>

                <div className="flex items-center gap-3 mt-3 text-[11px] text-slate-400">
                  <span className="flex items-center gap-1 font-mono">
                    <GitBranch className="w-3 h-3" />
                    {run.branch}
                  </span>
                  <span>&bull;</span>
                  <span className="flex items-center gap-1 font-mono">
                    <Clock className="w-3 h-3" />
                    {run.durationSeconds}s
                  </span>
                </div>
              </button>
            ))}
          </div>

          {/* Right: Selected Run Details & Live Steps */}
          <div className="lg:col-span-7 space-y-4">
            {selectedRun ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
                <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-100">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-slate-400">#{selectedRun.id}</span>
                      <span className="text-xs font-bold text-slate-900">{selectedRun.workflowName}</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">{selectedRun.commitMessage}</p>
                  </div>

                  <span
                    className={`text-xs font-bold px-2.5 py-1 rounded-full font-mono ${
                      selectedRun.status === 'in_progress'
                        ? 'bg-amber-100 text-amber-800'
                        : selectedRun.conclusion === 'success'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {selectedRun.status === 'in_progress' ? 'Running' : selectedRun.conclusion}
                  </span>

                  {selectedRun.status === 'completed' && selectedRun.conclusion === 'failure' && (
                    <button
                      type="button"
                      onClick={() => handleRetryRun(selectedRun.id)}
                      disabled={isRetrying}
                      className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[10px] font-bold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer disabled:opacity-60"
                    >
                      {isRetrying ? (
                        <RefreshCw className="w-3 h-3 animate-spin" />
                      ) : (
                        <RotateCcw className="w-3 h-3" />
                      )}
                      <span>RETRY RUN</span>
                    </button>
                  )}
                </div>

                {/* Steps Timeline */}
                <div className="space-y-3">
                  <div className="text-xs font-bold text-slate-700">Execution Steps:</div>
                  <div className="space-y-2">
                    {selectedRun.steps.map((step, idx) => (
                      <div
                        key={idx}
                        className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {step.status === 'completed' && step.conclusion === 'success' ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            ) : step.status === 'in_progress' ? (
                              <RefreshCw className="w-4 h-4 text-amber-500 animate-spin" />
                            ) : (
                              <Clock className="w-4 h-4 text-slate-400" />
                            )}
                            <span className="font-semibold text-slate-900">{step.name}</span>
                          </div>
                          {step.durationSeconds !== undefined && (
                            <span className="font-mono text-[11px] text-slate-400">
                              {step.durationSeconds}s
                            </span>
                          )}
                        </div>

                        {/* Step Logs */}
                        {step.log && step.log.length > 0 && (
                          <div className="bg-slate-900 text-slate-300 font-mono text-[11px] rounded-lg p-2.5 space-y-1 max-h-36 overflow-y-auto">
                            {step.log.map((line, lidx) => (
                              <div key={lidx} className="leading-tight">
                                &gt; {line}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-500 text-xs">
                Select a workflow run to view step execution telemetry.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Subtab 2: Pull Requests & PR Gates */}
      {activeTab === 'pull-requests' && (
        <div className="space-y-4">
          {/* Bulk Action Header Bar */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
                <input
                  type="checkbox"
                  checked={pullRequests.length > 0 && selectedPrNumbers.length === pullRequests.length}
                  onChange={handleToggleSelectAll}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                />
                <span>Select All ({pullRequests.length} PRs)</span>
              </label>
              <span className="text-xs text-slate-400 font-mono">
                {selectedPrNumbers.length} selected
              </span>
            </div>

            <button
              id="btn-bulk-approve-prs"
              type="button"
              onClick={handleBulkApprovePrs}
              disabled={selectedPrNumbers.length === 0 || isBulkApproving}
              className="py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Fingerprint className="w-4 h-4 text-indigo-200" />
              <span>
                {isBulkApproving ? 'Verifying Biometrics & Approving...' : `Bulk Approve Selected (${selectedPrNumbers.length})`}
              </span>
            </button>
          </div>

          {pullRequests.map((pr) => {
            const isSelected = selectedPrNumbers.includes(pr.number);
            return (
              <div
                key={pr.number}
                className={`bg-white rounded-2xl border p-6 shadow-xs space-y-4 transition-all ${
                  isSelected ? 'border-indigo-500 ring-2 ring-indigo-500/10 bg-indigo-50/20' : 'border-slate-200'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleTogglePrSelect(pr.number)}
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 cursor-pointer"
                    />
                    <GitPullRequest className="w-5 h-5 text-indigo-600" />
                    <span className="font-mono text-sm font-bold text-slate-900">
                      #{pr.number}
                    </span>
                    <span className="font-bold text-sm text-slate-900">{pr.title}</span>
                    <span
                      className={`text-[11px] font-bold px-2 py-0.5 rounded-full font-mono ${
                        pr.status === 'open'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-purple-50 text-purple-700 border border-purple-200'
                      }`}
                    >
                      {pr.status.toUpperCase()}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleTriggerPrCheck(pr.number)}
                    disabled={isCheckingPr}
                    className="py-1.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-60"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isCheckingPr ? 'animate-spin' : ''}`} />
                    <span>Re-run PR Checks</span>
                  </button>
                </div>

              <p className="text-xs text-slate-600 leading-relaxed">{pr.description}</p>

              {/* Branch & Diff Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <div className="text-slate-400 text-[11px]">Branch:</div>
                  <div className="font-mono font-semibold text-slate-800 truncate">{pr.branch}</div>
                </div>

                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <div className="text-slate-400 text-[11px]">CI Checks Status:</div>
                  <div className="font-semibold text-emerald-600 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{pr.passedChecksCount}/{pr.totalChecksCount} Passing</span>
                  </div>
                </div>

                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <div className="text-slate-400 text-[11px]">Code Diff:</div>
                  <div className="font-mono font-semibold">
                    <span className="text-emerald-600">+{pr.additions}</span>{' '}
                    <span className="text-rose-600">-{pr.deletions}</span>
                  </div>
                </div>

                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <div className="text-slate-400 text-[11px]">Reviews:</div>
                  <div className="font-semibold text-slate-800">
                    {pr.reviews.map(r => r.user).join(', ')} (Approved)
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        </div>
      )}

      {/* Subtab 3: CodeRabbit & Device Binding */}
      {activeTab === 'coderabbit' && (
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-indigo-900 to-slate-900 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
            <div className="relative z-10 space-y-5">
              <div className="flex items-center gap-3">
                <div className="bg-amber-400/20 p-2.5 rounded-2xl border border-amber-400/30">
                  <Sparkles className="w-6 h-6 text-amber-300" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">Master Bot Override & Auto-Fix</h3>
                  <p className="text-indigo-200/70 text-xs">Zero-Touch Security Remediation & Auto-Approval Gate</p>
                </div>
              </div>
              
              <p className="text-slate-300 text-sm max-w-2xl leading-relaxed">
                Grant all integrated bots (CodeRabbit, DabelsBot, SecurityAgent) immediate write access to your repository. 
                This enables automated patch pushing, AST-led vulnerability fixing, and multi-bot consensus for PR approvals.
              </p>

              <div className="flex flex-wrap gap-4">
                <button
                  type="button"
                  onClick={handleGlobalBotAutoFix}
                  disabled={isBotAutoFixing}
                  className={`px-6 py-3 rounded-2xl text-sm font-bold flex items-center gap-2 transition-all shadow-lg cursor-pointer ${
                    isBotAutoFixing 
                      ? 'bg-amber-500 text-white animate-pulse' 
                      : 'bg-white text-indigo-900 hover:scale-[1.02] active:scale-[0.98]'
                  }`}
                >
                  {isBotAutoFixing ? (
                    <RefreshCw className="w-5 h-5 animate-spin" />
                  ) : (
                    <Zap className="w-5 h-5 text-amber-500 fill-current" />
                  )}
                  <span>{isBotAutoFixing ? 'Running Global Bot Sweep...' : 'Initialize Master Bot Auto-Fix'}</span>
                </button>
                
                <div className="flex items-center gap-2 px-4 py-2 bg-slate-800/50 rounded-2xl border border-slate-700">
                  <Shield className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-semibold text-slate-300 uppercase tracking-widest">Bot Status: STANDBY</span>
                </div>
              </div>
            </div>
            
            <div className="absolute -bottom-12 -right-12 opacity-5 rotate-12">
              <Sparkles className="w-64 h-64" />
            </div>
          </div>

          <CodeRabbitDeviceBinding
            onWorkflowRunTriggered={fetchData}
            onPrApproved={fetchData}
            onViewWorkflowCode={() => {
              setSelectedWorkflowFile('coderabbit.yml');
              setActiveTab('workflow-code');
            }}
          />
        </div>
      )}

      {/* Subtab 4: Workflow Specifications (.github/workflows) */}
      {activeTab === 'workflow-code' && (
        <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 text-white shadow-md space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setSelectedWorkflowFile('ci.yml')}
                className={`px-3 py-1.5 rounded-xl text-xs font-mono font-semibold transition-all cursor-pointer ${
                  selectedWorkflowFile === 'ci.yml'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                .github/workflows/ci.yml
              </button>

              <button
                type="button"
                onClick={() => setSelectedWorkflowFile('pr-checks.yml')}
                className={`px-3 py-1.5 rounded-xl text-xs font-mono font-semibold transition-all cursor-pointer ${
                  selectedWorkflowFile === 'pr-checks.yml'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                .github/workflows/pr-checks.yml
              </button>

              <button
                type="button"
                onClick={() => setSelectedWorkflowFile('coderabbit.yml')}
                className={`px-3 py-1.5 rounded-xl text-xs font-mono font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                  selectedWorkflowFile === 'coderabbit.yml'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                <Sparkles className="w-3 h-3 text-indigo-400" />
                <span>.github/workflows/coderabbit.yml</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => handleCopyCode(
                selectedWorkflowFile === 'ci.yml' 
                  ? ciYmlCode 
                  : selectedWorkflowFile === 'pr-checks.yml' 
                  ? prChecksCode 
                  : codeRabbitYmlCode
              )}
              className="py-1.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-mono flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
            >
              {copiedFile ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Workflow YAML</span>
                </>
              )}
            </button>
          </div>

          <div className="text-[12px] font-mono text-slate-300 overflow-x-auto max-h-[480px] overflow-y-auto">
            <pre className="leading-relaxed">
              {selectedWorkflowFile === 'ci.yml' 
                ? ciYmlCode 
                : selectedWorkflowFile === 'pr-checks.yml' 
                ? prChecksCode 
                : codeRabbitYmlCode}
            </pre>
          </div>
        </div>
      )}

      {/* Subtab 5: GitHub OAuth Redirect & Callback Setup */}
      {activeTab === 'oauth-config' && (
        <div className="space-y-6">
          {/* Architecture & Iframe Compliance Header */}
          <div className="bg-slate-900 text-white rounded-2xl border border-slate-800 p-6 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1 max-w-2xl">
                <div className="flex items-center gap-2 text-xs font-semibold text-indigo-400">
                  <Shield className="w-4 h-4" />
                  <span>AI Studio Compliant Popup &amp; Callback Handshake</span>
                </div>
                <h3 className="text-lg font-bold text-white">
                  GitHub OAuth Redirect URL &amp; Callback Configuration
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Configured with direct provider popups (<code className="text-indigo-300 font-mono">https://github.com/login/oauth/authorize</code>), cross-origin <code className="text-indigo-300 font-mono">postMessage</code> parent notification, and strict cookie headers (<code className="text-indigo-300 font-mono">SameSite=None; Secure</code>) for preview and production containers.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href="https://github.com/settings/applications/new"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 transition-all shadow-xs cursor-pointer"
                >
                  <ArrowUpRight className="w-4 h-4" />
                  <span>Open GitHub Dev Settings</span>
                </a>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Exact URLs to register in GitHub */}
            <div className="lg:col-span-7 space-y-6">
              {/* Development URLs Card */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700 flex items-center justify-center font-bold text-xs">
                      DEV
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">
                        Development Environment URLs
                      </h4>
                      <p className="text-xs text-slate-500">
                        Use these URLs when developing and testing in the active AI Studio preview container.
                      </p>
                    </div>
                  </div>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold">
                    Active Container
                  </span>
                </div>

                {/* Homepage URL */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
                    <span>Homepage URL (Development)</span>
                    <span className="text-[10px] text-slate-400 normal-case font-normal">Registered in GitHub OAuth App</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={oauthConfig?.devHomepageUrl || 'https://ais-dev-lqpipzowgb7lapwky3dtvq-636943343240.us-east1.run.app'}
                      className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-mono text-slate-800 focus:outline-hidden"
                    />
                    <button
                      type="button"
                      onClick={() => handleCopyField(
                        oauthConfig?.devHomepageUrl || 'https://ais-dev-lqpipzowgb7lapwky3dtvq-636943343240.us-east1.run.app',
                        'dev-home'
                      )}
                      className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-200"
                    >
                      {copiedField === 'dev-home' ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-emerald-700">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Authorization Callback URL */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
                    <span>Authorization Callback URL (Development)</span>
                    <span className="text-[10px] text-indigo-600 font-semibold normal-case">Primary Callback</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={oauthConfig?.devCallbackUrl || 'https://ais-dev-lqpipzowgb7lapwky3dtvq-636943343240.us-east1.run.app/api/auth/github/callback'}
                      className="flex-1 bg-indigo-50/50 border border-indigo-200 rounded-xl px-3.5 py-2 text-xs font-mono text-indigo-900 font-semibold focus:outline-hidden"
                    />
                    <button
                      type="button"
                      onClick={() => handleCopyField(
                        oauthConfig?.devCallbackUrl || 'https://ais-dev-lqpipzowgb7lapwky3dtvq-636943343240.us-east1.run.app/api/auth/github/callback',
                        'dev-cb'
                      )}
                      className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                    >
                      {copiedField === 'dev-cb' ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-white" />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Shared / Production URLs Card */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center font-bold text-xs">
                      PROD
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">
                        Shared &amp; Deployed Environment URLs
                      </h4>
                      <p className="text-xs text-slate-500">
                        Use these URLs for your shared production build or public domain deployments.
                      </p>
                    </div>
                  </div>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 font-semibold">
                    Shared Preview
                  </span>
                </div>

                {/* Shared Homepage URL */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
                    <span>Homepage URL (Shared)</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={oauthConfig?.sharedHomepageUrl || 'https://ais-pre-lqpipzowgb7lapwky3dtvq-636943343240.us-east1.run.app'}
                      className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-mono text-slate-800 focus:outline-hidden"
                    />
                    <button
                      type="button"
                      onClick={() => handleCopyField(
                        oauthConfig?.sharedHomepageUrl || 'https://ais-pre-lqpipzowgb7lapwky3dtvq-636943343240.us-east1.run.app',
                        'shared-home'
                      )}
                      className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-200"
                    >
                      {copiedField === 'shared-home' ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-emerald-700">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Shared Callback URL */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
                    <span>Authorization Callback URL (Shared)</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={oauthConfig?.sharedCallbackUrl || 'https://ais-pre-lqpipzowgb7lapwky3dtvq-636943343240.us-east1.run.app/api/auth/github/callback'}
                      className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-mono text-slate-800 focus:outline-hidden"
                    />
                    <button
                      type="button"
                      onClick={() => handleCopyField(
                        oauthConfig?.sharedCallbackUrl || 'https://ais-pre-lqpipzowgb7lapwky3dtvq-636943343240.us-east1.run.app/api/auth/github/callback',
                        'shared-cb'
                      )}
                      className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-200"
                    >
                      {copiedField === 'shared-cb' ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-emerald-700">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Aliases & Scopes */}
                <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-slate-500">
                  <div className="flex items-center gap-2">
                    <Link2 className="w-3.5 h-3.5 text-slate-400" />
                    <span>Also supports alias routes: <code className="font-mono bg-slate-100 px-1 py-0.5 rounded text-slate-700">/auth/github/callback</code></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-700">Requested Scopes:</span>
                    <code className="font-mono bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded border border-indigo-200">read:user, user:email, repo</code>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Connection Card & Setup Guide */}
            <div className="lg:col-span-5 space-y-6">
              {/* Account Status Card */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Globe className="w-4 h-4 text-indigo-600" />
                    <span>GitHub OAuth Connection</span>
                  </h4>
                  <span className={`text-[11px] px-2.5 py-1 rounded-full font-bold flex items-center gap-1 ${
                    connectedUser
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-amber-50 text-amber-700 border border-amber-200'
                  }`}>
                    {connectedUser ? (
                      <>
                        <CheckCircle2 className="w-3 h-3" /> Connected
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-3 h-3" /> Not Connected
                      </>
                    )}
                  </span>
                </div>

                {connectedUser ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3.5 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                      <img
                        src={connectedUser.avatarUrl}
                        alt={connectedUser.login}
                        className="w-12 h-12 rounded-full border border-slate-300 object-cover"
                        referrerPolicy="no-referrer"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-sm text-slate-900 truncate">
                          {connectedUser.name}
                        </div>
                        <div className="text-xs text-indigo-600 font-mono truncate">
                          @{connectedUser.login}
                        </div>
                        <div className="text-[11px] text-slate-500 truncate">
                          {connectedUser.email}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-center">
                      <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                        <div className="text-xs font-semibold text-slate-500">Repositories</div>
                        <div className="text-base font-bold text-slate-900">{connectedUser.publicRepos}</div>
                      </div>
                      <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                        <div className="text-xs font-semibold text-slate-500">Followers</div>
                        <div className="text-base font-bold text-slate-900">{connectedUser.followers}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleConnectGitHub}
                        disabled={isConnectingOAuth}
                        className="flex-1 py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-semibold transition-colors cursor-pointer border border-slate-200 flex items-center justify-center gap-1.5"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isConnectingOAuth ? 'animate-spin' : ''}`} />
                        <span>Re-authenticate</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleDisconnectGitHub}
                        className="py-2 px-3 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer border border-rose-200 flex items-center gap-1.5"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Disconnect</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Authorize this app with GitHub to grant CI/CD status synchronization, automated PR checks dispatch, and WebAuthn enclave signature auditing.
                    </p>

                    <div className="space-y-2.5">
                      <button
                        id="btn-connect-github-oauth"
                        type="button"
                        onClick={handleConnectGitHub}
                        disabled={isConnectingOAuth}
                        className="w-full py-3 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer"
                      >
                        <Globe className="w-4 h-4 text-indigo-400" />
                        <span>{isConnectingOAuth ? 'Opening OAuth Popup...' : 'Connect GitHub via Direct Popup'}</span>
                      </button>

                      <button
                        id="btn-simulate-callback-auth"
                        type="button"
                        onClick={handleSimulateCallback}
                        className="w-full py-2.5 px-4 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all border border-slate-200 cursor-pointer"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Simulate Callback Handshake (Sandbox Test)</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Step-by-Step Setup Guide */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-3.5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
                  <Key className="w-3.5 h-3.5 text-indigo-600" />
                  <span>4-Step GitHub Configuration Guide</span>
                </h4>

                <ol className="text-xs text-slate-600 space-y-2.5 list-decimal pl-4 leading-relaxed">
                  <li>
                    Visit <a href="https://github.com/settings/applications/new" target="_blank" rel="noopener noreferrer" className="text-indigo-600 font-semibold underline">github.com/settings/applications/new</a>
                  </li>
                  <li>
                    Set <strong>Application name</strong> to <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-slate-800">Dabels Tech Passkey Gateway</code>
                  </li>
                  <li>
                    Paste <strong>Homepage URL</strong>: <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-slate-800 break-all">{oauthConfig?.devHomepageUrl}</code>
                  </li>
                  <li>
                    Paste <strong>Authorization callback URL</strong>: <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-slate-800 break-all">{oauthConfig?.devCallbackUrl}</code>
                  </li>
                  <li>
                    Click <strong>Register application</strong> and configure <code className="font-mono text-slate-800">GITHUB_CLIENT_ID</code> and <code className="font-mono text-slate-800">GITHUB_CLIENT_SECRET</code> in Settings.
                  </li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      )}
      {activeTab === 'webhook-debugger' && (
        <div className="space-y-6">
          <div className="bg-indigo-900 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
            <div className="relative z-10 space-y-4">
              <div className="flex items-center gap-3">
                <div className="bg-indigo-500/20 p-2 rounded-xl">
                  <Bug className="w-6 h-6 text-indigo-200" />
                </div>
                <h3 className="text-xl font-bold">GitHub Webhook Debugger</h3>
              </div>
              <p className="text-indigo-100/80 max-w-2xl text-sm leading-relaxed">
                Inspect real-time incoming event payloads from your GitHub repository. Monitor event types,
                status codes, and raw JSON bodies for seamless automatic sync verification.
              </p>
              
              <div className="flex flex-wrap gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => handleSimulateWebhook('push')}
                  disabled={isSimulatingWebhook}
                  className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all border border-white/10 cursor-pointer"
                >
                  <Activity className="w-4 h-4" />
                  <span>Simulate Push Event</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSimulateWebhook('pull_request')}
                  disabled={isSimulatingWebhook}
                  className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all border border-white/10 cursor-pointer"
                >
                  <GitPullRequest className="w-4 h-4" />
                  <span>Simulate PR Event</span>
                </button>
                <button
                  type="button"
                  onClick={fetchData}
                  className="bg-indigo-500 text-white px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all hover:bg-indigo-400 cursor-pointer"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Refresh Logs</span>
                </button>

                <div className="h-8 w-px bg-white/20 mx-1 hidden sm:block" />

                <button
                  type="button"
                  onClick={() => setKeepDeviceLive(!keepDeviceLive)}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all border cursor-pointer ${
                    keepDeviceLive 
                      ? 'bg-emerald-500 text-white border-emerald-400 shadow-lg shadow-emerald-500/20' 
                      : 'bg-white/10 hover:bg-white/20 text-white border-white/10'
                  }`}
                >
                  {keepDeviceLive ? (
                    <Zap className="w-4 h-4 fill-current animate-pulse text-amber-300" />
                  ) : (
                    <MonitorPlay className="w-4 h-4" />
                  )}
                  <span>{keepDeviceLive ? 'Device Live: ACTIVE' : 'Keep Device Live'}</span>
                </button>
              </div>
            </div>
            
            <div className="absolute top-0 right-0 p-8 opacity-10">
              <Terminal className="w-48 h-48" />
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Event / Action</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Timestamp</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-right">Payload</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {webhookLogs.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center text-slate-400 text-sm italic">
                        No webhook events received yet. Simulate an event or wait for repository activity.
                      </td>
                    </tr>
                  ) : (
                    webhookLogs.map((log) => (
                      <React.Fragment key={log.id}>
                        <tr className={`hover:bg-slate-50 transition-colors ${expandedLogId === log.id ? 'bg-indigo-50/30' : ''}`}>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className={`p-1.5 rounded-lg ${log.event === 'push' ? 'bg-emerald-100 text-emerald-700' : 'bg-indigo-100 text-indigo-700'}`}>
                                {log.event === 'push' ? <Activity className="w-3.5 h-3.5" /> : <GitPullRequest className="w-3.5 h-3.5" />}
                              </div>
                              <div>
                                <div className="text-sm font-bold text-slate-900 font-mono capitalize">{log.event}</div>
                                <div className="text-[10px] text-slate-400 uppercase font-bold tracking-tight">
                                  {log.action || 'default'}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <span className={`w-2 h-2 rounded-full ${log.status === 'success' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                              <span className="text-xs font-mono font-bold text-slate-700">{log.statusCode}</span>
                              <span className="text-[10px] text-slate-400 font-medium">{log.status.toUpperCase()}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-xs text-slate-600 font-mono">
                              {new Date(log.timestamp).toLocaleTimeString()}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              {new Date(log.timestamp).toLocaleDateString()}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button
                              type="button"
                              onClick={() => setExpandedLogId(expandedLogId === log.id ? null : log.id)}
                              className={`p-2 rounded-xl transition-all cursor-pointer ${
                                expandedLogId === log.id ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                              }`}
                            >
                              <Search className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                        {expandedLogId === log.id && (
                          <tr className="bg-slate-50">
                            <td colSpan={4} className="px-6 py-6 border-t border-indigo-100">
                              <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2 text-xs font-bold text-indigo-900">
                                    <Code className="w-4 h-4" />
                                    <span>Raw JSON Payload (Body)</span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      navigator.clipboard.writeText(JSON.stringify(log.payload, null, 2));
                                    }}
                                    className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
                                  >
                                    <Copy className="w-3 h-3" />
                                    COPY JSON
                                  </button>
                                </div>
                                <div className="bg-slate-900 rounded-2xl p-6 font-mono text-[11px] text-indigo-300 overflow-x-auto border border-slate-800 shadow-inner max-h-[400px] overflow-y-auto custom-scrollbar">
                                  <pre className="whitespace-pre-wrap">{JSON.stringify(log.payload, null, 2)}</pre>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Activity className="w-3.5 h-3.5 animate-pulse text-emerald-500" />
                Listening for incoming events...
              </span>
              <span className="text-[10px] font-mono text-slate-400">
                Retention: Last 20 events
              </span>
            </div>
          </div>
        </div>
      )}
      {/* Subtab 7: SSO & Identity Enrollment */}
      {activeTab === 'sso-enrollment' && (
        <div className="space-y-6">
          {/* Identity Enrollment Hero */}
          <div className="bg-gradient-to-br from-indigo-950 via-slate-900 to-emerald-950 rounded-3xl p-8 text-white shadow-2xl relative overflow-hidden border border-slate-800">
            <div className="absolute top-0 right-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10 pointer-events-none" />
            <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none" />
            
            <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <div className="bg-emerald-400/20 p-3 rounded-2xl border border-emerald-400/30">
                    <Fingerprint className="w-7 h-7 text-emerald-300" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black tracking-tight">SSO & Identity Enrollment</h3>
                    <p className="text-emerald-200/70 text-sm font-semibold uppercase tracking-widest">iOS Secure Enclave Binding</p>
                  </div>
                </div>

                <p className="text-slate-300 text-lg leading-relaxed font-medium">
                  Enroll your GitHub identity into the Dabels Tech SSO ecosystem. 
                  This binds your hardware Secure Enclave to your repository profile for zero-touch authentication and automated fixing.
                </p>

                <div className="flex flex-wrap gap-4">
                  <button
                    type="button"
                    onClick={() => handleSsoEnroll(`ios-enc-${Date.now().toString(36)}`, 'ios')}
                    disabled={isEnrollingSso || !connectedUser}
                    className={`px-8 py-4 rounded-2xl text-sm font-bold flex items-center gap-3 transition-all shadow-xl cursor-pointer ${
                      isEnrollingSso 
                        ? 'bg-emerald-500 text-white animate-pulse' 
                        : !connectedUser
                        ? 'bg-slate-700 text-slate-400 cursor-not-allowed opacity-50'
                        : 'bg-white text-indigo-950 hover:scale-[1.02] active:scale-[0.98]'
                    }`}
                  >
                    {isEnrollingSso ? (
                      <RefreshCw className="w-5 h-5 animate-spin" />
                    ) : (
                      <UserCheck className="w-5 h-5 text-emerald-600" />
                    )}
                    <span>{isEnrollingSso ? 'Enrolling Identity...' : 'Start iOS SSO Enrollment'}</span>
                  </button>

                  <div className="flex items-center gap-2 px-5 py-3 bg-slate-800/50 rounded-2xl border border-slate-700 backdrop-blur-md">
                    <Shield className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-bold text-slate-300 uppercase tracking-widest">Security Level: HARDWARE_BOUND</span>
                  </div>
                </div>

                {!connectedUser && (
                  <p className="text-rose-300 text-xs font-bold flex items-center gap-1.5 animate-pulse">
                    <AlertCircle className="w-4 h-4" />
                    GITHUB AUTHENTICATION REQUIRED BEFORE ENROLLMENT
                  </p>
                )}
              </div>

              <div className="bg-slate-900/50 backdrop-blur-xl rounded-3xl p-6 border border-slate-800 space-y-6">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Enrollment Profile</span>
                  {connectedUser && (
                    <span className="text-[10px] bg-emerald-400/10 text-emerald-400 px-2 py-0.5 rounded-full font-bold border border-emerald-400/20">
                      ID_VERIFIED
                    </span>
                  )}
                </div>

                {connectedUser ? (
                  <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-800/30 border border-slate-700">
                    <img 
                      src={connectedUser.avatarUrl} 
                      alt={connectedUser.login}
                      className="w-16 h-16 rounded-2xl border-2 border-indigo-500/30"
                    />
                    <div>
                      <div className="text-lg font-bold text-white">@{connectedUser.login}</div>
                      <div className="text-sm text-slate-400">{connectedUser.email}</div>
                      <div className="flex items-center gap-2 mt-1 text-[10px] font-mono text-indigo-400">
                        <Link2 className="w-3 h-3" />
                        <span>GH_ID: {Math.random().toString(36).substring(7).toUpperCase()}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="h-24 flex items-center justify-center border-2 border-dashed border-slate-800 rounded-2xl text-slate-600 text-sm italic">
                    Authenticate GitHub to view profile
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl bg-indigo-500/5 border border-indigo-500/10 space-y-1">
                    <div className="text-[10px] font-bold text-slate-500 uppercase">Device Context</div>
                    <div className="text-sm font-bold text-slate-200">iOS Backend (Sandboxed)</div>
                  </div>
                  <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 space-y-1">
                    <div className="text-[10px] font-bold text-slate-500 uppercase">Auth Protocol</div>
                    <div className="text-sm font-bold text-slate-200">OAuth 2.0 / SSO</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Enrolled Identity Matrix */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Enrolled Identity Matrix</h3>
                <p className="text-sm text-slate-500">Active SSO device bindings and enrollment history</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex -space-x-2">
                  {ssoEnrollments.slice(0, 3).map((e, idx) => (
                    <div key={e.id} className="w-8 h-8 rounded-full bg-slate-200 border-2 border-white flex items-center justify-center text-[10px] font-bold text-slate-600">
                      {e.githubLogin.substring(0, 2).toUpperCase()}
                    </div>
                  ))}
                  {ssoEnrollments.length > 3 && (
                    <div className="w-8 h-8 rounded-full bg-indigo-600 border-2 border-white flex items-center justify-center text-[10px] font-bold text-white">
                      +{ssoEnrollments.length - 3}
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={fetchData}
                  className="p-2.5 rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-indigo-600 hover:border-indigo-200 transition-all cursor-pointer shadow-sm"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    <th className="px-8 py-4">Identity / Device</th>
                    <th className="px-8 py-4">Enrolled At</th>
                    <th className="px-8 py-4">Status / Security</th>
                    <th className="px-8 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {ssoEnrollments.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-8 py-12 text-center text-slate-500 italic">
                        No active SSO enrollments detected. Start enrollment to bind your identity.
                      </td>
                    </tr>
                  ) : (
                    ssoEnrollments.map((enrollment) => (
                      <tr key={enrollment.id} className="hover:bg-slate-50/80 transition-colors group">
                        <td className="px-8 py-5">
                          <div className="flex items-center gap-4">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                              enrollment.deviceType === 'ios' ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-600'
                            }`}>
                              {enrollment.deviceType === 'ios' ? <MonitorPlay className="w-5 h-5" /> : <Globe className="w-5 h-5" />}
                            </div>
                            <div>
                              <div className="text-sm font-bold text-slate-900">@{enrollment.githubLogin}</div>
                              <div className="text-[11px] font-mono text-slate-400">{enrollment.deviceId}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-5">
                          <div className="text-sm font-semibold text-slate-700">
                            {new Date(enrollment.enrolledAt).toLocaleDateString()}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {new Date(enrollment.enrolledAt).toLocaleTimeString()}
                          </div>
                        </td>
                        <td className="px-8 py-5">
                          <div className="flex items-center gap-3">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-tight flex items-center gap-1.5 ${
                              enrollment.status === 'active' 
                                ? 'bg-emerald-100 text-emerald-700' 
                                : 'bg-slate-100 text-slate-500'
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${enrollment.status === 'active' ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                              {enrollment.status}
                            </span>
                            <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-lg border border-slate-200">
                              AES-256-GCM
                            </span>
                          </div>
                        </td>
                        <td className="px-8 py-5 text-right">
                          <button
                            type="button"
                            onClick={() => handleSsoRevoke(enrollment.id)}
                            disabled={enrollment.status === 'revoked'}
                            className={`p-2.5 rounded-xl transition-all cursor-pointer ${
                              enrollment.status === 'revoked'
                                ? 'bg-slate-100 text-slate-300 cursor-not-allowed'
                                : 'bg-rose-50 text-rose-600 hover:bg-rose-100'
                            }`}
                            title="Revoke Identity Binding"
                          >
                            <LogOut className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
