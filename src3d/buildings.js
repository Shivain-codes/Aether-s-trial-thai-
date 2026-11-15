import * as T from 'three';
import {mat,mesh,box,orb,cyl} from './art.js';
export function makeBuildingMaterials(){
 function texture(kind){const c=document.createElement('canvas');c.width=c.height=256;const g=c.getContext('2d');g.fillStyle=kind==='roof'?'#876553':'#d8d0b1';g.fillRect(0,0,256,256);for(let y=0;y<256;y+=kind==='roof'?24:32){for(let x=-32;x<280;x+=64){const xx=x+(y/24%2)*24;g.fillStyle=kind==='roof'?'#a77a60':'#e4dcc2';g.fillRect(xx+1,y+1,60,kind==='roof'?19:28);g.fillStyle=kind==='roof'?'#6f5147':'#aaa88d';g.fillRect(xx,y+21,64,3);}}for(let i=0;i<1500;i++){g.fillStyle=i%2?'#ffffff08':'#20303008';g.fillRect((i*71)%256,(i*173)%256,2,2);}const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;t.wrapS=t.wrapT=T.RepeatWrapping;t.anisotropy=4;return t;}
 return{stone:mat(0xf1e6c9,{map:texture('stone')}),roof:mat(0xc4b196,{map:texture('roof')})};
}
export function dressHouse(g,materials){
 // A pitched tiled roof gives cottages a more believable street silhouette.
 const oldRoof=g.children.find(m=>m.geometry?.type==='ConeGeometry'&&m.geometry.parameters.radius===4.1);
 if(oldRoof){oldRoof.geometry.dispose();const roof=new T.BufferGeometry();roof.setAttribute('position',new T.Float32BufferAttribute([-2.95,4.2,-2.55,0,6.7,-2.55,-2.95,4.2,2.55,0,6.7,-2.55,0,6.7,2.55,-2.95,4.2,2.55,0,6.7,-2.55,2.95,4.2,-2.55,0,6.7,2.55,2.95,4.2,-2.55,2.95,4.2,2.55,0,6.7,2.55],3));roof.setAttribute('uv',new T.Float32BufferAttribute([0,0,1.2,0,0,2,1.2,0,1.2,2,0,2,0,0,1.2,0,0,2,1.2,0,1.2,2,0,2],2));roof.setIndex([0,2,1,3,5,4,6,8,7,9,11,10]);roof.computeVertexNormals();oldRoof.geometry=roof;oldRoof.position.set(0,0,0);oldRoof.rotation.set(0,0,0);oldRoof.scale.setScalar(1);}
 for(const z of [-2.01,2.01]){const face=new T.BufferGeometry();face.setAttribute('position',new T.Float32BufferAttribute([-2.5,4.2,z,2.5,4.2,z,0,6.35,z],3));face.computeVertexNormals();mesh(face,mat(0xe4dcc0,{side:T.DoubleSide}),g);box(g,0x67533e,0,5.18,z*1.02,.14,2.15,.14);for(const s of [-1,1]){const beam=box(g,0x6d5840,s*1.36,5.35,z*1.1,.12,3.58,.14);beam.rotation.z=s*.87;}}
 box(g,0x79583e,0,6.72,0,.18,.17,5.35);for(const s of [-1,1])box(g,0x725b44,s*2.92,4.21,0,.17,.20,5.3);
 // Cross braces, dressed stone foundation, inset window frames and shutters.
 box(g,materials.stone,0,.24,0,5.35,.48,4.35);
 for(const x of [-2.35,0,2.35])box(g,0x695b46,x,2.2,2.065,.13,4.1,.12);
 for(const y of [.8,2.8,4.1])box(g,0x7c6950,0,y,2.08,5,.10,.12);
 for(const side of [-1,1]){const brace=box(g,0x7b684f,side*1.17,3.45,2.09,.09,1.55,.11);brace.rotation.z=side*.9;const x=side*1.5;
 box(g,0xc2b69b,x,2.17,2.10,1.08,1.4,.17);box(g,0x547f8b,x,2.17,2.20,.80,1.13,.05);for(const dx of [-.19,.19])box(g,0xeadbb5,x+dx,2.17,2.24,.035,1.14,.05);box(g,0xe9d7b0,x,2.17,2.25,.82,.045,.04);
 for(const ss of [-1,1]){const shutter=box(g,0x677968,x+ss*.65,2.17,2.09,.32,1.19,.1);shutter.rotation.y=ss*.3;for(let j=0;j<5;j++)box(g,0x839079,x+ss*.65,1.74+j*.19,2.16,.31,.035,.06);}
 box(g,0x8b7453,x,1.35,2.25,1.25,.23,.44);for(let j=0;j<8;j++){orb(g,0x6e8e50,x-.5+j*.14,1.54,2.28,.11,.13,.11);orb(g,j%2?0xeee6c0:0xd49b92,x-.5+j*.14,1.67,2.3,.07,.055,.07);}}
 for(let j=0;j<6;j++)box(g,0x8e7452,-.46+j*.18,1.1,2.17,.025,2.1,.04);orb(g,0xc3ac73,.33,1.05,2.2,.035);box(g,0xb5b9a1,0,.1,2.6,1.8,.2,.9);
 // A roof dormer breaks the simple roof silhouette.
 box(g,0xd8cfaf,0,5.4,1.4,1.2,1.15,.7);const dormer=mesh(new T.ConeGeometry(1.1,.8,4),materials.roof,g,0,6.25,1.4);dormer.rotation.y=Math.PI/4;box(g,0x567d87,0,5.5,1.77,.55,.7,.05);box(g,0xead9ac,0,5.5,1.8,.045,.72,.03);
 // Masonry chimney cap, side windows and a small timber entrance canopy.
 for(const y of [5.35,5.8,6.25])box(g,0x9b9983,1.3,y,-.5,.71,.10,.71);box(g,0xa4a48d,1.3,6.55,-.5,.85,.20,.85);box(g,0x454b46,1.3,6.66,-.5,.48,.02,.48);
 for(const s of [-1,1]){box(g,0x6d5b44,s*2.52,2.2,-.45,.09,1.6,1.3);box(g,0x71999d,s*2.58,2.2,-.45,.05,1.34,1.06);box(g,0xe5d2a7,s*2.62,2.2,-.45,.05,1.35,.06);box(g,0xe5d2a7,s*2.62,2.2,-.45,.05,.06,1.08);cyl(g,0x756048,s*.92,1.30,3.08,.06,.075,2.6,8);}
 const awning=box(g,materials.roof,0,2.7,2.75,2.3,.14,1.4);awning.rotation.x=.13;box(g,0x80684a,0,2.55,3.4,2.3,.15,.12);for(let j=0;j<2;j++)box(g,materials.stone,0,.13-j*.065,3.03+j*.33,1.9,.25-j*.13,.45);
 // Hanging emblem, lantern, and kitchen baskets keep the facades lived in.
 box(g,0x67533e,-1.05,3.15,2.65,.08,.08,1.15);cyl(g,0x826440,-1.05,2.85,3.16,.012,.012,.50,6);const sign=box(g,0x536d68,-1.05,2.49,3.17,.65,.52,.10);const emblem=mesh(new T.OctahedronGeometry(.18),0xd8c283,g,-1.05,2.49,3.24);emblem.scale.z=.15;
 box(g,0x465450,.65,2.18,2.29,.25,.37,.25);box(g,mat(0xffdba0,{emissive:0xb78643,emissiveIntensity:.18}),.65,2.18,2.43,.15,.22,.02);
 for(const s of [-1,1]){cyl(g,0x9b7850,s*2.15,.40,2.37,.30,.22,.60,10);cyl(g,0x6c654a,s*2.15,.69,2.37,.31,.31,.055,10);for(let j=0;j<5;j++)orb(g,j%2?0x819747:0xc89e4e,s*2.15+Math.sin(j*2.4)*.14,.74+(j%2)*.08,2.37+Math.cos(j*2.4)*.14,.10);}
}
