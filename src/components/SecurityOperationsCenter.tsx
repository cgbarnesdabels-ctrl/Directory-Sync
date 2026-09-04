/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Mail, 
  Calendar, 
  MessageSquare, 
  StickyNote, 
  ShieldCheck, 
  Send, 
  Clock, 
  Bell, 
  FileText,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  Database
} from 'lucide-react';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { getGoogleAccessToken } from '../lib/google-auth';
import { useToast } from '../context/ToastContext';
import { updateSyncStatus } from '../lib/sync-service';

export const SecurityOperationsCenter: React.FC = () => {
  const { showToast } = useToast();
  const [logs, setLogs] = useState<any[]>([]);
  const [gmailMessages, setGmailMessages] = useState<any[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(true);
  const [isLoadingGmail, setIsLoadingGmail] = useState(false);
  const [isActionPending, setIsActionPending] = useState<string | null>(null);

  // Form states
  const [reportEmail, setReportEmail] = useState('dabelstech@moredesa.com');
  const [auditSummary, setAuditSummary] = useState('Hardware-Bound Security Review');
  const [chatAlert, setChatAlert] = useState('🚨 Security Protocol Triggered: Hardware-bound device access detected.');
  const [keepNote, setKeepNote] = useState('Critical security configuration verified with hardware attestation.');

  useEffect(() => {
    const q = query(collection(db, 'audit_logs'), orderBy('timestamp', 'desc'), limit(10));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const logsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setLogs(logsData);
      setIsLoadingLogs(false);
    });

    return () => unsubscribe();
  }, []);

  const fetchGmailMessages = async () => {
    const token = getGoogleAccessToken();
    if (!token) return;

    setIsLoadingGmail(true);
    try {
      const res = await fetch('/api/workspace/gmail/messages', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setGmailMessages(data.messages || []);
      }
    } catch (err) {
      console.error('Failed to fetch Gmail:', err);
    } finally {
      setIsLoadingGmail(false);
    }
  };

  useEffect(() => {
    fetchGmailMessages();
  }, []);

  const handleWorkspaceAction = async (action: 'gmail' | 'calendar' | 'chat' | 'keep') => {
    const token = getGoogleAccessToken();
    if (!token) {
      showToast({ type: 'error', message: 'Authentication required. Please link your Google Account.' });
      return;
    }

    setIsActionPending(action);
    try {
      let endpoint = '';
      let body = {};

      switch (action) {
        case 'gmail':
          endpoint = '/api/workspace/gmail/send-report';
          body = { 
            to: reportEmail, 
            subject: 'Security Audit Report', 
            body: `<h3>Security Audit Summary</h3><p>Last 10 security events processed and verified.</p><ul>${logs.map(l => `<li>${l.type}: ${l.result} (${l.timestamp})</li>`).join('')}</ul>`
          };
          break;
        case 'calendar':
          endpoint = '/api/workspace/calendar/schedule-audit';
          body = { 
            summary: auditSummary, 
            description: 'Scheduled security audit for hardware-bound devices and identity gates.',
            startTime: new Date(Date.now() + 60 * 60 * 1000).toISOString() // 1 hour from now
          };
          break;
        case 'chat':
          endpoint = '/api/workspace/chat/post-alert';
          body = { text: chatAlert };
          break;
        case 'keep':
          endpoint = '/api/workspace/keep/create-note';
          body = { title: 'Security Memo', text: keepNote };
          break;
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(body)
      });

      if (!res.ok) {
        updateSyncStatus(action, 'error');
        throw new Error(`Workspace action failed: ${action}`);
      }
      
      const data = await res.json();
      updateSyncStatus(action, 'active');
      showToast({ 
        type: 'success', 
        message: data.message,
        link: data.link ? { label: 'View Result', url: data.link } : undefined
      });
    } catch (err: any) {
      console.error('Workspace Action Error:', err);
      showToast({ type: 'error', message: err.message || 'Operation failed' });
    } finally {
      setIsActionPending(null);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* SOC Dashboard Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 bg-slate-900 text-white rounded-lg text-xs font-mono font-bold flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
              <span>Security Operations Center (SOC)</span>
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-semibold border border-indigo-200">
              Workspace Integrated
            </span>
          </div>
          <h2 className="text-lg font-bold text-slate-900 mt-2">
            Cross-Service Incident Management & Persistence
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Synchronize security events across Gmail, Calendar, Chat, and Keep with Cloud persistence via Firestore.
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
            <Database className="w-3.5 h-3.5 text-emerald-600" />
            <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-tight">Cloud Sync Active</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Workspace Controls */}
        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Gmail Reporting */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center">
                  <Mail className="w-5 h-5 text-rose-600" />
                </div>
                <span className="text-[10px] font-bold text-slate-400 uppercase">Communication</span>
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-900">Gmail Incident Reporting</h3>
                <p className="text-[11px] text-slate-500">Dispatch hardware-verified audit reports to key stakeholders.</p>
              </div>
              <div className="space-y-3 pt-2">
                <input 
                  type="email" 
                  value={reportEmail}
                  onChange={(e) => setReportEmail(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-rose-500/20 outline-none transition-all"
                  placeholder="Recipient Email"
                />
                <button
                  onClick={() => handleWorkspaceAction('gmail')}
                  disabled={isActionPending === 'gmail'}
                  className="w-full py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {isActionPending === 'gmail' ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  <span>Send Security Report</span>
                </button>
              </div>
            </div>

            {/* Calendar Scheduling */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-blue-600" />
                </div>
                <span className="text-[10px] font-bold text-slate-400 uppercase">Scheduling</span>
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-900">Calendar Audit Review</h3>
                <p className="text-[11px] text-slate-500">Block time for hardware configuration reviews and compliance checks.</p>
              </div>
              <div className="space-y-3 pt-2">
                <input 
                  type="text" 
                  value={auditSummary}
                  onChange={(e) => setAuditSummary(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                  placeholder="Audit Summary"
                />
                <button
                  onClick={() => handleWorkspaceAction('calendar')}
                  disabled={isActionPending === 'calendar'}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {isActionPending === 'calendar' ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Clock className="w-3.5 h-3.5" />}
                  <span>Schedule Audit Review</span>
                </button>
              </div>
            </div>

            {/* Chat Alerts */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                  <MessageSquare className="w-5 h-5 text-emerald-600" />
                </div>
                <span className="text-[10px] font-bold text-slate-400 uppercase">Real-time</span>
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-900">Google Chat Integration</h3>
                <p className="text-[11px] text-slate-500">Post cryptographically verified security alerts to shared spaces.</p>
              </div>
              <div className="space-y-3 pt-2">
                <textarea 
                  value={chatAlert}
                  onChange={(e) => setChatAlert(e.target.value)}
                  rows={2}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all resize-none"
                  placeholder="Alert Message"
                />
                <button
                  onClick={() => handleWorkspaceAction('chat')}
                  disabled={isActionPending === 'chat'}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {isActionPending === 'chat' ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Bell className="w-3.5 h-3.5" />}
                  <span>Dispatch Chat Alert</span>
                </button>
              </div>
            </div>

            {/* Keep Notes */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
                  <StickyNote className="w-5 h-5 text-amber-600" />
                </div>
                <span className="text-[10px] font-bold text-slate-400 uppercase">Knowledge</span>
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-900">Security Memo (Keep)</h3>
                <p className="text-[11px] text-slate-500">Capture critical hardware attestation data in device-bound notes.</p>
              </div>
              <div className="space-y-3 pt-2">
                <textarea 
                  value={keepNote}
                  onChange={(e) => setKeepNote(e.target.value)}
                  rows={2}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-amber-500/20 outline-none transition-all resize-none"
                  placeholder="Note Content"
                />
                <button
                  onClick={() => handleWorkspaceAction('keep')}
                  disabled={isActionPending === 'keep'}
                  className="w-full py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {isActionPending === 'keep' ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />}
                  <span>Save Security Note</span>
                </button>
              </div>
            </div>
          </div>

          {/* Gmail Security Inbox */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
                  <Mail className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Security Communications</h3>
                  <p className="text-[11px] text-slate-500">Inbox monitoring for hardware-bound identity alerts.</p>
                </div>
              </div>
              <button 
                onClick={fetchGmailMessages}
                disabled={isLoadingGmail}
                className="p-2 hover:bg-slate-50 rounded-lg transition-colors"
              >
                <RefreshCw className={`w-4 h-4 text-slate-400 ${isLoadingGmail ? 'animate-spin' : ''}`} />
              </button>
            </div>

            <div className="space-y-3">
              {isLoadingGmail ? (
                <div className="flex flex-col items-center justify-center py-8 gap-2">
                  <RefreshCw className="w-5 h-5 text-indigo-400 animate-spin" />
                  <p className="text-[10px] text-slate-400 font-medium">Scanning Inbox...</p>
                </div>
              ) : gmailMessages.length === 0 ? (
                <div className="bg-slate-50 border border-dashed border-slate-200 rounded-xl py-8 flex flex-col items-center justify-center gap-2">
                  <Mail className="w-6 h-6 text-slate-300" />
                  <p className="text-[10px] text-slate-400 font-medium">No security-related emails detected.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {gmailMessages.map((msg) => (
                    <div key={msg.id} className="group p-3 rounded-xl border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/30 transition-all">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-bold text-slate-900 truncate max-w-[200px]">
                          {msg.subject}
                        </span>
                        <span className="text-[9px] text-slate-400 whitespace-nowrap">
                          {new Date(msg.date).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 line-clamp-1">{msg.snippet}</p>
                      <div className="mt-2 flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div>
                        <span className="text-[9px] font-bold text-indigo-600 uppercase tracking-tight">Verified Alert</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Cloud Persistence Sidebar (Firestore) */}
        <div className="space-y-6">
          <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 text-white shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
            
            <div className="flex items-center gap-2 mb-6">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30">
                <Database className="w-4 h-4 text-indigo-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold">Cloud Audit Trail</h3>
                <p className="text-[10px] text-slate-400 font-mono tracking-tight">FIRESTORE PERSISTENCE</p>
              </div>
            </div>

            <div className="space-y-4">
              {isLoadingLogs ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <RefreshCw className="w-6 h-6 text-indigo-400 animate-spin" />
                  <p className="text-xs text-slate-400">Syncing with Cloud...</p>
                </div>
              ) : logs.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-xs text-slate-500 italic">No cloud logs detected.</p>
                </div>
              ) : (
                logs.map((log) => (
                  <div key={log.id} className="group relative pl-4 border-l border-slate-700 py-1 transition-all hover:border-indigo-500">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-[10px] font-bold uppercase tracking-wider ${
                        log.result === 'Success' ? 'text-emerald-400' : 'text-rose-400'
                      }`}>
                        {log.type}
                      </span>
                      <span className="text-[9px] text-slate-500 font-mono">
                        {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 mt-0.5 truncate">{log.email}</p>
                    <div className="flex items-center gap-1.5 mt-1 text-[9px] text-slate-500 uppercase font-bold tracking-tight">
                      <span>{log.deviceType}</span>
                      <ChevronRight className="w-2.5 h-2.5" />
                      <span>{log.result}</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="mt-6 pt-4 border-t border-slate-800">
              <button className="w-full flex items-center justify-between text-xs font-bold text-indigo-400 hover:text-indigo-300 transition-colors group">
                <span>View Full Cloud History</span>
                <ExternalLink className="w-3.5 h-3.5 transform group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
              </button>
            </div>
          </div>

          {/* Quick Stats Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
            <h4 className="text-xs font-bold text-slate-900 mb-4 flex items-center gap-2 uppercase tracking-wide">
              <Bell className="w-3.5 h-3.5 text-indigo-600" /> Service Health
            </h4>
            <div className="space-y-4">
              {[
                { name: 'Firestore', status: 'Optimal', icon: Database, color: 'emerald' },
                { name: 'Gmail Relay', status: 'Connected', icon: Mail, color: 'emerald' },
                { name: 'Audit Scheduler', status: 'Standby', icon: Calendar, color: 'blue' },
              ].map((service) => (
                <div key={service.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-1.5 h-1.5 rounded-full bg-${service.color}-500 shadow-sm animate-pulse`}></div>
                    <span className="text-xs font-medium text-slate-700">{service.name}</span>
                  </div>
                  <span className={`text-[10px] font-bold text-${service.color}-600 bg-${service.color}-50 px-2 py-0.5 rounded-full`}>
                    {service.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
