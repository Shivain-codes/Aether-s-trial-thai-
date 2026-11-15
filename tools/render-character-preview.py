#!/usr/bin/env python3
"""CPU-only, textured orthographic inspection of actual exported Three.js meshes.
Usage: python tools/render-character-preview.py shots/characters/before.json [output-prefix]
No browser, WebGL context, invented geometry or generated character imagery is used.
"""
from pathlib import Path
import argparse,base64,io,json,math,time
import numpy as np
from PIL import Image,ImageDraw,ImageFont
ROOT=Path(__file__).resolve().parents[1]
W,H=1400,1100

def load_data(path):
 data=json.loads(path.read_text());textures=[]
 for t in data['textures']:
  im=Image.open(io.BytesIO(base64.b64decode(t['data'].split(',',1)[1]))).convert('RGBA');textures.append((np.asarray(im,dtype=np.float32)/255.,t.get('flipY',True)))
 meshes=[]
 for m in data['meshes']:
  m['v']=np.asarray(m['vertices'],dtype=np.float32).reshape(-1,3);m['tri']=np.asarray(m['indices'],dtype=np.int32).reshape(-1,3);m['texuv']=np.asarray(m['uv'],dtype=np.float32).reshape(-1,2) if m.get('uv') else None
  mids=np.zeros(len(m['tri']),dtype=np.int32)
  for group in m.get('groups',[]):mids[group['start']//3:(group['start']+group['count'])//3]=group['materialIndex']
  m['mids']=mids;meshes.append(m)
 return meshes,textures

def draw_scene(meshes,textures,yaw,prefix,view):
 y=np.linspace(0,1,H)[:,None,None];top=np.array([.13,.19,.25]);bottom=np.array([.30,.39,.45]);canvas=np.broadcast_to(top*(1-y)+bottom*y,(H,W,3)).copy().astype(np.float32);zbuffer=np.full((H,W),-np.inf,np.float32)
 c,s=math.cos(yaw),math.sin(yaw);rotation=np.array([[c,0,-s],[0,1,0],[s,0,c]],np.float32)
 sun=np.array([-.4,.7,.55]);sun/=np.linalg.norm(sun)
 for label,cx,scale in [('traveler',380,330),('companion',1060,540)]:
  # Ground discs establish scale without adding any model details.
  sy,sx=np.mgrid[:H,:W];shadow=np.exp(-(((sx-cx)/(scale*.31))**2+((sy-930)/(scale*.055))**2)*2)*.28;canvas*=1-shadow[:,:,None]
  for m in (m for m in meshes if m['label']==label):
   v=m['v']@rotation.T;screen=np.column_stack([cx+v[:,0]*scale,930-v[:,1]*scale,v[:,2]]);uv=m['texuv']
   normals=np.zeros_like(v);tn=np.cross(v[m['tri'][:,1]]-v[m['tri'][:,0]],v[m['tri'][:,2]]-v[m['tri'][:,0]])
   for corner in range(3):np.add.at(normals,m['tri'][:,corner],tn)
   normals/=np.maximum(np.linalg.norm(normals,axis=1,keepdims=True),1e-10)
   for i,ix in enumerate(m['tri']):
    q=screen[ix];x0=max(0,int(np.floor(q[:,0].min())));x1=min(W-1,int(np.ceil(q[:,0].max())));y0=max(0,int(np.floor(q[:,1].min())));y1=min(H-1,int(np.ceil(q[:,1].max())))
    if x1<x0 or y1<y0:continue
    a,b,cc=q;den=(b[1]-cc[1])*(a[0]-cc[0])+(cc[0]-b[0])*(a[1]-cc[1])
    if abs(den)<1e-7:continue
    yy,xx=np.mgrid[y0:y1+1,x0:x1+1];xx=xx+.5;yy=yy+.5
    w0=((b[1]-cc[1])*(xx-cc[0])+(cc[0]-b[0])*(yy-cc[1]))/den;w1=((cc[1]-a[1])*(xx-cc[0])+(a[0]-cc[0])*(yy-cc[1]))/den;w2=1-w0-w1
    zz=w0*a[2]+w1*b[2]+w2*cc[2];depth=zbuffer[y0:y1+1,x0:x1+1];valid=(w0>=-.0001)&(w1>=-.0001)&(w2>=-.0001)&(zz>depth)
    if not valid.any():continue
    mat=m['materials'][min(m['mids'][i],len(m['materials'])-1)];hexcol=mat.get('color','#ffffff').lstrip('#');color=np.array([int(hexcol[k:k+2],16)/255 for k in (0,2,4)],np.float32)
    normal=w0[:,:,None]*normals[ix[0]]+w1[:,:,None]*normals[ix[1]]+w2[:,:,None]*normals[ix[2]]
    normal/=np.maximum(np.linalg.norm(normal,axis=2,keepdims=True),1e-10)
    normal*=np.where(normal[:,:,2:3]<0,-1,1)
    lambert=normal@sun;light=np.ones_like(lambert) if mat.get('unlit') else np.where(lambert>.55,1.02,np.where(lambert>.05,.86,.66))
    rgb=color*light[:,:,None];alpha=np.full(w0.shape,mat.get('opacity',1),np.float32)
    ti=mat.get('texture',-1)
    if ti>=0 and uv is not None:
     tex,flip=textures[ti];u=w0*uv[ix[0],0]+w1*uv[ix[1],0]+w2*uv[ix[2],0];vv=w0*uv[ix[0],1]+w1*uv[ix[1],1]+w2*uv[ix[2],1]
     # Most assets clamp their edges. Respect the GLTF-vs-Canvas Y convention.
     tx=np.clip(np.rint(u*(tex.shape[1]-1)),0,tex.shape[1]-1).astype(np.int32);ty=np.clip(np.rint((1-vv if flip else vv)*(tex.shape[0]-1)),0,tex.shape[0]-1).astype(np.int32);sample=tex[ty,tx];rgb=rgb*sample[:,:,:3];alpha*=sample[:,:,3]
    valid&=alpha>max(.025,mat.get('alphaTest',0))
    if not valid.any():continue
    region=canvas[y0:y1+1,x0:x1+1];blend=alpha[:,:,None];region[valid]=(region*(1-blend)+rgb*blend)[valid];depth[valid]=zz[valid]
 im=Image.fromarray(np.uint8(np.clip(canvas,0,1)*255));d=ImageDraw.Draw(im)
 font_path='/System/Library/Fonts/Helvetica.ttc'
 try:font=ImageFont.truetype(font_path,25);small=ImageFont.truetype(font_path,17);large=ImageFont.truetype(font_path,31)
 except OSError:font=small=large=ImageFont.load_default()
 d.text((50,35),'WINDBORNE / CHARACTER GEOMETRY REVIEW',font=font,fill='#e6d8b9');d.text((50,78),view.upper()+' · CPU preview of the actual game meshes',font=small,fill='#b6cbd3')
 d.text((225,990),'TRAVELER',font=large,fill='#f0e6cd');d.text((930,990),'COMPANION',font=large,fill='#f0e6cd');d.text((50,1052),'Studio inspection only · game lighting and effects differ · companion enlarged for detail',font=small,fill='#b6cbd3')
 out=Path(str(prefix)+'-'+view+'.jpg');out.parent.mkdir(parents=True,exist_ok=True);im.save(out,quality=94);print(str(out),flush=True)

if __name__=='__main__':
 ap=argparse.ArgumentParser();ap.add_argument('json',type=Path);ap.add_argument('prefix',nargs='?',type=Path);ap.add_argument('--views',default='front,back,threequarter');args=ap.parse_args();prefix=args.prefix or args.json.with_suffix('');start=time.monotonic();meshes,textures=load_data(args.json)
 for name in args.views.split(','):draw_scene(meshes,textures,{'front':0,'back':math.pi,'threequarter':-.62}[name],prefix,name)
 print(f'Rendered {len(meshes)} actual meshes in {time.monotonic()-start:.1f}s',flush=True)
