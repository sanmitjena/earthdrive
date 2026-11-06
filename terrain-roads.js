/* Cut the rendered terrain at the actual road triangles, including junctions/shoulders.
   Sampling a coarse height grid alone cannot keep narrow roads clear on a hillside. */
class TerrainRoadCut {
 static apply(geometry,roadPositions,THREE,grid=null){const job=this.steps(geometry,roadPositions,THREE,grid);let step;do{step=job.next();}while(!step.done);return step.value;}
 static async applyAsync(geometry,roadPositions,THREE,grid=null){const job=this.steps(geometry,roadPositions,THREE,grid);let step;do{step=job.next();if(!step.done)await new Promise(resolve=>setTimeout(resolve,0));}while(!step.done);return step.value;}
 static *steps(geometry, roadPositions, THREE, grid=null) {
  let deadline=performance.now()+4;
  const cellSize=grid?.step||64,offsetX=grid?.minX||0,offsetZ=grid?.minZ||0,cells=new Map(),triangles=[];
  const cross=(a,b,p)=>(b[0]-a[0])*(p[2]-a[2])-(b[2]-a[2])*(p[0]-a[0]);
  for(let i=0;i<roadPositions.length;i+=9){
   if(performance.now()>deadline){yield;deadline=performance.now()+4;}
   const v=[roadPositions.slice(i,i+3),roadPositions.slice(i+3,i+6),roadPositions.slice(i+6,i+9)];
   let area=cross(v[0],v[1],v[2]);if(Math.abs(area)<1e-7)continue;
   if(area<0)[v[1],v[2]]=[v[2],v[1]];
   const t={v,minX:Math.min(...v.map(p=>p[0])),maxX:Math.max(...v.map(p=>p[0])),minZ:Math.min(...v.map(p=>p[2])),maxZ:Math.max(...v.map(p=>p[2]))},id=triangles.push(t)-1;
   for(let x=Math.floor((t.minX-offsetX)/cellSize);x<=Math.floor((t.maxX-offsetX)/cellSize);x++)for(let z=Math.floor((t.minZ-offsetZ)/cellSize);z<=Math.floor((t.maxZ-offsetZ)/cellSize);z++){const key=x+','+z;if(!cells.has(key))cells.set(key,[]);cells.get(key).push(id);}
  }
  const position=geometry.attributes.position,color=geometry.attributes.color,uv=geometry.attributes.uv,normal=geometry.attributes.normal,index=geometry.index,outP=Array.from(position.array),outC=Array.from(color.array),outUV=Array.from(uv.array),outN=Array.from(normal.array),outIndex=[];
  const read=i=>[position.getX(i),position.getY(i),position.getZ(i),color.getX(i),color.getY(i),color.getZ(i),uv.getX(i),uv.getY(i),normal.getX(i),normal.getY(i),normal.getZ(i)];
  const overlap=(a,b)=>a.minX<=b.maxX&&a.maxX>=b.minX&&a.minZ<=b.maxZ&&a.maxZ>=b.minZ;
  // Keep new boundary vertices on the original terrain plane. Lowering these
  // independently tears shared terrain edges into open T-junctions.
  const intersection=(p,q,dp,dq)=>{const f=dp/(dp-dq);return p.map((v,i)=>v+(q[i]-v)*f);};
  const walls=[];
  const subtract=(polygon,triangle)=>{
   if(triangle.some((a,i)=>polygon.every(p=>cross(a,triangle[(i+1)%3],p)<-1e-8)))return [polygon];
   let inside=polygon;const outside=[];
   for(let edge=0;edge<3&&inside.length>=3;edge++){
    const a=triangle[edge],b=triangle[(edge+1)%3],keep=[],remove=[];
    for(let i=0;i<inside.length;i++){
     const p=inside[i],q=inside[(i+1)%inside.length],dp=cross(a,b,p),dq=cross(a,b,q),pIn=dp>=-1e-8,qIn=dq>=-1e-8;
     (pIn?keep:remove).push(p);
     if(pIn!==qIn){const v=intersection(p,q,dp,dq,a,b,triangle);keep.push(v);remove.push(v);}
    }
    if(remove.length>=3)outside.push(remove);inside=keep;
   }
   let area=0;if(inside.length>=3)for(let i=1;i<inside.length-1;i++)area+=Math.abs(cross(inside[0],inside[i],inside[i+1]));
   if(area<1e-7)return [polygon];
   const [a,b,c]=triangle,den=cross(a,b,c);
   const lower=p=>{const u=cross(b,c,p)/den,v=cross(c,a,p)/den,w=1-u-v,q=p.slice();q[1]=Math.min(p[1],u*a[1]+v*b[1]+w*c[1]-.025);return q;};
   for(let i=0;i<inside.length;i++){
    const p=inside[i],q=inside[(i+1)%inside.length];
    // Close only actual road edges, never interior terrain triangulation edges.
    if(!triangle.some((a,j)=>Math.abs(cross(a,triangle[(j+1)%3],p))<1e-5&&Math.abs(cross(a,triangle[(j+1)%3],q))<1e-5))continue;
    const mid=[(p[0]+q[0])/2,0,(p[2]+q[2])/2],key=Math.floor((mid[0]-offsetX)/cellSize)+','+Math.floor((mid[2]-offsetZ)/cellSize);
    if((cells.get(key)||[]).some(id=>triangles[id].v!==triangle&&triangles[id].v.every((a,j,v)=>cross(a,v[(j+1)%3],mid)>=-1e-7)))continue;
    const lp=lower(p),lq=lower(q);if(p[1]-lp[1]<1e-5&&q[1]-lq[1]<1e-5)continue;
    walls.push([p,lp,q],[q,lp,lq],[p,q,lp],[q,lq,lp]);
   }
   return outside;
  };
  let cut=0;
  for(let i=0;i<index.count;i+=3){
   if(performance.now()>deadline){yield;deadline=performance.now()+4;}
   const ia=index.array[i],ib=index.array[i+1],ic=index.array[i+2],p=position.array,bounds={minX:Math.min(p[ia*3],p[ib*3],p[ic*3]),maxX:Math.max(p[ia*3],p[ib*3],p[ic*3]),minZ:Math.min(p[ia*3+2],p[ib*3+2],p[ic*3+2]),maxZ:Math.max(p[ia*3+2],p[ib*3+2],p[ic*3+2])};
   const candidates=new Set();
   if(grid){const x=Math.round((bounds.minX-offsetX)/cellSize),z=Math.round((bounds.minZ-offsetZ)/cellSize);for(const id of cells.get(x+','+z)||[])if(overlap(bounds,triangles[id]))candidates.add(id);}
   else for(let x=Math.floor(bounds.minX/cellSize);x<=Math.floor(bounds.maxX/cellSize);x++)for(let z=Math.floor(bounds.minZ/cellSize);z<=Math.floor(bounds.maxZ/cellSize);z++)for(const id of cells.get(x+','+z)||[])if(overlap(bounds,triangles[id]))candidates.add(id);
   if(!candidates.size){outIndex.push(index.getX(i),index.getX(i+1),index.getX(i+2));continue;}
   const original=[read(ia),read(ib),read(ic)];let pieces=[original];
   for(const id of candidates){pieces=pieces.flatMap(p=>subtract(p,triangles[id].v));if(!pieces.length)break;}
   if(candidates.size)cut++;
   for(const p of pieces)for(let j=1;j<p.length-1;j++){
    const tri=[p[0],p[j],p[j+1]];if(Math.abs(cross(...tri))<1e-7)continue;
    for(const v of tri){outIndex.push(outP.length/3);outN.push(v[8],v[9],v[10]);outP.push(v[0],v[1],v[2]);outC.push(v[3],v[4],v[5]);outUV.push(v[6],v[7]);}
   }
  }
  for(const tri of walls)for(const v of tri){outIndex.push(outP.length/3);outP.push(v[0],v[1],v[2]);outC.push(v[3],v[4],v[5]);outUV.push(v[6],v[7]);outN.push(v[8],v[9],v[10]);}
  const result=new THREE.BufferGeometry();result.setAttribute('position',new THREE.Float32BufferAttribute(outP,3));result.setAttribute('color',new THREE.Float32BufferAttribute(outC,3));result.setAttribute('uv',new THREE.Float32BufferAttribute(outUV,2));result.setAttribute('normal',new THREE.Float32BufferAttribute(outN,3));result.normalizeNormals();result.setIndex(outIndex);result.userData.roadCutTriangles=cut;
  return result;
 }
}
if(typeof module!=='undefined')module.exports=TerrainRoadCut;
