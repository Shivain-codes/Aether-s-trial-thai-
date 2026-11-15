#!/usr/bin/env python3
"""30-second original animated prologue. Locally drawn, no external footage.
Four scenes: shrine disaster, articulated duel, the seal's cost, awakening.
"""
from pathlib import Path
import importlib.util,math,json,subprocess,hashlib,sys
import numpy as np
from PIL import Image,ImageDraw,ImageFont
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('ext',ROOT/'tools/render-intro-extended.py');ext=importlib.util.module_from_spec(spec);spec.loader.exec_module(ext)
ink=ext.ink;P,L,E,C=ink.poly,ink.line,ink.ellipse,ink.curve
ease,clamp=ink.ease,ink.clamp;SS,SIZE=ink.SS,ink.SIZE
OUT=ROOT/'shots/intro-short';OUT.mkdir(parents=True,exist_ok=True)
MOVIE=ROOT/'src3d/assets/windborne-intro.mp4';SILENT=OUT/'opening-silent.mp4';AUDIO=OUT/'audio/intro-mix.wav'
W,H,FPS,DURATION=1280,720,24,30
INK='#122631';GOLD='#f0d28f';CYAN='#b3e8e1'
STARTS=[0,6,16,23];LABELS=['The broken shrine','The guardian’s challenge','The price of the seal','A new beginning']

def arena(t):
 im=ext.BG[3].copy();ext.hills(im,t,True);ink.glow(im,850,290,280,'#c0b27e',.42)
 ink.temple(im,850,575,2.25,broken=True);ink.rune(im,850,348,48,t*.15)
 for x in [130,1175]:
  P(im,[(x-30,620),(x-28,190),(x+12,166),(x+28,202),(x+34,620)],'#233e49')
  for y in range(220,620,43):L(im,[(x-25,y),(x+25,y-3)],'#53686b',1)
 P(im,[(-10,611),(230,589),(470,605),(730,584),(1040,607),(1290,590),(1290,740),(-10,740)],INK)
 for j in range(8):L(im,[(210+j*160,602),(100+j*183,655)],'#39535b',1)
 ext.fog(im,t,489,opacity=.12);ink.embers(im,t,35)
 return im

def traveler(im,x,y,s,t,arm=-.8,lean=0,stride=0,kneel=0):
 """Articulated traveler: one hand grips the moving sword; cape and braid trail."""
 def pt(v):
  a,b=v;return (x+(a+lean*(-b/220))*s,y+(b+kneel)*s)
 def p(v,c=INK):P(im,[pt(z) for z in v],c)
 def l(v,c=INK,w=10):L(im,[pt(z) for z in v],c,w*s)
 def e(a,b,r,c=INK):
  xx,yy=pt((a,b));E(im,(xx-r*s,yy-r*s,xx+r*s,yy+r*s),c)
 # Long cloak, smooth swept hair, and braid silhouette echo the playable traveler.
 sway=math.sin(t*2)*7
 p(ink.bez((-14,-166),(-65,-147),(-104,-96+sway),(-144,-117+sway))+ink.bez((-144,-117+sway),(-105,-70),(-42,-75),(-8,-113)))
 l(ink.bez((-12,-162),(-64,-132),(-93,-115),(-137,-118+sway)),'#9baa93',1)
 for side in [-1,1]:
  foot=(side*(21+abs(stride)*15)-stride*20,-3);knee=(side*14+stride*22,-48)
  l([(side*8,-94),knee,foot],INK,17);l([foot,(foot[0]+13,-3)],INK,12)
  l([(foot[0]-5,-17),(foot[0]+7,-17)],GOLD,1)
 p([(-17,-164),(12,-164),(24,-135),(15,-92),(-18,-92),(-27,-132)])
 l([(-15,-94),(15,-94)],GOLD,3);l([(-14,-157),(0,-145),(15,-157)],GOLD,1.4)
 l([(-8,-167),(-6,-181)],INK,15);e(-3,-196,19)
 p(ink.bez((-22,-193),(-29,-217),(-8,-226),(10,-219))+[(22,-204),(17,-194),(8,-205),(1,-194),(-6,-204),(-14,-191)])
 p([(10,-199),(22,-190),(17,-184),(22,-181),(10,-174),(-4,-178)])
 for j in range(8):e(-24+math.sin(j*1.8+t)*2,-181+j*7,4)
 # Rear hand balances the pose; sword is attached to the front hand, never floating.
 l([(-18,-155),(-38-stride*8,-128),(-49,-115)],INK,11)
 shoulder=(14,-152);elbow=(30+math.cos(arm)*19,-134+math.sin(arm)*18)
 hand=(elbow[0]+math.cos(arm)*28,elbow[1]+math.sin(arm)*28)
 l([shoulder,elbow,hand],INK,12);e(*hand,5)
 tip=(hand[0]+math.cos(arm)*105,hand[1]+math.sin(arm)*105)
 n=(-math.sin(arm),math.cos(arm))
 l([(hand[0]-math.cos(arm)*15,hand[1]-math.sin(arm)*15),hand],GOLD,5)
 l([(hand[0]-n[0]*12,hand[1]-n[1]*12),(hand[0]+n[0]*12,hand[1]+n[1]*12)],GOLD,3)
 p([(hand[0]+n[0]*4,hand[1]+n[1]*4),tip,(hand[0]-n[0]*4,hand[1]-n[1]*4)],'#e1ddbd');l([hand,tip],GOLD,1.5)
 return pt(hand),pt(tip)

