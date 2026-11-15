import * as T from 'three';
import {rng} from './core.js';
const TAU=Math.PI*2;
// Scenery beyond the playable valley. All geometry and paintings are generated locally.
export function makeDistantLandscape(scene){
 const random=rng(61502),clouds=[];
 // Hand-shaped, blue atmospheric ranges keep their color under scene lighting.
 const mountainMat=new T.MeshBasicMaterial({vertexColors:true,fog:false,toneMapped:false});
 const sunDirection=new T.Vector3(-.65,.75,.4).normalize();
 function range(cx,cz,w,d,peaks,tint,haze){
  const geo=new T.PlaneGeometry(w,d,112,68);geo.rotateX(-Math.PI/2);
  const p=geo.attributes.position,heights=[];
  for(let i=0;i<p.count;i++){
   const x=p.getX(i),z=p.getZ(i);let h=0;
   for(const peak of peaks){
    const dx=(x-peak[0])/peak[2],dz=(z-peak[1])/peak[3],angle=Math.atan2(dz,dx),r=Math.hypot(dx,dz);
    const ridge=1+.10*Math.sin(angle*5+peak[0])+.055*Math.sin(angle*11);
    h=Math.max(h,Math.pow(Math.max(0,1-r/ridge),1.18)*peak[4]);
   }
   h*=1+.035*Math.sin(x*.13+z*.075)+.025*Math.sin(x*.32-z*.12);
   p.setY(i,h-12);heights.push(h);
  }
  geo.computeVertexNormals();
  const normals=geo.attributes.normal,colors=[],base=new T.Color(tint),snow=new T.Color('#effaff'),shadow=new T.Color('#376893'),air=new T.Color('#8fc7e5'),normal=new T.Vector3();
  for(let i=0;i<p.count;i++){
   normal.fromBufferAttribute(normals,i);const light=Math.max(0,normal.dot(sunDirection));
   const x=p.getX(i),z=p.getZ(i),h=heights[i],fold=(Math.sin(x*.17+z*.07)+Math.sin(x*.065-z*.14))*.025;
   const c=base.clone().multiplyScalar(.71+light*.33+fold).lerp(shadow,(1-light)*.16);
   const snowLine=91+13*Math.sin(x*.048+z*.027)+7*Math.sin(x*.14-z*.08);
   if(h>snowLine){const ice=snow.clone().lerp(new T.Color('#7fb5db'),(1-light)*.48);c.lerp(ice,T.MathUtils.smoothstep(h,snowLine,snowLine+14));}
   c.lerp(air,haze*(1-T.MathUtils.clamp(h/200,0,1)));
   colors.push(c.r,c.g,c.b);
  }
  geo.setAttribute('color',new T.Float32BufferAttribute(colors,3));
  const m=new T.Mesh(geo,mountainMat);m.position.set(cx,0,cz);m.castShadow=false;m.receiveShadow=false;scene.add(m);
 }
 range(0,-410,980,280,[[-290,-10,185,125,91],[-80,18,130,100,116],[120,-18,190,125,186],[310,8,180,110,104]],'#70a9ce',.18);
 range(-70,-265,820,170,[[-250,0,165,90,62],[-80,-15,155,90,69],[100,5,140,85,50],[265,-5,155,90,75]],'#478ba7',.06);
 for(const side of [-1,1])range(side*350,0,260,690,[[0,-170,130,180,77],[0,80,120,155,64],[0,240,115,160,54]],'#538c9d',.08);
 function cloudTexture(seed){const r=rng(seed),c=document.createElement('canvas');c.width=640;c.height=480;const g=c.getContext('2d');g.fillStyle='white';g.filter='blur(1.5px)';
 // An irregular rising tower above a spreading lower bank.
 const columns=4+Math.floor(r()*3),centers=[];for(let j=0;j<columns;j++)centers.push({x:90+j*470/(columns-1)+(r()-.5)*35,top:95+r()*140});
 g.beginPath();g.moveTo(centers[0].x-20,330);for(const column of centers)g.lineTo(column.x,column.top+25);g.lineTo(centers[centers.length-1].x+20,330);g.closePath();g.fill();g.beginPath();g.ellipse(320,320,260,58,0,0,TAU);g.fill();
 for(const column of centers){for(let j=0;j<6;j++){const y=column.top+j*35,x=column.x+(r()-.5)*54,rr=35+r()*38;g.beginPath();g.ellipse(x,y,rr,rr*(.75+r()*.4),0,0,TAU);g.fill();}}
 for(let j=0;j<12;j++){g.beginPath();g.ellipse(62+j*45,350+(r()-.5)*20,45+r()*25,27+r()*22,0,0,TAU);g.fill();}g.filter='none';
 const data=g.getImageData(0,0,640,480),p=data.data;for(let y=0;y<480;y++)for(let x=0;x<640;x++){const i=(y*640+x)*4;if(!p[i+3])continue;const n=Math.sin(x*.029+Math.sin(y*.013)*2)*Math.sin(y*.031)+.34*Math.sin(x*.081+y*.058),low=T.MathUtils.clamp((y-170)/250+n*.16,0,1);p[i]=255-low*64;p[i+1]=255-low*32;p[i+2]=255-low*10;const edge=(y>360)?Math.max(0,1-(y-360)/75):1;p[i+3]*=edge;}g.putImageData(data,0,0);const tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;return tex;}
 const cloudMaps=[cloudTexture(20),cloudTexture(33),cloudTexture(94),cloudTexture(136),cloudTexture(280)];
 const positions=[[-195,144,-385,140],[340,172,-470,165],[-390,100,-180,110],[410,118,-220,122],[-330,140,280,138],[210,166,390,148],[-45,76,-490,77],[430,154,270,125],[-430,182,70,115]];
 positions.forEach(([x,y,z,w],i)=>{const s=new T.Sprite(new T.SpriteMaterial({map:cloudMaps[i%5],transparent:true,opacity:.93,depthWrite:false,fog:false,toneMapped:false}));s.position.set(x,y,z);s.scale.set(w,w*.75,1);scene.add(s);clouds.push({mesh:s,x,speed:.12+(i%3)*.04});});
 // High, quiet cirrus strips provide scale without filling the sky with identical puffs.
 const cirrus=document.createElement('canvas');cirrus.width=512;cirrus.height=128;const cg=cirrus.getContext('2d');cg.strokeStyle='rgba(240,250,255,.18)';cg.lineWidth=9;cg.filter='blur(4px)';for(let j=0;j<4;j++){cg.beginPath();cg.moveTo(0,70+j*8);cg.bezierCurveTo(170,55+j*8,320,65+j*6,512,24+j*6);cg.stroke();}const cirrusMap=new T.CanvasTexture(cirrus);cirrusMap.colorSpace=T.SRGBColorSpace;for(let j=0;j<3;j++){const s=new T.Sprite(new T.SpriteMaterial({map:cirrusMap,transparent:true,depthWrite:false,fog:false,toneMapped:false}));s.position.set(-220+j*220,180+j*12,-420);s.scale.set(350,75,1);scene.add(s);}
 return{update(t){for(const c of clouds)c.mesh.position.x=c.x+Math.sin(t*.008)*c.speed*30;}};
}
