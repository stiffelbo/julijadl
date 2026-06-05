const API_BASE="./api/babyevents";
const CACHE_KEY="baby-tracker-cache-v2";
const $=(id)=>document.getElementById(id);
const state={page:"add",rows:loadCache(),editingId:null};

const api={
  async get(){return parseResponse(await fetch(`${API_BASE}/get.php`));},
  async create(payload){return parseResponse(await fetch(`${API_BASE}/create.php`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)}));},
  async update(payload){return parseResponse(await fetch(`${API_BASE}/update.php`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)}));},
  async delete(id){return parseResponse(await fetch(`${API_BASE}/delete.php`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({id})}));}
};

async function parseResponse(res){
  const json=await res.json().catch(()=>null);
  if(!res.ok||!json?.success) throw new Error(json?.error||`HTTP ${res.status}`);
  return json;
}

function loadCache(){
  try{const raw=localStorage.getItem(CACHE_KEY);const parsed=raw?JSON.parse(raw):[];return Array.isArray(parsed)?parsed:[];}catch{return[];}
}
function saveCache(){localStorage.setItem(CACHE_KEY,JSON.stringify(state.rows));}

async function loadRemote(){
  try{
    const result=await api.get();
    state.rows=normalizeRows(result.data||[]);
    saveCache();
    renderTable();
  }catch(err){
    renderTable();
    showNotice(`Offline/cache: ${err.message}`,true);
  }
}

function normalizeRows(rows){
  return rows.map(row=>({id:Number(row.id),date:row.date,time:normalizeTime(row.time),value:String(row.value)}));
}

function nowPayload(value){
  const d=new Date();
  return {date:toDateInputValue(d),time:d.toTimeString().slice(0,5),value:String(value)};
}

async function addValue(value){
  const payload=nowPayload(value);
  try{
    const result=await api.create(payload);
    state.rows.unshift({id:Number(result.id),...payload});
    saveCache();
    showNotice(`Zapisano: ${value}`);
    renderTable();
  }catch(err){showNotice(`Błąd zapisu: ${err.message}`,true);}
}

function showNotice(text,error=false){
  const n=$("notice");
  n.textContent=text;
  n.classList.toggle("error",error);
  n.classList.add("show");
  clearTimeout(showNotice.timer);
  showNotice.timer=setTimeout(()=>n.classList.remove("show"),1600);
}

function setPage(page){
  state.page=page;
  $("page-add").classList.toggle("active",page==="add");
  $("page-table").classList.toggle("active",page==="table");
  $("addNav").classList.toggle("active",page==="add");
  $("tableNav").classList.toggle("active",page==="table");
  if(page==="table"){renderTable();loadRemote();}
}

function renderTable(){
  const wrap=$("tableWrap");
  if(!state.rows.length){wrap.innerHTML=`<div class="empty">Brak zapisów.</div>`;return;}
  wrap.innerHTML=`<table><thead><tr><th>Data</th><th>Godzina</th><th>Wartość</th><th></th></tr></thead><tbody>${state.rows.map(row=>`<tr><td>${escapeHtml(toPlDate(row.date))}</td><td>${escapeHtml(normalizeTime(row.time))}</td><td class="value">${escapeHtml(String(row.value))}</td><td class="actions"><button class="icon-btn" data-edit="${escapeHtml(row.id)}" title="Edytuj">✏️</button><button class="icon-btn danger" data-delete="${escapeHtml(row.id)}" title="Usuń">🗑️</button></td></tr>`).join("")}</tbody></table>`;
  wrap.querySelectorAll("[data-edit]").forEach(btn=>btn.addEventListener("click",()=>startEdit(Number(btn.dataset.edit))));
  wrap.querySelectorAll("[data-delete]").forEach(btn=>btn.addEventListener("click",()=>deleteRow(Number(btn.dataset.delete))));
}

function startEdit(id){
  const row=state.rows.find(r=>Number(r.id)===Number(id));
  if(!row)return;
  state.editingId=Number(id);
  $("editValue").value=String(row.value);
  $("editDate").value=row.date;
  $("editTime").value=normalizeTime(row.time);
  $("editPanel").classList.add("active");
  $("editPanel").scrollIntoView({behavior:"smooth",block:"start"});
}
function cancelEdit(){state.editingId=null;$("editPanel").classList.remove("active");}

async function saveEdit(){
  if(!state.editingId)return;
  const id=state.editingId;
  const payload={id,value:$("editValue").value,date:$("editDate").value,time:roundTo10Minutes($("editTime").value)};
  if(!payload.date||!payload.time||!payload.value){alert("Uzupełnij wartość, datę i godzinę.");return;}
  try{
    await api.update(payload);
    const index=state.rows.findIndex(r=>Number(r.id)===Number(id));
    if(index>=0)state.rows[index]=payload;
    saveCache();cancelEdit();renderTable();
  }catch(err){alert(`Błąd zapisu: ${err.message}`);}
}

async function deleteRow(id){
  if(!confirm("Usunąć ten zapis?"))return;
  try{
    await api.delete(id);
    state.rows=state.rows.filter(row=>Number(row.id)!==Number(id));
    saveCache();
    if(state.editingId===id)cancelEdit();
    renderTable();
  }catch(err){alert(`Błąd usuwania: ${err.message}`);}
}

function clearLocalCache(){localStorage.removeItem(CACHE_KEY);state.rows=[];renderTable();}
function toDateInputValue(date){const y=date.getFullYear();const m=String(date.getMonth()+1).padStart(2,"0");const d=String(date.getDate()).padStart(2,"0");return `${y}-${m}-${d}`;}
function toPlDate(value){if(!value||!String(value).includes("-"))return value||"";const[y,m,d]=String(value).split("-");return `${d}.${m}.${y}`;}
function normalizeTime(value){if(!value)return"";return String(value).slice(0,5);}
function roundTo10Minutes(time){if(!time)return"";const[h,m]=time.split(":").map(Number);const total=h*60+m;const rounded=Math.round(total/10)*10;const hh=String(Math.floor(rounded/60)%24).padStart(2,"0");const mm=String(rounded%60).padStart(2,"0");return `${hh}:${mm}`;}
function escapeHtml(value){return String(value).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");}

document.querySelectorAll("[data-value]").forEach(btn=>btn.addEventListener("click",()=>addValue(btn.dataset.value)));
$("addNav").addEventListener("click",()=>setPage("add"));
$("tableNav").addEventListener("click",()=>setPage("table"));
$("refreshBtn").addEventListener("click",loadRemote);
$("clearLocalBtn").addEventListener("click",clearLocalCache);
$("saveEditBtn").addEventListener("click",saveEdit);
$("cancelEditBtn").addEventListener("click",cancelEdit);

if("serviceWorker"in navigator){navigator.serviceWorker.register("./sw.js").catch(()=>{});}
renderTable();
loadRemote();
