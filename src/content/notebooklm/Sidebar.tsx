import React, { useState } from 'react';
import { Folder, Plus, ChevronRight, ChevronDown, X, CheckSquare, Settings, Sparkles, Layers, RefreshCw, ExternalLink, Inbox, LayoutGrid, FileText } from 'lucide-react';
import { useStorage } from '../../store';
import { PromptLibrary } from '../../components/PromptLibrary';

interface SidebarProps {
  onOpenSmartImport: () => void;
  onOpenMerge: () => void;
  onOpenCreateFolder: () => void;
  onOpenBulkAssignNotebooks: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ onOpenSmartImport, onOpenMerge, onOpenCreateFolder, onOpenBulkAssignNotebooks }) => {
  const { 
    folders, notebooks, inbox, sourceGroups, addFolder, deleteFolder, addNotebook, deleteNotebook, addSourceGroup, deleteSourceGroup, bridgeNote,
    selectedSourceGroupIds, setSelectedSourceGroupIds,
    removeFromSourceGroup, moveSourceBetweenGroups,
    sourceSearchQuery, migrateLegacyGroups, repairData,
    clearNotebookSelection, selectedNotebookIds,
    syncWithNotebookLM, isSyncing, reorderSourceGroups
  } = useStorage();

  const [isExpanded, setIsExpanded] = useState(true);
  const [location, setLocation] = useState(window.location.href);
  const [isRepairing, setIsRepairing] = useState(false);
  const [draggedGroupId, setDraggedGroupId] = useState<string | null>(null);

  // Tree expand/collapse state
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [expandedNotebooks, setExpandedNotebooks] = useState<Set<string>>(new Set());
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // Collapsible bottom sections
  const [showInbox, setShowInbox] = useState(false);
  const [showPrompts, setShowPrompts] = useState(false);

  const handleRepair = async () => {
    setIsRepairing(true);
    try {
      await repairData();
      alert('Data repair and sync complete!');
    } catch (err) {
      console.error('Repair failed:', err);
      alert('Repair failed. Check console.');
    } finally {
      setIsRepairing(false);
    }
  };

  // ─── Lifecycle Guards ──────────────────────────────────────────────────
  const prevNotebookId = React.useRef<string | undefined>(undefined);

  React.useEffect(() => {
    const handleUrlChange = () => {
      const currentUrl = window.location.href;
      if (currentUrl !== location) setLocation(currentUrl);
    };
    const interval = setInterval(handleUrlChange, 500);
    return () => clearInterval(interval);
  }, [location]);

  const notebookId = location.split('/notebook/')[1]?.split('?')[0]?.split('/')[0] || undefined;

  React.useEffect(() => {
    if (notebookId !== prevNotebookId.current) {
      prevNotebookId.current = notebookId;
      if (notebookId) {
        setSelectedSourceGroupIds([]);
        migrateLegacyGroups(notebookId);
      }
    }
  }, [notebookId, setSelectedSourceGroupIds, migrateLegacyGroups]);

  React.useEffect(() => {
    if (isExpanded) {
      document.body.style.paddingRight = '320px';
    } else {
      document.body.style.paddingRight = '0px';
    }
    return () => { document.body.style.paddingRight = '0px'; };
  }, [isExpanded]);

  // ─── Tree Toggle Helpers ────────────────────────────────────────────────
  const toggleFolder = (id: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleNotebook = (id: string) => {
    setExpandedNotebooks(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleGroup = (id: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // ─── Collapsed State ───────────────────────────────────────────────────
  if (!isExpanded) {
    return (
      <div 
        onClick={() => setIsExpanded(true)}
        style={{
          width: '32px', height: '32px',
          background: 'var(--bridgex-bg-solid)',
          border: '1px solid var(--bridgex-border)', borderRight: 'none',
          borderRadius: '16px 0 0 16px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', position: 'absolute', left: '-32px', top: '50%',
          transform: 'translateY(-50%)', zIndex: 9999, pointerEvents: 'auto'
        }}
      >
        <ChevronRight size={18} color="var(--bridgex-text-primary)" style={{ transform: 'rotate(180deg)' }} />
      </div>
    );
  }

  // ─── Get groups for a notebook ──────────────────────────────────────────
  const getGroupsForNotebook = (nbId: string) => {
    const currentUrlNbId = window.location.href.split('/notebook/')[1]?.split('?')[0]?.split('/')[0];
    const filtered = sourceGroups?.filter(g => {
      const notebookMatch = g.notebookId === nbId || (nbId && g.notebookId === currentUrlNbId && currentUrlNbId === nbId);
      if (!notebookMatch) return false;
      if (!sourceSearchQuery.trim()) return true;
      const query = sourceSearchQuery.toLowerCase();
      return g.name.toLowerCase().includes(query) || g.sourceNames.some(name => name.toLowerCase().includes(query));
    }) || [];

    // Sort by sortOrder
    return [...filtered].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  };

  const handleDragStart = (e: React.DragEvent, groupId: string) => {
    setDraggedGroupId(groupId);
    e.dataTransfer.effectAllowed = 'move';
    // Set a transparent drag image or keep default
    e.dataTransfer.setData('text/plain', groupId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault(); // Required to allow drop
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent, targetGroupId: string, notebookId: string) => {
    e.preventDefault();
    if (!draggedGroupId || draggedGroupId === targetGroupId) {
      setDraggedGroupId(null);
      return;
    }

    const nbGroups = getGroupsForNotebook(notebookId);
    const draggedIdx = nbGroups.findIndex(g => g.id === draggedGroupId);
    const targetIdx = nbGroups.findIndex(g => g.id === targetGroupId);

    if (draggedIdx === -1 || targetIdx === -1) return;

    const newGroups = [...nbGroups];
    const [draggedItem] = newGroups.splice(draggedIdx, 1);
    newGroups.splice(targetIdx, 0, draggedItem);

    setDraggedGroupId(null);
    await reorderSourceGroups(notebookId, newGroups);
  };

  // ─── Notebook Row Renderer ──────────────────────────────────────────────
  const renderNotebook = (nb: typeof notebooks[0], depth: number = 1) => {
    const isOpen = expandedNotebooks.has(nb.id);
    const groups = getGroupsForNotebook(nb.notebookLMId || nb.id);
    const hasChildren = groups.length > 0;

    return (
      <div key={nb.id} style={{ marginLeft: `${depth * 16}px` }}>
        {/* Notebook Row */}
        <div
          style={{
            display: 'flex', alignItems: 'center', padding: '10px 12px',
            borderRadius: '10px', cursor: 'pointer',
            background: 'transparent', border: '1px solid transparent',
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            gap: '8px'
          }}
          onClick={() => toggleNotebook(nb.id)}
          onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; }}
          onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'transparent'; }}
        >
          {/* Expand/Collapse Chevron */}
          <div style={{ width: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            {hasChildren ? (
              isOpen ? <ChevronDown size={14} color="var(--bridgex-text-secondary)" /> : <ChevronRight size={14} color="var(--bridgex-text-secondary)" />
            ) : (
              <div style={{ width: '14px' }} />
            )}
          </div>

          <Layers size={16} color="var(--color-primary)" style={{ flexShrink: 0, opacity: 0.8 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--bridgex-text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {nb.name}
            </div>
            <div style={{ fontSize: '9px', color: 'var(--bridgex-text-secondary)', opacity: 0.6, marginTop: '2px' }}>
              {nb.notebookLMId ? 'Linked' : 'Manual'} • {groups.length} groups
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: '4px', alignItems: 'center', flexShrink: 0 }}>
            {nb.notebookLMId && (
              <button
                onClick={(e) => { e.stopPropagation(); window.open(`https://notebooklm.google.com/notebook/${nb.notebookLMId}`, '_blank'); }}
                style={{ background: 'none', border: 'none', padding: '4px', borderRadius: '6px', cursor: 'pointer', color: 'var(--bridgex-text-secondary)', opacity: 0.5, display: 'flex', alignItems: 'center' }}
                onMouseOver={e => { e.currentTarget.style.color = 'var(--color-primary)'; e.currentTarget.style.opacity = '1'; }}
                onMouseOut={e => { e.currentTarget.style.color = 'var(--bridgex-text-secondary)'; e.currentTarget.style.opacity = '0.5'; }}
                title="Open in NotebookLM"
              >
                <ExternalLink size={12} />
              </button>
            )}
            <button
              onClick={(e) => { e.stopPropagation(); if (window.confirm(`Delete notebook "${nb.name}"?`)) deleteNotebook(nb.id); }}
              style={{ background: 'none', border: 'none', padding: '4px', borderRadius: '6px', cursor: 'pointer', opacity: 0.4, display: 'flex', alignItems: 'center' }}
              onMouseOver={e => { e.currentTarget.style.background = 'rgba(232, 113, 91, 0.1)'; e.currentTarget.style.opacity = '1'; }}
              onMouseOut={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.opacity = '0.4'; }}
            >
              <X size={12} color="var(--bridgex-text-secondary)" />
            </button>
          </div>
        </div>

        {/* Expanded: Groups + Studio Outputs */}
        {isOpen && (
          <div style={{ marginLeft: '16px', marginTop: '4px' }}>
            {/* GROUP SOURCES Section */}
            <div style={{ marginBottom: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 12px', marginBottom: '4px' }}>
                <span style={{ fontSize: '9px', color: 'var(--bridgex-text-secondary)', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                  Group Sources
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const sourceNames: string[] = [];
                    document.querySelectorAll('input[type="checkbox"]:checked, .mdc-checkbox--selected input').forEach(input => {
                      const label = input.getAttribute('aria-label');
                      if (label && !label.toLowerCase().includes('select all')) sourceNames.push(label.trim());
                    });
                    const name = prompt("Group name?");
                    if (name) addSourceGroup(name, sourceNames, nb.notebookLMId || nb.id);
                  }}
                  style={{ background: 'rgba(209, 161, 123, 0.1)', border: 'none', borderRadius: '6px', cursor: 'pointer', color: 'var(--color-primary)', padding: '2px 6px', display: 'flex', alignItems: 'center' }}
                  title="Create Group"
                >
                  <Plus size={12} />
                </button>
              </div>

              {groups.length === 0 ? (
                <div style={{
                  padding: '12px 16px', margin: '0 12px',
                  border: '1px dashed rgba(255, 255, 255, 0.08)', borderRadius: '10px',
                  fontSize: '10px', color: 'var(--bridgex-text-secondary)', textAlign: 'center', opacity: 0.5
                }}>
                  No groups yet
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  {groups.map(group => {
                    const isGroupOpen = expandedGroups.has(group.id);
                    return (
                      <div key={group.id}>
                        <div
                          style={{
                            display: 'flex', alignItems: 'center', padding: '8px 12px',
                            borderRadius: '8px', cursor: 'grab',
                            background: selectedSourceGroupIds.includes(group.id) ? 'rgba(209, 161, 123, 0.08)' : 'transparent',
                            border: '1px solid ' + (selectedSourceGroupIds.includes(group.id) ? 'rgba(209, 161, 123, 0.25)' : 'transparent'),
                            transition: 'all 0.2s', gap: '8px',
                            opacity: draggedGroupId === group.id ? 0.5 : 1,
                            userSelect: 'none'
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            const wantToSelect = !selectedSourceGroupIds.includes(group.id);
                            setSelectedSourceGroupIds(wantToSelect ? [group.id] : []);
                            toggleGroup(group.id);
                            
                            // 1. Helper to find all elements including inside shadow roots
                            const getAllElements = (selector: string, root: Document | Element | ShadowRoot = document): Element[] => {
                              const elements = Array.from(root.querySelectorAll(selector));
                              const shadows = Array.from(root.querySelectorAll('*')).map(el => el.shadowRoot).filter(Boolean) as ShadowRoot[];
                              return elements.concat(shadows.flatMap(s => getAllElements(selector, s)));
                            };

                            // 2. Identify the source list panel
                            const sourcePanel = document.querySelector('.source-panel-content, .source-list-container, mat-selection-list, .artifact-panel-content');
                            const options = sourcePanel 
                              ? Array.from(sourcePanel.querySelectorAll('mat-list-option, .mdc-list-item[role="option"]'))
                              : getAllElements('mat-list-option, [role="option"]').filter(el => !el.closest('.bridgex-sidebar, .bridgex-modal'));

                            if (options.length === 0) {
                              console.warn('[bridgeX] No source options found');
                              return;
                            }
                            
                            // ... rest of the content (title matching and clicking) ...
                            const cleanNameStr = (text: string) => {
                              return text
                                .replace(/check_box_outline_blank|check_box|check|done|radio_button_unchecked|description|article|picture_as_pdf/gi, '')
                                .replace(/\s+/g, ' ')
                                .trim();
                            };

                            options.forEach(option => {
                                const titleEl = option.querySelector('.source-title, .title, .name, .mdc-list-item__primary-text, .primary-text') || option;
                                const text = cleanNameStr(titleEl.textContent || option.getAttribute('aria-label') || '');
                                if (!text) return;

                                const isGroupMember = group.sourceNames.some(sn => {
                                  const s1 = sn.toLowerCase().trim();
                                  const s2 = text.toLowerCase().trim();
                                  // exact match or contained (for truncated titles)
                                  return s1 === s2 || (s2.length > 3 && (s1.startsWith(s2) || s2.startsWith(s1)));
                                });
                                
                                // Enhanced detection of selection state
                                const isChecked = option.classList.contains('mat-mdc-list-option-selected') || 
                                                option.classList.contains('mdc-list-item--selected') ||
                                                option.getAttribute('aria-selected') === 'true' ||
                                                option.getAttribute('aria-checked') === 'true';
                                
                                let targetState = isChecked;
                                if (wantToSelect) {
                                  targetState = isGroupMember;
                                } else if (isGroupMember) {
                                  targetState = false;
                                }

                                if (isChecked !== targetState) {
                                   const cb = option.querySelector('.mdc-checkbox, input[type="checkbox"], .mdc-list-item__start') as HTMLElement;
                                   if (cb) cb.click(); else (option as HTMLElement).click();
                                }
                            });
                          }}
                          draggable
                          onDragStart={(e) => handleDragStart(e, group.id)}
                          onDragOver={handleDragOver}
                          onDrop={(e) => handleDrop(e, group.id, nb.notebookLMId || nb.id)}
                          onMouseOver={(e) => { if (!selectedSourceGroupIds.includes(group.id)) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)'; }}
                          onMouseOut={(e) => { if (!selectedSourceGroupIds.includes(group.id)) e.currentTarget.style.background = 'transparent'; }}
                        >
                          <div style={{ width: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            {group.sourceNames?.length > 0 ? (
                              isGroupOpen ? <ChevronDown size={12} color="var(--bridgex-text-secondary)" /> : <ChevronRight size={12} color="var(--bridgex-text-secondary)" />
                            ) : <div style={{ width: '12px' }} />}
                          </div>
                          <CheckSquare size={14} color="var(--color-primary)" style={{ flexShrink: 0, opacity: 0.7 }} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--bridgex-text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {group.name}
                            </div>
                          </div>
                          <span style={{ fontSize: '9px', color: 'var(--bridgex-text-secondary)', opacity: 0.6, flexShrink: 0 }}>
                            {group.sourceNames?.length || 0}
                          </span>
                          <button
                            onClick={(e) => { e.stopPropagation(); if (confirm(`Delete group "${group.name}"?`)) deleteSourceGroup(group.id); }}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', display: 'flex', opacity: 0.3 }}
                            onMouseOver={e => e.currentTarget.style.opacity = '1'}
                            onMouseOut={e => e.currentTarget.style.opacity = '0.3'}
                          >
                            <X size={10} color="var(--bridgex-text-secondary)" />
                          </button>
                        </div>

                        {/* Expanded group sources */}
                        {isGroupOpen && group.sourceNames?.length > 0 && (
                          <div style={{ marginLeft: '24px', marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                            {group.sourceNames.map((sourceName, idx) => (
                              <div key={idx} className="group-source-item" style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                background: 'rgba(255, 255, 255, 0.02)', padding: '6px 10px',
                                borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.04)',
                                transition: 'all 0.2s'
                              }}>
                                <span style={{ fontSize: '11px', color: 'var(--bridgex-text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1, marginRight: '8px' }}>
                                  {sourceName}
                                </span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <select
                                    title="Transfer to group"
                                    onChange={(e) => { const targetId = e.target.value; if (targetId) moveSourceBetweenGroups(sourceName, group.id, targetId); }}
                                    style={{
                                      background: 'rgba(0,0,0,0.2)', color: 'var(--bridgex-text-secondary)',
                                      border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px',
                                      fontSize: '9px', padding: '2px', cursor: 'pointer', outline: 'none', maxWidth: '60px'
                                    }}
                                  >
                                    <option value="">Move...</option>
                                    {sourceGroups.filter(sg => sg.id !== group.id && sg.notebookId === group.notebookId).map(sg => (
                                      <option key={sg.id} value={sg.id}>{sg.name}</option>
                                    ))}
                                  </select>
                                  <button
                                    onClick={() => removeFromSourceGroup(group.id, sourceName)}
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', display: 'flex', color: 'var(--bridgex-text-secondary)' }}
                                    onMouseOver={e => e.currentTarget.style.color = '#e8715b'}
                                    onMouseOut={e => e.currentTarget.style.color = 'var(--bridgex-text-secondary)'}
                                  >
                                    <X size={10} />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* STUDIO OUTPUTS Section */}
            <div style={{ marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', padding: '6px 12px', marginBottom: '4px' }}>
                <span style={{ fontSize: '9px', color: 'var(--bridgex-text-secondary)', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                  Studio Outputs
                </span>
              </div>
              <div style={{
                padding: '14px 16px', margin: '0 12px',
                border: '1px dashed rgba(209, 161, 123, 0.15)', borderRadius: '10px',
                fontSize: '10px', color: 'var(--bridgex-text-secondary)', textAlign: 'center',
                background: 'rgba(209, 161, 123, 0.02)', opacity: 0.5
              }}>
                <Sparkles size={14} style={{ margin: '0 auto 6px auto', display: 'block' }} color="var(--color-primary)" />
                Coming soon
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // ─── Main Render ────────────────────────────────────────────────────────
  return (
    <div style={{
      width: '320px', height: '100vh',
      background: 'var(--bridgex-bg-main)', backdropFilter: 'blur(20px)',
      borderLeft: '1px solid var(--bridgex-border)',
      display: 'flex', flexDirection: 'column',
      fontFamily: "'Inter', sans-serif", color: 'var(--bridgex-text-primary)',
      boxShadow: '-12px 0 40px var(--bridgex-shadow)',
      position: 'relative', zIndex: 2147483646, pointerEvents: 'auto'
    }}>
      {/* Collapse Toggle */}
      <div
        onClick={() => setIsExpanded(false)}
        style={{
          width: '24px', height: '24px',
          background: 'var(--bridgex-bg-main)', border: '1px solid var(--bridgex-border)', borderRight: 'none',
          borderRadius: '12px 0 0 12px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', position: 'absolute', left: '-24px', top: '50%',
          transform: 'translateY(-50%)', zIndex: 9999, backdropFilter: 'blur(10px)'
        }}
      >
        <ChevronRight size={14} color="var(--color-primary)" />
      </div>

      {/* Header */}
      <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid var(--bridgex-border)', background: 'rgba(255, 255, 255, 0.02)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '28px', height: '28px',
              background: 'linear-gradient(135deg, var(--color-primary) 0%, #fff 100%)',
              borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(209, 161, 123, 0.3)', transform: 'rotate(-10deg)'
            }}>
              <span style={{ color: '#121214', fontWeight: 900, fontSize: '16px' }}>X</span>
            </div>
            <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 900, letterSpacing: '-0.03em', color: 'var(--bridgex-text-primary)' }}>
              Bridge<span style={{ color: 'var(--color-primary)' }}>X</span>
            </h1>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={handleRepair} disabled={isRepairing}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', opacity: 0.6 }}
              title="Repair & Sync Data"
            >
              <RefreshCw size={14} color="var(--bridgex-text-secondary)" className={isRepairing ? 'spin' : ''} />
            </button>
            <button style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', opacity: 0.6 }}>
              <Settings size={16} color="var(--bridgex-text-secondary)" />
            </button>
          </div>
        </div>
      </div>

      {/* Tree Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 12px' }} className="custom-scrollbar">
        {/* Folders Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', padding: '0 8px' }}>
          <span style={{ fontSize: '10px', color: 'var(--bridgex-text-secondary)', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            Folders
          </span>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              onClick={syncWithNotebookLM} disabled={isSyncing}
              style={{
                background: 'rgba(209, 161, 123, 0.1)', border: 'none', borderRadius: '6px', cursor: 'pointer',
                color: 'var(--color-primary)', padding: '3px 6px', display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}
              title="Sync with Google Account"
            >
              <RefreshCw size={12} className={isSyncing ? 'spin' : ''} />
            </button>
            <button
              onClick={onOpenCreateFolder}
              style={{
                background: 'rgba(209, 161, 123, 0.1)', border: 'none', borderRadius: '6px', cursor: 'pointer',
                color: 'var(--color-primary)', padding: '3px 6px', display: 'flex', alignItems: 'center'
              }}
              title="Create Folder"
            >
              <Plus size={14} />
            </button>
            {selectedNotebookIds.length > 0 && (
              <button
                onClick={onOpenBulkAssignNotebooks}
                style={{
                  background: 'var(--color-primary)', border: 'none', borderRadius: '6px', cursor: 'pointer',
                  color: 'var(--bridgex-bg-solid)', padding: '3px 8px',
                  display: 'flex', alignItems: 'center', gap: '4px',
                  fontSize: '9px', fontWeight: 900, textTransform: 'uppercase'
                }}
              >
                Assign ({selectedNotebookIds.length})
              </button>
            )}
          </div>
        </div>

        {/* Folder Tree */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginBottom: '16px' }}>
          {folders.map(folder => {
            const isFolderOpen = expandedFolders.has(folder.id);
            const folderNotebooks = notebooks.filter(n => n.folderId === folder.id);

            return (
              <div key={folder.id}>
                {/* Folder Row */}
                <div
                  style={{
                    display: 'flex', alignItems: 'center', padding: '10px 12px',
                    borderRadius: '10px', cursor: 'pointer',
                    background: 'transparent', border: '1px solid transparent',
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)', gap: '8px'
                  }}
                  onClick={() => toggleFolder(folder.id)}
                  onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; }}
                  onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'transparent'; }}
                >
                  <div style={{ width: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {isFolderOpen ? <ChevronDown size={14} color="var(--color-primary)" /> : <ChevronRight size={14} color="var(--color-primary)" />}
                  </div>
                  <Folder size={16} color="var(--color-primary)" style={{ flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--bridgex-text-primary)' }}>{folder.name}</div>
                    <div style={{ fontSize: '9px', color: 'var(--bridgex-text-secondary)', opacity: 0.6 }}>
                      {folderNotebooks.length} notebook{folderNotebooks.length !== 1 ? 's' : ''}
                    </div>
                  </div>
                  {/* Add notebook button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const name = prompt("Notebook Name?");
                      if (name) {
                        const lmId = window.location.href.split('/notebook/')[1]?.split('?')[0]?.split('/')[0];
                        addNotebook(name, folder.id, lmId);
                      }
                    }}
                    style={{ background: 'none', border: 'none', padding: '4px', borderRadius: '6px', cursor: 'pointer', opacity: 0.4, display: 'flex' }}
                    onMouseOver={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.background = 'rgba(209,161,123,0.1)'; }}
                    onMouseOut={e => { e.currentTarget.style.opacity = '0.4'; e.currentTarget.style.background = 'none'; }}
                    title="Add Notebook"
                  >
                    <Plus size={12} color="var(--color-primary)" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); if (window.confirm(`Delete folder "${folder.name}"?`)) deleteFolder(folder.id); }}
                    style={{ background: 'none', border: 'none', padding: '4px', borderRadius: '6px', cursor: 'pointer', opacity: 0.3, display: 'flex' }}
                    onMouseOver={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.background = 'rgba(232,113,91,0.1)'; }}
                    onMouseOut={e => { e.currentTarget.style.opacity = '0.3'; e.currentTarget.style.background = 'transparent'; }}
                    title="Delete Folder"
                  >
                    <X size={12} color="var(--bridgex-text-secondary)" />
                  </button>
                </div>

                {/* Expanded: Notebooks */}
                {isFolderOpen && folderNotebooks.map(nb => renderNotebook(nb, 1))}
              </div>
            );
          })}
        </div>

        {/* Unsorted Notebooks */}
        {notebooks.filter(nb => !nb.folderId).length > 0 && (
          <div style={{ borderTop: '1px solid var(--bridgex-border)', paddingTop: '16px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px', padding: '0 8px' }}>
              <span style={{ fontSize: '10px', color: 'var(--bridgex-text-secondary)', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', flex: 1 }}>
                Unsorted
              </span>
              <span style={{ fontSize: '9px', color: 'var(--bridgex-text-secondary)', opacity: 0.5 }}>
                {notebooks.filter(nb => !nb.folderId).length}
              </span>
            </div>
            {notebooks.filter(nb => !nb.folderId).map(nb => renderNotebook(nb, 0))}
          </div>
        )}

        {/* ─── Collapsible: Inbox ──────────────────────────────────────────── */}
        <div style={{ borderTop: '1px solid var(--bridgex-border)', paddingTop: '12px', marginTop: '8px' }}>
          <div
            onClick={() => setShowInbox(!showInbox)}
            style={{
              display: 'flex', alignItems: 'center', padding: '8px 12px', gap: '10px',
              borderRadius: '10px', cursor: 'pointer', transition: 'all 0.2s'
            }}
            onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
            onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
          >
            <div style={{ width: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {showInbox ? <ChevronDown size={14} color="var(--bridgex-text-secondary)" /> : <ChevronRight size={14} color="var(--bridgex-text-secondary)" />}
            </div>
            <Inbox size={16} color="var(--bridgex-text-secondary)" />
            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--bridgex-text-secondary)', flex: 1 }}>Inbox</span>
            {(inbox?.length || 0) > 0 && (
              <span style={{
                background: 'var(--color-primary)', color: 'var(--bridgex-bg-solid)',
                fontSize: '9px', borderRadius: '10px', padding: '1px 6px',
                fontWeight: 900, boxShadow: '0 2px 8px rgba(209, 161, 123, 0.4)'
              }}>
                {inbox?.length}
              </span>
            )}
          </div>

          {showInbox && (
            <div style={{ padding: '8px 12px 12px 40px' }}>
              {(!inbox || inbox.length === 0) ? (
                <div style={{ textAlign: 'center', padding: '20px 12px', opacity: 0.4 }}>
                  <p style={{ fontSize: '11px', color: 'var(--bridgex-text-secondary)', margin: 0 }}>No captured artifacts</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {inbox.filter(item => !sourceSearchQuery.trim() || item.title.toLowerCase().includes(sourceSearchQuery.toLowerCase())).map((item, idx) => (
                    <div key={idx} style={{
                      padding: '10px 12px', background: 'rgba(255,255,255,0.02)',
                      border: '1px solid rgba(255,255,255,0.05)', borderRadius: '10px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                        <span style={{ fontSize: '12px' }}>
                          {item.type === 'chatgpt' ? '🤖' : item.type === 'claude' ? '🧠' : '✨'}
                        </span>
                        <strong style={{ fontSize: '11px', color: 'var(--bridgex-text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 }}>
                          {item.title}
                        </strong>
                      </div>
                      <p style={{ fontSize: '10px', color: 'var(--bridgex-text-secondary)', margin: '0 0 8px 0', lineHeight: 1.5, opacity: 0.7 }}>
                        {item.content.substring(0, 80)}...
                      </p>
                      <button
                        style={{
                          width: '100%', padding: '7px', background: 'var(--color-primary)',
                          color: 'var(--bridgex-bg-solid)', border: 'none', borderRadius: '8px',
                          fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', cursor: 'pointer'
                        }}
                        onClick={() => {
                          if (notebooks.length === 0) { alert("Create a notebook first!"); return; }
                          const folderNames = folders.map((f, i) => `${i + 1}. ${f.name}`).join('\n');
                          const fChoice = prompt(`Select folder:\n${folderNames}`);
                          const fIndex = parseInt(fChoice || '') - 1;
                          const folder = folders[fIndex];
                          if (folder) {
                            const fNbs = notebooks.filter(nb => nb.folderId === folder.id);
                            if (fNbs.length === 0) { alert("No notebooks in this folder."); return; }
                            const nbNames = fNbs.map((n, i) => `${i + 1}. ${n.name}`).join('\n');
                            const nbChoice = prompt(`Select notebook in "${folder.name}":\n${nbNames}`);
                            const nbIndex = parseInt(nbChoice || '') - 1;
                            const notebook = fNbs[nbIndex];
                            if (notebook) bridgeNote(item, notebook.id);
                          }
                        }}
                      >
                        Bridge to Notebook
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ─── Collapsible: Prompts ──────────────────────────────────────── */}
        <div style={{ paddingTop: '4px' }}>
          <div
            onClick={() => setShowPrompts(!showPrompts)}
            style={{
              display: 'flex', alignItems: 'center', padding: '8px 12px', gap: '10px',
              borderRadius: '10px', cursor: 'pointer', transition: 'all 0.2s'
            }}
            onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
            onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
          >
            <div style={{ width: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {showPrompts ? <ChevronDown size={14} color="var(--bridgex-text-secondary)" /> : <ChevronRight size={14} color="var(--bridgex-text-secondary)" />}
            </div>
            <Sparkles size={16} color="var(--bridgex-text-secondary)" />
            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--bridgex-text-secondary)', flex: 1 }}>Prompts</span>
          </div>
          {showPrompts && (
            <div style={{ padding: '8px 12px 12px 16px' }}>
              <PromptLibrary />
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div style={{ padding: '16px', borderTop: '1px solid var(--bridgex-border)', backgroundColor: 'var(--bridgex-surface)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', opacity: 0.6, justifyContent: 'center' }}>
          <Sparkles size={12} color="var(--color-primary)" />
          <span style={{
            fontSize: '9px', fontWeight: 800, color: 'var(--bridgex-text-secondary)',
            textTransform: 'uppercase', letterSpacing: '0.15em'
          }}>
            BridgeX Intelligence Toolkit
          </span>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
