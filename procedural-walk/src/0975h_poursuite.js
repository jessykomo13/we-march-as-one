// ================================================================ MODULE 30 : police en voiture (poursuites, barrages)
// Quand on est recherché en voiture, des voitures de patrouille (gyrophares, sirène) arrivent de derrière et nous
// prennent en chasse : elles anticipent la trajectoire, contournent les obstacles, nous percutent (PIT) et peuvent être
// mises hors service à force de chocs. Elles ne voient pas à travers tout : hors de vue (> 55 m, ou 100 m avec
// l'hélico), elles vont au dernier endroit connu et on peut les semer. À 3 étoiles : barrages devant soi (voitures en
// travers + agents) ; à 4 étoiles : herse → pneus crevés (vitesse et adhérence réduites). Si on s'arrête près d'elles,
// les agents descendent ; un agent à côté de la portière d'une voiture arrêtée nous sort de force.
const PCH={list:[],blocks:[],spawnCk:0,blockCk:15,stopT:0,pullT:0,msgT:0,stats:{spawned:0,disabled:0,blocks:0,spikes:0,pulled:0,rams:0}};
function pchMax(){const n=[0,1,2,3,4,5,5][Math.min(6,wanted.level)]||0;return isTouch()?Math.min(3,n):n;}
function pchActive(){return wanted.level>0&&drive&&!drive.boat&&!(CREA.on&&CREA.noCops);}
// endroit d'apparition : derrière le joueur, hors de vue, sur une route si possible
function pchSpawnPoint(){const V=drive,f=fwdOf(V?V.yaw:player.yaw);
  for(let k=0;k<14;k++){const back=k<10,d=rand(75,105),a=(back?Math.PI:0)+rand(-0.7,0.7),c=Math.cos(a),s=Math.sin(a);
    const dx=f.x*c-f.z*s,dz=f.z*c+f.x*s;const p=new V3(player.root.x+dx*d,0,player.root.z+dz*d);
    const [HP,hdp]=nearestHwy(player.root.x,player.root.z),onH=HP&&hdp<hwyHalf(HP)+2&&!inGridArea(player.root.x,player.root.z);
    if(onH){const L=hwyLine(HP),o=HP.small?2.5:4.4,[a0,b0]=hwyRange(HP);if(HP.ax==="ns"){p.x=L+(player.root.x>L?o:-o);p.z=clamp(p.z,a0+10,b0-10);}else{p.z=L+(player.root.z>L?o:-o);p.x=clamp(p.x,a0+10,b0-10);}}
    else if(inGridArea(p.x,p.z)){const lx=Math.round((p.x+16)/40)*40-16,lz=Math.round((p.z+16)/40)*40-16;if(Math.abs(p.x-lx)<Math.abs(p.z-lz))p.x=lx;else p.z=lz;}
    else{const [H,hd]=nearestHwy(p.x,p.z);if(H&&hd<60){const L=hwyLine(H),o=H.small?2.5:4.4;if(H.ax==="ns")p.x=L+(p.x>L?o:-o);else p.z=L+(p.z>L?o:-o);}}
    if(waterDepth(p.x,p.z)>0.3)continue;const g0=groundAt(p.x,p.z);if(Math.abs(g0-groundAt(player.root.x,player.root.z))>12)continue;
    let blocked=false;for(const o of obsAt(p))if(obstacleClosest(o,p).d<1.6){blocked=true;break;}if(blocked)continue;
    // hors du champ de la caméra
    const v=new V3(p.x,g0+1,p.z).project(camera);if(v.z<1&&Math.abs(v.x)<1&&Math.abs(v.y)<1&&k<10)continue;
    return p;}
  return null;}
function pchSpawn(){const p=pchSpawnPoint();if(!p)return null;const m=buildPoliceCar(wanted.level>=5);scene.add(m.g);
  const to=new V3(player.root.x-p.x,0,player.root.z-p.z),yaw=Math.atan2(to.x,-to.z)/D2R;
  const P={g:m.g,m,x:p.x,z:p.z,y:groundAt(p.x,p.z),yaw,v:18,hp:100,stuck:0,t:0,dead:false,swat:wanted.level>=5,wheel:0,seeT:0,lastHit:0};P.g.position.set(P.x,P.y,P.z);
  PCH.list.push(P);PCH.stats.spawned++;if(PCH.list.length===1&&clockT-PCH.msgT>20){PCH.msgT=clockT;hudMsg("🚓 Poursuite ! La police te prend en chasse",2.6);}return P;}
