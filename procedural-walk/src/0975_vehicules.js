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
#speedo small{display:block;font:600 11px system-ui;opacity:.8;letter-spacing:.08em}
.touch #speedo{bottom:auto;top:8px;font-size:22px}
body.driving.touch #kickBtn,body.driving.touch #crouchBtn,body.driving.touch #aimBtn,body.driving.touch #lootBtn{display:none!important}
body.driving.touch #runBtn{display:none!important}`;document.head.appendChild(st);}
function makeVehicle(x,z,yawDeg,paint,kind){
  const m=carMesh(paint,kind,null);scene.add(m);m.traverse(o=>{if(o.isMesh){o.castShadow=true;}});
  const head=driverDummy();head.position.set(0.38,0,0.15);head.visible=false;m.add(head);
  const V={m,head,x,z,yaw:yawDeg,vel:new V3(),v:0,steer:0,y:groundAt(x,z),vy:0,paint,kind,hp:100,van:kind==="van",owned:false,lastUse:clockT,o:null,pitch:0,roll:0,sink:0};
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
  for(const V of VEH){if(V===drive)continue;const d=Math.hypot(V.x-p.x,V.z-p.z);if(d<bd){bd=d;best={V};}}
  for(const o of obsAt(p)){if(!o.pcar)continue;const d=Math.max(0,obstacleClosest(o,p).d);if(d<bd-1.2){bd=d+1.2;best={pc:o.pcar,o};}}
  return best;
}
// on « retire » la voiture cuite du décor (ses triangles sont repliés) et on la remplace par une vraie
function unbakeParked(pc){for(const R of pc.ranges||[]){const P=R.mesh.geometry.attributes.position;for(let k=R.start;k<R.start+R.count;k++)P.setXYZ(k,pc.x,-60,pc.z);P.needsUpdate=true;}}
function tryEnterVehicle(){
  if(drive||player.ko||player.fly||player.sit.state!=="none")return false;
  const n=nearestCar(player.root);if(!n)return false;
  if(player.swim&&!(n.V&&n.V.boat))return false;
  let V=n.V;
  if(n.pc){const pc=n.pc;TAKEN.add(carKey(pc.x,pc.z));unbakeParked(pc);removeObstacle(n.o);
    V=makeVehicle(pc.x,pc.z,180-pc.ry/D2R,pc.paint,pc.kind);V.stolen=true;}
  enterVehicle(V);return true;
}
function enterVehicle(V){
  drive=V;if(V.o){removeObstacle(V.o);V.o=null;}
  player.rig.model.visible=false;V.head.visible=true;dressDriver(V.head);document.body.classList.add("driving");
  player.vel.set(0,0,0);V.lastUse=clockT;DRV.camDist0=cam.dist;
  if(V.stolen&&!V.owned){V.owned=true;// vol de voiture : délit si quelqu'un le voit
    const victim={isCop:false,_crime:null,brain:{},root:V.m.position};registerCrime(victim,false);
    hudMsg(pick(["Voiture volée !","Tu as forcé la portière…","Le moteur démarre. Fonce !"]));}
  else hudMsg(V.boat?(V.kind==="airboat"?"Hydroglisseur ! Fonce dans le bayou":"À la barre !"):"En voiture !");
  engineNodes();playSound("slap",0.06);
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
  cam.dist=DRV.camDist0||cam.dist;
}
// --- son du moteur (oscillateurs filtrés)
const DRV={eng:null,camDist0:null,horn:0,steerT:0};
function engineNodes(){const c=audio();if(!c||DRV.eng)return;try{const g=c.createGain();g.gain.value=0;const f=c.createBiquadFilter();f.type="lowpass";f.frequency.value=600;
  const o1=c.createOscillator(),o2=c.createOscillator();o1.type="sawtooth";o2.type="square";o1.connect(f);o2.connect(f);f.connect(g);g.connect(sfxOut());o1.start();o2.start();DRV.eng={g,f,o1,o2};}catch(e){}}
