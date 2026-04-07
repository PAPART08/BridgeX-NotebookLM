import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { X, Folder, Search, Check, ChevronRight, CheckCircle2, LayoutGrid, RefreshCw, AlertCircle, Cloud, MousePointer2 } from 'lucide-react';
import { useStorage } from '../../store';
import { deepQuerySelectorAll } from '../../utils/dom';
import { isContextValid } from '../../utils/context';

interface DetectedNotebook {
  id: string;
  name: string;
  source: 'dom' | 'api';
  sourceCount?: number;
  emoji?: string;
}

interface BulkAssignNotebooksModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SourceIcon = ({ source }: { source?: string }) => {
  switch (source) {
    case 'api': return <Cloud size={12} color="#60a5fa" />;
    default: return <MousePointer2 size={12} color="#94a3b8" />;
  }
};

const BulkAssignNotebooksModal: React.FC<BulkAssignNotebooksModalProps> = ({ isOpen, onClose }) => {
  const { 
    folders, 
    bulkAssignNotebooksToFolder, 
    selectedNotebookIds, 
    clearNotebookSelection
  } = useStorage();

  const [notebooks, setNotebooks] = useState<DetectedNotebook[]>([]);
  const [localSelection, setLocalSelection] = useState<string[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [nbSearch, setNbSearch] = useState('');
  const [folderSearch, setFolderSearch] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const listenerRef = useRef<((event: MessageEvent) => void) | null>(null);

  const requestNotebookList = useCallback(() => {
    console.log("[bridgeX] Requesting notebook list via page context bridge...");
    setIsSyncing(true);
    setSyncError(null);

    // Clean up previous listener
    if (listenerRef.current) {
      window.removeEventListener('message', listenerRef.current);
    }

    const timeoutId = setTimeout(() => {
      console.warn('[bridgeX] Notebook list request timed out after 8s');
      setIsSyncing(false);
      setSyncError('Sync timed out. Try refreshing the page.');
    }, 8000);

    const handler = (event: MessageEvent) => {
      if (event.source !== window) return;
      if (event.data?.type === 'BRIDGEX_NOTEBOOK_LIST') {
        clearTimeout(timeoutId);
        window.removeEventListener('message', handler);
        listenerRef.current = null;

        const apiNotebooks = event.data.notebooks || [];
        console.log(`[bridgeX] Received ${apiNotebooks.length} notebooks from page context`);

        if (event.data.error) {
          setSyncError(event.data.error);
        }

        if (apiNotebooks.length > 0) {
          setNotebooks(prev => {
            const updated = [...prev];
            const seenIds = new Set(updated.map(n => n.id));
            apiNotebooks.forEach((nb: any) => {
              if (nb.id && !seenIds.has(nb.id)) {
                updated.push({
                  id: nb.id,
                  name: nb.name || 'Untitled',
                  source: 'api',
                  sourceCount: nb.sourceCount,
                  emoji: nb.emoji
                });
                seenIds.add(nb.id);
              } else if (nb.id) {
                const idx = updated.findIndex(u => u.id === nb.id);
                if (idx !== -1) {
                  updated[idx] = {
                    ...updated[idx],
                    name: nb.name || updated[idx].name,
                    source: 'api',
                    sourceCount: nb.sourceCount,
                    emoji: nb.emoji
                  };
                }
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
    // Ask the page hook to trigger the wXbhsf RPC
    window.postMessage({ type: 'BRIDGEX_REQUEST_NOTEBOOK_LIST' }, '*');
  }, []);

  useEffect(() => {
    if (isOpen) {
      setLocalSelection([...selectedNotebookIds]);
      setSelectedFolderId(null);
      setNbSearch('');
      setFolderSearch('');
      setNotebooks([]);
      requestNotebookList();
    }
    return () => {
      // Cleanup listener on unmount
      if (listenerRef.current) {
        window.removeEventListener('message', listenerRef.current);
      }
    };
  }, [isOpen, selectedNotebookIds, requestNotebookList]);

  const toggleLocal = (id: string) => {
    setLocalSelection(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleComplete = async () => {
    if (localSelection.length === 0) return;
    // Build metadata map so the store can create DB entries with proper names
    const meta: { [id: string]: { name: string, emoji?: string, sourceCount?: number } } = {};
    for (const id of localSelection) {
      const nb = notebooks.find(n => n.id === id);
      if (nb) {
        meta[id] = { name: nb.name, emoji: nb.emoji, sourceCount: nb.sourceCount };
      }
    }
    await bulkAssignNotebooksToFolder(localSelection, selectedFolderId, meta);
    clearNotebookSelection();
    onClose();
  };

  if (!isOpen) return null;

  const filteredNotebooks = notebooks.filter(nb => 
    nb.name.toLowerCase().includes(nbSearch.toLowerCase()) || nb.id.toLowerCase().includes(nbSearch.toLowerCase())
  );

  const filteredFolders = [
    { id: 'root', name: 'Unorganized (Root)', isRoot: true },
    ...folders
  ].filter(f => f.name.toLowerCase().includes(folderSearch.toLowerCase()));

  const isDarkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const modalBg = isDarkMode ? 'rgba(23, 23, 23, 0.9)' : 'rgba(252, 252, 252, 0.95)';
  const textColor = isDarkMode ? '#fff' : '#111';
  const subtextColor = isDarkMode ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.5)';
  const borderCol = isDarkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)';
  const surfaceBg = isDarkMode ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)';

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: isDarkMode ? 'rgba(0, 0, 0, 0.5)' : 'rgba(255, 255, 255, 0.4)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 2147483647, backdropFilter: 'blur(24px) saturate(160%)',
      fontFamily: "'Outfit', 'Inter', sans-serif", pointerEvents: 'auto' as any
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800&display=swap');
        @keyframes bridgexSlideUp {
          from { opacity: 0; transform: translateY(30px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .animate-bridgex-modal { animation: bridgexSlideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: ${isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}; borderRadius: 10px; }
        .nb-item { transition: all 0.2s; }
        .nb-item:hover { background: ${isDarkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)'} !important; transform: translateX(2px); }
      `}</style>

      <div className="animate-bridgex-modal" style={{
        backgroundColor: modalBg, width: '920px', maxHeight: '80vh', height: '80vh',
        borderRadius: '32px', boxShadow: '0 50px 100px -20px rgba(0,0,0,0.3)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden', border: `1px solid ${borderCol}`
      }}>
        {/* Header */}
        <div style={{
          padding: '28px 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          borderBottom: `1px solid ${borderCol}`, background: 'linear-gradient(to right, rgba(209, 161, 123, 0.05), transparent)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div style={{ 
              background: 'linear-gradient(135deg, var(--color-primary), #e69d67)', 
              padding: '12px', borderRadius: '16px', boxShadow: '0 8px 20px -6px var(--color-primary)' 
            }}>
              <LayoutGrid size={24} color="#000" strokeWidth={2.5} />
            </div>
            <div>
              <h2 style={{ fontSize: '22px', margin: 0, color: textColor, fontWeight: 800, letterSpacing: '-0.02em' }}>Bulk Organization</h2>
              <p style={{ fontSize: '12px', color: subtextColor, margin: '2px 0 0 0', fontWeight: 500 }}>Seamlessly move notebooks into structural directories</p>
            </div>
          </div>
          <button onClick={onClose} style={{ 
            background: surfaceBg, border: 'none', color: textColor, 
            cursor: 'pointer', padding: '10px', borderRadius: '14px', transition: 'all 0.2s' 
          }} className="nb-item">
            <X size={20} />
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', flex: 1, minHeight: 0, overflow: 'hidden' }}>
          {/* Left: Notebook Selection */}
          <div style={{ borderRight: `1px solid ${borderCol}`, display: 'flex', flexDirection: 'column', minHeight: 0, minWidth: 0 }}>
            <div style={{ padding: '32px' }}>
               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '4px', height: '12px', background: 'var(--color-primary)', borderRadius: '2px' }} />
                    <label style={{ fontSize: '11px', fontWeight: 800, color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                      Select Notebooks ({localSelection.length})
                    </label>
                  </div>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={() => setLocalSelection(notebooks.map(n => n.id))} style={{ background: surfaceBg, border: 'none', color: textColor, fontSize: '10px', fontWeight: 800, cursor: 'pointer', padding: '4px 10px', borderRadius: '6px' }} className="nb-item">ALL</button>
                    <button onClick={() => setLocalSelection([])} style={{ background: surfaceBg, border: 'none', color: subtextColor, fontSize: '10px', fontWeight: 800, cursor: 'pointer', padding: '4px 10px', borderRadius: '6px' }} className="nb-item">NONE</button>
                  </div>
               </div>
               <div style={{ position: 'relative', display: 'flex', gap: '12px' }}>
                  <div style={{ position: 'relative', flex: 1 }}>
                    <Search size={16} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: subtextColor }} />
                    <input 
                      type="text" placeholder="Filter research..." value={nbSearch} onChange={e => setNbSearch(e.target.value)}
                      style={{ 
                        width: '100%', background: surfaceBg, border: `1px solid ${borderCol}`, 
                        borderRadius: '16px', padding: '14px 16px 14px 48px', fontSize: '14px', color: textColor, outline: 'none',
                        fontWeight: 600
                      }}
                    />
                  </div>
                  <button 
                    onClick={requestNotebookList}
                    disabled={isSyncing}
                    title="Refresh from Account"
                    style={{ 
                      padding: '12px', borderRadius: '16px', background: surfaceBg, border: `1px solid ${borderCol}`,
                      color: textColor, cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}
                    className="nb-item"
                  >
                    <RefreshCw size={18} className={isSyncing ? 'animate-spin' : ''} style={{ animation: isSyncing ? 'spin 1s linear infinite' : 'none' }} />
                  </button>
               </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '0 32px 16px', minHeight: 0 }} className="custom-scrollbar">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {syncError && (
                   <div style={{ 
                     marginBottom: '16px', padding: '12px 16px', background: 'rgba(239, 68, 68, 0.08)', 
                     border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '14px', display: 'flex', alignItems: 'center', gap: '12px' 
                   }}>
                     <AlertCircle size={18} color="#ef4444" />
                     <div style={{ flex: 1 }}>
                       <div style={{ fontSize: '12px', fontWeight: 700, color: '#ef4444' }}>Sync Alert</div>
                       <div style={{ fontSize: '10px', color: 'rgba(239, 68, 68, 0.7)', marginTop: '2px' }}>{syncError}</div>
                     </div>
                     <button 
                       onClick={() => { setSyncError(null); requestNotebookList(); }}
                       style={{ background: '#ef4444', border: 'none', color: '#fff', borderRadius: '8px', padding: '4px 10px', fontSize: '10px', fontWeight: 800, cursor: 'pointer' }}
                     >Retry</button>
                   </div>
                )}
                {filteredNotebooks.map((nb, idx) => (
                  <div 
                    key={nb.id} onClick={() => toggleLocal(nb.id)}
                    className="nb-item"
                    style={{
                      padding: '16px 20px', borderRadius: '18px', cursor: 'pointer',
                      background: localSelection.includes(nb.id) ? 'rgba(209, 161, 123, 0.1)' : 'rgba(255,255,255,0.01)',
                      border: '1px solid ' + (localSelection.includes(nb.id) ? 'rgba(209, 161, 123, 0.3)' : borderCol),
                      display: 'flex', alignItems: 'center', gap: '16px',
                      animation: 'bridgexSlideUp 0.3s ease-out forwards',
                      animationDelay: `${idx * 0.02}s`, opacity: 0
                    }}
                  >
                    <div style={{ 
                      width: '20px', height: '20px', borderRadius: '6px', border: '2px solid ' + (localSelection.includes(nb.id) ? 'var(--color-primary)' : borderCol),
                      backgroundColor: localSelection.includes(nb.id) ? 'var(--color-primary)' : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.2s'
                    }}>
                      {localSelection.includes(nb.id) && <Check size={14} color="#000" strokeWidth={4} />}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '18px', flexShrink: 0 }}>{nb.emoji || '📖'}</span>
                        <div style={{ fontSize: '14px', fontWeight: 700, color: localSelection.includes(nb.id) ? textColor : textColor, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{nb.name}</div>
                        {nb.sourceCount !== undefined && nb.sourceCount > 0 && (
                          <span style={{ fontSize: '10px', color: 'var(--color-primary)', fontWeight: 800, background: 'rgba(209, 161, 123, 0.1)', padding: '2px 6px', borderRadius: '6px' }}>
                             {nb.sourceCount} sources
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                        <SourceIcon source={nb.source} />
                        <div style={{ fontSize: '9px', color: subtextColor, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>{nb.source} · {nb.id.substring(0, 10)}...</div>
                      </div>
                    </div>
                  </div>
                ))}
                {filteredNotebooks.length === 0 && !isSyncing && (
                   <div style={{ padding: '40px', textAlign: 'center', color: subtextColor, fontSize: '13px', border: `1px dashed ${borderCol}`, borderRadius: '20px' }}>
                     No notebooks found. Check filters or sync.
                   </div>
                )}
                {isSyncing && filteredNotebooks.length === 0 && (
                  <div style={{ padding: '60px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', border: `3px solid ${borderCol}`, borderTopColor: 'var(--color-primary)', animation: 'spin 1s linear infinite' }} />
                    <span style={{ fontSize: '13px', color: textColor, fontWeight: 600 }}>Syncing account...</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right: Destination Folder */}
          <div style={{ display: 'flex', flexDirection: 'column', background: surfaceBg, minHeight: 0, minWidth: 0 }}>
             <div style={{ padding: '32px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                   <div style={{ width: '4px', height: '12px', background: 'var(--color-primary)', borderRadius: '2px' }} />
                   <label style={{ fontSize: '11px', fontWeight: 800, color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                     Destination Folder
                   </label>
                </div>
                <div style={{ position: 'relative' }}>
                  <Search size={16} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: subtextColor }} />
                  <input 
                    type="text" placeholder="Search directories..." value={folderSearch} onChange={e => setFolderSearch(e.target.value)}
                    style={{ width: '100%', background: modalBg, border: `1px solid ${borderCol}`, borderRadius: '16px', padding: '14px 16px 14px 48px', fontSize: '14px', color: textColor, outline: 'none' }}
                  />
               </div>
             </div>

             <div style={{ flex: 1, overflowY: 'auto', padding: '0 32px 16px', minHeight: 0 }} className="custom-scrollbar">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                   {filteredFolders.map(f => (
                     <div 
                        key={f.id} onClick={() => setSelectedFolderId(f.id === 'root' ? null : f.id)}
                        className="nb-item"
                        style={{
                          padding: '18px 24px', borderRadius: '20px', cursor: 'pointer',
                          background: (f.id === 'root' ? selectedFolderId === null : selectedFolderId === f.id) 
                            ? 'linear-gradient(135deg, rgba(209, 161, 123, 0.15), rgba(209, 161, 123, 0.05))' 
                            : modalBg,
                          border: '1px solid ' + ((f.id === 'root' ? selectedFolderId === null : selectedFolderId === f.id) ? 'var(--color-primary)' : borderCol),
                          display: 'flex', alignItems: 'center', gap: '18px'
                        }}
                     >
                        <div style={{ padding: '10px', background: surfaceBg, borderRadius: '12px' }}>
                           <Folder size={18} color="var(--color-primary)" />
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '14px', fontWeight: 700, color: textColor }}>{f.name}</div>
                          <div style={{ fontSize: '10px', color: subtextColor, textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.02em', marginTop: '2px' }}>Directory</div>
                        </div>
                        {(f.id === 'root' ? selectedFolderId === null : selectedFolderId === f.id) && <CheckCircle2 size={22} color="var(--color-primary)" strokeWidth={2.5} />}
                     </div>
                   ))}
                </div>
             </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '20px 40px', borderTop: `1px solid ${borderCol}`, background: surfaceBg,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0
        }}>
           <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ padding: '8px 16px', background: 'rgba(209, 161, 123, 0.1)', borderRadius: '12px', border: '1px solid rgba(209, 161, 123, 0.2)' }}>
                <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--color-primary)' }}>{localSelection.length} Selected</span>
              </div>
              <ChevronRight size={16} color={subtextColor} />
              <div style={{ fontSize: '14px', fontWeight: 700, color: textColor }}>
                {selectedFolderId ? folders.find(f => f.id === selectedFolderId)?.name : 'Unorganized'}
              </div>
           </div>
           
           <div style={{ display: 'flex', gap: '16px' }}>
              <button onClick={onClose} style={{ padding: '14px 28px', borderRadius: '16px', border: `1px solid ${borderCol}`, background: 'none', color: subtextColor, fontWeight: 700, fontSize: '14px', cursor: 'pointer' }} className="nb-item">Cancel</button>
              <button 
                disabled={localSelection.length === 0}
                onClick={handleComplete}
                style={{
                  padding: '14px 40px', borderRadius: '16px', border: 'none',
                  backgroundColor: localSelection.length === 0 ? surfaceBg : 'linear-gradient(135deg, var(--color-primary), #e69d67)',
                  color: localSelection.length === 0 ? subtextColor : '#000', fontWeight: 800, cursor: 'pointer',
                  boxShadow: localSelection.length === 0 ? 'none' : '0 12px 24px -8px var(--color-primary)',
                  fontSize: '14px', transition: 'all 0.3s'
                }}
              >Move Notebooks</button>
           </div>
        </div>
      </div>
    </div>
  );
};

export default BulkAssignNotebooksModal;
