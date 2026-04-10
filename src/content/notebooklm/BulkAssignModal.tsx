import React, { useState, useEffect } from 'react';
import { X, Folder, LayoutGrid, CheckCircle2, Search, FileText, Check, Plus, ChevronRight, Layers, ChevronDown, CheckSquare } from 'lucide-react';
import { useStorage } from '../../store';
import { deepQuerySelectorAll } from '../../utils/dom';


interface Source {
  name: string;
  isSelectedInSidebar: boolean;
}

interface BulkAssignModalProps {
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

const BulkAssignModal: React.FC<BulkAssignModalProps> = ({ isOpen, onClose }) => {
  const { folders, notebooks, sourceGroups, bulkAddSourcesToGroup, addSourceGroup } = useStorage();
  const [sources, setSources] = useState<Source[]>([]);
  const [selectedNames, setSelectedNames] = useState<string[]>([]);
  const [search, setSearch] = useState('');

  // Step 2: Notebook selection
  const [selectedNotebookId, setSelectedNotebookId] = useState<string | null>(null);
  const [nbSearch, setNbSearch] = useState('');

  // Step 3: Group selection
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [newGroupName, setNewGroupName] = useState('');
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);

  // Expand folders in notebook picker
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (isOpen) {
      // Scrape sources from the DOM
      const allElements = deepQuerySelectorAll(`
        .source-stretched-button, 
        .artifact-stretched-button, 
        .source-item, 
        mat-list-item[role="option"], 
        mat-list-option,
        .single-source-container,
        [data-source-id]
      `);

      const rawElements = allElements.filter(el => !el.closest('.bridgex-modal, #bridge-root, [id*="bridge"]'));

      const rows = Array.from(new Set(rawElements.map(el =>
        el.closest('mat-list-option, .mdc-list-item, [role="option"], .source-item, .single-source-container') || el.parentElement || el
      )));

      const foundSources: Source[] = [];
      const preSelected: string[] = [];

      rows.forEach(row => {
        if (!(row instanceof HTMLElement)) return;
        const isSelectAll = row.getAttribute('aria-label')?.toLowerCase().includes('select all') ||
                            row.textContent?.toLowerCase().includes('select all sources');
        if (isSelectAll) return;

        const titleEl = Array.from(row.querySelectorAll('.source-stretched-button, .title, .text, .mdc-list-item__primary-text, span, h3, .name'))
          .find(s => s.textContent?.trim().length > 0);

        let title = cleanName(titleEl?.textContent || row.getAttribute('aria-label') || '');

        if (title && title.length > 1 && !foundSources.some(s => s.name === title)) {
          const checkbox = row.querySelector(`
            .mat-mdc-checkbox-checked, .mat-pseudo-checkbox-checked, .mdc-checkbox--selected,
            [aria-checked="true"], [aria-selected="true"],
            .mat-mdc-list-option-selected, .mdc-list-item--selected,
            input[type="checkbox"]:checked
          `) || (row.getAttribute('aria-selected') === 'true' ? row : null);

          const isSelected = !!checkbox;
          foundSources.push({ name: title, isSelectedInSidebar: isSelected });
          if (isSelected) preSelected.push(title);
        }
      });

      setSources(foundSources);
      setSelectedNames(preSelected);
      setSelectedNotebookId(null);
      setSelectedGroupId(null);
      setSearch('');
      setNbSearch('');
      setNewGroupName('');
      setIsCreatingGroup(false);
      setExpandedFolders(new Set());
    }
  }, [isOpen]);

  const toggleSource = (name: string) => {
    setSelectedNames(prev => prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]);
  };

  const toggleFolder = (id: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleCreateGroup = async () => {
    if (!newGroupName.trim() || !selectedNotebookId) return;
    const nb = notebooks.find(n => n.id === selectedNotebookId);
    const notebookLMId = nb?.notebookLMId || selectedNotebookId;
    await addSourceGroup(newGroupName.trim(), [], notebookLMId);
    setNewGroupName('');
    setIsCreatingGroup(false);
    // The group will appear after refreshData via addSourceGroup
  };

  const handleAssign = () => {
    if (!selectedGroupId || selectedNames.length === 0) return;
    bulkAddSourcesToGroup(selectedGroupId, selectedNames);
    onClose();
  };

  if (!isOpen) return null;

  const filteredSources = sources.filter(s => s.name.toLowerCase().includes(search.toLowerCase()));

  // Get groups for the selected notebook
  const selectedNb = notebooks.find(n => n.id === selectedNotebookId);
  const groupsForNotebook = selectedNotebookId
    ? sourceGroups.filter(g => g.notebookId === (selectedNb?.notebookLMId || selectedNotebookId))
    : [];

  // Get notebook destination name for footer
  const selectedNbName = selectedNb?.name || null;
  const selectedGroupName = selectedGroupId ? sourceGroups.find(g => g.id === selectedGroupId)?.name : null;

  // Organize notebooks by folder for the picker
  const foldersWithNotebooks = folders.map(f => ({
    ...f,
    notebooks: notebooks.filter(nb => nb.folderId === f.id)
      .filter(nb => nb.name.toLowerCase().includes(nbSearch.toLowerCase()))
  })).filter(f => f.notebooks.length > 0 || f.name.toLowerCase().includes(nbSearch.toLowerCase()));

  const unsortedNotebooks = notebooks
    .filter(nb => !nb.folderId)
    .filter(nb => nb.name.toLowerCase().includes(nbSearch.toLowerCase()));

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'var(--bridgex-backdrop)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 2147483647, backdropFilter: 'blur(12px)',
      fontFamily: "'Inter', sans-serif", pointerEvents: 'auto' as any
    }}>
      <div style={{
        backgroundColor: 'var(--bridgex-bg-main)', backdropFilter: 'blur(20px)',
        width: '950px', maxHeight: '90vh',
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
            <div style={{ background: 'rgba(209, 161, 123, 0.1)', padding: '8px', borderRadius: '10px' }}>
              <Folder size={20} color="var(--color-primary)" />
            </div>
            <div>
              <h2 style={{ fontSize: '18px', margin: 0, color: 'var(--bridgex-text-primary)', fontWeight: 700, fontFamily: "'Outfit', sans-serif" }}>
                Group Sources
              </h2>
              <p style={{ fontSize: '11px', margin: '2px 0 0 0', color: 'var(--bridgex-text-secondary)', opacity: 0.7 }}>
                Assign to groups inside notebooks
              </p>
            </div>
          </div>
          <button onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--bridgex-text-secondary)', cursor: 'pointer', transition: 'color 0.2s', padding: '6px' }}
            onMouseOver={e => e.currentTarget.style.color = 'var(--bridgex-text-primary)'}
            onMouseOut={e => e.currentTarget.style.color = 'var(--bridgex-text-secondary)'}
          >
            <X size={20} />
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', flex: 1, minHeight: 0, overflow: 'hidden' }}>
          {/* Left Panel: Source Selection */}
          <div style={{ minWidth: 0, minHeight: 0, borderRight: '1px solid var(--bridgex-border)', display: 'flex', flexDirection: 'column', background: 'var(--bridgex-bg-main)' }}>
            <div style={{ padding: '20px 20px 14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <p style={{ fontSize: '10px', color: 'var(--color-primary)', textTransform: 'uppercase', margin: 0, fontWeight: 800, letterSpacing: '0.08em' }}>
                  Step 1: MATCHED_TEST Select Sources ({selectedNames.length})
                </p>
                <div style={{ display: 'flex', gap: '10px', flexShrink: 0 }}>
                  <button 
                    disabled={search.trim() === ''}
                    onClick={() => {
                      const matchedNames = filteredSources.map(s => s.name);
                      setSelectedNames(prev => Array.from(new Set([...prev, ...matchedNames])));
                    }}
                    style={{ 
                      background: search.trim() === '' ? 'transparent' : 'rgba(209, 161, 123, 0.1)', 
                      border: '1px solid ' + (search.trim() === '' ? 'var(--bridgex-border)' : 'rgba(209, 161, 123, 0.2)'),
                      color: search.trim() === '' ? 'var(--bridgex-text-secondary)' : 'var(--color-primary)', 
                      fontSize: '9px', fontWeight: 800, cursor: search.trim() === '' ? 'not-allowed' : 'pointer', 
                      padding: '2px 8px', borderRadius: '6px', transition: 'all 0.2s',
                      display: 'flex', alignItems: 'center', gap: '4px',
                      opacity: search.trim() === '' ? 0.4 : 1
                    }}
                    onMouseOver={e => { if (search.trim() !== '') e.currentTarget.style.background = 'rgba(209, 161, 123, 0.2)'; }}
                    onMouseOut={e => { if (search.trim() !== '') e.currentTarget.style.background = 'rgba(209, 161, 123, 0.1)'; }}
                  >
                    <CheckSquare size={10} />
                    MATCHED
                  </button>
                  <button onClick={() => setSelectedNames(sources.map(s => s.name))}
                    style={{ background: 'none', border: 'none', color: 'var(--color-primary)', fontSize: '10px', fontWeight: 700, cursor: 'pointer', padding: 0 }}>
                    ALL
                  </button>
                  <button onClick={() => setSelectedNames([])}
                    style={{ background: 'none', border: 'none', color: 'var(--bridgex-text-secondary)', fontSize: '10px', fontWeight: 700, cursor: 'pointer', padding: 0 }}>
                    CLEAR
                  </button>
                </div>
              </div>
              <div style={{
                display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px',
                backgroundColor: 'var(--bridgex-surface)', borderRadius: '12px', border: '1px solid var(--bridgex-border)'
              }}>
                <Search size={14} color="var(--bridgex-text-secondary)" />
                <input
                  value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Filter sources..."
                  style={{ background: 'none', border: 'none', outline: 'none', color: 'var(--bridgex-text-primary)', fontSize: '13px', width: '100%' }}
                />
              </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px 16px' }}>
              {filteredSources.length === 0 ? (
                <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--bridgex-text-secondary)', fontSize: '13px' }}>
                  No sources found in currently open notebook.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  {filteredSources.map(s => (
                    <div
                      key={s.name} onClick={() => toggleSource(s.name)}
                      style={{
                        padding: '9px 12px', borderRadius: '10px', cursor: 'pointer',
                        backgroundColor: selectedNames.includes(s.name) ? 'rgba(209, 161, 123, 0.08)' : 'transparent',
                        display: 'flex', alignItems: 'center', gap: '10px', transition: 'all 0.15s',
                        width: '100%', boxSizing: 'border-box', minWidth: 0
                      }}
                      onMouseOver={e => { if (!selectedNames.includes(s.name)) e.currentTarget.style.backgroundColor = 'var(--bridgex-surface-hover)'; }}
                      onMouseOut={e => { if (!selectedNames.includes(s.name)) e.currentTarget.style.backgroundColor = 'transparent'; }}
                    >
                      <div style={{
                        flexShrink: 0, width: '16px', height: '16px', borderRadius: '4px',
                        border: '1px solid ' + (selectedNames.includes(s.name) ? 'var(--color-primary)' : 'var(--bridgex-border)'),
                        backgroundColor: selectedNames.includes(s.name) ? 'var(--color-primary)' : 'transparent',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                      }}>
                        {selectedNames.includes(s.name) && <Check size={10} color="var(--bridgex-bg-solid)" strokeWidth={4} />}
                      </div>
                      <FileText size={14} style={{ flexShrink: 0 }} color={selectedNames.includes(s.name) ? 'var(--color-primary)' : 'var(--bridgex-text-secondary)'} />
                      <span style={{
                        fontSize: '12px',
                        color: selectedNames.includes(s.name) ? 'var(--bridgex-text-primary)' : 'var(--bridgex-text-secondary)',
                        fontWeight: selectedNames.includes(s.name) ? 600 : 400,
                        flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0
                      }}>{s.name}</span>
                      {s.isSelectedInSidebar && (
                        <span style={{
                          flexShrink: 0, fontSize: '8px', background: 'rgba(129, 201, 149, 0.12)',
                          color: '#81C995', padding: '2px 5px', borderRadius: '4px', fontWeight: 800,
                          border: '1px solid rgba(129, 201, 149, 0.2)'
                        }}>ACTIVE</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Panel: Notebook + Group Destination */}
          <div style={{ 
            flex: 1, 
            minWidth: 0, 
            minHeight: 0, 
            display: 'grid', 
            gridTemplateRows: selectedNotebookId ? '280px 1fr' : '1fr', 
            background: 'var(--bridgex-bg-main)', // Use solid background from root
            overflow: 'hidden',
            position: 'relative'
          }}>
            {/* Step 2: Choose Notebook */}
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              minHeight: 0,
              borderBottom: selectedNotebookId ? '1px solid var(--bridgex-border)' : 'none',
              overflow: 'hidden',
              backgroundColor: 'var(--bridgex-bg-main)' // Solid background
            }}>
              <div style={{ padding: '20px 20px 14px' }}>
                <p style={{ fontSize: '10px', color: 'var(--color-primary)', textTransform: 'uppercase', margin: '0 0 10px 0', fontWeight: 800, letterSpacing: '0.08em' }}>
                  Step 2: Choose Notebook
                </p>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px',
                  backgroundColor: 'var(--bridgex-bg-main)', borderRadius: '12px', border: '1px solid var(--bridgex-border)'
                }}>
                  <Search size={14} color="var(--bridgex-text-secondary)" />
                  <input
                    value={nbSearch} onChange={e => setNbSearch(e.target.value)}
                    placeholder="Find notebook..."
                    style={{ background: 'none', border: 'none', outline: 'none', color: 'var(--bridgex-text-primary)', fontSize: '13px', width: '100%' }}
                  />
                </div>
              </div>

              <div style={{ 
                flex: 1, 
                overflowY: 'auto', 
                padding: '0 16px 12px'
              }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  {/* Folders with notebooks */}
                  {foldersWithNotebooks.map(folder => (
                    <div key={folder.id}>
                      <div
                        onClick={() => toggleFolder(folder.id)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 10px',
                          borderRadius: '8px', cursor: 'pointer', fontSize: '10px', fontWeight: 700,
                          color: 'var(--bridgex-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em'
                        }}
                        onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                        onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                      >
                        {expandedFolders.has(folder.id) ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                        <Folder size={12} color="var(--color-primary)" />
                        {folder.name}
                      </div>
                      {expandedFolders.has(folder.id) && folder.notebooks.map(nb => (
                        <div
                          key={nb.id}
                          onClick={() => { setSelectedNotebookId(nb.id); setSelectedGroupId(null); }}
                          style={{
                            display: 'flex', alignItems: 'center', gap: '10px',
                            padding: '10px 14px', marginLeft: '16px', borderRadius: '10px', cursor: 'pointer',
                            border: '1px solid ' + (selectedNotebookId === nb.id ? 'var(--color-primary)' : 'transparent'),
                            backgroundColor: selectedNotebookId === nb.id ? 'rgba(209, 161, 123, 0.1)' : 'transparent',
                            transition: 'all 0.15s'
                          }}
                          onMouseOver={e => { if (selectedNotebookId !== nb.id) e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.03)'; }}
                          onMouseOut={e => { if (selectedNotebookId !== nb.id) e.currentTarget.style.backgroundColor = 'transparent'; }}
                        >
                          <Layers size={14} color="var(--color-primary)" style={{ flexShrink: 0, opacity: 0.7 }} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--bridgex-text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {nb.name}
                            </div>
                          </div>
                          {selectedNotebookId === nb.id && <CheckCircle2 size={16} color="var(--color-primary)" style={{ flexShrink: 0 }} />}
                        </div>
                      ))}
                    </div>
                  ))}

                  {/* Unsorted notebooks */}
                  {unsortedNotebooks.length > 0 && (
                    <div>
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 10px',
                        fontSize: '10px', fontWeight: 700, color: 'var(--bridgex-text-secondary)',
                        textTransform: 'uppercase', letterSpacing: '0.05em'
                      }}>
                        Unsorted
                      </div>
                      {unsortedNotebooks.map(nb => (
                        <div
                          key={nb.id}
                          onClick={() => { setSelectedNotebookId(nb.id); setSelectedGroupId(null); }}
                          style={{
                            display: 'flex', alignItems: 'center', gap: '10px',
                            padding: '10px 14px', borderRadius: '10px', cursor: 'pointer',
                            border: '1px solid ' + (selectedNotebookId === nb.id ? 'var(--color-primary)' : 'transparent'),
                            backgroundColor: selectedNotebookId === nb.id ? 'rgba(209, 161, 123, 0.1)' : 'transparent',
                            transition: 'all 0.15s'
                          }}
                          onMouseOver={e => { if (selectedNotebookId !== nb.id) e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.03)'; }}
                          onMouseOut={e => { if (selectedNotebookId !== nb.id) e.currentTarget.style.backgroundColor = 'transparent'; }}
                        >
                          <Layers size={14} color="var(--color-primary)" style={{ flexShrink: 0, opacity: 0.7 }} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--bridgex-text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {nb.name}
                            </div>
                          </div>
                          {selectedNotebookId === nb.id && <CheckCircle2 size={16} color="var(--color-primary)" style={{ flexShrink: 0 }} />}
                        </div>
                      ))}
                    </div>
                  )}

                  {foldersWithNotebooks.length === 0 && unsortedNotebooks.length === 0 && (
                    <div style={{ padding: '24px', textAlign: 'center', color: 'var(--bridgex-text-secondary)', fontSize: '12px', fontStyle: 'italic' }}>
                      No notebooks found. Create notebooks in the sidebar first.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Step 3: Choose Group (only after notebook selected) */}
            {selectedNotebookId && (
              <div style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                minHeight: 0,
                backgroundColor: 'var(--bridgex-bg-main)', // Solid background
                borderTop: '1px solid var(--bridgex-border)',
                overflow: 'hidden'
              }}>
                <div style={{ padding: '16px 20px 10px' }}>
                  <p style={{ fontSize: '10px', color: 'var(--color-primary)', textTransform: 'uppercase', margin: 0, fontWeight: 800, letterSpacing: '0.08em' }}>
                    Step 3: Choose Group in "{selectedNbName}"
                  </p>
                </div>
                <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px 16px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {groupsForNotebook.map(group => (
                      <div
                        key={group.id}
                        onClick={() => setSelectedGroupId(group.id)}
                        style={{
                          padding: '12px 16px', borderRadius: '12px', cursor: 'pointer',
                          border: '1px solid ' + (selectedGroupId === group.id ? 'var(--color-primary)' : 'var(--bridgex-border)'),
                          backgroundColor: selectedGroupId === group.id ? 'rgba(209, 161, 123, 0.1)' : 'var(--bridgex-bg-main)',
                          display: 'flex', alignItems: 'center', gap: '12px', transition: 'all 0.2s'
                        }}
                        onMouseOver={e => { if (selectedGroupId !== group.id) e.currentTarget.style.backgroundColor = 'var(--bridgex-surface-hover)'; }}
                        onMouseOut={e => { if (selectedGroupId !== group.id) e.currentTarget.style.backgroundColor = 'var(--bridgex-bg-main)'; }}
                      >
                        <LayoutGrid size={16} color="var(--color-primary)" style={{ opacity: 0.7 }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--bridgex-text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {group.name}
                          </div>
                          <div style={{ fontSize: '10px', color: 'var(--bridgex-text-secondary)' }}>
                            {group.sourceNames?.length || 0} sources
                          </div>
                        </div>
                        {selectedGroupId === group.id && <CheckCircle2 size={16} color="var(--color-primary)" style={{ flexShrink: 0 }} />}
                      </div>
                    ))}

                    {groupsForNotebook.length === 0 && !isCreatingGroup && (
                      <div style={{
                        padding: '24px', textAlign: 'center', color: 'var(--bridgex-text-secondary)',
                        fontSize: '12px', border: '1px dashed var(--bridgex-border)', borderRadius: '14px'
                      }}>
                        No groups in this notebook yet. Create one below.
                      </div>
                    )}

                    {/* Create New Group */}
                    {isCreatingGroup ? (
                      <div style={{
                        padding: '12px 16px', borderRadius: '12px',
                        border: '1px solid rgba(209, 161, 123, 0.3)',
                        backgroundColor: 'rgba(209, 161, 123, 0.05)',
                        display: 'flex', alignItems: 'center', gap: '10px'
                      }}>
                        <input
                          type="text"
                          value={newGroupName}
                          onChange={e => setNewGroupName(e.target.value)}
                          placeholder="Group name..."
                          autoFocus
                          onKeyDown={e => { if (e.key === 'Enter') handleCreateGroup(); if (e.key === 'Escape') { setIsCreatingGroup(false); setNewGroupName(''); } }}
                          style={{
                            flex: 1, background: 'none', border: 'none', outline: 'none',
                            color: 'var(--bridgex-text-primary)', fontSize: '13px', fontWeight: 600
                          }}
                        />
                        <button
                          onClick={handleCreateGroup}
                          style={{
                            background: 'var(--color-primary)', border: 'none', borderRadius: '8px',
                            padding: '6px 14px', color: 'var(--bridgex-bg-solid)',
                            fontSize: '11px', fontWeight: 800, cursor: 'pointer'
                          }}
                        >
                          Create
                        </button>
                        <button
                          onClick={() => { setIsCreatingGroup(false); setNewGroupName(''); }}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: 'var(--bridgex-text-secondary)' }}
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setIsCreatingGroup(true)}
                        style={{
                          padding: '12px 16px', borderRadius: '12px', cursor: 'pointer',
                          border: '1px dashed rgba(209, 161, 123, 0.3)',
                          backgroundColor: 'transparent',
                          display: 'flex', alignItems: 'center', gap: '10px',
                          color: 'var(--color-primary)', fontSize: '12px', fontWeight: 700,
                          transition: 'all 0.2s'
                        }}
                        onMouseOver={e => e.currentTarget.style.backgroundColor = 'rgba(209, 161, 123, 0.05)'}
                        onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        <Plus size={14} />
                        Create New Group
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '20px 28px', borderTop: '1px solid var(--bridgex-border)', display: 'flex', gap: '16px', justifyContent: 'space-between',
          backgroundColor: 'var(--bridgex-surface)', alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
            <div style={{ padding: '5px 12px', background: 'rgba(209, 161, 123, 0.1)', borderRadius: '8px', border: '1px solid rgba(209,161,123,0.2)' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-primary)' }}>{selectedNames.length} sources</span>
            </div>
            <ChevronRight size={14} color="var(--bridgex-text-secondary)" />
            <span style={{ fontSize: '12px', fontWeight: 600, color: selectedNbName ? 'var(--bridgex-text-primary)' : 'var(--bridgex-text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {selectedNbName || 'Select notebook'}
            </span>
            {selectedNbName && (
              <>
                <ChevronRight size={14} color="var(--bridgex-text-secondary)" />
                <span style={{ fontSize: '12px', fontWeight: 600, color: selectedGroupName ? 'var(--color-primary)' : 'var(--bridgex-text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {selectedGroupName || 'Select group'}
                </span>
              </>
            )}
          </div>

          <div style={{ display: 'flex', gap: '12px', flexShrink: 0 }}>
            <button onClick={onClose}
              style={{
                padding: '10px 20px', borderRadius: '12px', border: '1px solid var(--bridgex-border)',
                backgroundColor: 'transparent', color: 'var(--bridgex-text-secondary)',
                fontSize: '13px', fontWeight: 600, cursor: 'pointer'
              }}>
              Cancel
            </button>
            <button
              disabled={!selectedGroupId || selectedNames.length === 0}
              onClick={handleAssign}
              style={{
                padding: '10px 28px', borderRadius: '12px', border: 'none',
                backgroundColor: (!selectedGroupId || selectedNames.length === 0) ? 'rgba(209, 161, 123, 0.2)' : 'var(--color-primary)',
                color: (!selectedGroupId || selectedNames.length === 0) ? 'rgba(255, 255, 255, 0.3)' : 'var(--bridgex-bg-solid)',
                fontSize: '13px', fontWeight: 700,
                cursor: (!selectedGroupId || selectedNames.length === 0) ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
                boxShadow: (!selectedGroupId || selectedNames.length === 0) ? 'none' : '0 8px 24px rgba(209, 161, 123, 0.3)',
                whiteSpace: 'nowrap'
              }}>
              Assign to Group
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BulkAssignModal;
