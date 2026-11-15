import * as T from 'three';
export const palette={cream:0xf1ead3,gold:0xc6a463,ink:0x283c49,teal:0x348e8e,hair:0xe7cb87,skin:0xffd4b6};
const ramp=new T.DataTexture(new Uint8Array([103,170,221,255]),4,1,T.RedFormat);ramp.needsUpdate=true;ramp.magFilter=T.NearestFilter;ramp.minFilter=T.NearestFilter;
const mats=new Map();
export function mat(color,opts={}){const k=String(color)+JSON.stringify(opts);if(!mats.has(k))mats.set(k,new T.MeshToonMaterial({color,gradientMap:ramp,...Object.fromEntries(Object.entries(opts).filter(([k])=>k!=='flatShading'))}));return mats.get(k);}
export function mesh(geo,color,parent,x=0,y=0,z=0,opts={}){const m=new T.Mesh(geo,typeof color==='object'?color:mat(color,opts));m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
export const box=(p,c,x,y,z,w,h,d)=>mesh(new T.BoxGeometry(w,h,d),c,p,x,y,z);
export const orb=(p,c,x,y,z,rx,ry=rx,rz=rx)=>{let m=mesh(new T.SphereGeometry(1,14,10),c,p,x,y,z);m.scale.set(rx,ry,rz);return m;};
export const cyl=(p,c,x,y,z,rt,rb,h,n=10)=>mesh(new T.CylinderGeometry(rt,rb,h,n),c,p,x,y,z);
export function tapered(points,widths,color,parent){const pos=[],idx=[],sides=6;for(let i=0;i<points.length;i++){const pt=points[i];for(let j=0;j<sides;j++){const a=j/sides*Math.PI*2;pos.push(pt[0]+Math.cos(a)*widths[i],pt[1],pt[2]+Math.sin(a)*widths[i]);}if(i)for(let j=0;j<sides;j++){const a=(i-1)*sides+j,b=(i-1)*sides+(j+1)%sides,c=i*sides+j,d=i*sides+(j+1)%sides;idx.push(a,c,b,b,c,d);}}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setIndex(idx);g.computeVertexNormals();return mesh(g,color,parent);}
export function faceTexture(iris="gold"){const c=document.createElement('canvas');c.width=256;c.height=256;const g=c.getContext('2d');g.fillStyle='#ffdbbf';g.fillRect(0,0,256,256);
 const eye=(x)=>{g.fillStyle='#fffaf3';g.beginPath();g.ellipse(x,127,28,18,0,0,Math.PI*2);g.fill();let gr=g.createLinearGradient(0,110,0,145);gr.addColorStop(0,iris==='blue'?'#39456c':'#463b25');gr.addColorStop(.6,iris==='blue'?'#637fb1':'#9b833d');gr.addColorStop(1,iris==='blue'?'#adcbd9':'#e7c571');g.fillStyle=gr;g.beginPath();g.ellipse(x+2,128,13,18,0,0,Math.PI*2);g.fill();g.fillStyle='#26353d';g.beginPath();g.ellipse(x+2,126,5,12,0,0,Math.PI*2);g.fill();g.fillStyle='white';g.beginPath();g.arc(x-3,119,5,0,7);g.fill();g.strokeStyle='#4e4037';g.lineWidth=6;g.beginPath();g.moveTo(x-28,120);g.quadraticCurveTo(x,102,x+28,120);g.stroke();g.lineWidth=3;g.beginPath();g.moveTo(x-25,96);g.quadraticCurveTo(x,88,x+25,98);g.stroke();};eye(71);eye(183);
 g.strokeStyle='#c99579';g.lineWidth=2;g.beginPath();g.moveTo(126,143);g.lineTo(123,153);g.lineTo(130,155);g.stroke();g.strokeStyle='#b37c6c';g.beginPath();g.moveTo(115,181);g.quadraticCurveTo(128,187,141,180);g.stroke();const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;return t;}
export function makeHero(){const root=new T.Group(),body=new T.Group();root.add(body);const P=palette;
 // Five-and-a-half-head proportions, articulated hips and shoulders.
 const torso=cyl(body,P.ink,0,1.28,0,.24,.18,.56,8);torso.scale.z=.65;
 const vest=cyl(body,P.cream,0,1.36,.025,.245,.205,.35,8);vest.scale.z=.7;
 const belt=cyl(body,P.gold,0,1.02,0,.22,.22,.07,12);belt.scale.z=.8;
 box(body,P.teal,-.11,1.28,.165,.09,.43,.025).rotation.z=.3;
 mesh(new T.OctahedronGeometry(.075),mat(0x81e9d0,{emissive:0x236864,emissiveIntensity:.5}),body,0,1.04,.18);
 cyl(body,P.skin,0,1.64,0,.072,.09,.15);
 const arms=[],legs=[];
 for(const s of [-1,1]){const leg=new T.Group();leg.position.set(s*.105,1.0,0);body.add(leg);legs.push(leg);
 cyl(leg,P.ink,0,-.2,0,.10,.075,.4);const knee=orb(leg,P.ink,0,-.43,0,.076);const lower=cyl(leg,P.ink,0,-.66,0,.073,.065,.4);box(leg,0xb3a37c,s*.018,-.63,.062,.06,.27,.015);orb(leg,P.ink,0,-.94,.065,.085,.055,.15);box(leg,P.gold,0,-.44,.073,.1,.055,.02);
 const arm=new T.Group();arm.position.set(s*.265,1.52,0);body.add(arm);arms.push(arm);
 orb(arm,P.gold,0,-.025,0,.115,.095,.12);cyl(arm,P.skin,0,-.17,0,.065,.057,.26);cyl(arm,P.ink,0,-.39,.025,.062,.058,.22);cyl(arm,P.gold,0,-.49,.025,.067,.067,.04);orb(arm,P.skin,0,-.56,.025,.065,.09,.055);
 }
 const head=new T.Group();head.position.set(0,1.89,0);body.add(head);
 orb(head,P.skin,0,0,0,.215,.255,.19);
 // A face curved over the front of the head, rather than a floating billboard.
 const fg=new T.SphereGeometry(.217,24,16,-.9,1.8,.65,1.83);const fm=new T.MeshBasicMaterial({map:faceTexture(),side:T.DoubleSide});const face=mesh(fg,fm,head);face.rotation.y=Math.PI/2;face.scale.set(1,1.15,.89);
 const hair=orb(head,P.hair,0,.08,-.035,.232,.225,.205);
 // Swept locks, side fringe and a long articulated braid.
 for(let i=0;i<9;i++){const x=-.22+i*.052;const tipY=-.05-(i%3)*.055;tapered([[x*.7,.25,-.02],[x,.15,.12],[x*.9+.045,tipY,.195]],[.066,.064,.004],i%3===0?0xf7dfa1:P.hair,head);}
 for(const s of [-1,1])tapered([[s*.18,.16,-.04],[s*.235,-.02,.02],[s*.20,-.24,.08]],[.075,.07,.003],0xd4b575,head);
 const braid=new T.Group();braid.position.set(-.10,1.76,-.18);body.add(braid);for(let i=0;i<6;i++)orb(braid,i%2?0xe5c784:0xf4dca0,Math.sin(i*2)*.025,-i*.085,-i*.02,.052,.067,.045);cyl(braid,P.teal,0,-.47,-.11,.05,.05,.04);tapered([[0,-.49,-.11],[.03,-.63,-.1]],[.05,.002],P.hair,braid);
 // Split ivory cloak, gold edging and teal lining, deformed in animate().
 const capes=[];for(const s of [-1,1]){const g=new T.PlaneGeometry(.43,.99,4,10);g.translate(s*.24,1.03,-.19);const p=g.attributes.position;for(let i=0;i<p.count;i++){const y=p.getY(i),u=(1.525-y)/.99;p.setX(i,p.getX(i)+s*u*.09);p.setZ(i,-.18-u*.21);}
 const m=mesh(g,mat(P.cream,{side:T.DoubleSide}),body);m.userData.base=p.array.slice();capes.push(m);}
 const collar=cyl(body,P.cream,0,1.58,0,.14,.25,.12,12);collar.scale.z=.85;
 const sword=new T.Group();arms[1].add(sword);sword.position.set(0,-.55,.02);sword.rotation.x=-.12;
 cyl(sword,P.ink,0,-.08,0,.032,.032,.17);box(sword,P.gold,0,-.17,0,.3,.045,.07);
 const blade=mesh(new T.CylinderGeometry(0,.045,.88,4),0xd0eeee,sword,0,-.62,0);blade.rotation.z=Math.PI;
 box(sword,0xffffff,0,-.55,.025,.016,.62,.01);orb(sword,0x83d9c9,0,.02,0,.046);
 const glider=new T.Group();glider.position.set(0,1.5,-.18);body.add(glider);glider.visible=false;
 for(const s of [-1,1]){const shape=new T.Shape();shape.moveTo(0,0);shape.quadraticCurveTo(s*1.05,.65,s*1.8,.36);shape.lineTo(s*1.48,-.12);shape.lineTo(s*.75,-.38);shape.lineTo(0,-.2);const gm=mesh(new T.ShapeGeometry(shape),mat(P.cream,{side:T.DoubleSide}),glider);gm.rotation.x=-.18;for(let i=1;i<5;i++){const bar=box(glider,P.gold,s*i*.31,.22-i*.1,.03,.025,.45,.025);bar.rotation.z=-s*.45;}}
 const shadowCanvas=document.createElement('canvas');shadowCanvas.width=64;shadowCanvas.height=64;const sc=shadowCanvas.getContext('2d'),sg=sc.createRadialGradient(32,32,1,32,32,31);sg.addColorStop(0,'rgba(19,40,42,.35)');sg.addColorStop(1,'rgba(19,40,42,0)');sc.fillStyle=sg;sc.fillRect(0,0,64,64);const sm=new T.MeshBasicMaterial({map:new T.CanvasTexture(shadowCanvas),transparent:true,depthWrite:false});const shadow=mesh(new T.PlaneGeometry(1.6,1.6),sm,root,0,.025,0);shadow.rotation.x=-Math.PI/2;shadow.castShadow=false;
 return{root,body,head,arms,legs,capes,braid,sword,glider,shadow,
 animate(t,speed=0,swing=0,air=false,gliding=false){const run=Math.min(1,speed/6),phase=t*(speed>9?15:11);legs[0].rotation.x=Math.sin(phase)*.65*run;legs[1].rotation.x=-Math.sin(phase)*.65*run;arms[0].rotation.x=-Math.sin(phase)*.5*run;arms[1].rotation.x=swing>0?-1.5+Math.sin(swing*Math.PI)*2.6:Math.sin(phase)*.5*run;arms[1].rotation.z=swing>0?-.8:0;body.position.y=air?.02:Math.abs(Math.sin(phase))*.04*run;braid.rotation.x=Math.sin(t*4)*.1+run*.25;glider.visible=gliding;if(gliding){arms[0].rotation.z=-1.3;arms[1].rotation.z=1.3;legs.forEach(l=>l.rotation.x=.3);}else arms[0].rotation.z=.06;
 for(const m of capes){const p=m.geometry.attributes.position,b=m.userData.base;for(let i=0;i<p.count;i++){let u=(1.525-b[i*3+1]);p.setZ(i,b[i*3+2]-u*(.1+run*.4)+Math.sin(t*5+b[i*3]*4+u*5)*u*.09);}p.needsUpdate=true;m.geometry.computeVertexNormals();}
 }};
}
