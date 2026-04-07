import { NotebookPicker, Notebook } from '../../components/NotebookPicker';
import { isContextValid, safeChromeCall, registerScriptInstance, isCurrentInstance } from '../../utils/context';

const instanceId = registerScriptInstance();

function initSourceInflow() {

  const host = window.location.hostname;
  
  if (host.includes('chatgpt.com') || host.includes('chat.openai.com')) {
    addAIButton('ChatGPT');
  } else if (host.includes('claude.ai')) {
    addAIButton('Claude');
  } else if (host.includes('gemini.google.com')) {
    addAIButton('Gemini');
  } else if (host.includes('youtube.com')) {
    addAIButton('YouTube');
  }
}

function addAIButton(platform: string) {
  const observer = new MutationObserver(() => {
    if (!isContextValid() || !isCurrentInstance(instanceId)) {
      observer.disconnect();
      const btn = document.getElementById('bridge-ai-btn');
      if (btn && !isCurrentInstance(instanceId)) btn.remove();
      return;
    }

    // Platform-specific button placement
    let menu: Element | null = null;
    
    if (platform === 'ChatGPT') {
      menu = document.querySelector('nav');
    } else if (platform === 'Claude') {
      menu = document.querySelector('div.flex.flex-col.gap-1'); // Sidebar menu
    } else if (platform === 'Gemini') {
      menu = document.querySelector('.Nav-container');
    } else if (platform === 'YouTube') {
      menu = document.querySelector('#owner'); // Next to subscribe button
    }

    if (!menu || document.getElementById('bridge-ai-btn')) return;

    const btn = document.createElement('div');
    btn.id = 'bridge-ai-btn';
    
    const wrapper = document.createElement('div');
    wrapper.style.display = 'flex';
    wrapper.style.alignItems = 'center';
    wrapper.style.gap = '8px';
    
    const icon = document.createElement('span');
    icon.style.fontSize = '16px';
    icon.textContent = '🧵';
    
    const textNode = document.createElement('span');
    textNode.textContent = 'bridgeX to Notebook';
    
    wrapper.appendChild(icon);
    wrapper.appendChild(textNode);
    btn.appendChild(wrapper);

    btn.style.cssText = `
      padding: 12px;
      margin: 8px;
      background: rgba(209, 161, 123, 0.1);
      color: #D1A17B;
      border: 1px solid rgba(209, 161, 123, 0.2);
      border-radius: 8px;
      cursor: pointer;
      font-size: 14px;
      font-family: 'Inter', sans-serif;
      font-weight: 600;
      transition: all 0.2s ease;
    `;

    const aid = 'bridge-ai-button-styles';
    if (!document.getElementById(aid)) {
      const s = document.createElement('style');
      s.id = aid;
      s.textContent = `
        #bridge-ai-btn {
          background: rgba(209, 161, 123, 0.1) !important;
          color: #D1A17B !important;
          border: 1px solid rgba(209, 161, 123, 0.2) !important;
        }
        #bridge-ai-btn:hover {
          background: rgba(209, 161, 123, 0.2) !important;
        }
        @media (prefers-color-scheme: light) {
          #bridge-ai-btn {
            background: rgba(209, 161, 123, 0.08) !important;
            border-color: rgba(209, 161, 123, 0.3) !important;
          }
        }
      `;
      document.head.appendChild(s);
    }

    btn.onclick = () => handleCapture(platform);
    menu.prepend(btn);
  });

  observer.observe(document.body, { childList: true, subtree: true });
}

