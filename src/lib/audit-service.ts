/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import { getGoogleAccessToken } from './google-auth';
import { updateSyncStatus } from './sync-service';

export interface AuditEvent {
  email: string;
  type: string;
  deviceType: string;
  result: 'Success' | 'Failure';
  details?: string;
}

export const logSecurityEvent = async (event: AuditEvent) => {
  try {
    await addDoc(collection(db, 'audit_logs'), {
      ...event,
      timestamp: new Date().toISOString(),
      createdAt: serverTimestamp()
    });

    // Automation: Create a Keep note for critical security events
    if (event.result === 'Failure') {
      const token = getGoogleAccessToken();
      if (token) {
        fetch('/api/workspace/keep/create-note', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            title: `Security Alert: ${event.type}`,
            text: `Critical security event detected.\nUser: ${event.email}\nResult: ${event.result}\nDevice: ${event.deviceType}\nDetails: ${event.details || 'No additional details.'}\nTimestamp: ${new Date().toISOString()}`
          })
        }).then(() => {
          updateSyncStatus('keep', 'active');
        }).catch(err => {
          console.error('Failed to automate Keep note:', err);
          updateSyncStatus('keep', 'error');
        });
      }
    }
  } catch (error) {
    console.error('Firestore Audit Log Error:', error);
  }
};
