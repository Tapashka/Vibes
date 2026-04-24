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