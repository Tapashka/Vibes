// ── DATA (REST API mock) ───────────────────────────────────────────────────────
const PLACES = [
  {id:1,name:'Cafe Gusto',type:'restaurant',lat:41.6941,lng:44.8008,emoji:'🍽',bg:'linear-gradient(135deg,#b8a080,#8a6a40)',rating:4.6,hours:'11:00–23:00',pinType:'blue',has_event_today:true,is_live:false},
  {id:2,name:'Skybar',type:'bar',lat:41.6960,lng:44.8030,emoji:'🍸',bg:'linear-gradient(135deg,#1877F2,#0EC6B8)',rating:4.8,hours:'18:00–02:00',pinType:'yellow',has_event_today:true,is_live:true},
  {id:3,name:'Hookah Baza',type:'bar',lat:41.6928,lng:44.8018,emoji:'💨',bg:'linear-gradient(135deg,#9C27B0,#E91E63)',rating:4.4,hours:'12:00–03:00',pinType:'white',has_event_today:false,is_live:false},
  {id:4,name:'The Loft',type:'club',lat:41.6950,lng:44.7990,emoji:'🎷',bg:'linear-gradient(135deg,#9c27b0,#3f51b5)',rating:4.7,hours:'20:00–05:00',pinType:'blue',has_event_today:true,is_live:true},
  {id:5,name:'Zen Sushi',type:'restaurant',lat:41.6910,lng:44.8040,emoji:'🍣',bg:'linear-gradient(135deg,#00BCD4,#4CAF50)',rating:4.9,hours:'11:00–23:00',pinType:'white',has_event_today:false,is_live:false},
  {id:6,name:'Neon Club',type:'club',lat:41.6975,lng:44.7970,emoji:'🎵',bg:'linear-gradient(135deg,#3a1c71,#d76d77)',rating:4.3,hours:'23:00–06:00',pinType:'blue',has_event_today:true,is_live:false},
  {id:7,name:'Art House',type:'museum',lat:41.6935,lng:44.7960,emoji:'🖼',bg:'linear-gradient(135deg,#f093fb,#f5576c)',rating:4.5,hours:'10:00–20:00',pinType:'white',has_event_today:false,is_live:false},
  {id:8,name:'Bella Roma',type:'restaurant',lat:41.6922,lng:44.8025,emoji:'🍕',bg:'linear-gradient(135deg,#e91e63,#ff9800)',rating:4.6,hours:'12:00–23:00',pinType:'white',has_event_today:false,is_live:false},
];

const USER_LOC = [41.6941, 44.8008];
let map, markers=[], routeLine=null, prevScreen='map-screen', favSet=new Set(['Skybar','Cafe Gusto','Zen Sushi']), currentVenue=null;

// ── MAP ───────────────────────────────────────────────────────────────────────
function initMap() {
  map = L.map('leaflet-map',{center:USER_LOC,zoom:16,zoomControl:false,attributionControl:false});
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19}).addTo(map);
  renderPins(PLACES);
  // User dot
  const locIcon=L.divIcon({html:'<div style="width:16px;height:16px;background:#1877F2;border-radius:50%;border:3px solid white;box-shadow:0 0 0 6px rgba(24,119,242,.2);"></div>',iconSize:[16,16],iconAnchor:[8,8],className:''});
  L.marker(USER_LOC,{icon:locIcon}).addTo(map);
}

function renderPins(places) {
  markers.forEach(m=>map.removeLayer(m));
  markers=[];
  places.forEach(p=>{
    const pt=p.is_live?'yellow':p.has_event_today?'blue':'white';
    const html=`<div class="photo-pin pin-${pt}" onclick="openVenue('${p.name}','${p.type}')"><div class="pp-wrap"><div class="pp-circle" style="background:${p.bg}">${p.emoji}</div><div class="pp-tail"></div></div></div>`;
    const icon=L.divIcon({html,iconSize:[38,48],iconAnchor:[19,48],className:''});
    markers.push(L.marker([p.lat,p.lng],{icon}).addTo(map));
  });
}

function centerMap(){map&&map.setView(USER_LOC,16);}

