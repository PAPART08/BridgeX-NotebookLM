import React, { useState } from 'react';
import { X, FolderPlus, Trash2, CheckSquare, MinusSquare, FolderOpen } from 'lucide-react';
import { useStorage } from '../../store';

interface DashboardBulkBarProps {
  onOpenBulkAssignNotebooks: () => void;
}

const DashboardBulkBar: React.FC<DashboardBulkBarProps> = ({ onOpenBulkAssignNotebooks }) => {
  const { 
    selectedNotebookIds, 
    clearNotebookSelection, 
    folders, 
    bulkAssignNotebooksToFolder,
    refreshData
  } = useStorage();
  
  const [showFolderMenu, setShowFolderMenu] = useState(false);

  if (selectedNotebookIds.length === 0) return null;

  const handleMoveToFolder = async (folderId: string | null) => {
    try {
      console.log(`[bridgeX] Moving ${selectedNotebookIds.length} notebooks to folder ${folderId}`);
      await bulkAssignNotebooksToFolder(selectedNotebookIds, folderId);
      clearNotebookSelection();
      setShowFolderMenu(false);
      // Data updated, refresh storage to reflect in sidebar
      await refreshData();
    } catch (err) {
      console.error('[bridgeX] Bulk move failed:', err);
      alert('Error moving notebooks. See console.');
    }
  };

  return (
    <div style={{
      position: 'fixed',
      bottom: '32px',
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 10000,
      display: 'flex',
      alignItems: 'center',
      gap: '24px',
      padding: '16px 28px',
      background: 'rgba(28, 28, 30, 0.85)',
      backdropFilter: 'blur(20px) saturate(180%)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      borderRadius: '24px',
      boxShadow: '0 24px 64px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.05)',
      color: 'white',
      animation: 'bridgexSlideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
      fontFamily: "'Inter', sans-serif"
    }}>
      <style>{`
        @keyframes bridgexSlideUp {
          from { transform: translate(-50%, 100%) scale(0.9); opacity: 0; }
          to { transform: translate(-50%, 0) scale(1); opacity: 1; }
        }
        .bridgex-bulk-btn {
          display: flex; align-items: center; gap: 8px;
          padding: 10px 18px; border-radius: 12px;
          border: none; background: rgba(255, 255, 255, 0.08);
          color: white; font-size: 13px; font-weight: 600;
          cursor: pointer; transition: all 0.2s;
        }
        .bridgex-bulk-btn:hover { background: rgba(255, 255, 255, 0.15); transform: translateY(-1px); }
        .bridgex-bulk-btn.primary { background: var(--color-primary); color: var(--bridgex-bg-solid); }
        .bridgex-bulk-btn.primary:hover { background: var(--color-primary-dark, #c19163); }
      `}</style>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', borderRight: '1px solid rgba(255,255,255,0.1)', paddingRight: '24px' }}>
        <div style={{ 
          width: '32px', height: '32px', borderRadius: '10px', 
          background: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 12px rgba(209, 161, 123, 0.3)'
        }}>
          <CheckSquare size={18} color="var(--bridgex-bg-solid)" strokeWidth={2.5} />
        </div>
        <div>
          <div style={{ fontSize: '15px', fontWeight: 700 }}>{selectedNotebookIds.length} Notebooks Selected</div>
          <div style={{ fontSize: '11px', opacity: 0.6, fontWeight: 500 }}>Bulk actions active</div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', position: 'relative' }}>
        <button 
          className="bridgex-bulk-btn primary"
          onClick={onOpenBulkAssignNotebooks}
        >
          <FolderPlus size={18} />
          Move to Directory
        </button>

        <button className="bridgex-bulk-btn" onClick={clearNotebookSelection}>
          <X size={18} />
          Clear
        </button>
      </div>
    </div>
  );
};

export default DashboardBulkBar;
