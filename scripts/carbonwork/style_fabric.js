// On a /style/<id> page. Returns the linked fabric(s) as [[fabric, colour], ...]
const W=ms=>new Promise(r=>setTimeout(r,ms)); const btn=t=>[...document.querySelectorAll('main button')].find(b=>b.innerText.trim().startsWith(t));
for(let i=0;i<20&&!btn('Cost Grid');i++) await W(1000); btn('Cost Grid').click();
for(let i=0;i<10&&!btn('Linked fabric');i++) await W(500);
const lines=()=>{const L=document.querySelector('main').innerText.split('\n').map(s=>s.trim()).filter(Boolean); const i=L.indexOf('Linked fabric'); return L.slice(i+1, i+14);};
const RE=/^(\d+D\d(?: Rib| S\/J)?|\d+VS\d|\d+(?: Rib| S\/J)?|Mesh Fabric) – (.+?)(?=CT\w*\/PO\/|$)/;
const cut=L=>L.slice(0, Math.max(0, L.findIndex(s=>s.startsWith('🔒')))||L.length);
if(!cut(lines()).some(s=>RE.test(s))) { btn('Linked fabric').click(); await W(1200); }
const L=lines(); let fab=cut(L).map(s=>s.match(RE)).filter(Boolean).map(m=>[m[1],m[2].trim()]);
if(!fab.length){ const m=L.join('\n').match(/kg from (\d+D\d(?: Rib| S\/J)?|\d+VS\d|\d+(?: Rib| S\/J)?) – ([^@\n]+?) @/); if(m) fab=[[m[1],m[2].trim()]]; }
fab