function filterCat(el,type){
  document.querySelectorAll('.cat-item').forEach(c=>c.classList.remove('active'));
  el.classList.add('active');
  const filtered=type==='all'?PLACES:PLACES.filter(p=>p.type===type);
  renderPins(filtered);
}

// ── ROUTING ───────────────────────────────────────────────────────────────────
let currentNavVenue=null, currentMode='walk';
const OSRM={walk:'foot',car:'driving'};
const ROUTE_COLORS={walk:'#0EC6B8',car:'#1877F2'};
const TURN_ICONS={
  'turn-left':'<path d="M9 19V6m0 0L4 11m5-5 5 5"/>',
  'turn-right':'<path d="M15 19V6m0 0 5 5m-5-5-5 5"/>',
  'turn-sharp-left':'<path d="M8 19V8L3 13"/>',
  'turn-sharp-right':'<path d="M16 19V8l5 5"/>',
  'roundabout':'<circle cx="12" cy="12" r="4"/><path d="M12 2a10 10 0 0 1 0 20"/>',
  'arrive':'<circle cx="12" cy="12" r="3"/><path d="M12 2v4m0 12v4M2 12h4m12 0h4"/>',
  'depart':'<path d="m12 2 3 7h7l-5.5 4 2 7L12 16l-6.5 4 2-7L2 9h7z"/>',
  'default':'<path d="M5 12h14m-7-7 7 7-7 7"/>'
};

function haversine(a,b){
  const R=6371,dLat=(b[0]-a[0])*Math.PI/180,dLon=(b[1]-a[1])*Math.PI/180;
  const x=Math.sin(dLat/2)**2+Math.cos(a[0]*Math.PI/180)*Math.cos(b[0]*Math.PI/180)*Math.sin(dLon/2)**2;
  return R*2*Math.atan2(Math.sqrt(x),Math.sqrt(1-x));
}

function fmtDist(m){return m<1000?Math.round(m)+'m':(m/1000).toFixed(1)+'km';}
function fmtTime(s){
  const h=Math.floor(s/3600),m=Math.round((s%3600)/60);
  return h>0?`${h}h ${m}m`:`${m} min`;
}
function fmtETA(s){
  const d=new Date(Date.now()+s*1000);
  return d.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});
}
function turnIcon(type){
  const key=Object.keys(TURN_ICONS).find(k=>type&&type.includes(k))||'default';
  return `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5">${TURN_ICONS[key]}</svg>`;
}

function findTheWay(venueName) {
  const p=PLACES.find(x=>x.name===venueName);
  if(!p){showScreen('map-screen');return;}
  currentNavVenue=p;
  currentMode='walk';
  document.getElementById('mode-walk').classList.add('active');
  document.getElementById('mode-car').classList.remove('active');
  showScreen('map-screen');
  setTimeout(()=>{map.invalidateSize();buildRoute(p,'walk');},200);
}

