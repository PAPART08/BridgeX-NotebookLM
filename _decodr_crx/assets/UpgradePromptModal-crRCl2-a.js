var u=Object.defineProperty;var g=(i,e,t)=>e in i?u(i,e,{enumerable:!0,configurable:!0,writable:!0,value:t}):i[e]=t;var o=(i,e,t)=>g(i,typeof e!="symbol"?e+"":e,t);import{b as h,p as f,e as y,a as m,g as x}from"./authPrompt-DRaSGtCl.js";function c(i){return{monthlyOriginal:i.plus.monthlyOriginal,monthly:i.plus.monthly,yearly:i.plus.yearly,savings:i.plus.yearlySavings}}class d{constructor(e){o(this,"container",null);o(this,"options");o(this,"pricing",c(h()));o(this,"selectedPlan","plus_yearly");this.options=e}static prewarm(){d.ensureStyles(),f()}show(){this.close();const e=x();e&&(this.pricing=c(e)),this.container=document.createElement("div"),this.container.id="decodr-upgrade-modal-host",this.container.innerHTML=this.getHTML(),document.body.appendChild(this.container),this.applyStyles(),this.setupListeners(),y().then(t=>{t&&(this.pricing=c(t),this.updatePricingDisplay())}).catch(t=>console.warn("Background pricing refresh failed:",t))}getReason_(){const e={playlists:"Playlist import is a Plus feature. Upgrade to import entire playlists.",channels:"Channel import is a Plus feature. Upgrade to import entire channels.",aiImports:"You've used all your free AI imports this week. Upgrade to Plus for unlimited imports.",webClips:"You've used all your free web clips this week. Upgrade to Plus for unlimited web clips.",sourceOps:"You've used all your free premium source operations this week. Upgrade to Plus for unlimited source operations.",default:"Upgrade to Plus to unlock this feature."};return e[this.options.featureName]||e.default}getHTML(){return`
            <div class="decodr-upgrade-backdrop">
                <div class="decodr-upgrade-modal">
                    <button class="decodr-upgrade-close">×</button>
                    
                    <div class="decodr-upgrade-header">
                        <div class="decodr-icon-bg">
                            <span style="font-size: 24px">✨</span>
                        </div>
                        <h3>Upgrade to Plus</h3>
                    </div>

                    <p class="decodr-upgrade-reason">${this.getReason_()}</p>

                    <div class="decodr-upgrade-pricing">
                        <div class="decodr-pricing-card ${this.selectedPlan==="plus_monthly"?"selected":""}" data-plan="plus_monthly">
                            <span class="label">Monthly</span>
                            <div class="price">
                                <span class="original">${this.pricing.monthlyOriginal}</span>
                                <span class="current">${this.pricing.monthly}</span>
                            </div>
                        </div>

                        <div class="decodr-pricing-card best-value ${this.selectedPlan==="plus_yearly"?"selected":""}" data-plan="plus_yearly">
                            <div class="badge">Best Value</div>
                            <span class="label">Yearly</span>
                            <div class="price">
                                <span class="current">${this.pricing.yearly}</span>
                                <span class="period">/year</span>
                            </div>
                            <span class="savings">Save ${this.pricing.savings}%</span>
                        </div>
                    </div>

                    <button class="decodr-upgrade-cta">
                        <span>✨ Upgrade Now</span>
                    </button>
                    
                    <p class="decodr-upgrade-note">30-day money-back guarantee</p>
                </div>
            </div>
        `}updatePricingDisplay(){if(!this.container)return;const e=this.container.querySelector('.decodr-pricing-card[data-plan="plus_monthly"]'),t=this.container.querySelector('.decodr-pricing-card[data-plan="plus_yearly"]'),r=e==null?void 0:e.querySelector(".original"),a=e==null?void 0:e.querySelector(".current"),s=t==null?void 0:t.querySelector(".current"),n=t==null?void 0:t.querySelector(".savings");r&&(r.textContent=this.pricing.monthlyOriginal),a&&(a.textContent=this.pricing.monthly),s&&(s.textContent=this.pricing.yearly),n&&(n.textContent=`Save ${this.pricing.savings}%`)}applyStyles(){d.ensureStyles()}static ensureStyles(){if(document.getElementById("decodr-upgrade-styles"))return;const e=document.createElement("style");e.id="decodr-upgrade-styles",e.textContent=`
            .decodr-upgrade-backdrop {
                position: fixed;
                top: 0; left: 0; width: 100vw; height: 100vh;
                background: rgba(0,0,0,0.6);
                z-index: 2147483647; /* Max z-index */
                display: flex;
                align-items: center;
                justify-content: center;
                backdrop-filter: blur(4px);
                animation: decodr-fade-in 0.2s ease-out;
            }

            .decodr-upgrade-modal {
                background: linear-gradient(135deg, #1e1e1e 0%, #252525 100%);
                width: 420px;
                border-radius: 16px;
                border: 1px solid #3c4043;
                padding: 24px;
                position: relative;
                box-shadow: 0 24px 48px rgba(0,0,0,0.5);
                display: flex;
                flex-direction: column;
                align-items: center;
                text-align: center;
                font-family: 'Google Sans', sans-serif;
                color: #e8eaed;
                animation: decodr-scale-in 0.3s cubic-bezier(0.16, 1, 0.3, 1);
            }

            @keyframes decodr-fade-in { from { opacity: 0; } to { opacity: 1; } }
            @keyframes decodr-scale-in { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }

            .decodr-upgrade-close {
                position: absolute;
                top: 12px;
                right: 12px;
                background: none;
                border: none;
                color: #9aa0a6;
                font-size: 24px;
                cursor: pointer;
                line-height: 1;
                width: 32px;
                height: 32px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            .decodr-upgrade-close:hover { background: rgba(255,255,255,0.1); }

            .decodr-upgrade-header {
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 12px;
                margin-bottom: 16px;
            }

            .decodr-icon-bg {
                width: 48px;
                height: 48px;
                background: rgba(139, 92, 246, 0.1);
                border-radius: 12px;
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .decodr-upgrade-header h3 {
                margin: 0;
                font-size: 22px;
                font-weight: 600;
            }

            .decodr-upgrade-reason {
                color: #9aa0a6;
                font-size: 14px;
                margin-bottom: 24px;
                line-height: 1.5;
            }

            .decodr-upgrade-pricing {
                display: flex;
                gap: 12px;
                width: 100%;
                margin-bottom: 24px;
            }

            .decodr-pricing-card {
                flex: 1;
                background: #303134;
                border: 1px solid #3c4043;
                border-radius: 12px;
                padding: 12px;
                display: flex;
                flex-direction: column;
                gap: 4px;
                position: relative;
                cursor: pointer;
                transition: all 0.2s;
            }
            .decodr-pricing-card.selected {
                border-color: #8b5cf6;
                background: rgba(139, 92, 246, 0.1);
                box-shadow: 0 0 0 1px #8b5cf6;
            }
            .decodr-pricing-card:hover { border-color: #8b5cf6; }

            .decodr-pricing-card.best-value {
                /* border: 1px solid #3c4043; default border from base class */
            }

            .decodr-pricing-card .badge {
                position: absolute;
                top: -10px;
                left: 50%;
                transform: translateX(-50%);
                background: #8b5cf6;
                color: white;
                font-size: 10px;
                font-weight: 700;
                padding: 2px 8px;
                border-radius: 12px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }

            .decodr-pricing-card .label {
                font-size: 12px;
                color: #9aa0a6;
            }

            .decodr-pricing-card .price {
                display: flex;
                align-items: baseline;
                justify-content: center;
                gap: 6px;
            }

            .decodr-pricing-card .original {
                text-decoration: line-through;
                color: #9aa0a6;
                font-size: 13px;
            }

            .decodr-pricing-card .current {
                font-size: 18px;
                font-weight: 700;
                color: #e8eaed;
            }
            
            .decodr-pricing-card .savings {
                font-size: 11px;
                color: #8bb4f8; /* blueish */
                font-weight: 500;
            }

            .decodr-upgrade-cta {
                width: 100%;
                padding: 14px;
                background: linear-gradient(135deg, #8b5cf6, #a855f7);
                border: none;
                border-radius: 12px;
                color: white;
                font-size: 16px;
                font-weight: 600;
                cursor: pointer;
                transition: transform 0.1s;
                position: relative;
                overflow: hidden;
            }
            .decodr-upgrade-cta:active { transform: scale(0.98); }
            .decodr-upgrade-cta:hover { filter: brightness(1.1); }

            .decodr-upgrade-note {
                margin-top: 12px;
                font-size: 12px;
                color: #5f6368;
            }
        `,document.head.appendChild(e)}setupListeners(){var t,r;if(!this.container)return;(t=this.container.querySelector(".decodr-upgrade-close"))==null||t.addEventListener("click",()=>this.close()),this.container.addEventListener("click",a=>{a.target===this.container&&this.close()}),(r=this.container.querySelector(".decodr-upgrade-cta"))==null||r.addEventListener("click",()=>{this.handleUpgrade()});const e=this.container.querySelectorAll(".decodr-pricing-card");e.forEach(a=>{a.addEventListener("click",s=>{const n=s.currentTarget,l=n.getAttribute("data-plan");l&&(this.selectedPlan=l,e.forEach(p=>p.classList.remove("selected")),n.classList.add("selected"))})})}async handleUpgrade(){var s;this.setCtaText("Processing...");const e=await this.sendMessage({type:"INIT_PAYMENT",payload:{plan:this.selectedPlan}});if(e!=null&&e.success){this.close();return}const t=(s=e==null?void 0:e.data)==null?void 0:s.reason,r=String((e==null?void 0:e.error)||"");if(t==="AUTH_REQUIRED"||/sign in/i.test(r)){this.setCtaText("Sign in to continue"),m({title:"Sign in to upgrade",message:"Sign in first. We will continue to checkout with your selected plan.",onAuthSuccess:()=>{this.handleUpgrade().catch(n=>{console.error("Retry after auth failed:",n),this.setCtaText("Upgrade Now")})}});return}console.error("Payment init error:",e==null?void 0:e.error),this.setCtaText("Error - Try again")}setCtaText(e){var r;const t=(r=this.container)==null?void 0:r.querySelector(".decodr-upgrade-cta span");t&&(t.textContent=e)}sendMessage(e){return new Promise(t=>{chrome.runtime.sendMessage(e,r=>{if(chrome.runtime.lastError){t({success:!1,error:chrome.runtime.lastError.message||"Request failed"});return}t(r)})})}close(){var e;(e=this.container)==null||e.remove(),this.container=null,this.options.onClose&&this.options.onClose()}}export{d as U};
