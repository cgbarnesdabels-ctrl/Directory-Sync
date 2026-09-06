/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI } from '@google/genai';

export interface SyncLogInput {
  id?: string;
  service: string;
  status: 'active' | 'error' | 'pending';
  timestamp: string;
  errorCode?: string | number;
  errorMessage?: string;
  conflictType?: string;
  userEmail?: string;
}

export interface SuggestedIntervention {
  type: 'automated' | 'manual';
  actionId: string;
  actionLabel: string;
  description: string;
  manualInstructions?: string[];
  requiresReauth?: boolean;
}

export interface DetectedConflict {
  id: string;
  service: 'drive' | 'calendar' | 'gmail' | 'chat' | 'keep' | 'meet' | string;
  errorCode: string;
  errorTitle: string;
  severity: 'critical' | 'warning' | 'info';
  rootCause: string;
  workspaceApiDetails: string;
  suggestedIntervention: SuggestedIntervention;
}

export interface SyncConflictAnalysisResult {
  source: 'gemini-3.8-flash' | 'rule-engine-fallback';
  summary: string;
  healthScore: number;
  detectedConflicts: DetectedConflict[];
  recommendedActionPlan: string[];
  analyzedAt: string;
}

// Lazy initialization of Gemini client
let aiClient: GoogleGenAI | null = null;

