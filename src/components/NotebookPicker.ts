import { safeChromeCall } from '../utils/context';

export interface Notebook {
  id: string;
  title: string;
  emoji?: string;
}

export class NotebookPicker {
  private container: HTMLDivElement | null = null;
  private onSelect: (notebook: Notebook) => void;
  private onClose: () => void;

  constructor(options: { onSelect: (n: Notebook) => void; onClose: () => void }) {
    this.onSelect = options.onSelect;
    this.onClose = options.onClose;
  }

  async show() {
    this.container = document.createElement('div');
    this.container.id = 'bridge-notebook-picker';
    this.getPickerHTML(this.container);
    this.applyStyles();
    document.body.appendChild(this.container);

    this.setupEventListeners();
    await this.loadNotebooks();
  }

  private getPickerHTML(container: HTMLElement) {
    const overlay = document.createElement('div');
    overlay.className = 'bridge-picker-overlay';
    
    const modal = document.createElement('div');
    modal.className = 'bridge-picker-modal';
    
    const header = document.createElement('div');
    header.className = 'bridge-picker-header';
    
    const icon = document.createElement('span');
    icon.style.fontSize = '20px';
    icon.textContent = '🧵';
    
    const title = document.createElement('h2');
    title.textContent = 'Select Notebook';
    
    const closeBtn = document.createElement('button');
    closeBtn.className = 'bridge-picker-close';
    closeBtn.textContent = '×';
    
    header.appendChild(icon);
    header.appendChild(title);
    header.appendChild(closeBtn);
    
    const content = document.createElement('div');
    content.className = 'bridge-picker-content';
    
    const loading = document.createElement('div');
    loading.className = 'bridge-picker-loading';
    loading.textContent = 'Loading notebooks...';
    
    const list = document.createElement('div');
    list.className = 'bridge-picker-list';
    
    content.appendChild(loading);
    content.appendChild(list);
    
    modal.appendChild(header);
    modal.appendChild(content);
    overlay.appendChild(modal);
    container.appendChild(overlay);
  }

  private async loadNotebooks() {
    const list = this.container?.querySelector('.bridge-picker-list');
    const loading = this.container?.querySelector('.bridge-picker-loading');
    
    try {
      const response = await safeChromeCall(() => chrome.runtime.sendMessage({ type: 'FETCH_NOTEBOOKS' }), { success: false, data: { notebooks: [] } });
      if (loading) (loading as HTMLElement).style.display = 'none';
      
      if (response && response.success && response.data.notebooks) {
        const notebooks: Notebook[] = response.data.notebooks;
        if (list) {
          list.textContent = ''; // Clear
          notebooks.forEach(n => {
            const btn = document.createElement('button');
            btn.className = 'bridge-notebook-item';
            btn.dataset.id = n.id;
            
            const icon = document.createElement('span');
            icon.className = 'icon';
            icon.textContent = n.emoji || '📓';
            
            const title = document.createElement('span');
            title.className = 'title';
            title.textContent = n.title;
            
            btn.appendChild(icon);
            btn.appendChild(title);
            
            btn.addEventListener('click', () => {
              this.onSelect(n);
              this.close();
            });
            list.appendChild(btn);
          });
        }
      }
    } catch (err) {
      if (list) {
        list.textContent = '';
        const error = document.createElement('div');
        error.className = 'error';
        error.textContent = 'Failed to load notebooks';
        list.appendChild(error);
      }
    }
  }

  private setupEventListeners() {
    this.container?.querySelector('.bridge-picker-close')?.addEventListener('click', () => this.close());
    this.container?.querySelector('.bridge-picker-overlay')?.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).classList.contains('bridge-picker-overlay')) this.close();
    });
  }

  private applyStyles() {
    if (document.getElementById('bridge-picker-styles')) return;
    const style = document.createElement('style');
    style.id = 'bridge-picker-styles';
    style.textContent = `
      .bridge-picker-overlay {
        position: fixed; top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(0,0,0,0.4); display: flex; align-items: center;
        justify-content: center; z-index: 2147483647; font-family: 'Inter', sans-serif;
      }
      .bridge-picker-modal {
        background: #1E1F21; border-radius: 12px; width: 320px;
        max-height: 400px; overflow: hidden; box-shadow: 0 12px 32px rgba(0,0,0,0.5);
        border: 1px solid rgba(255,255,255,0.1);
      }
      .bridge-picker-header {
        padding: 16px; border-bottom: 1px solid rgba(255,255,255,0.08);
        display: flex; align-items: center; gap: 12px;
      }
      .bridge-picker-header h2 { margin: 0; font-size: 16px; font-weight: 600; flex: 1; color: #F5F5F7; }
      .bridge-picker-close { background: none; border: none; font-size: 20px; cursor: pointer; color: #999; }
      .bridge-picker-content { padding: 8px; }
      .bridge-notebook-item {
        width: 100%; display: flex; align-items: center; gap: 12px;
        padding: 10px 12px; border: none; background: none;
        border-radius: 8px; cursor: pointer; text-align: left;
        transition: background 0.2s;
      }
      .bridge-notebook-item:hover { background: rgba(255,255,255,0.05); }
      .bridge-notebook-item .title { font-size: 14px; color: #E5E5E5; font-weight: 500; }
      .bridge-picker-loading { padding: 20px; text-align: center; color: #999; font-size: 13px; }

      @media (prefers-color-scheme: light) {
        .bridge-picker-modal {
          background: #FFFFFF;
          box-shadow: 0 12px 32px rgba(0,0,0,0.1);
          border: 1px solid #E5E5E5;
        }
        .bridge-picker-header { border-bottom: 1px solid #F0F0F0; }
        .bridge-picker-header h2 { color: #1A1A1A; }
        .bridge-notebook-item:hover { background: #F5F5F5; }
        .bridge-notebook-item .title { color: #444; }
      }
    `;
    document.head.appendChild(style);
  }

  close() {
    this.container?.remove();
    this.onClose();
  }
}
