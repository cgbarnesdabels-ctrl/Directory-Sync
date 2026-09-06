/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Shield, KeyRound, Smartphone, CheckCircle2, AlertCircle, LogOut, UserCheck } from 'lucide-react';
import type { UserSession } from '../types/auth';
import { PWAInstallButton } from './PWAInstallButton';

interface HeaderProps {
  currentRpId: string;
  onRpIdChange: (id: string) => void;
  detectedHost: string;
  hasPlatformAuthenticator: boolean | null;
  currentUser: UserSession | null;
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentRpId,
  onRpIdChange,
  detectedHost,
  hasPlatformAuthenticator,
  currentUser,
  onLogout,
}) => {
  return (
    <header className="border-b border-slate-200 bg-white sticky top-0 z-40 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-xs">
              <KeyRound className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 text-lg tracking-tight">Dabels Tech</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                  Passkey & Auth
                </span>
              </div>
              <p className="text-xs text-slate-500 hidden sm:block">
                WebAuthn FIDO2 / Passkeys & Scoped Password Reset Engine
              </p>
            </div>
          </div>

          {/* Configuration & Environment Controls */}
          <div className="flex items-center gap-3">
            {/* Platform Authenticator Status */}
            <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-xs font-medium text-slate-700">
              <Smartphone className="w-3.5 h-3.5 text-slate-500" />
              <span>Biometrics:</span>
              {hasPlatformAuthenticator === null ? (
                <span className="text-slate-400">Detecting...</span>
              ) : hasPlatformAuthenticator ? (
                <span className="flex items-center gap-1 text-emerald-600 font-semibold">
                  <CheckCircle2 className="w-3 h-3" /> Ready
                </span>
              ) : (
                <span className="flex items-center gap-1 text-amber-600">
                  <AlertCircle className="w-3 h-3" /> Security Key only
                </span>
              )}
            </div>

            {/* RP ID Selector */}
            <div className="flex items-center gap-2 text-xs bg-slate-100 p-1 rounded-lg border border-slate-200">
              <span className="text-slate-500 font-medium pl-1.5 hidden sm:inline">RP ID:</span>
              <select
                id="rpid-selector"
                value={currentRpId}
                onChange={(e) => onRpIdChange(e.target.value)}
                className="bg-white border border-slate-300 rounded px-2 py-1 text-xs font-mono font-medium text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                title="Select Relying Party ID for WebAuthn"
              >
                <option value={detectedHost}>Current Host ({detectedHost})</option>
                <option value="dabelstech.com">dabelstech.com (Prod)</option>
              </select>
            </div>

            {/* PWA Mobile Install Action Button */}
            <PWAInstallButton />

            {/* User Session status */}
            {currentUser ? (
              <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
                <div className="text-right hidden sm:block">
                  <div className="text-xs font-semibold text-slate-900 flex items-center gap-1 justify-end">
                    <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                    {currentUser.email}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    via {currentUser.authenticatedVia}
                  </div>
                </div>
                <button
                  id="btn-header-logout"
                  onClick={onLogout}
                  className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                  title="Sign out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
};
