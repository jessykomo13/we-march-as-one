// ================================================================ MODULE 26 : conduite
// E (ou le bouton « Conduire ») près d'une voiture garée : on la vole et on la conduit. Conduite arcade :
// accélération, freinage, marche arrière, frein à main (dérapages), suspension qui suit le relief, sauts,
// collisions avec les murs, les voitures et les piétons (renversés = délit). E pour descendre.
// PC : Z/W accélérer · S freiner/reculer · Q/A D tourner · Espace frein à main · F klaxon · E descendre
// Mobile : joystick (haut = gaz, bas = frein, côtés = direction), Frein à main, Klaxon, Descendre
// Manette : stick gauche direction, RT gaz, LT frein, A frein à main, X klaxon, Croix ↑ descendre
const VEH=[];let drive=null;
const TAKEN=new Set();                       // voitures garées déjà volées (elles ne réapparaissent pas)
const carKey=(x,z)=>Math.round(x*2)+"|"+Math.round(z*2);
const hintEl=document.createElement("div");hintEl.id="ctxHint";document.body.appendChild(hintEl);let hintCk=0;
const speedoEl=document.createElement("div");speedoEl.id="speedo";document.body.appendChild(speedoEl);
{const st=document.createElement("style");st.textContent=`
#speedo{position:fixed;left:50%;bottom:70px;transform:translateX(-50%);display:none;pointer-events:none;color:#fff;font:800 26px system-ui;text-shadow:0 2px 6px #000;text-align:center;line-height:1}
#ctxHint{position:fixed;left:50%;bottom:96px;transform:translateX(-50%);display:none;pointer-events:none;color:#fff;font:600 14px system-ui;background:rgba(16,18,24,.7);padding:6px 12px;border-radius:10px}
.touch #ctxHint{display:none!important}
body.driving #ctxHint{bottom:124px}
#speedo small{display:block;font:600 11px system-ui;opacity:.8;letter-spacing:.08em}
.touch #speedo{bottom:auto;top:84px;left:auto;right:16px;transform:none;font-size:22px;text-align:right}
body.driving.touch #kickBtn,body.driving.touch #crouchBtn,body.driving.touch #aimBtn,body.driving.touch #lootBtn{display:none!important}
body.driving.touch #runBtn{display:none!important}`;document.head.appendChild(st);}
function makeVehicle(x,z,yawDeg,paint,kind){
  const m=carMesh(paint,kind,null,true);scene.add(m);m.traverse(o=>{if(o.isMesh){o.castShadow=true;}});
  const head=driverDummy();head.visible=false;m.add(head);
  const mk=carModelOf(kind),spec=CAR_MODELS[mk];head.position.set(spec.W*0.21,(spec.seat||0)+(spec.y0-0.28)*0.5,spec.cab?spec.cab[2]+0.15:spec.L/2-1.6);
  const V={m,head,x,z,yaw:yawDeg,vel:new V3(),v:0,steer:0,y:groundAt(x,z),vy:0,paint,kind,hp:100,van:mk==="van",owned:false,lastUse:clockT,o:null,pitch:0,roll:0,sink:0,spec,model:mk,spin:0,gk:1,wheels:m.userData.wheels||[],tail:m.userData.tail};
  V.o=addObstacle({type:"circle",x,z,r:1.25,veh:V});VEH.push(V);placeVehicle(V);return V;
}
function placeVehicle(V){V.m.position.set(V.x,V.y,V.z);V.m.rotation.set(0,Math.PI-V.yaw*D2R,0,"YXZ");V.m.rotation.x=V.pitch;V.m.rotation.z=V.roll;}
function removeVehicle(V){scene.remove(V.m);if(V.o){removeObstacle(V.o);V.o=null;}const i=VEH.indexOf(V);if(i>=0)VEH.splice(i,1);}
// silhouette du conducteur (buste + tête + cheveux) aux couleurs du joueur
function driverDummy(){const g=new THREE.Group();g.userData.parts={torso:put(BX(0.46,0.5,0.28),mat({color:"#335"}),0,0.98,0,g),head:put(geo("drvHead",()=>new THREE.SphereGeometry(0.13,10,8)),mat({color:"#e3ac88"}),0,1.33,0,g),
  hair:put(geo("drvHair",()=>new THREE.SphereGeometry(0.135,10,6,0,Math.PI*2,0,Math.PI/2)),mat({color:"#222"}),0,1.35,-0.01,g)};
  for(const s of [-1,1]){const a=put(BX(0.11,0.11,0.42),g.userData.parts.torso.material,s*0.2,1.0,0.25,g);a.rotation.x=-0.5;}return g;}
