import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { StorageProvider } from '../../store';
import { isContextValid, registerScriptInstance, isCurrentInstance, isContextInvalidatedError } from '../../utils/context';
import '../../index.css';

const ID = 'bridgex-toolkit-root';
const PORTAL_ID = 'bridgex-modal-portal';
const instanceId = registerScriptInstance();
console.log(`[bridgeX] Starting instance: ${instanceId}`);

let initializing = false;
let currentShadowHost: HTMLElement | null = null;
let currentTheme: 'light' | 'dark' | null = null;

// ─── Theme Integration ──────────────────────────────────────────────────────

const THEME_DATA = {
  dark: {
    '--color-primary': '#D1A17B',
    '--color-primary-hover': '#C08F6A',
    '--bridgex-bg-main': 'rgba(18, 18, 20, 0.95)',
    '--bridgex-bg-solid': '#121214',
    '--bridgex-surface': 'rgba(255, 255, 255, 0.02)',
    '--bridgex-surface-hover': 'rgba(255, 255, 255, 0.04)',
    '--bridgex-border': 'rgba(255, 255, 255, 0.08)',
    '--bridgex-text-primary': '#F5F5F7',
    '--bridgex-text-secondary': '#A1A1AA',
    '--bridgex-glass-bg': 'rgba(28, 28, 30, 0.7)',
    '--bridgex-glass-border': 'rgba(255, 255, 255, 0.08)',
    '--bridgex-shadow': 'rgba(0, 0, 0, 0.6)',
    '--bridgex-input-bg': 'rgba(255, 255, 255, 0.03)',
    '--bridgex-backdrop': 'rgba(0, 0, 0, 0.8)',
  },
  light: {
    '--color-primary': '#D1A17B',
    '--color-primary-hover': '#C08F6A',
    '--bridgex-bg-main': 'rgba(255, 255, 255, 0.95)',
    '--bridgex-bg-solid': '#ffffff',
    '--bridgex-surface': 'rgba(0, 0, 0, 0.02)',
    '--bridgex-surface-hover': 'rgba(0, 0, 0, 0.04)',
    '--bridgex-border': 'rgba(0, 0, 0, 0.08)',
    '--bridgex-text-primary': '#1a1a1a',
    '--bridgex-text-secondary': '#5f6368',
    '--bridgex-glass-bg': 'rgba(255, 255, 255, 0.7)',
    '--bridgex-glass-border': 'rgba(0, 0, 0, 0.08)',
    '--bridgex-shadow': 'rgba(0, 0, 0, 0.1)',
    '--bridgex-input-bg': 'rgba(0, 0, 0, 0.03)',
    '--bridgex-backdrop': 'rgba(255, 255, 255, 0.6)',
  }
};

function applyTheme() {
  if (!isContextValid()) return;
  const theme = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  if (theme === currentTheme) return;
  
  currentTheme = theme;
  const vars = THEME_DATA[theme];
  const cssLines = Object.entries(vars).map(([k, v]) => `  ${k}: ${v} !important;`).join('\n');
  
  let globalStyle = document.getElementById('bridgex-global-theme');
  if (!globalStyle) {
    globalStyle = document.createElement('style');
    globalStyle.id = 'bridgex-global-theme';
    if (document.head) document.head.appendChild(globalStyle);
  }
  if (globalStyle) globalStyle.textContent = `:root { ${cssLines} }`;

  if (currentShadowHost && currentShadowHost.shadowRoot) {
    let shadowStyle = currentShadowHost.shadowRoot.getElementById('bridgex-shadow-theme');
    if (!shadowStyle) {
      shadowStyle = document.createElement('style');
      shadowStyle.id = 'bridgex-shadow-theme';
      currentShadowHost.shadowRoot.prepend(shadowStyle);
    }
    if (shadowStyle) shadowStyle.textContent = `:host { ${cssLines} }`;
  }
}

// ─── Global Styles ─────────────────────────────────────────────────────────

const injectGlobalStyles = () => {
    if (!document.getElementById('bridgex-head-styles')) {
        const style = document.createElement('style');
        style.id = 'bridgex-head-styles';
        style.textContent = `
          #${ID} {
            position: fixed !important;
            top: 0 !important;
            right: 0 !important;
            width: 0 !important;
            height: 0 !important;
            overflow: visible !important;
            margin: 0 !important;
            padding: 0 !important;
            z-index: 2147483647 !important;
            pointer-events: none !important;
            contain: layout !important;
          }
          #${PORTAL_ID} {
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            width: 0 !important;
            height: 0 !important;
            overflow: visible !important;
            z-index: 2147483647 !important;
            pointer-events: none !important;
          }
          #${PORTAL_ID} > * {
            pointer-events: auto !important;
          }
        `;
        document.head.appendChild(style);
    }
};

// ─── Infrastructure Persistence ───────────────────────────────────────────

