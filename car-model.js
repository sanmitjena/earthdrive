/* Original, unbranded sports saloon geometry. No Rockstar/GTA assets. */
function createPlayerCar(root,paint,glass,rubber,chrome){
 const wheels=[],brakeLights=[],headlights=[];root.name='Player sports saloon';
 const trim=new THREE.MeshStandardMaterial({color:0x151b20,roughness:.48}),interior=new THREE.MeshStandardMaterial({color:0x242b2d,roughness:.9}),lampRed=new THREE.MeshPhysicalMaterial({color:0xb01820,emissive:0xe51c28,emissiveIntensity:.55,roughness:.2,clearcoat:1}),lampWhite=new THREE.MeshPhysicalMaterial({color:0xe7f5ff,emissive:0xbfe6ff,emissiveIntensity:.65,roughness:.18,clearcoat:1}),amber=new THREE.MeshStandardMaterial({color:0xeaad3a,emissive:0xc07b19,emissiveIntensity:.35}),discMaterial=new THREE.MeshStandardMaterial({color:0x697176,metalness:.8,roughness:.38});
 paint.metalness=.55;paint.roughness=.23;glass.color.setHex(0x24414e);glass.roughness=.1;glass.metalness=.25;
 function mesh(g,m,parent=root){const o=new THREE.Mesh(g,m);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;}
 function cube(w,h,d,x,y,z,m,parent=root,r=.02){const g=r<=.002?new THREE.BoxGeometry(w,h,d):WorldVisuals.roundedBox(w,h,d,Math.min(r,w/3,h/3,d/3)),o=mesh(g,m,parent);o.position.set(x,y,z);return o;}
 function patch(points,material,parent=root){const g=new THREE.BufferGeometry(),p=[];for(let i=1;i<points.length-1;i++)p.push(...points[0],...points[i],...points[i+1]);g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.computeVertexNormals();return mesh(g,material,parent);}
 function line(points,r,mat,parent=root){return mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),Math.max(8,points.length*4),r,6,false),mat,parent);}
 const nodes=[[-2.23,.68,.78],[-2.1,.87,.91],[-1.45,.94,1.02],[-.5,.95,1.05],[.55,.94,1.04],[1.5,.91,.94],[2.1,.82,.8],[2.23,.66,.69]];
 function profile(z){for(let i=1;i<nodes.length;i++)if(z<=nodes[i][0]){const a=nodes[i-1],b=nodes[i],t=(z-a[0])/(b[0]-a[0]),u=t*t*(3-2*t);return {w:a[1]+(b[1]-a[1])*u,y:a[2]+(b[2]-a[2])*u};}return {w:.66,y:.69};}
 const positions=[],indices=[],rings=92,around=24;for(let j=0;j<=rings;j++){const z=-2.23+j/rings*4.46,{w,y:top}=profile(z);let arch=.36;for(const axle of [-1.37,1.35]){const dz=z-axle;if(Math.abs(dz)<.46)arch=Math.max(arch,.42+Math.sqrt(.46*.46-dz*dz));}for(let k=0;k<around;k++){const a=k/around*Math.PI*2,x=Math.sin(a)*w,up=(Math.cos(a)+1)/2,edge=Math.pow(Math.abs(Math.sin(a)),8);let y=.36+(top-.36)*up;y=Math.max(y,arch*edge+.36*(1-edge));positions.push(x,y,z);}}
 for(let j=0;j<rings;j++)for(let k=0;k<around;k++){const a=j*around+k,b=j*around+(k+1)%around,c=a+around,d=b+around;indices.push(a,c,b,b,c,d);}const body=new THREE.BufferGeometry();body.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));body.setIndex(indices);body.computeVertexNormals();mesh(body,paint).name='Sculpted body with wheel openings';
 for(const z of [-2.23,2.23]){const {w,y}=profile(z);const points=[];for(let k=0;k<around;k++){const a=k/around*Math.PI*2;points.push([Math.sin(a)*w,.36+(y-.36)*(Math.cos(a)+1)/2,z]);}if(z<0)points.reverse();patch(points,paint);cube(w*1.9,.25,.1,0,.54,z,paint,root,.035);cube(w*1.85,.08,.15,0,.38,z,trim);}
 // Bonnet and boot, with creases following the body taper.
 for(const side of [-1,1]){line([[side*.56,.995,.92],[side*.56,.94,1.45],[side*.48,.83,1.99]],.009,paint);line([[side*.83,1.04,-1.2],[side*.94,.98,-.5],[side*.94,.98,.6],[side*.83,.93,1.3]],.012,chrome);cube(.12,.1,3.3,side*.94,.36,-.02,trim);}
 // Sloping windscreens, side glazing and a curved painted roof.
 const windows=glass.clone();windows.side=THREE.DoubleSide;windows.envMapIntensity=1.5;
 patch([[-.79,1.025,1.03],[.79,1.025,1.03],[.65,1.49,.39],[-.65,1.49,.39]],windows).name='Sloping windscreen';
 patch([[-.79,1.03,-1.37],[-.65,1.48,-.82],[.65,1.48,-.82],[.79,1.03,-1.37]],windows);
 const roofP=[],roofI=[];for(let j=0;j<=12;j++){const z=-.82+j/12*1.21;for(let i=0;i<=16;i++){const t=-1+i/8,x=t*.66,y=1.49+.095*(1-t*t)+.015*Math.sin(j/12*Math.PI);roofP.push(x,y,z);if(j<12&&i<16){const a=j*17+i;roofI.push(a,a+17,a+1,a+1,a+17,a+18);}}}const roof=new THREE.BufferGeometry();roof.setAttribute('position',new THREE.Float32BufferAttribute(roofP,3));roof.setIndex(roofI);roof.computeVertexNormals();mesh(roof,paint);
 for(const side of [-1,1]){const s=side;
 patch([[s*.8,1.05,-1.29],[s*.65,1.48,-.79],[s*.65,1.49,-.28],[s*.85,1.05,-.28]],windows);
 patch([[s*.85,1.05,-.21],[s*.65,1.49,-.21],[s*.65,1.49,.35],[s*.8,1.05,.96]],windows);
 line([[s*.8,1.04,-1.36],[s*.65,1.49,-.82],[s*.65,1.51,.39],[s*.8,1.04,1.04]],.035,paint);
 line([[s*.84,1.05,-.25],[s*.66,1.5,-.25]],.032,trim);
 line([[s*.8,1.04,-1.3],[s*.87,1.04,-.25],[s*.8,1.04,1.0]],.016,chrome);
 // Door shut lines, handles, mirrors and wheel-arch lips.
 for(const z of [-.92,.68]){line([[s*.89,.97,z],[s*.95,.76,z],[s*.94,.47,z+.08]],.006,trim);cube(.16,.035,.045,s*.95,.92,z-.12,chrome);}
 const mirror=cube(.24,.14,.32,s*1.02,1.13,.65,paint,root,.045);mirror.rotation.y=s*.15;cube(.015,.1,.23,s*1.145,1.13,.64,chrome);cube(.05,.07,.15,s*.88,1.07,.7,trim);
 for(const axle of [-1.37,1.35]){const points=[];for(let i=0;i<=24;i++){const a=i/24*Math.PI;points.push([s*.943,.42+Math.sin(a)*.475,axle+Math.cos(a)*.475]);}line(points,.016,paint);}
 }
 // Low grilles, bumper details and lights with layered lenses.
 cube(1.04,.18,.035,0,.61,2.26,trim);for(let i=-4;i<=4;i++)cube(.055,.14,.045,i*.105,.61,2.285,chrome);
 for(const side of [-1,1]){const s=side;const head=cube(.43,.15,.075,s*.62,.79,2.12,lampWhite,root,.025);headlights.push(head);cube(.4,.035,.08,s*.62,.86,2.14,lampWhite);cube(.05,.12,.08,s*.84,.78,2.1,amber);const rear=cube(.52,.13,.08,s*.59,.83,-2.17,lampRed,root,.025);brakeLights.push(rear);cube(.43,.026,.085,s*.59,.87,-2.18,lampRed);cube(.16,.055,.06,s*.59,.76,-2.2,lampWhite);cube(.24,.09,.03,s*.62,.47,-2.29,trim);const pipe=mesh(new THREE.CylinderGeometry(.055,.055,.17,16),chrome);pipe.rotation.x=Math.PI/2;pipe.position.set(s*.63,.34,-2.28);}
 cube(.64,.035,.065,0,1.06,-1.5,lampRed);cube(.67,.15,.025,0,.6,-2.295,trim);cube(.58,.12,.027,0,.6,2.3,trim);
 function plate(z,rotation){const c=document.createElement('canvas');c.width=256;c.height=64;const ctx=c.getContext('2d');ctx.fillStyle='#e9ebdd';ctx.fillRect(0,0,256,64);ctx.fillStyle='#16242a';ctx.font='bold 31px sans-serif';ctx.textAlign='center';ctx.fillText('HP 37 2026',128,43);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;const o=mesh(new THREE.PlaneGeometry(.55,.12),new THREE.MeshStandardMaterial({map:t,roughness:.6}));o.position.set(0,.61,z);o.rotation.y=rotation;}
 plate(2.317,0);plate(-2.317,Math.PI);
 // Seats and a dark dashboard are visible behind the glazing.
 for(const x of [-.42,.42]){cube(.51,.42,.15,x,.99,-.15,interior);cube(.5,.14,.46,x,.73,-.02,interior);cube(.26,.2,.12,x,1.27,-.18,interior);}
 cube(1.4,.13,.4,0,1.02,.73,interior);
 // Each entire wheel assembly spins, while its parent steers at the front axle.
 for(const side of [-1,1])for(const z of [-1.37,1.35]){const pivot=new THREE.Group(),spin=new THREE.Group();pivot.position.set(side*.91,.42,z);root.add(pivot);pivot.add(spin);
 const tyreProfile=[new THREE.Vector2(.235,-.14),new THREE.Vector2(.34,-.14),new THREE.Vector2(.382,-.1),new THREE.Vector2(.393,-.055),new THREE.Vector2(.393,.055),new THREE.Vector2(.382,.1),new THREE.Vector2(.34,.14),new THREE.Vector2(.235,.14)];const tyre=mesh(new THREE.LatheGeometry(tyreProfile,48),rubber,spin);tyre.rotation.z=Math.PI/2;
 const disc=mesh(new THREE.CylinderGeometry(.245,.245,.018,32),discMaterial,spin);disc.rotation.z=Math.PI/2;disc.position.x=side*.11;
 const caliper=cube(.055,.15,.1,side*.12,.02,.18,new THREE.MeshStandardMaterial({color:0xa72d24,roughness:.5}),spin);
 const rim=mesh(new THREE.TorusGeometry(.27,.025,10,48),chrome,spin);rim.rotation.y=Math.PI/2;rim.position.x=side*.148;
 for(let i=0;i<5;i++){const a=i*Math.PI*2/5,spoke=cube(.035,.065,.24,side*.15,Math.sin(a)*.13,Math.cos(a)*.13,chrome,spin);spoke.rotation.x=-a;const bolt=mesh(new THREE.SphereGeometry(.013,6,5),chrome,spin);bolt.position.set(side*.174,Math.sin(a)*.055,Math.cos(a)*.055);}
 const hub=mesh(new THREE.CylinderGeometry(.065,.065,.025,16),chrome,spin);hub.rotation.z=Math.PI/2;hub.position.x=side*.16;
 for(let i=0;i<40;i++){const a=i/40*Math.PI*2;const groove=cube(.18,.005,.016,0,Math.sin(a)*.394,Math.cos(a)*.394,trim,spin,.001);groove.rotation.x=-a;}
 wheels.push({pivot,wheel:spin,front:z>0});}
 return {wheels,brakeLights,headlights,update(braking,night){lampRed.emissiveIntensity=braking?2.4:.55;lampWhite.emissiveIntensity=night?2.2:.65;}};
}
