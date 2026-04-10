import React, { useState, useEffect } from 'react';
import { Folder, Plus, ChevronRight, ChevronDown, X, CheckSquare, Settings, Sparkles, Layers, RefreshCw, ExternalLink, Inbox, LayoutGrid, FileText, Target, AlertTriangle, Check } from 'lucide-react';
import { useStorage } from '../../store';
import { PromptLibrary } from '../../components/PromptLibrary';
import { deepQuerySelectorAll, cleanSourceName, getActiveSourceInfo, getAllDomSourceInfo, focusGroupSources, unfocusAllSources, verifySourceState, isSourceGroupMember, fetchSourceListViaHook } from '../../utils/dom';

interface SidebarProps {
  onOpenPowerImport: () => void;
  onOpenCombine: () => void;
  onOpenCreateFolder: () => void;
  onOpenBulkAssignNotebooks: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ onOpenPowerImport, onOpenCombine, onOpenCreateFolder, onOpenBulkAssignNotebooks }) => {
  const { 
    folders, notebooks, inbox, sourceGroups, addFolder, deleteFolder, addNotebook, deleteNotebook, addSourceGroup, deleteSourceGroup, clearAllSourceGroups, bridgeNote,
    selectedSourceGroupIds, setSelectedSourceGroupIds,
    removeFromSourceGroup, moveSourceBetweenGroups,
    sourceSearchQuery, migrateLegacyGroups, repairData,
    clearNotebookSelection, selectedNotebookIds,
    syncWithNotebookLM, isSyncing, reorderSourceGroups, updateSourceGroup
  } = useStorage();

  const [isExpanded, setIsExpanded] = useState(true);
  const [location, setLocation] = useState(window.location.href);
  const [isRepairing, setIsRepairing] = useState(false);
  const [draggedGroupId, setDraggedGroupId] = useState<string | null>(null);
  const [focusedGroupId, setFocusedGroupId] = useState<string | null>(null);
  const [isFocusing, setIsFocusing] = useState(false);

  // Tree expand/collapse state
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [expandedNotebooks, setExpandedNotebooks] = useState<Set<string>>(new Set());
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // Collapsible bottom sections
  const [showInbox, setShowInbox] = useState(false);
  const [showPrompts, setShowPrompts] = useState(false);

  // Active DOM sources — tracked via polling
  const [activeDomSources, setActiveDomSources] = useState<{names: string[], ids: string[]}>({names: [], ids: []});
  // Verification state per group: { [groupId]: { checkedCount, expectedCount } }
  const [groupVerification, setGroupVerification] = useState<{[id: string]: {checkedCount: number, expectedCount: number}}>({});
  
  useEffect(() => {
    const interval = setInterval(() => {
      const active = getActiveSourceInfo();
      setActiveDomSources(prev => {
        if (prev.ids.length === active.ids.length && prev.ids.every(id => active.ids.includes(id)) &&
            prev.names.length === active.names.length && prev.names.every(n => active.names.includes(n))) {
            return prev;
        }
        return active;
      });

      // Update verification for the focused group
      if (focusedGroupId) {
        const focusedGroup = sourceGroups.find(g => g.id === focusedGroupId);
        if (focusedGroup) {
          const v = verifySourceState(focusedGroup);
          setGroupVerification(prev => {
            const existing = prev[focusedGroupId];
            if (existing && existing.checkedCount === v.checkedCount && existing.expectedCount === v.expectedCount) return prev;
            return { ...prev, [focusedGroupId]: { checkedCount: v.checkedCount, expectedCount: v.expectedCount } };
          });
        }
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [focusedGroupId, sourceGroups]);  // ─── Single-Pass Focus Handler ──────────────────────────────────────────
  const handleFocusGroup = React.useCallback(async (group: typeof sourceGroups[0], wantToSelect: boolean) => {
    if (isFocusing) return;
    setIsFocusing(true);
    
    setSelectedSourceGroupIds(wantToSelect ? [group.id] : []);
    setFocusedGroupId(wantToSelect ? group.id : null);
    
    await new Promise(r => setTimeout(r, 50));

    try {
      if (wantToSelect) {
        // ── STEP 0: Notebook mismatch guard ──
        const currentNotebookId = window.location.href.split('/notebook/')[1]?.split('?')[0]?.split('/')[0] || '';
        if (group.notebookId && currentNotebookId && group.notebookId !== currentNotebookId) {
          console.log(`[bridgeX] Group "${group.name}" belongs to a different notebook. Skipping focus.`);
          alert(`This source group belongs to a different notebook.\nPlease navigate to that notebook first.`);
          setSelectedSourceGroupIds([]);
          setFocusedGroupId(null);
          setIsFocusing(false);
          return;
        }

        // ── STEP 1: Get ALL source items currently visible in the DOM ──
        // These DOM IDs are the ground truth for checkbox toggling.
        const allDomSources = getAllDomSourceInfo();
        console.log(`[bridgeX] 🎯 Focus "${group.name}": Found ${allDomSources.length} DOM source items.`);
        
        // ── STEP 2: Get API sources for full-name resolution ──
        let apiSources: { id: string, title: string }[] = [];
        try {
          apiSources = await fetchSourceListViaHook(currentNotebookId);
          console.log(`[bridgeX] 📋 rLM1Ne returned ${apiSources.length} sources.`);
        } catch (err) {
          console.warn(`[bridgeX] ⚠️ rLM1Ne failed, falling back to DOM-only matching:`, err);
        }

        // ── STEP 3: Build a unified lookup ──
        // Map: DOM ID → { domName, apiTitle }
        const sourceLookup = new Map<string, { domId: string, domName: string, apiTitle: string }>();
        for (const dom of allDomSources) {
          const apiMatch = apiSources.find(api => api.id === dom.id);
          sourceLookup.set(dom.id, {
            domId: dom.id,
            domName: dom.name,
            apiTitle: apiMatch?.title || dom.name  // fallback to DOM name if API doesn't match
          });
        }

        // If API IDs don't match DOM IDs, try matching by name
        if (apiSources.length > 0 && allDomSources.length > 0) {
          const domIdsInApi = allDomSources.filter(d => apiSources.some(a => a.id === d.id)).length;
          if (domIdsInApi === 0) {
            console.warn(`[bridgeX] ⚠️ DOM IDs don't match API IDs! Attempting name-based bridge...`);
            console.warn(`[bridgeX]   DOM IDs sample: ${allDomSources.slice(0, 2).map(d => d.id).join(', ')}`);
            console.warn(`[bridgeX]   API IDs sample: ${apiSources.slice(0, 2).map(a => a.id).join(', ')}`);
            // Build name-based bridge: match DOM names to API titles to get API→DOM mapping
            for (const dom of allDomSources) {
              for (const api of apiSources) {
                const domNorm = dom.name.toLowerCase().trim();
                const apiNorm = api.title.replace(/\.(pdf|epub|txt|docx|md|html|csv|json|xml)$/i, '').toLowerCase().trim();
                // Require a tighter match for the DOM->API bridge (min 20 chars or exact)
                if (domNorm === apiNorm || (domNorm.length > 20 && (apiNorm.startsWith(domNorm) || domNorm.startsWith(apiNorm)))) {
                  sourceLookup.set(dom.id, { domId: dom.id, domName: dom.name, apiTitle: api.title });
                  break;
                }
              }
            }
          }
        }

        // ── STEP 4: Resolve which DOM IDs belong to this group ──
        const targetDomIds = new Set<string>();
        const resolvedNames: string[] = [];
        const resolvedIds: string[] = [];
        
        const hasStoredIds = group.sourceIds && group.sourceIds.length > 0;
        console.log(`[bridgeX] 📊 Group data: ${hasStoredIds ? group.sourceIds!.length + ' stored IDs' : 'NO stored IDs'}, ${group.sourceNames?.length || 0} stored names`);


        for (const [domId, info] of sourceLookup) {
          const isMatch = isSourceGroupMember(
            domId, 
            info.domName, 
            group.sourceIds, 
            group.sourceNames, 
            info.apiTitle
          );
          
          if (isMatch) {
            targetDomIds.add(domId);
            resolvedNames.push(info.apiTitle);
            resolvedIds.push(domId);
          }
        }

        console.log(`[bridgeX] 🎯 Resolved ${targetDomIds.size} target DOM IDs for group "${group.name}".`);

        if (targetDomIds.size === 0) {
          // Dump full diagnostics for debugging — use JSON.stringify to avoid [object Object]
          console.error(`[bridgeX] ❌ ZERO MATCHES! Full diagnostic data:`);
          console.error(`[bridgeX] Stored names: ${JSON.stringify(group.sourceNames)}`);
          console.error(`[bridgeX] Stored IDs: ${JSON.stringify(group.sourceIds)}`);
          console.error(`[bridgeX] DOM sources: ${JSON.stringify(allDomSources.slice(0, 10).map(d => ({ id: d.id.substring(0, 12), name: d.name.substring(0, 50) })))}`);
          console.error(`[bridgeX] API sources: ${JSON.stringify(apiSources.slice(0, 10).map(a => ({ id: a.id.substring(0, 12), title: a.title.substring(0, 50) })))}`);
          console.error(`[bridgeX] sourceLookup size: ${sourceLookup.size}`);
        }

        // ── STEP 5: Toggle DOM checkboxes ──
        const { toggled, matched } = focusGroupSources(targetDomIds);
        
        const expectedCount = targetDomIds.size > 0 ? targetDomIds.size : (group.sourceNames?.length || 0);
        setGroupVerification(prev => ({
          ...prev,
          [group.id]: { checkedCount: matched, expectedCount }
        }));

        // ── STEP 6: Auto-migrate group to use proper IDs + full names ──
        if (resolvedIds.length > 0) {
          console.log(`[bridgeX] 🔄 Migrating group "${group.name}" → ${resolvedIds.length} IDs + full titles`);
          updateSourceGroup(group.id, { sourceIds: resolvedIds, sourceNames: resolvedNames });
        }

        const active = getActiveSourceInfo();
        setActiveDomSources(active);

      } else {
        console.log(`[bridgeX] 🎯 Clearing focus`);
        unfocusAllSources();
        setGroupVerification({});
        await new Promise(r => setTimeout(r, 300));
        const active = getActiveSourceInfo();
        setActiveDomSources(active);
      }
    } catch (err) {
      console.error('[bridgeX] Focus handler error:', err);
      alert(`Focus failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsFocusing(false);
    }
  }, [isFocusing, setSelectedSourceGroupIds, updateSourceGroup, sourceGroups, location]);

  const handleRepair = async () => {
    const choice = prompt("Enter action:\n1 = Repair & Sync Data\n2 = Clear ALL Source Groups\n\nType 1 or 2:");
    if (choice === '2') {
      if (window.confirm(`⚠️ This will delete ALL ${sourceGroups?.length || 0} source groups. Are you sure?`)) {
        setIsRepairing(true);
        try {
          await clearAllSourceGroups();
          setFocusedGroupId(null);
          setGroupVerification({});
          alert('All source groups cleared!');
        } catch (err) {
          console.error('Clear failed:', err);
          alert('Clear failed. Check console.');
        } finally {
          setIsRepairing(false);
        }
      }
    } else if (choice === '1') {
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
          <div style={{ width: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            {hasChildren ? (
              isOpen ? <ChevronDown size={14} color="var(--bridgex-text-secondary)" /> : <ChevronRight size={14} color="var(--bridgex-text-secondary)" />
            ) : <div style={{ width: '14px' }} />}
          </div>

          <Layers size={16} color="var(--color-primary)" style={{ flexShrink: 0, opacity: 0.8 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--bridgex-text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {nb.name}
            </div>
            <div style={{ fontSize: '9px', color: 'var(--bridgex-text-secondary)', opacity: 0.6, marginTop: '2px' }}>
              Linked • {groups.length} groups
            </div>
          </div>

          <div style={{ display: 'flex', gap: '4px', alignItems: 'center', flexShrink: 0 }}>
            {nb.notebookLMId && (
              <button
                onClick={(e) => { e.stopPropagation(); window.open(`https://notebooklm.google.com/notebook/${nb.notebookLMId}`, '_blank'); }}
                style={{ background: 'none', border: 'none', padding: '4px', borderRadius: '6px', cursor: 'pointer', color: 'var(--bridgex-text-secondary)', opacity: 0.5, display: 'flex', alignItems: 'center' }}
                title="Open in NotebookLM"
              >
                <ExternalLink size={12} />
              </button>
            )}
            <button
              onClick={(e) => { e.stopPropagation(); if (window.confirm(`Delete notebook "${nb.name}"?`)) deleteNotebook(nb.id); }}
              style={{ background: 'none', border: 'none', padding: '4px', borderRadius: '6px', cursor: 'pointer', opacity: 0.4, display: 'flex', alignItems: 'center' }}
            >
              <X size={12} color="var(--bridgex-text-secondary)" />
            </button>
          </div>
        </div>

        {/* Expanded Content */}
        {isOpen && (
          <div style={{ marginLeft: '16px', marginTop: '4px' }}>
            <div style={{ marginBottom: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 12px', marginBottom: '4px' }}>
                <span style={{ fontSize: '9px', color: 'var(--bridgex-text-secondary)', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                  Group Sources
                </span>
                <button
                  onClick={async (e) => {
                    e.stopPropagation();
                    const { names: domNames, ids: domIds } = getActiveSourceInfo();
                    if (domNames.length === 0) { alert("Check some sources in NotebookLM first!"); return; }

                    let finalNames = domNames, finalIds = domIds;
                    try {
                      const currentNotebookId = window.location.href.split('/notebook/')[1]?.split('?')[0]?.split('/')[0] || '';
                      const apiSources = await fetchSourceListViaHook(currentNotebookId);
                      if (apiSources.length > 0) {
                        const resolvedNames: string[] = [], resolvedIds: string[] = [];
                        domIds.forEach(did => {
                          const as = apiSources.find(s => s.id === did);
                          if (as) { resolvedNames.push(as.title); resolvedIds.push(as.id); }
                        });
                        if (resolvedNames.length > 0) { finalNames = resolvedNames; finalIds = resolvedIds; }
                      }
                    } catch (err) {}

                    const nameInput = prompt(`Create group with ${finalNames.length} sources? Name:`);
                    if (nameInput) addSourceGroup(nameInput, finalNames, nb.notebookLMId || nb.id, finalIds);
                  }}
                  style={{ background: 'rgba(209, 161, 123, 0.1)', border: 'none', borderRadius: '6px', color: 'var(--color-primary)', padding: '2px 6px', cursor: 'pointer' }}
                >
                  <Plus size={12} />
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                {groups.map(group => {
                  const isGroupOpen = expandedGroups.has(group.id);
                  const isFocused = focusedGroupId === group.id;
                  let isGroupActiveDom = false;
                  
                  if (group.sourceIds && group.sourceIds.length > 0 && activeDomSources.ids.length > 0) {
                    isGroupActiveDom = group.sourceIds.length === activeDomSources.ids.length && 
                                       group.sourceIds.every(id => activeDomSources.ids.includes(id));
                  } else if (!isGroupActiveDom && group.sourceNames?.length > 0 && activeDomSources.names.length > 0) {
                    // Fuzzy name matching for legacy groups active state
                    if (group.sourceNames.length === activeDomSources.names.length) {
                      isGroupActiveDom = group.sourceNames.every(sn => {
                        const snClean = cleanSourceName(sn);
                        return activeDomSources.names.some(an => {
                          const anClean = cleanSourceName(an);
                          if (snClean === anClean) return true;
                          if (snClean.length >= 7 && (anClean.startsWith(snClean) || snClean.startsWith(anClean))) return true;
                          return false;
                        });
                      });
                    }
                  }
                  
                  const isActiveVisual = isGroupActiveDom || isFocused;
                  const vState = groupVerification[group.id];
                  const isVerified = vState && vState.checkedCount === vState.expectedCount && vState.expectedCount > 0;
                  const hasPartialMatch = vState && vState.checkedCount > 0 && vState.checkedCount < vState.expectedCount;

                  return (
                    <div key={group.id}>
                      <div
                        style={{
                          display: 'flex', alignItems: 'center', padding: '8px 12px',
                          borderRadius: '8px', cursor: 'pointer',
                          background: isFocused ? 'rgba(209, 161, 123, 0.18)' : isActiveVisual ? 'rgba(209, 161, 123, 0.12)' : 'transparent',
                          border: '1px solid ' + (isFocused ? 'rgba(209, 161, 123, 0.5)' : isActiveVisual ? 'rgba(209, 161, 123, 0.35)' : 'transparent'),
                          transition: 'all 0.2s', gap: '8px'
                        }}
                        onClick={(e) => { e.stopPropagation(); handleFocusGroup(group, !isActiveVisual); }}
                      >
                        <div onClick={(e) => { e.stopPropagation(); toggleGroup(group.id); }} style={{ cursor: 'pointer' }}>
                          {group.sourceNames?.length > 0 ? (isGroupOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />) : <div style={{ width: '14px' }} />}
                        </div>
                        <CheckSquare size={14} color={isActiveVisual ? "var(--color-primary)" : "var(--bridgex-text-secondary)"} style={{ opacity: isActiveVisual ? 1 : 0.4 }} />
                        <div style={{ flex: 1, minWidth: 0, fontSize: '12px', fontWeight: 600, color: isActiveVisual ? 'var(--color-primary)' : 'var(--bridgex-text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {group.name}
                        </div>
                        
                        {vState && (
                          <span style={{ fontSize: '9px', fontWeight: 800, padding: '2px 6px', borderRadius: '10px', background: isVerified ? 'rgba(76,175,80,0.1)' : 'rgba(255,152,0,0.1)', color: isVerified ? '#4caf50' : '#ff9800' }}>
                            {vState.checkedCount}/{vState.expectedCount}
                          </span>
                        )}

                        <div style={{ display: 'flex', gap: '4px' }}>
                          <button onClick={(e) => { e.stopPropagation(); handleFocusGroup(group, !isFocused); }} style={{ background: 'none', border: 'none', padding: '2px', cursor: 'pointer', opacity: isFocused ? 1 : 0.4 }}>
                            <Target size={12} color={isFocused ? 'var(--color-primary)' : 'var(--bridgex-text-secondary)'} />
                          </button>
                          <button
                            onClick={async (e) => {
                              e.stopPropagation();
                              const { names: dNames, ids: dIds } = getActiveSourceInfo();
                              if (dNames.length === 0) return alert('Check sources first!');
                              if (confirm(`Re-sync "${group.name}" with full titles?`)) {
                                let fNames = dNames, fIds = dIds;
                                try {
                                  const cNbId = window.location.href.split('/notebook/')[1]?.split('?')[0]?.split('/')[0] || '';
                                  const apiS = await fetchSourceListViaHook(cNbId);
                                  if (apiS.length > 0) {
                                    const rNames: string[] = [], rIds: string[] = [];
                                    dIds.forEach(id => { const s = apiS.find(x => x.id === id); if (s) { rNames.push(s.title); rIds.push(s.id); } });
                                    if (rNames.length > 0) { fNames = rNames; fIds = rIds; }
                                  }
                                } catch (err) {}
                                updateSourceGroup(group.id, { sourceNames: fNames, sourceIds: fIds });
                              }
                            }}
                            style={{ background: 'none', border: 'none', padding: '2px', opacity: 0.4 }}
                          >
                            <RefreshCw size={10} color={(!group.sourceIds || group.sourceIds.length === 0) ? '#ff9800' : 'inherit'} />
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); deleteSourceGroup(group.id); }} style={{ background: 'none', border: 'none', padding: '2px', opacity: 0.4 }}>
                            <X size={10} />
                          </button>
                        </div>
                      </div>

                      {isGroupOpen && (
                        <div style={{ marginLeft: '24px', marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          {(group.sourceNames || []).map((name, i) => (
                            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 8px', background: 'rgba(255,255,255,0.02)', borderRadius: '4px' }}>
                              <span style={{ fontSize: '10px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</span>
                              <button onClick={() => removeFromSourceGroup(group.id, name)} style={{ background: 'none', border: 'none', cursor: 'pointer', opacity: 0.4 }}><X size={8} /></button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={{ marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', padding: '6px 12px', marginBottom: '4px' }}>
                <span style={{ fontSize: '9px', color: 'var(--bridgex-text-secondary)', fontWeight: 800, textTransform: 'uppercase' }}>Studio Outputs</span>
              </div>
              <div style={{ padding: '10px', border: '1px dashed rgba(209,161,123,0.1)', borderRadius: '8px', fontSize: '9px', textAlign: 'center', opacity: 0.5 }}>
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

      {/* Focus Mode Banner */}
      {focusedGroupId && (() => {
        const focusedGroup = sourceGroups.find(g => g.id === focusedGroupId);
        if (!focusedGroup) return null;
        const vState = groupVerification[focusedGroupId];
        const isVerified = vState && vState.checkedCount === vState.expectedCount;
        return (
          <div style={{
            margin: '0 12px', padding: '10px 14px',
            background: 'linear-gradient(135deg, rgba(209, 161, 123, 0.12) 0%, rgba(209, 161, 123, 0.06) 100%)',
            border: '1px solid rgba(209, 161, 123, 0.25)',
            borderRadius: '10px',
            display: 'flex', alignItems: 'center', gap: '10px',
            animation: 'bridgex-fadeIn 0.3s ease-out'
          }}>
            <Target size={14} color="var(--color-primary)" style={{ flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                Focused: "{focusedGroup.name}"
              </div>
              <div style={{ fontSize: '9px', color: 'var(--bridgex-text-secondary)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                {isFocusing ? (
                  <span>Applying focus...</span>
                ) : isVerified ? (
                  <><Check size={9} color="#4caf50" /> Chat & Studio scoped to {vState.checkedCount} sources</>
                ) : vState ? (
                  <><AlertTriangle size={9} color="#ff9800" /> {vState.checkedCount}/{vState.expectedCount} sources matched</>
                ) : (
                  <span>Scoped to {focusedGroup.sourceNames.length} sources</span>
                )}
              </div>
            </div>
            <button
              onClick={() => {
                handleFocusGroup(focusedGroup, false);
              }}
              style={{ 
                background: 'rgba(255, 255, 255, 0.06)', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '6px', padding: '3px 8px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '4px',
                fontSize: '9px', fontWeight: 700, color: 'var(--bridgex-text-secondary)',
                textTransform: 'uppercase', letterSpacing: '0.05em'
              }}
              onMouseOver={e => { e.currentTarget.style.background = 'rgba(232, 113, 91, 0.15)'; e.currentTarget.style.color = '#e8715b'; }}
              onMouseOut={e => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)'; e.currentTarget.style.color = 'var(--bridgex-text-secondary)'; }}
              title="Clear focus and return to all sources"
            >
              <X size={10} /> Clear
            </button>
          </div>
        );
      })()}

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
