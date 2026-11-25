// ================================================================ événements de rue aléatoires
// Pour que la balade ne soit jamais vide : un voleur à rattraper, un joggeur qui te défie à la course.
const EV={next:150,cur:null,stats:{voleur:0,voleurOk:0,course:0,courseOk:0},canAccept:false};
const evMark=new THREE.Mesh(markerGeo,new THREE.MeshBasicMaterial({color:0xffa23a,fog:false}));evMark.visible=false;scene.add(evMark);
const evBeam=makeBeam(0xffa23a);
// suit un itinéraire (trottoirs + passages piétons) en courant, sans s'arrêter aux feux
class RunnerBrain extends NpcBrain{
  constructor(){super();this.pace=1;this.temper=0.3;this.go=false;this.prog=0;this.best=1e9;this.spd=1;}
  route(w,x,z){this.target.set(x,0,z);this.path=routeTo(w.root,this.target);this.best=1e9;this.prog=0;}
  run(w,dt){w.faceYaw=null;
    if(!this.path||!this.path.length){w.wish.set(0,0,0);return true;}
    let goal=this.path[0],to=new V3().subVectors(goal,w.root);to.y=0;let d=to.length();
    while(d<1.3&&this.path.length>1){this.path.shift();goal=this.path[0];to.subVectors(goal,w.root);to.y=0;d=to.length();this.best=1e9;}
    if(d<1.0&&this.path.length===1){w.wish.set(0,0,0);return true;}
    // bloqué : on saute l'étape ou on recalcule
    if(d<this.best-0.3){this.best=d;this.prog=0;}else{this.prog+=dt;if(this.prog>1.6){this.prog=0;this.best=1e9;this.stuckN=(this.stuckN||0)+1;
      const lp=localPath(w.root,this.path[0],{partial:true});if(lp&&lp.length){for(const q of lp)q.nav=true;this.path=lp.concat(this.path[0].nav?this.path.slice(1).filter(q=>!q.nav):this.path);}else if(this.path.length>1)this.path.shift();else w.vel.addScaledVector(rightOf(w.yaw),this.stuckN%2?1.5:-1.5);return false;}}
    const dir=to.divideScalar(d);dir.add(avoidObstacles(w.root,dir));if(dir.length()>1)dir.normalize();
    w.wish.copy(this.steer(w,dir));w.run=true;w.speedMul=this.spd;return false;
  }
}
class RacerBrain extends RunnerBrain{
  constructor(goal){super();this.goal=goal;}
  pick(w){this.route(w,this.goal.x,this.goal.z);}
  update(w,dt,time){
    if(this.fight||this.flee||this.react){super.update(w,dt,time);if(!this.fight&&!this.flee&&!this.react&&this.go)this.pick(w);return;}
    if(!this.go){w.wish.set(0,0,0);const tp=new V3().subVectors(player.root,w.root);w.faceYaw=Math.atan2(tp.x,-tp.z)/D2R;return;}
    if(!this.path)this.pick(w);
    if(this.run(w,dt)&&hdist(w.root,this.goal)>3.5&&(this.repl=(this.repl||0)+1)<4)this.pick(w);   // itinéraire tronqué : on repart
  }
}
class ThiefBrain extends RunnerBrain{
  constructor(){super();this.temper=0.15;this.spd=0.85;this.re=0;this.tire=0;}
  pick(w){
    const away=new V3().subVectors(w.root,player.root);away.y=0;away.normalize();
    for(let k=0;k<25;k++){const a=Math.atan2(away.z,away.x)+rand(-0.8,0.8),r=rand(35,60),x=w.root.x+Math.cos(a)*r,z=w.root.z+Math.sin(a)*r;
      if(Math.abs(x)<580&&Math.abs(z)<580&&blockOf(x,z)&&chunkLoadedAt({x,z})){this.route(w,x,z);this.re=rand(5,8);return;}}
    this.route(w,w.root.x+away.x*30,w.root.z+away.z*30);this.re=4;
  }
  onHit(w,att,dmg,zone){if(w.ko)return;if(Math.random()<0.6)say(w,pick(["Aïe ! Lâche-moi !","Laisse-moi tranquille !"]));this.re=0;}
  update(w,dt,time){
    if(this.cuffed||this.surrender){super.update(w,dt,time);return;}
    this.re-=dt;this.tire+=dt;this.spd=this.tire%8<5.5?0.85:0.5;   // il s'essouffle par moments
    if(!this.path||this.re<=0||this.run(w,dt))this.pick(w);
    if(this.spd<0.6&&Math.random()<dt*0.3)bark(w,["Pff… pff…","Lâche-moi !"],6,true);
  }
}
function evEnd(msg,ok,col){
  const C=EV.cur;if(!C)return;EV.cur=null;EV.next=rand(180,300);evMark.visible=false;evBeam.visible=false;EV.canAccept=false;
  for(const w of [C.thief,C.racer])if(w&&walkers.includes(w)){w.isMission=false;const W=w;later(10,()=>{if(walkers.includes(W)&&hdist(W.root,player.root)>25)removeWalker(W,true);});}
  if(waypoint&&waypoint.name==="Arrivée")setWaypoint(null);
  if(msg)misBanner(msg[0],msg[1],col||(ok?"#7dffa1":"#ff9a6a"));misHud();
}
function startVoleur(){
  const vic=walkers.find(w=>w!==player&&!w.isCop&&!w.isMission&&!w.isMedic&&!w.isHooper&&!w.ko&&!w.brain.fight&&!w.brain.flee&&w.sit.state==="none"&&!w.brain.leader&&hdist(w.root,player.root)>7&&hdist(w.root,player.root)<22&&blockOf(w.root.x,w.root.z));
  if(!vic)return false;
  const pos=vic.root.clone().addScaledVector(rightOf(vic.yaw),1.4);pushOutOfObstacles(pos,0.4);
  const look=randomPerson(rng);look.jacket="#2a2a2e";look.hair="buzz";look.sex="m";
  const th=spawnSpecial(look,new ThiefBrain(),pos,vic.yaw);th.isThief=true;th.maxHp=th.hp=60;th.brain.pick(th);
  say(vic,pick(["Au voleur ! Mon sac !","Arrêtez-le ! Il m'a volé !","Mon portefeuille ! Au voleur !"]));
  if(vic.brain.startFlee){vic.brain.startFlee(vic,th);vic.brain.flee.t=1.5;}
  later(0.6,()=>{if(walkers.includes(th))say(th,pick(["Dégagez !","Poussez-vous !"]),true);});
  EV.cur={type:"voleur",thief:th,victim:vic,t:0,reward:Math.round(rand(60,140))};EV.stats.voleur++;
  misBanner("Au voleur !","Rattrape-le et mets-le K.O.","#ffa23a");
  return true;
}
function startCourse(){
  // un joggeur s'arrête à côté de toi et te défie
  let pos=null;for(let k=0;k<20;k++){const a=Math.random()*6.28,p=player.root.clone().add(new V3(Math.cos(a)*3,0,Math.sin(a)*3));if(blockOf(p.x,p.z)&&publicOK(p.x,p.z)&&freeSpot(p,0.6)){pos=p;break;}}
  if(!pos)return false;
  // arrivée : un lieu nommé à 140–260 m
  const cand=POIS.filter(P=>{const d=hdist(P,player.root);return d>140&&d<260&&P.type!=="ile"&&P.type!=="plonge"&&Math.abs(P.x)<580&&Math.abs(P.z)<580;});
  let goal;if(cand.length){const P=pick(cand);goal={x:P.x,z:P.z,name:P.name};}else{const a=Math.random()*6.28;goal={x:clamp(player.root.x+Math.cos(a)*180,-560,560),z:clamp(player.root.z+Math.sin(a)*180,-560,560)};goal.name=streetAt(goal.x,goal.z);}
  // on vise le trottoir le plus proche de l'arrivée
  for(let k=0;k<40&&!blockOf(goal.x,goal.z);k++){goal.x+=rand(-4,4);goal.z+=rand(-4,4);}
  const look=randomPerson(rng);look.top="tee";look.topColor="#e8f23a";look.jacket=null;look.bottom="shorts";look.bottomColor="#222";
  const rc=spawnSpecial(look,new RacerBrain(goal),pos,0);rc.brain.spd=rand(0.74,0.84);
  EV.cur={type:"course",racer:rc,goal,t:0,step:"offer",reward:Math.round(rand(50,110)/10)*10};EV.stats.course++;
  say(rc,pick([`Hé ! Une course jusqu'à ${goal.name} ? ${EV.cur.reward} € pour le gagnant !`,`T'as l'air rapide… On fait la course jusqu'à ${goal.name} ? ${EV.cur.reward} € !`]));
  return true;
}
function acceptEvent(){
  const C=EV.cur;if(!C||C.type!=="course"||C.step!=="offer"||hdist(C.racer.root,player.root)>4)return false;
  C.step="count";C.t=0;say(C.racer,"Ok ! À trois… un… deux… trois !");setWaypoint(C.goal.x,C.goal.z,"Arrivée");
  evBeam.position.set(C.goal.x,groundAt(C.goal.x,C.goal.z),C.goal.z);evBeam.visible=true;return true;
}
function updateEvents(dt){
  EV.canAccept=false;
  const C=EV.cur;
  if(!C){
    if(SET.events===false||drive||CREA.on||MIS.active||wanted.level>0||player.ko||player.swim||!blockOf(player.root.x,player.root.z)||galleryOn){EV.next=Math.max(EV.next,15);return;}
    EV.next-=dt;if(EV.next>0)return;
    const ok=Math.random()<0.55?startVoleur()||startCourse():startCourse()||startVoleur();
    if(!ok)EV.next=10;return;
  }
  C.t+=dt;
  if(C.type==="voleur"){
    const T=C.thief;
    if(!walkers.includes(T)){evEnd(null);return;}
    if(T.ko){money+=C.reward;moneyEl.textContent=money+" €";EV.stats.voleurOk++;
      if(walkers.includes(C.victim)&&!C.victim.ko)later(0.8,()=>say(C.victim,pick(["Merci ! Vous êtes un héros !","Oh merci, merci beaucoup !"])));
      evEnd(["Voleur arrêté !",`Récompense : +${C.reward} €`],true);return;}
    evMark.visible=true;const h=wp(T.rig.b.Head);evMark.position.set(h.x,h.y+0.5,h.z);
    const d=hdist(T.root,player.root);
    if(d>70||C.t>50||player.ko){evEnd(["Le voleur s'est échappé",""],false);return;}
    if(!MIS.active){misEl.style.display="block";misEl.innerHTML=`<div class="mt">Au voleur ! · <b class="${50-C.t<12?"hot":""}">${Math.ceil(50-C.t)} s</b></div><div class="mo">Rattrape le voleur et mets-le K.O.</div><div class="mx">Distance : ${Math.round(d)} m</div>`;}
  }else if(C.type==="course"){
    const R=C.racer;
    if(!walkers.includes(R)||R.ko){evEnd(C.step==="offer"?null:["Course annulée",""],false);return;}
    evMark.visible=true;const h=wp(R.rig.b.Head);evMark.position.set(h.x,h.y+0.5,h.z);
    if(C.step==="offer"){
      const d=hdist(R.root,player.root);EV.canAccept=d<4;
      if(EV.canAccept){misPrompt.style.display=isTouch()?"none":"block";misPrompt.textContent=`E : accepter la course (${C.reward} €)`;}
      if(!MIS.active){misEl.style.display="block";misEl.innerHTML=`<div class="mt">Défi</div><div class="mo">Un joggeur te défie : ${C.goal.name}</div><div class="mx">${d<4?"Appuie sur E pour accepter":"Approche-toi pour accepter"}</div>`;}
      if(C.t>14||d>25){say(R,pick(["Tant pis, une autre fois !","Ok, t'as peur… Salut !"]));R.brain.go=true;evEnd(null);return;}
    }else if(C.step==="count"){if(C.t>2.6){C.step="race";C.t=0;R.brain.go=true;R.brain.pick(R);const P=R.brain.path,e=P&&P[P.length-1];if(e&&hdist(e,C.goal)>3){C.goal.x=e.x;C.goal.z=e.z;R.brain.goal=C.goal;setWaypoint(e.x,e.z,"Arrivée");evBeam.position.set(e.x,groundAt(e.x,e.z),e.z);}}}
    else{
      const dp=hdist(player.root,C.goal),dr=hdist(R.root,C.goal);
      if(dp<3.5){money+=C.reward;moneyEl.textContent=money+" €";EV.stats.courseOk++;later(1.5,()=>{if(walkers.includes(R))say(R,pick(["Bien joué, t'es rapide !","Pfff… revanche la prochaine fois !"]));});evEnd(["Course gagnée !",`+${C.reward} € · ${Math.round(C.t)} s`],true);return;}
      if(dr<3.5){say(R,pick(["Trop lent !","Haha, j'ai gagné !"]));evEnd(["Course perdue",`Le joggeur arrive en ${Math.round(C.t)} s`],false);return;}
      if(C.t>240){evEnd(["Course abandonnée",""],false);return;}
      if(!MIS.active){misEl.style.display="block";misEl.innerHTML=`<div class="mt">Course · ${Math.round(C.t)} s</div><div class="mo">Arrivée : ${C.goal.name}</div><div class="mx">Toi ${Math.round(dp)} m · lui ${Math.round(dr)} m ${dp<dr?"<span style='color:#7dffa1'>— tu mènes</span>":"<span class='hot'>— il mène</span>"}</div>`;}
    }
  }
}

