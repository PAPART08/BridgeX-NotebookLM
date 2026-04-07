import { isContextValid, isContextInvalidatedError } from './context';

export const dbRequest = (type: string, payload?: any): Promise<any> => {
  // If context is completely gone, don't even try - and don't log a scary error
  if (!isContextValid()) {
    return Promise.resolve(null);
  }

  return new Promise((resolve, reject) => {
    try {
      chrome.runtime.sendMessage(
        { target: 'offscreen-relay', type, payload },
        (messageResponse) => {
          const lastErr = chrome.runtime.lastError;
          if (lastErr) {
            if (isContextInvalidatedError(lastErr)) {
              console.warn(`[bridgeX] Context invalidated during ${type}, resolving null`);
              return resolve(null);
            }
            const errorMsg = lastErr.message || `Chrome runtime error during ${type}`;
            console.error(`[bridgeX] Runtime error during ${type}:`, errorMsg);
            return reject(new Error(errorMsg));
          }
          
          if (!messageResponse) {
            console.warn(`[bridgeX] No response from background for ${type}`);
            return resolve(null);
          }

          if (messageResponse.error) {
            const errorMsg = messageResponse.error || `Worker failure during ${type}`;
            console.error(`[bridgeX] Worker error during ${type}:`, errorMsg);
            return reject(new Error(errorMsg));
          }
          
          // Unwrap the response field from the worker
          resolve(messageResponse.response);
        }
      );
    } catch (err: any) {
      if (isContextInvalidatedError(err)) {
        resolve(null);
      } else {
        console.error(`[bridgeX] Send error during ${type}:`, err.message);
        reject(new Error(err.message || `Send error during ${type}`));
      }
    }
  });
};
