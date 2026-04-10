/**
 * This script is injected directly into the NotebookLM page context.
 * It overrides fetch and XHR to monitor specific RPC IDs used by Google's batchexecute.
 * It captures the wXbhsf notebook list response and posts it to the content script.
 * It also extracts WIZ session tokens and posts them to the content script.
 */
(function() {
  // Capture the native fetch and XHR early to avoid recursion or overrides
  const originalFetch = window.fetch;
  const originalXHR = window.XMLHttpRequest;
  
  console.log('[bridgeX] Network hook v3.2 active (XHR triggers + token bridge).');

  const RPC_IDS = {
    LIST_NOTEBOOKS: 'wXbhsf',
    LIST_SOURCES: 'rLM1Ne',
    NOTEBOOK_REFRESH: 'VUsiyb',
    ADD_SOURCE: 'izAoDd',
    DELETE_SOURCE: 'tGMBJ',
    SYNC_SOURCE: 'FLmJqe'
  };

  // --- Token Extraction ---
  function extractWIZTokens() {
    let atToken = null, blToken = '', fSid = '';
    try {
      if (window.WIZ_global_data) {
        atToken = window.WIZ_global_data.SNlM0e || null;
        blToken = window.WIZ_global_data.cfb2h || '';
        fSid = window.WIZ_global_data.FdrF9e || '';
      }
    } catch (e) {}

    if (!atToken) {
      try {
        const scripts = document.querySelectorAll('script');
        for (const script of scripts) {
          const text = script.textContent || '';
          if (text.includes('SNlM0e')) {
            atToken = (text.match(/"SNlM0e":"([^"]+)"/) || [])[1] || null;
            blToken = (text.match(/"cfb2h":"([^"]+)"/) || [])[1] || '';
            fSid = (text.match(/"FdrF9e":"([^"]+)"/) || [])[1] || '';
            if (atToken) break;
          }
        }
      } catch (e) {}
    }

    if (!atToken) {
      try {
        const html = document.documentElement.innerHTML;
        atToken = (html.match(/"SNlM0e"\s*:\s*"([^"]+)"/) || [])[1] || null;
        blToken = (html.match(/"cfb2h"\s*:\s*"([^"]+)"/) || [])[1] || '';
        fSid = (html.match(/"FdrF9e"\s*:\s*"([^"]+)"/) || [])[1] || '';
      } catch (e) {}
    }

    return { atToken, blToken, fSid };
  }

  // --- Manual RPC Trigger via XHR ---
  // Using XMLHttpRequest for manual triggers is often more resilient to page-level fetch hooks or CSP quirks.
  function triggerRPCViaXHR(rpcid, innerPayload, rpcParams, onResponse, onError) {
    try {
      const payload = [[[rpcid, innerPayload, null, "generic"]]];
      const fReq = JSON.stringify(payload);
      const tokens = extractWIZTokens();

      if (!tokens.atToken) {
        return onError('No auth token available. Please refresh the page.');
      }

      const params = new URLSearchParams(rpcParams);
      params.append('rpcids', rpcid);
      params.append('bl', tokens.blToken || '');
      params.append('f.sid', tokens.fSid || '');
      params.append('hl', 'en');
      params.append('_reqid', String(Math.floor(Math.random() * 1000000)));
      params.append('rt', 'c');

      // Use strictly relative URL for same-origin stability
      const url = '/_/LabsTailwindUi/data/batchexecute?' + params.toString();
      const body = 'f.req=' + encodeURIComponent(fReq) + '&at=' + encodeURIComponent(tokens.atToken);

      console.log(`[bridgeX] Sending manual ${rpcid} RPC via XHR...`);

      const xhr = new originalXHR();
      xhr.open('POST', url, true);
      xhr.setRequestHeader('X-Same-Domain', '1');
      xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded;charset=UTF-8');
      xhr.withCredentials = true;

      xhr.onload = function() {
        if (xhr.status >= 200 && xhr.status < 300) {
          onResponse(xhr.responseText);
        } else {
          onError('RPC failed with status: ' + xhr.status);
        }
      };

      xhr.onerror = function() {
        onError('XHR Network Error');
      };

      xhr.send(body);
    } catch (err) {
      console.error('[bridgeX] XHR triggering error:', err);
      onError(String(err));
    }
  }

  // --- Notebook List Trigger ---
  function triggerNotebookListFetch() {
    const innerPayload = JSON.stringify([null, 1, null, [2]]);
    const rpcParams = { 'source-path': '/' };

    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('authuser')) rpcParams.authuser = urlParams.get('authuser');

    triggerRPCViaXHR('wXbhsf', innerPayload, rpcParams, 
      (text) => {
        const notebooks = parseWXbhsfResponse(text, 'wXbhsf');
        console.log('[bridgeX] XHR: wXbhsf returned ' + notebooks.length + ' notebooks');
        window.postMessage({ type: 'BRIDGEX_NOTEBOOK_LIST', notebooks }, '*');
      },
      (err) => {
        console.error('[bridgeX] XHR: wXbhsf RPC failed:', err);
        window.postMessage({ type: 'BRIDGEX_NOTEBOOK_LIST', notebooks: [], error: err }, '*');
      }
    );
  }

  // --- Source List Trigger ---
  function triggerSourceListFetch(notebookId) {
    if (!notebookId) return;

    const innerPayload = JSON.stringify([notebookId, null, [2]]);
    const rpcParams = { 'source-path': '/notebook/' + notebookId };

    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('authuser')) rpcParams.authuser = urlParams.get('authuser');

    triggerRPCViaXHR('rLM1Ne', innerPayload, rpcParams,
      (text) => {
        const sources = parseRLM1NeResponse(text, 'rLM1Ne', notebookId);
        console.log('[bridgeX] XHR: rLM1Ne returned ' + sources.length + ' sources');
        window.postMessage({ type: 'BRIDGEX_SOURCE_LIST', sources: sources, notebookId: notebookId }, '*');
      },
      (err) => {
        console.error('[bridgeX] XHR: rLM1Ne RPC failed:', err);
        window.postMessage({ type: 'BRIDGEX_SOURCE_LIST', sources: [], error: err }, '*');
      }
    );
  }

  // --- Parse Functions (preserved from v3.1) ---
  function parseWXbhsfResponse(text, rpcid) {
    const notebooks = [];
    const seenIds = new Set();
    try {
      const cleaned = text.replace(/^\)\]\}'\s*\n?/, '');
      const lines = cleaned.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('[')) continue;
        try {
          const data = JSON.parse(trimmed);
          function walkForEnvelope(arr) {
            if (!Array.isArray(arr)) return;
            if (arr[0] === 'wrb.fr' && arr[1] === rpcid && arr[2]) {
              try {
                const inner = JSON.parse(arr[2]);
                extractNotebooksFromInner(inner);
              } catch (e) {}
              return;
            }
            for (const item of arr) if (Array.isArray(item)) walkForEnvelope(item);
          }
          walkForEnvelope(data);
        } catch (e) {}
      }
    } catch (err) {}

    if (notebooks.length === 0) {
      const regex = /\["([^"\]]{2,128})",\s*(?:null|\[[^\]]*?\]),\s*"([a-zA-Z0-9\-_]{5,100})"/gi;
      let match;
      while ((match = regex.exec(text)) !== null) {
        const name = match[1];
        const id = match[2];
        if (id && !seenIds.has(id) && name !== 'generic' && name !== 'wrb.fr') {
          notebooks.push({ id, name, emoji: '📖' });
          seenIds.add(id);
        }
      }
    }

    function extractNotebooksFromInner(inner) {
      if (!Array.isArray(inner)) return;
      let candidates = inner;
      while (candidates.length === 1 && Array.isArray(candidates[0])) {
        if (typeof candidates[0][0] === 'string' && candidates[0][2] && candidates[0][2].length > 5) break;
        candidates = candidates[0];
      }
      for (const item of candidates) {
        if (!Array.isArray(item)) continue;
        if (item.length >= 3 && typeof item[0] === 'string' && typeof item[2] === 'string' && item[2].length > 5) {
          const name = item[0] || 'Untitled';
          const id = item[2];
          const sourceCount = Array.isArray(item[1]) ? item[1].length : 0;
          const emoji = (typeof item[3] === 'string' && item[3].length <= 4) ? item[3] : '📖';
          if (id && !seenIds.has(id) && item[6] !== 1) {
            notebooks.push({ id, name, sourceCount, emoji });
            seenIds.add(id);
          }
        } else if (Array.isArray(item[0])) extractNotebooksFromInner(item);
      }
    }
    return notebooks;
  }

  function parseRLM1NeResponse(text, rpcid, notebookId) {
    const sources = [];
    const seenIds = new Set();
    try {
      const cleaned = text.replace(/^\)\]\}'\s*\n?/, '');
      const lines = cleaned.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const trimmed = lines[i].trim();
        if (!trimmed.startsWith('[')) continue;
        try {
          const data = JSON.parse(trimmed);
          function walkForSourceEnvelope(arr) {
            if (!Array.isArray(arr)) return;
            if (arr[0] === 'wrb.fr' && arr[1] === rpcid && arr[2]) {
              try {
                const inner = JSON.parse(arr[2]);
                extractSourcesFromInner(inner, notebookId);
              } catch (e) {}
              return;
            }
            for (let j = 0; j < arr.length; j++) if (Array.isArray(arr[j])) walkForSourceEnvelope(arr[j]);
          }
          walkForSourceEnvelope(data);
        } catch (e) {}
      }
    } catch (err) {}

    function extractSourcesFromInner(inner, notebookId) {
      if (!Array.isArray(inner)) return;
      let candidates = inner;
      while (candidates.length === 1 && Array.isArray(candidates[0])) {
        if (typeof candidates[0][0] === 'string' && candidates[0][0].length > 5) break;
        candidates = candidates[0];
      }
      for (let k = 0; k < candidates.length; k++) {
        const item = candidates[k];
        if (!Array.isArray(item)) continue;
        let id = null, title = null;
        if (typeof item[0] === 'string' && item[0].length > 8 && item[0].match(/^[a-f0-9\-]+$/i)) {
          if (item[0] !== notebookId) id = item[0];
        }
        if (!id && typeof item[2] === 'string' && item[2].length > 8 && item[2].match(/^[a-f0-9\-]+$/i)) {
          if (item[2] !== notebookId) id = item[2];
        }
        if (Array.isArray(item[1]) && typeof item[1][0] === 'string') title = item[1][0];
        else if (typeof item[1] === 'string' && item[1].length > 0) title = item[1];
        else if (typeof item[4] === 'string' && item[4].length > 0) title = item[4];

        if (id && !seenIds.has(id)) {
          sources.push({ id, title: title || 'Untitled Source' });
          seenIds.add(id);
        }
      }
      if (sources.length === 0) {
        for (let m = 0; m < candidates.length; m++) {
          if (Array.isArray(candidates[m]) && candidates[m].length > 2) extractSourcesFromInner(candidates[m], notebookId);
        }
      }
    }
    return sources;
  }

  // --- Global Listeners ---
  window.addEventListener('message', (event) => {
    if (event.source !== window) return;
    if (event.data && event.data.type === 'BRIDGEX_REQUEST_TOKENS') {
      const tokens = extractWIZTokens();
      window.postMessage({ type: 'BRIDGEX_WIZ_TOKENS', tokens, requestId: event.data.requestId }, '*');
    }
    if (event.data && event.data.type === 'BRIDGEX_REQUEST_NOTEBOOK_LIST') triggerNotebookListFetch();
    if (event.data && event.data.type === 'BRIDGEX_REQUEST_SOURCE_LIST') triggerSourceListFetch(event.data.notebookId);
  });

  // --- Network Overrides (Passive Monitoring) ---
  window.fetch = async (...args) => {
    const response = await originalFetch(...args);
    const url = args[0] && typeof args[0] === 'string' ? args[0] : (args[0] && args[0].url ? args[0].url : '');

    if (url.includes('batchexecute')) {
      const options = args[1] || {};
      let bodyText = '';
      if (options.body instanceof URLSearchParams) bodyText = options.body.toString();
      else if (typeof options.body === 'string') bodyText = options.body;

      if (bodyText) {
        const tempParams = new URLSearchParams(bodyText);
        const rpcids = tempParams.get('rpcids') || (new URLSearchParams(url.split('?')[1])).get('rpcids');
        if (rpcids) {
          const ids = rpcids.split(',');
          Object.values(RPC_IDS).forEach(targetId => {
            if (ids.includes(targetId)) {
              console.log('[bridgeX] Hook detected fetch RPC: ' + targetId);
              window.postMessage({ type: 'NOTEBOOKLM_RPC_DETECTED', rpcId: targetId, timestamp: Date.now() }, '*');
              
              if (targetId === 'wXbhsf') {
                try {
                  const cloned = response.clone();
                  cloned.text().then(text => {
                    const notebooks = parseWXbhsfResponse(text, 'wXbhsf');
                    if (notebooks.length > 0) {
                      console.log('[bridgeX] Intercepted ' + notebooks.length + ' notebooks from native fetch');
                      window.postMessage({ type: 'BRIDGEX_NOTEBOOK_LIST', notebooks, source: 'intercept' }, '*');
                    }
                  });
                } catch (e) {}
              }
            }
          });
        }
      }
    }
    return response;
  };

  const originalOpen = XMLHttpRequest.prototype.open;
  const originalSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function(method, url) {
    this._url = url;
    return originalOpen.apply(this, arguments);
  };

  XMLHttpRequest.prototype.send = function(body) {
    const url = this._url;
    if (typeof url === 'string' && url.includes('batchexecute')) {
      this.addEventListener('load', () => {
        const urlParams = new URLSearchParams(url.split('?')[1]);
        const rpcids = urlParams.get('rpcids');
        if (rpcids) {
          const ids = rpcids.split(',');
          Object.values(RPC_IDS).forEach(targetId => {
            if (ids.includes(targetId)) {
              console.log('[bridgeX] Hook detected XHR RPC: ' + targetId);
              window.postMessage({ type: 'NOTEBOOKLM_RPC_DETECTED', rpcId: targetId, timestamp: Date.now() }, '*');
            }
          });
        }
      });
    }
    return originalSend.apply(this, arguments);
  };
})();
