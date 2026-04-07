import React, { useState } from 'react';
import { Settings, Info, Download, PackageOpen } from 'lucide-react';
import { extractTextFromFile } from '../utils/fileExtractor';
import { splitTextByWords } from '../utils/textSplitter';

function App() {
  const [activeTab, setActiveTab] = useState<'status' | 'tools'>('status');
  const [isProcessing, setIsProcessing] = useState(false);
  const [outputFiles, setOutputFiles] = useState<{ blob: Blob; name: string }[]>([]);

  const handleSmartImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    setIsProcessing(true);
    setOutputFiles([]);
    
    try {
      let combinedText = '';
      for (const file of files) {
        const text = await extractTextFromFile(file);
        combinedText += `\n\n# SOURCE: ${file.name}\n\n${text}\n\n---\n\n`;
      }
      const chunks = splitTextByWords(combinedText, 450000);
      const results = chunks.map((chunk, i) => {
        const blob = new Blob([chunk], { type: 'text/markdown' });
        const name = chunks.length > 1 ? `Import_Part_${i + 1}.md` : `bridgeX_Source.md`;
        return { blob, name };
      });
      setOutputFiles(results);
    } catch (err) {
      console.error('Smart Import failed:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="bridgex-container w-[360px] min-h-[500px] flex flex-col glass-morphism">
      <header className="p-4 border-b border-[#2D2D30] flex items-center justify-between sticky top-0 bg-[#121214]/80 backdrop-blur-md z-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center shadow-lg overflow-hidden">
            <img src="/assets/bridgex-logo.png" className="w-full h-full object-cover" alt="bridgeX" />
          </div>
          <h1 className="text-xl font-bold font-outfit text-gradient">bridgeX</h1>
        </div>
        <div className="flex gap-2">
          <button className="p-2 hover:bg-[#1C1C1E] rounded-full transition-colors text-slate-400 hover:text-white"><Settings size={18} /></button>
          <button className="p-2 hover:bg-[#1C1C1E] rounded-full transition-colors text-slate-400 hover:text-white"><Info size={18} /></button>
        </div>
      </header>

      <main className="flex-1 p-4 overflow-y-auto">
        <div className="flex gap-3 mb-6 bg-[#1C1C1E] p-1 rounded-xl">
          <button 
            onClick={() => setActiveTab('status')}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'status' 
                ? 'bg-[#D1A17B] text-white shadow-md shadow-[#D1A17B]/20' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Insights
          </button>
          <button 
            onClick={() => setActiveTab('tools')}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'tools' 
                ? 'bg-[#D1A17B] text-white shadow-md shadow-[#D1A17B]/20' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Tools
          </button>
        </div>

        {activeTab === 'status' ? (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="card">
              <h3 className="text-sm font-outfit font-semibold text-slate-200 mb-2">Workspace Health</h3>
              <div className="flex items-center justify-between p-3 bg-[#121214] rounded-lg">
                <span className="text-xs text-slate-500">Active Notebook</span>
                <span className="text-xs font-semibold text-[#D1A17B]">Project Deepdive</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="card">
              <div className="flex items-center gap-2 mb-3">
                <PackageOpen size={16} className="text-[#D1A17B]" />
                <h3 className="text-sm font-outfit font-semibold text-slate-100">Smart Extract & Split</h3>
              </div>
              <p className="text-[11px] text-slate-500 mb-4 italic">Optimized for NotebookLM word limits (450k).</p>
              
              <label className="block w-full text-center p-6 border-2 border-dashed border-[#2D2D30] rounded-xl cursor-pointer hover:border-[#D1A17B]/50 hover:bg-[#D1A17B]/5 transition-all group">
                <input type="file" multiple className="hidden" accept=".epub,.pdf,.txt,.md,.docx,.pptx" onChange={handleSmartImport} />
                <PackageOpen size={32} className="mx-auto mb-3 text-slate-600 group-hover:text-[#D1A17B] transition-colors" />
                <span className="text-xs text-slate-400 group-hover:text-slate-200">{isProcessing ? 'Processing... ' : 'Upload Files to Extract'}</span>
              </label>
            </div>

            {outputFiles.length > 0 && (
              <div className="mt-4 p-4 bg-[#1C1C1E] rounded-xl border border-[#D1A17B]/20">
                <p className="text-[10px] font-bold text-[#D1A17B] uppercase mb-3">Ready for Download:</p>
                <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1 custom-scrollbar">
                  {outputFiles.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-[#121214] rounded-lg border border-[#2D2D30] hover:border-[#D1A17B]/30 transition-colors">
                      <span className="text-xs text-slate-300 truncate mr-2">{item.name}</span>
                      <button 
                        className="p-1.5 hover:bg-[#D1A17B]/10 rounded-md transition-colors"
                        onClick={() => {
                          const url = URL.createObjectURL(item.blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = item.name;
                          a.click();
                          URL.revokeObjectURL(url);
                        }}
                      >
                        <Download size={14} className="text-[#D1A17B]" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      <footer className="p-4 border-t border-[#2D2D30] bg-[#121214]/50">
        <p className="text-[10px] text-center text-slate-500 uppercase tracking-widest font-medium">Local-First | Private</p>
      </footer>
    </div>
  );
}

export default App;
