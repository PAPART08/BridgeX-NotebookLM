import React, { createContext, useContext, useEffect, useState } from 'react';
import { IFolder, INotebook, ITag, ISource, ISourceGroup } from './types';
import { dbRequest } from '../utils/db-bridge';
import { 
  isContextValid, 
  isContextInvalidatedError, 
  setupGlobalErrorFilter 
} from '../utils/context';
import { listNotebooks } from '../utils/notebooklm-api';

// Silence harmless context invalidation errors globally
setupGlobalErrorFilter();

interface StorageContextType {
  folders: IFolder[];
  tags: ITag[];
  inbox: ISource[];
  sourceGroups: ISourceGroup[];
  notebooks: INotebook[];
  sourceMappings: { [title: string]: string };
  addFolder: (name: string) => Promise<IFolder>;
  addNotebook: (name: string, folderId: string, notebookLMId?: string) => void;
  deleteNotebook: (id: string) => void;
  addTag: (name: string, color: string) => void;
  deleteFolder: (id: string) => void;
  bridgeNote: (note: ISource, notebookId: string) => void;
  assignSourceToFolder: (title: string, folderId: string) => void;
  addSourceGroup: (name: string, sourceNames: string[], notebookId?: string) => void;
  addToSourceGroup: (groupId: string, sourceName: string) => void;
  bulkAddSourcesToGroup: (groupId: string, sourceNames: string[]) => void;
  removeFromSourceGroup: (groupId: string, sourceName: string) => void;
  moveSourceBetweenGroups: (sourceName: string, fromGroupId: string, toGroupId: string) => void;
  deleteSourceGroup: (id: string) => void;
  reorderSourceGroups: (notebookId: string, newOrderedGroups: ISourceGroup[]) => Promise<void>;
  migrateLegacyGroups: (notebookId: string) => void;
  bulkAssignSourcesToFolder: (titles: string[], folderId: string) => void;
  notebookMappings: { [notebookId: string]: { folderId?: string, tagIds?: string[] } };
  assignNotebookToFolder: (notebookId: string, folderId: string | null) => void;
  toggleNotebookTag: (notebookId: string, tagId: string) => void;
  bulkAssignNotebooksToFolder: (notebookIds: string[], folderId: string | null, notebookMeta?: { [id: string]: { name: string, emoji?: string, sourceCount?: number } }) => void;
  setSelectedSourceGroupIds: (ids: string[]) => void;
  selectedNotebookIds: string[];
  toggleNotebookSelection: (id: string, isRange?: boolean) => void;
  clearNotebookSelection: () => void;
  selectedSourceGroupIds: string[];
  sourceSearchQuery: string;
  setSourceSearchQuery: (query: string) => void;
  repairData: () => Promise<void>;
  refreshData: () => Promise<void>;
  lastRefreshed: number;
  syncWithNotebookLM: () => Promise<void>;
  isSyncing: boolean;
}

const StorageContext = createContext<StorageContextType | undefined>(undefined);

// ─── Simple Deep Equality Helper ──────────────────────────────────────────────
const isEqual = (a: any, b: any) => JSON.stringify(a) === JSON.stringify(b);

