/* Deterministic, locally generated surface textures and instanced woodland. */
const WorldVisuals={
 maps:new Map(),materials:{},
 texture(kind){return this.map(kind==='road'?'asphalt_02':'aerial_grass_rock','color');},
 map(asset,channel){const key=asset+'/'+channel;if(this.maps.has(key))return this.maps.get(key);
 // A TextureLoader's empty image samples black until it loads, and stays black on 404.
 // Start with a valid neutral map, including a flat tangent-space normal.
 const canvas=document.createElement('canvas');canvas.width=canvas.height=2;const ctx=canvas.getContext('2d');ctx.fillStyle=channel==='normal'?'#8080ff':channel==='roughness'?'#ffffff':asset==='aerial_grass_rock'?'#89965f':asset==='rock_face'?'#9a998b':'#ffffff';ctx.fillRect(0,0,2,2);const t=new THREE.CanvasTexture(canvas);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=typeof GameQuality!=='undefined'&&GameQuality.level!=='high'?2:8;if(channel==='color')t.colorSpace=THREE.SRGBColorSpace;t.userData.asset=key;t.userData.loadState='fallback';this.maps.set(key,t);
 if(typeof GameQuality!=='undefined'&&GameQuality.level==='low'&&channel!=='color')return t;
 new THREE.TextureLoader().load(typeof EarthAssets!=='undefined'&&EarthAssets.textures['assets/'+asset+'/'+channel+'.jpg']||'assets/'+asset+'/'+channel+'.jpg',loaded=>{t.dispose();let image=loaded.image;const max=typeof GameQuality!=='undefined'?({low:256,medium:512,high:4096}[GameQuality.level]):4096;if(image&&Math.max(image.width,image.height)>max){const canvas=document.createElement('canvas'),scale=max/Math.max(image.width,image.height);canvas.width=Math.max(1,Math.round(image.width*scale));canvas.height=Math.max(1,Math.round(image.height*scale));canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);image=canvas;}t.image=image;t.needsUpdate=true;t.userData.loadState='ready';loaded.dispose();},undefined,()=>{t.userData.loadState='missing';const status=document.getElementById('asset-status');if(status){status.hidden=false;status.textContent='Some scenery files are missing. Using fallback surfaces.';}});return t;},

 terrainMaterial(){
  const mat=new THREE.MeshStandardMaterial({map:this.map('aerial_grass_rock','color'),normalMap:this.map('aerial_grass_rock','normal'),normalScale:new THREE.Vector2(.5,.5),roughnessMap:this.map('aerial_grass_rock','roughness'),roughness:1,vertexColors:true});
  const rock=this.map('rock_face','color'),rockNormal=this.map('rock_face','normal'),rockRoughness=this.map('rock_face','roughness');
  mat.userData.sharedAsset=true;
  mat.onBeforeCompile=shader=>{
   Object.assign(shader.uniforms,{earthRock:{value:rock},earthRockNormal:{value:rockNormal},earthRockRoughness:{value:rockRoughness}});
   shader.vertexShader=shader.vertexShader.replace('#include <common>',`#include <common>
    varying vec3 earthPosition;
    varying vec3 earthTerrainNormal;
   `).replace('#include <begin_vertex>',`#include <begin_vertex>
    earthPosition = position;
    earthTerrainNormal = normal;
   `);
   shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>
    uniform sampler2D earthRock;
    uniform sampler2D earthRockNormal;
    uniform sampler2D earthRockRoughness;
    varying vec3 earthPosition;
    varying vec3 earthTerrainNormal;
    float earthHash(vec2 p) {
     return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
    }
    float earthNoise(vec2 p) {
     vec2 cell = floor(p), f = fract(p);
     f = f * f * (3.0 - 2.0 * f);
     return mix(mix(earthHash(cell), earthHash(cell + vec2(1.0, 0.0)), f.x),
      mix(earthHash(cell + vec2(0.0, 1.0)), earthHash(cell + vec2(1.0, 1.0)), f.x), f.y);
    }
    vec3 earthTriplanar(sampler2D tex, vec3 p, vec3 weights) {
     return texture2D(tex, p.yz).rgb * weights.x
      + texture2D(tex, p.xz).rgb * weights.y
      + texture2D(tex, p.xy).rgb * weights.z;
    }
   `).replace('#include <map_fragment>',`
    // Stable world-space scales, shared by colour, normal and roughness samples.
    // Both terrain LOD meshes use these coordinates, avoiding a material seam.
    float earthDistance = length(vViewPosition);
    float earthMidBlend = smoothstep(45.0, 240.0, earthDistance);
    float earthFarBlend = smoothstep(700.0, 2800.0, earthDistance);
    vec2 earthCloseUV = earthPosition.xz / 4.0;
    vec2 earthMidUV = earthPosition.xz / 31.0 + vec2(0.37, 0.19);
    vec2 earthFarUV = earthPosition.xz / 193.0 + vec2(0.13, 0.57);
    vec3 earthGrass = mix(texture2D(map, earthCloseUV).rgb,
     texture2D(map, earthMidUV).rgb, earthMidBlend);
    earthGrass = mix(earthGrass, texture2D(map, earthFarUV).rgb, earthFarBlend);
    float earthMacro = earthNoise(earthPosition.xz / 67.0) * 0.65
     + earthNoise(earthPosition.xz / 211.0) * 0.35;
    earthGrass *= mix(vec3(0.66, 0.91, 0.55), vec3(0.87, 1.05, 0.73), earthMacro);
    vec3 earthSurfaceNormal = normalize(earthTerrainNormal);
    float rockMix = smoothstep(0.14, 0.48, 1.0 - abs(earthSurfaceNormal.y));
    vec3 earthRockWeights = pow(abs(earthSurfaceNormal), vec3(4.0));
    earthRockWeights /= max(dot(earthRockWeights, vec3(1.0)), 0.0001);
    vec3 earthRockUV = earthPosition / 6.0;
    vec3 earthRockColor = earthTriplanar(earthRock, earthRockUV, earthRockWeights);
    diffuseColor.rgb *= mix(earthGrass, earthRockColor, rockMix);
   `).replace('#include <roughnessmap_fragment>',`
    float earthGrassRough = mix(texture2D(roughnessMap, earthCloseUV).g,
     texture2D(roughnessMap, earthMidUV).g, earthMidBlend);
    float earthRockRough = earthTriplanar(earthRockRoughness, earthRockUV, earthRockWeights).g;
    // Natural soil stays matte, including when a source roughness map is dark.
    float roughnessFactor = roughness * clamp(mix(earthGrassRough, earthRockRough, rockMix), 0.72, 1.0);
   `).replace('#include <normal_fragment_maps>',`
    #ifdef USE_NORMALMAP_TANGENTSPACE
     vec3 earthGrassN = mix(texture2D(normalMap, earthCloseUV).xyz,
      texture2D(normalMap, earthMidUV).xyz, earthMidBlend) * 2.0 - 1.0;
     earthGrassN.xy *= normalScale * (1.0 - earthFarBlend);
     vec3 earthGrassViewNormal = normalize(getTangentFrame(-vViewPosition, normal, earthCloseUV) * earthGrassN);
     // Each cliff projection supplies its own matching tangent frame. Reusing the
     // terrain XZ tangent frame here would stretch or reverse normal-map lighting.
     vec3 earthNX = texture2D(earthRockNormal, earthRockUV.yz).xyz * 2.0 - 1.0;
     vec3 earthNY = texture2D(earthRockNormal, earthRockUV.xz).xyz * 2.0 - 1.0;
     vec3 earthNZ = texture2D(earthRockNormal, earthRockUV.xy).xyz * 2.0 - 1.0;
     earthNX.xy *= normalScale * (1.0 - earthFarBlend);
     earthNY.xy *= normalScale * (1.0 - earthFarBlend);
     earthNZ.xy *= normalScale * (1.0 - earthFarBlend);
     vec3 earthRockViewNormal =
      getTangentFrame(-vViewPosition, normal, earthRockUV.yz) * earthNX * earthRockWeights.x
      + getTangentFrame(-vViewPosition, normal, earthRockUV.xz) * earthNY * earthRockWeights.y
      + getTangentFrame(-vViewPosition, normal, earthRockUV.xy) * earthNZ * earthRockWeights.z;
     normal = normalize(mix(earthGrassViewNormal, normalize(earthRockViewNormal), rockMix));
    #endif
   `);
  };
  mat.customProgramCacheKey=()=> 'earth-terrain-multiscale-triplanar-v3';
  return mat;
 },
 roadMaterial(){if(this.materials.road)return this.materials.road;const mat=new THREE.MeshStandardMaterial({vertexColors:true,map:this.map('asphalt_02','color'),normalMap:this.map('asphalt_02','normal'),normalScale:new THREE.Vector2(.32,.32),roughnessMap:this.map('asphalt_02','roughness'),roughness:1,side:THREE.DoubleSide});mat.userData.sharedAsset=true;mat.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#ifdef USE_MAP
 vec4 sampledDiffuseColor = texture2D(map, vMapUv);
 float aggregate = dot(sampledDiffuseColor.rgb, vec3(0.333));
 diffuseColor.rgb *= clamp(0.18 + aggregate * 1.8, 0.2, 0.8);
 #endif`);};mat.customProgramCacheKey=()=> 'earth-asphalt-v1';this.materials.road=mat;return mat;},
 facadeMaterial(){if(this.materials.facade)return this.materials.facade;const mat=new THREE.MeshStandardMaterial({vertexColors:true,map:this.map('plastered_wall_02','color'),normalMap:this.map('plastered_wall_02','normal'),normalScale:new THREE.Vector2(.45,.45),roughness:1});mat.userData.sharedAsset=true;this.materials.facade=mat;return mat;},
 facadeUV(mesh){if(!mesh)return;const p=mesh.geometry.attributes.position,n=mesh.geometry.attributes.normal,uv=[];for(let i=0;i<p.count;i++){const roof=Math.abs(n.getY(i))>.5;uv.push((Math.abs(n.getX(i))>.5?p.getZ(i):p.getX(i))/4,(roof?p.getZ(i):p.getY(i))/4);}mesh.geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));},

 roundedBox(w,h,d,r=.14){const g=new THREE.BoxGeometry(w,h,d,6,6,14),p=g.attributes.position,n=g.attributes.normal;for(let i=0;i<p.count;i++){const v=new THREE.Vector3().fromBufferAttribute(p,i),inner=new THREE.Vector3(THREE.MathUtils.clamp(v.x,-w/2+r,w/2-r),THREE.MathUtils.clamp(v.y,-h/2+r,h/2-r),THREE.MathUtils.clamp(v.z,-d/2+r,d/2-r)),normal=v.clone().sub(inner).normalize();v.copy(inner).addScaledVector(normal,r);p.setXYZ(i,v.x,v.y,v.z);n.setXYZ(i,normal.x,normal.y,normal.z);}return g;},
 surface(mesh,scale){if(!mesh)return;const p=mesh.geometry.attributes.position,uv=[];for(let i=0;i<p.count;i++)uv.push(p.getX(i)/scale,p.getZ(i)/scale);mesh.geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));},
 woodland(){return 0;},
 roadside(roads,parent,terrain){const positions=[],colors=[],rail=new THREE.Color('#b5b7ad'),post=new THREE.Color('#747e76');let count=0;function part(w,h,d,x,y,z,heading,c){const g=new THREE.BoxGeometry(w,h,d);g.rotateY(heading);g.translate(x,y,z);mergeGeometry(g,positions,colors,c);}for(const road of roads){if(road.width<5||road.category.key==='path')continue;let last=-Infinity;for(let i=1;i<road.points.length&&count<500;i++){const a=road.points[i-1],b=road.points[i],len=Math.hypot(b.x-a.x,b.z-a.z);if(len<2)continue;const heading=Math.atan2(b.x-a.x,b.z-a.z),x=(a.x+b.x)/2,z=(a.z+b.z)/2,nx=Math.cos(heading),nz=-Math.sin(heading),offset=road.width/2+.7;for(const side of [-1,1]){const px=x+nx*offset*side,pz=z+nz*offset*side,out=terrain.height(px+nx*side*9,pz+nz*side*9),y=terrain.height(px,pz);if(y-out<2.5)continue;part(.13,.28,len,px,y+.85,pz,heading,rail);if(i-last>=2){part(.12,1,.12,px,y+.45,pz,heading,post);last=i;}count++;}}}const mesh=meshFrom(positions,colors,new THREE.MeshStandardMaterial({vertexColors:true,roughness:.5,metalness:.45}));if(mesh)mesh.castShadow=true;return count;}
};
