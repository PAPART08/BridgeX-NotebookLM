import{g as S,f as E,e as h}from"./exportConversation-DCNpnGK4.js";import{N as C}from"./NotebookPickerModal-sHc5WHGt.js";import{U as y}from"./UpgradePromptModal-crRCl2-a.js";import{e as b,h as T}from"./storage-B2r98b46.js";import{a as M}from"./authPrompt-DRaSGtCl.js";import"./index-0DJ9P6ST.js";console.log("🚀 Decodr: Content script loaded on Claude");console.log("📍 Current URL:",window.location.href);console.log("📍 Document ready state:",document.readyState);setTimeout(()=>y.prewarm(),0);function w(){if(document.querySelector("#decodr-export-btn"))return;const t=document.querySelector('[data-testid="wiggle-controls-actions"]');t&&N(t)}function N(t){if(document.querySelector("#decodr-export-btn"))return;console.log("✅ Found target container, injecting button...");const e=document.createElement("button");e.id="decodr-export-btn",e.className="inline-flex items-center justify-center relative shrink-0 can-focus select-none disabled:pointer-events-none disabled:opacity-50 disabled:shadow-none disabled:drop-shadow-none font-base-bold border-0.5 transition duration-100 backface-hidden h-8 rounded-md px-3 min-w-[4rem] active:scale-[0.985] whitespace-nowrap !text-xs Button_secondary__Teecd",e.type="button",e.innerHTML=`
        <img src="${chrome.runtime.getURL("assets/toast_logo.png")}" width="16" height="16" style="border-radius: 4px; margin-right: 6px;" />
        Add to NotebookLM
    `,e.addEventListener("click",I),k(e);const o=t.querySelector('[data-testid="wiggle-controls-actions-share"]');o?t.insertBefore(e,o):t.appendChild(e)}function k(t){const e=window.location.href;b(e).then(o=>{var n;o&&(n=t.textContent)!=null&&n.includes("Add to NotebookLM")&&(t.innerHTML=`
                    <img src="${chrome.runtime.getURL("assets/toast_logo.png")}" width="16" height="16" style="border-radius: 4px; margin-right: 6px;" />
                    Sync to NB
                `,t.title=`Last synced to: ${o.title}`)})}function I(){try{const t=L();if(t.length===0){l("No conversation found to export.","error");return}let e=document.title;e=e.replace(/\s*[|\-]\s*Claude\s*$/i,"").trim(),e=`Claude - ${e}`,e&&!e.endsWith(".md")&&(e+=".md");const o={platform:"chatgpt",title:e,messages:t,exportedAt:S(),url:window.location.href},n=E(o);v(n,e)}catch(t){console.error("Export error:",t),l("Failed to export conversation")}}function v(t,e){const o=window.location.href;b(o).then(n=>{new C({syncInfo:n?{notebookId:n.notebookId,title:n.title}:void 0,onSelect:async s=>{var p,m;const i=n&&n.notebookId===s.id;c(i?"Syncing...":"Adding...","loading");try{if(i&&n.sourceId)try{console.log("🔄 Sync: Deleting old source...",n.sourceId),c("Updating...","loading"),await chrome.runtime.sendMessage({type:"DELETE_SOURCE",payload:{notebookId:s.id,sourceId:n.sourceId}})}catch(a){console.warn("⚠️ Failed to delete old source during sync",a)}if(!i){const a=await chrome.runtime.sendMessage({type:"IMPORT_CONVERSATION",payload:{platform:"claude"}});if(!a.success){if(((p=a==null?void 0:a.data)==null?void 0:p.reason)==="AUTH_REQUIRED"){c("Sign in required","error"),M({message:"Sign in to Decodr to import Claude conversations."});return}c("Limit reached","error"),new y({featureName:"aiImports"}).show();return}}const d=await chrome.runtime.sendMessage({type:"ADD_TO_NOTEBOOK",payload:{notebookId:s.id,notebookTitle:s.title,content:t,title:e}});if(d.success){c(i?"Synced!":"Added!","success");const a=(m=d.data)==null?void 0:m.sourceId;a&&(await T(o,{notebookId:s.id,sourceId:a,title:s.title,lastExported:new Date().toISOString()}),document.querySelectorAll("#decodr-export-btn").forEach(u=>{var g;const f=u.querySelector("span");f?f.textContent="Sync to NB":(g=u.textContent)!=null&&g.includes("Add to NotebookLM")&&(u.innerHTML=`
                                        <img src="${chrome.runtime.getURL("assets/toast_logo.png")}" width="16" height="16" style="border-radius: 4px; margin-right: 6px;" />
                                        Sync to NB
                                     `)}))}else c("Failed","error"),l("Failed to add to notebook","error")}catch(d){console.error("Add/Sync error:",d),c("Error","error"),l("Failed to add to notebook")}},onCreateNew:()=>{chrome.runtime.sendMessage({type:"OPEN_NOTEBOOKLM_CREATE"})},onClose:()=>{}}).show()})}function L(){const t=[];return document.querySelectorAll('[data-test-render-count], [class*="message"]').forEach(o=>{const n=o.className||"",s=n.includes("user")||n.includes("human")?"user":"assistant",i=h(o);i&&i.length>10&&t.push({role:s,content:i})}),t.length===0&&document.querySelectorAll('p, [class*="content"]').forEach((n,r)=>{const s=h(n);s&&s.length>20&&t.push({role:r%2===0?"user":"assistant",content:s})}),t}function c(t,e){const o=document.querySelector("#decodr-export-btn");if(!o)return;let n=o.querySelector(".decodr-status-indicator");n||(n=document.createElement("div"),n.className="decodr-status-indicator",n.style.cssText=`
            position: absolute;
            top: 100%;
            left: 50%;
            transform: translateX(-50%);
            margin-top: 8px;
            padding: 4px 8px;
            background: #202124;
            color: white;
            border-radius: 4px;
            font-size: 11px;
            white-space: nowrap;
            pointer-events: none;
            opacity: 0;
            transition: opacity 0.2s;
            z-index: 1000;
            box-shadow: 0 2px 6px rgba(0,0,0,0.2);
            font-weight: 500;
        `,o.appendChild(n));const r=n;if(e==="idle"){r.style.opacity="0";return}e==="loading"?(r.innerHTML=`<span class="decodr-spinner"></span> ${t}`,r.style.color="#fff"):e==="success"?(r.textContent="✓ "+t,r.style.color="#81c995",setTimeout(()=>c("","idle"),3e3)):e==="error"&&(r.textContent="✕ "+t,r.style.color="#f28b82",setTimeout(()=>c("","idle"),4e3)),r.style.opacity="1"}function l(t,e){if(document.querySelector(".decodr-status-indicator"))return;const o=document.createElement("div");o.style.cssText=`
    position: fixed;
    bottom: 24px;
    left: 50%;
    transform: translateX(-50%);
    padding: 12px 24px;
    background: #ea4335;
    color: white;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 500;
    z-index: 999999;
    animation: slideUp 0.3s ease;
    font-family: -apple-system, BlinkMacSystemFont, sans-serif;
  `,o.textContent=t,document.body.appendChild(o),setTimeout(()=>{o.style.opacity="0",o.style.transition="opacity 0.3s",setTimeout(()=>o.remove(),300)},3e3)}w();const A=new MutationObserver(()=>{document.querySelector("#decodr-export-btn")||w()});A.observe(document.body,{childList:!0,subtree:!0});
