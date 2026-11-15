#!/usr/bin/env python3
"""Render the original Windborne silhouette opening locally. No downloaded art.
Requires Pillow, numpy, ffmpeg and macOS say (Samantha voice).
"""
from pathlib import Path
import math, json, subprocess, wave
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'shots/intro'; OUT.mkdir(parents=True,exist_ok=True)
MOVIE=ROOT/'src3d/assets/windborne-intro.mp4'
W,H,FPS,DURATION,SS=1280,720,24,20,1.5
SIZE=(int(W*SS),int(H*SS))
INK='#101e26'; GOLD='#e9c987'; PALE='#f4e3b8'
rng=np.random.default_rng(1864)
font_dir=Path('/System/Library/Fonts/Supplemental')
FONT=font_dir/'Baskerville.ttc'; SANS=Path('/System/Library/Fonts/Helvetica.ttc')

def ease(t): return max(0,min(1,t))**2*(3-2*max(0,min(1,t)))
def clamp(t): return max(0,min(1,t))
def rgb(h): return tuple(int(h.lstrip('#')[i:i+2],16) for i in (0,2,4))
def poly(im,pts,fill): ImageDraw.Draw(im).polygon([(int(x*SS),int(y*SS)) for x,y in pts],fill=fill)
def line(im,pts,fill,width=1): ImageDraw.Draw(im).line([(int(x*SS),int(y*SS)) for x,y in pts],fill=fill,width=max(1,int(width*SS)),joint='curve')
def ellipse(im,b,fill,outline=None,width=1): ImageDraw.Draw(im).ellipse(tuple(int(v*SS) for v in b),fill,outline,width=max(1,int(width*SS)))
def bez(a,b,c,d,n=18):
 return [((1-t)**3*a[0]+3*(1-t)**2*t*b[0]+3*(1-t)*t*t*c[0]+t**3*d[0],(1-t)**3*a[1]+3*(1-t)**2*t*b[1]+3*(1-t)*t*t*c[1]+t**3*d[1]) for t in np.linspace(0,1,n)]
def curve(im,pts,fill,width=1):line(im,bez(*pts),fill,width)
def text(im,words,y,size,color=PALE,spacing=0,alpha=1):
 if alpha<=0:return
 layer=Image.new('RGBA',SIZE); d=ImageDraw.Draw(layer); f=ImageFont.truetype(str(FONT),int(size*SS))
 if spacing:
  widths=[d.textlength(c,font=f) for c in words]; x=(SIZE[0]-sum(widths)-spacing*SS*(len(words)-1))/2
  for c,w in zip(words,widths):d.text((x,y*SS),c,font=f,fill=rgb(color)+(int(255*alpha),));x+=w+spacing*SS
 else:
  box=d.textbbox((0,0),words,font=f);d.text(((SIZE[0]-box[2])/2,y*SS),words,font=f,fill=rgb(color)+(int(255*alpha),))
 im.alpha_composite(layer)

def background(top,bottom,seed):
 r=np.random.default_rng(seed); yy=np.linspace(0,1,SIZE[1])[:,None,None]; top=np.array(rgb(top));bot=np.array(rgb(bottom))
 v=np.tile((top[None,None,:]*(1-yy)+bot[None,None,:]*yy),(1,SIZE[0],1))
 noise=r.normal(0,.7,(SIZE[1],SIZE[0],1)); yy2,xx=np.mgrid[0:SIZE[1],0:SIZE[0]];vig=np.clip(((xx/SIZE[0]-.5)**2+(yy2/SIZE[1]-.45)**2)*.28,0,.23)
 v=v*(1-vig[:,:,None])+noise;return Image.fromarray(np.uint8(np.clip(v,0,255))).convert('RGBA')
BG=[background('#7a9b9c','#e4d3a7',11),background('#263e4a','#a38860',12),background('#8eaca7','#dfc99a',13),background('#263b46','#566d6c',14)]

def glow(im,x,y,r,color=GOLD,opacity=.4):
 # Cached soft bloom, translated without per-frame filtering.
 key=(r,color,opacity)
 if key not in glows:
  side=max(4,int(r*2*SS)); yy,xx=np.mgrid[:side,:side];rad=np.hypot(xx-side/2,yy-side/2)/(side/2);a=(np.clip(1-rad,0,1)**2*255*opacity).astype('uint8');arr=np.zeros((side,side,4),dtype='uint8');arr[:,:,:3]=rgb(color);arr[:,:,3]=a;glows[key]=Image.fromarray(arr)
 g=glows[key];im.alpha_composite(g,(int((x-r)*SS),int((y-r)*SS)))
