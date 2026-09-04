/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Router, type Request, type Response } from 'express';
import { 
  generateRegistrationOptions, 
  generateAuthenticationOptions 
} from '@simplewebauthn/server';
import {
  handleVerifyRegistration,
  handleVerifyAssertion,
  getUserPasskeysFromDB,
  createPasswordResetToken,
  verifyPasswordResetToken,
  consumePasswordResetToken,
  deletePasskeyFromDB,
  getAuditLogs,
  addAuditLog,
  getUserByEmail,
} from './auth-handlers';

// Alias generateAuthenticationOptions to generateAssertionOptions for compatibility
export const generateAssertionOptions = generateAuthenticationOptions;

const router = Router();
const defaultRpID = 'dabelstech.com';

// Mock temporary cache to store challenges during the handshake
// Production alternative: Use Redis or session cookies
interface ChallengeRecord {
  challenge: string;
  rpID: string;
  origin: string;
  timestamp: number;
}
const challengeStore = new Map<string, ChallengeRecord>();

// Helper to resolve RP ID dynamically for development, testing, and production
function getRpID(req: Request): string {
  const headerRpID = req.headers['x-webauthn-rpid'] as string | undefined;
  if (headerRpID && headerRpID.trim()) {
    return headerRpID.trim();
  }
  const queryRpID = req.query.rpID as string | undefined;
  if (queryRpID && queryRpID.trim()) {
    return queryRpID.trim();
  }
  const host = (req.headers['x-forwarded-host'] || req.headers.host || '') as string;
  const hostname = host.split(':')[0];
  if (hostname && hostname !== 'localhost' && !hostname.includes('127.0.0.1')) {
    return hostname;
  }
  return defaultRpID;
}

// Helper to resolve origin
function getOrigin(req: Request): string {
  const customOrigin = req.headers['x-webauthn-origin'] as string | undefined;
  if (customOrigin) return customOrigin;
  const proto = (req.headers['x-forwarded-proto'] || req.protocol || 'https') as string;
  const host = (req.headers['x-forwarded-host'] || req.headers.host || 'localhost:3000') as string;
  return `${proto}://${host}`;
}

// Open redirect safety validator
function isSafeRedirect(redirectUri: string, origin: string): boolean {
  if (!redirectUri) return false;
  // Allow internal relative paths
  if (redirectUri.startsWith('/') && !redirectUri.startsWith('//')) {
    return true;
  }
  // Allow allowed custom deep-link schemes for iOS / Native app integration
  if (redirectUri.startsWith('dabelstech://') || redirectUri.startsWith('moredesa://')) {
    return true;
  }
  // Allow same origin or dabelstech.com domains
  try {
    const parsed = new URL(redirectUri);
    const parsedOrigin = new URL(origin);
    if (parsed.hostname === parsedOrigin.hostname) return true;
    if (parsed.hostname === 'dabelstech.com' || parsed.hostname.endsWith('.dabelstech.com')) return true;
  } catch {
    return false;
  }
  return false;
}

/**
 * 1. REGISTRATION OPTIONS
 * Generates the configuration structural payload to create a passkey.
 */
