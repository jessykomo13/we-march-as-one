// ================================================================ boucle
let last=performance.now();
loadGame();
streamWorld(true);updatePortStream(0,true);
for(let k=0;k<3;k++)pushOutOfObstacles(player.root,0.4);player.setRig(player.rig,true);
updateCamera(1);
loadingEl.style.display="none";
function tick(dt,time){
  clockT+=dt;
  pollPad(dt);updateContextButtons(dt);updateGPS(dt);updateLights(dt);updateSea(dt);updateSeaLife(dt);updateCountry(dt);updateTraffic(dt);updateBasket(dt);updateMissions(dt);updateEvents(dt);updateMusic(dt);updateSkyline();updateCreative(dt);updateAmbient(dt);updateShops(dt);updateStreet(dt);updatePort(dt);updateFar(dt);if(!galleryOn)updateLoot(dt);
  if(galleryOn){for(const w of gallery){w.think(dt,time);w.animate(dt,time);}updateCamera(dt);updateBubbles(dt);return;}
    for(const w of walkers){if(w===player&&drive)continue;w.think(dt,time);}
    resolveCollisions();updateVehicles(dt);
    frameN++;
    for(let i=0;i<walkers.length;i++){
      const w=walkers[i];
      // niveau de détail : les gens loin de la caméra sont animés une image sur deux
      if(w===player&&drive)continue;
      if(w!==player&&!w.ko&&camera.position.distanceToSquared(w.root)>26*26&&((frameN+i)&1)){w._acc=(w._acc||0)+dt;continue;}
      w.animate(dt+(w._acc||0),time);w._acc=0;
    }
    updateFootprints(dt);
    updateCamera(dt);
    updateBubbles(dt);
    updateFloats(dt);
    runLater();
    updateBench();
    updateWallets(dt);
    updateVans(dt);
    updateRespawns(dt);
    updateCams(dt);
    updatePoliceCars(dt);
    updateHeli(dt);
    stamFill.style.width=(player.stamina??100)+"%";stamFill.style.background=player.exhausted?"#ff8a3a":"#4db8ff";
    updateWanted(dt);
    updateSiren();
    updatePinpon();
    drawMinimap();
    updateAutoSave();
    if((frameN&7)===0||buildQueue.length){streamWorld(false);despawnFar();}
    updateDebugPanel(dt);
    speedEl.textContent=`Vitesse ${player.speed.toFixed(2)} m/s${player.run?" · course":""}`;
    crowdEl.textContent=`${walkers.length-1} passants`;
    const L=player.L,R=player.R;
    window.__air=(window.__air||0)+((player.L.stepping&&player.R.stepping)?1:0);window.__maxH=Math.max(window.__maxH||0,player.height/(player.LEG*player.P.standRatio+player.P.ankleHeight));window.__dbg={fd:hdist(L.footPos,R.footPos),L:hdist(L.footPos,player.pelvisPos),R:hdist(R.footPos,player.pelvisPos),h:player.height,hMax:player.LEG*player.P.standRatio+player.P.ankleHeight,steps:player.stepCount,cross:new V3().subVectors(R.footPos,L.footPos).dot(rightOf(player.yaw)),spd:player.speed,n:walkers.length};
  }