async function buildRoute(p, mode){
  const panel=document.getElementById('nav-panel');
  panel.classList.add('show');
  document.getElementById('nav-dest-name').textContent=p.name;
  document.getElementById('nav-dist').textContent='…';
  document.getElementById('nav-time').textContent='…';
  document.getElementById('nav-eta').textContent='…';
  document.getElementById('nav-steps').innerHTML='<div class="nav-loading">Building route…</div>';

  if(routeLine){map.removeLayer(routeLine);routeLine=null;}

  const profile=OSRM[mode];
  const url=`https://router.project-osrm.org/route/v1/${profile}/${USER_LOC[1]},${USER_LOC[0]};${p.lng},${p.lat}?overview=full&geometries=geojson&steps=true`;

  try{
    const res=await fetch(url);
    const data=await res.json();
    if(!data.routes||!data.routes.length) throw new Error('no route');

    const route=data.routes[0];
    const coords=route.geometry.coordinates.map(c=>[c[1],c[0]]);

    routeLine=L.polyline(coords,{
      color:ROUTE_COLORS[mode],weight:mode==='walk'?5:6,
      opacity:.9,dashArray:mode==='walk'?'10,8':null,
      lineCap:'round',lineJoin:'round'
    }).addTo(map);

    const bounds=L.latLngBounds(coords);
    map.fitBounds(bounds,{padding:[80,60]});

    document.getElementById('nav-dist').textContent=fmtDist(route.distance);
    document.getElementById('nav-time').textContent=fmtTime(route.duration);
    document.getElementById('nav-eta').textContent=fmtETA(route.duration);

    // Build step list
    const steps=route.legs[0].steps;
    const stepsHTML=steps.slice(0,12).map(s=>`
      <div class="nav-step">
        <div class="nav-step-ic">${turnIcon(s.maneuver?.type+'-'+(s.maneuver?.modifier||''))}</div>
        <div class="nav-step-txt">
          <div class="nav-step-inst">${s.name||s.maneuver?.type||'Continue'}</div>
          <div class="nav-step-dist">${fmtDist(s.distance)}</div>
        </div>
      </div>`).join('');
    document.getElementById('nav-steps').innerHTML=stepsHTML||'<div class="nav-loading">Route ready</div>';

  }catch(e){
    // OSRM unreachable — fallback to straight line
    const dist=haversine(USER_LOC,[p.lat,p.lng]);
    routeLine=L.polyline([USER_LOC,[p.lat,p.lng]],{
      color:ROUTE_COLORS[mode],weight:mode==='walk'?5:6,opacity:.85,
      dashArray:mode==='walk'?'10,8':null
    }).addTo(map);
    map.fitBounds(L.latLngBounds([USER_LOC,[p.lat,p.lng]]),{padding:[80,60]});
    const dur=mode==='walk'?dist*13*60:dist*2.5*60;
    document.getElementById('nav-dist').textContent=fmtDist(dist*1000);
    document.getElementById('nav-time').textContent=fmtTime(dur);
    document.getElementById('nav-eta').textContent=fmtETA(dur);
    document.getElementById('nav-steps').innerHTML=`<div class="nav-step"><div class="nav-step-ic"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5"><path d="m12 2 3 7h7l-5.5 4 2 7L12 16l-6.5 4 2-7L2 9h7z"/></svg></div><div class="nav-step-txt"><div class="nav-step-inst">Head towards ${p.name}</div><div class="nav-step-dist">${fmtDist(dist*1000)}</div></div></div>`;
  }
}

function switchMode(mode){
  if(!currentNavVenue)return;
  currentMode=mode;
  document.getElementById('mode-walk').classList.toggle('active',mode==='walk');
  document.getElementById('mode-car').classList.toggle('active',mode==='car');
  buildRoute(currentNavVenue,mode);
}

function openInMaps(){
  if(!currentNavVenue)return;
  const p=currentNavVenue;
  const mode=currentMode==='walk'?'walking':'driving';
  const url=`https://www.google.com/maps/dir/?api=1&origin=${USER_LOC[0]},${USER_LOC[1]}&destination=${p.lat},${p.lng}&travelmode=${mode}`;
  window.open(url,'_blank');
}

function clearRoute(){
  if(routeLine){map.removeLayer(routeLine);routeLine=null;}
  document.getElementById('nav-panel').classList.remove('show');
  currentNavVenue=null;
  map.setView(USER_LOC,16);
}

// ── SCREEN NAV ────────────────────────────────────────────────────────────────
const NAV_MAP={
  'map-screen':'map','venue-screen':'map','booking-screen':'map','filter-screen':'filter',
  'events-screen':'events','favorites-screen':'favorites',
  'profile-screen':'profile','profile-reservations-screen':'profile','profile-edit-screen':'profile',
  'profile-reviews-screen':'profile','profile-events-screen':'profile',
  'profile-notifications-screen':'profile','profile-privacy-screen':'profile',
  'delivery-overlay':null,'splash':null,'login-screen':null,'biz-login-screen':null,'client-profile-screen':null,'my-managers-screen':null,'add-manager-screen':null,'my-places-screen':null,'add-place-screen':null,'edit-place-screen':null,'my-events-screen':null,'add-event-screen':null,'biz-settings-screen':null,'biz-bookings-screen':null,'biz-reviews-screen':null,'biz-messages-screen':null
};

