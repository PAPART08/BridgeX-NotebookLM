// listNotebooks is no longer called from the background — it's relayed through
// the content script's page-context hook which has proper authentication.

let creating: Promise<void> | null = null;

async function setupOffscreenDocument() {
  const path = 'src/offscreen/index.html';

  try {
    if (typeof chrome === 'undefined' || !chrome.offscreen) return;
    
    // Check if document already exists
    const hasDoc = await chrome.offscreen.hasDocument();
    
    if (!hasDoc) {
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
    }

    // Verify readiness via PING
    try {
      await chrome.runtime.sendMessage({ type: 'OFFSCREEN_PING', target: 'offscreen' });
    } catch (e) {
      console.warn('[bridgeX] Offscreen ping failed, re-creating document...');
      await chrome.offscreen.closeDocument().catch(() => {});
      creating = chrome.offscreen.createDocument({
        url: chrome.runtime.getURL(path),
        reasons: [chrome.offscreen.Reason.WORKERS],
        justification: 'Re-creating offscreen document after ping failure.'
      });
      await creating;
      creating = null;
    }
  } catch (e) {
    console.error('[bridgeX] Offscreen setup failed:', e);
    creating = null;
  }
}

// ─── Network Hook Injection (CSP-safe) ───────────────────────────────────────
// Uses chrome.scripting.executeScript with world: MAIN to bypass page CSP.
// This replaces the old DOM <script> injection which was blocked by NotebookLM's CSP.

async function injectNetworkHookIntoTab(tabId: number) {
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ['notebooklmNetworkHookPage.js'],
      world: 'MAIN' as any,
    });
    console.log(`[bridgeX] Network hook injected into tab ${tabId} via scripting API.`);
  } catch (err) {
    // Tab may have been closed or navigated away
    console.warn(`[bridgeX] Failed to inject network hook into tab ${tabId}:`, err);
  }
}

// ─── Listeners ───────────────────────────────────────────────────────────────

chrome.runtime.onInstalled.addListener(async () => {
  try {
    console.log('[bridgeX] Toolkit Installed');
    await setupOffscreenDocument();
    
    // Initialize minimal storage
    chrome.storage.local.get(['inbox'], (result) => {
      if (!result.inbox) {
        chrome.storage.local.set({ inbox: [] });
      }
    });

    // Inject network hook into any already-open NotebookLM tabs
    const tabs = await chrome.tabs.query({ url: 'https://notebooklm.google.com/*' });
    for (const tab of tabs) {
      if (tab.id) injectNetworkHookIntoTab(tab.id);
    }
  } catch (err) {
    console.error('[bridgeX] Installation setup failed:', err);
  }
});

