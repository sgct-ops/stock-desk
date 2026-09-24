// @ts-nocheck
/* Report parsing and rendering shared by the screen views and Karan's print sheet.
   Ported from the original Stock Desk page. Functions return escaped HTML strings. */

export const SHEET_CSS = `
.sheet{--k-ink:#141A16;--k-mut:#5B665F;--k-line:#D5DBD6;--k-soft:#EEF1EE;--k-acc:#1E5A43;--k-on:#1C7C47;--k-off:#B93A27;--k-warn:#A26A12;--k-ok:#42606F;
  width:210mm;min-height:297mm;margin:0 auto;background:#fff;color:var(--k-ink);padding:10mm 12mm 9mm;
  font:8.3pt/1.34 "IBM Plex Sans","Segoe UI",system-ui,sans-serif;box-shadow:0 1px 3px rgba(0,0,0,.08),0 10px 30px rgba(0,0,0,.08);display:flex;flex-direction:column;gap:2.8mm}
.sheet *{box-sizing:border-box}
.sheet h1,.sheet h2,.sheet h3,.sheet p{margin:0}
.k-mast{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:1.4pt solid var(--k-ink);padding-bottom:2.4mm}
.k-mast .l{display:flex;flex-direction:column;gap:.6mm}
.k-eyebrow{font:600 7pt/1 "IBM Plex Mono",monospace;letter-spacing:.12em;text-transform:uppercase;color:var(--k-mut)}
.k-mast h1{font:750 17pt/1.05 "Bricolage Grotesque","Segoe UI",sans-serif;letter-spacing:-.01em}
.k-mast .r{text-align:right;font:500 8pt/1.35 "IBM Plex Mono",monospace;color:var(--k-mut)}
.k-mast .r b{display:block;color:var(--k-ink);font:650 11pt/1.2 "Bricolage Grotesque",sans-serif}
.k-lede{font:500 10.5pt/1.3 "Bricolage Grotesque",sans-serif;max-width:170mm;text-wrap:balance}
.k-lede em{font-style:normal;font-weight:750}
.k-lede .on{color:var(--k-on)} .k-lede .off{color:var(--k-off)} .k-lede .warn{color:var(--k-warn)}
.k-kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:0;border:1pt solid var(--k-line);border-radius:1.4mm}
.k-kpi{padding:2.4mm 3mm;border-left:1pt solid var(--k-line);display:flex;flex-direction:column;gap:.4mm}
.k-kpi:first-child{border-left:0}
.k-kpi .n{font:600 19pt/1 "IBM Plex Mono",monospace;font-variant-numeric:tabular-nums;color:var(--c)}
.k-kpi .t{font-weight:600;font-size:8.2pt}
.k-kpi .s{font-size:7.2pt;color:var(--k-mut)}
.k-row{display:grid;grid-template-columns:1fr 1fr;gap:5mm}
.k-box{display:flex;flex-direction:column;gap:1.6mm;min-width:0}
.k-h{font:650 9pt/1.2 "Bricolage Grotesque",sans-serif;display:flex;justify-content:space-between;align-items:baseline;gap:3mm;border-bottom:.6pt solid var(--k-line);padding-bottom:1mm}
.k-h span{font:500 7pt "IBM Plex Mono",monospace;color:var(--k-mut);letter-spacing:.04em}
.k-box svg{display:block;width:100%;height:auto}
.k-t{border-collapse:collapse;width:100%;font-size:7.8pt}
.k-t th{text-align:left;font:600 6.6pt/1.2 "IBM Plex Mono",monospace;letter-spacing:.06em;text-transform:uppercase;color:var(--k-mut);padding:1mm 1.6mm;border-bottom:.8pt solid var(--k-ink)}
.k-t td{padding:.9mm 1.6mm;border-bottom:.5pt solid var(--k-line);vertical-align:top}
.k-t td.n{font-family:"IBM Plex Mono",monospace;font-variant-numeric:tabular-nums;white-space:nowrap}
.k-t td.p{font-weight:500}
.k-t tr{break-inside:avoid}
.k-neg{color:var(--k-off);font-weight:600}
.k-tag{font:600 6.6pt/1 "IBM Plex Mono",monospace;letter-spacing:.04em;padding:.7mm 1.3mm;border-radius:.8mm;border:.6pt solid currentColor;white-space:nowrap;display:inline-block}
.k-tag.on{color:var(--k-on)} .k-tag.off{color:var(--k-off)} .k-tag.warn{color:var(--k-warn)} .k-tag.mut{color:var(--k-mut)}
.k-more{font-size:7.4pt;color:var(--k-mut);padding:1mm 1.6mm}
.k-foot{margin-top:auto;display:grid;grid-template-columns:1.3fr 1fr;gap:5mm;border-top:.6pt solid var(--k-line);padding-top:2mm;font-size:7.4pt;color:var(--k-mut)}
.k-foot ul{margin:.8mm 0 0;padding-left:3.4mm;display:grid;gap:.6mm}
.k-foot b{color:var(--k-ink)}
.k-sec{display:flex;flex-direction:column;gap:1.4mm}
@page{size:A4 portrait;margin:0}
@media print{
  html,body{background:#fff!important;margin:0!important;padding:0!important}
  .sheet{box-shadow:none;margin:0;width:210mm;min-height:297mm;-webkit-print-color-adjust:exact;print-color-adjust:exact}
}`;

