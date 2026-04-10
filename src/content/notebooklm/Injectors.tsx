import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Sparkles, Activity, Upload, GitMerge, Folder, ChevronDown, LayoutGrid, Copy, Tag, Filter, MoreVertical, Plus, FolderPlus, CheckSquare, Search, X, Trash2 } from 'lucide-react';
import BulkDeleteModal from './BulkDeleteModal';
import NotebookCheckbox from './NotebookCheckbox';
import DashboardBulkBar from './DashboardBulkBar';
import { DuplicateButton } from './DuplicateButton';
import { useStorage } from '../../store';
import CreateFolderModal from './CreateFolderModal';
import { isContextValid, isContextInvalidatedError, debounce } from '../../utils/context';

import { deepQuerySelectorAll } from '../../utils/dom';


const SourcesHeaderButtons: React.FC<{ 
  onPowerImport: () => void, 
  onCombine: () => void,
  onGroupAssign: () => void,
  onBatchClear: () => void
}> = ({ onPowerImport, onCombine, onGroupAssign, onBatchClear }) => {
  return (
    <div style={{ display: 'flex', width: '100%', flexWrap: 'wrap', justifyContent: 'center', gap: '10px', marginTop: '8px', marginBottom: '8px', alignItems: 'center' }}>
      <button 
        onClick={(e) => { e.stopPropagation(); onPowerImport(); }}
        style={{
          padding: '8px 16px', borderRadius: '20px', border: '1px solid var(--bridgex-border)',
          backgroundColor: 'var(--bridgex-surface)', color: 'var(--bridgex-text-primary)', fontSize: '12px', fontWeight: 700,
          display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer',
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          textTransform: 'uppercase', letterSpacing: '0.03em', outline: 'none'
        }}
        onMouseOver={e => { e.currentTarget.style.backgroundColor = 'rgba(209, 161, 123, 0.15)'; e.currentTarget.style.borderColor = 'var(--color-primary)'; }}
        onMouseOut={e => { e.currentTarget.style.backgroundColor = 'var(--bridgex-surface)'; e.currentTarget.style.borderColor = 'var(--bridgex-border)'; }}
      >
        <Upload size={14} color="var(--color-primary)" />
        Power Import
      </button>
      <button 
        onClick={(e) => { e.stopPropagation(); onCombine(); }}
        style={{
          padding: '8px 16px', borderRadius: '20px', border: '1px solid var(--bridgex-border)',
          backgroundColor: 'var(--bridgex-surface)', color: 'var(--bridgex-text-primary)', fontSize: '12px', fontWeight: 700,
          display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer',
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          textTransform: 'uppercase', letterSpacing: '0.03em', outline: 'none'
        }}
        onMouseOver={e => { e.currentTarget.style.backgroundColor = 'rgba(209, 161, 123, 0.15)'; e.currentTarget.style.borderColor = 'var(--color-primary)'; }}
        onMouseOut={e => { e.currentTarget.style.backgroundColor = 'var(--bridgex-surface)'; e.currentTarget.style.borderColor = 'var(--bridgex-border)'; }}
      >
        <GitMerge size={14} color="var(--color-primary)" />
        Combine
      </button>
      <button 
        onClick={(e) => { e.stopPropagation(); onGroupAssign(); }}
        style={{
          padding: '8px 16px', borderRadius: '20px', border: '1px solid var(--bridgex-border)',
          backgroundColor: 'var(--bridgex-surface)', color: 'var(--bridgex-text-primary)', fontSize: '12px', fontWeight: 700,
          display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer',
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          textTransform: 'uppercase', letterSpacing: '0.03em', outline: 'none'
        }}
        onMouseOver={e => { e.currentTarget.style.backgroundColor = 'rgba(209, 161, 123, 0.15)'; e.currentTarget.style.borderColor = 'var(--color-primary)'; }}
        onMouseOut={e => { e.currentTarget.style.backgroundColor = 'var(--bridgex-surface)'; e.currentTarget.style.borderColor = 'var(--bridgex-border)'; }}
      >
        <FolderPlus size={14} color="var(--color-primary)" />
        Group Sources
      </button>
      <button 
        onClick={(e) => { e.stopPropagation(); onBatchClear(); }}
        style={{
          padding: '8px 16px', borderRadius: '20px', border: '1px solid var(--bridgex-border)',
          backgroundColor: 'var(--bridgex-surface)', color: 'var(--bridgex-text-primary)', fontSize: '12px', fontWeight: 700,
          display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer',
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          textTransform: 'uppercase', letterSpacing: '0.03em', outline: 'none'
        }}
        onMouseOver={e => { e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.15)'; e.currentTarget.style.borderColor = '#EF4444'; }}
        onMouseOut={e => { e.currentTarget.style.backgroundColor = 'var(--bridgex-surface)'; e.currentTarget.style.borderColor = 'var(--bridgex-border)'; }}
      >
        <Trash2 size={14} color="#EF4444" />
        Batch Clear
      </button>
    </div>
  );
};


const DashboardHeaderButtons: React.FC<{ 
  onBulkAssign: () => void,
  onOpenCreateFolder: () => void 
}> = ({ onBulkAssign, onOpenCreateFolder }) => {
  return (
    <div 
      id="bridgex-dashboard-actions"
      style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '8px',
        pointerEvents: 'auto',
        fontFamily: "'Google Sans', 'Inter', system-ui, sans-serif"
      }}
    >
       <button 
        onClick={(e) => { e.stopPropagation(); onBulkAssign(); }}
        style={{
          padding: '8px 16px', borderRadius: '20px', border: 'none',
          backgroundColor: 'transparent', color: 'var(--bridgex-text-primary, #444)', fontSize: '13px', fontWeight: 500,
          display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer',
          transition: 'background-color 0.2s',
          outline: 'none', height: '36px',
          whiteSpace: 'nowrap'
        }}
        onMouseOver={e => { e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.06)'; }}
        onMouseOut={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}
      >
        <FolderPlus size={16} color="var(--color-primary, #D1A17B)" />
        Organize Folders
      </button>
      <button 
        onClick={(e) => { e.stopPropagation(); onOpenCreateFolder(); }}
        style={{
          padding: '8px 16px', borderRadius: '20px', border: 'none',
          backgroundColor: 'var(--color-primary, #D1A17B)', color: 'white', fontSize: '13px', fontWeight: 600,
          display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer',
          transition: 'all 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
          outline: 'none', height: '36px',
          whiteSpace: 'nowrap'
        }}
        onMouseOver={e => { e.currentTarget.style.opacity = '0.85'; }}
        onMouseOut={e => { e.currentTarget.style.opacity = '1'; }}
      >
        <Plus size={16} />
        New Folder
      </button>
    </div>
  );
};