function dressDriver(g){const L=playerLook||{},P=g.userData.parts;P.torso.material.color.set(L.jacket||L.topColor||"#335");P.head.material.color.set(L.skin||"#e3ac88");P.hair.material.color.set(L.hairColor||"#222");P.hair.visible=L.hair!=="bald";}
// voiture garée la plus proche (cuite dans le décor) ou véhicule libre
function nearestCar(p,R=3.4){
  let best=null,bd=R;
  for(const V of VEH){if(V===drive||V.dead)continue;const d=Math.hypot(V.x-p.x,V.z-p.z);if(d<bd){bd=d;best={V};}}
  for(const o of obsAt(p)){if(!o.pcar)continue;const d=Math.max(0,obstacleClosest(o,p).d);if(d<bd-1.2){bd=d+1.2;best={pc:o.pcar,o};}}
  return best;
}
// on « retire » la voiture cuite du décor (ses triangles sont repliés) et on la remplace par une vraie
function unbakeParked(pc){for(const R of pc.ranges||[]){const P=R.mesh.geometry.attributes.position;for(let k=R.start;k<R.start+R.count;k++)P.setXYZ(k,pc.x,-60,pc.z);P.needsUpdate=true;}}
function tryEnterVehicle(){
  if(drive||player.ko||player.fly||player.sit.state!=="none")return false;
  const n=nearestCar(player.root);if(!n)return false;
  if(player.swim&&!(n.V&&n.V.boat))return false;
  if(n.pc||(n.V&&n.V.locked))return startTheft(n);   // on doit d'abord la voler (vitre, crochetage, double des clés)
  enterVehicle(n.V);return true;
}
function enterVehicle(V){
  drive=V;if(V.o){removeObstacle(V.o);V.o=null;}
  player.rig.model.visible=false;V.head.visible=true;dressDriver(V.head);document.body.classList.add("driving");
  player.vel.set(0,0,0);V.lastUse=clockT;DRV.camDist0=cam.dist;
  if(V.stolen&&!V.owned){V.owned=true;// vol de voiture : délit si quelqu'un le voit
    if(!V.quiet){const victim={isCop:false,_crime:null,brain:{},root:V.m.position};registerCrime(victim,false);}
    hudMsg(V.spec?`${V.spec.name} volée ! `+pick(["Fonce !","Le moteur démarre…","Tu as forcé la portière."]):"Voiture volée !");}
  else hudMsg(V.boat?(V.kind==="airboat"?"Hydroglisseur ! Fonce dans le bayou":"À la barre !"):V.spec?V.spec.name+" — en voiture !":"En voiture !");
  if(!V.boat){DRV.fov0=camera.fov;}
  engineNodes();playSound("slap",0.06);if(!V.boat&&RADIO.st===0&&!RADIO.auto){RADIO.auto=true;radioNext();}
}
function exitVehicle(force){
  const V=drive;if(!V)return;
  if(!force&&Math.abs(V.v)>4){hudMsg("Ralentis pour descendre");return;}
  const f=fwdOf(V.yaw),r=rightOf(V.yaw);
  let p=null;
  if(V.boat){p=boatExitSpot(V);if(!p){drive=null;V.head.visible=false;V.v=0;V.vel.set(0,0,0);V.o=addObstacle({type:"circle",x:V.x,z:V.z,r:1.5,veh:V});
      player.root.set(V.x+r.x*2.4,WATER_Y-1.2,V.z+r.z*2.4);player.swim={t:0,dive:0};player.gy=WATER_Y-1.2;player.lastOk.copy(player.root);player.rig.model.visible=true;document.body.classList.remove("driving");speedoEl.style.display="none";
      if(DRV.eng)DRV.eng.g.gain.setTargetAtTime(0,actx.currentTime,0.1);cam.dist=DRV.camDist0||cam.dist;hudMsg("Plouf ! Tu nages.");return;}}
  else for(const side of [-1,1]){const q=new V3(V.x,0,V.z).addScaledVector(r,side*2.0).addScaledVector(f,0.3);pushOutOfObstacles(q,0.45);if(hdist(q,new V3(V.x,0,V.z))>1.3){p=q;break;}}
  if(!p)p=new V3(V.x,0,V.z).addScaledVector(f,-3.2);
  drive=null;V.head.visible=false;V.v=0;V.vel.set(0,0,0);V.o=addObstacle({type:"circle",x:V.x,z:V.z,r:V.boat?1.5:1.25,veh:V});
  player.root.set(p.x,0,p.z);player.yaw=player.targetYaw=V.yaw;player.vel.set(0,0,0);player.setRig(player.rig,true);player.gy=player.root.y=groundAt(p.x,p.z);player.lastOk.copy(player.root);
  player.rig.model.visible=true;document.body.classList.remove("driving");speedoEl.style.display="none";
  if(DRV.eng)DRV.eng.g.gain.setTargetAtTime(0,actx.currentTime,0.1);
  cam.dist=DRV.camDist0||cam.dist;if(DRV.fov0){camera.fov=DRV.fov0;camera.updateProjectionMatrix();DRV.fov0=null;}if(DRV.skid)DRV.skid.g.gain.setTargetAtTime(0,actx.currentTime,0.05);SKID.last=[null,null];
}
// --- son du moteur (oscillateurs filtrés)
const DRV={eng:null,camDist0:null,horn:0,steerT:0,fov0:null,skid:null};
const BRAKEL=mat({color:0xff3020,emissive:0xff2010,emissiveIntensity:1.4});
// traces de pneus : un tampon circulaire de quadrilatères
const SKID={n:900,i:0,geo:null,last:[null,null]};
function skidAdd(k,x,y,z,w){
  if(!SKID.geo){const g=new THREE.BufferGeometry();g.setAttribute("position",new THREE.BufferAttribute(new Float32Array(SKID.n*18),3));const m=new THREE.Mesh(g,new THREE.MeshBasicMaterial({color:0x101010,transparent:true,opacity:0.5,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2}));m.frustumCulled=false;m.renderOrder=1;scene.add(m);SKID.geo=g;}
  const L=SKID.last[k];if(!L){SKID.last[k]={x,y,z};return;}const dx=x-L.x,dz=z-L.z,d=Math.hypot(dx,dz);if(d<0.25)return;SKID.last[k]={x,y,z};if(d>3)return;
  const px=-dz/d*w/2,pz=dx/d*w/2,P=SKID.geo.attributes.position.array,o=SKID.i*18;
  const q=[L.x+px,L.y,L.z+pz, L.x-px,L.y,L.z-pz, x+px,y,z+pz, x+px,y,z+pz, L.x-px,L.y,L.z-pz, x-px,y,z-pz];for(let j=0;j<18;j++)P[o+j]=q[j];
  SKID.i=(SKID.i+1)%SKID.n;SKID.geo.attributes.position.needsUpdate=true;}