function pchRemove(P){scene.remove(P.g);const i=PCH.list.indexOf(P);if(i>=0)PCH.list.splice(i,1);}
// une voiture de poursuite s'arrête : les agents descendent (elle passe dans la gestion « à pied » de la police)
function pchDeploy(P){pchRemove(P);scene.add(P.g);const yaw=Math.PI-P.yaw*D2R,f=fwdOf(P.yaw);
  policeCars.push({g:P.g,m:P.m,state:"arrive",stop:P.g.position.clone(),yaw,speed:0,crew:0,planned:2,t:0,wheelRot:P.wheel,hx:0.95,hz:2.35,off:0,dir:new V3(-f.x,0,-f.z),swat:P.swat});}
// sonde : distance libre devant (obstacles hauts, eau)
function pchProbe(x,z,yaw,len){const f=fwdOf(yaw),q=new V3();for(let s=2;s<=len;s+=1.6){q.set(x+f.x*s,0,z+f.z*s);
    if(waterDepth(q.x,q.z)>0.6)return s;for(const o of obsAt(q)){if(obstacleClosest(o,q).d<1.1)return s;}}return len;}
// en ville : on suit les rues de carrefour en carrefour (grille de 40 m, routes sur i*40-16)
const RL=v=>Math.round((v+16)/40)*40-16;
function pchRoute(P,tx,tz){
  if(!inGridArea(P.x,P.z)){ // autoroute : on suit sa voie, sans couper par le terre-plein
    const [H,hd]=nearestHwy(P.x,P.z);if(!H||hd>hwyHalf(H)+1.5)return [tx,tz];const [H2,hd2]=nearestHwy(tx,tz);if(H2!==H||hd2>hwyHalf(H)+4)return [tx,tz];
    const ns=H.ax==="ns",L=hwyLine(H),hw=hwyHalf(H)-1.3,sP=ns?P.z:P.x,sT=ns?tz:tx,latP=(ns?P.x:P.z)-L,latT=(ns?tx:tz)-L;
    let lat=Math.sign(latT)===Math.sign(latP)||Math.abs(latT)<1?latT:latP;lat=Math.sign(lat||1)*clamp(Math.abs(lat),1.8,hw);
    const sW=Math.abs(sT-sP)>30?sP+Math.sign(sT-sP)*30:sT;return ns?[L+lat,sW]:[sW,L+lat];}const lx=RL(P.x),lz=RL(P.z),onX=Math.abs(P.z-lz)<4.5,onZ=Math.abs(P.x-lx)<4.5,dx=tx-P.x,dz=tz-P.z;
  if(Math.hypot(dx,dz)<28&&los(new V3(P.x,P.y+1,P.z),new V3(tx,P.y+1,tz)))return [tx,tz];
  const step=(c,t)=>Math.abs(t-c)>22?RL(c)+40*Math.sign(t-c):RL(t);
  if(onX&&onZ){if(Math.abs(dx)>=Math.abs(dz)&&Math.abs(dx)>8)return [step(P.x,tx),lz];if(Math.abs(dz)>8)return [lx,step(P.z,tz)];return [tx,tz];}
  if(onX){if(Math.abs(tz-lz)<6)return [tx,lz];return [step(P.x,tx),lz];}
  if(onZ){if(Math.abs(tx-lx)<6)return [lx,tz];return [lx,step(P.z,tz)];}
  return Math.abs(P.x-lx)<Math.abs(P.z-lz)?[lx,P.z]:[P.x,lz];}
