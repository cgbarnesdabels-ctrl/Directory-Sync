/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { doc, setDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db, auth } from './firebase';

export type IntegrationService = 'drive' | 'calendar' | 'gmail' | 'chat' | 'keep';

export const updateSyncStatus = async (service: IntegrationService, status: 'active' | 'error' | 'pending') => {
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
      updatedAt: serverTimestamp()
    }, { merge: true });

    await addDoc(collection(db, 'sync_logs'), {
      service,
      status,
      timestamp: now,
      userEmail: user.email,
      createdAt: serverTimestamp()
    });
  } catch (error) {
    console.error(`Failed to update sync status for ${service}:`, error);
  }
};
