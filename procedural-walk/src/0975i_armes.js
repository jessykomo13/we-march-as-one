// ================================================================ MODULE 31 : armes, visée et couverture
// Armes (toutes inventées) vendues à l'Armurerie Calibre Sud : pistolet Corsaire 9, mitraillette Rafale MX, fusil à
// pompe Brisant 12. Changer d'arme : touches 1 (mains nues) à 4, ou le bouton 🔫 au tactile. Tirer : clic gauche / F /
// bouton Poing (maintenu = tir continu pour la mitraillette) ; viser : clic droit maintenu, bouton Épaule ou gâchette
// gauche de la manette (caméra à l'épaule + réticule). Sur mobile, une aide à la visée accroche la cible la plus proche
// du réticule. Rechargement automatique. Les tirs s'entendent (passants qui fuient, police), les balles sont arrêtées
// par les murs, voitures, arbres ; accroupi derrière un obstacle bas = à couvert. À 3 étoiles (ou si tu as tiré),
// les policiers dégainent et tirent : mets-toi à couvert.
const WEAPONS={
  poings:{name:"Mains nues",icon:"✊"},
  pistolet:{name:"Corsaire 9",icon:"🔫",dmg:24,rate:0.28,mag:12,range:70,spread:0.012,pellets:1,price:450,ammoPrice:60,ammoPack:36,auto:false,pitch:1,len:0.22},
  smg:{name:"Rafale MX",icon:"🔫",dmg:13,rate:0.085,mag:30,range:55,spread:0.035,pellets:1,price:1800,ammoPrice:90,ammoPack:90,auto:true,pitch:1.3,len:0.36},
  pompe:{name:"Brisant 12",icon:"🔫",dmg:10,rate:0.85,mag:6,range:28,spread:0.09,pellets:8,price:1200,ammoPrice:70,ammoPack:18,auto:false,pitch:0.6,len:0.62},
};
const WEAPON_ORDER=["poings","pistolet","smg","pompe"];
const PW={cur:"poings",owned:{pistolet:false,smg:false,pompe:false},clip:{pistolet:0,smg:0,pompe:0},ammo:{pistolet:0,smg:0,pompe:0},
  trigger:false,mouseAim:false,cd:0,reload:0,hipT:0,burstT:-99,crimeV:null,init:false,stats:{shots:0,hits:0,copShots:0,copHits:0,blocked:0},guns:new Map()};
const ARMORY={x:0,z:0,name:"Armurerie Calibre Sud",ok:false};
function pwArmed(){return PW.cur!=="poings"&&!drive&&!player.swim&&!player.fly;}
function pwAiming(){return pwArmed()&&(PW.mouseAim||shoulderOn()||PW.hipT>0);}
// ---------------------------------------------------------------- entrées
cv.addEventListener("pointerdown",e=>{if(e.pointerType!=="mouse")return;if(e.button===0&&pwArmed()){PW.trigger=true;PW.tap=true;}if(e.button===2&&pwArmed())PW.mouseAim=true;});
addEventListener("pointerup",e=>{if(e.pointerType!=="mouse")return;if(e.button===0)PW.trigger=false;if(e.button===2)PW.mouseAim=false;});
addEventListener("keydown",e=>{if(e.repeat)return;if(e.code==="KeyF"&&pwArmed()){PW.trigger=true;PW.tap=true;}
  if(typeof TH!=="undefined"&&TH.cur)return;if(menuOpen||(typeof mpOpenNow!=="undefined"&&mpOpenNow))return;
  const k={Digit1:0,Digit2:1,Digit3:2,Digit4:3}[e.code];if(k!==undefined)pwSelect(WEAPON_ORDER[k]);});
addEventListener("keyup",e=>{if(e.code==="KeyF")PW.trigger=false;});
document.getElementById("punchBtn").addEventListener("pointerdown",()=>{if(pwArmed()){PW.trigger=true;PW.tap=true;}});
for(const ev of ["pointerup","pointercancel","pointerleave"])document.getElementById("punchBtn").addEventListener(ev,()=>{PW.trigger=false;});
const gunBtn=document.createElement("button");gunBtn.id="gunBtn";gunBtn.textContent="✊";document.body.appendChild(gunBtn);
gunBtn.addEventListener("pointerdown",e=>{e.stopPropagation();e.preventDefault();pwCycle();});
function pwSelect(k){if(k!=="poings"&&!PW.owned[k]){hudMsg(`Tu n'as pas le ${WEAPONS[k].name} — va dans une armurerie (🎯 sur la carte)`,2.5);return;}if(PW.cur===k)return;PW.cur=k;PW.reload=0;PW.cd=0.2;PW.trigger=false;
  if(k!=="poings"&&PW.clip[k]<=0&&PW.ammo[k]>0)pwStartReload();hudMsg(k==="poings"?"Mains nues":`${WEAPONS[k].name} en main`,1.4);playSound("slap",0.04);pwHud();}
