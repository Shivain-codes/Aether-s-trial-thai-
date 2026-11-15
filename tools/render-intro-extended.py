#!/usr/bin/env python3
"""Eight-scene, locally illustrated Windborne prologue. No downloaded artwork.
Use --preview for contact sheet, --silent to render the visual edit, --mux to
combine with tools/render-voice.py's locally synthesized 64-second audio.
"""
from pathlib import Path
import importlib.util,math,json,subprocess,hashlib,sys
import numpy as np
from PIL import Image,ImageDraw,ImageFont
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('ink',ROOT/'tools/render-intro.py');ink=importlib.util.module_from_spec(spec);spec.loader.exec_module(ink)
OUT=ROOT/'shots/intro-v2/visual';OUT.mkdir(parents=True,exist_ok=True)
MOVIE=ROOT/'src3d/assets/windborne-intro.mp4';SILENT=OUT/'opening-silent.mp4';AUDIO=ROOT/'shots/intro-v2/audio/intro-mix.wav'
W,H,FPS,DURATION=1280,720,24,64
SS,SIZE=ink.SS,ink.SIZE
P,L,E,C=ink.poly,ink.line,ink.ellipse,ink.curve
ease=ink.ease;clamp=ink.clamp
INK='#10232b';GOLD='#e6c58a';BONE='#e9dfb8'
BG=[ink.background('#668b94','#d4cfaa',201),ink.background('#83adb2','#e8d8a9',202),ink.background('#293e51','#b8a789',203),ink.background('#1e3545','#829696',204),ink.background('#91aaa1','#e0c49b',205),ink.background('#678b94','#d9c29b',206),ink.background('#7da7ad','#d7cba3',207),ink.background('#476b7a','#b8bca3',208)]

def fog(im,t,y=365,col='#bac9be',opacity=.12):
 lay=Image.new('RGBA',SIZE);rgba=ink.rgb(col)+(int(opacity*255),)
 for j in range(3):
  yy=y+j*32+math.sin(t*.3+j)*8
  P(lay,[(-50,yy),(240,yy-17),(590,yy+12),(850,yy-18),(1330,yy+8),(1330,yy+26),(-50,yy+38)],rgba)
 im.alpha_composite(lay)

def hills(im,t,dark=False):
 cols=['#607f88','#415f6d','#294c5b'] if dark else ['#9fb7af','#75979a','#4e7981']
 ink.ridge(im,t,345,140,cols[0],13,13);ink.ridge(im,t,425,124,cols[1],22,6);ink.ridge(im,t,515,100,cols[2],36,14)
 fog(im,t,340,opacity=.09)

def grass(im,t,x0,x1,y,col=INK,count=120,seed=1):
 r=np.random.default_rng(seed)
 for j in range(count):
  x=r.uniform(x0,x1);h=r.uniform(8,37);bend=math.sin(t*1.2+x*.02)*4
  C(im,[(x,y+r.uniform(-5,6)),(x-2,y-h*.45),(x+bend-6,y-h*.8),(x+bend-12,y-h)],col,.8+(j%3)*.4)

def flowers(im,t,x0,x1,y,seed=3):
 r=np.random.default_rng(seed)
 for j in range(28):
  x=r.uniform(x0,x1);yy=y+r.uniform(-12,12);h=r.uniform(15,33);s=math.sin(t+x)*2
  L(im,[(x,yy),(x+s,yy-h)],'#537b70',1.4)
  for a in np.arange(0,math.tau,math.tau/5):
   E(im,(x+s+math.cos(a)*3.3-2.5,yy-h+math.sin(a)*3.3-1.5,x+s+math.cos(a)*3.3+2.5,yy-h+math.sin(a)*3.3+1.5),BONE)
  E(im,(x+s-1.5,yy-h-1.5,x+s+1.5,yy-h+1.5),GOLD)

def birds(im,t,x=820,y=175,n=5):
 for j in range(n):
  xx=x+j*31-t*4;yy=y+math.sin(t*.4+j)*7+j*4;wing=3+math.sin(t*2+j)*2
  C(im,[(xx-7,yy-wing),(xx-3,yy-wing-2),(xx-1,yy),(xx,yy)],'#34545b',1.2)
  C(im,[(xx,yy),(xx+2,yy-wing),(xx+5,yy-wing-1),(xx+8,yy-wing)],'#34545b',1.2)

