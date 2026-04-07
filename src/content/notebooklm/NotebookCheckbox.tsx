import React from 'react';
import { Check } from 'lucide-react';
import { useStorage } from '../../store';

interface NotebookCheckboxProps {
  notebookId: string;
  card: HTMLElement;
}

const NotebookCheckbox: React.FC<NotebookCheckboxProps> = ({ notebookId, card }) => {
  const { selectedNotebookIds, toggleNotebookSelection } = useStorage();
  const isSelected = selectedNotebookIds.includes(notebookId);

  const isRow = card?.getAttribute('role') === 'row' || card?.classList.contains('mdc-list-item') || card?.tagName === 'TR' || card?.innerHTML.includes('mdc-data-table__cell');

  return (
    <div 
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        toggleNotebookSelection(notebookId);
      }}
      style={{
        position: isRow ? 'relative' : 'absolute',
        top: isRow ? 'auto' : '12px',
        right: isRow ? 'auto' : '12px',
        marginLeft: isRow ? '14px' : '0',
        zIndex: 100,
        width: '18px',
        height: '18px',
        borderRadius: '5px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        background: isSelected ? 'var(--color-primary)' : 'rgba(255,255,255,0.08)',
        backdropFilter: 'blur(8px)',
        border: '1.5px solid ' + (isSelected ? 'var(--color-primary)' : 'rgba(255,255,255,0.2)'),
        boxShadow: isSelected ? '0 4px 12px rgba(209, 161, 123, 0.4)' : '0 2px 8px rgba(0,0,0,0.1)',
        transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        transform: isSelected ? 'scale(1.05)' : 'scale(1)',
      }}

      onMouseOver={(e) => {
        if (!isSelected) e.currentTarget.style.background = 'rgba(255,255,255,0.4)';
      }}
      onMouseOut={(e) => {
        if (!isSelected) e.currentTarget.style.background = 'rgba(255,255,255,0.2)';
      }}
    >
      {isSelected && <Check size={14} color="white" strokeWidth={3} />}
    </div>
  );
};

export default NotebookCheckbox;
