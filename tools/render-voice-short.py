#!/usr/bin/env python3
"""Render Windborne's conversational opening voice entirely on the local CPU.

Setup: uv venv ~/.cache/windborne-voice/venv; uv pip install --python
~/.cache/windborne-voice/venv/bin/python kokoro-onnx==0.6.1 soundfile scipy.
Kokoro weights: Apache-2.0; runtime: MIT. The model and dependencies live in
~/.cache/windborne-voice, not inside the playable game's bundle.
"""
from pathlib import Path
import json, hashlib, subprocess, shutil, time
import numpy as np
import soundfile as sf
from scipy.signal import butter, sosfilt, resample_poly
from kokoro_onnx import Kokoro
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'shots/intro-short'; AUDIO=OUT/'audio'; AUDIO.mkdir(parents=True,exist_ok=True)
CACHE=Path.home()/'.cache/windborne-voice/models'
MODEL=CACHE/'kokoro-community-fp16.onnx'; VOICES=CACHE/'voices-v1.0.bin'
DURATION=30.; RATE=48000
CUES=[
 (.8,'When the wind shrine shattered, its power rushed toward the village.'),
 (6.8,'Aether fought through the guardians and sealed the storm to save the village.'),
 (16.1,'But the broken shrine took his memories to hold the seal.'),
 (23.5,'He woke with no past... and a new journey ahead.')
]


def verify_model():
 metadata=json.loads((CACHE.parent/'model-metadata.json').read_text())
 expected=next(x['lfs']['oid'] for x in metadata if x['path']=='onnx/model_fp16.onnx')
 actual=hashlib.sha256(MODEL.read_bytes()).hexdigest()
 assert actual==expected,(actual,expected)
 assert hashlib.sha256(VOICES.read_bytes()).hexdigest()=='bca610b8308e8d99f32e6fe4197e7ec01679264efed0cac9140fe9c29f1fbf7d'
 return actual

