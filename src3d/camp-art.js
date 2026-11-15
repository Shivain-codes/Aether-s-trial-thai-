import * as T from 'three';
import {heightAt,rng,WATER,LANDMARKS} from './core.js';
import {ENEMY_CAMPS,encounterRoster} from './enemy-config.js';

// Locally generated expedition props. Static geometry is collected by world.js's material batching.
export function makeCampArt(parent,solids,trailMask){
 const random=rng(76331),fires=[],campSites=[],spawns=encounterRoster(0,true),TAU=Math.PI*2;
 const lambert=(color,extra={})=>new T.MeshLambertMaterial({color,...extra});
 const wood=lambert('#846346'),cutWood=lambert('#c4a774'),iron=lambert('#414e4e'),stone=lambert('#83928c'),sandStone=lambert('#b1b2a0'),rope=lambert('#b6a47a'),dark=lambert('#3a3f37');
 const moss=lambert('#729a52'),coals=lambert('#552a1c',{emissive:0xaf3b0c,emissiveIntensity:.6});
 const themes=[{cloth:'#c29b68',trim:'#a34c39'},{cloth:'#c7c9a2',trim:'#487f86'},{cloth:'#aca996',trim:'#65547b'},{cloth:'#d9c49b',trim:'#7d8c46'}];
 function fabric(color){const c=document.createElement('canvas');c.width=c.height=128;const g=c.getContext('2d');g.fillStyle=color;g.fillRect(0,0,128,128);g.strokeStyle='#fff8dd3d';g.lineWidth=2;for(let x=7;x<128;x+=30){g.beginPath();g.moveTo(x,0);g.lineTo(x,128);g.stroke();}for(let y=0;y<128;y+=8){g.fillStyle='#55473324';g.fillRect(7,y,3,3);g.fillRect(97,y,3,3);}const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;return t;}
 const cloth=themes.map(v=>lambert(0xffffff,{map:fabric(v.cloth),side:T.DoubleSide})),trim=themes.map(v=>lambert(v.trim,{side:T.DoubleSide}));
 function mesh(g,m,root,x=0,y=0,z=0){if(!g.attributes.uv)g.setAttribute('uv',new T.Float32BufferAttribute(new Float32Array(g.attributes.position.count*2),2));const a=new T.Mesh(g,m);a.position.set(x,y,z);a.castShadow=true;a.receiveShadow=true;root.add(a);return a;}
 function box(root,m,x,y,z,w,h,d){return mesh(new T.BoxGeometry(w,h,d),m,root,x,y,z);}
 function rod(root,m,a,b,r=.065,r2=r){const av=new T.Vector3(...a),bv=new T.Vector3(...b),delta=bv.clone().sub(av);const o=mesh(new T.CylinderGeometry(r2,r,delta.length(),6),m,root);o.position.copy(av.add(bv).multiplyScalar(.5));o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),delta.normalize());return o;}
 function group(x,z,yaw=0){const g=new T.Group();g.position.set(x,heightAt(x,z),z);g.rotation.y=yaw;parent.add(g);return g;}
 function clearTrail(x,z,r){for(let xx=-Math.ceil(r+1);xx<=Math.ceil(r+1);xx++)for(let zz=-Math.ceil(r+1);zz<=Math.ceil(r+1);zz++)if(xx*xx+zz*zz<(r+1.5)**2&&trailMask.has(Math.round(x+xx)+','+Math.round(z+zz)))return false;return true;}
 function safe(x,z,r,extra=0,slope=1.45){const h=heightAt(x,z);if(h<WATER+1||Math.abs(x)>168||Math.abs(z)>168||!clearTrail(x,z,r))return false;
  if(spawns.some(s=>Math.hypot(s.x-x,s.z-z)<r+2.3+extra))return false;
  if(solids.some(s=>Math.hypot(s.x-x,s.z-z)<s.r+r+.35))return false;
  const sample=[heightAt(x-r,z),heightAt(x+r,z),heightAt(x,z-r),heightAt(x,z+r)];return Math.min(...sample)>WATER+.5&&Math.max(...sample)-Math.min(...sample)<slope;
 }
 function findSpot(c,r,start=0,ring=8,slope=1.45){for(let n=0;n<54;n++){const angle=start+n*2.39996,rad=ring+Math.floor(n/18)*2.6,x=c.x+Math.cos(angle)*rad,z=c.z+Math.sin(angle)*rad;if(safe(x,z,r,0,slope))return{x,z};}return null;}
 function block(x,z,r){solids.push({x,z,r,kind:'camp-scenery'});}
 function tent(p,theme,face){const g=group(p.x,p.z,face),positions=[],uv=[],indices=[];
  if(theme===1){
   const feet=[];for(const x of [-1.95,1.95])for(const z of [-2.25,2.25]){const wx=p.x+Math.cos(face)*x+Math.sin(face)*z,wz=p.z-Math.sin(face)*x+Math.cos(face)*z;feet.push({x,z,y:heightAt(wx,wz)});}
   g.position.y=Math.max(...feet.map(v=>v.y))+.18;
   for(const f of feet)rod(g,wood,[f.x,f.y-g.position.y-.12,f.z],[f.x,.02,f.z],.11);
   for(let j=0;j<12;j++)box(g,cutWood,0,-.09,-2.2+j*.4,4.1,.16,.36);
  }

  for(const side of [-1,1]){const offset=positions.length/3;for(let row=0;row<3;row++)for(let j=0;j<6;j++){const z=-2.2+j*.88,x=side*row*.95,y=[2.55,1.52,.20][row]-.13*Math.sin(j/5*Math.PI)*(row===0?.4:1);positions.push(x,y,z);uv.push(row/2,j/5);}for(let row=0;row<2;row++)for(let j=0;j<5;j++){const k=offset+row*6+j;indices.push(k,k+1,k+6,k+1,k+7,k+6);}}
  const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(positions,3));geo.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geo.setIndex(indices);geo.computeVertexNormals();mesh(geo,cloth[theme],g);
  // Back wall and tied-back front flaps keep the timber A-frame legible.
  const back=new T.BufferGeometry();back.setAttribute('position',new T.Float32BufferAttribute([-1.9,.15,-2.19,1.9,.15,-2.19,0,2.55,-2.19],3));back.setAttribute('uv',new T.Float32BufferAttribute([0,0,1,0,.5,1],2));back.computeVertexNormals();mesh(back,cloth[theme],g);
  for(const side of [-1,1]){rod(g,wood,[side*2.05,-.12,2.28],[0,2.7,2.28],.075);rod(g,wood,[side*2.05,-.12,-2.28],[0,2.7,-2.28],.075);
   const flap=new T.BufferGeometry();flap.setAttribute('position',new T.Float32BufferAttribute([0,2.54,2.2,side*1.9,.18,2.2,side*1.25,.3,2.23,0,2.54,2.2,side*1.25,.3,2.23,side*.52,1.5,2.25],3));flap.computeVertexNormals();mesh(flap,trim[theme],g);
   for(const z of [-2.2,2.2]){rod(g,rope,[side*1.8,.35,z],[side*2.5,.03,z*1.15],.015);rod(g,wood,[side*2.5,-.05,z*1.15],[side*2.5,.25,z*1.15],.035);}
   // Pole-height samples prevent the feet floating on the gentle camp slopes.
  }
  rod(g,wood,[0,2.68,-2.5],[0,2.68,2.5],.085);box(g,dark,0,.045,0,2.9,.07,3.8);box(g,cloth[theme],.7,.13,-.9,.75,.16,1.6);
  for(const dz of [-1.18,1.18])block(p.x+Math.sin(face)*dz,p.z+Math.cos(face)*dz,1.88);
  return g;
 }
 function crate(p,s=1){const g=group(p.x,p.z,random()*.3);box(g,wood,0,.5*s,0,s,s,s);for(const side of [-1,1])for(const y of [.1,.88])box(g,cutWood,0,y*s,side*.51*s,s*1.04,.09*s,.055*s);for(const side of [-1,1]){box(g,cutWood,side*.42*s,.5*s,.52*s,.09*s,s,.055*s);const brace=box(g,cutWood,0,.5*s,.55*s,.07*s,1.15*s,.05*s);brace.rotation.z=side*.74;}block(p.x,p.z,s*.68);return g;}
 function barrel(p){const g=group(p.x,p.z);mesh(new T.CylinderGeometry(.39,.35,.98,10,3),wood,g,0,.49,0);for(const y of [.12,.78])mesh(new T.TorusGeometry(.405,.035,5,10),iron,g,0,y,0).rotation.x=Math.PI/2;mesh(new T.CylinderGeometry(.37,.37,.045,10),cutWood,g,0,1,0);for(let j=0;j<6;j++){const a=j/6*TAU;rod(g,dark,[Math.cos(a)*.40,.06,Math.sin(a)*.40],[Math.cos(a)*.40,.94,Math.sin(a)*.40],.01);}block(p.x,p.z,.44);}
 function banner(p,theme){const g=group(p.x,p.z,random()*TAU);rod(g,wood,[0,-.1,0],[0,3.2,0],.06);rod(g,wood,[-.08,2.95,0],[1.1,2.95,0],.04);const shape=new T.Shape();shape.moveTo(.06,2.88);shape.lineTo(1.02,2.88);shape.lineTo(.97,1.43);shape.lineTo(.56,1.64);shape.lineTo(.09,1.4);shape.closePath();mesh(new T.ShapeGeometry(shape),trim[theme],g,0,0,.025);for(const x of [.14,.88])rod(g,rope,[x,2.9,.04],[x,2.68,.04],.015);const rune=mesh(new T.TorusGeometry(.18,.024,4,4),cutWood,g,.55,2.23,.065);rune.rotation.z=Math.PI/4;}
 function trainingPost(p,theme){const g=group(p.x,p.z);rod(g,wood,[0,-.18,0],[0,1.8,0],.12);rod(g,wood,[-.63,1.2,0],[.63,1.2,0],.06);mesh(new T.CylinderGeometry(.3,.28,.65,8),rope,g,0,1.4,0);mesh(new T.SphereGeometry(.23,8,6),cloth[theme],g,0,1.98,0);for(const x of [-.43,.43])rod(g,wood,[0,.1,0],[x,.02,.3],.07);}
 const fc=document.createElement('canvas');fc.width=128;fc.height=192;const fg=fc.getContext('2d');
 const glow=fg.createRadialGradient(64,135,6,64,120,67);glow.addColorStop(0,'#ffdf6fee');glow.addColorStop(.35,'#ff9b31bd');glow.addColorStop(1,'#f8480000');fg.fillStyle=glow;fg.fillRect(0,0,128,192);
 for(let j=0;j<7;j++){const x=37+j*9,h=55+random()*90;const grad=fg.createLinearGradient(0,175,0,175-h);grad.addColorStop(0,'#fff4b4');grad.addColorStop(.35,'#ffbb48e0');grad.addColorStop(1,'#ed4c0900');fg.fillStyle=grad;fg.beginPath();fg.moveTo(x-12,176);fg.bezierCurveTo(x-17,150,x+19,175-h*.7,x,175-h);fg.bezierCurveTo(x+23,175-h*.3,x+18,160,x+12,176);fg.fill();}
 const flameMap=new T.CanvasTexture(fc);flameMap.colorSpace=T.SRGBColorSpace;
 const flameMat=new T.SpriteMaterial({map:flameMap,transparent:true,depthWrite:false,blending:T.AdditiveBlending,toneMapped:false});
 function fire(p,theme){const g=group(p.x,p.z);for(let j=0;j<9;j++){const a=j/9*TAU;const rock=mesh(new T.IcosahedronGeometry(.19,0),stone,g,Math.cos(a)*.69,.1,Math.sin(a)*.69);rock.scale.set(1.4,.7,1);}
  for(let j=0;j<3;j++){const a=j/3*Math.PI;rod(g,wood,[Math.cos(a)*-.5,.11,Math.sin(a)*-.5],[Math.cos(a)*.5,.16,Math.sin(a)*.5],.095);}
  for(let j=0;j<8;j++)mesh(new T.IcosahedronGeometry(.1,0),coals,g,(random()-.5)*.6,.19,(random()-.5)*.6);
  const ember=mesh(new T.CircleGeometry(.65,20),new T.MeshBasicMaterial({color:0xf07b24,transparent:true,opacity:.16,depthWrite:false,blending:T.AdditiveBlending}),g,0,.012,0);ember.rotation.x=-Math.PI/2;ember.castShadow=false;
  const flame=new T.Sprite(flameMat);flame.position.set(p.x,heightAt(p.x,p.z)+.65,p.z);flame.scale.set(1.0,1.45,1);parent.add(flame);fires.push({mesh:flame,x:p.x,z:p.z,y:heightAt(p.x,p.z),phase:random()*TAU});
  // Three supports surround a suspended pot; no point light is needed for the ember glow.
  for(let j=0;j<3;j++){const a=j/3*TAU;rod(g,wood,[Math.cos(a)*.85,0,Math.sin(a)*.85],[0,1.8,0],.04);}
  rod(g,iron,[0,1.8,0],[0,.95,0],.015);const pot=mesh(new T.SphereGeometry(.31,12,7,0,TAU,Math.PI*.28,Math.PI*.72),iron,g,0,.92,0);pot.scale.y=.8;mesh(new T.TorusGeometry(.28,.035,5,12),iron,g,0,1.03,0).rotation.x=Math.PI/2;
 }
 function identity(p,theme){const g=group(p.x,p.z);
  if(theme===1){for(const x of [-.9,.9])rod(g,wood,[x,0,0],[x,1.7,0],.06);rod(g,wood,[-1,1.65,0],[1,1.65,0],.05);for(let j=0;j<4;j++){const x=-.62+j*.4;rod(g,rope,[x,1.65,0],[x,1.2,0],.012);const fish=mesh(new T.SphereGeometry(.13,8,5),sandStone,g,x,.98,0);fish.scale.set(.58,1.8,.5);const tail=mesh(new T.ConeGeometry(.13,.18,3),sandStone,g,x,1.23,0);tail.rotation.z=Math.PI;}}
  else if(theme===2){for(let j=0;j<3;j++){const x=(j-1)*.75,m=mesh(new T.CylinderGeometry(.2,.32,1.2+j*.3,5),stone,g,x,.5+j*.1,0);m.rotation.z=(j-1)*.1;const sigil=mesh(new T.TorusGeometry(.12,.025,4,4),trim[theme],g,x,.75+j*.1,.28);sigil.rotation.z=Math.PI/4;}}
  else if(theme===3){const wheel=mesh(new T.TorusGeometry(.55,.07,6,12),wood,g,0,.58,0);for(let j=0;j<6;j++){const a=j/6*Math.PI;rod(g,cutWood,[Math.cos(a)*-.52,.58+Math.sin(a)*-.52,0],[Math.cos(a)*.52,.58+Math.sin(a)*.52,0],.025);}wheel.rotation.y=.2;box(g,cloth[theme],.8,.25,0,.55,.5,.65);}
  else trainingPost(p,theme);
 }
 const themeIds={road:0,shore:1,'ruin-path':2,'vine-path':3,grove:0,ridge:3,north:0,sentinel:2};
 for(const [i,c]of ENEMY_CAMPS.entries()){
  const theme=themeIds[c.id],angle=(i*1.7+.5),tentSpot=findSpot(c,2.8,angle,8.2,theme===1?3.2:1.45);
  if(tentSpot)tent(tentSpot,theme,Math.atan2(c.x-tentSpot.x,c.z-tentSpot.z));
  const fireSpot=findSpot(c,.8,angle+2.4,5.6);if(fireSpot)fire(fireSpot,theme);
  const bannerSpot=findSpot(c,.3,angle+.5,8.6);if(bannerSpot)banner(bannerSpot,theme);
  for(let j=0;j<3;j++){const p=findSpot(c,j===2?.5:.75,angle+1.1+j*.55,8.7);if(p)(j===2?barrel(p):crate(p,.9+j*.2));}
  const detail=findSpot(c,1,angle+3.7,7.3);if(detail)identity(detail,theme);
  campSites.push({id:c.id,theme,tent:tentSpot,fire:fireSpot});
 }
 // Small stratified outcrops follow existing raised terrain and always have matching collision.
 const rockBands=[lambert('#8a9b98'),lambert('#acb6a9'),lambert('#8e9d96'),lambert('#c0c6b0')];
 let rockCount=0;
 for(let i=0;i<420&&rockCount<17;i++){
  const x=(random()-.5)*325,z=(random()-.5)*325,r=1.65+random()*1.5,h=heightAt(x,z);
  if(h<7.5||!safe(x,z,r+1,8)||LANDMARKS.some(l=>Math.hypot(l.x-x,l.z-z)<20))continue;
  const g=group(x,z,random()*TAU),sides=9,profile=Array.from({length:sides},()=>.82+random()*.22),lift=1.1+random()*1.8;
  for(let band=0;band<4;band++){
   const positions=[],ids=[],y0=-.8+band*lift/4,y1=y0+lift/4+.045,lower=1-band*.065,upper=lower-.04;
   for(let j=0;j<sides;j++){const a=j/sides*TAU,rad=r*profile[j];positions.push(Math.cos(a)*rad*lower,y0,Math.sin(a)*rad*lower,Math.cos(a)*rad*upper,y1+(random()-.5)*.10,Math.sin(a)*rad*upper);}
   for(let j=0;j<sides;j++){const k=j*2,n=(j+1)%sides*2;ids.push(k,n,k+1,n,n+1,k+1);}const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(positions,3));geo.setIndex(ids);geo.computeVertexNormals();mesh(geo,rockBands[band],g);
  }
  const cap=new T.CylinderGeometry(r*.72,r*.75,.14,sides);mesh(cap,moss,g,0,lift-.76,0);block(x,z,r*.93);rockCount++;
 }
 const sparksGeometry=new T.BufferGeometry();sparksGeometry.setAttribute('position',new T.Float32BufferAttribute(new Float32Array(fires.length*5*3),3));
 const sparks=new T.Points(sparksGeometry,new T.PointsMaterial({color:0xffb453,size:.045,transparent:true,opacity:.75,depthWrite:false,blending:T.AdditiveBlending,toneMapped:false}));sparks.frustumCulled=false;sparks.userData.dynamic=true;parent.add(sparks);
 return{camps:campSites,rockCount,update(t,focus){const p=sparksGeometry.attributes.position;fires.forEach((f,i)=>{const near=Math.hypot(f.x-focus.x,f.z-focus.z)<65;f.mesh.visible=near;if(near){const flicker=1+Math.sin(t*11+f.phase)*.07+Math.sin(t*17+f.phase)*.035;f.mesh.scale.set(flicker,1.45/flicker,1);}for(let j=0;j<5;j++){const a=t*.8+j*2.4+f.phase,r=.16+Math.sin(j)*.08,h=((t*.6+j*.37)%1.6);p.setXYZ(i*5+j,f.x+Math.cos(a)*r,near?f.y+.25+h:-1000,f.z+Math.sin(a)*r);}});p.needsUpdate=true;}};
}
