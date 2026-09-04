/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Play, Code2, RefreshCw, CheckCircle2, AlertCircle, Copy, Check } from 'lucide-react';

interface EndpointDef {
  id: string;
  name: string;
  method: 'GET' | 'POST';
  path: string;
  description: string;
  defaultParams?: Record<string, string>;
  defaultBody?: any;
}

const ENDPOINTS: EndpointDef[] = [
  {
    id: 'reg-options',
    name: '1. Registration Options',
    method: 'GET',
    path: '/api/auth/registration-options',
    description: 'Generates WebAuthn configuration payload with residentKey: "required" and authenticatorAttachment: "platform".',
    defaultParams: { email: 'dabelstech@moredesa.com' },
  },
  {
    id: 'assert-options',
    name: '2. Assertion Options',
    method: 'GET',
    path: '/api/auth/assertion-options',
    description: 'Generates biometric assertion challenge & lists allowed credentials for an existing account.',
    defaultParams: { email: 'dabelstech@moredesa.com' },
  },
  {
    id: 'reset-request',
    name: '3. Password Reset Request',
    method: 'POST',
    path: '/api/auth/password-reset-request',
    description: 'Generates scoped one-time cryptographic reset token and signed redirect link.',
    defaultBody: {
      email: 'dabelstech@moredesa.com',
      scope: 'auth:reset-password',
      redirect_uri: 'dabelstech://auth/reset-password',
    },
  },
  {
    id: 'reset-redirect-inspect',
    name: '4. Scope Redirect Inspection',
    method: 'GET',
    path: '/api/auth/password-reset',
    description: 'Validates token and scope, testing the HTTP 302 redirect destination format.',
    defaultParams: {
      token: 'DEMO_TOKEN',
      scope: 'auth:reset-password',
      format: 'json',
    },
  },
  {
    id: 'system-config',
    name: '5. System Config & iOS Support',
    method: 'GET',
    path: '/api/auth/system-config',
    description: 'Returns effective RP ID, origin, supported scopes, and iOS AuthenticationServices metadata.',
  },
];