export const StorageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [folders, setFolders] = useState<IFolder[]>([]);
  const [tags, setTags] = useState<ITag[]>([]);
  const [inbox, setInbox] = useState<ISource[]>([]);
  const [sourceGroups, setSourceGroups] = useState<ISourceGroup[]>([]);
  const [notebooks, setNotebooks] = useState<INotebook[]>([]);
  const [selectedSourceGroupIds, setSelectedSourceGroupIds] = useState<string[]>([]);
  const [selectedNotebookIds, setSelectedNotebookIds] = useState<string[]>([]);
  const [sourceMappings, setSourceMappings] = useState<{ [title: string]: string }>({});
  const [sourceSearchQuery, setSourceSearchQuery] = useState('');
  const [notebookMappings, setNotebookMappings] = useState<{ [notebookId: string]: { folderId?: string, tagIds?: string[] } }>({});
  const [lastRefreshed, setLastRefreshed] = useState(0);
  const [isSyncingState, setIsSyncingState] = useState(false);

  // Use refs to track the CURRENT state without triggering re-renders
  // This allows us to perform equality checks inside stable callbacks
  const stateRef = React.useRef({
    folders, tags, inbox, sourceGroups, notebooks, sourceMappings, notebookMappings
  });

  React.useEffect(() => {
    stateRef.current = { folders, tags, inbox, sourceGroups, notebooks, sourceMappings, notebookMappings };
  }, [folders, tags, inbox, sourceGroups, notebooks, sourceMappings, notebookMappings]);

  const migrationStarted = React.useRef(false);
  const isRefreshing = React.useRef(false);
  const isMounted = React.useRef(true);

  const refreshData = React.useCallback(async () => {
    // 1. Guard against overlapping calls
    if (isRefreshing.current) return;
    isRefreshing.current = true;

    try {
      // 2. Early exit if the extension context is gone
      if (!isContextValid()) {
        isRefreshing.current = false;
        return;
      }

      // 3. Parallel fetch from SQLite via bridge
      const dbPromise = Promise.all([
        dbRequest('GET_FOLDERS'),
        dbRequest('GET_NOTEBOOKS'),
        dbRequest('GET_TAGS'),
        dbRequest('GET_SOURCE_GROUPS')
      ]);
      const [f, n, t, sg] = await dbPromise.catch(err => {
        if (!isContextInvalidatedError(err)) {
          console.error('[bridgeX] Data fetch partially failed:', err);
        }
        return [null, null, null, null];
      });
      
      if (f === null || n === null || t === null || sg === null) {
        isRefreshing.current = false;
        return;
      }

      // 4. Fetch from chrome.storage.local (Inbox and Mappings)
      const res = await new Promise<any>((resolve) => {
        if (!isContextValid()) return resolve({});
        try {
          chrome.storage.local.get(['inbox', 'sourceMappings', 'notebookMappings'], resolve);
        } catch (e) {
          resolve({});
        }
      });

      // 5. Update State IF AND ONLY IF it has actually changed
      if (isMounted.current) {
        let changed = false;
        
        const newFolders = f || [];
        const newNotebooks = n || [];
        const newTags = t || [];
        const newInbox = res.inbox || [];
        const newSourceGroups = sg || [];
        const newSourceMappings = res.sourceMappings || {};
        const newNotebookMappings = res.notebookMappings || {};

        if (!isEqual(stateRef.current.folders, newFolders)) { setFolders(newFolders); changed = true; }
        if (!isEqual(stateRef.current.notebooks, newNotebooks)) { setNotebooks(newNotebooks); changed = true; }
        if (!isEqual(stateRef.current.tags, newTags)) { setTags(newTags); changed = true; }
        if (!isEqual(stateRef.current.inbox, newInbox)) { setInbox(newInbox); changed = true; }
        if (!isEqual(stateRef.current.sourceGroups, newSourceGroups)) { setSourceGroups(newSourceGroups); changed = true; }
        if (!isEqual(stateRef.current.sourceMappings, newSourceMappings)) { setSourceMappings(newSourceMappings); changed = true; }
        if (!isEqual(stateRef.current.notebookMappings, newNotebookMappings)) { setNotebookMappings(newNotebookMappings); changed = true; }

        if (changed) {
          setLastRefreshed(Date.now());
        }
      }

      // 6. One-time migration logic
      if (isContextValid() && !migrationStarted.current) {
        migrationStarted.current = true;
        chrome.storage.local.get(['sourceGroups', 'prompts'], async (result) => {
          let migratedAnything = false;
          try {
            if (sg.length === 0 && result.sourceGroups?.length > 0) {
              console.log('[bridgeX] Migrating groups...');
              for (const group of result.sourceGroups) await dbRequest('ADD_SOURCE_GROUP', group);
              migratedAnything = true;
            }
            if (migratedAnything && isMounted.current) {
              isRefreshing.current = false;
              refreshData();
            }
          } catch (e) {}
        });
      }
    } catch (err) {
      if (!isContextInvalidatedError(err)) console.error('[bridgeX] Refresh failed:', err);
    } finally {
      isRefreshing.current = false;
    }
  }, []);

  const assignSourceToFolder = React.useCallback((title: string, folderId: string) => {
    const updated = { ...sourceMappings, [title]: folderId };
    setSourceMappings(updated);
    if (!isContextValid()) return;
    try {
      chrome.storage.local.set({ sourceMappings: updated });
    } catch (e) {
      console.warn('[bridgeX] Failed to set storage - refresh may be required.');
    }
  }, [sourceMappings]);

  const bulkAssignSourcesToFolder = React.useCallback((titles: string[], folderId: string) => {
    const updated = { ...sourceMappings };
    titles.forEach(title => {
      updated[title] = folderId;
    });
    setSourceMappings(updated);
    if (!isContextValid()) return;
    try {
      chrome.storage.local.set({ sourceMappings: updated });
    } catch (e) {
      console.warn('[bridgeX] Failed to set storage - refresh may be required.');
    }
  }, [sourceMappings]);
  
  const assignNotebookToFolder = React.useCallback(async (notebookId: string, folderId: string | null) => {
    // 1. Update legacy mappings for component backwards-compatibility
    const current = notebookMappings[notebookId] || {};
    const updatedMappings = { 
      ...notebookMappings, 
      [notebookId]: { ...current, folderId: folderId || undefined } 
    };
    setNotebookMappings(updatedMappings);

    // 2. Update Master DB
    const notebook = stateRef.current.notebooks.find(n => n.id === notebookId || n.notebookLMId === notebookId);
    await dbRequest('UPDATE_NOTEBOOK', { 
      id: notebook?.id || notebookId, 
      notebookLMId: notebook?.notebookLMId || notebookId, 
      folderId: (folderId === 'root' || !folderId) ? null : folderId 
    });

    if (isContextValid()) {
      chrome.storage.local.set({ notebookMappings: updatedMappings });
    }
    await refreshData();
  }, [notebookMappings, refreshData]);

  const bulkAssignNotebooksToFolder = React.useCallback(async (notebookIds: string[], folderId: string | null, notebookMeta?: { [id: string]: { name: string, emoji?: string, sourceCount?: number } }) => {
    const resolvedFolderId = (folderId === 'root' || !folderId) ? null : folderId;
    const updatedMappings = { ...notebookMappings };
    
    console.log(`[bridgeX] Starting bulk assignment of ${notebookIds.length} notebooks to folder: ${resolvedFolderId || 'Unsorted'}`);

    for (const id of notebookIds) {
      // 1. Update legacy mappings for UI reactivity
      const current = updatedMappings[id] || {};
      updatedMappings[id] = { ...current, folderId: resolvedFolderId || undefined };

      // 2. Find the notebook in the local database
      const notebook = stateRef.current.notebooks.find(n => n.id === id || n.notebookLMId === id);
      
      if (notebook) {
        // Notebook exists in DB — update its folderId
        console.log(`[bridgeX] Updating existing notebook: "${notebook.name}" (${notebook.id}) -> folder: ${resolvedFolderId}`);
        await dbRequest('UPDATE_NOTEBOOK', { 
          id: notebook.id, 
          folderId: resolvedFolderId 
        });
      } else {
        // Notebook NOT in DB yet (fetched from Google API but never synced)
        const newLocalId = Math.random().toString(36).substr(2, 9);
        const meta = notebookMeta?.[id];
        const displayName = meta?.name || 'Notebook ' + id.substring(0, 8);
        console.log(`[bridgeX] Creating and assigning new notebook entry: "${displayName}" (${id}) -> folder: ${resolvedFolderId}`);
        await dbRequest('ADD_NOTEBOOK', {
          id: newLocalId,
          name: displayName,
          notebookLMId: id,
          folderId: resolvedFolderId,
          createdAt: Date.now()
        });
      }
    }

    setNotebookMappings(updatedMappings);
    if (isContextValid()) {
      chrome.storage.local.set({ notebookMappings: updatedMappings });
    }
    
    console.log('[bridgeX] Bulk assignment complete. Refreshing data...');
    await refreshData();
  }, [notebookMappings, refreshData]);

  const toggleNotebookTag = React.useCallback((notebookId: string, tagId: string) => {
    const current = notebookMappings[notebookId] || { tagIds: [] };
    const currentTags = current.tagIds || [];
    const updatedTags = currentTags.includes(tagId) 
      ? currentTags.filter(id => id !== tagId) 
      : [...currentTags, tagId];
    
    const updated = { 
      ...notebookMappings, 
      [notebookId]: { ...current, tagIds: updatedTags } 
    };
    setNotebookMappings(updated);
    if (isContextValid()) {
      chrome.storage.local.set({ notebookMappings: updated });
    }
  }, [notebookMappings]);

  const toggleNotebookSelection = React.useCallback((id: string) => {
    setSelectedNotebookIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  }, []);

  const clearNotebookSelection = React.useCallback(() => setSelectedNotebookIds([]), []);

  useEffect(() => {
    refreshData();

    // Still listen for inbox changes
    const listener = (changes: { [key: string]: chrome.storage.StorageChange }) => {
      if (changes.inbox) setInbox(changes.inbox.newValue);
    };
    
    if (!isContextValid()) return;

    try {
      chrome.storage.onChanged.addListener(listener);
    } catch (e) {}

    return () => {
      if (isContextValid()) {
        try {
          chrome.storage.onChanged.removeListener(listener);
        } catch (e) {}
      }
    };
  }, [refreshData]);

  const addFolder = React.useCallback(async (name: string) => {
    const newFolder: IFolder = {
      id: Math.random().toString(36).substr(2, 9),
      name,
      createdAt: Date.now(),
    };
    await dbRequest('ADD_FOLDER', newFolder);
    await refreshData();
    return newFolder;
  }, [refreshData]);

  const addNotebook = React.useCallback(async (name: string, folderId: string, notebookLMId?: string) => {
    const newNb: INotebook = {
      id: Math.random().toString(36).substr(2, 9),
      name,
      folderId,
      notebookLMId,
      createdAt: Date.now(),
    };
    await dbRequest('ADD_NOTEBOOK', newNb);
    refreshData();
  }, [refreshData]);

  const deleteNotebook = React.useCallback(async (id: string) => {
    // Find the notebook to get both identifiers
    const nb = stateRef.current.notebooks.find(n => n.id === id || n.notebookLMId === id);
    const targetName = nb?.name || id;
    
    console.log(`[bridgeX] Requesting deletion of notebook "${targetName}"...`);
    
    try {
      // Send both id and notebookLMId so the worker can delete by either field
      await dbRequest('DELETE_NOTEBOOK', { 
        id: nb?.id || id, 
        notebookLMId: nb?.notebookLMId || undefined 
      });
      console.log(`[bridgeX] Deletion request sent successfully.`);
    } catch (err: any) {
      console.warn(`[bridgeX] Deletion request failed (or timed out):`, err.message);
      // We still proceed to refreshData() because the delete might have worked in the worker
    }
    
    await refreshData();
  }, [refreshData]);

  const addTag = React.useCallback(async (name: string, color: string) => {
    const newTag: ITag = {
      id: Math.random().toString(36).substr(2, 9),
      name,
      color,
      notebookIds: [],
      createdAt: Date.now(),
    };
    await dbRequest('ADD_TAG', newTag);
    refreshData();
  }, [refreshData]);

  const deleteFolder = React.useCallback(async (id: string) => {
    await dbRequest('DELETE_FOLDER', { id });
    refreshData();
  }, [refreshData]);

  const bridgeNote = React.useCallback(async (note: ISource, notebookId: string) => {
    // 1. Add to SQLite
    const newNote = {
      ...note,
      id: Math.random().toString(36).substr(2, 9),
      notebookId
    };
    await dbRequest('ADD_NOTE', newNote);

    // 2. Remove from Inbox (chrome.storage.local)
    if (!isContextValid()) return;
    chrome.storage.local.get(['inbox'], (result) => {
      if (!isContextValid()) return;
      const currentInbox = result.inbox || [];
      const updatedInbox = currentInbox.filter((item: ISource) => item.timestamp !== note.timestamp);
      chrome.storage.local.set({ inbox: updatedInbox }, () => {
        if (isContextValid()) refreshData();
      });
    });
  }, [refreshData]);

  const addSourceGroup = React.useCallback(async (name: string, sourceNames: string[], notebookId?: string) => {
    const newG = { 
      id: Math.random().toString(36).substring(2, 9), 
      name, 
      sourceNames, 
      createdAt: Date.now(), 
      notebookId,
      sortOrder: (stateRef.current.sourceGroups?.filter(g => g.notebookId === notebookId).length || 0)
    };
    await dbRequest('ADD_SOURCE_GROUP', newG);
    await refreshData();
  }, [refreshData]);

  const reorderSourceGroups = React.useCallback(async (notebookId: string, newOrderedGroups: ISourceGroup[]) => {
    console.log(`[bridgeX] Reordering ${newOrderedGroups.length} groups for notebook: ${notebookId}`);
    const orders = newOrderedGroups.map((g, index) => ({
      id: g.id,
      sortOrder: index
    }));
    await dbRequest('UPDATE_SOURCE_GROUP_ORDER', { orders });
    await refreshData();
  }, [refreshData]);

  const addToSourceGroup = React.useCallback(async (groupId: string, sourceName: string) => {
    await dbRequest('ADD_TO_SOURCE_GROUP', { groupId, sourceName });
    refreshData();
  }, [refreshData]);

  const bulkAddSourcesToGroup = React.useCallback(async (groupId: string, sourceNames: string[]) => {
    await dbRequest('BULK_ADD_TO_SOURCE_GROUP', { groupId, sourceNames });
    refreshData();
  }, [refreshData]);

  const removeFromSourceGroup = React.useCallback(async (groupId: string, sourceName: string) => {
    await dbRequest('REMOVE_FROM_SOURCE_GROUP', { groupId, sourceName });
    refreshData();
  }, [refreshData]);

  const moveSourceBetweenGroups = React.useCallback(async (sourceName: string, fromGroupId: string, toGroupId: string) => {
    await dbRequest('MOVE_SOURCE_BETWEEN_GROUPS', { sourceName, fromGroupId, toGroupId });
    refreshData();
  }, [refreshData]);

  const deleteSourceGroup = React.useCallback(async (id: string) => {
    await dbRequest('DELETE_SOURCE_GROUP', { id });
    refreshData();
  }, [refreshData]);

  const migrateLegacyGroups = React.useCallback(async (notebookId: string) => {
    if (!isContextValid() || !notebookId) return;
    const groups = sourceGroups || [];
    let changed = false;
    for (const g of groups) {
      if (!g.notebookId) {
        await dbRequest('UPDATE_SOURCE_GROUP', { id: g.id, notebookId });
        changed = true;
      }
    }
    if (changed) refreshData();
  }, [sourceGroups, refreshData]);

  const syncWithNotebookLM = React.useCallback(async () => {
    if (isSyncingState || !isContextValid()) return;
    setIsSyncingState(true);
    console.log('[bridgeX] Starting account-level NotebookLM sync (direct)...');

    try {
      const urlParams = new URLSearchParams(window.location.search);
      const authuser = urlParams.get("authuser") || "0";

      // Call listNotebooks DIRECTLY from the content script context
      // This works because we have access to window, cookies, and the page context tokens
      const remoteNotebooks = await listNotebooks("/", authuser);
      console.log(`[bridgeX] Discovered ${remoteNotebooks.length} notebooks from account.`);

      // Reconcile with local SQLite notebooks
      await refreshData();
      const currentNotebooks = stateRef.current.notebooks;

      // --- JUNK CLEANUP PHASE ---
      // Automatically purge malformed notebooks (e.g. CSV-like names from raw API metadata)
      for (const nb of currentNotebooks) {
        const isJunkMetadata = (nb.name.includes(',') && nb.name.length > 100) || 
                               (nb.notebookLMId?.includes(',') ?? false);
        if (isJunkMetadata) {
          console.log(`[bridgeX] Purging malformed junk notebook: ${nb.name.substring(0, 50)}...`);
          await dbRequest('DELETE_NOTEBOOK', { id: nb.id, notebookLMId: nb.notebookLMId });
        }
      }
      // Re-fetch after cleanup
      await refreshData();
      const refreshedNotebooks = stateRef.current.notebooks;

      for (const remote of remoteNotebooks) {
        const existing = refreshedNotebooks.find(n => n.notebookLMId === remote.id);
        if (!existing) {
          console.log(`[bridgeX] Importing new notebook: ${remote.name}`);
          await dbRequest('ADD_NOTEBOOK', {
            id: Math.random().toString(36).substr(2, 9),
            name: remote.name,
            notebookLMId: remote.id,
            createdAt: Date.now()
          });
        } else if (existing.name !== remote.name) {
          // Name repair: fix UUID-based or placeholder names
          const isTempName = existing.name.includes('-') && existing.name.length > 20;
          if (isTempName || existing.name === 'Untitled Notebook' || !existing.name) {
            console.log(`[bridgeX] Repairing notebook name: ${existing.name} -> ${remote.name}`);
            await dbRequest('UPDATE_NOTEBOOK', {
              notebookLMId: remote.id,
              name: remote.name
            });
          }
        }
      }
      await refreshData();
      setIsSyncingState(false);
    } catch (err: any) {
      console.error('[bridgeX] Sync failed:', err?.message || err);
      setIsSyncingState(false);
    }
  }, [isSyncingState, refreshData]);

  const repairData = React.useCallback(async () => {
    if (!isContextValid()) return;
    console.log('[bridgeX] Manually triggered data repair/sync...');
    
    return new Promise<void>((resolve) => {
      try {
        chrome.storage.local.get(['sourceGroups', 'prompts', 'folders', 'tags'], async (result) => {
          if (!isContextValid()) return resolve();
          try {
            if (result.sourceGroups?.length > 0) {
              for (const g of result.sourceGroups) {
                await dbRequest('ADD_SOURCE_GROUP', g);
              }
            }
            if (result.prompts?.length > 0) {
              for (const p of result.prompts) {
                await dbRequest('ADD_PROMPT', p);
              }
            }
            if (result.folders?.length > 0) {
              for (const f of result.folders) {
                await dbRequest('ADD_FOLDER', f);
              }
            }
            if (result.tags?.length > 0) {
              for (const t of result.tags) {
                await dbRequest('ADD_TAG', t);
              }
            }
            await refreshData();
            resolve();
          } catch (err) {
            console.error('[bridgeX] Repair failed:', err);
            resolve();
          }
        });
      } catch (e) {
        // Quiet fail on invalidation
        resolve();
      }
    });
  }, [refreshData]);

  const value = React.useMemo(() => ({ 
    folders, tags, inbox, sourceGroups, notebooks, sourceMappings, notebookMappings,
    addFolder, addNotebook, deleteNotebook, addTag, deleteFolder, bridgeNote, assignSourceToFolder, 
    addSourceGroup, addToSourceGroup, bulkAddSourcesToGroup, removeFromSourceGroup, moveSourceBetweenGroups, deleteSourceGroup,
    reorderSourceGroups,
    migrateLegacyGroups,
    assignNotebookToFolder,
    bulkAssignNotebooksToFolder,
    toggleNotebookTag, 
    bulkAssignSourcesToFolder,
    setSelectedSourceGroupIds,
    selectedNotebookIds,
    toggleNotebookSelection,
    clearNotebookSelection,
    selectedSourceGroupIds,
    sourceSearchQuery,
    setSourceSearchQuery,
    repairData,
    refreshData,
    lastRefreshed,
    syncWithNotebookLM,
    isSyncing: isSyncingState
  }), [
    folders, tags, inbox, sourceGroups, notebooks, sourceMappings, notebookMappings,
    addFolder, addNotebook, deleteNotebook, addTag, deleteFolder, bridgeNote, assignSourceToFolder, 
    addSourceGroup, addToSourceGroup, bulkAddSourcesToGroup, removeFromSourceGroup, moveSourceBetweenGroups, deleteSourceGroup,
    reorderSourceGroups,
    migrateLegacyGroups,
    assignNotebookToFolder,
    bulkAssignNotebooksToFolder,
    toggleNotebookTag, 
    bulkAssignSourcesToFolder,
    setSelectedSourceGroupIds,
    selectedNotebookIds,
    toggleNotebookSelection,
    clearNotebookSelection,
    selectedSourceGroupIds,
    sourceSearchQuery,
    setSourceSearchQuery,
    repairData,
    refreshData,
    lastRefreshed,
    syncWithNotebookLM,
    isSyncingState
  ]);

  return (
    <StorageContext.Provider value={value}>
      {children}
    </StorageContext.Provider>
  );
};

export const useStorage = () => {
  const context = useContext(StorageContext);
  if (!context) throw new Error('useStorage must be used within StorageProvider');
  return context;
};
