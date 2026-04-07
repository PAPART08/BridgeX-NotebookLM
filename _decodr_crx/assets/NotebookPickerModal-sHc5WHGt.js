var u=Object.defineProperty;var y=(m,t,e)=>t in m?u(m,t,{enumerable:!0,configurable:!0,writable:!0,value:e}):m[t]=e;var l=(m,t,e)=>y(m,typeof t!="symbol"?t+"":t,e);class g{constructor(t){l(this,"container",null);l(this,"options");l(this,"notebooks",[]);l(this,"filteredNotebooks",[]);l(this,"searchQuery","");l(this,"handleKeyDown",t=>{t.key==="Escape"&&this.close()});this.options=t}async show(){var t;if(this.container=document.createElement("div"),this.container.id="decodr-notebook-picker",this.options.syncInfo?this.container.innerHTML=this.getSyncPromptHTML(this.options.syncInfo):this.container.innerHTML=this.getPickerHTML(),this.applyStyles(),document.body.appendChild(this.container),document.body.appendChild(this.container),this.options.centered){this.container.classList.add("decodr-centered");const e=document.createElement("div");e.className="decodr-picker-backdrop",e.addEventListener("click",()=>this.close()),(t=this.container.parentElement)==null||t.insertBefore(e,this.container)}else this.options.anchorElement&&this.positionNearAnchor();this.setupEventListeners(),this.options.syncInfo||await this.loadNotebooks()}positionNearAnchor(){var d;const t=this.options.anchorElement,e=(d=this.container)==null?void 0:d.querySelector(".decodr-picker-modal");if(!t||!e)return;const o=t.getBoundingClientRect(),n=400,i=320,r=12,s=o.top,a=window.innerHeight-o.bottom;e.style.position="fixed",e.style.marginTop="0",s>=n+r?(e.style.bottom=`${window.innerHeight-o.top+r}px`,e.style.top="auto"):a>=n+r?(e.style.top=`${o.bottom+r}px`,e.style.bottom="auto"):(e.style.top="50%",e.style.transform="translateY(-50%)");let c=o.left;c+i>window.innerWidth-r&&(c=window.innerWidth-i-r),c<r&&(c=r),e.style.left=`${c}px`}getSyncPromptHTML(t){return`
            <div class="decodr-picker-overlay">
                <div class="decodr-picker-modal decodr-sync-modal">
                    <div class="decodr-picker-header">
                        <img src="${chrome.runtime.getURL("icons/icon48.png")}" width="20" height="20" style="border-radius: 4px" />
                        <h2>Sync Content</h2>
                        <button class="decodr-picker-close" aria-label="Close">×</button>
                    </div>
                    <div class="decodr-sync-content">
                        <p class="decodr-sync-label">Last synced to:</p>
                        <div class="decodr-sync-target">
                            <span class="icon">📓</span>
                            <span class="title">${this.escapeHtml(t.title)}</span>
                        </div>
                        <div class="decodr-sync-actions">
                            <button class="decodr-btn-primary" id="decodr-confirm-sync">Sync to this Notebook</button>
                            <button class="decodr-btn-secondary" id="decodr-choose-new">Add to different Notebook</button>
                        </div>
                    </div>
                </div>
            </div>
        `}getPickerHTML(){return`
            <div class="decodr-picker-overlay">
                <div class="decodr-picker-modal">
                    <div class="decodr-picker-header">
                        <img src="${chrome.runtime.getURL("icons/icon48.png")}" width="20" height="20" style="border-radius: 4px" />
                        <h2>Select Notebook</h2>
                        <button class="decodr-picker-close" aria-label="Close">×</button>
                    </div>
                    <div class="decodr-picker-search">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="11" cy="11" r="8"></circle>
                            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                        </svg>
                        <input type="text" placeholder="Search notebooks..." id="decodr-search-input" />
                    </div>
                    <div class="decodr-picker-content">
                        <div class="decodr-picker-loading">
                            <div class="decodr-spinner"></div>
                            <p>Loading...</p>
                        </div>
                        <div class="decodr-picker-list"></div>
                        <div class="decodr-picker-error">
                            <p>Could not load notebooks.</p>
                            <button class="decodr-picker-retry">Retry</button>
                        </div>
                    </div>
                    <div class="decodr-picker-footer">
                        <button class="decodr-picker-create">+ New Notebook</button>
                    </div>
                </div>
            </div>
        `}setupEventListeners(){var i,r,s;if(!this.container)return;(i=this.container.querySelector(".decodr-picker-close"))==null||i.addEventListener("click",()=>this.close()),(r=this.container.querySelector(".decodr-picker-overlay"))==null||r.addEventListener("click",a=>{a.target.classList.contains("decodr-picker-overlay")&&this.close()});const t=this.container.querySelector("#decodr-confirm-sync");t&&this.options.syncInfo&&t.addEventListener("click",()=>{this.options.onSelect({id:this.options.syncInfo.notebookId,title:this.options.syncInfo.title}),this.close()});const e=this.container.querySelector("#decodr-choose-new");e&&e.addEventListener("click",()=>this.switchToPickerView());const o=this.container.querySelector("#decodr-search-input");o&&(o.addEventListener("input",()=>{this.searchQuery=o.value.toLowerCase(),this.filterAndRender()}),setTimeout(()=>o.focus(),50));const n=this.container.querySelector(".decodr-picker-create");n&&n.addEventListener("click",()=>{const a=this.container.querySelector(".decodr-picker-footer");if(a){a.innerHTML=`
                         <div class="decodr-create-input-wrapper" style="display: flex; gap: 8px; width: 100%;">
                            <input type="text" id="decodr-new-name" placeholder="Notebook Name" style="flex: 1; background: #303134; border: 1px solid #5f6368; color: white; padding: 6px; border-radius: 4px; outline: none; font-size: 13px;">
                            <button id="decodr-do-create" style="background: #8ab4f8; color: #202124; border: none; padding: 0 12px; border-radius: 4px; font-weight: 500; cursor: pointer; font-size: 13px;">Create</button>
                            <button id="decodr-cancel-create" style="background: transparent; color: #9aa0a6; border: 1px solid #5f6368; padding: 0 8px; border-radius: 4px; cursor: pointer; font-size: 12px;">✕</button>
                         </div>
                    `;const c=a.querySelector("#decodr-new-name"),d=a.querySelector("#decodr-do-create"),b=a.querySelector("#decodr-cancel-create");c==null||c.focus();const f=async()=>{var k;const h=c.value.trim();if(h){d&&(d.textContent="...");try{const p=await chrome.runtime.sendMessage({type:"CREATE_NOTEBOOK",payload:{title:h}});p.success&&((k=p.data)!=null&&k.notebookId)?(this.options.onSelect({id:p.data.notebookId,title:p.data.title||h,emoji:"🆕"}),this.close()):(alert("Failed to create notebook: "+(p.error||"Unknown error")),d&&(d.textContent="Create"))}catch(p){alert("Error: "+p.message),d&&(d.textContent="Create")}}};d==null||d.addEventListener("click",f),c.addEventListener("keydown",h=>{h.key==="Enter"&&f(),h.key==="Escape"&&this.resetFooter()}),b==null||b.addEventListener("click",()=>this.resetFooter())}}),(s=this.container.querySelector(".decodr-picker-retry"))==null||s.addEventListener("click",()=>this.loadNotebooks()),document.addEventListener("keydown",this.handleKeyDown)}async switchToPickerView(){this.container&&(this.container.innerHTML=this.getPickerHTML(),this.setupEventListeners(),await this.loadNotebooks())}resetFooter(){var e,o;const t=(e=this.container)==null?void 0:e.querySelector(".decodr-picker-footer");t&&(t.innerHTML='<button class="decodr-picker-create">+ New Notebook</button>',(o=t.querySelector(".decodr-picker-create"))==null||o.addEventListener("click",()=>{this.handleCreateClick()}))}handleCreateClick(){var e;const t=(e=this.container)==null?void 0:e.querySelector(".decodr-picker-create");t&&t.addEventListener("click",()=>{this.switchToCreateMode()})}switchToCreateMode(){const t=this.container.querySelector(".decodr-picker-footer");if(!t)return;t.innerHTML=`
                <div class="decodr-create-input-wrapper" style="display: flex; gap: 8px; width: 100%;">
                <input type="text" id="decodr-new-name" placeholder="Notebook Name" style="flex: 1; background: #303134; border: 1px solid #5f6368; color: white; padding: 6px; border-radius: 4px; outline: none; font-size: 13px;">
                <button id="decodr-do-create" style="background: #8ab4f8; color: #202124; border: none; padding: 0 12px; border-radius: 4px; font-weight: 500; cursor: pointer; font-size: 13px;">Create</button>
                <button id="decodr-cancel-create" style="background: transparent; color: #9aa0a6; border: 1px solid #5f6368; padding: 0 8px; border-radius: 4px; cursor: pointer; font-size: 12px;">✕</button>
                </div>
        `;const e=t.querySelector("#decodr-new-name"),o=t.querySelector("#decodr-do-create"),n=t.querySelector("#decodr-cancel-create");e==null||e.focus();const i=async()=>{var s;const r=e.value.trim();if(r){o&&(o.textContent="...");try{const a=await chrome.runtime.sendMessage({type:"CREATE_NOTEBOOK",payload:{title:r}});a.success&&((s=a.data)!=null&&s.notebookId)?(this.options.onSelect({id:a.data.notebookId,title:a.data.title||r,emoji:"🆕"}),this.close()):(alert("Failed: "+(a.error||"Unknown")),o&&(o.textContent="Create"))}catch(a){alert("Error: "+a.message),o&&(o.textContent="Create")}}};o==null||o.addEventListener("click",i),e.addEventListener("keydown",r=>{r.key==="Enter"&&i(),r.key==="Escape"&&this.resetFooter()}),n==null||n.addEventListener("click",()=>this.resetFooter())}async loadNotebooks(){var n;if(!this.container)return;const t=this.container.querySelector(".decodr-picker-loading"),e=this.container.querySelector(".decodr-picker-list"),o=this.container.querySelector(".decodr-picker-error");t&&t.style.setProperty("display","flex","important"),e&&e.style.setProperty("display","none","important"),o&&o.style.setProperty("display","none","important");try{const i=await chrome.runtime.sendMessage({type:"FETCH_NOTEBOOKS"});if(i.success&&((n=i.data)!=null&&n.notebooks))this.notebooks=i.data.notebooks,this.filteredNotebooks=this.notebooks,this.renderNotebooks(),t&&t.style.setProperty("display","none","important"),e&&e.style.setProperty("display","block","important");else throw new Error(i.error||"Failed to fetch")}catch(i){console.error("Error loading notebooks:",i),t&&t.style.setProperty("display","none","important"),o&&o.style.setProperty("display","flex","important")}}filterAndRender(){this.searchQuery?this.filteredNotebooks=this.notebooks.filter(t=>t.title.toLowerCase().includes(this.searchQuery)):this.filteredNotebooks=this.notebooks,this.renderNotebooks()}renderNotebooks(){var e;const t=(e=this.container)==null?void 0:e.querySelector(".decodr-picker-list");if(t){if(this.filteredNotebooks.length===0){t.innerHTML=`< div class="decodr-empty" > ${this.searchQuery?"No matching notebooks":"No notebooks found"} </div>`;return}t.innerHTML=this.filteredNotebooks.map(o=>`
            <button class="decodr-notebook-item" data-id="${o.id}">
                <span class="icon">${o.emoji||"📓"}</span>
                <span class="title">${this.escapeHtml(o.title)}</span>
            </button>
        `).join(""),t.querySelectorAll(".decodr-notebook-item").forEach(o=>{o.addEventListener("click",()=>{const n=o.getAttribute("data-id"),i=this.notebooks.find(r=>r.id===n);i&&(this.options.onSelect(i),this.close())})})}}escapeHtml(t){const e=document.createElement("div");return e.textContent=t,e.innerHTML}applyStyles(){if(document.getElementById("decodr-picker-styles"))return;const t=document.createElement("style");t.id="decodr-picker-styles",t.textContent=`
            #decodr-notebook-picker * {
                box-sizing: border-box;
                margin: 0;
                padding: 0;
            }
            #decodr-notebook-picker {
                font-family: 'Google Sans', -apple-system, BlinkMacSystemFont, sans-serif;
                font-size: 14px;
                line-height: 1.4;
            }
            .decodr-picker-overlay {
                position: fixed !important;
                top: 0 !important;
                left: 0 !important;
                right: 0 !important;
                bottom: 0 !important;
                background: transparent !important;
                display: flex !important;
                align-items: flex-start !important;
                justify-content: flex-end !important;
                z-index: 2147483647 !important;
                padding: 16px !important;
            }
            .decodr-picker-modal {
                background: #1e1e1e !important;
                border: 1px solid #3c4043 !important;
                border-radius: 12px !important;
                width: 320px !important;
                max-height: 70vh !important;
                display: flex !important;
                flex-direction: column !important;
                box-shadow: 0 16px 40px rgba(0,0,0,0.5) !important;
                margin-top: 50px !important;
                overflow: hidden !important;
                animation: decodr-slide-in 0.15s ease-out !important;
            }
            @keyframes decodr-slide-in {
                from { opacity: 0; transform: translateY(-8px); }
                to { opacity: 1; transform: translateY(0); }
            }
            
            /* Centered Mode */
            .decodr-picker-backdrop {
                position: fixed !important;
                top: 0 !important;
                left: 0 !important;
                width: 100vw !important;
                height: 100vh !important;
                background: rgba(0, 0, 0, 0.5) !important;
                z-index: 999998 !important;
                backdrop-filter: blur(2px) !important;
                display: block !important;
            }
            #decodr-notebook-picker.decodr-centered .decodr-picker-overlay {
                align-items: center !important;
                justify-content: center !important;
                padding: 0 !important;
                pointer-events: none !important;
            }
            #decodr-notebook-picker.decodr-centered .decodr-picker-modal {
                pointer-events: auto !important;
                margin-top: 0 !important;
                box-shadow: 0 24px 48px rgba(0,0,0,0.6) !important;
                transform: none !important;
                animation: decodr-pop-in 0.2s cubic-bezier(0.16, 1, 0.3, 1) !important;
            }
            @keyframes decodr-pop-in {
                from { opacity: 0; transform: scale(0.95); }
                to { opacity: 1; transform: scale(1); }
            }
            .decodr-picker-header {
                display: flex !important;
                align-items: center !important;
                gap: 10px !important;
                padding: 12px 16px !important;
                border-bottom: 1px solid #3c4043 !important;
                background: #202124 !important;
            }
            .decodr-picker-header h2 {
                margin: 0 !important;
                font-size: 14px !important;
                font-weight: 500 !important;
                color: #e8eaed !important;
                flex: 1 !important;
            }
            .decodr-picker-close {
                background: none !important;
                border: none !important;
                color: #9aa0a6 !important;
                font-size: 18px !important;
                cursor: pointer !important;
                padding: 2px 6px !important;
                border-radius: 4px !important;
                line-height: 1 !important;
            }
            .decodr-picker-close:hover {
                background: rgba(255,255,255,0.1) !important;
                color: #e8eaed !important;
            }
            .decodr-picker-search {
                padding: 10px 12px !important;
                border-bottom: 1px solid #3c4043 !important;
                position: relative !important;
                display: flex !important;
                align-items: center !important;
                background: #202124 !important;
            }
            .decodr-picker-search svg {
                position: absolute !important;
                left: 20px !important;
                color: #9aa0a6 !important;
                pointer-events: none !important;
            }
            .decodr-picker-search input {
                width: 100% !important;
                background: #303134 !important;
                border: 1px solid transparent !important;
                border-radius: 6px !important;
                padding: 6px 10px 6px 32px !important;
                color: #e8eaed !important;
                font-size: 13px !important;
                outline: none !important;
            }
            .decodr-picker-search input:focus {
                border-color: #8ab4f8 !important;
            }
            .decodr-picker-content {
                flex: 1 !important;
                overflow-y: auto !important;
                max-height: 300px !important;
                background: #202124 !important;
            }
            .decodr-picker-list {
                padding: 6px !important;
                display: block !important;
            }
            .decodr-notebook-item {
                display: flex !important;
                align-items: center !important;
                width: 100% !important;
                padding: 8px 10px !important;
                border: none !important;
                background: none !important;
                border-radius: 6px !important;
                cursor: pointer !important;
                text-align: left !important;
                gap: 10px !important;
                color: #e8eaed !important;
                font-size: 13px !important;
            }
            .decodr-notebook-item:hover {
                background: #3c4043 !important;
            }
            .decodr-notebook-item .icon {
                font-size: 16px !important;
                flex-shrink: 0 !important;
            }
            .decodr-notebook-item .title {
                flex: 1 !important;
                white-space: nowrap !important;
                overflow: hidden !important;
                text-overflow: ellipsis !important;
            }
            .decodr-picker-footer {
                padding: 10px 12px !important;
                border-top: 1px solid #3c4043 !important;
                background: #202124 !important;
            }
            .decodr-picker-create {
                width: 100% !important;
                padding: 8px !important;
                background: transparent !important;
                border: 1px dashed #5f6368 !important;
                color: #8ab4f8 !important;
                border-radius: 6px !important;
                cursor: pointer !important;
                font-size: 13px !important;
            }
            .decodr-picker-create:hover {
                background: rgba(138, 180, 248, 0.08) !important;
                border-color: #8ab4f8 !important;
            }
            .decodr-picker-loading, .decodr-picker-error {
                padding: 30px !important;
                display: flex;
                flex-direction: column !important;
                align-items: center !important;
                color: #9aa0a6 !important;
                text-align: center !important;
            }
            .decodr-picker-error { display: none !important; }
            .decodr-spinner {
                width: 20px !important;
                height: 20px !important;
                border: 2px solid #5f6368 !important;
                border-top-color: #8ab4f8 !important;
                border-radius: 50% !important;
                animation: decodr-spin 0.8s linear infinite !important;
                margin-bottom: 10px !important;
            }
            @keyframes decodr-spin { to { transform: rotate(360deg); } }
            .decodr-empty {
                padding: 20px !important;
                text-align: center !important;
                color: #9aa0a6 !important;
            }
            /* Sync Prompt */
            .decodr-sync-content {
                padding: 16px !important;
                display: flex !important;
                flex-direction: column !important;
                gap: 12px !important;
                border: none !important;
            }
            .decodr-sync-label {
                color: #9aa0a6 !important;
                font-size: 12px !important;
            }
            .decodr-sync-target {
                background: #303134 !important;
                padding: 10px 12px !important;
                border-radius: 6px !important;
                display: flex !important;
                align-items: center !important;
                gap: 10px !important;
                border: 1px solid #3c4043 !important;
            }
            .decodr-sync-target .title {
                color: #e8eaed !important;
                font-size: 13px !important;
                flex: 1 !important;
                overflow: hidden !important;
                text-overflow: ellipsis !important;
                white-space: nowrap !important;
            }
            .decodr-sync-actions {
                display: flex !important;
                flex-direction: column !important;
                gap: 8px !important;
            }
            .decodr-btn-primary {
                width: 100% !important;
                padding: 10px !important;
                background: #8ab4f8 !important;
                color: #202124 !important;
                border: none !important;
                border-radius: 6px !important;
                font-weight: 500 !important;
                cursor: pointer !important;
                font-size: 13px !important;
            }
            .decodr-btn-primary:hover { background: #aecbfa !important; }
            .decodr-btn-secondary {
                width: 100% !important;
                padding: 10px !important;
                background: transparent !important;
                color: #e8eaed !important;
                border: 1px solid #5f6368 !important;
                border-radius: 6px !important;
                cursor: pointer !important;
                font-size: 13px !important;
            }
            .decodr-btn-secondary:hover {
                background: rgba(255,255,255,0.05) !important;
                border-color: #8ab4f8 !important;
            }
        `,document.head.appendChild(t)}close(){var t,e,o,n;document.removeEventListener("keydown",this.handleKeyDown),(t=document.getElementById("decodr-picker-styles"))==null||t.remove(),this.container&&((e=this.container.previousElementSibling)!=null&&e.classList.contains("decodr-picker-backdrop"))?this.container.previousElementSibling.remove():(o=document.querySelector(".decodr-picker-backdrop"))==null||o.remove(),(n=this.container)==null||n.remove(),this.container=null,this.options.onClose()}}export{g as N};
