import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {mat,mesh,box,orb,cyl,tapered} from './art.js';

export const ELEMENT_COLORS={hydro:0x56bddd,pyro:0xee9360,electro:0xaa8bd0,anemo:0x73c6a6,cryo:0xa5dbdf,geo:0xc6ab76};
const skin=0x786b56,hide=0x4b4540,bone=0xdfcfaa,iron=0x617674,gold=0xc5a16b;
const glow=c=>mat(c,{emissive:c,emissiveIntensity:.38});
function base(){const root=new T.Group(),visual=new T.Group();root.add(visual);root.userData.visual=visual;return{root,visual};}
function lineTube(parent,points,color,r=.02){const curve=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p)));return mesh(new T.TubeGeometry(curve,16,r,5,false),color,parent);}
function disc(parent,color,x,y,z,r,depth=.035){const m=cyl(parent,color,x,y,z,r,r,depth,24);m.rotation.x=Math.PI/2;return m;}
function rune(parent,x,y,z,r,color){const m=mesh(new T.TorusGeometry(r,.018,5,24),color,parent,x,y,z);for(let i=0;i<4;i++){const a=i*Math.PI/2;const k=box(parent,color,x+Math.sin(a)*r,y+Math.cos(a)*r,z,.06,.06,.025);k.rotation.z=Math.PI/4;}return m;}
function slime(element){const {root,visual:g}=base(),color=ELEMENT_COLORS[element]||ELEMENT_COLORS.hydro;
 const shell=orb(g,mat(color,{emissive:color,emissiveIntensity:.07}),0,.52,0,.74,.63,.70);root.userData.shell=shell;
 orb(g,0xe1fbf1,-.25,.87,.43,.19,.07,.04);orb(g,0xb6efed,-.40,.72,.49,.05,.07,.02);
 for(const side of [-1,1]){orb(g,0x273d50,side*.21,.58,.64,.055,.10,.025);orb(g,0xf5ffff,side*.21-.012,.62,.66,.017,.023,.008);orb(g,0xb0dee1,side*.37,.43,.60,.045,.018,.013);}
 const mouth=mesh(new T.TorusGeometry(.075,.013,5,16,Math.PI),0x335063,g,0,.42,.668);mouth.rotation.z=Math.PI;
 if(element==='hydro'){const droplet=new T.Group();droplet.position.y=1.16;g.add(droplet);orb(droplet,glow(0xb5f8ff),0,0,0,.09,.12,.09);mesh(new T.ConeGeometry(.075,.15,10),0xc8fbff,droplet,0,.12,0);root.userData.crest=droplet;}
 if(element==='pyro'){for(let j=0;j<5;j++){const x=(j-2)*.17;tapered([[x,.98,0],[x+.04,1.12+(j%2)*.09,.02],[x-.025,1.35-Math.abs(j-2)*.06,0]],[.12,.085,.001],j%2?0xffd38d:0xf7ba72,g);}}
 if(['cryo','geo','electro'].includes(element)){for(let j=0;j<3;j++){const shard=mesh(new T.OctahedronGeometry(.18),element==='geo'?0xe3ce96:glow(0xd9e5ff),g,(j-1)*.23,1.05,0);shard.scale.y=1.6;shard.rotation.z=-(j-1)*.28;}}
 if(element==='anemo')for(const s of [-1,1]){const wing=orb(g,0xc1efd8,s*.67,.62,0,.29,.08,.38);wing.rotation.z=s*.28;rune(g,s*.62,.63,.29,.07,0xf6edc4);}
 root.userData.height=1.65;return root;
}
function humanoid(kind){const {root,visual:g}=base(),arched=kind==='archer';
 const torso=cyl(g,kind==='shield'?iron:skin,0,1.07,0,.31,.23,.70,12);torso.scale.z=.77;
 const fur=cyl(g,hide,0,.78,0,.25,.38,.37,10);fur.scale.z=.86;
 for(let i=0;i<7;i++){const a=i/7*Math.PI*2;mesh(new T.ConeGeometry(.065,.22,4),0x8b8169,g,Math.sin(a)*.32,.64,Math.cos(a)*.26).rotation.z=Math.PI;}
 cyl(g,gold,0,.87,0,.28,.28,.05,12);orb(g,hide,0,1.59,0,.33,.38,.29);
 const mask=orb(g,bone,0,1.57,.23,.27,.31,.115);mask.rotation.z=arched?.035:0;
 for(const side of [-1,1]){const eye=box(g,0x393d38,side*.11,1.62,.34,.12,.042,.025);eye.rotation.z=side*.22;box(g,0xb9a77e,side*.17,1.41,.325,.035,.10,.02).rotation.z=side*.25;
 tapered([[side*.24,1.77,.01],[side*.33,1.97,.015],[side*.22,2.12,.05]],[.09,.065,.001],bone,g);}
 const brow=box(g,0xc59a68,0,1.85,.29,.07,.23,.025);brow.rotation.z=.2;
 const arms=[];for(const side of [-1,1]){const a=new T.Group();a.position.set(side*.34,1.35,0);g.add(a);orb(a,kind==='shield'?iron:0x8b7a5d,0,0,0,.17,.18,.17);cyl(a,skin,0,-.19,0,.105,.09,.36,9);const forearm=new T.Group();forearm.position.y=-.36;a.add(forearm);cyl(forearm,skin,0,-.14,0,.09,.08,.28,9);cyl(forearm,0xb8aa86,0,-.13,0,.098,.094,.10,10);orb(forearm,skin,0,-.30,.02,.10,.11,.10);a.userData.forearm=forearm;arms.push(a);}
 root.userData.armLeft=arms[0];root.userData.armRight=arms[1];
 const legs=[];for(const side of [-1,1]){const l=new T.Group();l.position.set(side*.18,.72,0);g.add(l);cyl(l,0x685e4f,0,-.25,0,.115,.09,.50,8);cyl(l,0xb6aa86,0,-.40,0,.105,.10,.08,8);orb(l,0x494b43,0,-.65,.09,.14,.10,.21);legs.push(l);}root.userData.legs=legs;
 if(kind==='guardian'||kind==='shield'){const hand=arms[1].userData.forearm,club=new T.Group();club.position.set(0,-.30,.035);club.rotation.x=-.3;hand.add(club);cyl(club,0x725a3b,0,-.25,0,.065,.075,.55,8);orb(club,0x77634b,0,-.59,0,.16,.25,.15);for(let j=0;j<3;j++)cyl(club,0xa28b65,0,-.43-j*.13,0,.17,.17,.045,9);root.userData.club=club;}
 if(kind==='shield'){const shield=new T.Group();shield.position.set(-.13,-.38,.34);arms[0].add(shield);disc(shield,0x5b6865,0,0,0,.44,.08);disc(shield,0x96764d,0,0,.055,.38,.06);for(let x=-2;x<=2;x++)box(shield,0x6c583e,x*.13,0,.10,.018,.70,.015);rune(shield,0,0,.10,.40,0xc4b58a);disc(shield,0xa7b9ac,0,0,.13,.13,.09);for(let i=0;i<8;i++){const a=i/8*Math.PI*2;orb(shield,0xd4c59b,Math.sin(a)*.34,Math.cos(a)*.34,.12,.025);}root.userData.shield=shield;}
 if(arched){const bow=new T.Group();bow.position.set(-.04,-.28,.28);arms[0].userData.forearm.add(bow);lineTube(bow,[[0,-.55,0],[.17,-.27,.02],[.23,0,0],[.17,.27,.02],[0,.55,0]],0xa98b5b,.025);lineTube(bow,[[0,-.55,0],[-.03,0,0],[0,.55,0]],0xf2dcb0,.006);root.userData.bow=bow;
 const quiver=cyl(g,0x6c5944,.14,1.15,-.26,.13,.10,.65,9);quiver.rotation.z=-.25;for(let j=0;j<4;j++){const arrow=cyl(g,0xc2ae7e,.07+j*.06,1.6,-.27,.009,.009,.45,5);box(g,0xe3dac0,.07+j*.06,1.81,-.27,.06,.11,.012);}
 const scarf=mesh(new T.TorusGeometry(.21,.065,6,12),0x7d8c6b,g,0,1.41,0);scarf.rotation.x=Math.PI/2;}
 root.userData.height=2.4;return root;
}
function mage(element){const {root,visual:g}=base(),color=ELEMENT_COLORS[element]||ELEMENT_COLORS.electro,cloth=element==='pyro'?0x92564a:element==='cryo'?0x628999:0x63547e;
 const robe=cyl(g,cloth,0,.82,0,.18,.39,.76,14);root.userData.robe=robe;for(const s of [-1,1]){const trim=box(g,gold,s*.18,.80,.25,.025,.69,.025);trim.rotation.z=s*.27;}
 const hood=mesh(new T.SphereGeometry(1,16,12),cloth,g,0,1.42,0);hood.scale.set(.35,.42,.28);orb(g,0x273441,0,1.36,.205,.23,.28,.09);
 for(const s of [-1,1]){orb(g,glow(0xf6d591),s*.08,1.4,.29,.028,.048,.012);tapered([[s*.25,1.51,.01],[s*.35,1.66,.01],[s*.24,1.86,.0]],[.07,.05,.001],gold,g);}
 rune(g,0,1.15,.30,.08,0xe1c281);for(const s of [-1,1]){const arm=new T.Group();arm.position.set(s*.21,1.12,0);g.add(arm);const sleeve=cyl(arm,cloth,s*.06,-.18,0,.12,.16,.4,10);sleeve.rotation.z=s*.3;orb(arm,0x768c91,s*.1,-.38,.03,.065);root.userData[s===-1?'armLeft':'armRight']=arm;}
 const staff=new T.Group();staff.position.set(.43,.35,.08);g.add(staff);cyl(staff,0x8a7352,0,.5,0,.028,.035,1.45,7);const fork=mesh(new T.TorusGeometry(.17,.028,6,18,Math.PI*1.6),gold,staff,0,1.3,0);fork.rotation.z=-.8;const core=mesh(new T.OctahedronGeometry(.15),glow(color),staff,0,1.3,0);root.userData.core=core;
 const orbit=new T.Group();g.add(orbit);orbit.position.y=.35;const ring=mesh(new T.TorusGeometry(.58,.012,5,40),glow(color),orbit);ring.rotation.x=Math.PI/2;for(let i=0;i<4;i++){const a=i/4*Math.PI*2;const star=mesh(new T.OctahedronGeometry(.045),glow(0xe9dbb3),orbit,Math.sin(a)*.58,0,Math.cos(a)*.58);star.scale.y=1.5;}root.userData.orbit=orbit;root.userData.height=2.5;return root;
}
function sentinel(){const {root,visual:g}=base();const stone=0x7f8b84,light=0xa5afa2,dark=0x4f625f;
 const torso=cyl(g,stone,0,1.53,0,.58,.42,1.02,8);torso.scale.z=.72;box(g,dark,0,1.45,.36,.56,.70,.08);const core=mesh(new T.SphereGeometry(.20,14,10),glow(0xf6be73),g,0,1.62,.43);rune(g,0,1.62,.45,.28,0xb8a984);root.userData.core=core;
 const head=box(g,light,0,2.32,0,.67,.50,.55);box(g,dark,0,2.34,.29,.48,.16,.025);box(g,glow(0xffd28d),0,2.34,.31,.23,.055,.025);cyl(g,0xaab4a5,0,2.60,0,.43,.43,.13,8);for(const s of [-1,1]){const shoulder=mesh(new T.IcosahedronGeometry(.35,0),stone,g,s*.65,1.99,0);shoulder.scale.set(1.25,.8,1.0);const arm=new T.Group();arm.position.set(s*.67,1.88,0);g.add(arm);cyl(arm,dark,0,-.24,0,.16,.17,.48,8);box(arm,stone,0,-.37,0,.38,.45,.40);const forearm=new T.Group();forearm.position.y=-.56;arm.add(forearm);cyl(forearm,light,0,-.16,0,.22,.24,.36,7);const fist=box(forearm,stone,0,-.42,.06,.45,.34,.46);box(forearm,0xc5b282,0,-.2,.24,.23,.055,.018);arm.userData.forearm=forearm;root.userData[s===-1?'armLeft':'armRight']=arm;}
 const legs=[];for(const s of [-1,1]){const l=new T.Group();l.position.set(s*.28,1.0,0);g.add(l);cyl(l,dark,0,-.23,0,.15,.15,.46,8);box(l,stone,0,-.52,0,.36,.42,.37);box(l,light,0,-.88,.13,.42,.22,.64);box(l,0xc7b782,0,-.51,.20,.13,.13,.03).rotation.z=Math.PI/4;legs.push(l);}root.userData.legs=legs;root.userData.height=3.0;return root;
}
function batchRigidParts(root){
 // Merge rigid decorations within each animated joint; joint transforms stay independent.
 const keep=new Set(Object.values(root.userData).filter(v=>v?.isMesh));
 function visit(group){for(const child of [...group.children])if(!child.isMesh)visit(child);const byMaterial=new Map();
 for(const child of group.children){if(!child.isMesh||keep.has(child)||Array.isArray(child.material))continue;const key=child.material.uuid+'_'+Object.keys(child.geometry.attributes).sort().join(',');if(!byMaterial.has(key))byMaterial.set(key,[]);byMaterial.get(key).push(child);}
 for(const items of byMaterial.values()){if(items.length<2)continue;const geometries=items.map(item=>{item.updateMatrix();const g=item.geometry.index?item.geometry.toNonIndexed():item.geometry.clone();g.applyMatrix4(item.matrix);return g;}),geometry=mergeGeometries(geometries,false);if(!geometry){geometries.forEach(g=>g.dispose());continue;}const combined=new T.Mesh(geometry,items[0].material);combined.castShadow=true;combined.receiveShadow=true;group.add(combined);for(const item of items){group.remove(item);item.geometry.dispose();}geometries.forEach(g=>g.dispose());}}
 visit(root);return root;
}
export function makeEnemyModel(kind,element='hydro'){const root=kind==='slime'?slime(element):kind==='mage'?mage(element):kind==='sentinel'?sentinel():humanoid(kind);return batchRigidParts(root);}

