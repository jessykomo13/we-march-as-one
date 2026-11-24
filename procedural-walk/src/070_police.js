// ================================================================ police, caméras, recherche
const wanted={searchR:8,lose:0,outside:false,level:0,heat:0,lastSeenPos:new V3(),lastSeenT:-99,copSeenT:-99,engageT:-99,responded:false,evidence:{cctv:false,clothes:false,face:false},escapedT:-999,hot:null};
const cams=[],policeCars=[];
let msgT=0;
function hudMsg(t,dur=3){msgEl.textContent=t;msgEl.style.opacity=1;msgT=dur;}
function los(a,b){ // ligne de vue (les arbres, caisses et véhicules bloquent)
  const d=new V3().subVectors(b,a);d.y=0;const L=d.length();if(L<0.5)return true;d.divideScalar(L);
  for(let s=0.6;s<L-0.4;s+=0.45){const p=a.clone().addScaledVector(d,s);
    for(const o of obsAt(p))if(o.tall&&obstacleClosest(o,p).d<0)return false;
    for(const V of [...vans,...policeCars]){const g=V.g||V.v.g;const lx=p.x-g.position.x,lz=p.z-g.position.z;if(lx*lx+lz*lz<1.6)return false;}
  }
  return true;
}
function canSee(w,target,range,cone){
  const to=new V3().subVectors(target.root,w.root);to.y=0;const d=to.length();
  if(target===player&&player.crouchK>0.5)range*=0.55;
  if(d>range)return false;
  if(d>2.5){const ang=Math.abs(deltaAngle(w.yaw+(w.glance?w.glance.yaw:0),Math.atan2(to.x,-to.z)/D2R));if(ang>cone/2)return false;}
  return los(w.root,target.root);
}
// --- caméras de surveillance
const CM={pole:new THREE.MeshStandardMaterial({color:0x3a3d42,metalness:0.6,roughness:0.4}),body:new THREE.MeshStandardMaterial({color:0xe9e9e6,roughness:0.4}),lens:new THREE.MeshStandardMaterial({color:0x101418,roughness:0.1,metalness:0.8}),led:new THREE.MeshStandardMaterial({color:0x550000,emissive:0xff0000,emissiveIntensity:0.3})};
const coneMat=new THREE.MeshBasicMaterial({color:0xff3030,transparent:true,opacity:0.06,depthWrite:false,side:THREE.DoubleSide});
function makeCam(x,z,base,parent=scene){
  const g=new THREE.Group();g.position.set(x,0,z);parent.add(g);
  const pole=new THREE.Mesh(new THREE.CylinderGeometry(0.06,0.08,3.4,10),CM.pole);pole.position.y=1.7;pole.castShadow=true;g.add(pole);
  const head=new THREE.Group();head.position.y=3.35;g.add(head);
  const arm=new THREE.Mesh(new THREE.BoxGeometry(0.06,0.06,0.35),CM.pole);arm.position.z=0.17;head.add(arm);
  const body=new THREE.Mesh(new THREE.BoxGeometry(0.16,0.15,0.38),CM.body);body.position.set(0,-0.08,0.38);body.rotation.x=0.35;body.castShadow=true;head.add(body);
  const lens=new THREE.Mesh(new THREE.CylinderGeometry(0.05,0.05,0.04,14),CM.lens);lens.rotation.x=Math.PI/2-0.35;lens.position.set(0,-0.15,0.57);head.add(lens);
  const led=new THREE.Mesh(new THREE.SphereGeometry(0.018,8,6),CM.led.clone());led.position.set(0.05,-0.02,0.52);head.add(led);
  const cone=new THREE.Mesh(new THREE.ConeGeometry(Math.tan(28*D2R)*22,22,24,1,true),coneMat);cone.rotation.x=-Math.PI/2;cone.position.z=11;cone.visible=false;
  const coneG=new THREE.Group();coneG.position.y=-3.3;coneG.add(cone);head.add(coneG);
  const c={x,z,base,head,led,cone,g,phase:Math.random()*10,alert:0,yaw:base};cams.push(c);return c;
}
function camSees(c,pos){
  const dx=pos.x-c.x,dz=pos.z-c.z,d=Math.hypot(dx,dz);if(d>(pos===player.root&&player.crouchK>0.5?13:22))return false;
  const ang=Math.atan2(dx,dz);let da=ang-c.yaw;da=Math.atan2(Math.sin(da),Math.cos(da));
  if(Math.abs(da)>28*D2R)return false;
  return los(new V3(c.x,0,c.z),pos);
}
function updateCams(dt){
  for(const c of cams){
    c.yaw=c.base+Math.sin(clockT*0.35+c.phase)*0.6;c.head.rotation.y=c.yaw;
    c.alert=Math.max(0,c.alert-dt);
    c.led.material.emissiveIntensity=c.alert>0?(Math.floor(clockT*8)%2?4:0.5):(Math.floor(clockT*1.2+c.phase)%2?1.2:0.15);
    c.cone.visible=debug||c.alert>0;
    // une caméra qui te voit pendant une recherche déplace la zone, mais ne remet pas tout à zéro
    if(wanted.level>0&&clockT>(c.repT||0)&&clockT-(wanted.camPing||-99)>14&&camSees(c,player.root)&&player.crouchK<0.5){c.repT=clockT+10;wanted.lastSeenPos.copy(player.root);wanted.lose=(wanted.lose||0)*0.5;wanted.camPing=clockT;wanted.evidence.cctv=true;if(c.alert<=0)c.alert=1.5;if(clockT-wanted.lastSeenT>3)hudMsg("Une caméra t'a filmé : la zone de recherche bouge");}
  }
}
// --- crimes (façon GTA 6 : il faut un témoin, une caméra ou un policier)
const HEAT=[1,3,6,10,15,22];
const levelFromHeat=h=>{let l=0;for(let i=0;i<6;i++)if(h>=HEAT[i])l=i+1;return l;};
function registerCrime(victim,isKO){
  if(victim.isThief||(CREA.on&&CREA.noCops))return;   // arrêter un voleur n'est pas un délit
  const isCop=!!victim.isCop;
  let c=victim._crime;
  if(!c||clockT-c.t0>25){c=victim._crime={t0:clockT,pts:0,counted:0,reported:false,sev:0};}
  const pts=isCop?(isKO?5:2):(isKO?3:1);
  if(isKO){c.pts=Math.max(c.pts,pts);}else if(c.pts<pts)c.pts=pts;   // un même passage à tabac = un seul délit
  c.sev=Math.max(c.sev,isCop?(isKO?3:2):(isKO?2:1));
  if(isCop)victim.brain.hostile=true;
  let seen=false;
  for(const w of walkers)if(w.isCop&&!w.ko&&canSee(w,player,30,240)){reportCrime(c,isCop?"Agression d'un policier !":"La police t'a vu !","cop");seen=true;break;}
  for(const cm of cams)if(camSees(cm,player.root)){cm.alert=3;setTimeout(()=>reportCrime(c,"Filmé par une caméra de surveillance","cctv"),900);break;}
  if(c.reported&&!seen)reportCrime(c,null,"update");
  for(const w of walkers){
    if(w===player||w.isCop||w.ko||(w.seatedLike&&w.sit.state!=="seated"))continue;
    const d=hdist(w.root,player.root);
    if(w===victim||(d<14&&(d<4||canSee(w,player,14,170)))){if(w.brain.witness)w.brain.witness(w,c);}
  }
}
function reportCrime(crime,why,src){
  wanted.lastSeenPos.copy(player.root);wanted.lastSeenT=clockT;
  if(src==="cctv")wanted.evidence.cctv=true;
  if(src==="witness")wanted.evidence.clothes=true;
  if(src==="cop"){wanted.evidence.face=true;wanted.evidence.clothes=true;wanted.copSeenT=clockT;}
  if(!crime)return;
  if(!crime.reported){crime.reported=true;}
  const add=crime.pts-crime.counted;
  if(add<=0)return;
  crime.counted=crime.pts;wanted.heat+=add;
  const old=wanted.level;
  wanted.level=Math.min(6,Math.max(old,levelFromHeat(wanted.heat),crime.sev));
  if(why)hudMsg(why);
  if(wanted.level>old){playSound("slap",0.2);if(old===0)wanted.responded=false;}
}
// vue des policiers : cône de 170° jusqu'à 26 m ; ils t'entendent courir à moins de 7 m
function copSees(w){
  const p=player,d=hdist(w.root,p.root);
  if(d<(p.run&&p.speed>3&&p.crouchK<0.5?7:3))return los(w.root,p.root);
  return canSee(w,p,26,170);
}
function copsNear(r){return walkers.some(w=>w.isCop&&!w.ko&&hdist(w.root,player.root)<r);}
let sightTimer=0;
function updateWanted(dt){
  if(msgT>0){msgT-=dt;if(msgT<=0)msgEl.style.opacity=0;}
  if(wanted.level>0){
    sightTimer-=dt;
    if(sightTimer<=0){
      sightTimer=0.6;
      for(const w of walkers){
        if(w===player||w.isCop||w.ko||!w.brain.witness||w.brain.call||w.brain.flee)continue;
        const d=hdist(w.root,player.root);
        if(d<9&&canSee(w,player,9,140)&&Math.random()<(wanted.evidence.clothes?0.3:0.12)){
          say(w,pick(["C'est lui !","Hé, c'est le type recherché !","Appelez la police, c'est lui !","Oh non, c'est lui…"]));
          w.brain.startFlee(w,player);w.brain.call={crime:null,t:rand(3,4.5),dur:4,started:false};break;
        }
      }
    }
    const spotter=walkers.find(w=>w.isCop&&!w.ko&&copSees(w));
    if(spotter){
      if(clockT-wanted.copSeenT>4&&wanted.copSeenT>0){say(spotter,pick(["Central, suspect repéré !","Il est là ! Tous les agents vers moi !","Je l'ai en visuel !"]));hudMsg("Radio police : tu as été repéré !");for(const w of walkers)if(w.isCop)w.brain.searchPt=null;}
      wanted.lastSeenPos.copy(player.root);wanted.lastSeenT=clockT;wanted.copSeenT=clockT;wanted.evidence.face=true;wanted.evidence.clothes=true;}
    // zone de recherche : elle s'agrandit avec le temps ; dehors, tu sèmes la police bien plus vite
    const unseen=clockT-wanted.lastSeenT,limit=14+5*wanted.level;
    wanted.searchR=Math.min(18,7+wanted.level*1.2+Math.max(0,Math.min(unseen,clockT-(wanted.camPing||-99))-1.5)*0.5);
    const outside=hdist(player.root,wanted.lastSeenPos)>wanted.searchR;
    if(unseen<0.5)wanted.lose=0;else wanted.lose=(wanted.lose||0)+dt*(outside?1.3:0.4)*(player.crouchK>0.5?1.3:1);
    wanted.outside=outside&&unseen>0.5;
    if(wanted.lose>limit){wanted.lose=0;
      wanted.level=0;wanted.heat=0;wanted.escapedT=clockT;wanted.hot={pos:wanted.lastSeenPos.clone(),t:clockT};
      hudMsg("Tu as semé la police");
    }
    if(player.ko&&copsNear(3)&&player.ko.t>1.2)arrestPlayer();
    // renforts : 2 agents par étoile (max 12)
    const needCops=Math.min(12,wanted.level*2);
    const crew=policeCars.filter(c=>c.state!=="leave").reduce((a,c)=>a+c.planned,0);
    if(crew<needCops&&(!updateWanted.cd||clockT>updateWanted.cd)){updateWanted.cd=clockT+(wanted.level>=3?2:3.5);spawnPoliceCar();}
    if(wanted.level>=4&&!heli)spawnHeli();
  }else{
    // après une fuite : la police garde ta description, les caméras peuvent te reconnaître
    if(wanted.evidence.clothes&&clockT-wanted.escapedT<120&&Math.random()<dt*2){
      for(const cm of cams)if(camSees(cm,player.root)&&hdist(new V3(cm.x,0,cm.z),player.root)<14){cm.alert=2;wanted.level=1;wanted.heat=1;wanted.responded=false;wanted.lastSeenPos.copy(player.root);wanted.lastSeenT=clockT;hudMsg("Une caméra t'a reconnu !");break;}
    }
  }
  if(wanted.hot&&clockT-wanted.hot.t>90)wanted.hot=null;
  // étoiles : creuses (signalé), blanches (vu), clignotantes (recherche), rouges (intervention)
  const unseen=clockT-wanted.lastSeenT,copSeen=clockT-wanted.copSeenT<2,everSeen=wanted.copSeenT>clockT-120&&wanted.copSeenT>=wanted.escapedT;
  const red=clockT-wanted.engageT<3,blinkOff=Math.floor(clockT*3)%2;
  let html="";
  for(let i=0;i<6;i++){
    let cls="st";
    if(i<wanted.level){
      if(red&&copSeen)cls="st red";
      else if(copSeen)cls="st on";
      else if(everSeen)cls=blinkOff?"st dim":"st on";
      else cls="st hollow";
    }
    html+=`<span class="${cls}">★</span>`;
  }
  starsEl.innerHTML=html;
  const ev=wanted.evidence,show=wanted.level>0||clockT-wanted.escapedT<120;
  {const u=clockT-wanted.lastSeenT,lim=14+5*wanted.level;seekEl.textContent=wanted.level===0?"":u<0.5?(player.handsUp?"Tu te rends…":"Tu es repéré !"):`${wanted.outside?"Hors de la zone de recherche":"Dans la zone de recherche"} · fuite ${Math.min(99,Math.round(100*(wanted.lose||0)/lim))} %`;seekEl.style.color=wanted.outside?"#9fe39f":"#ffb0b0";}
  evEl.innerHTML=show?[ev.cctv?"CAMÉRA":"",ev.clothes?"TENUE":"",ev.face?"VISAGE":""].filter(Boolean).map(t=>`<span>${t}</span>`).join(""):"";
}
function clearEvidence(){wanted.evidence={cctv:false,clothes:false,face:false};if(wanted.level===0)hudMsg("Nouvelle tenue : la police ne te reconnaît plus");}
function arrestPlayer(){
  if(arrestEl.style.display==="flex")return;
  arrestEl.style.display="flex";koEl.style.display="none";
  let fine=Math.min(money,Math.round(money*0.5+wanted.level*25));if(player.handsUp)fine=Math.round(fine*0.4);
  if(player.handsUp){player.handsUp=false;for(const a of player.arms)a.rFn=null;}money-=fine;moneyEl.textContent=money+" €";
  arrestEl.querySelector("small").textContent=(fine?`Amende : -${fine} €`:"Tu passes la nuit au poste.")+(wanted.surrendered?" (réduite : tu t'es rendu)":"");wanted.surrendered=false;
  setTimeout(()=>{
    wanted.level=0;wanted.heat=0;wanted.evidence={cctv:false,clothes:false,face:false};wanted.escapedT=-999;
    if(player.ko)player.endKO();
    player.root.set(0,0,-6);pushOutOfObstacles(player.root,0.4);player.yaw=player.targetYaw=90;player.vel.set(0,0,0);player.setRig(player.rig,true);player.hp=100;player.stamina=100;
    arrestEl.style.display="none";hudMsg("Libéré sous caution");
  },3200);
}
// --- voitures de police
const PCM={body:new THREE.MeshStandardMaterial({color:0x14213d,roughness:0.3,metalness:0.4}),white:new THREE.MeshStandardMaterial({color:0xf2f2f0,roughness:0.3,metalness:0.2}),
  glass:AMB.glass,tire:AMB.tire,rim:AMB.rim,red:new THREE.MeshStandardMaterial({color:0xff2020,emissive:0xff0000,emissiveIntensity:0.2}),blue:new THREE.MeshStandardMaterial({color:0x2060ff,emissive:0x2060ff,emissiveIntensity:0.2}),
  txt:new THREE.MeshStandardMaterial({map:textTex("POLICE",512,128,"#f2f2f0","#14213d","bold 96px sans-serif"),roughness:0.3,side:THREE.DoubleSide,polygonOffset:true,polygonOffsetFactor:-2})};