// ---------------------------------------------------------------- figurants fixes
const AMB_LINES={
  panne:{near:["Vous auriez pas un téléphone ? Le mien est mort…","La dépanneuse met trois heures, c'est une blague…","Elle a calé d'un coup, je comprends pas."],idle:["Allez, démarre…","Pff…"]},
  autostop:{near:["Vous allez vers Port-Soleil ?","Je cherche juste à rejoindre la côte !","Personne ne s'arrête, c'est fou…"],idle:["Allez, quelqu'un…"]},
  pecheur:{near:["Chut, tu vas faire fuir les poissons.","Ça mord pas aujourd'hui…","Hier j'en ai sorti un de deux kilos, je te jure."],idle:["Allez, mords…"]},
  vendeur:{near:["Un hot-dog ? Le meilleur du quartier !","Moutarde, ketchup, oignons ?","Les traders viennent tous chez moi à midi."],idle:["Hot-dogs ! Hot-dogs chauds !"]},
  domino:{near:["¡Dominó! J'ai gagné !","Assieds-toi, on joue la prochaine.","Mon cousin triche, je te jure."],idle:["¡Ay, no!","Pose ta pièce, allez.","Ha ! Double six !"]},
  marchand:{near:["Mangues, ananas, goyaves ! Trois pour cinq euros !","Goûte, c'est sucré comme le miel.","Les meilleurs fruits du barrio !"],idle:["Mangues ! Ananas !","Fruits frais, fruits frais !"]},
  radio:{near:[],idle:[]},
  fermier:{near:["Belle journée pour les orangers, hein ?","Attention aux vaches, elles sont curieuses.","La ville ? Trop de bruit pour moi.","Si tu vois un renard, dis-le-moi !"],idle:["Allez, au travail…","Il va pleuvoir, je le sens."]},
  randonneur:{near:["La vue d'en haut est incroyable !","Il paraît qu'il y a une étoile dorée au sommet…","Tu as de l'eau ? J'ai tout bu.","Les Monts Bleus, c'est encore loin ?"],idle:["Encore un effort…","Quelle vue !"]},
  bayou:{near:["Fais gaffe aux alligators, mon gars.","Ici on pêche l'écrevisse depuis cinq générations.","Prends un hydroglisseur, c'est le seul moyen de traverser.","On raconte qu'un avion s'est écrasé dans le marais…"],idle:["Hmm hmm…","Ça mord pas ce soir."]},
  surfeur:{near:["La houle est parfaite aujourd'hui !","Tu surfes ? Non ? Dommage.","Les Cayos, c'est le paradis, frère."],idle:["Yeah !","Quelle vague…"]},
  docker:{near:["Hé ! Casque obligatoire sur les quais !","Fais gaffe, le portique bouge.","Le Marevia Star a encore six heures de retard…","Tu cherches du boulot ? Va voir la capitainerie.","Zone réservée au personnel, mon gars.","Perds-toi pas dans les conteneurs, on t'y retrouvera jamais."],idle:["Recule ! Recule ! … Stop !","Encore un conteneur et je fais ma pause.","Qui a laissé cette palette ici ?","Allez, on charge !"]},
  barman:{near:["Qu'est-ce que je te sers ?","Une boisson fraîche ? C'est la meilleure de l'île.","Il fait soif, hein ?"],idle:[]}};
