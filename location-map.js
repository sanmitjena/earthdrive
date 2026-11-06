/* Demand-loaded map tiles; no geocoding is required to select an unnamed place. */
const LocationMap={
 zoom:5,center:{lat:22.5,lon:79},point:null,which:'from',tiles:new Map(),drag:null,
 pixel(geo){const p=M.mercatorTile(geo.lat,geo.lon,this.zoom);return {x:p.x*256,y:p.y*256};},
 geo(x,y){const size=256*2**this.zoom;return M.tileLatLon(((x%size)+size)%size/256,Math.max(0,Math.min(size,y))/256,this.zoom);},
 screenPoint(x,y){const box=$('location-map').getBoundingClientRect(),center=this.pixel(this.center);return this.geo(center.x+x-box.width/2,center.y+y-box.height/2);},
 open(which){this.which=which;this.point=which==='from'?fromPoint:toPoint;this.center=this.point||fromPoint||(ready?M.unproject(car.x,car.z,origin):{lat:22.5,lon:79});this.zoom=this.point||fromPoint||ready?13:5;$('location-map-title').textContent=which==='from'?'Select starting point':'Select destination';$('location-map-confirm').textContent=which==='from'?'Use this starting point':'Use this destination';$('location-map-query').value='';$('location-map-results').replaceChildren();$('location-map-dialog').showModal();this.updateSelection();this.render();$('location-map').focus();this.locate(false);},
 locate(force=false){
  if(!navigator.geolocation){$('location-map-status').textContent='Location is unavailable in this browser. Search for a nearby city or move the map.';return;}
  const request=this.locationRequest=(this.locationRequest||0)+1,center=this.center,point=this.point,zoom=this.zoom;
  $('location-map-status').textContent='Allow location access to show your nearby area. You can still search or move the map.';
  navigator.geolocation.getCurrentPosition(position=>{
   if(request!==this.locationRequest||!$('location-map-dialog').open)return;
   this.nearby={lat:position.coords.latitude,lon:position.coords.longitude};
   if(this.center===center&&this.point===point&&this.zoom===zoom&&(force||!this.point&&!fromPoint)){this.center={...this.nearby};this.zoom=15;}
   this.updateSelection();this.render();
   if(!this.point)$('location-map-status').textContent='Your location is the blue dot. Click a nearby road or place to choose it.';
  },error=>{
   if(request!==this.locationRequest||!$('location-map-dialog').open)return;
   if(this.point){this.updateSelection();return;}
   $('location-map-status').textContent=error.code===1?'Location permission was declined. You can allow it in browser settings, retry Nearby me, or search for a city.':'Could not get your location. Retry Nearby me, search for a city, or move the map.';
  },{enableHighAccuracy:true,timeout:15000,maximumAge:60000});
 },
 select(point){this.point={lat:point.lat,lon:point.lon};this.updateSelection();this.render();},
 updateSelection(){$('location-map-confirm').disabled=!this.point;$('location-map-status').textContent=this.point?`Selected: ${this.point.lat.toFixed(5)}, ${this.point.lon.toFixed(5)} · your vehicle starts on the nearest mapped road.`:'Click any place, even if its name is not listed. Keyboard: arrows move, Enter selects the centre.';},
 render(){if(!$('location-map-dialog').open)return;const map=$('location-map'),{width,height}=map.getBoundingClientRect();if(!width||!height)return;const center=this.pixel(this.center),left=center.x-width/2,top=center.y-height/2,n=2**this.zoom,visible=new Set();
  for(let y=Math.floor(top/256);y<=Math.floor((top+height)/256);y++)for(let x=Math.floor(left/256);x<=Math.floor((left+width)/256);x++){if(y<0||y>=n)continue;const key=this.zoom+'/'+x+'/'+y;visible.add(key);let img=this.tiles.get(key);if(!img){img=document.createElement('img');img.alt='';img.draggable=false;img.src=`https://tile.openstreetmap.org/${this.zoom}/${((x%n)+n)%n}/${y}.png`;img.onerror=()=>{$('location-map-status').textContent='Some map tiles could not load. Check your connection or search for a nearby city.';};this.tiles.set(key,img);$('location-map-tiles').append(img);}img.style.left=(x*256-left)+'px';img.style.top=(y*256-top)+'px';}
  for(const [key,img] of this.tiles)if(!visible.has(key)){img.remove();this.tiles.delete(key);}const dot=$('location-map-you');dot.hidden=!this.nearby;if(this.nearby){const p=this.pixel(this.nearby),world=256*n;let dx=p.x-center.x;dx-=Math.round(dx/world)*world;dot.style.left=(width/2+dx)+'px';dot.style.top=(height/2+p.y-center.y)+'px';}const pin=$('location-map-pin');pin.hidden=!this.point;if(this.point){const p=this.pixel(this.point),world=256*n;let dx=p.x-center.x;dx-=Math.round(dx/world)*world;pin.style.left=(width/2+dx)+'px';pin.style.top=(height/2+p.y-center.y)+'px';}
 },
 zoomBy(delta){this.zoom=Math.max(2,Math.min(19,this.zoom+delta));this.render();},
 async search(event){event.preventDefault();const query=$('location-map-query').value.trim();if(query.length<2)return;const results=$('location-map-results');results.textContent='Finding city…';try{const data=await fetchJSON('https://photon.komoot.io/api/?q='+encodeURIComponent(query)+'&limit=5&lang=en');results.replaceChildren();if(!data.features?.length){results.textContent='No match. You can still move the map and choose any point.';return;}for(const feature of data.features){const p=feature.properties,[lon,lat]=feature.geometry.coordinates,button=document.createElement('button');button.type='button';button.textContent=[p.name||query,p.state,p.country].filter(Boolean).join(', ');button.onclick=()=>{this.center={lat,lon};this.zoom=14;this.point=null;results.replaceChildren();this.updateSelection();this.render();$('location-map').focus();};results.append(button);}}catch{results.textContent='City search unavailable. Move and zoom the map instead.';}
 }
};
$('location-map-nearby').onclick=()=>LocationMap.locate(true);
$('select-map-from').onclick=()=>LocationMap.open('from');$('select-map-to').onclick=()=>LocationMap.open('to');
$('location-map-cancel').onclick=()=>$('location-map-dialog').close();
$('location-map-confirm').onclick=()=>{const p=LocationMap.point;if(!p)return;selectJourneyPoint(LocationMap.which,{...p,name:`Map point · ${p.lat.toFixed(5)}, ${p.lon.toFixed(5)}`,region:'Selected on map · nearest mapped road'});$('location-map-dialog').close();};
$('location-map-plus').onclick=()=>LocationMap.zoomBy(1);$('location-map-minus').onclick=()=>LocationMap.zoomBy(-1);$('location-map-search').onsubmit=e=>LocationMap.search(e);
const pickerMap=$('location-map');
pickerMap.addEventListener('pointerdown',e=>{if(e.target.closest('button,a')||e.button!==0)return;LocationMap.drag={id:e.pointerId,x:e.clientX,y:e.clientY,center:LocationMap.pixel(LocationMap.center),moved:false};pickerMap.setPointerCapture(e.pointerId);});
pickerMap.addEventListener('pointermove',e=>{const d=LocationMap.drag;if(!d||d.id!==e.pointerId)return;const dx=e.clientX-d.x,dy=e.clientY-d.y;if(Math.hypot(dx,dy)>5)d.moved=true;if(d.moved){LocationMap.center=LocationMap.geo(d.center.x-dx,d.center.y-dy);LocationMap.render();}});
pickerMap.addEventListener('pointerup',e=>{const d=LocationMap.drag;if(!d||d.id!==e.pointerId)return;LocationMap.drag=null;if(!d.moved){const box=pickerMap.getBoundingClientRect();LocationMap.select(LocationMap.screenPoint(e.clientX-box.left,e.clientY-box.top));}});
pickerMap.addEventListener('pointercancel',()=>LocationMap.drag=null);
pickerMap.addEventListener('wheel',e=>{e.preventDefault();if(LocationMap.wheelTimer)return;LocationMap.zoomBy(e.deltaY<0?1:-1);LocationMap.wheelTimer=setTimeout(()=>LocationMap.wheelTimer=null,180);},{passive:false});
pickerMap.addEventListener('keydown',e=>{if(e.target!==pickerMap)return;const moves={ArrowLeft:[-100,0],ArrowRight:[100,0],ArrowUp:[0,-100],ArrowDown:[0,100]};if(moves[e.key]){e.preventDefault();const p=LocationMap.pixel(LocationMap.center),[x,y]=moves[e.key];LocationMap.center=LocationMap.geo(p.x+x,p.y+y);LocationMap.render();}else if(e.key==='Enter'){e.preventDefault();LocationMap.select(LocationMap.center);}else if(['+','=','-'].includes(e.key)){e.preventDefault();LocationMap.zoomBy(e.key==='-'?-1:1);}});
new ResizeObserver(()=>LocationMap.render()).observe(pickerMap);