function pwCycle(){const list=WEAPON_ORDER.filter(k=>k==="poings"||PW.owned[k]);const i=list.indexOf(PW.cur);if(list.length<2){hudMsg(`Achète une arme dans une armurerie (🎯 sur la carte)`,2.5);return;}pwSelect(list[(i+1)%list.length]);}
// ---------------------------------------------------------------- HUD
{const st=document.createElement("style");st.textContent=`
#gunHud{position:fixed;right:16px;bottom:150px;display:none;color:#fff;font:800 15px system-ui;text-shadow:0 2px 5px #000;text-align:right;pointer-events:none}
#gunHud small{display:block;font:600 11px system-ui;opacity:.85}
.touch #gunHud{bottom:auto;top:74px;right:10px;font-size:13px}
#xhair{position:fixed;left:50%;top:50%;width:22px;height:22px;margin:-11px 0 0 -11px;border:2px solid rgba(255,255,255,.85);border-radius:50%;box-shadow:0 0 3px #000;pointer-events:none;display:none}
#xhair:after{content:"";position:absolute;left:50%;top:50%;width:4px;height:4px;margin:-2px;background:#fff;border-radius:50%}
#xhair.lock{border-color:#ff4a3a}#xhair.hit{transform:scale(1.35)}
#gunBtn{display:none}
.touch #gunBtn{display:block;position:fixed;right:184px;bottom:276px;width:70px;height:56px;border-radius:14px;background:rgba(20,22,28,.45);color:#fff;border:2px solid rgba(255,255,255,.6);font-size:22px;touch-action:manipulation}
body.driving.touch #gunBtn{display:none!important}
#coverTag{position:fixed;left:50%;bottom:118px;transform:translateX(-50%);color:#9fe0ff;font:800 13px system-ui;text-shadow:0 2px 5px #000;display:none;pointer-events:none}
#armory{position:fixed;left:50%;bottom:150px;transform:translateX(-50%);width:min(380px,92vw);display:none;background:rgba(14,16,22,.9);color:#fff;border-radius:14px;padding:10px 12px;font:600 14px system-ui;z-index:30}
.touch #armory{bottom:auto;top:56px}
#armory h3{margin:0 0 6px;font:800 15px system-ui}#armory .btns{display:flex;flex-direction:column;gap:6px}
#armory button{all:unset;cursor:pointer;background:#2b3140;border-radius:10px;padding:8px 10px;font:600 13.5px system-ui;color:#fff;border:1px solid rgba(255,255,255,.18);touch-action:manipulation}
#armory button.off{opacity:.45}#armory button b{color:#ffd23a}#armory button small{display:block;font-weight:500;opacity:.75;font-size:11.5px}`;document.head.appendChild(st);}
const gunHud=document.createElement("div");gunHud.id="gunHud";document.body.appendChild(gunHud);
const xhair=document.createElement("div");xhair.id="xhair";document.body.appendChild(xhair);
const coverTag=document.createElement("div");coverTag.id="coverTag";coverTag.textContent="🛡 À couvert";document.body.appendChild(coverTag);
function pwHud(){const k=PW.cur,W=WEAPONS[k];gunBtn.textContent=k==="poings"?"✊":"🔫";
  if(k==="poings"){gunHud.style.display="none";return;}gunHud.style.display="block";
  gunHud.innerHTML=`${W.name} <span style="color:${PW.clip[k]?"#fff":"#ff7a6a"}">${PW.clip[k]}</span>/${PW.ammo[k]}${PW.reload>0?"<small>Rechargement…</small>":PW.clip[k]+PW.ammo[k]===0?`<small>Plus de munitions</small>`:""}`;}
