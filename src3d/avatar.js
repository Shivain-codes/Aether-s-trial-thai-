import * as T from 'three';
import {tailorCapes} from './costume.js';
import {makeTravelerDetails,travelerEyes} from './traveler-details.js';
import {clone} from 'three/addons/utils/SkeletonUtils.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {VRMLoaderPlugin,VRMUtils} from '@pixiv/three-vrm';
import {mat,mesh,orb,cyl,box,tapered} from './art.js';
// Licensed pixiv sample mesh; game-specific cloak, sword and animation are original.
export async function upgradeAvatar(hero){
 const loader=new GLTFLoader();loader.register(parser=>new VRMLoaderPlugin(parser));
 const bytes=Uint8Array.from(atob(AVATAR_BASE64),c=>c.charCodeAt(0));
 const gltf=await loader.parseAsync(bytes.buffer,'');const vrm=gltf.userData.vrm;
 VRMUtils.removeUnnecessaryVertices(vrm.scene);VRMUtils.combineSkeletons(vrm.scene);
 const bounds=new T.Box3().setFromObject(vrm.scene),h=bounds.max.y-bounds.min.y,scale=2.14/h;vrm.scene.scale.setScalar(scale);
 hero.residentTemplate=clone(vrm.scene);hero.residentTemplate.traverse(m=>{if(m.isMesh)m.material=Array.isArray(m.material)?m.material.map(a=>a.clone()):m.material.clone();});hero.boneNames={};for(const n of ['head','chest','hips','leftUpperArm','rightUpperArm','leftUpperLeg','rightUpperLeg','leftLowerLeg','rightLowerLeg','rightHand','spine'])hero.boneNames[n]=vrm.humanoid.getRawBoneNode(n).name;
 for(const c of [...hero.body.children])if(!hero.capes.includes(c)&&c!==hero.glider)hero.body.remove(c);
 tailorCapes(hero);
 hero.body.add(vrm.scene);vrm.scene.traverse(m=>{if(m.isMesh){m.castShadow=true;m.receiveShadow=false;m.frustumCulled=false;const materials=Array.isArray(m.material)?m.material:[m.material];for(const material of materials){if(/Tops|Bottoms|HAIR|Shoes/.test(material.name))m.visible=false;if(material.name.includes('Bottoms'))material.color.setHex(0x554035);if(material.name.includes('EyeIris')){material.color.setHex(0xffffff);material.map=travelerEyes();material.shadeMultiplyTexture=material.map;material.needsUpdate=true;}if(material.name.includes('FaceBrow'))material.color.setHex(0xb18445);if(material.name.includes('Shoes'))material.color.setHex(0x3a302b);if(material.isMToonMaterial){material.outlineWidthFactor=.0014;material.shadeColorFactor?.setHex(/SKIN|FaceMouth/.test(material.name)?0xe9bca8:/EYE/.test(material.name)?0xffffff:0x9e9c97);}}}});
 const bone=n=>vrm.humanoid.getNormalizedBoneNode(n),raw=n=>vrm.humanoid.getRawBoneNode(n);
 hero.root.updateMatrixWorld(true);const attachments=new Map(),modelRotation=vrm.scene.getWorldQuaternion(new T.Quaternion());
 const attach=n=>{if(attachments.has(n))return attachments.get(n);const b=raw(n),g=new T.Group(),q=b.getWorldQuaternion(new T.Quaternion()).invert().multiply(modelRotation);g.quaternion.copy(q);b.add(g);attachments.set(n,g);return g;};

 const sword=hero.sword;sword.removeFromParent();hero.body.add(sword);sword.scale.setScalar(1);
 // Align armor to each bind-pose limb before the humanoid animation rotates it.
 const limb=(name,next)=>{const base=attach(name),g=new T.Group();base.add(g);hero.root.updateMatrixWorld(true);const a=base.worldToLocal(raw(name).getWorldPosition(new T.Vector3())),b=base.worldToLocal(raw(next).getWorldPosition(new T.Vector3()));g.quaternion.setFromUnitVectors(new T.Vector3(0,-1,0),b.sub(a).normalize());return g;};
 const {braid}=makeTravelerDetails(attach,sword,limb);
 const handPosition=new T.Vector3(),elbowPosition=new T.Vector3(),bladeDirection=new T.Vector3(),bladeAxis=new T.Vector3(0,-1,0);
 hero.root.userData.design='Layered golden hair, amber eyes, braided tail, cropped black/gold outfit, ivory mantle';
 let prev=0,stridePhase=0,runBlend=0,airBlend=0;const poseEuler=new T.Euler(),poseQuaternion=new T.Quaternion();hero.animate=(t,speed=0,swing=0,air=false,gliding=false,motion={})=>{
 const dt=Math.min(.05,Math.max(0,t-prev));prev=t;runBlend+=(Math.min(1,speed/7)-runBlend)*(1-Math.exp(-dt*12));airBlend+=((air?1:0)-airBlend)*(1-Math.exp(-dt*12));stridePhase+=dt*speed*1.48;const run=runBlend,ph=stridePhase,poses={};
 const pose=(n,x=0,y=0,z=0)=>{poses[n]=[x,y,z];};
 pose('leftUpperArm',-.14-Math.sin(ph)*.45*run,0,-1.20);pose('rightUpperArm',-.14+Math.sin(ph)*.45*run,0,1.20);pose('leftLowerArm',-.2,0,0);pose('rightLowerArm',-.2,0,0);
 pose('leftUpperLeg',Math.sin(ph)*.62*run);pose('rightUpperLeg',-Math.sin(ph)*.62*run);pose('leftLowerLeg',Math.max(0,-Math.sin(ph))*.8*run);pose('rightLowerLeg',Math.max(0,Math.sin(ph))*.8*run);pose('spine',motion.dash?.3:run*.12,Math.sin(ph)*run*.035,-(motion.turn||0)*run*.1);pose('head',Math.sin(t*.9)*.025,Math.sin(t*.55)*.03,0);
 if(swing>0){const cut=Math.sin(swing*Math.PI),side=motion.combo%2?-1:1;pose('rightUpperArm',-.7-cut*1.5,-side*.6,1.0-cut*.8);pose('rightLowerArm',-.6);pose('chest',0,side*cut*.6,0);}else pose('chest');
 if(airBlend>.01){const rising=(motion.verticalSpeed||0)>0;for(const [n,target] of [['leftUpperLeg',rising?-.65:-.2],['rightUpperLeg',rising?.25:.1],['leftLowerLeg',rising?.85:.35],['rightLowerLeg',.5]])pose(n,poses[n][0]*(1-airBlend)+target*airBlend);}
 if(gliding){pose('leftUpperArm',-.35,0,-.25);pose('rightUpperArm',-.35,0,.25);pose('leftLowerArm',-.35);pose('rightLowerArm',-.35);}
 hero.glider.visible=gliding;hero.body.position.y=(1-airBlend)*Math.abs(Math.sin(ph))*.035*run-(motion.landing||0)*.075;
 if(motion.waking!==undefined){const rest=1-motion.waking;pose('leftUpperLeg',-1.15*rest);pose('rightUpperLeg',-1.15*rest);pose('leftLowerLeg',1.9*rest);pose('rightLowerLeg',1.9*rest);pose('spine',.25*rest);pose('head',.3*rest);hero.body.position.y=-.65*rest;}

 for(const m of hero.capes){const p=m.geometry.attributes.position,b=m.userData.base;for(let i=0;i<p.count;i++){const u=1.525-b[i*3+1];p.setZ(i,b[i*3+2]-u*(.07+run*.42)+Math.sin(t*5+b[i*3]*4+u*5)*u*.075);}p.needsUpdate=true;m.geometry.computeVertexNormals();}
 const blink=(t%4.3)>.0&&(t%4.3)<.12?1:0;braid.rotation.x=Math.sin(t*5)*.08+run*.18;vrm.expressionManager?.setValue('blink',blink);
 for(const [name,angles] of Object.entries(poses)){const b=bone(name);if(b){poseEuler.set(...angles);poseQuaternion.setFromEuler(poseEuler);b.quaternion.slerp(poseQuaternion,1-Math.exp(-dt*(swing>0?26:16)));}}
 vrm.update(dt);
 if(swing>0){hero.root.updateMatrixWorld(true);raw('rightHand').getWorldPosition(handPosition);raw('rightLowerArm').getWorldPosition(elbowPosition);hero.body.worldToLocal(handPosition);hero.body.worldToLocal(elbowPosition);bladeDirection.copy(handPosition).sub(elbowPosition).normalize();sword.position.copy(handPosition);sword.quaternion.setFromUnitVectors(bladeAxis,bladeDirection);}
 else{sword.position.set(.25,1.60,-.31);sword.rotation.set(-.10,0,-.37);}

 };hero.vrm=vrm;return vrm;
}