function showScreen(id) {
  const prev=document.querySelector('.screen.active');
  if(prev&&prev.id!==id) prevScreen=prev.id;
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
  const el=document.getElementById(id);
  if(el) el.classList.add('active');
  // Nav visibility handled by CSS z-index
  // Active nav tab
  document.querySelectorAll('.ni[data-nav]').forEach(n=>n.classList.remove('active'));
  const activeNav=NAV_MAP[id];
  if(activeNav){const ni=document.querySelector(`.ni[data-nav="${activeNav}"]`);if(ni)ni.classList.add('active');}
  // Map invalidate
  if(id==='map-screen') setTimeout(()=>map&&map.invalidateSize(),120);
}

function goBack(){showScreen(prevScreen||'map-screen');}

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


// ── BOOKING ───────────────────────────────────────────────────────────────
let selectedTable=null, guestCount=2, currentFloor=1;

const FLOORS = {
  // x,y = top-left in %, w,h = size in %  (container is 100x100)
  1: [
    {id:'T1', x:3,  y:8,  w:18, h:36, shape:'rect',  taken:false, seats:4, label:'T1'},
    {id:'T2', x:3,  y:56, w:18, h:36, shape:'rect',  taken:true,  seats:4, label:'T2'},
    {id:'T3', x:27, y:8,  w:18, h:36, shape:'rect',  taken:false, seats:4, label:'T3'},
    {id:'T4', x:27, y:56, w:18, h:36, shape:'rect',  taken:false, seats:6, label:'T4'},
    {id:'T5', x:51, y:14, w:16, h:16, shape:'round', taken:true,  seats:2, label:'T5'},
    {id:'T6', x:51, y:60, w:16, h:16, shape:'round', taken:false, seats:2, label:'T6'},
    {id:'T7', x:71, y:8,  w:18, h:36, shape:'rect',  taken:false, seats:4, label:'T7'},
    {id:'T8', x:71, y:56, w:18, h:36, shape:'rect',  taken:true,  seats:4, label:'T8'},
  ],
  2: [
    {id:'T9',  x:3,  y:8,  w:18, h:36, shape:'rect',  taken:false, seats:4, label:'T9'},
    {id:'T10', x:3,  y:56, w:18, h:36, shape:'rect',  taken:true,  seats:4, label:'T10'},
    {id:'T11', x:27, y:14, w:16, h:16, shape:'round', taken:false, seats:2, label:'T11'},
    {id:'T12', x:27, y:60, w:16, h:16, shape:'round', taken:false, seats:2, label:'T12'},
    {id:'T13', x:51, y:8,  w:18, h:36, shape:'rect',  taken:false, seats:6, label:'T13'},
    {id:'T14', x:51, y:56, w:18, h:36, shape:'rect',  taken:true,  seats:6, label:'T14'},
    {id:'T15', x:75, y:14, w:16, h:16, shape:'round', taken:false, seats:2, label:'T15'},
    {id:'T16', x:75, y:60, w:16, h:16, shape:'round', taken:false, seats:2, label:'T16'},
  ],
  3: [
    {id:'TR1', x:3,  y:8,  w:18, h:36, shape:'rect',  taken:false, seats:4, label:'TR1'},
    {id:'TR2', x:3,  y:56, w:18, h:36, shape:'rect',  taken:false, seats:4, label:'TR2'},
    {id:'TR3', x:27, y:14, w:16, h:16, shape:'round', taken:true,  seats:2, label:'TR3'},
    {id:'TR4', x:27, y:60, w:16, h:16, shape:'round', taken:false, seats:2, label:'TR4'},
    {id:'TR5', x:51, y:8,  w:18, h:36, shape:'rect',  taken:false, seats:6, label:'TR5'},
    {id:'TR6', x:51, y:56, w:18, h:36, shape:'rect',  taken:false, seats:4, label:'TR6'},
    {id:'TR7', x:75, y:14, w:16, h:16, shape:'round', taken:false, seats:2, label:'TR7'},
    {id:'TR8', x:75, y:60, w:16, h:16, shape:'round', taken:false, seats:2, label:'TR8'},
  ]
};

