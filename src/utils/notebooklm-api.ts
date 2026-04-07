const NOTEBOOKLM_BASE = 'https://notebooklm.google.com';
const BATCH_EXECUTE_URL = `${NOTEBOOKLM_BASE}/_/LabsTailwindUi/data/batchexecute`;

let cachedTokens: { atToken: string, blToken: string, fSid: string, authuser: string } | null = null;
let lastTokenFetch = 0;
const TOKEN_TTL = 30 * 60 * 1000; // 30 minutes

// Page-context token bridge: tokens received from notebooklmNetworkHookPage.js
let pageContextTokens: { atToken: string | null, blToken: string, fSid: string } = { atToken: null, blToken: '', fSid: '' };

// Listen for tokens posted from page context hook
if (typeof window !== 'undefined') {
  window.addEventListener('message', (event) => {
    if (event.source !== window) return;
    if (event.data?.type === 'BRIDGEX_WIZ_TOKENS' && event.data.tokens?.atToken) {
      pageContextTokens = event.data.tokens;
      console.log('[bridgeX] Received WIZ tokens from page context bridge');
      // Invalidate cache so next getTokens() picks up fresh page tokens
      lastTokenFetch = 0;
    }
  });
}

function checkContext() {
  if (typeof chrome === "undefined" || !chrome.runtime?.id) {
    throw new Error("Extension updated. Please refresh the page to continue.");
  }
  try {
    // Attempt to access a property that will throw if context is invalidated
    chrome.runtime.getURL("");
  } catch (e: any) {
    if (e.message && e.message.includes("context invalidated")) {
      throw new Error("Extension context updated. Please refresh the page to continue.");
    }
    throw e;
  }
}

/**
 * Request tokens from the page context hook via postMessage.
 * Returns a promise that resolves with tokens or rejects after timeout.
 */
function requestTokensFromPageContext(timeoutMs: number = 3000): Promise<{ atToken: string, blToken: string, fSid: string }> {
  return new Promise((resolve, reject) => {
    const requestId = 'tok_' + Date.now();
    const timer = setTimeout(() => {
      window.removeEventListener('message', handler);
      reject(new Error('Page context token request timed out'));
    }, timeoutMs);

    function handler(event: MessageEvent) {
      if (event.source !== window) return;
      if (event.data?.type === 'BRIDGEX_WIZ_TOKENS' && event.data.tokens?.atToken) {
        clearTimeout(timer);
        window.removeEventListener('message', handler);
        pageContextTokens = event.data.tokens;
        resolve(event.data.tokens);
      }
    }

    window.addEventListener('message', handler);
    window.postMessage({ type: 'BRIDGEX_REQUEST_TOKENS', requestId }, '*');
  });
}

