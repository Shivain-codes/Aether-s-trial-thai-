import * as T from 'three';
import {clone} from 'three/addons/utils/SkeletonUtils.js';
import {box,cyl,orb,mesh,mat} from './art.js';
export function upgradeResidents(residents,template,boneNames){
 const colors=[0x7a5b48,0x6e8798,0x7a8862,0x587f8b,0xa97963,0x5b7d8a,0x8d7899,0x9c865e];
 for(const [index,n] of residents.list.entries()){
 const model=clone(template);n.rig.body.visible=false;n.rig.root.add(model);model.scale.multiplyScalar(.9);const bones={};model.traverse(m=>{if(m.isBone)bones[m.name]=m;if(m.isMesh){m.material=Array.isArray(m.material)?m.material.map(a=>a.clone()):m.material.clone();m.castShadow=true;m.receiveShadow=false;for(const material of (Array.isArray(m.material)?m.material:[m.material])){if(/Tops|Bottoms/.test(material.name))m.visible=false;if(index%2===0&&/HairBack/.test(material.name))m.visible=false;if(material.name.includes('Hair'))material.color.setHex([0x937956,0x98715f,0xa0a278,0x766e5c][index%4]);}}});
 model.updateMatrixWorld(true);const modelRotation=model.getWorldQuaternion(new T.Quaternion()),attachments=new Map();const bone=name=>bones[boneNames[name]],attach=name=>{if(attachments.has(name))return attachments.get(name);const b=bone(name),g=new T.Group();g.quaternion.copy(b.getWorldQuaternion(new T.Quaternion()).invert().multiply(modelRotation));b.add(g);attachments.set(name,g);return g;},chest=attach('chest'),hips=attach('hips');const coat=cyl(chest,colors[index%colors.length],0,.07,0,.16,.13,.36,12);coat.scale.z=.7;const belt=cyl(hips,0xd3b581,0,.02,0,.15,.15,.05,12);belt.scale.z=.8;
 for(const side of [-1,1])box(chest,0xdccca7,side*.11,.07,.105,.017,.3,.012);box(chest,0xe9ddbe,0,.1,.11,.05,.28,.012);
 if(index%2){const dress=cyl(hips,colors[index%colors.length],0,-.15,0,.15,.28,.36,16);dress.scale.z=.82;}else for(const side of ['left','right'])cyl(attach(side+'UpperLeg'),0x62594b,0,-.18,0,.075,.06,.37,10);
 for(const side of ['left','right']){cyl(attach(side+'LowerLeg'),0x514c43,0,-.2,0,.056,.045,.42,10);orb(attach(side+'UpperArm'),0xe5d5b1,0,0,0,.075,.075,.08);}
 if(index===2||index===3||index===7){cyl(attach('head'),0xcdb17a,0,.24,0,.27,.28,.035,20);cyl(attach('head'),0xb79d69,0,.31,0,.15,.17,.14,14);}
 const anim={};for(const name of ['leftUpperArm','rightUpperArm','leftUpperLeg','rightUpperLeg','leftLowerLeg','rightLowerLeg','spine','head']){const b=bone(name);anim[name]={b,rest:b.quaternion.clone(),axes:modelRotation.clone().invert().multiply(b.getWorldQuaternion(new T.Quaternion()))};}
 const euler=new T.Euler(),q=new T.Quaternion();n.animateDetailed=(t,walking)=>{const pose=(name,x=0,y=0,z=0)=>{const a=anim[name];q.setFromEuler(euler.set(x,y,z));a.b.quaternion.copy(a.rest).multiply(a.axes.clone().invert().multiply(q).multiply(a.axes));},phase=t*6+n.phase;
 pose('leftUpperArm',walking?-Math.sin(phase)*.28:-.12,0,-1.2);pose('rightUpperArm',walking?Math.sin(phase)*.28:-.12,0,1.2);pose('leftUpperLeg',walking?Math.sin(phase)*.42:0);pose('rightUpperLeg',walking?-Math.sin(phase)*.42:0);pose('leftLowerLeg',walking?Math.max(0,-Math.sin(phase))*.5:0);pose('rightLowerLeg',walking?Math.max(0,Math.sin(phase))*.5:0);pose('head',0,Math.sin(t*.4+n.phase)*.08);pose('spine',0);
 if(n.job==='Blacksmith')pose('rightUpperArm',-.6-Math.max(0,Math.sin(t*3))*.8,0,1.2);if(n.job==='Fisher')pose('rightUpperArm',-.8,0,1.1);if(n.job==='Vineyard gardener'){pose('spine',.2);pose('rightUpperArm',-.7,0,1.1);}model.position.y=walking?Math.abs(Math.sin(phase))*.02:0;
 };
 if(index===0){const hammer=new T.Group();bone('rightHand').add(hammer);cyl(hammer,0x76523a,0,-.12,0,.018,.02,.25,6);box(hammer,0x738388,0,-.26,0,.19,.09,.09);}
 if(index===3){const rod=cyl(bone('rightHand'),0x967958,0,-.55,0,.012,.02,1.2,6);rod.rotation.x=.4;}
 }
}
