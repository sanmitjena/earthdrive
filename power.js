/* Mapped electrical infrastructure; equipment dimensions are visual estimates. */
const PowerScenery={
 build(data,parent){
  const root=new THREE.Group();root.name='Mapped electrical infrastructure';parent.add(root);const mats=PlaceDesigns.materials(),supports=new Map(),batches=new Map();
  const beam=(a,b,r,key='steel')=>{const av=new THREE.Vector3(...a),bv=new THREE.Vector3(...b),v=bv.clone().sub(av),g=new THREE.CylinderGeometry(r,r,v.length(),5);g.applyMatrix4(new THREE.Matrix4().makeRotationFromQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),v.normalize())));g.translate(...av.add(bv).multiplyScalar(.5).toArray());if(!batches.has(key))batches.set(key,[]);batches.get(key).push(g);};
  const block=(w,h,d,x,y,z,key)=>{const g=new THREE.BoxGeometry(w,h,d);g.translate(x,y,z);if(!batches.has(key))batches.set(key,[]);batches.get(key).push(g);};
  const project=p=>M.project(p.lat,p.lon,origin),within=p=>Math.hypot(p.x-car.x,p.z-car.z)<2600;
  const nodes=(data.elements||[]).filter(e=>e.type==='node'&&['tower','pole','portal','transformer'].includes(e.tags?.power));
  for(const e of nodes){const p=project(e);if(!within(p))continue;const tower=e.tags.power==='tower',h=Math.max(5,Math.min(70,parseFloat(e.tags.height)||(tower?25:9))),y=terrain.height(p.x,p.z);supports.set(e.id,{...p,y,h});
   if(tower){for(const sx of [-1,1])for(const sz of [-1,1]){const bottom=[p.x+sx*2.6,y,p.z+sz*2.6],top=[p.x+sx*.45,y+h,p.z+sz*.45];beam(bottom,top,.11);block(.8,.45,.8,bottom[0],y+.1,bottom[2],'soil');for(let k=0;k<5;k++){const a=k/5,b=(k+1)/5,wa=2.6-2.15*a,wb=2.6-2.15*b;beam([p.x+sx*wa,y+h*a,p.z+sz*wa],[p.x-sx*wb,y+h*b,p.z+sz*wb],.045);}}
    for(const level of [.72,.9]){beam([p.x-4,y+h*level,p.z],[p.x+4,y+h*level,p.z],.12);for(const side of [-1,1])beam([p.x+side*3.8,y+h*level,p.z],[p.x+side*3.8,y+h*level-1,p.z],.13,'cream');}
   }else {beam([p.x,y,p.z],[p.x,y+h,p.z],.17,'soil');beam([p.x-1.3,y+h-.5,p.z],[p.x+1.3,y+h-.5,p.z],.08);for(const x of [-1,0,1])beam([p.x+x,y+h-.5,p.z],[p.x+x,y+h,p.z],.09,'cream');if(e.tags.power==='transformer')block(1.1,1.4,.8,p.x,y+h*.65,p.z,'steel');}
  }
  let spans=0;
  for(const e of data.elements||[]){const t=e.tags||{};if(['line','minor_line','cable'].includes(t.power)&&t.location!=='underground'&&t.power!=='cable'){
   const points=(e.geometry||[]).map(project);for(let i=1;i<points.length&&spans<450;i++){const a=points[i-1],b=points[i];if(!within(a)&&!within(b))continue;const sa=supports.get(e.nodes?.[i-1]),sb=supports.get(e.nodes?.[i]),h=t.power==='minor_line'?9:24,ay=(sa?.y??terrain.height(a.x,a.z))+(sa?.h??h)*.9,by=(sb?.y??terrain.height(b.x,b.z))+(sb?.h??h)*.9,dx=b.x-a.x,dz=b.z-a.z,length=Math.hypot(dx,dz);if(length<1)continue;const sag=Math.min(7,length*.025);for(const offset of [-1.4,0,1.4]){let previous;for(let k=0;k<=12;k++){const u=k/12,p=[a.x+dx*u+dz/length*offset,ay+(by-ay)*u-4*sag*u*(1-u),a.z+dz*u-dx/length*offset];if(previous)beam(previous,p,.025,'dark');previous=p;}}spans++;}
   }
   if(t.power==='substation'){
    const ps=(e.geometry||[]).map(project);const p=ps.length?{x:ps.reduce((s,p)=>s+p.x,0)/ps.length,z:ps.reduce((s,p)=>s+p.z,0)/ps.length}:Number.isFinite(e.lat)?project(e):null;if(!p||!within(p))continue;const w=ps.length?Math.min(70,Math.max(10,Math.max(...ps.map(p=>p.x))-Math.min(...ps.map(p=>p.x)))):16,d=ps.length?Math.min(70,Math.max(10,Math.max(...ps.map(p=>p.z))-Math.min(...ps.map(p=>p.z)))):12,y=terrain.height(p.x,p.z)+.15;block(w,.3,d,p.x,y,p.z,'soil');
    for(const sz of [-1,1]){beam([p.x-w/2,y+2,p.z+sz*d/2],[p.x+w/2,y+2,p.z+sz*d/2],.04);for(let x=-w/2;x<=w/2;x+=2)beam([p.x+x,y,p.z+sz*d/2],[p.x+x,y+2.2,p.z+sz*d/2],.05);}
    for(const sx of [-1,1]){beam([p.x+sx*w/2,y+2,p.z-d/2],[p.x+sx*w/2,y+2,p.z+d/2],.04);for(let z=-d/2;z<=d/2;z+=2)beam([p.x+sx*w/2,y,p.z+z],[p.x+sx*w/2,y+2.2,p.z+z],.05);}
    for(const side of [-1,1]){const x=p.x+side*w*.23;block(2.7,2.4,2,x,y+1.3,p.z,'steel');for(let k=-4;k<=4;k++)block(.09,1.9,2.4,x+k*.3,y+1.2,p.z,'dark');for(const z of [-.65,0,.65])beam([x,y+2.5,p.z+z],[x,y+3.5,p.z+z],.15,'cream');beam([x-2,y,p.z-2],[x-2,y+5,p.z-2],.13);beam([x+2,y,p.z-2],[x+2,y+5,p.z-2],.13);beam([x-2,y+5,p.z-2],[x+2,y+5,p.z-2],.13);}
    const sign=RailModels.panel(t.name||'ELECTRICAL SUBSTATION • DANGER',Math.min(8,w-1),.8,p.x,y+2.3,p.z+d/2+.05,0,'#e9c629','#302b20');root.add(sign);
   }
  }
  for(const [key,geometries] of batches){const positions=[];for(const g of geometries){const a=g.toNonIndexed();positions.push(...a.attributes.position.array);a.dispose();g.dispose();}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.computeVertexNormals();const mesh=new THREE.Mesh(g,mats[key]);mesh.castShadow=true;mesh.receiveShadow=true;root.add(mesh);}root.userData={mappedSupports:supports.size,spans,breakableAreas:[...supports.values()].map(p=>({kind:'pole',x:p.x,z:p.z,radius:.3,height:Math.min(12,p.h),threshold:p.h>15?25:7,meshes:root.children.filter(c=>c.isMesh)}))};return root;
 }
};
