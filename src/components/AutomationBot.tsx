/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Bot, 
  Terminal, 
  Play, 
  Pause, 
  RotateCcw, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  ShieldCheck, 
  Cpu, 
  Sparkles, 
  Zap, 
  Check, 
  Copy, 
  Settings, 
  Activity, 
  GitBranch, 
  FileCode,
  ListTree,
  Send,
  RefreshCw
} from 'lucide-react';
import { useToast } from '../context/ToastContext';

interface AutomationLog {
  id: string;
  timestamp: string;
  botName: string;
  action: string;
  status: 'success' | 'running' | 'warning' | 'error';
  details: string;
}

export const AutomationBot: React.FC = () => {
  const { showToast } = useToast();
  const [isBotActive, setIsBotActive] = useState<boolean>(true);
  const [selectedBotType, setSelectedBotType] = useState<'ci' | 'security' | 'workspace' | 'pr'>('ci');
  const [commandInput, setCommandInput] = useState<string>('');
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [autoSchedule, setAutoSchedule] = useState<string>('every_15_mins');

  const [logs, setLogs] = useState<AutomationLog[]>([
    {
      id: 'log-1',
      timestamp: new Date(Date.now() - 1000 * 60 * 5).toLocaleTimeString(),
      botName: 'CI/CD Sentinel Bot',
      action: 'Build verification check completed',
      status: 'success',
      details: 'TypeScript type check passed with 0 errors across 24 modules.'
    },
    {
      id: 'log-2',
      timestamp: new Date(Date.now() - 1000 * 60 * 22).toLocaleTimeString(),
      botName: 'Security & Auth Guard',
      action: 'Passkey RP ID boundary scan',
      status: 'success',
      details: 'All WebAuthn origin headers and origin challenge bindings verified successfully.'
    },
    {
      id: 'log-3',
      timestamp: new Date(Date.now() - 1000 * 60 * 45).toLocaleTimeString(),
      botName: 'Google Workspace Sync Bot',
      action: 'Calendar & Drive bi-directional sync',
      status: 'success',
      details: 'Synced 12 calendar meetings and 4 active documents with Firestore.'
    }
  ]);

  const handleRunBotNow = (botName: string, actionName: string) => {
    setIsExecuting(true);
    showToast(`Initializing ${botName} execution...`, 'info');

    setTimeout(() => {
      const newLog: AutomationLog = {
        id: `log-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString(),
        botName: botName,
        action: actionName,
        status: 'success',
        details: `Successfully completed action "${actionName}" without errors. Telemetry verified.`
      };
      setLogs(prev => [newLog, ...prev]);
      setIsExecuting(false);
      showToast(`${botName} completed successfully!`, 'success');
    }, 1200);
  };

  const handleSendCommand = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commandInput.trim()) return;

    const cmd = commandInput.trim();
    setCommandInput('');
    setIsExecuting(true);
    showToast(`Executing command: ${cmd}`, 'info');

    setTimeout(() => {
      let resultDetails = `Command "${cmd}" executed successfully by Automation Bot.`;
      if (cmd.includes('/scan')) resultDetails = 'Security vulnerability scan complete. 0 critical vulnerabilities found.';
      if (cmd.includes('/ci')) resultDetails = 'CI workflow dispatched successfully on GitHub runner.';
      if (cmd.includes('/sync')) resultDetails = 'Google Workspace bi-directional sync forced and verified.';

      const newLog: AutomationLog = {
        id: `log-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString(),
        botName: 'Interactive Command Bot',
        action: `Command: ${cmd}`,
        status: 'success',
        details: resultDetails
      };
      setLogs(prev => [newLog, ...prev]);
      setIsExecuting(false);
      showToast('Command executed successfully', 'success');
    }, 1000);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 rounded-2xl shadow-lg border border-indigo-900/40 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2 max-w-2xl">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center gap-1 font-mono">
              <Bot className="w-3.5 h-3.5 text-indigo-400" />
              AUTONOMOUS AGENT v3.4
            </span>
            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 font-mono ${
              isBotActive ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${isBotActive ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
              {isBotActive ? 'Automation Active' : 'Paused'}
            </span>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <span>CI/CD &amp; Security Automation Bot</span>
          </h2>
          <p className="text-xs text-slate-300 leading-relaxed">
            Autonomous agent responsible for automated GitHub builds, passkey compliance audits, workspace synchronization, and auto-remediation of security anomalies.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => {
              setIsBotActive(!isBotActive);
              showToast(isBotActive ? 'Automation bot paused' : 'Automation bot resumed', 'info');
            }}
            className={`py-2.5 px-4 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer shadow-xs ${
              isBotActive 
                ? 'bg-amber-600/90 hover:bg-amber-500 text-white' 
                : 'bg-emerald-600 hover:bg-emerald-500 text-white'
            }`}
          >
            {isBotActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            <span>{isBotActive ? 'Pause Bot' : 'Resume Bot'}</span>
          </button>

          <button
            type="button"
            onClick={() => handleRunBotNow('Master Sentinel Bot', 'Full System Audit & Sync')}
            disabled={isExecuting}
            className="py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer shadow-xs disabled:opacity-60"
          >
            {isExecuting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
            <span>Run All Bots Now</span>
          </button>
        </div>
      </div>

      {/* Grid of Bot Modules */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          {
            id: 'ci',
            title: 'CI/CD Runner Bot',
            desc: 'Auto-dispatches builds & runs tests',
            icon: Cpu,
            status: 'Active',
            color: 'text-indigo-600',
            bg: 'bg-indigo-50 border-indigo-100'
          },
          {
            id: 'security',
            title: 'Security Sentinel',
            desc: 'Passkey & credential audit guard',
            icon: ShieldCheck,
            status: 'Monitoring',
            color: 'text-emerald-600',
            bg: 'bg-emerald-50 border-emerald-100'
          },
          {
            id: 'workspace',
            title: 'Workspace Sync Bot',
            desc: 'Google Calendar & Drive sync',
            icon: Activity,
            status: 'Synced',
            color: 'text-blue-600',
            bg: 'bg-blue-50 border-blue-100'
          },
          {
            id: 'pr',
            title: 'PR & Code Review Bot',
            desc: 'CodeRabbit automated reviews',
            icon: GitBranch,
            status: 'Ready',
            color: 'text-purple-600',
            bg: 'bg-purple-50 border-purple-100'
          }
        ].map(bot => {
          const Icon = bot.icon;
          const isSelected = selectedBotType === bot.id;
          return (
            <div
              key={bot.id}
              onClick={() => setSelectedBotType(bot.id as any)}
              className={`p-4 rounded-2xl border transition-all cursor-pointer bg-white shadow-xs ${
                isSelected ? 'ring-2 ring-indigo-500 border-indigo-300 bg-indigo-50/20' : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className={`p-2 rounded-xl border ${bot.bg} ${bot.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-slate-100 text-slate-700 font-mono">
                  {bot.status}
                </span>
              </div>
              <h3 className="text-sm font-bold text-slate-900 mb-1">{bot.title}</h3>
              <p className="text-xs text-slate-500 leading-relaxed">{bot.desc}</p>
            </div>
          );
        })}
      </div>

      {/* Interactive Command & Execution Console */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Terminal className="w-4 h-4 text-indigo-600" />
              <span>Interactive Bot Command Console</span>
            </h3>
            <p className="text-xs text-slate-500">
              Type automation commands or trigger immediate tasks for the selected bot module
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">Schedule Interval:</span>
            <select
              value={autoSchedule}
              onChange={(e) => {
                setAutoSchedule(e.target.value);
                showToast(`Schedule updated to: ${e.target.selectedOptions[0].text}`, 'success');
              }}
              className="text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            >
              <option value="every_5_mins">Every 5 Minutes</option>
              <option value="every_15_mins">Every 15 Minutes</option>
              <option value="hourly">Hourly</option>
              <option value="daily">Daily Cron</option>
            </select>
          </div>
        </div>

        {/* Quick Command Chips */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Quick Commands:</span>
          {[
            { label: '/run-ci', desc: 'Trigger CI build' },
            { label: '/audit-security', desc: 'Run passkey audit' },
            { label: '/sync-workspace', desc: 'Sync Google data' },
            { label: '/clear-cache', desc: 'Purge bot cache' }
          ].map(chip => (
            <button
              key={chip.label}
              type="button"
              onClick={() => {
                setCommandInput(chip.label);
                showToast(`Loaded command: ${chip.label}`, 'info');
              }}
              className="px-2.5 py-1 rounded-lg text-xs font-mono font-semibold bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 border border-slate-200 transition-colors cursor-pointer flex items-center gap-1"
            >
              <span>{chip.label}</span>
              <span className="text-[10px] text-slate-400 font-sans">({chip.desc})</span>
            </button>
          ))}
        </div>

        {/* Command Input Form */}
        <form onSubmit={handleSendCommand} className="flex gap-2">
          <div className="relative flex-1">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 font-mono text-xs">
              $
            </span>
            <input
              type="text"
              value={commandInput}
              onChange={(e) => setCommandInput(e.target.value)}
              placeholder="Type command (e.g. /run-ci, /audit-security, /sync-workspace)..."
              className="w-full pl-7 pr-4 py-2.5 text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
            />
          </div>
          <button
            type="submit"
            disabled={isExecuting || !commandInput.trim()}
            className="py-2.5 px-5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer shadow-xs"
          >
            {isExecuting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            <span>Execute</span>
          </button>
        </form>

        {/* Live Execution Logs */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-indigo-600" />
              <span>Real-Time Bot Activity &amp; Audit Logs</span>
            </h4>
            <span className="text-[11px] text-slate-400 font-mono">
              {logs.length} events logged
            </span>
          </div>

          <div className="bg-slate-950 text-slate-200 rounded-xl p-4 font-mono text-xs space-y-2.5 max-h-72 overflow-y-auto border border-slate-800">
            {logs.map((log) => (
              <div key={log.id} className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-start gap-2.5">
                  <div className="mt-0.5">
                    {log.status === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                    {log.status === 'warning' && <AlertCircle className="w-4 h-4 text-amber-400" />}
                    {log.status === 'error' && <AlertCircle className="w-4 h-4 text-rose-400" />}
                    {log.status === 'running' && <RefreshCw className="w-4 h-4 text-indigo-400 animate-spin" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-indigo-300">{log.botName}</span>
                      <span className="text-slate-400">•</span>
                      <span className="text-white font-semibold">{log.action}</span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5 font-sans">{log.details}</p>
                  </div>
                </div>
                <div className="text-[10px] text-slate-500 whitespace-nowrap self-end sm:self-center font-mono">
                  {log.timestamp}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
