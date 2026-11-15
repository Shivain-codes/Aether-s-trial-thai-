// Frame-rate independent planar locomotion. Input direction is camera-relative.
export function stepLocomotion(v,dx,dz,targetSpeed,dt,{air=false,dash=false,gliding=false}={}){
 const length=Math.hypot(dx,dz);if(length>1){dx/=length;dz/=length;}
 const tx=dx*targetSpeed,tz=dz*targetSpeed;
 // A dash has a crisp start; storing its velocity prevents a stale-speed snap afterward.
 const rate=dash?Infinity:gliding?5:air?5.5:targetSpeed?10:15;
 const a=rate===Infinity?1:1-Math.exp(-Math.max(0,dt)*rate);
 v.x+=(tx-v.x)*a;v.z+=(tz-v.z)*a;
 if(!targetSpeed&&Math.hypot(v.x,v.z)<.015)v.x=v.z=0;
 return Math.hypot(v.x,v.z);
}