export async function getTokens(force: boolean = false, authuserOverride?: string): Promise<{ atToken: string, blToken: string, fSid: string, authuser: string }> {
  checkContext();
  if (!force && cachedTokens && (Date.now() - lastTokenFetch < TOKEN_TTL)) {
    return cachedTokens!;
  }

  // Determine authuser from current URL or override
  let authuser = authuserOverride || "0";
  if (!authuserOverride && typeof window !== 'undefined' && window.location) {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.has("authuser")) {
        authuser = urlParams.get("authuser") || "0";
      }
    } catch (e) { /* background context — no window.location */ }
  }

  // Strategy 1: Use tokens already received from page context
  if (pageContextTokens.atToken) {
    console.log('[bridgeX] Using cached page context tokens (fast path)');
    cachedTokens = { atToken: pageContextTokens.atToken, blToken: pageContextTokens.blToken, fSid: pageContextTokens.fSid, authuser };
    lastTokenFetch = Date.now();
    return cachedTokens;
  }

  // Strategy 2: Request tokens from page context via postMessage bridge
  if (typeof window !== 'undefined') {
    try {
      console.log('[bridgeX] Requesting tokens from page context bridge...');
      const tokens = await requestTokensFromPageContext(3000);
      console.log('[bridgeX] Tokens received from page context bridge');
      cachedTokens = { atToken: tokens.atToken, blToken: tokens.blToken, fSid: tokens.fSid, authuser };
      lastTokenFetch = Date.now();
      return cachedTokens;
    } catch (e) {
      console.warn('[bridgeX] Page context bridge failed:', (e as Error).message);
    }
  }

  // Strategy 3: Fetch homepage and parse (last resort)
  try {
    console.log("[bridgeX] Falling back to homepage fetch for tokens...");
    const res = await fetch(NOTEBOOKLM_BASE, { credentials: 'include' });
    const html = await res.text();
    
    const atToken = html.match(/"SNlM0e":"([^"]+)"/)?.[1];
    const blToken = html.match(/"cfb2h":"([^"]+)"/)?.[1] || html.match(/"bl":"([^"]+)"/)?.[1] || "";
    const fSid = html.match(/"FdrF9e":"([^"]+)"/)?.[1] || "";

    if (atToken) {
      console.log(`[bridgeX] Token sync successful via fetch (authuser: ${authuser})`);
    } else {
      console.error("[bridgeX] HTML did not contain SNlM0e. Length:", html.length);
      throw new Error("Unable to find 'SNlM0e' token. Please ensure you are logged into NotebookLM.");
    }
    
    cachedTokens = { atToken, blToken, fSid, authuser };
    lastTokenFetch = Date.now();
    return cachedTokens;
  } catch (err) {
    console.error("[bridgeX] All token extraction strategies failed:", err);
    throw err;
  }
}


async function parseBatchChunks(res: Response): Promise<any[]> {
    const text = await res.text();
    const cleanText = text.replace(/^\)\]\}\'/, "").trim();
    
    // If it's still using the [LENGTH]\n[CONTENT] format (fallback)
    if (/^\d+\r?\n/.test(cleanText)) {
        const blocks: any[] = [];
        const lines = cleanText.split('\n');
        let currentBlock = "";
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (/^\d+$/.test(line)) continue;
            try {
                if (line.startsWith('[')) blocks.push(JSON.parse(line));
            } catch (e) {}
        }
        if (blocks.length > 0) return blocks;
    }

    // Default: Return as a single JSON block
    try {
        const data = JSON.parse(cleanText);
        return Array.isArray(data) ? [data] : [];
    } catch (e) {
        console.warn("[bridgeX] Failed to parse unified JSON", e);
        return [];
    }
}

