/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { startAuthentication } from '@simplewebauthn/browser';
import type { 
  BiometricOverlayState, 
  OverlayMode, 
  AuthHandshakeStage, 
  UserSession 
} from '../types/auth';

interface AuthOverlayContextType {
  overlayState: BiometricOverlayState;
  triggerSignIn: (email: string, rpId?: string, forcedMode?: OverlayMode) => Promise<UserSession | null>;
  switchMode: (mode: OverlayMode) => void;
  closeOverlay: () => void;
  retryAuth: () => void;
  setPreferMode: (mode: OverlayMode) => void;
  simulateHardwareAuth: () => Promise<void>;
}

const defaultState: BiometricOverlayState = {
  isOpen: false,
  mode: 'pop',
  stage: 'idle',
  email: 'dabelstech@moredesa.com',
  rpId: typeof window !== 'undefined' ? window.location.hostname || 'localhost' : 'localhost',
  elapsedSeconds: 0,
  preferMode: 'pop',
};

const AuthOverlayContext = createContext<AuthOverlayContextType | undefined>(undefined);

export const AuthOverlayProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [overlayState, setOverlayState] = useState<BiometricOverlayState>(defaultState);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Timer counter for elapsed biometric scan duration
  useEffect(() => {
    if (overlayState.isOpen && (overlayState.stage === 'requesting-challenge' || overlayState.stage === 'biometric-scanning' || overlayState.stage === 'verifying-signature')) {
      timerRef.current = setInterval(() => {
        setOverlayState(prev => ({
          ...prev,
          elapsedSeconds: prev.elapsedSeconds + 1,
        }));
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [overlayState.isOpen, overlayState.stage]);

  const switchMode = useCallback((mode: OverlayMode) => {
    setOverlayState(prev => ({
      ...prev,
      mode,
      preferMode: mode,
    }));
  }, []);

  const setPreferMode = useCallback((preferMode: OverlayMode) => {
    setOverlayState(prev => ({
      ...prev,
      preferMode,
    }));
  }, []);

  const closeOverlay = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setOverlayState(prev => ({
      ...prev,
      isOpen: false,
      stage: 'idle',
      errorMessage: undefined,
      elapsedSeconds: 0,
    }));
  }, []);

  /**
   * Primary WebAuthn Passkey Handshake Execution
   */
  const executeAuth = async (targetEmail: string, targetRpId: string): Promise<UserSession | null> => {
    abortControllerRef.current = new AbortController();

    try {
      // Step 1: Request Challenge
      setOverlayState(prev => ({
        ...prev,
        stage: 'requesting-challenge',
        errorMessage: undefined,
        challengePreview: undefined,
      }));

      const optRes = await fetch(
        `/api/auth/assertion-options?email=${encodeURIComponent(targetEmail)}&rpID=${encodeURIComponent(targetRpId)}`,
        {
          headers: {
            'x-webauthn-rpid': targetRpId,
          },
          signal: abortControllerRef.current.signal,
        }
      );

      if (!optRes.ok) {
        const errJson = await optRes.json();
        throw new Error(errJson.error || 'Failed to obtain FIDO2 assertion options');
      }

      const options = await optRes.json();
      const challengeStr = options.challenge ? `${options.challenge.substring(0, 16)}...` : undefined;

      // Step 2: Prompt Biometric Platform Authenticator (Face ID / Touch ID / Hello)
      setOverlayState(prev => ({
        ...prev,
        stage: 'biometric-scanning',
        challengePreview: challengeStr,
      }));

      let asseResp;
      try {
        asseResp = await startAuthentication({ optionsJSON: options });
      } catch (browserErr: any) {
        if (browserErr.name === 'NotAllowedError') {
          throw new Error('Biometric assertion canceled by user or timed out.');
        }
        if (browserErr.name === 'SecurityError') {
          throw new Error(
            `WebAuthn domain mismatch: Host (${window.location.hostname}) != RP ID (${targetRpId}). Switch RP ID to match the host domain.`
          );
        }
        throw browserErr;
      }

      // Step 3: Verify Assertion on Server
      setOverlayState(prev => ({
        ...prev,
        stage: 'verifying-signature',
      }));

      const verifyRes = await fetch('/api/auth/verify-assertion', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-webauthn-rpid': targetRpId,
        },
        body: JSON.stringify({
          email: targetEmail,
          credentialPayload: asseResp,
        }),
        signal: abortControllerRef.current.signal,
      });

      const verifyData = await verifyRes.json();
      if (!verifyRes.ok) {
        throw new Error(verifyData.error || 'Assertion signature verification failed');
      }

      const session: UserSession = {
        email: targetEmail,
        displayName: verifyData.user?.displayName || targetEmail.split('@')[0],
        authenticatedVia: 'passkey',
        authenticatedAt: new Date().toLocaleTimeString(),
      };

      setOverlayState(prev => ({
        ...prev,
        stage: 'success',
        verifiedUser: session,
      }));

      // Auto-close overlay after 2 seconds on success
      setTimeout(() => {
        setOverlayState(prev => (prev.stage === 'success' ? { ...prev, isOpen: false } : prev));
      }, 2500);

      return session;
    } catch (err: any) {
      if (err.name === 'AbortError') return null;

      setOverlayState(prev => ({
        ...prev,
        stage: 'error',
        errorMessage: err.message || 'Biometric authentication failed',
      }));
      return null;
    }
  };

  /**
   * Simulated Hardware Enclave Scan
   * Useful when testing in browsers/iframes without hardware platform authenticators or registered passkeys
   */
  const simulateHardwareAuth = async () => {
    try {
      setOverlayState(prev => ({
        ...prev,
        stage: 'requesting-challenge',
        errorMessage: undefined,
        challengePreview: 'd8a7c29e10fa4b93...',
        elapsedSeconds: 0,
      }));

      await new Promise(r => setTimeout(r, 600));

      setOverlayState(prev => ({
        ...prev,
        stage: 'biometric-scanning',
      }));

      await new Promise(r => setTimeout(r, 1200));

      setOverlayState(prev => ({
        ...prev,
        stage: 'verifying-signature',
      }));

      await new Promise(r => setTimeout(r, 800));

      const session: UserSession = {
        email: overlayState.email,
        displayName: overlayState.email.split('@')[0],
        authenticatedVia: 'passkey',
        authenticatedAt: new Date().toLocaleTimeString(),
      };

      setOverlayState(prev => ({
        ...prev,
        stage: 'success',
        verifiedUser: session,
      }));

      setTimeout(() => {
        setOverlayState(prev => (prev.stage === 'success' ? { ...prev, isOpen: false } : prev));
      }, 2500);
    } catch (err: any) {
      setOverlayState(prev => ({
        ...prev,
        stage: 'error',
        errorMessage: err.message || 'Simulation encountered an error',
      }));
    }
  };

  const triggerSignIn = async (
    email: string,
    rpId?: string,
    forcedMode?: OverlayMode
  ): Promise<UserSession | null> => {
    const activeEmail = email || overlayState.email || 'dabelstech@moredesa.com';
    const activeRpId = rpId || overlayState.rpId || window.location.hostname || 'localhost';
    const activeMode = forcedMode || overlayState.preferMode;

    setOverlayState({
      isOpen: true,
      mode: activeMode,
      preferMode: overlayState.preferMode,
      stage: 'requesting-challenge',
      email: activeEmail,
      rpId: activeRpId,
      elapsedSeconds: 0,
      errorMessage: undefined,
      verifiedUser: null,
      startedAt: Date.now(),
    });

    return await executeAuth(activeEmail, activeRpId);
  };

  const retryAuth = () => {
    if (overlayState.email) {
      executeAuth(overlayState.email, overlayState.rpId);
    }
  };

  return (
    <AuthOverlayContext.Provider
      value={{
        overlayState,
        triggerSignIn,
        switchMode,
        closeOverlay,
        retryAuth,
        setPreferMode,
        simulateHardwareAuth,
      }}
    >
      {children}
    </AuthOverlayContext.Provider>
  );
};

export const useAuthOverlay = () => {
  const context = useContext(AuthOverlayContext);
  if (!context) {
    throw new Error('useAuthOverlay must be used within an AuthOverlayProvider');
  }
  return context;
};