glows={}

def ridge(im,t,base,amp,col,depth,seed):
 pts=[(-100,760)];r=np.random.default_rng(seed)
 for x in np.linspace(-100,1380,42):
  y=base-amp*(.45+.28*math.sin(x*.009+seed)+.22*math.sin(x*.018+2))+r.uniform(-amp*.12,amp*.12)
  pts.append((x+math.sin(t*.08)*depth,y))
 pts.append((1380,760));poly(im,pts,col)

def trees(im,x,y,s=1,wind=0,color=INK):
 line(im,[(x,y),(x+s*2,y-s*44),(x-s*4,y-s*94)],color,5*s)
 for j,(dx,dy) in enumerate([(-19,-63),(18,-75),(-11,-95),(8,-110)]):
  line(im,[(x,y-40*s),(x+dx*s,y+dy*s)],color,3*s)
  pts=[]
  for k in range(11):
   a=k/11*math.tau;r=(15+(k%3)*3)*s
   pts.append((x+dx*s+math.cos(a)*r+wind,y+dy*s+math.sin(a)*r*.6))
  poly(im,pts,color)

def temple(im,x,y,s=1,broken=False):
 for side in [-1,1]:
  xx=x+side*60*s
  poly(im,[(xx-14*s,y),(xx-11*s,y-145*s),(xx+10*s,y-145*s),(xx+14*s,y)],INK)
  poly(im,[(xx-22*s,y-137*s),(xx-18*s,y-151*s),(xx+18*s,y-151*s),(xx+22*s,y-137*s)],INK)
  line(im,[(xx-3*s,y-125*s),(xx-3*s,y-17*s)],'#5a6460',2*s)
 if not broken:
  poly(im,[(x-85*s,y-158*s),(x-76*s,y-172*s),(x+77*s,y-172*s),(x+87*s,y-158*s)],INK)
 else:
  poly(im,[(x-85*s,y-158*s),(x-76*s,y-172*s),(x-18*s,y-172*s),(x-28*s,y-157*s)],INK)
  poly(im,[(x+15*s,y-165*s),(x+75*s,y-175*s),(x+87*s,y-159*s),(x+29*s,y-154*s)],INK)
 for k in range(3):poly(im,[(x-(80+k*13)*s,y+k*6*s),(x+(80+k*13)*s,y+k*6*s),(x+(80+k*13)*s,y+(k+1)*6*s),(x-(80+k*13)*s,y+(k+1)*6*s)],INK)

def village(im,x,y,s=1):
 for i in range(8):
  xx=x+(i-4)*31*s;hh=(25+i%3*7)*s;w=25*s
  poly(im,[(xx,y),(xx,y-hh),(xx+w,y-hh),(xx+w,y)],'#425e61')
  poly(im,[(xx-5*s,y-hh),(xx+w*.5,y-hh-18*s),(xx+w+5*s,y-hh)],'#263e47')
  poly(im,[(xx+10*s,y-hh+9*s),(xx+16*s,y-hh+9*s),(xx+16*s,y-hh+17*s),(xx+10*s,y-hh+17*s)],'#d9c68c')
 # Twin distant spires echo the playable town.
 for dx in [-22,22]:
  xx=x+dx*s;poly(im,[(xx-5*s,y-25*s),(xx-5*s,y-95*s),(xx+5*s,y-95*s),(xx+5*s,y-25*s)],'#3d5559');poly(im,[(xx-9*s,y-92*s),(xx,y-123*s),(xx+9*s,y-92*s)],'#2b414a')

def rune(im,x,y,r,rot=0,alpha=1):
 lay=Image.new('RGBA',SIZE); col=rgb(GOLD)+(int(255*alpha),)
 pts=[(x+math.sin(rot+i*math.pi/2)*r,y+math.cos(rot+i*math.pi/2)*r) for i in range(5)]
 line(lay,pts,col,2.2);line(lay,[(x-r*.28,y),(x,y-r*.3),(x+r*.28,y),(x,y+r*.3),(x-r*.28,y)],col,1.3)
 im.alpha_composite(lay)