// ---------------------------------------------------------------- l'arme en main (modèle simple)
const GUNM={body:mat({color:0x1d1f23,roughness:0.45,metalness:0.6}),grip:mat({color:0x3a2a1e,roughness:0.9}),cop:mat({color:0x15171a,roughness:0.5,metalness:0.5})};
function gunMesh(k,cop){const W=WEAPONS[k]||WEAPONS.pistolet,g=new THREE.Group(),m=cop?GUNM.cop:GUNM.body;
  put(BX(0.045,0.06,W.len),m,0,0,W.len/2-0.04,g);put(BX(0.04,0.1,0.05),GUNM.grip,0,-0.07,0,g);
  if(k==="smg"){put(BX(0.035,0.12,0.04),m,0,-0.09,0.12,g);put(BX(0.04,0.05,0.16),m,0,0,-0.1,g);}
  if(k==="pompe"){put(BX(0.05,0.05,0.3),GUNM.grip,0,-0.045,0.28,g);put(BX(0.04,0.07,0.2),GUNM.grip,0,-0.02,-0.12,g);}
  g.userData.len=W.len;scene.add(g);return g;}
function gunFor(w,k){let G=PW.guns.get(w);if(G&&G.k!==k){scene.remove(G.g);G=null;}if(!G){G={k,g:gunMesh(k,w!==player)};PW.guns.set(w,G);}return G.g;}
function gunHide(w){const G=PW.guns.get(w);if(G){scene.remove(G.g);PW.guns.delete(w);}}
// pose de visée : bras droit tendu vers la cible, main gauche en soutien
function aimPose(w,dir,two){for(const arm of w.arms){arm.rFn=(ww,sh,am)=>{
    const f=dir.clone();f.y=clamp(f.y,-0.7,0.7);f.normalize();
    if(am.side===1)return {target:sh.clone().addScaledVector(f,0.56).add(local(ww.chestRot,-0.06,0.02,0)),w:1,wrist:0,pole:local(ww.chestRot,0.6,-0.7,-0.2)};
    if(two)return {target:sh.clone().addScaledVector(f,0.46).add(local(ww.chestRot,0.16,-0.02,0)),w:1,wrist:0,pole:local(ww.chestRot,-0.6,-0.7,-0.2)};
    return null;};}
  w._aimArms=true;}
function clearAimPose(w){if(!w._aimArms)return;for(const arm of w.arms)arm.rFn=null;w._aimArms=false;}
function muzzleOf(w,dir){const h=wp(w.rig.b.RightHand),k=(PW.guns.get(w)||{g:{userData:{len:0.25}}}).g.userData.len||0.25;return h.addScaledVector(dir,k+0.02);}
// ---------------------------------------------------------------- effets
const FX={tr:[],flash:null};
function fxInit(){if(FX.flash)return;FX.flash=new THREE.Mesh(new THREE.SphereGeometry(0.09,8,6),new THREE.MeshBasicMaterial({color:0xffd27a,transparent:true,opacity:0.9,depthWrite:false}));FX.flash.visible=false;scene.add(FX.flash);FX.light=new THREE.PointLight(0xffc060,0,9,2);scene.add(FX.light);
  for(let i=0;i<14;i++){const g=new THREE.BufferGeometry().setFromPoints([new V3(),new V3()]);const l=new THREE.Line(g,new THREE.LineBasicMaterial({color:0xfff0b0,transparent:true,opacity:0.8}));l.visible=false;l.frustumCulled=false;scene.add(l);FX.tr.push({l,t:0});}}
function shotFx(a,b,flash){fxInit();const T=FX.tr.find(q=>!q.l.visible)||FX.tr[0];const P=T.l.geometry.attributes.position;P.setXYZ(0,a.x,a.y,a.z);P.setXYZ(1,b.x,b.y,b.z);P.needsUpdate=true;T.l.visible=true;T.t=0.07;
  if(flash){FX.flash.position.copy(a);FX.flash.visible=true;FX.flashT=0.05;FX.flash.scale.setScalar(rand(0.8,1.4));FX.light.position.copy(a);FX.light.intensity=3;}}
