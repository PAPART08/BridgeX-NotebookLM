import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { X, Folder, Search, Book, Plus, Check, RefreshCw, Hash, AlertCircle, Cloud, MousePointer2, FileText, Database } from 'lucide-react';
import { useStorage } from '../../store';
import { isContextValid } from '../../utils/context';

interface CreateFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface DiscoveredNotebook {
  id: string; // The NotebookLM ID
  name: string;
  source?: 'dom' | 'store' | 'manual' | 'scrape' | 'api';
  sourceCount?: number;
}

/** 
 * PIERCER: Recursively scans all shadowRoots on the page to find elements 
 * matching a selector.
 */
function deepQuerySelectorAll(selector: string, root: Element | Document | ShadowRoot = document): Element[] {
  let found = Array.from(root.querySelectorAll(selector));
  const allElements = Array.from(root.querySelectorAll('*'));
  
  allElements.forEach(el => {
    if (el.shadowRoot) {
      found = found.concat(deepQuerySelectorAll(selector, el.shadowRoot));
    }
  });
  return found;
}

const SourceIcon = ({ source }: { source?: string }) => {
  switch (source) {
    case 'api': return <Cloud size={14} color="#60a5fa" />;
    case 'store': return <Database size={14} color="#a78bfa" />;
    case 'manual': return <FileText size={14} color="#fbbf24" />;
    case 'scrape': return <Search size={14} color="#f472b6" />;
    default: return <MousePointer2 size={14} color="#94a3b8" />;
  }
};

