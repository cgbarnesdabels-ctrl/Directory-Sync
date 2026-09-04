/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Cloud, 
  Calendar, 
  Mail, 
  StickyNote, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle,
  HardDrive
} from 'lucide-react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';

interface SyncState {
  service: string;
  status: 'active' | 'error' | 'pending';
  lastSyncAt: string;
}

export const DashboardWidget: React.FC = () => {
  const [syncs, setSyncs] = useState<Record<string, SyncState>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        const q = query(
          collection(db, 'sync_status'),
          where('userEmail', '==', user.email)
        );

        const unsubscribeSnapshot = onSnapshot(q, (snapshot) => {
          const newSyncs: Record<string, SyncState> = {};
          snapshot.docs.forEach(doc => {
            const data = doc.data() as SyncState;
            newSyncs[data.service] = data;
          });
          setSyncs(newSyncs);
          setIsLoading(false);
        });

        return () => unsubscribeSnapshot();
      } else {
        setSyncs({});
        setIsLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  const services = [
    { id: 'drive', label: 'Google Drive', icon: HardDrive, color: 'text-indigo-600' },
    { id: 'calendar', label: 'Calendar', icon: Calendar, color: 'text-blue-600' },
    { id: 'gmail', label: 'Gmail', icon: Mail, color: 'text-rose-600' },
    { id: 'keep', label: 'Google Keep', icon: StickyNote, color: 'text-amber-600' },
  ];

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <Cloud className="w-4 h-4 text-indigo-600" />
          Workspace Sync Status
        </h3>
        <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Real-time</span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {services.map((service) => {
          const sync = syncs[service.id];
          return (
            <div key={service.id} className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex flex-col gap-2 transition-all hover:bg-white hover:shadow-sm">
              <div className="flex items-center justify-between">
                <div className={`p-1.5 rounded-lg bg-white shadow-xs ${service.color}`}>
                  <service.icon className="w-3.5 h-3.5" />
                </div>
                {isLoading ? (
                  <RefreshCw className="w-3 h-3 text-slate-300 animate-spin" />
                ) : sync?.status === 'active' ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                ) : sync?.status === 'error' ? (
                  <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
                ) : (
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-300"></div>
                )}
              </div>
              
              <div className="space-y-0.5">
                <p className="text-[11px] font-bold text-slate-700">{service.label}</p>
                <p className="text-[9px] text-slate-400 font-medium">
                  {sync?.lastSyncAt 
                    ? `Synced ${new Date(sync.lastSyncAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                    : 'Not linked'}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
