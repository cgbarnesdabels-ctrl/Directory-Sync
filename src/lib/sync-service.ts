/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { doc, setDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db, auth } from './firebase';

export type IntegrationService = 'drive' | 'calendar' | 'gmail' | 'chat' | 'keep' | 'meet';

export const updateSyncStatus = async (
  service: IntegrationService, 
  status: 'active' | 'error' | 'pending',
  errorDetails?: { errorCode?: string | number; errorMessage?: string; conflictType?: string }
) => {
  const user = auth.currentUser;
  if (!user || !user.email) return;

  const statusId = `${user.uid}_${service}`;
  const now = new Date().toISOString();
  try {
    await setDoc(doc(db, 'sync_status', statusId), {
      service,
      status,
      lastSyncAt: now,
      userEmail: user.email,
      errorCode: errorDetails?.errorCode ? String(errorDetails.errorCode) : null,
      errorMessage: errorDetails?.errorMessage || null,
      updatedAt: serverTimestamp()
    }, { merge: true });

    await addDoc(collection(db, 'sync_logs'), {
      service,
      status,
      timestamp: now,
      userEmail: user.email,
      errorCode: errorDetails?.errorCode ? String(errorDetails.errorCode) : null,
      errorMessage: errorDetails?.errorMessage || null,
      conflictType: errorDetails?.conflictType || null,
      createdAt: serverTimestamp()
    });
  } catch (error) {
    console.error(`Failed to update sync status for ${service}:`, error);
  }
};