function getAiClient(): GoogleGenAI | null {
  if (!process.env.GEMINI_API_KEY) {
    return null;
  }
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

/**
 * Deterministic fallback analyzer when Gemini API key is unset or times out.
 */
export function analyzeWithRuleEngine(
  logs: SyncLogInput[],
  currentStatus: Record<string, { status: string; lastSyncAt?: string }>
): SyncConflictAnalysisResult {
  const conflicts: DetectedConflict[] = [];
  const services = ['drive', 'calendar', 'gmail', 'keep', 'meet'];

  // Check current errors
  services.forEach((srv) => {
    const srvStatus = currentStatus[srv]?.status;
    const matchingErrorLog = logs.find(
      (l) => l.service === srv && l.status === 'error'
    );

    if (srvStatus === 'error' || matchingErrorLog) {
      const errCode = String(matchingErrorLog?.errorCode || '409');
      const errMsg =
        matchingErrorLog?.errorMessage ||
        'Resource state divergence detected during Google Workspace sync.';

      if (errCode === '401' || errCode === 'authError') {
        conflicts.push({
          id: `conflict-${srv}-401`,
          service: srv,
          errorCode: '401',
          errorTitle: 'OAuth Token Expired / Invalid Credentials',
          severity: 'critical',
          rootCause: `The OAuth bearer token for ${srv.toUpperCase()} has expired or was revoked during user credential rotation.`,
          workspaceApiDetails: `Google Workspace API error: 401 Unauthorized [invalidCredentials]. API endpoint rejected request.`,
          suggestedIntervention: {
            type: 'automated',
            actionId: 'refresh_token',
            actionLabel: 'Refresh OAuth Token & Re-verify',
            description:
              'Trigger silent token refresh with Google Identity Services and re-bind session token.',
            manualInstructions: [
              'Navigate to Credentials & Audit Trail tab.',
              'Click "Link Google Account" to grant renewed permissions.',
              'Ensure third-party cookies are enabled in Safari Settings.',
            ],
            requiresReauth: true,
          },
        });
      } else if (errCode === '403' || errCode === 'rateLimitExceeded' || errCode === 'quotaExceeded') {
        conflicts.push({
          id: `conflict-${srv}-403`,
          service: srv,
          errorCode: '403',
          errorTitle: 'Workspace Rate Limit / Quota Exceeded',
          severity: 'warning',
          rootCause: `Exceeded per-minute request quota or storage allowance on ${srv.toUpperCase()}.`,
          workspaceApiDetails: `Google Workspace API error: 403 Forbidden [userRateLimitExceeded]. Max requests per second breached.`,
          suggestedIntervention: {
            type: 'automated',
            actionId: 'retry_backoff',
            actionLabel: 'Apply Exponential Backoff & Reset Jitter',
            description:
              'Delay next sync attempt by 45 seconds using Fibonacci backoff and flush queued records.',
            manualInstructions: [
              'Check Google Workspace Admin Console quota limits for your tenant.',
              'Temporarily lower sync frequency if high-volume bulk exports are running.',
            ],
          },
        });
      } else if (errCode === '404' || errCode === 'fileNotFound') {
        conflicts.push({
          id: `conflict-${srv}-404`,
          service: srv,
          errorCode: '404',
          errorTitle: 'Target Workspace Container Not Found',
          severity: 'warning',
          rootCause: `The remote folder, Keep note, or Gmail thread identifier was deleted or moved.`,
          workspaceApiDetails: `Google Workspace API error: 404 Not Found [resourceNotFound].`,
          suggestedIntervention: {
            type: 'automated',
            actionId: 'recreate_container',
            actionLabel: 'Recreate Missing Container & Resync',
            description:
              'Provision a fresh "Dabels Tech Passkey Audit" target file/folder in Google Drive/Keep.',
            manualInstructions: [
              'Check your Google Drive Trash / Bin for the original audit log file.',
              'Or permit the applet to create a new default container.',
            ],
          },
        });
      } else if (errCode === '412' || errCode === 'etagMismatch') {
        conflicts.push({
          id: `conflict-${srv}-412`,
          service: srv,
          errorCode: '412',
          errorTitle: 'ETag Precondition Mismatch',
          severity: 'warning',
          rootCause: `Remote Workspace document has an updated revision ETag that does not match local snapshot.`,
          workspaceApiDetails: `Google Workspace API error: 412 Precondition Failed [etagMismatch].`,
          suggestedIntervention: {
            type: 'automated',
            actionId: 'fetch_etag_fastforward',
            actionLabel: 'Fast-Forward Remote ETag',
            description:
              'Fetch latest remote metadata checksum and fast-forward the sync cursor.',
            manualInstructions: [
              'Reload the sync cursor from Firestore.',
              'Discard local uncommitted draft if remote is authoritative.',
            ],
          },
        });
      } else {
        // Standard 409 Conflict
        conflicts.push({
          id: `conflict-${srv}-409`,
          service: srv,
          errorCode: '409',
          errorTitle: 'Simultaneous Edit Conflict / Version Divergence',
          severity: 'critical',
          rootCause: `Concurrent writes to ${srv.toUpperCase()} caused state desynchronization between Firestore and Google Workspace.`,
          workspaceApiDetails: `Google Workspace API error: 409 Conflict [stateConflict]. Simultaneous modification detected.`,
          suggestedIntervention: {
            type: 'automated',
            actionId: 'resolve_409_rebase',
            actionLabel: 'Execute 3-Way Rebase & Force Resync',
            description:
              'Merge remote authoritative changes with local passkey audit logs and release mutex lock.',
            manualInstructions: [
              'Inspect recent audit trail entries for concurrent session logins.',
              'Click "Execute 3-Way Rebase" to synchronize states cleanly.',
            ],
          },
        });
      }
    }
  });

  // If no active errors, check if any recent logs have errors
  if (conflicts.length === 0) {
    const errorLogs = logs.filter((l) => l.status === 'error');
    if (errorLogs.length > 0) {
      const top = errorLogs[0];
      conflicts.push({
        id: `conflict-${top.service}-historical`,
        service: top.service,
        errorCode: String(top.errorCode || '409'),
        errorTitle: `Recent ${top.service.toUpperCase()} Sync Interruption`,
        severity: 'info',
        rootCause: `A recent sync failure was logged at ${top.timestamp}. Current status is recovered but historical anomalies were detected.`,
        workspaceApiDetails: `Log entry: ${top.errorMessage || 'Unknown error'}.`,
        suggestedIntervention: {
          type: 'automated',
          actionId: 'force_resync',
          actionLabel: 'Verify Health & Run Test Sync',
          description:
            'Trigger an active bidirectional ping to ensure Workspace APIs are responding normally.',
        },
      });
    }
  }

  const errorCount = conflicts.filter((c) => c.severity === 'critical').length;
  const warnCount = conflicts.filter((c) => c.severity === 'warning').length;
  const healthScore = Math.max(20, 100 - errorCount * 30 - warnCount * 15);

  return {
    source: 'rule-engine-fallback',
    summary:
      conflicts.length > 0
        ? `Detected ${conflicts.length} sync conflict(s) across Google Workspace services. Primary root causes include API rate limits and version divergence.`
        : 'All Google Workspace integration sync channels are healthy with zero active conflicts detected.',
    healthScore,
    detectedConflicts: conflicts,
    recommendedActionPlan:
      conflicts.length > 0
        ? [
            '1. Execute automated 3-way rebase for divergent Workspace files.',
            '2. Check OAuth scopes and refresh authentication tokens if 401 occurs.',
            '3. Use iOS Safari Extension to monitor background sync health in real time.',
          ]
        : [
            '1. Workspace sync is optimal. No manual interventions required.',
            '2. iOS Safari Web Extension is ready to monitor background operations.',
          ],
    analyzedAt: new Date().toISOString(),
  };
}

/**
 * Analyzes sync logs and current status using Gemini API (gemini-3.8-flash).
 */
export async function analyzeSyncConflictsWithGemini(
  logs: SyncLogInput[],
  currentStatus: Record<string, { status: string; lastSyncAt?: string }>
): Promise<SyncConflictAnalysisResult> {
  const ai = getAiClient();
  if (!ai) {
    return analyzeWithRuleEngine(logs, currentStatus);
  }

  const prompt = `You are an expert Google Workspace API Reliability and Site Reliability Engineer (SRE).
Analyze the following sync operations, error logs, and current service statuses for Google Drive, Calendar, Gmail, Keep, and Google Meet integrations in this WebAuthn Passkey Gateway application.

Current Service Statuses:
${JSON.stringify(currentStatus, null, 2)}

Recent Sync Logs (last 30 entries):
${JSON.stringify(logs.slice(0, 15), null, 2)}

Your task:
1. Identify any active or potential sync conflicts and failures across Google Workspace APIs.
2. Specifically evaluate and map common Google Workspace API HTTP error codes:
   - 401 Unauthorized (invalidCredentials, token expired)
   - 403 Forbidden / Rate Limit / Quota Exceeded (userRateLimitExceeded, quotaExceeded)
   - 404 Not Found (fileNotFound, noteNotFound)
   - 409 Conflict (versionMismatch, concurrent modification, stateConflict)
   - 412 Precondition Failed (etagMismatch)
   - 429 Too Many Requests (RESOURCE_EXHAUSTED)
   - 503 Service Unavailable (backendError)
3. Formulate clear root cause explanations, Workspace API technical details, and precise automated or manual intervention recommendations.
4. Calculate an overall integration healthScore (0 to 100).
5. If all services are active and healthy, produce an analysis confirming optimal health and suggest preventative best practices.

Return ONLY a JSON object conforming to this exact structure:
{
  "summary": "Concise 1-2 sentence executive overview of sync health and conflicts",
  "healthScore": 85,
  "detectedConflicts": [
    {
      "id": "conflict-drive-1",
      "service": "drive",
      "errorCode": "409",
      "errorTitle": "Resource Version Conflict / Divergent Revision",
      "severity": "critical",
      "rootCause": "Clear explanation of why this happened",
      "workspaceApiDetails": "Specific Google Workspace API endpoint/header failure details",
      "suggestedIntervention": {
        "type": "automated",
        "actionId": "resolve_409_rebase",
        "actionLabel": "Execute 3-Way Rebase & Force Resync",
        "description": "What this automated action will do",
        "manualInstructions": [
          "Step 1...",
          "Step 2..."
        ],
        "requiresReauth": false
      }
    }
  ],
  "recommendedActionPlan": [
    "Step 1...",
    "Step 2..."
  ]
}`;

  try {
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Gemini API call timed out after 6000ms')), 6000)
    );

    const generatePromise = ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const response = await Promise.race([generatePromise, timeoutPromise]);

    const responseText = response.text || '{}';
    const parsed = JSON.parse(responseText);

    return {
      source: 'gemini-3.8-flash',
      summary: parsed.summary || 'Gemini sync conflict analysis complete.',
      healthScore:
        typeof parsed.healthScore === 'number'
          ? Math.min(100, Math.max(0, parsed.healthScore))
          : 90,
      detectedConflicts: Array.isArray(parsed.detectedConflicts)
        ? parsed.detectedConflicts
        : [],
      recommendedActionPlan: Array.isArray(parsed.recommendedActionPlan)
        ? parsed.recommendedActionPlan
        : ['Continue regular monitoring.'],
      analyzedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.warn('Gemini Sync Conflict Analysis Fallback:', error);
    // Graceful fallback to deterministic rule engine
    return analyzeWithRuleEngine(logs, currentStatus);
  }
}
