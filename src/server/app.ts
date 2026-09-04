/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import authRouter from './auth-router';
import githubRouter from './github-router';
import { driveRouter } from './drive-router';
import { workspaceRouter } from './workspace-router';

export const apiApp = express();

apiApp.use(express.json());
apiApp.use(express.urlencoded({ extended: true }));

// Mount auth router under /api/auth
apiApp.use('/api/auth', authRouter);

// Mount GitHub CI/CD & PR router under /api/github
apiApp.use('/api/github', githubRouter);

// Mount Google Drive router under /api/drive
apiApp.use('/api/drive', driveRouter);

// Mount Google Workspace router under /api/workspace
apiApp.use('/api/workspace', workspaceRouter);

// GitHub OAuth Redirect & Callback Aliases (supports /api/auth/github/* and /auth/github/*)
apiApp.get(['/api/auth/github/callback', '/api/auth/github/callback/', '/auth/github/callback', '/auth/github/callback/'], (req, res, next) => {
  req.url = '/callback';
  githubRouter(req, res, next);
});

apiApp.get(['/api/auth/github/url', '/auth/github/url'], (req, res, next) => {
  req.url = '/auth-url';
  githubRouter(req, res, next);
});

// Health check
apiApp.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'Dabels Tech Passkey Gateway' });
});

export default apiApp;
