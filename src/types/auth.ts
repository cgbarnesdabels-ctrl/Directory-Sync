/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface RegisteredPasskey {
  credentialId: string;
  publicKey: string;
  counter: number;
  transports?: string[];
  deviceType?: string;
  backedUp?: boolean;
  createdAt: string;
  nickname?: string;
}

export interface UserSession {
  email: string;
  displayName: string;
  authenticatedVia: 'passkey' | 'password' | 'reset-token';
  sessionToken?: string;
  authenticatedAt: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  type: string;
  email: string;
  details: string;
  ip?: string;
  userAgent?: string;
}

export interface PasswordResetResponse {
  success: boolean;
  message: string;
  token: string;
  scope: string;
  resetLink: string;
  redirectUri?: string;
  expiresAt: number;
  email: string;
}

export type OverlayMode = 'pop' | 'pip';

export type AuthHandshakeStage = 
  | 'idle'
  | 'requesting-challenge'
  | 'biometric-scanning'
  | 'verifying-signature'
  | 'success'
  | 'error';

export interface BiometricOverlayState {
  isOpen: boolean;
  mode: OverlayMode;
  stage: AuthHandshakeStage;
  email: string;
  rpId: string;
  challengePreview?: string;
  errorMessage?: string;
  verifiedUser?: UserSession | null;
  startedAt?: number;
  elapsedSeconds: number;
  preferMode: OverlayMode;
}