function openBooking(){
  const name=document.getElementById('vn').textContent;
  document.getElementById('booking-venue-name').textContent=name;
  // Set today's date
  const today=new Date();
  document.getElementById('booking-date').value=today.toISOString().split('T')[0];
  selectedTable=null;
  guestCount=2;currentFloor=1;
  document.getElementById('g-count').textContent=2;
  document.getElementById('sel-guests').textContent=2;
  document.getElementById('sel-table-label').textContent='not selected';
  document.getElementById('booking-confirm-btn').disabled=true;
  document.querySelectorAll('.floor-tab').forEach((t,i)=>{t.classList.toggle('active',i===0);});
  renderTableMap(1);
  showScreen('booking-screen');
}

function renderTableMap(floor){
  currentFloor=floor;
  selectedTable=null;
  document.getElementById('sel-table-label').textContent='not selected';
  document.getElementById('booking-confirm-btn').disabled=true;
  const map=document.getElementById('table-map');
  const tables=FLOORS[floor]||[];
  // Background decorations
  const floorBg = floor===3
    ? 'linear-gradient(160deg,#e8f5e9,#f1f8e9)'
    : floor===2 ? 'linear-gradient(160deg,#fdf6ff,#f0e8ff)'
    : 'linear-gradient(160deg,#f4f7ff,#eef2ff)';
  const floorLabel = floor===3 ? '🌿 Terrace' : floor===2 ? '🟣 Floor 2' : '🏠 Floor 1';
  let html=`<div style="position:absolute;inset:0;background:${floorBg};border-radius:12px;">`;
  html+=`<div style="position:absolute;top:4px;left:8px;font-size:9px;font-weight:700;color:#aaa;text-transform:uppercase;letter-spacing:.5px;">${floorLabel}</div>`;
  if(floor===3){
    html+=`<div style="position:absolute;right:6px;bottom:6px;font-size:18px;opacity:.25;">🌳</div>`;
    html+=`<div style="position:absolute;left:4px;bottom:10px;font-size:14px;opacity:.2;">🌿</div>`;
  }
  // Draw tables
  tables.forEach(t=>{
    const cls=`tbl ${t.shape==='round'?'round':'rect'} ${t.taken?'taken':'free'}`;
    html+=`<div class="${cls}" id="tbl-${t.id}"
      style="left:${t.x}%;top:${t.y}%;width:${t.w}%;height:${t.h}%;"
      onclick="selectTable('${t.id}',${t.taken},${t.seats},'${t.label}')">
      <div style="text-align:center;line-height:1.2;">
        <div>${t.label}</div>
        <div style="font-size:9px;opacity:.7;">${t.seats}p</div>
      </div>
    </div>`;
  });
  html+=`</div>`;
  map.innerHTML=html;
}

function selectFloor(el,floor){
  document.querySelectorAll('.floor-tab').forEach(t=>t.classList.remove('active'));
  el.classList.add('active');
  renderTableMap(floor);
}

function selectTable(id,taken,seats,label){
  if(taken){showToast('This table is already booked');return;}
  // deselect previous
  document.querySelectorAll('.tbl').forEach(t=>t.classList.remove('selected'));
  if(selectedTable===id){selectedTable=null;document.getElementById('sel-table-label').textContent='not selected';document.getElementById('booking-confirm-btn').disabled=true;return;}
  selectedTable=id;
  const el=document.getElementById('tbl-'+id);
  if(el){el.classList.add('selected');}
  document.getElementById('sel-table-label').textContent=`${label} (${seats} seats)`;
  document.getElementById('booking-confirm-btn').disabled=false;
}

function changeGuests(d){
  guestCount=Math.max(1,Math.min(10,guestCount+d));
  document.getElementById('g-count').textContent=guestCount;
  document.getElementById('sel-guests').textContent=guestCount;
}

