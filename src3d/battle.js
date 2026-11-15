import * as T from 'three';
import {makeEffects} from './effects.js';
import {mat,mesh,box,orb,cyl} from './art.js';
import {rng,hitEnemy,attack,awardXp,clamp,heightAt,moveCircle} from './core.js';
import {ENEMY_TYPES,encounterRoster,shieldResponse} from './enemy-config.js';
import {ELEMENT_COLORS as colors,makeEnemyModel,animateEnemy} from './enemy-models.js';
const labelMaterials=new Map();
export function makeBattle(scene,hooks){
 const root=new T.Group();root.visible=false;scene.add(root);
 let enemies=[],shots=[],fx=[],areas=[],chests=[],index=0,time=0,serial=0,outdoor=false,solids=[];
 const vfx=makeEffects(scene),ground=(x,z)=>outdoor?heightAt(x,z):0;
 function destroy(group){group.traverse(m=>{if(m.isMesh){m.geometry.dispose();if(m.material.userData?.transient)m.material.dispose();}});group.clear();}
 const transient=(color,opacity)=>{const m=new T.MeshBasicMaterial({color,transparent:true,opacity,side:T.DoubleSide,depthWrite:false});m.userData.transient=true;return m;};
 function healthBar(e){
 const bar=new T.Group(),back=new T.Mesh(new T.PlaneGeometry(1.2,.07),transient(0x263a46,1)),fill=new T.Mesh(new T.PlaneGeometry(1.15,.045),transient(colors[e.element],1));bar.add(back,fill);fill.position.z=.002;bar.position.y=e.mesh.userData.height||ENEMY_TYPES[e.kind].barHeight;e.mesh.add(bar);e.health=fill;e.bar=bar;
 const key=e.kind+e.element;if(!labelMaterials.has(key)){const c=document.createElement('canvas');c.width=384;c.height=64;const g=c.getContext('2d');g.font='bold 25px Trebuchet MS';g.textAlign='center';g.lineWidth=5;g.strokeStyle='#213c49';g.fillStyle='#fff3d9';const text=e.kind==='slime'?e.element[0].toUpperCase()+e.element.slice(1)+' Slime':ENEMY_TYPES[e.kind].name;g.strokeText(text,192,40);g.fillText(text,192,40);const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;labelMaterials.set(key,new T.SpriteMaterial({map:t,transparent:true,depthWrite:false}));}
 const label=new T.Sprite(labelMaterials.get(key));label.position.y=.25;label.scale.set(2.7,.45,1);bar.add(label);
 }
 function bossModel(drake){const g=new T.Group();if(!drake){orb(g,0x766955,0,1.7,0,1,1.15,.65);box(g,0xd3c6a0,0,2.75,.12,1.1,1,.5);box(g,0x424c4b,0,2.8,.39,.65,.2,.06);for(const s of [-1,1]){box(g,0xf5ae69,s*.22,2.8,.44,.13,.09,.04);cyl(g,0xaaa78d,s*.58,3.3,0,.05,.22,.9,5).rotation.z=-s*.5;orb(g,0x647370,s*1.1,2.05,0,.5,.6,.5);cyl(g,0x6b6960,s*1.3,1.2,0,.27,.33,1.3,6);cyl(g,0x5b6961,s*.48,.55,0,.33,.37,1.1,6);}box(g,0x85978b,1.55,.6,.1,.45,1.4,.4);}else{orb(g,0x748eab,0,1.7,0,.8,.9,1.35);orb(g,0xc9d9d6,0,1.8,1.35,.45,.5,.7);for(const s of [-1,1]){orb(g,0xffdfa5,s*.31,2.02,1.72,.065,.09,.07);cyl(g,0xd2c7ab,s*.35,2.45,1.2,0,.12,.65,5).rotation.z=-s*.45;const wing=new T.Group();wing.position.set(s*.5,2.1,-.2);g.add(wing);const sh=new T.Shape();sh.moveTo(0,0);sh.lineTo(s*1.4,1.25);sh.lineTo(s*3.2,.7);sh.lineTo(s*2.3,-.2);sh.lineTo(s*1.1,-.65);sh.lineTo(0,-.5);mesh(new T.ShapeGeometry(sh),mat(0x98b4c7,{side:T.DoubleSide}),wing);wing.rotation.y=s*.2;g.userData['wing'+s]=wing;cyl(g,0x658a9f,s*.6,.65,.3,.14,.1,1.2,6);}const tail=mesh(new T.ConeGeometry(.35,2.6,7),0x718ca7,g,0,1.25,-2);tail.rotation.x=-Math.PI/2;}
 return g;}
 function setup(i,options={}){
 outdoor=!!options.outdoor;solids=options.solids||[];vfx.clear();destroy(root);enemies=[];shots=[];fx=[];areas=[];chests=[];index=i;time=0;root.visible=true;
 if(!outdoor){const floor=mesh(new T.CircleGeometry(38,64),mat(i?0x6e8592:0x8caf73),root,0,-.03,0);floor.rotation.x=-Math.PI/2;floor.receiveShadow=true;floor.castShadow=false;
 const ring=mesh(new T.RingGeometry(37,39,64),mat(i?0xaabfbe:0xc7c593,{side:T.DoubleSide}),root,0,-.015,0);ring.rotation.x=-Math.PI/2;ring.castShadow=false;
 const rr=rng(450+i);for(let j=0;j<30;j++){const a=j/30*Math.PI*2,x=Math.sin(a)*40,z=Math.cos(a)*40;if(i){let h=3+rr()*6;cyl(root,0x9babaa,x,h/2,z,.6,.9,h,8);cyl(root,0xc2cabe,x,h,z,1,1,.3,8);}else{cyl(root,0x7e7657,x,2,z,.3,.55,4,7);const c=mesh(new T.IcosahedronGeometry(3,1),0x609568,root,x,5,z);c.scale.y=.8;}}
 if(i)for(let j=0;j<7;j++){const r=4+j*4;const rune=mesh(new T.RingGeometry(r,r+.045,64),transient(0xc1e3dd,.3),root,0,.02,0);rune.rotation.x=-Math.PI/2;}
 }

 for(const [j,def] of encounterRoster(i,outdoor).entries()){
 const m=makeEnemyModel(def.kind,def.element);m.position.set(def.x,ground(def.x,def.z),def.z);root.add(m);
 const e={...def,name:ENEMY_TYPES[def.kind].name,mesh:m,home:{x:def.x,z:def.z},hp:def.maxHp,hits:new Set(),cd:1+j*.13,phase:'idle',timer:0,boss:false,kb:new T.Vector2(),rewarded:false,move:0,facing:Math.PI,animationSeed:j*.91,moving:false};enemies.push(e);healthBar(e);
 }
 if(!outdoor){const bm=bossModel(!!i);bm.position.set(0,0,-12);root.add(bm);enemies.push({id:100,name:i?'Storm Drake':'Mitachurl',kind:'boss',mesh:bm,x:0,z:-12,hp:i?1200:700,maxHp:i?1200:700,element:i?'electro':'geo',hits:new Set(),cd:2,phase:'idle',timer:0,boss:true,kb:new T.Vector2(),rewarded:false,move:0,facing:Math.PI});
 for(let j=0;j<(i?2:3);j++){const x=-24+j*24,z=22,g=new T.Group();g.position.set(x,0,z);root.add(g);box(g,0x8b704d,0,.4,0,1.3,.8,.9);box(g,0xe3c47e,0,.75,0,1.4,.15,1);box(g,0xe3c47e,0,.4,.46,.15,.6,.05);chests.push({id:'trial'+i+'chest'+j,x,z,mesh:g});}

 }return enemies;
 }
 function removeMesh(m){m.removeFromParent();m.geometry.dispose();if(m.material.userData?.transient)m.material.dispose();}
 function trimFx(){while(fx.length>360){const i=fx.findIndex(f=>f.mesh);if(i<0)break;removeMesh(fx[i].mesh);fx.splice(i,1);}}
 function fxRing(x,z,r,color,life=.4,y=.1){const m=mesh(new T.RingGeometry(r*.82,r,48),transient(color,.8),root,x,ground(x,z)+y,z);m.rotation.x=-Math.PI/2;m.castShadow=false;fx.push({mesh:m,life,max:life});trimFx();}
 function particles(x,y,z,color,count=8){for(let i=0;i<count;i++){const m=mesh(new T.OctahedronGeometry(.06+Math.random()*.06),transient(color,1),root,x,y,z);m.castShadow=false;fx.push({mesh:m,life:.4+Math.random()*.35,max:1,v:new T.Vector3((Math.random()-.5)*4,1+Math.random()*3,(Math.random()-.5)*4)});}trimFx();}
 function area(x,z,r,dur,damage,source,cone=0){
 if(areas.length>=64){const a=areas.shift();removeMesh(a.mesh);removeMesh(a.border);}
 const m=mesh(new T.RingGeometry(.01,r,48,1,cone?-cone:0,cone?cone*2:Math.PI*2),transient(source.kind==='mage'?0xb18cef:0xff6d4d,.22),root,x,ground(x,z)+.04,z);m.rotation.x=-Math.PI/2;
 const border=mesh(new T.RingGeometry(r-.08,r,48,1,cone?-cone:0,cone?cone*2:Math.PI*2),transient(0xffd298,.9),root,x,ground(x,z)+.05,z);border.rotation.x=-Math.PI/2;
 const angle=Math.atan2(source.warnDir?.x??0,source.warnDir?.z??1);if(cone)m.rotation.z=border.rotation.z=angle-Math.PI/2;
 const a={x,z,r,dur,t:0,damage,mesh:m,border,source,cone,angle};areas.push(a);return a;
 }
 function clearAim(e){if(e.aimLine){removeMesh(e.aimLine);e.aimLine=null;}}
 function aimLine(e){clearAim(e);const a=new T.Vector3(e.x,ground(e.x,e.z)+1.35,e.z),b=new T.Vector3(e.target.x,e.target.y+.9,e.target.z),dir=b.clone().sub(a),m=mesh(new T.CylinderGeometry(.018,.018,dir.length(),5),transient(0xffd58c,.65),root);m.position.copy(a).addScaledVector(dir,.5);m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),dir.normalize());m.castShadow=false;e.aimLine=m;}
 function shoot(e,p){
 if(e.hp<=0)return;const base=Math.atan2(p.x-e.x,p.z-e.z),fan=e.boss?2:0,speed=e.boss?12:16,y=ground(e.x,e.z)+(e.boss?1.0:1.35),distance=Math.max(1,Math.hypot(p.x-e.x,p.z-e.z)),vy=((p.y||0)+.9-y)/distance*speed;
 for(let k=-fan;k<=fan;k++){if(shots.length>=64){const old=shots.shift();removeMesh(old.mesh);}const angle=base+k*.19,geo=e.boss?new T.SphereGeometry(.25,8,6):new T.ConeGeometry(.10,.8,6).rotateX(Math.PI/2),m=mesh(geo,transient(e.boss?0xbad9ff:0xffd69a,1),root,e.x,y,e.z);m.castShadow=false;m.rotation.y=angle;shots.push({mesh:m,x:e.x,y,z:e.z,vx:Math.sin(angle)*speed,vy,vz:Math.cos(angle)*speed,t:0,source:e,damage:e.boss?18:e.damage});}
 }
 function damageEnemy(e,amount,element,id,player,state){
 if(e.hp<=0||e.hits.has(id))return;
 const guard=shieldResponse(e,amount,element,player),r=hitEnemy(e,guard.damage,element,id);if(!r)return;
 if(guard.shieldDamage){e.shieldHp=Math.max(0,e.shieldHp-guard.shieldDamage);if(!e.shieldHp){if(e.mesh.userData.shield)e.mesh.userData.shield.visible=false;hooks.number('Shield broken',e.x,ground(e.x,e.z)+2.5,e.z,'#ffe4a1');particles(e.x,ground(e.x,e.z)+1,e.z,0xd5ae6a,12);}}
 hooks.number(Math.round(r.damage)+(r.vaporize?' · Vaporize':guard.blocked?' · Guarded':''),e.x,ground(e.x,e.z)+(e.boss?3.5:1.7),e.z,r.vaporize?'#ffd3a0':element==='pyro'?'#ffc099':'#fff7d9');hooks.sound(r.vaporize?'vaporize':'hit');particles(e.x,ground(e.x,e.z)+1,e.z,r.vaporize?0xe4ffff:element==='pyro'?0xffb368:0xd8f8ff,r.vaporize?14:5);vfx.impact({x:e.x,y:ground(e.x,e.z),z:e.z},element==='pyro',r.vaporize);e.flash=.13;
 const d=Math.hypot(e.x-player.x,e.z-player.z)||1;e.kb.set((e.x-player.x)/d,(e.z-player.z)/d).multiplyScalar(e.boss||e.kind==='sentinel'?.35:guard.blocked?.5:3);state.energy=clamp(state.energy+(element==='physical'?4:6),0,60);
 if(r.killed&&!e.rewarded){e.rewarded=true;clearAim(e);if(outdoor&&!state.wildDefeated.includes(e.id))state.wildDefeated.push(e.id);state.coins+=e.boss?(index?150:80):e.kind==='sentinel'?12:4;state.energy=clamp(state.energy+3,0,60);const up=awardXp(state,e.boss?(index?300:140):e.kind==='sentinel'?24:12);if(up){hooks.toast('Level '+state.level+' · Health and attack increased');hooks.sound('level');}if(e.boss){state.gems+=20;state.potions=Math.min(9,state.potions+2);hooks.sound('boss');}e.death=.8;}
 }
 function attackPlayer(kind,p,state,combo=0){const id=++serial,range=kind==='burst'?8:kind==='skill'?5.5:3,amount=attack(state)*(kind==='burst'?3.4:kind==='skill'?1.7:combo===2?1.25:1),el=kind==='sword'?'physical':'pyro';
 if(kind==='burst'){for(let n=0;n<3;n++)fx.push({tick:.18*n,burst:true,id:++serial,p:{...p},state,amount});fxRing(p.x,p.z,8,0xffbd76,.7);particles(p.x,p.y+1,p.z,0xffd18a,24);vfx.burst(p);}
 else{for(const e of enemies){const dx=e.x-p.x,dz=e.z-p.z,d=Math.hypot(dx,dz);if(d>range+(e.boss?1:ENEMY_TYPES[e.kind].radius)||e.hp<=0)continue;if(outdoor&&Math.abs(ground(e.x,e.z)-p.y)>3)continue;const dot=(Math.sin(p.facing)*dx+Math.cos(p.facing)*dz)/(d||1);if(dot<Math.cos(kind==='skill'?1.1:1.34))continue;damageEnemy(e,amount,el,id,p,state);}vfx.slash(p,combo,kind==='skill');}
 hooks.sound(kind);return id;
 }
 const turn=(a,b,max)=>a+clamp(Math.atan2(Math.sin(b-a),Math.cos(b-a)),-max,max);
 function beginWindup(e,p){e.phase='windup';e.timer=0;e.target={x:p.x,z:p.z,y:p.y};e.warnDir={x:Math.sin(e.facing),z:Math.cos(e.facing)};e.move=(e.move+1)%3;}
 function updateRegular(e,p,dt,d,dx,dz){
 const spec=ENEMY_TYPES[e.kind];e.moving=false;
 if(e.phase==='idle'){
 e.facing=turn(e.facing,Math.atan2(dx,dz),dt*(e.kind==='sentinel'?1.7:e.kind==='shield'?2.3:4.5));
 const aggro=outdoor?26:32;let stride=0;if(d<aggro){if(d>spec.prefer)stride=1;else if((e.kind==='archer'||e.kind==='mage')&&d<spec.prefer*.58)stride=-.7;}
 if(stride){e.x+=dx/d*e.speed*dt*stride;e.z+=dz/d*e.speed*dt*stride;e.moving=true;}
 if(d<spec.range&&e.cd<=0){beginWindup(e,p);e.wind=spec.wind;
 if(e.kind==='archer')aimLine(e);
 else if(e.kind==='mage')area(p.x,p.z,2.6,e.wind,e.damage,e);
 else if(e.kind==='slime')area(p.x,p.z,1.7,e.wind+.22,e.damage,e);
 else if(e.kind==='sentinel'&&e.move===2)area(e.x,e.z,4.4,e.wind,e.damage,e);
 else area(e.x,e.z,spec.range,e.wind,e.damage,e,e.kind==='sentinel'?1.0:1.1);
 }
 }else if(e.phase==='windup'&&e.timer>=e.wind){
 clearAim(e);if(e.kind==='archer')shoot(e,e.target);
 if(e.kind==='slime'){e.phase='leap';e.leapStart={x:e.x,z:e.z};}else e.phase='recover';e.timer=0;
 }else if(e.phase==='leap'){
 const u=Math.min(1,e.timer/.22);e.x=e.leapStart.x+(e.target.x-e.leapStart.x)*u;e.z=e.leapStart.z+(e.target.z-e.leapStart.z)*u;
 if(u===1){e.phase='recover';e.timer=0;}
 }else if(e.phase==='recover'&&e.timer>=spec.recover){e.phase='idle';e.timer=0;e.cd=spec.cooldown;}
 }
 function updateBoss(e,p,dt,d,dx,dz){
 if(!e.enraged&&e.hp<=e.maxHp*.5){e.enraged=true;hooks.toast(e.name+' is enraged · Keep moving and watch the warnings');hooks.sound('boss');particles(e.x,ground(e.x,e.z)+1.5,e.z,0xffa569,18);}
 const speed=(index?3.2:2.6)*(e.enraged?1.2:1);
 if(e.phase==='idle'){
 e.facing=turn(e.facing,Math.atan2(dx,dz),dt*2.8);const want=index?7:3.8;if(d>want&&d<32){e.x+=dx/d*speed*dt;e.z+=dz/d*speed*dt;}
 if(d<28&&e.cd<=0){beginWindup(e,p);e.wind=1.1;
 if(index&&e.move===0)area(e.x,e.z,2,e.wind,0,e);
 else if(index&&e.move===2)for(let j=0;j<4;j++)area(p.x+Math.sin(j*2)*3,p.z+Math.cos(j*2)*3,3,1.25,35,e);
 else if(!index&&e.move===1)for(let j=1;j<=4;j++)area(e.x+e.warnDir.x*j*2.5,e.z+e.warnDir.z*j*2.5,1.8,1.1,38,e);
 else if(index&&e.move===1||!index&&e.move===0)area(e.x,e.z,index?9:5,e.wind,32,e,1.15);
 else area(e.x,e.z,5.5,e.wind,32,e);
 }
 }else if(e.phase==='windup'&&e.timer>=e.wind){if(index&&e.move===0)shoot(e,e.target);if(!index&&e.move===1){e.phase='charge';e.dir={...e.warnDir};}else e.phase='recover';e.timer=0;}
 else if(e.phase==='charge'){e.x+=e.dir.x*22*dt;e.z+=e.dir.z*22*dt;if(Math.hypot(e.x-p.x,e.z-p.z)<1.8&&p.y<1.6)hooks.hurt(38);if(e.timer>.55){e.phase='recover';e.timer=0;}}
 else if(e.phase==='recover'&&e.timer>1){e.phase='idle';e.timer=0;e.cd=e.enraged?.85:1.15;}
 }
 function update(dt,p,state){
 time+=dt;vfx.update(dt);
 for(const e of enemies){
 if(e.hp<=0){clearAim(e);e.death=Math.max(0,(e.death||0)-dt);e.mesh.scale.setScalar(Math.max(.001,e.death/.8));e.mesh.visible=e.death>0;continue;}
 const dx=p.x-e.x,dz=p.z-e.z,d=Math.hypot(dx,dz)||1;e.mesh.visible=!outdoor||d<90;if(e.health)e.health.scale.x=Math.max(.001,e.hp/e.maxHp);if(e.bar){e.bar.visible=d<20;e.bar.rotation.y=Math.atan2(dx,dz)-e.facing;}e.cd-=dt;e.timer+=dt;e.flash=Math.max(0,(e.flash||0)-dt);
 e.x+=e.kb.x*dt;e.z+=e.kb.y*dt;e.kb.multiplyScalar(Math.exp(-7*dt));
 if(e.boss)updateBoss(e,p,dt,d,dx,dz);else updateRegular(e,p,dt,d,dx,dz);
 if(outdoor&&d>32){clearAim(e);e.phase='idle';e.timer=0;e.cd=Math.max(e.cd,.8);const hx=e.home.x-e.x,hz=e.home.z-e.z,hd=Math.hypot(hx,hz);if(hd>.25){e.x+=hx/hd*dt*1.5;e.z+=hz/hd*dt*1.5;e.moving=true;e.facing=turn(e.facing,Math.atan2(hx,hz),dt*3);}else e.moving=false;}
 if(outdoor){moveCircle(e,0,0,solids);if(ground(e.x,e.z)<.5){e.x+=(e.home.x-e.x)*Math.min(1,dt*3);e.z+=(e.home.z-e.z)*Math.min(1,dt*3);}}
 const r=Math.hypot(e.x,e.z);if(!outdoor&&r>35){e.x*=35/r;e.z*=35/r;}
 e.mesh.position.set(e.x,ground(e.x,e.z)+(e.boss&&index?Math.sin(time*2)*.3+.7:0),e.z);e.mesh.rotation.y=e.facing;
 if(e.boss&&index)for(const side of [-1,1])e.mesh.userData['wing'+side].rotation.z=side*Math.sin(time*3)*.18;
 else if(!e.boss&&e.mesh.visible)animateEnemy(e,time,dt);
 }
 for(let i=0;i<enemies.length;i++)for(let j=i+1;j<enemies.length;j++){const a=enemies[i],b=enemies[j];if(a.hp<=0||b.hp<=0)continue;const dx=b.x-a.x,dz=b.z-a.z,d=Math.hypot(dx,dz)||.01,m=(a.boss?1.2:ENEMY_TYPES[a.kind].radius)+(b.boss?1.2:ENEMY_TYPES[b.kind].radius);if(d<m){const k=(m-d)*Math.min(1,dt*5)*.5;a.x-=dx/d*k;a.z-=dz/d*k;b.x+=dx/d*k;b.z+=dz/d*k;}}
 for(let i=areas.length-1;i>=0;i--){const a=areas[i];a.t+=dt;a.mesh.material.opacity=.18+.18*a.t/a.dur;a.border.scale.setScalar(1+Math.sin(time*14)*.025);
 if(a.source.hp<=0||a.t>=a.dur){if(a.source.hp>0){const angle=Math.atan2(p.x-a.x,p.z-a.z),inside=!a.cone||Math.cos(angle-a.angle)>=Math.cos(a.cone);if(inside&&Math.hypot(p.x-a.x,p.z-a.z)<a.r+.3&&p.y<ground(p.x,p.z)+1.4)hooks.hurt(a.damage);fxRing(a.x,a.z,a.r,a.source.kind==='mage'?0xc5a5ff:0xffbe8e,.25);vfx.impact({x:a.x,y:ground(a.x,a.z),z:a.z},true);hooks.sound('impact');}removeMesh(a.mesh);removeMesh(a.border);areas.splice(i,1);}}
 for(let i=shots.length-1;i>=0;i--){const q=shots[i],ox=q.x,oy=q.y,oz=q.z;q.t+=dt;q.x+=q.vx*dt;q.y+=q.vy*dt;q.z+=q.vz*dt;q.mesh.position.set(q.x,q.y,q.z);
 const vx=q.x-ox,vz=q.z-oz,den=vx*vx+vz*vz,u=den?clamp(((p.x-ox)*vx+(p.z-oz)*vz)/den,0,1):0,hitY=oy+(q.y-oy)*u,hit=Math.hypot(ox+vx*u-p.x,oz+vz*u-p.z)<.6&&hitY>p.y-.1&&hitY<p.y+1.9;
 const obstructed=q.y<ground(q.x,q.z)+.08||(outdoor&&solids.some(o=>Math.hypot(q.x-o.x,q.z-o.z)<o.r&&q.y<ground(o.x,o.z)+3));
 if(hit&&q.source.hp>0)hooks.hurt(q.damage);if(hit||obstructed||q.t>4||q.source.hp<=0){removeMesh(q.mesh);shots.splice(i,1);}}
 for(let i=fx.length-1;i>=0;i--){const f=fx[i];if(f.burst){f.tick-=dt;if(f.tick<=0){for(const e of enemies)if(e.hp>0&&Math.hypot(e.x-f.p.x,e.z-f.p.z)<8&&Math.abs(ground(e.x,e.z)-f.p.y)<4)damageEnemy(e,f.amount,'pyro',f.id,f.p,f.state);fx.splice(i,1);}continue;}f.life-=dt;if(f.life<=0){removeMesh(f.mesh);fx.splice(i,1);continue;}f.mesh.material.opacity=f.life/f.max;if(f.v){f.v.y-=5*dt;f.mesh.position.addScaledVector(f.v,dt);}else f.mesh.scale.multiplyScalar(1+dt*1.1);}
 }
 return{root,setup,update,attack:attackPlayer,get enemies(){return enemies;},get chests(){return chests;},dash(p){vfx.dash(p);},sync(state){for(const e of enemies)if(outdoor&&state.wildDefeated.includes(e.id)){e.hp=0;e.rewarded=true;e.mesh.visible=false;clearAim(e);}},clear(){vfx.clear();root.visible=false;destroy(root);enemies=[];shots=[];fx=[];areas=[];chests=[];},nearest(p){return enemies.filter(e=>e.hp>0).sort((a,b)=>Math.hypot(a.x-p.x,a.z-p.z)-Math.hypot(b.x-p.x,b.z-p.z))[0];},get effects(){return fx.length+areas.length+shots.length+vfx.count;},get diagnostics(){return{projectiles:shots.length,areas:areas.length,particles:fx.length,visualEffects:vfx.count,aimLines:enemies.filter(e=>e.aimLine).length};}};
}