router.get('/registration-options', async (req: Request, res: Response) => {
  const email = (req.query.email as string)?.toLowerCase().trim();
  if (!email) return res.status(400).json({ error: 'Email query parameter is required' });

  const currentRpID = getRpID(req);
  const currentOrigin = getOrigin(req);

  try {
    // Ensure options enforce passkey residency (Google Password Manager compliance)
    const options = await generateRegistrationOptions({
      rpName: 'Dabels Tech',
      rpID: currentRpID,
      userID: Buffer.from(`USR_${email}_${Date.now()}`), // Unique user ID buffer
      userName: email,
      userDisplayName: email.split('@')[0],
      attestationType: 'none',
      authenticatorSelection: {
        residentKey: 'required',       // Required for Google Password Manager syncing
        userVerification: 'required',  // Enforces PIN/Biometric lock
        authenticatorAttachment: 'platform', // Restricts to on-device managers
      },
    });

    // Temporarily persist challenge to verify against it later in the POST route
    challengeStore.set(`reg_challenge_${email}`, {
      challenge: options.challenge,
      rpID: currentRpID,
      origin: currentOrigin,
      timestamp: Date.now(),
    });

    addAuditLog(
      'registration_options_generated',
      email,
      `Generated registration options for ${email} on RP ID "${currentRpID}"`,
      { ip: req.ip, userAgent: req.headers['user-agent'] }
    );

    return res.json({
      ...options,
      _metadata: {
        effectiveRpID: currentRpID,
        effectiveOrigin: currentOrigin,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to generate registration options' });
  }
});

/**
 * 2. VERIFY REGISTRATION
 * Receives payload from client, cryptographically validates it, saves public key to DB.
 */
router.post('/verify-registration', async (req: Request, res: Response) => {
  const { email: rawEmail, credentialPayload } = req.body;
  const email = rawEmail?.toLowerCase().trim();

  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  const record = challengeStore.get(`reg_challenge_${email}`);
  if (!record || Date.now() - record.timestamp > 5 * 60 * 1000) {
    return res.status(400).json({ error: 'Registration challenge expired or missing' });
  }

  try {
    const result = await handleVerifyRegistration(
      email,
      credentialPayload,
      record.challenge,
      [record.origin, getOrigin(req)],
      record.rpID
    );

    challengeStore.delete(`reg_challenge_${email}`); // Clean up cache
    return res.json(result);
  } catch (error: any) {
    return res.status(400).json({ error: error.message || 'Verification failed' });
  }
});

/**
 * 3. ASSERTION OPTIONS
 * Generates configuration structural payload to sign into an existing profile.
 */
router.get('/assertion-options', async (req: Request, res: Response) => {
  const email = (req.query.email as string)?.toLowerCase().trim();
  if (!email) return res.status(400).json({ error: 'Email is required' });

  const currentRpID = getRpID(req);
  const currentOrigin = getOrigin(req);

  try {
    // Look up existing passkeys registered to this account inside your database
    const userPasskeys = await getUserPasskeysFromDB(email);

    const options = await generateAuthenticationOptions({
      rpID: currentRpID,
      userVerification: 'required',
      allowCredentials: userPasskeys.map(passkey => ({
        id: passkey.credentialId,
        type: 'public-key',
        transports: passkey.transports as any,
      })),
    });

    challengeStore.set(`auth_challenge_${email}`, {
      challenge: options.challenge,
      rpID: currentRpID,
      origin: currentOrigin,
      timestamp: Date.now(),
    });

    addAuditLog(
      'assertion_options_generated',
      email,
      `Generated assertion options for ${email} with ${userPasskeys.length} allowed credential(s)`,
      { ip: req.ip, userAgent: req.headers['user-agent'] }
    );

    return res.json({
      ...options,
      _metadata: {
        effectiveRpID: currentRpID,
        effectiveOrigin: currentOrigin,
        registeredPasskeysCount: userPasskeys.length,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to generate assertion options' });
  }
});

/**
 * 4. VERIFY ASSERTION
 * Cryptographically verifies the biometric/PIN identity payload signatures.
 */
router.post('/verify-assertion', async (req: Request, res: Response) => {
  const { email: rawEmail, credentialPayload } = req.body;
  const email = rawEmail?.toLowerCase().trim();

  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  const record = challengeStore.get(`auth_challenge_${email}`);
  if (!record || Date.now() - record.timestamp > 5 * 60 * 1000) {
    return res.status(400).json({ error: 'Authentication challenge expired or missing' });
  }

  try {
    const result = await handleVerifyAssertion(
      email,
      credentialPayload,
      record.challenge,
      [record.origin, getOrigin(req)],
      record.rpID
    );

    challengeStore.delete(`auth_challenge_${email}`);
    return res.json(result);
  } catch (error: any) {
    return res.status(400).json({ error: error.message || 'Assertion verification failed' });
  }
});

/**
 * 5. PASSWORD RESET LINK: REQUEST
 * Generates a scoped password reset link and associated cryptographic token.
 */
router.post('/password-reset-request', async (req: Request, res: Response) => {
  const { email, scope = 'auth:reset-password', redirect_uri } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Email is required for password reset' });
  }

  try {
    const currentOrigin = getOrigin(req);
    const tokenRecord = await createPasswordResetToken(email, scope, redirect_uri);

    // Build the scoped reset link with redirect
    const params = new URLSearchParams({
      token: tokenRecord.token,
      scope: tokenRecord.scope,
    });
    if (tokenRecord.redirectUri) {
      params.set('redirect_uri', tokenRecord.redirectUri);
    }

    const resetLink = `${currentOrigin}/api/auth/password-reset?${params.toString()}`;

    return res.json({
      success: true,
      message: 'Password reset link successfully created.',
      token: tokenRecord.token,
      scope: tokenRecord.scope,
      resetLink,
      redirectUri: tokenRecord.redirectUri,
      expiresAt: tokenRecord.expiresAt,
      email: tokenRecord.email,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to generate reset link' });
  }
});

/**
 * 6. PASSWORD RESET LINK: SCOPE REDIRECT HANDLER
 * Handles link clicks, validates token and scope, and redirects securely to the intended scope target.
 */
router.get('/password-reset', async (req: Request, res: Response) => {
  const token = req.query.token as string;
  const scope = req.query.scope as string | undefined;
  const requestedRedirectUri = (req.query.redirect_uri as string) || '';
  const currentOrigin = getOrigin(req);

  // Validate token
  const validation = await verifyPasswordResetToken(token, scope);

  // If token is invalid or expired
  if (!validation.valid || !validation.tokenData) {
    const errorMessage = validation.reason || 'Invalid or expired password reset link';
    
    // Check if JSON response is requested
    if (req.headers.accept?.includes('application/json') || req.query.format === 'json') {
      return res.status(400).json({ error: errorMessage, valid: false });
    }

    // If client provided a redirect URI that is safe, redirect back with error parameter
    if (requestedRedirectUri && isSafeRedirect(requestedRedirectUri, currentOrigin)) {
      const redirectUrl = new URL(requestedRedirectUri, currentOrigin);
      redirectUrl.searchParams.set('error', 'token_invalid');
      redirectUrl.searchParams.set('message', errorMessage);
      return res.redirect(redirectUrl.toString());
    }

    // Default: redirect to web UI with error
    return res.redirect(`/?view=reset-password&error=${encodeURIComponent(errorMessage)}`);
  }

  const tokenData = validation.tokenData;
  const effectiveRedirectUri = requestedRedirectUri || tokenData.redirectUri;

  addAuditLog(
    'password_reset_redirected',
    tokenData.email,
    `Password reset link verified. Redirecting with scope "${tokenData.scope}" to ${effectiveRedirectUri || 'default view'}`,
    { ip: req.ip, userAgent: req.headers['user-agent'] }
  );

  // If JSON format is explicitly requested (e.g. API inspection or health check)
  if (req.headers.accept?.includes('application/json') || req.query.format === 'json') {
    return res.json({
      valid: true,
      email: tokenData.email,
      scope: tokenData.scope,
      expiresAt: tokenData.expiresAt,
      redirectUri: effectiveRedirectUri,
    });
  }

  // If a safe redirect URI was specified (e.g. iOS ASWebAuthenticationSession / Universal Link / Web SPA route)
  if (effectiveRedirectUri && isSafeRedirect(effectiveRedirectUri, currentOrigin)) {
    // For custom schemes like dabelstech://auth/reset-password
    if (effectiveRedirectUri.includes('://') && !effectiveRedirectUri.startsWith('http')) {
      const delimiter = effectiveRedirectUri.includes('?') ? '&' : '?';
      const destination = `${effectiveRedirectUri}${delimiter}token=${token}&scope=${encodeURIComponent(tokenData.scope)}&email=${encodeURIComponent(tokenData.email)}&status=verified`;
      return res.redirect(destination);
    }

    const redirectUrl = new URL(effectiveRedirectUri, currentOrigin);
    redirectUrl.searchParams.set('token', token);
    redirectUrl.searchParams.set('scope', tokenData.scope);
    redirectUrl.searchParams.set('email', tokenData.email);
    redirectUrl.searchParams.set('status', 'verified');
    return res.redirect(redirectUrl.toString());
  }

  // Default web redirect to front-end reset form
  const destination = `/?view=reset-password&token=${token}&scope=${encodeURIComponent(tokenData.scope)}&email=${encodeURIComponent(tokenData.email)}&status=verified`;
  return res.redirect(destination);
});

/**
 * 7. PASSWORD RESET CONFIRM
 * Confirms token, sets new password, and invalidates the token.
 */
router.post('/password-reset-confirm', async (req: Request, res: Response) => {
  const { token, newPassword, scope } = req.body;

  if (!token) {
    return res.status(400).json({ error: 'Token is required' });
  }
  if (!newPassword || newPassword.length < 8) {
    return res.status(400).json({ error: 'New password must be at least 8 characters long' });
  }

  try {
    const result = await consumePasswordResetToken(token, newPassword);
    return res.json(result);
  } catch (error: any) {
    return res.status(400).json({ error: error.message || 'Failed to update password' });
  }
});

/**
 * 8. PASSKEY MANAGEMENT & AUDIT LOGS
 */
router.get('/user-passkeys', async (req: Request, res: Response) => {
  const email = (req.query.email as string)?.toLowerCase().trim();
  if (!email) return res.status(400).json({ error: 'Email parameter is required' });

  const passkeys = await getUserPasskeysFromDB(email);
  return res.json({ email, passkeys });
});

router.delete('/user-passkeys/:credentialId', async (req: Request, res: Response) => {
  const email = (req.query.email as string)?.toLowerCase().trim();
  const credentialId = req.params.credentialId;
  if (!email || !credentialId) {
    return res.status(400).json({ error: 'Email and credentialId are required' });
  }

  const success = await deletePasskeyFromDB(email, credentialId);
  return res.json({ success, message: success ? 'Passkey deleted' : 'Passkey not found' });
});

router.get('/audit-logs', (req: Request, res: Response) => {
  const email = req.query.email as string | undefined;
  const logs = getAuditLogs(email);
  return res.json({ logs });
});

router.get('/system-config', (req: Request, res: Response) => {
  const currentRpID = getRpID(req);
  const currentOrigin = getOrigin(req);
  return res.json({
    rpName: 'Dabels Tech',
    rpID: currentRpID,
    defaultRpID,
    origin: currentOrigin,
    supportedScopes: [
      { scope: 'auth:reset-password', description: 'Standard password reset flow' },
      { scope: 'auth:passkey-recovery', description: 'Biometric passkey re-enrollment & device recovery' },
      { scope: 'account:security:reset', description: 'Complete security credential invalidation & reset' },
    ],
    iosSupport: {
      framework: 'AuthenticationServices',
      passkeyClass: 'ASAuthorizationPlatformPublicKeyCredentialProvider',
      webAuthSession: 'ASWebAuthenticationSession',
      safariController: 'SFSafariViewController',
      customScheme: 'dabelstech://',
    },
  });
});

export default router;
