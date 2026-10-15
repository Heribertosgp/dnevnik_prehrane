export const MEALS={breakfast:['Desayuno','Doručak'],lunch:['Comida','Ručak'],dinner:['Cena','Večera'],snack:['Tentempié','Međuobrok'],drink:['Bebida','Piće']};
export const LANGS={es:'es',hr:'hr',en:'en',de:'de',fr:'fr',it:'it',pt:'pt'};
export const escapeHTML=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function localDate(d=new Date()){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
export function addDays(iso,n){const d=new Date(iso+'T12:00:00');d.setDate(d.getDate()+n);return localDate(d);}
export function isDate(s){return typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&Number(s.slice(0,4))>=1900&&Number(s.slice(0,4))<=2200&&!isNaN(new Date(s+'T12:00:00'))&&localDate(new Date(s+'T12:00:00'))===s;}
export function ready(e){return Boolean(e.reviewed&&e.es.trim()&&e.hr.trim()&&(e.source!=='es'||e.es===e.original)&&(e.source!=='hr'||e.hr===e.original));}
export function sorted(entries){return [...entries].sort((a,b)=>(a.date+a.time+a.id).localeCompare(b.date+b.time+b.id));}
export function range(entries,from,to){return sorted(entries.filter(e=>e.date>=from&&e.date<=to));}
export function validateBackup(data){
  if(!data||data.format!=='mesa-stol'||data.version!==1||!Array.isArray(data.entries)||data.entries.length>20000)throw new Error('No es una copia válida de Mesa / Stol.');
  const ids=new Set();
  return data.entries.map(e=>{
    if(!e||typeof e.id!=='string'||!/^[a-zA-Z0-9-]{1,80}$/.test(e.id)||ids.has(e.id)||!isDate(e.date)||typeof e.time!=='string'||!/^([01]\d|2[0-3]):[0-5]\d$/.test(e.time)||!Object.hasOwn(MEALS,e.meal)||!Object.hasOwn(LANGS,e.source)||!['','1','2','3','4','5'].includes(e.hunger)||typeof e.reviewed!=='boolean'||!Number.isFinite(Date.parse(e.updatedAt)))throw new Error('La copia contiene una entrada inválida. No se ha importado nada.');
    for(const k of ['original','es','hr'])if(typeof e[k]!=='string'||e[k].length>(k==='original'?2400:6000))throw new Error('La copia contiene texto inválido o demasiado largo.');
    if(!e.original.trim())throw new Error('Hay una entrada sin texto original.');
    ids.add(e.id);
    const clean={id:e.id,date:e.date,time:e.time,meal:e.meal,source:e.source,hunger:e.hunger,original:e.original,es:e.es,hr:e.hr,reviewed:e.reviewed,updatedAt:e.updatedAt};
    clean.reviewed=ready(clean);return clean;
  });
}
export function mergeEntries(current,incoming){const m=new Map(current.map(e=>[e.id,e]));for(const e of incoming){if(!m.has(e.id)||Date.parse(e.updatedAt)>Date.parse(m.get(e.id).updatedAt))m.set(e.id,e);}return sorted([...m.values()]);}
export function splitText(text,max=300){
  // Short sections avoid the model's context limit; preserve decimals and punctuation.
  const result=[];
  for(const paragraph of text.split(/\n+/).filter(x=>x.trim())){
    const sentences=[paragraph];
    for(const sentence of sentences){let chunk='';for(const word of sentence.trim().split(/\s+/)){if(chunk.length+word.length+1>max&&chunk){result.push(chunk);chunk='';}if(word.length>max){if(chunk){result.push(chunk);chunk='';}for(let i=0;i<word.length;i+=max)result.push(word.slice(i,i+max));}else chunk+=(chunk?' ':'')+word;}if(chunk)result.push(chunk);}
  }
  return result;
}
export function reportHTML(entries,from,to){
  if(!isDate(from)||!isDate(to)||from>to)throw new Error('Selecciona un período válido.');
  const list=range(entries,from,to);
  if(!list.length)throw new Error('No hay comidas en el período elegido.');
  if(list.some(e=>!ready(e)))throw new Error('Completa y revisa ambas versiones de todas las entradas del período.');
  const h=escapeHTML;
  let lastDate='';
  const content=list.map(e=>{let heading='';if(e.date!==lastDate){lastDate=e.date;heading=`<h2>${h(e.date)}</h2>`;}return `${heading}<article><header><strong>${h(e.time)} · <span lang="es">${h(MEALS[e.meal][0])}</span> / <span lang="hr">${h(MEALS[e.meal][1])}</span></strong></header><div class="columns"><section lang="es"><h3>ES · Español</h3><p>${h(e.es)}</p></section><section lang="hr"><h3>HR · Hrvatski</h3><p>${h(e.hr)}</p></section></div>${e.hunger?`<p class="meta">Hambre antes de comer / Glad prije jela: ${h(e.hunger)} / 5<br>1 = Nada / Nimalo · 5 = Mucha / Vrlo velika</p>`:''}${!['es','hr'].includes(e.source)?`<details><summary>Original (${h(e.source.toUpperCase())}) / Izvornik</summary><p lang="${h(e.source)}">${h(e.original)}</p></details>`:''}</article>`;}).join('');
  return `<!doctype html><html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="referrer" content="no-referrer"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'"><title>Diario de comidas / Dnevnik prehrane · ${h(from)} — ${h(to)}</title><style>body{font:15px/1.7 Arial,sans-serif;color:#283e34;background:#f8f7f3;margin:0;padding:40px 24px}main{max-width:940px;margin:auto}.brand{font-family:Georgia,serif;font-size:26px}h1,h2{font-family:Georgia,serif;font-weight:400}h1{font-size:32px;margin:22px 0 8px}h2{font-size:22px;margin:30px 0 12px}h3{font:11px Arial,sans-serif;color:#718067;letter-spacing:1px}p{white-space:pre-wrap;overflow-wrap:anywhere;margin:8px 0}article{background:white;border:1px solid #e0e5d8;border-radius:8px;padding:24px;margin-bottom:16px;break-inside:avoid}header{border-bottom:1px solid #e0e5d8;padding-bottom:12px}.columns{display:grid;grid-template-columns:1fr 1fr;gap:30px}.meta,footer{font-size:11px;color:#6f7d64}footer{margin-top:35px;border-top:1px solid #dce3d3;padding-top:20px}details{font-size:12px}.subtitle{color:#718067}.notice{font-size:12px;padding:16px 0}section p{font-size:14px}@media(max-width:550px){body{padding:24px 16px}.columns{grid-template-columns:1fr;gap:10px}h1{font-size:26px}article{padding:17px}}@media print{body{background:white;padding:0;font-size:11px}main{max-width:none}h1{font-size:25px}article{padding:14px}.columns{display:grid;grid-template-columns:1fr 1fr;gap:24px}section p{font-size:11px}footer{font-size:9px}details{display:block}details>p{display:block}@page{size:A4;margin:16mm}}</style></head><body><main><div class="brand">Mesa / Stol</div><h1>Diario de comidas / Dnevnik prehrane</h1><p class="subtitle">${h(from)} — ${h(to)} · ${list.length} comidas / obroka</p><p class="notice" lang="es">Copia de solo lectura. Traducciones revisadas por la persona que lleva el diario; pueden contener errores.</p><p class="notice" lang="hr">Kopija samo za čitanje. Prijevode je pregledala osoba koja vodi dnevnik; moguće su pogreške.</p>${content}<footer>Documento personal · Osobni dokument<br>Esta copia no se actualiza automáticamente. / Ova se kopija ne ažurira automatski.<br>Creado / Izrađeno: ${h(new Date().toISOString().slice(0,10))}</footer></main></body></html>`;
}
