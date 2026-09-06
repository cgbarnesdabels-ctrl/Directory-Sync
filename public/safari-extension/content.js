/**
 * Dabels Passkey & Workspace Sync Guard - Safari iOS Web Extension
 * Content Script
 */

(function () {
  console.log('[Dabels Safari Extension] Content script loaded on:', window.location.hostname);

  // Detect if on Google Workspace or Dabels Gateway
  const isGoogleWorkspace = /google\.com$/.test(window.location.hostname);
  const isDabelsApp = window.location.hostname.includes('run.app') || window.location.hostname.includes('localhost');

  // Inject a lightweight native iOS indicator if sync conflicts occur
  function injectStatusWidget() {
    if (document.getElementById('dabels-safari-sync-indicator')) return;

    const pill = document.createElement('div');
    pill.id = 'dabels-safari-sync-indicator';
    pill.style.position = 'fixed';
    pill.style.bottom = '16px';
    pill.style.right = '16px';
    pill.style.zIndex = '999999';
    pill.style.background = 'rgba(15, 23, 42, 0.85)';
    pill.style.backdropFilter = 'blur(12px)';
    pill.style.webkitBackdropFilter = 'blur(12px)';
    pill.style.color = '#ffffff';
    pill.style.padding = '8px 14px';
    pill.style.borderRadius = '9999px';
    pill.style.fontSize = '12px';
    pill.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    pill.style.display = 'flex';
    pill.style.alignItems = 'center';
    pill.style.gap = '8px';
    pill.style.boxShadow = '0 4px 14px rgba(0, 0, 0, 0.18)';
    pill.style.cursor = 'pointer';
    pill.style.transition = 'all 0.2s ease';

    pill.innerHTML = `
      <span style="width: 8px; height: 8px; border-radius: 50%; background: #10b981; display: inline-block;"></span>
      <span style="font-weight: 600;">Dabels Sync Guard</span>
      <span style="opacity: 0.6; font-size: 10px;">iOS Safari</span>
    `;

    pill.addEventListener('click', () => {
      window.open('https://ais-dev-lqpipzowgb7lapwky3dtvq-636943343240.us-east1.run.app', '_blank');
    });

    document.body.appendChild(pill);
  }

  // Listen for WebAuthn passkey events on page
  window.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'DABELS_SYNC_CONFLICT_DETECTED') {
      chrome.runtime.sendMessage({
        type: 'SET_CONFLICT_ALERT',
        service: event.data.service,
        errorCode: event.data.errorCode
      });
    }
  });

  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    if (isGoogleWorkspace || isDabelsApp) {
      injectStatusWidget();
    }
  } else {
    document.addEventListener('DOMContentLoaded', () => {
      if (isGoogleWorkspace || isDabelsApp) {
        injectStatusWidget();
      }
    });
  }
})();