def stream(im,t):
 P(im,[(780,395),(691,434),(825,460),(606,506),(733,553),(541,622),(930,720),(1280,720),(933,603),(1069,557),(852,497),(963,452),(795,430)],'#a9c5b9')
 for j in range(24):
  yy=475+j*6;xx=756+math.sin(j*1.7)*55+math.sin(t*.7+j)*6
  L(im,[(xx,yy),(xx+10+j*1.7,yy)],'#d4d8ba',.7)

def pine(im,x,y,s=1,t=0,col=INK):
 L(im,[(x,y),(x-2*s,y-150*s)],col,4*s)
 for j in range(5):
  yy=y-142*s+j*24*s;w=(18+j*11)*s;sw=math.sin(t*.6)*s
  P(im,[(x+sw,yy-25*s),(x-w,yy+22*s),(x-w*.48,yy+19*s),(x-w*.72,yy+31*s),(x+w*.8,yy+28*s),(x+w*.47,yy+17*s),(x+w,yy+22*s)],col)

def windmill(im,x,y,s=1,t=0):
 P(im,[(x-18*s,y),(x-11*s,y-83*s),(x+11*s,y-83*s),(x+18*s,y)],'#36545b')
 P(im,[(x-18*s,y-78*s),(x,y-108*s),(x+18*s,y-78*s)],INK)
 for j in range(4):
  a=t*.15+j*math.pi/2;dx,dy=math.cos(a),math.sin(a);nx,ny=-dy,dx
  pts=[(x+dx*u*s+nx*v*s,y-81*s+dy*u*s+ny*v*s) for u,v in [(8,0),(48,0),(48,10),(20,10)]]
  P(im,pts,'#d8c7a1');L(im,[(x,y-81*s),(x+dx*50*s,y-81*s+dy*50*s)],'#354b51',2*s)

def torso(im,x,y,s=1,t=0,headtilt=0,walk=0):
 """Traveler silhouette with soft swept locks, braid, split cloak and articulated walk."""
 def p(pts,c=INK):P(im,[(x+a*s,y+b*s) for a,b in pts],c)
 def l(pts,c=GOLD,w=1.1):L(im,[(x+a*s,y+b*s) for a,b in pts],c,w*s)
 def e(b,c=INK):E(im,[(x+v*s) if i%2==0 else (y+v*s) for i,v in enumerate(b)],c)
 bob=abs(math.sin(t*3))*walk*1.5;y+=bob*s
 sway=math.sin(t*1.35)*5
 p(ink.bez((-11,-170),(-47,-145),(-75,-122),(-108,-108+sway))+ink.bez((-108,-108+sway),(-63,-82),(-39,-65),(-6,-92)))
 l(ink.bez((-12,-161),(-54,-135),(-59,-113),(-97,-109+sway)),'#788c7f',1)
 p([(-12,-164),(13,-162),(22,-134),(14,-92),(-17,-91),(-23,-132)])
 p([(-8,-181),(9,-180),(10,-160),(-9,-159)])
 # rounded hair envelope and deliberate curved locks, instead of a star-shaped head
 e((-20,-214,17,-176));p([(8,-201),(20,-193),(17,-187),(23,-184),(16,-180),(11,-174),(-6,-176),(-14,-186)])
 p(ink.bez((-22,-191),(-35,-215),(-13,-228),(7,-220))+ink.bez((7,-220),(26,-217),(19,-200),(23,-193))+[(12,-195),(8,-205),(1,-193),(-4,-202),(-12,-192),(-16,-202)])
 for j in range(8):e((-24+math.sin(j*1.8)*2,-185+j*7,-16+math.sin(j*1.8)*2,-173+j*7))
 p([(-23,-127),(-27,-116),(-21,-103),(-17,-111)])
 # slim trousers and boots with walking joints
 for side in [-1,1]:
  swing=math.sin(t*3+side*math.pi/2)*walk
  hip=(side*8,-94);knee=(side*12+swing*15,-50);foot=(side*18-swing*22,-2)
  l([hip,knee,foot],INK,17);p([(foot[0]-8,-13),(foot[0]+7,-13),(foot[0]+14,-1),(foot[0]-10,-1)])
  l([(foot[0]-7,-16),(foot[0]+5,-15)],'#ab9e75',1.5)
 l([(-17,-94),(15,-94)],'#b9a16d',3)
 arm=math.sin(t*3)*walk*10;p([(13,-156),(24,-143),(29+arm,-111),(20+arm,-105),(12,-132)])
 l([(-9,-162),(3,-151),(14,-157)],'#c2ad7d',1.5)
 # a sheathed sword aligned with the body, low-key rim highlight
 l([(-15,-158),(-41,-91)],'#1a3038',7);l([(-14,-161),(-43,-90)],'#9cae9a',1.1);l([(-23,-145),(-8,-141)],'#bca577',2)