// --- entrées
function driveInput(){
  let thr=0,st=0,hand=false;
  if(keys.has("KeyW")||keys.has("ArrowUp"))thr+=1;if(keys.has("KeyS")||keys.has("ArrowDown"))thr-=1;
  if(keys.has("KeyD")||keys.has("ArrowRight"))st+=1;if(keys.has("KeyA")||keys.has("ArrowLeft"))st-=1;
  hand=keys.has("Space")||guardTouch;
  thr+=touchMove.y;st+=touchMove.x;
  if(pad.on){const gp=[...navigator.getGamepads()].find(g=>g&&g.connected);if(gp){st+=pad.move.x;const rt=gp.buttons[7]?.value||0,lt=gp.buttons[6]?.value||0;thr+=rt-lt;if(gp.buttons[0]?.pressed)hand=true;if(gp.buttons[2]?.pressed)DRV.horn=0.3;}}
  if(keys.has("KeyF")||atkRequest){DRV.horn=0.25;atkRequest=null;}
  return {thr:clamp(thr,-1,1),st:clamp(st,-1,1),hand};
}
// --- physique (vue de dessus : vitesse avant + glisse latérale) et relief
function stepVehicle(V,dt,inp){
  const f=fwdOf(V.yaw),r=rightOf(V.yaw);
  let vf=V.vel.dot(f),vl=V.vel.dot(r);
  const road=inGridArea(V.x,V.z)?!blockOf(V.x,V.z)||true:onAnyRoad(V.x,V.z,1)||rectDist(AIR_RECT,V.x,V.z)<1;
  const maxV=(V.van?30:40)*(road?1:0.55)*(V.hp<30?0.6:1),acc=V.van?7:10;
  if(inp.thr>0.05){if(vf<-0.5)vf+=18*inp.thr*dt;else vf+=acc*inp.thr*(1-clamp01(vf/maxV))*dt;}
  else if(inp.thr<-0.05){if(vf>0.5)vf-=20*(-inp.thr)*dt;else vf=Math.max(-9,vf-6*(-inp.thr)*dt);}
  else vf-=Math.sign(vf)*Math.min(Math.abs(vf),(road?1.2:3.5)*dt);
  if(vf>maxV)vf=lerp(vf,maxV,1-Math.exp(-2*dt));
  vf-=vf*0.02*dt;
  // direction : moins de braquage à haute vitesse
  const sp=Math.abs(vf),maxSt=lerp(0.62,0.14,clamp01(sp/38));V.steer=lerp(V.steer,inp.st*maxSt,1-Math.exp(-(inp.st?7:10)*dt));
  const yawRate=vf/2.7*Math.tan(V.steer)*(inp.hand?1.45:1);V.yaw+=yawRate/D2R*dt;
  // adhérence latérale : faible au frein à main → dérapage
  const grip=inp.hand?1.6:(road?11:6);vl*=Math.exp(-grip*dt);if(inp.hand)vf-=Math.sign(vf)*Math.min(Math.abs(vf),5*dt);
  const f2=fwdOf(V.yaw),r2=rightOf(V.yaw);V.vel.copy(f2).multiplyScalar(vf).addScaledVector(r2,vl);V.v=vf;
  V.x+=V.vel.x*dt;V.z+=V.vel.z*dt;
  // collisions : deux cercles (avant / arrière) contre les obstacles
  let hit=0;
  for(const k of [1.55,-1.55]){const p=new V3(V.x+f2.x*k,0,V.z+f2.z*k);
    for(const o of obsAt(p)){if(o.veh===V)continue;const c=obstacleClosest(o,p);const rr=1.05;if(c.d<rr){const push=rr-c.d;V.x+=c.nx*push;V.z+=c.nz*push;const imp=-(V.vel.x*c.nx+V.vel.z*c.nz);if(imp>0){V.vel.x+=c.nx*imp*1.25;V.vel.z+=c.nz*imp*1.25;hit=Math.max(hit,imp);}}}}
  // autres véhicules (garés libres, circulation)
  for(const W of VEH){if(W===V)continue;const dx=V.x-W.x,dz=V.z-W.z,d=Math.hypot(dx,dz);if(d<2.6&&d>1e-3){const nx=dx/d,nz=dz/d,push=(2.6-d)/2;V.x+=nx*push;V.z+=nz*push;W.x-=nx*push;W.z-=nz*push;if(W.o){W.o.x=W.x;W.o.z=W.z;}const imp=-(V.vel.x*nx+V.vel.z*nz);if(imp>0){V.vel.x+=nx*imp*0.8;V.vel.z+=nz*imp*0.8;hit=Math.max(hit,imp*0.6);}W.y=groundAt(W.x,W.z);placeVehicle(W);}}
  for(const c of cars){const p=c.m.position,dx=V.x-p.x,dz=V.z-p.z,d=Math.hypot(dx,dz);if(d<3.4&&d>1e-3){const nx=dx/d,nz=dz/d;V.x+=nx*(3.4-d);V.z+=nz*(3.4-d);const imp=-(V.vel.x*nx+V.vel.z*nz)+c.v*0.3;if(imp>0){V.vel.x+=nx*imp;V.vel.z+=nz*imp;hit=Math.max(hit,imp);}c.v*=0.3;}}
  if(hit>4){V.hp=Math.max(0,V.hp-hit*1.2);cam.shake=Math.min(1,cam.shake+hit*0.04);playSound("thud",Math.min(1,hit/12));rumble(200,Math.min(1,hit/15));if(hit>9&&player.hp>5){player.hp=Math.max(5,player.hp-Math.round(hit*0.4));floatText(player,"Choc !","#ffb07a");}}
  // piétons
  for(const w of walkers){if(w===player||w.ko)continue;const dx=w.root.x-V.x,dz=w.root.z-V.z,a=dx*f2.x+dz*f2.z,b=dx*r2.x+dz*r2.z;
    if(Math.abs(a)<2.5&&Math.abs(b)<1.25){const s=Math.abs(V.v);
      if(s>3.5){const dir=new V3(f2.x*Math.sign(V.v)+r2.x*Math.sign(b||1)*0.5,0,f2.z*Math.sign(V.v)+r2.z*Math.sign(b||1)*0.5).normalize();const dmg=Math.round(s*2.4);
        w.hp=Math.max(0,w.hp-dmg);w.lastHurt=clockT;w.vel.addScaledVector(dir,Math.min(9,s*0.4));w.startKO(dir,player,{getUp:w.hp>0?2.6:undefined,fast:true});playSound("thud",1);rumble(250,0.8);
        V.vel.multiplyScalar(0.82);registerCrime(w,true);if(w.brain&&w.brain.react===undefined){}}
      else{w.root.x+=r2.x*Math.sign(b||1)*0.08;w.root.z+=r2.z*Math.sign(b||1)*0.08;}}}
  // relief : le châssis suit le sol, sauts quand le sol se dérobe
  const g=groundAt(V.x,V.z);
  if(V.y>g+0.08){V.vy-=9.81*dt;V.y+=V.vy*dt;if(V.y<=g){if(V.vy<-6){cam.shake=Math.min(1,cam.shake+0.4);playSound("thud",0.6);}V.y=g;V.vy=0;}}
  else{const up=g-V.y;V.vy=up>0.02?Math.max(0,up/dt*0.5):0;V.y=g;}
  const gf=groundAt(V.x+f2.x*1.6,V.z+f2.z*1.6),gb=groundAt(V.x-f2.x*1.6,V.z-f2.z*1.6),gr=groundAt(V.x+r2.x*0.9,V.z+r2.z*0.9),gl=groundAt(V.x-r2.x*0.9,V.z-r2.z*0.9);
  V.pitch=lerp(V.pitch,clamp(Math.atan2(gf-gb,3.2),-0.5,0.5)+clamp(-(vf-V._vf0||0)*0.004,-0.05,0.05),1-Math.exp(-10*dt));V._vf0=vf;
  V.roll=lerp(V.roll,clamp(Math.atan2(gl-gr,1.8),-0.4,0.4)+clamp(-V.steer*vf*0.004,-0.06,0.06),1-Math.exp(-10*dt));
  V.x=clamp(V.x,W_MIN+40,W_MAX-40);V.z=clamp(V.z,W_MIN+40,W_MAX-40);
  placeVehicle(V);
  // eau profonde : la voiture coule
  if(waterDepth(V.x,V.z)>1.0&&V.y<WATER_Y+0.3){V.sink+=dt;}
}
// la circulation voit la voiture du joueur (elle freine derrière)
function vehicleAhead(c,laneC,ns){if(!drive)return 999;const V=drive,o=ns?V.x:V.z,s=ns?V.z:V.x;if(Math.abs(o-laneC)>2)return 999;const d=(s-c.s)*c.dir;return d>0?Math.max(0,d-5):999;}
function updateVehicles(dt){
  updateBoatSpots(dt);
  hintCk-=dt;if(hintCk<=0){hintCk=0.25;const t=drive?(Math.abs(drive.v)<4?"E : descendre · F : klaxon · Espace : frein à main":""):(player.sit.state==="none"&&!player.ko&&nearestCar(player.root,3.2)?(nearestCar(player.root,3.2).V?.boat?"E : piloter":"E : conduire"):"");const t2=t||(!drive&&secretNear()?"E : fouiller":"");hintEl.style.display=t2?"block":"none";hintEl.textContent=t2;if(0)hintEl.textContent=t;}
  if(drive){
    const V=drive;
    if(player.ko||player.hp<=0){exitVehicle(true);return;}
    if(sitRequest){sitRequest=false;exitVehicle(false);}
    if(drive){const inp=menuOpen||mapOpen?{thr:0,st:0,hand:true}:driveInput();(V.boat?stepBoat:stepVehicle)(V,dt,inp);
      player.root.set(V.x,V.y,V.z);player.gy=V.y;player.lastOk.copy(player.root);player.yaw=player.targetYaw=V.yaw;player.vel.copy(V.vel);player.air=null;player.swim=null;
      if(cam.dist<6.5)cam.dist=lerp(cam.dist,7.2,1-Math.exp(-3*dt));
      if(clockT-lastCamInput>1.2&&Math.abs(V.v)>2){const want=V.v>0?V.yaw:V.yaw+180;cam.yaw+=deltaAngle(cam.yaw,want)*(1-Math.exp(-2.2*dt));cam.pitch=lerp(cam.pitch,12,1-Math.exp(-1.5*dt));}
      const kmh=Math.round(Math.abs(V.v)*3.6);speedoEl.style.display="block";speedoEl.innerHTML=`${kmh}<small>KM/H${V.hp<40?" · MOTEUR ABÎMÉ":""}</small>`;
      if(DRV.eng){const t=actx.currentTime,rpm=0.25+Math.abs(V.v)/40;DRV.eng.o1.frequency.setTargetAtTime((V.boat?60:38)+rpm*(V.boat?160:110),t,0.05);DRV.eng.o2.frequency.setTargetAtTime(19+rpm*55,t,0.05);DRV.eng.f.frequency.setTargetAtTime(300+rpm*900,t,0.05);DRV.eng.g.gain.setTargetAtTime(menuOpen?0:0.05+Math.min(0.06,Math.abs(inp.thr)*0.05),t,0.08);}
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
  if(drive){sit.style.display="block";sit.textContent=drive.boat?"Débarquer":"Descendre";document.getElementById("punchBtn").textContent="Klaxon";document.getElementById("guardBtn").textContent="Frein à main";return true;}
  document.getElementById("punchBtn").textContent="Poing";document.getElementById("guardBtn").textContent="Garde";
  if(player.sit.state==="none"&&!player.ko){const n=nearestCar(player.root,3.2);if(n&&(!player.swim||n.V&&n.V.boat)){sit.style.display="block";sit.textContent=n.V&&n.V.boat?"Piloter":"Conduire";return true;}}
  return false;
}
