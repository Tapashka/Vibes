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