def resting(im,x,y,s=1,t=0):
 rise=ease((t-3)/3)*12
 P(im,[(x-105*s,y),(x-80*s,y-12*s),(x-14*s,y-27*s),(x+37*s,y-19*s),(x+84*s,y-4*s),(x+68*s,y+3*s)],INK)
 # bent knees / resting boot
 P(im,[(x-42*s,y-15*s),(x-15*s,y-43*s),(x+18*s,y-19*s),(x+54*s,y-9*s),(x+71*s,y-9*s),(x+76*s,y),(x+43*s,y+4*s),(x+3*s,y-5*s),(x-22*s,y-19*s)],INK)
 P(im,[(x-55*s,y-18*s),(x-74*s,y-53*s-rise*s),(x-47*s,y-63*s-rise*s),(x-23*s,y-27*s),(x-22*s,y-12*s)],INK)
 E(im,(x-85*s,y-94*s-rise*s,x-48*s,y-54*s-rise*s),INK)
 P(im,[(x-86*s,y-78*s-rise*s),(x-91*s,y-93*s-rise*s),(x-77*s,y-105*s-rise*s),(x-54*s,y-103*s-rise*s),(x-44*s,y-84*s-rise*s),(x-53*s,y-87*s-rise*s),(x-60*s,y-75*s-rise*s),(x-66*s,y-89*s-rise*s)],INK)
 C(im,[(x-66*s,y-55*s),(x-114*s,y-20*s),(x-141*s,y-3*s),(x-180*s,y+2*s)],INK,26*s)
 L(im,[(x-53*s,y-49*s-rise*s),(x-31*s,y-32*s),(x-8*s,y-31*s)],'#172e35',10*s)
 L(im,[(x-57*s,y-47*s-rise*s),(x-38*s,y-44*s-rise*s)],GOLD,1.5*s)

def lyra(im,x,y,s=1,t=0):
 E(im,(x-18*s,y-214*s,x+18*s,y-175*s),INK)
 P(im,[(x-22*s,y-201*s),(x-16*s,y-219*s),(x+10*s,y-223*s),(x+24*s,y-204*s),(x+28*s,y-163*s),(x+12*s,y-174*s),(x-20*s,y-166*s)],INK)
 P(im,[(x-16*s,y-174*s),(x+15*s,y-174*s),(x+29*s,y-123*s),(x+13*s,y-104*s),(x+58*s,y-2*s),(x+19*s,y+4*s),(x-54*s,y),(x-23*s,y-107*s),(x-28*s,y-139*s)],INK)
 for side in [-1,1]:
  L(im,[(x+side*19*s,y-156*s),(x+side*39*s,y-123*s),(x+side*65*s,y-145*s)],INK,12*s)
  E(im,(x+side*65*s-5*s,y-149*s,x+side*65*s+5*s,y-139*s),INK)
 L(im,[(x-10*s,y-166*s),(x,y-154*s),(x+12*s,y-166*s)],GOLD,1.5*s)
 L(im,[(x-18*s,y-110*s),(x+18*s,y-110*s)],'#b59d72',2*s)
 for k in range(3):
  yy=y-(190+k%2*30)*s;xx=x+(k-1)*70*s;ink.glow(im,xx,yy,56,GOLD,.35);ink.rune(im,xx,yy,14,t*.12+k*.4)

