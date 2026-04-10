/** 
 * PIERCER: Recursively scans all shadowRoots on the page to find elements 
 * matching a selector, even if encapsulated by Web Components.
 */
export function deepQuerySelectorAll(selector: string, root: Element | Document | ShadowRoot = document): Element[] {
  let found = Array.from(root.querySelectorAll(selector));
  const allElements = root.querySelectorAll('*');
  
  for (const el of Array.from(allElements)) {
    if (el.shadowRoot) {
      found = found.concat(deepQuerySelectorAll(selector, el.shadowRoot));
    }
  }
  return found;
}

export function cleanSourceName(text: string) {
  if (!text) return "";
  return text
    .replace(/^Source:\s*/i, '') // Remove "Source:" prefix
    .replace(/check_box_outline_blank|check_box|check|done|radio_button_unchecked|description|article|picture_as_pdf|goog_icon/gi, '')
    .replace(/\.(pdf|epub|txt|docx|md|html|csv|json|xml|pptx|xlsx)$/i, "") // Remove common extensions
    .replace(/[\.…]+$/, "")                        // Remove trailing dots/ellipses
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .trim();
}

// ─── Shared Checkbox Helpers ──────────────────────────────────────────────────

/** Check if a mat-checkbox element is in the "checked" state. */
export function isCheckboxChecked(el: Element): boolean {
  // The element might be mat-checkbox or an inner wrapper — handle both
  const matCb = el.tagName === 'MAT-CHECKBOX' ? el : el.closest('mat-checkbox') || el;
  const nativeInput = matCb.querySelector('input[type="checkbox"]') as HTMLInputElement | null;
  return matCb.classList.contains('mat-mdc-checkbox-checked') || 
         matCb.classList.contains('mdc-checkbox--selected') ||
         matCb.getAttribute('aria-checked') === 'true' ||
         !!(nativeInput && nativeInput.checked);
}

/**
 * Click a checkbox to toggle it. Tries MULTIPLE strategies because
 * Angular Material MDC checkboxes can be finicky about which element
 * actually triggers the change detection.
 */
export function clickCheckbox(el: Element): void {
  // Resolve to the mat-checkbox component element if possible
  const matCb = el.tagName === 'MAT-CHECKBOX' ? el : el.closest('mat-checkbox') || el;

  // Strategy 1: Click the native <input type="checkbox"> directly
  // This is the most reliable because browsers natively handle input clicks
  const input = matCb.querySelector('input[type="checkbox"]') as HTMLInputElement | null;
  if (input) {
    input.click();
    return;
  }

  // Strategy 2: Dispatch a real MouseEvent on the mat-checkbox element
  // This simulates a genuine user click with proper event properties
  if (matCb.tagName === 'MAT-CHECKBOX') {
    const rect = (matCb as HTMLElement).getBoundingClientRect();
    matCb.dispatchEvent(new MouseEvent('click', {
      bubbles: true, cancelable: true, view: window,
      clientX: rect.left + rect.width / 2,
      clientY: rect.top + rect.height / 2
    }));
    return;
  }

  // Strategy 3: Click the label (for= association)
  const label = matCb.querySelector('label');
  if (label) {
    (label as HTMLElement).click();
    return;
  }

  // Strategy 4: Click the element directly as a last resort
  (matCb as HTMLElement).click();
}

/** 
 * Walk up from a source's more-button to find its parent item container
 * and the mat-checkbox within that container.
 * IMPORTANT: We search for 'mat-checkbox' tag ONLY — not inner .mdc-checkbox 
 * class — to ensure we get the Angular component element.
 */
function findSourceItemParts(btn: Element): { container: Element | null, checkbox: Element | null, id: string } {
  const id = btn.id.replace('source-item-more-button-', '');
  let item = btn.parentElement;
  let cb = null as Element | null;
  while (item && item !== document.body) {
    // Search for mat-checkbox FIRST (Angular component), then fallback selectors
    cb = item.querySelector('mat-checkbox');
    if (!cb) cb = item.querySelector('[role="checkbox"]');
    if (!cb) cb = item.querySelector('input[type="checkbox"]');
    if (cb) break;
    item = item.parentElement;
  }
  return { container: item, checkbox: cb, id };
}

/** Get the cleaned display name for a source row. */
function getSourceDisplayName(container: Element | null): string {
  if (!container) return '';
  const titleBtn = container.querySelector('button.source-stretched-button, [aria-label*="Source:"]');
  return cleanSourceName(titleBtn?.getAttribute('aria-label') || titleBtn?.textContent || '');
}

