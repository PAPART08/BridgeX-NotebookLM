import { listNotebooks } from '../utils/notebooklm-api';

let creating: Promise<void> | null = null;

async function setupOffscreenDocument() {
  const path = 'src/offscreen/index.html';

  try {
    if (typeof chrome === 'undefined' || !chrome.offscreen) return;
    
    // Check if document already exists
    const hasDoc = await chrome.offscreen.hasDocument();
    if (hasDoc) return;

    if (creating) {
      await creating;
    } else {
      creating = chrome.offscreen.createDocument({
        url: chrome.runtime.getURL(path),
        reasons: [chrome.offscreen.Reason.WORKERS],
        justification: 'To run SQLite in a worker for persistent local storage.'
      });
      await creating;
      creating = null;
    }
  } catch (e) {
    console.error('[bridgeX] Offscreen setup failed:', e);
    creating = null;
  }
}

// ─── Listeners ───────────────────────────────────────────────────────────────

chrome.runtime.onInstalled.addListener(async () => {
  console.log('[bridgeX] Toolkit Installed');
  await setupOffscreenDocument();
  
  // Initialize minimal storage
  chrome.storage.local.get(['inbox'], (result) => {
    if (!result.inbox) {
      chrome.storage.local.set({ inbox: [] });
    }
  });
});

// Primary Message Relay
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.target === 'offscreen-relay') {
    handleOffscreenRelay(message, sendResponse);
    return true; // Keep channel open
  }

  if (message.type === 'CAPTURE_SOURCE') {
    handleCaptureSource(message.payload, sender);
    sendResponse({ success: true });
  } else if (message.type === 'FETCH_NOTEBOOKS') {
    handleFetchNotebooks(sendResponse);
    return true;
  } else if (message.type === 'CREATE_NOTEBOOK') {
    handleCreateNotebook(message.payload, sendResponse);
    return true;
  } else if (message.type === 'FETCH_NOTEBOOKLM_LIST' || message.type === 'GET_NOTEBOOK_LIST') {
    handleFetchNotebookLMList(message.payload || {}, sendResponse);
    return true;
  }
});

// ─── Handlers ────────────────────────────────────────────────────────────────

async function handleOffscreenRelay(message: any, sendResponse: (r: any) => void) {
  let timer: any;
  try {
    await setupOffscreenDocument();
    
    // Create a promise that rejects after timeout
    const timeoutPromise = new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error('Offscreen relay timed out (10s)')), 10000);
    });

    // Relay to offscreen document
    const relayPromise = chrome.runtime.sendMessage({
      ...message,
      target: 'offscreen'
    });

    const response = await Promise.race([relayPromise, timeoutPromise]);
    clearTimeout(timer);
    sendResponse(response);
  } catch (err: any) {
    if (timer) clearTimeout(timer);
    console.error('[bridgeX] Relay failed:', err.message || err);
    sendResponse({ error: err.message || 'Background relay failed' });
  }
}
// ...
async function handleFetchNotebookLMList(payload: any, sendResponse: (r: any) => void) {
  try {
    const authuser = payload.authuser || "0";
    const notebooks = await listNotebooks(payload.sourcePath || "/", authuser);
    sendResponse({ success: true, notebooks });
  } catch (err: any) {
    console.error('[bridgeX] API Fetch failed in background:', err);
    sendResponse({ success: false, error: err.message || "Unknown API error" });
  }
}

function handleCaptureSource(payload: any, sender: chrome.runtime.MessageSender) {
  const key = payload.notebookId ? `notebook_${payload.notebookId}` : 'inbox';
  chrome.storage.local.get([key], (result) => {
    const list = result[key] || [];
    list.push(payload);
    chrome.storage.local.set({ [key]: list });
  });

  try {
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon48.png',
      title: 'Source Captured!',
      message: `Added "${payload.title}" to ${payload.notebookTitle || 'your Inbox'}.`,
      priority: 2
    });
  } catch (e) {}
}

function handleFetchNotebooks(sendResponse: (r: any) => void) {
  chrome.storage.local.get(['notebooks'], (result) => {
    const notebooks = result.notebooks || [
      { id: 'default', title: 'My First Notebook', emoji: '📓' },
      { id: 'research', title: 'Research Lab', emoji: '🔬' }
    ];
    sendResponse({ success: true, data: { notebooks } });
  });
}

function handleCreateNotebook(payload: any, sendResponse: (r: any) => void) {
  const newNb = {
    id: Math.random().toString(36).substring(7),
    title: payload.title,
    emoji: '📁'
  };
  chrome.storage.local.get(['notebooks'], (result) => {
    const notebooks = result.notebooks || [];
    notebooks.push(newNb);
    chrome.storage.local.set({ notebooks }, () => {
      sendResponse({ success: true, data: newNb });
    });
  });
}
