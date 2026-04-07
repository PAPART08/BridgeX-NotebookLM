function d(n){const{platform:o,title:s,messages:c,exportedAt:a,url:t}=n;let e=`# ${s}

`;e+=`**Platform**: ${o.charAt(0).toUpperCase()+o.slice(1)}
`,e+=`**Exported**: ${a}
`,t&&(e+=`**Source**: ${t}
`),e+=`**Tool**: Decodr Extension

`,e+=`---

`;for(const r of c){const l=r.role==="user"?"User":r.role==="assistant"?"Assistant":"AI";e+=`## ${l}
`,r.timestamp&&(e+=`*${r.timestamp}*

`),e+=`${r.content}

`}return e+=`---

`,e+=`*Exported by Decodr - NotebookLM Power Extension*
`,e}function i(n){return n.replace(/[<>:"/\\|?*]/g,"-").replace(/\s+/g,"_").substring(0,100)}function u(n,o,s="md"){const c=i(o),a=new Blob([n],{type:"text/plain;charset=utf-8"}),t=URL.createObjectURL(a),e=document.createElement("a");e.href=t,e.download=`${c}.${s}`,document.body.appendChild(e),e.click(),document.body.removeChild(e),setTimeout(()=>URL.revokeObjectURL(t),100)}function m(){return new Date().toISOString().replace("T"," ").substring(0,19)+" UTC"}function p(n){const o=n.cloneNode(!0);return o.querySelectorAll("pre, code").forEach(t=>{const e=t.textContent||"";t.tagName==="PRE"?t.textContent="\n```\n"+e+"\n```\n":t.textContent="`"+e+"`"}),o.querySelectorAll("br").forEach(t=>{t.replaceWith(`
`)}),o.querySelectorAll("p").forEach(t=>{t.textContent=(t.textContent||"")+`

`}),(o.textContent||"").trim()}export{u as d,p as e,d as f,m as g};