const rodGeo=new THREE.CylinderGeometry(0.012,0.02,2.6,5).translate(0,1.3,0),rodMat=new THREE.MeshStandardMaterial({color:0x2a2a2a,roughness:0.5});
class AmbientBrain extends NpcBrain{
  constructor(spot){super();this.spot=spot;this.temper=0.3;this.bk=rand(3,8);}
  pick(w){this.target.set(this.spot.x,0,this.spot.z);this.path=[this.target.clone()];}
  update(w,dt,time){
    if(this.fight||this.flee||this.react||this.cuffed||this.surrender){super.update(w,dt,time);return;}
    const S=this.spot,to=new V3(S.x-w.root.x,0,S.z-w.root.z),d=to.length();
    if(d>0.4){w.wish.copy(to.divideScalar(d).multiplyScalar(Math.min(1,d)));w.run=false;w.speedMul=0.8;w.faceYaw=null;return;}
    w.wish.set(0,0,0);const dp=hdist(player.root,w.root);
    if(S.b){this.wt=(this.wt??rand(4,9))-dt;if(this.wt<=0){this.wt=null;const ox=S.x,oz=S.z;S.x=S.b.x;S.z=S.b.z;S.b={x:ox,z:oz};S.yaw=(S.yaw+180)%360;}}
    if(dp<5&&S.role!=="pecheur"){const tp=new V3().subVectors(player.root,w.root);w.faceYaw=Math.atan2(tp.x,-tp.z)/D2R;w.lookAt=player;w.lookW=0.6;}else{w.faceYaw=S.yaw;w.lookAt=null;}
    // pose : pouce levé, canne à pêche
    if(S.role==="autostop"){const dom=w.arms[1];dom.rFn=(ww,sh,arm)=>({target:sh.clone().add(local(ww.chestRot,arm.side*0.55,0.05,0.1)),w:1,wrist:-20});}
    if(S.role==="pecheur"){const dom=w.arms[1];dom.rFn=(ww,sh,arm)=>({target:sh.clone().add(local(ww.chestRot,arm.side*0.12,-0.15,0.38)),w:1,wrist:-40});
      if(!this.rod){this.rod=new THREE.Mesh(rodGeo,rodMat);scene.add(this.rod);}
      const h=handPos(w);this.rod.position.copy(h);this.rod.rotation.set(0,0,0);const f=fwdOf(w.yaw);this.rod.lookAt(h.x+f.x*2,h.y+1.6,h.z+f.z*2);this.rod.rotateX(Math.PI/2);}
    this.bk-=dt;const L=AMB_LINES[S.role];
    if(this.bk<=0){this.bk=rand(7,14);if(dp<4.5&&L.near.length)say(w,pick(L.near));else if(dp<14&&L.idle.length&&Math.random()<0.5)say(w,pick(L.idle),dp>8);}
  }
}
function updateAmbient(dt){
  for(const a of ambSpots){
    const d=Math.hypot(a.x-player.root.x,a.z-player.root.z);
    if(a.w&&!walkers.includes(a.w)){if(a.w.brain.rod)scene.remove(a.w.brain.rod);a.w=null;a.cool=clockT+60;}
    if(a.role==="radio")continue;
    if(!a.w&&d<55&&d>8&&!(a.cool>clockT)){const look=randomPerson(rng);if(a.role==="pecheur"){look.top="tee";look.jacket="#3a5a3a";}
      if(a.role==="fermier"){look.jacket=pick(["#2b4a8a","#3a5a80"]);look.top="long";look.topColor=pick(["#c94a3a","#e8e2d0"]);look.bottom="pants";look.bottomColor="#3a5a80";look.boots=true;}
      if(a.role==="randonneur"){look.jacket=pick(["#e0782b","#2d6b3f","#c8102e","#1f4fa0"]);look.top="long";look.bottom=pick(["pants","shorts"]);look.bottomColor=pick(["#4a4636","#3a3a3a"]);look.boots=true;}
      if(a.role==="bayou"){look.top="long";look.topColor=pick(["#6b5a3a","#5a6b3a","#8a2a1a"]);look.jacket=null;look.bottom="pants";look.bottomColor="#3a5a80";look.boots=true;if(look.sex==="m")look.beard="full";}
      if(a.role==="surfeur"){look.top="tee";look.topColor=pick(["#4cc9f0","#ffd166","#f72585"]);look.jacket=null;look.bottom="shorts";look.bottomColor=pick(["#2a9d8f","#e76f51","#3a5a80"]);look.glasses="sun";}
      if(a.role==="docker"){look.jacket=pick(["#f2a516","#d9ef2a","#f26b1d"]);look.top=pick(["tee","long"]);look.topColor=pick(["#2b2b2b","#3a4a5a","#5a4a3a","#e8e4da"]);look.bottom="pants";look.bottomColor=pick(["#2b3a55","#3a3a3a","#4a4636"]);look.boots=true;look.glasses="none";look.hat="hard";look.hatTint=Math.floor(Math.random()*3);if(look.hair&&look.hair!=="buzz"&&look.hair!=="bald")look.hair=look.sex==="f"?"ponytail":"buzz";}
      a.w=spawnSpecial(look,new AmbientBrain(a),new V3(a.x,0,a.z),a.yaw);}
    else if(a.w&&d>85&&!a.w.ko){if(a.w.brain.rod)scene.remove(a.w.brain.rod);removeWalker(a.w,true);a.w=null;}
    if(a.w&&a.w.ko&&a.w.brain.rod){scene.remove(a.w.brain.rod);a.w.brain.rod=null;}
  }
}
