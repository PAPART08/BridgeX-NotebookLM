import React, { useState, useRef, useEffect } from 'react';
import { X, Upload, FileText, File, Layout, Minimize2, Maximize2, Loader2, Edit3, CheckCircle2, ChevronRight, Play, Trash2, Scissors, BookOpen, Download } from 'lucide-react';
import { uploadFileToNotebook } from '../../utils/notebooklm-api';
import { extractEpubMetadata, EpubChapter } from '../../utils/fileExtractor';
import { splitEpub, SplitEpubResult } from '../../utils/epubSplitter';
import EpubSplitOptions from './EpubSplitOptions';
import JSZip from 'jszip';

interface SmartImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type SplitStrategy = 'per-section' | 'per-n-sections' | 'n-parts';
type ViewState = 'config' | 'splitting' | 'review' | 'uploading' | 'success';

const SmartImportModal: React.FC<SmartImportModalProps> = ({ isOpen, onClose }) => {
  const [viewState, setViewState] = useState<ViewState>('config');
  const [isExpanded, setIsExpanded] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [wordCount, setWordCount] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showChapterReview, setShowChapterReview] = useState(false);
  const [epubChapters, setEpubChapters] = useState<EpubChapter[]>([]);
  const [splittingStrategy, setSplittingStrategy] = useState<SplitStrategy>('per-section');
  const [nValue, setNValue] = useState(3);
  const [splitResults, setSplitResults] = useState<SplitEpubResult[]>([]);
  const [uploadCounts, setUploadCounts] = useState({ success: 0, total: 0 });
  const [isInvalidated, setIsInvalidated] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset all state when modal opens (prevents stale data across notebooks)
  useEffect(() => {
    if (isOpen) {
      setViewState('config');
      setProgress(0);
      setProgressLabel('');
      setSelectedFile(null);
      setWordCount(0);
      setIsAnalyzing(false);
      setShowChapterReview(false);
      setEpubChapters([]);
      setSplittingStrategy('per-section');
      setNValue(3);
      setSplitResults([]);
      setUploadCounts({ success: 0, total: 0 });
      setIsInvalidated(false);
    }
  }, [isOpen]);

  // Periodic check for context invalidation (development HMR guard)
  useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(() => {
      try {
        if (!chrome.runtime?.id) {
          setIsInvalidated(true);
        }
      } catch (e) {
        setIsInvalidated(true);
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [isOpen]);

  // ─── File Selection ─────────────────────────────────────────
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setIsAnalyzing(true);
    setSplitResults([]);
    setWordCount(0);
    
    try {
      const isEpub = file.name.toLowerCase().endsWith('.epub');
      if (isEpub) {
        const chapters = await extractEpubMetadata(file);
        setEpubChapters(chapters);

        // Count words from the full document by reading raw XHTML from the ZIP
        const zip = new JSZip();
        const zipData = await zip.loadAsync(file);
        let totalWords = 0;

        for (const [path, zipEntry] of Object.entries(zipData.files)) {
          if (zipEntry.dir) continue;
          if (path.endsWith('.xhtml') || path.endsWith('.html') || path.endsWith('.htm') || path.endsWith('.xml')) {
            try {
              const text = await zipEntry.async('text');
              // Strip HTML tags and count words
              const plainText = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
              totalWords += plainText.split(' ').filter(w => w.length > 0).length;
            } catch { /* skip unreadable files */ }
          }
        }
        setWordCount(totalWords);
      } else {
        setEpubChapters([]);
        // For non-EPUB, read as text
        const text = await file.text();
        setWordCount(text.trim().split(/\s+/).length);
      }
    } catch (err) {
      console.error("[bridgeX] Analysis failed:", err);
      alert("Failed to analyze file: " + err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // ─── SPLIT (separate from upload) ───────────────────────────
  const handleSplit = async () => {
    if (!selectedFile) return;
    setViewState('splitting');
    setProgress(0);
    setProgressLabel('Preparing chapters...');

    try {
      const selectedChapters = epubChapters.filter(c => (c as any).selected !== false);

      // Build chapter groups based on strategy
      const groups: { title: string; hrefs: string[] }[] = [];

      if (splittingStrategy === 'per-section') {
        for (const chapter of selectedChapters) {
          groups.push({ title: chapter.title, hrefs: [chapter.href] });
        }
      } else if (splittingStrategy === 'per-n-sections') {
        for (let i = 0; i < selectedChapters.length; i += nValue) {
          const group = selectedChapters.slice(i, i + nValue);
          const title = group.length > 1
            ? `${group[0].title} — ${group[group.length - 1].title}`
            : group[0].title;
          groups.push({ title, hrefs: group.map(c => c.href) });
        }
      } else if (splittingStrategy === 'n-parts') {
        const itemsPerPart = Math.ceil(selectedChapters.length / nValue);
        for (let i = 0; i < nValue; i++) {
          const start = i * itemsPerPart;
          if (start >= selectedChapters.length) break;
          const group = selectedChapters.slice(start, start + itemsPerPart);
          const title = `${selectedFile.name.replace('.epub', '')} — Part ${i + 1}`;
          groups.push({ title, hrefs: group.map(c => c.href) });
        }
      }

      setProgressLabel(`Splitting into ${groups.length} EPUB files...`);
      setProgress(20);

      const results = await splitEpub(selectedFile, groups);
      setProgress(100);
      setProgressLabel('Done!');
      
      setSplitResults(results);
      setViewState('review');
    } catch (err: any) {
      console.error("[bridgeX] Split failed:", err);
      if (err.stack) console.error(err.stack);
      alert("Failed to split EPUB: " + (err.message || err));
      setViewState('config');
    }
  };

  // ─── UPLOAD (direct to Scotty) ─────────────────────────────
  const handleUpload = async () => {
    if (splitResults.length === 0) return;
    
    // Get current notebook ID from URL
    const notebookId = window.location.pathname.match(/\/notebook\/([a-zA-Z0-9-]+)/)?.[1];
    if (!notebookId) {
      alert("Please open a specific notebook first before uploading.");
      return;
    }

    setViewState('uploading');
    setProgress(0);

    let successCount = 0;
    for (let i = 0; i < splitResults.length; i++) {
      const result = splitResults[i];
      setProgressLabel(`Uploading ${i + 1}/${splitResults.length}: ${result.title}`);

      try {
        await uploadFileToNotebook(result.file, notebookId);
        successCount++;
        console.log(`[bridgeX] Uploaded ${i + 1}/${splitResults.length}: ${result.title}`);
      } catch (err) {
        console.error(`[bridgeX] Upload failed for ${result.title}:`, err);
      }

      setProgress(Math.floor(((i + 1) / splitResults.length) * 100));
      
      // Short delay between uploads
      if (i < splitResults.length - 1) {
        await new Promise(r => setTimeout(r, 800));
      }
    }

    setUploadCounts({ success: successCount, total: splitResults.length });
    setViewState('success');
  };

  // ─── DOWNLOAD split EPUBs (Fallback) ───────────────────────
  const handleDownloadOne = (result: SplitEpubResult) => {
    const url = URL.createObjectURL(result.file);
    const a = document.createElement('a');
    a.href = url;
    a.download = result.file.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const removeResult = (index: number) => {
    setSplitResults(prev => prev.filter((_, i) => i !== index));
  };

  const updateResultTitle = (index: number, newTitle: string) => {
    setSplitResults(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], title: newTitle };
      return updated;
    });
  };

  if (!isOpen) return null;

  const isEpub = selectedFile?.name.toLowerCase().endsWith('.epub');
  const selectedChaptersCount = epubChapters.filter(c => (c as any).selected !== false).length;

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
        width: isExpanded ? '95%' : '860px',
        maxHeight: '92vh',
        borderRadius: '24px',
        boxShadow: '0 32px 80px var(--bridgex-shadow)',
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden', border: '1px solid var(--bridgex-border)'
      }}>
        {/* ═══ Header ═══ */}
        <div style={{ padding: '20px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--bridgex-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
             <div style={{ background: 'rgba(209, 161, 123, 0.1)', padding: '8px', borderRadius: '10px' }}>
                <BookOpen size={20} color="var(--color-primary)" />
             </div>
             <div>
               <h2 style={{ fontSize: '18px', margin: 0, color: 'var(--bridgex-text-primary)', fontWeight: 700 }}>EPUB Split & Import</h2>
               <p style={{ margin: 0, fontSize: '11px', color: 'var(--bridgex-text-secondary)' }}>
                 {viewState === 'config' && "Step 1 — Select & Configure"}
                 {viewState === 'splitting' && "Step 2 — Splitting EPUB..."}
                 {viewState === 'review' && "Step 2 — Review Split Files"}
                 {viewState === 'uploading' && "Step 3 — Uploading to NotebookLM..."}
                 {viewState === 'success' && "Step 3 — Upload Complete"}
               </p>
             </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button onClick={() => setIsExpanded(!isExpanded)} style={{ background: 'none', border: 'none', color: 'var(--bridgex-text-secondary)', cursor: 'pointer', padding: '6px' }}>
              {isExpanded ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
            </button>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--bridgex-text-secondary)', cursor: 'pointer', padding: '6px' }}>
              <X size={20} />
            </button>
          </div>
        </div>

        {/* ═══ Invalidation Banner (HMR Guard) ═══ */}
        {isInvalidated && (
          <div style={{
            backgroundColor: '#FFEBEE', color: '#D32F2F', padding: '12px 28px',
            fontSize: '13px', display: 'flex', alignItems: 'center', gap: '12px',
            borderBottom: '1px solid #FFCDD2', animation: 'pulse 1.5s infinite'
          }}>
            <div style={{ backgroundColor: '#D32F2F', color: 'white', padding: '4px', borderRadius: '50%', display: 'flex' }}>
              <X size={14} />
            </div>
            <span><strong>Extension updated:</strong> Please refresh this page to continue using bridgeX tools.</span>
            <button onClick={() => window.location.reload()} style={{ marginLeft: 'auto', background: '#D32F2F', color: 'white', border: 'none', padding: '6px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>Refresh Page</button>
          </div>
        )}

        {/* ═══ Body ═══ */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '32px', position: 'relative' }}>

          {/* ── Config View ── */}
          {viewState === 'config' && (
            <>
              {showChapterReview && (
                 <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 100, backgroundColor: 'var(--bridgex-bg-main)', padding: '32px', overflowY: 'auto' }}>
                    <EpubSplitOptions chapters={epubChapters} onConfirm={(config) => { setEpubChapters(config.chapters as any); setShowChapterReview(false); }} onCancel={() => setShowChapterReview(false)} />
                 </div>
              )}

              {/* File Selection */}
              <div style={{ marginBottom: '32px' }}>
                <p style={{ fontSize: '11px', color: 'var(--bridgex-text-secondary)', textTransform: 'uppercase', marginBottom: '12px', fontWeight: 700, letterSpacing: '0.05em' }}>Source Document</p>
                {!selectedFile ? (
                  <div onClick={() => fileInputRef.current?.click()} style={{ height: '160px', border: '2px dashed var(--bridgex-border)', borderRadius: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', backgroundColor: 'var(--bridgex-surface)', transition: 'all 0.2s', gap: '12px' }}
                    onMouseOver={e => { e.currentTarget.style.borderColor = 'var(--color-primary)'; }}
                    onMouseOut={e => { e.currentTarget.style.borderColor = 'var(--bridgex-border)'; }}
                  >
                    <input ref={fileInputRef} type="file" accept=".epub" style={{ display: 'none' }} onChange={handleFileSelect} />
                    <div style={{ padding: '12px', backgroundColor: 'rgba(209, 161, 123, 0.1)', borderRadius: '50%' }}>
                      <Upload size={24} color="var(--color-primary)" />
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--bridgex-text-primary)', display: 'block' }}>Select EPUB File</span>
                      <span style={{ fontSize: '12px', color: 'var(--bridgex-text-secondary)' }}>Click to browse your files</span>
                    </div>
                  </div>
                ) : (
                  <div style={{ padding: '20px', backgroundColor: 'var(--bridgex-surface)', borderRadius: '20px', border: '1px solid var(--bridgex-border)', display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ padding: '12px', backgroundColor: 'rgba(209, 161, 123, 0.1)', borderRadius: '14px' }}>
                      <FileText size={28} color="var(--color-primary)" />
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: 0, fontWeight: 700, fontSize: '15px', color: 'var(--bridgex-text-primary)' }}>{selectedFile.name}</p>
                      <div style={{ display: 'flex', gap: '16px', marginTop: '4px' }}>
                        <span style={{ fontSize: '12px', color: 'var(--bridgex-text-secondary)' }}>{(selectedFile.size / (1024 * 1024)).toFixed(2)} MB</span>
                        {isAnalyzing ? (
                          <span style={{ fontSize: '12px', color: 'var(--color-primary)' }}>Analyzing...</span>
                        ) : (
                          <>
                            <span style={{ fontSize: '12px', color: 'var(--color-primary)', fontWeight: 700 }}>{wordCount.toLocaleString()} words</span>
                            {isEpub && <span style={{ fontSize: '12px', color: 'var(--bridgex-text-secondary)' }}>{epubChapters.length} sections</span>}
                          </>
                        )}
                      </div>
                    </div>
                    <button onClick={() => { setSelectedFile(null); setEpubChapters([]); setWordCount(0); }} style={{ background: 'none', border: '1px solid var(--bridgex-border)', padding: '6px 14px', borderRadius: '8px', fontSize: '12px', cursor: 'pointer', color: 'var(--bridgex-text-secondary)' }}>Change</button>
                  </div>
                )}
              </div>

              {/* Splitting Strategy — only for EPUB */}
              {isEpub && epubChapters.length > 0 && (
                <div style={{ padding: '24px', backgroundColor: 'rgba(209, 161, 123, 0.04)', borderRadius: '20px', border: '1px solid var(--bridgex-border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <div>
                      <p style={{ margin: 0, fontSize: '11px', color: 'var(--bridgex-text-secondary)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>Splitting Strategy</p>
                    </div>
                    <button onClick={() => setShowChapterReview(true)} style={{ color: 'var(--color-primary)', background: 'none', border: '1px solid rgba(209, 161, 123, 0.3)', fontSize: '12px', fontWeight: 700, cursor: 'pointer', padding: '6px 14px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Edit3 size={13} />
                      Edit Chapters ({selectedChaptersCount})
                    </button>
                  </div>

                  <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
                    {([
                      { id: 'per-section', label: 'One Book Per Section', desc: `Creates ${selectedChaptersCount} EPUB files` },
                      { id: 'per-n-sections', label: 'Group by N Sections', desc: `Creates ~${Math.ceil(selectedChaptersCount / nValue)} EPUB files` },
                      { id: 'n-parts', label: 'Split into N Books', desc: `Creates exactly ${nValue} EPUB files` },
                    ] as const).map(s => (
                      <div key={s.id} onClick={() => setSplittingStrategy(s.id)}
                        style={{
                          flex: 1, padding: '16px', borderRadius: '14px', cursor: 'pointer', textAlign: 'center',
                          border: '2px solid ' + (splittingStrategy === s.id ? 'var(--color-primary)' : 'var(--bridgex-border)'),
                          backgroundColor: splittingStrategy === s.id ? 'rgba(209, 161, 123, 0.08)' : 'transparent',
                          transition: 'all 0.2s'
                        }}>
                        <p style={{ margin: 0, fontWeight: 700, fontSize: '13px', color: splittingStrategy === s.id ? 'var(--color-primary)' : 'var(--bridgex-text-primary)' }}>{s.label}</p>
                        <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: 'var(--bridgex-text-secondary)' }}>{s.desc}</p>
                      </div>
                    ))}
                  </div>

                  {splittingStrategy !== 'per-section' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', backgroundColor: 'var(--bridgex-bg-main)', borderRadius: '12px', border: '1px solid var(--bridgex-border)' }}>
                       <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--bridgex-text-primary)' }}>N =</span>
                       <input type="number" min={1} max={Math.max(1, selectedChaptersCount)} value={nValue}
                         onChange={e => setNValue(Math.max(1, parseInt(e.target.value) || 1))}
                         style={{ width: '60px', padding: '6px 10px', borderRadius: '8px', border: '1px solid var(--bridgex-border)', background: 'var(--bridgex-surface)', color: 'var(--bridgex-text-primary)', fontSize: '14px', fontWeight: 700 }} />
                       <span style={{ fontSize: '12px', color: 'var(--bridgex-text-secondary)' }}>
                         {splittingStrategy === 'per-n-sections'
                           ? `${nValue} sections per EPUB file`
                           : `Split into ${nValue} equal EPUB files`}
                       </span>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* ── Splitting Progress ── */}
          {viewState === 'splitting' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '300px', gap: '20px' }}>
               <Scissors size={40} color="var(--color-primary)" style={{ animation: 'pulse 1.5s infinite' }} />
               <p style={{ fontSize: '16px', fontWeight: 700, color: 'var(--bridgex-text-primary)' }}>Splitting EPUB...</p>
               <p style={{ fontSize: '13px', color: 'var(--bridgex-text-secondary)' }}>{progressLabel}</p>
               <div style={{ width: '320px', height: '6px', background: 'var(--bridgex-border)', borderRadius: '3px', overflow: 'hidden' }}>
                 <div style={{ width: `${progress}%`, height: '100%', background: 'var(--color-primary)', transition: 'width 0.4s ease' }} />
               </div>
            </div>
          )}

          {/* ── Review View ── */}
          {viewState === 'review' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
               <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: 'var(--bridgex-text-primary)' }}>Review Split EPUB Files</h3>
                    <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--bridgex-text-secondary)' }}>
                       {splitResults.length} files ready • Total {splitResults.reduce((a, r) => a + r.wordCount, 0).toLocaleString()} words
                    </p>
                  </div>
                  <button onClick={() => { setViewState('config'); setSplitResults([]); }}
                    style={{ fontSize: '12px', color: 'var(--bridgex-text-secondary)', background: 'none', border: '1px solid var(--bridgex-border)', padding: '6px 14px', borderRadius: '8px', cursor: 'pointer' }}>
                    ← Re-split
                  </button>
               </div>

               <div style={{ border: '1px solid var(--bridgex-border)', borderRadius: '16px', overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                    <thead>
                       <tr style={{ backgroundColor: 'var(--bridgex-surface)', borderBottom: '1px solid var(--bridgex-border)' }}>
                         <th style={{ textAlign: 'left', padding: '12px 16px', fontWeight: 700, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--bridgex-text-secondary)' }}>#</th>
                         <th style={{ textAlign: 'left', padding: '12px 16px', fontWeight: 700, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--bridgex-text-secondary)' }}>File Title</th>
                         <th style={{ textAlign: 'right', padding: '12px 16px', fontWeight: 700, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--bridgex-text-secondary)' }}>Words</th>
                         <th style={{ textAlign: 'right', padding: '12px 16px', fontWeight: 700, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--bridgex-text-secondary)' }}>Size</th>
                         <th style={{ textAlign: 'center', padding: '12px 16px', width: '100px' }}>Actions</th>
                       </tr>
                    </thead>
                    <tbody>
                       {splitResults.map((result, i) => (
                         <tr key={i} style={{ borderBottom: i < splitResults.length - 1 ? '1px solid var(--bridgex-border)' : 'none' }}>
                           <td style={{ padding: '12px 16px', color: 'var(--bridgex-text-secondary)', fontWeight: 600 }}>{i + 1}</td>
                           <td style={{ padding: '12px 16px' }}>
                               <input value={result.title} onChange={e => updateResultTitle(i, e.target.value)}
                                 style={{ width: '100%', background: 'none', border: 'none', borderBottom: '1px solid transparent', color: 'var(--bridgex-text-primary)', fontSize: '13px', fontWeight: 500, outline: 'none', padding: '4px 0' }}
                                 onFocus={e => e.currentTarget.style.borderBottomColor = 'var(--color-primary)'}
                                 onBlur={e => e.currentTarget.style.borderBottomColor = 'transparent'} />
                           </td>
                           <td style={{ padding: '12px 16px', textAlign: 'right', color: 'var(--bridgex-text-secondary)', fontSize: '12px' }}>{result.wordCount.toLocaleString()}</td>
                           <td style={{ padding: '12px 16px', textAlign: 'right', color: 'var(--bridgex-text-secondary)', fontSize: '12px' }}>{(result.file.size / 1024).toFixed(0)} KB</td>
                           <td style={{ padding: '12px 16px', textAlign: 'center', display: 'flex', gap: '8px', justifyContent: 'center' }}>
                               <button onClick={() => handleDownloadOne(result)} title="Download" style={{ color: 'var(--color-primary)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
                                 <Download size={15} />
                               </button>
                               <button onClick={() => removeResult(i)} title="Remove" style={{ color: '#E8715B', background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
                                 <Trash2 size={15} />
                               </button>
                           </td>
                         </tr>
                       ))}
                    </tbody>
                  </table>
               </div>

               <p style={{ fontSize: '12px', color: 'var(--bridgex-text-secondary)', fontStyle: 'italic', margin: 0 }}>
                  Each file above is a valid EPUB that will be uploaded to NotebookLM as a native source — preserving all formatting and structure.
               </p>
            </div>
          )}

          {/* ── Uploading Progress ── */}
          {viewState === 'uploading' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '300px', gap: '20px' }}>
               <Loader2 size={40} color="var(--color-primary)" style={{ animation: 'spin 1s linear infinite' }} />
               <p style={{ fontSize: '16px', fontWeight: 700, color: 'var(--bridgex-text-primary)' }}>Uploading to NotebookLM</p>
               <p style={{ fontSize: '13px', color: 'var(--bridgex-text-secondary)', textAlign: 'center', maxWidth: '400px' }}>{progressLabel}</p>
               <div style={{ width: '320px', height: '6px', background: 'var(--bridgex-border)', borderRadius: '3px', overflow: 'hidden' }}>
                 <div style={{ width: `${progress}%`, height: '100%', background: 'var(--color-primary)', transition: 'width 0.4s ease' }} />
               </div>
               <p style={{ fontSize: '11px', color: 'var(--bridgex-text-secondary)' }}>{progress}% — Do not close this modal</p>
            </div>
          )}

          {/* ── Success View ── */}
          {viewState === 'success' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '300px', gap: '20px' }}>
               <div style={{ backgroundColor: 'rgba(209, 161, 123, 0.1)', padding: '24px', borderRadius: '50%' }}>
                 <CheckCircle2 size={48} color="var(--color-primary)" />
               </div>
               <div style={{ textAlign: 'center' }}>
                 <p style={{ fontSize: '20px', fontWeight: 800, color: 'var(--bridgex-text-primary)', margin: '0 0 8px 0' }}>Import Complete!</p>
                 <p style={{ fontSize: '14px', color: 'var(--bridgex-text-secondary)', margin: 0 }}>
                   Successfully uploaded <strong>{uploadCounts.success}</strong> of {uploadCounts.total} sources to NotebookLM.
                 </p>
                 <p style={{ fontSize: '12px', color: 'var(--bridgex-text-secondary)', marginTop: '8px' }}>
                   You can now close this window and wait for NotebookLM to process the sources.
                 </p>
               </div>
            </div>
          )}


        </div>

        {/* ═══ Footer ═══ */}
        <div style={{ padding: '20px 32px', borderTop: '1px solid var(--bridgex-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--bridgex-surface)' }}>
          {viewState === 'config' && (
            <>
              <button onClick={onClose} style={{ padding: '10px 24px', borderRadius: '12px', border: '1px solid var(--bridgex-border)', background: 'none', color: 'var(--bridgex-text-secondary)', cursor: 'pointer', fontWeight: 600, fontSize: '13px' }}>Cancel</button>
              <button disabled={!selectedFile || !isEpub || isAnalyzing} onClick={handleSplit}
                style={{
                  padding: '12px 36px', borderRadius: '12px', border: 'none',
                  backgroundColor: (!selectedFile || !isEpub || isAnalyzing) ? 'rgba(209, 161, 123, 0.2)' : 'var(--color-primary)',
                  color: 'var(--bridgex-bg-solid)', fontWeight: 700, fontSize: '14px',
                  cursor: (!selectedFile || !isEpub || isAnalyzing) ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', gap: '10px',
                  boxShadow: (!selectedFile || !isEpub || isAnalyzing) ? 'none' : '0 8px 24px rgba(209, 161, 123, 0.2)'
                }}>
                <Scissors size={18} />
                Split EPUB
              </button>
            </>
          )}
          {viewState === 'review' && (
            <>
              <span style={{ fontSize: '12px', color: 'var(--bridgex-text-secondary)' }}>
                {splitResults.length} EPUB files ready
              </span>
              <button disabled={splitResults.length === 0} onClick={handleUpload}
                style={{
                  padding: '12px 48px', borderRadius: '12px', border: 'none',
                  backgroundColor: splitResults.length === 0 ? 'rgba(209, 161, 123, 0.2)' : 'var(--color-primary)',
                  color: 'var(--bridgex-bg-solid)', fontWeight: 700, fontSize: '14px',
                  cursor: splitResults.length === 0 ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', gap: '10px',
                  boxShadow: splitResults.length === 0 ? 'none' : '0 8px 24px rgba(209, 161, 123, 0.2)'
                }}>
                <Upload size={18} />
                Upload All to NotebookLM
              </button>
            </>
          )}
          {viewState === 'success' && (
            <div style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
              <button onClick={onClose}
                style={{
                  padding: '12px 64px', borderRadius: '12px', border: 'none',
                  backgroundColor: 'var(--color-primary)',
                  color: 'var(--bridgex-bg-solid)', fontWeight: 700, fontSize: '14px',
                  cursor: 'pointer',
                  boxShadow: '0 8px 24px rgba(209, 161, 123, 0.2)'
                }}>
                Done
              </button>
            </div>
          )}
          {(viewState === 'splitting' || viewState === 'uploading') && (
            <div style={{ width: '100%', textAlign: 'center', fontSize: '12px', color: 'var(--bridgex-text-secondary)' }}>
              Processing... Please wait.
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default SmartImportModal;
