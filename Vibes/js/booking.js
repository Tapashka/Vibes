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