def guardian(im,x,y,s,t,reach=0,recoil=0):
 # Broad stone body, articulated forearms, and a massive blade.
 x+=recoil*42;y+=abs(recoil)*7
 ext.sentinel(im,x,y,s,t)
 shoulder=(x-43*s,y-151*s);elbow=(x-(74+reach*22)*s,y-(111+reach*20)*s);hand=(x-(90+reach*34)*s,y-(103+reach*53)*s)
 L(im,[shoulder,elbow,hand],INK,23*s)
 angle=-2.4+reach*.95
 tip=(hand[0]+math.cos(angle)*128*s,hand[1]+math.sin(angle)*128*s)
 L(im,[hand,tip],'#233740',15*s);L(im,[hand,tip],'#b4c1ac',2*s)
 n=(-math.sin(angle),math.cos(angle));L(im,[(hand[0]-n[0]*17*s,hand[1]-n[1]*17*s),(hand[0]+n[0]*17*s,hand[1]+n[1]*17*s)],'#829f9e',5*s)
 return hand,tip

def sparks(im,x,y,t,life=1):
 if life<=0:return
 ink.glow(im,x,y,90,GOLD,.55)
 lay=Image.new('RGBA',SIZE)
 for j in range(22):
  a=j*2.399;r=(12+j%5*13)*(1+(1-life)*3)
  p=(x+math.cos(a)*r,y+math.sin(a)*r*.7)
  L(lay,[p,(p[0]+math.cos(a)*(6+j%3*6),p[1]+math.sin(a)*(6+j%3*6))],ink.rgb(GOLD)+(int(235*life),),1.3)
 im.alpha_composite(lay)

def trail(im,x,y,t,a0,a1,r=240,alpha=.7):
 lay=Image.new('RGBA',SIZE);pts=[(x+math.cos(a)*r,y+math.sin(a)*r*.66) for a in np.linspace(a0,a1,42)]
 L(lay,pts,ink.rgb(CYAN)+(int(alpha*52),),19);L(lay,pts,ink.rgb(GOLD)+(int(alpha*205),),3)
 im.alpha_composite(lay)

def disaster(t):
 im=ext.fracture(t+1.1)
 # Village below anchors the threat; a growing wind current descends toward it.
 ink.village(im,1015,540,.7);ink.glow(im,640,345,185,GOLD,.6)
 if t>1.8:
  q=ease((t-1.8)/3);lay=Image.new('RGBA',SIZE)
  for j in range(4):C(lay,[(640,345+j*9),(730,230),(920,350),(1000+70*q,520)],ink.rgb(CYAN)+(int(100*q),),2+j)
  im.alpha_composite(lay)
 traveler(im,290+t*15,615,1.15,t,-.8,lean=8,stride=math.sin(t*4)*.3)
 return im