function fxUpdate(dt){if(!FX.flash)return;for(const T of FX.tr)if(T.l.visible){T.t-=dt;if(T.t<=0)T.l.visible=false;}if(FX.flashT>0){FX.flashT-=dt;if(FX.flashT<=0){FX.flash.visible=false;FX.light.intensity=0;}}}
function gunSound(k,dist=0){const c=actx;if(!c)return;try{const W=WEAPONS[k]||WEAPONS.pistolet,t=c.currentTime,v=clamp01(1-dist/90)*(k==="pompe"?0.6:0.42);if(v<0.01)return;
  const n=c.createBufferSource(),len=k==="pompe"?0.35:0.18,b=c.createBuffer(1,c.sampleRate*len,c.sampleRate),a=b.getChannelData(0);for(let i=0;i<a.length;i++)a[i]=(Math.random()*2-1)*Math.pow(1-i/a.length,k==="pompe"?2.5:4);
  n.buffer=b;const f=c.createBiquadFilter();f.type="lowpass";f.frequency.value=(2600+Math.random()*600)*W.pitch*(1-dist/200);const g=c.createGain();g.gain.value=v;n.connect(f).connect(g).connect(sfxOut());n.start(t);
  const o=c.createOscillator(),og=c.createGain();o.frequency.setValueAtTime(150*W.pitch,t);o.frequency.exponentialRampToValueAtTime(40,t+0.12);og.gain.setValueAtTime(v*0.9,t);og.gain.exponentialRampToValueAtTime(0.001,t+0.14);o.connect(og).connect(sfxOut());o.start(t);o.stop(t+0.15);}catch(e){}}
// ---------------------------------------------------------------- balistique
// premier obstacle le long du segment a→b : murs/arbres/voitures (hauts) toujours ; obstacles bas jusqu'à ~1 m du sol
function bulletBlock(a,b){const d=b.clone().sub(a),L=d.length();if(L<0.01)return null;d.divideScalar(L);const q=new V3();
  for(let s=0.4;s<L;s+=0.35){q.copy(a).addScaledVector(d,s);const g=groundAt(q.x,q.z);if(q.y<g)return q.clone();
    for(const o of obsAt(q)){if(o.veh===drive&&drive)continue;const c=obstacleClosest(o,q);if(c.d>0.02)continue;const h=o.tall||o.bld?99:o.top!==undefined?o.top:g+1.05;if(q.y<h)return q.clone();}}
  return null;}
// cible touchée par un rayon (origine o, direction d) : passants/policiers (tronc + tête), véhicules
function rayHit(o,d,maxD,ignore){let best=null,bd=maxD;const a=new V3(),b=new V3(),tmp=new V3();
  for(const w of walkers){if(w===ignore||w.inCar||(w.ko&&w.ko.t>0.5))continue;const dx=w.root.x-o.x,dz=w.root.z-o.z;if(dx*dx+dz*dz>maxD*maxD)continue;
    const head=wp(w.rig.b.Head);a.set(w.root.x,w.ko?w.root.y+0.15:w.root.y+0.25,w.root.z);b.copy(w.ko?a:head);
    // distance rayon–segment
    const u=b.clone().sub(a),wv=o.clone().sub(a),A=d.dot(d),B=d.dot(u),C=u.dot(u),D=d.dot(wv),E=u.dot(wv),den=A*C-B*B;
    let sc=den>1e-6?(B*E-C*D)/den:0,tc=den>1e-6?(A*E-B*D)/den:0;tc=clamp(tc,0,1);sc=Math.max(0,(B*tc-D)/A);
    const p1=tmp.copy(o).addScaledVector(d,sc),p2=a.clone().addScaledVector(u,tc),dist=p1.distanceTo(p2);
    const r=tc>0.86?0.13:0.24;if(dist<r&&sc<bd){bd=sc;best={w,t:sc,zone:tc>0.86?"head":tc>0.55?"chest":tc>0.3?"belly":"legs",p:p1.clone()};}}
  const veh=[...VEH.filter(V=>!V.boat&&!V.dead&&V!==drive).map(V=>({V,x:V.x,y:V.y,z:V.z})),...PCH.list.filter(P=>!P.dead).map(P=>({P,x:P.x,y:P.y,z:P.z}))];
  for(const c of veh){const cx=c.x-o.x,cy=c.y+0.8-o.y,cz=c.z-o.z,t=cx*d.x+cy*d.y+cz*d.z;if(t<0||t>bd)continue;const px=o.x+d.x*t-c.x,py=o.y+d.y*t-(c.y+0.8),pz=o.z+d.z*t-c.z;if(px*px+pz*pz<1.7&&Math.abs(py)<0.8){bd=t;best={car:c,t,p:new V3(o.x+d.x*t,o.y+d.y*t,o.z+d.z*t)};}}
  return best;}
