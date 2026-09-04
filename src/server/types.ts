/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface StoredPasskey {
  credentialId: string; // Base64URL string
  publicKey: string; // Base64URL encoded public key
  counter: number;
  transports?: string[];
  deviceType?: string;
  backedUp?: boolean;
  createdAt: string;
  nickname?: string;
}

export interface UserAccount {
  id: string;
  email: string;
  displayName: string;
  passkeys: StoredPasskey[];
  passwordHash?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PasswordResetToken {
  token: string;
  email: string;
  scope: string; // e.g., 'auth:reset-password' | 'auth:passkey-recovery'
  redirectUri?: string;
  expiresAt: number; // Unix timestamp in ms
  used: boolean;
  createdAt: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  type: 
    | 'registration_options_generated'
    | 'passkey_registered'
    | 'assertion_options_generated'
    | 'assertion_verified'
    | 'assertion_failed'
    | 'password_reset_requested'
    | 'password_reset_redirected'
    | 'password_reset_confirmed'
    | 'passkey_deleted';
  email: string;
  details: string;
  ip?: string;
  userAgent?: string;
}
