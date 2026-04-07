import{g as T,f as v,e as b}from"./exportConversation-DCNpnGK4.js";import{N as q}from"./NotebookPickerModal-sHc5WHGt.js";import{U as x}from"./UpgradePromptModal-crRCl2-a.js";import{e as E,h as I}from"./storage-B2r98b46.js";import{a as M}from"./authPrompt-DRaSGtCl.js";import"./index-0DJ9P6ST.js";console.log("🚀 Decodr loaded on Gemini");setTimeout(()=>x.prewarm(),0);function S(){const e=document.querySelector(".top-bar-actions .right-section")||document.querySelector('[class*="top-bar"]')||document.querySelector("header");return e instanceof HTMLElement?e:null}function p(e,n){const o=e.querySelector(".buttons-container.adv-upsell"),t=o instanceof HTMLElement?o:null;if(t&&t.parentElement===e){const i=t.nextSibling;(n.parentElement!==e||n!==i)&&e.insertBefore(n,i),n.style.marginLeft="8px",n.style.marginRight="0";return}const s=e.querySelector(".buttons-container.share"),r=s==null?void 0:s.closest(".buttons-container");if(r instanceof HTMLElement&&r.parentElement===e){(n.parentElement!==e||n.nextSibling!==r)&&e.insertBefore(n,r),n.style.marginLeft="0",n.style.marginRight="8px";return}(n.parentElement!==e||e.firstChild!==n)&&e.insertBefore(n,e.firstChild),n.style.marginLeft="0",n.style.marginRight="8px"}function N(){return new Promise(e=>{const n=()=>{document.querySelector("main")||document.querySelector('[role="main"]')?e():setTimeout(n,500)};n()})}async function f(){await N(),console.log("🔍 Decodr: Attempting to inject button on Gemini...");const e=S();if(console.log("📍 Target container found:",e),e){const n=document.getElementById("decodr-export-wrapper");if(n instanceof HTMLElement){p(e,n);return}if(document.querySelector("#decodr-export-btn")){console.log("✅ Button already exists");return}const o=document.createElement("div");o.className="buttons-container",o.id="decodr-export-wrapper",o.style.cssText="display: flex; align-items: center; flex-shrink: 0;";const t=document.createElement("button");t.id="decodr-export-btn",t.className="mdc-button mat-mdc-button-base gds-pillbox-button mdc-button--unelevated mat-mdc-unelevated-button mat-unthemed",w(t),t.innerHTML=`
            <span class="mat-mdc-button-persistent-ripple mdc-button__ripple"></span>
            <span class="mdc-button__label" style="display: flex; align-items: center; gap: 6px;">
                <img src="${chrome.runtime.getURL("assets/toast_logo.png")}" width="16" height="16" style="border-radius: 4px" />
                <span class="decodr-label">Add to NB</span>
            </span>
            <span class="mat-focus-indicator"></span>
            <span class="mat-mdc-button-touch-target"></span>
        `,t.style.cssText=`
            display: inline-flex;
            align-items: center;
            justify-content: center;
            padding: 0 16px;
            height: 32px;
            min-width: max-content;
            background: transparent;
            color: #e8eaed;
            border: 1px solid #5f6368;
            border-radius: 16px;
            font-size: 14px;
            font-weight: 500;
            white-space: nowrap;
            cursor: pointer;
            transition: all 0.2s;
            font-family: 'Google Sans', Roboto, sans-serif;
            letter-spacing: 0.25px;
            position: relative;
        `,t.addEventListener("click",L),t.addEventListener("mouseenter",()=>{t.style.background="rgba(232, 234, 237, 0.08)",t.style.borderColor="#8ab4f8"}),t.addEventListener("mouseleave",()=>{t.style.background="transparent",t.style.borderColor="#5f6368"}),o.appendChild(t),p(e,o),console.log("✅ Export button injected into Gemini toolbar")}else console.log("⚠️ No target container found for Gemini")}function L(){try{const e=C();if(e.length===0){u("No conversation found to export.","error");return}const n=document.title;let o="Gemini Conversation";if(n&&n!=="Gemini"){const r=n.split("|");if(r.length>1)o=r[0].trim();else{const i=document.querySelector('[class*="conversation-title"]')||document.querySelector('[data-test-id*="title"]');i!=null&&i.textContent&&(o=i.textContent.trim())}}o=`Gemini - ${o}`,o&&!o.endsWith(".md")&&(o+=".md");const t={platform:"gemini",title:o,messages:e,exportedAt:T(),url:window.location.href},s=v(t);k(s,o)}catch(e){console.error("Export error:",e),u("Failed to export conversation")}}function k(e,n){const o=window.location.href;E(o).then(t=>{new q({syncInfo:t?{notebookId:t.notebookId,title:t.title}:void 0,onSelect:async r=>{var g,y;const i=t&&t.notebookId===r.id;a(i?"Syncing...":"Adding...","loading");try{if(i&&t.sourceId)try{console.log("🔄 Sync: Deleting old source...",t.sourceId),a("Updating...","loading"),await chrome.runtime.sendMessage({type:"DELETE_SOURCE",payload:{notebookId:r.id,sourceId:t.sourceId}})}catch(c){console.warn("⚠️ Failed to delete old source during sync (might match manual deletion)",c)}if(!i){const c=await chrome.runtime.sendMessage({type:"IMPORT_CONVERSATION",payload:{platform:"gemini"}});if(!c.success){if(((g=c==null?void 0:c.data)==null?void 0:g.reason)==="AUTH_REQUIRED"){a("Sign in required","error"),M({message:"Sign in to Decodr to import Gemini conversations."});return}a("Limit reached","error"),new x({featureName:"aiImports"}).show();return}}const d=await chrome.runtime.sendMessage({type:"ADD_TO_NOTEBOOK",payload:{notebookId:r.id,notebookTitle:r.title,content:e,title:n}});if(d.success){a(i?"Synced!":"Added!","success");const c=(y=d.data)==null?void 0:y.sourceId;if(c){await I(o,{notebookId:r.id,sourceId:c,title:r.title,lastExported:new Date().toISOString()});const m=document.querySelector("#decodr-export-btn .decodr-label");m&&(m.textContent="Sync to NB")}}else a("Failed","error"),u("Failed to add to notebook","error")}catch(d){console.error("Add/Sync error:",d),a("Error","error"),u("Failed to process request")}},onCreateNew:()=>{chrome.runtime.sendMessage({type:"OPEN_NOTEBOOKLM_CREATE"})},onClose:()=>{}}).show()})}function C(){const e=[];return document.querySelectorAll('[data-test-id*="message"], [class*="message"]').forEach(o=>{const t=o.getAttribute("data-test-id")||"",s=o.className||"",i=t.includes("user")||s.includes("user")?"user":"model",l=b(o);l&&l.length>10&&e.push({role:i,content:l})}),e.length===0&&document.querySelectorAll('p, [class*="content"]').forEach((t,s)=>{const r=b(t);r&&r.length>20&&e.push({role:s%2===0?"user":"model",content:r})}),e}function a(e,n){const o=document.querySelector("#decodr-export-btn");if(!o)return;let t=o.querySelector(".decodr-status-indicator");t||(t=document.createElement("div"),t.className="decodr-status-indicator",t.style.cssText=`
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
        `,o.appendChild(t));const s=t;if(n==="idle"){s.style.opacity="0";return}n==="loading"?(s.innerHTML=`<span class="decodr-spinner"></span> ${e}`,s.style.color="#fff"):n==="success"?(s.textContent="✓ "+e,s.style.color="#81c995",setTimeout(()=>a("","idle"),3e3)):n==="error"&&(s.textContent="✕ "+e,s.style.color="#f28b82",setTimeout(()=>a("","idle"),4e3)),s.style.opacity="1"}function u(e,n){if(document.querySelector(".decodr-status-indicator"))return;const o=document.createElement("div");o.style.cssText=`
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
  `,o.textContent=e,document.body.appendChild(o),setTimeout(()=>{o.style.opacity="0",o.style.transition="opacity 0.3s",setTimeout(()=>o.remove(),300)},3e3)}f();let h=window.location.href;new MutationObserver(()=>{const e=window.location.href;if(e!==h){h=e,console.log("Use navigated to:",e);const t=document.querySelector("#decodr-export-btn");t?w(t):f()}if(!document.querySelector("#decodr-export-btn")){f();return}const n=document.getElementById("decodr-export-wrapper"),o=S();n instanceof HTMLElement&&o&&p(o,n)}).observe(document.body,{childList:!0,subtree:!0});function w(e){const n=window.location.href;E(n).then(o=>{const t=e.querySelector(".decodr-label");t&&(o?(t.textContent="Sync to NB",e.title=`Last synced to: ${o.title}`):(t.textContent="Add to NB",e.title=""))})}