// ---------------------------------------------------------------- tir du joueur
const _rc=new THREE.Raycaster();
function aimRay(){const o=camera.position.clone(),d=new V3();camera.getWorldDirection(d);return {o,d};}
function aimAssist(o,d,cone){let best=null,ba=cone;for(const w of walkers){if(w===player||w.ko||w.inCar)continue;const c=w.root.clone();c.y+=1.25;const v=c.sub(o),L=v.length();if(L>45||L<1)continue;v.divideScalar(L);const ang=Math.acos(clamp(v.dot(d),-1,1));
    if(ang<ba&&!bulletBlock(muzzleOf(player,v),w.root.clone().setY(w.root.y+1.25))){ba=ang;best=w;}}return best;}
function pwFire(){
  const k=PW.cur,W=WEAPONS[k];if(PW.reload>0||PW.cd>0)return;
  if(PW.clip[k]<=0){if(PW.ammo[k]>0)pwStartReload();else{playSound("whoosh",0.15);hudMsg("Plus de munitions",1.2);PW.trigger=false;}return;}
  PW.clip[k]--;PW.cd=W.rate;PW.stats.shots++;PW.hipT=Math.max(PW.hipT,1.6);
  let {o,d}=aimRay();
  // aide à la visée (forte au tactile, légère à la souris)
  const as=aimAssist(o,d,isTouch()?0.22:0.05);if(as){const c=as.root.clone();c.y+=as.ko?0.3:1.25;d=c.sub(o).normalize();xhair.classList.add("lock");}else xhair.classList.remove("lock");
  // point visé : premier impact du rayon caméra
  const hitCam=rayHit(o,d,W.range+cam.dist+5,player),aimP=hitCam?hitCam.p:o.clone().addScaledVector(d,W.range);
  player.yaw=player.targetYaw=Math.atan2(aimP.x-player.root.x,-(aimP.z-player.root.z))/D2R;
  const mz=muzzleOf(player,aimP.clone().sub(player.root).setY(0).normalize());
  for(let n=0;n<W.pellets;n++){
    const dir=aimP.clone().sub(mz).normalize();dir.x+=rand(-1,1)*W.spread;dir.y+=rand(-1,1)*W.spread;dir.z+=rand(-1,1)*W.spread;dir.normalize();
    const h=rayHit(mz,dir,W.range,player),end=h?h.p:mz.clone().addScaledVector(dir,W.range);
    const blk=bulletBlock(mz,end);
    if(blk){PW.stats.blocked++;shotFx(mz,blk,n===0);if(Math.random()<0.5)puff(blk.x,blk.y,blk.z,0,0.25);continue;}
    shotFx(mz,end,n===0);
    if(h&&h.w){PW.stats.hits++;const dmg=Math.round(W.dmg*(h.zone==="head"?2.2:h.zone==="legs"?0.7:1)*(1-h.t/W.range*0.4));h.w.takeHit(player,h.zone,dmg,false,false);
      if(h.w.hp<=0&&!h.w.ko)h.w.startKO(dir.clone().setY(0).normalize(),player,{fast:true});xhair.classList.add("hit");setTimeout(()=>xhair.classList.remove("hit"),90);
      if(h.w.isCop)wanted.armedT=clockT;}
    else if(h&&h.car){const C=h.car;if(C.V){C.V.hp-=W.dmg*0.35;}else if(C.P){C.P.hp-=W.dmg*0.5;}puff(h.p.x,h.p.y,h.p.z,0,0.3);}
  }
  gunSound(k,0);cam.shake=Math.min(1,cam.shake+(k==="pompe"?0.18:0.05));rumble(60,k==="pompe"?0.8:0.35);
  pwNoise();if(PW.clip[k]<=0&&PW.ammo[k]>0)pwStartReload();pwHud();
}
// les coups de feu s'entendent : les passants fuient, la police est prévenue (un seul délit par fusillade)
function pwNoise(){const now=clockT;wanted.armedT=now;
  for(const w of walkers){if(w===player||w.isCop||w.ko||w.isRemote||w.resident)continue;const d=hdist(w.root,player.root);if(d<40&&w.brain&&w.brain.startFlee&&!w.brain.flee&&Math.random()<0.7){w.brain.startFlee(w,player);if(Math.random()<0.2)say(w,pick(["Il a une arme !","Aaah ! Il tire !","Couchez-vous !","Au secours !"]));}}
  if(CREA.on&&CREA.noCops)return;
  if(!PW.crimeV||now-PW.burstT>8){PW.crimeV={isCop:false,_crime:null,brain:{},root:player.root.clone()};}
  PW.burstT=now;registerCrime(PW.crimeV,true);const c=PW.crimeV._crime;if(c){c.pts=Math.max(c.pts,4);c.sev=Math.max(c.sev,2);}
  for(const w of walkers)if(w.isCop&&!w.ko&&hdist(w.root,player.root)<60&&c){reportCrime(c,"Coups de feu signalés !","cop");break;}}
