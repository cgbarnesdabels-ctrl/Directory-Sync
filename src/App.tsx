/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  KeyRound, 
  Fingerprint, 
  RotateCcw, 
  ShieldCheck, 
  Smartphone, 
  Terminal, 
  History, 
  ArrowRight,
  Sparkles,
  Lock,
  GitBranch
} from 'lucide-react';
import { Header } from './components/Header';
import { PasskeyAuth } from './components/PasskeyAuth';
import { PasswordResetFlow } from './components/PasswordResetFlow';
import { CredentialsAudit } from './components/CredentialsAudit';
import { IosIntegrationGuide } from './components/IosIntegrationGuide';
import { ApiExplorer } from './components/ApiExplorer';
import { GitHubCiPrDashboard } from './components/GitHubCiPrDashboard';
import { BiometricScreenOverlay } from './components/BiometricScreenOverlay';
import { FloatingAuthCiWidget } from './components/FloatingAuthCiWidget';
import { AuthOverlayProvider } from './context/AuthOverlayContext';
import type { UserSession, RegisteredPasskey } from './types/auth';

export default function App() {
  const [activeTab, setActiveTab] = useState<
    'passkeys' | 'reset-flow' | 'credentials' | 'github-ci' | 'ios-guide' | 'api-explorer'
  >('passkeys');

  // URL Query Parameters for Scope Redirect Handling
  const [initialResetToken, setInitialResetToken] = useState('');
  const [initialResetScope, setInitialResetScope] = useState('');
  const [initialResetEmail, setInitialResetEmail] = useState('dabelstech@moredesa.com');
  const [initialResetStatus, setInitialResetStatus] = useState('');

  // Host & RP ID State
  const detectedHost = window.location.hostname || 'localhost';
  const [currentRpId, setCurrentRpId] = useState<string>(detectedHost);
  const [hasPlatformAuthenticator, setHasPlatformAuthenticator] = useState<boolean | null>(null);

  // Authenticated user session
  const [currentUser, setCurrentUser] = useState<UserSession | null>(null);

  // Parse URL parameters on initial load (e.g. from password reset scope redirect)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const view = params.get('view');
    const token = params.get('token');
    const scope = params.get('scope');
    const email = params.get('email');
    const status = params.get('status');

    if (view === 'reset-password' || token) {
      setActiveTab('reset-flow');
      if (token) setInitialResetToken(token);
      if (scope) setInitialResetScope(scope);
      if (email) setInitialResetEmail(email);
      if (status) setInitialResetStatus(status);
    }

    // Check device WebAuthn / Platform Authenticator capabilities
    if (window.PublicKeyCredential && PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable) {
      PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
        .then((available) => setHasPlatformAuthenticator(available))
        .catch(() => setHasPlatformAuthenticator(false));
    } else {
      setHasPlatformAuthenticator(false);
    }
  }, []);

  const handleAuthSuccess = (session: UserSession) => {
    setCurrentUser(session);
  };

  const handleLogout = () => {
    setCurrentUser(null);
  };

  const handleNavigateToReset = (emailTarget: string) => {
    setInitialResetEmail(emailTarget);
    setActiveTab('reset-flow');
  };

  return (
    <AuthOverlayProvider>
      <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900 selection:bg-indigo-100 selection:text-indigo-900">
        {/* Top Application Header */}
        <Header
          currentRpId={currentRpId}
          onRpIdChange={setCurrentRpId}
          detectedHost={detectedHost}
          hasPlatformAuthenticator={hasPlatformAuthenticator}
          currentUser={currentUser}
          onLogout={handleLogout}
        />

        {/* Main Container */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
          {/* Navigation Tabs */}
          <div className="flex items-center justify-between border-b border-slate-200 overflow-x-auto pb-px">
            <nav className="flex space-x-2 sm:space-x-4" aria-label="Tabs">
              <button
                id="tab-passkeys"
                type="button"
                onClick={() => setActiveTab('passkeys')}
                className={`py-3 px-3 sm:px-4 text-xs sm:text-sm font-semibold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                  activeTab === 'passkeys'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                }`}
              >
                <Fingerprint className="w-4 h-4" />
                <span>Passkey Authentication</span>
              </button>

              <button
                id="tab-reset-flow"
                type="button"
                onClick={() => setActiveTab('reset-flow')}
                className={`py-3 px-3 sm:px-4 text-xs sm:text-sm font-semibold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                  activeTab === 'reset-flow'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                }`}
              >
                <RotateCcw className="w-4 h-4" />
                <span>Password Reset &amp; Scope Redirect</span>
                {initialResetToken && (
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                )}
              </button>

              <button
                id="tab-credentials"
                type="button"
                onClick={() => setActiveTab('credentials')}
                className={`py-3 px-3 sm:px-4 text-xs sm:text-sm font-semibold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                  activeTab === 'credentials'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                }`}
              >
                <History className="w-4 h-4" />
                <span>Credentials &amp; Audit Trail</span>
              </button>

              <button
                id="tab-github-ci"
                type="button"
                onClick={() => setActiveTab('github-ci')}
                className={`py-3 px-3 sm:px-4 text-xs sm:text-sm font-semibold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                  activeTab === 'github-ci'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                }`}
              >
                <GitBranch className="w-4 h-4" />
                <span>GitHub CI/CD &amp; PR Gate</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
              </button>

              <button
                id="tab-ios-guide"
                type="button"
                onClick={() => setActiveTab('ios-guide')}
                className={`py-3 px-3 sm:px-4 text-xs sm:text-sm font-semibold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                  activeTab === 'ios-guide'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                }`}
              >
                <Smartphone className="w-4 h-4" />
                <span>iOS Swift Integration</span>
              </button>

              <button
                id="tab-api-explorer"
                type="button"
                onClick={() => setActiveTab('api-explorer')}
                className={`py-3 px-3 sm:px-4 text-xs sm:text-sm font-semibold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                  activeTab === 'api-explorer'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                }`}
              >
                <Terminal className="w-4 h-4" />
                <span>Live API Playground</span>
              </button>
            </nav>
          </div>

          {/* Tab Views */}
          {activeTab === 'passkeys' && (
            <PasskeyAuth
              currentRpId={currentRpId}
              detectedHost={detectedHost}
              onAuthSuccess={handleAuthSuccess}
              onPasskeyRegistered={() => {}}
              onNavigateToReset={handleNavigateToReset}
              defaultEmail={currentUser?.email || 'dabelstech@moredesa.com'}
            />
          )}

          {activeTab === 'reset-flow' && (
            <PasswordResetFlow
              initialEmail={initialResetEmail}
              initialToken={initialResetToken}
              initialScope={initialResetScope}
              initialStatus={initialResetStatus}
              onResetComplete={() => {}}
            />
          )}

          {activeTab === 'credentials' && (
            <CredentialsAudit email={currentUser?.email || 'dabelstech@moredesa.com'} />
          )}

          {activeTab === 'github-ci' && <GitHubCiPrDashboard />}

          {activeTab === 'ios-guide' && <IosIntegrationGuide />}

          {activeTab === 'api-explorer' && <ApiExplorer />}
        </main>

        {/* Global Biometric Screen Overlay (Pop & PiP) */}
        <BiometricScreenOverlay />

        {/* Floating Quick Auth & CI Widget */}
        <FloatingAuthCiWidget onNavigateToCiTab={() => setActiveTab('github-ci')} />

        {/* Footer */}
        <footer className="border-t border-slate-200 bg-white py-6 mt-12 text-center text-xs text-slate-500">
          <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
            <div>
              &copy; {new Date().getFullYear()} Dabels Tech &bull; Passkey Security &amp; Scoped Redirect Gateway
            </div>
            <div className="flex items-center gap-4 text-slate-400">
              <span>FIDO2 / WebAuthn Level 3</span>
              <span>&bull;</span>
              <span>Resident Key Required</span>
              <span>&bull;</span>
              <span>ASWebAuthenticationSession Ready</span>
            </div>
          </div>
        </footer>
      </div>
    </AuthOverlayProvider>
  );
}
