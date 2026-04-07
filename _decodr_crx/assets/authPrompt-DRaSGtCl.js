var L=Object.defineProperty;var N=(i,e,t)=>e in i?L(i,e,{enumerable:!0,configurable:!0,writable:!0,value:t}):i[e]=t;var m=(i,e,t)=>N(i,typeof e!="symbol"?e+"":e,t);import{P as d}from"./index-0DJ9P6ST.js";const A=5*60*1e3,H="https://us-central1-decodr-app.cloudfunctions.net/api";let k=null,C=0,y=null;function a(i){return`$${i.toFixed(2)}`}function D(){return{plus:{monthly:a(d.plus.monthly/100),monthlyOriginal:a(d.plus.monthlyOriginal/100),yearly:a(d.plus.yearly/100),yearlyOriginal:a(d.plus.yearlyOriginal/100),yearlyMonthly:a(Math.round(d.plus.yearly/12)/100),yearlySavings:Math.round((1-d.plus.yearly/(d.plus.monthly*12))*100)},lifetime:{price:a(d.lifetime.price/100),originalPrice:a(d.lifetime.originalPrice/100),savings:Math.round((1-d.lifetime.price/d.lifetime.originalPrice)*100)}}}function F(i){var c,l,u,b,n;if(!(i!=null&&i.success)||!(i!=null&&i.display))return null;const e=Number((l=(c=i.display)==null?void 0:c.plus)==null?void 0:l.monthly),t=Number((b=(u=i.display)==null?void 0:u.plus)==null?void 0:b.yearly),r=Number((n=i.display)==null?void 0:n.lifetime);if(!Number.isFinite(e)||!Number.isFinite(t)||!Number.isFinite(r))return null;const s=e*1.33,f=t*1.44,x=t/12,h=r*2;return{plus:{monthly:a(e),monthlyOriginal:a(s),yearly:a(t),yearlyOriginal:a(f),yearlyMonthly:a(x),yearlySavings:Math.round((1-t/(e*12))*100)},lifetime:{price:a(r),originalPrice:a(h),savings:Math.round((1-r/h)*100)}}}function T(i=A){return!k||Date.now()-C>i?null:k}async function _(i){const e=!!(i!=null&&i.force),t=A;if(!e){const r=T(t);if(r)return r}return y||(y=fetch(`${H}/exchange/pricing`).then(r=>r.json()).then(r=>{const s=F(r);return s&&(k=s,C=Date.now()),s}).catch(r=>(console.warn("Failed to fetch dynamic pricing:",r),null)).finally(()=>{y=null}),y)}function G(){_()}class z{constructor(e={}){m(this,"container",null);m(this,"options");m(this,"keydownHandler");m(this,"mode","signin");this.options=e,this.keydownHandler=t=>{t.key==="Escape"&&this.close()}}show(){this.close(!1),this.container=document.createElement("div"),this.container.id="decodr-auth-required-modal-host",this.container.innerHTML=this.getHtml(),document.body.appendChild(this.container),this.applyStyles(),this.setupListeners(),document.addEventListener("keydown",this.keydownHandler)}close(e=!0){var t,r;this.container&&(this.container.remove(),this.container=null),document.removeEventListener("keydown",this.keydownHandler),e&&((r=(t=this.options).onClose)==null||r.call(t))}getTitle(){return this.options.title||"Sign in required"}getMessage(){return this.options.message||"Sign in to Decodr to continue with this action."}getHtml(){return`
            <div class="decodr-auth-required-backdrop" role="presentation">
                <div class="decodr-auth-required-modal" role="dialog" aria-modal="true" aria-label="${this.getTitle()}">
                    <button class="decodr-auth-required-close" data-action="close" aria-label="Close">&times;</button>

                    <div class="decodr-auth-required-header">
                        <h3>${this.getTitle()}</h3>
                        <p>${this.getMessage()}</p>
                    </div>

                    <div class="decodr-auth-mode-toggle" role="tablist" aria-label="Authentication mode">
                        <button class="decodr-auth-mode-btn active" data-action="mode-signin" type="button">Sign in</button>
                        <button class="decodr-auth-mode-btn" data-action="mode-signup" type="button">Create account</button>
                    </div>

                    <form class="decodr-auth-form" data-auth-form>
                        <div class="decodr-auth-field decodr-auth-name-field" data-name-field style="display:none">
                            <input class="decodr-auth-input" data-name-input type="text" placeholder="Your name" autocomplete="name" />
                        </div>
                        <div class="decodr-auth-field">
                            <input class="decodr-auth-input" data-email-input type="email" placeholder="Email" autocomplete="email" required />
                        </div>
                        <div class="decodr-auth-field">
                            <input class="decodr-auth-input" data-password-input type="password" placeholder="Password" autocomplete="current-password" required />
                        </div>

                        <button class="decodr-auth-link-btn" data-action="reset" type="button">Forgot password?</button>

                        <div class="decodr-auth-error" data-error style="display:none"></div>
                        <div class="decodr-auth-notice" data-notice style="display:none"></div>

                        <button class="decodr-auth-submit-btn" data-action="submit-email" type="submit">Sign in with email</button>
                    </form>

                    <div class="decodr-auth-divider">or</div>

                    <button class="decodr-auth-google-btn" data-action="google" type="button">
                        <span class="decodr-google-icon" aria-hidden="true">
                            <svg width="16" height="16" viewBox="0 0 24 24">
                                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                            </svg>
                        </span>
                        Continue with Google
                    </button>
                </div>
            </div>
        `}setupListeners(){if(!this.container)return;const e=this.query(".decodr-auth-required-backdrop"),t=this.query('[data-action="close"]'),r=this.query('[data-action="mode-signin"]'),s=this.query('[data-action="mode-signup"]'),f=this.query("[data-auth-form]"),x=this.query("[data-name-field]"),h=this.query("[data-name-input]"),c=this.query("[data-email-input]"),l=this.query("[data-password-input]"),u=this.query('[data-action="reset"]'),b=this.query('[data-action="submit-email"]'),n=this.query('[data-action="google"]'),P=(n==null?void 0:n.innerHTML)||"",q=o=>{if(n){if(o){n.innerHTML=`
                    <span class="decodr-auth-spinner" aria-hidden="true"></span>
                    <span>Signing in with Google...</span>
                `,n.setAttribute("aria-busy","true");return}n.innerHTML=P,n.setAttribute("aria-busy","false")}},w=()=>{if(!r||!s||!x||!l||!b||!u)return;r.classList.toggle("active",this.mode==="signin"),s.classList.toggle("active",this.mode==="signup");const o=this.mode==="signup";x.style.display=o?"block":"none",u.style.display=o?"none":"inline-flex",l.autocomplete=o?"new-password":"current-password",l.placeholder=o?"Password (6+ characters)":"Password",b.textContent=o?"Create account":"Sign in with email",this.setError(null),this.setNotice(null)};r==null||r.addEventListener("click",()=>{this.mode="signin",w()}),s==null||s.addEventListener("click",()=>{this.mode="signup",w()}),e==null||e.addEventListener("click",o=>{o.target===e&&this.close()}),t==null||t.addEventListener("click",()=>this.close()),f==null||f.addEventListener("submit",async o=>{if(o.preventDefault(),!c||!l)return;const p=c.value.trim(),E=l.value,M=h==null?void 0:h.value.trim(),S=this.validateCredentials(p,E,M);if(S){this.setError(S);return}this.setBusy(!0),this.setError(null),this.setNotice(null);let v;if(this.mode==="signup"?v=await this.sendMessage({type:"AUTH_EMAIL_SIGN_UP",payload:{email:p,password:E,displayName:M}}):v=await this.sendMessage({type:"AUTH_EMAIL_SIGN_IN",payload:{email:p,password:E}}),this.setBusy(!1),!v.success){this.setError(v.error||"Authentication failed. Please try again.");return}this.handleAuthSuccess(this.mode==="signup"?"Account created. Signed in.":"Signed in successfully.")}),n==null||n.addEventListener("click",async()=>{q(!0),this.setBusy(!0),this.setError(null),this.setNotice(null);const o=await this.sendMessage({type:"SIGN_IN"});if(this.setBusy(!1),q(!1),!o.success){this.setError(o.error||"Google sign in failed.");return}this.handleAuthSuccess("Signed in with Google.")}),u==null||u.addEventListener("click",async()=>{if(!c)return;const o=c.value.trim();if(!this.validateEmail(o)){this.setError("Enter a valid email first, then click forgot password.");return}this.setBusy(!0),this.setError(null),this.setNotice(null);const p=await this.sendMessage({type:"AUTH_PASSWORD_RESET",payload:{email:o}});if(this.setBusy(!1),!p.success){this.setError(p.error||"Failed to send password reset email.");return}this.setNotice("Password reset email sent.")}),[h,c,l].forEach(o=>{o==null||o.addEventListener("input",()=>{this.setError(null)})}),w()}handleAuthSuccess(e){var t,r;this.setNotice(e),(r=(t=this.options).onAuthSuccess)==null||r.call(t),window.dispatchEvent(new CustomEvent("decodr-auth-success")),setTimeout(()=>this.close(),180)}validateCredentials(e,t,r){return this.validateEmail(e)?!t||t.length<6?"Password must be at least 6 characters.":this.mode==="signup"&&!r?"Name is required.":null:"Enter a valid email address."}validateEmail(e){return/^\S+@\S+\.\S+$/.test(e)}query(e){var t;return(t=this.container)==null?void 0:t.querySelector(e)}setBusy(e){if(!this.container)return;this.container.querySelectorAll("button, input").forEach(r=>{(r instanceof HTMLButtonElement||r instanceof HTMLInputElement)&&(r.disabled=e)})}setError(e){const t=this.query("[data-error]");if(t){if(!e){t.textContent="",t.style.display="none";return}t.textContent=e,t.style.display="block"}}setNotice(e){const t=this.query("[data-notice]");if(t){if(!e){t.textContent="",t.style.display="none";return}t.textContent=e,t.style.display="block"}}async sendMessage(e){try{return await chrome.runtime.sendMessage(e)||{success:!1,error:"No response from extension."}}catch(t){return{success:!1,error:t instanceof Error?t.message:"Request failed"}}}applyStyles(){if(document.getElementById("decodr-auth-required-modal-styles"))return;const e=document.createElement("style");e.id="decodr-auth-required-modal-styles",e.textContent=`
            .decodr-auth-required-backdrop {
                position: fixed;
                inset: 0;
                background: rgba(0, 0, 0, 0.6);
                backdrop-filter: blur(4px);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 2147483647;
                animation: decodr-auth-required-fade-in 0.2s ease-out;
            }

            .decodr-auth-required-modal {
                width: min(92vw, 420px);
                background: linear-gradient(135deg, #1e1e1e 0%, #252525 100%);
                border: 1px solid #3c4043;
                border-radius: 16px;
                box-shadow: 0 24px 48px rgba(0, 0, 0, 0.5);
                padding: 24px;
                position: relative;
                color: #e8eaed;
                font-family: 'Google Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                animation: decodr-auth-required-scale-in 0.3s cubic-bezier(0.16, 1, 0.3, 1);
            }

            .decodr-auth-required-close {
                position: absolute;
                top: 12px;
                right: 12px;
                width: 32px;
                height: 32px;
                border: none;
                border-radius: 50%;
                background: transparent;
                color: #9aa0a6;
                font-size: 20px;
                line-height: 1;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: background 0.15s ease, color 0.15s ease;
            }

            .decodr-auth-required-close:hover {
                background: rgba(255, 255, 255, 0.1);
                color: #e8eaed;
            }

            .decodr-auth-required-header {
                margin-bottom: 16px;
                padding-right: 28px;
            }

            .decodr-auth-required-header h3 {
                margin: 0 0 4px;
                font-size: 20px;
                font-weight: 600;
                color: #e8eaed;
            }

            .decodr-auth-required-header p {
                margin: 0;
                color: #9aa0a6;
                font-size: 13px;
                line-height: 1.5;
            }

            /* Pill-style segmented control */
            .decodr-auth-mode-toggle {
                display: flex;
                gap: 4px;
                padding: 3px;
                background: rgba(255, 255, 255, 0.06);
                border-radius: 10px;
                margin-bottom: 14px;
            }

            .decodr-auth-mode-btn {
                flex: 1;
                padding: 8px 12px;
                border-radius: 8px;
                border: none;
                background: transparent;
                color: rgba(255, 255, 255, 0.5);
                font-size: 13px;
                font-weight: 600;
                cursor: pointer;
                font-family: inherit;
                transition: all 0.2s ease;
            }

            .decodr-auth-mode-btn:hover:not(:disabled):not(.active) {
                color: rgba(255, 255, 255, 0.7);
            }

            .decodr-auth-mode-btn.active {
                background: rgba(255, 255, 255, 0.12);
                color: #fff;
                box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
            }

            /* Form */
            .decodr-auth-form {
                display: flex;
                flex-direction: column;
                gap: 10px;
            }

            .decodr-auth-field {
                width: 100%;
            }

            .decodr-auth-input {
                width: 100%;
                box-sizing: border-box;
                border-radius: 8px;
                border: 1px solid rgba(255, 255, 255, 0.15);
                background: rgba(255, 255, 255, 0.06);
                color: #ffffff;
                font-size: 14px;
                font-family: inherit;
                padding: 10px 12px;
                transition: border-color 0.15s ease, box-shadow 0.15s ease;
            }

            .decodr-auth-input::placeholder {
                color: rgba(255, 255, 255, 0.4);
            }

            .decodr-auth-input:focus {
                outline: none;
                border-color: rgba(167, 139, 250, 0.6);
                box-shadow: 0 0 0 2px rgba(167, 139, 250, 0.15);
            }

            /* Forgot password */
            .decodr-auth-link-btn {
                border: none;
                background: transparent;
                color: rgba(255, 255, 255, 0.55);
                font-size: 12px;
                font-family: inherit;
                cursor: pointer;
                align-self: flex-start;
                padding: 2px 0;
                transition: color 0.15s ease;
            }

            .decodr-auth-link-btn:hover:not(:disabled) {
                color: rgba(255, 255, 255, 0.9);
            }

            /* Buttons */
            .decodr-auth-submit-btn,
            .decodr-auth-google-btn {
                width: 100%;
                height: 40px;
                border-radius: 10px;
                border: none;
                cursor: pointer;
                font-size: 14px;
                font-weight: 600;
                font-family: inherit;
                transition: filter 0.15s ease, transform 0.1s ease, background 0.15s ease, border-color 0.15s ease;
            }

            .decodr-auth-submit-btn {
                color: #ffffff;
                background: linear-gradient(135deg, #8b5cf6, #a855f7);
            }

            .decodr-auth-submit-btn:hover:not(:disabled) {
                filter: brightness(1.08);
            }

            .decodr-auth-submit-btn:active:not(:disabled) {
                transform: scale(0.98);
            }

            .decodr-auth-google-btn {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
                color: #e8eaed;
                background: rgba(255, 255, 255, 0.06);
                border: 1px solid rgba(255, 255, 255, 0.15);
            }

            .decodr-auth-google-btn:hover:not(:disabled) {
                background: rgba(255, 255, 255, 0.1);
                border-color: rgba(255, 255, 255, 0.25);
            }

            .decodr-auth-google-btn:active:not(:disabled) {
                transform: scale(0.98);
            }

            .decodr-auth-spinner {
                width: 14px;
                height: 14px;
                border-radius: 999px;
                border: 2px solid rgba(255, 255, 255, 0.28);
                border-top-color: rgba(255, 255, 255, 0.95);
                animation: decodr-auth-spin 0.7s linear infinite;
            }

            /* Divider with lines */
            .decodr-auth-divider {
                display: flex;
                align-items: center;
                gap: 12px;
                margin: 14px 0;
                color: rgba(255, 255, 255, 0.35);
                font-size: 11px;
                letter-spacing: 0.1em;
                text-transform: uppercase;
            }

            .decodr-auth-divider::before,
            .decodr-auth-divider::after {
                content: '';
                flex: 1;
                height: 1px;
                background: rgba(255, 255, 255, 0.1);
            }

            /* Error and notice */
            .decodr-auth-error {
                border-radius: 8px;
                background: rgba(239, 68, 68, 0.12);
                border: 1px solid rgba(239, 68, 68, 0.3);
                color: #fca5a5;
                font-size: 13px;
                line-height: 1.4;
                padding: 8px 12px;
            }

            .decodr-auth-notice {
                border-radius: 8px;
                background: rgba(16, 185, 129, 0.12);
                border: 1px solid rgba(16, 185, 129, 0.3);
                color: #86efac;
                font-size: 13px;
                line-height: 1.4;
                padding: 8px 12px;
            }

            /* Focus-visible (keyboard only) */
            .decodr-auth-mode-btn:focus-visible,
            .decodr-auth-submit-btn:focus-visible,
            .decodr-auth-google-btn:focus-visible,
            .decodr-auth-link-btn:focus-visible,
            .decodr-auth-required-close:focus-visible {
                outline: 2px solid #a78bfa;
                outline-offset: 2px;
            }

            /* Disabled */
            .decodr-auth-mode-btn:disabled,
            .decodr-auth-submit-btn:disabled,
            .decodr-auth-google-btn:disabled,
            .decodr-auth-link-btn:disabled {
                opacity: 0.5;
                cursor: not-allowed;
                pointer-events: none;
            }

            .decodr-auth-input:disabled {
                opacity: 0.5;
                cursor: not-allowed;
                background: rgba(255, 255, 255, 0.02);
            }

            @keyframes decodr-auth-required-fade-in {
                from { opacity: 0; }
                to { opacity: 1; }
            }

            @keyframes decodr-auth-required-scale-in {
                from { transform: scale(0.95); opacity: 0; }
                to { transform: scale(1); opacity: 1; }
            }

            @keyframes decodr-auth-spin {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
            }
        `,document.head.appendChild(e)}}let g=null;function U(i={}){chrome.runtime.sendMessage({type:"OPEN_AUTH_UI"}).catch(()=>{}),g&&(g.close(!1),g=null);const e=new z({title:i.title,message:i.message,onClose:()=>{g===e&&(g=null)},onAuthSuccess:()=>{var t;chrome.runtime.sendMessage({type:"OPEN_AUTH_UI"}).catch(()=>{}),(t=i.onAuthSuccess)==null||t.call(i)}});g=e,e.show()}export{U as a,D as b,_ as e,T as g,G as p};