function buildPoliceCar(swat){
  const g=new THREE.Group(),add=(geo,mat,x,y,z,par=g)=>{const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;par.add(m);return m;},B=(a,b,c)=>new THREE.BoxGeometry(a,b,c);
  add(B(1.85,0.62,4.6),swat?new THREE.MeshStandardMaterial({color:0x1a1c20,roughness:0.4,metalness:0.4}):PCM.body,0,0.62,0);
  add(B(1.87,0.42,1.9),PCM.white,0,0.66,-0.15);   // portes blanches
  add(B(1.6,0.55,2.2),PCM.body,0,1.2,-0.25);      // habitacle
  add(B(1.55,0.5,0.05),PCM.glass,0,1.2,0.87).rotation.x=-0.5;
  add(B(1.55,0.45,0.05),PCM.glass,0,1.22,-1.37).rotation.x=0.5;
  for(const s of [-1,1])add(B(0.04,0.4,1.9),PCM.glass,s*0.81,1.22,-0.25);
  for(const s of [-1,1]){const m=add(new THREE.PlaneGeometry(1.6,0.36),PCM.txt,s*0.94,0.68,-0.15);m.rotation.y=s*Math.PI/2;m.castShadow=false;}
  add(B(1.2,0.1,0.3),AMB.dark,0,1.52,-0.15);
  const lr=add(B(0.55,0.12,0.26),PCM.red.clone(),-0.33,1.6,-0.15),lb=add(B(0.55,0.12,0.26),PCM.blue.clone(),0.33,1.6,-0.15);
  for(const s of [-1,1]){add(B(0.3,0.12,0.04),AMB.light,s*0.62,0.7,2.31);add(B(0.3,0.12,0.04),AMB.rear,s*0.62,0.72,-2.31);}
  const wheels=[];
  for(const [x,z] of [[-0.86,1.45],[0.86,1.45],[-0.86,-1.45],[0.86,-1.45]]){const w=new THREE.Group();w.position.set(x,0.35,z);g.add(w);const t=add(new THREE.CylinderGeometry(0.35,0.35,0.24,20),PCM.tire,0,0,0,w);t.rotation.z=Math.PI/2;const r=add(new THREE.CylinderGeometry(0.2,0.2,0.26,12),PCM.rim,0,0,0,w);r.rotation.z=Math.PI/2;wheels.push(w);}
  return {g,lr,lb,wheels};
}
function copLook(swat){
  const p=randomPerson(Math.random);
  if(swat){p.sex="m";p.height=rand(1.78,1.92);p.build=rand(1.1,1.25);}
  Object.assign(p,{top:"long",topColor:swat?"#16181b":"#1c2a44",jacket:swat?"#24272c":null,bottom:"pants",bottomColor:swat?"#16181b":"#1a2438",cuffs:false,shoes:["#111113","#111113"],boots:true,hat:"police",badge:true,glasses:Math.random()<0.15?"sun":null});
  if(p.hair==="afro"||p.hair==="long"||p.hair==="curly"||p.hair==="bob")p.hair=p.sex==="f"?"bun":"short";
  return p;
}
function spawnPoliceCar(targetPos,suspect){
  const target=(targetPos||wanted.lastSeenPos).clone();
  // les voitures arrivent de plusieurs côtés pour encercler
  // on choisit une direction d'arrivée dégagée (une rue), en variant les côtés pour encercler
  let dir=null,stop=null,best=-1;const off=policeCars.length*1.9+rand(0,6.28);
  for(let i=0;i<16;i++){
    const a=off+i/16*Math.PI*2,d=new V3(Math.sin(a),0,Math.cos(a)),s=target.clone().addScaledVector(d,rand(4,6.5));
    s.x=clamp(s.x,W_MIN+40,W_MAX-40);s.z=clamp(s.z,W_MIN+40,W_MAX-40);pushOutOfObstacles(s,2.5);
    const sc=(clearPath(s,d,38,1.6)?10:0)+(freeSpot(s,1.6)?3:0)-i*0.05;
    if(sc>best){best=sc;dir=d;stop=s;}
  }
  const start=stop.clone().addScaledVector(dir,38);
  const m=buildPoliceCar(wanted.level>=5);scene.add(m.g);m.g.position.copy(start);
  const yaw=Math.atan2(-dir.x,-dir.z);m.g.rotation.y=yaw;
  policeCars.push({g:m.g,m,state:"arrive",stop,yaw,speed:0,crew:0,planned:suspect?0:2,t:0,wheelRot:0,hx:0.95,hz:2.35,off:0,dir,swat:wanted.level>=5,suspect});
}
let siren=null;
function updateSiren(){
  const c=actx;if(!c)return;
  if(!siren){try{const o=c.createOscillator(),lfo=c.createOscillator(),lg=c.createGain(),g=c.createGain();o.type="sawtooth";o.frequency.value=900;lfo.frequency.value=0.7;lg.gain.value=320;lfo.connect(lg).connect(o.frequency);const f=c.createBiquadFilter();f.type="lowpass";f.frequency.value=1600;o.connect(f).connect(g).connect(sirenOut());g.gain.value=0;o.start();lfo.start();siren={g};}catch(e){return;}}
  let near=99;for(const p of policeCars)if(p.state==="arrive"||p.state==="leave")near=Math.min(near,hdist(p.g.position,player.root));
  const vol=voiceOn&&near<60?clamp(0.06*(1-near/60),0,0.06):0;
  siren.g.gain.setTargetAtTime(vol,c.currentTime,0.2);
}
function updatePoliceCars(dt){
  for(let i=policeCars.length-1;i>=0;i--){
    const C=policeCars[i],g=C.g;C.t+=dt;
    const on=Math.floor(clockT*5)%2===0;
    C.m.lr.material.emissiveIntensity=on?4:0.2;C.m.lb.material.emissiveIntensity=on?0.2:4;
    let mv=0;
    const drive=(target,maxSp)=>{const to=new V3().subVectors(target,g.position);to.y=0;const d=to.length();const want=Math.min(maxSp,Math.sqrt(2*6*Math.max(0,d-0.05)));C.speed=lerp(C.speed,want,1-Math.exp(-2.5*dt));const step=Math.min(d,C.speed*dt);if(d>1e-4)g.position.addScaledVector(to.divideScalar(d),step);mv=step;return d<0.1;};
    if(C.state==="arrive"){
      if(drive(C.stop,22)){
        C.state="parked";
        const side=new V3(Math.cos(C.yaw),0,-Math.sin(C.yaw));
        const n=2;
        for(let k=0;k<n;k++){
          const p=g.position.clone().addScaledVector(side,(k?-1:1)*1.35);pushOutOfObstacles(p,0.3);
          const cl=copLook(C.swat),w=new Walker(buildRig(makeHuman(cl)),new CopBrain(C),p,C.yaw*-180/Math.PI+180);w.look=JSON.parse(JSON.stringify(cl));
          w.isCop=true;w.swat=C.swat;w.hand=Math.random()<0.1?-1:1;w.power=C.swat?rand(1.25,1.45):rand(1.05,1.3);w.voicePitch=rand(0.75,1.1);w.voiceRate=rand(1.05,1.2);
          walkers.push(w);C.crew++;
          if(k===0&&C.suspect){w.brain.suspect=C.suspect;}
          if(k===0&&!C.suspect)later(0.4,()=>say(w,pick(["Police ! Plus un geste !","Police ! Arrête-toi !","On te voit ! Ne bouge plus !"])));
        }
      }
    }else if(C.state==="parked"){
      if(C.crew<=0){C.planned=0;C.state="leave";C.t=0;C.speed=0;C.exit=g.position.clone().addScaledVector(C.dir,70);C.yaw0=C.yaw;}
    }else if(C.state==="leave"){
      // demi-tour sur place puis on repart par la rue d'arrivée
      const want=Math.atan2(C.dir.x,C.dir.z),k=sst(0,1.6,C.t);C.yaw=C.yaw0+Math.atan2(Math.sin(want-C.yaw0),Math.cos(want-C.yaw0))*k;
      if(C.t>1.2)drive(C.exit,14);if(C.t>9){scene.remove(g);policeCars.splice(i,1);continue;}
    }
    g.rotation.y=C.yaw;C.wheelRot+=mv/0.35;C.m.wheels.forEach(w=>w.rotation.x=C.wheelRot);
  }
}
// --- cerveau d'un policier
const taserMat=new THREE.LineBasicMaterial({color:0xfff27a});
function taserFx(a,b){
  const pts=[];for(let i=0;i<=10;i++){const p=a.clone().lerp(b,i/10);if(i&&i<10)p.add(new V3(rand(-0.05,0.05),rand(-0.05,0.05),rand(-0.05,0.05)));pts.push(p);}
  const l=new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),taserMat);scene.add(l);setTimeout(()=>scene.remove(l),280);
  const c=actx;if(c){try{const o=c.createOscillator(),g=c.createGain();o.type="square";o.frequency.value=70;g.gain.setValueAtTime(0.12,c.currentTime);g.gain.exponentialRampToValueAtTime(0.001,c.currentTime+0.5);o.connect(g).connect(sfxOut());o.start();o.stop(c.currentTime+0.5);}catch(e){}}
}
class CopBrain{
  constructor(car){this.car=car;this.state="chase";this.arrestT=0;this.cd=rand(0.4,1);this.shoutT=rand(1,3);this.hostile=false;this.searchPt=null;this.seed=Math.random()*100;
    this.flank=rand(-1,1);this.tackleCd=rand(1,2);this.taser=null;this.taserCd=rand(1.5,3);}
  onIncoming(w,att,a){if(w.ko)return;const r=Math.random();if(r<0.38)w.guardT=Math.max(w.guardT,a.dur+0.25);else if(r<0.5){const away=new V3().subVectors(w.root,att.root);away.y=0;w.vel.addScaledVector(away.normalize(),2.2);}}
  onHit(w,att){if(att===player){this.hostile=true;wanted.engageT=clockT;}if(Math.random()<0.6)say(w,pick(["Aïe ! Tu vas le regretter !","Résistance aux forces de l'ordre !","Ça, tu vas le payer !"]));}
  bumped(){}
  handleSuspect(w,dt){
    const s=this.suspect,sb=s.brain;
    if(!walkers.includes(s)||(s.ko&&!s.ko.knock)){dropSuspect(s);this.suspect=null;return false;}
    this.tackleCd-=dt;this.cd-=dt;
    if(sb.cuffed){ // on l'emmène à la voiture
      this.escT=(this.escT||0)+dt;
      const car=this.car.g.position,to=new V3().subVectors(car,w.root);to.y=0;const d=to.length();
      if(d<3.2||(d<4.2&&this.escT>6)){removeWalker(s,false);dropSuspect(s);hudMsg("L'agresseur a été emmené au poste");this.suspect=null;this.state=wanted.level>0?"chase":"return";return true;}
      const dir=to.divideScalar(d);dir.add(avoidObstacles(w.root,dir));if(dir.length()>1)dir.normalize();w.wish.copy(dir);w.speedMul=0.65;w.run=false;return true;
    }
    const to=new V3().subVectors(s.root,w.root);to.y=0;const dist=to.length(),dir=to.clone().divideScalar(dist||1);
    if(!this.warned&&dist<9&&canSee(w,s,12,260)){this.warned=true;say(w,pick(["Police ! Vous, là, arrêtez-vous !","Monsieur ! Restez où vous êtes !","Police ! On ne bouge plus !"]));if(sb.onCopApproach)later(0.5,()=>sb.onCopApproach(s,w));}
    if(s.ko){w.wish.copy(dir).multiplyScalar(dist>1.2?1:0);w.run=false;return true;}
    if(dist<1.15){
      w.faceYaw=Math.atan2(to.x,-to.z)/D2R;
      if(s.speed>1.5&&this.tackleCd<=0){this.tackleCd=rand(2.5,4);w.vel.addScaledVector(dir,3);
        if(Math.random()<0.7){s.startKO(dir.clone(),w,{getUp:2.4,fast:true});sb.pendingCuff=w;floatText(s,"Plaqué !","#fff");playSound("thud",0.8);}
        w.startKO(dir.clone(),w,{getUp:1.4,fast:true});return true;}
      if(sb.fight&&sb.fight.target===w){w.guardT=0.5;if(this.cd<=0&&!w.atk){w.startAttack(Math.random()<0.25?"kick":"punch",s,isGuarding(s)?"belly":"head");this.cd=rand(0.6,1.1);}w.wish.copy(dir).multiplyScalar(clamp((dist-0.75)*2,-0.5,0.5));return true;}
      sb.cuff(s,w);say(w,pick(["Vous êtes en état d'arrestation !","Les mains derrière le dos !","On ne frappe pas les gens."]));return true;
    }
    const d2=dir.clone().add(avoidObstacles(w.root,dir));if(d2.length()>1)d2.normalize();
    w.wish.copy(d2);w.run=dist>2;return true;
  }
  update(w,dt){
    w.faceYaw=null;w.speedMul=w.swat?1.04:0.98;w.run=false;
    const pl=player;
    for(const a of w.arms)if(a.rFn&&a._taser){a.rFn=null;a._taser=false;}
    if(this.suspect&&this.state!=="return"&&!(wanted.level>0&&this.hostile)){if(this.handleSuspect(w,dt))return;}
    if(this.state==="return"||(wanted.level===0&&!this.suspect)||arrestEl.style.display==="flex"){
      this.state="return";this.taser=null;
      const car=this.car.g.position,to=new V3().subVectors(car,w.root);to.y=0;const d=to.length();
      if(d<2.0){removeWalker(w,true);this.car.crew--;return;}
      const dir=to.divideScalar(d);dir.add(avoidObstacles(w.root,dir));if(dir.length()>1)dir.normalize();w.wish.copy(dir);return;
    }
    const sees=copSees(w);
    const to=new V3().subVectors(pl.root,w.root);to.y=0;const dist=to.length(),dirTo=to.clone().divideScalar(dist||1);
    this.shoutT-=dt;this.cd-=dt;this.tackleCd-=dt;this.taserCd-=dt;
    if(sees&&this.shoutT<=0){this.shoutT=rand(5,9);say(w,pick(dist<2?["Les mains en l'air !","À terre ! Tout de suite !","Ne bouge plus !"]:["Arrête-toi !","Police ! Stop !","Il part par là !","Coupez-lui la route !"]));}
    // --- Taser (2 étoiles et plus)
    if(this.taser){
      const T=this.taser;T.t+=dt;w.faceYaw=Math.atan2(to.x,-to.z)/D2R;w.wish.set(0,0,0);
      const dom=w.arms[w.hand<0?0:1];dom._taser=true;
      dom.rFn=(ww,sh)=>({target:sh.clone().add(new V3().subVectors(wp(pl.rig.b.Spine2),sh).normalize().multiplyScalar(0.55)),w:Math.min(1,T.t*5),wrist:0});
      if(T.t>0.75&&!T.fired){
        T.fired=true;const hand=wp(w.rig.b[(w.hand<0?"Left":"Right")+"Hand"]);
        const hit=sees&&dist<10&&!pl.ko&&Math.random()<0.72;
        const tgt=hit?wp(pl.rig.b.Spine2):wp(pl.rig.b.Spine2).add(new V3(rand(-0.8,0.8),rand(-0.3,0.4),rand(-0.8,0.8)));
        taserFx(hand,tgt);wanted.engageT=clockT;
        if(hit){floatText(pl,"Tasé !","#fff27a");flashHurt(12);pl.hp=Math.max(1,pl.hp-6);pl.startKO(dirTo.clone(),w,{getUp:3.4,stun:true,fast:true});}
      }
      if(T.t>1.1){this.taser=null;this.taserCd=rand(3,5);}
      return;
    }
    if(sees&&!pl.ko){
      const resisting=!pl.handsUp&&(this.hostile||pl.atk||pl.speed>0.8||wanted.level>=3);
      if(pl.handsUp){wanted.surrendered=true;w.run=false;}
      if(resisting)wanted.engageT=clockT;
      if(!pl.handsUp&&wanted.level>=2&&dist>3&&dist<9&&this.taserCd<=0&&!w.atk){this.taser={t:0};say(w,pick(["Taser !","Arrête-toi ou je tire !","Au sol !"]));return;}
      // plaquage si tu t'enfuis en courant
      if(dist<1.15&&pl.speed>1.5&&this.tackleCd<=0&&!w.atk){
        this.tackleCd=rand(2.5,4);
        w.vel.addScaledVector(dirTo,3);
        if(Math.random()<0.65){pl.startKO(dirTo.clone(),w,{getUp:3,fast:true});floatText(pl,"Plaqué !","#ffffff");playSound("thud",1);w.startKO(dirTo.clone(),w,{getUp:1.4,fast:true});}
        else{w.startKO(dirTo.clone(),w,{getUp:1.6,fast:true});say(w,"Raté !");}
        return;
      }
      if(dist<1.25){
        const fy=Math.atan2(to.x,-to.z)/D2R;w.faceYaw=fy;w.guardT=0.5;
        w.wish.copy(dirTo).multiplyScalar(clamp((dist-0.75)*2,-0.5,0.6));
        if(!resisting){this.arrestT+=dt;if(this.arrestT>(pl.handsUp?1.0:1.6)){if(pl.handsUp)say(w,"Tu as bien fait de te rendre.");arrestPlayer();}}
        else{
          this.arrestT=Math.max(0,this.arrestT-dt);
          if(this.cd<=0&&!w.atk&&Math.abs(deltaAngle(w.yaw,fy))<30){
            if(Math.random()<0.25)w.startAttack("kick",pl,isGuarding(pl)?"legs":"belly");
            else w.startAttack("punch",pl,isGuarding(pl)?"belly":"head");
            this.cd=rand(0.5,1.0);
          }
        }
        return;
      }
      this.arrestT=0;
      // interception : on vise où tu vas être, et on t'encercle
      const lead=Math.min(1.4,dist/3.5);
      const aim=pl.root.clone().addScaledVector(pl.vel,lead);
      if(dist>3){const side=new V3(-dirTo.z,0,dirTo.x);aim.addScaledVector(side,this.flank*Math.min(4,dist*0.35));}
      const dir=new V3().subVectors(aim,w.root);dir.y=0;dir.normalize();dir.add(avoidObstacles(w.root,dir));if(dir.length()>1)dir.normalize();
      w.wish.copy(dir);w.run=dist>1.8&&!pl.handsUp;if(pl.handsUp)w.wish.multiplyScalar(0.7);
      if(w.run&&dist<8)w.speedMul=w.swat?1.1:1.05;
      return;
    }
    // recherche autour de la dernière position connue
    if(!this.searchPt||hdist(w.root,this.searchPt)<1.2){
      const a=Math.random()*Math.PI*2,r=rand(0,Math.max(6,wanted.searchR*0.9));this.searchPt=wanted.lastSeenPos.clone().add(new V3(Math.cos(a)*r,0,Math.sin(a)*r));
      const lim=PLATE-1;this.searchPt.x=clamp(this.searchPt.x,-lim,lim);this.searchPt.z=clamp(this.searchPt.z,-lim,lim);
    }
    const t2=new V3().subVectors(this.searchPt,w.root);t2.y=0;const d2=t2.length();
    const dir=t2.divideScalar(d2||1);dir.add(avoidObstacles(w.root,dir));if(dir.length()>1)dir.normalize();
    w.wish.copy(dir);w.run=clockT-wanted.lastSeenT<8;
  }
}
// --- hélicoptère (4 étoiles et plus)
let heli=null;
function spawnHeli(){
  const g=new THREE.Group(),M=(c,m=0.4)=>new THREE.MeshStandardMaterial({color:c,roughness:0.4,metalness:m});
  const add=(geo,mat,x,y,z,par=g)=>{const o=new THREE.Mesh(geo,mat);o.position.set(x,y,z);o.castShadow=true;par.add(o);return o;};
  const body=add(new THREE.SphereGeometry(1,20,14),M(0x1b2a48),0,0,0);body.scale.set(1.1,1,2);
  add(new THREE.SphereGeometry(0.75,16,10),AMB.glass,0,0.15,1.1).scale.set(1.2,0.9,1);
  add(new THREE.BoxGeometry(0.3,0.35,3.4),M(0x1b2a48),0,0.2,-2.9);
  add(new THREE.BoxGeometry(0.08,0.9,0.5),M(0xf2f2f0),0,0.6,-4.4);
  add(new THREE.BoxGeometry(2.3,0.05,0.9),M(0xf2f2f0,0.2),0,-0.1,-0.2);
  for(const s of [-1,1])add(new THREE.BoxGeometry(0.08,0.08,2.6),M(0x222222,0.7),s*0.8,-1.15,0);
  const rotor=new THREE.Group();rotor.position.y=1.1;g.add(rotor);
  for(let i=0;i<4;i++){const b=add(new THREE.BoxGeometry(0.22,0.03,5.2),M(0x111111,0.6),0,0,0,rotor);b.rotation.y=i*Math.PI/4*2;}
  const tail=new THREE.Group();tail.position.set(0.2,0.6,-4.4);g.add(tail);
  for(let i=0;i<2;i++){const b=add(new THREE.BoxGeometry(0.02,1.2,0.12),M(0x111111),0,0,0,tail);b.rotation.x=i*Math.PI/2;}
  const red=add(new THREE.SphereGeometry(0.08,8,6),new THREE.MeshStandardMaterial({color:0xff0000,emissive:0xff0000,emissiveIntensity:2}),0,-0.9,0);
  const spot=new THREE.SpotLight(0xfff8e0,60,40,0.22,0.5,1.2);spot.castShadow=false;g.add(spot);scene.add(spot.target);
  const beamGeo=new THREE.ConeGeometry(2.6,18,24,1,true);beamGeo.translate(0,-9,0);
  const beam=new THREE.Mesh(beamGeo,new THREE.MeshBasicMaterial({color:0xfff6d8,transparent:true,opacity:0.07,depthWrite:false,side:THREE.DoubleSide}));g.add(beam);
  const p0=wanted.lastSeenPos.clone().add(new V3(60,18,0));g.position.copy(p0);scene.add(g);
  heli={g,rotor,tail,spot,beam,red,aim:wanted.lastSeenPos.clone(),t:0,leaving:false};
  hudMsg("Hélicoptère de police en approche");
}
function updateHeli(dt){
  if(!heli)return;
  const H=heli;H.t+=dt;H.rotor.rotation.y+=dt*38;H.tail.rotation.x+=dt*50;
  H.red.material.emissiveIntensity=Math.floor(clockT*2)%2?3:0.2;
  if(wanted.level<4&&!H.leaving){H.leaving=true;H.exit=H.g.position.clone().add(new V3(80,10,40));}
  let goal;
  if(H.leaving){goal=H.exit;}
  else{
    const known=clockT-wanted.lastSeenT<3?player.root:wanted.lastSeenPos;
    H.aim.lerp(known,1-Math.exp(-1.5*dt));
    goal=H.aim.clone().add(new V3(Math.sin(H.t*0.3)*7,18,Math.cos(H.t*0.3)*7));
  }
  const to=new V3().subVectors(goal,H.g.position),d=to.length();
  H.g.position.addScaledVector(to,Math.min(1,dt*(H.leaving?0.5:0.8)));
  const fw=new V3(to.x,0,to.z);if(fw.length()>0.5)H.g.rotation.y=lerpAngle(H.g.rotation.y*180/Math.PI,Math.atan2(fw.x,fw.z)*180/Math.PI,dt*2)*D2R;
  H.g.rotation.z=clamp(-to.x*0.01,-0.2,0.2);H.g.rotation.x=clamp(fw.length()*0.01,0,0.15);
  // projecteur
  const tgt=H.leaving?H.g.position.clone().add(new V3(0,-20,0)):H.aim.clone();
  H.spot.target.position.copy(tgt);H.spot.position.set(0,-0.9,0);
  const dl=new V3().subVectors(tgt,H.g.position);
  H.beam.quaternion.copy(H.g.quaternion.clone().invert().multiply(new Q().setFromUnitVectors(new V3(0,-1,0),dl.clone().normalize())));
  H.beam.scale.set(1,dl.length()/18,1);
  // repérage depuis le ciel (les arbres te cachent)
  if(!H.leaving&&wanted.level>0){
    const under=obsAt(player.root).some(o=>o.tall&&obstacleClosest(o,player.root).d<0.3)||portHidden(player.root);
    if(hdist(H.aim,player.root)<9&&!under){wanted.lastSeenPos.copy(player.root);wanted.lastSeenT=clockT;}
  }
  if(H.leaving&&d<5){scene.remove(H.g);scene.remove(H.spot.target);heli=null;}
}
function showPhone(w,on){
  if(on&&!w.phone){const m=new THREE.Mesh(new THREE.BoxGeometry(0.035,0.075,0.01),new THREE.MeshStandardMaterial({color:0x111111,roughness:0.3}));const hb=w.rig.b[(w.brain.hand<0?"Left":"Right")+"Hand"];hb.add(m);m.position.set(0,0.06/ (hb.getWorldScale(new V3()).x||1),0);m.scale.setScalar(1/(hb.getWorldScale(new V3()).x||1));w.phone=m;}
  if(!on&&w.phone){w.phone.removeFromParent();w.phone=null;}
}
// --- mini-carte
const mm=document.getElementById("minimap"),mctx=mm.getContext("2d");
let mmZoom=22;
const MM_COL={mais:"#8a9a3a",tournesol:"#c8b830",lavande:"#8a6ab8",serres:"#9ac0b0",verger:"#5f8a3a",ranch:"#a89a5a",pinede:"#3a5a32",palmeraie:"#9a9a5a",mesa:"#b8683a",jungle:"#2a5a22",bambou:"#6aa03a",fleurs:"#7aaa5a",dunes:"#e0d0a0",mangrove:"#4a5a32",riviere:"#3f88a8",ilot:"#d8c49a",champ:"#a59a4a",prairie:"#6c8f45",foret:"#3d6034",lande:"#7d8550",montagne:"#8a847a",savane:"#a9a45e",orangeraie:"#5f8a3a",vigne:"#7a8a44",ferme:"#8a7a4a",eolien:"#8f9a4a",bayou:"#556b3a",plage:"#d8c49a",cayo:"#d8c49a",mer:"#3f88a8",lac:"#3f88a8",aeroport:"#6a7a5a",station_route:"#5a5e66",motel:"#5a5e66",diner:"#5a5e66",relais:"#5a5e66",camping:"#5c7d4c",aire:"#5a5e66"};
function drawMinimap(){
  mmZoom=lerp(mmZoom,player.speed>3?34:player.speed>1.6?27:22,0.03);
  const W=mm.width,H=mm.height,c=mctx,sc=W/2/mmZoom;
  c.save();c.clearRect(0,0,W,H);
  c.beginPath();c.arc(W/2,H/2,W/2-2,0,Math.PI*2);c.clip();
  c.fillStyle="rgba(30,34,40,.85)";c.fillRect(0,0,W,H);
  c.translate(W/2,H/2);c.rotate(-cam.yaw*D2R);
  const px=player.root.x,pz=player.root.z,T=(x,z)=>[(x-px)*sc,(z-pz)*sc];
  c.fillStyle="#3c4046";const [ax,az]=T(-WORLD,-WORLD);c.fillRect(ax,az,WORLD*2*sc,WORLD*2*sc);{const [sx,sz]=T(588,-1300);c.fillStyle="#3f88a8";c.fillRect(sx,sz,1400*sc,2600*sc);for(const I of ISLANDS){const [ix,iz]=T(I.x,I.z);c.fillStyle="#d8c49a";c.beginPath();c.arc(ix,iz,I.r*1.05*sc,0,7);c.fill();c.fillStyle="#5f8a4c";c.beginPath();c.arc(ix,iz,I.r*0.7*sc,0,7);c.fill();}for(const f of SEA_FEATURES){const [fx,fz]=T(f.x0,f.z0);c.fillStyle="#a07850";c.fillRect(fx,fz,(f.x1-f.x0)*sc,(f.z1-f.z0)*sc);}}
  for(let i=chunkOf(px)-2;i<=chunkOf(px)+2;i++)for(let j=chunkOf(pz)-2;j<=chunkOf(pz)+2;j++){if(!chunkExists(i,j))continue;if(isCountry(i,j)){const t=chunkType(i,j);const [qx,qz]=T(i*CHUNK-20,j*CHUNK-20);c.fillStyle=MM_COL[t]||"#6c8f45";c.fillRect(qx,qz,40*sc+1,40*sc+1);if(t!=="mer"&&t!=="lac"&&t!=="bayou"&&t!=="riviere"&&t!=="mangrove"&&t!=="ilot")continue;for(let a=0;a<4;a++)for(let b=0;b<4;b++){const x=i*CHUNK-15+a*10,z=j*CHUNK-15+b*10;const w=waterDepth(x,z)>0;if(t==="bayou"||t==="riviere"||t==="mangrove"?w:!w){const [wx,wz]=T(x-5,z-5);c.fillStyle=t==="bayou"?"#4a6a5a":t==="riviere"||t==="mangrove"?"#3f88a8":"#d8c49a";c.fillRect(wx,wz,10*sc+1,10*sc+1);}}continue;}const ch={cx:i,cz:j,bx0:i*CHUNK-12,bz0:j*CHUNK-12,bs:32,type:chunkType(i,j)};const [x,z]=T(ch.bx0,ch.bz0);c.fillStyle=TYPE_COLOR[ch.type]||"#8d9196";c.fillRect(x,z,(ch.type==="plage"?40:32)*sc,ch.bs*sc);for(const s of sandOf(i,j)){const [sx,sz]=T(s.x0,s.z0);c.fillStyle="#d8c49a";c.fillRect(sx,sz,(s.x1-s.x0)*sc,(s.z1-s.z0)*sc);}for(const F of reliefOf(ch.cx,ch.cz)){const [fx,fz]=T(F.x0,F.z0);c.fillStyle=F.kind==="box"?(F.h>2?"#e4dccb":"#bdb6a8"):"#a7a196";c.fillRect(fx,fz,(F.x1-F.x0)*sc,(F.z1-F.z0)*sc);}}
  for(const f of SEA_FEATURES){if(f.x1<px-60||f.x0>px+60||f.z1<pz-60||f.z0>pz+60)continue;const [fx,fz]=T(f.x0,f.z0);c.fillStyle=f.port?"#8d8b86":"#a07850";c.fillRect(fx,fz,(f.x1-f.x0)*sc,(f.z1-f.z0)*sc);}
  for(const Hw of HWYS){const L=Hw.k*CHUNK-16,a=Hw.a*CHUNK-16,b=Hw.b*CHUNK-16,hw=Hw.small?5:8.6;if(Hw.ax==="ns"){if(Math.abs(L-px)>80||pz<a-80||pz>b+80)continue;const [x0,z0]=T(L-hw,Math.max(a,pz-80));c.fillStyle="#2c2f35";c.fillRect(x0,z0,hw*2*sc,(Math.min(b,pz+80)-Math.max(a,pz-80))*sc);}else{if(Math.abs(L-pz)>80||px<a-80||px>b+80)continue;const [x0,z0]=T(Math.max(a,px-80),L-hw);c.fillStyle="#2c2f35";c.fillRect(x0,z0,(Math.min(b,px+80)-Math.max(a,px-80))*sc,hw*2*sc);}}
  c.fillStyle="#5d6166";for(const o of obstacles){if(Math.abs(o.x-px)>40||Math.abs(o.z-pz)>40)continue;if(o.bld)c.fillStyle="#c9c3b6";else c.fillStyle="#5d6166";const [x,z]=T(o.x,o.z);if(o.type==="circle"){c.beginPath();c.arc(x,z,Math.max(1.5,o.r*sc),0,7);c.fill();}else c.fillRect(x-o.hx*sc,z-o.hz*sc,o.hx*2*sc,o.hz*2*sc);}
  if(wanted.level>0&&clockT-wanted.lastSeenT>0.8){const [x,z]=T(wanted.lastSeenPos.x,wanted.lastSeenPos.z);c.fillStyle="rgba(255,60,60,.16)";c.beginPath();c.arc(x,z,wanted.searchR*sc,0,7);c.fill();c.strokeStyle=Math.floor(clockT*2)%2?"rgba(255,80,80,.8)":"rgba(80,120,255,.8)";c.lineWidth=2;c.stroke();}
  if(wanted.level>0)for(const w of walkers){if(!w.isCop||w.ko)continue;const [x,z]=T(w.root.x,w.root.z),a=w.yaw*D2R-Math.PI/2;c.fillStyle="rgba(120,170,255,.18)";c.beginPath();c.moveTo(x,z);c.arc(x,z,14*sc,a-0.9,a+0.9);c.closePath();c.fill();}
  for(const cm of cams){const [x,z]=T(cm.x,cm.z);c.fillStyle=cm.alert>0?"#ff4040":"#e8e8e8";c.fillRect(x-2,z-2,4,4);}
  for(const w of walkers){if(w===player)continue;const [x,z]=T(w.root.x,w.root.z);
    c.fillStyle=w.isCop?(Math.floor(clockT*4)%2?"#ff3030":"#3070ff"):w.ko?"#ff9090":"rgba(255,255,255,.55)";c.beginPath();c.arc(x,z,w.isCop?3.5:2,0,7);c.fill();}
  mpMini(c,T,W,H);
  for(const V of vans){const [x,z]=T(V.v.g.position.x,V.v.g.position.z);c.fillStyle="#fff";c.fillRect(x-3,z-3,6,6);}
  for(const C of policeCars){const [x,z]=T(C.g.position.x,C.g.position.z);c.fillStyle="#3070ff";c.fillRect(x-3.5,z-3.5,7,7);}
  if(wanted.hot){const [x,z]=T(wanted.hot.pos.x,wanted.hot.pos.z);c.strokeStyle="rgba(255,140,40,.7)";c.lineWidth=2;c.beginPath();c.arc(x,z,8*sc,0,7);c.stroke();}
  if(route){c.strokeStyle="#b56cff";c.lineWidth=4;c.lineJoin="round";c.beginPath();route.forEach((q,i)=>{const [x,z]=T(q.x,q.z);i?c.lineTo(x,z):c.moveTo(x,z);});c.stroke();}
  for(const P of POIS){if(Math.abs(P.x-px)>mmZoom*1.4||Math.abs(P.z-pz)>mmZoom*1.4)continue;const [x,z]=T(P.x,P.z);c.save();c.translate(x,z);c.rotate(cam.yaw*D2R);c.font="11px system-ui";c.textAlign="center";c.fillText(POI_ICON[P.type][0],0,4);c.restore();}
  if(heli){const [x,z]=T(heli.g.position.x,heli.g.position.z);c.fillStyle=Math.floor(clockT*4)%2?"#ff3030":"#3070ff";c.beginPath();c.arc(x,z,5,0,7);c.fill();}
  c.restore();
  // joueur au centre
  c.save();c.translate(W/2,H/2);c.rotate((player.yaw-cam.yaw)*D2R);c.fillStyle="#fff";c.beginPath();c.moveTo(0,-7);c.lineTo(5,6);c.lineTo(0,3);c.lineTo(-5,6);c.closePath();c.fill();c.restore();
  c.strokeStyle="rgba(255,255,255,.5)";c.lineWidth=2;c.beginPath();c.arc(W/2,H/2,W/2-2,0,7);c.stroke();
  // nord et point d'arrivée (collé au bord s'il est loin)
  const edge=(dx,dz,r)=>{const a=-cam.yaw*D2R,x=dx*Math.cos(a)-dz*Math.sin(a),z=dx*Math.sin(a)+dz*Math.cos(a),L=Math.hypot(x,z);return L>r?[W/2+x/L*r,H/2+z/L*r]:[W/2+x,H/2+z];};
  {const [nx,nz]=edge(0,-1000,W/2-11);c.fillStyle="rgba(16,18,24,.85)";c.beginPath();c.arc(nx,nz,8,0,7);c.fill();c.fillStyle="#fff";c.font="bold 10px system-ui";c.textAlign="center";c.fillText("N",nx,nz+3.5);}
  drawMissionMarks(c,edge,px,pz,sc,W);
  if(waypoint){const [wx,wz]=edge((waypoint.x-px)*sc,(waypoint.z-pz)*sc,W/2-10);c.fillStyle="#ffc83d";c.beginPath();c.arc(wx,wz,6,0,7);c.fill();c.strokeStyle="#3a2a00";c.lineWidth=2;c.stroke();}
}