const ensureInfrastructure = () => {
  if (!isContextValid()) return;
  
  // 1. Ensure Modal Portal
  let portal = document.getElementById(PORTAL_ID);
  if (!portal) {
    portal = document.createElement('div');
    portal.id = PORTAL_ID;
    document.body.appendChild(portal);
    console.log('[bridgeX] Portal recreated.');
  } else if (portal.parentNode !== document.body) {
    document.body.appendChild(portal);
    console.log('[bridgeX] Portal recovered.');
  }

  // 2. Ensure Sidebar Root
  const root = document.getElementById(ID);
  if (!root && !initializing) {
    init();
  } else if (root && root.parentNode !== document.body) {
    document.body.appendChild(root);
    console.log('[bridgeX] Sidebar root recovered.');
  }
};

// ─── Network Hook ────────────────────────────────────────────────────────
// Network hook is now registered as a main-world content script in manifest.json
// No DOM script injection needed — bypasses page CSP entirely.

window.addEventListener('message', (event) => {
    if (event.source !== window) return;
    if (event.data?.type === 'NOTEBOOKLM_RPC_DETECTED') {
        const { rpcId } = event.data;
        console.log(`[bridgeX] RPC Detected in page context: ${rpcId}`);
        // No action needed here — syncWithNotebookLM handles notebook sync
        // directly through the page context postMessage bridge.
    }
});

// ─── Background Relay Handler ────────────────────────────────────────────────
// The background service worker can't call NotebookLM APIs directly (no cookies).
// It relays requests here, and we forward them through the page context hook.
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'RELAY_NOTEBOOK_LIST_REQUEST') {
        const timeout = setTimeout(() => {
            window.removeEventListener('message', handler);
            sendResponse({ success: false, error: 'Notebook list relay timed out (8s)' });
        }, 8000);

        function handler(event: MessageEvent) {
            if (event.source !== window) return;
            if (event.data?.type === 'BRIDGEX_NOTEBOOK_LIST') {
                clearTimeout(timeout);
                window.removeEventListener('message', handler);
                if (event.data.error) {
                    sendResponse({ success: false, error: event.data.error });
                } else {
                    sendResponse({ success: true, notebooks: event.data.notebooks || [] });
                }
            }
        }

        window.addEventListener('message', handler);
        window.postMessage({ type: 'BRIDGEX_REQUEST_NOTEBOOK_LIST' }, '*');
        return true; // Keep channel open for async response
    }
});

const observer = new MutationObserver(() => {
    if (document.body.getAttribute('data-bridgex-cleanup') === 'true') return;
    ensureInfrastructure();
});

// ─── Initialization ───────────────────────────────────────────────────────

function init() {
  if (!isContextValid() || initializing || document.getElementById(ID)) return;
  initializing = true;

  console.log('[bridgeX] Initializing UI...');
  try {
    injectGlobalStyles();

    
    const root = document.createElement('div');
    root.id = ID;
    currentShadowHost = root;

    const shadow = root.attachShadow({ mode: 'open' });
    const shadowRoot = document.createElement('div');
    shadowRoot.id = 'bridgex-shadow-root';
    shadow.appendChild(shadowRoot);

    applyTheme();

    const style = document.createElement('style');
    style.textContent = `
      #bridgex-shadow-root {
        position: fixed; top: 0; right: 0; height: 100vh; width: auto;
        z-index: 2147483647; pointer-events: auto; display: flex;
        font-family: 'Inter', system-ui, -apple-system, sans-serif;
      }
      .bridgex-tab {
        position: fixed; right: 0; top: 50%; transform: translateY(-50%);
        width: 4px; height: 60px; background: var(--color-primary);
        border-radius: 4px 0 0 4px; cursor: pointer; z-index: 2147483647;
        box-shadow: -2px 0 10px rgba(0,0,0,0.5); transition: width 0.2s; pointer-events: auto;
      }
      .bridgex-tab:hover { width: 12px; }
    `;
    shadow.appendChild(style);

    const tab = document.createElement('div');
    tab.className = 'bridgex-tab';
    tab.onclick = () => { if (isContextValid()) init(); }; 
    shadow.appendChild(tab);

    document.body.appendChild(root);

    ReactDOM.createRoot(shadowRoot).render(
      <React.StrictMode>
        <StorageProvider>
          <App />
        </StorageProvider>
      </React.StrictMode>
    );

    // Start watching body after first injection
    observer.observe(document.body, { childList: true });

  } catch (err) {
    if (!isContextInvalidatedError(err)) console.error('[bridgeX] Init failed:', err);
  } finally {
    initializing = false;
  }
}

// ─── Startup ────────────────────────────────────────────────────────────────

if (typeof window !== 'undefined') {
  if (isContextValid()) {
    applyTheme();
    window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', applyTheme);

    
    // Initial injection
    if (document.readyState === 'complete') {
        setTimeout(init, 500);
    } else {
        window.addEventListener('load', () => setTimeout(init, 500));
    }

    // Backup Heartbeat
    setInterval(() => {
      if (!isContextValid()) return;
      if (!isCurrentInstance(instanceId)) return;
      ensureInfrastructure();
    }, 2500);
  }
}