window.__save=()=>saveGame(true);window.__load=()=>loadGame();window.__newGame=()=>newGame();window.__saveData=()=>gatherSave();window.__perf=perf;window.__cars=cars;window.__balls=balls;window.__hoops=hoops;window.__bstats=bstats;window.__shoot=shoot;window.__chunkType=chunkType;window.__signal=signal;window.__crossSignal=crossSignal;window.__crossStats=crossStats;window.__setWP=setWaypoint;window.__gps=()=>({wp:waypoint,route:route&&route.map(p=>[+p.x.toFixed(1),+p.z.toFixed(1)]),len:routeLen,map:mapOpen});window.__look=()=>playerLook;window.__SET=()=>SET;window.__menu=()=>({open:menuOpen,tab:menuTab,loadR:LOAD_R,fov:camera.fov,shadows:renderer.shadowMap.enabled,pr:renderer.getPixelRatio(),npc:npcTarget,fogFar:scene.fog.far});window.__obstacles=obstacles;window.__camPos=()=>camera.position.clone();window.__printIM=printIM;window.__pad=pad;window.__camObj=cam;window.__cameraBlocked=cameraBlocked;window.__blockOf=blockOf;window.__groundAt=groundAt;window.__falls=fallStats;window.__world=()=>({chunks:chunks.size,queue:buildQueue.length,obs:obstacles.length,cams:cams.length,spots:benchSpots.length,...worldStats});window.__render=()=>({calls:renderer.info.render.calls,tris:renderer.info.render.triangles,geos:renderer.info.memory.geometries,tex:renderer.info.memory.textures});window.__setDebug=v=>{debug=v;};window.__keys=keys;window.__suspects=suspects;window.__social=k=>playerSocial(k);window.__noteFight=p=>noteFight(p);window.__spar=()=>toggleSpar();window.__cstats=()=>({...combatStats,log:combatLog.slice()});window.__crowd=crowdStats;window.__galList=()=>gallery.map(w=>({h:+w.height.toFixed(2),hMax:+(w.LEG*w.P.standRatio+w.P.ankleHeight).toFixed(2),pel:+w.pelvisPos.y.toFixed(2),Lf:[+w.L.footPos.x.toFixed(2),+w.L.footPos.z.toFixed(2)],Rf:[+w.R.footPos.x.toFixed(2),+w.R.footPos.z.toFixed(2)],root:[+w.root.x.toFixed(2),+w.root.z.toFixed(2)],sit:w.sit.state,ko:!!w.ko}));window.__gal=()=>toggleGallery();window.__galStep=d=>galStep(d);window.__spawnHeli=()=>spawnHeli();window.__clock=()=>clockT;window.__wanted=wanted;window.__pcars=policeCars;window.__cams=cams;window.__vans=vans;window.__wallets=wallets;window.__money=()=>money;window.__atk=(t)=>{atkRequest=t;};window.__react=(w,type,o)=>{clearReaction(w);w.brain.react=makeReaction(type,w,o,w.brain.hand);};window.__spots=benchSpots;window.__sitReq=()=>{sitRequest=true;};window.__walkers=walkers;window.__MIS=MIS;window.__NAV=NAV;window.__localPath=localPath;window.__EV=EV;window.__sky=skyline;window.__camera=camera;window.__CREA=CREA;window.__toggleCreative=toggleCreative;window.__toggleFly=toggleFly;window.__teleportTo=teleportTo;window.__amb=ambSpots;window.__V3=V3;window.__startVoleur=startVoleur;window.__startCourse=startCourse;window.__acceptEvent=acceptEvent;window.__shops=shopSpots;window.__shopStats=shopStats;window.__tryBuy=tryBuy;window.__shopNear=()=>shopNear;window.__missionTalk=missionTalk;window.__startMission=startMission;window.__obs=obstacles;window.__oc=obstacleClosest;window.__port=()=>({secs:PORT_SEC.map(S=>!!S.g),cranes:portCranes.length,forks:portFork.map(f=>[+f.F.position.x.toFixed(1),+f.F.position.z.toFixed(1)]),boats:portBoats.length,...portStats});window.__portHidden=p=>portHidden(p||player.root);window.__portStream=()=>updatePortStream(0,true);window.__los=los;window.__drive=()=>drive;window.__VEH=VEH;window.__enterCar=()=>tryEnterVehicle();window.__exitCar=f=>exitVehicle(f);window.__nearCar=()=>!!nearestCar(player.root);window.__WMAP=WMAP;window.__route=(x,z)=>{const t=performance.now();setWaypoint(x,z);return {ms:Math.round(performance.now()-t),len:Math.round(routeLen),pts:route.length};};window.__openMap=()=>openMap();window.__closeMap=()=>closeMap();window.__MAP=MAP;window.__biome=(x,z)=>biomeAt(x,z);window.__TOWNS=TOWNS;window.__HWYS=HWYS;window.__FAR=FAR;window.__WV=WORLDV;window.__ROADSIDE=ROADSIDE;window.__region=(x,z)=>regionName(x,z);window.__waterDepth=(x,z)=>waterDepth(x,z);window.__portFork=portFork;let simT=0;window.__sim=(n,dt)=>{for(let i=0;i<n;i++){simT+=dt;window.__simT=simT;tick(dt,1000+simT);}};
function loop(now){
  const dt=Math.min(0.05,(now-last)/1000);last=now;
  const time=now/1000;
  // population : on garde le nombre de passants visé (les groupes comptent chaque personne)
  const civ=walkers.reduce((a,w)=>a+(w!==player&&!w.isCop&&!w.isSpar&&!w.isMedic?1:0),0);
  pollPadMenu();pollPadMap(dt);
  if(menuOpen||mapOpen){if(mapOpen)drawBigMap();else renderer.render(scene,camera);perfFrame(dt);requestAnimationFrame(loop);return;}
  const cbdK=inCBD(chunkOf(player.root.x),chunkOf(player.root.z))?1.35:1;
  if(civ<npcTarget*cbdK&&(!galleryOn)&&(!tick.spawnCd||clockT>tick.spawnCd)){tick.spawnCd=clockT+(tick.init?(civ<npcTarget*0.5?rand(0.3,0.8):rand(1.5,4)):0);spawnMaybeGroup(!!tick.init,Math.round(npcTarget*cbdK)-civ);if(civ+1>=npcTarget)tick.init=true;}
  let sdt=dt;if(hitStop>0){hitStop-=dt;sdt=dt*0.15;}
  if(sdt>0&&!window.__pause)tick(sdt,time);
  renderer.render(scene,camera);
  perfFrame(dt);
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
addEventListener("resize",()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});
