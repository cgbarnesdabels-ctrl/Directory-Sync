/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from './firebase';

export type IntegrationService = 'drive' | 'calendar' | 'gmail' | 'chat' | 'keep';

export const updateSyncStatus = async (service: IntegrationService, status: 'active' | 'error' | 'pending') => {
  const user = auth.currentUser;
  if (!user || !user.email) return;

  const statusId = `${user.uid}_${service}`;
  try {
    await setDoc(doc(db, 'sync_status', statusId), {
      service,
      status,
      lastSyncAt: new Date().toISOString(),
      userEmail: user.email,
      updatedAt: serverTimestamp()
    }, { merge: true });
  } catch (error) {
    console.error(`Failed to update sync status for ${service}:`, error);
  }
};
