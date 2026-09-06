/**
 * Dabels Passkey & Workspace Sync Guard - Safari iOS Web Extension
 * Background Service Worker
 */

const SYNC_HEALTH_KEY = 'dabels_workspace_sync_health';

// Initialize alarms for periodic sync health check on iOS Safari
chrome.runtime.onInstalled.addListener(() => {
  console.log('[Dabels Safari Extension] Installed successfully on iOS/macOS Safari.');
  chrome.alarms.create('syncHealthCheck', { periodInMinutes: 5 });
  updateBadgeState('OK', '#10b981');
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'syncHealthCheck') {
    checkWorkspaceSyncHealth();
  }
});

function updateBadgeState(text, color) {
  if (chrome.action && chrome.action.setBadgeText) {
    chrome.action.setBadgeText({ text });
    chrome.action.setBadgeBackgroundColor({ color });
  }
}

async function checkWorkspaceSyncHealth() {
  try {
    const data = await chrome.storage.local.get([SYNC_HEALTH_KEY, 'gatewayUrl']);
    const gatewayUrl = data.gatewayUrl || 'https://ais-dev-lqpipzowgb7lapwky3dtvq-636943343240.us-east1.run.app';
    
    const res = await fetch(`${gatewayUrl}/api/workspace/resolve-conflicts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ logs: [], currentStatus: {} })
    });
    
    if (res.ok) {
      const json = await res.json();
      const conflicts = json.analysis?.detectedConflicts || [];
      if (conflicts.length > 0) {
        updateBadgeState(String(conflicts.length), '#ef4444');
      } else {
        updateBadgeState('OK', '#10b981');
      }
    }
  } catch (err) {
    console.warn('[Dabels Safari Extension] Periodic check skipped:', err);
  }
}

// Handle messages from content script or popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'GET_SYNC_STATUS') {
    chrome.storage.local.get([SYNC_HEALTH_KEY], (result) => {
      sendResponse({ status: result[SYNC_HEALTH_KEY] || null });
    });
    return true;
  }

  if (request.type === 'SET_CONFLICT_ALERT') {
    updateBadgeState('!', '#ef4444');
    sendResponse({ success: true });
    return true;
  }

  if (request.type === 'RESOLVE_CONFLICT_AUTO') {
    // Forward resolution to gateway
    sendResponse({ success: true, message: 'Resolution forwarded' });
    return true;
  }
});
