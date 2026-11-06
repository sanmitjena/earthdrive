/* Shared geographic and driving math. Coordinates are metres east/south. */
const DriveMath = {
 chasePosition(x,y,z,heading,flight){const distance=flight?20:8,height=flight?5:3.2;return {x:x-Math.sin(heading)*distance,y:y+height,z:z-Math.cos(heading)*distance};},
 onRunway(x,z,runways,origin){return runways.some(r=>{const a=this.project(r.a.lat,r.a.lon,origin),b=this.project(r.b.lat,r.b.lon,origin),dx=b.x-a.x,dz=b.z-a.z,l2=dx*dx+dz*dz,t=((x-a.x)*dx+(z-a.z)*dz)/l2;return t>=0&&t<=1&&Math.hypot(x-a.x-t*dx,z-a.z-t*dz)<=r.width/2;});},
 roadAppearance(tags){if(this.classifyRoad(tags).label==='National highway')return '#121516';if(['path','track','footway','bridleway'].includes(tags.highway)||['unpaved','dirt','ground','gravel','earth','sand'].includes(tags.surface))return '#d3c29c';return '#62696b';},
 sceneryFeature(tags){return !!(tags&&(tags.power||tags.building||tags.place||tags.railway||tags.waterway||tags.water||tags.man_made||tags.enforcement||tags.shop||tags.office||tags.amenity||tags.public_transport||['bus_stop','traffic_signals','speed_camera'].includes(tags.highway)||tags.natural==='tree'||['wood','scrub','water'].includes(tags.natural)||['forest','orchard','meadow','grass'].includes(tags.landuse)||['park','garden'].includes(tags.leisure)||['runway','taxiway','apron','terminal'].includes(tags.aeroway)||['attraction','museum','viewpoint'].includes(tags.tourism)));},
 distanceKm(a,b){const r=Math.PI/180,dlat=(b.lat-a.lat)*r,dlon=(b.lon-a.lon)*r,h=Math.sin(dlat/2)**2+Math.cos(a.lat*r)*Math.cos(b.lat*r)*Math.sin(dlon/2)**2;return 6371*2*Math.atan2(Math.sqrt(h),Math.sqrt(Math.max(0,1-h)));},
 flightStep(state,input,dt,ground){const previousAltitude=state.altitude;state.throttle=Math.max(0,Math.min(1,state.throttle+(input.throttle||0)*dt*.25));state.speed=Math.max(0,Math.min((state.jet?920:state.light?280:2000)/3.6,state.speed+(state.throttle*(state.jet?8:state.light?12:55)-1.3-state.speed*.025-(input.brake?(state.jet?5:12):0))*dt));state.roll+=(Math.max(-.7,Math.min(.7,input.roll||0))*.7-state.roll)*Math.min(1,dt*3);state.pitch=Math.max(-.3,Math.min(.3,state.pitch+(input.pitch||0)*dt*.18));state.pitch*=Math.exp(-dt*.2);state.heading-=state.roll*dt*.34*Math.min(1,state.speed/30);const liftSpeed=state.jet?75:28,climb=state.speed>liftSpeed?Math.sin(state.pitch)*state.speed:-(liftSpeed-state.speed)*.4;state.altitude+=climb*dt;state.x+=Math.sin(state.heading)*state.speed*Math.cos(state.pitch)*dt;state.z+=Math.cos(state.heading)*state.speed*Math.cos(state.pitch)*dt;const floor=ground(state.x,state.z)+(state.clearance||1.5);if(state.altitude<floor){const impact=climb<-5&&previousAltitude>floor+2;state.altitude=floor;state.pitch=Math.max(0,state.pitch);state.hardImpact=impact;if(impact)state.speed*=.3;state.grounded=true;}else state.grounded=false;return state;},

 decodeTerrarium(r,g,b){return r*256+g+b/256-32768;},
 bilinear(a,b,c,d,u,v){return a*(1-u)*(1-v)+b*u*(1-v)+c*(1-u)*v+d*u*v;},
 heightOnGrid(grid,x,z){const n=grid.resolution,u=Math.max(0,Math.min(n,(x-grid.minX)/grid.step)),v=Math.max(0,Math.min(n,(z-grid.minZ)/grid.step)),i=Math.min(n-1,Math.floor(u)),j=Math.min(n-1,Math.floor(v)),a=grid.values[j*(n+1)+i],b=grid.values[j*(n+1)+i+1],c=grid.values[(j+1)*(n+1)+i],d=grid.values[(j+1)*(n+1)+i+1],fx=u-i,fz=v-j;return fx+fz<=1?a+fx*(b-a)+fz*(c-a):d+(1-fx)*(c-d)+(1-fz)*(b-d);},
 densify(points,maxStep=12){const result=[points[0]];for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i],count=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/maxStep));for(let k=1;k<=count;k++)result.push({x:a.x+(b.x-a.x)*k/count,z:a.z+(b.z-a.z)*k/count});}return result;},
 mercatorTile(lat,lon,zoom){const n=2**zoom,r=Math.max(-85.05112878,Math.min(85.05112878,lat))*Math.PI/180;return {x:(lon+180)/360*n,y:(1-Math.asinh(Math.tan(r))/Math.PI)/2*n};},
 tileLatLon(x,y,zoom){const n=2**zoom;return {lat:Math.atan(Math.sinh(Math.PI*(1-2*y/n)))*180/Math.PI,lon:x/n*360-180};},
 publicRoad(tags){
  const access=tags.motorcar||tags.motor_vehicle||tags.vehicle||tags.access||'yes';
  return !['private','no','destination','customers','delivery','agricultural','forestry','permit'].includes(access)&&['motorway','trunk','primary','secondary','tertiary','motorway_link','trunk_link','primary_link','secondary_link','tertiary_link','unclassified','residential','living_street'].includes(tags.highway);
 },
 filterRoadWays(elements,origin,center,radius,routePoints=[]){
  let ways=elements.filter(e=>e.geometry?.length>1&&this.publicRoad(e.tags||{}));
  const key=p=>`${p.lat.toFixed(6)},${p.lon.toFixed(6)}`;
  const boundary=p=>{const q=this.project(p.lat,p.lon,origin);return Math.max(Math.abs(q.x-center.x),Math.abs(q.z-center.z))>radius*.85;};
  // ponytail: small local extracts only; use a spatial road graph if areas grow.
  for(let pass=0;pass<8;pass++){
   const uses=new Map();for(const e of ways)for(const k of new Set(e.geometry.map(key)))uses.set(k,(uses.get(k)||0)+1);
   const next=ways.filter(e=>{
    if(['motorway','trunk','primary','secondary','tertiary'].includes(e.tags.highway)||e.tags.ref)return true;
    const points=e.geometry.map(p=>this.project(p.lat,p.lon,origin));let length=0;for(let i=1;i<points.length;i++)length+=Math.hypot(points[i].x-points[i-1].x,points[i].z-points[i-1].z);
    const first=e.geometry[0],last=e.geometry.at(-1);if(key(first)===key(last))return true;
    const leaf=p=>uses.get(key(p))===1&&!boundary(p);
    if(!(leaf(first)||leaf(last))||length>500)return true;
    // Retain the selected driving route even if the extract makes it look like a spur.
    return routePoints.length>1&&points.some(p=>this.nearest(p.x,p.z,[{points:routePoints}]).distance<12);
   });if(next.length===ways.length)break;ways=next;
  }return ways;
 },
 routeShape(coordinates,origin){const points=coordinates.map(([lon,lat])=>this.project(lat,lon,origin)),cumulative=[0];for(let i=1;i<points.length;i++)cumulative.push(cumulative.at(-1)+Math.hypot(points[i].x-points[i-1].x,points[i].z-points[i-1].z));return {points,cumulative,total:cumulative.at(-1)||0};},
 routeProgress(x,z,route){const near=this.nearest(x,z,[route]);if(!near.road)return {distance:Infinity,progress:0,remaining:route.total};const length=route.cumulative[near.index]-route.cumulative[near.index-1],progress=route.cumulative[near.index-1]+near.t*length;return {...near,progress,remaining:Math.max(0,route.total-progress)};},
 pointAlong(route,distance){distance=Math.max(0,Math.min(route.total,distance));let i=1;while(i<route.cumulative.length-1&&route.cumulative[i]<distance)i++;const a=route.points[i-1],b=route.points[i],length=route.cumulative[i]-route.cumulative[i-1],t=length?(distance-route.cumulative[i-1])/length:0;return {x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t,heading:Math.atan2(b.x-a.x,b.z-a.z)};},

 classifyRoad(tags){
  const highway=tags.highway||'road',ref=String(tags.ref||'').trim(),network=String(tags.network||''),r=ref.toUpperCase();
  const national=/(^|[;,])\s*NH\s*[- ]?\d/.test(r)||/^IN:NH$/i.test(network);
  const state=/(^|[;,])\s*SH\s*[- ]?\d/.test(r)||/^IN:SH$/i.test(network);
  const make=(key,label,color)=>({key,label,color,ref});
  if(highway.endsWith('_link'))return make('link',national?'National highway link':state?'State highway link':'Link road / ramp','#9470b5');
  if(national)return make('national','National highway','#c68a26');
  if(state)return make('main','State highway','#4f83b1');
  if(highway==='motorway')return make('national','Expressway / motorway','#c68a26');
  if(/^VR\s*[- ]?\d/.test(r))return make('village','Village road','#60916c');
  if(/^MDR\s*[- ]?\d/.test(r))return make('main','Major district road','#4f83b1');
  if(/^ODR\s*[- ]?\d/.test(r))return make('link','Other district road','#9470b5');
  if(['trunk','primary','secondary'].includes(highway))return make('main','Main road','#4f83b1');
  if(highway==='tertiary')return make('link','Connector / district road','#9470b5');
  if(highway==='unclassified')return make('village','Local / village road','#60916c');
  if(highway==='residential'||highway==='living_street')return make('residential','Residential road','#82918b');
  if(highway==='service')return make('service','Service / access road','#b39d80');
  return make('residential','Local road · type unspecified','#82918b');
 },
 project(lat,lon,origin){return {x:(lon-origin.lon)*111320*Math.cos(origin.lat*Math.PI/180),z:-(lat-origin.lat)*111320};},
 unproject(x,z,origin){return {lat:origin.lat-z/111320,lon:origin.lon+x/(111320*Math.cos(origin.lat*Math.PI/180))};},
 inside(x,z,points){let inside=false;for(let i=0,j=points.length-1;i<points.length;j=i++){const a=points[i],b=points[j];if((a.z>z)!==(b.z>z)&&x<(b.x-a.x)*(z-a.z)/(b.z-a.z)+a.x)inside=!inside;}return inside;},
 nearest(x,z,roads){let best={distance:Infinity};for(const road of roads)for(let i=1;i<road.points.length;i++){const a=road.points[i-1],b=road.points[i],dx=b.x-a.x,dz=b.z-a.z,l2=dx*dx+dz*dz;if(l2<.01)continue;const t=Math.max(0,Math.min(1,((x-a.x)*dx+(z-a.z)*dz)/l2)),px=a.x+t*dx,pz=a.z+t*dz,d=Math.hypot(x-px,z-pz);if(d<best.distance)best={distance:d,x:px,z:pz,heading:Math.atan2(dx,dz),road,index:i,t};}return best;},
 parseCoordinates(value){let m=value.match(/@(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/)||value.match(/^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/);if(!m){try{const u=new URL(value),q=u.searchParams.get('q')||u.searchParams.get('query')||'';m=q.match(/^(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)$/)}catch{}}if(!m)throw Error('Enter latitude, longitude or a full Maps URL containing @coordinates.');const lat=+m[1],lon=+m[2];if(!Number.isFinite(lat)||Math.abs(lat)>85||!Number.isFinite(lon)||Math.abs(lon)>180)throw Error('Use latitude between −85 and 85, longitude between −180 and 180.');return {lat,lon};},
 step(car,input,dt,onRoad){
  if(input.bus&&input.handbrake&&Math.abs(car.speed)<.5){car.speed=0;car.slip=0;return 0;}
  const bus=input.bus,enginePower=Math.max(0,Math.min(1,input.enginePower??1));const forwardLimit=(bus?(onRoad?90:40):(Math.min(onRoad?250:150,Math.max(1,Math.min(5,input.gear||5))*50)))/3.6;
  let acceleration=-9.81*Math.sin(Math.atan(input.grade||0));
  if(input.forward)acceleration+=car.speed<-.5?(bus?5:18):(bus?2.6:(onRoad?10:7.8))*enginePower;
  if(input.back)acceleration-=car.speed>.5?(bus?6:20):(bus?1.4:5);
  const drag=(onRoad?.35:.65)+(onRoad?.0009:.0016)*car.speed*car.speed;
  if(Math.abs(car.speed)>.01)acceleration-=Math.sign(car.speed)*drag;
  const before=car.speed;car.speed+=acceleration*dt;
  if(!input.forward&&!input.back&&Math.sign(before)!==Math.sign(car.speed))car.speed=0;
  if(input.handbrake)car.speed*=Math.exp(-1.8*dt);
  car.speed=Math.max(bus?-3.3:-10,Math.min(forwardLimit,car.speed));
  const steeringLimit=(bus?.45:.55)/(1+Math.abs(car.speed)/(bus?20:32));
  car.steer+=(input.steer*steeringLimit-car.steer)*Math.min(1,dt*7);
  car.heading+=car.speed/(bus?5.6:2.8)*Math.tan(car.steer)/(1+Math.abs(car.speed)*.055)*dt;
  car.slip=(car.slip||0)+((!bus&&input.handbrake&&Math.abs(car.speed)>8?car.steer*car.speed*.6:0)-(car.slip||0))*Math.min(1,dt*4);car.x+=(Math.sin(car.heading)*car.speed+Math.cos(car.heading)*car.slip)*dt;car.z+=(Math.cos(car.heading)*car.speed-Math.sin(car.heading)*car.slip)*dt;
  return Math.abs(car.speed)*dt;
 }

};
if(typeof module!=='undefined')module.exports=DriveMath;