def sentinel(im,x,y,s=1,t=0):
 for side in [-1,1]:
  P(im,[(x+side*18*s,y),(x+side*41*s,y),(x+side*32*s,y-84*s),(x+side*12*s,y-90*s)],INK)
  P(im,[(x+side*30*s,y-160*s),(x+side*65*s,y-146*s),(x+side*74*s,y-89*s),(x+side*50*s,y-72*s),(x+side*42*s,y-128*s)],INK)
 P(im,[(x-38*s,y-169*s),(x+38*s,y-169*s),(x+46*s,y-119*s),(x+23*s,y-75*s),(x-23*s,y-75*s),(x-46*s,y-119*s)],INK)
 P(im,[(x-22*s,y-197*s),(x+22*s,y-197*s),(x+29*s,y-169*s),(x+19*s,y-155*s),(x-19*s,y-155*s),(x-29*s,y-169*s)],INK)
 E(im,(x-10*s,y-182*s,x+10*s,y-172*s),'#c4a56a');ink.glow(im,x,y-177*s,38,GOLD,.4)
 for yy in [-145,-108]:L(im,[(x-25*s,y+yy*s),(x+25*s,y+yy*s)],'#4d5b58',2*s)

def arch(im,x,y,s=1):
 for side in [-1,1]:
  P(im,[(x+side*130*s-24*s,y),(x+side*130*s-20*s,y-260*s),(x+side*130*s+20*s,y-260*s),(x+side*130*s+24*s,y)],INK)
  for j in range(7):L(im,[(x+side*130*s-18*s,y-j*35*s),(x+side*130*s+18*s,y-j*35*s)],'#3b5054',1.3)
 P(im,[(x-153*s,y-255*s),(x-150*s,y-277*s),(x+150*s,y-277*s),(x+153*s,y-255*s)],INK)
 for k in range(9):P(im,[(x+(-140+k*34)*s,y-277*s),(x+(-140+k*34)*s,y-300*s),(x+(-120+k*34)*s,y-300*s),(x+(-120+k*34)*s,y-277*s)],INK)

# 1 — A voice beside the overlook, a slow waking movement and descending companion.
def awakening(t):
 im=BG[0].copy();hills(im,t);ink.glow(im,865,215,235,'#fff1bd',.65)
 P(im,[(-30,568),(160,520),(379,532),(610,579),(804,583),(965,616),(1320,600),(1320,740),(-30,740)],INK)
 for j in range(6):L(im,[(90+j*13,588+j*14),(310+j*15,604+j*12),(637-j*16,619+j*9)],'#28424b',1.3)
 resting(im,530,552,1.9,t);ink.companion(im,735-ease(t/4)*22,253+ease(t/4)*91,1.75,t)
 pine(im,85,563,1.25,t);grass(im,t,0,1280,607,count=140);flowers(im,t,833,1135,608)
 ink.wind(im,t,351,.12);ink.embers(im,t,34,False);birds(im,t,915,204,4)
 return im

# 2 — a luminous inhabited valley with windmills, moving water and drifting birds.
def valley(t):
 im=BG[1].copy();ink.glow(im,875,167,250,'#fff0ba',.65);E(im,(840,131,910,201),'#ead9a8');hills(im,t);stream(im,t)
 ink.village(im,787,415,1.02);windmill(im,544,450,.78,t);windmill(im,970,441,.52,t)
 for j in range(11):ink.trees(im,93+j*48,490+math.sin(j)*21,.42+(j%3)*.08,t*.15,'#365c64')
 P(im,[(-40,604),(170,559),(366,582),(490,627),(549,720),(-40,720)],INK);P(im,[(919,720),(1039,595),(1188,578),(1320,615),(1320,720)],INK)
 ink.temple(im,246,581,.85);ink.rune(im,246,507,23,t*.12);pine(im,1188,630,1.4,t);grass(im,t,0,487,636,count=90);flowers(im,t,54,340,630)
 birds(im,t,690,218,7);ink.wind(im,t,259,.12);fog(im,t,443,opacity=.08)
 return im