function pchStep(P,dt){
  P.t+=dt;const V=drive,tgtCar=V&&!V.boat;
  // voit-il le joueur ?
  const dP=Math.hypot(player.root.x-P.x,player.root.z-P.z),seeR=heli?100:wanted.level<=2?45:55;
  const sees=dP<seeR&&(dP<20||los(new V3(P.x,P.y+1.2,P.z),new V3(player.root.x,player.root.y+1.2,player.root.z)));
  if(sees){P.seeT=clockT;wanted.lastSeenPos.copy(player.root);wanted.lastSeenT=clockT;wanted.copSeenT=clockT;}
  // cible : le joueur (anticipé) s'il est vu, sinon le dernier endroit connu
  let tx,tz;if(clockT-P.seeT<1.5){const lead=clamp(dP/30,0,1.1),vx=tgtCar?V.vel.x:player.vel.x,vz=tgtCar?V.vel.z:player.vel.z;tx=player.root.x+vx*lead;tz=player.root.z+vz*lead;
      if(dP<9&&tgtCar){const f=fwdOf(V.yaw);tx=player.root.x+f.x*1.2;tz=player.root.z+f.z*1.2;}}  // collé : on vise l'arrière pour le PIT
  else{tx=wanted.lastSeenPos.x+Math.sin(P.t*0.3+P.x)*8;tz=wanted.lastSeenPos.z+Math.cos(P.t*0.3+P.z)*8;}
  const dT=Math.hypot(tx-P.x,tz-P.z),fx0=tx,fz0=tz;[tx,tz]=pchRoute(P,tx,tz);P._wp=[Math.round(tx),Math.round(tz)];let want=Math.atan2(tx-P.x,-(tz-P.z))/D2R;const city=inGridArea(P.x,P.z);
  // évitement : trois sondes
  const look=6+Math.abs(P.v)*0.7,c0=pchProbe(P.x,P.z,P.yaw,look);
  if(c0<look){const l=pchProbe(P.x,P.z,P.yaw-40,look),r=pchProbe(P.x,P.z,P.yaw+40,look);want=P.yaw+(l>r?-55:55)*(c0<look*0.5?1.3:0.8);}
  const dy=deltaAngle(P.yaw,want),rate=lerp(150,55,clamp01(Math.abs(P.v)/50));
  if(P.v>=0)P.yaw+=clamp(dy,-rate*dt,rate*dt);else P.yaw-=clamp(dy,-rate*dt,rate*dt)*0.6;
  // vitesse visée
  const lvl=wanted.level,vmax=Math.min(city?32:62,32+lvl*6)*(P.hp<35?0.6:1)*(dP>60&&clockT-P.seeT<1.5?1.15:1);
  let vt=vmax;if(Math.abs(dy)>60)vt=Math.min(vt,14);if(c0<look)vt=Math.min(vt,Math.max(6,c0*1.4));
  // virage au prochain carrefour : on ralentit avant (sinon on le dépasse et on fait demi-tour)
  if(city){const wd=Math.hypot(tx-P.x,tz-P.z);if(wd<26&&Math.hypot(fx0-tx,fz0-tz)>6){const nxt=Math.atan2(fx0-tx,-(fz0-tz))/D2R;if(Math.abs(deltaAngle(P.yaw,nxt))>40)vt=Math.min(vt,7+wd*0.55);}}
  if(clockT-P.seeT>1.5&&dT<10)vt=4;            // on cherche au pas
  if(!tgtCar&&dP<14&&clockT-P.seeT<1.5){vt=0;}   // le joueur est à pied : on s'arrête pour descendre
  P._c0=c0;P._look=look;P._vt=vt;P._dy=dy;
  if(P.rev>0){P.rev-=dt;P.v=lerp(P.v,-6,1-Math.exp(-4*dt));}
  else P.v+=clamp(vt-P.v,-24*dt,13*dt);
  const f=fwdOf(P.yaw);P.x+=f.x*P.v*dt;P.z+=f.z*P.v*dt;
  // collisions : obstacles
  const q=new V3();let crash=0;for(const k of [1.5,-1.5]){q.set(P.x+f.x*k,0,P.z+f.z*k);for(const o of obsAt(q)){const c=obstacleClosest(o,q);if(c.d<1.0){const push=1.0-c.d;P.x+=c.nx*push;P.z+=c.nz*push;crash=Math.max(crash,Math.abs(P.v));}}}
  if(crash>14){P.hp-=(crash-10)*2;P.v*=0.35;}else if(crash>0)P.v*=0.85;
  // entre voitures de police
  for(const Q of PCH.list){if(Q===P)continue;const dx=P.x-Q.x,dz=P.z-Q.z,d=Math.hypot(dx,dz);if(d<3&&d>1e-3){const k=(3-d)/2;P.x+=dx/d*k;P.z+=dz/d*k;}}
  // contact avec la voiture du joueur (le joueur reçoit le choc dans stepVehicle) : dégâts pour la police
  if(tgtCar){const dx=P.x-V.x,dz=P.z-V.z,d=Math.hypot(dx,dz);if(d<3.4){const rel=Math.hypot(V.vel.x-f.x*P.v,V.vel.z-f.z*P.v);if(rel>6&&clockT-P.lastHit>0.5){P.lastHit=clockT;P.hp-=rel*1.4;PCH.stats.rams++;if(rel>12)cam.shake=Math.min(1,cam.shake+0.25);}}}
  // piétons renversés
  if(Math.abs(P.v)>5)for(const w of walkers){if(w===player||w.ko||w.isCop||w.inCar)continue;const dx=w.root.x-P.x,dz=w.root.z-P.z;if(Math.abs(dx*f.x+dz*f.z)<2.4&&Math.abs(dx*f.z-dz*f.x)<1.1){const dir=new V3(dx,0,dz).normalize();w.hp=Math.max(0,w.hp-25);w.startKO(dir,null,{getUp:w.hp>0?3:undefined,fast:true});playSound("thud",0.8);}}
  // coincé → marche arrière, puis réapparition derrière
  if(Math.abs(P.v)<2&&vt>5&&!P.rev){P.stuck+=dt;if(P.stuck>1.2){P.rev=1.1;P.stuck=0;P.stuckN=(P.stuckN||0)+1;}}else if(Math.abs(P.v)>6)P.stuck=0;
  {const [HP,hdp]=nearestHwy(player.root.x,player.root.z);if(HP&&hdp<hwyHalf(HP)+1&&!inGridArea(player.root.x,player.root.z)&&hwyDist(P.x,P.z,HP)>hwyHalf(HP)+1.5&&dP>45){P.offT=(P.offT||0)+dt;if(P.offT>2){P.offT=0;P.stuckN=9;}}else P.offT=0;}
  const knows=clockT-wanted.lastSeenT<3;
  if(!knows&&dP>320){P.gone=true;return;}
  if(knows&&((P.stuckN||0)>3||dP>260)){const p=pchSpawnPoint();if(p){P.x=p.x;P.z=p.z;P.stuckN=0;P.yaw=Math.atan2(player.root.x-p.x,-(player.root.z-p.z))/D2R;P.v=16;}}
  // sol, assiette, roues, gyrophares
  const g=groundAt(P.x,P.z);P.y=lerp(P.y,g,1-Math.exp(-12*dt));P.g.position.set(P.x,P.y,P.z);P.g.rotation.set(0,Math.PI-P.yaw*D2R,0);
  P.wheel+=P.v*dt/0.35;P.m.wheels.forEach(w=>w.rotation.x=P.wheel);
  const on=Math.floor(clockT*6+P.x)%2===0;P.m.lr.material.emissiveIntensity=on?4:0.2;P.m.lb.material.emissiveIntensity=on?0.2:4;
  if(P.hp<=0&&!P.dead){P.dead=true;P.v*=0.3;PCH.stats.disabled++;hudMsg("🚓 Voiture de police hors service !",2);for(let i=0;i<6;i++)puff(P.x+rand(-1,1),P.y+1,P.z+rand(-1,1),1,1.3);}
}
// ---------------------------------------------------------------- barrages
function pchBlockSpot(){const V=drive,f=fwdOf(V.yaw),P=player.root;const dist=clamp(Math.abs(V.v)*4.5,110,170);
  if(inGridArea(P.x,P.z)){const alongX=Math.abs(f.x)>Math.abs(f.z);
    const line=alongX?Math.round((P.z+16)/40)*40-16:Math.round((P.x+16)/40)*40-16;if(Math.abs((alongX?P.z:P.x)-line)>6)return null;
    let s=(alongX?P.x+f.x*dist:P.z+f.z*dist);s=Math.round((s+16)/40)*40-16+20*(alongX?Math.sign(f.x):Math.sign(f.z));
    const x=alongX?s:line,z=alongX?line:s;if(!inGridArea(x,z))return null;return {x,z,ax:alongX?"x":"z",half:4,dir:alongX?Math.sign(f.x):Math.sign(f.z)};}
  const [H,hd]=nearestHwy(P.x,P.z);if(!H||hd>hwyHalf(H)+2)return null;const ns=H.ax==="ns";if(Math.abs(ns?f.z:f.x)<0.7)return null;
  const s=(ns?P.z+f.z*dist:P.x+f.x*dist),[a,b]=hwyRange(H);if(s<a+30||s>b-30)return null;const L=hwyLine(H),x=ns?L:s,z=ns?s:L;
  if(inGridArea(x,z)||waterDepth(x,z)>0)return null;return {x,z,ax:ns?"z":"x",half:hwyHalf(H),dir:ns?Math.sign(f.z):Math.sign(f.x)};}