/* ---------- helpers ---------- */
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const inline = s => esc(s).replace(/\*\*(.+?)\*\*/g,'<b>$1</b>').replace(/`([^`]+)`/g,'<code>$1</code>');
const MON = {jan:0,feb:1,mar:2,apr:3,may:4,jun:5,jul:6,aug:7,sep:8,oct:9,nov:10,dec:11};
const fmtDate = iso => { const d=new Date(iso+'T00:00:00'); return isNaN(d)? iso : d.toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short',year:'numeric'}); };
const shortDate = d => d.toLocaleDateString('en-GB',{day:'numeric',month:'short'});
const store = { get(k){ try{return localStorage.getItem(k)}catch(e){return null} }, set(k,v){ try{localStorage.setItem(k,v)}catch(e){} } };

/* ---------- markdown → structured report ---------- */
function parseMd(md){
  md = md.replace(/\r\n?/g,'\n');
  const front = {};
  const fm = md.match(/^---\n([\s\S]*?)\n---\n?/);
  if (fm){ fm[1].split('\n').forEach(l=>{ const m=l.match(/^([\w-]+):\s*(.*)$/); if(m) front[m[1].trim()]=m[2].trim(); }); md = md.slice(fm[0].length); }
  let title = '';
  const sections = []; let cur = null;
  for (const line of md.split('\n')){
    if (/^#\s/.test(line)){ title = line.replace(/^#\s+/,'').trim(); continue; }
    if (/^##\s/.test(line)){ cur = {title: line.replace(/^##\s+/,'').trim(), lines: []}; sections.push(cur); continue; }
    if (!cur){ if(line.trim()){ cur = {title:'', lines:[]}; sections.push(cur);} else continue; }
    cur.lines.push(line);
  }
  sections.forEach(s=>{
    s.kind = kindOf(s.title);
    s.blocks = []; let i=0; const L=s.lines;
    while(i<L.length){
      const t=L[i].trim();
      if(!t){i++;continue;}
      if(t.startsWith('|')){
        const rows=[]; while(i<L.length && L[i].trim().startsWith('|')){ rows.push(L[i].trim()); i++; }
        const cells = r => r.replace(/^\|/,'').replace(/\|$/,'').split('|').map(c=>c.trim());
        const head = cells(rows[0]); const body = rows.slice(1).filter(r=>!/^\|?\s*:?-{2,}/.test(r)).map(cells);
        s.blocks.push({type:'table', head, rows: body.map(r=>Object.fromEntries(head.map((h,k)=>[h.toLowerCase(), r[k]??''])))});
        continue;
      }
      if(/^[-*]\s/.test(t)){ const items=[]; while(i<L.length && /^[-*]\s/.test(L[i].trim())){ items.push(L[i].trim().replace(/^[-*]\s+/,'')); i++; } s.blocks.push({type:'list',items}); continue; }
      const para=[]; while(i<L.length && L[i].trim() && !/^[-*|]/.test(L[i].trim())){ para.push(L[i].trim()); i++; }
      s.blocks.push({type:'p',text:para.join(' ')});
    }
    s.table = s.blocks.find(b=>b.type==='table');
    s.rows = s.table ? s.table.rows : [];
  });
  let date = front.date;
  if(!date){ const m = (title+' '+md).match(/(\d{4}-\d{2}-\d{2})/); if(m) date=m[1]; }
  return {front, title, sections, date};
}
function kindOf(t){
  t=t.toLowerCase();
  if(t.includes('basket 1')||t.includes('switch on')) return 'on';
  if(t.includes('basket 2')||t.includes('switch off')) return 'off';
  if(t.includes('watch')||t.includes('at risk')) return 'watch';
  if(t.includes('correct')||t.includes('no action')) return 'ok';
  if(t.includes('fabric')) return 'fabric';
  if(t.includes('summary')) return 'summary';
  if(t.includes('data')||t.includes('note')) return 'notes';
  return 'other';
}
const sizeList = r => (r.sizes||'').split(',').map(x=>x.trim()).filter(Boolean);
const stockList = r => (r.stock||'').split(',').map(x=>x.trim());
const num = v => { const n=parseFloat(String(v??'').replace(/[^\d.-]/g,'')); return isNaN(n)?0:n; };
function stats(rep){
  const sec = k => rep.sections.find(s=>s.kind===k) || {rows:[]};
  const o = {};
  for(const k of ['on','off','watch','ok']){ const rows=sec(k).rows; o[k]={products:rows.length, sizes:rows.reduce((a,r)=>a+sizeList(r).length,0), rows}; }
  o.short = sec('off').rows.reduce((a,r)=>a+num(r.short),0);
  o.lateCount = sec('off').rows.filter(r=>/late/i.test(r.flag||'')).length;
  return o;
}
function tone(v){
  v=(v||'').toLowerCase();
  if(/^likely|dispatch|packing|finishing/.test(v)) return 'good';
  if(/maybe|stitching/.test(v)) return 'warn';
  if(/unlikely|late|cutting|trims|no fabric/.test(v)) return 'bad';
  return '';
}

/* ---------- screen rendering ---------- */
const KIND = {on:{c:'var(--on)',label:'Switch ON'}, off:{c:'var(--off)',label:'Switch OFF'}, watch:{c:'var(--warn)',label:'Watch'}, ok:{c:'var(--ok)',label:'Correctly set'}};
function sizesCell(r){
  const sz=sizeList(r), st=stockList(r);
  if(!st.length || st.length!==sz.length) return `<div class="sizes">${sz.map(s=>`<span class="sz">${esc(s)}</span>`).join('')}</div>`+(r.stock?`<div class="meta">${esc(r.stock)}</div>`:'');
  return `<div class="sizes">${sz.map((s,i)=>{const n=num(st[i]); return `<span class="sz${n<0?' neg':''}" title="${esc(s)}: ${esc(st[i])} in stock">${esc(s)}<i>${esc(st[i])}</i></span>`}).join('')}</div>`;
}
function renderTable(t){
  const cols = t.head.map(h=>h.toLowerCase());
  const merged = cols.includes('sizes') && cols.includes('stock');
  const show = cols.filter(c=>!(merged && c==='stock'));
  const label = c => c==='sizes' && merged ? 'Sizes · stock' : c;
  const cell = (c,r) => {
    const v=r[c]??'';
    if(c==='product') return `<td class="prod">${inline(v)}</td>`;
    if(c==='sizes') return `<td>${merged?sizesCell(r):inline(v)}</td>`;
    if(['likely','stage'].includes(c)) return `<td>${v?`<span class="chip ${tone(v)}">${esc(v)}</span>`:''}</td>`;
    if(c==='flag') return `<td><span class="chip ${/late/i.test(v)?'bad':''}">${esc(v)}</span></td>`;
    if(/^-?[\d,.]+$/.test(v)) return `<td class="num${num(v)<0?' neg':''}">${esc(v)}</td>`;
    return `<td>${inline(v)}</td>`;
  };
  return `<div class="tbl-wrap"><table><thead><tr>${show.map(c=>`<th>${esc(label(c))}</th>`).join('')}</tr></thead><tbody>${t.rows.map(r=>`<tr>${show.map(c=>cell(c,r)).join('')}</tr>`).join('')}</tbody></table></div>`;
}
function renderReport(rec){
  if(!rec) return `<div class="empty"><h2>No report yet</h2><p>Upload the daily .md file on Shantanu's tab and it appears here for everyone.</p></div>`;
  const rep = parseMd(rec.md), st = stats(rep);
  const kpi = (k,sub) => `<div class="kpi" style="--c:${KIND[k].c}"><span class="n">${st[k].sizes}</span><span class="l">${KIND[k].label}</span><span class="s">${sub}</span></div>`;
  let h = `<div class="rep-head"><h1>${esc(rep.title||'Stock report')}</h1><span class="meta">${esc(rep.front.window?('Window '+rep.front.window):'')}</span></div>`;
  h += `<div class="kpis">${kpi('on',`sizes · ${st.on.products} product${st.on.products===1?'':'s'}`)}${kpi('off',`sizes · ${st.off.products} products · ${st.short} orders short`)}${kpi('watch',`sizes · ${st.watch.products} products`)}${kpi('ok',`sizes · ${st.ok.products} products`)}</div>`;
  for(const s of rep.sections){
    const k = KIND[s.kind];
    const cnt = k ? (()=>{const p=s.rows.length, z=s.rows.reduce((a,r)=>a+sizeList(r).length,0); return `<span class="count">${p} product${p===1?'':'s'} · ${z} size${z===1?'':'s'}</span>`})() : '';
    h += `<section class="sec" style="--c:${k?k.c:'var(--muted)'}"><h2>${k?'<span class="dot"></span>':''}${inline(s.title)} ${cnt}</h2>`;
    for(const b of s.blocks){
      if(b.type==='table') h+=renderTable(b);
      else if(b.type==='list') h+=`<ul>${b.items.map(x=>`<li>${inline(x)}</li>`).join('')}</ul>`;
      else h+=`<p>${inline(b.text)}</p>`;
    }
    h += `</section>`;
  }
  return h;
}