const SourceSearchBox: React.FC = () => {
  const { sourceSearchQuery, setSourceSearchQuery } = useStorage();
  const prevSelectionRef = useRef<Set<string> | null>(null);
  const debounceTimerRef = useRef<any>(null);

  // Auto-check matching sources when search query changes
  useEffect(() => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      const sourcePanel = document.querySelector('.source-panel-content') || document.querySelector('mat-selection-list');
      if (!sourcePanel) return;

      // Find source rows — Strategy 1: find "Select all sources" by text match
      const children = Array.from(sourcePanel.children) as HTMLElement[];
      let selectAllIdx = -1;
      for (let i = 0; i < children.length; i++) {
        if (children[i].id?.includes('bridge')) continue;
        const text = (children[i].textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();
        if (text.includes('select all sources')) {
          selectAllIdx = i;
          break;
        }
      }

      // Strategy 2: walk from discovery textarea to find first element with mat-checkbox
      if (selectAllIdx < 0) {
        const discoveryTextarea = sourcePanel.querySelector('textarea');
        if (discoveryTextarea) {
          let el: Element | null = discoveryTextarea;
          while (el) {
            el = el.nextElementSibling;
            if (!el) break;
            if (el.querySelector('mat-checkbox')) {
              selectAllIdx = children.indexOf(el as HTMLElement);
              break;
            }
          }
        }
      }
      if (selectAllIdx < 0) return;

      // Source rows are all direct children AFTER the "Select all sources" row
      const allSourceRows = children.slice(selectAllIdx + 1).filter(el => {
        if (el.id?.includes('bridge') || (el.className || '').includes('bridgex')) return false;
        // Must contain a mat-checkbox to be a real source row
        if (!el.querySelector('mat-checkbox')) return false;
        return true;
      });

      // Helper: check if a source row is currently selected
      const isRowSelected = (row: HTMLElement) => {
        const cb = row.querySelector('mat-checkbox');
        if (!cb) return false;
        return cb.classList.contains('mat-mdc-checkbox-checked') || 
               row.getAttribute('aria-checked') === 'true';
      };

      // Helper: get the display name of a source row
      const getRowName = (row: HTMLElement) => {
        const titleEl = row.querySelector('.source-title, .title, .name, .mdc-list-item__primary-text, .source-item-title') || row;
        return (titleEl.textContent || '')
          .replace(/check_box_outline_blank|check_box|check|done|radio_button_unchecked/gi, '')
          .replace(/\n/g, ' ').trim().toLowerCase();
      };

      // Helper: click the mat-checkbox to toggle its check state
      const clickSource = (row: HTMLElement) => {
        const matCheckbox = row.querySelector('mat-checkbox');
        if (matCheckbox) {
          // Click the inner checkbox input or the mat-checkbox itself
          const inner = matCheckbox.querySelector('.mdc-checkbox, .mdc-checkbox__native-control, input[type="checkbox"]');
          if (inner) (inner as HTMLElement).click();
          else (matCheckbox as HTMLElement).click();
        } else {
          row.click();
        }
      };

      if (sourceSearchQuery.trim()) {
        // Save the current selection state before filtering (only once)
        if (prevSelectionRef.current === null) {
          prevSelectionRef.current = new Set<string>();
          allSourceRows.forEach(row => {
            if (isRowSelected(row)) {
              prevSelectionRef.current!.add(getRowName(row));
            }
          });
        }

        const query = sourceSearchQuery.toLowerCase();
        allSourceRows.forEach(row => {
          const name = getRowName(row);
          const matches = name.includes(query);
          const selected = isRowSelected(row);
          // Check matching, uncheck non-matching
          if (matches && !selected) clickSource(row);
          else if (!matches && selected) clickSource(row);
        });
      } else {
        // Query cleared — restore original selection state
        if (prevSelectionRef.current !== null) {
          allSourceRows.forEach(row => {
            const name = getRowName(row);
            const wasSelected = prevSelectionRef.current!.has(name);
            const isSelected = isRowSelected(row);
            if (wasSelected && !isSelected) clickSource(row);
            else if (!wasSelected && isSelected) clickSource(row);
          });
          prevSelectionRef.current = null;
        }
      }
    }, 350);

    return () => { if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current); };
  }, [sourceSearchQuery]);

  return (
    <div style={{ 
      position: 'relative', 
      width: 'calc(100% - 24px)', 
      margin: '4px auto 10px', 
      minHeight: '36px',
      boxSizing: 'border-box',
    }}>
      <Search size={15} color="var(--bridgex-text-secondary)" style={{ position: 'absolute', left: '26px', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} />
      <input 
        type="text" 
        placeholder="Filter sources..." 
        value={sourceSearchQuery}
        onChange={(e) => setSourceSearchQuery(e.target.value)}
        style={{
          width: '100%',
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid rgba(128, 128, 128, 0.2)',
          borderRadius: '24px',
          padding: '10px 36px 10px 42px',
          fontSize: '13px',
          color: 'var(--bridgex-text-primary)',
          outline: 'none',
          boxSizing: 'border-box',
          transition: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
          display: 'block'
        }}
        onFocus={e => { 
          e.currentTarget.style.borderColor = 'var(--color-primary)'; 
          e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.06)';
          e.currentTarget.style.boxShadow = '0 0 0 1px var(--color-primary)';
        }}
        onBlur={e => { 
          e.currentTarget.style.borderColor = 'rgba(128, 128, 128, 0.2)'; 
          e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.03)';
          e.currentTarget.style.boxShadow = 'none';
        }}
      />
      {sourceSearchQuery && (
        <X 
          size={14} 
          color="var(--bridgex-text-secondary)" 
          style={{ 
            position: 'absolute', 
            right: '24px', 
            top: '50%', 
            transform: 'translateY(-50%)', 
            cursor: 'pointer',
            opacity: 0.5
          }}
          onClick={() => setSourceSearchQuery('')}
          onMouseOver={e => e.currentTarget.style.opacity = '1'}
          onMouseOut={e => e.currentTarget.style.opacity = '0.5'}
        />
      )}
    </div>
  );
};


