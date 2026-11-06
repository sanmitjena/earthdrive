/* One readout shared by road, rail and flight modes. Distances follow routes where available. */
function updateDrivingHUD(){
 const flying=!!flight?.active,rail=!!trainMode?.active,isBus=!!bus?.active;
 const nearby=nearbyPlaces.filter(p=>p.town).sort((a,b)=>Math.hypot(a.x-car.x,a.z-car.z)-Math.hypot(b.x-car.x,b.z-car.z))[0];
 $('moving-location').textContent=nearby&&Math.hypot(nearby.x-car.x,nearby.z-car.z)<2500?nearby.name:placeName;
 let label='Free exploration',km=null;
 if(flying){label=flight.arrival.name||flight.arrival.code;km=M.distanceKm(M.unproject(car.x,car.z,origin),flight.arrival);}
 else if(rail&&!trainMode.free){label=trainMode.journey.to.name;km=Math.max(0,trainMode.journey.length-trainMode.progress)/1000;}
 else if(route&&routeShape){label=route.to.name;km=M.routeProgress(car.x,car.z,routeShape).remaining*route.distance/(routeShape.total||1)/1000;}
 const distance=$('destination-distance');if(!distance.querySelector('.destination-label')){const name=document.createElement('span'),remaining=document.createElement('strong');name.className='destination-label';remaining.className='remaining-large';distance.replaceChildren(name,remaining);}
 distance.querySelector('.destination-label').textContent=km===null?label:'→ '+label;
 const remaining=distance.querySelector('.remaining-large');remaining.hidden=km===null;remaining.textContent=km===null?'':(km<1?Math.round(km*1000)+' m':km.toFixed(1)+' km')+' remaining';
 const speed=Math.abs(car.speed)*3.6,max=flying||rail?2000:isBus?100:250;
 $('speed-needle').style.transform=`rotate(${-130+Math.min(1,speed/max)*260}deg)`;
 $('gear-controls').hidden=flying||rail||isBus;$('gear-limit').textContent=(typeof AutoGear!=='undefined'&&AutoGear.enabled?'AUTO · ':'GEAR · ')+(car.gear||1);
 document.querySelectorAll('[data-dial-value]').forEach(el=>el.textContent=Math.round(+el.dataset.dialValue*max));
}
window.addEventListener('DOMContentLoaded',()=>{
 car.gear=1;const shift=n=>{if(flight?.active||trainMode?.active||bus?.active)return;if(typeof AutoGear!=='undefined')AutoGear.set(false);car.gear=Math.max(1,Math.min(5,(car.gear||1)+n));};
 $('gear-up').onclick=()=>shift(1);$('gear-down').onclick=()=>shift(-1);
 window.addEventListener('keydown',e=>{if(e.repeat||document.querySelector('dialog[open]')||/INPUT|SELECT|TEXTAREA/.test(e.target.tagName))return;if(e.code==='KeyE'||e.code==='KeyQ'){shift(e.code==='KeyE'?1:-1);e.preventDefault();}});
 const svg=$('dial-ticks'),ns='http://www.w3.org/2000/svg';for(let i=0;i<=10;i++){const angle=(-220+i*26)*Math.PI/180,x=120+Math.cos(angle)*94,y=120+Math.sin(angle)*94,x2=120+Math.cos(angle)*86,y2=120+Math.sin(angle)*86;const tick=document.createElementNS(ns,'line');for(const [k,v] of Object.entries({x1:x,y1:y,x2,y2,stroke:'#e4eeee','stroke-width':2}))tick.setAttribute(k,v);svg.append(tick);if(i%2===0){const t=document.createElementNS(ns,'text');t.setAttribute('x',120+Math.cos(angle)*73);t.setAttribute('y',124+Math.sin(angle)*73);t.setAttribute('fill','#dce9e9');t.setAttribute('font-size','11');t.setAttribute('text-anchor','middle');t.dataset.dialValue=i/10;t.textContent=i*25;svg.append(t);}}
});