function pwStartReload(){const k=PW.cur;if(PW.reload>0||PW.ammo[k]<=0||PW.clip[k]>=WEAPONS[k].mag)return;PW.reload=k==="pompe"?2.2:k==="smg"?1.8:1.3;playSound("slap",0.05);pwHud();}
// ---------------------------------------------------------------- police armée
function copsArmed(){return wanted.level>=3||(wanted.level>0&&clockT-(wanted.armedT||-99)<90);}
function playerCover(fromPos){ // y a-t-il un obstacle entre le tireur et le joueur (accroupi = cible basse)
  const tgt=player.root.clone();tgt.y+=(player.crouchK||0)>0.5?0.75:1.3;return bulletBlock(fromPos,tgt);}
function copShoot(w,dt){
  const d=hdist(w.root,player.root);if(d>32||player.ko||drive){w._gunT=0;return false;}
  const eye=w.root.clone();eye.y+=1.5;const tgt=player.root.clone();tgt.y+=1.3;if(d>6&&!los(eye,tgt))return false;
  const dir=tgt.clone().sub(eye).normalize();gunFor(w,"pistolet");aimPose(w,dir,false);w.faceYaw=Math.atan2(dir.x,-dir.z)/D2R;
  w._gunT=(w._gunT||rand(0.6,1.2))-dt;if(w._gunT>0)return true;w._gunT=w.swat?rand(0.45,0.8):rand(0.9,1.6);
  const mz=muzzleOf(w,dir);const tgt2=player.root.clone();tgt2.y+=(player.crouchK||0)>0.5?0.75:1.3;
  const blk=playerCover(mz);PW.stats.copShots++;gunSound("pistolet",hdist(w.root,player.root));
  if(blk){shotFx(mz,blk,true);puff(blk.x,blk.y,blk.z,0,0.25);return true;}
  const sp=Math.hypot(player.vel.x,player.vel.z),chance=clamp(0.5-d*0.012-(sp>4?0.25:0)-((player.crouchK||0)>0.5?0.15:0),0.08,0.7);
  if(Math.random()<chance){shotFx(mz,tgt2,true);PW.stats.copHits++;if(!(CREA.on&&CREA.god))player.takeHit(w,Math.random()<0.12?"head":"chest",w.swat?10:7,false,false);}
  else{const miss=tgt2.clone().add(new V3(rand(-1.2,1.2),rand(-0.5,0.8),rand(-1.2,1.2)));shotFx(mz,miss,true);}
  return true;}
