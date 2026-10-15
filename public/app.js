import {MEALS,escapeHTML as h,localDate,addDays,isDate,ready,range,validateBackup,mergeEntries,reportHTML} from './core.mjs';
const $=id=>document.getElementById(id);
let entries=[],revision=0,selected=localDate(),editId=null,dirty=false,storageBlocked=true,busy=false,saving=false,translationController=null,translationSnapshot=null,toastTimer;
let baseUpdatedAt=null;
const dateLong=d=>new Intl.DateTimeFormat('es',{weekday:'long',day:'numeric',month:'long',year:'numeric'}).format(new Date(d+'T12:00:00'));
function toast(message){$('toast').textContent=message;$('toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').hidden=true,6000);}
function storageError(message){storageBlocked=true;$('storageAlert').textContent=message;$('storageAlert').hidden=false;$('saveEntry').disabled=true;}
async function api(path,{method='GET',data,signal}={}){
  const response=await fetch(path,{method,credentials:'same-origin',cache:'no-store',headers:data?{'Content-Type':'application/json'}:{},body:data?JSON.stringify(data):undefined,signal});
  if(response.status===401)throw new Error('Tu sesión no está autorizada. Recarga la página e introduce tu usuario y contraseña.');
  const result=await response.json();
  if(!response.ok)throw new Error(result.error||'No se pudo completar la operación en el servidor.');
  return result;
}
async function reload(){
  try{const data=await api('/api/diary');entries=validateBackup(data);revision=data.revision;storageBlocked=false;$('storageAlert').hidden=true;$('saveEntry').disabled=busy||saving;render();return true;}
  catch(e){storageError('No se pudo cargar el diario del servidor. '+e.message+' Puedes reintentar con «Mi diario».');return false;}
}
async function store(next){const data=await api('/api/diary',{method:'PUT',data:{revision,entries:next}});entries=validateBackup(data);revision=data.revision;return true;}
function render(){
  const d=new Date(selected+'T12:00:00'),offset=(d.getDay()+6)%7,monday=addDays(selected,-offset);
  $('monthTitle').textContent=new Intl.DateTimeFormat('es',{month:'long',year:'numeric'}).format(d);
  $('jumpDate').value=selected;
  $('weekGrid').innerHTML=Array.from({length:7},(_,i)=>{const date=addDays(monday,i),day=new Date(date+'T12:00:00');return `<button class="day${date===selected?' selected':''}${date===localDate()?' current':''}${entries.some(e=>e.date===date)?' has-entries':''}" data-date="${date}" aria-pressed="${date===selected}" aria-label="${h(dateLong(date))}"><span class="weekday">${new Intl.DateTimeFormat('es',{weekday:'short'}).format(day).replace('.','')}</span><span class="number">${day.getDate()}</span><span class="day-dot"></span></button>`;}).join('');
  const dayEntries=range(entries,selected,selected),n=dayEntries.length,nReady=dayEntries.filter(ready).length;
  $('mealCount').textContent=n;$('readyCount').textContent=nReady;
  $('dayStatus').textContent=n?(n===nReady?'Al día':'En proceso'):'Por empezar';
  $('dayHint').textContent=n?(n===nReady?'Listo para compartir':`${n-nReady} por traducir o revisar`):'Sin prisas, a tu ritmo';
  document.querySelector('.section-head h2').textContent=selected===localDate()?'Las comidas de hoy':'Las comidas del día';
  $('dayFull').textContent=dateLong(selected);
  $('entries').innerHTML=n?dayEntries.map(e=>`<article class="entry"><div class="entry-head"><time datetime="${e.date}T${e.time}">${h(e.time)}</time><h3>${MEALS[e.meal][0]} <span lang="hr">/ ${MEALS[e.meal][1]}</span></h3><button class="text-button" data-edit="${h(e.id)}" aria-label="Editar ${h(MEALS[e.meal][0])} de las ${h(e.time)}">Editar</button></div><div class="entry-columns"><div lang="es"><small>ES · ESPAÑOL</small><p class="${e.es?'':'pending-copy'}">${h(e.es||'Traducción pendiente')}</p></div><div lang="hr"><small>HR · HRVATSKI</small><p class="${e.hr?'':'pending-copy'}">${h(e.hr||'Prijevod na čekanju')}</p></div></div>${!['es','hr'].includes(e.source)?`<details class="entry-original"><summary>Original · ${h(e.source.toUpperCase())}</summary><p lang="${e.source}">${h(e.original)}</p></details>`:''}<div class="entry-meta"><span class="status-pill${ready(e)?'':' draft'}">${ready(e)?'✓ Traducida y revisada / Pregledano':'Borrador / Nacrt'}</span>${e.hunger?`<span>Hambre / Glad: ${h(e.hunger)}/5</span>`:''}</div></article>`).join(''):`<div class="empty"><div class="plate"><svg><use href="#i-leaf"/></svg></div><h3>Empieza con una comida.</h3><p>Un café, un desayuno o una cena.<br>Tu diario empieza donde tú quieras.</p><button class="text-button" id="emptyAdd">Añadir mi primera entrada →</button></div>`;
  $('emptyAdd')?.addEventListener('click',()=>openEntry());
}
$('weekGrid').addEventListener('click',e=>{const b=e.target.closest('[data-date]');if(b){selected=b.dataset.date;render();}});
$('prevWeek').onclick=()=>{selected=addDays(selected,-7);render();};$('nextWeek').onclick=()=>{selected=addDays(selected,7);render();};$('today').onclick=()=>{selected=localDate();render();};$('jumpDate').onchange=e=>{if(isDate(e.target.value)){selected=e.target.value;render();}};
$('entries').addEventListener('click',e=>{const b=e.target.closest('[data-edit]');if(b)openEntry(b.dataset.edit);});
for(const id of ['addTop','addBottom'])$(id).onclick=()=>openEntry();
$('diaryNav').onclick=async()=>{selected=localDate();await reload();window.scrollTo({top:0,behavior:'smooth'});};
function setSourceVersion(){const source=$('sourceLang').value;for(const lang of ['es','hr']){$('text'+(lang==='es'?'Es':'Hr')).readOnly=source===lang;}if(source==='es')$('textEs').value=$('original').value.trim();if(source==='hr')$('textHr').value=$('original').value.trim();}
function invalidate(){dirty=true;$('reviewed').checked=false;}
function savingState(value){saving=value;for(const field of $('entryForm').elements)field.disabled=value;$('saveEntry').disabled=value||storageBlocked||busy;}
async function openEntry(id=null){
  if(!await reload())return;const e=entries.find(x=>x.id===id);editId=e?.id||null;baseUpdatedAt=e?.updatedAt||null;
  $('entryForm').reset();$('entryTitle').textContent=e?'Editar comida':'Una nueva comida';
  $('entryDate').value=e?.date||selected;$('entryTime').value=e?.time||`${String(new Date().getHours()).padStart(2,'0')}:${String(new Date().getMinutes()).padStart(2,'0')}`;
  $('mealType').value=e?.meal||'breakfast';$('sourceLang').value=e?.source||'es';$('original').value=e?.original||'';$('textEs').value=e?.es||'';$('textHr').value=e?.hr||'';$('hunger').value=e?.hunger||'';$('reviewed').checked=e?.reviewed||false;
  $('deleteEntry').hidden=!e;$('translationStatus').textContent='Traducción en tu servidor. Puedes guardar un borrador sin traducir y completarlo después.';
  setSourceVersion();dirty=false;$('entryDialog').showModal();
}
$('entryForm').addEventListener('input',e=>{
  dirty=true;
  if(e.target.id==='original'){$('textEs').value='';$('textHr').value='';setSourceVersion();invalidate();}
  else if(['textEs','textHr'].includes(e.target.id))invalidate();
});
$('sourceLang').onchange=()=>{$('textEs').value='';$('textHr').value='';setSourceVersion();invalidate();};
function closeEntry(){if(saving){toast('Espera a que termine el guardado.');return;}if(dirty&&!confirm('Hay cambios sin guardar. ¿Quieres descartarlos?'))return;stopTranslation();dirty=false;$('entryDialog').close();}
document.querySelectorAll('.close-entry').forEach(b=>b.onclick=closeEntry);
$('entryDialog').addEventListener('cancel',e=>{e.preventDefault();closeEntry();});
document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>$(b.dataset.close).close());
window.addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue='';}});
$('entryForm').onsubmit=async e=>{
  e.preventDefault();if(saving)return;if(busy){toast('Espera a que termine la traducción o cancélala.');return;}
  const original=$('original').value.trim();if(!original){$('original').focus();return;}
  if(!isDate($('entryDate').value)){toast('Introduce una fecha válida entre 1900 y 2200.');return;}
  setSourceVersion();const item={id:editId||crypto.randomUUID(),date:$('entryDate').value,time:$('entryTime').value,meal:$('mealType').value,source:$('sourceLang').value,original,es:$('textEs').value.trim(),hr:$('textHr').value.trim(),hunger:$('hunger').value,reviewed:$('reviewed').checked,updatedAt:new Date().toISOString()};
  if(item.reviewed&&!ready(item)){toast('Para marcar la revisión, completa las dos versiones.');return;}
  savingState(true);
  try{if(!await reload())return;const current=entries;if(editId&&current.find(x=>x.id===editId)?.updatedAt!==baseUpdatedAt){toast('Esta entrada cambió en otra pestaña. Cierra y vuelve a abrirla antes de editar.');return;}
    if(await store([...current.filter(x=>x.id!==item.id),item])){dirty=false;selected=item.date;$('entryDialog').close();render();toast(ready(item)?'Entrada guardada en los dos idiomas.':'Borrador guardado. Puedes traducirlo y revisarlo después.');}
  }catch(e){toast(e.message+' El formulario conserva tus cambios.');}finally{savingState(false);}
};
$('deleteEntry').onclick=async()=>{
  if(busy||saving)return;if(!confirm('¿Eliminar esta entrada del diario? Las copias ya exportadas no cambiarán.'))return;
  savingState(true);
  try{if(!await reload())return;const current=entries;if(current.find(x=>x.id===editId)?.updatedAt!==baseUpdatedAt){toast('La entrada cambió en otra pestaña. Vuelve a abrirla.');return;}if(await store(current.filter(x=>x.id!==editId))){dirty=false;$('entryDialog').close();render();toast('Entrada eliminada.');}}catch(e){toast(e.message);}finally{savingState(false);}
};
function busyState(value){busy=value;for(const id of ['original','sourceLang','textEs','textHr','reviewed','deleteEntry','translateBtn'])$(id).disabled=value;$('saveEntry').disabled=value||storageBlocked||saving;$('cancelTranslate').hidden=!value;}
function stopTranslation(){if(translationController){translationController.abort();translationController=null;}if(busy){busyState(false);$('translationStatus').textContent='Traducción cancelada. Puedes guardar el texto como borrador.';}}
$('cancelTranslate').onclick=stopTranslation;
$('translateBtn').onclick=()=>{if(!$('original').value.trim()){toast('Escribe primero lo que comiste.');$('original').focus();return;}startTranslation();};
async function startTranslation(){
  if(busy)return;
  if(($('sourceLang').value!=='es'&&$('textEs').value)||($('sourceLang').value!=='hr'&&$('textHr').value)){if(!confirm('La traducción reemplazará las versiones traducidas actuales. ¿Continuar?'))return;}
  invalidate();busyState(true);$('translationStatus').textContent='Traduciendo en tu servidor… La primera carga puede tardar. Puedes cancelar y guardar un borrador.';
  const controller=new AbortController();translationController=controller;
  const snapshot={text:$('original').value.trim(),source:$('sourceLang').value};translationSnapshot=snapshot;
  try{
    const result=await api('/api/translate',{method:'POST',data:snapshot,signal:controller.signal});
    if(translationController!==controller)return;
    if(snapshot.text!==$('original').value.trim()||snapshot.source!==$('sourceLang').value)throw new Error('El texto cambió; vuelve a traducir.');
    $('textEs').value=result.es;$('textHr').value=result.hr;setSourceVersion();invalidate();
    $('translationStatus').textContent='Traducción lista. Revisa alimentos, cantidades y negaciones antes de marcar la casilla y guardar.';
  }catch(e){if(e.name!=='AbortError'&&translationController===controller)$('translationStatus').textContent=e.message+' Puedes guardar el original como borrador.';}
  finally{if(translationController===controller){translationController=null;busyState(false);}}
}
async function openShare(){if(!await reload())return;$('shareFrom').value=addDays(selected,-6);$('shareTo').value=selected;updateReport();$('shareDialog').showModal();}
for(const id of ['shareNav','shareCard'])$(id).onclick=openShare;
function updateReport(){
  const from=$('shareFrom').value,to=$('shareTo').value,valid=isDate(from)&&isDate(to)&&from<=to,list=valid?range(entries,from,to):[],pending=list.filter(x=>!ready(x));
  $('reportSummary').textContent=!valid?'Elige un período válido.':!list.length?'No hay entradas en este período.':pending.length?`${list.length} entradas · ${pending.length} pendientes de traducción o revisión. Complétalas para compartir el período entero.`:`${list.length} entradas · Todas traducidas y revisadas. Informe listo.`;
  $('downloadReport').disabled=$('printReport').disabled=!valid||!list.length||!!pending.length;
  $('reportPreview').innerHTML=list.map(e=>`<div class="preview-line">${h(e.date)} · ${h(e.time)} · ${MEALS[e.meal].join(' / ')}<small>${ready(e)?'✓ Español + Hrvatski':'Pendiente de traducción o revisión'}</small>${!ready(e)?`<button class="text-button" data-review="${h(e.id)}">Revisar entrada →</button>`:''}</div>`).join('');
}
for(const id of ['shareFrom','shareTo'])$(id).onchange=updateReport;
$('reportPreview').onclick=e=>{const b=e.target.closest('[data-review]');if(b){$('shareDialog').close();openEntry(b.dataset.review);}};
function download(content,name,type){const url=URL.createObjectURL(new Blob([content],{type}));const a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);}
async function report(){if(!await reload())throw new Error('No se pudo cargar el informe del servidor.');updateReport();return reportHTML(entries,$('shareFrom').value,$('shareTo').value);}
$('downloadReport').onclick=async()=>{try{const content=await report();download(content,`mesa-stol_${$('shareFrom').value}_${$('shareTo').value}.html`,'text/html;charset=utf-8');toast('Informe descargado. Puedes enviarlo a tu nutrióloga.');}catch(e){toast(e.message);}};
$('printReport').onclick=async()=>{try{
  const html=await report();document.getElementById('printFrame')?.remove();
  const frame=document.createElement('iframe');frame.id='printFrame';frame.title='Informe para imprimir';frame.setAttribute('aria-hidden','true');frame.style.cssText='position:fixed;left:-10000px;top:0;width:1000px;height:800px;border:0';
  frame.onload=()=>{try{frame.contentWindow.focus();frame.contentWindow.print();}catch{toast('Descarga el informe HTML y utiliza Imprimir en el navegador.');}};
  frame.srcdoc=html;document.body.appendChild(frame);
}catch(e){toast(e.message);}};
$('backupNav').onclick=()=>$('backupDialog').showModal();$('aboutBtn').onclick=()=>$('aboutDialog').showModal();
$('exportBackup').onclick=async()=>{try{if(!await reload())throw new Error('No se pudo obtener una copia actual del servidor.');const data=JSON.stringify({format:'mesa-stol',version:1,exportedAt:new Date().toISOString(),entries},null,2);download(data,`mesa-stol_copia_${localDate()}.json`,'application/json');toast('Copia descargada. Guárdala en un lugar privado.');}catch(e){toast(e.message);}};
$('importBackup').onchange=async e=>{
  const file=e.target.files[0];if(!file)return;
  try{if(file.size>20*1024*1024)throw new Error('La copia supera el límite de 20 MB.');const incoming=validateBackup(JSON.parse(await file.text()));if(!incoming.length)throw new Error('La copia no contiene entradas.');
    if(!confirm(`Importar ${incoming.length} entradas al servidor. Si alguna ya existe, se conservará la versión con la fecha de modificación más reciente. ¿Continuar?`))return;
    if(!await reload())return;
    if(await store(mergeEntries(entries,incoming))){render();toast('Copia importada al servidor.');$('backupDialog').close();}
  }catch(error){toast(error instanceof SyntaxError?'El archivo no es un JSON válido. No se ha modificado el diario.':error.message);}finally{e.target.value='';}
};
render();
await reload();
