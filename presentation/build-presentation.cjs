const fs = require('node:fs');
const path = require('node:path');
const pptxgen = require('pptxgenjs');
const imageSize = require('image-size');
const pres = new pptxgen();
pres.layout = 'LAYOUT_WIDE';
pres.author = 'Shivain · Aether’s Trial project';
pres.subject = 'Game vision, story treatment and playable prototype';
pres.title = 'Aether’s Trial — Windborne';
pres.company = 'Independent fan-made prototype';
pres.lang = 'en-IN';
pres.theme = {headFontFace:'Cambria', bodyFontFace:'Arial', lang:'en-IN'};
const W=13.333333,H=7.5,S=pres.ShapeType;
const C={night:'102C35',ink:'14383F',teal:'245961',aqua:'8FCBC1',cream:'F4EEDB',gold:'DDC184',muted:'AEC4C4',paper:'FBFCF8',soft:'E7EEEA',line:'497079',purple:'B9A8DB',blue:'7FB5CF',red:'D99273'};
const dir=__dirname;
const project=path.resolve(dir,'..');
const candidate=(name,fallback)=>fs.existsSync(path.join(project,'shots',name))?path.join(project,'shots',name):path.join(project,'shots',fallback);
const world=candidate('windborne-graphics-v3.jpg','graphics-review-v3.jpg');
const camp=candidate('enemy-camp-v3.jpg','graphics-review-v3.jpg');
const town=candidate('town-v3.jpg','graphics-review-v3.jpg');
const assets={world:path.join(dir,'assets','windborne-world.jpg'),camp:path.join(dir,'assets','enemy-camp.jpg'),town:path.join(dir,'assets','mondstadt-town.jpg')};
fs.copyFileSync(world,assets.world);fs.copyFileSync(camp,assets.camp);fs.copyFileSync(town,assets.town);
const intro={fight:path.join(project,'shots','intro-short','fight.jpg'),memory:path.join(project,'shots','intro-short','memory.jpg'),poster:path.join(project,'shots','intro-short','poster.jpg')};
function shape(sl,type,x,y,w,h,fill,line,extra={}){sl.addShape(type,{x,y,w,h,fill:fill?{color:fill}:{color:C.night,transparency:100},line:{color:line||fill||C.night,transparency:line?0:100,width:1},...extra});}
function text(sl,str,x,y,w,h,size=16,color=C.cream,extra={}){sl.addText(str,{x,y,w,h,fontFace:'Arial',fontSize:size,color,margin:0,breakLine:false,valign:'mid',...extra});}
function heading(sl,str,x=.65,y=.75,w=12,h=.95,size=36,color=C.cream){text(sl,str,x,y,w,h,size,color,{fontFace:'Cambria',bold:true,breakLine:false,valign:'top'});}
function small(sl,str,x,y,w=8,color=C.muted){text(sl,str,x,y,w,.25,10.5,color,{charSpacing:1.8,bold:true});}
function line(sl,x1,y1,x2,y2,color=C.gold,width=1,dash){sl.addShape(S.line,{x:Math.min(x1,x2),y:Math.min(y1,y2),w:Math.abs(x2-x1),h:Math.abs(y2-y1),flipV:(x2-x1)*(y2-y1)<0,line:{color,width,...(dash?{dashType:'dash'}:{})}});}
function photo(sl,p,x,y,w,h){const d=imageSize(fs.readFileSync(p));sl.addImage({path:p,x,y,w,h:w*d.height/d.width,sizing:{type:'cover',w,h}});}
function panel(sl,x,y,w,h,color=C.ink){shape(sl,S.roundRect,x,y,w,h,color,null,{radius:.14});}
function diamond(sl,cx,cy,r=.12,color=C.gold,fill=false){shape(sl,S.diamond,cx-r,cy-r,r*2,r*2,fill?color:undefined,color,{line:{color,width:1.4}});}
function sigil(sl,cx,cy,r,color=C.gold){diamond(sl,cx,cy,r,color);diamond(sl,cx,cy,r*.42,color);for(const a of [0,Math.PI/2,Math.PI,Math.PI*1.5]){const dx=Math.sin(a),dy=Math.cos(a);line(sl,cx+dx*r*1.15,cy+dy*r*1.15,cx+dx*r*1.7,cy+dy*r*1.7,color,1.5);}}
function base(n,light=false){const sl=pres.addSlide();sl.background={color:light?C.paper:C.night};const col=light?C.teal:C.muted;small(sl,'AETHER’S TRIAL  /  WINDBORNE',.65,.3,6,col);text(sl,String(n).padStart(2,'0'),12.13,6.97,.55,.24,10.5,col,{align:'right'});diamond(sl,11.93,7.09,.045,light?C.teal:C.gold,true);return sl;}
function note(sl,str){sl.addNotes(str);}
function enemyIcon(sl,type,cx,cy,r=.28,col=C.gold){
 if(type==='slime'){shape(sl,S.ellipse,cx-r,cy-r*.7,r*2,r*1.4,col);for(const d of [-1,1])shape(sl,S.ellipse,cx+d*r*.32-r*.055,cy-r*.1,r*.11,r*.21,C.night);}
 if(type==='guardian'){shape(sl,S.hexagon,cx-r*.8,cy-r,r*1.6,r*2,undefined,col,{line:{color:col,width:1.6}});for(const d of [-1,1])line(sl,cx+d*r*.6,cy-r*.15,cx+d*r*.18,cy,col,2);}
 if(type==='shield'){shape(sl,S.pentagon,cx-r,cy-r,r*2,r*2,undefined,col,{rotate:180,line:{color:col,width:1.7}});line(sl,cx,cy-r*.55,cx,cy+r*.45,col,1.4);}
 if(type==='archer'){shape(sl,S.arc,cx-r*.9,cy-r,r*1.8,r*2,undefined,col,{rotate:270,line:{color:col,width:1.8}});line(sl,cx-r*.6,cy,cx+r*.85,cy,col,1.6);shape(sl,S.triangle,cx+r*.65,cy-.07,.13,.14,col,null,{rotate:90});}
 if(type==='mage'){diamond(sl,cx,cy,r*.78,col);shape(sl,S.ellipse,cx-r*1.2,cy-r*.22,r*2.4,r*.44,undefined,col,{rotate:-20,line:{color:col,width:1}});}
 if(type==='sentinel'){shape(sl,S.rect,cx-r*.8,cy-r*.85,r*1.6,r*1.7,undefined,col,{line:{color:col,width:1.8}});diamond(sl,cx,cy,r*.38,col,true);for(const d of [-1,1])shape(sl,S.rect,cx+d*r*.98-r*.16,cy-r*.4,r*.32,r*1.1,col);}
}
// 01 — Cover: actual gameplay is the visual anchor.
{
 const sl=base(1);photo(sl,assets.world,0,0,W,5.6);shape(sl,S.rect,0,0,W,5.6,C.night,null,{fill:{color:C.night,transparency:85}});shape(sl,S.rect,0,5.3,W,2.2,C.night);
 small(sl,'AN EXPLORABLE FANTASY PROTOTYPE',.7,5.62,8,C.gold);
 heading(sl,'Aether’s Trial',.68,5.95,8.7,.76,46);text(sl,'WINDBORNE',10.0,6.16,2.6,.36,19,C.gold,{charSpacing:3.5,align:'right'});
 text(sl,'Follow the wind. Recover the valley. Find your purpose.',.73,6.85,10,.27,15,C.muted);
 note(sl,'Open with the playable world, not a promise of a finished commercial game. Aether’s Trial — Windborne is a local third-person exploration prototype, visually inspired by Genshin Impact. This deck explains the actual current build and a story treatment connected to its two-trial quest. The screenshot is captured from this project. Names and visual references belong to HoYoverse; this is unofficial and unaffiliated.');
}
// 02 — Vision / current scale.
{
 const sl=base(2);heading(sl,'A valley worth\ngetting lost in.',.65,1.0,5.2,1.7,39);text(sl,'A bright world of winding paths, small human routines and danger just beyond the next hill.',.7,3.0,4.6,1.05,20,C.muted,{breakLine:false,valign:'top'});
 photo(sl,assets.town,6.0,1.08,6.65,3.73);text(sl,'ACTUAL PLAYABLE BUILD',6.1,4.98,6,.25,10,C.gold,{charSpacing:1.5});
 for(const [i,n,label] of [[0,'6','places to discover'],[1,'9','working residents'],[2,'2','combat trials']]){const x=.72+i*4.25;text(sl,n,x,5.32,1.45,1.0,62,C.gold,{fontFace:'Cambria'});text(sl,label,x+1.5,5.67,2.35,.55,17,C.cream);}
 note(sl,'The intended feeling is curiosity followed by discovery. The present prototype contains six discoverable landmarks, nine residents with work routines and short interactions, and two combat trials. Those are current build counts, not future targets. The world is a bounded valley; it is not a continent-sized open-world production.');
}
// 03 — Story premise.
{
 const sl=base(3);small(sl,'THE STORY BEHIND THE JOURNEY',.68,.92,8,C.gold);heading(sl,'The wind remembers.\nAether does not.',5.2,1.3,7.25,1.65,39);
 shape(sl,S.ellipse,.95,1.6,3.7,3.7,undefined,C.line,{line:{color:C.line,width:1}});shape(sl,S.ellipse,1.38,2.03,2.84,2.84,undefined,C.line,{line:{color:C.line,width:1}});sigil(sl,2.80,3.45,.85,C.gold);for(const [x,y] of [[1.03,2.5],[4.38,3.6],[2.3,5.3]])diamond(sl,x,y,.12,C.aqua,true);
 text(sl,'A wind shrine shatters. Aether fights its guardian and seals the storm to save the village. The seal consumes his memories; he wakes on a cliff with a floating companion.',5.25,3.25,6.8,1.5,21,C.cream,{valign:'top'});
 text(sl,'The question beneath the adventure',5.25,5.18,6,.28,12,C.gold,{bold:true});text(sl,'Can you protect a home\nbefore you remember your own?',5.25,5.63,6.7,.95,27,C.aqua,{fontFace:'Cambria',italic:true,valign:'top'});
 note(sl,'This is the original backstory of our fan-made prototype, not Genshin Impact canon. A damaged wind shrine releases energy toward the village. Aether fights through its guardian and binds the storm with a seal. The seal saves the people but consumes his memories. He awakens at Windrise Overlook with Paimon, who found him after the accident and does not know why his memory is missing. This premise is told in the 30-second opening film, story journal and contextual dialogue. Branching dialogue and playable memory quests remain future scope. The emotional theme is choosing to help before every personal answer is known.');
}
// 04 — Cast as an editorial triptych with editable emblems.
{
 const sl=base(4,true);heading(sl,'Three voices. One journey.',.65,.94,12,.75,37,C.ink);
 const cards=[{x:.65,name:'Aether',role:'THE TRAVELLER',body:'An outsider with missing memories. His growing purpose is to protect the people he meets.',col:C.teal},{x:4.89,name:'Paimon',role:'THE COMPANION',body:'A floating guide who turns an unfamiliar world into a journey shared with someone.',col:'7278A3'},{x:9.13,name:'Lyra',role:'KEEPER OF THE WINDS',body:'A local keeper who asks for three wind sigils and points Aether toward the old guardians.',col:'9A7948'}];
 for(const c of cards){panel(sl,c.x,2.0,3.55,4.6,C.soft);shape(sl,S.ellipse,c.x+1.1,2.35,1.35,1.35,undefined,c.col,{line:{color:c.col,width:1.3}});if(c.name==='Aether'){line(sl,c.x+1.47,3.35,c.x+2.04,2.68,c.col,3);line(sl,c.x+1.35,3.08,c.x+1.70,3.4,c.col,2);diamond(sl,c.x+2.09,2.62,.1,c.col,true);}else if(c.name==='Paimon'){shape(sl,S.ellipse,c.x+1.57,2.69,.4,.4,c.col);shape(sl,S.triangle,c.x+1.49,3.11,.56,.43,c.col,null,{rotate:180});shape(sl,S.ellipse,c.x+1.5,2.48,.54,.1,undefined,c.col,{line:{color:c.col,width:1.3}});}else sigil(sl,c.x+1.775,3.02,.28,c.col);
 small(sl,c.role,c.x+.28,4.02,3.0,c.col);heading(sl,c.name,c.x+.28,4.47,3.0,.52,29,C.ink);text(sl,c.body,c.x+.28,5.25,2.99,1.0,15.4,C.ink,{valign:'top'});}
 note(sl,'Aether and Paimon are simplified fan-made interpretations of HoYoverse characters. Lyra is the local quest-giver used by this prototype. In the current build, the companion follows the player and Lyra has contextual quest dialogue. The story journal explains the memory premise. Deeper characterization is story treatment; there is no fully scripted companion conversation system.');
}
// 05 — Three acts.
{
 const sl=base(5);heading(sl,'Restore the winds.\nFind a reason to stay.',.65,1.0,5.0,1.55,38);text(sl,'A compact story arc built around the game’s existing quest and two trials.',.7,3.05,4.5,1.0,20,C.muted,{valign:'top'});sigil(sl,2.9,5.5,.57,C.aqua);
 const beats=[{y:1.18,num:'I',title:'Listen to the valley',desc:'Meet Lyra in Mondstadt. Gather three wind sigils and return to her.',tag:'EXPLORATION & TRUST'},{y:3.06,num:'II',title:'Wake the first gate',desc:'Defeat the Fields guardian. The northern trial becomes accessible.',tag:'MONDSTADT FIELDS'},{y:4.94,num:'III',title:'Answer the storm',desc:'Defeat the Storm Drake. Restore the winds and choose to protect this new home.',tag:'STORMTERROR RUINS'}];
 for(const b of beats){diamond(sl,6.05,b.y+.53,.4,C.gold);text(sl,b.num,5.72,b.y+.31,.66,.42,23,C.gold,{fontFace:'Cambria',align:'center'});small(sl,b.tag,6.85,b.y,5.2,C.aqua);text(sl,b.title,6.85,b.y+.43,5.6,.43,24,C.cream,{fontFace:'Cambria',bold:true});text(sl,b.desc,6.85,b.y+1.0,5.5,.65,16,C.muted,{valign:'top'});}
 note(sl,'Act I follows the implemented quest: find Lyra, collect three of the valley’s six sigils, and return for the reward. The trial portals are present in the world; the first trial is not technically locked behind sigil delivery, so present this as the intended narrative route rather than a strict quest gate. Act II clears ten regular enemies and the Mitachurl, unlocking the northern trial. Act III clears fifteen regular enemies and the Storm Drake. Restoring the wind network and Aether’s inner purpose are narrative meaning attached to those existing mechanics.');
}
// 06 — Editable schematic map.
{
 const sl=base(6,true);heading(sl,'One valley.\nSix invitations.',.65,1.02,4.5,1.5,38,C.ink);text(sl,'The world connects quiet villages, open water and ancient places through explorable terrain.',.7,2.9,4.0,1.05,19,C.teal,{valign:'top'});text(sl,'Suggested story route',.7,4.8,4,.28,12,C.teal,{bold:true});text(sl,'Overlook → Mondstadt\nFields trial → Northern ruins',.7,5.3,4.15,.9,21,C.ink,{fontFace:'Cambria'});small(sl,'SCHEMATIC · NOT TO SCALE',.7,6.5,5,C.teal);
 panel(sl,5.3,1.0,7.38,5.78,'E7EEEA');
 shape(sl,S.ellipse,6.35,1.65,4.4,4.55,'D4E3D9');shape(sl,S.ellipse,8.75,3.15,2.0,1.55,'A8CDD3',null,{rotate:-18});shape(sl,S.ellipse,5.8,3.65,3.15,2.5,'D6E2D3');shape(sl,S.ellipse,9.45,1.2,2.6,2.1,'D8E3DF');
 const pts={overlook:[9.48,6.06],village:[8.12,3.87],lake:[10.55,4.30],grove:[6.9,2.34],winery:[6.13,5.25],ruins:[11.14,1.38]};
 line(sl,...pts.overlook,...pts.village,C.teal,1.6,true);line(sl,...pts.village,...pts.ruins,C.teal,1.6,true);
 const entries=[['overlook','Windrise Overlook',8.2,6.36],['village','Mondstadt',6.7,4.2],['lake','Cider Lake',10.67,4.75],['grove','Windrise',5.78,1.8],['winery','Dawn Winery',5.62,5.72],['ruins','Stormterror Ruins',8.0,1.8]];
 entries.forEach(([id,name,tx,ty],i)=>{const [x,y]=pts[id];shape(sl,S.ellipse,x-.13,y-.13,.26,.26,C.teal);shape(sl,S.ellipse,x-.045,y-.045,.09,.09,C.cream);text(sl,name,tx,ty,2.6,.35,13.5,C.ink,{bold:true});});
 text(sl,'N',12.06,1.28,.3,.25,10,C.teal,{align:'center',bold:true});line(sl,12.2,1.62,12.2,2.15,C.teal,1.2);shape(sl,S.triangle,12.12,1.55,.16,.16,C.teal);
 note(sl,'This is a presentation schematic built with editable PowerPoint shapes. It names all six current discoverable landmarks: Windrise Overlook, Mondstadt, Cider Lake, Windrise, Dawn Winery, and Stormterror Ruins. Approximate placement follows the game’s landmark positions, but the decorative terrain outlines are not a navigation map or a scale claim. The actual game has its own map, discovery tracking and waypoint travel.');
}
// 07 — Exploration loop.
{
 const sl=base(7);heading(sl,'Curiosity becomes progress.',.65,.95,12,.8,38);text(sl,'A repeatable loop for a small, open fantasy world.',.7,1.88,11,.4,19,C.muted);
 const boxes=[{x:.7,y:2.82,num:'01',title:'Explore',desc:'Smooth running, turning, jumping, dashing and gliding.',icon:'mage'},{x:3.88,y:2.82,num:'02',title:'Discover',desc:'Find six wind sigils, eight chests and six landmarks.',icon:'slime'},{x:7.06,y:2.82,num:'03',title:'Prepare',desc:'Rest at waypoints. Gain levels, potions and energy.',icon:'shield'},{x:10.24,y:2.82,num:'04',title:'Challenge',desc:'Clear enemy camps and overcome the two trials.',icon:'sentinel'}];
 for(const b of boxes){panel(sl,b.x,b.y,2.39,3.0,C.ink);small(sl,b.num,b.x+.24,b.y+.25,1.5,C.gold);enemyIcon(sl,b.icon,b.x+.56,b.y+1.05,.25,C.aqua);text(sl,b.title,b.x+.24,b.y+1.55,2.0,.4,22,C.cream,{fontFace:'Cambria',bold:true});text(sl,b.desc,b.x+.24,b.y+2.08,1.93,.7,14.3,C.muted,{valign:'top'});if(b.num!=='04')shape(sl,S.chevron,b.x+2.59,b.y+1.35,.25,.35,C.gold);}
 text(sl,'YOUR JOURNEY PERSISTS',.75,6.45,3.6,.25,10.5,C.gold,{charSpacing:1.5,bold:true});text(sl,'Local saves retain exploration, rewards and defeated camps on this device.',4.4,6.35,8.15,.5,16,C.muted);
 note(sl,'All four loop stages are implemented in the current prototype. Exploration includes running, jumping, dashing, gliding and swimming. Movement now uses frame-rate independent acceleration/braking, continuous stride timing, blended bone poses, turn lean, softer landings, a 120ms jump buffer and 100ms coyote time. Discovery includes six sigils, eight valley chests and six landmarks. Preparation includes healing and fast travel at activated waypoints, level progression, potions and burst energy. Challenges include twenty-four roaming enemies across eight camps plus two trials. Local browser storage saves world progression on the current device. It is not account-based cloud saving.');
}
// 08 — Combat.
{
 const sl=base(8);heading(sl,'Read the threat. Choose your answer.',.65,.93,12,.85,35);photo(sl,assets.camp,.7,2.1,5.55,3.7);small(sl,'ACTUAL ENEMY-CAMP BUILD',.73,6.0,5,C.gold);text(sl,'Stronger foes · Bosses enrage at half health',.73,6.42,5.6,.4,14,C.muted);
 const foes=[['slime','Elemental slime','Dodge the landing',C.blue],['guardian','Masked raider','Punish the recovery',C.gold],['shield','Shield warden','Flank or use Pyro',C.aqua],['archer','Ember archer','Sidestep the aim line',C.red],['mage','Abyss weaver','Leave the spell circle',C.purple],['sentinel','Ruin sentinel','Bait the heavy slam',C.gold]];
 foes.forEach(([type,name,hint,col],i)=>{const x=6.72+(i%2)*3.0,y=2.36+Math.floor(i/2)*1.25;enemyIcon(sl,type,x+.25,y+.24,.23,col);text(sl,name,x+.75,y,2.14,.32,16,C.cream,{bold:true});text(sl,hint,x+.75,y+.47,2.12,.48,13.6,C.muted,{valign:'top'});});
 diamond(sl,7.0,6.4,.13,C.red,true);text(sl,'PYRO + HYDRO',7.3,6.25,2.5,.3,12.5,C.gold,{bold:true});text(sl,'Vaporize · ×1.5 damage',9.75,6.22,2.85,.4,16.5,C.cream);
 note(sl,'There are six enemy archetypes with distinct silhouettes and mechanics: elemental slimes leap onto marked ground; masked raiders swing clubs; shield wardens reduce frontal physical damage but can be flanked or broken with Pyro; ember archers show an aim line before firing; abyss weavers mark delayed spell circles; ruin sentinels use slow heavy cones and radial slams. The world contains twenty-four roaming enemies in eight camps. Pyro applied to Hydro causes the implemented 1.5× Vaporize reaction. Enemies now have roughly 37–42% more health, 33–40% more damage, faster pursuit and shorter cooldowns. Existing warning durations and shield counters remain. Bosses have 700 and 1200 HP and enrage at half health, moving faster and recovering their attack cooldown sooner. Attack timing, shield counters, boss warnings and death cleanup are covered by automated tests; a fresh manual difficulty playthrough is not claimed.');
}
// 09 — The short opening film: native timeline and actual rendered frames.
{
 const sl=base(9);heading(sl,'One sacrifice. A missing past.',.65,.93,12,.85,38);
 text(sl,'A 30-second opening film with our traveller, a guardian duel and the cost of saving a village.',.7,1.88,11.9,.5,18,C.muted);
 photo(sl,intro.fight,.7,2.58,5.8,2.53);photo(sl,intro.memory,6.83,2.58,5.8,2.53);
 const scenes=[['00–06','The shrine breaks','A storm threatens the village.'],['06–16','Aether fights','Parry, dash and a sword clash.'],['16–23','The seal takes its price','The valley is saved; his memories fade.'],['23–30','A new beginning','He awakens beside his companion.']];
 scenes.forEach(([time,title,body],i)=>{const x=.73+i*3.13;small(sl,time+' SEC',x,5.45,2.85,C.gold);text(sl,title,x,5.92,2.82,.42,19,C.cream,{fontFace:'Cambria',bold:true});text(sl,body,x,6.42,2.82,.48,13.4,C.muted,{valign:'top'});});
 note(sl,'These frames come from this project’s rendered 30-second film. It is a stylized 2D animated opening with an authored traveller/guardian fight, composited atmosphere and effects, embedded as local H.264/AAC video. The four scenes establish the shrine accident, a duel, the seal taking Aether’s memories, and his awakening with a companion. The narration is the synthetic female Kokoro-82M af_heart voice generated locally, not a human recording. The scene is our original fan-made backstory; it is not the Genshin Impact opening and is not a reproduction of its canonical story. The cinematic is a bounded local production, not the animation fidelity of a commercial studio film.');
}
// 10 — Editable implementation architecture.
{
 const sl=base(10,true);heading(sl,'How we built the valley.',.65,.94,12,.8,38,C.ink);
 text(sl,'Browser graphics and game systems, with a local build and movie pipeline.',.7,1.91,11.9,.48,19,C.teal);
 const tiles=[
  ['01','Browser foundation','HTML5 · CSS · JavaScript','Interface, input, menus and the game loop.'],
  ['02','Rendering & characters','Three.js · WebGL 2 · three-vrm','3D world, lighting, water and a licensed VRM base.'],
  ['03','Game systems','Custom JavaScript','Movement, camera, combat, enemy AI and NPC routines.'],
  ['04','Progress on this device','Browser localStorage','Quests, discoveries, rewards and defeated camps.'],
  ['05','Build & verification','Node.js · npm · esbuild','Bundle the local game; run automated logic tests.'],
  ['06','Opening film & voice','Python · Pillow · NumPy · FFmpeg','Animated frames + local Kokoro narration → H.264/AAC.']
 ];
 tiles.forEach(([n,title,stack,desc],i)=>{const x=.7+(i%3)*4.17,y=2.7+Math.floor(i/3)*1.91;panel(sl,x,y,3.73,1.76,C.soft);small(sl,n,x+.22,y+.19,1.0,C.teal);text(sl,title,x+.22,y+.57,3.29,.31,19,C.ink,{fontFace:'Cambria',bold:true});text(sl,stack,x+.22,y+1.01,3.29,.25,12.2,C.teal,{bold:true});text(sl,desc,x+.22,y+1.28,3.28,.39,11.5,C.ink,{valign:'top'});});
 diamond(sl,.85,6.87,.09,C.teal,true);text(sl,'Local browser GPU for play · CPU-rendered opening and voice · no cloud GPU required',1.12,6.69,11.3,.36,14,C.teal);
 note(sl,'The editable diagram describes the actual implementation. The app uses HTML, CSS and JavaScript, Three.js 0.180.0 with WebGL 2, and @pixiv/three-vrm 3.4.4 for the licensed VRM humanoid base. Custom modules implement movement, camera collision, combat, enemy behavior, NPC gestures/routes, quests and localStorage saves. Node.js/npm and esbuild 0.25.12 produce the local build; Node’s test runner verifies game logic. Python, Pillow and NumPy generate the opening’s animated frames, FFmpeg encodes H.264 video/AAC audio, and Kokoro-82M af_heart generates the synthetic female narration locally on CPU. The playable browser uses the computer’s available graphics processor; no remote AMD/cloud GPU is required. The current build has no account system, multiplayer backend or cloud saves. Native PowerPoint text and shapes remain editable.');
}
// 11 — Demonstration and truthful scope / credits.
{
 const sl=base(11);heading(sl,'The winds are waiting.',.65,.96,12,.85,41);text(sl,'A playable beginning, with a clear next chapter.',.7,1.94,11,.4,20,C.aqua);
 panel(sl,.7,2.8,5.78,2.82,C.ink);panel(sl,6.85,2.8,5.78,2.82,'1A414A');
 small(sl,'PLAYABLE NOW',1.0,3.13,5,C.gold);text(sl,'Explore. Fight. Return.',1.0,3.63,5.1,.6,28,C.cream,{fontFace:'Cambria',bold:true});text(sl,'Six landmarks · nine residents\n24 roaming enemies · two trials\n30-second film · saves · story journal',1.0,4.5,5.0,.85,17,C.muted,{breakLine:false,valign:'top'});
 small(sl,'STORY & ART — NEXT SCOPE',7.15,3.13,5,C.gold);text(sl,'Deepen the journey.',7.15,3.63,5.05,.6,28,C.cream,{fontFace:'Cambria',bold:true});text(sl,'More authored dialogue and memory scenes\nRicher character animation and environment art\nMore varied quests, locations and encounters',7.15,4.5,4.95,.9,15.8,C.muted,{breakLine:false,valign:'top'});
 text(sl,'DEMO ROUTE',.75,6.04,2.0,.26,11,C.gold,{charSpacing:1.6,bold:true});text(sl,'Overlook → Lyra → 3 sigils → Fields trial → Northern ruins',2.65,5.98,9.9,.44,18,C.cream,{fontFace:'Cambria'});
 text(sl,'Unofficial fan-made prototype; original backstory. Genshin references © HoYoverse. VRM base © 2022 pixiv Inc.\nThree.js / three-vrm: MIT. Narration: locally synthesized Kokoro-82M af_heart (female).',.75,6.7,11.0,.45,10,C.muted,{breakLine:false});
 note(sl,'For a live demonstration: watch the short opening film, start at Windrise Overlook, follow the path to Lyra in Mondstadt, accept the sigil objective, gather three sigils and return, enter the Fields trial, then go north to the Stormterror trial after the first victory. The three-sigil quest is the intended story route, not a technical lock on the first trial. The memory premise appears in the original fan-made opening, story journal and contextual dialogue. Branching conversations, playable memory scenes and more advanced cinematics remain future scope. The introduction uses locally synthesized Kokoro female narration, not a human recording. Credits: Genshin Impact, Aether, Paimon and location references are HoYoverse properties; this is unofficial and unaffiliated, with no extracted Genshin game assets. The adapted humanoid base is VRM1_Constraint_Twist_Sample.vrm, © 2022 pixiv Inc., from https://github.com/pixiv/three-vrm/tree/dev/packages/three-vrm/examples/models with embedded VRM license metadata; license https://vrm.dev/licenses/1.0/. Three.js, three-vrm and esbuild use MIT licenses. See ../CREDITS.md and presentation/STORY.md for full provenance and story detail.');
}
pres.writeFile({fileName:path.join(dir,'Aethers_Trial_Windborne.pptx')}).then(()=>{
 fs.writeFileSync(path.join(dir,'build-info.json'),JSON.stringify({slides:11,worldScreenshot:path.relative(project,world),campScreenshot:path.relative(project,camp),townScreenshot:path.relative(project,town),introFrames:Object.fromEntries(Object.entries(intro).map(([name,file])=>[name,path.relative(project,file)])),introSeconds:30,editable:'Native PowerPoint text, shapes, diagrams, map and tech stack; screenshots remain images',generatedAt:new Date().toISOString()},null,2));
 console.log('Wrote Aethers_Trial_Windborne.pptx (11 slides)');
});
