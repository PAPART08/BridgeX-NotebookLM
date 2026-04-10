import React, { useState, useEffect } from 'react';
import { X, Trash2, FileText, Search, AlertTriangle, Check, Loader2 } from 'lucide-react';
import { deleteNotebookSources } from '../../utils/notebooklm-api';
import { isContextValid } from '../../utils/context';

interface Source {
  id: string;
  name: string;
  isSelectedInSidebar: boolean;
}

interface BulkDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const cleanName = (text: string) => {
  return text
    .replace(/check_box_outline_blank/gi, '')
    .replace(/check_box/gi, '')
    .replace(/check/gi, '')
    .replace(/done/gi, '')
    .replace(/radio_button_unchecked/gi, '')
    .replace(/\n/g, ' ')
    .trim();
};

const normalizeName = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

const BulkDeleteModal: React.FC<BulkDeleteModalProps> = ({ isOpen, onClose }) => {
  const [sources, setSources] = useState<Source[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [currentDeletingIndex, setCurrentDeletingIndex] = useState(-1);

  useEffect(() => {
    if (isOpen) {
      // Scrape sources from the DOM (same logic as BulkAssignModal)
      const rawElements = Array.from(document.querySelectorAll(`
        .source-stretched-button, 
        .artifact-stretched-button, 
        .source-item, 
        mat-list-item[role="option"], 
        mat-list-option,
        .single-source-container,
        [data-source-id]
      `));
      
      const rows = Array.from(new Set(rawElements.map(el => 
        el.closest('mat-list-option, .mdc-list-item, [role="option"], .source-item, .single-source-container') || el.parentElement || el
      )));
      
      const foundSources: Source[] = [];
      const preSelected: string[] = [];

      rows.forEach(row => {
        const isSelectAll = row.getAttribute('aria-label')?.toLowerCase().includes('select all') || 
                            row.textContent?.toLowerCase().includes('select all');
        if (isSelectAll) return;

        const titleEl = Array.from(row.querySelectorAll('.source-stretched-button, .title, .text, .mdc-list-item__primary-text, span, h3, .name'))
          .find(s => s.textContent?.trim().length > 0);
          
        let title = cleanName(titleEl?.textContent || row.getAttribute('aria-label') || '');
        
        if (title && title.length > 1) {
          const checkbox = row.querySelector(`
            .mat-mdc-checkbox-checked, 
            .mat-pseudo-checkbox-checked, 
            .mdc-checkbox--selected,
            [aria-checked="true"], 
            [aria-selected="true"],
            .mat-mdc-list-option-selected,
            .mdc-list-item--selected,
            input[type="checkbox"]:checked
          `) || (row.getAttribute('aria-selected') === 'true' ? row : null);

          const moreButton = row.querySelector('[id*="source-item-more-button-"], .source-item-more-button');
          let sourceId = moreButton?.id?.replace('source-item-more-button-', '') || '';

          // If we can't find ID via moreButton, try data attributes or aria-labels as a fallback for internal tracking
          // However, for DELETION we absolutely need the real ID.
          if (!sourceId) {
            // Check if ID is in any descriptive attribute (NotebookLM sometimes hides it)
            const rowDesc = row.getAttribute('id') || row.getAttribute('data-id') || '';
            if (rowDesc.includes('source-')) sourceId = rowDesc;
          }

          if (sourceId && !foundSources.some(s => s.id === sourceId)) {
            const isSelected = !!checkbox;
            foundSources.push({ id: sourceId, name: title, isSelectedInSidebar: isSelected });
            if (isSelected) preSelected.push(sourceId);
          }
        }
      });
      
      setSources(foundSources);
      setSelectedIds([]); // Don't pre-select for deletion to prevent accidents
      setSearch('');
      setIsDeleting(false);
      setCurrentDeletingIndex(-1);
    }
  }, [isOpen]);

  const toggleSource = (id: string) => {
    if (isDeleting) return;
    setSelectedIds(prev => prev.includes(id) ? prev.filter(n => n !== id) : [...prev, id]);
  };
  
  const selectDuplicates = () => {
    if (isDeleting) return;
    const seen = new Set<string>();
    const dupIds: string[] = [];
    
    // We want to keep the FIRST occurrence of every name, and select the rest
    sources.forEach(s => {
      // Normalize name for comparison if needed, but exact name is usually what users mean
      const name = s.name.trim();
      if (seen.has(name)) {
        dupIds.push(s.id);
      } else {
        seen.add(name);
      }
    });
    
    setSelectedIds(dupIds);
  };

  const handleDelete = async () => {
    if (selectedIds.length === 0 || isDeleting) return;
    
    // Check for context invalidation using project utility
    if (!isContextValid()) {
      alert("Extension context invalidated. Please refresh the page to continue.");
      setIsDeleting(false);
      return;
    }

    setIsDeleting(true);
    
    try {
      // 1. Get the current notebook ID from the URL
      const notebookId = window.location.pathname.split('/notebook/')[1]?.split('/')[0];
      if (!notebookId) throw new Error("Could not identify notebook ID from URL");

      // 2. Already have the IDs
      const sourcesToDelete = selectedIds;

      if (sourcesToDelete.length === 0) {
        setIsDeleting(false);
        return;
      }

      // 3. Perform deletion
      // We will iterate through them to update the progress UI in real-time
      for (let i = 0; i < sourcesToDelete.length; i++) {
        setCurrentDeletingIndex(i);
        const sourceId = sourcesToDelete[i];
        
        await deleteNotebookSources(notebookId, [sourceId]);
        // Small delay to prevent rate limits and allow UI to be readable
        await new Promise(r => setTimeout(r, 400));
      }

      // Final synchronization: Page reload is the most reliable way to clear NotebookLM's memory
      // but we wait a moment for the data to settle
      await new Promise(r => setTimeout(r, 800));
      window.location.reload();

    } catch (err) {
      console.error(`[bridgeX] Bulk delete failed:`, err);
      alert("Error occurred during bulk delete. Some sources might not have been removed.");
    } finally {
      setIsDeleting(false);
      onClose();
    }
  };

  if (!isOpen) return null;

  const filteredSources = sources.filter(s => s.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div style={{
      position: 'fixed', 
      top: 0, 
      left: 0, 
      right: 0, 
      bottom: 0,
      backgroundColor: 'var(--bridgex-backdrop)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 2147483647,
      backdropFilter: 'blur(12px)',
      fontFamily: "'Inter', sans-serif",
      pointerEvents: 'auto' as any
    }}>

      <div style={{
        backgroundColor: 'var(--bridgex-bg-main)',
        backdropFilter: 'blur(20px)',
        width: '950px',
        maxHeight: '90vh',
        borderRadius: '24px',
        boxShadow: '0 32px 80px var(--bridgex-shadow)',
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden', border: '1px solid var(--bridgex-border)'
      }}>
        {/* Header */}
        <div style={{
          padding: '24px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          borderBottom: '1px solid var(--bridgex-border)', background: 'var(--bridgex-surface)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ background: 'rgba(239, 68, 68, 0.1)', padding: '8px', borderRadius: '10px' }}>
              <Trash2 size={20} color="#EF4444" />
            </div>
            <h2 style={{ fontSize: '18px', margin: 0, color: 'var(--bridgex-text-primary)', fontWeight: 600, fontFamily: "'Outfit', sans-serif" }}>Batch Clear Sources</h2>
          </div>
          <button 
            disabled={isDeleting}
            onClick={onClose} 
            style={{ background: 'none', border: 'none', color: 'var(--bridgex-text-secondary)', cursor: isDeleting ? 'not-allowed' : 'pointer', transition: 'color 0.2s' }} 
            onMouseOver={e => { if(!isDeleting) e.currentTarget.style.color = 'var(--bridgex-text-primary)' }} 
            onMouseOut={e => { if(!isDeleting) e.currentTarget.style.color = 'var(--bridgex-text-secondary)' }}
          >
            <X size={20} />
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', flex: 1, minHeight: 0, overflow: 'hidden' }}>
          {/* Left Panel: Source Selection */}
          <div style={{ minWidth: 0, minHeight: 0, borderRight: '1px solid var(--bridgex-border)', display: 'flex', flexDirection: 'column', background: 'var(--bridgex-bg-main)' }}>
            <div style={{ padding: '24px 24px 16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                <p style={{ fontSize: '11px', color: 'var(--bridgex-text-secondary)', textTransform: 'uppercase', margin: 0, fontWeight: 700, letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>STEP 1 ({selectedIds.length})</p>
                <div style={{ display: 'flex', gap: '12px', flexShrink: 0, alignItems: 'center' }}>
                  {!isDeleting && (
                    <>
                      <button 
                        onClick={() => setSelectedIds(sources.map(s => s.id))}
                        style={{ background: 'none', border: 'none', color: 'var(--color-primary)', fontSize: '10px', fontWeight: 700, cursor: 'pointer', padding: 0 }}
                      >SELECT ALL</button>
                      <button 
                        onClick={selectDuplicates}
                        style={{ background: 'none', border: 'none', color: '#EF4444', fontSize: '10px', fontWeight: 700, cursor: 'pointer', padding: 0 }}
                      >SELECT DUPLICATES</button>
                      <button 
                        onClick={() => setSelectedIds([])}
                        style={{ background: 'none', border: 'none', color: 'var(--bridgex-text-secondary)', fontSize: '10px', fontWeight: 700, cursor: 'pointer', padding: 0 }}
                      >CLEAR</button>
                    </>
                  )}
                </div>
              </div>
              <div style={{ 
                display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', 
                backgroundColor: 'var(--bridgex-surface)', borderRadius: '12px', border: '1px solid var(--bridgex-border)'
              }}>
                <Search size={14} color="var(--bridgex-text-secondary)" />
                <input 
                  disabled={isDeleting}
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Filter sources..."
                  style={{ background: 'none', border: 'none', outline: 'none', color: 'var(--bridgex-text-primary)', fontSize: '13px', width: '100%', cursor: isDeleting ? 'not-allowed' : 'text' }}
                />
              </div>
            </div>
            
            <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px 20px' }}>
              {filteredSources.length === 0 ? (
                <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--bridgex-text-secondary)', fontSize: '13px' }}>
                  No sources found in current view.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {filteredSources.map((s, idx) => {
                    const isSelected = selectedIds.includes(s.id);
                    const isDuplicate = sources.some((other, oIdx) => other.name === s.name && oIdx < idx);

                    return (
                      <div 
                        key={s.id}
                        onClick={() => toggleSource(s.id)}
                        style={{
                          padding: '10px 14px', borderRadius: '10px', cursor: isDeleting ? 'default' : 'pointer',
                          backgroundColor: isSelected ? 'rgba(239, 68, 68, 0.08)' : 'transparent',
                          display: 'flex', alignItems: 'center', gap: '12px',
                          transition: 'all 0.15s',
                          width: '100%',
                          boxSizing: 'border-box',
                          minWidth: 0,
                          opacity: isDeleting && !isSelected ? 0.5 : 1
                        }}
                        onMouseOver={e => { if(!isSelected && !isDeleting) e.currentTarget.style.backgroundColor = 'var(--bridgex-surface-hover)'; }}
                        onMouseOut={e => { if(!isSelected && !isDeleting) e.currentTarget.style.backgroundColor = 'transparent'; }}
                      >
                        <div style={{ 
                          flexShrink: 0, width: '18px', height: '18px', borderRadius: '4px', 
                          border: '1px solid ' + (isSelected ? '#EF4444' : 'var(--bridgex-border)'),
                          backgroundColor: isSelected ? '#EF4444' : 'transparent',
                          display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                          {isSelected && <Check size={12} color="white" strokeWidth={4} />}
                        </div>
                        <FileText size={16} style={{ flexShrink: 0 }} color={isSelected ? '#EF4444' : 'var(--bridgex-text-secondary)'} />
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                          <span style={{ 
                            fontSize: '13px', 
                            color: isSelected ? 'var(--bridgex-text-primary)' : 'var(--bridgex-text-secondary)', 
                            fontWeight: isSelected ? 600 : 400, 
                            whiteSpace: 'nowrap', 
                            overflow: 'hidden', 
                            textOverflow: 'ellipsis',
                            minWidth: 0
                          }}>{s.name}</span>
                          {isDuplicate && (
                            <span style={{
                              fontSize: '9px', fontWeight: 800, color: 'white',
                              backgroundColor: '#EF4444', padding: '2px 6px', borderRadius: '4px',
                              letterSpacing: '0.05em', height: 'fit-content'
                            }}>DUPLICATE</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right Panel: Confirmation and Status */}
          <div style={{ flex: 1, minWidth: 0, minHeight: 0, display: 'flex', flexDirection: 'column', background: 'var(--bridgex-surface)' }}>
            <div style={{ padding: '24px 24px 16px' }}>
              <p style={{ fontSize: '11px', color: 'var(--bridgex-text-secondary)', textTransform: 'uppercase', marginBottom: '12px', fontWeight: 700, letterSpacing: '0.05em' }}>STEP 2: Confirm Deletion</p>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '0 24px 24px' }}>
              {selectedIds.length === 0 ? (
                <div style={{ 
                  height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  textAlign: 'center', color: 'var(--bridgex-text-secondary)', gap: '16px'
                }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: 'var(--bridgex-surface-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Trash2 size={24} color="var(--bridgex-text-secondary)" />
                  </div>
                  <p style={{ fontSize: '14px', margin: 0 }}>Select sources on the left to review them here before deletion.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ 
                    padding: '16px', borderRadius: '16px', backgroundColor: 'rgba(239, 68, 68, 0.05)',
                    border: '1px solid rgba(239, 68, 68, 0.2)', display: 'flex', gap: '12px'
                  }}>
                    <AlertTriangle size={20} color="#EF4444" style={{ flexShrink: 0 }} />
                    <div>
                      <p style={{ fontSize: '13px', fontWeight: 700, color: '#EF4444', margin: '0 0 4px' }}>Permanent Action</p>
                      <p style={{ fontSize: '12px', color: 'var(--bridgex-text-secondary)', margin: 0, lineHeight: 1.5 }}>
                        This will permanently remove the <b>{selectedIds.length}</b> selected sources from this notebook. This action cannot be undone.
                      </p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <p style={{ fontSize: '10px', fontWeight: 800, color: 'var(--bridgex-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Selected for Removal</p>
                    {selectedIds.map((id, idx) => {
                      const s = sources.find(src => src.id === id);
                      return (
                        <div key={id} style={{ 
                          padding: '10px 14px', borderRadius: '10px', background: 'var(--bridgex-bg-main)',
                          border: '1px solid ' + (idx === currentDeletingIndex ? '#EF4444' : 'var(--bridgex-border)'),
                          display: 'flex', alignItems: 'center', gap: '10px',
                          transition: 'all 0.2s'
                        }}>
                          {idx < currentDeletingIndex ? (
                            <Check size={14} color="#10B981" style={{ flexShrink: 0 }} />
                          ) : idx === currentDeletingIndex ? (
                            <Loader2 size={14} color="#EF4444" className="animate-spin" style={{ flexShrink: 0 }} />
                          ) : (
                            <Trash2 size={14} color="var(--bridgex-text-secondary)" style={{ flexShrink: 0 }} />
                          )}
                          <span style={{ 
                            fontSize: '12px', color: 'var(--bridgex-text-primary)', 
                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                            textDecoration: idx < currentDeletingIndex ? 'line-through' : 'none',
                            opacity: idx < currentDeletingIndex ? 0.5 : 1
                          }}>{s?.name || 'Unknown Source'}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '24px 28px', borderTop: '1px solid var(--bridgex-border)', display: 'flex', gap: '16px', justifyContent: 'space-between',
          backgroundColor: 'var(--bridgex-surface)', alignItems: 'center'
        }}>
           <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ padding: '6px 12px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '8px', border: '1px solid rgba(239,68,68,0.2)' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#EF4444' }}>{selectedIds.length} selected</span>
              </div>
           </div>
           
           <div style={{ display: 'flex', gap: '12px' }}>
              <button 
                disabled={isDeleting}
                onClick={onClose}
                style={{
                  padding: '12px 24px', borderRadius: '12px', border: '1px solid var(--bridgex-border)',
                  backgroundColor: 'transparent', color: 'var(--bridgex-text-secondary)',
                  fontSize: '14px', fontWeight: 600, cursor: isDeleting ? 'not-allowed' : 'pointer'
                }}
              >Cancel</button>
              <button 
                disabled={selectedIds.length === 0 || isDeleting}
                onClick={handleDelete}
                style={{
                  padding: '12px 32px', borderRadius: '12px', border: 'none',
                  backgroundColor: (selectedIds.length === 0 || isDeleting) ? 'rgba(239, 68, 68, 0.2)' : '#EF4444',
                  color: 'white',
                  fontSize: '14px', fontWeight: 700, cursor: (selectedIds.length === 0 || isDeleting) ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  boxShadow: (selectedIds.length === 0 || isDeleting) ? 'none' : '0 8px 24px rgba(239, 68, 68, 0.3)',
                  display: 'flex', alignItems: 'center', gap: '10px'
                }}>
                {isDeleting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Deleting {currentDeletingIndex + 1}/{selectedIds.length}...
                  </>
                ) : 'Complete Deletion'}
              </button>
           </div>
        </div>
      </div>
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </div>
  );
};

export default BulkDeleteModal;
