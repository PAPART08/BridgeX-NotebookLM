import React, { useState, useEffect } from 'react';
import { Search, Plus, Trash2, Copy, Send, Sparkles } from 'lucide-react';
import { getPrompts, savePrompt, deletePrompt, StoredPrompt, DEFAULT_PROMPTS } from '../store/promptStore';
import { useStorage } from '../store';

export const PromptLibrary: React.FC = () => {
  const { lastRefreshed } = useStorage();
  const [prompts, setPrompts] = useState<StoredPrompt[]>([]);
  const [search, setSearch] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [newPrompt, setNewPrompt] = useState({ title: '', content: '' });

  useEffect(() => {
    loadPrompts();
  }, [lastRefreshed]);

  const loadPrompts = async () => {
    let p = await getPrompts();
    if (p.length === 0) {
      for (const dp of DEFAULT_PROMPTS) {
        await savePrompt(dp);
      }
      p = await getPrompts();
    }
    setPrompts(p);
  };

  const handleAdd = async () => {
    if (!newPrompt.title || !newPrompt.content) return;
    await savePrompt(newPrompt);
    setNewPrompt({ title: '', content: '' });
    setIsAdding(false);
    loadPrompts();
  };

  const handleDelete = async (id: string) => {
    await deletePrompt(id);
    loadPrompts();
  };

  const handleUse = (content: string) => {
    const chatbox = document.querySelector('textarea, [contenteditable="true"]') as HTMLTextAreaElement;
    if (chatbox) {
      chatbox.value = content;
      chatbox.dispatchEvent(new Event('input', { bubbles: true }));
    } else {
      navigator.clipboard.writeText(content);
      alert('Prompt copied to clipboard!');
    }
  };

  const filtered = prompts.filter(p => 
    p.title.toLowerCase().includes(search.toLowerCase()) || 
    p.content.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h2 style={{ 
          margin: 0, fontSize: '11px', fontWeight: 800, color: 'var(--bridgex-text-primary)', 
          display: 'flex', alignItems: 'center', gap: '8px', letterSpacing: '0.1em' 
        }}>
          <Sparkles size={14} color="var(--color-primary)" /> PROMPT LIBRARY
        </h2>
        <button 
          onClick={() => setIsAdding(!isAdding)}
          style={{ 
            background: 'rgba(209, 161, 123, 0.1)', border: 'none', borderRadius: '6px', 
            cursor: 'pointer', color: 'var(--color-primary)', padding: '4px', transition: 'all 0.2s'
          }}
          onMouseOver={e => e.currentTarget.style.background = 'rgba(209, 161, 123, 0.2)'}
          onMouseOut={e => e.currentTarget.style.background = 'rgba(209, 161, 123, 0.1)'}
        >
          <Plus size={18} />
        </button>
      </div>

      <div style={{ position: 'relative' }}>
        <Search size={14} color="var(--bridgex-text-secondary)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} />
        <input 
          type="text" 
          placeholder="Search global prompts..." 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: '100%', background: 'var(--bridgex-input-bg)', border: '1px solid var(--bridgex-border)',
            borderRadius: '12px', padding: '10px 12px 10px 36px', fontSize: '12px', color: 'var(--bridgex-text-primary)',
            outline: 'none', transition: 'all 0.2s'
          }}
          onFocus={e => e.currentTarget.style.borderColor = 'var(--color-primary)'}
          onBlur={e => e.currentTarget.style.borderColor = 'var(--bridgex-border)'}
        />
      </div>

      {isAdding && (
        <div style={{ 
          padding: '16px', background: 'var(--bridgex-surface)', border: '1px solid var(--color-primary)',
          borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '12px'
        }}>
          <input 
            type="text" 
            placeholder="Prompt Title" 
            value={newPrompt.title}
            onChange={(e) => setNewPrompt({...newPrompt, title: e.target.value})}
            style={{ width: '100%', background: 'var(--bridgex-bg-solid)', border: '1px solid var(--bridgex-border)', borderRadius: '8px', padding: '10px', fontSize: '12px', color: 'var(--bridgex-text-primary)', outline: 'none' }}
          />
          <textarea 
            placeholder="Paste prompt content here..." 
            value={newPrompt.content}
            onChange={(e) => setNewPrompt({...newPrompt, content: e.target.value})}
            style={{ width: '100%', background: 'var(--bridgex-bg-solid)', border: '1px solid var(--bridgex-border)', borderRadius: '8px', padding: '10px', fontSize: '12px', color: 'var(--bridgex-text-primary)', outline: 'none', minHeight: '100px', resize: 'vertical' }}
          />
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'end' }}>
            <button onClick={() => setIsAdding(false)} style={{ background: 'none', border: 'none', color: 'var(--bridgex-text-secondary)', fontSize: '11px', fontWeight: 700, padding: '8px 12px', cursor: 'pointer', textTransform: 'uppercase' }}>Cancel</button>
            <button onClick={handleAdd} style={{ background: 'var(--color-primary)', border: 'none', color: 'var(--bridgex-bg-solid)', fontSize: '11px', fontWeight: 800, padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Save Artifact</button>
          </div>
        </div>
      )}

      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }} className="custom-scrollbar">
        {filtered.map(prompt => (
          <div key={prompt.id} style={{
            padding: '16px', background: 'var(--bridgex-surface)', border: '1px solid var(--bridgex-border)',
            borderRadius: '16px', transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)', position: 'relative'
          }}
          onMouseOver={e => e.currentTarget.style.background = 'var(--bridgex-surface-hover)'}
          onMouseOut={e => e.currentTarget.style.background = 'var(--bridgex-surface)'}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
              <span style={{ fontSize: '9px', fontWeight: 900, color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '0.12em', padding: '2px 6px', background: 'rgba(209, 161, 123, 0.1)', borderRadius: '4px' }}>
                {prompt.category || 'Expert'}
              </span>
              <button 
                onClick={() => handleDelete(prompt.id)}
                style={{ background: 'none', border: 'none', color: 'var(--bridgex-text-secondary)', padding: '4px', cursor: 'pointer', opacity: 0.5, transition: 'all 0.2s' }}
                onMouseOver={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.color = '#ff6b6b'; }}
                onMouseOut={e => { e.currentTarget.style.opacity = '0.5'; e.currentTarget.style.color = 'var(--bridgex-text-secondary)'; }}
              >
                <Trash2 size={12} />
              </button>
            </div>
            <h4 style={{ margin: '0 0 6px 0', fontSize: '14px', fontWeight: 700, color: 'var(--bridgex-text-primary)' }}>{prompt.title}</h4>
            <p style={{ margin: '0 0 16px 0', fontSize: '11px', color: 'var(--bridgex-text-secondary)', lineHeight: 1.6, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
              {prompt.content}
            </p>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button 
                onClick={() => handleUse(prompt.content)}
                style={{
                  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  padding: '10px', background: 'rgba(209, 161, 123, 0.1)', border: '1px solid rgba(209, 161, 123, 0.2)',
                  color: 'var(--color-primary)', borderRadius: '10px', fontSize: '11px', fontWeight: 800,
                  textTransform: 'uppercase', letterSpacing: '0.04em', cursor: 'pointer', transition: 'all 0.2s'
                }}
                onMouseOver={e => { e.currentTarget.style.background = 'rgba(209, 161, 123, 0.18)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                onMouseOut={e => { e.currentTarget.style.background = 'rgba(209, 161, 123, 0.1)'; e.currentTarget.style.transform = 'translateY(0)'; }}
              >
                <Send size={12} /> Run Prompt
              </button>
              <button 
                onClick={() => navigator.clipboard.writeText(prompt.content)}
                style={{
                  padding: '10px', background: 'var(--bridgex-surface)', border: '1px solid var(--bridgex-border)',
                  color: 'var(--bridgex-text-secondary)', borderRadius: '10px', cursor: 'pointer', transition: 'all 0.2s'
                }}
                onMouseOver={e => e.currentTarget.style.color = 'var(--color-primary)'}
                onMouseOut={e => e.currentTarget.style.color = 'var(--bridgex-text-secondary)'}
              >
                <Copy size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