// ---------------------------------------------------------------- armurerie
const armEl=document.createElement("div");armEl.id="armory";document.body.appendChild(armEl);let armOpen=false;
const ARMS=[];
const ARM_NAMES={ps:"Le Chasseur du Nord",jardins:"Calibre des Jardins",marina:"Marina Tir",playa:"Plomb & Sable",bellef:"Bellefontaine Défense",pins:"La Cartouche des Pins",marais:"Marais Munitions",capnord:"Cap-Nord Chasse & Pêche",sierra:"Poudre Rouge",selva:"Selva Caza",brisa:"Brisa Défense",punta:"Esperanza Tir",ambre:"Armurerie d'Ambre"};
function armoryInit(){
  // Azuria : un îlot commerçant près du centre + quatre quartiers
  let spot=null;for(let r=0;r<6&&!spot;r++)for(let cx=-r;cx<=r&&!spot;cx++)for(let cz=-r;cz<=r&&!spot;cz++){if(Math.max(Math.abs(cx),Math.abs(cz))!==r)continue;if(chunkType(cx,cz)==="commerces")spot=[cx,cz];}
  const list=[[spot||[2,2],"Armurerie Calibre Sud"],[[-6,8],"Tir Coral"],[[10,-9],"Armurerie du Port"],[[-11,-4],"Acier & Poudre"],[[11,6],"Calibre Plage"]];
  for(const T of TOWNS)list.push([[Math.round((T.i0+T.i1)/2),Math.round((T.j0+T.j1)/2)],ARM_NAMES[T.id]||("Armurerie de "+T.name)]);
  try{POI_ICON.armurerie=["🎯","#ff8a5a"];}catch(e){}
  for(const [[cx,cz],name] of list){const A={x:cx*40+12,z:cz*40-12+1.4,name,g:null,o:null};ARMS.push(A);try{POIS.push({type:"armurerie",x:A.x,z:A.z,name});}catch(e){}}
  ARMORY.ok=true;Object.assign(ARMORY,{x:ARMS[0].x,z:ARMS[0].z,name:ARMS[0].name});
}
// le comptoir n'est construit qu'à l'approche (le sol est alors connu)
function armoryBuild(A){const g=new THREE.Group(),y=groundAt(A.x,A.z),X=A.x,Z=A.z+0.9;
  put(BX(1.8,0.95,0.6),KM.dark||GUNM.body,X,y+0.47,Z,g);put(BX(1.7,0.04,0.5),mat({color:0x6a2a1e,roughness:0.8}),X,y+0.97,Z,g);
  for(let i=0;i<3;i++){const gm=gunMesh(WEAPON_ORDER[i+1],false);scene.remove(gm);gm.position.set(X-0.55+i*0.55,y+1.02,Z);gm.rotation.set(0,Math.PI/2+(i-1)*0.25,Math.PI/2);g.add(gm);}
  put(BX(1.9,0.45,0.06),signMat("🎯 "+A.name,"#2a1410","#ffb07a",{w:512,h:120}),X,y+2.4,Z+0.32,g);put(BX(0.06,1.5,0.06),OM.metal,X-0.9,y+1.6,Z+0.3,g);put(BX(0.06,1.5,0.06),OM.metal,X+0.9,y+1.6,Z+0.3,g);
  scene.add(g);A.g=g;A.o=addObstacle({type:"box",x:X,z:Z,hx:0.9,hz:0.3});
  try{addAmb("vendeur",X,Z+0.75,0);}catch(e){}}
function armoryStream(){for(const A of ARMS){const d=Math.hypot(player.root.x-A.x,player.root.z-A.z);
  if(!A.g&&d<150)armoryBuild(A);else if(A.g&&d>260){scene.remove(A.g);A.g=null;if(A.o){removeObstacle(A.o);A.o=null;}}}}
function nearArmory(){if(drive)return false;for(const A of ARMS)if(A.g&&Math.hypot(player.root.x-A.x,player.root.z-A.z)<2.4){Object.assign(ARMORY,{x:A.x,z:A.z,name:A.name});return true;}return false;}
function armButton(html,fn,off){const b=document.createElement("button");b.innerHTML=html;if(off)b.className="off";b.onclick=e=>{e.stopPropagation();fn();};armEl.querySelector(".btns").appendChild(b);}
function armoryUI(){if(!armOpen){armEl.style.display="none";return;}armEl.style.display="block";armEl.innerHTML=`<h3>🎯 ${ARMORY.name} · ${money} €</h3><div class="btns"></div>`;
  for(const k of WEAPON_ORDER.slice(1)){const W=WEAPONS[k];
    if(!PW.owned[k])armButton(`${W.name} <b>${W.price} €</b><small>${k==="pistolet"?"Pistolet précis":k==="smg"?"Mitraillette : tir continu":"Fusil à pompe : dévastateur de près"} · chargeur ${W.mag}</small>`,()=>armBuy(k,"arme"),money<W.price);
    else armButton(`Munitions ${W.name} (+${W.ammoPack}) <b>${W.ammoPrice} €</b><small>Tu en as ${PW.clip[k]+PW.ammo[k]}</small>`,()=>armBuy(k,"mun"),money<W.ammoPrice);}
  armButton("Fermer",()=>{armOpen=false;armoryUI();});}
