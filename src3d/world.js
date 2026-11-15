import * as T from 'three';
import {makeDistantLandscape} from './landscape.js';
import {makeCampArt} from './camp-art.js';
import {encounterRoster} from './enemy-config.js';
import {dressHouse,makeBuildingMaterials} from './buildings.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {makeResidents} from './residents.js';
import {addLandmarks} from './landmarks.js';
import {heightAt,WATER,rng,LANDMARKS} from './core.js';
import {mat,mesh,box,orb,cyl} from './art.js';
const TAU=Math.PI*2;
export function makeWorld(scene){
 const buildingMaterials=makeBuildingMaterials(),enemySpawns=encounterRoster(0,true);
 const random=rng(9235),solids=[],windmills=[],waypoints=[],chests=[],sigils=[],portals=[],clouds=[];
 const terrain=new T.PlaneGeometry(440,440,180,180);terrain.rotateX(-Math.PI/2);const p=terrain.attributes.position,colors=[];
 const grass=new T.Color(),a=new T.Color('#78bd4b'),b=new T.Color('#4a984f'),sand=new T.Color('#c8c49b'),rock=new T.Color('#809590');
 for(let i=0;i<p.count;i++){const x=p.getX(i),z=p.getZ(i),h=heightAt(x,z);p.setY(i,h);grass.copy(a).lerp(b,(Math.sin(x*.07+z*.025)+Math.cos(z*.05))*.14+.25);if(h<2)grass.lerp(sand,Math.max(0,1-(h-.35)/1.65));if(h>21)grass.lerp(rock,.3);colors.push(grass.r,grass.g,grass.b);}
 terrain.setAttribute('color',new T.Float32BufferAttribute(colors,3));terrain.computeVertexNormals();const terrainMat=new T.MeshLambertMaterial({color:0xffffff,vertexColors:true});
 terrainMat.onBeforeCompile=s=>{s.vertexShader='varying vec3 terrainPos;\n'+s.vertexShader;s.vertexShader=s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nterrainPos=position;');s.fragmentShader='varying vec3 terrainPos;\nfloat noise2(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(fract(sin(dot(i,vec2(127.1,311.7)))*43758.5453),fract(sin(dot(i+vec2(1.,0.),vec2(127.1,311.7)))*43758.5453),f.x),mix(fract(sin(dot(i+vec2(0.,1.),vec2(127.1,311.7)))*43758.5453),fract(sin(dot(i+vec2(1.,1.),vec2(127.1,311.7)))*43758.5453),f.x),f.y);}\n'+s.fragmentShader;s.fragmentShader=s.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\ndiffuseColor.rgb *= .85 + .16*noise2(terrainPos.xz*.16)+.055*noise2(terrainPos.xz*3.);');};
 const ground=mesh(terrain,terrainMat,scene);ground.receiveShadow=true;ground.castShadow=false;
 // Terrain depth drives shoreline color and foam; all textures remain embedded/procedural.
 const depthSize=256,depthBytes=new Uint8Array(depthSize*depthSize*4);
 for(let z=0;z<depthSize;z++)for(let x=0;x<depthSize;x++){const h=Math.round(T.MathUtils.clamp((heightAt(x/(depthSize-1)*440-220,z/(depthSize-1)*440-220)+25)/65,0,1)*65535),i=(z*depthSize+x)*4;depthBytes[i]=h>>8;depthBytes[i+1]=h&255;depthBytes[i+3]=255;}
 const depthMap=new T.DataTexture(depthBytes,depthSize,depthSize,T.RGBAFormat);depthMap.minFilter=depthMap.magFilter=T.LinearFilter;depthMap.needsUpdate=true;
 const water=mesh(new T.PlaneGeometry(440,440),new T.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{time:{value:0},terrainDepth:{value:depthMap}},vertexShader:`varying vec3 wp;void main(){wp=(modelMatrix*vec4(position,1.)).xyz;gl_Position=projectionMatrix*viewMatrix*vec4(wp,1.);}`,fragmentShader:`
 varying vec3 wp;uniform float time;uniform sampler2D terrainDepth;
 float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
 float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),f.x),f.y);}
 float surface(vec2 p){return noise(p*.55+vec2(time*.035,-time*.025))*.65+noise(p*1.7+vec2(-time*.07,time*.04))*.35;}
 void main(){vec2 encoded=texture2D(terrainDepth,(wp.xz+220.)/440.).rg;float h=dot(encoded,vec2(256.,1.))/257.*65.-25.;float depth=max(0.,.35-h);if(depth<.005)discard;vec3 view=normalize(cameraPosition-wp);
 float n=surface(wp.xz);vec3 normal=normalize(vec3((n-surface(wp.xz+vec2(.15,0.)))*.45,1.,(n-surface(wp.xz+vec2(0.,.15)))*.45));float fresnel=pow(1.-max(0.,dot(view,normal)),3.);
 vec3 shallow=vec3(.025,.34,.29),deep=vec3(.006,.055,.20);vec3 col=mix(shallow,deep,1.-exp(-depth*.40));
 vec3 reflected=reflect(-view,normal);vec3 sky=mix(vec3(.28,.52,.67),vec3(.055,.24,.48),max(0.,reflected.y));
 float cloud=smoothstep(.58,.76,noise(reflected.xz*10.)*.7+noise(reflected.xz*24.)*.3);sky=mix(sky,vec3(.69,.83,.86),cloud*.45);col=mix(col,sky,.04+fresnel*.17);
 float sun=pow(max(0.,dot(reflect(-normalize(vec3(-.5,1.,.4)),normal),view)),230.);col+=vec3(1.,.91,.69)*sun*.45;
 float caustic=pow(1.-abs(noise(wp.xz*1.7+time*.08)-noise(wp.xz*1.9-time*.06)),18.);col+=vec3(.05,.10,.08)*caustic*exp(-depth*1.1);
 float foam=(1.-smoothstep(.025,.20,depth))*(.25+.45*noise(wp.xz*3.+time*.12));col=mix(col,vec3(.72,.88,.82),foam);
 gl_FragColor=vec4(col,mix(.60,.98,1.-exp(-depth*.8)));
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
 }`}),scene,0,WATER,0);water.rotation.x=-Math.PI/2;water.castShadow=false;
 // Continuous, gently curved trails lead between meaningful destinations.
 const routes=[[[0,105],[-14,83],[-34,58],[-58,30],[-53,9]],[[-53,9],[-24,-20],[0,-47],[35,-82],[65,-108]],[[-53,9],[-75,-20],[-100,-61]],[[-53,9],[-12,37],[22,81],[80,56]]];
 const trailMask=new Set(),trailCanvas=document.createElement('canvas');trailCanvas.width=128;trailCanvas.height=128;const tg=trailCanvas.getContext('2d'),trailPixels=tg.createImageData(128,128);for(let y=0;y<128;y++)for(let x=0;x<128;x++){const k=(y*128+x)*4,edge=Math.min(x,127-x)/18,grain=random()*10;trailPixels.data[k]=180+grain;trailPixels.data[k+1]=169+grain;trailPixels.data[k+2]=121+grain;trailPixels.data[k+3]=Math.round(255*T.MathUtils.clamp(edge+(random()-.5)*.3,0,1));}tg.putImageData(trailPixels,0,0);const trailTexture=new T.CanvasTexture(trailCanvas);trailTexture.colorSpace=T.SRGBColorSpace;trailTexture.wrapT=T.RepeatWrapping;const trailMaterial=new T.MeshLambertMaterial({map:trailTexture,transparent:true,depthWrite:false,side:T.DoubleSide,alphaTest:.03});
 function road(points,width=1.75){const path=new T.CatmullRomCurve3(points.map(v=>new T.Vector3(v[0],0,v[1]))),v=[],ids=[],uv=[];for(let i=0;i<=180;i++){const q=path.getPoint(i/180),d=path.getTangent(i/180),nx=-d.z,nz=d.x;for(let xx=-1;xx<=1;xx++)for(let zz=-1;zz<=1;zz++)trailMask.add(Math.round(q.x+xx)+","+Math.round(q.z+zz));for(const s of [-1,1]){const x=q.x+s*nx*width,z=q.z+s*nz*width;v.push(x,heightAt(x,z)+.04,z);uv.push(s<0?0:1,i/180*42);}if(i){let j=i*2;ids.push(j-2,j-1,j,j-1,j+1,j);}}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(v,3));g.setIndex(ids);g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.computeVertexNormals();const m=mesh(g,trailMaterial,scene);m.castShadow=false;}
 routes.forEach(r=>road(r));
 const distantLandscape=makeDistantLandscape(scene);
 // Trees are instanced: hundreds of crowns share three draw calls.
 const trees=[];for(let i=0;i<1500&&trees.length<480;i++){const x=(random()-.5)*360,z=(random()-.5)*360,y=heightAt(x,z);if((x>-88&&x<-20&&z>-38&&z<46)||(z>-100&&z<105&&x>-35&&x<50)||y<2||Math.hypot(x,z-105)<20||Math.hypot(x+53,z-9)<25||Math.hypot(x-65,z+108)<28||Math.hypot(x+100,z+61)<13)continue;
 if(routes.some(r=>r.some(pt=>Math.hypot(x-pt[0],z-pt[1])<8)))continue;trees.push({x,z,y,s:1.2+random()*2.3});}
 for(let i=trees.length-1;i>=0;i--)if(enemySpawns.some(e=>Math.hypot(e.x-trees[i].x,e.z-trees[i].z)<trees[i].s*.29+1.25))trees.splice(i,1);
 const trunkGeometry=new T.CylinderGeometry(.105,.31,3.7,8,7),tp=trunkGeometry.attributes.position;
 for(let j=0;j<tp.count;j++){const y=tp.getY(j),u=(y+1.85)/3.7;tp.setX(j,tp.getX(j)+Math.sin(u*2.4)*.17);tp.setZ(j,tp.getZ(j)+u*u*.16);}trunkGeometry.computeVertexNormals();
 const barkCanvas=document.createElement('canvas');barkCanvas.width=128;barkCanvas.height=256;const bg=barkCanvas.getContext('2d');bg.fillStyle='#89755d';bg.fillRect(0,0,128,256);for(let j=0;j<37;j++){bg.strokeStyle=j%3?'#6b624d':'#ad9370';bg.lineWidth=1+random()*2;bg.beginPath();const x=random()*128;bg.moveTo(x,0);bg.bezierCurveTo(x+random()*15,80,x-10,170,x+random()*10,256);bg.stroke();}const bark=new T.CanvasTexture(barkCanvas);bark.colorSpace=T.SRGBColorSpace;
 const barkMat=new T.MeshLambertMaterial({map:bark,color:0xc9b899});
 const trunk=new T.InstancedMesh(trunkGeometry,barkMat,trees.length),branches=new T.InstancedMesh(new T.CylinderGeometry(.035,.12,1.8,6),barkMat,trees.length*3);
 // Alpha-cut leaf cards give a detailed irregular canopy silhouette.
 const leafCanvas=document.createElement('canvas');leafCanvas.width=128;leafCanvas.height=128;const lg=leafCanvas.getContext('2d');
 for(let j=0;j<170;j++){const a=random()*TAU,r=Math.sqrt(random())*57,x=64+Math.cos(a)*r,y=64+Math.sin(a)*r*.85;lg.fillStyle=['#aace71','#8abb60','#5b9350','#b4d582'][j%4];lg.beginPath();lg.ellipse(x,y,5+random()*9,2+random()*5,random()*TAU,0,TAU);lg.fill();}const lt=new T.CanvasTexture(leafCanvas);lt.colorSpace=T.SRGBColorSpace;
 const leaves=new T.MeshLambertMaterial({map:lt,alphaTest:.48,side:T.DoubleSide,color:0xffffff});
 const crown=new T.InstancedMesh(new T.PlaneGeometry(1,1),leaves,trees.length*36),light=new T.Color(),o=new T.Object3D();
 trees.forEach((t,i)=>{const yaw=random()*TAU;o.position.set(t.x,t.y+1.7*t.s,t.z);o.scale.set(t.s,t.s,t.s);o.rotation.set(0,yaw,0);o.updateMatrix();trunk.setMatrixAt(i,o.matrix);solids.push({x:t.x,z:t.z,r:.29*t.s});
 for(let k=0;k<3;k++){const a=yaw+k*2.1;o.position.set(t.x+Math.cos(a)*.5*t.s,t.y+(2.4+k*.25)*t.s,t.z+Math.sin(a)*.5*t.s);o.scale.set(t.s,t.s,t.s);o.rotation.set(Math.cos(a)*.62,0,Math.sin(a)*.62);o.updateMatrix();branches.setMatrixAt(i*3+k,o.matrix);}
 for(let j=0;j<36;j++){const a=random()*TAU,r=Math.sqrt(random())*1.5*t.s,lobe=j%3;o.position.set(t.x+Math.cos(a)*r,t.y+(3.0+random()*1.7+lobe*.13)*t.s-r*.22,t.z+Math.sin(a)*r);o.scale.set(t.s*(1.15+random()*.55),t.s*(1.05+random()*.45),1);o.rotation.set((random()-.5)*1.9,random()*TAU,(random()-.5)*.7);o.updateMatrix();crown.setMatrixAt(i*36+j,o.matrix);light.setHSL(.21+random()*.05,.10,.76+random()*.17);crown.setColorAt(i*36+j,light);}});
 trunk.castShadow=true;branches.castShadow=true;crown.castShadow=true;crown.receiveShadow=true;scene.add(trunk,branches,crown);
 // Painted, alpha-cut grass clumps provide fine curved silhouettes at six triangles each.
 const grassCanvas=document.createElement('canvas');grassCanvas.width=256;grassCanvas.height=128;const gg=grassCanvas.getContext('2d');
 for(let j=0;j<21;j++){const x=12+random()*232,h=35+random()*83,lean=(random()-.5)*72,w=2+random()*3.5,shade=gg.createLinearGradient(0,128,0,128-h);shade.addColorStop(0,'#d4e4bc');shade.addColorStop(.5,'#f4f6e5');shade.addColorStop(1,'#fffde0');gg.fillStyle=shade;gg.beginPath();gg.moveTo(x-w,128);gg.quadraticCurveTo(x+lean*.1,128-h*.55,x+lean,128-h);gg.quadraticCurveTo(x+lean*.23,128-h*.45,x+w,128);gg.closePath();gg.fill();}
 const grassTexture=new T.CanvasTexture(grassCanvas);grassTexture.colorSpace=T.SRGBColorSpace;grassTexture.anisotropy=4;
 const bladePositions=[],bladeColors=[],bladeIndices=[],bladeUV=[];
 for(let j=0;j<3;j++){const a=j*Math.PI/3,c=Math.cos(a)*.46,s=Math.sin(a)*.46,n=bladePositions.length/3;
 bladePositions.push(-c,0,-s,c,0,s,c,.25,s,-c,.25,-s);bladeUV.push(0,0,1,0,1,1,0,1);bladeIndices.push(n,n+1,n+2,n,n+2,n+3);for(let k=0;k<4;k++)bladeColors.push(...(k<2?[.95,1,.92]:[1,1,1]));}
 const grassG=new T.BufferGeometry();grassG.setAttribute('position',new T.Float32BufferAttribute(bladePositions,3));grassG.setAttribute('color',new T.Float32BufferAttribute(bladeColors,3));grassG.setAttribute('uv',new T.Float32BufferAttribute(bladeUV,2));grassG.setIndex(bladeIndices);const grassNormals=[];for(let i=0;i<bladePositions.length/3;i++)grassNormals.push(0,1,0);grassG.setAttribute('normal',new T.Float32BufferAttribute(grassNormals,3));
 const grassM=new T.MeshLambertMaterial({map:grassTexture,alphaTest:.4,color:0xffffff,side:T.DoubleSide,vertexColors:true});grassM.onBeforeCompile=s=>{s.uniforms.windTime={value:0};grassM.userData.shader=s;s.fragmentShader=s.fragmentShader.replace('#include <normal_fragment_begin>','#include <normal_fragment_begin>\nnormal=normalize(vNormal);');s.vertexShader='uniform float windTime;\n'+s.vertexShader;s.vertexShader=s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n transformed.x += sin(windTime*1.6+instanceMatrix[3].x*.25+instanceMatrix[3].z*.18)*position.y*.18;');};
 const blades=new T.InstancedMesh(grassG,grassM,80000);let n=0;for(let i=0;i<140000&&n<80000;i++){let x,z;if(i<39000){x=(random()-.5)*70;z=100+(random()-.5)*65;}else{x=(random()-.5)*345;z=(random()-.5)*345;}const y=heightAt(x,z);if(trailMask.has(Math.round(x)+","+Math.round(z))||y<1.3||Math.hypot(x+53,z-9)<23||Math.hypot(x-65,z+108)<23||Math.hypot(x,z-105)<1.5)continue;o.position.set(x,y-.025,z);const scale=.65+random()*.8;o.scale.set(scale,scale,scale);o.rotation.set(0,random()*TAU,0);o.updateMatrix();blades.setMatrixAt(n,o.matrix);light.copy(a).lerp(b,(Math.sin(x*.07+z*.025)+Math.cos(z*.05))*.14+.25).multiplyScalar(1.04+random()*.24);blades.setColorAt(n++,light);}blades.count=n;
 const grassChunks=[],buckets=new Map(),gm=new T.Matrix4(),gc=new T.Color();
 for(let j=0;j<n;j++){blades.getMatrixAt(j,gm);blades.getColorAt(j,gc);const x=Math.floor(gm.elements[12]/20),z=Math.floor(gm.elements[14]/20),key=x+','+z;if(!buckets.has(key))buckets.set(key,{x:x*20+10,z:z*20+10,items:[]});buckets.get(key).items.push({matrix:gm.clone(),color:gc.clone()});}
 for(const b of buckets.values()){const m=new T.InstancedMesh(grassG,grassM,b.items.length);b.items.forEach((v,j)=>{m.setMatrixAt(j,v.matrix);m.setColorAt(j,v.color);});m.computeBoundingSphere();scene.add(m);grassChunks.push({mesh:m,x:b.x,z:b.z});}

 // Flower meadows concentrate at the overlook and along the valley.
 const fp=[],fi=[];for(let petal=0;petal<5;petal++){const a=petal/5*TAU,cx=Math.cos(a)*.065,cz=Math.sin(a)*.065,start=fp.length/3;fp.push(cx,.2,cz);for(let j=0;j<=8;j++){const q=j/8*TAU;fp.push(cx+Math.cos(q)*.064,.2+Math.sin(q)*.012,cz+Math.sin(q)*.044);if(j)fi.push(start,start+j,start+j+1);}}
 const fg=new T.BufferGeometry();fg.setAttribute('position',new T.Float32BufferAttribute(fp,3));fg.setIndex(fi);fg.computeVertexNormals();const flowers=new T.InstancedMesh(fg,mat(0xffffff,{side:T.DoubleSide}),2400);
 for(let i=0;i<2400;i++){let x,z;if(i<1800){const patch=i%5,px=[-7,9,-15,16,-4][patch],pz=[101,103,111,114,90][patch],a=random()*TAU,r=Math.sqrt(random())*(4.8+patch*.55);x=px+Math.cos(a)*r;z=pz+Math.sin(a)*r*.7;}else{x=(random()-.5)*300;z=(random()-.5)*300;}const y=heightAt(x,z);o.position.set(x,y>1?y:-20,z);const s=.42+random()*.48;o.scale.setScalar(s);o.rotation.set(0,random()*TAU,0);o.updateMatrix();flowers.setMatrixAt(i,o.matrix);flowers.setColorAt(i,new T.Color(i%4?0xffdc64:0xfffced));}scene.add(flowers);
 // Stone outcrops frame the hilltop and distant slopes.
 const rocks=new T.InstancedMesh(new T.IcosahedronGeometry(1,0),mat(0x8d9e91),110);for(let i=0;i<110;i++){let x=(random()-.5)*355,z=(random()-.5)*355;const y=heightAt(x,z);o.position.set(x,y-.2,z);o.scale.set(1+random()*2,.5+random()*2,1+random()*1.6);o.rotation.set(random(),random()*TAU,random()*.3);o.updateMatrix();rocks.setMatrixAt(i,o.matrix);if(y>1)solids.push({x,z,r:o.scale.x*.65});}rocks.castShadow=true;rocks.receiveShadow=true;scene.add(rocks);
 function house(x,z,s=1,rot=0){const g=new T.Group();g.position.set(x,heightAt(x,z),z);g.rotation.y=rot;g.scale.setScalar(s);scene.add(g);box(g,0xe2dab8,0,2.1,0,5,4.2,4);box(g,0x687e70,0,.22,0,5.3,.44,4.3);for(const side of [-1,1]){box(g,0x73674c,side*2.35,2.2,2.03,.17,4.2,.12);box(g,0x73674c,0,2.7,side*2.02,5,.14,.15);}const roof=mesh(new T.ConeGeometry(4.1,2.7,4),0x517e88,g,0,5.5,0);roof.rotation.y=Math.PI/4;roof.scale.z=.87;roof.material=buildingMaterials.roof;box(g,0x695a41,0,1.1,2.06,1.15,2.2,.16);for(const side of [-1,1]){box(g,0x6c9ba0,side*1.5,2.2,2.07,.85,1.15,.08);box(g,0xf4e6af,side*1.5,2.2,2.13,.08,1.2,.08);box(g,0xf4e6af,side*1.5,2.2,2.14,.9,.08,.08);}box(g,0xb6bca5,1.3,5.5,-.5,.65,2,.65);dressHouse(g,buildingMaterials);solids.push({x,z,r:2.8*s});return g;}
 [[-64,4,1,0],[-42,1,.85,-.3],[-66,21,.85,.4],[-40,23,.9,-.4],[-55,-8,1.2,0],[-78,-5,.8,.2]].forEach(v=>house(...v));
 function windmill(x,z,s=1){const g=new T.Group();g.position.set(x,heightAt(x,z),z);g.scale.setScalar(s);scene.add(g);cyl(g,0xe8dfbc,0,3.8,0,1.3,2.0,7.6,10);mesh(new T.ConeGeometry(2.2,2.8,10),0x4e7b88,g,0,8.6,0);const rotor=new T.Group();rotor.position.set(0,7.6,1.55);g.add(rotor);for(let i=0;i<4;i++){const arm=new T.Group();arm.rotation.z=i*Math.PI/2;rotor.add(arm);box(arm,0x7f7358,0,2.1,0,.10,4.5,.12);box(arm,0xf4e5bd,.36,2.6,0,.75,2.7,.08);for(let j=0;j<5;j++)box(arm,0xb4a47a,.36,1.5+j*.52,.06,.78,.045,.04);}orb(rotor,0xd1ba83,0,0,.1,.25);windmills.push(rotor);solids.push({x,z,r:1.8*s});}
 windmill(-74,37,1.2);windmill(-28,-17,.9);windmill(-93,1,.8);
 // A recognizable skyline: a small walled town with towers and a cathedral.
 const town=new T.Group();town.position.set(-53,4.2,-9);scene.add(town);
 for(const side of [-1,1]){box(town,buildingMaterials.stone,side*13,2.5,0,19,5,1.5);for(let k=0;k<10;k++)box(town,0xd3d6c2,side*13-9+k*2,5.3,0,1,.8,1.6);
 const tower=new T.Group();tower.position.set(side*24,0,0);town.add(tower);cyl(tower,buildingMaterials.stone,0,4,0,2,2.3,8,12);cyl(tower,0xd7dcc7,0,8,0,2.35,2.35,.8,12);for(let k=0;k<8;k++){const a=k/8*TAU;box(tower,0xd8dcca,Math.sin(a)*2,8.8,Math.cos(a)*2,.7,.9,.7);}mesh(new T.ConeGeometry(2.15,3.7,8),0x698b95,tower,0,10.5,0);}
 const church=new T.Group();church.position.set(0,0,-11);town.add(church);box(church,buildingMaterials.stone,0,5.5,0,8,11,12);const cr=mesh(new T.ConeGeometry(7.5,5,4),0x718e99,church,0,13,0);cr.rotation.y=Math.PI/4;cr.scale.z=1.35;
 for(const side of [-1,1]){cyl(church,buildingMaterials.stone,side*4,8,5,1.3,1.5,16,8);mesh(new T.ConeGeometry(1.65,7,8),0x6d8999,church,side*4,19,5);cyl(church,0xe5dfbc,side*4,23.4,5,.04,.1,1.8,6);box(church,0x6a929b,side*2,7,6.04,.8,4,.06);}box(church,0x718885,0,2.7,6.1,2.1,5.4,.1);
 // Stone buttresses and a radial window give the cathedral a readable facade.
 for(const side of [-1,1])for(const z of [-4.8,-1.6,1.6,4.5]){box(church,buildingMaterials.stone,side*4.2,3.6,z,.65,7.2,.85);box(church,0xd7d5b9,side*4.2,.35,z,1.05,.7,1.2);box(church,0xe1dcc4,side*4.2,7.2,z,.85,.25,1.05);}
 mesh(new T.CircleGeometry(1.07,32),mat(0x4c849a),church,0,8.7,6.09);
 mesh(new T.TorusGeometry(1.11,.13,6,32),buildingMaterials.stone,church,0,8.7,6.14);
 mesh(new T.TorusGeometry(.36,.045,5,20),0xdccc9b,church,0,8.7,6.2);
 for(let i=0;i<8;i++){const a=i/8*TAU,bar=box(church,0xdccc9b,Math.sin(a)*.69,8.7+Math.cos(a)*.69,6.18,.045,.70,.045);bar.rotation.z=-a;}
 for(const side of [-1,1])box(church,buildingMaterials.stone,side*1.26,2.7,6.19,.28,5.5,.26);

 for(const side of [-1,1]){solids.push({x:-53+side*24,z:-9,r:2.3});for(let j=0;j<10;j++)solids.push({x:-53+side*13-9+j*2,z:-9,r:1});}solids.push({x:-53,z:-20,r:5});
 // Ancient stone sanctuary, open arches and a central wind crystal.
 const ruins=new T.Group();ruins.position.set(65,heightAt(65,-108),-108);scene.add(ruins);
 cyl(ruins,0xb4c0b1,0,.08,0,13,13,.3,32);
 for(let i=0;i<12;i++){const a=i/12*TAU,x=Math.cos(a)*12,z=Math.sin(a)*12,h=i%4===0?3:6.5;cyl(ruins,0xcbd1bb,x,h/2,z,.48,.58,h,8);cyl(ruins,0xdde1cd,x,.15,z,.9,.9,.3,8);cyl(ruins,0xdde1cd,x,h,z,.8,.8,.35,8);solids.push({x:65+x,z:-108+z,r:.6});if(i%3===0)box(ruins,0xb5c1b8,x,h+.3,z,3.8,.6,1.2).rotation.y=-a;}
 const crystal=mesh(new T.OctahedronGeometry(1.35),mat(0x77d8ce,{emissive:0x3f9692,emissiveIntensity:.55}),ruins,0,3,0);cyl(ruins,0x9aafa8,0,.6,0,2.1,2.5,1,8);
 // Grove's monumental old tree.
 const ancient=new T.Group();ancient.position.set(-100,heightAt(-100,-61),-61);scene.add(ancient);cyl(ancient,0x7b7555,0,4,0,1.2,2.3,8,9);for(let i=0;i<7;i++){const a=i/7*TAU;const c=mesh(new T.IcosahedronGeometry(4,1),i%2?0x83af76:0x5f946f,ancient,Math.cos(a)*3.1,9+Math.sin(i)*1.3,Math.sin(a)*2.8);c.scale.y=.7;}solids.push({x:-100,z:-61,r:2.0});
 // Bridges/deck at Mirrorwater, outside collision water so the bank is accessible.
 const dock=new T.Group();dock.position.set(80,heightAt(80,56)+.15,56);scene.add(dock);for(let i=0;i<13;i++)box(dock,0xa58e67,0,0,-i*.55,3,.18,.48);for(const s of [-1,1])for(let i=0;i<3;i++)cyl(dock,0x817453,s*1.45,-.7,-i*3,.1,.12,2.4,6);
 // Waypoints are persistent, individually unlockable travel destinations.
 for(const l of LANDMARKS){const x=l.id==='lake'?80:l.x+(l.id==='grove'?5:l.id==='overlook'?6:l.id==='winery'?9:0),z=l.id==='lake'?56:l.z+(l.id==='overlook'?3:0);const g=new T.Group();g.position.set(x,heightAt(x,z),z);scene.add(g);cyl(g,0x9daea5,0,.12,0,.85,1,.24,8);cyl(g,0xe4dfc5,0,.65,0,.16,.24,1,8);const gem=mesh(new T.OctahedronGeometry(.34),mat(0x86ded7,{emissive:0x378e89,emissiveIntensity:.6}),g,0,1.65,0);const ring=mesh(new T.TorusGeometry(.63,.025,6,32),0xe6c981,g,0,1.6,0);ring.rotation.x=Math.PI/2;waypoints.push({...l,x,z,mesh:g,gem,ring});}
 const chestPoints=[[-18,82],[-78,40],[78,63],[-110,-45],[-24,-43],[84,-77],[108,-123],[-34,116]];
 chestPoints.forEach(([x,z],i)=>{const g=new T.Group();g.position.set(x,heightAt(x,z),z);scene.add(g);box(g,0x786348,0,.35,0,1.1,.6,.75);const lid=new T.Group();lid.position.set(0,.63,-.35);g.add(lid);box(lid,0xb18f51,0,.12,.35,1.13,.27,.78);for(const s of [-1,1])box(g,0xedd08b,s*.35,.42,.39,.09,.7,.04);box(g,0xf3d596,0,.45,.41,.18,.24,.05);chests.push({id:'chest'+i,x,z,mesh:g,lid});});
 [[-22,89],[-58,41],[-86,-30],[33,-59],[84,70],[100,-83]].forEach(([x,z],i)=>{const g=new T.Group();g.position.set(x,heightAt(x,z)+1.25,z);scene.add(g);mesh(new T.OctahedronGeometry(.27),mat(0xa2eddb,{emissive:0x4a968c,emissiveIntensity:.9}),g);const r=mesh(new T.TorusGeometry(.5,.025,6,24),0xf7d58b,g);r.rotation.x=.4;sigils.push({id:'sigil'+i,x,z,mesh:g});});
 function portal(x,z,i){const g=new T.Group();g.position.set(x,heightAt(x,z),z);scene.add(g);for(const s of [-1,1]){cyl(g,0xc8ceb5,s*1.65,1.7,0,.35,.48,3.4,8);cyl(g,0xe4d9ac,s*1.65,3.4,0,.5,.5,.25,8);}box(g,0xcbd1b9,0,3.7,0,4,.5,.8);const glow=mesh(new T.PlaneGeometry(2.7,3.2),new T.MeshBasicMaterial({color:i?0x8ba8f5:0x82ddd1,transparent:true,opacity:.22,side:T.DoubleSide,depthWrite:false}),g,0,1.8,0);portals.push({x,z,index:i,mesh:g,glow});}
 portal(-27,-40,0);portal(65,-96,1);
 const npc=new T.Group();npc.position.set(-53,heightAt(-53,17),17);scene.add(npc);cyl(npc,0x638d89,0,.75,0,.25,.4,1.25,8);orb(npc,0xf3ceb0,0,1.5,0,.22,.27,.22);orb(npc,0x5d4c3a,0,1.65,-.03,.24,.2,.22);mesh(new T.ConeGeometry(.5,.3,8),0xc8b98c,npc,0,1.88,0);for(const s of [-1,1])cyl(npc,0xe7dabe,s*.3,1.05,0,.075,.07,.6,8).rotation.z=s*.18;
 const residents=makeResidents(scene,solids);npc.removeFromParent();const landmarkArt=addLandmarks(scene,solids);const campArt=makeCampArt(scene,solids,trailMask);
 // Bake static buildings and decorations by material to reduce draw calls.
 const animated=new Set([ground,water,crystal,npc,...windmills,...waypoints.map(x=>x.mesh),...chests.map(x=>x.mesh),...sigils.map(x=>x.mesh),...portals.map(x=>x.mesh),...residents.list.map(x=>x.rig.root)]),groups=new Map();scene.updateMatrixWorld(true);
 scene.traverse(m=>{if(!m.isMesh||m.isInstancedMesh||Array.isArray(m.material))return;for(let p=m;p&&p!==scene;p=p.parent)if(animated.has(p)||p.userData.dynamic)return;const key=m.material.uuid+'_'+m.castShadow+'_'+m.receiveShadow;if(!groups.has(key))groups.set(key,[]);groups.get(key).push(m);});
 for(const items of groups.values()){if(items.length<3)continue;const geos=items.map(m=>{let g=m.geometry.clone();if(g.index)g=g.toNonIndexed();g.applyMatrix4(m.matrixWorld);return g;}),geo=mergeGeometries(geos,false);if(!geo)continue;const m=new T.Mesh(geo,items[0].material);m.castShadow=items[0].castShadow;m.receiveShadow=items[0].receiveShadow;for(const old of items){old.removeFromParent();old.geometry.dispose();}geos.forEach(g=>g.dispose());scene.add(m);}
 return{residents,campSites:campArt.camps,terrain:ground,solids,waypoints,chests,sigils,portals,npc,update(t,dt=0,focus={x:0,z:105}){for(const c of grassChunks)c.mesh.visible=Math.hypot(c.x-focus.x,c.z-focus.z)<85;for(const n of residents.list)n.rig.root.visible=Math.hypot(n.x-focus.x,n.z-focus.z)<90;residents.update(t,dt);landmarkArt.update(t);campArt.update(t,focus);distantLandscape.update(t);water.material.uniforms.time.value=t;if(grassM.userData.shader)grassM.userData.shader.uniforms.windTime.value=t;windmills.forEach((m,i)=>m.rotation.z=t*(.15+i*.025));crystal.rotation.y=t*.3;crystal.position.y=3+Math.sin(t)*.2;waypoints.forEach(w=>{w.gem.rotation.y=t;w.gem.position.y=1.65+Math.sin(t*2)*.12;w.ring.rotation.z=t*.25;});sigils.forEach(s=>{s.mesh.rotation.y=t;s.mesh.position.y=heightAt(s.x,s.z)+1.3+Math.sin(t*2+s.x)*.2;});}};
}
export function makeSky(scene){const g=new T.SphereGeometry(700,32,20),m=new T.ShaderMaterial({side:T.BackSide,depthWrite:false,toneMapped:false,uniforms:{top:{value:new T.Color('#168be1')},bottom:{value:new T.Color('#a4ddf4')}},vertexShader:'varying vec3 v;void main(){v=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'varying vec3 v;uniform vec3 top;uniform vec3 bottom;void main(){float h=normalize(v).y;gl_FragColor=vec4(mix(bottom,top,pow(max(h,0.),.23)),1.);\n#include <colorspace_fragment>\n}'});const s=new T.Mesh(g,m);scene.add(s);return s;}
