import{U as j}from"./UpgradePromptModal-crRCl2-a.js";import{a as U}from"./authPrompt-DRaSGtCl.js";import"./index-0DJ9P6ST.js";setTimeout(()=>j.prewarm(),0);let b=null,w=null;chrome.runtime.onMessage.addListener((e,r,f)=>{e.type==="SHOW_WEB_CLIP_POPUP"&&(A(e.payload),f({success:!0}))});function u(){b&&(b.remove(),b=null),w&&(document.removeEventListener("keydown",w),w=null)}function D(){const e=window.getSelection();if(e!=null&&e.rangeCount){const r=e.getRangeAt(0);return r.collapsed?null:r.getBoundingClientRect()}return null}function A(e){u();const r=D();b=document.createElement("div"),b.id="decodr-clip-host",document.body.appendChild(b);const f=b.attachShadow({mode:"open"}),T=document.createElement("style");T.textContent=K,f.appendChild(T);const d=document.createElement("div");d.className="dc-wrap",f.appendChild(d);const i=document.createElement("div");i.className="dc-backdrop",i.addEventListener("click",u),d.appendChild(i);const m=document.createElement("div");m.className="dc-popup",F(m,r),d.appendChild(m);const k=document.createElement("div");k.className="dc-hdr";const y=document.createElement("div");y.className="dc-hdr-l";const z=document.createElement("div");z.className="dc-hdr-icon",z.innerHTML=Y;const B=document.createElement("span");B.className="dc-hdr-title",B.textContent="Save Web Clip",y.appendChild(z),y.appendChild(B);const E=document.createElement("button");E.className="dc-close",E.innerHTML=G,E.addEventListener("click",u),k.appendChild(y),k.appendChild(E),m.appendChild(k);const g=document.createElement("div");g.className="dc-body",m.appendChild(g);const N=document.createElement("div");N.className="dc-group";const O=document.createElement("label");O.className="dc-label",O.textContent="Title";const h=document.createElement("input");h.className="dc-input",h.type="text",h.value=e.title,h.placeholder="Clip title…",N.appendChild(O),N.appendChild(h),g.appendChild(N);const p=document.createElement("div");p.className="dc-group";const L=document.createElement("label");L.className="dc-label",L.textContent="Content";let P=null;if(e.source==="selection"){const t=document.createElement("textarea");t.className="dc-textarea",t.value=e.content,t.placeholder="Edit your selection…",p.appendChild(L),p.appendChild(t),P=t}else{const t=document.createElement("div");if(t.className="dc-preview",t.textContent=e.content.length>180?e.content.slice(0,180)+"…":e.content,p.appendChild(L),p.appendChild(t),e.content.length>180){const l=document.createElement("span");l.className="dc-meta",l.textContent=`${e.content.length.toLocaleString()} characters`,p.appendChild(l)}}g.appendChild(p);const S=document.createElement("div");S.className="dc-group";const I=document.createElement("label");I.className="dc-label",I.textContent="Notebook";const a=document.createElement("select");a.className="dc-select";const C=document.createElement("option");C.value="",C.textContent="Loading…",C.disabled=!0,C.selected=!0,a.appendChild(C),S.appendChild(I),S.appendChild(a),g.appendChild(S);const s=document.createElement("div");s.className="dc-err",s.style.display="none",g.appendChild(s);const H=document.createElement("div");H.className="dc-footer";const M=document.createElement("button");M.className="dc-btn dc-btn-ghost",M.textContent="Cancel",M.addEventListener("click",u);const o=document.createElement("button");o.className="dc-btn dc-btn-primary",o.textContent="Save Source",o.disabled=!0,H.appendChild(M),H.appendChild(o),m.appendChild(H),w=t=>{t.key==="Escape"&&u()},document.addEventListener("keydown",w);function x(t){s.className="dc-err",s.innerHTML="",s.textContent=t,s.style.display="block"}function _(){s.style.display="none"}chrome.runtime.sendMessage({type:"FETCH_NOTEBOOKS"}).then(t=>{var l,n;if(t!=null&&t.success&&((n=(l=t.data)==null?void 0:l.notebooks)!=null&&n.length)){a.innerHTML="";const c=document.createElement("option");c.value="",c.textContent="Select a notebook…",a.appendChild(c),t.data.notebooks.forEach(v=>{const W=document.createElement("option");W.value=v.id,W.textContent=(v.emoji?v.emoji+" ":"")+v.title,a.appendChild(W)})}else a.innerHTML='<option value="" disabled selected>No notebooks found</option>',x("No notebooks found. Please log in to NotebookLM first.")}).catch(()=>{a.innerHTML='<option value="" disabled selected>Error loading</option>',x("Could not load notebooks.")}),a.addEventListener("change",()=>{o.disabled=!a.value,_()}),o.addEventListener("click",async()=>{var t,l;if(a.value){o.disabled=!0,o.textContent="Saving…",_();try{const n=await chrome.runtime.sendMessage({type:"IMPORT_WEB_CLIP",payload:{}});if(!(n!=null&&n.success)){if(((t=n==null?void 0:n.data)==null?void 0:t.reason)==="AUTH_REQUIRED"){x("Please sign in to Decodr first."),U({message:"Sign in to Decodr to save web clips to NotebookLM."}),o.disabled=!1,o.textContent="Save Source";return}if((l=n==null?void 0:n.error)!=null&&l.includes("limit reached")){u(),new j({featureName:"webClips",onClose:()=>{}}).show();return}x((n==null?void 0:n.error)||"Limit check failed."),o.disabled=!1,o.textContent="Save Source";return}const c=await chrome.runtime.sendMessage({type:"ADD_TO_NOTEBOOK",payload:{notebookId:a.value,content:P?P.value:e.content,title:h.value||e.title}});c!=null&&c.success?(o.textContent="Saved!",o.className="dc-btn dc-btn-success",setTimeout(u,900)):(x((c==null?void 0:c.error)||"Failed to save."),o.disabled=!1,o.textContent="Save Source")}catch(n){x((n==null?void 0:n.message)||"Something went wrong."),o.disabled=!1,o.textContent="Save Source"}}})}function F(e,r){if(r){let d=r.left+r.width/2-180,i=r.bottom+10;d<12&&(d=12),d+360>innerWidth-12&&(d=innerWidth-360-12),i+400>innerHeight-12&&(i=r.top-400-10,i<12&&(i=12)),e.style.left=d+"px",e.style.top=i+"px"}else e.style.left=Math.max(12,(innerWidth-360)/2)+"px",e.style.top=Math.max(12,(innerHeight-400)/2)+"px"}const Y='<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4"/><rect x="9" y="11" width="13" height="12" rx="2"/><path d="m9 16 2 2 4-4"/></svg>',G='<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',K=`
* { margin: 0; padding: 0; box-sizing: border-box; }

/* Viewport overlay */
.dc-wrap {
  position: fixed;
  inset: 0;
  z-index: 2147483647;
}
.dc-backdrop {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.18);
  animation: dc-fade 0.15s ease;
}

/* Popup card */
.dc-popup {
  position: absolute;
  width: 360px;
  background: #1e1e1e;
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 12px;
  box-shadow:
    0 20px 60px rgba(0,0,0,0.55),
    0 0 0 1px rgba(255,255,255,0.04);
  overflow: hidden;
  animation: dc-pop 0.2s cubic-bezier(0.16,1,0.3,1);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  color: rgba(255,255,255,0.9);
}
@keyframes dc-fade {
  from { opacity: 0; }
  to   { opacity: 1; }
}
@keyframes dc-pop {
  from { opacity: 0; transform: translateY(-6px) scale(0.97); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}

/* ── Header ── */
.dc-hdr {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 13px 14px;
  border-bottom: 1px solid rgba(255,255,255,0.08);
}
.dc-hdr-l {
  display: flex;
  align-items: center;
  gap: 10px;
}
.dc-hdr-icon {
  width: 30px;
  height: 30px;
  border-radius: 7px;
  background: linear-gradient(135deg, #9333ea, #7c3aed);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  flex-shrink: 0;
}
.dc-hdr-title {
  font-size: 14px;
  font-weight: 600;
  color: rgba(255,255,255,0.92);
}
.dc-close {
  width: 26px;
  height: 26px;
  border: none;
  background: transparent;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: rgba(255,255,255,0.35);
  transition: all .15s;
}
.dc-close:hover {
  background: rgba(255,255,255,0.08);
  color: rgba(255,255,255,0.7);
}

/* ── Body ── */
.dc-body {
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.dc-group {
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.dc-label {
  font-size: 10px;
  font-weight: 600;
  color: rgba(255,255,255,0.4);
  text-transform: uppercase;
  letter-spacing: 0.6px;
}
.dc-input {
  width: 100%;
  padding: 9px 11px;
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 7px;
  font-size: 13px;
  color: rgba(255,255,255,0.9);
  font-family: inherit;
  outline: none;
  transition: border-color .15s;
}
.dc-input:focus {
  border-color: rgba(147,51,234,.5);
}
.dc-input::placeholder {
  color: rgba(255,255,255,0.28);
}
.dc-textarea {
  width: 100%;
  padding: 9px 11px;
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 7px;
  font-size: 13px;
  color: rgba(255,255,255,0.9);
  font-family: inherit;
  outline: none;
  resize: vertical;
  min-height: 72px;
  max-height: 160px;
  transition: border-color .15s;
}
.dc-textarea:focus {
  border-color: rgba(147,51,234,.5);
}
.dc-textarea::placeholder {
  color: rgba(255,255,255,0.28);
}

/* Content preview */
.dc-preview {
  padding: 9px 11px;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.07);
  border-radius: 7px;
  font-size: 12px;
  color: rgba(255,255,255,0.55);
  line-height: 1.5;
  max-height: 72px;
  overflow: hidden;
  white-space: pre-wrap;
  word-break: break-word;
}
.dc-meta {
  font-size: 10px;
  color: rgba(255,255,255,0.28);
  margin-top: 2px;
}

/* Notebook select */
.dc-select {
  width: 100%;
  padding: 9px 34px 9px 11px;
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 7px;
  font-size: 13px;
  color: rgba(255,255,255,0.9);
  font-family: inherit;
  outline: none;
  cursor: pointer;
  appearance: none;
  -webkit-appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239aa0a6' stroke-width='2.5' stroke-linecap='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 11px center;
  transition: border-color .15s;
}
.dc-select:focus {
  border-color: rgba(147,51,234,.5);
}
.dc-select option {
  background: #2a2a2a;
  color: rgba(255,255,255,0.9);
}

/* Error */
.dc-err {
  padding: 8px 10px;
  background: rgba(239,68,68,0.1);
  border: 1px solid rgba(239,68,68,0.2);
  border-radius: 6px;
  font-size: 11px;
  color: #f87171;
  line-height: 1.4;
}

/* ── Footer ── */
.dc-footer {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  padding: 11px 14px;
  border-top: 1px solid rgba(255,255,255,0.08);
}
.dc-btn {
  padding: 7px 14px;
  border-radius: 7px;
  font-size: 13px;
  font-weight: 500;
  border: none;
  cursor: pointer;
  font-family: inherit;
  transition: all .15s;
  white-space: nowrap;
}
.dc-btn-ghost {
  background: transparent;
  color: rgba(255,255,255,0.55);
}
.dc-btn-ghost:hover {
  background: rgba(255,255,255,0.07);
  color: rgba(255,255,255,0.85);
}
.dc-btn-primary {
  background: linear-gradient(135deg, #9333ea, #7c3aed);
  color: #fff;
  min-width: 96px;
  box-shadow: 0 2px 8px rgba(147,51,234,0.25);
}
.dc-btn-primary:hover:not(:disabled) {
  filter: brightness(1.12);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(147,51,234,0.35);
}
.dc-btn-primary:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  box-shadow: none;
  transform: none;
}
.dc-btn-success {
  background: linear-gradient(135deg, #10b981, #059669) !important;
  box-shadow: 0 2px 8px rgba(16,185,129,0.3) !important;
}
`;