function confirmBooking(){
  if(!selectedTable){showToast('Please select a table first');return;}
  const date=document.getElementById('booking-date').value;
  showToast(`✅ Table ${selectedTable} booked for ${guestCount} guests!`);
  setTimeout(()=>showScreen('venue-screen'),1500);
}


function toggleNow(isNow){
  const nowBtn=document.getElementById('now-btn');
  const dtBtn=document.getElementById('add-dt-btn');
  const row=document.getElementById('date-picks-row');
  if(isNow){
    nowBtn.classList.add('now-active');
    dtBtn.classList.remove('dt-active');
    row.style.display='none';
  } else {
    nowBtn.classList.remove('now-active');
    dtBtn.classList.add('dt-active');
    row.style.display='block';
  }
}
function toggleIconChip(el){el.classList.toggle('chip-on');}
function toggleHChip(el){el.classList.toggle('chip-on');}
function toggleFeatToggle(el){el.classList.toggle('chip-on');}
function filterByName(q){
  if(!q.trim()){return;}
  const results=API.search(q);
  renderPins(results.map(p=>({...p,pinType:p.is_live?'yellow':p.has_event_today?'blue':'white'})));
  applyFilters();
}
// Initialize dist slider gradient
document.addEventListener('DOMContentLoaded',()=>updateDist(10));


// ════════════════════════════════════════════════════════════════
// AUTH — LOGIN / REGISTER
// ════════════════════════════════════════════════════════════════
var _role = 'guest'; // 'guest' | 'client'
var _clientData = {name:'Nino Beridze', email:'nino@cafegusto.ge', av:'N'};

function selectRole(r) {
  _role = r;
  var gc = document.getElementById('rc-guest');
  var cc = document.getElementById('rc-client');
  var btn = document.getElementById('login-main-btn');
  if (r === 'guest') {
    gc.classList.add('sel'); cc.classList.remove('sel');
    btn.textContent = 'Enter as Guest';
  } else {
    cc.classList.add('sel'); gc.classList.remove('sel');
    btn.textContent = 'Continue as Business';
  }
}

function doGuestLogin() {
  if (_role === 'client') { showScreen('biz-login-screen'); return; }
  // Guest: go straight to map
  showScreen('map-screen');
  setTimeout(safeInitMap, 300);
}

function bizTab(t) {
  document.getElementById('btab-login').classList.toggle('active', t==='login');
  document.getElementById('btab-register').classList.toggle('active', t==='register');
  document.getElementById('biz-login-fields').style.display = t==='login' ? 'block' : 'none';
  document.getElementById('biz-register-fields').style.display = t==='register' ? 'block' : 'none';
}

function doBizLogin() {
  var email = document.getElementById('bl-email').value.trim();
  var pass  = document.getElementById('bl-pass').value.trim();
  if (!email || !pass) { showToast('Please fill in email and password'); return; }
  _role = 'client';
  _clientData.email = email;
  _clientData.name  = 'Nino Beridze';
  _clientData.av    = email[0].toUpperCase();
  _afterBizLogin();
}

function doBizRegister() { showToast('Account created! ✓'); _afterBizLogin(); }

function doMagicLink() { showToast('Magic link sent to your email 📧'); }

function _afterBizLogin() {
  showScreen('client-profile-screen'); return;
  // update profile nav label
  var lbl = document.querySelector('.ni[data-nav="profile"] span');
  if (lbl) lbl.textContent = 'Business';
  // populate client profile hero
  var el = document.getElementById('cl-name'); if(el) el.textContent = _clientData.name;
  var em = document.getElementById('cl-email-lbl'); if(em) em.textContent = _clientData.email;
  var av = document.getElementById('cl-av'); if(av) av.textContent = _clientData.av;
  // navigate: show map first, profile tab goes to client profile
  showScreen('map-screen');
  setTimeout(safeInitMap, 300);
}

function handleProfileNav() {
  if (_role === 'client') showScreen('client-profile-screen');
  else showScreen('profile-screen');
}

function bizLogout() {
  _role = 'guest';
  var lbl = document.querySelector('.ni[data-nav="profile"] span');
  if (lbl) lbl.textContent = 'Profile';
  showScreen('login-screen');
}

