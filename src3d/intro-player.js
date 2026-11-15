// Caption timing is generated from the actual recorded duration of each local voice clip.
import script from './intro-script.json';
export const INTRO_CAPTIONS=script.captions.map(c=>[c.start,c.end,c.text]);
export const INTRO_DURATION=script.duration;
export const INTRO_CHAPTERS=script.chapters.map(({start,title})=>({start,title}));
export function introCaption(time){return INTRO_CAPTIONS.find(([start,end])=>time>=start&&time<end)?.[2]||'';}
export function introChapter(time){
 let index=0;
 for(let i=1;i<INTRO_CHAPTERS.length;i++)if(time>=INTRO_CHAPTERS[i].start)index=i;
 return {index,...INTRO_CHAPTERS[index]};
}
export function formatIntroTime(seconds){
 const whole=Number.isFinite(seconds)?Math.max(0,Math.floor(seconds)):0;
 return Math.floor(whole/60)+':'+String(whole%60).padStart(2,'0');
}

export function makeIntroPlayer({video,subtitle,playButton,onComplete,onFallback}){
 let active=false,fallback=false,blocked=false,wasPlaying=false,generation=0,watchdog=null;
 const clearWatchdog=()=>{clearTimeout(watchdog);watchdog=null;};
 function useFallback(){if(!active||fallback)return;clearWatchdog();generation++;fallback=true;blocked=false;video.pause();video.hidden=true;playButton.hidden=true;onFallback();}
 function showPlay(){blocked=true;playButton.hidden=false;playButton.textContent='▶ Play opening';}
 async function play(){if(!active||fallback)return;const token=generation;blocked=false;playButton.hidden=true;
  try{await video.play();if(!active)video.pause();}
  catch(error){if(token!==generation||!active)return;if(error.name==='NotSupportedError')useFallback();else showPlay();}
 }
 function start(muted=false){stop();active=true;fallback=false;blocked=false;video.hidden=false;video.muted=muted;video.volume=.8;subtitle.textContent='';
  if(!video.getAttribute('src'))video.src=INTRO_VIDEO_DATA;
  if(video.error){video.load();}
  watchdog=setTimeout(()=>{if(active&&!fallback&&video.readyState<2)useFallback();},8000);play();
 }
 function stop(){generation++;active=false;wasPlaying=false;blocked=false;clearWatchdog();video.pause();try{video.currentTime=0;}catch{}video.hidden=true;playButton.hidden=true;subtitle.textContent='';}
 function suspend(){if(!active||fallback)return;wasPlaying=wasPlaying||!video.paused;video.pause();}
 function resume(){if(!active||fallback||!wasPlaying)return;wasPlaying=false;play();}
 function togglePause(){if(!active||fallback)return;if(video.paused)play();else{video.pause();showPlay();}}
 function update(){if(active&&!fallback)subtitle.textContent=introCaption(video.currentTime);}
 playButton.addEventListener('click',play);
 video.addEventListener('loadeddata',clearWatchdog);
 video.addEventListener('error',useFallback);
 video.addEventListener('ended',()=>{if(active&&!fallback){active=false;clearWatchdog();onComplete();}});
 return{start,stop,suspend,resume,togglePause,update,setMuted(value){video.muted=value;},get time(){return video.currentTime;},get duration(){return Number.isFinite(video.duration)&&video.duration>0?video.duration:INTRO_DURATION;},get paused(){return video.paused;},get usingFallback(){return fallback;},get active(){return active;},get blocked(){return blocked;}};
}