const CreateFolderModal: React.FC<CreateFolderModalProps> = ({ isOpen, onClose }) => {
  const { addFolder, bulkAssignNotebooksToFolder, notebooks: storedNotebooks } = useStorage();
  const [folderName, setFolderName] = useState('');
  const [discoveredNotebooks, setDiscoveredNotebooks] = useState<DiscoveredNotebook[]>([]);
  const [selectedNotebookIds, setSelectedNotebookIds] = useState<string[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [manualIdsText, setManualIdsText] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const listenerRef = useRef<((event: MessageEvent) => void) | null>(null);

  const refreshDiscovery = useCallback(() => {
    console.log("[bridgeX] Vortex Discovery v2.0 Scanning...");
    const discovered: DiscoveredNotebook[] = [];
    const seenIds = new Set<string>();

    // 1. Vortex DOM Scan
    const elements = document.querySelectorAll('tr, mat-card, .mat-mdc-row, .project-card, [role="row"], .notebook-card');
    elements.forEach(el => {
       const link = el.querySelector('a[href*="/notebook/"]');
       if (link) {
          const href = link.getAttribute('href') || '';
          const id = href.split('/notebook/')[1]?.split('?')[0] || '';
          
          if (id && !seenIds.has(id)) {
             const titleEl = el.querySelector('h1, h2, h3, .title, .name, .mdc-list-item__primary-text, .mat-column-title, td.mat-column-title, .title-text');
             const name = (titleEl?.textContent || el.textContent || '').trim().split('\n')[0].trim();
             
             if (name && name.length > 2 && !name.toLowerCase().includes('new folder')) {
                discovered.push({ id, name, source: 'dom' });
                seenIds.add(id);
             }
          }
       }
    });

    // 2. Global URL Scraper
    const allLinks = document.querySelectorAll('a[href*="/notebook/"]');
    allLinks.forEach(link => {
       const match = (link as HTMLAnchorElement).href.match(/\/notebook\/([a-zA-Z0-9\-_]{5,})/i);
       if (match && !seenIds.has(match[1])) {
          const id = match[1];
          const name = link.textContent?.trim()?.split('\n')[0] || 'Linked Notebook';
          discovered.push({ id, name, source: 'dom' });
          seenIds.add(id);
       }
    });

    // 3. Stored Notebooks
    storedNotebooks.forEach(nb => {
      const id = nb.notebookLMId || nb.id;
      if (id && !seenIds.has(id)) {
        discovered.push({ id, name: nb.name, source: 'store' });
        seenIds.add(id);
      }
    });

    // 4. Manual Textbox Sync
    if (manualIdsText) {
      const manualIds = manualIdsText.split(/[\n, ]+/).filter(id => id.length > 5);
      manualIds.forEach(rawId => {
        const idMatch = rawId.match(/\/notebook\/([a-zA-Z0-9\-_]{5,})/) || [null, rawId.trim()];
        const id = idMatch[1];
        if (id && !seenIds.has(id)) {
          discovered.push({ id, name: 'Manual: ' + id.substring(0, 10), source: 'manual' });
          seenIds.add(id);
        }
      });
    }

    setDiscoveredNotebooks(prev => {
        const apiNotebooks = prev.filter(nb => nb.source === 'api');
        const merged = [...discovered];
        apiNotebooks.forEach(apiNb => {
            if (!merged.find(m => m.id === apiNb.id)) merged.push(apiNb);
        });
        return merged.sort((a, b) => a.id.localeCompare(b.id));
    });
  }, [storedNotebooks, manualIdsText]);

  const syncRealNotebooks = useCallback(() => {
    console.log("[bridgeX] Requesting notebook list via page context bridge (CreateFolder)...");
    setIsSyncing(true);
    setSyncError(null);
    if (!isContextValid()) {
      setIsSyncing(false);
      return;
    }

    // Clean up previous listener
    if (listenerRef.current) {
      window.removeEventListener('message', listenerRef.current);
    }

    const timeoutId = setTimeout(() => {
      console.warn('[bridgeX] CreateFolder notebook list timed out after 8s');
      setIsSyncing(false);
      setSyncError('Sync timed out. Try refreshing the page.');
    }, 8000);

    const handler = (event: MessageEvent) => {
      if (event.source !== window) return;
      if (event.data?.type === 'BRIDGEX_NOTEBOOK_LIST') {
        clearTimeout(timeoutId);
        window.removeEventListener('message', handler);
        listenerRef.current = null;

        if (!isContextValid()) return;

        const apiNotebooks = event.data.notebooks || [];
        console.log(`[bridgeX] CreateFolder received ${apiNotebooks.length} notebooks from page context`);

        if (event.data.error) {
          setSyncError(event.data.error);
        }

        if (apiNotebooks.length > 0) {
          setDiscoveredNotebooks(prev => {
            const updated = [...prev];
            apiNotebooks.forEach((nb: any) => {
              const id = nb.id;
              const existingIndex = updated.findIndex(u => u.id === id);
              if (existingIndex === -1) {
                updated.push({ id, name: nb.name || 'Untitled', source: 'api', sourceCount: nb.sourceCount });
              } else {
                updated[existingIndex] = { ...updated[existingIndex], source: 'api', sourceCount: nb.sourceCount };
              }
            });
            return updated;
          });
        }
        setIsSyncing(false);
      }
    };

    listenerRef.current = handler;
    window.addEventListener('message', handler);
    window.postMessage({ type: 'BRIDGEX_REQUEST_NOTEBOOK_LIST' }, '*');
  }, []);

  useEffect(() => {
    if (isOpen) {
      setFolderName('');
      setSelectedNotebookIds([]);
      setSearchQuery('');
      setManualIdsText('');
      refreshDiscovery();
      syncRealNotebooks();
      const domInterval = setInterval(refreshDiscovery, 3000);
      return () => {
        clearInterval(domInterval);
        if (listenerRef.current) {
          window.removeEventListener('message', listenerRef.current);
        }
      };
    }
  }, [isOpen, refreshDiscovery, syncRealNotebooks]);

  const filteredNotebooks = useMemo(() => {
    const lowerQuery = searchQuery.toLowerCase().trim();
    const list = !lowerQuery ? discoveredNotebooks : discoveredNotebooks.filter(nb => 
      nb.name.toLowerCase().includes(lowerQuery) || nb.id.toLowerCase().includes(lowerQuery)
    );
    return [...list].sort((a, b) => {
      const order: Record<string, number> = { api: 0, store: 1, dom: 2, scrape: 3, manual: 4 };
      return (order[a.source || 'dom'] || 9) - (order[b.source || 'dom'] || 9);
    });
  }, [discoveredNotebooks, searchQuery]);

  const handleCreate = async () => {
    if (!folderName.trim()) return;
    setIsCreating(true);
    try {
      const newFolder = await addFolder(folderName);
      if (newFolder && newFolder.id) {
        if (selectedNotebookIds.length > 0) bulkAssignNotebooksToFolder(selectedNotebookIds, newFolder.id);
      }
      onClose();
    } catch (err) {
      console.error("Failed to create folder:", err);
    } finally {
      setIsCreating(false);
    }
  };

  const toggleNotebook = (id: string) => {
    setSelectedNotebookIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  if (!isOpen) return null;

  // Adaptive theme colors
  const isDarkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const overlayBg = isDarkMode ? 'rgba(5, 5, 5, 0.4)' : 'rgba(255, 255, 255, 0.3)';
  const modalBg = isDarkMode ? 'rgba(23, 23, 23, 0.85)' : 'rgba(252, 252, 252, 0.9)';
  const textColor = isDarkMode ? '#fff' : '#111';
  const subtextColor = isDarkMode ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.5)';
  const borderCol = isDarkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)';
  const surfaceBg = isDarkMode ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)';

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: overlayBg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 2147483647, backdropFilter: 'blur(20px) saturate(180%)',
      fontFamily: "'Outfit', 'Inter', sans-serif",
      pointerEvents: 'auto' as any
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800&display=swap');
        @keyframes bridgexModalIn {
          from { opacity: 0; transform: scale(0.95) translateY(20px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes bridgexPulse {
          0% { box-shadow: 0 0 0 0 rgba(209, 161, 123, 0.4); }
          70% { box-shadow: 0 0 0 10px rgba(209, 161, 123, 0); }
          100% { box-shadow: 0 0 0 0 rgba(209, 161, 123, 0); }
        }
        .animate-bridgex-in { animation: bridgexModalIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: ${isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}; borderRadius: 10px; }
        .notebook-card { transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); }
        .notebook-card:hover { transform: translateX(4px); background: ${isDarkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)'} !important; }
      `}</style>
      
      <div className="animate-bridgex-in" style={{
        backgroundColor: modalBg,
        width: '600px',
        maxHeight: '80vh', height: '80vh',
        borderRadius: '32px',
        boxShadow: isDarkMode 
          ? '0 40px 100px -20px rgba(0,0,0,0.6), inset 0 0 0 1px rgba(255,255,255,0.08)' 
          : '0 40px 100px -20px rgba(0,0,0,0.1), inset 0 0 0 1px rgba(0,0,0,0.05)',
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
        border: `1px solid ${borderCol}`
      }}>
        {/* Header */}
        <div style={{ padding: '32px 40px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', background: 'linear-gradient(to bottom, rgba(255,255,255,0.03), transparent)' }}>
          <div style={{ display: 'flex', gap: '20px' }}>
             <div style={{ 
               background: 'linear-gradient(135deg, var(--color-primary), #e69d67)', 
               padding: '12px', 
               borderRadius: '16px',
               boxShadow: '0 8px 24px -6px var(--color-primary)'
             }}>
                <Folder size={28} color="#000" strokeWidth={2.5} />
             </div>
             <div>
               <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                 <h2 style={{ fontSize: '24px', margin: 0, color: textColor, fontWeight: 800, letterSpacing: '-0.02em' }}>Project Directory</h2>
                 <div style={{ 
                   fontSize: '9px', fontWeight: 900, background: 'var(--color-primary)', color: '#000', 
                   padding: '2px 6px', borderRadius: '4px', letterSpacing: '0.05em' 
                 }}>V2.0 ACTIVE</div>
               </div>
               <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: subtextColor, fontWeight: 500 }}>Organize your research into structural folders</p>
             </div>
          </div>
          <button onClick={onClose} style={{ 
            background: surfaceBg, border: 'none', color: textColor, 
            cursor: 'pointer', padding: '8px', borderRadius: '12px', transition: 'all 0.2s'
          }} className="notebook-card">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, minWidth: 0, overflow: 'hidden' }}>
          
          {/* Section: Directory Name */}
          <div style={{ marginBottom: '20px', padding: '0 40px', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
               <div style={{ width: '4px', height: '14px', background: 'var(--color-primary)', borderRadius: '2px' }} />
               <label style={{ fontSize: '11px', fontWeight: 800, color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                 Folder Identity
               </label>
            </div>
            <div style={{ position: 'relative', flexShrink: 0 }}>
                <input 
                autoFocus
                type="text" 
                placeholder="Enter a descriptive folder name..."
                value={folderName}
                onChange={e => setFolderName(e.target.value)}
                style={{
                  width: '100%', backgroundColor: surfaceBg, border: `1px solid ${borderCol}`,
                  borderRadius: '18px', padding: '20px 24px', fontSize: '16px', color: textColor, outline: 'none',
                  transition: 'all 0.3s', fontWeight: 600
                }}
                onFocus={(e) => e.target.style.borderColor = 'var(--color-primary)'}
                onBlur={(e) => e.target.style.borderColor = borderCol}
              />
            </div>
          </div>

          {/* Section: Notebook Selection - scrollable area */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '0 40px 16px 40px', minHeight: 0, minWidth: 0 }} className="custom-scrollbar">
            <div style={{ marginBottom: '24px' }}>
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                   <div style={{ width: '4px', height: '14px', background: 'var(--color-primary)', borderRadius: '2px' }} />
                   <label style={{ fontSize: '11px', fontWeight: 800, color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                     Source Selection ({selectedNotebookIds.length})
                   </label>
                </div>
                <button 
                  onClick={syncRealNotebooks} 
                  disabled={isSyncing}
                  style={{ 
                    background: surfaceBg, border: `1px solid ${borderCol}`, 
                    borderRadius: '10px', padding: '6px 14px', color: isSyncing ? 'var(--color-primary)' : textColor, 
                    fontSize: '11px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', 
                    transition: 'all 0.2s'
                  }}
                  className="notebook-card"
                >
                  <RefreshCw size={12} className={isSyncing ? "animate-spin" : ""} /> 
                  {isSyncing ? 'Synchronizing...' : 'Sync Account'}
                </button>
             </div>

             {syncError && (
                <div style={{ 
                  marginBottom: '20px', padding: '16px', background: 'rgba(239, 68, 68, 0.08)', 
                  border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '16px' 
                }}>
                  <AlertCircle size={20} color="#ef4444" />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#ef4444' }}>Synchronization Alert</div>
                    <div style={{ fontSize: '11px', color: 'rgba(239, 68, 68, 0.7)', marginTop: '2px' }}>{syncError}</div>
                  </div>
                  <button 
                    onClick={() => { setSyncError(null); syncRealNotebooks(); }}
                    style={{ background: '#ef4444', border: 'none', color: '#fff', borderRadius: '8px', padding: '4px 12px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
                  >
                    Retry
                  </button>
                </div>
              )}

             {/* Search & Manual Overlay */}
             <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <div style={{ position: 'relative' }}>
                   <Search size={16} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: subtextColor }} />
                   <input 
                     type="text" placeholder="Filter notebooks..." value={searchQuery}
                     onChange={e => setSearchQuery(e.target.value)}
                     style={{
                       width: '100%', background: surfaceBg, border: `1px solid ${borderCol}`,
                       borderRadius: '14px', padding: '14px 16px 14px 44px', fontSize: '13px', color: textColor, outline: 'none'
                     }}
                   />
                </div>
                <div style={{ position: 'relative' }}>
                   <Hash size={16} style={{ position: 'absolute', left: '16px', top: '18px', color: 'var(--color-primary)', opacity: 0.6 }} />
                   <textarea 
                     placeholder="Batch IDs/URLs..." 
                     value={manualIdsText}
                     onChange={e => setManualIdsText(e.target.value)}
                     style={{
                       width: '100%', background: surfaceBg, border: `1px dashed ${borderCol}`,
                       borderRadius: '14px', padding: '12px 16px 12px 44px', fontSize: '12px', color: textColor, outline: 'none',
                       height: '50px', fontFamily: 'monospace', resize: 'none'
                     }}
                   />
                </div>
             </div>

             {/* Dynamic List */}
             <div style={{ 
               display: 'flex', flexDirection: 'column', gap: '8px'
             }}>
               {isSyncing && filteredNotebooks.length === 0 ? (
                 <div style={{ padding: '60px 0', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', border: `3px solid ${borderCol}`, borderTopColor: 'var(--color-primary)', animation: 'spin 1s linear infinite' }} />
                    <div>
                      <p style={{ margin: 0, fontSize: '14px', color: textColor, fontWeight: 600 }}>Syncing Google Library</p>
                      <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: subtextColor }}>Fetching private notebooks via secure RPC</p>
                    </div>
                 </div>
               ) : filteredNotebooks.length === 0 ? (
                 <div style={{ padding: '60px 0', background: surfaceBg, borderRadius: '24px', border: `1px dashed ${borderCol}`, textAlign: 'center' }}>
                   <Book size={32} color={subtextColor} style={{ marginBottom: '12px' }} />
                   <p style={{ margin: 0, fontSize: '13px', color: subtextColor, fontWeight: 500 }}>No notebooks detected. Try refreshing or manual sync.</p>
                 </div>
               ) : (
                 filteredNotebooks.map((nb, idx) => (
                   <div 
                     key={nb.id}
                     onClick={() => toggleNotebook(nb.id)}
                     className="notebook-card"
                     style={{
                       padding: '16px 20px', borderRadius: '20px', cursor: 'pointer',
                       background: selectedNotebookIds.includes(nb.id) ? 'linear-gradient(90deg, rgba(209, 161, 123, 0.12), rgba(209, 161, 123, 0.05))' : surfaceBg,
                       border: '1px solid ' + (selectedNotebookIds.includes(nb.id) ? 'rgba(209, 161, 123, 0.3)' : borderCol),
                       display: 'flex', alignItems: 'center', gap: '16px',
                       animation: `bridgexModalIn 0.3s cubic-bezier(0,0,0.2,1) forwards`,
                       animationDelay: `${idx * 0.03}s`, opacity: 0
                     }}
                   >
                     <div style={{ 
                        width: '22px', height: '22px', borderRadius: '7px', border: '2px solid ' + (selectedNotebookIds.includes(nb.id) ? 'var(--color-primary)' : borderCol),
                        backgroundColor: selectedNotebookIds.includes(nb.id) ? 'var(--color-primary)' : 'transparent',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s'
                     }}>
                        {selectedNotebookIds.includes(nb.id) && <Check size={14} color="#000" strokeWidth={3} />}
                     </div>
                     <div style={{ flex: 1, minWidth: 0 }}>
                       <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                          <span style={{ fontSize: '14px', fontWeight: 700, color: selectedNotebookIds.includes(nb.id) ? textColor : textColor, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{nb.name}</span>
                          {nb.sourceCount !== undefined && (
                            <span style={{ fontSize: '10px', color: 'var(--color-primary)', fontWeight: 800, opacity: 0.6 }}>{nb.sourceCount} sources</span>
                          )}
                       </div>
                       <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                          <SourceIcon source={nb.source} />
                          <span style={{ fontSize: '10px', color: subtextColor, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{nb.source} · {nb.id.substring(0, 12)}...</span>
                       </div>
                     </div>
                   </div>
                 ))
               )}
             </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ 
          padding: '20px 40px', 
          background: isDarkMode ? 'rgba(5, 5, 5, 0.3)' : 'rgba(0,0,0,0.03)', 
          borderTop: `1px solid ${borderCol}`, 
          display: 'flex', justifyContent: 'flex-end', gap: '16px', flexShrink: 0
        }}>
           <button onClick={onClose} style={{ 
             padding: '14px 28px', borderRadius: '16px', border: `1px solid ${borderCol}`, 
             background: 'none', color: subtextColor, cursor: 'pointer', fontWeight: 700, fontSize: '14px',
             transition: 'all 0.2s'
           }} className="notebook-card">Cancel</button>
           <button 
             disabled={!folderName.trim() || isCreating}
             onClick={handleCreate}
             style={{
               padding: '14px 36px', borderRadius: '16px', border: 'none',
               background: !folderName.trim() || isCreating ? surfaceBg : 'linear-gradient(135deg, var(--color-primary), #e69d67)',
               color: !folderName.trim() || isCreating ? subtextColor : '#000', 
               fontWeight: 800, cursor: isCreating ? 'default' : 'pointer', 
               display: 'flex', alignItems: 'center', gap: '10px',
               boxShadow: !folderName.trim() || isCreating ? 'none' : `0 12px 24px -8px var(--color-primary)`,
               fontSize: '14px', transition: 'all 0.3s'
             }}
             onMouseEnter={(e) => { if(!isCreating && folderName.trim()) e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)'; }}
             onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; }}
           >
             {isCreating ? 'Finalizing...' : 'Deploy Folder'}
             {!isCreating && <Plus size={18} strokeWidth={3} />}
           </button>
        </div>
      </div>
    </div>
  );
};

export default CreateFolderModal;
