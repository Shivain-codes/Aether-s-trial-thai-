import * as T from 'three';
import {mat,mesh,orb,cyl} from './art.js';

// Authored companion model. +Z is the face, matching the traveler and follow rig.
const C={skin:0xffdfcb,white:0xfff8ec,shade:0xe1e4e7,navy:0x26324f,rose:0xe3ad94,gold:0xf5cfac};
function companionFace(){
 const c=document.createElement('canvas');c.width=c.height=512;const g=c.getContext('2d');
 // Only facial features are painted: transparent cheeks/chin reveal the lit head
 // underneath, so the face cannot leave a rectangular skin-colored decal edge.
 for(const [x,side] of [[144,-1],[368,1]]){
  // Large almond eyes, indigo upper iris, turquoise lower iris and two catchlights.
  g.fillStyle='#fffdf6';g.beginPath();g.moveTo(x-54,240);g.bezierCurveTo(x-40,192,x+39,190,x+55,234);g.bezierCurveTo(x+40,280,x-39,286,x-54,240);g.fill();
  const iris=g.createLinearGradient(0,200,0,276);iris.addColorStop(0,'#343f72');iris.addColorStop(.5,'#6c88bd');iris.addColorStop(1,'#b4dce0');g.fillStyle=iris;g.beginPath();g.ellipse(x,239,30,41,0,0,Math.PI*2);g.fill();
  g.fillStyle='#26304f';g.beginPath();g.ellipse(x,231,12,27,0,0,Math.PI*2);g.fill();
  g.strokeStyle='#49405d';g.lineCap='round';g.lineWidth=8;g.beginPath();g.moveTo(x-55,239);g.bezierCurveTo(x-36,192,x+36,193,x+55,232);g.stroke();
  g.lineWidth=5;g.beginPath();g.moveTo(x+side*47,218);g.lineTo(x+side*63,207);g.stroke();
  g.fillStyle='#ffffff';g.beginPath();g.ellipse(x-11,215,10,13,-.3,0,Math.PI*2);g.fill();g.beginPath();g.arc(x+12,258,5,0,Math.PI*2);g.fill();
  g.strokeStyle='#b6a5a1';g.lineWidth=5;g.beginPath();g.moveTo(x-38,176);g.quadraticCurveTo(x,161,x+37,175);g.stroke();
  const blush=g.createRadialGradient(x,302,0,x,302,36);blush.addColorStop(0,'rgba(230,137,138,.24)');blush.addColorStop(1,'rgba(230,137,138,0)');g.fillStyle=blush;g.fillRect(x-36,279,72,47);
 }
 g.strokeStyle='#d6a18c';g.lineWidth=3;g.beginPath();g.moveTo(259,275);g.quadraticCurveTo(249,290,260,291);g.stroke();
 g.strokeStyle='#b7797c';g.lineWidth=4;g.beginPath();g.moveTo(238,344);g.quadraticCurveTo(256,358,275,342);g.stroke();
 const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;t.anisotropy=4;return t;
}
function star(parent,x,y,z,r,color,depth=.012){
 const sh=new T.Shape();for(let i=0;i<8;i++){const a=i*Math.PI/4,rr=i%2?r*.3:r,xx=Math.sin(a)*rr,yy=Math.cos(a)*rr;if(i)sh.lineTo(xx,yy);else sh.moveTo(xx,yy);}sh.closePath();
 return mesh(new T.ExtrudeGeometry(sh,{depth,bevelEnabled:true,bevelSize:.002,bevelThickness:.002,bevelSegments:1,steps:1}),color,parent,x,y,z);
}
function hairLock(parent,points,width,color){
 const path=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p))),count=12,sides=8,pos=[],idx=[];
 for(let i=0;i<=count;i++){const u=i/count,p=path.getPoint(u),w=width*Math.pow(1-u,.65)+.001;for(let j=0;j<sides;j++){const a=j/sides*Math.PI*2;pos.push(p.x+Math.cos(a)*w,p.y,p.z+Math.sin(a)*w*.48);}if(i)for(let j=0;j<sides;j++){const a=(i-1)*sides+j,b=(i-1)*sides+(j+1)%sides,c=i*sides+j,d=i*sides+(j+1)%sides;idx.push(a,c,b,b,c,d);}}
 const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(pos,3));geo.setIndex(idx);geo.computeVertexNormals();return mesh(geo,color,parent);
}
function constellationTexture(){
 const c=document.createElement('canvas');c.width=512;c.height=512;const g=c.getContext('2d'),gradient=g.createLinearGradient(0,0,0,512);gradient.addColorStop(0,'#222b48');gradient.addColorStop(1,'#485f82');g.fillStyle=gradient;g.fillRect(0,0,512,512);
 g.strokeStyle='#a1b9ce';g.lineWidth=2;g.beginPath();g.moveTo(66,400);g.lineTo(164,170);g.lineTo(291,282);g.lineTo(427,95);g.stroke();
 for(let i=0;i<38;i++){const x=(i*137)%480+16,y=(i*197)%480+16,r=i%5===0?10:3;g.fillStyle=i%5?'#a8bfd6':'#f5dcc2';g.beginPath();g.moveTo(x,y-r);g.lineTo(x+r*.35,y);g.lineTo(x,y+r);g.lineTo(x-r*.35,y);g.closePath();g.fill();}
 g.strokeStyle='#dcb19d';g.lineWidth=9;g.strokeRect(5,5,502,502);const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;return t;
}
export function makeCompanion(){
 const root=new T.Group(),body=new T.Group();root.add(body);root.userData.design='White bob, indigo eyes, floating rose-gold crown, constellation cape';
 const head=new T.Group();head.position.set(0,.78,.008);body.add(head);
 const skin=mesh(new T.SphereGeometry(1,28,20),C.skin,head);skin.scale.set(.212,.222,.188);
 // Curved face lies just above the skin ellipsoid, with predictable full-face UVs.
 const faceGeo=new T.PlaneGeometry(.346,.337,20,20),p=faceGeo.attributes.position;
 for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i)-.012;p.setXYZ(i,x,y,.189*Math.sqrt(Math.max(.06,1-x*x/(.214*.214)-y*y/(.224*.224)))+.002);}
 faceGeo.computeVertexNormals();const face=mesh(faceGeo,mat(0xffffff,{map:companionFace(),side:T.FrontSide,transparent:true,depthWrite:false,alphaTest:.015}),head);face.castShadow=false;
 // Open-front scalp and back bob prevent a solid sphere from covering the eyes.
 const scalp=mesh(new T.SphereGeometry(1,30,18,0,Math.PI*2,0,1.42),C.white,head,0,.038,-.027);scalp.scale.set(.233,.231,.207);
 const bob=mesh(new T.SphereGeometry(1,24,16,Math.PI,Math.PI,.5,2.05),C.shade,head,0,.008,-.022);bob.scale.set(.236,.25,.21);
 const bangs=[[-.17,-.14,.025],[-.125,-.088,.07],[-.075,-.031,.094],[-.018,.035,.03],[.045,.096,.078],[.107,.15,.045]];
 bangs.forEach(([x,tip,ty],i)=>hairLock(head,[[x*.62,.24,.05],[x,.155,.161],[tip,ty,.183]],.052,i%3?C.white:0xefece5));
 for(const side of [-1,1]){
  hairLock(head,[[side*.195,.13,.015],[side*.229,-.04,.045],[side*.196,-.205,.07]],.067,C.white);
  hairLock(head,[[side*.20,.09,-.055],[side*.24,-.095,-.035],[side*.17,-.23,.005]],.052,C.shade);
  orb(head,C.skin,side*.205,-.055,0,.025,.043,.02);
 }
 hairLock(head,[[.027,.24,-.045],[.081,.29,-.07],[.142,.265,-.045]],.026,C.white);
 const hairStar=star(head,-.185,.09,.163,.069,C.navy,.009);hairStar.rotation.z=-.17;star(head,-.185,.09,.177,.035,0x746880,.004);
 // Rounded short white tunic with a narrow collar and rose-gold front ornaments.
 const profile=[[.115,.23],[.19,.245],[.18,.30],[.142,.39],[.13,.50],[.075,.555]].map(([x,y])=>new T.Vector2(x,y));
 const tunic=mesh(new T.LatheGeometry(profile,24),C.white,body);tunic.scale.z=.72;
 const collar=cyl(body,C.navy,0,.551,0,.078,.10,.065,20);collar.scale.z=.76;
 const chest=star(body,0,.43,.119,.089,C.rose,.012);star(body,0,.43,.135,.052,C.navy,.006);star(body,0,.43,.144,.018,C.gold,.004);
 const waist=cyl(body,C.rose,0,.319,0,.165,.169,.025,24);waist.scale.z=.73;
 for(const side of [-1,1]){
  const hem=star(body,side*.112,.268,.109,.043,C.rose,.007);hem.rotation.z=side*.4;
  const arm=new T.Group();arm.position.set(side*.135,.505,0);body.add(arm);body.userData['arm'+side]=arm;
  const sleeve=mesh(new T.SphereGeometry(1,18,12),C.white,arm,0,-.055,0);sleeve.scale.set(.071,.112,.066);
  cyl(arm,C.rose,0,-.135,0,.053,.054,.028,16);orb(arm,C.skin,0,-.189,.017,.040,.054,.036);orb(arm,C.skin,-side*.031,-.178,.038,.014,.025,.018);
  const leg=new T.Group();leg.position.set(side*.08,.235,0);body.add(leg);body.userData['leg'+side]=leg;
  cyl(leg,C.white,0,-.105,0,.047,.041,.205,16);cyl(leg,C.rose,0,-.06,.001,.049,.05,.027,16);
  const boot=orb(leg,C.white,0,-.217,.035,.055,.071,.091);star(leg,0,-.187,.102,.03,C.rose,.005);
 }
 // A tessellated cape uses the whole texture, then gently moves at its loose hem.
 const capeGeo=new T.PlaneGeometry(1,1,16,18),cp=capeGeo.attributes.position,uv=capeGeo.attributes.uv;
 for(let i=0;i<cp.count;i++){const u=uv.getX(i),v=uv.getY(i),drop=1-v;cp.setXYZ(i,(u-.5)*(.24+Math.sin(drop*Math.PI*.78)*.5),.55-drop*.46+Math.abs(u-.5)*drop*.13,-.12-drop*.13);}
 capeGeo.computeVertexNormals();const cape=mesh(capeGeo,mat(0xffffff,{map:constellationTexture(),side:T.DoubleSide}),body);const capeBase=cp.array.slice();
 for(const side of [-1,1])star(body,side*.19,.30,-.20,.035,C.gold,.007);
 // Segmented crown floats above the bob instead of intersecting the skull.
 const crown=new T.Group();crown.position.set(0,1.105,-.015);crown.rotation.x=.22;body.add(crown);
 for(let i=0;i<6;i++){
  const segment=mesh(new T.TorusGeometry(.214,.011,6,12,.82),C.rose,crown);segment.rotation.x=Math.PI/2;segment.rotation.z=i*Math.PI/3+.11;
  const a=i*Math.PI/3,xx=Math.cos(a)*.214,zz=Math.sin(a)*.214;
  const gem=mesh(new T.OctahedronGeometry(.018),C.gold,crown,xx,.006,zz);gem.scale.y=1.3;
 }
 const center=mesh(new T.TorusGeometry(.147,.006,5,30),C.gold,crown);center.rotation.x=Math.PI/2;
 return{root,update(t,facing){
  body.position.y=Math.sin(t*2.3)*.055;body.rotation.z=Math.sin(t*1.3)*.025;root.rotation.y=facing;
  head.rotation.z=Math.sin(t*.8)*.045;head.rotation.y=Math.sin(t*.63)*.065;
  for(const side of [-1,1]){const leg=body.userData['leg'+side],arm=body.userData['arm'+side];leg.rotation.x=.22+Math.sin(t*1.8+side*.8)*.14;leg.rotation.z=side*.075;arm.rotation.z=side*(.32+Math.sin(t*1.9+side*.5)*.08);arm.rotation.x=Math.sin(t*1.2+side)*.12;}
  crown.position.y=1.105+Math.sin(t*2.3+.6)*.012;crown.rotation.y=Math.sin(t*.35)*.10;crown.rotation.z=Math.sin(t*.7)*.025;
  for(let i=0;i<cp.count;i++){const drop=.55-capeBase[i*3+1];cp.setZ(i,capeBase[i*3+2]+Math.sin(t*2.4+capeBase[i*3]*6+drop*5)*drop*.10);}cp.needsUpdate=true;capeGeo.computeVertexNormals();
 }};
}