/* ---------- Karan's print sheet ---------- */
const KC = {on:'#1C7C47', off:'#B93A27', warn:'#A26A12', ok:'#42606F', ink:'#141A16', mut:'#5B665F', line:'#D5DBD6', soft:'#EEF1EE'};
function svgSplit(st){
  const parts=[['on','Switch ON',KC.on],['off','Switch OFF',KC.off],['watch','Watch',KC.warn],['ok','Correct',KC.ok]];
  const total = parts.reduce((a,p)=>a+st[p[0]].sizes,0)||1;
  const W=360, barY=10, barH=22; let x=0, segs='', labels='';
  parts.forEach(([k,l,c],i)=>{
    const w = st[k].sizes/total*W;
    if(w>0){ segs+=`<rect x="${x.toFixed(1)}" y="${barY}" width="${Math.max(w-1.5,0.5).toFixed(1)}" height="${barH}" fill="${c}"/>`;
      if(w>22) segs+=`<text x="${(x+w/2).toFixed(1)}" y="${barY+15}" text-anchor="middle" font-family="IBM Plex Mono,monospace" font-size="10" font-weight="600" fill="#fff">${st[k].sizes}</text>`; }
    x+=w;
    const lx = i*90;
    labels += `<rect x="${lx}" y="44" width="8" height="8" fill="${c}"/><text x="${lx+12}" y="51.5" font-size="9" fill="${KC.ink}" font-family="IBM Plex Sans,sans-serif">${l} <tspan fill="${KC.mut}" font-family="IBM Plex Mono,monospace">${st[k].sizes}</tspan></text>`;
  });
  return `<svg viewBox="0 0 360 60" role="img" aria-label="Sizes by action"><text x="0" y="6" font-size="8" fill="${KC.mut}" font-family="IBM Plex Mono,monospace">${total} SIZES CHECKED OUT OF STOCK OR LOW</text>${segs}${labels}</svg>`;
}
function svgDemand(rows){
  const data = rows.map(r=>({n:shortName(r.product), v:num(r['sold 30d']), short:num(r.short), late:/late/i.test(r.flag||'')}))
    .sort((a,b)=>b.v-a.v).slice(0,6).filter(d=>d.v>0);
  if(!data.length) return `<p style="color:${KC.mut}">No demand behind Basket 2.</p>`;
  const max = Math.max(...data.map(d=>d.v)); const step = max>50?25:(max>20?10:5); const top=Math.ceil(max/step)*step;
  const L=168, W=360, bw=W-L-62, rh=16, H=data.length*rh+18;
  let g='';
  for(let t=0;t<=top;t+=step){ const x=L+t/top*bw; g+=`<line x1="${x}" x2="${x}" y1="0" y2="${H-14}" stroke="${KC.line}" stroke-width="0.6"/><text x="${x}" y="${H-3}" text-anchor="middle" font-size="7.5" fill="${KC.mut}" font-family="IBM Plex Mono,monospace">${t}</text>`; }
  data.forEach((d,i)=>{ const y=i*rh+2, w=d.v/top*bw;
    g+=`<text x="${L-6}" y="${y+10.5}" text-anchor="end" font-size="8.4" fill="${KC.ink}" font-family="IBM Plex Sans,sans-serif">${esc(d.n.length>36?d.n.slice(0,35)+'…':d.n)}</text>`;
    g+=`<rect x="${L}" y="${y+2}" width="${Math.max(w,1)}" height="11" fill="${KC.off}" opacity="${i<2?1:0.55}"/>`;
    g+=`<text x="${L+w+4}" y="${y+10.5}" font-size="8" font-weight="600" fill="${KC.ink}" font-family="IBM Plex Mono,monospace">${d.v}${d.short?` <tspan fill="${KC.off}">· ${d.short} short</tspan>`:''}</text>`;
  });
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Units sold in 30 days for products to switch off">${g}</svg>`;
}
function shortName(p){ return String(p||'').replace(/^Carbon /,'').replace('Heavyweight Melange T-Shirt','HW Melange Tee').replace('Heavyweight T-Shirt','HW Tee').replace(/^UltraSoft Bamboo /,'Bamboo ').replace(/ \((.+)\)$/,' · $1'); }
function parseEta(s, year){ const m=String(s||'').match(/(\d{1,2})\s+([A-Za-z]{3})/); if(!m) return null; const mo=MON[m[2].toLowerCase()]; return mo==null?null:new Date(year,mo,+m[1]); }
function svgTimeline(rep, st){
  const d0 = new Date((rep.date||'')+'T00:00:00'); if(isNaN(d0)) return '';
  const days=8, W=740, L=8, R=8, top=26, bw=W-L-R, dx=bw/(days-1);
  const items=[];
  const add=(rows,kind)=>rows.forEach(r=>{ const d=parseEta(r.eta,d0.getFullYear()); if(!d) return; const i=Math.round((d-d0)/864e5); if(i<0||i>=days) return; items.push({i, po:(r.po||'').split(' ')[0], prod:shortName(r.product), likely:(r.likely||'').toLowerCase(), stage:r.stage||'', kind}); });
  add(st.on.rows,'on'); add(st.watch.rows,'watch'); add(st.ok.rows,'ok');
  let g=`<line x1="${L}" x2="${W-R}" y1="${top}" y2="${top}" stroke="${KC.ink}" stroke-width="1"/>`;
  for(let i=0;i<days;i++){ const x=L+i*dx, d=new Date(d0.getTime()+i*864e5);
    g+=`<line x1="${x}" x2="${x}" y1="${top-4}" y2="${top+4}" stroke="${KC.ink}" stroke-width="0.8"/>`;
    g+=`<text x="${x}" y="${top-9}" text-anchor="${i===0?'start':i===days-1?'end':'middle'}" font-size="8" fill="${i===0?KC.ink:KC.mut}" font-weight="${i===0?600:400}" font-family="IBM Plex Mono,monospace">${i===0?'Today ':''}${shortDate(d)}</text>`; }
  items.sort((a,b)=>a.i-b.i);
  const lanes=[]; // right edge per lane
  items.forEach(it=>{ const x=L+it.i*dx; const w=Math.max(it.prod.length*4.4, (it.po.length+it.stage.length+14)*4.2)+14;
    it.anchor = it.i>=days-2?'end':'start'; const x0 = it.anchor==='end'? x-w : x-5, x1 = it.anchor==='end'? x+5 : x+w;
    let lane=lanes.findIndex(r=>r < x0); if(lane<0){ lane=lanes.length; lanes.push(0); } lanes[lane]=x1; it.lane=lane; });
  items.forEach(it=>{
    const x=L+it.i*dx, y=top+15+it.lane*23; const c = it.likely.startsWith('likely')?KC.on: it.likely.startsWith('maybe')?KC.warn:KC.off;
    const tx = it.anchor==='end'?x-7:x+7;
    g+=`<line x1="${x}" x2="${x}" y1="${top}" y2="${y}" stroke="${KC.line}" stroke-width="0.8"/><circle cx="${x}" cy="${y}" r="4.2" fill="${c}"/>`;
    g+=`<text x="${tx}" y="${y-1}" text-anchor="${it.anchor}" font-size="8.2" font-weight="600" fill="${KC.ink}" font-family="IBM Plex Sans,sans-serif">${esc(it.prod)}</text>`;
    g+=`<text x="${tx}" y="${y+8.5}" text-anchor="${it.anchor}" font-size="7.4" fill="${KC.mut}" font-family="IBM Plex Mono,monospace">${esc(it.po)} · ${esc(it.stage)}${it.kind==='on'?' · switch ON':''}</text>`;
  });
  const H=top+15+Math.max(1,lanes.length)*23-6;
  const leg = [['Likely',KC.on],['Maybe',KC.warn],['Unlikely',KC.off]].map(([l,c],i)=>`<circle cx="${W-R-150+i*52}" cy="${H+6}" r="3.5" fill="${c}"/><text x="${W-R-144+i*52}" y="${H+9}" font-size="7.6" fill="${KC.mut}" font-family="IBM Plex Sans,sans-serif">${l}</text>`).join('');
  return `<svg viewBox="0 0 ${W} ${H+14}" role="img" aria-label="Style POs due in the next 7 days">${g}${leg}</svg>`;
}
function kTags(v){ const t=tone(v); return v?`<span class="k-tag ${t==='good'?'on':t==='warn'?'warn':t==='bad'?'off':'mut'}">${esc(v)}</span>`:''; }
function kSizes(r){ const sz=sizeList(r), st=stockList(r); if(st.length!==sz.length) return esc(r.sizes); return sz.map((s,i)=>`${esc(s)}<span style="color:${num(st[i])<0?KC.off:KC.mut}">&thinsp;${esc(st[i])}</span>`).join(', '); }
function renderSheet(rec){
  if(!rec) return `<div class="sheet"><p style="margin:auto;color:#5B665F">No report uploaded yet.</p></div>`;
  const rep=parseMd(rec.md), st=stats(rep);
  const sec=k=>rep.sections.find(s=>s.kind===k);
  const off=[...st.off.rows].sort((a,b)=>num(b['sold 30d'])-num(a['sold 30d']));
  const offMain=off.filter(r=>num(r['sold 30d'])>=3||num(r.short)>0||/late/i.test(r.flag||''));
  const offRest=off.filter(r=>!offMain.includes(r));
  const restSizes=offRest.reduce((a,r)=>a+sizeList(r).length,0);
  const d = new Date((rep.date||'')+'T00:00:00');
  const plural=(n,w)=>`${n} ${w}${n===1?'':'s'}`;
  const bullets = k => { const s=sec(k); if(!s) return ''; return s.blocks.filter(b=>b.type==='list').flatMap(b=>b.items).map(x=>`<li>${inline(x)}</li>`).join(''); };
  let h=`<div class="sheet">
  <div class="k-mast"><div class="l"><span class="k-eyebrow">Carbontree · Shopify continue-selling check</span><h1>Daily stock report</h1></div>
  <div class="r"><b>${isNaN(d)?esc(rep.date||''):d.toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}</b>Window ${esc(rep.front.window||'next 7 days')}</div></div>
  <p class="k-lede"><em class="on">${plural(st.on.products,'product')}</em> to switch ON, <em class="off">${plural(st.off.products,'product')}</em> to switch OFF${st.short?` (<em class="off">${st.short} orders</em> already can't ship)`:''}, and <em class="warn">${st.watch.products}</em> at risk of missing their PO date.</p>
  <div class="k-kpis">
    <div class="k-kpi" style="--c:${KC.on}"><span class="n">${st.on.sizes}</span><span class="t">Sizes to switch ON</span><span class="s">Sold out, stock lands within 7 days</span></div>
    <div class="k-kpi" style="--c:${KC.off}"><span class="n">${st.off.sizes}</span><span class="t">Sizes to switch OFF</span><span class="s">Selling with no stock due${st.lateCount?` · ${st.lateCount} late POs`:''}</span></div>
    <div class="k-kpi" style="--c:${KC.warn}"><span class="n">${st.watch.sizes}</span><span class="t">Sizes to watch</span><span class="s">PO due, unlikely to arrive</span></div>
    <div class="k-kpi" style="--c:${KC.off}"><span class="n">${st.short}</span><span class="t">Orders short</span><span class="s">Paid, no stock, no PO in 7 days</span></div>
  </div>
  <div class="k-row">
    <div class="k-box"><div class="k-h">Where the low-stock sizes stand <span>SIZES</span></div>${svgSplit(st)}</div>
    <div class="k-box"><div class="k-h">Demand behind "switch OFF" <span>UNITS SOLD · 30 DAYS</span></div>${svgDemand(st.off.rows)}</div>
  </div>
  <div class="k-box"><div class="k-h">Style POs due in the next 7 days <span>CARBONWORK ETA · STAGE</span></div>${svgTimeline(rep,st)}</div>`;
  if(st.on.rows.length) h+=`<div class="k-sec"><div class="k-h">Switch ON <span>${plural(st.on.sizes,'size')}</span></div><table class="k-t"><thead><tr><th>Product</th><th>Sizes · stock</th><th>PO</th><th>ETA</th><th>Stage</th><th>Qty</th></tr></thead><tbody>${st.on.rows.map(r=>`<tr><td class="p">${esc(r.product)}</td><td class="n">${kSizes(r)}</td><td>${esc(r.po)}</td><td class="n">${esc(r.eta)}</td><td>${kTags(r.likely||r.stage)}</td><td class="n">${esc(r['po qty']||'')}</td></tr>`).join('')}</tbody></table></div>`;
  if(st.off.rows.length) h+=`<div class="k-sec"><div class="k-h">Switch OFF <span>${plural(st.off.sizes,'size')} · sorted by demand</span></div><table class="k-t"><thead><tr><th>Product</th><th>Sizes · stock</th><th>Sold 30d</th><th>Short</th><th>Next PO</th><th>Flag</th></tr></thead><tbody>${offMain.map(r=>`<tr><td class="p">${esc(r.product)}</td><td class="n">${kSizes(r)}</td><td class="n">${esc(r['sold 30d'])}</td><td class="n${num(r.short)>0?' k-neg':''}">${esc(r.short)}</td><td>${esc(r['next po'])}</td><td>${kTags(r.flag)}</td></tr>`).join('')}</tbody></table>${offRest.length?`<div class="k-more">+ ${plural(offRest.length,'more product')} (${restSizes} sizes) with under 3 sales in 30 days and no PO: ${offRest.map(r=>esc(r.product.replace(/ \(.*/,''))).filter((v,i,a)=>a.indexOf(v)===i).join(', ')}.</div>`:''}</div>`;
  if(st.watch.rows.length) h+=`<div class="k-sec"><div class="k-h">Watch <span>PO due but at risk</span></div><table class="k-t"><thead><tr><th>Product</th><th>Sizes · stock</th><th>PO</th><th>ETA</th><th>Stage</th><th>Risk</th></tr></thead><tbody>${st.watch.rows.map(r=>`<tr><td class="p">${esc(r.product)}</td><td class="n">${kSizes(r)}</td><td>${esc(r.po)}</td><td class="n">${esc(r.eta)}</td><td>${kTags(r.stage)}</td><td>${inline(r.risk||'')}</td></tr>`).join('')}</tbody></table></div>`;
  h+=`<div class="k-foot"><div><b>Fabric</b><ul>${bullets('fabric')}</ul></div><div><b>Notes</b><ul>${bullets('notes')}</ul><div style="margin-top:1.4mm">Sources: ${esc(rep.front.sources||'Shopify, Zoho, Carbonwork')} · ${st.ok.products} products already set correctly.</div></div></div>
  </div>`;
  return h;
}


const _esc: any = esc;
const _inline: any = inline;
const _fmtDate: any = fmtDate;
const _parseMd: any = parseMd;
const _kindOf: any = kindOf;
const _sizeList: any = sizeList;
const _stockList: any = stockList;
const _num: any = num;
const _stats: any = stats;
const _tone: any = tone;
const _KIND: any = KIND;
const _renderTable: any = renderTable;
const _renderReport: any = renderReport;
const _renderSheet: any = renderSheet;
const _shortName: any = shortName;
export { _esc as esc, _inline as inline, _fmtDate as fmtDate, _parseMd as parseMd, _kindOf as kindOf, _sizeList as sizeList, _stockList as stockList, _num as num, _stats as stats, _tone as tone, _KIND as KIND, _renderTable as renderTable, _renderReport as renderReport, _renderSheet as renderSheet, _shortName as shortName };