def hero(im,x,y,s=1,t=0,draw=0):
 # Hand-authored articulated ink silhouette, with hair locks, braid and long wind-driven cloth.
 def P(pts,c=INK):poly(im,[(x+a*s,y+b*s) for a,b in pts],c)
 def L(pts,c=GOLD,w=1.3):line(im,[(x+a*s,y+b*s) for a,b in pts],c,w*s)
 def E(b,c=INK):ellipse(im,tuple((x+v*s) if i%2==0 else (y+v*s) for i,v in enumerate(b)),c)
 sway=math.sin(t*2)*5
 cape=bez((-12,-178),(-55,-144),(-99,-104+sway),(-167,-110+sway))+bez((-167,-110+sway),(-114,-76+sway),(-53,-74),(-4,-117))
 P(cape);L(bez((-18,-172),(-70,-133),(-112,-118+sway),(-157,-112+sway)),'#7d8d80',1)
 P([(-8,-179),(8,-179),(9,-157),(-11,-156)])
 P([(-17,-160),(9,-163),(23,-134),(16,-91),(-18,-89),(-28,-130)])
 P([(-19,-96),(1,-95),(2,-57),(-12,-9),(-13,-2),(-33,-2),(-25,-13),(-21,-62)])
 P([(0,-95),(18,-93),(23,-55),(31,-12),(37,-3),(17,-3),(9,-13),(4,-53),(-8,-69)])
 # Head profile and swept hair spikes.
 E((-19,-210,16,-174));P([(5,-201),(18,-195),(17,-189),(24,-186),(16,-182),(12,-174),(-4,-172),(-13,-180)])
 P([(-21,-191),(-27,-205),(-17,-203),(-18,-217),(-8,-210),(2,-220),(5,-209),(17,-211),(13,-198),(5,-199),(-4,-188),(-6,-198),(-14,-185)])
 for j in range(8):E((-22+math.sin(j*1.8)*3,-180+j*7,-14+math.sin(j*1.8)*3,-169+j*7))
 P([(-19,-123),(-25,-110),(-21,-100),(-14,-112)])
 # Resting forward arm transitions into a clearly drawn sword.
 a=draw
 P([(11,-158),(23,-147),(29+35*a,-120-20*a),(17+35*a,-112-20*a),(10,-137)])
 P([(22+35*a,-120-20*a),(36+50*a,-128-32*a),(43+51*a,-120-32*a),(26+36*a,-107-20*a)])
 hx,hy=39+50*a,-122-32*a
 E((hx-4,hy-5,hx+5,hy+4));L([(hx-5,hy-9),(hx+9,hy+9)],'#b9ad86',3)
 # Sword catches one thin line of light.
 theta=-.9+.5*a;end=(hx+math.cos(theta)*93,hy+math.sin(theta)*93)
 P([(hx+2,hy-3),(end[0],end[1]),(hx-1,hy+3)],'#aeb7a0');L([(hx,hy),(end[0],end[1])],GOLD,1.5)
 L([(-15,-91),(13,-91)],'#aa9665',3);L([(-10,-162),(3,-151),(14,-158)],'#b3a179',1.4)
 L([(16,-19),(28,-18)],'#879383',1);L([(-28,-17),(-15,-17)],'#879383',1)

def companion(im,x,y,s=1,t=0):
 y+=math.sin(t*2.3)*5
 glow(im,x,y,44*s,'#d8ddc1',.25)
 ellipse(im,(x-12*s,y-26*s,x+12*s,y-1*s),INK)
 poly(im,[(x-7*s,y-2*s),(x-17*s,y+22*s),(x+17*s,y+22*s),(x+7*s,y-2*s)],INK)
 poly(im,[(x-11*s,y+4*s),(x-31*s,y+14*s),(x-16*s,y+29*s),(x+17*s,y+29*s),(x+31*s,y+14*s),(x+11*s,y+4*s)],INK)
 line(im,[(x-7*s,y+20*s),(x-5*s,y+35*s)],INK,5*s);line(im,[(x+7*s,y+20*s),(x+5*s,y+35*s)],INK,5*s)
 ellipse(im,(x-17*s,y-38*s,x+17*s,y-29*s),None,GOLD,1.3)
 rune(im,x+12*s,y-18*s,4*s,t*.25)