export function animateEnemy(e,t,dt){const u=e.mesh.userData,g=u.visual;if(!g)return;const moving=e.moving?1:0,wind=e.phase==='windup',recover=e.phase==='recover',phase=t*(e.kind==='sentinel'?3.5:6)+Number(e.animationSeed||0),charge=wind?Math.min(1,e.timer/Math.max(.001,e.wind||1)):0;
 if(e.kind==='slime'){const squash=wind?1-.26*charge:1+Math.sin(t*5+Number(e.animationSeed||0))*.055;g.scale.set(2-squash,squash,2-squash);g.position.y=e.phase==='leap'?Math.sin(Math.min(1,e.timer/.22)*Math.PI)*.8:moving?Math.abs(Math.sin(phase))*.15:0;if(u.crest)u.crest.rotation.y=t;return;}
 g.position.y=e.kind==='mage'?.38+Math.sin(t*2+Number(e.animationSeed||0))*.11:moving?Math.abs(Math.sin(phase))*.025:0;
 if(u.legs)u.legs.forEach((l,i)=>l.rotation.x=Math.sin(phase+i*Math.PI)*moving*(e.kind==='sentinel'?.18:.35));
 if(u.armLeft)u.armLeft.rotation.x=wind?-.35-charge*.5:-Math.sin(phase)*moving*.27;
 if(u.armRight)u.armRight.rotation.x=wind?-.45-charge*1.4:recover?.45:Math.sin(phase)*moving*.27;
 if(e.kind==='shield'&&u.armLeft){u.armLeft.rotation.x=wind?-.8:-.25;u.armLeft.rotation.z=-.15;}
 if(e.kind==='archer'){u.armLeft.rotation.x=-1.15;u.armRight.rotation.x=wind?-1.0:-.25;u.armRight.rotation.z=wind?.5:0;}
 if(e.kind==='mage'){u.orbit.rotation.y=t*.7;u.orbit.rotation.z=Math.sin(t*.7)*.1;u.core.rotation.y=t*1.3;u.armRight.rotation.x=wind?-1.3:-.25;g.rotation.z=Math.sin(t*1.2)*.025;}
 if(e.kind==='sentinel'){u.armLeft.rotation.x=wind?-charge*1.4:recover?.5:Math.sin(phase)*moving*.18;u.armRight.rotation.x=u.armLeft.rotation.x;u.core.scale.setScalar(1+Math.sin(t*(wind?10:2))*(wind?.15:.035));}
}
