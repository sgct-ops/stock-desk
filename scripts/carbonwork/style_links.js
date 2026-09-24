// On /sourcing-calendar. Returns [[style name, po, style id], ...] -> raw/carbonwork_style_links.json
for (let i=0;i<20 && !(document.querySelector('main')?.innerText||'').includes('open orders');i++) await new Promise(r=>setTimeout(r,1000));
[...document.querySelectorAll('main a[href^="/style/"]')].map(a=>{const l=a.getAttribute('aria-label')||''; const m=l.match(/^(.*), PO (CT\w*\/PO\/[\w-]+)/); return m?[m[1].trim(), m[2].replace('CT26/PO/',''), a.getAttribute('href').slice(7)]:null}).filter(Boolean)
