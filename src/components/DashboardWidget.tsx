/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Cloud, 
  Calendar, 
  Mail, 
  StickyNote, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle,
  HardDrive,
  Activity,
  LayoutGrid,
  Sparkles,
  Wrench,
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronUp,
  Smartphone,
  ShieldCheck,
  PlayCircle,
  Info,
  Layers,
  ArrowRight,
  Video
} from 'lucide-react';
import { collection, query, where, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { updateSyncStatus, IntegrationService } from '../lib/sync-service';
import { useToast } from '../context/ToastContext';
import { SafariExtensionModal } from './SafariExtensionModal';

interface SyncState {
  service: string;
  status: 'active' | 'error' | 'pending';
  lastSyncAt: string;
  errorCode?: string;
  errorMessage?: string;
}

interface SyncLog {
  id: string;
  service: string;
  status: 'active' | 'error' | 'pending';
  timestamp: string;
  errorCode?: string;
  errorMessage?: string;
  conflictType?: string;
}

interface SuggestedIntervention {
  type: 'automated' | 'manual';
  actionId: string;
  actionLabel: string;
  description: string;
  manualInstructions?: string[];
  requiresReauth?: boolean;
}

interface DetectedConflict {
  id: string;
  service: string;
  errorCode: string;
  errorTitle: string;
  severity: 'critical' | 'warning' | 'info';
  rootCause: string;
  workspaceApiDetails: string;
  suggestedIntervention: SuggestedIntervention;
}

interface AnalysisResult {
  source: 'gemini-3.8-flash' | 'rule-engine-fallback';
  summary: string;
  healthScore: number;
  detectedConflicts: DetectedConflict[];
  recommendedActionPlan: string[];
  analyzedAt: string;
}

interface DashboardWidgetProps {
  onNavigateToWorkspace?: () => void;
}

export const DashboardWidget: React.FC<DashboardWidgetProps> = ({ onNavigateToWorkspace }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'history' | 'conflicts'>('overview');
  const [syncs, setSyncs] = useState<Record<string, SyncState>>({});
  const [syncLogs, setSyncLogs] = useState<SyncLog[]>([]);
  const [lastLogId, setLastLogId] = useState<string | null>(null);
  const [isNewLogFlashing, setIsNewLogFlashing] = useState(false);
  const [newLogCount, setNewLogCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [executingActionId, setExecutingActionId] = useState<string | null>(null);
  const [expandedManualId, setExpandedManualId] = useState<string | null>(null);
  const [isSafariModalOpen, setIsSafariModalOpen] = useState(false);
  const [isSimulatingScenario, setIsSimulatingScenario] = useState(false);

  const { showToast } = useToast();

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        const qStatus = query(
          collection(db, 'sync_status'),
          where('userEmail', '==', user.email)
        );

        const unsubscribeStatus = onSnapshot(qStatus, (snapshot) => {
          const newSyncs: Record<string, SyncState> = {};
          snapshot.docs.forEach(doc => {
            const data = doc.data() as SyncState;
            newSyncs[data.service] = data;
          });
          setSyncs(newSyncs);
          setIsLoading(false);
        });

        const qLogs = query(
          collection(db, 'sync_logs'),
          where('userEmail', '==', user.email),
          orderBy('timestamp', 'desc'),
          limit(30)
        );

        const unsubscribeLogs = onSnapshot(qLogs, (snapshot) => {
          const fetchedLogs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SyncLog));
          setSyncLogs(fetchedLogs);

          if (fetchedLogs.length > 0) {
            const newest = fetchedLogs[0];
            setLastLogId(prevId => {
              if (prevId && newest.id !== prevId) {
                setIsNewLogFlashing(true);
                setNewLogCount(count => count + 1);
                setTimeout(() => setIsNewLogFlashing(false), 2000);
              }
              return newest.id;
            });
          }
        });

        return () => {
          unsubscribeStatus();
          unsubscribeLogs();
        };
      } else {
        setSyncs({});
        setSyncLogs([]);
        setIsLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  const services = [
    { id: 'drive', label: 'Google Drive', icon: HardDrive, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { id: 'calendar', label: 'Calendar', icon: Calendar, color: 'text-blue-600', bg: 'bg-blue-50' },
    { id: 'gmail', label: 'Gmail', icon: Mail, color: 'text-rose-600', bg: 'bg-rose-50' },
    { id: 'keep', label: 'Google Keep', icon: StickyNote, color: 'text-amber-600', bg: 'bg-amber-50' },
    { id: 'meet', label: 'Google Meet', icon: Video, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  ];

  const getServiceData = (id: string) => services.find(s => s.id === id) || services[0];

  // Number of active service conflicts
  const activeErrorCount = Object.values(syncs).filter((s: SyncState) => s?.status === 'error').length;
  const detectedConflictsCount = analysisResult?.detectedConflicts.length ?? activeErrorCount;

  // Run Gemini API conflict analysis
  const handleAnalyzeWithGemini = useCallback(async () => {
    setIsAnalyzing(true);
    try {
      const response = await fetch('/api/workspace/resolve-conflicts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          logs: syncLogs,
          currentStatus: syncs,
        }),
      });

      if (!response.ok) {
        throw new Error(`Server returned HTTP ${response.status}`);
      }

      const data = await response.json();
      if (data.success && data.analysis) {
        setAnalysisResult(data.analysis);
        showToast({
          type: 'success',
          message: data.analysis.source === 'gemini-3.8-flash'
            ? 'Gemini 3.8 Flash successfully analyzed Workspace sync telemetry.'
            : 'Workspace sync conflict analysis completed.',
        });
      }
    } catch (err: any) {
      console.error('Failed to run conflict analysis:', err);
      showToast({
        type: 'error',
        message: `Conflict analysis error: ${err.message}`,
      });
    } finally {
      setIsAnalyzing(false);
    }
  }, [syncLogs, syncs, showToast]);

  // Execute automated intervention
  const handleExecuteIntervention = async (conflict: DetectedConflict) => {
    const actionId = conflict.suggestedIntervention.actionId;
    setExecutingActionId(conflict.id);

    try {
      const response = await fetch('/api/workspace/execute-intervention', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actionId,
          service: conflict.service,
          conflictId: conflict.id,
          userEmail: auth.currentUser?.email,
        }),
      });

      const data = await response.json();
      if (data.success) {
        // Update Firestore status to active
        await updateSyncStatus(conflict.service as IntegrationService, 'active');

        showToast({
          type: 'success',
          message: data.message || `Automated intervention executed for ${conflict.service.toUpperCase()}.`,
        });

        // Optimistically remove or update resolved conflict from local state
        setAnalysisResult(prev => {
          if (!prev) return null;
          const updated = prev.detectedConflicts.filter(c => c.id !== conflict.id);
          return {
            ...prev,
            detectedConflicts: updated,
            healthScore: Math.min(100, prev.healthScore + 25),
            summary: updated.length === 0
              ? 'All Workspace conflicts resolved. Services in sync.'
              : prev.summary,
          };
        });
      } else {
        throw new Error(data.error || 'Failed to execute intervention');
      }
    } catch (err: any) {
      console.error('Intervention execution error:', err);
      showToast({
        type: 'error',
        message: `Failed to execute intervention: ${err.message}`,
      });
    } finally {
      setExecutingActionId(null);
    }
  };

  // Simulate common Google Workspace API error code scenarios for immediate testing
  const handleSimulateScenario = async (scenario: string) => {
    setIsSimulatingScenario(true);
    try {
      if (scenario === '409-drive') {
        await updateSyncStatus('drive', 'error', {
          errorCode: '409',
          errorMessage: 'HTTP 409 Conflict: modifiedDate on Drive server is newer than client snapshot.',
          conflictType: 'stateConflict',
        });
        showToast({
          type: 'info',
          message: 'Simulated HTTP 409 Conflict in Google Drive sync channel.',
        });
      } else if (scenario === '401-gmail') {
        await updateSyncStatus('gmail', 'error', {
          errorCode: '401',
          errorMessage: 'HTTP 401 Unauthorized: InvalidCredentials. OAuth access token expired.',
          conflictType: 'authError',
        });
        showToast({
          type: 'info',
          message: 'Simulated HTTP 401 Unauthorized in Gmail security inbox channel.',
        });
      } else if (scenario === '403-calendar') {
        await updateSyncStatus('calendar', 'error', {
          errorCode: '403',
          errorMessage: 'HTTP 403 Forbidden: userRateLimitExceeded. Requests per minute exceeded.',
          conflictType: 'rateLimitExceeded',
        });
        showToast({
          type: 'info',
          message: 'Simulated HTTP 403 Rate Limit in Google Calendar audit channel.',
        });
      } else if (scenario === '412-keep') {
        await updateSyncStatus('keep', 'error', {
          errorCode: '412',
          errorMessage: 'HTTP 412 Precondition Failed: ETag mismatch on note revision update.',
          conflictType: 'etagMismatch',
        });
        showToast({
          type: 'info',
          message: 'Simulated HTTP 412 Precondition Failed in Google Keep channel.',
        });
      } else if (scenario === '403-meet') {
        await updateSyncStatus('meet', 'error', {
          errorCode: '403',
          errorMessage: 'HTTP 403 Forbidden: conferenceAccessDenied. Meeting space creation requires updated scope authorization.',
          conflictType: 'permissionDenied',
        });
        showToast({
          type: 'info',
          message: 'Simulated HTTP 403 Forbidden in Google Meet space creation channel.',
        });
      } else if (scenario === 'clear-all') {
        await Promise.all([
          updateSyncStatus('drive', 'active'),
          updateSyncStatus('gmail', 'active'),
          updateSyncStatus('calendar', 'active'),
          updateSyncStatus('keep', 'active'),
          updateSyncStatus('meet', 'active'),
        ]);
        setAnalysisResult(null);
        showToast({
          type: 'success',
          message: 'All Google Workspace channels restored to active status.',
        });
      }

      // Automatically trigger analysis
      if (scenario !== 'clear-all') {
        setTimeout(() => {
          handleAnalyzeWithGemini();
        }, 300);
      }
    } catch (err: any) {
      showToast({
        type: 'error',
        message: `Simulation error: ${err.message}`,
      });
    } finally {
      setIsSimulatingScenario(false);
    }
  };

  return (
    <div className={`bg-white rounded-2xl border transition-all duration-700 shadow-xs overflow-hidden ${
      isNewLogFlashing 
        ? 'border-indigo-400 ring-2 ring-indigo-400/40 shadow-indigo-100/50 bg-indigo-50/10 scale-[1.002]' 
        : 'border-slate-200'
    }`}>
      {/* Widget Top Header */}
      <div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
            <Cloud className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <span>Workspace Sync Status &amp; Conflict Guard</span>
              {isNewLogFlashing && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-700 border border-indigo-300 animate-pulse flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-ping" />
                  Live Sync Log Received
                </span>
              )}
            </h3>
            <p className="text-[11px] text-slate-400">
              Bi-directional Google Workspace sync with Gemini automated conflict resolution
            </p>
          </div>
        </div>

        {/* Right Header Actions */}
        <div className="flex items-center gap-2">
          {onNavigateToWorkspace && (
            <button
              type="button"
              onClick={onNavigateToWorkspace}
              className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs border border-indigo-200"
              title="Open Google Workspace Integration Hub"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              <span>Workspace Hub</span>
            </button>
          )}

          {/* Safari iOS Web Extension Quick Launcher */}
          <button
            onClick={() => setIsSafariModalOpen(true)}
            className="px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
            title="Open Safari iOS Web Extension Inspector & Simulator"
          >
            <Smartphone className="w-3.5 h-3.5 text-indigo-600" />
            <span>Safari iOS Extension</span>
            {detectedConflictsCount > 0 ? (
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
            ) : (
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
            )}
          </button>

          {/* Navigation Tabs */}
          <div className="flex bg-slate-100 p-1 rounded-lg">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'overview' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              Overview
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'history' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              Live Log
            </button>
            <button
              onClick={() => {
                setActiveTab('conflicts');
                if (!analysisResult) {
                  handleAnalyzeWithGemini();
                }
              }}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'conflicts' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              <span>Conflict Resolver</span>
              {detectedConflictsCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[9px] font-bold">
                  {detectedConflictsCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Tab 1: Overview */}
      {activeTab === 'overview' && (
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {services.map((service) => {
              const sync = syncs[service.id];
              return (
                <div 
                  key={service.id} 
                  className={`p-3 rounded-xl border transition-all ${
                    sync?.status === 'error'
                      ? 'bg-rose-50/50 border-rose-200'
                      : 'bg-slate-50 border-slate-100 hover:bg-white hover:shadow-xs'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className={`p-1.5 rounded-lg bg-white shadow-xs ${service.color}`}>
                      <service.icon className="w-3.5 h-3.5" />
                    </div>
                    {isLoading ? (
                      <RefreshCw className="w-3 h-3 text-slate-300 animate-spin" />
                    ) : sync?.status === 'active' ? (
                      <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                        <span>Active</span>
                      </div>
                    ) : sync?.status === 'error' ? (
                      <div className="flex items-center gap-1 text-[11px] font-semibold text-rose-600">
                        <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
                        <span>{sync.errorCode ? `Err ${sync.errorCode}` : 'Conflict'}</span>
                      </div>
                    ) : (
                      <div className="w-2 h-2 rounded-full bg-slate-300" />
                    )}
                  </div>
                  
                  <div className="mt-2 space-y-0.5">
                    <p className="text-xs font-bold text-slate-800">{service.label}</p>
                    <p className="text-[10px] text-slate-500 font-medium truncate">
                      {sync?.lastSyncAt 
                        ? `Synced ${new Date(sync.lastSyncAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                        : 'Awaiting sync'}
                    </p>
                    {sync?.errorMessage && (
                      <p className="text-[10px] text-rose-600 font-medium truncate" title={sync.errorMessage}>
                        {sync.errorMessage}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick Conflict Banner if errors present */}
          {activeErrorCount > 0 && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-between gap-3 animate-fade-in">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <p className="text-xs text-amber-800 font-medium">
                  {activeErrorCount} Google Workspace sync conflict(s) detected. Gemini can diagnose root causes and suggest automated interventions.
                </p>
              </div>
              <button
                onClick={() => {
                  setActiveTab('conflicts');
                  handleAnalyzeWithGemini();
                }}
                className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shrink-0 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Open Conflict Resolver
              </button>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Live Log */}
      {activeTab === 'history' && (
        <div className="p-4">
          <div className="h-56 overflow-y-auto pr-2 space-y-2 scrollbar-thin scrollbar-thumb-slate-200">
            {syncLogs.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 py-8">
                <Activity className="w-5 h-5 mb-2 opacity-50" />
                <p className="text-xs">No recent sync operations recorded in Firestore.</p>
              </div>
            ) : (
              syncLogs.map((log, idx) => {
                const serviceData = getServiceData(log.service);
                const Icon = serviceData.icon;
                const isNewestItem = idx === 0 && isNewLogFlashing;
                return (
                  <div 
                    key={log.id} 
                    className={`flex items-center justify-between p-2.5 rounded-xl border transition-all duration-500 ${
                      isNewestItem 
                        ? 'bg-indigo-50/90 border-indigo-300 ring-1 ring-indigo-200/80 shadow-xs scale-[1.005]' 
                        : 'border-slate-100 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-1.5 rounded-lg ${serviceData.bg} ${serviceData.color}`}>
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-bold text-slate-800">
                            {serviceData.label}
                          </p>
                          <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                            log.status === 'active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 
                            log.status === 'error' ? 'bg-rose-50 text-rose-700 border border-rose-200' : 
                            'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}>
                            {log.status}
                          </span>
                          {log.errorCode && (
                            <span className="px-1.5 py-0.5 rounded-md text-[10px] font-mono font-bold bg-slate-100 text-slate-600">
                              HTTP {log.errorCode}
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          {new Date(log.timestamp).toLocaleString()} {log.errorMessage ? `• ${log.errorMessage}` : ''}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Gemini Sync Conflict Resolver */}
      {activeTab === 'conflicts' && (
        <div className="p-4 space-y-4">
          {/* Conflict Resolver Control Header */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-indigo-50 via-purple-50 to-slate-50 border border-indigo-100 flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-indigo-600" />
                  Gemini Sync Conflict Resolver
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-200 text-indigo-800 font-bold">
                  gemini-3.8-flash
                </span>
                {analysisResult && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                    Health: {analysisResult.healthScore}%
                  </span>
                )}
              </div>
              <p className="text-xs text-indigo-900/80 leading-relaxed max-w-xl">
                Analyzes Firestore sync telemetry to diagnose HTTP 409 (Lock Contention), 401 (Auth), 403 (Quota), and 412 (ETag) errors and suggests automated interventions.
              </p>
            </div>

            {/* Actions: Analyze Button + Error Simulation Dropdown */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Simulator Dropdown */}
              <div className="relative inline-block text-left">
                <select
                  disabled={isSimulatingScenario}
                  onChange={(e) => {
                    if (e.target.value) {
                      handleSimulateScenario(e.target.value);
                      e.target.value = '';
                    }
                  }}
                  defaultValue=""
                  className="px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 shadow-xs hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                >
                  <option value="" disabled>Simulate Workspace Error...</option>
                  <option value="409-drive">Simulate HTTP 409 (Drive Version Conflict)</option>
                  <option value="401-gmail">Simulate HTTP 401 (Gmail Expired Token)</option>
                  <option value="403-calendar">Simulate HTTP 403 (Calendar Rate Limit)</option>
                  <option value="403-meet">Simulate HTTP 403 (Meet Space Quota)</option>
                  <option value="412-keep">Simulate HTTP 412 (Keep ETag Mismatch)</option>
                  <option value="clear-all">Reset All to Healthy</option>
                </select>
              </div>

              {/* Run Analysis Button */}
              <button
                onClick={handleAnalyzeWithGemini}
                disabled={isAnalyzing}
                className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-sm shadow-indigo-200 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isAnalyzing ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Analyzing...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Run Gemini Audit</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Analysis Content */}
          {isAnalyzing ? (
            <div className="py-12 text-center space-y-3">
              <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mx-auto opacity-75" />
              <p className="text-xs font-semibold text-slate-700">
                Gemini 3.8 Flash is analyzing Firestore sync telemetry...
              </p>
              <p className="text-[11px] text-slate-400">
                Correlating API error codes, checksum histories, and lock states across Drive, Calendar, Keep, and Gmail.
              </p>
            </div>
          ) : analysisResult ? (
            <div className="space-y-4 animate-fade-in">
              {/* Executive Summary Card */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-start gap-3">
                <div className="p-2 rounded-lg bg-indigo-100 text-indigo-700 shrink-0 mt-0.5">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900">Diagnosis Summary</span>
                    <span className="text-[10px] text-slate-500">
                      Analyzed at {new Date(analysisResult.analyzedAt).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-xs text-slate-700 leading-relaxed">
                    {analysisResult.summary}
                  </p>
                </div>
              </div>

              {/* Detected Conflicts List */}
              {analysisResult.detectedConflicts.length === 0 ? (
                <div className="p-6 rounded-2xl border border-emerald-100 bg-emerald-50/40 text-center space-y-2">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                  <h4 className="text-sm font-bold text-emerald-950">Zero Active Sync Conflicts</h4>
                  <p className="text-xs text-emerald-800 max-w-md mx-auto">
                    All Google Workspace APIs are communicating synchronously. No HTTP 409 concurrent write locks, expired tokens, or rate limit throttling detected.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center justify-between">
                    <span>Identified Conflicts &amp; Automated Interventions ({analysisResult.detectedConflicts.length})</span>
                    <span className="text-[11px] font-normal text-slate-500 lowercase">click action to resolve</span>
                  </h4>

                  {analysisResult.detectedConflicts.map((conflict) => {
                    const srv = getServiceData(conflict.service);
                    const Icon = srv.icon;
                    const isExpanded = expandedManualId === conflict.id;

                    return (
                      <div 
                        key={conflict.id} 
                        className={`rounded-2xl border transition-all p-4 space-y-3 ${
                          conflict.severity === 'critical'
                            ? 'bg-rose-50/40 border-rose-200'
                            : conflict.severity === 'warning'
                            ? 'bg-amber-50/40 border-amber-200'
                            : 'bg-slate-50/60 border-slate-200'
                        }`}
                      >
                        {/* Conflict Header */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3">
                            <div className={`p-2 rounded-xl bg-white shadow-xs ${srv.color} mt-0.5`}>
                              <Icon className="w-4 h-4" />
                            </div>
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-bold text-slate-900">{srv.label}</span>
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-white text-rose-700 border border-rose-200 shadow-2xs">
                                  HTTP {conflict.errorCode}
                                </span>
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                  conflict.severity === 'critical'
                                    ? 'bg-rose-100 text-rose-800'
                                    : 'bg-amber-100 text-amber-800'
                                }`}>
                                  {conflict.severity}
                                </span>
                              </div>
                              <p className="text-xs font-semibold text-slate-800">
                                {conflict.errorTitle}
                              </p>
                            </div>
                          </div>

                          {/* Quick Automated Action Button */}
                          <button
                            onClick={() => handleExecuteIntervention(conflict)}
                            disabled={executingActionId === conflict.id}
                            className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer shrink-0 disabled:opacity-50"
                          >
                            {executingActionId === conflict.id ? (
                              <>
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                <span>Applying...</span>
                              </>
                            ) : (
                              <>
                                <Wrench className="w-3.5 h-3.5" />
                                <span>{conflict.suggestedIntervention.actionLabel}</span>
                              </>
                            )}
                          </button>
                        </div>

                        {/* Root Cause & Workspace API Details */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                          <div className="p-2.5 rounded-xl bg-white/80 border border-slate-200/80">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                              Gemini Root Cause Analysis
                            </span>
                            <p className="text-slate-700 leading-relaxed">
                              {conflict.rootCause}
                            </p>
                          </div>
                          <div className="p-2.5 rounded-xl bg-white/80 border border-slate-200/80">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                              Workspace API Diagnostic Telemetry
                            </span>
                            <p className="text-slate-700 font-mono text-[11px] leading-relaxed">
                              {conflict.workspaceApiDetails}
                            </p>
                          </div>
                        </div>

                        {/* Intervention Description & Manual Instructions Accordion */}
                        <div className="pt-1 border-t border-slate-200/60 flex items-center justify-between text-xs">
                          <p className="text-slate-600 text-[11px]">
                            <strong className="text-slate-800">Action: </strong>
                            {conflict.suggestedIntervention.description}
                          </p>

                          {conflict.suggestedIntervention.manualInstructions && (
                            <button
                              onClick={() => setExpandedManualId(isExpanded ? null : conflict.id)}
                              className="text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1 cursor-pointer shrink-0 ml-2"
                            >
                              <span>{isExpanded ? 'Hide Manual Steps' : 'Manual Steps'}</span>
                              {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                            </button>
                          )}
                        </div>

                        {/* Collapsible Manual Instructions */}
                        {isExpanded && conflict.suggestedIntervention.manualInstructions && (
                          <div className="p-3 rounded-xl bg-slate-900 text-slate-200 text-xs space-y-1.5 animate-fade-in font-mono">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-300">
                              Manual Resolution Checklist:
                            </p>
                            <ol className="list-decimal list-inside space-y-1 text-[11px] text-slate-300">
                              {conflict.suggestedIntervention.manualInstructions.map((step, idx) => (
                                <li key={idx}>{step}</li>
                              ))}
                            </ol>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Recommended Action Plan */}
              {analysisResult.recommendedActionPlan && analysisResult.recommendedActionPlan.length > 0 && (
                <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                  <h5 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    SRE Recommended Action Plan
                  </h5>
                  <ul className="space-y-1 text-xs text-slate-700">
                    {analysisResult.recommendedActionPlan.map((step, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <ArrowRight className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5" />
                        <span>{step}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <div className="py-8 text-center space-y-2 text-slate-400">
              <Sparkles className="w-6 h-6 mx-auto opacity-50 text-indigo-600" />
              <p className="text-xs">Click "Run Gemini Audit" above to analyze recent sync logs from Firestore.</p>
            </div>
          )}
        </div>
      )}

      {/* Safari iOS Extension Modal */}
      <SafariExtensionModal
        isOpen={isSafariModalOpen}
        onClose={() => setIsSafariModalOpen(false)}
        currentStatus={syncs}
        conflictsCount={detectedConflictsCount}
      />
    </div>
  );
};
