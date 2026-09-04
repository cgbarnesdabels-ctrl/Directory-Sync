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

// Seed default users and 30-day historical audit logs
function seedInitialData() {
  const seedEmails = ['dabelstech@moredesa.com', 'admin@dabelstech.com'];
  for (const email of seedEmails) {
    if (!usersDB.has(email)) {
      usersDB.set(email, {
        id: `usr_${crypto.randomBytes(8).toString('hex')}`,
        email,
        displayName: email.split('@')[0],
        passkeys: [
          {
            credentialId: 'cred_apple_touchid_enclave_98af21b',
            publicKey: 'MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE9G8h7K2p1w_touchid_enclave_sample',
            counter: 42,
            transports: ['internal', 'hybrid'],
            deviceType: 'platform',
            backedUp: true,
            createdAt: new Date(Date.now() - 28 * 24 * 3600 * 1000).toISOString(),
            nickname: 'MacBook Pro Secure Enclave (Touch ID)',
          }
        ],
        createdAt: new Date(Date.now() - 35 * 24 * 3600 * 1000).toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
  }

  // Pre-seed 30 days of realistic authentication attempts (Aug 5 -> Sep 4, 2026)
  const now = Date.now();
  const sampleIps = ['192.168.1.104', '10.0.0.15', '172.16.4.22', '192.168.0.88'];
  const sampleUAs = [
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/130.0.0.0 Safari/537.36',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1',
  ];

  // Failure reasons
  const failReasons = [
    'Biometric sensor timeout after 30s of inactivity',
    'Biometric authentication cancelled by user on device prompt',
    'Assertion signature verification failed (device challenge mismatch)',
    'WebAuthn assertion token expired before submission',
  ];

  for (let dayOffset = 89; dayOffset >= 0; dayOffset--) {
    const dayDate = new Date(now - dayOffset * 24 * 3600 * 1000);
    const isWeekend = dayDate.getDay() === 0 || dayDate.getDay() === 6;
    
    // 5 to 11 successful attempts per weekday, 2 to 6 on weekends
    const successCount = isWeekend ? Math.floor(Math.random() * 4) + 3 : Math.floor(Math.random() * 6) + 6;
    // 0 to 1 failure on most days, occasionally 2
    const failCount = Math.random() < 0.35 ? (Math.random() < 0.2 ? 2 : 1) : 0;

    // Generate successes across the day
    for (let i = 0; i < successCount; i++) {
      const hour = Math.floor(Math.random() * 14) + 8; // Between 8 AM and 10 PM
      const minute = Math.floor(Math.random() * 60);
      const second = Math.floor(Math.random() * 60);
      const logTime = new Date(dayDate);
      logTime.setHours(hour, minute, second);

      const isRegistration = dayOffset === 28 && i === 0;
      const isReset = Math.random() < 0.08;
      const email = 'dabelstech@moredesa.com';

      if (isRegistration) {
        auditLogs.push({
          id: `log_seed_reg_${dayOffset}_${i}`,
          timestamp: logTime.toISOString(),
          type: 'passkey_registered',
          email,
          details: `New passkey registered for ${email} (Device: platform Touch ID, Enclave Bound)`,
          ip: sampleIps[i % sampleIps.length],
          userAgent: sampleUAs[0],
        });
      } else if (isReset) {
        auditLogs.push({
          id: `log_seed_rst_${dayOffset}_${i}`,
          timestamp: logTime.toISOString(),
          type: 'password_reset_confirmed',
          email,
          details: `Password reset successfully confirmed using scoped reset link (auth:reset-password)`,
          ip: sampleIps[i % sampleIps.length],
          userAgent: sampleUAs[1],
        });
      } else {
        const counter = 100 + (30 - dayOffset) * 5 + i;
        auditLogs.push({
          id: `log_seed_ast_${dayOffset}_${i}`,
          timestamp: logTime.toISOString(),
          type: 'assertion_verified',
          email,
          details: `Successful passkey biometric assertion for ${email} (FIDO2 Counter: ${counter}, User Verified: true)`,
          ip: sampleIps[i % sampleIps.length],
          userAgent: sampleUAs[i % sampleUAs.length],
        });
      }
    }

    // Generate failures
    for (let f = 0; f < failCount; f++) {
      const hour = Math.floor(Math.random() * 14) + 9;
      const minute = Math.floor(Math.random() * 60);
      const second = Math.floor(Math.random() * 60);
      const logTime = new Date(dayDate);
      logTime.setHours(hour, minute, second);
      const email = 'dabelstech@moredesa.com';
      const reason = failReasons[(dayOffset + f) % failReasons.length];

      auditLogs.push({
        id: `log_seed_fail_${dayOffset}_${f}`,
        timestamp: logTime.toISOString(),
        type: 'assertion_failed',
        email,
        details: `Passkey authentication attempt failed for ${email}: ${reason}`,
        ip: sampleIps[(f + 2) % sampleIps.length],
        userAgent: sampleUAs[(f + 1) % sampleUAs.length],
      });
    }
  }

  // Sort auditLogs newest first
  auditLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
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
  if (auditLogs.length > 2000) {
    auditLogs.pop();
  }
  return entry;
}

export function getAuditLogs(email?: string, date?: string): AuditLogEntry[] {
  let logs = auditLogs;
  if (email) {
    logs = logs.filter(l => l.email.toLowerCase() === email.toLowerCase());
  }
  if (date) {
    logs = logs.filter(l => l.timestamp.startsWith(date));
  }
  return logs;
}

/**
 * Aggregates authentication attempts over an arbitrary date range or N days
 */
export function getAuditMetrics(
  email?: string,
  days?: number,
  startDateStr?: string,
  endDateStr?: string
) {
  const filteredLogs = getAuditLogs(email);
  const now = new Date();
  
  // Format short date (e.g. "Aug 06") and ISO date string "YYYY-MM-DD"
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  const dailyMap = new Map<string, {
    date: string;
    fullDate: string;
    successful: number;
    failed: number;
    total: number;
    passkeySuccessful: number;
    passwordOrResetSuccessful: number;
    failedBiometric: number;
    failedOther: number;
    successRate: number;
  }>();

  let daysCount = 30;
  let computedStartDate = '';
  let computedEndDate = '';

  if (startDateStr && endDateStr) {
    // Custom date range
    const start = new Date(`${startDateStr}T00:00:00`);
    const end = new Date(`${endDateStr}T23:59:59`);
    
    // Sort chronologically if inverted
    const actualStart = start.getTime() <= end.getTime() ? start : end;
    const actualEnd = start.getTime() <= end.getTime() ? end : start;

    const cur = new Date(actualStart);
    cur.setHours(12, 0, 0, 0); // avoid daylight savings time boundary anomalies
    const endTime = actualEnd.getTime();
    
    let count = 0;
    while (cur.getTime() <= endTime && count < 365) {
      const yyyy = cur.getFullYear();
      const mm = String(cur.getMonth() + 1).padStart(2, '0');
      const dd = String(cur.getDate()).padStart(2, '0');
      const fullDate = `${yyyy}-${mm}-${dd}`;
      const dateLabel = `${monthNames[cur.getMonth()]} ${dd}`;

      if (count === 0) computedStartDate = fullDate;
      computedEndDate = fullDate;

      dailyMap.set(fullDate, {
        date: dateLabel,
        fullDate,
        successful: 0,
        failed: 0,
        total: 0,
        passkeySuccessful: 0,
        passwordOrResetSuccessful: 0,
        failedBiometric: 0,
        failedOther: 0,
        successRate: 100,
      });

      cur.setDate(cur.getDate() + 1);
      count++;
    }
    daysCount = count;
  } else {
    const numDays = days && days > 0 ? Math.min(days, 365) : 30;
    daysCount = numDays;

    for (let i = numDays - 1; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 3600 * 1000);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const fullDate = `${yyyy}-${mm}-${dd}`;
      const dateLabel = `${monthNames[d.getMonth()]} ${dd}`;

      if (i === numDays - 1) computedStartDate = fullDate;
      if (i === 0) computedEndDate = fullDate;

      dailyMap.set(fullDate, {
        date: dateLabel,
        fullDate,
        successful: 0,
        failed: 0,
        total: 0,
        passkeySuccessful: 0,
        passwordOrResetSuccessful: 0,
        failedBiometric: 0,
        failedOther: 0,
        successRate: 100,
      });
    }
  }

  // Count metrics from audit logs
  let totalAttempts = 0;
  let totalSuccessful = 0;
  let totalFailed = 0;
  let passkeySuccessfulTotal = 0;
  let passwordResetSuccessfulTotal = 0;
  let biometricFailedTotal = 0;
  let otherFailedTotal = 0;

  for (const log of filteredLogs) {
    const logDate = new Date(log.timestamp);
    const yyyy = logDate.getFullYear();
    const mm = String(logDate.getMonth() + 1).padStart(2, '0');
    const dd = String(logDate.getDate()).padStart(2, '0');
    const fullDate = `${yyyy}-${mm}-${dd}`;

    const dayRecord = dailyMap.get(fullDate);
    if (!dayRecord) continue; // Outside the window

    const isSuccess = log.type === 'assertion_verified' || 
                      log.type === 'passkey_registered' || 
                      log.type === 'password_reset_confirmed';
    const isFail = log.type === 'assertion_failed' || log.type.includes('failed');

    if (isSuccess) {
      dayRecord.successful++;
      dayRecord.total++;
      totalAttempts++;
      totalSuccessful++;

      if (log.type === 'assertion_verified' || log.type === 'passkey_registered') {
        dayRecord.passkeySuccessful++;
        passkeySuccessfulTotal++;
      } else {
        dayRecord.passwordOrResetSuccessful++;
        passwordResetSuccessfulTotal++;
      }
    } else if (isFail) {
      dayRecord.failed++;
      dayRecord.total++;
      totalAttempts++;
      totalFailed++;

      if (log.details?.toLowerCase().includes('biometric') || log.details?.toLowerCase().includes('timeout') || log.details?.toLowerCase().includes('cancel')) {
        dayRecord.failedBiometric++;
        biometricFailedTotal++;
      } else {
        dayRecord.failedOther++;
        otherFailedTotal++;
      }
    }
  }

  // Compute daily success rates
  let peakDay = { date: '', attempts: 0 };
  const dailyMetrics = Array.from(dailyMap.values()).map(day => {
    day.successRate = day.total > 0 ? Math.round((day.successful / day.total) * 1000) / 10 : 100;
    if (day.total > peakDay.attempts) {
      peakDay = { date: day.date, attempts: day.total };
    }
    return day;
  });

  const overallSuccessRate = totalAttempts > 0 
    ? Math.round((totalSuccessful / totalAttempts) * 1000) / 10 
    : 100;

  const passkeySharePercentage = totalSuccessful > 0 
    ? Math.round((passkeySuccessfulTotal / totalSuccessful) * 1000) / 10 
    : 0;

  return {
    days: daysCount,
    startDate: computedStartDate,
    endDate: computedEndDate,
    totalAttempts,
    successfulAttempts: totalSuccessful,
    failedAttempts: totalFailed,
    successRate: overallSuccessRate,
    passkeySharePercentage,
    peakDay,
    dailyMetrics,
    factorDistribution: [
      { name: 'WebAuthn Passkey (Biometric)', value: passkeySuccessfulTotal, color: '#4f46e5' },
      { name: 'Password / Scoped Link', value: passwordResetSuccessfulTotal, color: '#0ea5e9' },
    ],
    failureDistribution: [
      { name: 'Biometric Timeout / Cancel', value: biometricFailedTotal, color: '#f43f5e' },
      { name: 'Signature / Challenge Mismatch', value: otherFailedTotal, color: '#fb7185' },
    ],
  };
}

export const get30DayAuditMetrics = (email?: string, days = 30) => getAuditMetrics(email, days);

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
