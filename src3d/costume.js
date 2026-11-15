import * as T from 'three';
import {mat,mesh,box,cyl} from './art.js';
function capeTexture(){const c=document.createElement('canvas');c.width=512;c.height=1024;const g=c.getContext('2d');const bg=g.createLinearGradient(0,0,512,0);bg.addColorStop(0,'#c7c0a5');bg.addColorStop(.18,'#f5efda');bg.addColorStop(.63,'#f9f1dd');bg.addColorStop(1,'#d9cfb0');g.fillStyle=bg;g.fillRect(0,0,512,1024);
 g.strokeStyle='#bb9452';g.lineWidth=10;g.strokeRect(18,18,476,988);g.strokeStyle='#e3c885';g.lineWidth=3;g.strokeRect(32,32,448,960);
 // Gold embroidered feather motif, broad enough to remain visible in play.
 g.strokeStyle='#b28b48';g.lineWidth=5;g.beginPath();g.moveTo(255,180);g.bezierCurveTo(120,350,400,590,246,940);g.stroke();
 for(let i=0;i<9;i++){const y=240+i*68,s=i%2?1:-1;g.beginPath();g.moveTo(250,y+78);g.bezierCurveTo(250+s*130,y+45,250+s*160,y-18,250+s*182,y-35);g.bezierCurveTo(250+s*92,y-7,250+s*26,y+13,250,y+78);g.stroke();}
 g.fillStyle='#bc9955';for(const [x,y,r]of [[256,155,42],[256,885,24],[76,92,14],[436,92,14]]){g.beginPath();g.moveTo(x,y-r);g.lineTo(x+r*.6,y);g.lineTo(x,y+r);g.lineTo(x-r*.6,y);g.closePath();g.fill();}g.fillStyle='#72aa9f';g.beginPath();g.moveTo(256,131);g.lineTo(267,155);g.lineTo(256,179);g.lineTo(245,155);g.fill();
 for(let i=0;i<1400;i++){g.fillStyle=i%2?'#ffffff06':'#68533204';g.fillRect((i*71)%512,(i*163)%1024,1,9);}const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;t.anisotropy=4;return t;}
export function tailorCapes(hero){const material=mat(0xffffff,{map:capeTexture(),side:T.DoubleSide});hero.capes.forEach((m,i)=>{const s=i===0?-1:1,g=new T.PlaneGeometry(1,1,10,18),p=g.attributes.position,uv=g.attributes.uv;for(let j=0;j<p.count;j++){const u=uv.getX(j),v=uv.getY(j);p.setXYZ(j,s*(.035+u*(.22+.11*(1-v))),.79+v*.96-(1-v)*.12*Math.sin(u*Math.PI),-.225-(1-v)*.15);}g.computeVertexNormals();m.geometry.dispose();m.geometry=g;m.scale.setScalar(1);m.position.set(0,0,0);m.material=material;m.userData.base=p.array.slice();});}
export function costumeDetails(attach){const gold=0xcda95c,waist=attach('hips');for(const s of [-1,1]){const flap=mesh(new T.PlaneGeometry(.12,.25,2,4),mat(s<0?0xf0dfb9:0x796044,{side:T.DoubleSide}),waist,s*.13,-.11,.085);flap.rotation.z=s*.12;const edge=box(waist,gold,s*.17,-.11,.089,.012,.26,.012);edge.rotation.z=s*.12;}
 const chest=attach('chest');for(const s of [-1,1]){const strap=box(chest,gold,s*.055,.11,.105,.012,.20,.015);strap.rotation.z=s*.52;}
 for(const side of ['left','right']){const arm=attach(side+'LowerArm');cyl(arm,0x363c3b,0,-.10,0,.055,.051,.12,12);cyl(arm,gold,0,-.045,0,.06,.06,.024,12);for(const s of [-1,1]){const band=box(arm,gold,s*.038,-.10,.035,.009,.13,.012);band.rotation.z=s*.14;}}
}
