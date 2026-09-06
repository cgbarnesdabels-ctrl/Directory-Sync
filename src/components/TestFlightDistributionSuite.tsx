/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Smartphone,
  Send,
  CheckCircle2,
  Clock,
  RefreshCw,
  Mail,
  Shield,
  Apple,
  ExternalLink,
  Copy,
  Check,
  AlertCircle,
  FileCode,
  Terminal,
  UserPlus,
  Play,
  Key
} from 'lucide-react';
import type { TestFlightDeployment, TestFlightTester, GitHubWorkflowRun } from '../types/github';

interface TestFlightDistributionSuiteProps {
  onWorkflowTriggered?: () => void;
  onViewWorkflowYaml?: (filename: string) => void;
}

export const TestFlightDistributionSuite: React.FC<TestFlightDistributionSuiteProps> = ({
  onWorkflowTriggered,
  onViewWorkflowYaml
}) => {
  const [deployment, setDeployment] = useState<TestFlightDeployment | null>(null);
  const [runs, setRuns] = useState<GitHubWorkflowRun[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDispatching, setIsDispatching] = useState(false);
  const [isInviting, setIsInviting] = useState(false);
  
  // Form states
  const [targetEmail, setTargetEmail] = useState('jessicabarbiej@icloud.com');
  const [releaseNotes, setReleaseNotes] = useState(
    'Dabels Tech Passkey Gateway mobile client build for TestFlight tester jessicabarbiej@icloud.com'
  );
  const [appVersion, setAppVersion] = useState('1.0.0');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [dispatchSuccessMessage, setDispatchSuccessMessage] = useState<string | null>(null);

  const fetchTestFlightStatus = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/github/testflight/status');
      if (res.ok) {
        const data = await res.json();
        setDeployment(data.deployment);
      }

      const runsRes = await fetch('/api/github/workflow-runs');
      if (runsRes.ok) {
        const runsData = await runsRes.json();
        const tfRuns = (runsData.runs || []).filter((r: GitHubWorkflowRun) => 
          r.workflowFile === 'testflight.yml' || r.workflowName.toLowerCase().includes('testflight')
        );
        setRuns(tfRuns);
      }
    } catch (err) {
      console.error('Failed to load TestFlight status:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTestFlightStatus();
    const interval = setInterval(fetchTestFlightStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleCopy = (text: string, keyId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(keyId);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const handleDispatchTestFlight = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetEmail) return;

    setIsDispatching(true);
    setDispatchSuccessMessage(null);

    try {
      const res = await fetch('/api/github/testflight/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          testerEmail: targetEmail,
          releaseNotes,
          appVersion,
          buildType: 'beta'
        })
      });

      if (res.ok) {
        const data = await res.json();
        setDispatchSuccessMessage(
          `iOS build successfully dispatched! TestFlight invitation queued for ${targetEmail}.`
        );
        fetchTestFlightStatus();
        if (onWorkflowTriggered) onWorkflowTriggered();
      }
    } catch (err) {
      console.error('Dispatch failed:', err);
    } finally {
      setIsDispatching(false);
    }
  };

  const handleInviteTester = async (email: string) => {
    setIsInviting(true);
    try {
      const res = await fetch('/api/github/testflight/invite-tester', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          firstName: 'Jessica',
          lastName: 'Barbie',
          group: 'Beta Testers'
        })
      });

      if (res.ok) {
        setDispatchSuccessMessage(`Invitation successfully re-sent to ${email}`);
        fetchTestFlightStatus();
      }
    } catch (err) {
      console.error('Invite failed:', err);
    } finally {
      setIsInviting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Hero Card: Apple TestFlight & GitHub CI/CD */}
      <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden border border-indigo-900/50">
        <div className="relative z-10 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
                <Smartphone className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-indigo-300 uppercase tracking-widest flex items-center gap-1.5">
                    <Apple className="w-3.5 h-3.5" /> Apple TestFlight Distribution
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-[10px] font-mono font-bold">
                    FASTLANE PILOT READY
                  </span>
                </div>
                <h2 className="text-2xl font-black text-white tracking-tight">
                  Automated TestFlight Pipeline &amp; Tester Delivery
                </h2>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={fetchTestFlightStatus}
                disabled={isLoading}
                className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer border border-white/10"
                title="Refresh Status"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              </button>

              {onViewWorkflowYaml && (
                <button
                  type="button"
                  onClick={() => onViewWorkflowYaml('testflight.yml')}
                  className="px-3.5 py-2 rounded-xl bg-indigo-600/80 hover:bg-indigo-600 text-white text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <FileCode className="w-4 h-4" />
                  <span>View testflight.yml</span>
                </button>
              )}
            </div>
          </div>

          <p className="text-slate-300 text-sm max-w-3xl leading-relaxed">
            Directly compile iOS app archives via GitHub Actions (<code className="text-indigo-300 font-mono text-xs">macos-14</code> Apple Silicon runners), sign binaries with App Store distribution profiles, upload IPAs to App Store Connect, and dispatch external beta invitations directly to your targeted iCloud email (<code className="text-indigo-300 font-semibold font-mono">jessicabarbiej@icloud.com</code>).
          </p>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-3.5 backdrop-blur-sm">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Target App</div>
              <div className="text-sm font-black text-white mt-0.5 truncate">Dabels Passkey</div>
              <div className="text-[10px] text-indigo-300 font-mono">com.dabelstech.passkey</div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-3.5 backdrop-blur-sm">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Target Tester</div>
              <div className="text-sm font-black text-white mt-0.5 truncate">Jessica Barbie</div>
              <div className="text-[10px] text-emerald-400 font-mono truncate">jessicabarbiej@icloud.com</div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-3.5 backdrop-blur-sm">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Latest Build</div>
              <div className="text-sm font-black text-white mt-0.5">
                v{deployment?.version || '1.0.0'} (#{deployment?.buildNumber || 42})
              </div>
              <div className="text-[10px] text-indigo-300">Fastlane Pilot / Gym</div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-3.5 backdrop-blur-sm">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Deployment Status</div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-sm font-black text-white capitalize">
                  {deployment?.status === 'uploading' ? 'Uploading IPA...' : 'Ready on TestFlight'}
                </span>
              </div>
              <div className="text-[10px] text-emerald-400">Invite Email Dispatched</div>
            </div>
          </div>
        </div>

        {/* Decorative background glow */}
        <div className="absolute -bottom-16 -right-16 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {dispatchSuccessMessage && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl p-4 flex items-center justify-between gap-3 text-xs font-semibold shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{dispatchSuccessMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setDispatchSuccessMessage(null)}
            className="text-emerald-600 hover:text-emerald-900 cursor-pointer text-sm font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (7 cols): Dispatch Form & Tester Roster */}
        <div className="lg:col-span-7 space-y-6">
          {/* Dispatch Build to TestFlight Form */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold">
                  <Send className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Dispatch iOS Build to Apple TestFlight
                  </h3>
                  <p className="text-xs text-slate-500">
                    Triggers GitHub Actions workflow &amp; sends invitation email to iCloud tester
                  </p>
                </div>
              </div>
              <span className="text-[11px] font-mono font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                .github/workflows/testflight.yml
              </span>
            </div>

            <form onSubmit={handleDispatchTestFlight} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-indigo-600" />
                    Target iCloud Tester Email
                  </span>
                  <span className="text-[10px] text-emerald-600 font-semibold normal-case">
                    Recipient for Apple TestFlight Invite
                  </span>
                </label>
                <input
                  type="email"
                  required
                  value={targetEmail}
                  onChange={(e) => setTargetEmail(e.target.value)}
                  placeholder="jessicabarbiej@icloud.com"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-mono font-semibold text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Marketing Version
                  </label>
                  <input
                    type="text"
                    value={appVersion}
                    onChange={(e) => setAppVersion(e.target.value)}
                    placeholder="1.0.0"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-mono text-slate-900 focus:bg-white focus:outline-hidden focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Target Environment
                  </label>
                  <select
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-900 focus:bg-white focus:outline-hidden focus:border-indigo-500 cursor-pointer"
                    defaultValue="beta"
                  >
                    <option value="beta">Beta (External Beta Group)</option>
                    <option value="internal">Internal Testers Only</option>
                    <option value="release">App Store Release Candidate</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Release Notes / Test Instructions
                </label>
                <textarea
                  rows={2}
                  value={releaseNotes}
                  onChange={(e) => setReleaseNotes(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:bg-white focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-between gap-3">
                <div className="text-[11px] text-slate-500">
                  Build runner: <span className="font-mono font-semibold text-slate-700">macos-14 (Xcode 15.4)</span>
                </div>

                <button
                  type="submit"
                  disabled={isDispatching}
                  className="py-2.5 px-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-xs cursor-pointer disabled:opacity-60"
                >
                  {isDispatching ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Building &amp; Uploading to Apple...</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Dispatch TestFlight Build to {targetEmail}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Tester Management Card */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-indigo-600" />
                  <span>Enrolled TestFlight Beta Testers</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Testers receiving Apple TestFlight redemption codes and email notifications
                </p>
              </div>

              <button
                type="button"
                onClick={() => handleInviteTester('jessicabarbiej@icloud.com')}
                disabled={isInviting}
                className="py-1.5 px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-indigo-200"
              >
                <Mail className="w-3.5 h-3.5" />
                <span>{isInviting ? 'Sending Invite...' : 'Re-send Invite to iCloud'}</span>
              </button>
            </div>

            <div className="divide-y divide-slate-100">
              {deployment?.testers?.map((tester, idx) => (
                <div key={idx} className="py-3.5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-xs text-slate-700">
                      {tester.firstName ? tester.firstName[0] : 'J'}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900 flex items-center gap-2">
                        <span>{tester.firstName} {tester.lastName}</span>
                        <span className="font-mono text-slate-500">({tester.email})</span>
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                        <span className="font-mono text-indigo-600">{tester.group}</span>
                        <span>•</span>
                        <span>Invited {new Date(tester.invitedAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-tight bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      <span>{tester.status}</span>
                    </span>

                    <button
                      type="button"
                      onClick={() => handleInviteTester(tester.email)}
                      className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                      title="Re-send invitation"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column (5 cols): TestFlight Secrets & Recent Runs */}
        <div className="lg:col-span-5 space-y-6">
          {/* GitHub Repository Secrets Guide */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
                <Key className="w-4 h-4 text-indigo-600" />
                <span>GitHub Action Secrets Configuration</span>
              </h4>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-mono">
                App Store Connect API
              </span>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              To let GitHub automatically upload and invite <code className="font-mono text-slate-900 bg-slate-100 px-1 py-0.5 rounded">jessicabarbiej@icloud.com</code> to TestFlight, ensure these secrets are stored in your GitHub repository:
            </p>

            <div className="space-y-2.5">
              {[
                { name: 'APP_STORE_CONNECT_KEY_ID', desc: '10-character App Store Connect API Key ID' },
                { name: 'APP_STORE_CONNECT_ISSUER_ID', desc: 'UUID Issuer ID from App Store Connect Users and Access' },
                { name: 'APP_STORE_CONNECT_KEY_CONTENT', desc: 'Base64 encoded AuthKey_*.p8 private key file' },
                { name: 'BUILD_CERTIFICATE_BASE64', desc: 'Base64 Apple Distribution .p12 Certificate' },
                { name: 'P12_PASSWORD', desc: 'Password used to encrypt the .p12 certificate' },
                { name: 'BUILD_PROVISION_PROFILE_BASE64', desc: 'Base64 .mobileprovision App Store profile' }
              ].map((secret) => (
                <div
                  key={secret.name}
                  className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between gap-2"
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-mono text-[11px] font-bold text-slate-800 truncate">
                      {secret.name}
                    </div>
                    <div className="text-[10px] text-slate-500 truncate">{secret.desc}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopy(secret.name, secret.name)}
                    className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 rounded-lg transition-colors cursor-pointer shrink-0"
                    title="Copy Secret Name"
                  >
                    {copiedKey === secret.name ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              ))}
            </div>

            <div className="pt-2 flex items-center gap-2">
              <a
                href="https://appstoreconnect.apple.com/access/api"
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer border border-slate-200"
              >
                <Apple className="w-3.5 h-3.5" />
                <span>Open App Store Connect API</span>
              </a>
            </div>
          </div>

          {/* Recent TestFlight Workflows Runs */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
                <Terminal className="w-4 h-4 text-indigo-600" />
                <span>TestFlight Execution Runs</span>
              </h4>
              <span className="text-[10px] font-mono text-slate-400 font-semibold">
                {runs.length} runs logged
              </span>
            </div>

            <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
              {runs.length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-400 italic">
                  No TestFlight runs executed yet. Click &quot;Dispatch TestFlight Build&quot; above to start.
                </div>
              ) : (
                runs.map((run) => (
                  <div
                    key={run.id}
                    className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 font-bold text-slate-900">
                        {run.status === 'completed' && run.conclusion === 'success' ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        ) : run.status === 'in_progress' ? (
                          <RefreshCw className="w-3.5 h-3.5 text-amber-500 animate-spin" />
                        ) : (
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                        )}
                        <span className="truncate">{run.workflowName}</span>
                      </div>
                      <span className="font-mono text-[10px] text-slate-400">
                        {run.durationSeconds}s
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-600 truncate font-mono">
                      {run.commitMessage}
                    </p>

                    <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-200/60 font-mono">
                      <span>Ref: {run.branch} ({run.commitSha})</span>
                      <span>{new Date(run.createdAt).toLocaleTimeString()}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
