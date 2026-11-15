import * as T from 'three';
import {mat,mesh,orb,cyl,box} from './art.js';
const C={hair:0xe8bd63,light:0xffdc88,shadow:0xbd8840,ivory:0xf5e6c8,gold:0xd4a54e,dark:0x302b2b,leather:0x493a31};
// Curved broad locks with a flattened cross-section, rather than cone spikes.
function lock(parent,points,width,color){
 const curve=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p))),pos=[],idx=[],steps=12,sides=8;
 for(let i=0;i<=steps;i++){const u=i/steps,p=curve.getPoint(u),w=width*(.8+.4*Math.sin(u*Math.PI))*Math.pow(1-u,.55)+.0004;for(let j=0;j<sides;j++){const a=j/sides*Math.PI*2;pos.push(p.x+Math.cos(a)*w,p.y,p.z+Math.sin(a)*w*.38);}if(i)for(let j=0;j<sides;j++){const a=(i-1)*sides+j,b=(i-1)*sides+(j+1)%sides,c=i*sides+j,d=i*sides+(j+1)%sides;idx.push(a,c,b,b,c,d);}}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setIndex(idx);g.computeVertexNormals();return mesh(g,color,parent);
}
function ornament(parent,points,color,z,depth=.008){const s=new T.Shape();points.forEach(([x,y],i)=>i?s.lineTo(x,y):s.moveTo(x,y));s.closePath();return mesh(new T.ExtrudeGeometry(s,{depth,bevelEnabled:true,bevelSize:.002,bevelThickness:.002,bevelSegments:1,steps:1}),color,parent,0,0,z);}
export function travelerEyes(){
 const c=document.createElement('canvas');c.width=1024;c.height=512;const g=c.getContext('2d');
 for(const x of [256,768]){const iris=g.createLinearGradient(0,116,0,388);iris.addColorStop(0,'#382411');iris.addColorStop(.4,'#9d6c23');iris.addColorStop(.78,'#e9b846');iris.addColorStop(1,'#fff0ac');g.fillStyle=iris;g.beginPath();g.ellipse(x,256,108,129,0,0,Math.PI*2);g.fill();g.fillStyle='#322719';g.beginPath();g.ellipse(x,239,36,78,0,0,Math.PI*2);g.fill();g.fillStyle='#fff3bd';g.beginPath();g.ellipse(x,343,50,15,0,0,Math.PI*2);g.fill();g.fillStyle='#ffffff';g.beginPath();g.ellipse(x-38,188,21,30,-.35,0,Math.PI*2);g.fill();g.beginPath();g.arc(x+43,301,10,0,Math.PI*2);g.fill();}
 const t=new T.CanvasTexture(c);t.flipY=false;t.colorSpace=T.SRGBColorSpace;t.anisotropy=4;return t;
}
export function makeTravelerDetails(attach,sword,limb){
 const head=attach('head');head.name='Traveler hair and braid';
 const cap=mesh(new T.SphereGeometry(1,28,16,0,Math.PI*2,0,1.65),C.hair,head,0,.112,-.032);cap.scale.set(.123,.130,.124);
 // Layered back and side locks keep the front open around the amber eyes.
 for(let i=0;i<11;i++){const a=Math.PI+i*Math.PI/10,x=Math.cos(a)*.115,z=Math.sin(a)*.107-.025;lock(head,[[x*.45,.222,z*.45],[x,.13,z],[x*1.14,.018+(i%3)*.012,z*1.15]],.034,i%3?C.hair:C.light);}
 const bangs=[[-.105,-.100,.054],[-.072,-.070,.070],[-.038,-.025,.050],[.002,.048,.085],[.04,.082,.049],[.076,.112,.072]];
 for(const [i,[x,tip,y]] of bangs.entries())lock(head,[[x*.55,.23,.015],[x,.155,.096],[tip,y,.111]],.033,i%2?C.light:C.hair);
 for(const side of [-1,1]){lock(head,[[side*.105,.15,.005],[side*.145,.063,.015],[side*.119,-.014,.033]],.028,C.hair);lock(head,[[side*.102,.155,-.06],[side*.14,.058,-.075],[side*.13,-.015,-.09]],.036,C.shadow);}
 lock(head,[[-.008,.235,-.015],[.03,.29,-.035],[.084,.264,-.052]],.021,C.light);
 const braid=new T.Group();braid.name='Traveler articulated braid';braid.position.set(-.025,.04,-.145);head.add(braid);
 for(let i=0;i<9;i++)for(const side of [-1,1]){const b=orb(braid,i%2?C.hair:C.light,side*.013*Math.cos(i*.9),-i*.043,-.018-i*.007,.022,.029,.020);b.rotation.z=side*.45;}
 cyl(braid,C.dark,0,-.371,-.078,.028,.028,.038,12);cyl(braid,C.gold,0,-.384,-.078,.030,.030,.012,12);lock(braid,[[0,-.40,-.079],[.012,-.445,-.083],[.025,-.491,-.07]],.027,C.hair);
 const chest=attach('chest');const top=cyl(chest,C.dark,0,.045,0,.155,.126,.268,24);top.scale.z=.65;
 ornament(chest,[[-.135,.174],[-.108,.06],[-.067,-.08],[-.043,-.08],[-.082,.078],[-.102,.174]],C.gold,.096);
 ornament(chest,[[.135,.174],[.105,.062],[.063,-.08],[.042,-.08],[.079,.079],[.104,.174]],C.gold,.096);
 ornament(chest,[[-.06,.17],[0,.125],[.06,.17],[.045,.185],[0,.153],[-.045,.185]],C.ivory,.105);
 const gem=mesh(new T.OctahedronGeometry(.036),mat(0xbde7ce,{emissive:0x42674d,emissiveIntensity:.15}),chest,0,.12,.12);gem.scale.z=.45;
 // Ivory shoulder scarf and a single wider decorated pauldron give asymmetry.
 const neck=attach('neck');const scarf=cyl(neck,C.ivory,0,-.018,0,.075,.124,.068,24);scarf.scale.z=.85;
 for(const side of ['left','right']){const arm=limb(side+'UpperArm',side+'LowerArm'),sgn=side==='left'?-1:1;const pauldron=orb(arm,side==='left'?C.gold:C.ivory,0,-.005,0,.091,.052,.10);pauldron.rotation.z=sgn*.18;
 const fore=limb(side+'LowerArm',side+'Hand');const guard=cyl(fore,C.dark,0,-.135,0,.052,.042,.18,16);guard.scale.z=.84;cyl(fore,C.gold,0,-.055,0,.055,.055,.021,16);cyl(fore,C.gold,0,-.215,0,.045,.045,.025,16);ornament(fore,[[-.036,-.065],[0,-.10],[.036,-.065],[.028,-.15],[0,-.20],[-.028,-.15]],C.gold,.041);
 const thigh=limb(side+'UpperLeg',side+'LowerLeg');const trousers=cyl(thigh,C.leather,0,-.158,0,.092,.065,.342,20);trousers.scale.z=.94;
 const shin=limb(side+'LowerLeg',side+'Foot');mesh(new T.LatheGeometry([[.054,-.425],[.068,-.33],[.092,-.18],[.084,-.06],[.076,.015]].map(([r,y])=>new T.Vector2(r,y)),24),C.dark,shin,0,0,-.009);ornament(shin,[[-.057,-.048],[0,-.085],[.057,-.048],[.040,-.16],[0,-.205],[-.040,-.16]],C.gold,.052);ornament(shin,[[-.017,-.19],[0,-.23],[.017,-.19],[.011,-.32],[0,-.35],[-.011,-.32]],C.gold,.046);
 const foot=attach(side+'Foot');const boot=orb(foot,C.dark,0,-.025,.044,.073,.084,.145);const rim=box(foot,C.gold,0,.016,.112,.088,.012,.045);rim.rotation.x=-.08;
 }
 const hips=attach('hips');const breeches=cyl(hips,C.leather,0,-.07,0,.145,.16,.16,24);breeches.scale.z=.72;const belt=cyl(hips,C.dark,0,.025,0,.15,.15,.065,20);belt.scale.z=.72;
 ornament(hips,[[-.075,.05],[0,.085],[.075,.05],[.039,-.003],[0,-.033],[-.039,-.003]],C.gold,.112);
 ornament(hips,[[0,.061],[.027,.033],[0,.005],[-.027,.033]],C.ivory,.124);
 for(const side of [-1,1]){const panel=ornament(hips,[[side*.10,.01],[side*.18,-.02],[side*.205,-.25],[side*.115,-.215]],side<0?C.ivory:C.leather,.066);panel.rotation.z=-side*.12;ornament(hips,[[side*.12,-.04],[side*.145,-.06],[side*.163,-.194],[side*.14,-.18]],C.gold,.079);}
 // Hand-centered sword: restrained pale blade, gold winged guard, dark grip.
 for(const child of [...sword.children]){child.geometry?.dispose();sword.remove(child);}
 sword.name='Traveler silver sword';cyl(sword,C.dark,0,-.055,0,.026,.026,.17,12);
 for(let i=0;i<5;i++){const ring=cyl(sword,C.gold,0,-.12+i*.028,0,.028,.028,.007,12);}
 orb(sword,C.gold,0,.047,0,.042,.045,.035);
 ornament(sword,[[-.19,-.15],[-.135,-.19],[-.04,-.17],[0,-.195],[.04,-.17],[.135,-.19],[.19,-.15],[.11,-.135],[0,-.14],[-.11,-.135]],C.gold,-.022,.044);
 const blade=ornament(sword,[[-.035,-.18],[-.043,-.27],[-.027,-.94],[0,-1.08],[.027,-.94],[.043,-.27],[.035,-.18]],0xd7e8e4,-.012,.024);
 ornament(sword,[[0,-.22],[.012,-.32],[.008,-.91],[0,-1.01],[-.008,-.91],[-.012,-.32]],0xf9fff4,.014,.002);
 return {braid};
}
