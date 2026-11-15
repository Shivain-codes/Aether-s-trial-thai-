import * as T from 'three';
import {box,cyl,orb,mesh,mat} from './art.js';
import {heightAt} from './core.js';
export function addLandmarks(scene,solids){
 // Compact, original interpretations of familiar Mondstadt-region landmarks.
 const winery=new T.Group();winery.position.set(-130,heightAt(-130,69),69);scene.add(winery);box(winery,0xdecba8,0,3.1,0,10,6.2,8);for(const x of [-4.8,0,4.8])box(winery,0x6b5543,x,3.2,4.02,.22,6.4,.1);box(winery,0x6b5543,0,3.7,4.06,10,.2,.1);const roof=mesh(new T.ConeGeometry(8,4,4),0x695a70,winery,0,7.6,0);roof.rotation.y=Math.PI/4;roof.scale.z=.85;for(const x of [-3,0,3]){box(winery,0x789b9b,x,4.8,4.09,1.2,1.6,.08);box(winery,0xe9d7ad,x,4.8,4.15,.09,1.65,.08);}box(winery,0x6e503b,0,1.3,4.12,1.7,2.6,.12);solids.push({x:-130,z:69,r:5.2});
 for(let row=0;row<5;row++)for(let j=0;j<9;j++){const x=-118+row*4,z=52+j*3,y=heightAt(x,z);cyl(scene,0x9e8764,x,y+.65,z,.04,.055,1.3,5);orb(scene,0x65865b,x,y+1,z,.6,.4,.6);if(j%2===0)orb(scene,0x777b9c,x+.22,y+.8,z+.3,.15,.22,.14);}for(let j=0;j<4;j++)cyl(scene,0x917153,-137+j*1.3,heightAt(-137+j*1.3,61)+.5,61,.45,.45,1,12);
 for(const side of [-1,1]){const x=side*6.7;box(winery,0xe0cfb0,x,3.5,1,4,7,6);const towerRoof=mesh(new T.ConeGeometry(3.6,5,4),0x995f4f,winery,x,9,1);towerRoof.rotation.y=Math.PI/4;box(winery,0x625744,x,4.7,4.03,.16,4.3,.1);for(const z of [-1.8,3.8])box(winery,0x625744,x,3.5,z,4,.15,.14);for(const wx of [-.9,.9]){box(winery,0x51787d,x+wx,5,4.06,.65,1.6,.1);box(winery,0xd6c5a2,x+wx,5,4.13,.05,1.7,.06);}for(let j=0;j<8;j++)orb(winery,0x618554,x+side*1.7,1+j*.65,4,.35,.5,.13);}
 roof.material=mat(0x8e5f52);for(let j=0;j<7;j++)box(winery,0x7b654d,-4.5+j*1.5,2,4.04,.10,2.7,.08);
 // Windrise's great spreading tree and a small statue plaza.
 const tree=new T.Group();tree.position.set(-100,heightAt(-100,-61),-61);scene.add(tree);for(let i=0;i<7;i++){const a=i/7*Math.PI*2,branch=cyl(tree,0x70654c,Math.cos(a)*2.1,6.8,Math.sin(a)*2.1,.38,.8,7,8);branch.rotation.z=Math.sin(a)*.65;branch.rotation.x=Math.cos(a)*.65;}
 const statue=new T.Group();statue.position.set(-94,heightAt(-94,-51),-51);scene.add(statue);cyl(statue,0xa9b7ad,0,.3,0,1.8,2,.6,12);cyl(statue,0xc5d0c0,0,1.4,0,.45,.7,2.2,8);orb(statue,0xdce3cb,0,2.8,0,.27);for(const s of [-1,1]){const wing=mesh(new T.ConeGeometry(.55,2,4),0xcad9ca,statue,s*.7,2.1,-.1);wing.rotation.z=s*.7;}mesh(new T.OctahedronGeometry(.18),mat(0x81e3cd,{emissive:0x3ca79e,emissiveIntensity:.7}),statue,0,2,.7);
 // Stormterror's broken central tower is visible from the valley.
 const ruin=new T.Group();ruin.position.set(65,heightAt(65,-121),-121);scene.add(ruin);cyl(ruin,0x84999a,0,7,0,4,6,14,12);cyl(ruin,0xaabbb4,0,14,0,4.6,4.6,.6,12);for(let j=0;j<8;j++){const a=j/8*Math.PI*2,h=2+j%3;cyl(ruin,0x9fafab,Math.cos(a)*4,14+h/2,Math.sin(a)*4,.4,.5,h,6);}solids.push({x:65,z:-121,r:5});
 const wind=new T.Mesh(new T.TorusGeometry(6,.025,6,96),new T.MeshBasicMaterial({color:0xb8ebdf,transparent:true,opacity:.6}));ruin.add(wind);wind.userData.dynamic=true;wind.position.y=19;wind.rotation.x=Math.PI/2;return{update(t){wind.rotation.z=t*.2;wind.position.y=18.8+Math.sin(t*.4)*.4;}};
}