const SourceRowIcon: React.FC<{ onAssign: () => void }> = React.memo(({ onAssign }) => {
  return (
    <div 
      onClick={(e) => { e.stopPropagation(); onAssign(); }}
      title="Assign to Folder"
      style={{
        position: 'absolute', right: '40px', top: '50%', transform: 'translateY(-50%)',
        padding: '8px', cursor: 'pointer', opacity: 0.7,
        display: 'flex', alignItems: 'center', zIndex: 1000,
        backgroundColor: 'var(--bridgex-bg-main)', borderRadius: '8px',
        border: '1px solid var(--bridgex-border)',
        boxShadow: '0 4px 12px var(--bridgex-shadow)',
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
      }}
      onMouseOver={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.borderColor = 'var(--color-primary)'; e.currentTarget.style.transform = 'translateY(-50%) scale(1.05)'; }}
      onMouseOut={e => { e.currentTarget.style.opacity = '0.7'; e.currentTarget.style.borderColor = 'var(--bridgex-border)'; e.currentTarget.style.transform = 'translateY(-50%) scale(1)'; }}
    >
      <Folder size={14} color="var(--color-primary)" />
    </div>
  );
});

const FolderSelectMenu: React.FC<{ 
  onClose: () => void, 
  onSelect: (id: string, type: 'folder' | 'group') => void,
  position: { top: number, left: number }
}> = ({ onClose, onSelect, position }) => {
  const { folders, sourceGroups } = useStorage();

  useEffect(() => {
    const handleClose = () => onClose();
    window.addEventListener('click', handleClose);
    return () => window.removeEventListener('click', handleClose);
  }, [onClose]);

  return (
    <div 
      onClick={e => e.stopPropagation()}
      style={{
        position: 'fixed', top: position.top, left: position.left,
        zIndex: 1000000, background: 'var(--bridgex-bg-main)', border: '1px solid var(--bridgex-border)',
        borderRadius: '16px', padding: '12px', minWidth: '220px',
        boxShadow: '0 12px 48px var(--bridgex-shadow)', display: 'flex', flexDirection: 'column', gap: '6px',
        backdropFilter: 'blur(20px)'
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {folders.map(f => (
          <div key={f.id} onClick={() => { onSelect(f.id, 'folder'); onClose(); }}
            style={{ 
              padding: '10px 12px', borderRadius: '10px', cursor: 'pointer', fontSize: '13px', 
              color: 'var(--bridgex-text-primary)', display: 'flex', alignItems: 'center', gap: '10px',
              transition: 'all 0.15s'
            }}
            onMouseOver={e => e.currentTarget.style.background = 'var(--bridgex-surface-hover)'} onMouseOut={e => e.currentTarget.style.background = 'transparent'}
          >
            <Folder size={15} color="var(--color-primary)" /> {f.name}
          </div>
        ))}
      </div>
      
      <div style={{ marginTop: '6px', padding: '10px 10px 6px', fontSize: '10px', fontWeight: 900, color: 'var(--bridgex-text-secondary)', letterSpacing: '0.12em', textTransform: 'uppercase', borderTop: '1px solid var(--bridgex-border)' }}>CLUSTER GROUPS</div>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {sourceGroups.map(g => (
          <div key={g.id} onClick={() => { onSelect(g.id, 'group'); onClose(); }}
            style={{ 
              padding: '10px 12px', borderRadius: '10px', cursor: 'pointer', fontSize: '13px', 
              color: 'var(--bridgex-text-primary)', display: 'flex', alignItems: 'center', gap: '10px',
              transition: 'all 0.15s'
            }}
            onMouseOver={e => e.currentTarget.style.background = 'var(--bridgex-surface-hover)'} onMouseOut={e => e.currentTarget.style.background = 'transparent'}
          >
            <LayoutGrid size={15} color="var(--color-primary)" /> {g.name}
          </div>
        ))}
      </div>
    </div>
  );
};

const NotebookActionMenu: React.FC<{ 
  notebookId: string,
  onClose: () => void, 
  position: { top: number, left: number }
}> = ({ notebookId, onClose, position }) => {
  const { folders, tags, notebookMappings, assignNotebookToFolder, toggleNotebookTag } = useStorage();
  const mapping = notebookMappings[notebookId] || {};

  useEffect(() => {
    const handleClose = () => onClose();
    window.addEventListener('click', handleClose);
    return () => window.removeEventListener('click', handleClose);
  }, [onClose]);

  return (
    <div 
      onClick={e => e.stopPropagation()}
      style={{
        position: 'fixed', top: position.top, left: position.left,
        zIndex: 1000000, background: 'var(--bridgex-bg-main)', border: '1px solid var(--bridgex-border)',
        borderRadius: '16px', padding: '12px', minWidth: '220px',
        boxShadow: '0 12px 48px var(--bridgex-shadow)', display: 'flex', flexDirection: 'column', gap: '6px',
        backdropFilter: 'blur(20px)'
      }}
    >
      <div style={{ padding: '6px 10px', fontSize: '10px', fontWeight: 900, color: 'var(--bridgex-text-secondary)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>FILE DESTINATION</div>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
        <div 
          onClick={() => { assignNotebookToFolder(notebookId, null); onClose(); }}
          style={{ 
            padding: '10px 12px', borderRadius: '10px', cursor: 'pointer', fontSize: '13px', 
            color: mapping.folderId ? 'var(--bridgex-text-primary)' : 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '10px',
            background: mapping.folderId ? 'transparent' : 'rgba(209, 161, 123, 0.1)',
            transition: 'all 0.15s'
          }}
          onMouseOver={e => e.currentTarget.style.background = 'var(--bridgex-surface-hover)'} 
          onMouseOut={e => e.currentTarget.style.background = mapping.folderId ? 'transparent' : 'rgba(209, 161, 123, 0.1)'}
        >
          Uncategorized
        </div>
        {folders.map(f => (
          <div key={f.id} onClick={() => { assignNotebookToFolder(notebookId, f.id); onClose(); }}
            style={{ 
              padding: '10px 12px', borderRadius: '10px', cursor: 'pointer', fontSize: '13px', 
              color: mapping.folderId === f.id ? 'var(--color-primary)' : 'var(--bridgex-text-primary)', 
              display: 'flex', alignItems: 'center', gap: '10px',
              background: mapping.folderId === f.id ? 'rgba(209, 161, 123, 0.1)' : 'transparent',
              transition: 'all 0.15s'
            }}
            onMouseOver={e => e.currentTarget.style.background = 'var(--bridgex-surface-hover)'} 
            onMouseOut={e => e.currentTarget.style.background = mapping.folderId === f.id ? 'rgba(209, 161, 123, 0.1)' : 'transparent'}
          >
            <Folder size={15} color="var(--color-primary)" /> {f.name}
          </div>
        ))}
      </div>
    </div>
  );
};

const CardTags: React.FC<{ notebookId: string }> = React.memo(({ notebookId }) => {
  const { tags, notebookMappings, folders } = useStorage();
  const mapping = notebookMappings[notebookId];
  if (!mapping) return null;

  const activeTags = tags.filter(t => mapping.tagIds?.includes(t.id));
  const activeFolder = folders.find(f => f.id === mapping.folderId);

  if (!activeFolder && activeTags.length === 0) return null;

  return (
    <div style={{
      position: 'absolute', top: '16px', left: '16px',
      display: 'flex', flexWrap: 'wrap', gap: '6px', zIndex: 10, maxWidth: '80%'
    }}>
      {activeFolder && (
        <span style={{
          background: 'rgba(209, 161, 123, 0.15)', color: 'var(--color-primary)', fontSize: '10px', fontWeight: 900,
          padding: '4px 10px', borderRadius: '20px', border: '1px solid rgba(209,161,123,0.3)',
          display: 'flex', alignItems: 'center', gap: '6px', textTransform: 'uppercase', letterSpacing: '0.05em',
          backdropFilter: 'blur(8px)'
        }}>
          <Folder size={11} strokeWidth={2.5} /> {activeFolder.name}
        </span>
      )}
      {activeTags.map(t => (
        <span key={t.id} style={{
          background: t.color || 'var(--color-primary)', color: 'var(--bridgex-bg-solid)', fontSize: '9px',
          fontWeight: 900, padding: '4px 10px', borderRadius: '20px',
          textTransform: 'uppercase', letterSpacing: '0.08em',
          boxShadow: `0 4px 12px ${(t.color || 'var(--color-primary)')}40`
        }}>
          {t.name}
        </span>
      ))}
    </div>
  );
});

const CreateFolderCard: React.FC<{ onCreate: () => void }> = ({ onCreate }) => {
  return (
    <div 
      onClick={onCreate}
      className="create-folder-card mat-mdc-card mdc-card mat-mdc-card-outlined mdc-card--outlined"
      style={{
        width: '280px', height: '180px', background: 'var(--bridgex-bg-main)',
        border: '1px dashed var(--color-primary)', borderRadius: '16px',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        margin: '12px', gap: '16px', position: 'relative', overflow: 'hidden'
      }}
      onMouseOver={e => {
        e.currentTarget.style.background = 'rgba(209, 161, 123, 0.05)';
        e.currentTarget.style.borderColor = 'var(--color-primary)';
        e.currentTarget.style.transform = 'translateY(-4px)';
      }}
      onMouseOut={e => {
        e.currentTarget.style.background = 'var(--bridgex-bg-main)';
        e.currentTarget.style.borderColor = 'rgba(209, 161, 123, 0.3)';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      <div style={{
        width: '56px', height: '56px', borderRadius: '50%', background: 'var(--bridgex-surface)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 4px 12px var(--bridgex-shadow)', border: '1px solid var(--bridgex-border)'
      }}>
        <Plus size={24} color="var(--color-primary)" />
      </div>
      <span style={{ fontSize: '15px', fontWeight: 600, color: 'var(--bridgex-text-primary)' }}>Create new folder</span>
    </div>
  );
};

const DashboardFilterBar: React.FC<{
  onFilterChange: (folder: string | null, tag: string | null) => void,
  activeFolder: string | null,
  activeTag: string | null
}> = ({ onFilterChange, activeFolder, activeTag }) => {
  const { folders, tags } = useStorage();

  return (
    <div style={{
      display: 'flex', gap: '16px', padding: '12px 24px', alignItems: 'center',
      background: 'var(--bridgex-bg-main)', backdropFilter: 'blur(20px)',
      borderRadius: '30px', border: '1px solid var(--bridgex-border)',
      marginBottom: '40px', width: 'fit-content', boxShadow: '0 8px 32px var(--bridgex-shadow)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingRight: '12px', borderRight: '1px solid var(--bridgex-border)' }}>
        <Filter size={15} color="var(--color-primary)" />
        <span style={{ fontSize: '10px', fontWeight: 900, color: 'var(--bridgex-text-secondary)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>FILTER</span>
      </div>

      <div style={{ display: 'flex', gap: '10px' }}>
        <div style={{ position: 'relative' }}>
          <select 
            disabled
            value={activeFolder || ''} 
            onChange={e => onFilterChange(e.target.value || null, activeTag)}
            style={{
              background: 'var(--bridgex-surface)', color: 'var(--bridgex-text-primary)', border: '1px solid var(--bridgex-border)',
              padding: '8px 32px 8px 16px', borderRadius: '20px', fontSize: '12px', fontWeight: 700, 
              outline: 'none', WebkitAppearance: 'none', appearance: 'none',
              opacity: 0.6, cursor: 'not-allowed'
            }}
          >
            <option value="">All Directories</option>
            {folders.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
          <ChevronDown size={14} color="#D1A17B" style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', opacity: 0.5 }} />
        </div>
      </div>

      {(activeFolder || activeTag) && (
        <button 
          onClick={() => onFilterChange(null, null)}
          style={{
            background: 'linear-gradient(135deg, #D1A17B 0%, #A0704B 100%)', color: 'var(--bridgex-bg-solid)', border: 'none',
            padding: '8px 16px', borderRadius: '20px', fontSize: '11px', fontWeight: 900, cursor: 'pointer',
            textTransform: 'uppercase', letterSpacing: '0.05em', boxShadow: '0 4px 12px rgba(209, 161, 123, 0.3)'
          }}
        >
          Reset
        </button>
      )}
    </div>
  );
};

export interface InjectorsProps {
  onPowerImport: () => void;
  onCombine: () => void;
  onGroupAssign: () => void;
  onBatchClear: () => void;
  onOpenCreateFolder: () => void;
  onOpenBulkAssignNotebooks: () => void;
}

export const Injectors: React.FC<InjectorsProps> = ({ 
  onPowerImport, 
  onCombine, 
  onGroupAssign, 
  onBatchClear, 
  onOpenCreateFolder,
  onOpenBulkAssignNotebooks
}) => {
  const { 
    sourceMappings, assignSourceToFolder, 
    bulkAssignSourcesToFolder, bulkAddSourcesToGroup,
    addToSourceGroup, notebookMappings,
    selectedSourceGroupIds, sourceSearchQuery,
    sourceGroups, selectedNotebookIds
  } = useStorage();

  // ──── USE REFS FOR DOM TARGETS ────
  const headerTargetRef = useRef<Element | null>(null);
  const sourcesHeaderTargetRef = useRef<Element | null>(null);
  const sourceListTargetRef = useRef<Element | null>(null);
  const sourceRowTargetsRef = useRef<Element[]>([]);
  const studioRowTargetsRef = useRef<Element[]>([]);
  const cardTargetsRef = useRef<HTMLElement[]>([]);
  const folderGridTargetRef = useRef<Element | null>(null);
  const listViewCreateTargetRef = useRef<Element | null>(null);
  const scanTimerRef = useRef<any>(null);

  const [renderTick, setRenderTick] = useState(0);
   // Stability Guard: Prevent rapid setState cycles
   const lastRenderTime = useRef<number>(0);
   const triggerRender = useCallback(() => {
     const now = Date.now();
     if (now - lastRenderTime.current < 500) return;
     lastRenderTime.current = now;
     setRenderTick(t => t + 1);
   }, []);

  // Use REFs for current filters to avoid re-creating findTargets on every keystroke
  const filtersRef = useRef({
    search: '',
    folder: null as string | null,
    groups: [] as string[]
  });



  const [menuAnchor, setMenuAnchor] = useState<{ top: number, left: number, target: Element, type: 'source' | 'notebook', id?: string, isBulkAssign?: boolean } | null>(null);

  // Sync state to refs for use in the low-level scanner loop
  useEffect(() => {
    filtersRef.current = {
      search: sourceSearchQuery,
      folder: null,
      groups: selectedSourceGroupIds
    };
  }, [sourceSearchQuery, selectedSourceGroupIds]);


  // ──── SCANNER ENGINE ────
  const findTargets = useCallback(() => {
    if (!isContextValid()) return;
    let needsRender = false;
    
    try {
      const safeRemove = (el: Element | null) => { if (el && el.parentNode) el.remove(); };

      // Dashboard header – inject a container RIGHT BEFORE the Settings button
      const settingsBtn = document.querySelector('button.extendable-button[aria-label="Settings"], button[aria-label*="Settings"], .settings-button');
      
      if (settingsBtn) {
        let headerInjection = document.getElementById('bridgex-header-injection');
        if (!headerInjection || !headerInjection.isConnected) {
          if (headerInjection) safeRemove(headerInjection);
          headerInjection = document.createElement('div');
          headerInjection.id = 'bridgex-header-injection';
          headerInjection.style.display = 'flex';
          headerInjection.style.alignItems = 'center';
          // Insert right before the Settings button in its parent
          settingsBtn.parentElement?.insertBefore(headerInjection, settingsBtn);
          console.log('[bridgeX] Header injection created beside Settings button.');
        }
        if (headerInjection !== headerTargetRef.current) {
          headerTargetRef.current = headerInjection;
          needsRender = true;
        }
      }

      // Notebook grid + list view + folder cards
      const notebookGridEl = document.querySelector('mat-grid-list, .notebook-grid, .artifact-library-item-container, .welcome-page-container, mat-table, .notebook-list-view, .mdc-data-table');
      if (notebookGridEl) {
        // Find the first card or row to use as an insertion point for the folder grid
        const createCard = notebookGridEl.querySelector('mat-card.create-new-action-button') || 
                           notebookGridEl.querySelector('mat-card:first-child') ||
                           notebookGridEl.querySelector('mat-row:first-child, .mdc-data-table__row:first-child');
        
        let gridTarget = document.getElementById('bridgex-folder-grid-target');
        if (!gridTarget || !gridTarget.isConnected) {
          if (gridTarget) safeRemove(gridTarget);
          gridTarget = document.createElement('div');
          gridTarget.id = 'bridgex-folder-grid-target';
          gridTarget.style.display = 'contents';
          const parent = createCard?.parentElement || notebookGridEl;
          if (parent) {
            if (createCard && createCard.parentElement === parent) parent.insertBefore(gridTarget, createCard);
            else parent.prepend(gridTarget);
          }
        }
        if (gridTarget !== folderGridTargetRef.current) { folderGridTargetRef.current = gridTarget; needsRender = true; }
      }

      // Sources header
      const addSourceBtn = document.querySelector('.add-source-button');
      const sourcesHeader = document.querySelector('.source-panel-header') || addSourceBtn?.closest('.header, .source-header') || addSourceBtn?.parentElement;
      let actionsTarget = document.getElementById('bridgex-sources-actions');
      if (!actionsTarget && sourcesHeader) {
        actionsTarget = document.createElement('div');
        actionsTarget.id = 'bridgex-sources-actions';
        actionsTarget.style.width = '100%';
        sourcesHeader.parentElement?.insertBefore(actionsTarget, sourcesHeader.nextSibling);
      }
      if (actionsTarget && actionsTarget !== sourcesHeaderTargetRef.current) { sourcesHeaderTargetRef.current = actionsTarget; needsRender = true; }

      // Source Search — placed BETWEEN "Discovery query" and "Select all sources"
      const searchBoxId = 'bridge-source-search-injection';
      const sourcePanel = document.querySelector('.source-panel-content') || document.querySelector('mat-selection-list');
      let searchTarget = document.getElementById(searchBoxId);
      
      if (sourcePanel) {
          // Strategy 1: Find "Select all sources" among direct children by checking innerText
          let selectAllRow: Element | undefined = undefined;
          for (let i = 0; i < sourcePanel.children.length; i++) {
            const child = sourcePanel.children[i];
            if (child.id?.includes('bridge')) continue;
            const text = (child.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();
            if (text.includes('select all sources')) {
              selectAllRow = child;
              console.log('[BridgeX] Strategy 1: Found "Select all sources" at index', i, child.tagName, child.className);
              break;
            }
          }

          // Strategy 2: If not found, walk from discovery textarea to find first source-like element
          if (!selectAllRow) {
            const discoveryTextarea = sourcePanel.querySelector('textarea');
            console.log('[BridgeX] Strategy 2: discoveryTextarea found?', !!discoveryTextarea);
            if (discoveryTextarea) {
              let el: Element | null = discoveryTextarea;
              let walkCount = 0;
              while (el) {
                el = el.nextElementSibling;
                if (!el) break;
                walkCount++;
                const hasCheckbox = el.querySelector('mat-checkbox, mat-pseudo-checkbox, .mat-mdc-checkbox, .mat-pseudo-checkbox, input[type="checkbox"]');
                console.log(`[BridgeX] Strategy 2 walk[${walkCount}]: tag=${el.tagName} class=${(el.className||'').substring(0,60)} text="${(el.textContent||'').trim().substring(0,40)}" hasCheckbox=${!!hasCheckbox}`);
                if (hasCheckbox) {
                  selectAllRow = el;
                  break;
                }
              }
            }
          }

          // Strategy 3: If still not found, just find the FIRST element with mat-checkbox among direct children
          if (!selectAllRow) {
            console.log('[BridgeX] Strategy 3: searching all children for mat-checkbox');
            for (let i = 0; i < sourcePanel.children.length; i++) {
              const child = sourcePanel.children[i];
              if (child.id?.includes('bridge')) continue;
              if (child.querySelector('mat-checkbox, mat-pseudo-checkbox, .mat-mdc-checkbox, .mat-pseudo-checkbox')) {
                selectAllRow = child;
                console.log('[BridgeX] Strategy 3: Found checkbox row at index', i, child.tagName, (child.textContent||'').trim().substring(0, 40));
                break;
              }
            }
          }

          if (!searchTarget) {
            searchTarget = document.createElement('div');
            searchTarget.id = searchBoxId;
            searchTarget.style.width = '100%';
            searchTarget.style.display = 'block';
          }

          // Always ensure correct position: right before anchor element
          if (selectAllRow && searchTarget.nextElementSibling !== selectAllRow) {
            console.log('[BridgeX] Moving search box BEFORE selectAllRow');
            sourcePanel.insertBefore(searchTarget, selectAllRow);
          } else if (!selectAllRow && searchTarget.parentElement !== sourcePanel) {
            console.log('[BridgeX] No anchor found, prepending search box');
            sourcePanel.prepend(searchTarget);
          } else {
            // Already in correct position or no anchor
          }
      }
      if (searchTarget && searchTarget !== sourceListTargetRef.current) { sourceListTargetRef.current = searchTarget; needsRender = true; }

      // Piercer: Recursively scan for sources in Shadow DOM
      const rawElementsInShadow = deepQuerySelectorAll('.source-stretched-button, .artifact-stretched-button, .source-item, mat-list-item, mat-list-option, .mdc-list-item, [role="listitem"], [role="option"]');
      
      // CRITICAL: Stop the render loop by ignoring our own UI elements!
      const elementsInShadow = rawElementsInShadow.filter(el => {
        if (!(el instanceof HTMLElement)) return false;
        // String check on outerHTML is slow but very reliable for exclusion during development
        // Better: check for dedicated classes or ID prefix
        const isBridge = el.closest('[class*="bridgex"], [id*="bridge"], .bridgex-modal, .bridgex-sidebar');
        return !isBridge;
      });

      
      const sourceRows = elementsInShadow.filter(el => {
        const isSource = el.closest('.source-panel-content, .source-list-container, mat-selection-list');
        const isSelectAll = el.textContent?.toLowerCase().includes('select all sources');
        const isContainer = el.classList.contains('source-panel-content') || el.tagName === 'MAT-SELECTION-LIST';
        return isSource && !isSelectAll && !isContainer;
      });
      const refinedSourceRows = sourceRows.filter(el => !sourceRows.some(other => el !== other && el.contains(other)));

      const studioRows = elementsInShadow.filter(el => el.closest('.artifact-panel-content, .notes-panel-content'));

      // ──── Stability Check for Sources (Frozen ID) ────
      // Use ONLY the inner text of the TITLE element to prevent self-feedback loops
      const getRowId = (el: Element) => {
        const titleEl = el.querySelector('.source-title, .title, .name, .mdc-list-item__primary-text') || el.firstChild || el;
        // Strip everything but letters/numbers/spaces for absolute stability
        const cleanID = (titleEl.textContent || '').trim().replace(/[^a-zA-Z0-9 ]/g, '').substring(0, 30).toLowerCase();
        
        const stableClasses = el.className.split(' ').filter(c => 
          !c.includes('_ngcontent') && !c.includes('active') && !c.includes('selected')
        ).join('.');
        return `${el.tagName}:${cleanID}:${stableClasses}`;
      };

      const currentSourceIds = refinedSourceRows.map(getRowId).join('|');
      const prevSourceIds = sourceRowTargetsRef.current.map(getRowId).join('|');

      if (currentSourceIds !== prevSourceIds) {
        if (sourceRowTargetsRef.current.length > 0) {
           console.log('[bridgeX] Scanner structure change detected (Frozen-ID Source).');
        }
        sourceRowTargetsRef.current = refinedSourceRows as HTMLElement[];
        needsRender = true;
      }




      if (studioRows.length !== studioRowTargetsRef.current.length) {
        studioRowTargetsRef.current = studioRows;
        needsRender = true;
      }

      // Shadow Piercing Dashboard
      const allElements = deepQuerySelectorAll(`
        mat-card, .mat-mdc-card, .artifact-library-item, 
        [role="link"], [role="row"], .mdc-list-item, div[jslog*="notebook"], a[href*="/notebook/"]
      `);
      
      const dashboardCards: HTMLElement[] = [];
      const seenNids = new Set<string>();

      const getElementId = (el: Element) => {
        // Improved regex to find notebook IDs in hrefs or data attributes
        const href = el.getAttribute('href') || (el.querySelector('a')?.getAttribute('href')) || '';
        const m = href.match(/\/notebook\/([a-zA-Z0-9\-_]{16,})/);
        if (m) return m[1];
        
        const outerMatch = el.outerHTML.match(/\/notebook\/([a-zA-Z0-9\-_]{16,})/);
        if (outerMatch) return outerMatch[1];

        // For custom items, use text + stable position
        return null;
      };

      allElements.forEach(el => {
          if (!(el instanceof HTMLElement)) return;
          // EXCLUDE ALL BridgeX UI from dashboard scan
          if (el.closest("[class*='bridgex'], [id*='bridge'], .bridgex-sidebar, .bridgex-modal")) return;
          if (el.tagName === "HTML" || el.tagName === "BODY" || el.tagName === "HEAD") return;
          
          const nid = getElementId(el);
          if (!nid) return;

          const container = el.closest(`mat-card, .mat-mdc-card, .artifact-library-item, [role="link"], [role="row"], .mdc-list-item, .item-row, .mat-row, .mdc-data-table__row`) || el;
          if (container.textContent?.includes("Role") && container.textContent?.includes("Title")) return;
          
          const html = container as HTMLElement;
          if (html.tagName === "HTML" || html.tagName === "BODY") return;
          
          // Only add the container if we haven't seen this notebook ID yet
          if (seenNids.has(nid)) return;
          seenNids.add(nid);

          // Stability Fix: No mutation during render
          if (html.style.position !== "relative" && !html.classList.contains("mat-mdc-card") && !html.classList.contains("mdc-data-table__row")) {
             html.style.position = "relative";
          }
          dashboardCards.push(html);
      });

      const uniqueCurrent = dashboardCards;
      const currentIds = uniqueCurrent.map(getElementId).filter(Boolean).sort().join(",");
      const prevIds = cardTargetsRef.current.map(getElementId).filter(Boolean).sort().join(",");

      if (currentIds !== prevIds) {
        cardTargetsRef.current = uniqueCurrent;
        needsRender = true;
      }


      if (needsRender) triggerRender();

      // ──── FAST-PATH DOM FILTERING (Bypasses React Loop) ────
      // Apply filters DIRECTLY to the DOM elements to stop the infinite render loop!
      
      uniqueCurrent.forEach(card => {
        const link = card.querySelector('a[href*="/notebook/"]');
        const href = link?.getAttribute('href') || '';
        const nid = href.split('/notebook/')[1]?.split('?')[0] || '';
        const mapping = nid ? notebookMappings[nid] || {} : {};
        let visible = true;
        if (filtersRef.current.folder && mapping.folderId !== filtersRef.current.folder) visible = false;
        card.style.display = visible ? '' : 'none';
      });

      refinedSourceRows.forEach(row => {
        let visible = true;
        const titleEl = row.querySelector('.source-title, .title, .name') || row;
        const text = (titleEl.textContent || row.textContent || '').toLowerCase();
        
        if (filtersRef.current.search && !text.includes(filtersRef.current.search.toLowerCase())) visible = false;
        if (filtersRef.current.groups.length > 0) {
          const belongsToAnySelected = sourceGroups.some(group => 
            filtersRef.current.groups.includes(group.id) && 
            group.sourceNames.some(name => text.includes(name.toLowerCase()) || name.toLowerCase().includes(text.trim().toLowerCase()))
          );
          if (!belongsToAnySelected) visible = false;
        }
        (row as HTMLElement).style.display = visible ? '' : 'none';
      });


    } catch (err) {

      if (isContextInvalidatedError(err)) { clearInterval(scanTimerRef.current); return; }
      console.error('[BridgeX] Scanner Error:', err);
    }
  }, [triggerRender]);

  useEffect(() => {
    if (!isContextValid()) return;
    findTargets();
    scanTimerRef.current = setInterval(findTargets, 3000);
    return () => {
      if (scanTimerRef.current) clearInterval(scanTimerRef.current);
    };
  }, [findTargets]);


  // DELETED: Manual Filtering Effect (Now handled inside findTargets directly)
  // This removes the cause of the "Maximum update depth exceeded" error.


  // ──── PORTALS ────
  return (
    <>
      {headerTargetRef.current && createPortal(
         <DashboardHeaderButtons 
           onBulkAssign={onOpenBulkAssignNotebooks} 
           onOpenCreateFolder={onOpenCreateFolder} 
         />, 
         headerTargetRef.current
      )}

      {sourcesHeaderTargetRef.current && createPortal(<SourcesHeaderButtons onPowerImport={onPowerImport} onCombine={onCombine} onGroupAssign={onGroupAssign} onBatchClear={onBatchClear} />, sourcesHeaderTargetRef.current)}
      {sourceListTargetRef.current && createPortal(<SourceSearchBox />, sourceListTargetRef.current)}
      
      {cardTargetsRef.current.map((card, i) => {
        const link = card.querySelector('a[href*="/notebook/"]');
        const href = link?.getAttribute('href') || '';
        const nid = href.split('/notebook/')[1]?.split('?')[0] || '';
        if (!nid) return null;
        return (
          <React.Fragment key={nid}>
            {createPortal(<NotebookCheckbox notebookId={nid} card={card} />, card)}
            {createPortal(<CardTags notebookId={nid} />, card)}
          </React.Fragment>
        );
      })}

      {selectedNotebookIds.length > 0 && createPortal(
         <DashboardBulkBar onOpenBulkAssignNotebooks={onOpenBulkAssignNotebooks} />,
         document.body
      )}

      {listViewCreateTargetRef.current && createPortal(
         <button onClick={onOpenCreateFolder} style={{ background: 'var(--color-primary)', color: 'white', borderRadius: '12px', padding: '8px 16px', fontWeight: 700, cursor: 'pointer', marginRight: '16px', border: 'none', display: 'flex', alignItems: 'center' }}>
           <Plus size={16} style={{ marginRight: '8px' }} /> Create Folder
         </button>,
         listViewCreateTargetRef.current
      )}


    </>
  );
};
