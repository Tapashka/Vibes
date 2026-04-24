function openSearch(){var o=document.getElementById('search-drop');if(o&&!o.classList.contains('open')){o.classList.add('open');resetSR();}}
function closeSearch(){var o=document.getElementById('search-drop');if(o)o.classList.remove('open');}
function focusSearch(){var i=document.getElementById('search-inp');if(i)i.focus();}
function liveSearch(q){var r=document.getElementById('search-results-drop');if(!r)return;if(!q){resetSR();return;}var m=_SD.filter(function(d){return d.n.toLowerCase().includes(q.toLowerCase());});r.innerHTML=m.length?m.map(_row).join(''):'<div style="padding:12px;text-align:center;color:#aaa;">No results</div>';}
function resetSR(){var r=document.getElementById('search-results-drop');if(r)r.innerHTML=_SD.map(_row).join('');}
function _row(d){return '<div class="search-drop-item" onclick="'+d.a+'"><div class="search-drop-icon" style="background:'+d.bg+'">'+d.ic+'</div><div class="search-drop-info"><h4>'+d.n+'</h4><p>'+d.s+'</p></div><span class="search-drop-badge '+d.t+'">'+(d.t==='event'?'Event':'Venue')+'</span></div>';}
var _SD=[

function setTone(t){_aiTone=t;['party','chill','premium'].forEach(x=>{var e=document.getElementById('tone-'+x);if(e)e.classList.toggle('on',x===t);});}
function getEvFields(){var s=document.getElementById('add-event-screen');if(!s)return{};var inputs=s.querySelectorAll('input,textarea,select');var name='',place='',date='',desc='';inputs.forEach(e=>{var ph=e.placeholder||'';var v=e.value||'';if(ph.includes('Event Name')||ph.includes('Jazz'))name=v;if(e.tagName==='SELECT'&&e.selectedIndex>0)place=e.options[e.selectedIndex].text;if(e.type==='date')date=v;if(e.tagName==='TEXTAREA')desc=v;});return{name:name||'Event',place:place||'Tbilisi Venue',date:date||'This weekend',desc:desc||'An amazing event'};}