// ════════════════════════════════════════════════════════════════
// MANAGERS
// ════════════════════════════════════════════════════════════════
function editManager(name, surname, email, phone) {
  document.getElementById('mgr-screen-title').textContent = 'Edit Manager';
  document.getElementById('mgr-name').value    = name;
  document.getElementById('mgr-surname').value = surname;
  document.getElementById('mgr-email').value   = email;
  document.getElementById('mgr-phone').value   = phone;
  document.getElementById('mgr-delete-btn').style.display = 'block';
  showScreen('add-manager-screen');
}

function saveManager() {
  var n = document.getElementById('mgr-name').value.trim();
  var s = document.getElementById('mgr-surname').value.trim();
  var e = document.getElementById('mgr-email').value.trim();
  if (!n || !e) { showToast('Name and email are required'); return; }
  showToast('Manager saved ✓');
  goBack();
}

function deleteManager() {
  showToast('Manager removed');
  goBack();
}

// ════════════════════════════════════════════════════════════════
// PLACES
// ════════════════════════════════════════════════════════════════
function toggleChipEl(el) { el.classList.toggle('on'); }

function setPlaceStatus(el, status) {
  var pub = document.getElementById('ps-pub');
  var dft = document.getElementById('ps-dft');
  if (status === 'published') {
    pub.style.borderColor='#2ECC40'; pub.style.background='#E8FDF0'; pub.style.color='#00803A';
    dft.style.borderColor='#eee';   dft.style.background='#fafafa'; dft.style.color='#888';
  } else {
    dft.style.borderColor='#FF9800'; dft.style.background='#FFF8E1'; dft.style.color='#E65100';
    pub.style.borderColor='#eee';   pub.style.background='#fafafa'; pub.style.color='#888';
  }
}

function saveDraft() { showToast('Saved as draft ✓'); goBack(); }

function publishPlace() {
  var name = document.querySelector('#add-place-screen .f-input');
  if (!name || !name.value.trim()) { showToast('Please enter a venue name'); return; }
  showToast('Place published! ✓');
  goBack();
}

// ════════════════════════════════════════════════════════════════
// EVENTS
// ════════════════════════════════════════════════════════════════
function publishEvent() { showToast('Event published! ✓'); goBack(); }

// ════════════════════════════════════════════════════════════════
// UPDATED showScreen — handles new screens
// ════════════════════════════════════════════════════════════════