# 3 — dusk comes across the protective shrine; its sigils separate in an arc.
def fracture(t):
 im=BG[2].copy();hills(im,t,True);split=ease((t-2.0)/4.2)
 # Great storm cloud masses move in with a gradual, non-flashing darkening.
 for j in range(5):
  x=-170+j*338+t*8;y=97+j%2*35;P(im,[(x-170,y),(x-80,y-43),(x+29,y-26),(x+123,y-51),(x+215,y+7),(x+190,y+83),(x+4,y+107),(x-153,y+58)],'#2c4552')
 ink.glow(im,640,334,210,'#e5c795',.45);ink.temple(im,640,589,2.25,broken=t>4.2)
 for j in range(8):
  a=j/8*math.tau+t*.055;r=34+split*(110+(j%3)*31);x=640+math.sin(a)*r;y=361+math.cos(a)*r*.75+split*38
  ink.rune(im,x,y,11+j%2*5,a,1-split*.25);ink.glow(im,x,y,28,GOLD,.30)
 if t<4.25:ink.rune(im,640,361,52,t*.08,1-ease((t-3.4)/.8))
 P(im,[(-20,615),(290,604),(500,624),(842,600),(1028,630),(1300,607),(1300,740),(-20,740)],INK)
 for x in [120,1146]:pine(im,x,640,1.6,t)
 im.alpha_composite(Image.new('RGBA',SIZE,(6,15,28,int(split*25))))
 ink.wind(im,t,171,.07);ink.embers(im,t+16,55)
 return im

# 4 — the old gate is guarded, with more monumental stonework and a drake beyond.
def guardians(t):
 im=BG[3].copy();hills(im,t,True);fog(im,t,370,col='#97adb0',opacity=.11)
 # broken tower / ringed sanctuary
 for x,h in [(780,155),(824,210),(866,163)]:
  P(im,[(x-23,505),(x-18,505-h),(x+17,505-h-13),(x+26,505)],'#2c4853')
  for yy in range(30,h,32):L(im,[(x-18,505-yy),(x+20,505-yy)],'#50656b',1)
 ink.dragon(im,887+t*1.4,249,1.36,t*.65)
 P(im,[(-30,597),(235,571),(430,581),(622,606),(870,586),(1091,613),(1310,585),(1310,740),(-30,740)],INK)
 arch(im,385,602,.95);sentinel(im,290,604,1.45,t);ink.brute(im,610,610,1.32)
 for j in range(5):P(im,[(1000+j*42,626),(1010+j*42,593-j%2*17),(1040+j*42,622)],'#182f39')
 ink.embers(im,t+24,37);fog(im,t,560,col='#b9bcad',opacity=.10)
 return im

# 5 — Lyra speaks in the warm shade of an ancient tree; three traces answer her.
def keeper(t):
 im=BG[4].copy();hills(im,t);ink.glow(im,713,272,250,'#ffdf9e',.45)
 P(im,[(-30,603),(248,588),(409,605),(641,592),(875,608),(1115,589),(1310,615),(1310,740),(-30,740)],'#24464e')
 # sweeping great-tree silhouette behind the keeper
 C(im,[(1040,655),(1010,410),(1048,226),(974,-10)],'#29454a',94)
 for a,b,c,d in [[(1027,356),(928,316),(858,199),(771,147)],[(1034,268),(1100,198),(1181,180),(1289,121)],[(1013,171),(889,112),(879,77),(830,0)]]:C(im,[a,b,c,d],'#29454a',31)
 for x,y,s in [(806,164,1.2),(918,132,1.6),(1147,163,1.4),(1224,127,1.6)]:ink.trees(im,x,y+98,s,math.sin(t)*2,'#29454a')
 ink.temple(im,389,605,1.05);ink.rune(im,389,505,25,t*.12)
 lyra(im,721,609,1.55,t)
 # traveler witnesses from left foreground
 torso(im,137,653,1.50,t);ink.companion(im,250,390,.8,t)
 flowers(im,t,887,1230,636);grass(im,t,0,1280,650,count=100,col='#17343f')
 ink.embers(im,t+32,44,False);ink.wind(im,t,323,.13)
 return im

