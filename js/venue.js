// ── VENUE CARD ────────────────────────────────────────────────────────────────
function openVenue(name,type) {
  currentVenue=name;
  const p=PLACES.find(x=>x.name===name)||{name,rating:4.5,bg:'#888',emoji:'🏠',hours:'11:00–23:00'};
  document.getElementById('vn').textContent=name;
  document.getElementById('va').textContent=type+' · City Center';
  const vhbg=document.getElementById('vh-bg');
  vhbg.style.background=p.bg;vhbg.textContent=p.emoji;
  document.getElementById('vrating').textContent=p.rating;
  document.getElementById('vhours').textContent=p.hours||'11:00–23:00';
  // Stars
  const sc=document.getElementById('vstars');sc.innerHTML='';
  for(let i=1;i<=5;i++){const s=document.createElement('span');s.className='vstar '+(i<=Math.round(p.rating)?'on':'off');s.textContent='★';sc.appendChild(s);}
  // Fav icon
  const favBtn=document.getElementById('fav-btn-v');
  const favIc=document.getElementById('fav-icon-v');
  if(favSet.has(name)){favBtn.classList.add('faved');favIc.setAttribute('fill','#F5C518');favIc.setAttribute('stroke','#F5C518');}
  else{favBtn.classList.remove('faved');favIc.setAttribute('fill','none');favIc.setAttribute('stroke','#fff');}
  // Find the way button
  document.getElementById('btn-find-way').onclick=()=>findTheWay(name);
  // Reset tabs
  document.querySelectorAll('.vtab').forEach((t,i)=>{t.className='vtab'+(i===0?' active':'');});
  document.querySelectorAll('.vtab-panel').forEach((p2,i)=>{p2.className='vtab-panel'+(i===0?' active':'');});
  showScreen('venue-screen');
}

function switchVTab(el,id){
  el.closest('.venue-body').querySelectorAll('.vtab').forEach(t=>t.classList.remove('active'));
  el.closest('.venue-body').querySelectorAll('.vtab-panel').forEach(p=>p.classList.remove('active'));
  el.classList.add('active');document.getElementById(id).classList.add('active');
}

// ── SHARE ────────────────────────────────────────────────────────────────────
function shareVenue(){
  const name=document.getElementById('vn').textContent;
  const addr=document.getElementById('va').textContent;
  if(navigator.share){navigator.share({title:name,text:`Check out ${name} — ${addr}`,url:window.location.href}).catch(()=>{});}
  else{
    if(navigator.clipboard){navigator.clipboard.writeText(`${name} — ${addr}`).then(()=>showToast('📋 Link copied to clipboard!'));}
    else{showToast('📋 Link copied!');}
  }
}

// ── FAVORITES ────────────────────────────────────────────────────────────────
function toggleFavVenue(){
  const name=document.getElementById('vn').textContent;
  const favBtn=document.getElementById('fav-btn-v');
  const favIc=document.getElementById('fav-icon-v');
  if(favSet.has(name)){
    favSet.delete(name);favBtn.classList.remove('faved');
    favIc.setAttribute('fill','none');favIc.setAttribute('stroke','#fff');
    showToast('Removed from saved places');
  } else {
    favSet.add(name);favBtn.classList.add('faved');
    favIc.setAttribute('fill','#F5C518');favIc.setAttribute('stroke','#F5C518');
    showToast('❤️ Added to saved places!');
  }
}

// ── DELIVERY ────────────────────────────────────────────────────────────────
function openDelivery(){document.getElementById('delivery-overlay').classList.add('open');}
function closeDelivery(){document.getElementById('delivery-overlay').classList.remove('open');}

// ── AI ───────────────────────────────────────────────────────────────────────
function openAI(){document.getElementById('ai-overlay').classList.add('open');}
function closeAI(){document.getElementById('ai-overlay').classList.remove('open');}

async function sendAI(text){
  if(!text||!text.trim())return;
  const inp=document.getElementById('ai-inp');inp.value='';
  const msgs=document.getElementById('ai-msgs');
  msgs.innerHTML+=`<div class="ai-msg user"><div class="bub">${text}</div></div>`;
  const lid='l'+Date.now();
  msgs.innerHTML+=`<div class="ai-msg bot" id="${lid}"><div class="ai-loading"><span></span><span></span><span></span></div></div>`;
  msgs.scrollTop=msgs.scrollHeight;
  const ctx=JSON.stringify(PLACES.map(p=>({name:p.name,type:p.type,rating:p.rating,is_live:p.is_live,has_event_today:p.has_event_today})));
  try{
    const r=await fetch('https://api.anthropic.com/v1/messages',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({model:'claude-sonnet-4-20250514',max_tokens:1000,system:`You are Vibes AI for "Vibes in the City" app. Be warm, concise, use 1-2 emoji. Available venues: ${ctx}. Recommend specific venues by name.`,messages:[{role:'user',content:text}]})});
    const d=await r.json();
    const reply=d.content?.[0]?.text||"Try again in a moment!";
    document.getElementById(lid).outerHTML=`<div class="ai-msg bot"><div class="bub">${reply}</div></div>`;
  }catch{
    document.getElementById(lid).outerHTML=`<div class="ai-msg bot"><div class="bub">🔌 Connect to the internet for AI recommendations.</div></div>`;
  }
  msgs.scrollTop=msgs.scrollHeight;
}

// ── FILTER SCREEN ────────────────────────────────────────────────────────────
function toggleChip(el){el.classList.toggle('chip-on');}
function selectRating(el){el.classList.toggle('chip-on');}
function updateDist(v){
  const slider=document.getElementById('dist-slider');
  const pct=(v-5)/(50-5)*100;
  slider.style.background=`linear-gradient(to right,#222 0%,#222 ${pct}%,#ddd ${pct}%)`;
  const sv=document.getElementById('dist-val');if(sv){sv.textContent=v+'km';};
}
function clearFilters(){
  document.querySelectorAll('.chip-on').forEach(c=>c.classList.remove('chip-on'));
  document.getElementById('dist-slider').value=10;updateDist(10);
}
function applyFilters(){showScreen('map-screen');showToast('🔍 Filters applied!');}

// ── DATE PILLS ───────────────────────────────────────────────────────────────
function selDate(el){document.querySelectorAll('.dpill').forEach(d=>d.classList.remove('active'));el.classList.add('active');}

// ── TOAST ────────────────────────────────────────────────────────────────────
function showToast(msg){
  const t=document.getElementById('toast');t.textContent=msg;t.classList.add('show');
  setTimeout(()=>t.classList.remove('show'),2200);
}

// ── INIT ─────────────────────────────────────────────────────────────────────
// ── INIT
function safeInitMap(){
  try{
    if(typeof L==='undefined'){
      document.getElementById('leaflet-map').innerHTML='<div style="width:100%;height:100%;background:#e8ecf2;display:flex;flex-direction:column;align-items:center;justify-content:center;"><div style="font-size:40px">🗺</div><p style="font-size:14px;color:#666;margin-top:10px">Map needs internet connection</p></div>';
      return;
    }
    initMap();
  }catch(e){console.warn('Map:',e);}
}
setTimeout(()=>{showScreen('map-screen');setTimeout(safeInitMap,400);},2500);