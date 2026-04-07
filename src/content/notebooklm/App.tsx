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
  const [isSmartImportOpen, setIsSmartImportOpen] = useState(false);
  const [isMergeOpen, setIsMergeOpen] = useState(false);
  const [isBulkAssignOpen, setIsBulkAssignOpen] = useState(false);
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);
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

  const onOpenSmartImport = React.useCallback(() => setIsSmartImportOpen(true), []);
  const onOpenMerge = React.useCallback(() => setIsMergeOpen(true), []);
  const onOpenBulkAssign = React.useCallback(() => setIsBulkAssignOpen(true), []);
  const onOpenBulkDelete = React.useCallback(() => setIsBulkDeleteOpen(true), []);
  const onOpenCreateFolder = React.useCallback(() => setIsCreateFolderOpen(true), []);
  const onOpenBulkAssignNotebooks = React.useCallback(() => setIsBulkAssignNotebooksOpen(true), []);

  // But wait, App.tsx doesn't have useStorage yet. 
  // I need to import it or ensure the Sidebar handles its own initial sync.

  const portalTarget = document.getElementById('bridgex-modal-portal') || document.body;

  return (
    <>
      <Sidebar 
        onOpenSmartImport={onOpenSmartImport}
        onOpenMerge={onOpenMerge}
        onOpenCreateFolder={onOpenCreateFolder}
        onOpenBulkAssignNotebooks={onOpenBulkAssignNotebooks}
      />
      
      <Injectors 
        onSmartImport={onOpenSmartImport}
        onMerge={onOpenMerge}
        onBulkAssign={onOpenBulkAssign}
        onBulkDelete={onOpenBulkDelete}
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
            isOpen={isSmartImportOpen} 
            onClose={() => setIsSmartImportOpen(false)} 
          />
          <MergeModal 
            isOpen={isMergeOpen} 
            onClose={() => setIsMergeOpen(false)} 
          />
          <BulkAssignModal 
            isOpen={isBulkAssignOpen} 
            onClose={() => setIsBulkAssignOpen(false)} 
          />
          <BulkDeleteModal 
            isOpen={isBulkDeleteOpen} 
            onClose={() => setIsBulkDeleteOpen(false)} 
          />
        </>,
        portalTarget
      )}
    </>
  );
};

export default App;
