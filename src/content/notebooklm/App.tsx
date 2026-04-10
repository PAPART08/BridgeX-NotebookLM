import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Injectors } from './Injectors';
import SmartImportModal from './SmartImportModal';
import MergeModal from './MergeModal';
import BulkAssignModal from './BulkAssignModal';
import BulkDeleteModal from './BulkDeleteModal';
import CreateFolderModal from './CreateFolderModal';
import BulkAssignNotebooksModal from './BulkAssignNotebooksModal';
import { useStorage } from '../../store';
import Sidebar from './Sidebar';

const App: React.FC = () => {
  const { syncWithNotebookLM } = useStorage();
  const [isPowerImportOpen, setIsPowerImportOpen] = useState(false);
  const [isCombineOpen, setIsCombineOpen] = useState(false);
  const [isGroupAssignOpen, setIsGroupAssignOpen] = useState(false);
  const [isBatchClearOpen, setIsBatchClearOpen] = useState(false);
  const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false);
  const [isBulkAssignNotebooksOpen, setIsBulkAssignNotebooksOpen] = useState(false);
  const [, setPortalTick] = useState(0);

  // Sync portal target availability
  useEffect(() => {
    const checkPortal = () => {
      const el = document.getElementById('bridgex-modal-portal');
      if (el) setPortalTick(t => t + 1);
    };
    const interval = setInterval(checkPortal, 1000);
    
    // Also trigger initial sync in background
    syncWithNotebookLM().catch(e => console.warn('[bridgeX] Initial sync deferred:', e));

    return () => clearInterval(interval);
  }, [syncWithNotebookLM]);

  const onOpenPowerImport = React.useCallback(() => setIsPowerImportOpen(true), []);
  const onOpenCombine = React.useCallback(() => setIsCombineOpen(true), []);
  const onOpenGroupAssign = React.useCallback(() => setIsGroupAssignOpen(true), []);
  const onOpenBatchClear = React.useCallback(() => setIsBatchClearOpen(true), []);
  const onOpenCreateFolder = React.useCallback(() => setIsCreateFolderOpen(true), []);
  const onOpenBulkAssignNotebooks = React.useCallback(() => setIsBulkAssignNotebooksOpen(true), []);

  // But wait, App.tsx doesn't have useStorage yet. 
  // I need to import it or ensure the Sidebar handles its own initial sync.

  const portalTarget = document.getElementById('bridgex-modal-portal') || document.body;

  return (
    <>
      <Sidebar 
        onOpenPowerImport={onOpenPowerImport}
        onOpenCombine={onOpenCombine}
        onOpenCreateFolder={onOpenCreateFolder}
        onOpenBulkAssignNotebooks={onOpenBulkAssignNotebooks}
      />
      
      <Injectors 
        onPowerImport={onOpenPowerImport}
        onCombine={onOpenCombine}
        onGroupAssign={onOpenGroupAssign}
        onBatchClear={onOpenBatchClear}
        onOpenCreateFolder={onOpenCreateFolder}
        onOpenBulkAssignNotebooks={onOpenBulkAssignNotebooks}
      />

      {createPortal(
        <>
          <CreateFolderModal 
            isOpen={isCreateFolderOpen} 
            onClose={() => setIsCreateFolderOpen(false)} 
          />
          <BulkAssignNotebooksModal 
            isOpen={isBulkAssignNotebooksOpen} 
            onClose={() => setIsBulkAssignNotebooksOpen(false)} 
          />
          <SmartImportModal 
            isOpen={isPowerImportOpen} 
            onClose={() => setIsPowerImportOpen(false)} 
          />
          <MergeModal 
            isOpen={isCombineOpen} 
            onClose={() => setIsCombineOpen(false)} 
          />
          <BulkAssignModal 
            isOpen={isGroupAssignOpen} 
            onClose={() => setIsGroupAssignOpen(false)} 
          />
          <BulkDeleteModal 
            isOpen={isBatchClearOpen} 
            onClose={() => setIsBatchClearOpen(false)} 
          />
        </>,
        portalTarget
      )}
    </>
  );
};

export default App;
