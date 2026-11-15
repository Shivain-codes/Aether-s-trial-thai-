// Pure simulation rules shared by the browser and dependency-free tests.
export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function rng(seed=1337){return()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
export const LANDMARKS=[
 {id:'overlook',name:'Windrise Overlook',x:0,z:105,description:'Where the wind begins',color:'#b6db85'},
 {id:'village',name:'Mondstadt',x:-53,z:9,description:'A home among the windmills',color:'#edc787'},
 {id:'lake',name:'Cider Lake',x:42,z:29,description:'The sky beneath your feet',color:'#8cdae8'},
 {id:'grove',name:'Windrise',x:-100,z:-61,description:'Old branches, older stories',color:'#87bb9b'},
 {id:'winery',name:'Dawn Winery',x:-130,z:69,description:'Vineyards in the afternoon sun',color:'#b3ba76'},
 {id:'ruins',name:'Stormterror Ruins',x:65,z:-108,description:'The last song of an ancient kingdom',color:'#aab8e3'}
];
export const NARRATION='When the wind shrine shattered, its power rushed toward the village.';
export function heightAt(x,z){
 const hills=4+3.7*Math.sin(x*.022+z*.009)+2.7*Math.cos(z*.032)+1.7*Math.sin(x*.053-z*.027);
 const overlook=18*Math.exp(-(x*x/2500+(z-105)**2/850));
 const north=11*Math.exp(-((x-70)**2/3200+(z+110)**2/2000));
 const lake=Math.exp(-((x-43)**2/2300+(z-22)**2/2600));
 let h=Math.max(2.4,hills+overlook+north)-16*lake;
 // Smooth village plaza flattening; no invisible step at the boundary.
 const k=Math.exp(-((x+53)**2/1150+(z-9)**2/1150)); h=h*(1-k)+4.2*k;
 return h;
}
export const WATER=0.35;
export function newSave(){return {version:1,x:0,z:105,hp:100,level:1,xp:0,coins:0,gems:0,potions:2,energy:0,discovered:['overlook'],waypoints:['overlook'],chests:[],sigils:[],wildDefeated:[],trials:[false,false],quest:0,completed:false};}
export const xpNeed=l=>40+Math.round(28*Math.pow(l-1,1.4));
export const maxHp=s=>100+18*(s.level-1);
export const attack=s=>10+3*(s.level-1);
export function awardXp(s,n){s.xp+=Math.max(0,n);let ups=0;while(s.level<30&&s.xp>=xpNeed(s.level)){s.xp-=xpNeed(s.level);s.level++;ups++;if(s.hp>0)s.hp=Math.min(maxHp(s),s.hp+maxHp(s)*.4);}return ups;}
export function heal(s){if(s.hp<=0||s.potions<=0||s.hp>=maxHp(s))return false;s.hp=Math.min(maxHp(s),s.hp+45);s.potions--;return true;}
export function rewardChest(s,id,reward={coins:25,gems:10,potions:1}){if(s.chests.includes(id))return false;s.chests.push(id);s.coins+=reward.coins;s.gems+=reward.gems;s.potions=Math.min(9,s.potions+reward.potions);return true;}
export function hitEnemy(e,amount,element,id){if(e.hp<=0||e.hits.has(id))return null;e.hits.add(id);if(e.hits.size>24)e.hits.delete(e.hits.values().next().value);const vaporize=element==='pyro'&&e.element==='hydro';const damage=amount*(vaporize?1.5:1);e.hp=Math.max(0,e.hp-damage);return{damage,vaporize,killed:e.hp<=0};}
export function trialComplete(enemies,playerHp){return playerHp>0&&enemies.length>0&&enemies.every(e=>e.hp<=0);}
export function safeSave(raw){
 try{const a=JSON.parse(raw);if(!a||a.version!==1)return null;const s=newSave();
 for(const key of ['x','z','hp','xp','coins','gems','potions','energy','level','quest'])if(typeof a[key]==='number'&&Number.isFinite(a[key]))s[key]=a[key];
 s.x=clamp(s.x,-175,175);s.z=clamp(s.z,-175,175);s.level=clamp(Math.floor(s.level),1,30);s.hp=clamp(s.hp,1,maxHp(s));s.energy=clamp(s.energy,0,60);s.potions=clamp(Math.floor(s.potions),0,9);s.xp=clamp(s.xp,0,xpNeed(s.level)-1);s.coins=clamp(Math.floor(s.coins),0,1e6);s.gems=clamp(Math.floor(s.gems),0,1e6);s.quest=clamp(Math.floor(s.quest),0,2);
 for(const key of ['discovered','waypoints'])if(Array.isArray(a[key]))s[key]=[...new Set(a[key].filter(v=>LANDMARKS.some(l=>l.id===v)))];
 if(!s.waypoints.includes('overlook'))s.waypoints.push('overlook');
 for(const key of ['chests','sigils','wildDefeated'])if(Array.isArray(a[key]))s[key]=[...new Set(a[key].filter(v=>typeof v==='string'&&v.length<40))].slice(0,100);
 s.trials=[a.trials?.[0]===true,a.trials?.[1]===true];s.completed=s.trials.every(Boolean);return s;
 }catch{return null;}
}
export function moveCircle(p,dx,dz,solids,bounds=176){
 const n=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.25));
 for(let i=0;i<n;i++){p.x=clamp(p.x+dx/n,-bounds,bounds);p.z=clamp(p.z+dz/n,-bounds,bounds);
 for(const o of solids){let x=p.x-o.x,z=p.z-o.z,d=Math.hypot(x,z),r=o.r+.36;if(d<r){if(d<.0001){x=1;z=0;d=1;}p.x=o.x+x/d*r;p.z=o.z+z/d*r;}}
 }return p;
}
