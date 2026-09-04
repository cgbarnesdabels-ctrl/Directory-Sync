/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { 
  verifyRegistrationResponse, 
  verifyAuthenticationResponse,
  type VerifiedRegistrationResponse,
  type VerifiedAuthenticationResponse,
} from '@simplewebauthn/server';
import { isoBase64URL, isoUint8Array } from '@simplewebauthn/server/helpers';
import crypto from 'crypto';
import type { StoredPasskey, UserAccount, PasswordResetToken, AuditLogEntry } from './types';

// In-memory Database with initial demo users
const usersDB = new Map<string, UserAccount>();
const resetTokensDB = new Map<string, PasswordResetToken>();
const auditLogs: AuditLogEntry[] = [];

// Seed default users
function seedInitialData() {
  const seedEmails = ['dabelstech@moredesa.com', 'admin@dabelstech.com'];
  for (const email of seedEmails) {
    if (!usersDB.has(email)) {
      usersDB.set(email, {
        id: `usr_${crypto.randomBytes(8).toString('hex')}`,
        email,
        displayName: email.split('@')[0],
        passkeys: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
  }
}
seedInitialData();

/**
 * Log audit events
 */
export function addAuditLog(
  type: AuditLogEntry['type'],
  email: string,
  details: string,
  meta?: { ip?: string; userAgent?: string }
): AuditLogEntry {
  const entry: AuditLogEntry = {
    id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    timestamp: new Date().toISOString(),
    type,
    email,
    details,
    ip: meta?.ip,
    userAgent: meta?.userAgent,
  };
  auditLogs.unshift(entry);
  if (auditLogs.length > 200) {
    auditLogs.pop();
  }
  return entry;
}

export function getAuditLogs(email?: string): AuditLogEntry[] {
  if (email) {
    return auditLogs.filter(l => l.email.toLowerCase() === email.toLowerCase());
  }
  return auditLogs;
}

/**
 * User management
 */
export async function getUserByEmail(email: string): Promise<UserAccount | undefined> {
  return usersDB.get(email.toLowerCase().trim());
}

export async function getOrCreateUser(email: string): Promise<UserAccount> {
  const normalized = email.toLowerCase().trim();
  let user = usersDB.get(normalized);
  if (!user) {
    user = {
      id: `usr_${crypto.randomBytes(8).toString('hex')}`,
      email: normalized,
      displayName: normalized.split('@')[0],
      passkeys: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    usersDB.set(normalized, user);
  }
  return user;
}

export async function getUserPasskeysFromDB(email: string): Promise<StoredPasskey[]> {
  const user = await getUserByEmail(email);
  return user ? user.passkeys : [];
}

export async function savePasskeyToDB(email: string, passkey: StoredPasskey): Promise<void> {
  const user = await getOrCreateUser(email);
  // Check if credential already exists, update if so
  const existingIdx = user.passkeys.findIndex(p => p.credentialId === passkey.credentialId);
  if (existingIdx >= 0) {
    user.passkeys[existingIdx] = passkey;
  } else {
    user.passkeys.push(passkey);
  }
  user.updatedAt = new Date().toISOString();
}

export async function deletePasskeyFromDB(email: string, credentialId: string): Promise<boolean> {
  const user = await getUserByEmail(email);
  if (!user) return false;
  const initialLen = user.passkeys.length;
  user.passkeys = user.passkeys.filter(p => p.credentialId !== credentialId);
  if (user.passkeys.length < initialLen) {
    addAuditLog('passkey_deleted', email, `Removed passkey with credential ID ${credentialId.substring(0, 16)}...`);
    return true;
  }
  return false;
}

/**
 * Password Reset Token & Scope Management
 */
export async function createPasswordResetToken(
  email: string,
  scope = 'auth:reset-password',
  redirectUri?: string
): Promise<PasswordResetToken> {
  const normalizedEmail = email.toLowerCase().trim();
  await getOrCreateUser(normalizedEmail);

  const token = crypto.randomBytes(32).toString('hex');
  const tokenRecord: PasswordResetToken = {
    token,
    email: normalizedEmail,
    scope: scope || 'auth:reset-password',
    redirectUri: redirectUri?.trim() || undefined,
    expiresAt: Date.now() + 15 * 60 * 1000, // 15 minutes validity
    used: false,
    createdAt: new Date().toISOString(),
  };

  resetTokensDB.set(token, tokenRecord);
  addAuditLog(
    'password_reset_requested',
    normalizedEmail,
    `Password reset link requested. Scope: "${tokenRecord.scope}", Redirect URI: "${tokenRecord.redirectUri || 'default'}"`
  );

  return tokenRecord;
}

export async function verifyPasswordResetToken(
  token: string,
  expectedScope?: string
): Promise<{ valid: boolean; reason?: string; tokenData?: PasswordResetToken }> {
  if (!token) {
    return { valid: false, reason: 'Token parameter is missing' };
  }

  const record = resetTokensDB.get(token);
  if (!record) {
    return { valid: false, reason: 'Reset token not found or already consumed' };
  }

  if (record.used) {
    return { valid: false, reason: 'This reset link has already been used' };
  }

  if (Date.now() > record.expiresAt) {
    return { valid: false, reason: 'Reset link has expired (15-minute validity window)' };
  }

  if (expectedScope && record.scope !== expectedScope) {
    return { 
      valid: false, 
      reason: `Scope mismatch: link scope '${record.scope}' does not match requested scope '${expectedScope}'` 
    };
  }

  return { valid: true, tokenData: record };
}

export async function consumePasswordResetToken(
  token: string,
  newPassword?: string
): Promise<{ success: boolean; message: string }> {
  const verify = await verifyPasswordResetToken(token);
  if (!verify.valid || !verify.tokenData) {
    throw new Error(verify.reason || 'Invalid token');
  }

  const record = verify.tokenData;
  record.used = true;

  const user = await getUserByEmail(record.email);
  if (user && newPassword) {
    // Hash password with salt
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.scryptSync(newPassword, salt, 64).toString('hex');
    user.passwordHash = `${salt}:${hash}`;
    user.updatedAt = new Date().toISOString();
  }

  addAuditLog(
    'password_reset_confirmed',
    record.email,
    `Password successfully updated using scoped reset token (${record.scope})`
  );

  return { 
    success: true, 
    message: 'Password has been successfully updated and authentication credentials refreshed.' 
  };
}

/**
 * Handle WebAuthn Registration Verification
 */
export async function handleVerifyRegistration(
  email: string,
  credentialPayload: any,
  expectedChallenge: string,
  expectedOrigin: string | string[],
  expectedRPID: string
): Promise<{ verified: boolean; passkey: StoredPasskey }> {
  if (!credentialPayload) {
    throw new Error('Missing registration credential payload from client');
  }

  // Verify registration response cryptographically using SimpleWebAuthn
  const verification: VerifiedRegistrationResponse = await verifyRegistrationResponse({
    response: credentialPayload,
    expectedChallenge,
    expectedOrigin,
    expectedRPID,
    requireUserVerification: true,
  });

  if (!verification.verified || !verification.registrationInfo) {
    throw new Error('Registration verification failed cryptographically');
  }

  const { credential, credentialDeviceType, credentialBackedUp } = verification.registrationInfo;

  // Convert public key bytes to Base64URL string for storage
  const publicKeyBase64 = isoBase64URL.fromBuffer(credential.publicKey);

  const newPasskey: StoredPasskey = {
    credentialId: credential.id,
    publicKey: publicKeyBase64,
    counter: credential.counter,
    transports: credentialPayload.response?.transports || ['internal', 'hybrid'],
    deviceType: credentialDeviceType || 'platform',
    backedUp: credentialBackedUp ?? true,
    createdAt: new Date().toISOString(),
    nickname: `${credentialDeviceType === 'singleDevice' ? 'Hardware Key' : 'Platform Passkey'} (${new Date().toLocaleDateString()})`,
  };

  await savePasskeyToDB(email, newPasskey);

  addAuditLog(
    'passkey_registered',
    email,
    `New passkey registered for ${email} (ID: ${credential.id.substring(0, 16)}..., Device: ${newPasskey.deviceType})`
  );

  return { verified: true, passkey: newPasskey };
}

/**
 * Handle WebAuthn Assertion Verification
 */
export async function handleVerifyAssertion(
  email: string,
  credentialPayload: any,
  expectedChallenge: string,
  expectedOrigin: string | string[],
  expectedRPID: string
): Promise<{ verified: boolean; message: string; user: { email: string; displayName: string } }> {
  if (!credentialPayload) {
    throw new Error('Missing assertion credential payload from client');
  }

  const user = await getUserByEmail(email);
  if (!user) {
    throw new Error(`No account found for email: ${email}`);
  }

  const passkey = user.passkeys.find(p => p.credentialId === credentialPayload.id);
  if (!passkey) {
    throw new Error('No registered passkey matched this credential ID on this account');
  }

  // Convert base64URL public key back to Uint8Array for verification
  const publicKeyBytes = isoBase64URL.toBuffer(passkey.publicKey);

  const verification: VerifiedAuthenticationResponse = await verifyAuthenticationResponse({
    response: credentialPayload,
    expectedChallenge,
    expectedOrigin,
    expectedRPID,
    credential: {
      id: passkey.credentialId,
      publicKey: publicKeyBytes,
      counter: passkey.counter,
      transports: passkey.transports as any,
    },
    requireUserVerification: true,
  });

  if (!verification.verified) {
    addAuditLog('assertion_failed', email, `Assertion signature verification failed for ${email}`);
    throw new Error('Assertion cryptographic signature validation failed');
  }

  // Update counter in storage to prevent replay attacks
  passkey.counter = verification.authenticationInfo.newCounter;
  user.updatedAt = new Date().toISOString();

  addAuditLog(
    'assertion_verified',
    email,
    `Successful passkey assertion for ${email} (Counter: ${passkey.counter})`
  );

  return {
    verified: true,
    message: 'Passkey signature verified successfully.',
    user: {
      email: user.email,
      displayName: user.displayName,
    },
  };
}
