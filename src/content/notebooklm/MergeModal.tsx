import React, { useState, useEffect, useCallback } from 'react';
import { X, Search, GitMerge, AlertCircle, FileText, Check, Loader2, Play, Trash2, CheckCircle2 } from 'lucide-react';
import { useStorage } from '../../store';
import { countWords, formatWordCount } from '../../utils/textAnalysis';
import { addSourceToNotebook, deleteNotebookSources, fetchSourceDocument } from '../../utils/notebooklm-api';

interface Source {
  id: string;
  name: string;
  isSelectedInSidebar: boolean;
}

interface MergeModalProps {
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

const extractSourceTitle = (row: Element): string => {
  const titleEl = Array.from(row.querySelectorAll('.source-stretched-button, .title, .text, .mdc-list-item__primary-text, span, h3, .name'))
    .find(s => s.textContent?.trim().length > 0);
  return cleanName(titleEl?.textContent || row.getAttribute('aria-label') || '');
};

const normalizeName = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

const MergeModal: React.FC<MergeModalProps> = ({ isOpen, onClose }) => {
  const { sourceGroups } = useStorage();
  const [sources, setSources] = useState<Source[]>([]);
  const [selectedNames, setSelectedNames] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  
  // Merge state
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState<'idle' | 'capturing' | 'merging' | 'uploading' | 'deleting' | 'success'>('idle');
  const [currentSourceIndex, setCurrentSourceIndex] = useState(-1);
  const [capturedContent, setCapturedContent] = useState<string>('');
  const [totalWordCount, setTotalWordCount] = useState(0);
  const [outputFormat, setOutputFormat] = useState<'markdown' | 'pdf'>('markdown');
  const [customName, setCustomName] = useState('');
  const [deleteOriginals, setDeleteOriginals] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && processingStep === 'idle') {
      // Scrape sources from the DOM
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

        let title = extractSourceTitle(row);
        
        if (title && title.length > 1 && !foundSources.some(s => s.name === title)) {
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

          // Extract Source ID for API deletion
          const moreButton = row.querySelector('[id*="source-item-more-button-"], .source-item-more-button');
          let sourceId = moreButton?.id?.replace('source-item-more-button-', '') || '';

          if (!sourceId) {
            const rowDesc = row.getAttribute('id') || row.getAttribute('data-id') || '';
            if (rowDesc.includes('source-')) sourceId = rowDesc;
          }

          const isSelected = !!checkbox;
          foundSources.push({ id: sourceId || `fallback-${title}`, name: title, isSelectedInSidebar: isSelected });
          if (isSelected) preSelected.push(title);
        }
      });
      
      if (!error) {
        setSources(foundSources);
        setSelectedNames(preSelected);
        setSearch('');
      }
    }
  }, [isOpen, processingStep, error]);

  const toggleSource = (name: string) => {
    if (isProcessing) return;
    setSelectedNames(prev => prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]);
  };

  const handleMerge = async () => {
    if (selectedNames.length < 2 || isProcessing) return;
    
    setIsProcessing(true);
    setError(null);
    setProcessingStep('capturing');
    setCapturedContent('');
    
    let combinedText = '';
    const notebookId = window.location.href.split('/notebook/')[1]?.split('?')[0]?.split('/')[0];

    // Check for context invalidation
    if (!chrome.runtime?.id) {
      setError("Extension context invalidated. Please refresh the page.");
      setIsProcessing(false);
      return;
    }

    if (!notebookId) {
      setError("Could not extract Notebook ID from the URL.");
      setIsProcessing(false);
      return;
    }

    try {
      for (let i = 0; i < selectedNames.length; i++) {
        const name = selectedNames[i];
        setCurrentSourceIndex(i);
        
        const sourceData = sources.find(s => s.name === name);
        if (!sourceData || sourceData.id.startsWith('fallback-')) {
          console.warn(`[bridgeX] Could not find valid source ID for: ${name}`);
          throw new Error(`Invalid or missing Source ID for document: ${name}`);
        }

        const text = await fetchSourceDocument(notebookId, sourceData.id);
        
        combinedText += `SOURCE: ${name}\n`;
        combinedText += `================================================================================\n\n`;
        combinedText += `${text}\n\n`;
        combinedText += `--------------------------------------------------------------------------------\n\n`;
        
        setCapturedContent(combinedText);
        setTotalWordCount(countWords(combinedText));
      }

      setProcessingStep('merging');
      await new Promise(r => setTimeout(r, 800));

      // Validation: Ensure we actually captured text
      if (combinedText.trim().length < 100) {
        throw new Error("Merge aborted: No content was captured from the selected sources. Please ensure the sources are readable in the sidebar.");
      }

      setProcessingStep('uploading');
      
      // Generate default filename concatenating selected names
      let defaultFileName = 'Combined Document';
      if (selectedNames.length <= 3) {
         defaultFileName = `Combined: ` + selectedNames.map(n => n.substring(0, 20)).join(' + ');
      } else {
         defaultFileName = `Combined: ${selectedNames[0].substring(0, 30)} + ${selectedNames.length - 1} others`;
      }
      
      let finalFileName = customName || defaultFileName;
      
      // Strip common file extensions if user typed them, as this is a Text Source title
      finalFileName = finalFileName.replace(/\.(md|txt|pdf|epub|docx)$/i, '');
      
      if (notebookId) {
        // Step 3: Re-Insertion using izAoDd (addSourceToNotebook)
        await addSourceToNotebook(notebookId, finalFileName, combinedText);
        
        // Post-upload delay: Give the backend time to index the new text source before we delete the originals
        console.log("[bridgeX] Text source added. Waiting for backend sync...");
        await new Promise(r => setTimeout(r, 2500));
      }

      if (deleteOriginals) {
        setProcessingStep('deleting');
        
        const idsToDelete = selectedNames
          .map(name => sources.find(s => s.name === name)?.id)
          .filter(id => id && !id.startsWith('fallback-')) as string[];

        if (notebookId && idsToDelete.length > 0) {
           await deleteNotebookSources(notebookId, idsToDelete);
           await new Promise(r => setTimeout(r, 800)); // Short delay for API synchronization
        }
      }

      setProcessingStep('success');
      setTimeout(() => {
        setIsProcessing(false);
        setProcessingStep('idle');
        onClose();
      }, 2000);

    } catch (err) {
      console.error("[bridgeX] Merge failed:", err);
      setError(err instanceof Error ? err.message : "Merge process failed.");
      setIsProcessing(false);
      setProcessingStep('idle');
    }
  };

  if (!isOpen) return null;

  const filteredSources = sources.filter(s => s.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'var(--bridgex-backdrop)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 2147483647, backdropFilter: 'blur(12px)',
      fontFamily: "'Inter', sans-serif",
      pointerEvents: 'auto' as any
    }}>
       <div style={{
        backgroundColor: 'var(--bridgex-bg-main)',
        backdropFilter: 'blur(20px)',
        width: '850px',
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
            <div style={{ background: 'rgba(209, 161, 123, 0.1)', padding: '8px', borderRadius: '10px' }}>
              <GitMerge size={20} color="var(--color-primary)" />
            </div>
            <h2 style={{ fontSize: '18px', margin: 0, color: 'var(--bridgex-text-primary)', fontWeight: 700, fontFamily: "'Outfit', sans-serif" }}>Combine & Sync Sources</h2>
          </div>
          <button 
            disabled={isProcessing}
            onClick={onClose} 
            style={{ background: 'none', border: 'none', color: 'var(--bridgex-text-secondary)', cursor: isProcessing ? 'not-allowed' : 'pointer', transition: 'color 0.2s' }} 
            onMouseOver={e => { if(!isProcessing) e.currentTarget.style.color = 'var(--bridgex-text-primary)' }} 
            onMouseOut={e => { if(!isProcessing) e.currentTarget.style.color = 'var(--bridgex-text-secondary)' }}
          >
            <X size={20} />
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1fr) 350px', flex: 1, minHeight: 0, overflow: 'hidden' }}>
          {/* Left Panel: Source Selection */}
          <div style={{ minWidth: 0, minHeight: 0, borderRight: '1px solid var(--bridgex-border)', display: 'flex', flexDirection: 'column', background: 'var(--bridgex-bg-main)' }}>
            <div style={{ padding: '24px 24px 16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <p style={{ fontSize: '11px', color: 'var(--bridgex-text-secondary)', textTransform: 'uppercase', margin: 0, fontWeight: 700, letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>STEP 1: Select Sources ({selectedNames.length})</p>
                <div style={{ display: 'flex', gap: '12px', flexShrink: 0 }}>
                  {!isProcessing && (
                    <>
                      <button 
                        onClick={() => setSelectedNames(sources.map(s => s.name))}
                        style={{ background: 'none', border: 'none', color: 'var(--color-primary)', fontSize: '10px', fontWeight: 700, cursor: 'pointer', padding: 0 }}
                      >SELECT ALL</button>
                      <button 
                        onClick={() => setSelectedNames([])}
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
                  disabled={isProcessing}
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Filter sources..."
                  style={{ background: 'none', border: 'none', outline: 'none', color: 'var(--bridgex-text-primary)', fontSize: '13px', width: '100%', cursor: isProcessing ? 'not-allowed' : 'text' }}
                />
              </div>
            </div>
            
            <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px 20px' }}>
              {filteredSources.length === 0 ? (
                <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--bridgex-text-secondary)', fontSize: '13px' }}>
                  No sources found in current notebook.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {filteredSources.map(s => (
                    <div 
                      key={s.name}
                      onClick={() => toggleSource(s.name)}
                      style={{
                        padding: '10px 14px', borderRadius: '10px', cursor: isProcessing ? 'default' : 'pointer',
                        backgroundColor: selectedNames.includes(s.name) ? 'rgba(209, 161, 123, 0.08)' : 'transparent',
                        display: 'flex', alignItems: 'center', gap: '12px',
                        transition: 'all 0.15s',
                        width: '100%',
                        boxSizing: 'border-box',
                        minWidth: 0,
                        opacity: isProcessing && !selectedNames.includes(s.name) ? 0.5 : 1
                      }}
                      onMouseOver={e => { if(!selectedNames.includes(s.name) && !isProcessing) e.currentTarget.style.backgroundColor = 'var(--bridgex-surface-hover)'; }}
                      onMouseOut={e => { if(!selectedNames.includes(s.name) && !isProcessing) e.currentTarget.style.backgroundColor = 'transparent'; }}
                    >
                      <div style={{ 
                        flexShrink: 0, width: '18px', height: '18px', borderRadius: '4px', 
                        border: '1px solid ' + (selectedNames.includes(s.name) ? 'var(--color-primary)' : 'var(--bridgex-border)'),
                        backgroundColor: selectedNames.includes(s.name) ? 'var(--color-primary)' : 'transparent',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                      }}>
                        {selectedNames.includes(s.name) && <Check size={12} color="var(--bridgex-bg-solid)" strokeWidth={4} />}
                      </div>
                      <FileText size={16} style={{ flexShrink: 0 }} color={selectedNames.includes(s.name) ? 'var(--color-primary)' : 'var(--bridgex-text-secondary)'} />
                      <span style={{ 
                        fontSize: '13px', 
                        color: selectedNames.includes(s.name) ? 'var(--bridgex-text-primary)' : 'var(--bridgex-text-secondary)', 
                        fontWeight: selectedNames.includes(s.name) ? 600 : 400, 
                        flex: 1, 
                        whiteSpace: 'nowrap', 
                        overflow: 'hidden', 
                        textOverflow: 'ellipsis',
                        minWidth: 0
                      }}>{s.name}</span>
                      {s.isSelectedInSidebar && (
                        <span style={{ 
                          flexShrink: 0, fontSize: '8px', background: 'rgba(129, 201, 149, 0.12)', 
                          color: '#81C995', padding: '2px 5px', borderRadius: '4px', 
                          fontWeight: 800, border: '1px solid rgba(129, 201, 149, 0.2)' 
                        }}>ACTIVE</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Panel: Config and Progress */}
          <div style={{ flex: 1, minWidth: 0, minHeight: 0, display: 'flex', flexDirection: 'column', background: 'var(--bridgex-surface)' }}>
            <div style={{ padding: '24px 24px 16px' }}>
              <p style={{ fontSize: '11px', color: 'var(--bridgex-text-secondary)', textTransform: 'uppercase', marginBottom: '12px', fontWeight: 700, letterSpacing: '0.05em' }}>STEP 2: Configure & Review</p>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '0 24px 24px' }}>
              {!isProcessing ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div>
                    <p style={{ fontSize: '11px', color: 'var(--bridgex-text-secondary)', textTransform: 'uppercase', marginBottom: '8px', fontWeight: 600 }}>Output Format</p>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {[
                        { id: 'markdown', label: 'Markdown', sub: '.md file' },
                        { id: 'pdf', label: 'PDF', sub: '.pdf file (soon)' }
                      ].map(opt => (
                        <button 
                          key={opt.id}
                          disabled={opt.id === 'pdf'}
                          onClick={() => setOutputFormat(opt.id as any)}
                          style={{
                            flex: 1, padding: '12px', borderRadius: '12px', cursor: opt.id === 'pdf' ? 'not-allowed' : 'pointer',
                            border: '1px solid ' + (outputFormat === opt.id ? 'var(--color-primary)' : 'var(--bridgex-border)'),
                            backgroundColor: outputFormat === opt.id ? 'rgba(209, 161, 123, 0.1)' : 'var(--bridgex-bg-main)',
                            color: outputFormat === opt.id ? 'var(--color-primary)' : 'var(--bridgex-text-secondary)',
                            transition: 'all 0.2s', opacity: opt.id === 'pdf' ? 0.5 : 1
                          }}>
                          <div style={{ fontWeight: 700, fontSize: '12px' }}>{opt.label}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div>
                      <p style={{ fontSize: '11px', color: 'var(--bridgex-text-secondary)', textTransform: 'uppercase', marginBottom: '8px', fontWeight: 600 }}>Merged Filename</p>
                      <input 
                        value={customName}
                        onChange={e => setCustomName(e.target.value)}
                        placeholder="Enter custom name (optional)"
                        style={{
                          width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid var(--bridgex-border)',
                          backgroundColor: 'var(--bridgex-bg-main)', color: 'var(--bridgex-text-primary)', fontSize: '13px',
                          outline: 'none', boxSizing: 'border-box'
                        }}
                      />
                    </div>

                    <div 
                      onClick={() => setDeleteOriginals(!deleteOriginals)}
                      style={{ 
                        display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer',
                        padding: '8px 0'
                      }}
                    >
                      <div style={{ 
                        width: '18px', height: '18px', borderRadius: '4px', 
                        border: '1px solid ' + (deleteOriginals ? 'var(--color-primary)' : 'var(--bridgex-border)'),
                        backgroundColor: deleteOriginals ? 'var(--color-primary)' : 'transparent',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                      }}>
                        {deleteOriginals && <Check size={12} color="var(--bridgex-bg-solid)" strokeWidth={4} />}
                      </div>
                      <span style={{ fontSize: '13px', color: 'var(--bridgex-text-primary)' }}>Delete original sources after merge</span>
                    </div>
                  </div>

                  <div style={{ 
                    padding: '20px', borderRadius: '16px', backgroundColor: 'var(--bridgex-bg-main)',
                    border: '1px solid var(--bridgex-border)', textAlign: 'center'
                  }}>
                    <p style={{ fontSize: '12px', color: 'var(--bridgex-text-secondary)', margin: '0 0 4px 0' }}>Selected for merge</p>
                    <p style={{ fontSize: '24px', fontWeight: 800, color: 'var(--color-primary)', margin: 0 }}>{selectedNames.length} Sources</p>
                   
                    {selectedNames.length > 0 && (
                      <div style={{ marginTop: '16px', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                         {selectedNames.slice(0, 5).map(n => (
                           <div key={n} style={{ fontSize: '11px', color: 'var(--bridgex-text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>• {n}</div>
                         ))}
                         {selectedNames.length > 5 && <div style={{ fontSize: '11px', color: 'var(--bridgex-text-secondary)', opacity: 0.5 }}>... and {selectedNames.length - 5} more</div>}
                      </div>
                    )}
                  </div>

                  <div style={{ 
                    padding: '16px', borderRadius: '12px', backgroundColor: 'rgba(209, 161, 123, 0.05)',
                    border: '1px solid rgba(209, 161, 123, 0.2)', display: 'flex', gap: '12px'
                  }}>
                    <AlertCircle size={18} color="var(--color-primary)" style={{ flexShrink: 0, marginTop: '2px' }} />
                    <p style={{ fontSize: '11px', color: 'var(--bridgex-text-secondary)', margin: 0, lineHeight: 1.5 }}>
                      <b>Merge Status</b>: Selected sources will be combined into a single file. {deleteOriginals ? "Originals will be deleted." : "Originals will be kept."}
                    </p>
                  </div>

                  {/* Word Count Warning */}
                  {selectedNames.length > 5 && (
                    <div style={{ 
                      padding: '12px', borderRadius: '12px', 
                      backgroundColor: 'rgba(255, 152, 0, 0.05)',
                      border: '1px solid rgba(255, 152, 0, 0.2)',
                      display: 'flex', gap: '10px', alignItems: 'center'
                    }}>
                      <AlertCircle size={16} color="#FF9800" />
                      <p style={{ fontSize: '11px', color: '#B26A00', margin: 0 }}>
                        Merging many sources? If the total exceeds <b>500,000 words</b>, NotebookLM may reject the upload (400 Error).
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', paddingTop: '20px' }}>
                  <div style={{ textAlign: 'center' }}>
                     {processingStep === 'success' ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                           <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(129, 201, 149, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <CheckCircle2 size={32} color="#81C995" />
                           </div>
                           <h3 style={{ margin: 0, color: 'var(--bridgex-text-primary)' }}>Merge Successful!</h3>
                           <p style={{ fontSize: '13px', color: 'var(--bridgex-text-secondary)' }}>The merged source has been uploaded.</p>
                        </div>
                     ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                           <div style={{ position: 'relative', width: '80px', height: '80px' }}>
                              <Loader2 size={80} color="var(--color-primary)" className="animate-spin" strokeWidth={1.5} />
                              <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}>
                                 <GitMerge size={24} color="var(--color-primary)" />
                              </div>
                           </div>
                           <div>
                              <h3 style={{ margin: '0 0 4px 0', color: 'var(--bridgex-text-primary)', textTransform: 'capitalize' }}>{processingStep}...</h3>
                              <p style={{ fontSize: '12px', color: 'var(--bridgex-text-secondary)', margin: 0 }}>
                                 {processingStep === 'capturing' && `Source ${currentSourceIndex + 1} of ${selectedNames.length}`}
                                 {processingStep === 'merging' && "Combining captured contents..."}
                                 {processingStep === 'uploading' && "Uploading to NotebookLM..."}
                                 {processingStep === 'deleting' && `Cleaning up ${currentSourceIndex + 1} of ${selectedNames.length}`}
                              </p>
                           </div>
                        </div>
                     )}
                  </div>

                  {totalWordCount > 0 && (
                    <div style={{ 
                      padding: '16px', borderRadius: '12px', backgroundColor: 'var(--bridgex-bg-main)',
                      border: '1px solid ' + (totalWordCount > 450000 ? '#EF4444' : totalWordCount > 300000 ? '#F59E0B' : 'var(--bridgex-border)'), 
                      textAlign: 'center'
                    }}>
                       <p style={{ fontSize: '10px', color: 'var(--bridgex-text-secondary)', textTransform: 'uppercase', fontWeight: 800, margin: '0 0 4px 0' }}>Estimated Result Size</p>
                       <p style={{ 
                         fontSize: '20px', fontWeight: 800, 
                         color: totalWordCount > 450000 ? '#EF4444' : totalWordCount > 300000 ? '#F59E0B' : 'var(--color-primary)', 
                         margin: 0 
                       }}>{formatWordCount(totalWordCount)}</p>
                       {totalWordCount > 400000 && (
                         <p style={{ fontSize: '10px', color: '#EF4444', marginTop: '4px', fontWeight: 600 }}>Approaching NotebookLM word limit (500k)</p>
                       )}
                    </div>
                  )}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                     {selectedNames.map((name, idx) => (
                        <div key={name} style={{ 
                           padding: '8px 12px', borderRadius: '8px', background: 'var(--bridgex-bg-main)',
                           border: '1px solid ' + (idx === currentSourceIndex ? 'var(--color-primary)' : 'var(--bridgex-border)'),
                           display: 'flex', alignItems: 'center', gap: '10px', opacity: idx > currentSourceIndex ? 0.5 : 1
                        }}>
                           {idx < currentSourceIndex ? (
                             <Check size={14} color="#10B981" />
                           ) : idx === currentSourceIndex ? (
                             <Loader2 size={14} color="var(--color-primary)" className="animate-spin" />
                           ) : (
                             <div style={{ width: '14px' }} />
                           )}
                           <span style={{ fontSize: '12px', color: 'var(--bridgex-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
                        </div>
                     ))}
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
              {!isProcessing && (
                <div style={{ padding: '6px 12px', background: 'rgba(209, 161, 123, 0.1)', borderRadius: '8px', border: '1px solid rgba(209,161,123,0.2)' }}>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-primary)' }}>{selectedNames.length} selected</span>
                </div>
              )}
           </div>
           
           <div style={{ display: 'flex', gap: '12px' }}>
              <button 
                disabled={isProcessing}
                onClick={onClose}
                style={{
                  padding: '12px 24px', borderRadius: '12px', border: '1px solid var(--bridgex-border)',
                  backgroundColor: 'transparent', color: 'var(--bridgex-text-secondary)',
                  fontSize: '14px', fontWeight: 600, cursor: isProcessing ? 'not-allowed' : 'pointer'
                }}
              >Cancel</button>
              <button 
                disabled={selectedNames.length < 2 || isProcessing}
                onClick={handleMerge}
                style={{
                  padding: '12px 32px', borderRadius: '12px', border: 'none',
                  backgroundColor: (selectedNames.length < 2 || isProcessing) ? 'rgba(209, 161, 123, 0.2)' : 'var(--color-primary)',
                  color: (selectedNames.length < 2 || isProcessing) ? 'rgba(255, 255, 255, 0.3)' : 'var(--bridgex-bg-solid)',
                  fontSize: '14px', fontWeight: 700, cursor: (selectedNames.length < 2 || isProcessing) ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  boxShadow: (selectedNames.length < 2 || isProcessing) ? 'none' : '0 8px 24px rgba(209, 161, 123, 0.3)',
                  display: 'flex', alignItems: 'center', gap: '10px'
                }}>
                {isProcessing ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Play size={16} fill="currentColor" />
                    Complete Combine
                  </>
                )}
              </button>
           </div>
        </div>
        {error && (
          <div style={{ padding: '12px 24px', backgroundColor: 'rgba(239, 68, 68, 0.1)', borderTop: '1px solid rgba(239, 68, 68, 0.2)', color: '#EF4444', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
             <AlertCircle size={14} />
             {error}
          </div>
        )}
      </div>

      <style>{`
        .animate-spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default MergeModal;