/** Check if a source matches a group — checks ID first, then falls back to fuzzy name matching. */
export function isSourceGroupMember(
  sourceId: string, 
  sourceName: string, 
  groupSourceIds: string[] | undefined, 
  groupSourceNames: string[],
  apiTitle?: string
): boolean {
  // 1. Try ID match first (Fastest & Most reliable)
  if (sourceId && groupSourceIds && groupSourceIds.length > 0) {
    if (groupSourceIds.includes(sourceId)) return true;
  }

  // 2. Fall back to Fuzzy Name matching
  if (!groupSourceNames || groupSourceNames.length === 0) return false;

  const domNorm = cleanSourceName(sourceName);
  const apiNorm = apiTitle ? cleanSourceName(apiTitle) : domNorm;
  
  if (!domNorm && !apiNorm) return false;

  return groupSourceNames.some(storedName => {
    const storedNorm = cleanSourceName(storedName);
    if (!storedNorm || storedNorm.length < 2) return false;

    // A. Exact match (Highly Reliable)
    if (storedNorm === domNorm || storedNorm === apiNorm) return true;

    // B. Prefix/Substring match (handles "Truncation Virus")
    // We use a safe threshold (7 chars) to avoid "The Holy Bible" matching "The Holy Grail"
    const threshold = 7;
    const storedClean = storedNorm.replace(/\.\.\./g, '').trim();
    
    if (storedClean.length >= threshold) {
      // B1. Stored name is a prefix of DOM/API name
      if (domNorm.startsWith(storedClean) || apiNorm.startsWith(storedClean)) return true;
      
      // B2. DOM/API name is a prefix of Stored name (handles early DOM truncation)
      if (domNorm.length >= threshold && storedClean.startsWith(domNorm)) return true;
      if (apiNorm.length >= threshold && storedClean.startsWith(apiNorm)) return true;
      
      // B3. Snippet match (first 20 chars)
      const snippet = storedClean.substring(0, 20);
      if (snippet.length >= 15) {
        if (domNorm.includes(snippet) || apiNorm.includes(snippet)) return true;
      }
    }

    return false;
  });
}

// ─── Active Source Info ───────────────────────────────────────────────────────

export function getActiveSourceInfo(): { names: string[], ids: string[] } {
  const names = new Set<string>();
  const ids = new Set<string>();
  
  try {
    const moreBtns = deepQuerySelectorAll('button[id^="source-item-more-button-"]');
    moreBtns.forEach(btn => {
      const { container, checkbox, id } = findSourceItemParts(btn);
      if (!checkbox) return;

      if (isCheckboxChecked(checkbox)) {
        ids.add(id);
        const name = getSourceDisplayName(container);
        if (name && !name.toLowerCase().includes('select all')) {
          names.add(name);
        }
      }
    });
  } catch(e) {
    console.error("Error getting active source info:", e);
  }
  
  return { names: Array.from(names), ids: Array.from(ids) };
}

// ─── All DOM Source Info ─────────────────────────────────────────────────────

/**
 * Get ALL source items in the DOM (both checked and unchecked).
 * Returns { id, name }[] for every source visible in the sidebar.
 */
export function getAllDomSourceInfo(): { id: string, name: string }[] {
  const sources: { id: string, name: string }[] = [];
  
  try {
    const moreBtns = deepQuerySelectorAll('button[id^="source-item-more-button-"]');
    moreBtns.forEach(btn => {
      const { container, id } = findSourceItemParts(btn);
      if (!id || !container) return;
      
      const name = getSourceDisplayName(container);
      if (name && !name.toLowerCase().includes('select all')) {
        sources.push({ id, name });
      }
    });
  } catch(e) {
    console.error("Error getting all DOM source info:", e);
  }
  
  return sources;
}

// ─── Focus Mode Helpers ──────────────────────────────────────────────────────

/**
 * Fetch the source list from NotebookLM's backend via the page context hook.
 * Uses rLM1Ne RPC — fully authenticated, no DOM scraping needed.
 * Returns { id, title }[] for all sources in the notebook.
 */
export function fetchSourceListViaHook(notebookId: string, timeoutMs: number = 8000): Promise<{ id: string, title: string }[]> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      window.removeEventListener('message', handler);
      reject(new Error('Source list request timed out'));
    }, timeoutMs);

    function handler(event: MessageEvent) {
      if (event.source !== window) return;
      if (event.data?.type === 'BRIDGEX_SOURCE_LIST') {
        clearTimeout(timer);
        window.removeEventListener('message', handler);
        if (event.data.error) {
          reject(new Error(event.data.error));
        } else {
          console.log(`[bridgeX] fetchSourceListViaHook: Received ${event.data.sources?.length || 0} sources from rLM1Ne`);
          resolve(event.data.sources || []);
        }
      }
    }

    window.addEventListener('message', handler);
    window.postMessage({ type: 'BRIDGEX_REQUEST_SOURCE_LIST', notebookId }, '*');
  });
}