export const ApiExplorer: React.FC = () => {
  const [selectedEndpoint, setSelectedEndpoint] = useState<EndpointDef>(ENDPOINTS[0]);
  const [queryParams, setQueryParams] = useState<Record<string, string>>(
    ENDPOINTS[0].defaultParams || {}
  );
  const [jsonBody, setJsonBody] = useState<string>(
    ENDPOINTS[0].defaultBody ? JSON.stringify(ENDPOINTS[0].defaultBody, null, 2) : ''
  );
  const [isLoading, setIsLoading] = useState(false);
  const [responseOutput, setResponseOutput] = useState<{
    status: number;
    statusText: string;
    headers: Record<string, string>;
    data: any;
    durationMs: number;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  const handleSelect = (endpoint: EndpointDef) => {
    setSelectedEndpoint(endpoint);
    setQueryParams(endpoint.defaultParams || {});
    setJsonBody(endpoint.defaultBody ? JSON.stringify(endpoint.defaultBody, null, 2) : '');
    setResponseOutput(null);
  };

  const handleExecute = async () => {
    setIsLoading(true);
    const startTime = performance.now();

    try {
      let url = selectedEndpoint.path;
      if (Object.keys(queryParams).length > 0) {
        const sp = new URLSearchParams(queryParams);
        url += `?${sp.toString()}`;
      }

      const options: RequestInit = {
        method: selectedEndpoint.method,
        headers: {
          Accept: 'application/json',
        },
      };

      if (selectedEndpoint.method === 'POST') {
        options.headers = {
          ...options.headers,
          'Content-Type': 'application/json',
        };
        options.body = jsonBody;
      }

      const res = await fetch(url, options);
      const durationMs = Math.round(performance.now() - startTime);

      const headers: Record<string, string> = {};
      res.headers.forEach((val, key) => {
        headers[key] = val;
      });

      let data;
      const text = await res.text();
      try {
        data = JSON.parse(text);
      } catch {
        data = text;
      }

      setResponseOutput({
        status: res.status,
        statusText: res.statusText,
        headers,
        data,
        durationMs,
      });
    } catch (err: any) {
      setResponseOutput({
        status: 0,
        statusText: 'Network Error',
        headers: {},
        data: { error: err.message },
        durationMs: Math.round(performance.now() - startTime),
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyJson = () => {
    if (!responseOutput) return;
    navigator.clipboard.writeText(JSON.stringify(responseOutput.data, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <h2 className="text-lg font-bold text-slate-900">
          Live REST API Playground &amp; Specification Explorer
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Directly execute Dabels Tech Passkey &amp; Scoped Reset endpoints with live telemetry.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Endpoint Selector Column */}
        <div className="lg:col-span-4 space-y-2">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400 px-1 mb-2">
            Available Endpoints
          </div>
          {ENDPOINTS.map((ep) => (
            <button
              key={ep.id}
              type="button"
              onClick={() => handleSelect(ep)}
              className={`w-full text-left p-3.5 rounded-xl border transition-all cursor-pointer ${
                selectedEndpoint.id === ep.id
                  ? 'bg-indigo-50/70 border-indigo-300 text-indigo-950 shadow-xs'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span
                  className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                    ep.method === 'GET'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-emerald-100 text-emerald-800'
                  }`}
                >
                  {ep.method}
                </span>
                <span className="font-semibold text-xs text-slate-900 truncate">{ep.name}</span>
              </div>
              <div className="text-[11px] font-mono text-slate-500 truncate">{ep.path}</div>
            </button>
          ))}
        </div>

        {/* Request & Response Column */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span
                  className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                    selectedEndpoint.method === 'GET'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-emerald-100 text-emerald-800'
                  }`}
                >
                  {selectedEndpoint.method}
                </span>
                <code className="text-sm font-mono font-semibold text-slate-900">
                  {selectedEndpoint.path}
                </code>
              </div>
              <p className="text-xs text-slate-600 mt-1">{selectedEndpoint.description}</p>
            </div>

            {/* Query Params if GET */}
            {selectedEndpoint.method === 'GET' && Object.keys(queryParams).length > 0 && (
              <div className="space-y-2">
                <div className="text-xs font-semibold text-slate-700">Query Parameters</div>
                {Object.entries(queryParams).map(([key, val]) => (
                  <div key={key} className="flex items-center gap-2">
                    <span className="text-xs font-mono text-slate-500 w-24 truncate">{key}:</span>
                    <input
                      type="text"
                      value={val}
                      onChange={(e) => setQueryParams({ ...queryParams, [key]: e.target.value })}
                      className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono text-slate-900 focus:bg-white"
                    />
                  </div>
                ))}
              </div>
            )}

            {/* Body if POST */}
            {selectedEndpoint.method === 'POST' && (
              <div className="space-y-2">
                <div className="text-xs font-semibold text-slate-700">JSON Request Body</div>
                <textarea
                  rows={6}
                  value={jsonBody}
                  onChange={(e) => setJsonBody(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono text-slate-900 focus:bg-white"
                />
              </div>
            )}

            {/* Execute Button */}
            <button
              type="button"
              onClick={handleExecute}
              disabled={isLoading}
              className="py-2.5 px-5 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-xl shadow-xs flex items-center gap-2 disabled:opacity-60 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Dispatching Request...</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Execute Endpoint</span>
                </>
              )}
            </button>
          </div>

          {/* Response Inspector */}
          {responseOutput && (
            <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 text-white shadow-md space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-3">
                  <span
                    className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                      responseOutput.status >= 200 && responseOutput.status < 300
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                    }`}
                  >
                    {responseOutput.status} {responseOutput.statusText}
                  </span>
                  <span className="text-xs font-mono text-slate-400">
                    {responseOutput.durationMs}ms
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleCopyJson}
                  className="py-1 px-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs flex items-center gap-1 font-mono cursor-pointer"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>

              <div className="text-[11px] font-mono text-slate-300 max-h-[380px] overflow-y-auto">
                <pre className="leading-relaxed">
                  {typeof responseOutput.data === 'object'
                    ? JSON.stringify(responseOutput.data, null, 2)
                    : responseOutput.data}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