export async function addSourceToNotebook(notebookId: string, title: string, content: string) {
  const { atToken, blToken, fSid, authuser } = await getTokens();
  const rpcid = "izAoDd";
  
  // Clean content to avoid potential API issues with weird characters
  const cleanContent = content.replace(/\u0000/g, ''); 

  const payload = [
    [
      rpcid,
      JSON.stringify([
        [
          [
            null,
            [title || "Pasted text", cleanContent],
            null,
            2,
            null,
            null,
            null,
            null,
            null,
            null,
            1
          ]
        ],
        notebookId,
        [2],
        [1, null, null, null, null, null, null, null, null, null, [1]]
      ]),
      null,
      "generic"
    ]
  ];

  const fReq = JSON.stringify([payload]);
  const body = new URLSearchParams();
  body.append("f.req", fReq);
  body.append("at", atToken);

  const params = new URLSearchParams({
    rpcids: rpcid,
    "source-path": `/notebook/${notebookId}`,
    bl: blToken,
    "f.sid": fSid,
    hl: "en",
    _reqid: String(Math.floor(Math.random() * 100000) + 1000),
        authuser: authuser
  });

  const res = await fetch(`${BATCH_EXECUTE_URL}?${params.toString()}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8"
    },
    body: body,
    credentials: "include"
  });

  if (!res.ok) {
    throw new Error(`NotebookLM API Error: ${res.status}`);
  }

  const dataBlocks = await parseBatchChunks(res);
  
  // Verify success in the weird response body of Google's batchexecute
  // If we got valid data blocks, it's usually a success.
  if (dataBlocks.length === 0) {
     throw new Error("NotebookLM rejected the upload or returned an empty response.");
  }
  
  return dataBlocks;
}

export async function fetchNotebookSources(notebookId: string) {
  const { atToken, blToken, fSid, authuser } = await getTokens();
  const rpcid = "rLM1Ne"; // RPC for fetching sources
  
  const payload = [
    [
      rpcid,
      JSON.stringify([notebookId, null, [2]]),
      null,
      "generic"
    ]
  ];

  const fReq = JSON.stringify([payload]);
  const body = new URLSearchParams();
  body.append("f.req", fReq);
  body.append("at", atToken);

  const params = new URLSearchParams({
    rpcids: rpcid,
    "source-path": `/notebook/${notebookId}`,
    bl: blToken,
    "f.sid": fSid,
    hl: "en",
    _reqid: String(Math.floor(Math.random() * 100000) + 1000),
        authuser: authuser
  });

  const res = await fetch(`${BATCH_EXECUTE_URL}?${params.toString()}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8"
    },
    body: body,
    credentials: "include"
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch sources: ${res.status}`);
  }

  const dataBlocks = await parseBatchChunks(res);
  return dataBlocks;
}

/**
 * Uploads a file to NotebookLM using the "Scotty" resumable upload protocol.
 * This is the same protocol used by the native "Add source" web UI.
 */
export async function uploadFileToNotebook(file: File, notebookId: string): Promise<void> {
  console.log(`[bridgeX] Binary upload starting: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`);

  const { atToken, authuser } = await getTokens();

  // --- Phase 0: Pre-registration (o4cbdc RPC) ---
  console.log("[bridgeX] Phase 0: Pre-registering file with o4cbdc...");
  const rpcid = "o4cbdc";
  
  // The structure expected by o4cbdc for file initiation
  const innerPayload = JSON.stringify([
    [[file.name]], 
    notebookId, 
    [2], 
    [1, null, null, null, null, null, null, null, null, null, [1]]
  ]);
  
  const fReq = JSON.stringify([[[rpcid, innerPayload, null, "generic"]]]);
  
  const params = new URLSearchParams({
    rpcids: rpcid,
    "source-path": `/notebook/${notebookId}`,
    hl: "en",
  });

  const body = new URLSearchParams();
  body.append("f.req", fReq);
  body.append("at", atToken);

  const preRegRes = await fetch(`${BATCH_EXECUTE_URL}?${params.toString()}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
      "X-Same-Domain": "1",
    },
    body: body.toString(),
    credentials: "include",
  });

  if (!preRegRes.ok) {
    throw new Error(`Pre-registration failed (${preRegRes.status})`);
  }

  const dataBlocks = await parseBatchChunks(preRegRes);

  // Extract the generated Source ID (UUID) from the response
  let sourceId = "";
  try {
    for (const data of dataBlocks) {
      // Find the 'wrb.fr' response for our rpcid
      const rpcRes = data.find((item: any) => Array.isArray(item) && item[0] === "wrb.fr" && item[1] === rpcid);
      if (rpcRes && rpcRes[2]) {
        const parsedInner = JSON.parse(rpcRes[2]);
        // The Source ID is typically at [0][0][0][0] in the inner response
        sourceId = parsedInner?.[0]?.[0]?.[0]?.[0];
        if (sourceId) break;
      }
    }
  } catch (err) {
    console.warn("[bridgeX] Phase 0 JSON parse failed:", err);
  }

  // Fallback: Use regex search on the raw blocks if JSON path changed
  if (!sourceId) {
    const rawChunksStr = JSON.stringify(dataBlocks);
    const uuidMatch = rawChunksStr.match(/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/);
    if (uuidMatch) sourceId = uuidMatch[0];
  }

  if (!sourceId) {
    console.error("[bridgeX] Phase 0 failed. Response:", JSON.stringify(dataBlocks));
    throw new Error("Google NotebookLM did not issue a Source ID. Try refreshing or signing in again.");
  }

  console.log(`[bridgeX] Phase 0 success. Source ID: ${sourceId}`);

  // --- Phase 1: Scotty Handshake ---
  console.log("[bridgeX] Phase 1: Initiating Scotty Handshake...");
  const handshakeUrl = `${NOTEBOOKLM_BASE}/upload/_/?authuser=${authuser}`;
  
  const metadata = {
    PROJECT_ID: notebookId,
    SOURCE_NAME: file.name,
    SOURCE_ID: sourceId,
  };

  const handshakeRes = await fetch(handshakeUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
      "X-Goog-Upload-Command": "start",
      "X-Goog-Upload-Protocol": "resumable",
      "X-Goog-Upload-Header-Content-Length": String(file.size),
      "X-Goog-AuthUser": authuser,
    },
    body: JSON.stringify({ 
      PROJECT_ID: notebookId, 
      SOURCE_NAME: file.name, 
      SOURCE_ID: sourceId,
      SOURCE_TYPE: "MD"
    }),
    credentials: "include",
  });

  if (!handshakeRes.ok) {
    const errorBody = await handshakeRes.text();
    throw new Error(`Scotty Handshake failed: ${handshakeRes.status} ${errorBody}`);
  }

  const uploadUrl = handshakeRes.headers.get("X-Goog-Upload-URL");
  if (!uploadUrl) {
    throw new Error("No upload URL returned from Scotty handshake.");
  }

  console.log("[bridgeX] Phase 1 success. Upload URL acquired.");

  // --- Phase 2: Binary Upload Phase ---
  console.log("[bridgeX] Phase 2: Uploading binary data...");
  const fileData = await file.arrayBuffer();

  const uploadRes = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded;charset=utf-8",
      "X-Goog-Upload-Command": "upload, finalize",
      "X-Goog-Upload-Offset": "0",
    },
    body: fileData,
    credentials: "include",
  });

  if (!uploadRes.ok) {
    const errorBody = await uploadRes.text();
    throw new Error(`Binary upload failed: ${uploadRes.status} ${errorBody}`);
  }

  console.log(`[bridgeX] Phase 2 success. File "${file.name}" uploaded successfully!`);
}

