// Set NEEDS first: const NEEDS=[["8D2","Pine Green"],["3D2","Chalk"]];  Result -> window.__fab (array)
const W=ms=>new Promise(r=>setTimeout(r,ms));
for(let i=0;i<20 && !(document.querySelector('main')?.innerText||'').includes('FABRIC · COLOUR');i++) await W(1000);
const CODE=/^(\d+D\d(?: Rib| S\/J)?|\d+VS\d|\d+(?: Rib| S\/J)?|Mesh Fabric)$/;
const inp=[...document.querySelectorAll('main input')].find(i=>/Search fabric/.test(i.placeholder));
const setv=v=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(inp,v); inp.dispatchEvent(new Event('input',{bubbles:true}));};
const txt=root=>{const w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);const o=[];let n;while(n=w.nextNode()){const t=n.textContent.trim(); if(t&&!n.parentElement.closest('select,option,script,style')) o.push(t);} return o.join(' | ');};
const num=s=>+String(s).replace(/,/g,'');
const out=[];
for(const [fab,col] of NEEDS){
  setv(col); await W(1500);
  const tw=document.createTreeWalker(document.querySelector('main'),NodeFilter.SHOW_TEXT); let group=null, row=null, n;
  while(n=tw.nextNode()){ if(n.parentElement.closest('select,option')) continue; const t=n.textContent.trim(); if(CODE.test(t)) group=t; else if(t===col && group===fab){ row=n.parentElement; break; } }
  if(!row){ out.push({fabric:fab,colour:col,found:false}); continue; }
  row.click(); await W(1500);
  const s=txt(document.querySelector('main')); const seg=s.slice(s.indexOf(fab+' | '+col));
  const g=re=>{const m=seg.match(re); return m?num(m[1]):null;};
  const locs=[...seg.matchAll(/(?:^|\| )([^|]+?) \| (-?[\d,.]+) \| kg free \| \/ \| (-?[\d,.]+) \| kg here/g)].map(m=>({location:m[1].trim(), free:num(m[2]), here:num(m[3])}));
  const inc=[...seg.slice(0,300).matchAll(/([A-Za-z][^|]*?) \| ([\d,.]+) \| kg \| · \| (\d{1,2} \w{3,4})/g)].map(m=>({location:m[1].trim(), kg:num(m[2]), eta:m[3]}));
  const short=g(/(-?[\d,.]+) \| kg short/);
  out.push({fabric:fab,colour:col,found:true,free:short!=null?-short:(g(/(-?[\d,.]+) \| kg \| free to use today/)??0),in_house:g(/(-?[\d,.]+) \| kg in house/)??0,reserved:g(/(-?[\d,.]+) \| kg already spoken for/)??0,on_order:g(/(-?[\d,.]+) \| kg on order/)??0,incoming:inc,locations:locs});
  row.click(); await W(500);
}
setv(''); window.__fab=out; out
