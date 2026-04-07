// This script runs in the offscreen document
// Its only job is to host the SQLite Worker
// Use the SYNCHRONOUS wasm build — no Asyncify crashes
import wasmUrl from 'wa-sqlite/dist/wa-sqlite.wasm?url';

const worker = new Worker(new URL('./sqlite-worker.ts', import.meta.url), {
  type: 'module'
});

// INITIALIZE: Send the WASM URL to the worker (it doesn't have chrome access to get it itself)
worker.postMessage({ 
  type: 'INIT_WASM', 
  wasmUrl: chrome.runtime.getURL(wasmUrl.startsWith('/') ? wasmUrl.slice(1) : wasmUrl) 
});

// Relay messages between the extension (background) and the worker
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.target !== 'offscreen') return;

  // Use a unique ID for each request to match responses
  const requestId = Math.random().toString(36).substring(7);
  let timer: any;

  const handler = (event: any) => {
    if (event.data.requestId === requestId) {
      if (timer) clearTimeout(timer);
      worker.removeEventListener('message', handler);
      sendResponse(event.data);
    }
  };

  // Internal timeout to prevent leak if worker hangs
  timer = setTimeout(() => {
    worker.removeEventListener('message', handler);
    sendResponse({ error: 'Worker response timeout (8s)', requestId });
  }, 8000);

  worker.addEventListener('message', handler);
  worker.postMessage({ requestId, ...message });

  return true; // Keep the message channel open for async response
});

console.log('bridgeX SQLite Offscreen Host Initialized');
