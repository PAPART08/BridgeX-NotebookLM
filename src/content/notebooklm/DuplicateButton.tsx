import React, { useState } from 'react';
import { Copy, Loader2, CheckCircle2 } from 'lucide-react';
import { duplicateNotebook } from '../../utils/notebookActions';

interface DuplicateButtonProps {
  notebookId: string;
  title: string;
}

export const DuplicateButton: React.FC<DuplicateButtonProps> = ({ notebookId, title }) => {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const handleDuplicate = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (status === 'loading') return;

    setStatus('loading');
    const result = await duplicateNotebook(notebookId, title);
    
    if (result.success) {
      setStatus('success');
      setTimeout(() => setStatus('idle'), 3000);
    } else {
      setStatus('error');
      setTimeout(() => setStatus('idle'), 3000);
      alert(`Failed to duplicate notebook: ${result.error}`);
    }
  };

  return (
    <div 
      onClick={handleDuplicate}
      title="Duplicate Notebook"
      style={{
        padding: '8px',
        background: 'var(--bridgex-bg-main)',
        backdropFilter: 'blur(12px)',
        border: '1px solid var(--bridgex-border)',
        borderRadius: '10px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: status === 'success' ? '#81C995' : status === 'error' ? '#F28B82' : 'var(--bridgex-text-secondary)',
        boxShadow: '0 4px 16px var(--bridgex-shadow)',
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
      }}
      onMouseOver={e => { e.currentTarget.style.borderColor = 'var(--color-primary)'; e.currentTarget.style.color = 'var(--color-primary)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
      onMouseOut={e => { e.currentTarget.style.borderColor = 'var(--bridgex-border)'; e.currentTarget.style.color = status === 'success' ? '#81C995' : status === 'error' ? '#F28B82' : 'var(--bridgex-text-secondary)'; e.currentTarget.style.transform = 'translateY(0)'; }}
    >
      {status === 'loading' ? (
        <Loader2 size={14} className="animate-spin" />
      ) : status === 'success' ? (
        <CheckCircle2 size={14} />
      ) : (
        <Copy size={16} />
      )}
    </div>
  );
};
  
