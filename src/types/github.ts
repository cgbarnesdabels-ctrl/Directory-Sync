/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface GitHubWorkflowStep {
  name: string;
  status: 'queued' | 'in_progress' | 'completed' | 'failed';
  conclusion?: 'success' | 'failure' | 'skipped';
  startedAt?: string;
  completedAt?: string;
  durationSeconds?: number;
  log?: string[];
}

export interface GitHubWorkflowRun {
  id: string;
  workflowName: string;
  workflowFile: string;
  status: 'queued' | 'in_progress' | 'completed' | 'failed';
  conclusion?: 'success' | 'failure';
  branch: string;
  commitSha: string;
  commitMessage: string;
  author: string;
  event: 'push' | 'pull_request' | 'workflow_dispatch';
  createdAt: string;
  completedAt?: string;
  durationSeconds: number;
  steps: GitHubWorkflowStep[];
  pullRequestNumber?: number;
}

export interface GitHubPullRequest {
  number: number;
  title: string;
  branch: string;
  baseBranch: string;
  author: string;
  avatarUrl: string;
  status: 'open' | 'closed' | 'merged';
  createdAt: string;
  updatedAt: string;
  additions: number;
  deletions: number;
  changedFiles: number;
  checksStatus: 'success' | 'pending' | 'failed';
  passedChecksCount: number;
  totalChecksCount: number;
  reviews: {
    user: string;
    status: 'APPROVED' | 'CHANGES_REQUESTED' | 'COMMENTED';
  }[];
  description: string;
}

export interface GitHubOverview {
  repoName: string;
  owner: string;
  defaultBranch: string;
  latestCommit: {
    sha: string;
    message: string;
    author: string;
    date: string;
  };
  totalRuns: number;
  passingRate: number;
  openPRsCount: number;
  activeWorkflowsCount: number;
}

export interface GitHubOAuthConfig {
  isConfigured: boolean;
  clientId?: string;
  devCallbackUrl: string;
  sharedCallbackUrl: string;
  devHomepageUrl: string;
  sharedHomepageUrl: string;
  activeCallbackUrl: string;
  activeHomepageUrl: string;
  scopes: string[];
}

export interface GitHubUserProfile {
  login: string;
  name: string;
  email: string;
  avatarUrl: string;
  htmlUrl: string;
  publicRepos: number;
  followers: number;
  connectedAt: string;
  scope: string;
}

export interface CodeRabbitPermissions {
  contents: 'read' | 'write';
  pullRequests: 'read' | 'write';
  issues: 'read' | 'write';
  checks: 'read' | 'write';
  statuses: 'read' | 'write';
  idToken: 'read' | 'write';
  actions: 'read' | 'write';
}

export interface CodeRabbitDeviceBinding {
  isBound: boolean;
  deviceId: string;
  deviceName: string;
  platform: 'apple_secure_enclave' | 'fido2_platform' | 'workstation_token';
  attestationLevel: 'FIDO2 L2 Resident Key' | 'Hardware Root of Trust (Apple T2/A17)' | 'Software Attested';
  publicKeyFingerprint: string;
  boundAt: string;
  boundByEmail: string;
  biometricType: 'Touch ID' | 'Face ID' | 'FIDO2 Security Key' | 'Device Key';
}

export interface CodeRabbitAuditEntry {
  id: string;
  timestamp: string;
  action: 'BIND_DEVICE' | 'GRANT_ALL_ACCESS' | 'AUTORUN_JOB' | 'PUSH_COMMIT' | 'APPROVE_PR' | 'REVOKE_ACCESS';
  status: 'success' | 'failed' | 'pending';
  deviceFingerprint: string;
  performedBy: string;
  targetRef?: string;
  details: string;
  commitSha?: string;
  prNumber?: number;
}

export interface CodeRabbitConfig {
  deviceBinding: CodeRabbitDeviceBinding;
  allAccessGranted: boolean;
  autoRunEnabled: boolean;
  autoRunOnPr: boolean;
  autoRunOnPush: boolean;
  canPushCommit: boolean;
  canApproveRequest: boolean;
  permissions: CodeRabbitPermissions;
  botIdentity: {
    username: string;
    email: string;
    avatarUrl: string;
    verifiedSignature: boolean;
  };
  recentAuditLogs: CodeRabbitAuditEntry[];
  lastAutorunSummary?: {
    runId: string;
    timestamp: string;
    status: 'success' | 'in_progress' | 'failed';
    summary: string;
    commitPushed?: string;
    prApproved?: number;
  };
}

export interface GitHubWebhookLog {
  id: string;
  timestamp: string;
  event: string;
  action?: string;
  payload: any;
  statusCode: number;
  status: 'success' | 'failure';
}