export interface SourceGroupLike {
  sourceNames: string[];
  sourceIds?: string[];
}

/**
 * ID-STRICT FOCUS: Iterates ALL sources and matches strictly on IDs.
 * Bypasses all name-matching failures by using a pre-resolved set of Target IDs.
 */
export function focusGroupSources(targetIds: Set<string>): { toggled: number, matched: number } {
  let toggled = 0;
  let matched = 0;
  let noCheckboxCount = 0;

  try {
    const moreBtns = deepQuerySelectorAll('button[id^="source-item-more-button-"]');
    console.log(`[bridgeX] 🎯 RPC-First Focus: Toggling DOM items based on ${targetIds.size} target IDs`);

    if (moreBtns.length === 0) {
      console.warn('[bridgeX] ⛔ NO source buttons found!');
      return { toggled: 0, matched: 0 };
    }

    moreBtns.forEach((btn, index) => {
      const { container, checkbox, id } = findSourceItemParts(btn);
      if (!checkbox || !container || !id) {
        noCheckboxCount++;
        return;
      }

      const isTarget = targetIds.has(id);
      const isChecked = isCheckboxChecked(checkbox);

      if (isTarget) matched++;

      // Force state to match target
      if (isChecked !== isTarget) {
        clickCheckbox(checkbox);
        toggled++;

        // Visual feedback
        const feedbackEl = (checkbox.tagName === 'MAT-CHECKBOX' ? checkbox : checkbox.closest('mat-checkbox') || checkbox) as HTMLElement;
        const color = isTarget ? '#4caf50' : '#f44336';
        feedbackEl.style.boxShadow = `0 0 12px ${color}`;
        feedbackEl.style.transition = 'box-shadow 0.3s';
        setTimeout(() => { if (feedbackEl) feedbackEl.style.boxShadow = ''; }, 800);
      }
    });

    console.log(`[bridgeX] 🏁 Focus Result: Found ${matched}/${targetIds.size} targets, toggled ${toggled} items.`);
  } catch (e) {
    console.error('[bridgeX] focusGroupSources error:', e);
  }

  return { toggled, matched };
}

/**
 * Uncheck ALL sources — used when clearing focus.
 */
export function unfocusAllSources(): number {
  let unchecked = 0;
  try {
    const moreBtns = deepQuerySelectorAll('button[id^="source-item-more-button-"]');
    moreBtns.forEach(btn => {
      const { checkbox } = findSourceItemParts(btn);
      if (checkbox && isCheckboxChecked(checkbox)) {
        clickCheckbox(checkbox);
        unchecked++;
      }
    });
    console.log(`[bridgeX] unfocusAllSources: Unchecked ${unchecked} sources`);
  } catch (e) {
    console.error('[bridgeX] unfocusAllSources error:', e);
  }
  return unchecked;
}

/**
 * Verify the DOM matches the expected state for a group.
 */
export function verifySourceState(group: SourceGroupLike): { 
  matches: boolean, 
  checkedCount: number, 
  expectedCount: number, 
  mismatches: string[] 
} {
  const mismatches: string[] = [];
  let checkedCount = 0;
  const expectedCount = (group.sourceIds && group.sourceIds.length > 0) 
    ? group.sourceIds.length 
    : group.sourceNames.length;

  try {
    const moreBtns = deepQuerySelectorAll('button[id^="source-item-more-button-"]');
    moreBtns.forEach(btn => {
      const { container, checkbox, id } = findSourceItemParts(btn);
      if (!checkbox || !container) return;

      const name = getSourceDisplayName(container);
      const isMember = isSourceGroupMember(id, name, group.sourceIds, group.sourceNames);
      const isChecked = isCheckboxChecked(checkbox);

      if (isMember && isChecked) {
        checkedCount++;
      } else if (isMember && !isChecked) {
        mismatches.push(`MISSING: "${name.substring(0, 40)}" should be checked`);
      } else if (!isMember && isChecked) {
        mismatches.push(`EXTRA: "${name.substring(0, 40)}" should NOT be checked`);
      }
    });
  } catch (e) {
    console.error('[bridgeX] verifySourceState error:', e);
  }

  return {
    matches: mismatches.length === 0 && checkedCount === expectedCount,
    checkedCount,
    expectedCount,
    mismatches
  };
}
