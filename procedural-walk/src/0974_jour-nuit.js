// ================================================================ MODULE 25 : cycle jour / nuit et météo
// Une journée dure 24 minutes par défaut (réglable). Le soleil tourne, le ciel passe par l'aube, le plein jour,
// le coucher de soleil et la nuit étoilée (lune). La nuit : fenêtres et lampadaires allumés, enseignes plus vives.
// Météo : beau temps, nuageux, pluie (gouttes, bruit de pluie, passants qui pressent le pas).
const DAY={t:9.5,night:0,weather:"clair",wT:0,rainK:0,last:-1};
const DAYSUN=new V3(-6,11,4);
const hemi=scene.children.find(o=>o.isHemisphereLight);
// fenêtres éclairées (mêmes positions que les textures de façades)
function litTex(key,w,h,panes,seed){return cTex(key,w,h,(g)=>{g.fillStyle="#000";g.fillRect(0,0,w,h);let s=seed;for(const [x,y,pw,ph] of panes){s=(s*9301+49297)%233280;const on=s/233280<0.62;
  if(on){const warm=s%3?"#ffd58a":"#fff1c9";g.fillStyle=warm;g.fillRect(x,y,pw,ph);g.fillStyle="rgba(0,0,0,.25)";g.fillRect(x,y+ph*0.6,pw,ph*0.4);}}});}
const NIGHT_MATS=[];
{const fac=[];for(const x of [14,74])fac.push([x+3,25,16,46],[x+21,25,16,46]);
 FACADES.forEach((m,i)=>{m.emissive=new THREE.Color(0xffffff);m.emissiveMap=litTex("litF"+(i%3),128,102,fac,i*77+5);m.emissiveIntensity=0;m.needsUpdate=true;NIGHT_MATS.push([m,1.1]);});
 KM.houseWall.forEach((m,i)=>{m.emissive=new THREE.Color(0xffffff);m.emissiveMap=litTex("litH"+(i%2),96,90,[[34,30,13,30],[49,30,13,30]],i*31+3);m.emissiveIntensity=0;m.needsUpdate=true;NIGHT_MATS.push([m,0.9]);});
 KM.tower.forEach((m,i)=>{m.emissive=new THREE.Color(0xffffff);m.emissiveMap=litTex("litT"+i,64,64,[[4,4,26,24],[34,4,26,24],[4,36,26,24],[34,36,26,24]],i*53+11);m.emissiveIntensity=0;m.needsUpdate=true;NIGHT_MATS.push([m,0.8]);});
 KT.forEach((m,i)=>{m.emissive=new THREE.Color(0xffffff);m.emissiveMap=litTex("litK"+i,64,64,i===5?[[6,8,20,20],[38,8,20,20]]:[[3,3,27,26],[34,3,27,26]],i*17+29);m.emissiveIntensity=0;m.needsUpdate=true;NIGHT_MATS.push([m,0.7]);});
 if(typeof POP_MAT!=="undefined")POP_MAT.forEach((m,i)=>{m.emissive=new THREE.Color(0xffffff);m.emissiveMap=litTex("litP"+(i%3),64,64,[[22,13,20,34]],i*13+7);m.emissiveIntensity=0;m.needsUpdate=true;NIGHT_MATS.push([m,1]);});}
NIGHT_MATS.push([HEADL,4],[TAILL,3]);
// ciel nocturne : étoiles et lune (suivent la caméra)
const skyStars=(()=>{const n=900,p=new Float32Array(n*3);for(let i=0;i<n;i++){const u=Math.random(),v=Math.random()*0.92,th=u*Math.PI*2,ph=Math.acos(1-v);p[i*3]=Math.sin(ph)*Math.cos(th);p[i*3+1]=Math.cos(ph);p[i*3+2]=Math.sin(ph)*Math.sin(th);}
  const g=new THREE.BufferGeometry();g.setAttribute("position",new THREE.BufferAttribute(p,3));const m=new THREE.PointsMaterial({color:0xffffff,size:1.6,sizeAttenuation:false,transparent:true,opacity:0,fog:false,depthWrite:false});
  const o=new THREE.Points(g,m);o.frustumCulled=false;o.renderOrder=-1;scene.add(o);return o;})();
const moon=new THREE.Mesh(new THREE.SphereGeometry(1,16,12),new THREE.MeshBasicMaterial({color:0xf2f0e0,fog:false,transparent:true,opacity:0}));scene.add(moon);
// pluie : traits qui tombent autour de la caméra
const rain=(()=>{const n=1400,p=new Float32Array(n*6);for(let i=0;i<n;i++){const x=Math.random()*60-30,y=Math.random()*30,z=Math.random()*60-30;p.set([x,y,z,x+0.05,y-0.7,z],i*6);}
  const g=new THREE.BufferGeometry();g.setAttribute("position",new THREE.BufferAttribute(p,3));const m=new THREE.LineBasicMaterial({color:0xaab8c8,transparent:true,opacity:0,depthWrite:false});
  const o=new THREE.LineSegments(g,m);o.frustumCulled=false;o.visible=false;scene.add(o);return o;})();