def fight(t):
 im=arena(t)
 if t<3.3:
  q=ease((t-.4)/1.5);x=355+q*128;arm=-1.15+q*.42
  guardian(im,805,610,1.65,t,reach=q)
  traveler(im,x,613,1.65,t,arm,lean=14,stride=.55)
  pulse=max(0,1-abs(t-1.7)/.5);sparks(im,638,342,t,pulse)
  if pulse>0:trail(im,539,412,t,-2.0,-.35,175,pulse*.6)
 elif t<6.2:
  q=ease((t-3.3)/1.65);x=483+q*365
  guardian(im,794,610,1.65,t,reach=1-q*.7)
  # Dissolving after-images mark a fast low dash, with continuous travel.
  for j in [3,2,1]:
   ghost=Image.new('RGBA',SIZE);traveler(ghost,x-j*43,616,1.48,t-j*.06,-.2,lean=60,stride=.9,kneel=14)
   ghost.putalpha(ghost.getchannel('A').point(lambda a:int(a*(.13/j))))
   im.alpha_composite(ghost)
  traveler(im,x,616,1.48,t,-.2,lean=60,stride=.9,kneel=14)
  trail(im,660,476,t,math.pi*.08,math.pi*.95,290,.65*math.sin(clamp((t-3.3)/2.9)*math.pi))
 else:
  q=ease((t-6.2)/1.05);arm=-2.5+q*3.4;x=848-q*130
  guardian(im,929,610,1.65,t,reach=.5,recoil=ease((t-7.2)/1.4))
  traveler(im,x,613,1.65,t,arm,lean=18-q*29,stride=.6)
  if t<8.1:trail(im,764,421,t,-2.3,-2.3+q*3.8,235,math.sin(clamp((t-6.2)/1.9)*math.pi))
  sparks(im,898,381,t,max(0,1-abs(t-7.4)/.55))
  if t>8.4:
   ink.glow(im,850,348,220,GOLD,.7);ink.rune(im,850,348,55+ease((t-8.4)/1.6)*35,t*.1)
 return im

def memory(t):
 im=arena(t+16);q=ease(t/2);loss=ease((t-1.5)/4.5)
 # Sword is lowered as the traveler reaches toward the shrine, then falls to a knee.
 traveler(im,497,620,1.65,t,arm=-.85,lean=loss*25,stride=.1,kneel=loss*29)
 ink.glow(im,850,348,240,GOLD,.85);ink.rune(im,850,348,72+q*24,t*.08)
 lay=Image.new('RGBA',SIZE)
 C(lay,[(542,314),(650,245),(723,422),(850,348)],ink.rgb(CYAN)+(int(160*q),),3)
 for j in range(19):
  u=(t*.21+j/19)%1;xx=504+u*346;yy=310+math.sin(u*math.pi+j)*63-u*18
  a=math.sin(u*math.pi)*loss
  r=4+j%3*3;pts=[(xx-r,yy),(xx,yy-r*1.5),(xx+r,yy),(xx,yy+r*1.5),(xx-r,yy)]
  L(lay,pts,ink.rgb(GOLD)+(int(225*a),),1.7)
 im.alpha_composite(lay)
 # Small glimpses dissolve out of the trail: home, loved figures, and an old name.
 for j in range(3):
  alpha=max(0,math.sin(clamp((t-.5-j*.65)/4.5)*math.pi))*.65
  pane=Image.new('RGBA',SIZE);xx=635+j*125;yy=205+math.sin(t*.6+j)*20
  ink.rune(pane,xx,yy,37,t*.06)
  if j==0:ink.village(pane,xx,yy+10,.18)
  elif j==1:
   E(pane,(xx-14,yy-17,xx-4,yy-7),GOLD);E(pane,(xx+4,yy-17,xx+14,yy-7),GOLD);L(pane,[(xx-9,yy-5),(xx-9,yy+13),(xx+9,yy-5),(xx+9,yy+13)],GOLD,3)
  else:L(pane,[(xx-18,yy),(xx+17,yy),(xx-13,yy+8),(xx+12,yy+8)],GOLD,1)
  pane.putalpha(pane.getchannel('A').point(lambda a:int(a*alpha)));im.alpha_composite(pane)
 ink.wind(im,t,470,.18)
 return im

def awakening(t):
 im=ext.awakening(min(t,5)+.4)
 # A softer dawn replaces the shrine; the companion discovers him after the event.
 a=ease((t-3.8)/1.3)
 if a>0:
  im.alpha_composite(Image.new('RGBA',SIZE,(7,22,31,int(a*228))))
  ink.rune(im,640,226,37,math.pi/4,a*.8);ink.text(im,'AETHER’S TRIAL',286,66,GOLD,alpha=a)
  ink.text(im,'W I N D B O R N E',379,22,'#eee0bc',spacing=3,alpha=a)
  ink.text(im,'The wind remembers what he cannot.',445,23,'#c3cbb9',alpha=a)
 return im