function engineNodes(){const c=audio();if(!c||DRV.eng)return;try{const g=c.createGain();g.gain.value=0;const f=c.createBiquadFilter();f.type="lowpass";f.frequency.value=600;
  const o1=c.createOscillator(),o2=c.createOscillator();o1.type="sawtooth";o2.type="square";o1.connect(f);o2.connect(f);f.connect(g);g.connect(sfxOut());o1.start();o2.start();DRV.eng={g,f,o1,o2};
  const n=c.createBufferSource(),b=c.createBuffer(1,c.sampleRate,c.sampleRate),a=b.getChannelData(0);for(let i=0;i<a.length;i++)a[i]=Math.random()*2-1;n.buffer=b;n.loop=true;
  const bp=c.createBiquadFilter();bp.type="bandpass";bp.frequency.value=1100;bp.Q.value=4;const sg=c.createGain();sg.gain.value=0;n.connect(bp).connect(sg).connect(sfxOut());n.start();DRV.skid={g:sg,bp};}catch(e){}}
// --- entrées
function driveInput(){
  let thr=0,st=0,hand=false;
  if(keys.has("KeyW")||keys.has("ArrowUp"))thr+=1;if(keys.has("KeyS")||keys.has("ArrowDown"))thr-=1;
  if(keys.has("KeyD")||keys.has("ArrowRight"))st+=1;if(keys.has("KeyA")||keys.has("ArrowLeft"))st-=1;
  hand=keys.has("Space")||guardTouch;
  const curve=v=>Math.sign(v)*Math.pow(Math.abs(v),1.6);
  thr+=touchMove.y;st+=curve(touchMove.x);
  if(pad.on){const gp=[...navigator.getGamepads()].find(g=>g&&g.connected);if(gp){st+=curve(pad.move.x);const rt=gp.buttons[7]?.value||0,lt=gp.buttons[6]?.value||0;thr+=rt-lt;if(gp.buttons[0]?.pressed)hand=true;if(gp.buttons[2]?.pressed)DRV.horn=0.3;}}
  if(keys.has("KeyF")||atkRequest){DRV.horn=0.25;atkRequest=null;}
  return {thr:clamp(thr,-1,1),st:clamp(st,-1,1),hand};
}
// --- physique (vue de dessus : vitesse avant + glisse latérale) et relief
function stepVehicle(V,dt,inp){
  const M=V.spec||CAR_MODELS.berline,f=fwdOf(V.yaw),r=rightOf(V.yaw);
  let vf=V.vel.dot(f),vl=V.vel.dot(r);
  const road=inGridArea(V.x,V.z)?true:onAnyRoad(V.x,V.z,1)||rectDist(AIR_RECT,V.x,V.z)<1;
  const g0=groundAt(V.x,V.z),air=V.y>g0+0.12;
  const maxV=M.vmax*(road?1:M.off)*(V.hp<30?0.6:1)*(V.flat?0.55:1),acc=M.acc*(V.flat?0.7:1);
  if(!air){
    if(inp.thr>0.05){if(vf<-0.5)vf+=22*M.brake*inp.thr*dt;else{const k=clamp01(vf/maxV);vf+=acc*inp.thr*(1-k*k)*(vf<6?1.15:1)*dt;}}
    else if(inp.thr<-0.05){if(vf>0.5)vf-=24*M.brake*(-inp.thr)*dt;else vf=Math.max(-10,vf-7*(-inp.thr)*dt);}
    else vf-=Math.sign(vf)*Math.min(Math.abs(vf),(road?1.4:3.8)*dt);
    if(vf>maxV)vf=lerp(vf,maxV,1-Math.exp(-2*dt));
  }
  vf-=vf*Math.abs(vf)*0.00035*dt; // traînée
  // direction : rapide à basse vitesse, douce à haute vitesse, recentrage automatique
  const sp=Math.abs(vf),maxSt=lerp(M.steer,M.steer*0.24,clamp01(sp/45));
  V.steer=lerp(V.steer,inp.st*maxSt,1-Math.exp(-(inp.st?(sp>20?5:8):11)*dt));
  if(!air){const yawRate=vf/(M.wb*2)*Math.tan(V.steer)*(inp.hand?1.5:1);V.yaw+=yawRate/D2R*dt;}
  // adhérence latérale : frein à main → dérapage ; puissance + braquage → léger survirage (muscle, supercars)
  const want=inp.hand?0.14:1;V.gk=lerp(V.gk,want,1-Math.exp(-(want<V.gk?12:2.2)*dt));
  const grip=air?0.3:M.grip*(road?1:0.6)*V.gk*(V.flat?0.6:1);
  if(V.flat&&!air&&Math.abs(vf)>8&&Math.random()<dt*10)puff(V.x-f.x*M.wb,V.y+0.15,V.z-f.z*M.wb,0,0.35);
  if(M.slide&&!air&&inp.thr>0.8&&Math.abs(inp.st)>0.5&&sp>8&&sp<30)vl+=Math.sign(V.steer)*-M.slide*2.2*dt*sp/10;
  vl*=Math.exp(-grip*dt);if(inp.hand&&!air)vf-=Math.sign(vf)*Math.min(Math.abs(vf),4*dt);
  const f2=fwdOf(V.yaw),r2=rightOf(V.yaw);V.vel.copy(f2).multiplyScalar(vf).addScaledVector(r2,vl);V.v=vf;
  V.x+=V.vel.x*dt;V.z+=V.vel.z*dt;
  // crissements et traces de pneus
  const skidK=air?0:clamp01((Math.abs(vl)-2)/5)+(inp.hand&&sp>6?0.6:0)+(inp.thr<-0.5&&vf>14?0.5:0)+(inp.thr>0.9&&sp<5&&M.acc>12?0.4:0);
  V.skid=lerp(V.skid||0,clamp01(skidK),1-Math.exp(-10*dt));
  for(let k=0;k<2;k++){const sx=(k?1:-1)*(M.W/2-0.13),wx=V.x+r2.x*sx-f2.x*M.wb,wz=V.z+r2.z*sx-f2.z*M.wb;if(V.skid>0.3)skidAdd(k,wx,groundAt(wx,wz)+0.025,wz,M.ww||0.26);else SKID.last[k]=null;}
  if(V.skid>0.5&&Math.random()<dt*14)puff(V.x-f2.x*M.wb,V.y+0.3,V.z-f2.z*M.wb,0,0.5);
  // roues : rotation et braquage
  V.spin+=vf/M.r*dt;for(const w of V.wheels){w.rotation.x=V.spin;if(w.userData.front)w.rotation.y=-V.steer*1.1;}
  if(V.tail)V.tail.material=inp.thr<-0.05&&vf>0.5?BRAKEL:TAILL;
  // collisions : deux cercles (avant / arrière) contre les obstacles
  let hit=0;const kk=M.L/2-0.75,rr=M.W/2+0.12;
  for(const k of [kk,-kk]){const p=new V3(V.x+f2.x*k,0,V.z+f2.z*k);
    for(const o of obsAt(p)){if(o.veh===V)continue;const c=obstacleClosest(o,p);if(c.d<rr){const push=rr-c.d;V.x+=c.nx*push;V.z+=c.nz*push;const imp=-(V.vel.x*c.nx+V.vel.z*c.nz);if(imp>0){V.vel.x+=c.nx*imp*1.2;V.vel.z+=c.nz*imp*1.2;V.vel.multiplyScalar(1-Math.min(0.25,imp*0.01));hit=Math.max(hit,imp);}}}}
  // autres véhicules (garés libres, circulation)
  for(const W of VEH){if(W===V)continue;const dx=V.x-W.x,dz=V.z-W.z,d=Math.hypot(dx,dz);if(d<2.6&&d>1e-3){const nx=dx/d,nz=dz/d,push=(2.6-d)/2;V.x+=nx*push;V.z+=nz*push;W.x-=nx*push;W.z-=nz*push;if(W.o){W.o.x=W.x;W.o.z=W.z;}const imp=-(V.vel.x*nx+V.vel.z*nz);if(imp>0){V.vel.x+=nx*imp*0.8;V.vel.z+=nz*imp*0.8;hit=Math.max(hit,imp*0.6);}W.y=groundAt(W.x,W.z);placeVehicle(W);}}
  for(const c of cars){const p=c.m.position,dx=V.x-p.x,dz=V.z-p.z,d=Math.hypot(dx,dz);if(d<3.4&&d>1e-3){const nx=dx/d,nz=dz/d;V.x+=nx*(3.4-d);V.z+=nz*(3.4-d);const imp=-(V.vel.x*nx+V.vel.z*nz)+c.v*0.3;if(imp>0){V.vel.x+=nx*imp;V.vel.z+=nz*imp;hit=Math.max(hit,imp);}c.v*=0.3;}}
  for(const c of (MP.cars.length||PCH.list.length)?ccars.concat(MP.cars,PCH.list):ccars){const p=(c.g||c.m).position,dx=V.x-p.x,dz=V.z-p.z,d=Math.hypot(dx,dz);if(d<3.2&&d>1e-3){const nx=dx/d,nz=dz/d;V.x+=nx*(3.2-d);V.z+=nz*(3.2-d);const imp=-(V.vel.x*nx+V.vel.z*nz);if(imp>0){V.vel.x+=nx*imp;V.vel.z+=nz*imp;hit=Math.max(hit,imp);}c.v*=0.2;}}
  if(hit>4.5){V.hp=Math.max(0,V.hp-(hit<7?hit*0.35:hit*(hit>16?1.6:0.85))*(M.wedge?1.1:M.box?0.8:1));cam.shake=Math.min(1,cam.shake+hit*0.04);playSound("thud",Math.min(1,hit/12));rumble(200,Math.min(1,hit/15));if(hit>9&&player.hp>5){player.hp=Math.max(5,player.hp-Math.round(hit*0.4));floatText(player,"Choc !","#ffb07a");}}
  // piétons
  for(const w of walkers){if(w===player||w.ko||w.inCar)continue;const dx=w.root.x-V.x,dz=w.root.z-V.z,a=dx*f2.x+dz*f2.z,b=dx*r2.x+dz*r2.z;
    if(Math.abs(a)<M.L/2+0.3&&Math.abs(b)<M.W/2+0.3){const s=Math.abs(V.v);
      if(s>3.5){const dir=new V3(f2.x*Math.sign(V.v)+r2.x*Math.sign(b||1)*0.5,0,f2.z*Math.sign(V.v)+r2.z*Math.sign(b||1)*0.5).normalize();const dmg=Math.round(s*2.4);
        w.hp=Math.max(0,w.hp-dmg);w.lastHurt=clockT;w.vel.addScaledVector(dir,Math.min(9,s*0.4));w.startKO(dir,player,{getUp:w.hp>0?2.6:undefined,fast:true});playSound("thud",1);rumble(250,0.8);
        V.vel.multiplyScalar(0.82);registerCrime(w,true);if(w.brain&&w.brain.react===undefined){}}
      else{w.root.x+=r2.x*Math.sign(b||1)*0.08;w.root.z+=r2.z*Math.sign(b||1)*0.08;}}}
  // relief : le châssis suit le sol, sauts quand le sol se dérobe
  const g=groundAt(V.x,V.z);
  if(V.y>g+0.08){V.vy-=9.81*dt;V.y+=V.vy*dt;if(V.y<=g){if(V.vy<-6){cam.shake=Math.min(1,cam.shake+0.4);playSound("thud",0.6);}V.y=g;V.vy=0;}}
  else{const up=g-V.y;V.vy=up>0.02?Math.max(0,up/dt*0.5):0;V.y=g;}
  const gf=groundAt(V.x+f2.x*M.wb,V.z+f2.z*M.wb),gb=groundAt(V.x-f2.x*M.wb,V.z-f2.z*M.wb),gr=groundAt(V.x+r2.x*0.9,V.z+r2.z*0.9),gl=groundAt(V.x-r2.x*0.9,V.z-r2.z*0.9);
  V.pitch=lerp(V.pitch,clamp(Math.atan2(gf-gb,M.wb*2),-0.5,0.5)+clamp(-(vf-V._vf0||0)*0.004,-0.05,0.05),1-Math.exp(-10*dt));V._vf0=vf;
  V.roll=lerp(V.roll,clamp(Math.atan2(gl-gr,1.8),-0.4,0.4)+clamp(-V.steer*vf*0.004,-0.06,0.06),1-Math.exp(-10*dt));
  V.x=clamp(V.x,W_MIN+40,W_MAX-40);V.z=clamp(V.z,W_MIN+40,W_MAX-40);
  placeVehicle(V);
  // eau profonde : la voiture coule
  if(waterDepth(V.x,V.z)>1.0&&V.y<WATER_Y+0.3){V.sink+=dt;}
}
// la circulation voit la voiture du joueur (elle freine derrière)
function vehicleAhead(c,laneC,ns){if(!drive)return 999;const V=drive,o=ns?V.x:V.z,s=ns?V.z:V.x;if(Math.abs(o-laneC)>2)return 999;const d=(s-c.s)*c.dir;return d>0?Math.max(0,d-5):999;}
function updateVehicles(dt){
  updateBoatSpots(dt);updateSails(dt);updateDamage(dt);updateRadio(dt);
  hintCk-=dt;if(hintCk<=0){hintCk=0.25;const t=drive?(Math.abs(drive.v)<4?"E : descendre · F : klaxon · Espace : frein à main":""):(player.sit.state==="none"&&!player.ko&&nearStoppedCar()?"E : braquer la voiture":player.sit.state==="none"&&!player.ko&&nearestCar(player.root,3.2)?(nearestCar(player.root,3.2).V?.boat?"E : piloter":nearestCar(player.root,3.2).V&&!nearestCar(player.root,3.2).V.locked?"E : conduire":"E : voler la voiture"):"");const ih=!drive&&!t?interiorHint():null;const t2=t||(!drive&&secretNear()?"E : fouiller":ih?ih[0]:"");hintEl.style.display=t2?"block":"none";hintEl.textContent=t2;if(0)hintEl.textContent=t;}
  if(drive){
    const V=drive;
    if(player.ko||player.hp<=0){exitVehicle(true);return;}
    if(sitRequest){sitRequest=false;exitVehicle(false);}
    if(drive){const inp=menuOpen||mapOpen?{thr:0,st:0,hand:true}:driveInput();(V.boat?stepBoat:stepVehicle)(V,dt,inp);
      player.root.set(V.x,V.y,V.z);player.gy=V.y;player.lastOk.copy(player.root);player.yaw=player.targetYaw=V.yaw;player.vel.copy(V.vel);player.air=null;player.swim=null;
      const spd=Math.abs(V.v),cd=(V.boat?7.2:(V.spec&&V.spec.box?7.8:6.6))+Math.min(2.2,spd*0.045);if(Math.abs(cam.dist-cd)>0.05&&clockT-lastCamInput>0.6)cam.dist=lerp(cam.dist,cd,1-Math.exp(-2.5*dt));
      if(clockT-lastCamInput>1.0&&spd>2){const slip=V.vel.lengthSq()>4?Math.atan2(V.vel.x,-V.vel.z)/D2R:V.yaw;const want=V.v>0?(V.skid>0.4?V.yaw+deltaAngle(V.yaw,slip)*0.5:V.yaw):V.yaw+180;cam.yaw+=deltaAngle(cam.yaw,want)*(1-Math.exp(-3.2*dt));cam.pitch=lerp(cam.pitch,10,1-Math.exp(-1.5*dt));}
      if(DRV.fov0&&!V.boat){const fv=DRV.fov0+Math.min(14,spd*0.22);if(Math.abs(camera.fov-fv)>0.2){camera.fov=lerp(camera.fov,fv,1-Math.exp(-3*dt));camera.updateProjectionMatrix();}}
      const kmh=Math.round(Math.abs(V.v)*3.6);speedoEl.style.display="block";speedoEl.innerHTML=`${kmh}<small>KM/H${V.hp<40?" · MOTEUR ABÎMÉ":""}${V.flat?" · PNEUS CREVÉS":""}</small>`;
      if(DRV.eng){const t=actx.currentTime,vm=V.spec?V.spec.vmax:40,sp=Math.abs(V.v),seg=vm/5,gear=Math.min(4,Math.floor(sp/seg)),rpm=V.boat?0.25+sp/40:0.3+clamp01((sp-gear*seg)/seg)*0.75+gear*0.06,hi=V.spec&&V.spec.wedge?1.5:V.spec&&V.spec.slide?0.8:1;
        DRV.eng.o1.frequency.setTargetAtTime(((V.boat?60:38)+rpm*(V.boat?160:110))*hi,t,0.04);DRV.eng.o2.frequency.setTargetAtTime((19+rpm*55)*hi,t,0.04);if(DRV.skid)DRV.skid.g.gain.setTargetAtTime(menuOpen||V.boat?0:(V.skid||0)*0.09,t,0.05);DRV.eng.f.frequency.setTargetAtTime(300+rpm*900,t,0.05);DRV.eng.g.gain.setTargetAtTime(menuOpen?0:0.05+Math.min(0.06,Math.abs(inp.thr)*0.05),t,0.08);}
      if(DRV.horn>0){if(!DRV.hornOn){DRV.hornOn=true;hornSound(1);for(const w of walkers)if(w!==player&&!w.ko&&hdist(w.root,player.root)<12&&w.brain&&Math.random()<0.5)bark(w,["Hé, doucement !","Ça va pas ?!","Oh là !"]);}DRV.horn-=dt;}else DRV.hornOn=false;
      if(!V.boat&&V.sink>1.2){hudMsg("La voiture coule ! Nage !");const S=V;exitVehicle(true);player.root.set(S.x,WATER_Y-1.2,S.z);player.swim={t:0,dive:0};player.gy=WATER_Y-1.2;S.sinking=true;}
    }
  }
  // véhicules libres : se posent, coulent, disparaissent quand on est loin
  for(const V of VEH.slice()){if(V===drive)continue;
    if(V.sinking){V.y-=dt*0.6;placeVehicle(V);if(V.y<-4)removeVehicle(V);continue;}
    if(hdist(V.m.position,player.root)>400&&clockT-V.lastUse>20)removeVehicle(V);}
}
// bouton contextuel (mobile) : Conduire / Descendre
function driveCtx(sit){
  if(TH.cur){sit.style.display="none";return true;}
  if(drive){sit.style.display="block";sit.textContent=drive.boat?"Débarquer":"Descendre";document.getElementById("punchBtn").textContent="Klaxon";document.getElementById("guardBtn").textContent="Frein à main";return true;}
  document.getElementById("punchBtn").textContent=pwArmed()?"Tirer":"Poing";document.getElementById("guardBtn").textContent="Garde";
  {const ih=!player.swim&&player.sit.state==="none"?interiorHint():null;if(ih&&ih[1]&&!nearStoppedCar()&&!nearestCar(player.root,3.2)){sit.style.display="block";sit.textContent=ih[1];return true;}}
  if(player.sit.state==="none"&&!player.ko&&!player.swim&&nearStoppedCar()){sit.style.display="block";sit.textContent="Braquer";return true;}
  if(player.sit.state==="none"&&!player.ko){const n=nearestCar(player.root,3.2);if(n&&(!player.swim||n.V&&n.V.boat)){sit.style.display="block";sit.textContent=n.V&&n.V.boat?"Piloter":n.V&&!n.V.locked?"Conduire":"Voler";return true;}}
  return false;
}
// ================================================================ MODULE 28 : dégâts des véhicules
// Moteur abîmé : fumée grise, puis noire et des flammes ; à 0 le véhicule explose (on est éjecté), il reste une carcasse.
const SMOKE=[],SMOKE_GEO=new THREE.SphereGeometry(0.35,8,6);
const smokeMats=[0x9a9a9a,0x2a2a2a,0xff7a1a].map(c=>new THREE.MeshBasicMaterial({color:c,transparent:true,opacity:0.5,depthWrite:false}));
function puff(x,y,z,kind,size=1){if(SMOKE.length>90)return;const m=new THREE.Mesh(SMOKE_GEO,smokeMats[kind].clone());m.position.set(x,y,z);m.scale.setScalar(size);scene.add(m);SMOKE.push({m,t:0,life:kind===2?0.5:rand(1.4,2.2),vy:kind===2?2.5:rand(1,1.8),kind,s0:size});}
function updateSmoke(dt){for(let i=SMOKE.length-1;i>=0;i--){const S=SMOKE[i];S.t+=dt;S.m.position.y+=S.vy*dt;S.m.position.x+=dt*0.3;const k=S.t/S.life;S.m.scale.setScalar(S.s0*(1+k*(S.kind===2?0.3:2.5)));S.m.material.opacity=(S.kind===2?0.9:0.5)*(1-k);if(k>=1){scene.remove(S.m);S.m.material.dispose();SMOKE.splice(i,1);}}}
function boom(V){
  V.dead=true;const p=new V3(V.x,V.y+0.8,V.z);
  const fb=new THREE.Mesh(new THREE.SphereGeometry(1,16,12),new THREE.MeshBasicMaterial({color:0xffa030,transparent:true,opacity:0.9}));fb.position.copy(p);scene.add(fb);
  let t=0;const grow=()=>{t+=0.05;fb.scale.setScalar(1+t*9);fb.material.opacity=0.9*(1-t);if(t<1)setTimeout(grow,30);else{scene.remove(fb);fb.geometry.dispose();}};grow();
  for(let i=0;i<14;i++)puff(V.x+rand(-1.5,1.5),V.y+rand(0.5,2),V.z+rand(-1.5,1.5),i%3?1:2,rand(1,2));
  cam.shake=1;rumble(600,1);
  try{const c=actx;const t0=c.currentTime,n=c.createBufferSource(),b=c.createBuffer(1,c.sampleRate*1.5,c.sampleRate),a=b.getChannelData(0);for(let i=0;i<a.length;i++)a[i]=(Math.random()*2-1)*Math.pow(1-i/a.length,2.2);n.buffer=b;const f=c.createBiquadFilter();f.type="lowpass";f.frequency.value=700;const g=c.createGain();g.gain.value=0.9;n.connect(f).connect(g).connect(sfxOut());n.start(t0);}catch(e){}
  if(drive===V){exitVehicle(true);player.hp=Math.max(1,player.hp-35);const d=new V3(player.root.x-V.x,0,player.root.z-V.z).normalize();player.startKO(d,player,{getUp:2.6,fast:true});floatText(player,"BOUM ! -35","#ff6a3a");}
  for(const w of walkers){if(w===player||w.ko)continue;const d=hdist(w.root,p);if(d<7){const dir=new V3(w.root.x-V.x,0,w.root.z-V.z).normalize();w.hp=Math.max(0,w.hp-Math.round(40*(1-d/7)));w.startKO(dir,player,{getUp:w.hp>0?3:undefined,fast:true});}}
  // carcasse brûlée
  const burnt=mat({color:0x1e1c1a,roughness:1});V.m.traverse(o=>{if(o.isMesh&&o!==V.head)o.material=burnt;});V.head.visible=false;V.fireT=12;
  if(wanted&&!(CREA.on&&CREA.noCops)){const victim={isCop:false,_crime:null,brain:{},root:p};registerCrime(victim,true);}
}
function updateDamage(dt){
  updateSmoke(dt);
  for(const V of VEH){if(V.boat)continue;
    if(!V.dead&&V.hp<=0){boom(V);continue;}
    V.smT=(V.smT||0)-dt;const f=fwdOf(V.yaw),hx=V.x+f.x*1.7,hz=V.z+f.z*1.7;
    if(V.dead){if(V.fireT>0){V.fireT-=dt;if(V.smT<=0){V.smT=0.12;puff(V.x+rand(-0.6,0.6),V.y+1,V.z+rand(-0.6,0.6),Math.random()<0.4?2:1,1.2);}}continue;}
    if(V.hp<45&&V.smT<=0&&hdist(V.m.position,player.root)<80){V.smT=V.hp<20?0.08:0.25;puff(hx,V.y+1.1,hz,V.hp<20?1:0,0.7);if(V.hp<15)puff(hx,V.y+1.0,hz,2,0.6);}
    if(V.hp<15&&V===drive){V.burnT=(V.burnT||0)+dt;if(V.burnT>6)V.hp=0;}
  }
}