def synthesize():
 checksum=verify_model();started=time.monotonic();tts=Kokoro(str(MODEL),str(VOICES))
 captions=[];voice=np.zeros(int(RATE*DURATION));activity=np.zeros_like(voice);clips=[]
 for i,(start,text) in enumerate(CUES):
  speed=.84 if i in [0,3] else .86
  window=(CUES[i+1][0] if i+1<len(CUES) else DURATION-.7)-start-.6
  # Some FP16 graphs return empty audio at specific fractional durations.
  # Retry safely at other natural speech rates; never accept empty or clipped lines.
  for candidate in [speed,.92,1.0,1.04]:
   speech,rate=tts.create(text,voice='af_heart',speed=candidate,lang='en-us',sentence_pause=.30,clause_pause=.10)
   if len(speech)>rate*.4 and np.isfinite(speech).all() and np.max(np.abs(speech))>.02 and len(speech)/rate<window:
    speed=candidate;break
  else:raise RuntimeError(f'No valid complete audio for cue {i+1}')
  seconds=len(speech)/rate
  assert seconds<window+.2,('Narration does not fit; never truncate',i,seconds,window)
  assert np.isfinite(speech).all()
  sf.write(AUDIO/f'cue-{i+1}-raw.wav',speech,rate,subtype='PCM_16')
  # Remove rumble, gently compress conversational level, and preserve natural pauses.
  speech=sosfilt(butter(2,75,btype='highpass',fs=rate,output='sos'),speech)
  rms=np.sqrt(np.mean(speech**2));speech*=min(2.0,.115/max(rms,1e-8))
  speech=np.tanh(speech*1.12)/1.12
  peak=np.max(np.abs(speech));speech*=min(1,.74/max(peak,1e-8))
  # Tiny edge ramps prevent clicks; no artificial breaths or pitch/time stretching.
  ramp=min(int(.012*rate),len(speech)//5);speech[:ramp]*=np.linspace(0,1,ramp);speech[-ramp:]*=np.linspace(1,0,ramp)
  sf.write(AUDIO/f'cue-{i+1}.wav',speech,rate,subtype='PCM_16')
  speech=resample_poly(speech,RATE,rate);offset=round(start*RATE)
  voice[offset:offset+len(speech)]+=speech
  a=max(0,offset-int(.20*RATE));b=min(len(voice),offset+len(speech)+int(.36*RATE));activity[a:b]=1
  end=round(start+seconds+.18,3)
  captions.append({'start':start,'end':end,'text':text})
  clips.append({'index':i+1,'start':start,'speech_seconds':round(seconds,3),'speed':speed,'peak':round(float(np.max(np.abs(speech))),5)})
  print(f'Cue {i+1}: {seconds:.3f}s, speed {speed:.3f}, ends {end}',flush=True)
 sf.write(AUDIO/'narration-only.wav',np.stack([voice,voice],axis=1),RATE,subtype='PCM_16')
 # A restrained original sound bed: breathy pad, distant wind, occasional glass notes.
 t=np.arange(len(voice))/RATE;score=np.zeros_like(voice)
 chord_sets=[[146.832,220,293.665,440],[130.813,195.998,261.626,391.995],[146.832,220,293.665,349.228],[164.814,246.942,329.628,440]]
 for section in range(4):
  span=DURATION/4;s=section*span;u=np.clip((t-s)/span,0,1);mask=(t>=s)&(t<s+span)
  env=np.sin(np.pi*u)**.42*mask
  for j,f in enumerate(chord_sets[section]):
   score+=(np.sin(2*np.pi*f*t+np.sin(t*.19+j)*.08)+.14*np.sin(2*np.pi*f*2*t))*env*(.011 if j<2 else .006)
 random=np.random.default_rng(182);wind=sosfilt(butter(2,420,btype='lowpass',fs=RATE,output='sos'),random.normal(0,1,len(t)))
 wind/=max(np.sqrt(np.mean(wind**2)),1e-6)
 score+=wind*.0025*(.65+.35*np.sin(t*.25)**2)
 for j,start in enumerate([.4,7.1,15.1,23.1,27.5]):
  tau=np.maximum(0,t-start);f=[587.33,440,523.25,391.995,659.25][j%5]
  env=np.exp(-tau*1.1)*(1-np.exp(-tau*40))*(t>=start)
  score+=(np.sin(2*np.pi*f*t)+.23*np.sin(2*np.pi*f*2.01*t))*env*.017
 # Smooth volume automation keeps the voice in front without audible pumping.
 activity=sosfilt(butter(1,4,btype='lowpass',fs=RATE,output='sos'),activity)
 score*=1-.72*np.clip(activity,0,1)
 fade=np.minimum(np.clip(t/1.8,0,1),np.clip((DURATION-t)/2.0,0,1));score*=fade
 # Original, timed blade swishes and muted impacts give the duel physical weight.
 sfx=np.zeros_like(voice)
 for j,start in enumerate([7.7,9.55,11.8,13.4,16.4,20.2]):
  tau=np.maximum(0,t-start);mask=(t>=start)&(t<start+1.4)
  noise=sosfilt(butter(2,1700 if j<4 else 700,btype='lowpass',fs=RATE,output='sos'),random.normal(0,1,len(t)))
  env=np.exp(-tau*(9 if j<4 else 3))*(1-np.exp(-tau*90))*mask
  sfx+=(noise*.13+np.sin(2*np.pi*(95*tau-18*tau*tau))*.075)*env
 sfx*=1-.25*np.clip(activity,0,1)
 left=voice+score+sfx;right=voice+np.roll(score,83)*.96+np.roll(sfx,31)*.94
 stereo=np.stack([left,right],axis=1);peak=float(np.max(np.abs(stereo)))
 if peak>.89:stereo*=.89/peak
 assert np.isfinite(stereo).all() and np.max(np.abs(stereo))<.91
 sf.write(AUDIO/'score.wav',np.stack([score,np.roll(score,83)*.96],axis=1),RATE,subtype='PCM_16')
 sf.write(AUDIO/'intro-mix.wav',stereo,RATE,subtype='PCM_16')
 backup=ROOT/'shots/intro/original-samantha.mp3'
 if not backup.exists():shutil.copyfile(ROOT/'src3d/narration.mp3',backup)
 subprocess.run(['ffmpeg','-y','-hide_banner','-loglevel','error','-i',str(AUDIO/'cue-1.wav'),'-c:a','libmp3lame','-b:a','128k',str(ROOT/'src3d/narration.mp3')],check=True)
 data={'duration':DURATION,'fps':24,'width':1280,'height':720,'captions':captions,'voice':'Kokoro-82M af_heart, local neural synthetic female voice','voice_model_url':'https://huggingface.co/onnx-community/Kokoro-82M-v1.0-ONNX','voice_model_sha256':checksum,'voice_model_license':'Apache-2.0','runtime':'kokoro-onnx 0.6.1 / ONNX Runtime CPU','runtime_license':'MIT','music':'Original locally synthesized score with speech ducking','clips':clips,'narration_mix_seconds':DURATION,'rendered_locally':True,'cloud_used':False,'human_recording':False,'peak':round(float(np.max(np.abs(stereo))),6),'generation_seconds':round(time.monotonic()-started,2)}
 (OUT/'timing.json').write_text(json.dumps(data,indent=2,ensure_ascii=False)+'\n')
 print(json.dumps({k:data[k]for k in ['generation_seconds','peak','duration','voice']},indent=2),flush=True)

if __name__=='__main__':synthesize()