async function handleCapture(platform: string) {
  let content = '';
  const timestamp = Date.now();
  const url = window.location.href;
  const title = document.title.split(' - ')[0] || `Chat from ${platform}`;

  if (platform === 'ChatGPT') {
    const turns = document.querySelectorAll('[data-testid^="conversation-turn-"]');
    turns.forEach((turn) => {
      const role = turn.querySelector('[data-testid="author-role-assistant"]') ? 'Assistant' : 'User';
      const text = turn.querySelector('.markdown')?.textContent || '';
      if (text) content += `### ${role}\n${text}\n\n`;
    });
  } else if (platform === 'Claude') {
    const messages = document.querySelectorAll('.font-claude-message, .prose');
    messages.forEach((msg) => {
      content += msg.textContent + '\n\n';
    });
  } else if (platform === 'Gemini') {
    const responses = document.querySelectorAll('.model-response-text, .query-text');
    responses.forEach((resp) => {
      content += resp.textContent + '\n\n';
    });
  } else if (platform === 'YouTube') {
    const segments = document.querySelectorAll('ytd-transcript-segment-renderer');
    if (segments.length > 0) {
      segments.forEach(seg => {
        const text = seg.querySelector('.segment-text')?.textContent?.trim();
        if (text) content += text + ' ';
      });
    } else {
      content = "Please open the Transcript panel on YouTube to capture the full text.";
    }
  }

  if (!content) {
    content = document.body.innerText.substring(0, 5000); // Basic fallback
  }

  const picker = new NotebookPicker({
    onSelect: (notebook: Notebook) => {
      safeChromeCall(() => chrome.runtime.sendMessage({
        type: 'CAPTURE_SOURCE',
        payload: { 
          title, 
          url, 
          type: platform.toLowerCase(), 
          content, 
          timestamp,
          notebookId: notebook.id,
          notebookTitle: notebook.title
        }
      }), undefined);
      showToast(notebook.title);
    },
    onClose: () => {
      console.log('Picker closed');
    }
  });

  picker.show();
}

function showToast(notebookTitle?: string) {
  const container = document.createElement('div');
  container.id = 'bridge-toast-container';
  const shadow = container.attachShadow({ mode: 'open' });

  const toast = document.createElement('div');
  toast.className = 'toast';
  
  const icon = document.createElement('span');
  icon.className = 'icon';
  icon.textContent = '🧵';
  
  const textDiv = document.createElement('div');
  textDiv.className = 'text';
  
  const bold = document.createElement('strong');
  bold.textContent = 'bridgeXed!';
  
  const span = document.createElement('span');
  span.textContent = `Added to ${notebookTitle || 'Inbox'}`;
  
  textDiv.appendChild(bold);
  textDiv.appendChild(span);
  
  toast.appendChild(icon);
  toast.appendChild(textDiv);

  const style = document.createElement('style');
  style.textContent = `
    .toast {
      position: fixed;
      top: 24px;
      right: 24px;
      background: #1E1F21;
      border: 1px solid rgba(255, 255, 255, 0.1);
      box-shadow: 0 8px 32px rgba(0,0,0,0.4);
      border-radius: 12px;
      padding: 16px 20px;
      display: flex;
      align-items: center;
      gap: 12px;
      z-index: 100000;
      animation: slideIn 0.3s ease-out forwards;
      font-family: 'Inter', sans-serif;
    }
    .icon { font-size: 20px; }
    .text { display: flex; flex-direction: column; gap: 2px; }
    .text strong { color: #F5F5F7; font-size: 14px; }
    .text span { color: #A1A1AA; font-size: 12px; }
    
    @media (prefers-color-scheme: light) {
      .toast {
        background: #FFFFFF;
        border: 1px solid #E5E5E5;
        box-shadow: 0 4px 12px rgba(0,0,0,0.1);
      }
      .text strong { color: #1A1A1A; }
      .text span { color: #666; }
    }
    @keyframes slideIn {
      from { transform: translateX(100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
    @keyframes fadeOut {
      from { transform: translateX(0); opacity: 1; }
      to { transform: translateX(10px); opacity: 0; }
    }
  `;

  shadow.appendChild(style);
  shadow.appendChild(toast);
  document.body.appendChild(container);

  setTimeout(() => {
    toast.style.animation = 'fadeOut 0.3s ease-in forwards';
    setTimeout(() => container.remove(), 300);
  }, 3000);
}

initSourceInflow();
export {};
