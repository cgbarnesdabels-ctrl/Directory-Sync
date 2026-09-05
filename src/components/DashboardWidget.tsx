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
  HardDrive,
  Activity,
  LayoutGrid
} from 'lucide-react';
import { collection, query, where, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';

interface SyncState {
  service: string;
  status: 'active' | 'error' | 'pending';
  lastSyncAt: string;
}

interface SyncLog {
  id: string;
  service: string;
  status: 'active' | 'error' | 'pending';
  timestamp: string;
}

export const DashboardWidget: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'history'>('overview');
  const [syncs, setSyncs] = useState<Record<string, SyncState>>({});
  const [syncLogs, setSyncLogs] = useState<SyncLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        const qStatus = query(
          collection(db, 'sync_status'),
          where('userEmail', '==', user.email)
        );

        const unsubscribeStatus = onSnapshot(qStatus, (snapshot) => {
          const newSyncs: Record<string, SyncState> = {};
          snapshot.docs.forEach(doc => {
            const data = doc.data() as SyncState;
            newSyncs[data.service] = data;
          });
          setSyncs(newSyncs);
          setIsLoading(false);
        });

        const qLogs = query(
          collection(db, 'sync_logs'),
          where('userEmail', '==', user.email),
          orderBy('timestamp', 'desc'),
          limit(30)
        );

        const unsubscribeLogs = onSnapshot(qLogs, (snapshot) => {
          setSyncLogs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SyncLog)));
        });

        return () => {
          unsubscribeStatus();
          unsubscribeLogs();
        };
      } else {
        setSyncs({});
        setSyncLogs([]);
        setIsLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  const services = [
    { id: 'drive', label: 'Google Drive', icon: HardDrive, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { id: 'calendar', label: 'Calendar', icon: Calendar, color: 'text-blue-600', bg: 'bg-blue-50' },
    { id: 'gmail', label: 'Gmail', icon: Mail, color: 'text-rose-600', bg: 'bg-rose-50' },
    { id: 'keep', label: 'Google Keep', icon: StickyNote, color: 'text-amber-600', bg: 'bg-amber-50' },
  ];

  const getServiceData = (id: string) => services.find(s => s.id === id) || services[0];

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
      <div className="p-4 border-b border-slate-100 flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <Cloud className="w-4 h-4 text-indigo-600" />
          Workspace Sync Status
        </h3>
        <div className="flex bg-slate-100 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 ${
              activeTab === 'overview' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            Overview
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 ${
              activeTab === 'history' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            Live Log
          </button>
        </div>
      </div>

      <div className="p-4">
        {activeTab === 'overview' ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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
        ) : (
          <div className="h-48 overflow-y-auto pr-2 space-y-2 scrollbar-thin scrollbar-thumb-slate-200">
            {syncLogs.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400">
                <Activity className="w-5 h-5 mb-2 opacity-50" />
                <p className="text-xs">No recent sync operations found.</p>
              </div>
            ) : (
              syncLogs.map(log => {
                const serviceData = getServiceData(log.service);
                const Icon = serviceData.icon;
                return (
                  <div key={log.id} className="flex items-center justify-between p-2.5 rounded-lg border border-slate-100 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`p-1.5 rounded-md ${serviceData.bg} ${serviceData.color}`}>
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-700">
                          {serviceData.label} Sync 
                          <span className={`ml-2 text-[10px] uppercase tracking-wider ${
                            log.status === 'active' ? 'text-emerald-500' : 
                            log.status === 'error' ? 'text-rose-500' : 'text-amber-500'
                          }`}>
                            {log.status}
                          </span>
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {new Date(log.timestamp).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
};