function pchBlock(){const S=pchBlockSpot();if(!S)return false;
  const B={x:S.x,z:S.z,cars:[],obs:[],spike:null,t:0,S};const across=S.ax==="x"?new V3(0,0,1):new V3(1,0,0),along=S.ax==="x"?new V3(1,0,0):new V3(0,0,1);
  const n=S.half>6?3:2,gap=wanted.level>=4?2.6:1.2,span=S.half*2,carL=4.7,used=n*carL+gap,start=-span/2+(span-used)/2;let off=start;
  for(let k=0;k<n;k++){if(k===Math.floor(n/2)&&wanted.level>=4)off+=gap;else if(k)off+=0.3;
    const c=off+carL/2;off+=carL;const x=S.x+across.x*c+along.x*rand(-1,1),z=S.z+across.z*c+along.z*rand(-1,1),y=groundAt(x,z);
    const m=buildPoliceCar(wanted.level>=5);m.g.position.set(x,y,z);const yaw=(S.ax==="x"?0:Math.PI/2)+rand(-0.2,0.2);m.g.rotation.y=yaw;scene.add(m.g);
    const C={g:m.g,m,state:"parked",stop:m.g.position.clone(),yaw,speed:0,crew:0,planned:k<2?1:0,t:0,wheelRot:0,hx:0.95,hz:2.35,off:0,dir:along.clone().multiplyScalar(S.dir),swat:wanted.level>=5,roadblock:true};
    policeCars.push(C);B.cars.push(C);
    B.obs.push(addObstacle(S.ax==="x"?{type:"box",x,z,hx:1.0,hz:2.4,tall:true}:{type:"box",x,z,hx:2.4,hz:1.0,tall:true}));
    // agents derrière la voiture
    if(k<2){const p=new V3(x,0,z).addScaledVector(along,S.dir*2.4);pushOutOfObstacles(p,0.3);const cl=copLook(C.swat),w=new Walker(buildRig(makeHuman(cl)),new CopBrain(C),p,S.ax==="x"?(S.dir>0?270:90):(S.dir>0?0:180));
      w.look=JSON.parse(JSON.stringify(cl));w.isCop=true;w.swat=C.swat;w.hand=1;w.power=rand(1.05,1.3);w.voicePitch=rand(0.75,1.1);w.voiceRate=rand(1.05,1.2);walkers.push(w);C.crew++;}}
  // herse dans le passage (4 étoiles et plus)
  if(wanted.level>=4){const gc=start+Math.floor(n/2)*carL+0.3*(Math.floor(n/2))+gap/2-0.3,x=S.x+across.x*gc-along.x*S.dir*3,z=S.z+across.z*gc-along.z*S.dir*3,y=groundAt(x,z);
    const g=new THREE.Group();const len=gap+2.2;g.add(new THREE.Mesh(BX(S.ax==="x"?0.35:len,0.05,S.ax==="x"?len:0.35),mat({color:0x2a2a2a,roughness:0.8})));
    for(let s=-len/2;s<len/2;s+=0.22){const c=new THREE.Mesh(geo("spikeC",()=>new THREE.ConeGeometry(0.04,0.12,4)),OM.metal);c.position.set(S.ax==="x"?0:s,0.08,S.ax==="x"?s:0);g.add(c);}
    g.position.set(x,y+0.03,z);scene.add(g);B.spike={g,x,z,ax:S.ax,len};}
  PCH.blocks.push(B);PCH.stats.blocks++;hudMsg(wanted.level>=4?"📻 Radio police : barrage et herse devant toi !":"📻 Radio police : barrage en place devant toi !",2.8);return true;}