def brute(im,x,y,s=1):
 def P(p):poly(im,[(x+a*s,y+b*s) for a,b in p],INK)
 P([(-42,0),(-36,-57),(-59,-98),(-48,-132),(-22,-145),(24,-145),(48,-124),(59,-91),(35,-58),(38,0),(15,0),(8,-55),(-8,-55),(-18,0)])
 ellipse(im,(x-23*s,y-167*s,x+23*s,y-120*s),INK)
 P([(-20,-155),(-41,-181),(-26,-179),(-8,-158)]);P([(19,-155),(38,-178),(25,-178),(8,-158)])
 line(im,[(x+48*s,y-107*s),(x+66*s,y-48*s)],INK,17*s)
 line(im,[(x+66*s,y-65*s),(x+111*s,y-165*s)],INK,10*s)
 poly(im,[(x+87*s,y-151*s),(x+108*s,y-176*s),(x+135*s,y-159*s),(x+117*s,y-133*s)],INK)
 line(im,[(x-11*s,y-143*s),(x-3*s,y-140*s)],GOLD,1.5);line(im,[(x+3*s,y-140*s),(x+11*s,y-143*s)],GOLD,1.5)

def dragon(im,x,y,s=1,t=0):
 flap=math.sin(t*1.4)*7
 p=[(-14,5),(-43,-21),(-85,-28+flap),(-140,-69+flap),(-119,-18+flap),(-97,-2+flap),(-76,-14+flap),(-54,7),(-26,18),(-11,38),(4,33),(11,16),(44,1),(70,-20+flap),(92,-11+flap),(115,-22+flap),(141,-66+flap),(89,-32+flap),(44,-29), (15,-9),(16,-27),(30,-38),(20,-41),(11,-32),(6,-46),(-3,-35),(-9,-9)]
 poly(im,[(x+a*s,y+b*s) for a,b in p],INK)
 curve(im,[(x-7*s,y+25*s),(x-40*s,y+70*s),(x+55*s,y+67*s),(x+68*s,y+45*s)],INK,8*s)

def embers(im,t,amount=45,warm=True):
 layer=Image.new('RGBA',SIZE)
 for j in range(amount):
  x=(j*317.13+t*(6+(j%5)*2))%1350-35;y=650-((j*97.2+t*(10+j%7))%590)
  a=(.2+.5*math.sin(j*1.7+t)**2);col=rgb(GOLD if warm else '#e4e6cf')+(int(a*120),)
  r=.8+(j%3)*.45;ellipse(layer,(x-r,y-r*.4,x+r,y+r*.4),col)
 im.alpha_composite(layer)

def wind(im,t,y=280,alpha=.18):
 lay=Image.new('RGBA',SIZE)
 for j in range(4):
  yy=y+j*18+math.sin(t*.7+j)*7
  curve(lay,[(-60,yy+30),(350,yy-40),(790,yy+90),(1340,yy-60)],rgb(PALE)+(int(255*alpha*(1-j*.15)),),1+j*.2)
 im.alpha_composite(lay)

def scene_a(t):
 im=BG[0].copy();glow(im,800,206,245,'#fff0ba',.75);ellipse(im,(758,168,842,252),'#eddbab')
 ridge(im,t,360,120,'#90aaa4',12,13);ridge(im,t,415,98,'#6e8d8b',18,6);ridge(im,t,475,95,'#4d7477',25,8)
 # Inlaid river and the small lives below the shrine.
 poly(im,[(770,395),(690,437),(848,464),(637,515),(1100,571),(1280,520),(906,470),(795,438)],'#a4b9a6')
 village(im,775,428,.70)
 temple(im,306+t*1.1,523,1.08);rune(im,306+t*1.1,428,29,t*.11);glow(im,306+t*1.1,428,78,GOLD,.35)
 poly(im,[(-50,520),(104,494),(235,512),(391,527),(548,610),(670,720),(-50,720)],INK)
 for x,y,s in [(40,533,1.3),(123,524,.8),(1100,592,1.15),(1214,604,1.6)]:trees(im,x,y,s,math.sin(t)*2)
 poly(im,[(835,660),(967,605),(1095,590),(1280,615),(1340,720),(835,720)],INK)
 wind(im,t,278,.18);embers(im,t,32,False)
 return im

