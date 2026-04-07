/**
 * Utility to check if the extension context is still valid.
 * When an extension reloads, the content script's context is invalidated.
 */
export const isContextValid = (): boolean => {
  try {
    // Accessing a runtime property will throw if context is invalidated
    return typeof chrome !== 'undefined' && 
           !!chrome.runtime && 
           !!chrome.runtime.id;
  } catch (e) {
    return false;
  }
};

/**
 * Checks if an error is a "context invalidated" error.
 */
export const isContextInvalidatedError = (err: any): boolean => {
  const msg = (err?.message || String(err) || '').toLowerCase();
  return msg.includes('context invalidated') || 
         msg.includes('extension context invalidated') ||
         msg.includes('could not establish connection'); // Often happens on reload
};

/**
 * Executes a callback only if the context is valid.
 */
export const guard = <T, F>(callback: () => T, fallback: F): T | F => {
  if (isContextValid()) {
    try {
      return callback();
    } catch (e) {
      if (!isContextInvalidatedError(e)) {
        console.log('[bridgeX] Guarded call failed (safe to ignore if reloading):', e);
      }
      return fallback;
    }
  }
  return fallback;
};

/**
 * Version tracking for script instances in the same page.
 * We want only the LATEST instance to be active.
 */
export const registerScriptInstance = (): string => {
  const win = window as any;
  const newId = Math.random().toString(36).substring(2, 11);
  win.__bridgeX_INSTANCE_ID__ = newId;
  return newId;
};

export const isCurrentInstance = (instanceId: string): boolean => {
  return (window as any).__bridgeX_INSTANCE_ID__ === instanceId;
};

/**
 * Safe wrapper for chrome.runtime.getURL.
 * Prevents throwing errors during React render cycles.
 */
export const getSafeRuntimeURL = (path: string): string => {
  if (isContextValid()) {
    try {
      return chrome.runtime.getURL(path);
    } catch (e) {
      // Quiet fail on reload
    }
  }
  return '';
};

/**
 * Executes a callback only if the context is valid.
 * Returns the result of the callback or a fallback value.
 */
export const safeChromeCall = <T>(callback: () => Promise<T>, fallback: T): Promise<T> => {
  if (!isContextValid()) return Promise.resolve(fallback);
  try {
    return callback().catch(err => {
      if (isContextInvalidatedError(err)) return fallback;
      throw err;
    });
  } catch (err) {
    if (isContextInvalidatedError(err)) return Promise.resolve(fallback);
    throw err;
  }
};

/**
 * Simple debounce utility to prevent performance-heavy functions 
 * from firing too frequently during rapid DOM changes.
 */
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => {
      func(...args);
    }, wait);
  };
};

/**
 * Silences the 'Extension context invalidated' error globally 
 * for this content script session.
 */
export const setupGlobalErrorFilter = () => {
  if (typeof window === 'undefined') return;

  const handleUncaught = (event: ErrorEvent | PromiseRejectionEvent) => {
    const error = 'reason' in event ? event.reason : event.error;
    if (isContextInvalidatedError(error)) {
      // Logic: If it's a context invalidation error, it's a harmless result of an extension reload.
      // We prevent the default browser behavior (logging to console/extensions page).
      event.preventDefault();
      event.stopPropagation();
      console.log('[bridgeX] Context invalidated (suppressed harmless reload error)');
    }
  };

  window.addEventListener('error', handleUncaught, true);
  window.addEventListener('unhandledrejection', handleUncaught, true);
  
  console.log('[bridgeX] Global context error filter active');
};


