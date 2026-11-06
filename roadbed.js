/* Shared junction heights and a balanced cut/fill profile, independent of DEM crossfall. */
class RoadBed {
 static roundRoads(roads){
  const uses=new Map(),key=p=>Math.round(p.x*10)+','+Math.round(p.z*10);
  for(const r of roads)for(const p of r.points){const k=key(p);if(!uses.has(k))uses.set(k,new Set());uses.get(k).add(r.id);}
  for(const r of roads){r.junctionPoints=r.points.filter(p=>uses.get(key(p))?.size>1).map(p=>({...p}));const source=r.points.filter((p,i,a)=>!i||Math.hypot(p.x-a[i-1].x,p.z-a[i-1].z)>.05),rounded=[];
   if(source.length<2)continue;rounded.push({...source[0]});
   for(let i=1;i<source.length-1;i++){const a=source[i-1],b=source[i],c=source[i+1],al=Math.hypot(b.x-a.x,b.z-a.z),bl=Math.hypot(c.x-b.x,c.z-b.z),dot=((b.x-a.x)*(c.x-b.x)+(b.z-a.z)*(c.z-b.z))/(al*bl);
    if(uses.get(key(b))?.size>1||dot>.999||dot<-.8){rounded.push({...b});continue;}
    const trim=Math.min(r.width*1.6,14,al*.32,bl*.32),p={x:b.x+(a.x-b.x)*trim/al,z:b.z+(a.z-b.z)*trim/al},q={x:b.x+(c.x-b.x)*trim/bl,z:b.z+(c.z-b.z)*trim/bl},steps=Math.max(4,Math.ceil(trim/1.5));rounded.push(p);
    for(let j=1;j<=steps;j++){const t=j/steps,u=1-t;rounded.push({x:u*u*p.x+2*u*t*b.x+t*t*q.x,z:u*u*p.z+2*u*t*b.z+t*t*q.z});}
   }
   rounded.push({...source.at(-1)});r.points=[];
   for(let i=0;i<rounded.length-1;i++){const a=rounded[i],b=rounded[i+1],n=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/6));for(let j=0;j<n;j++)r.points.push({x:a.x+(b.x-a.x)*j/n,z:a.z+(b.z-a.z)*j/n});}r.points.push(rounded.at(-1));
  }
 }
 static offset(points,i,distance){const p=points[i],a=points[Math.max(0,i-1)],b=points[Math.min(points.length-1,i+1)],al=Math.hypot(p.x-a.x,p.z-a.z),bl=Math.hypot(b.x-p.x,b.z-p.z),ix=al?(p.x-a.x)/al:(b.x-p.x)/(bl||1),iz=al?(p.z-a.z)/al:(b.z-p.z)/(bl||1),ox=bl?(b.x-p.x)/bl:ix,oz=bl?(b.z-p.z)/bl:iz;let nx=-(iz+oz),nz=ix+ox;const l=Math.hypot(nx,nz);if(l>.001){nx/=l;nz/=l;}else{nx=-oz;nz=ox;}const miter=Math.min(1.6,1/Math.max(.5,Math.abs(nx*(-oz)+nz*ox)));return {x:p.x+nx*distance*miter,z:p.z+nz*distance*miter,y:p.y};}
 // Multi-source shortest paths give lower/upper grade-limited profiles. Their mean
 // balances excavating high terrain and supporting low terrain without grade jumps.
 static envelope(nodes,sign,target='target'){
  const value=nodes.map(n=>n[target]*sign),heap=[];
  const push=(i,v)=>{let k=heap.length;heap.push({i,v});while(k){const p=(k-1)>>1;if(heap[p].v<=v)break;heap[k]=heap[p];k=p;}heap[k]={i,v};};
  const pop=()=>{const first=heap[0],last=heap.pop();if(heap.length){let k=0;while(k*2+1<heap.length){let j=k*2+1;if(j+1<heap.length&&heap[j+1].v<heap[j].v)j++;if(heap[j].v>=last.v)break;heap[k]=heap[j];k=j;}heap[k]=last;}return first;};
  nodes.forEach((n,i)=>push(i,value[i]));while(heap.length){const {i,v}=pop();if(v!==value[i])continue;for(const e of nodes[i].edges){const next=v+e.rise;if(next<value[e.to]-1e-9){value[e.to]=next;push(e.to,next);}}}return value;
 }
 constructor(roads,raw){
  this.raw=raw;this.cells=new Map();this.segments=[];this.size=48;
  const nodes=[],keys=new Map();
  for(const r of roads){const heights=r.points.map(p=>Number.isFinite(r.flatHeight)?r.flatHeight:raw(p.x,p.z)),distances=[0];for(let i=1;i<r.points.length;i++)distances[i]=distances[i-1]+Math.hypot(r.points[i].x-r.points[i-1].x,r.points[i].z-r.points[i-1].z);
   r.profileNodes=[];const junctionKeys=new Set((r.junctionPoints||[]).map(p=>Math.round(p.x*10)+','+Math.round(p.z*10)));r.maxGrade=r.gradeLimit??(r.category?.key==='national'?.10:.14);
   for(let i=0;i<r.points.length;i++){const p=r.points[i];let sum=0,weight=0;for(let j=i;j>=0&&distances[i]-distances[j]<=24;j--){const w=1-Math.abs(distances[j]-distances[i])/26;sum+=heights[j]*w;weight+=w;}for(let j=i+1;j<heights.length&&distances[j]-distances[i]<=24;j++){const w=1-Math.abs(distances[j]-distances[i])/26;sum+=heights[j]*w;weight+=w;}
    const key=(Number.isFinite(r.flatHeight)?'airport/'+r.flatHeight:junctionKeys.has(Math.round(p.x*10)+','+Math.round(p.z*10))?'junction':r.layer||0)+'/'+Math.round(p.x*10)+','+Math.round(p.z*10);let id=keys.get(key);if(id===undefined){id=nodes.length;keys.set(key,id);nodes.push({sum:0,count:0,edges:[]});}nodes[id].floor=Math.max(nodes[id].floor??-1e6,r.minHeightAt?.(p)??-1e6);nodes[id].sum+=sum/weight;nodes[id].count++;r.profileNodes.push(id);
    if(i){const previous=r.profileNodes[i-1],rise=(distances[i]-distances[i-1])*r.maxGrade;nodes[previous].edges.push({to:id,rise});nodes[id].edges.push({to:previous,rise});}
   }
  }
  // A shared, level junction apron stops intersecting road/shoulder planes
  // from slicing through one another on a slope.
  for(const r of roads)for(const junction of r.junctionPoints||[]){const at=r.points.findIndex(p=>Math.hypot(p.x-junction.x,p.z-junction.z)<.11);if(at<0)continue;const center=r.profileNodes[at],radius=Math.max(8,r.width*1.5);for(const direction of [-1,1]){let distance=0;for(let i=at+direction;i>=0&&i<r.points.length;i+=direction){const p=r.points[i],q=r.points[i-direction];distance+=Math.hypot(p.x-q.x,p.z-q.z);if(distance>radius)break;const id=r.profileNodes[i];nodes[center].edges.push({to:id,rise:0});nodes[id].edges.push({to:center,rise:0});}}}
  for(const n of nodes)n.target=n.sum/n.count;const lower=RoadBed.envelope(nodes,1),upper=RoadBed.envelope(nodes,-1),floor=RoadBed.envelope(nodes,-1,'floor');
  for(const r of roads){r.elevations=r.profileNodes.map(id=>Math.max((lower[id]-upper[id])/2,-floor[id]));r.points.forEach((p,i)=>p.y=r.elevations[i]);
   for(let i=1;i<r.points.length;i++){const a=r.points[i-1],b=r.points[i],dx=b.x-a.x,dz=b.z-a.z,len2=dx*dx+dz*dz;if(len2<.01)continue;const segment={a,b,dx,dz,len2,y0:a.y,y1:b.y,width:r.width,road:r};this.segments.push(segment);const pad=r.width/2+18;
    for(let x=Math.floor((Math.min(a.x,b.x)-pad)/this.size);x<=Math.floor((Math.max(a.x,b.x)+pad)/this.size);x++)for(let z=Math.floor((Math.min(a.z,b.z)-pad)/this.size);z<=Math.floor((Math.max(a.z,b.z)+pad)/this.size);z++){const key=x+','+z;if(!this.cells.has(key))this.cells.set(key,[]);this.cells.get(key).push(segment);}
   }
  }
 }
 query(x,z){let best=null,rank=Infinity;for(const s of this.cells.get(Math.floor(x/this.size)+','+Math.floor(z/this.size))||[]){const t=Math.max(0,Math.min(1,((x-s.a.x)*s.dx+(z-s.a.z)*s.dz)/s.len2)),px=s.a.x+s.dx*t,pz=s.a.z+s.dz*t,d=Math.hypot(x-px,z-pz),score=Number.isFinite(s.road.flatHeight)&&d<=s.width/2+.65?-1+d/(s.width+1):d;if(score<rank){rank=score;best={distance:d,x:px,z:pz,height:s.y0+(s.y1-s.y0)*t,width:s.width,road:s.road,segment:s,t};}}return best;}
 overlapsOther(x,z,road,y,pad=1){for(const s of this.cells.get(Math.floor(x/this.size)+','+Math.floor(z/this.size))||[]){if(s.road===road||s.road.layer!==road.layer||s.road.category.key==='airport')continue;const t=Math.max(0,Math.min(1,((x-s.a.x)*s.dx+(z-s.a.z)*s.dz)/s.len2));if(Math.abs(s.y0+(s.y1-s.y0)*t-y)<1.5&&Math.hypot(x-s.a.x-s.dx*t,z-s.a.z-s.dz*t)<s.width/2+pad)return true;}return false;}
 sample(x,z,base=this.raw(x,z)){const n=this.query(x,z);if(!n||n.road.bridge)return base;const edge=n.width/2+.65,blend=12;if(n.distance<=edge)return n.height;const t=Math.max(0,Math.min(1,(n.distance-edge)/blend)),smooth=t*t*(3-2*t);return n.height+(base-n.height)*smooth;}
 surface(x,z){const n=this.query(x,z);return n?n.height:this.raw(x,z);}
}
if(typeof module!=='undefined')module.exports=RoadBed;
