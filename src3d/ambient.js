import * as T from 'three';
import {rng} from './core.js';
// Two small valley flocks and local pollen keep the landscape moving at two draw calls.
export function makeAmbientLife(parent){const random=rng(731),dummy=new T.Object3D();
 const wings=new T.BufferGeometry();wings.setAttribute('position',new T.Float32BufferAttribute([0,0,.15,-.65,.06,-.06,-.23,0,-.15,0,0,.15,.23,0,-.15,.65,.06,-.06,0,0,.2,-.08,0,-.2,.08,0,-.2],3));wings.computeVertexNormals();const material=new T.MeshLambertMaterial({color:0xf4f4e6,side:T.DoubleSide});let shader;
 material.onBeforeCompile=s=>{shader=s;s.uniforms.flightTime={value:0};s.vertexShader='uniform float flightTime;\n'+s.vertexShader;s.vertexShader=s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\ntransformed.y+=abs(position.x)*sin(flightTime*5.+instanceMatrix[3].x)*.35;');};
 const birds=new T.InstancedMesh(wings,material,16);birds.frustumCulled=false;parent.add(birds);
 const seeds=Array.from({length:70},()=>({x:(random()-.5)*36,y:random()*8,z:(random()-.5)*36,phase:random()*6.28}));const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(new Float32Array(seeds.length*3),3));
 const dust=new T.Points(geometry,new T.PointsMaterial({color:0xffedc0,size:.035,transparent:true,opacity:.48,depthWrite:false,sizeAttenuation:true}));dust.frustumCulled=false;parent.add(dust);
 return{update(t,focus){if(shader)shader.uniforms.flightTime.value=t;for(let i=0;i<16;i++){const a=t*(.09+i%3*.012)+i*2.4,r=14+i%5*3.2,cx=i<8?-48:41,cz=i<8?13:29;dummy.position.set(cx+Math.cos(a)*r,18+i%4*1.5+Math.sin(a*2)*1.2,cz+Math.sin(a)*r*.7);dummy.rotation.set(Math.sin(a)*.08,-a,Math.cos(a)*.13);dummy.scale.setScalar(.65+i%3*.15);dummy.updateMatrix();birds.setMatrixAt(i,dummy.matrix);}birds.instanceMatrix.needsUpdate=true;const p=geometry.attributes.position;seeds.forEach((s,i)=>p.setXYZ(i,focus.x+s.x+Math.sin(t*.3+s.phase)*2,focus.y+s.y+Math.sin(t*.4+s.phase)*.5,focus.z+s.z+Math.cos(t*.2+s.phase)*2));p.needsUpdate=true;}};
}
