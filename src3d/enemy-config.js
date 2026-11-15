// Shared, deterministic encounter definitions. Existing wild0..wild7 save IDs stay stable.
export const ENEMY_TYPES={
 slime:{name:'Elemental Slime',hint:'Dodge its landing circle. Pyro vaporizes Hydro slimes.',hp:52,speed:2.1,range:5.7,prefer:2.2,wind:.65,recover:.8,cooldown:1.1,damage:12,radius:.65,barHeight:1.55},
 guardian:{name:'Masked Raider',hint:'Dodge the club wind-up, then strike during recovery.',hp:68,speed:2.55,range:3.3,prefer:2.0,wind:.8,recover:.85,cooldown:1.0,damage:16,radius:.65,barHeight:2.25},
 shield:{name:'Shield Warden',hint:'Flank its guard or break the shield with Pyro.',hp:86,speed:1.85,range:3.2,prefer:2.1,wind:.95,recover:1,cooldown:1.2,damage:18,radius:.75,barHeight:2.3},
 archer:{name:'Ember Archer',hint:'Sidestep the gold aim line and close the distance.',hp:50,speed:2.4,range:18,prefer:11,wind:1.05,recover:.7,cooldown:1.7,damage:15,radius:.6,barHeight:2.25},
 mage:{name:'Abyss Weaver',hint:'Leave the violet spell circle before it erupts.',hp:68,speed:1.9,range:16,prefer:9,wind:1.35,recover:.8,cooldown:1.8,damage:20,radius:.7,barHeight:2.7},
 sentinel:{name:'Ruin Sentinel',hint:'Bait the heavy slam, then attack its long recovery.',hp:140,speed:1.45,range:5.2,prefer:3.1,wind:1.35,recover:1.3,cooldown:1.5,damage:28,radius:1.15,barHeight:3.6}
};
export const ENEMY_CAMPS=[
 {id:'road',x:-27,z:-19,name:'Windmill Road'}, {id:'shore',x:20,z:66,name:'Cider Shore'},
 {id:'ruin-path',x:78,z:-62,name:'Ruins Approach'}, {id:'vine-path',x:-89,z:91,name:'Vineyard Trail'},
 {id:'grove',x:-112,z:-37,name:'Grove Outskirts'}, {id:'ridge',x:113,z:43,name:'Eastern Ridge'},
 {id:'north',x:-20,z:-102,name:'Northern Pass'}, {id:'sentinel',x:113,z:-126,name:'Silent Watch'}
];
const elements=['hydro','pyro','electro','anemo','cryo','geo'];
export function encounterRoster(level=0,outdoor=false){
 const n=outdoor?24:level?15:10;
 return Array.from({length:n},(_,j)=>{
 const kind=j<3?'slime':outdoor?(j<8?(j%4===3?'guardian':'slime'):['shield','archer','mage','sentinel','guardian','archer','mage','shield','slime','archer','sentinel','mage','shield','slime','archer','sentinel'][j-8]):['guardian','shield','archer','mage','sentinel','slime','guardian','archer','shield','mage','sentinel','slime'][j-3];
 let element=j<3?'hydro':kind==='archer'?'pyro':kind==='mage'?'electro':kind==='sentinel'||kind==='shield'?'geo':elements[j%6];
 const spec=ENEMY_TYPES[kind],scale=outdoor?1:level?1.4:1;
 let x,z,campId;
 if(outdoor){const ci=j<8?Math.floor(j/2):j<12?j-8:4+Math.floor((j-12)/3),slot=j<8?j%2:j<12?2:(j-12)%3,c=ENEMY_CAMPS[ci];x=c.x+(slot===1?3:slot===2?-2:0);z=c.z+(slot===2?4:0);campId=c.id;}
 else{const a=j/n*Math.PI*2,r=16+(j%3)*4;x=Math.sin(a)*r;z=Math.cos(a)*r-4;}
 return{id:outdoor?'wild'+j:j,kind,element,x,z,campId,maxHp:Math.round(spec.hp*scale),speed:spec.speed*(level&&!outdoor?1.22:1),damage:spec.damage*(level&&!outdoor?1.35:1),shieldHp:kind==='shield'?30:0};
 });
}
export function shieldResponse(enemy,amount,element,attacker){
 if(enemy.kind!=='shield'||enemy.shieldHp<=0)return{damage:amount,blocked:false,shieldDamage:0};
 const dx=attacker.x-enemy.x,dz=attacker.z-enemy.z,d=Math.hypot(dx,dz)||1,front=(Math.sin(enemy.facing||0)*dx+Math.cos(enemy.facing||0)*dz)/d>.25;
 if(!front)return{damage:amount,blocked:false,shieldDamage:0};
 return element==='pyro'?{damage:amount,blocked:false,shieldDamage:amount*1.5}:{damage:amount*.25,blocked:true,shieldDamage:amount*.5};
}