/**
 * Fetches the raw text content of a source using the hizoJc generic document endpoint.
 * Bypasses UI entirely.
 */
export async function fetchSourceDocument(notebookId: string, sourceId: string): Promise<string> {
  const { atToken, blToken, fSid, authuser } = await getTokens();
  const rpcid = "hizoJc";
  
  // Outer layer is the typical batchexecute [ [rpcid, innerJSON, null, "generic"] ]
  // The innerJSON from user inspection is: [["source-id"], [2], [2]]
  const innerPayload = JSON.stringify([
    [sourceId],
    [2],
    [2]
  ]);

  const payload = [
    [
      rpcid,
      innerPayload,
      null,
      "generic"
    ]
  ];

  const fReq = JSON.stringify([payload]);
  const body = new URLSearchParams();
  body.append("f.req", fReq);
  body.append("at", atToken);

  const params = new URLSearchParams({
    rpcids: rpcid,
    "source-path": `/notebook/${notebookId}`,
    bl: blToken,
    "f.sid": fSid,
    hl: "en",
    _reqid: String(Math.floor(Math.random() * 100000) + 1000),
        authuser: authuser
  });

  const res = await fetch(`${BATCH_EXECUTE_URL}?${params.toString()}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8"
    },
    body: body,
    credentials: "include"
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch document: ${res.status}`);
  }

  const dataBlocks = await parseBatchChunks(res);
  
  // Recursively extract all strings longer than 100 chars, usually the text chunks.
  // Then we combine them. The largest string is the full document.
  let largestString = '';
  
  try {
    for (const data of dataBlocks) {
      const rpcRes = data.find((item: any) => Array.isArray(item) && item[0] === "wrb.fr" && item[1] === rpcid);
      if (rpcRes && rpcRes[2]) {
        const parsedInner = JSON.parse(rpcRes[2]);
        
        const extractLargestString = (obj: any): string => {
          let localLargest = '';
          if (typeof obj === 'string') {
            return obj;
          } else if (Array.isArray(obj)) {
            for (const item of obj) {
              const str = extractLargestString(item);
              if (str.length > localLargest.length) {
                localLargest = str;
              }
            }
          }
          return localLargest;
        };
        
        const chunkLargest = extractLargestString(parsedInner);
        if (chunkLargest.length > largestString.length) {
            largestString = chunkLargest;
        }
        
        // If the document is broken into chunks in nested arrays instead of one monolith:
        // Let's also build a combined string fallback in case the text is chopped.
        const gatherAllText = (obj: any): string[] => {
           let strings: string[] = [];
           if (typeof obj === 'string') strings.push(obj);
           else if (Array.isArray(obj)) {
              for (const item of obj) strings = strings.concat(gatherAllText(item));
           }
           return strings;
        };
        const allStrings = gatherAllText(parsedInner);
        const massiveStringCandidates = allStrings.filter(s => s.length > 500);
        
        if (massiveStringCandidates.length > 1) {
           // It might be chunked!
           largestString = massiveStringCandidates.join('\n\n');
        }
      }
    }
  } catch (err) {
    console.error("[bridgeX] Fallback parsing string", err);
  }

  if (largestString.length < 50) {
      throw new Error("Could not extract enough text from NotebookLM's backend.");
  }
  return largestString;
}

