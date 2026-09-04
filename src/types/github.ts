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