# 6 — an intimate composition, then a slow rise from uncertainty.
def together(t):
 im=BG[5].copy();hills(im,t);ink.glow(im,800,295,250,'#f4deb0',.60)
 P(im,[(-30,612),(188,586),(389,603),(568,574),(748,596),(971,615),(1300,593),(1300,740),(-30,740)],INK)
 if t<3.5:
  resting(im,536,595,2.15,t+3);ink.companion(im,746,389,1.8,t)
 else:
  # A brief cloth-shaped match dissolve connects seated and standing silhouettes.
  a=ease((t-3.5)/1.2);old=Image.new('RGBA',SIZE);resting(old,536,595,2.15,t+3)
  new=Image.new('RGBA',SIZE);torso(new,484,613,2.15,t);im.alpha_composite(Image.blend(old,new,a));ink.companion(im,746,389-a*35,1.8,t)
 ink.village(im,1020,513,.38);birds(im,t,904,194,4);flowers(im,t,78,316,627);grass(im,t,0,1280,638,count=100);ink.wind(im,t,291,.16)
 return im

# 7 — they cross a bridge, walking toward the town rather than a static hero pose.
def journey(t):
 im=BG[6].copy();hills(im,t);stream(im,t);ink.village(im,870,424,1.0);windmill(im,657,460,.72,t)
 # winding path and wooden bridge spanning the foreground river
 P(im,[(914,426),(878,448),(735,486),(636,544),(298,639),(151,641),(550,528),(697,478),(861,442)],'#c6c6a1')
 P(im,[(196,602),(562,561),(734,581),(370,634)],'#244650')
 for j in range(19):L(im,[(206+j*19,602-j*2.1),(372+j*18.8,633-j*2.1)],'#7e9788',1.2)
 for j in range(8):
  x=215+j*48;y=599-j*5.25;L(im,[(x,y),(x,y-58)],INK,5);L(im,[(x+157,y+32),(x+157,y-27)],INK,5)
 L(im,[(215,543),(551,506)],INK,4);L(im,[(372,574),(708,536)],INK,4)
 # walk follows the plank slope with a subtly articulated stride
 x=321+t*21;y=596-(x-321)*.11;torso(im,x,y,.87,t,walk=1);ink.companion(im,x+77,y-128,.76,t)
 pine(im,65,648,1.75,t);pine(im,1211,637,1.7,t);P(im,[(-30,655),(189,629),(330,671),(479,720),(-30,720)],INK);P(im,[(982,720),(1089,626),(1310,643),(1310,720)],INK)
 grass(im,t,0,278,659,count=65);grass(im,t,1070,1280,663,count=65);birds(im,t,903,200,6);ink.embers(im,t+48,28,False)
 return im

# 8 — arrive at the gate together, then a quiet title reveal that leaves time to breathe.
def arrival(t):
 im=BG[7].copy();hills(im,t);ink.glow(im,735,360,240,'#e9d6a4',.60)
 ink.village(im,736,504,.78);P(im,[(709,510),(665,550),(550,617),(991,720),(1276,720),(850,605),(772,544)],'#b6baa0')
 arch(im,747,606,1.36)
 for side in [-1,1]:
  x=747+side*232;P(im,[(x-45,613),(x-43,237),(x+41,237),(x+49,613)],INK)
  P(im,[(x-55,243),(x,152),(x+52,243)],INK)
  for yy in range(285,611,44):L(im,[(x-38,yy),(x+40,yy)],'#3f575c',1)
 P(im,[(-30,653),(260,619),(455,636),(720,690),(950,720),(-30,720)],INK)
 torso(im,371+t*3,635,1.65,t,walk=.45 if t<3 else 0);ink.companion(im,518+t*3,368,1.14,t)
 ink.wind(im,t,373,.13);ink.embers(im,t+56,45,False)
 a=ease((t-3.7)/1.45)
 if a>0:
  im.alpha_composite(Image.new('RGBA',SIZE,(7,22,31,int(a*225))))
  ink.rune(im,640,226,37,math.pi/4,a*.8);ink.text(im,'AETHER’S TRIAL',286,66,GOLD,alpha=a);ink.text(im,'W I N D B O R N E',379,22,BONE,spacing=3,alpha=a);ink.text(im,'Every journey begins with someone beside you.',445,23,'#b5c4b8',alpha=a)
 return im

