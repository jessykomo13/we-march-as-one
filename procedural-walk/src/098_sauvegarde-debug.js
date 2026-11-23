// ================================================================ sauvegarde automatique (module 8)
// La partie est enregistrée dans le navigateur toutes les 5 s et quand on quitte la page.
const SAVE_KEY="proceduralwalk.save.v1",SAVE_EVERY=5;
let playerLook=PLAYER_LOOK;
const saveInfo={lastT:-99,ok:null,loaded:false,bytes:0};
function setPlayerLook(look){playerLook=look;player.setRig(buildRig(makeHuman(JSON.parse(JSON.stringify(look)))),false);}
function store(){try{return window.localStorage;}catch(e){return null;}}
function gatherSave(){
  return {v:1,date:Date.now(),
    player:{x:+player.root.x.toFixed(3),z:+player.root.z.toFixed(3),yaw:+player.yaw.toFixed(1),hp:Math.max(20,Math.round(player.hp)),stamina:Math.round(player.stamina??100),hand:player.hand,look:playerLook,endu:player.enduBoost||0},
    money,jog:jogOn,npc:npcTarget,voice:voiceOn,prints:showPrints,
    wanted:{level:wanted.level,heat:wanted.heat,x:wanted.lastSeenPos.x,z:wanted.lastSeenPos.z,ev:{...wanted.evidence}},
    cam:{yaw:cam.yaw,pitch:cam.pitch,dist:cam.dist},missions:missionSave(),secrets:secretSave(),day:+DAY.t.toFixed(2),taken:[...TAKEN].slice(-300)};
}
function saveGame(force){
  if(window.__noSave||galleryOn||(arrestEl.style.display==="flex"&&!force))return false;
  const ls=store();if(!ls){saveInfo.ok=false;return false;}
  try{const txt=JSON.stringify(gatherSave());ls.setItem(SAVE_KEY,txt);saveInfo.ok=true;saveInfo.bytes=txt.length;saveInfo.lastT=clockT;return true;}
  catch(e){saveInfo.ok=false;return false;}
}
function applySave(d){
  const P=d.player||{};
  if(P.look)try{setPlayerLook(P.look);}catch(e){}
  const x=clamp(+P.x||0,W_MIN+40,W_MAX-40),z=clamp(+P.z||0,W_MIN+40,W_MAX-40);
  if(d.day!=null)DAY.t=clamp(+d.day||9.5,0,23.99);
  missionLoad(d.missions);try{secretLoad(d.secrets);(d.taken||[]).forEach(k=>TAKEN.add(String(k)));}catch(e){}player.enduBoost=clamp(+P.endu||0,0,4);
  player.root.set(x,0,z);pushOutOfObstacles(player.root,0.3);
  player.yaw=player.targetYaw=+P.yaw||0;player.vel.set(0,0,0);player.setRig(player.rig,true);
  player.hp=clamp(+P.hp||100,1,100);player.stamina=clamp(+P.stamina||100,0,100);
  if(P.hand===-1||P.hand===1){player.hand=P.hand;handEl.textContent=player.hand>0?"Droitier":"Gaucher";}
  money=Math.max(0,Math.round(+d.money||0));moneyEl.textContent=money+" €";
  jogOn=!!d.jog;
  if(d.cam){cam.yaw=+d.cam.yaw||cam.yaw;cam.pitch=+d.cam.pitch||cam.pitch;cam.dist=+d.cam.dist||cam.dist;}
  const W=d.wanted;
  if(W&&W.level>0){wanted.level=clamp(W.level|0,1,6);wanted.heat=+W.heat||1;wanted.lastSeenPos.set(+W.x||x,0,+W.z||z);wanted.lastSeenT=clockT-3;wanted.responded=false;wanted.evidence={cctv:!!W.ev?.cctv,clothes:!!W.ev?.clothes,face:!!W.ev?.face};}
}
function loadGame(){
  const ls=store();if(!ls||new URLSearchParams(location.search).has("nosave"))return false;
  let d=null;try{d=JSON.parse(ls.getItem(SAVE_KEY)||"null");}catch(e){d=null;}
  if(!d||d.v!==1)return false;
  try{applySave(d);}catch(e){console.warn("sauvegarde illisible",e);return false;}
  saveInfo.loaded=true;
  const mins=Math.round((Date.now()-d.date)/60000);
  hudMsg("Partie chargée"+(mins>0?` (sauvegardée il y a ${mins<60?mins+" min":Math.round(mins/60)+" h"})`:""));
  return true;
}
function newGame(){
  const ls=store();try{ls&&ls.removeItem(SAVE_KEY);}catch(e){}
  for(let i=walkers.length-1;i>=0;i--){const w=walkers[i];if(w.isCop)removeWalker(w,true);}
  for(const C of policeCars)scene.remove(C.g);policeCars.length=0;
  if(heli){scene.remove(heli.g);heli=null;}
  if(MIS.active)endMission(false,"Nouvelle partie");MIS.stage=0;MIS.done=0;
  wanted.level=0;wanted.heat=0;wanted.lose=0;wanted.evidence={cctv:false,clothes:false,face:false};wanted.escapedT=-999;wanted.hot=null;
  if(player.ko)player.endKO();if(player.sit.state!=="none")player.standUp();
  if(player.handsUp)toggleHandsUp();
  SECRET.stars.clear();SECRET.found.clear();SECRET.looted.clear();SECRET.gold=false;
  setPlayerLook(PLAYER_LOOK);
  applySave({player:{x:0,z:0,yaw:0,hp:100,stamina:100,hand:1},money:0,jog:false,npc:npcTarget,voice:voiceOn,prints:showPrints});
  saveGame(true);hudMsg("Nouvelle partie");
}
function updateAutoSave(){if(clockT-saveInfo.lastT>=SAVE_EVERY)saveGame();}
addEventListener("pagehide",()=>saveGame(true));
document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="hidden")saveGame(true);});

