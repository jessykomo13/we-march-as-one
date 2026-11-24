// ================================================================ utilitaires
const V3 = THREE.Vector3, Q = THREE.Quaternion;
const D2R = Math.PI / 180;
const AX = new V3(1,0,0), AY = new V3(0,1,0), AZ = new V3(0,0,1), UP = new V3(0,1,0);
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v)), clamp01=v=>clamp(v,0,1), lerp=(a,b,t)=>a+(b-a)*t;
const rand=(a,b)=>a+Math.random()*(b-a);
const deltaAngle=(a,b)=>((b-a)%360+540)%360-180;
const lerpAngle=(a,b,t)=>a+deltaAngle(a,b)*t;
const qAxis=(ax,deg)=>new Q().setFromAxisAngle(ax,deg*D2R);
// Repère : droite +X, haut +Y, avant -Z. yaw+ = droite, pitch+ = vers l'avant, roll+ = côté droit monte.
const frame=(yaw,pitch=0,yawExtra=0,roll=0)=>qAxis(AY,-(yaw+yawExtra)).multiply(qAxis(AX,-pitch)).multiply(qAxis(AZ,roll));
const local=(q,x,y,f)=>new V3(x,y,-f).applyQuaternion(q);
const fwdOf=yaw=>new V3(Math.sin(yaw*D2R),0,-Math.cos(yaw*D2R));
const rightOf=yaw=>new V3(Math.cos(yaw*D2R),0,Math.sin(yaw*D2R));
const hdist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
function smoothDamp(cur,target,st,key,smoothTime,dt){
  smoothTime=Math.max(1e-4,smoothTime);
  const o=2/smoothTime,x=o*dt,e=1/(1+x+0.48*x*x+0.235*x*x*x),c=cur-target,t=(st[key]+o*c)*dt;
  st[key]=(st[key]-o*t)*e; return target+(c+t)*e;
}
function hash(n){const s=Math.sin(n*127.1+311.7)*43758.5453;return s-Math.floor(s);}
function noise(x,seed){const i=Math.floor(x),f=x-i,u=f*f*(3-2*f);return lerp(hash(i+seed*57.3),hash(i+1+seed*57.3),u);}
function basis(primary,hint){
  const x=primary.clone().normalize();
  const z=hint.clone().addScaledVector(x,-hint.dot(x));
  if(z.lengthSq()<1e-8){z.set(0,1,0).addScaledVector(x,-x.y);}
  z.normalize();
  const y=new V3().crossVectors(z,x);
  return new Q().setFromRotationMatrix(new THREE.Matrix4().makeBasis(x,y,z));
}
function mulberry(a){return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}


// géométrie non indexée sans avertissement si elle l'est déjà
function noIdx(g){return g.index?g.toNonIndexed():g;}