function pchRemoveBlock(B){for(const o of B.obs)if(o)removeObstacle(o);if(B.spike)scene.remove(B.spike.g);
  for(const C of B.cars){if(C.crew>0){C.roadblock=false;continue;}const i=policeCars.indexOf(C);if(i>=0)policeCars.splice(i,1);scene.remove(C.g);}
  const i=PCH.blocks.indexOf(B);if(i>=0)PCH.blocks.splice(i,1);}
// ---------------------------------------------------------------- boucle
function updatePursuit(dt){
  const act=pchActive();
  // apparitions
  const known=clockT-wanted.lastSeenT<2.5;
  PCH.spawnCk-=dt;if(act&&known&&PCH.spawnCk<=0){PCH.spawnCk=PCH.list.length?3:1.2;const parked=policeCars.filter(C=>C.state!=="leave"&&!C.roadblock&&hdist(C.g.position,player.root)<150).length;if(PCH.list.filter(P=>!P.dead).length+parked<pchMax())pchSpawn();}
  for(const P of PCH.list.slice()){
    if(P.dead){P.v*=Math.exp(-2*dt);P.g.position.x+=fwdOf(P.yaw).x*P.v*dt;P.g.position.z+=fwdOf(P.yaw).z*P.v*dt;P.x=P.g.position.x;P.z=P.g.position.z;if(Math.random()<dt*5)puff(P.x,P.y+1.1,P.z,1,1);
      P.m.lr.material.emissiveIntensity=P.m.lb.material.emissiveIntensity=0.2;if(hdist(P.g.position,player.root)>120)pchRemove(P);continue;}
    if(wanted.level===0){P.v*=Math.exp(-1.5*dt);P.giveUp=(P.giveUp||0)+dt;if(P.giveUp>4||hdist(P.g.position,player.root)>90){pchRemove(P);}continue;}
    pchStep(P,dt);if(P.gone){pchRemove(P);continue;}
    // joueur à pied, ou arrêté tout près : les agents descendent
    const d=Math.hypot(player.root.x-P.x,player.root.z-P.z);
    if((!drive&&d<16)||(drive&&Math.abs(drive.v)<1.5&&d<10&&PCH.stopT>1.5)){pchDeploy(P);continue;}
  }
  // arrêt du joueur en voiture
  if(drive&&!drive.boat&&wanted.level>0){PCH.stopT=Math.abs(drive.v)<1.5?PCH.stopT+dt:0;
    // agent à côté de la portière : on est sorti de force
    if(Math.abs(drive.v)<1.2&&walkers.some(w=>w.isCop&&!w.ko&&hdist(w.root,player.root)<2.4)){PCH.pullT+=dt;if(PCH.pullT>1.4){PCH.pullT=0;PCH.stats.pulled++;const c=walkers.find(w=>w.isCop&&!w.ko&&hdist(w.root,player.root)<2.4);if(c)say(c,pick(["Sors de la voiture !","Mains sur le volant… dehors !","Allez, dehors !"]));
      exitVehicle(true);const dir=new V3(player.root.x-(c?c.root.x:player.root.x+1),0,player.root.z-(c?c.root.z:player.root.z)).normalize();player.startKO(dir,c||player,{getUp:3.5});}}else PCH.pullT=0;}
  else{PCH.stopT=0;PCH.pullT=0;}
  // barrages
  PCH.blockCk-=dt;if(act&&drive&&wanted.level>=3&&PCH.blockCk<=0&&PCH.blocks.length<2&&Math.abs(drive.v)>12){PCH.blockCk=pchBlock()?rand(22,32):3;}
  for(const B of PCH.blocks.slice()){B.t+=dt;const d=hdist(new V3(B.x,0,B.z),player.root);
    B.cars.forEach((C,i)=>{if(C.state!=="parked"&&B.obs[i]){removeObstacle(B.obs[i]);B.obs[i]=null;}});
    if(B.spike&&drive&&!drive.boat&&!drive.flat){const sp=B.spike,lx=drive.x-sp.x,lz=drive.z-sp.z;if((sp.ax==="x"?Math.abs(lx)<1.0&&Math.abs(lz)<sp.len/2+0.6:Math.abs(lz)<1.0&&Math.abs(lx)<sp.len/2+0.6)){drive.flat=true;PCH.stats.spikes++;hudMsg("💥 Herse ! Pneus crevés",2.5);playSound("thud",1);cam.shake=Math.min(1,cam.shake+0.4);rumble(400,1);}}
    if((B.t>70&&d>80)||(wanted.level===0&&d>60)||d>320)pchRemoveBlock(B);}
}
function pchSirenNear(){let n=99;for(const P of PCH.list)if(!P.dead&&wanted.level>0)n=Math.min(n,hdist(P.g.position,player.root));return n;}
