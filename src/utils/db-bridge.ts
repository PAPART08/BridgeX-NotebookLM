import { isContextValid, isContextInvalidatedError } from './context';

const performRequest = (type: string, payload?: any): Promise<any> => {
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
            return reject(new Error(errorMsg));
          }
          
          if (!messageResponse) {
            console.warn(`[bridgeX] No response from background for ${type}`);
            return resolve(null);
          }

          if (messageResponse.error) {
            return reject(new Error(messageResponse.error));
          }
          
          resolve(messageResponse.response);
        }
      );
    } catch (err: any) {
      if (isContextInvalidatedError(err)) resolve(null);
      else reject(new Error(err.message || `Send error during ${type}`));
    }
  });
};

export const dbRequest = async (type: string, payload?: any, retries = 2): Promise<any> => {
  if (!isContextValid()) return null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await performRequest(type, payload);
    } catch (err: any) {
      const isPortClosed = err.message?.includes('message port closed') || 
                           err.message?.includes('Could not establish connection');
      
      if (isPortClosed && attempt < retries) {
        console.warn(`[bridgeX] Port closed during ${type}, retrying (attempt ${attempt + 1}/${retries})...`);
        // Small delay to allow Service Worker / Offscreen to breathe
        await new Promise(r => setTimeout(r, 200 * (attempt + 1)));
        continue;
      }
      
      console.error(`[bridgeX] ${type} failed after ${attempt + 1} attempts:`, err.message);
      throw err;
    }
  }
};
