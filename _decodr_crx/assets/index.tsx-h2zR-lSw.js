var Ie=Object.defineProperty;var Te=(t,e,o)=>e in t?Ie(t,e,{enumerable:!0,configurable:!0,writable:!0,value:o}):t[e]=o;var A=(t,e,o)=>Te(t,typeof e!="symbol"?e+"":e,o);import{N as be}from"./NotebookPickerModal-sHc5WHGt.js";import{U as ge}from"./UpgradePromptModal-crRCl2-a.js";import{h as xe,e as ve}from"./storage-B2r98b46.js";import{a as we}from"./authPrompt-DRaSGtCl.js";import"./index-0DJ9P6ST.js";class Se{constructor(e){A(this,"container",null);A(this,"options");A(this,"selectedIds",new Set);A(this,"handleKeyDown",e=>{e.key==="Escape"&&this.close()});this.options=e,e.videos.forEach(o=>this.selectedIds.add(o.id))}show(){this.container=document.createElement("div"),this.container.id="decodr-playlist-picker",this.container.innerHTML=this.getHTML(),this.applyStyles(),document.body.appendChild(this.container),this.setupEventListeners()}getHTML(){const{playlistTitle:e,videos:o}=this.options;return`
            <div class="decodr-playlist-overlay">
                <div class="decodr-playlist-modal">
                    <div class="decodr-playlist-header">
                        <img src="${chrome.runtime.getURL("icons/icon48.png")}" width="20" height="20" style="border-radius: 4px" />
                        <h2>Add Playlist to NotebookLM</h2>
                        <button class="decodr-playlist-close" aria-label="Close">×</button>
                    </div>
                    <div class="decodr-playlist-subheader">
                        <span class="decodr-playlist-title">${this.escapeHtml(e)}</span>
                        <span class="decodr-playlist-count">${o.length} videos</span>
                    </div>
                    <div class="decodr-playlist-search">
                        <input type="text" placeholder="Filter videos..." id="decodr-playlist-search-input" />
                    </div>
                    <div class="decodr-playlist-controls">
                        <label class="decodr-select-all">
                            <input type="checkbox" id="decodr-select-all" checked />
                            <span>Select All</span>
                        </label>
                        <span class="decodr-selected-count" id="decodr-selected-count">${o.length} selected</span>
                    </div>
                    <div class="decodr-playlist-list">
                        ${o.map(i=>this.getVideoItemHTML(i)).join("")}
                    </div>
                    <div class="decodr-playlist-footer">
                        <button class="decodr-playlist-cancel" id="decodr-cancel">Cancel</button>
                        <button class="decodr-playlist-continue" id="decodr-continue">Continue</button>
                    </div>
                </div>
            </div>
        `}getVideoItemHTML(e){return`
            <label class="decodr-video-item" data-id="${e.id}">
                <input type="checkbox" checked data-video-id="${e.id}" />
                <img src="${e.thumbnail||""}" class="decodr-video-thumb" />
                <span class="decodr-video-title">${this.escapeHtml(e.title)}</span>
            </label>
        `}setupEventListeners(){var i,a,l,s;if(!this.container)return;(i=this.container.querySelector(".decodr-playlist-close"))==null||i.addEventListener("click",()=>this.close()),(a=this.container.querySelector("#decodr-cancel"))==null||a.addEventListener("click",()=>this.close()),(l=this.container.querySelector(".decodr-playlist-overlay"))==null||l.addEventListener("click",r=>{r.target.classList.contains("decodr-playlist-overlay")&&this.close()});const e=this.container.querySelector("#decodr-playlist-search-input");e==null||e.addEventListener("input",()=>{var d;const r=e.value.toLowerCase();(d=this.container)==null||d.querySelectorAll(".decodr-video-item").forEach(n=>{var b;const c=((b=n.querySelector(".decodr-video-title").textContent)==null?void 0:b.toLowerCase())||"",y=n;c.includes(r)?y.style.setProperty("display","flex","important"):y.style.setProperty("display","none","important")}),this.updateSelectAllState()});const o=this.container.querySelector("#decodr-select-all");o==null||o.addEventListener("change",()=>{var d;const r=o.checked;(d=this.container)==null||d.querySelectorAll(".decodr-video-item").forEach(n=>{if(n.style.display!=="none"){const c=n.querySelector('input[type="checkbox"]');c.checked=r;const y=c.dataset.videoId;y&&(r?this.selectedIds.add(y):this.selectedIds.delete(y))}}),this.updateSelectedCount()}),this.container.querySelectorAll('.decodr-video-item input[type="checkbox"]').forEach(r=>{r.addEventListener("change",d=>{const n=d.target,c=n.dataset.videoId;c&&(n.checked?this.selectedIds.add(c):this.selectedIds.delete(c)),this.updateSelectedCount(),this.updateSelectAllState()})}),(s=this.container.querySelector("#decodr-continue"))==null||s.addEventListener("click",()=>{const r=this.options.videos.filter(d=>this.selectedIds.has(d.id));if(r.length===0){alert("Please select at least one video");return}this.close(),this.options.onContinue(r)}),document.addEventListener("keydown",this.handleKeyDown)}updateSelectedCount(){var o;const e=(o=this.container)==null?void 0:o.querySelector("#decodr-selected-count");e&&(e.textContent=`${this.selectedIds.size} selected`)}updateSelectAllState(){var o,i;const e=(o=this.container)==null?void 0:o.querySelector("#decodr-select-all");if(e){const a=Array.from(((i=this.container)==null?void 0:i.querySelectorAll(".decodr-video-item"))||[]).filter(s=>s.style.display!=="none");if(a.length===0){e.checked=!1,e.indeterminate=!1;return}const l=a.filter(s=>{const r=s.querySelector('input[type="checkbox"]');return this.selectedIds.has(r.dataset.videoId||"")}).length;e.checked=l===a.length,e.indeterminate=l>0&&l<a.length}}escapeHtml(e){const o=document.createElement("div");return o.textContent=e,o.innerHTML}applyStyles(){if(document.getElementById("decodr-playlist-styles"))return;const e=document.createElement("style");e.id="decodr-playlist-styles",e.textContent=`
            #decodr-playlist-picker * {
                box-sizing: border-box;
                margin: 0;
                padding: 0;
            }
            #decodr-playlist-picker {
                font-family: 'Google Sans', -apple-system, BlinkMacSystemFont, sans-serif;
                font-size: 14px;
                line-height: 1.4;
            }
            .decodr-playlist-overlay {
                position: fixed !important;
                top: 0 !important;
                left: 0 !important;
                right: 0 !important;
                bottom: 0 !important;
                background: rgba(0,0,0,0.7) !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
                z-index: 2147483647 !important;
            }
            .decodr-playlist-modal {
                background: #1e1e1e !important;
                border: 1px solid #3c4043 !important;
                border-radius: 12px !important;
                width: 420px !important;
                max-height: 80vh !important;
                display: flex !important;
                flex-direction: column !important;
                box-shadow: 0 16px 40px rgba(0,0,0,0.5) !important;
                overflow: hidden !important;
                animation: decodr-modal-in 0.15s ease-out !important;
            }
            @keyframes decodr-modal-in {
                from { opacity: 0; transform: scale(0.95); }
                to { opacity: 1; transform: scale(1); }
            }
            .decodr-playlist-header {
                display: flex !important;
                align-items: center !important;
                gap: 10px !important;
                padding: 14px 16px !important;
                border-bottom: 1px solid #3c4043 !important;
                background: #202124 !important;
            }
            .decodr-playlist-header h2 {
                font-size: 15px !important;
                font-weight: 500 !important;
                color: #e8eaed !important;
                flex: 1 !important;
            }
            .decodr-playlist-close {
                background: none !important;
                border: none !important;
                color: #9aa0a6 !important;
                font-size: 20px !important;
                cursor: pointer !important;
                padding: 2px 6px !important;
                border-radius: 4px !important;
            }
            .decodr-playlist-close:hover {
                background: rgba(255,255,255,0.1) !important;
                color: #e8eaed !important;
            }
            .decodr-playlist-subheader {
                padding: 10px 16px !important;
                background: #202124 !important;
                border-bottom: 1px solid #3c4043 !important;
                display: flex !important;
                justify-content: space-between !important;
                align-items: center !important;
            }
            .decodr-playlist-title {
                color: #e8eaed !important;
                font-weight: 500 !important;
            }
            .decodr-playlist-count {
                color: #9aa0a6 !important;
                font-size: 12px !important;
            }
            .decodr-playlist-controls {
                padding: 10px 16px !important;
                background: #202124 !important;
                border-bottom: 1px solid #3c4043 !important;
                display: flex !important;
                justify-content: space-between !important;
                align-items: center !important;
            }
            .decodr-select-all {
                display: flex !important;
                align-items: center !important;
                gap: 8px !important;
                color: #e8eaed !important;
                cursor: pointer !important;
            }
            .decodr-select-all input {
                width: 16px !important;
                height: 16px !important;
                accent-color: #8ab4f8 !important;
            }
            .decodr-selected-count {
                color: #8ab4f8 !important;
                font-size: 13px !important;
            }
            .decodr-playlist-list {
                flex: 1 !important;
                overflow-y: auto !important;
                max-height: 350px !important;
                background: #202124 !important;
            }
            .decodr-video-item {
                display: flex !important;
                align-items: center !important;
                gap: 10px !important;
                padding: 10px 16px !important;
                cursor: pointer !important;
                border-bottom: 1px solid #3c4043 !important;
            }
            .decodr-video-item:hover {
                background: rgba(255,255,255,0.05) !important;
            }
            .decodr-video-item input {
                width: 16px !important;
                height: 16px !important;
                accent-color: #8ab4f8 !important;
                flex-shrink: 0 !important;
            }
            .decodr-video-thumb {
                width: 60px !important;
                height: 34px !important;
                border-radius: 4px !important;
                object-fit: cover !important;
                background: #3c4043 !important;
                flex-shrink: 0 !important;
            }
            .decodr-video-title {
                flex: 1 !important;
                color: #e8eaed !important;
                font-size: 13px !important;
                overflow: hidden !important;
                text-overflow: ellipsis !important;
                white-space: nowrap !important;
            }
            .decodr-playlist-footer {
                padding: 12px 16px !important;
                background: #202124 !important;
                border-top: 1px solid #3c4043 !important;
                display: flex !important;
                justify-content: flex-end !important;
                gap: 10px !important;
            }
            .decodr-playlist-cancel {
                padding: 8px 16px !important;
                background: transparent !important;
                border: 1px solid #5f6368 !important;
                color: #e8eaed !important;
                border-radius: 6px !important;
                cursor: pointer !important;
                font-size: 13px !important;
            }
            .decodr-playlist-cancel:hover {
                background: rgba(255,255,255,0.05) !important;
            }
            .decodr-playlist-continue {
                padding: 8px 20px !important;
                background: #8ab4f8 !important;
                border: none !important;
                color: #202124 !important;
                border-radius: 6px !important;
                cursor: pointer !important;
                font-size: 13px !important;
                font-weight: 500 !important;
            }
            .decodr-playlist-continue:hover {
                background: #aecbfa !important;
            }
            .decodr-playlist-search {
                padding: 10px 16px !important;
                background: #202124 !important;
                border-bottom: 1px solid #3c4043 !important;
            }
            .decodr-playlist-search input {
                width: 100% !important;
                background: #303134 !important;
                border: 1px solid transparent !important;
                border-radius: 6px !important;
                padding: 8px 12px !important;
                color: #e8eaed !important;
                font-size: 13px !important;
                outline: none !important;
            }
            .decodr-playlist-search input:focus {
                border-color: #8ab4f8 !important;
            }
        `,document.head.appendChild(e)}close(){var e,o;document.removeEventListener("keydown",this.handleKeyDown),(e=document.getElementById("decodr-playlist-styles"))==null||e.remove(),(o=this.container)==null||o.remove(),this.container=null,this.options.onClose()}}console.log("🚀 Decodr loaded on YouTube");setTimeout(()=>ge.prewarm(),0);let f="free",x=!1;chrome.runtime.sendMessage({type:"CHECK_SUBSCRIPTION"}).then(t=>{t&&(f=t.tier||"free",x=t.isTrialing||!1,console.log("Decodr Tier:",f,"Trial:",x),setTimeout(()=>C(),500))}).catch(console.error);chrome.runtime.onMessage.addListener((t,e,o)=>(t.type==="SUBSCRIPTION_UPDATED"&&(f=t.tier||"free",x=t.isTrialing||!1,console.log("Subscription updated:",f),document.querySelectorAll(".decodr-bulk-btn, #decodr-playlist-sidebar-btn").forEach(i=>i.remove()),C(),o({success:!0})),!0));function ke(t){new ge({featureName:t,onClose:()=>{}}).show()}async function Re(){try{const t=await chrome.runtime.sendMessage({type:"CHECK_SUBSCRIPTION"});f=(t==null?void 0:t.tier)||f,x=(t==null?void 0:t.isTrialing)||x}catch(t){console.error(t)}return f==="free"&&!x?(ke("playlists"),!1):!0}async function Ae(){try{const t=await chrome.runtime.sendMessage({type:"CHECK_SUBSCRIPTION"});f=(t==null?void 0:t.tier)||f,x=(t==null?void 0:t.isTrialing)||x}catch(t){console.error(t)}return f==="free"&&!x?(ke("channels"),!1):!0}async function B(){if(document.getElementById("decodr-yt-btn"))return;console.log("💉 Attempting injection...");const t=document.querySelector("ytd-watch-metadata #top-level-buttons-computed")||document.querySelector("#top-level-buttons-computed");if(!t){console.log("⏳ Container not found yet, will retry...");return}const e=t.querySelector("segmented-like-dislike-button-view-model"),o=t.querySelector("yt-button-view-model.ytd-menu-renderer");if(!e){console.log("⏳ Like button not found yet");return}console.log("✅ Found container and buttons");const i=document.createElement("button");i.id="decodr-yt-btn",i.className="yt-spec-button-shape-next yt-spec-button-shape-next--tonal yt-spec-button-shape-next--mono yt-spec-button-shape-next--size-m yt-spec-button-shape-next--icon-leading yt-spec-button-shape-next--enable-backdrop-filter-experiment",i.style.cssText="margin-left: 8px; margin-right: 8px; position: relative;",i.innerHTML=`
        <div class="yt-spec-button-shape-next__icon" aria-hidden="true" style="margin-right: 6px; display: flex; align-items: center;">
            <img src="${chrome.runtime.getURL("assets/toast_logo.png")}" style="width: 24px; height: 24px; border-radius: 4px;">
        </div>
        <div class="yt-spec-button-shape-next__button-text-content">
            <span>Add to NB</span>
        </div>
    `,i.addEventListener("click",Le),o?t.insertBefore(i,o):e.insertAdjacentElement("afterend",i),console.log("✅ Button injected into action bar!"),Pe(i)}async function Le(t){console.log("👆 Add to NB button clicked"),t.preventDefault(),t.stopPropagation();const e=new URLSearchParams(window.location.search).get("v");if(!e){console.error("❌ Could not find video ID"),alert("Could not find video ID");return}const o=window.location.href;console.log("🎥 Video ID:",e,"URL:",o);const i=document.getElementById("decodr-yt-btn");Ue(o,e,i)}function Ue(t,e,o){ve(t).then(i=>{new be({anchorElement:o,syncInfo:i?{notebookId:i.notebookId,title:i.title}:void 0,onSelect:async l=>{var r,d;const s=i&&i.notebookId===l.id;w(s?"Syncing...":"Adding...");try{console.log("📤 Sending ADD_YOUTUBE_SOURCE message to background...",{notebookId:l.id,videoUrl:t,videoId:e});const n=await chrome.runtime.sendMessage({type:"ADD_YOUTUBE_SOURCE",payload:{notebookId:l.id,videoUrl:t,videoId:e}});if(n.success){console.log("✅ ADD_YOUTUBE_SOURCE success:",n),w("Saved!");const c=((r=n.data)==null?void 0:r.sourceId)||"yt-"+e;await xe(t,{notebookId:l.id,sourceId:c,title:l.title,lastExported:new Date().toISOString()}),setTimeout(()=>w("Saved"),2e3)}else{if(console.error("❌ ADD_YOUTUBE_SOURCE failed:",n.error),((d=n==null?void 0:n.data)==null?void 0:d.reason)==="AUTH_REQUIRED"){w("Sign in required"),we({message:"Sign in to Decodr to import YouTube videos."}),setTimeout(()=>w("Add to NB"),2e3);return}w("Failed"),alert("Failed to add video: "+(n.error||"Unknown error")),setTimeout(()=>w("Add to NB"),2e3)}}catch(n){console.error(n),w("Error"),alert("Error adding video.")}},onCreateNew:()=>{chrome.runtime.sendMessage({type:"OPEN_NOTEBOOKLM_CREATE"})},onClose:()=>{}}).show()})}function w(t){const e=document.getElementById("decodr-yt-btn");if(!e)return;const o=e.querySelector("yt-spec-button-shape-next__button-text-content span")||e.querySelector("span");o&&(o.textContent=t)}function Pe(t){const e=window.location.href;ve(e).then(o=>{const i=t.querySelector("yt-spec-button-shape-next__button-text-content span")||t.querySelector("span");o?(i&&(i.textContent="Saved"),t.title=`Saved to: ${o.title}`):(i&&(i.textContent="Add to NB"),t.title="Add this video to NotebookLM")})}async function ue(t){if(t.preventDefault(),t.stopPropagation(),!await Re())return;const o=Me(),i=_e();if(i.length===0){alert("No videos found in this playlist");return}console.log(`📋 Found ${i.length} videos in playlist`),new Se({playlistTitle:o,videos:i,onContinue:l=>{Ce(l)},onClose:()=>{}}).show()}function C(){let t=document.querySelector("ytd-playlist-panel-renderer #playlist-action-menu .top-level-buttons");const e=f==="free"&&!x;if(t&&!document.getElementById("decodr-playlist-sidebar-btn")){const s=document.createElement("button");s.id="decodr-playlist-sidebar-btn",s.className="yt-spec-button-shape-next yt-spec-button-shape-next--tonal yt-spec-button-shape-next--mono yt-spec-button-shape-next--size-m yt-spec-button-shape-next--icon-button yt-spec-button-shape-next--enable-backdrop-filter-experiment",s.title=e?"Add playlist to NotebookLM (Premium)":"Add playlist to NotebookLM",e&&(s.style.opacity="0.8"),s.innerHTML=`
            <div class="yt-spec-button-shape-next__icon" aria-hidden="true" style="position: relative;">
                <img src="${chrome.runtime.getURL("assets/toast_logo.png")}" style="width: 24px; height: 24px; border-radius: 4px; ${e?"filter: grayscale(100%);":""}">
            </div>
        `,s.addEventListener("click",ue),t.appendChild(s)}const o=window.location.pathname,i=o==="/playlist",a=o.startsWith("/@")||o.startsWith("/channel/")||o.startsWith("/c/")||o.startsWith("/user/");if(!i&&!a)return;const l=document.querySelectorAll("yt-flexible-actions-view-model");l.length!==0&&l.forEach((s,r)=>{const d=s;if(d.hasAttribute("data-decodr-wrapper"))return;if(console.log(`📋 Found container #${r} on ${i?"playlist":"channel"} page`),i){d.style.flexWrap="wrap";const b=d.querySelector(".ytFlexibleActionsViewModelActionRow");b&&(b.style.paddingBottom="0px")}d.setAttribute("data-decodr-wrapper",i?"playlist":"channel");const n=document.createElement("button");n.className="decodr-bulk-btn yt-spec-button-shape-next yt-spec-button-shape-next--tonal yt-spec-button-shape-next--overlay yt-spec-button-shape-next--size-m yt-spec-button-shape-next--icon-leading yt-spec-button-shape-next--enable-backdrop-filter-experiment",n.id=`decodr-bulk-btn-${r}`,e&&(n.style.opacity="0.9");const c=`
            <div class="yt-spec-button-shape-next__icon" aria-hidden="true" style="margin-right: 6px; display: flex; align-items: center;">
                <img src="${chrome.runtime.getURL("assets/toast_logo.png")}" style="width: 24px; height: 24px; border-radius: 4px; ${e?"filter: grayscale(100%);":""}">
            </div>
        `,y=`
             <div class="yt-spec-button-shape-next__button-text-content" style="display: flex; align-items: center;">
                <span>Add to NotebookLM</span>
            </div>
        `;a?(n.style.cssText="margin-left: 8px; display: inline-flex;",n.title="Add all channel videos to NotebookLM",n.addEventListener("click",Be)):(n.style.cssText="margin-top: 8px; flex-basis: 100%; justify-content: center;",n.title="Add playlist to NotebookLM",n.addEventListener("click",ue)),n.innerHTML=c+y,d.appendChild(n)})}async function Be(t){var r,d;if(t.preventDefault(),t.stopPropagation(),!await Ae())return;const o=qe();if(!o){alert("Could not determine channel URL.");return}const i=((d=(r=document.querySelector("yt-page-header-renderer .page-header-view-model-title"))==null?void 0:r.textContent)==null?void 0:d.trim())||"Channel",a=document.createElement("div");a.id="decodr-loading-toast",a.style.cssText=`
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: #1e1e1e;
        border: 1px solid #3c4043;
        border-radius: 8px;
        padding: 16px 20px;
        z-index: 2147483647;
        color: #e8eaed;
        font-family: 'Google Sans', Roboto, sans-serif;
        font-size: 14px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.4);
        display: flex;
        align-items: center;
        gap: 12px;
    `,a.innerHTML=`
        <div style="width: 20px; height: 20px; border: 2px solid #8ab4f8; border-top-color: transparent; border-radius: 50%; animation: decodr-spin 1s linear infinite;"></div>
        <span id="decodr-loading-text">Fetching videos...</span>
    `;const l=document.createElement("style");l.textContent="@keyframes decodr-spin { to { transform: rotate(360deg); } }",document.head.appendChild(l),document.body.appendChild(a);const s=n=>{const c=a.querySelector("#decodr-loading-text");c&&(c.textContent=n)};try{const n=[];s("Fetching videos...");const c=o+"/videos",y=await _(c,m=>{s(`Videos: ${m} | Total: ${n.length+m}`)});n.push(...y),s(`Fetching shorts... (${n.length} so far)`);const b=o+"/shorts",L=await _(b,m=>{s(`Shorts: ${m} | Total: ${n.length+m}`)});n.push(...L),s(`Fetching streams... (${n.length} so far)`);const U=o+"/streams",P=await _(U,m=>{s(`Streams: ${m} | Total: ${n.length+m}`)});n.push(...P);const k=Array.from(new Map(n.map(m=>[m.id,m])).values());if(a.remove(),l.remove(),k.length===0){alert("No videos found on this channel. Check console.");return}new Se({playlistTitle:`${i} - All Content (${k.length})`,videos:k,onContinue:m=>{Ce(m)},onClose:()=>{}}).show()}catch(n){a.remove(),l.remove(),console.error("Error fetching channel videos:",n),alert("Failed to fetch channel videos. See console.")}}function qe(){const t=document.querySelector('link[rel="canonical"]');if(t){const o=t.getAttribute("href");if(o)return o.split("/videos")[0].split("/featured")[0].split("/shorts")[0].split("/streams")[0].split("/live")[0]}const e=window.location.pathname;return e.startsWith("/@")||e.startsWith("/channel/")||e.startsWith("/c/")||e.startsWith("/user/")?`https://www.youtube.com${e.split("/videos")[0].split("/featured")[0].split("/shorts")[0].split("/streams")[0].split("/live")[0]}`:null}async function _(t,e){var y,b,L,U,P,k,q,m;console.log(`Fetching channel videos from: ${t}`);const i=await(await fetch(t)).text();let a=null;const l=i.match(/"INNERTUBE_API_KEY":"(.*?)"/);l&&l[1]?a=l[1]:a="AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8";let s=me(i,'"INNERTUBE_CONTEXT":');s||(s={client:{hl:"en",gl:"US",clientName:"WEB",clientVersion:"2.20240926.01.00"}});let r=me(i,"var ytInitialData = ");if(!r)return[];const d=[];let n=null;const c=3e3;for(;;)try{let g=[];if((y=r.contents)!=null&&y.twoColumnBrowseResultsRenderer){const h=r.contents.twoColumnBrowseResultsRenderer.tabs.find(E=>{var v;return(v=E.tabRenderer)==null?void 0:v.selected});(U=(L=(b=h==null?void 0:h.tabRenderer)==null?void 0:b.content)==null?void 0:L.richGridRenderer)!=null&&U.contents?g=h.tabRenderer.content.richGridRenderer.contents:(q=(k=(P=h==null?void 0:h.tabRenderer)==null?void 0:P.content)==null?void 0:k.sectionListRenderer)!=null&&q.contents&&h.tabRenderer.content.sectionListRenderer.contents.forEach(v=>{var I;(I=v.itemSectionRenderer)!=null&&I.contents&&v.itemSectionRenderer.contents.forEach(S=>{var T,R;(T=S.richShelfRenderer)!=null&&T.contents?g.push(...S.richShelfRenderer.contents):(R=S.reelShelfRenderer)!=null&&R.items&&g.push(...S.reelShelfRenderer.items)})})}else if(r.onResponseReceivedActions){const u=r.onResponseReceivedActions.find(h=>h.appendContinuationItemsAction||h.reloadContinuationItemsCommand);u!=null&&u.appendContinuationItemsAction?g=u.appendContinuationItemsAction.continuationItems||[]:u!=null&&u.reloadContinuationItemsCommand&&(g=u.reloadContinuationItemsCommand.continuationItems||[])}if(n=null,g&&g.length>0&&g.forEach(u=>{var h,E,v,I,S,T,R,N,D,O,H,z,j,V,F,W,Y,K,G,J,X,Q,Z,ee,te,oe,ne,ie,re,ae,se,de,le,ce,pe;if((E=(h=u.richItemRenderer)==null?void 0:h.content)!=null&&E.videoRenderer){const p=u.richItemRenderer.content.videoRenderer;d.push({id:p.videoId,title:((S=(I=(v=p.title)==null?void 0:v.runs)==null?void 0:I[0])==null?void 0:S.text)||"Untitled",url:`https://www.youtube.com/watch?v=${p.videoId}`,thumbnail:((N=(R=(T=p.thumbnail)==null?void 0:T.thumbnails)==null?void 0:R[0])==null?void 0:N.url)||""})}else if((O=(D=u.richItemRenderer)==null?void 0:D.content)!=null&&O.reelItemRenderer){const p=u.richItemRenderer.content.reelItemRenderer;d.push({id:p.videoId,title:((H=p.headline)==null?void 0:H.simpleText)||"Short",url:`https://www.youtube.com/watch?v=${p.videoId}`,thumbnail:((V=(j=(z=p.thumbnail)==null?void 0:z.thumbnails)==null?void 0:j[0])==null?void 0:V.url)||""})}else if((W=(F=u.richItemRenderer)==null?void 0:F.content)!=null&&W.shortsLockupViewModel){const p=u.richItemRenderer.content.shortsLockupViewModel,M=((G=(K=(Y=p.onTap)==null?void 0:Y.innertubeCommand)==null?void 0:K.reelWatchEndpoint)==null?void 0:G.videoId)||((J=p.entityId)==null?void 0:J.replace("shorts-shelf-item-",""));M&&d.push({id:M,title:((Q=(X=p.overlayMetadata)==null?void 0:X.primaryText)==null?void 0:Q.content)||"Short",url:`https://www.youtube.com/shorts/${M}`,thumbnail:((te=(ee=(Z=p.thumbnail)==null?void 0:Z.sources)==null?void 0:ee[0])==null?void 0:te.url)||""})}else if(u.reelItemRenderer){const p=u.reelItemRenderer;d.push({id:p.videoId,title:((oe=p.headline)==null?void 0:oe.simpleText)||"Short",url:`https://www.youtube.com/watch?v=${p.videoId}`,thumbnail:((re=(ie=(ne=p.thumbnail)==null?void 0:ne.thumbnails)==null?void 0:ie[0])==null?void 0:re.url)||""})}else if(u.continuationItemRenderer){const p=u.continuationItemRenderer;(se=(ae=p.continuationEndpoint)==null?void 0:ae.continuationCommand)!=null&&se.token?n=p.continuationEndpoint.continuationCommand.token:(pe=(ce=(le=(de=p.button)==null?void 0:de.buttonRenderer)==null?void 0:le.command)==null?void 0:ce.continuationCommand)!=null&&pe.token&&(n=p.button.buttonRenderer.command.continuationCommand.token)}}),e&&e(d.length),!n||d.length>=c)break;const Ee=`https://www.youtube.com/youtubei/v1/browse?key=${a}`;await new Promise(u=>setTimeout(u,300));const $=await fetch(Ee,{method:"POST",headers:{"Content-Type":"application/json","X-YouTube-Client-Name":"1","X-YouTube-Client-Version":((m=s==null?void 0:s.client)==null?void 0:m.clientVersion)||"2.20240926.01.00"},body:JSON.stringify({context:s,continuation:n})});if(!$.ok)break;r=await $.json()}catch(g){console.error("Pagination error:",g);break}return console.log(`Final count: ${d.length} videos`),d}function me(t,e){const o=t.indexOf(e);if(o===-1)return null;const i=o+e.length;let a=0,l=i,s=!1;for(let r=i;r<t.length;r++)if(t[r]==="{")a++,s=!0;else if(t[r]==="}"&&(a--,s&&a===0)){l=r+1;break}try{const r=t.substring(i,l);return JSON.parse(r)}catch(r){return console.error("Failed to parse extracted JSON:",r),null}}function Me(){var e,o;let t=document.querySelector("ytd-playlist-panel-renderer .title.yt-formatted-string");return t?((e=t.textContent)==null?void 0:e.trim())||"Playlist":(t=document.querySelector("yt-page-header-renderer h1 yt-formatted-string"),t&&((o=t.textContent)==null?void 0:o.trim())||"Playlist")}function _e(){const t=[];let e=document.querySelectorAll("ytd-playlist-panel-video-renderer");return e.length===0&&(e=document.querySelectorAll("ytd-playlist-video-renderer")),e.forEach(o=>{var s;const i=o.querySelector("a#wc-endpoint, a#video-title"),a=o.querySelector("#video-title, span#video-title"),l=o.querySelector("img");if(i&&a){const r=i.href,n=new URLSearchParams(new URL(r,window.location.origin).search).get("v");n&&t.push({id:n,title:((s=a.textContent)==null?void 0:s.trim())||"Untitled",url:`https://www.youtube.com/watch?v=${n}`,thumbnail:(l==null?void 0:l.src)||""})}}),t}function Ce(t){const e=new be({centered:!0,onSelect:async o=>{await $e(t,o),e.close()},onCreateNew:()=>{chrome.runtime.sendMessage({type:"OPEN_NOTEBOOKLM_CREATE"}),e.close()},onClose:()=>{}});e.show()}async function $e(t,e){var s,r;let o=0,i=0;const a=document.createElement("div");a.id="decodr-batch-progress",a.style.cssText=`
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: #1e1e1e;
        border: 1px solid #3c4043;
        border-radius: 8px;
        padding: 16px 20px;
        z-index: 2147483647;
        color: #e8eaed;
        font-family: 'Google Sans', sans-serif;
        font-size: 14px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.4);
    `,a.innerHTML=`<div id="decodr-progress-text">Adding 0/${t.length} videos...</div>`,document.body.appendChild(a);const l=d=>{const n=a.querySelector("#decodr-progress-text");n&&(n.textContent=`Adding ${d}/${t.length} videos...`)};for(let d=0;d<t.length;d++){const n=t[d];l(d+1);try{const c=await chrome.runtime.sendMessage({type:"ADD_YOUTUBE_SOURCE",payload:{notebookId:e.id,videoUrl:n.url,videoId:n.id}});if(c.success)o++,await xe(n.url,{notebookId:e.id,sourceId:((s=c.data)==null?void 0:s.sourceId)||"yt-"+n.id,title:e.title,lastExported:new Date().toISOString()});else{if(((r=c==null?void 0:c.data)==null?void 0:r.reason)==="AUTH_REQUIRED"){a.innerHTML=`
                        <div style="margin-bottom: 8px; font-weight: 500;">Sign in required</div>
                        <div>Please sign in to Decodr first, then retry.</div>
                    `,we({message:"Sign in to Decodr to import YouTube videos."}),setTimeout(()=>a.remove(),4e3);return}i++}}catch(c){console.error("Error adding video:",n.id,c),i++}await new Promise(c=>setTimeout(c,500))}a.innerHTML=`
        <div style="margin-bottom: 8px; font-weight: 500;">Done!</div>
        <div style="color: #81c995;">✓ ${o} added</div>
        ${i>0?`<div style="color: #f28b82;">✗ ${i} failed</div>`:""}
    `,setTimeout(()=>a.remove(),3e3)}let he=new URLSearchParams(window.location.search).get("v"),ye=new URLSearchParams(window.location.search).get("list"),fe=window.location.pathname;const Ne=new MutationObserver(()=>{var r,d;const t=new URLSearchParams(window.location.search).get("v"),e=new URLSearchParams(window.location.search).get("list");if(t&&t!==he){he=t;const n=document.getElementById("decodr-yt-btn");n&&n.remove(),setTimeout(B,500)}e!==ye&&(ye=e,(r=document.getElementById("decodr-playlist-btn"))==null||r.remove(),(d=document.getElementById("decodr-playlist-btn-container"))==null||d.remove());const o=window.location.pathname;(o.startsWith("/@")||o.startsWith("/channel/")||o.startsWith("/c/")||o.startsWith("/user/"))&&o!==fe&&(fe=o,document.querySelectorAll(".decodr-bulk-btn").forEach(n=>n.remove()),document.querySelectorAll('[data-decodr-wrapper="channel"]').forEach(n=>{n.removeAttribute("data-decodr-wrapper")}),setTimeout(C,500)),window.location.pathname==="/watch"&&!document.getElementById("decodr-yt-btn")&&B();const a=document.querySelectorAll("yt-flexible-actions-view-model:not([data-decodr-wrapper])"),s=document.querySelector("ytd-playlist-panel-renderer")&&!document.getElementById("decodr-playlist-sidebar-btn");(a.length>0||s)&&C()});Ne.observe(document.body,{childList:!0,subtree:!0});setInterval(()=>{window.location.pathname==="/watch"&&!document.getElementById("decodr-yt-btn")&&B(),document.querySelectorAll("yt-flexible-actions-view-model:not([data-decodr-wrapper])").length>0&&C()},2e3);window.location.pathname==="/watch"&&B();C();