SCENES=[disaster,fight,memory,awakening]
def frame(t):
 k=max(i for i,s in enumerate(STARTS) if t>=s);local=t-STARTS[k];span=([6,16,23,30][k]-STARTS[k]);im=SCENES[k](local)
 if k>0 and local<.35:im=Image.blend(SCENES[k-1](STARTS[k]-STARTS[k-1]-.01),im,ease(local/.35))
 zoom=1.01+ease(local/span)*.018;ww,hh=int(SIZE[0]/zoom),int(SIZE[1]/zoom)
 # Tiny, decaying impacts rather than constant camera shake.
 impact=max(0,1-abs(t-7.7)/.25)+max(0,1-abs(t-13.4)/.25)
 cx=SIZE[0]/2+math.sin(t*73)*impact*4*SS;cy=SIZE[1]/2+math.sin(t*59)*impact*2*SS
 im=im.crop((int(cx-ww/2),int(cy-hh/2),int(cx+ww/2),int(cy+hh/2))).resize(SIZE,Image.Resampling.BICUBIC)
 d=ImageDraw.Draw(im);d.rectangle((0,0,SIZE[0],int(28*SS)),fill='#0b1921');d.rectangle((0,int(655*SS),SIZE[0],SIZE[1]),fill='#0b1921')
 fade=min(ease(t/.7),ease((30-t)/.65))
 if fade<1:im=Image.blend(Image.new('RGBA',SIZE,'#0b1921'),im,fade)
 return im.convert('RGB').resize((W,H),Image.Resampling.LANCZOS)
def previews():
 picks=[('shrine',3.8),('fight',7.7),('dash',10.3),('slash',13.1),('memory',19.8),('awakening',25.4),('poster',28.5)]
 sheet=Image.new('RGB',(1280,1440),'#142a35')
 for i,(name,t) in enumerate(picks):
  im=frame(t);im.save(OUT/f'{name}.jpg',quality=94);sheet.paste(im.resize((640,360)),((i%2)*640,(i//2)*360))
 sheet.save(OUT/'contact-sheet.jpg',quality=94)
def render():
 p=subprocess.Popen(['ffmpeg','-y','-hide_banner','-loglevel','error','-f','rawvideo','-pix_fmt','rgb24','-s',f'{W}x{H}','-r',str(FPS),'-i','pipe:0','-an','-c:v','libx264','-preset','fast','-crf','22','-pix_fmt','yuv420p','-movflags','+faststart',str(SILENT)],stdin=subprocess.PIPE)
 for i in range(FPS*DURATION):
  p.stdin.write(frame(i/FPS).tobytes())
  if i%96==0:print(f'Rendered {i}/{FPS*DURATION}',flush=True)
 p.stdin.close();assert p.wait()==0
 print('Silent film ready',flush=True)
def mux():
 subprocess.run(['ffmpeg','-y','-hide_banner','-loglevel','error','-i',str(SILENT),'-i',str(AUDIO),'-map','0:v','-map','1:a','-c:v','copy','-c:a','aac','-b:a','160k','-t',str(DURATION),'-movflags','+faststart',str(MOVIE)],check=True)
 subprocess.run(['ffmpeg','-v','error','-i',str(MOVIE),'-f','null','-'],check=True)
 probe=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_streams','-show_format','-of','json',str(MOVIE)]));v=next(s for s in probe['streams'] if s['codec_type']=='video');a=next(s for s in probe['streams'] if s['codec_type']=='audio')
 report={'file':str(MOVIE),'bytes':MOVIE.stat().st_size,'sha256':hashlib.sha256(MOVIE.read_bytes()).hexdigest(),'duration_seconds':float(probe['format']['duration']),'width':v['width'],'height':v['height'],'fps':v['r_frame_rate'],'frames':v.get('nb_frames'),'video':v['codec_name'],'audio':a['codec_name'],'audio_rate':a['sample_rate'],'local_render':True,'cloud_used':False,'scenes':LABELS,'visual_source':'tools/render-intro-short.py','audio_source':'tools/render-voice-short.py','complete_decode_passed':True}
 (OUT/'verification.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report,indent=2),flush=True)
if __name__=='__main__':
 if '--mux' in sys.argv:mux()
 else:
  previews()
  if '--preview' not in sys.argv:render()
