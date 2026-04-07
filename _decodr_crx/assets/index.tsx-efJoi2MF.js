import{g as S,f as x,e as g}from"./exportConversation-DCNpnGK4.js";import{N as v}from"./NotebookPickerModal-sHc5WHGt.js";import{U as y}from"./UpgradePromptModal-crRCl2-a.js";import{e as b,h as E}from"./storage-B2r98b46.js";import{a as T}from"./authPrompt-DRaSGtCl.js";import"./index-0DJ9P6ST.js";console.log("🚀 Decodr loaded on ChatGPT");setTimeout(()=>y.prewarm(),0);function C(){return new Promise(o=>{const e=()=>{document.querySelector("main")||document.querySelector('[role="main"]')?o():setTimeout(e,500)};e()})}async function m(){await C();const o=document.querySelector("header")||document.querySelector('[class*="header"]')||document.querySelector("nav");if(o&&!document.querySelector("#decodr-save-btn")){const e=document.createElement("button");e.id="decodr-save-btn",e.innerHTML=`
      <img src="${chrome.runtime.getURL("assets/toast_logo.png")}" width="16" height="16" style="border-radius: 4px" />
      <span class="decodr-label">Add to NotebookLM</span>
    `,e.style.cssText=`
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 8px 12px;
      background: #202124;
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      margin-left: 8px;
      transition: all 0.2s;
      font-family: 'Google Sans', -apple-system, sans-serif;
      position: relative;
    `,e.addEventListener("click",q),e.addEventListener("mouseenter",()=>{e.style.background="#8B5CF6"}),e.addEventListener("mouseleave",()=>{e.style.background="#202124"}),w(e),o.appendChild(e),console.log("✅ Save to NotebookLM button injected")}}function q(){var o;try{const e=I();if(e.length===0){l("No conversation found to export.","error");return}const r=document.querySelector("h1")||document.querySelector('[class*="title"]')||document.querySelector("title");let t=((o=r==null?void 0:r.textContent)==null?void 0:o.trim())||"Conversation";t=`ChatGPT - ${t}`,t&&!t.endsWith(".md")&&(t+=".md");const n={platform:"chatgpt",title:t,messages:e,exportedAt:S(),url:window.location.href},s=x(n);k(s,t)}catch(e){console.error("Export error:",e),l("Failed to export conversation")}}function k(o,e){const r=window.location.href;b(r).then(t=>{new v({syncInfo:t?{notebookId:t.notebookId,title:t.title}:void 0,onSelect:async s=>{var p,f;const d=t&&t.notebookId===s.id;c(d?"Syncing...":"Adding...","loading");try{if(d&&t.sourceId)try{console.log("🔄 Sync: Deleting old source...",t.sourceId),c("Updating...","loading"),await chrome.runtime.sendMessage({type:"DELETE_SOURCE",payload:{notebookId:s.id,sourceId:t.sourceId}})}catch(a){console.warn("⚠️ Failed to delete old source during sync",a)}if(!d){const a=await chrome.runtime.sendMessage({type:"IMPORT_CONVERSATION",payload:{platform:"chatgpt"}});if(!a.success){if(((p=a==null?void 0:a.data)==null?void 0:p.reason)==="AUTH_REQUIRED"){c("Sign in required","error"),T({message:"Sign in to Decodr to import ChatGPT conversations."});return}c("Limit reached","error"),new y({featureName:"aiImports"}).show();return}}const i=await chrome.runtime.sendMessage({type:"ADD_TO_NOTEBOOK",payload:{notebookId:s.id,notebookTitle:s.title,content:o,title:e}});if(i.success){c(d?"Synced!":"Added!","success");const a=(f=i.data)==null?void 0:f.sourceId;if(a){await E(r,{notebookId:s.id,sourceId:a,title:s.title,lastExported:new Date().toISOString()});const u=document.querySelector("#decodr-save-btn .decodr-label");u&&(u.textContent="Sync to NB")}}else c("Failed","error"),l("Failed to add to notebook","error")}catch(i){console.error("Add/Sync error:",i),c("Error","error"),l("Failed to process request")}},onCreateNew:()=>{chrome.runtime.sendMessage({type:"OPEN_NOTEBOOKLM_CREATE"})},onClose:()=>{}}).show()})}function I(){const o=[];return document.querySelectorAll("[data-message-author-role]").forEach(r=>{const n=(r.getAttribute("data-message-author-role")||"user")==="assistant"?"assistant":"user",s=g(r);s&&o.push({role:n,content:s})}),o.length===0&&document.querySelectorAll('[class*="message"]').forEach((t,n)=>{const s=g(t);s&&s.length>10&&o.push({role:n%2===0?"user":"assistant",content:s})}),o}function c(o,e){const r=document.querySelector("#decodr-save-btn");if(!r)return;let t=r.querySelector(".decodr-status-indicator");t||(t=document.createElement("div"),t.className="decodr-status-indicator",t.style.cssText=`
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
        `,r.appendChild(t));const n=t;if(e==="idle"){n.style.opacity="0";return}e==="loading"?(n.innerHTML=`<span class="decodr-spinner"></span> ${o}`,n.style.color="#fff"):e==="success"?(n.textContent="✓ "+o,n.style.color="#81c995",setTimeout(()=>c("","idle"),3e3)):e==="error"&&(n.textContent="✕ "+o,n.style.color="#f28b82",setTimeout(()=>c("","idle"),4e3)),n.style.opacity="1"}function l(o,e){if(document.querySelector(".decodr-status-indicator"))return;const r=document.createElement("div");r.style.cssText=`
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
    font-family: 'Google Sans', -apple-system, sans-serif;
  `,r.textContent=o,document.body.appendChild(r),setTimeout(()=>{r.style.opacity="0",r.style.transition="opacity 0.3s",setTimeout(()=>r.remove(),300)},3e3)}m();let h=window.location.href;new MutationObserver(()=>{const o=window.location.href;if(o!==h){h=o,console.log("Use navigated to:",o);const e=document.querySelector("#decodr-save-btn");e?w(e):m()}document.querySelector("#decodr-save-btn")||m()}).observe(document.body,{childList:!0,subtree:!0});function w(o){const e=window.location.href;b(e).then(r=>{const t=o.querySelector(".decodr-label");t&&(r?(t.textContent="Sync to NB",o.title=`Last synced to: ${r.title}`):(t.textContent="Add to NotebookLM",o.title=""))})}