/**
 * Deletes multiple sources from a notebook using the internal rpcid "tGMBJ".
 * This bypasses the UI and confirmation modals.
 */
export async function deleteNotebookSources(notebookId: string, sourceIds: string[]) {
  const { atToken, blToken, fSid, authuser } = await getTokens();
  const rpcid = "tGMBJ";
  
  const results = [];
  
  for (const sourceId of sourceIds) {
    const payload = [
      [
        rpcid,
        JSON.stringify([[[sourceId]], [2]]),
        null,
        "generic"
      ]
    ];

    const fReq = JSON.stringify([payload]);
    const body = new URLSearchParams();
    body.append("f.req", fReq);
    body.append("at", atToken);

    const params = new URLSearchParams({
      rpcids: rpcid,
      "source-path": `/notebook/${notebookId}`,
      bl: blToken,
      "f.sid": fSid,
      hl: "en",
      _reqid: String(Math.floor(Math.random() * 100000) + 1000),
            authuser: authuser
    });

    const res = await fetch(`${BATCH_EXECUTE_URL}?${params.toString()}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8"
      },
      body: body,
      credentials: "include"
    });

    if (!res.ok) {
      console.error(`[bridgeX] Failed to delete source ${sourceId}:`, res.status);
      results.push({ id: sourceId, success: false });
    } else {
      const dataBlocks = await parseBatchChunks(res);
      results.push({ id: sourceId, success: dataBlocks.length > 0 });
    }
  }
  
  return results;
}
/**
 * Fetches the user's list of notebooks from NotebookLM using the wXbhsf RPC.
 * Aligned with Kortex reverse-engineered implementation for maximum reliability.
 */
export async function listNotebooks(sourcePath: string = "/", authuserOverride?: string): Promise<{ id: string, name: string, sourceCount?: number, emoji?: string }[]> {
  const { atToken, blToken, authuser } = await getTokens(false, authuserOverride);
  const rpcid = "wXbhsf";
  
  // Native Inner Payload: [null, 1, null, [2]]
  const innerPayload = JSON.stringify([null, 1, null, [2]]);
  
  // Native Wrapped Payload: [[["rpcid", "innerPayload", null, "generic"]]]
  // Note: f.req expects a triple-nested structure for batch execution
  const payload = [[ [rpcid, innerPayload, null, "generic"] ]];
  const fReq = JSON.stringify(payload);
  
  const body = new URLSearchParams();
  body.append("f.req", fReq);
  body.append("at", atToken);

  const params = new URLSearchParams({
    rpcids: rpcid,
    "source-path": sourcePath,
    bl: blToken,
    hl: "en",
    _reqid: String(Math.floor(Math.random() * 1000000)),
        authuser: authuser
  });  console.log(`[bridgeX] Native Sync (authuser: ${authuser})...`);
  const res = await fetch(`${BATCH_EXECUTE_URL}?${params.toString()}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
    body: body,
    credentials: "include"
  });

  if (!res.ok) throw new Error(`Native list failed: ${res.status}`);

  const notebooks: { id: string, name: string, sourceCount?: number, emoji?: string }[] = [];
  const seenIds = new Set<string>();

  try {
    const dataBlocks = await parseBatchChunks(res);
    console.log(`[bridgeX] Received ${dataBlocks.length} data blocks for notebook list.`);
    
    for (const data of dataBlocks) {
      if (!Array.isArray(data)) {
        console.warn('[bridgeX] Data block is not an array:', typeof data);
        continue;
      }

      // Expected structure for wXbhsf: [index, ["wrb.fr", "rpcid", "inner_result_json", ...]]
      data.forEach((envelope: any, idx: number) => {
        if (Array.isArray(envelope) && envelope[0] === "wrb.fr" && envelope[1] === rpcid && envelope[2]) {
          let inner: any;
          try {
            inner = JSON.parse(envelope[2]);
          } catch (e) {
            console.error(`[bridgeX] Failed to parse inner RPC payload in block ${idx}`, e);
            return;
          }

          // NotebookLM list parsing
          let rawList: any[] = [];
          if (Array.isArray(inner)) {
            if (inner.length > 0 && Array.isArray(inner[0]) && typeof inner[0][0] === 'string') {
               // Nested list structure: [ ["Name", [...], "ID", "Emoji"], ... ]
               rawList = inner[0];
            } else if (inner.length > 0 && typeof inner[0] === 'string') {
               rawList = inner; // Flat array structure
            } else if (Array.isArray(inner[0]) && Array.isArray(inner[0][0])) {
               rawList = inner[0][0]; // Deeply nested structure
            }
          }

          if (rawList.length === 0) {
             console.warn('[bridgeX] Inner payload parsed but yielded empty list. Structure:', JSON.stringify(inner).substring(0, 500));
          } else {
             console.log(`[bridgeX] Found ${rawList.length} potential items in inner payload.`);
          }

          rawList.forEach((item: any) => {
            if (Array.isArray(item) && item.length >= 3) {
              const name = String(item[0] || 'Untitled Notebook');
              const id = String(item[2] || '');
              const sourceCount = Array.isArray(item[1]) ? item[1].length : 0;
              
              if (id && id.length >= 5 && !seenIds.has(id)) {
                // Ignore raw metadata rows that look like CSV strings
                if (name.includes(',') && name.length > 100) {
                  console.log('[bridgeX] Skipping malformed metadata string found in RPC block.');
                  return;
                }
                
                notebooks.push({
                  id,
                  name,
                  sourceCount,
                  emoji: String(item[3] || '📖')
                });
                seenIds.add(id);
              }
            }
          });
        }
      });
    }
  } catch (err) {
    console.error("[bridgeX] Native parsing failed profoundly:", err);
  }

  // 3. Brute Force Fallback (Permissive) - uses text fallback
  if (notebooks.length === 0) {
    // If the binary parser failed to find notebooks, it might be due to a change in envelope structure.
    // We'll perform a final brute force regex search on the textual content if needed.
    // Note: We can't reuse 'res' as it's already consumed by arrayBuffer() in parseBatchChunks.
    // This is why we usually rely on parseBatchChunks being robust.
    console.log("[bridgeX] JSON block did not contain notebook list (expected).");
  }

  console.log(`[bridgeX] Native Sync Complete: ${notebooks.length} found.`);
  return notebooks;
}
