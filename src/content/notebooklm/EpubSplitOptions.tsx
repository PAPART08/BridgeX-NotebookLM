import React, { useState } from 'react';
import { Check, X, List, Save } from 'lucide-react';
import { EpubChapter } from '../../utils/fileExtractor';

interface EpubSplitOptionsProps {
  chapters: EpubChapter[];
  onConfirm: (config: SplitConfig) => void;
  onCancel: () => void;
}

export type SplitStrategy = 'none' | 'per-section' | 'per-n-sections' | 'n-parts';

export interface SplitConfig {
  chapters: (EpubChapter & { selected: boolean })[];
  strategy: SplitStrategy;
  nValue: number;
}

const EpubSplitOptions: React.FC<EpubSplitOptionsProps> = ({ chapters, onConfirm, onCancel }) => {
  const [localChapters, setLocalChapters] = useState<(EpubChapter & { selected: boolean })[]>(
    chapters.map(c => ({ 
      ...c, 
      selected: (c as any).selected !== false 
    }))
  );

  const toggleChapter = (index: number) => {
    const newChapters = [...localChapters];
    newChapters[index].selected = !newChapters[index].selected;
    setLocalChapters(newChapters);
  };

  const updateTitle = (index: number, title: string) => {
    const newChapters = [...localChapters];
    newChapters[index].title = title;
    setLocalChapters(newChapters);
  };

  const selectAll = (selected: boolean) => {
    setLocalChapters(localChapters.map(c => ({ ...c, selected })));
  };

  const selectedCount = localChapters.filter(c => c.selected).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h3 style={{ margin: '0 0 4px 0', fontSize: '18px', fontWeight: 700, color: 'var(--bridgex-text-primary)' }}>Review Chapters</h3>
          <p style={{ fontSize: '13px', color: 'var(--bridgex-text-secondary)', margin: 0 }}>
            Select sections to import and refine their names.
          </p>
        </div>
        <button onClick={onCancel} style={{ background: 'none', border: 'none', color: 'var(--bridgex-text-secondary)', cursor: 'pointer' }}>
          <X size={20} />
        </button>
      </div>

      <div style={{ padding: '20px', backgroundColor: 'var(--bridgex-surface)', borderRadius: '16px', border: '1px solid var(--bridgex-border)', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', alignItems: 'center' }}>
          <button onClick={() => selectAll(true)} style={{ fontSize: '11px', background: 'none', border: '1px solid var(--bridgex-border)', color: 'var(--bridgex-text-secondary)', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>Select All</button>
          <button onClick={() => selectAll(false)} style={{ fontSize: '11px', background: 'none', border: '1px solid var(--bridgex-border)', color: 'var(--bridgex-text-secondary)', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>Deselect All</button>
          <span style={{ marginLeft: 'auto', fontSize: '12px', color: 'var(--color-primary)', fontWeight: 700 }}>{selectedCount} sections selected</span>
        </div>

        <div style={{ 
          flex: 1, minHeight: '300px', overflowY: 'auto', border: '1px solid var(--bridgex-border)', 
          borderRadius: '12px', backgroundColor: 'var(--bridgex-bg-main)' 
        }}>
          {localChapters.map((chapter, idx) => (
            <div key={chapter.id} style={{ 
              display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px',
              borderBottom: idx === localChapters.length - 1 ? 'none' : '1px solid var(--bridgex-border)',
              backgroundColor: chapter.selected ? 'transparent' : 'rgba(0,0,0,0.02)',
              transition: 'all 0.2s'
            }}>
              <div 
                onClick={() => toggleChapter(idx)}
                style={{ 
                  width: '20px', height: '20px', borderRadius: '6px', 
                  border: `2px solid ${chapter.selected ? 'var(--color-primary)' : 'var(--bridgex-border)'}`,
                  backgroundColor: chapter.selected ? 'var(--color-primary)' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                {chapter.selected && <Check size={14} color="var(--bridgex-bg-solid)" />}
              </div>
              <input 
                type="text" 
                value={chapter.title} 
                onChange={(e) => updateTitle(idx, e.target.value)}
                disabled={!chapter.selected}
                style={{ 
                  flex: 1, background: 'none', border: 'none', color: chapter.selected ? 'var(--bridgex-text-primary)' : 'var(--bridgex-text-secondary)',
                  fontSize: '14px', outline: 'none', fontWeight: 500
                }}
                placeholder="Chapter title..."
              />
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '12px' }}>
        <button 
          onClick={onCancel}
          style={{ 
            flex: 1, padding: '14px', borderRadius: '12px', border: '1px solid var(--bridgex-border)',
            background: 'none', color: 'var(--bridgex-text-secondary)', fontWeight: 600, cursor: 'pointer'
          }}
        >Cancel</button>
        <button 
          disabled={selectedCount === 0}
          onClick={() => onConfirm({ chapters: localChapters, strategy: 'per-section', nValue: 3 })}
          style={{ 
            flex: 2, padding: '14px', borderRadius: '12px', border: 'none',
            background: selectedCount === 0 ? 'rgba(209, 161, 123, 0.3)' : 'var(--color-primary)', 
            color: 'var(--bridgex-bg-solid)', fontWeight: 700, cursor: selectedCount === 0 ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            boxShadow: '0 8px 24px rgba(209, 161, 123, 0.2)'
          }}
        >
          <Save size={18} />
          Save Changes
        </button>
      </div>
    </div>
  );
};

export default EpubSplitOptions;