// ================================================================ panneau de debug (module 8)
const dbgEl=document.getElementById("dbg");
const perf={frames:0,acc:0,fps:0,ms:0,worst:0,worstAcc:0,calls:0,tris:0};
function perfFrame(realDt){
  perf.frames++;perf.acc+=realDt;perf.worstAcc=Math.max(perf.worstAcc,realDt);
  perf.calls=renderer.info.render.calls;perf.tris=renderer.info.render.triangles;
  if(perf.acc>=0.5){perf.fps=perf.frames/perf.acc;perf.ms=1000*perf.acc/perf.frames;perf.worst=perf.worstAcc*1000;perf.frames=0;perf.acc=0;perf.worstAcc=0;}
}
let dbgT=0;
const fpsEl=document.getElementById("fps");
function updateDebugPanel(dt){
  if(SET.fpsShow&&(frameN&15)===0)fpsEl.textContent=Math.round(perf.fps)+" FPS";
  if(dbgEl._on!==debug){dbgEl._on=debug;dbgEl.style.display=debug?"block":"none";const k=document.querySelector("#hud .keys");if(k)k.style.display=debug?"none":"";}
  if(!debug)return;
  dbgT-=dt;if(dbgT>0)return;dbgT=0.25;
  const n=k=>walkers.filter(k).length,p=player,f=(v,d=1)=>(+v).toFixed(d);
  const st=p.ko?"K.O.":p.sit.state!=="none"?"assis":p.handsUp?"mains en l'air":p.crouchK>0.5?"accroupi":p.atk?"attaque":p.run?"course":p.speed>0.2?"marche":"immobile";
  const fpsCol=perf.fps>=55?"#7dff9a":perf.fps>=30?"#ffd36a":"#ff7a7a";
  const ago=saveInfo.ok===null?"jamais":saveInfo.ok?`il y a ${f(clockT-saveInfo.lastT,0)} s (${(saveInfo.bytes/1024).toFixed(1)} Ko)`:"impossible (stockage bloqué)";
  dbgEl.innerHTML=
   `<b style="color:${fpsCol}">${f(perf.fps,0)} FPS</b> · ${f(perf.ms)} ms · pire ${f(perf.worst,0)} ms<br>`+
   `Rendu : ${perf.calls} appels · ${(perf.tris/1000).toFixed(0)} k triangles · ${renderer.info.memory.geometries} géométries<br>`+
   `<hr>Joueur : x ${f(p.root.x,2)} · z ${f(p.root.z,2)} · cap ${f(((p.yaw%360)+360)%360,0)}°<br>`+
   `Vitesse ${f(p.speed,2)} m/s · ${st} · PV ${Math.round(p.hp)} · endurance ${Math.round(p.stamina??100)}<br>`+
   `<hr>Persos : ${walkers.length} (passants ${n(w=>w!==p&&!w.isCop&&!w.isMedic&&!w.isSpar)}, police ${n(w=>w.isCop)}, ambulanciers ${n(w=>w.isMedic)}, K.O. ${n(w=>w.ko)})<br>`+
   `Véhicules : police ${policeCars.length} · ambulances ${vans.length} · hélico ${heli?1:0}<br>`+
   `Recherche : ${wanted.level}★ · chaleur ${f(wanted.heat)} · zone ${f(wanted.searchR,0)} m · fuite ${f(wanted.lose||0)} s · suspects PNJ ${suspects.length}<br>`+
   `Monde : zone ${chunkOf(p.root.x)},${chunkOf(p.root.z)} (${chunks.get(ckey(chunkOf(p.root.x),chunkOf(p.root.z)))?.type||"?"}) · ${chunks.size} zones chargées · file ${buildQueue.length} · ${obstacles.length} obstacles · construction ${f(worldStats.lastMs)} ms (max ${f(worldStats.maxMs)})<br>`+
   `Évènements en attente : ${laterQ.length} · bulles ${document.querySelectorAll('.bubble').length}<br>`+
   `<hr>Sauvegarde : ${ago}${saveInfo.loaded?" · partie rechargée":""}<br>`+
   `<span style="opacity:.7">H / F1 : fermer · F9 : sauver · F10 : nouvelle partie</span>`;
}
addEventListener("keydown",e=>{
  if(e.code==="F9"){e.preventDefault();hudMsg(saveGame(true)?"Partie sauvegardée":"Sauvegarde impossible");}
  if(e.code==="F10"){e.preventDefault();newGame();}
});
document.getElementById("newBtn").addEventListener("pointerdown",e=>{e.stopPropagation();newGame();});