let rainSnd=null;
function rainSound(k){const c=actx;if(!c||c.state!=="running")return;if(!rainSnd){try{const n=c.createBufferSource(),b=c.createBuffer(1,c.sampleRate*2,c.sampleRate),a=b.getChannelData(0);for(let i=0;i<a.length;i++)a[i]=Math.random()*2-1;n.buffer=b;n.loop=true;
  const f=c.createBiquadFilter();f.type="bandpass";f.frequency.value=2400;f.Q.value=0.4;const g=c.createGain();g.gain.value=0;n.connect(f).connect(g).connect(sfxOut());n.start();rainSnd=g;}catch(e){return;}}
  rainSnd.gain.setTargetAtTime(menuOpen?0:k*0.09,c.currentTime,0.4);}
// éclairage d'ambiance : plusieurs intensités préparées (on change de texture, pas de recompilation)
const ENV_LV=[1,0.45,0.2,0.09].map(k=>{const room=new RoomEnvironment(renderer);room.traverse(o=>{if(o.isLight)o.intensity*=k;const m=o.material;if(m){if(m.color)m.color.multiplyScalar(k);if(m.emissive)m.emissive.multiplyScalar(k);}});return pmrem.fromScene(room,0.04).texture;});
// lumière de nuit autour du joueur (réverbères proches) ; phares quand on conduit
const nightLight=new THREE.PointLight(0xffd9a0,0,16,1.6);scene.add(nightLight);
const headLight=new THREE.SpotLight(0xfff2d0,0,45,0.55,0.5,1.2);scene.add(headLight,headLight.target);
// palette du ciel selon l'heure
const SKY_KEYS=[[0,0x0a0f1e],[4.6,0x0f1530],[5.6,0x4a4466],[6.4,0xf0a27a],[7.6,0xbfcbd9],[12,0xc7d0db],[17.2,0xc4ccd6],[18.4,0xf2a066],[19.3,0xb0607a],[20.2,0x2a2a4e],[21.2,0x0a0f1e],[24,0x0a0f1e]];
const _ca=new THREE.Color(),_cb=new THREE.Color();
function skyAt(h,out){for(let i=0;i<SKY_KEYS.length-1;i++){const [a,ca]=SKY_KEYS[i],[b,cb]=SKY_KEYS[i+1];if(h>=a&&h<=b){_ca.set(ca);_cb.set(cb);return out.copy(_ca).lerp(_cb,(h-a)/(b-a));}}return out.set(SKY_KEYS[0][1]);}
const SKYC=new THREE.Color(),FOGC=new THREE.Color();
function dayLength(){return {"12":12,"24":24,"48":48}[SET.cycle]||24;}
function updateDay(dt){
  const cyc=SET.cycle||"24";
  if(cyc==="jour")DAY.t=lerp(DAY.t,12,dt*0.5);else if(cyc==="nuit")DAY.t=lerp(DAY.t,23.2,dt*0.5);
  else if(!menuOpen)DAY.t=(DAY.t+dt*24/(dayLength()*60))%24;
  const h=DAY.t;
  // soleil (lever 6 h, coucher 19 h 30), puis lune
  const k=(h-6)/13.5,up=Math.sin(Math.PI*clamp(k,-0.1,1.1)),day=clamp01((up+0.08)*4);DAY.night=1-day;
  const az=lerp(-1.9,1.9,clamp01(k));const el=Math.max(0.08,up);
  if(day>0.02)DAYSUN.set(Math.sin(az)*13*Math.cos(el*1.2),13*Math.max(0.25,el),Math.cos(az)*5+4);else DAYSUN.set(5,12,-6);
  // météo : change toutes les quelques heures de jeu
  DAY.wT-=dt;if(DAY.wT<=0){DAY.wT=rand(140,320);if(SET.weather===false)DAY.weather="clair";else{const r=Math.random();DAY.weather=r<0.58?"clair":r<0.82?"nuageux":"pluie";}}
  const wantRain=DAY.weather==="pluie"?1:0,cloud=DAY.weather==="clair"?0:1;DAY.rainK=lerp(DAY.rainK,wantRain,1-Math.exp(-0.25*dt));DAY.cloudK=lerp(DAY.cloudK||0,cloud,1-Math.exp(-0.25*dt));
  // couleurs
  skyAt(h,SKYC);const grey=new THREE.Color(0x8a929c).multiplyScalar(0.35+0.65*day);SKYC.lerp(grey,DAY.cloudK*0.55+DAY.rainK*0.25);
  scene.background.copy(SKYC);FOGC.copy(SKYC);scene.fog.color.copy(FOGC);
  const warm=clamp01(1-Math.abs(up)*3.2)*day;
  sun.color.setRGB(1,lerp(0.94,0.62,warm),lerp(0.86,0.42,warm));sun.intensity=day>0.02?2.6*day*(1-DAY.cloudK*0.55):0.22;if(day<=0.02)sun.color.setRGB(0.5,0.58,0.9);
  if(hemi){hemi.intensity=lerp(0.17,0.55,day)*(1-DAY.cloudK*0.2)+DAY.cloudK*0.06*day;hemi.color.setRGB(lerp(0.35,0.9,day),lerp(0.42,0.93,day),lerp(0.75,1,day));hemi.groundColor.setRGB(lerp(0.08,0.43,day),lerp(0.08,0.4,day),lerp(0.12,0.37,day));}
  {const lv=day>0.7?0:day>0.4?1:day>0.15?2:3;if(scene.environment!==ENV_LV[lv])scene.environment=ENV_LV[lv];}renderer.toneMappingExposure=lerp(0.92,0.95,day);
  // lumières de la ville
  const n=clamp01((DAY.night-0.25)/0.6);
  if(Math.abs(n-DAY.last)>0.01){DAY.last=n;for(const [m,s] of NIGHT_MATS)m.emissiveIntensity=n*s;OM.lamp.emissiveIntensity=0.6+n*2.6;
    for(const m of texCache.values())if(m&&m.isMaterial&&m.emissiveMap&&!NIGHT_MATS.some(q=>q[0]===m)){if(m.userData.e0===undefined)m.userData.e0=m.emissiveIntensity;m.emissiveIntensity=m.userData.e0*(1+n*2.4);}}
  // étoiles, lune, pluie
  skyStars.position.copy(camera.position);skyStars.scale.setScalar(camera.far*0.92);skyStars.material.opacity=clamp01((DAY.night-0.5)*2)*(1-DAY.cloudK*0.85);
  moon.position.copy(camera.position).add(new V3(-0.35,0.55,-0.76).multiplyScalar(camera.far*0.85));moon.scale.setScalar(camera.far*0.025);moon.material.opacity=clamp01((DAY.night-0.4)*2)*(1-DAY.cloudK*0.7);
  rain.visible=DAY.rainK>0.03;if(rain.visible){rain.material.opacity=DAY.rainK*0.55;const P=rain.geometry.attributes.position,a=P.array,fall=dt*22;
    for(let i=0;i<a.length;i+=6){a[i+1]-=fall;a[i+4]-=fall;if(a[i+4]<-2){const y=28+Math.random()*4;a[i+1]=y;a[i+4]=y-0.7;}}P.needsUpdate=true;rain.position.set(camera.position.x,camera.position.y-10,camera.position.z);}
  rainSound(DAY.rainK);
  scene.fog.far=Math.min(scene.fog.far,lerp(scene.fog.far,LOAD_R*CHUNK+15,DAY.rainK*0.6));
  const nk=clamp01((DAY.night-0.3)/0.5);
  nightLight.intensity=nk*(drive?0.6:2.2);nightLight.position.set(player.root.x+1.5,player.root.y+4.5,player.root.z+1);
  if(drive&&nk>0){const V=drive,f=fwdOf(V.yaw);headLight.intensity=nk*(V.boat?18:30);headLight.position.set(V.x+f.x*1.8,V.y+1.1,V.z+f.z*1.8);headLight.target.position.set(V.x+f.x*20,V.y-1,V.z+f.z*20);}else headLight.intensity=0;
  updateClock();
}
const clockEl=document.createElement("div");clockEl.id="clock";document.body.appendChild(clockEl);
{const st=document.createElement("style");st.textContent=`#clock{position:fixed;left:22px;bottom:196px;color:#fff;font:700 13px system-ui;text-shadow:0 1px 3px #000;pointer-events:none;background:rgba(16,18,24,.55);padding:3px 8px;border-radius:9px}
.touch #clock{bottom:auto;top:92px;left:12px;font-size:11px;padding:2px 6px}body.mapOn #clock{display:none}`;document.head.appendChild(st);}
let clockLast="";
function updateClock(){const h=Math.floor(DAY.t),m=Math.floor((DAY.t-h)*60/5)*5,ic=DAY.weather==="pluie"?"🌧":DAY.weather==="nuageux"?"☁":DAY.night>0.6?"🌙":"☀",t=`${ic} ${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}`;if(t!==clockLast){clockLast=t;clockEl.textContent=t;}}