def scene_b(t):
 im=BG[1].copy();ridge(im,t,475,150,'#344d55',12,17);ridge(im,t,550,82,'#233b44',20,8)
 glow(im,640,298,230,'#d8c18a',.45);temple(im,640,548,2.10,broken=t>2.0)
 split=ease((t-1.3)/2.3)
 for j in range(7):
  a=j/7*math.tau+t*.1;rr=54+split*(92+(j%3)*29);x=640+math.sin(a)*rr;y=343+math.cos(a)*rr*.70
  rune(im,x,y,9+(j%2)*4,a,1-split*.25);glow(im,x,y,24,GOLD,.25)
 if t<2.1:rune(im,640,343,47,t*.18)
 else:
  for j in range(12):
   a=j/12*math.tau;rr=split*240;line(im,[(640+math.cos(a)*rr*.75,343+math.sin(a)*rr*.7),(640+math.cos(a)*rr,343+math.sin(a)*rr*.9)],'#c7af7a',1.2)
 poly(im,[(-30,590),(160,572),(303,590),(475,580),(671,595),(850,572),(1056,600),(1310,578),(1310,740),(-30,740)],INK)
 brute(im,226,610,1.1);dragon(im,1040,265,.9,t)
 wind(im,t,165,.10);embers(im,t+6,66)
 # Golden light dies to blue-black as the protective circuit breaks.
 if split>0:im.alpha_composite(Image.new('RGBA',SIZE,(5,13,23,int(split*28))))
 return im

def scene_c(t):
 im=BG[2].copy();glow(im,935,215,220,'#fff0bd',.65)
 ridge(im,t,385,146,'#91aaa5',8,6);ridge(im,t,470,136,'#64888a',16,10);ridge(im,t,546,86,'#345c65',22,14)
 village(im,880,495,.55);poly(im,[(824,514),(733,555),(1020,600),(1280,576),(1120,541),(967,546)],'#adc0ac')
 poly(im,[(-50,532),(174,491),(370,511),(510,559),(546,576),(438,607),(408,660),(343,690),(335,740),(-50,740)],INK)
 # Strata in the sheer foreground edge.
 for j in range(5):line(im,[(130+j*17,567+j*21),(304+j*9,580+j*21),(440-j*23,591+j*19)],'#253c43',2)
 hero(im,352+t*1.4,540,1.70,t);companion(im,519+t,292,1.25,t)
 trees(im,18,544,1.05,math.sin(t)*2)
 for j in range(5):
  xx=880+j*36-t*7;yy=190+math.sin(t+j)*8+j*7
  line(im,[(xx-6,yy),(xx,yy+3),(xx+7,yy-1)],'#3b5b63',1.5)
 wind(im,t,368,.22);embers(im,t+10,35,False)
 return im

def scene_d(t):
 im=BG[3].copy();glow(im,740,285,220,'#c1bd91',.35)
 ridge(im,t,470,160,'#3e5e67',10,17);ridge(im,t,563,112,'#2b4752',18,10)
 dragon(im,1000,260,1.2,t);brute(im,909,562,.8)
 poly(im,[(-30,608),(213,591),(402,609),(607,595),(794,625),(1000,607),(1300,635),(1300,740),(-30,740)],INK)
 draw=ease(t/1.6);hero(im,382,610,1.75,t,draw);companion(im,225,351,1,t)
 # A single controlled blade sweep crosses the frame.
 if .6<t<2.1:
  p=(t-.6)/1.5;lay=Image.new('RGBA',SIZE)
  curve(lay,[(410,380),(670,164),(1030,318),(1370,239)],rgb(GOLD)+(int(math.sin(p*math.pi)*220),),4)
  im.alpha_composite(lay)
 embers(im,t+15,55)
 a=ease((t-1.5)/1.25)
 if a>0:
  im.alpha_composite(Image.new('RGBA',SIZE,(7,20,29,int(a*225))))
  rune(im,640,245,40,math.pi/4,a*.8)
  line(im,[(640,185),(640,202)],rgb(GOLD)+(int(a*180),),1)
  text(im,'AETHER’S TRIAL',295,64,GOLD,alpha=a)
  text(im,'W I N D B O R N E',383,23,PALE,spacing=3,alpha=a)
  text(im,'The wind remembers.',446,23,'#acbbb5',alpha=a)
 return im

SCENES=[scene_a,scene_b,scene_c,scene_d]
def frame(t):
 k=min(3,int(t/5));local=t-k*5;im=SCENES[k](local)
 if k>0 and local<.5:
  prev=SCENES[k-1](5+local);im=Image.blend(prev,im,ease(local/.5))
 # Cinematic vignette/letterbox leaves subtitle space separate from the artwork.
 ImageDraw.Draw(im).rectangle((0,0,SIZE[0],int(30*SS)),fill='#0b1921')
 ImageDraw.Draw(im).rectangle((0,int(655*SS),SIZE[0],SIZE[1]),fill='#0b1921')
 fade=min(ease(t/.55),ease((20-t)/.65))
 if fade<1:im=Image.blend(Image.new('RGBA',SIZE,'#0b1921'),im,fade)
 return im.convert('RGB').resize((W,H),Image.Resampling.LANCZOS)