SCENES=[awakening,valley,fracture,guardians,keeper,together,journey,arrival]
LABELS=['Awakening','The valley','A silent wind','The guardians','Keeper of the winds','Not alone','One step at a time','Windborne']
def frame(t):
 k=min(7,int(t/8));local=t-k*8;im=SCENES[k](local)
 if k>0 and local<.65:im=Image.blend(SCENES[k-1](8+local),im,ease(local/.65))
 # restrained camera push-in; never stretch the aspect ratio
 zoom=1.012+ease(local/8)*.024;ww,hh=int(SIZE[0]/zoom),int(SIZE[1]/zoom);cx=SIZE[0]/2+math.sin(local*.12)*8*SS;cy=SIZE[1]/2
 im=im.crop((int(cx-ww/2),int(cy-hh/2),int(cx+ww/2),int(cy+hh/2))).resize(SIZE,Image.Resampling.BICUBIC)
 d=ImageDraw.Draw(im);d.rectangle((0,0,SIZE[0],int(28*SS)),fill='#0b1921');d.rectangle((0,int(655*SS),SIZE[0],SIZE[1]),fill='#0b1921')
 fade=min(ease(t/1.2),ease((64-t)/1.0))
 if fade<1:im=Image.blend(Image.new('RGBA',SIZE,'#0b1921'),im,fade)
 return im.convert('RGB').resize((W,H),Image.Resampling.LANCZOS)

def previews():
 thumbs=[]
 for i in range(8):
  tm=i*8+4.8;im=frame(tm);im.save(OUT/f'scene-{i+1:02d}.jpg',quality=94);thumb=im.resize((640,360));thumbs.append(thumb)
 sheet=Image.new('RGB',(1280,1568),'#e4e7df');d=ImageDraw.Draw(sheet);f=ImageFont.truetype(str(ink.SANS),17)
 for i,im in enumerate(thumbs):
  x=(i%2)*640;y=(i//2)*392;sheet.paste(im,(x,y));d.text((x+16,y+366),f'{i+1:02d}  {LABELS[i]}',font=f,fill='#24454d')
 sheet.save(OUT/'contact-sheet.jpg',quality=94);frame(61.7).save(OUT/'poster.jpg',quality=95)

def render():
 cmd=['ffmpeg','-y','-hide_banner','-loglevel','error','-f','rawvideo','-pix_fmt','rgb24','-s',f'{W}x{H}','-r',str(FPS),'-i','pipe:0','-an','-c:v','libx264','-preset','fast','-crf','23','-pix_fmt','yuv420p','-movflags','+faststart',str(SILENT)]
 p=subprocess.Popen(cmd,stdin=subprocess.PIPE)
 for i in range(FPS*DURATION):
  p.stdin.write(frame(i/FPS).tobytes())
  if i%96==0:print(f'Rendered {i}/{FPS*DURATION}',flush=True)
 p.stdin.close();assert p.wait()==0
 print(f'Silent film ready: {SILENT.stat().st_size} bytes',flush=True)

def mux():
 assert AUDIO.exists(),f'Awaiting local neural narration: {AUDIO}'
 subprocess.run(['ffmpeg','-y','-hide_banner','-loglevel','error','-i',str(SILENT),'-i',str(AUDIO),'-map','0:v','-map','1:a','-c:v','copy','-c:a','aac','-b:a','160k','-t',str(DURATION),'-movflags','+faststart',str(MOVIE)],check=True)
 subprocess.run(['ffmpeg','-v','error','-i',str(MOVIE),'-f','null','-'],check=True)
 probe=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_streams','-show_format','-of','json',str(MOVIE)]));v=next(s for s in probe['streams'] if s['codec_type']=='video');a=next(s for s in probe['streams'] if s['codec_type']=='audio')
 report={'file':str(MOVIE),'bytes':MOVIE.stat().st_size,'sha256':hashlib.sha256(MOVIE.read_bytes()).hexdigest(),'duration_seconds':float(probe['format']['duration']),'width':v['width'],'height':v['height'],'fps':v['r_frame_rate'],'frames':v.get('nb_frames'),'video':v['codec_name'],'audio':a['codec_name'],'audio_rate':a['sample_rate'],'local_render':True,'cloud_used':False,'scenes':LABELS,'visual_source':'tools/render-intro-extended.py','audio_source':'tools/render-voice.py','complete_decode_passed':True}
 (OUT/'verification.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report,indent=2),flush=True)

if __name__=='__main__':
 if '--mux' in sys.argv:mux()
 else:
  previews()
  if '--preview' not in sys.argv:render()
