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

// Android Digital Asset Links for FIDO2 & App Links
apiApp.get(['/.well-known/assetlinks.json', '/.well-known/assetlinks'], (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.json([
    {
      relation: [
        'delegate_permission/common.handle_all_urls',
        'delegate_permission/common.get_login_creds',
      ],
      target: {
        namespace: 'android_app',
        package_name: 'com.dabelstech.passkey',
        sha256_cert_fingerprints: [
          '14:6D:E9:7F:0E:52:D7:1E:2E:CB:5B:CD:00:2E:3D:FD:9C:2A:8C:38:CB:00:6B:5E:2B:6F:02:4B:B4:79:33:67',
        ],
      },
    },
  ]);
});

// Apple App Site Association for iOS WebCredentials (Passkeys) & Universal Links
apiApp.get(['/.well-known/apple-app-site-association', '/apple-app-site-association'], (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.json({
    webcredentials: {
      apps: ['TEAMID12345.com.dabelstech.passkey'],
    },
    applinks: {
      apps: [],
      details: [
        {
          appID: 'TEAMID12345.com.dabelstech.passkey',
          paths: ['/auth/*', '/reset-password/*', '/passkeys/*'],
        },
      ],
    },
  });
});

export default apiApp;