CUES=[(.7,4.6,'Once, the wind carried peace through this valley.'),(5.1,9.4,'Then the shrines fell silent. Their guardians forgot us.'),(10.1,14.5,'You wake without memories, but you are not alone.'),(15.2,19.3,'Gather the scattered winds. Choose who you will protect.')]

def audio():
 for i,(_,_,s) in enumerate(CUES):
  f=OUT/f'narration-{i+1}.aiff'
  subprocess.run(['say','-v','Samantha','-r','147','-o',str(f),s],check=True)
 rate=48000;t=np.arange(int(rate*DURATION))/rate;mix=np.zeros_like(t)
 # Quiet original D-minor suspended pad with airy octave movement; no sampled music.
 for j,f in enumerate([146.832,220.,293.665,349.228,440.]):
  env=np.sin(np.pi*np.clip(t/20,0,1))**.7
  mix+=np.sin(2*np.pi*f*t+np.sin(t*.23+j)*.12)*env*(.013 if j<3 else .006)
 noise=np.random.default_rng(171).normal(0,.0018,len(t));mix+=noise
 for start in [5,10,15]:
  v=np.maximum(t-start,0);mix+=np.sin(2*np.pi*(53*v-8*(1-np.exp(-v))))*np.exp(-v*3)*(t>=start)*.075
 mix=np.clip(mix,-.8,.8);stereo=np.stack([mix,mix*.96],axis=1)
 with wave.open(str(OUT/'score.wav'),'wb') as w:w.setnchannels(2);w.setsampwidth(2);w.setframerate(rate);w.writeframes((stereo*32767).astype('<i2').tobytes())
 cmd=['ffmpeg','-y','-hide_banner','-loglevel','error','-i',str(OUT/'score.wav')]
 for i in range(4):cmd+=['-i',str(OUT/f'narration-{i+1}.aiff')]
 filt=[]
 for i,(start,end,_) in enumerate(CUES):filt.append(f'[{i+1}:a]aresample=48000,volume=1.4,atrim=duration={end-start},afade=t=out:st={end-start-.10}:d=0.10,adelay={int(start*1000)}|{int(start*1000)}[v{i}]')
 filt.append('[0:a][v0][v1][v2][v3]amix=inputs=5:duration=first:normalize=0,alimiter=limit=0.9[a]')
 cmd+=['-filter_complex',';'.join(filt),'-map','[a]','-c:a','pcm_s16le',str(OUT/'intro-mix.wav')];subprocess.run(cmd,check=True)

if __name__=='__main__':
 import sys
 for t in [2.5,7.8,12.5,15.8,18.3]:frame(t).save(OUT/f'frame-{t:04.1f}.jpg',quality=93)
 (OUT/'timing.json').write_text(json.dumps({'duration':20,'fps':24,'width':1280,'height':720,'captions':[{'start':a,'end':b,'text':s}for a,b,s in CUES],'voice':'macOS Samantha (synthetic)','music':'original locally synthesized score'},indent=2)+'\n')
 if '--preview' in sys.argv:sys.exit(0)
 audio()
 temp=OUT/'intro-silent.mp4';cmd=['ffmpeg','-y','-hide_banner','-loglevel','error','-f','rawvideo','-pix_fmt','rgb24','-s','1280x720','-r','24','-i','pipe:0','-an','-c:v','libx264','-preset','fast','-crf','23','-pix_fmt','yuv420p','-movflags','+faststart',str(temp)]
 p=subprocess.Popen(cmd,stdin=subprocess.PIPE)
 for i in range(FPS*DURATION):
  p.stdin.write(frame(i/FPS).tobytes())
  if i%48==0:print(f'Rendered {i}/{FPS*DURATION}',flush=True)
 p.stdin.close();assert p.wait()==0
 subprocess.run(['ffmpeg','-y','-hide_banner','-loglevel','error','-i',str(temp),'-i',str(OUT/'intro-mix.wav'),'-map','0:v','-map','1:a','-c:v','copy','-c:a','aac','-b:a','128k','-t','20','-movflags','+faststart',str(MOVIE)],check=True)
 print(f'Created {MOVIE}: {MOVIE.stat().st_size} bytes',flush=True)