// Inject network hook when navigating to NotebookLM
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (
    changeInfo.status === 'complete' &&
    tab.url?.startsWith('https://notebooklm.google.com/')
  ) {
    injectNetworkHookIntoTab(tabId);
  }
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
  } else if (message.type === 'EXECUTE_MAIN_WORLD_CLICKS') {
    handleExecuteMainWorldClicks(sender.tab?.id, message.payload, sendResponse);
    return true;
  } else if (message.type === 'REINJECT_NETWORK_HOOK') {
    // Content script detected the page context hook is unresponsive — re-inject it
    const tabId = sender.tab?.id;
    if (tabId) {
      console.log(`[bridgeX] Re-injecting network hook into tab ${tabId} (requested by content script)`);
      injectNetworkHookIntoTab(tabId);
    }
    sendResponse({ success: true });
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

    if (response && (response as any).error) {
      throw new Error((response as any).error);
    }

    sendResponse(response);
  } catch (err: any) {
    if (timer) clearTimeout(timer);
    const errorMsg = err.message || err;
    console.error('[bridgeX] Relay failed:', errorMsg);
    sendResponse({ error: errorMsg });
  }
}
// ...
async function handleFetchNotebookLMList(payload: any, sendResponse: (r: any) => void) {
  try {
    // The background service worker CANNOT fetch NotebookLM APIs directly —
    // it lacks the page's session cookies. Instead, relay through the active
    // NotebookLM tab's page-context hook which has full authentication.
    const tabs = await chrome.tabs.query({ url: 'https://notebooklm.google.com/*' });
    const activeTab = tabs.find(t => t.id);
    
    if (!activeTab?.id) {
      sendResponse({ success: false, error: 'No active NotebookLM tab found. Please open NotebookLM first.' });
      return;
    }

    // Ask the content script to relay through the page context hook
    chrome.tabs.sendMessage(activeTab.id, { 
      type: 'RELAY_NOTEBOOK_LIST_REQUEST' 
    }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('[bridgeX] Tab relay failed:', chrome.runtime.lastError.message);
        sendResponse({ success: false, error: chrome.runtime.lastError.message || 'Tab communication failed' });
        return;
      }
      sendResponse(response || { success: false, error: 'No response from content script' });
    });
  } catch (err: any) {
    console.error('[bridgeX] API Fetch failed in background:', err);
    sendResponse({ success: false, error: err.message || 'Unknown API error' });
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

function handleExecuteMainWorldClicks(tabId: number | undefined, payload: any, sendResponse: (r: any) => void) {
  if (!tabId) {
    sendResponse({ success: false, error: 'No tab ID' });
    return;
  }

  const clickerFn = (wantToSelect: boolean, sourceIds: string[], sourceNames: string[]) => {
    console.log('[bridgeX clicker] 🚀 Main World syncing started.', { wantToSelect, sourceIds, sourceNames });
    const moreBtns = document.querySelectorAll('button[id^="source-item-more-button-"]');
    console.log(`[bridgeX clicker] 🕵️ Found ${moreBtns.length} source items in the DOM.`);
    
    let clickCount = 0;

    moreBtns.forEach((btn, index) => {
      const id = btn.id.replace('source-item-more-button-', '');
      
      let container = btn.parentElement;
      while (container && !container.classList.contains('source-item-container')) {
        container = container.parentElement;
      }
      if (!container) return;

      const checkbox = container.querySelector('mat-checkbox');
      if (!checkbox) return;

      const titleNode = container.querySelector('.source-title');
      const text = titleNode ? (titleNode as HTMLElement).innerText : '';

      // Helper for robust matching in the main world
      const clean = (s: string) => s
        .replace(/^Source:\s*/i, '')
        .replace(/check_box_outline_blank|check_box|check|done|radio_button_unchecked|description|article|picture_as_pdf|goog_icon/gi, '')
        .replace(/\.(pdf|epub|txt|docx|md|html|csv|json|xml|pptx|xlsx)$/i, "")
        .replace(/[\.…]+$/, "")
        .replace(/\s+/g, ' ')
        .toLowerCase()
        .trim();

      let isGroupMember = false;
      if (id && sourceIds && sourceIds.length > 0) {
        isGroupMember = sourceIds.includes(id);
      } else {
        const domNorm = clean(text);
        isGroupMember = sourceNames.some(sn => {
          const storedNorm = clean(sn);
          if (!storedNorm || storedNorm.length < 2) return false;
          if (storedNorm === domNorm) return true;
          
          const threshold = 7;
          const storedClean = storedNorm.replace(/\.\.\./g, '').trim();
          if (storedClean.length >= threshold) {
            if (domNorm.startsWith(storedClean) || (domNorm.length >= threshold && storedClean.startsWith(domNorm))) return true;
          }
          return false;
        });
      }

      const nativeInput = checkbox.querySelector('input[type="checkbox"]') as HTMLInputElement;
      const isChecked = checkbox.classList.contains('mat-mdc-checkbox-checked') || 
                        checkbox.classList.contains('mdc-checkbox--selected') ||
                        checkbox.getAttribute('aria-selected') === 'true' ||
                        checkbox.getAttribute('aria-checked') === 'true' ||
                        (nativeInput && (nativeInput.checked || nativeInput.classList.contains('mdc-checkbox--selected')));

      let targetState = isChecked;
      if (wantToSelect) {
        targetState = isGroupMember; 
      } else if (isGroupMember) {
        targetState = false; 
      }

      if (isChecked !== targetState) {
         clickCount++;
         console.log(`[bridgeX clicker] 🔄 Toggling item [${index}]: "${text.substring(0,20)}..." | Should be: ${targetState}`);
         
         // Visual feedback directly in the page
         const color = targetState ? '#4caf50' : '#f44336';
         const originalShadow = (checkbox as HTMLElement).style.boxShadow;
         (checkbox as HTMLElement).style.boxShadow = `0 0 12px ${color}`;
         (checkbox as HTMLElement).style.transition = 'box-shadow 0.2s';
         setTimeout(() => { if (checkbox) (checkbox as HTMLElement).style.boxShadow = originalShadow; }, 800);

         // Dispatch a highly synthetic series of pointer and mouse events directly to the inner input
         const targetElements = [nativeInput, checkbox].filter(Boolean) as HTMLElement[];
         
         targetElements.forEach(el => {
             try {
                // To simulate a real interaction for strict UI frameworks
                el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, view: window }));
                el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window }));
                
                el.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, cancelable: true, view: window }));
                el.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true, view: window }));
                
                el.click();
             } catch(e) {}
         });
      }
    });
    
    console.log(`[bridgeX clicker] ✅ Sync complete. Issued ${clickCount} state changes.`);
  };

  chrome.scripting.executeScript({
    target: { tabId },
    world: 'MAIN',
    func: clickerFn,
    args: [payload.wantToSelect, payload.sourceIds || [], payload.sourceNames || []]
  }).then(() => {
    sendResponse({ success: true });
  }).catch((err: any) => {
    console.error('[bridgeX] Error executing main world clicks:', err);
    sendResponse({ success: false, error: err.toString() });
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