function armBuy(k,what){const W=WEAPONS[k],price=what==="arme"?W.price:W.ammoPrice;if(money<price){hudMsg(`Il te faut ${price} €`,1.8);return;}
  money-=price;moneyEl.textContent=money+" €";playSound("slap",0.05);
  if(what==="arme"){PW.owned[k]=true;PW.clip[k]=W.mag;PW.ammo[k]=W.mag*2;hudMsg(`${W.name} acheté ! Touche ${WEAPON_ORDER.indexOf(k)+1} ou 🔫 pour le prendre en main`,3);}
  else{PW.ammo[k]+=W.ammoPack;hudMsg(`+${W.ammoPack} munitions`,1.6);}
  armoryUI();pwHud();}
function tryArmory(){if(!nearArmory())return false;armOpen=!armOpen;armoryUI();return true;}
// ---------------------------------------------------------------- boucle
function updateWeapons(dt){
  if(!PW.init){PW.init=true;armoryInit();pwHud();}
  fxUpdate(dt);PW.cd-=dt;PW.armCk=(PW.armCk||0)-dt;if(PW.armCk<=0){PW.armCk=1;armoryStream();}PW.hipT-=dt;
  if(armOpen&&!nearArmory()){armOpen=false;armoryUI();}
  // rechargement
  if(PW.reload>0){PW.reload-=dt;if(PW.reload<=0){const k=PW.cur,n=Math.min(WEAPONS[k].mag-PW.clip[k],PW.ammo[k]);PW.clip[k]+=n;PW.ammo[k]-=n;playSound("slap",0.06);}pwHud();}
  const armed=pwArmed()&&!player.ko&&player.sit.state==="none";
  // tir
  if(armed&&(PW.trigger||PW.tap)&&PW.cd<=0&&PW.reload<=0){pwFire();PW.tap=false;if(!WEAPONS[PW.cur].auto)PW.trigger=false;}else if(!armed)PW.tap=false;
  // pose, arme visible, réticule
  const aiming=armed&&pwAiming();
  if(armed){gunFor(player,PW.cur);const {d}=aimRay();const dir=aiming?d:fwdOf(player.yaw).add(new V3(0,-0.9,0)).normalize();
    if(aiming){aimPose(player,d,PW.cur!=="pistolet");if(PW.mouseAim||shoulderOn())player.faceYaw=cam.yaw;}else clearAimPose(player);
    const g=PW.guns.get(player).g,h=wp(player.rig.b.RightHand);g.position.copy(h);g.lookAt(h.clone().add(aiming?d:dir));g.visible=true;}
  else{gunHide(player);clearAimPose(player);}
  xhair.style.display=aiming?"block":"none";
  if(aiming&&isTouch()){const {o,d}=aimRay();xhair.classList.toggle("lock",!!aimAssist(o,d,0.22));}
  // couverture
  let cov=false;if((player.crouchK||0)>0.5&&!drive){for(const o of obsAt(player.root)){if(o.veh===drive)continue;const c=obstacleClosest(o,player.root);if(c.d<1.2&&c.d>-0.1){cov=true;break;}}}
  coverTag.style.display=cov&&(wanted.level>0||armed)?"block":"none";
  // policiers armés
  const ca=copsArmed()&&!(CREA.on&&CREA.noCops);
  for(const w of walkers){if(!w.isCop)continue;
    if(ca&&!w.ko&&!w.inCar&&!(w.brain&&w.brain.cuffing)){if(copShoot(w,dt)){const G=PW.guns.get(w);if(G){const h=wp(w.rig.b.RightHand);G.g.position.copy(h);G.g.lookAt(h.clone().add(fwdOf(w.yaw)));}continue;}}
    if(PW.guns.has(w)){gunHide(w);clearAimPose(w);}}
  for(const w of [...PW.guns.keys()])if(!walkers.includes(w))gunHide(w);
}
function pwSave(){return {cur:PW.cur,owned:{...PW.owned},clip:{...PW.clip},ammo:{...PW.ammo}};}
function pwLoad(d){if(!d)return;for(const k of ["pistolet","smg","pompe"]){PW.owned[k]=!!(d.owned&&d.owned[k]);PW.clip[k]=clamp(+(d.clip&&d.clip[k])||0,0,WEAPONS[k].mag);PW.ammo[k]=clamp(+(d.ammo&&d.ammo[k])||0,0,999);}
  PW.cur=WEAPON_ORDER.includes(d.cur)&&(d.cur==="poings"||PW.owned[d.cur])?d.cur:"poings";pwHud();}
