/**
 * This script is injected directly into the NotebookLM page context.
 * It overrides fetch and XHR to monitor specific RPC IDs used by Google's batchexecute.
 * It captures the wXbhsf notebook list response and posts it to the content script.
 * It also extracts WIZ session tokens and posts them to the content script.
 */
(function() {
  const RPC_IDS = {
    LIST_NOTEBOOKS: 'wXbhsf',
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

  // Post tokens on load
  setTimeout(() => {
    const tokens = extractWIZTokens();
    if (tokens.atToken) {
      window.postMessage({ type: 'BRIDGEX_WIZ_TOKENS', tokens }, '*');
      console.log('[bridgeX] WIZ tokens extracted and posted.');
    }
  }, 1000);

  // Listen for token requests from content script
  window.addEventListener('message', (event) => {
    if (event.source !== window) return;
    if (event.data && event.data.type === 'BRIDGEX_REQUEST_TOKENS') {
      const tokens = extractWIZTokens();
      window.postMessage({ type: 'BRIDGEX_WIZ_TOKENS', tokens, requestId: event.data.requestId }, '*');
    }
    // Handle manual notebook list request from content script
    if (event.data && event.data.type === 'BRIDGEX_REQUEST_NOTEBOOK_LIST') {
      triggerNotebookListFetch();
    }
  });

  // --- Notebook List RPC Trigger ---
  // Makes the wXbhsf call using the page's own fetch (fully authenticated)
  async function triggerNotebookListFetch() {
    console.log('[bridgeX] Page hook: triggering wXbhsf RPC...');
    const tokens = extractWIZTokens();
    if (!tokens.atToken) {
      console.error('[bridgeX] Page hook: no atToken available for RPC');
      window.postMessage({ type: 'BRIDGEX_NOTEBOOK_LIST', notebooks: [], error: 'No auth token' }, '*');
      return;
    }

    try {
      const rpcid = 'wXbhsf';
      const innerPayload = JSON.stringify([null, 1, null, [2]]);
      const payload = [[[rpcid, innerPayload, null, "generic"]]];
      const fReq = JSON.stringify(payload);

      const body = new URLSearchParams();
      body.append('f.req', fReq);
      body.append('at', tokens.atToken);

      const urlParams = new URLSearchParams(window.location.search);
      const authuser = urlParams.get('authuser') || '0';

      const params = new URLSearchParams({
        rpcids: rpcid,
        'source-path': '/',
        bl: tokens.blToken || '',
        hl: 'en',
        _reqid: String(Math.floor(Math.random() * 1000000)),
        rt: 'c',
        authuser: authuser
      });

      const batchUrl = 'https://notebooklm.google.com/_/LabsTailwindUi/data/batchexecute?' + params.toString();

      // Use the original (non-hooked) fetch to avoid recursion
      const res = await originalFetch(batchUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
        body: body,
        credentials: 'include'
      });

      if (!res.ok) {
        throw new Error('RPC failed: ' + res.status);
      }

      const text = await res.text();
      const notebooks = parseWXbhsfResponse(text, rpcid);
      console.log('[bridgeX] Page hook: wXbhsf returned ' + notebooks.length + ' notebooks');
      window.postMessage({ type: 'BRIDGEX_NOTEBOOK_LIST', notebooks }, '*');
    } catch (err) {
      console.error('[bridgeX] Page hook: wXbhsf RPC failed:', err);
      window.postMessage({ type: 'BRIDGEX_NOTEBOOK_LIST', notebooks: [], error: String(err) }, '*');
    }
  }

  // --- Parse the wXbhsf batchexecute response ---
  function parseWXbhsfResponse(text, rpcid) {
    const notebooks = [];
    const seenIds = new Set();

    try {
      // Standard Google batchexecute format: starts with )]}'
      // Then alternating: number\n[json]\n
      const cleaned = text.replace(/^\)\]\}'\s*\n?/, '');
      
      // Try to find the wrb.fr envelope for wXbhsf
      // The response has blocks separated by newlines with length prefixes
      const lines = cleaned.split('\n');
      
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('[')) continue;
        
        try {
          const data = JSON.parse(trimmed);
          
          // Walk through looking for ["wrb.fr", "wXbhsf", "inner_json", ...]
          function walkForEnvelope(arr) {
            if (!Array.isArray(arr)) return;
            
            if (arr[0] === 'wrb.fr' && arr[1] === rpcid && arr[2]) {
              try {
                const inner = JSON.parse(arr[2]);
                extractNotebooksFromInner(inner);
              } catch (e) {
                console.warn('[bridgeX] Failed to parse inner wXbhsf payload');
              }
              return;
            }
            
            for (const item of arr) {
              if (Array.isArray(item)) walkForEnvelope(item);
            }
          }
          
          walkForEnvelope(data);
        } catch (e) {
          // Not valid JSON, skip
        }
      }
    } catch (err) {
      console.error('[bridgeX] Response parsing error:', err);
    }

    // Brute force fallback: regex scan
    if (notebooks.length === 0) {
      console.log('[bridgeX] Structured parse found 0, trying brute force...');
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
      
      // The inner structure can be:
      // [ [notebook1], [notebook2], ... ] where notebook = ["Name", [sources], "ID", ...]
      // or [ [ [notebook1], [notebook2], ... ] ] (extra nesting)
      
      let candidates = inner;
      
      // Deeply unwrap to find the actual list of notebooks
      // Google sometimes nests them 2, 3 or even 4 times depending on workspace context
      while (candidates.length === 1 && Array.isArray(candidates[0])) {
        // If it's a notebook-like array already, don't unwrap further
        if (typeof candidates[0][0] === 'string' && candidates[0][2] && candidates[0][2].length > 5) break;
        candidates = candidates[0];
      }
      
      for (const item of candidates) {
        if (!Array.isArray(item)) continue;
        
        // A notebook entry should have: [name, sources_or_null, id, emoji, ...]
        // index 0: name, index 2: id, index 3: emoji (optional)
        if (item.length >= 3 && typeof item[0] === 'string' && typeof item[2] === 'string' && item[2].length > 5) {
          const name = item[0] || 'Untitled';
          const id = item[2];
          const sourceCount = Array.isArray(item[1]) ? item[1].length : 0;
          const emoji = (typeof item[3] === 'string' && item[3].length <= 4) ? item[3] : '📖';
          
          // Check for deletion/archive flags (usually at index 5 or 6 in newer proto formats)
          // For now, if item[6] is 1, it's often a sign of a deleted/hidden notebook in some contexts
          const isDeleted = item[6] === 1;
          
          if (id && !seenIds.has(id) && !isDeleted) {
            notebooks.push({ id, name, sourceCount, emoji });
            seenIds.add(id);
          }
        } else if (Array.isArray(item[0])) {
          // Recursive check for nested notebook lists (Workspaces sometimes do this)
          extractNotebooksFromInner(item);
        }
      }
    }

    return notebooks;
  }

  // --- Override Fetch (with response interception for wXbhsf) ---
  const originalFetch = window.fetch;
  window.fetch = async (...args) => {
    const response = await originalFetch(...args);
    const url = args[0] && typeof args[0] === 'string' ? args[0] : (args[0] && args[0].url ? args[0].url : '');

    if (url.includes('batchexecute')) {
      const options = args[1] || {};
      let detectedRpcId = null;

      if (options.body instanceof URLSearchParams) {
        const rpcids = options.body.get('rpcids');
        if (rpcids) {
          const ids = rpcids.split(',');
          Object.values(RPC_IDS).forEach(targetId => {
            if (ids.includes(targetId)) {
              console.log('[bridgeX] Hook detected fetch RPC: ' + targetId);
              detectedRpcId = targetId;
              window.postMessage({ type: 'NOTEBOOKLM_RPC_DETECTED', rpcId: targetId, timestamp: Date.now() }, '*');
            }
          });
        }
      }

      // If this is a wXbhsf call, intercept the response to get notebook list
      if (detectedRpcId === 'wXbhsf') {
        try {
          const cloned = response.clone();
          const text = await cloned.text();
          const notebooks = parseWXbhsfResponse(text, 'wXbhsf');
          if (notebooks.length > 0) {
            console.log('[bridgeX] Intercepted ' + notebooks.length + ' notebooks from native wXbhsf');
            window.postMessage({ type: 'BRIDGEX_NOTEBOOK_LIST', notebooks, source: 'intercept' }, '*');
          }
        } catch (e) {
          console.warn('[bridgeX] Failed to intercept wXbhsf response:', e);
        }
      }
    }
    return response;
  };

  // --- Override XHR ---
  const originalOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function(method, url) {
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
    return originalOpen.apply(this, arguments);
  };

  console.log('[bridgeX] Network hook v3.0 active (token bridge + notebook intercept).');
})();
