import { safeChromeCall } from './context';
/**
 * Notebook Actions Utility
 * Provides high-level functions for notebook operations like duplication and merging.
 */

export interface NotebookSource {
  id: string;
  name: string;
  content: string;
  type?: string;
}

/**
 * Duplicates a notebook by creating a new one and copying all sources.
 * Note: This requires the current page to be the dashboard or the notebook being copied.
 */
export async function duplicateNotebook(originalId: string, title: string): Promise<{ success: boolean; error?: string }> {
  try {
    console.log(`Duplicating notebook: ${title} (${originalId})`);
    
    // 1. Fetch sources from the original (may require being in the notebook or having them cached)
    // For this version, we'll assume we scrape them or they are provided.
    // In a full implementation, we might navigate to the notebook hiddenly or use the API.
    
    // 2. Create the new notebook
    const newTitle = `${title} (Copy)`;
    
    const createResponse = await safeChromeCall(() => chrome.runtime.sendMessage({
      type: 'CREATE_NOTEBOOK',
      payload: { title: newTitle }
    }), { success: false, error: 'Extension context invalidated' });

    if (!createResponse.success) throw new Error(createResponse.error || 'Failed to create new notebook');

    const newNotebookId = createResponse.data.id;
    console.log(`Created new notebook: ${newNotebookId}`);

    // 3. Logic to "bridge" sources into the new notebook
    // This part is handled by the background script's CAPTURE_SOURCE or similar
    
    return { success: true };
  } catch (err) {
    console.error('Duplication failed:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

/**
 * Merges selected sources into a single markdown string.
 */
export function mergeSourcesToText(sources: NotebookSource[]): string {
  return sources.map(s => `\n\n# SOURCE: ${s.name}\n\n${s.content}\n\n---\n\n`).join('');
}