var _aiTone='party';
function setTone(t){_aiTone=t;['party','chill','premium'].forEach(x=>{var e=document.getElementById('tone-'+x);if(e)e.classList.toggle('on',x===t);});}
function getEvFields(){var s=document.getElementById('add-event-screen');if(!s)return{};var inputs=s.querySelectorAll('input,textarea,select');var name='',place='',date='',desc='';inputs.forEach(e=>{var ph=e.placeholder||'';var v=e.value||'';if(ph.includes('Event Name')||ph.includes('Jazz'))name=v;if(e.tagName==='SELECT'&&e.selectedIndex>0)place=e.options[e.selectedIndex].text;if(e.type==='date')date=v;if(e.tagName==='TEXTAREA')desc=v;});return{name:name||'Event',place:place||'Tbilisi Venue',date:date||'This weekend',desc:desc||'An amazing event'};}
async function genContent(platform){var f=getEvFields();var ld=document.getElementById('ai-loading');var res=document.getElementById('ai-result');var lbl=document.getElementById('ai-result-label');var txt=document.getElementById('ai-result-text');if(!ld)return;res.style.display='none';ld.style.display='block';var sys="You are a social media marketing expert for nightlife, restaurants, and events. Tone: "+_aiTone+". Create short, catchy, emotional content with CTA.";var prompts={tiktok:"TikTok content for event:\nName: "+f.name+"\nPlace: "+f.place+"\nDate: "+f.date+"\nDesc: "+f.desc+"\n\nOutput:\n1. Hook (2 sec)\n2. Caption (2 lines)\n3. Hashtags (5-8)\nMake it viral, energetic, feel like 'go there tonight'",instagram:"Instagram post:\nName: "+f.name+"\nPlace: "+f.place+"\nDate: "+f.date+"\nDesc: "+f.desc+"\n\nOutput:\n1. Caption (3-5 lines)\n2. Hashtags (8-12)\nAesthetic, atmospheric, emotional",facebook:"Facebook event post:\nName: "+f.name+"\nPlace: "+f.place+"\nDate: "+f.date+"\nDesc: "+f.desc+"\n\nFull post (5-8 lines): what, where, when, why, CTA",improve:"Rewrite this description to be more emotional and engaging (3-5 lines):\n\n"+f.desc};var labels={tiktok:'🎵 TikTok',instagram:'📸 Instagram',facebook:'👥 Facebook',improve:'✨ Improved'};try{var r=await fetch('https://api.anthropic.com/v1/messages',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({model:'claude-sonnet-4-20250514',max_tokens:500,system:sys,messages:[{role:'user',content:prompts[platform]}]})});var data=await r.json();var content=data.content&&data.content[0]?data.content[0].text:'Error';ld.style.display='none';lbl.textContent=labels[platform];txt.textContent=content;res.style.display='block';if(platform==='improve'){var ta=document.querySelector('#add-event-screen textarea');if(ta)ta.value=content;}}catch(e){ld.style.display='none';lbl.textContent='Error';txt.textContent='Connection error';res.style.display='block';}}
function copyAIResult(){var t=document.getElementById('ai-result-text');if(!t)return;if(navigator.clipboard)navigator.clipboard.writeText(t.textContent).then(()=>showToast('Copied! 📋'));else{var ta=document.createElement('textarea');ta.value=t.textContent;document.body.appendChild(ta);ta.select();document.execCommand('copy');document.body.removeChild(ta);showToast('Copied! 📋');}}


function focusSearch(){var i=document.getElementById('search-inp');if(i)i.focus();}
function openSearch(){var o=document.getElementById('search-drop');if(o&&!o.classList.contains('open')){o.classList.add('open');resetSR();}}
function closeSearch(){var o=document.getElementById('search-drop');if(o)o.classList.remove('open');}
var _SD=[
  {n:'Cafe Gusto',t:'place',s:'Italian 0.5km',ic:String.fromCodePoint(0x1F37D),bg:'linear-gradient(135deg,#b8a080,#8a6a40)',a:"closeSearch();openVenue('Cafe Gusto','Italian')"},
  {n:'Skybar',t:'place',s:'Rooftop 0.3km',ic:String.fromCodePoint(0x1F378),bg:'linear-gradient(135deg,#1877F2,#0EC6B8)',a:"closeSearch();openVenue('Skybar','Rooftop Bar')"},
  {n:'Zen Sushi',t:'place',s:'Japanese 1.1km',ic:String.fromCodePoint(0x1F363),bg:'linear-gradient(135deg,#00BCD4,#4CAF50)',a:"closeSearch();openVenue('Zen Sushi','Japanese')"},
  {n:'Sunset Jazz',t:'event',s:'Tonight 20:00',ic:String.fromCodePoint(0x1F3B7),bg:'linear-gradient(135deg,#0d2b6e,#0EC6B8)',a:"closeSearch();showScreen('events-screen')"},
];
function _row(d){return '<div class="search-drop-item" onclick="'+d.a+'"><div class="search-drop-icon" style="background:'+d.bg+'">'+d.ic+'</div><div class="search-drop-info"><h4>'+d.n+'</h4><p>'+d.s+'</p></div><span class="search-drop-badge '+d.t+'">'+(d.t==='event'?'Event':'Venue')+'</span></div>';}
function resetSR(){var r=document.getElementById('search-results-drop');if(r)r.innerHTML=_SD.map(_row).join('');}
function liveSearch(q){var r=document.getElementById('search-results-drop');if(!r)return;if(!q){resetSR();return;}var m=_SD.filter(function(d){return d.n.toLowerCase().includes(q.toLowerCase());});r.innerHTML=m.length?m.map(_row).join(''):'<div style="padding:12px;text-align:center;color:#aaa;">No results</div>';}
