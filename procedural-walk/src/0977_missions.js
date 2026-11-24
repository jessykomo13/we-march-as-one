// ================================================================ missions : Nino, le patron du café de la place
// Un contact sur la place centrale propose des boulots. 3 missions d'histoire, puis des petits boulots à l'infini.
const CONTACT={name:"Nino",x:-7.5,z:9.5,yaw:200};
const STORY=[
  {id:"colis",title:"Le colis",pay:250,intro:["Hé, toi ! T'as l'air de savoir marcher vite.","J'ai un colis à livrer dans le quartier pavillonnaire.","Tu le déposes devant la porte, et tu traînes pas !"]},
  {id:"filature",title:"La filature",pay:400,intro:["Bien joué pour le colis.","Un type en veste rouge me doit de l'argent.","Suis-le sans te faire repérer. Je veux savoir où il va."]},
  {id:"sac",title:"Le sac de l'île",pay:900,intro:["Dernier truc, et c'est du sérieux.","Un sac m'attend sur l'Île aux Pélicans, prends le pont depuis la plage.","Les flics risquent de traîner par là. Ramène-le-moi sans les avoir au cul."]}
];
const MIS={stage:0,active:null,contact:null,beam:null,cool:0,done:0,stats:{ok:0,fail:0}};
const misEl=document.getElementById("mission");
class ContactBrain extends NpcBrain{
  constructor(){super();this.pace=0.8;this.temper=0.2;}
  pick(w){this.target.copy(w.root);this.path=[this.target.clone()];}
  update(w,dt,time){
    if(this.fight||this.flee||this.react||this.cuffed||this.surrender){super.update(w,dt,time);return;}
    // revient à sa place, puis regarde le joueur quand il approche
    const home=new V3(CONTACT.x,0,CONTACT.z),to=new V3().subVectors(home,w.root);to.y=0;const d=to.length();
    if(d>0.5){w.wish.copy(to.divideScalar(d).multiplyScalar(Math.min(1,d)));w.run=false;w.speedMul=0.8;}else w.wish.set(0,0,0);
    const dp=hdist(player.root,w.root);
    if(dp<7){const tp=new V3().subVectors(player.root,w.root);w.faceYaw=Math.atan2(tp.x,-tp.z)/D2R;w.lookAt=player;w.lookW=0.7;}else{w.faceYaw=CONTACT.yaw;w.lookAt=null;}
    if(dp<5&&!MIS.active&&MIS.cool<=0&&Math.random()<dt*0.12)bark(w,MIS.stage<STORY.length?["Psst ! Viens par là.","J'ai du boulot pour toi.","Hé, approche !"]:["Besoin de thunes ? J'ai un petit boulot.","Toujours partant ?"],14,false);
  }
}
class TailBrain extends NpcBrain{
  constructor(){super();this.pace=0.95;this.temper=0.7;this.legs=0;}
  pick(w){
    let ok=false;
    for(let i=0;i<30;i++){
      const a=(this.heading??Math.random()*Math.PI*2)+rand(-0.9,0.9),r=rand(35,70);
      this.target.set(w.root.x+Math.cos(a)*r,0,w.root.z+Math.sin(a)*r);
      if(Math.abs(this.target.x)>560||Math.abs(this.target.z)>560)continue;
      if(chunkLoadedAt(this.target)&&blockOf(this.target.x,this.target.z)&&publicOK(this.target.x,this.target.z)&&!onRelief(this.target.x,this.target.z,0.8)&&freeSpot(this.target,0.9)){ok=true;this.heading=a;break;}
    }
    if(!ok)this.target.copy(w.root);
    this.path=routeTo(w.root,this.target);this.waitT=0;this.redWait=0;this.goDelay=null;this.jog=false;this.legs++;
  }
}
function contactLook(){return {sex:"m",height:1.76,build:1.15,skin:"#b07a55",eyes:"#2b1a0e",hairColor:"#1a1410",hair:"buzz",beard:"full",glasses:"none",top:"tee",topColor:"#efe8d8",jacket:"#5a3a26",bottom:"chino",bottomColor:"#3a3a40",cuffs:false,shoes:["#2a2a2a","#151515"],boots:false,seed:41};}
function tailLook(){const l=randomPerson(rng);l.jacket="#b8202a";l.topColor="#222";l.sex="m";return l;}
function spawnSpecial(look,brain,pos,yaw){
  let nw;try{nw=new Walker(buildRig(makeHuman(look)),brain,pos,yaw);}catch(e){const l=randomPerson(rng);nw=new Walker(buildRig(makeHuman(l)),brain,pos,yaw);look=l;}
  nw.look=JSON.parse(JSON.stringify(look));nw.isMission=true;nw.hand=1;nw.voicePitch=rand(0.75,0.95);nw.voiceRate=1.05;walkers.push(nw);return nw;
}
// ---------------------------------------------------------------- repères 3D
function makeBeam(color){
  const g=new THREE.Group(),m=new THREE.MeshBasicMaterial({color,transparent:true,opacity:0.32,depthWrite:false,fog:false});
  const col=new THREE.Mesh(new THREE.CylinderGeometry(0.5,0.5,40,14,1,true),m);col.position.y=20;g.add(col);
  const ring=new THREE.Mesh(new THREE.RingGeometry(1.0,1.4,28).rotateX(-Math.PI/2),new THREE.MeshBasicMaterial({color,transparent:true,opacity:0.85,depthWrite:false}));ring.position.y=0.05;g.add(ring);
  g.visible=false;scene.add(g);return g;
}
const misBeam=makeBeam(0x4ad66d),misTargetBeam=makeBeam(0x4ad66d);
const markerGeo=new THREE.ConeGeometry(0.22,0.45,4).rotateX(Math.PI);
const contactMark=new THREE.Mesh(markerGeo,new THREE.MeshBasicMaterial({color:0x4ad66d,fog:false}));contactMark.visible=false;scene.add(contactMark);
const tailMark=new THREE.Mesh(markerGeo,new THREE.MeshBasicMaterial({color:0xff4a4a,fog:false}));tailMark.visible=false;scene.add(tailMark);
const pkgMesh=new THREE.Mesh(new THREE.BoxGeometry(0.34,0.26,0.28),new THREE.MeshStandardMaterial({color:0xb08452,roughness:0.9}));pkgMesh.castShadow=true;pkgMesh.visible=false;scene.add(pkgMesh);
const bagMesh=new THREE.Mesh(new THREE.BoxGeometry(0.5,0.3,0.28),new THREE.MeshStandardMaterial({color:0x1e1e22,roughness:0.6}));bagMesh.castShadow=true;bagMesh.visible=false;scene.add(bagMesh);
// ---------------------------------------------------------------- recherche de lieux
function findDelivery(){
  const cx0=chunkOf(player.root.x),cz0=chunkOf(player.root.z),cand=[];
  for(let i=-8;i<=8;i++)for(let j=-8;j<=8;j++){const cx=cx0+i,cz=cz0+j,d=Math.hypot(i,j);if(d<3||d>7||Math.abs(cx)>13||Math.abs(cz)>13)continue;if(chunkType(cx,cz)==="maisons")cand.push([cx,cz]);}
  if(!cand.length)for(let i=-6;i<=6;i++)for(let j=-6;j<=6;j++){const cx=cx0+i,cz=cz0+j,d=Math.hypot(i,j);if(d>=3&&d<=6&&Math.abs(cx)<=13&&Math.abs(cz)<=13&&!PRIVATE.has(chunkType(cx,cz)))cand.push([cx,cz]);}
  const [cx,cz]=cand[Math.floor(Math.random()*cand.length)]||[3,3];
  // devant le portail : sur le trottoir côté rue, au milieu d'un bord d'îlot
  const X=cx*CHUNK,Z=cz*CHUNK,sides=[[X+4,Z-10.6],[X+4,Z+18.6],[X-10.6,Z+4],[X+18.6,Z+4]];const s=sides[Math.floor(Math.random()*4)];
  return {x:s[0],z:s[1],name:streetAt(s[0],s[1])};
}
function findBagSpot(){
  const I=ISLANDS[0];
  for(let k=0;k<60;k++){const a=Math.random()*Math.PI*2,r=rand(6,I.r*0.6),x=I.x+Math.cos(a)*r,z=I.z+Math.sin(a)*r;
    if(groundAt(x,z)>WATER_Y+0.25&&!obsAt({x,z}).some(o=>o.type==="box"?Math.abs(o.x-x)<o.hx+1&&Math.abs(o.z-z)<o.hz+1:hdist(o,{x,z})<o.r+1))return {x,z};}
  return {x:I.x-20,z:I.z};
}
// ---------------------------------------------------------------- HUD
function misHud(){
  const A=MIS.active;if(!misEl)return;
  if(!A){misEl.style.display="none";return;}
  misEl.style.display="block";
  const t=A.timer!=null?`<b class="${A.timer<15?"hot":""}">${Math.max(0,Math.ceil(A.timer))} s</b>`:"";
  misEl.innerHTML=`<div class="mt">${A.title}${t?" · "+t:""}</div><div class="mo">${A.obj}</div>${A.extra?`<div class="mx">${A.extra}</div>`:""}`;
}
function misBanner(big,small,color){
  const d=document.createElement("div");d.className="misBanner";d.innerHTML=`<div style="color:${color}">${big}</div><small>${small||""}</small>`;document.body.appendChild(d);
  setTimeout(()=>d.classList.add("out"),2600);setTimeout(()=>d.remove(),3400);
}
// ---------------------------------------------------------------- déroulement
function nearContact(r=2.6){return MIS.contact&&walkers.includes(MIS.contact)&&!MIS.contact.ko&&!player.ko&&hdist(MIS.contact.root,player.root)<r;}
function missionTalk(){
  if(MIS.talking||MIS.cool>0||!nearContact())return false;
  const C=MIS.contact;
  if(MIS.active){
    if(MIS.active.id==="sac"&&MIS.active.step==="back"){finishSac();return true;}
    say(C,pick(["T'as un boulot en cours, file !","Qu'est-ce que tu fais encore là ?","Allez, au boulot !"]));return true;
  }
  if(wanted.level>0){say(C,pick(["T'es recherché, dégage ! Reviens quand c'est calme.","Pas avec les flics aux trousses !"]));return true;}
  const idx=MIS.stage<STORY.length?MIS.stage:-1;
  const lines=idx>=0?STORY[idx].intro:[pick(["J'ai un petit boulot, si ça te dit.","Encore un service à me rendre…"]),pick(["Rien de compliqué.","Ça paie bien, t'inquiète."])];
  MIS.talking=true;let t=0;
  for(const L of lines){later(t,()=>{if(walkers.includes(C))say(C,L);});t+=1.2+L.length*0.05;}
  later(t,()=>{MIS.talking=false;startMission(idx>=0?STORY[idx].id:pick(["colis","filature"]),idx<0);});
  hudMsg(`${CONTACT.name} te parle…`,1.5);
  return true;
}
function startMission(id,side){
  const base=STORY.find(s=>s.id===id);
  const A={id,side,title:side?"Petit boulot · "+base.title:base.title,pay:side?Math.round(base.pay*rand(0.5,0.8)/10)*10:base.pay,t:0,step:"go",timer:null,obj:"",extra:""};
  MIS.active=A;
  if(id==="colis"){
    const D=findDelivery();A.dest=D;pkgMesh.visible=true;
    setWaypoint(D.x,D.z,"Livraison");const len=routeLen||hdist(player.root,D)*1.3;
    A.timer=Math.round(len/3.4+20);A.obj=`Livre le colis : ${D.name}`;
    misTargetBeam.position.set(D.x,groundAt(D.x,D.z),D.z);misTargetBeam.visible=true;
  }else if(id==="filature"){
    let pos=null;
    for(let k=0;k<40;k++){const a=Math.random()*Math.PI*2,r=rand(22,32),p=new V3(player.root.x+Math.cos(a)*r,0,player.root.z+Math.sin(a)*r);
      if(chunkLoadedAt(p)&&blockOf(p.x,p.z)&&publicOK(p.x,p.z)&&!onRelief(p.x,p.z,0.6)&&freeSpot(p,0.8)){pos=p;break;}}
    if(!pos)pos=player.root.clone().add(new V3(20,0,0));
    const tw=spawnSpecial(tailLook(),new TailBrain(),pos,rand(-180,180));tw.brain.pick(tw);tw.brain.mode="walk";
    A.target=tw;A.timer=side?60:80;A.close=0;A.far=0;A.obj="Suis l'homme en veste rouge sans te faire repérer";setWaypoint(null);
  }else if(id==="sac"){
    const S=findBagSpot();A.bag=S;bagMesh.position.set(S.x,groundAt(S.x,S.z)+0.15,S.z);bagMesh.rotation.y=Math.random()*3;bagMesh.visible=true;
    setWaypoint(S.x,S.z,"Le sac");A.obj="Récupère le sac sur l'Île aux Pélicans";
    misTargetBeam.position.set(S.x,groundAt(S.x,S.z),S.z);misTargetBeam.visible=true;
  }
  misBanner(A.title,side?"Petit boulot":"Mission "+(MIS.stage+1)+" / "+STORY.length,"#ffd25a");playSound("slap",0.05);
  misHud();
}
function endMission(ok,why){
  const A=MIS.active;if(!A)return;
  MIS.active=null;MIS.cool=3;pkgMesh.visible=false;bagMesh.visible=false;misTargetBeam.visible=false;tailMark.visible=false;
  if(waypoint&&(waypoint.name==="Livraison"||waypoint.name==="Le sac"||waypoint.name===CONTACT.name))setWaypoint(null);
  if(A.target&&walkers.includes(A.target)){const T=A.target;T.isMission=false;later(8,()=>{if(walkers.includes(T)&&hdist(T.root,player.root)>30)removeWalker(T,true);});}
  if(ok){money+=A.pay;moneyEl.textContent=money+" €";MIS.stats.ok++;if(!A.side&&MIS.stage<STORY.length)MIS.stage++;MIS.done++;
    misBanner(why||"Mission réussie",`+${A.pay} €`,"#7dffa1");
    if(!A.side&&MIS.stage===STORY.length)later(3.5,()=>hudMsg(`${CONTACT.name} aura d'autres petits boulots pour toi`,4));
    else if(!A.side)later(3.5,()=>hudMsg(`Retourne voir ${CONTACT.name} sur la place pour la suite`,4));
  }else{MIS.stats.fail++;misBanner("Mission échouée",why||"","#ff6a6a");}
  misHud();try{saveGame();}catch(e){}
}
function finishSac(){const A=MIS.active;if(!A)return;say(MIS.contact,pick(["Parfait. Personne t'a suivi ? Tiens, ta part.","Joli travail. Voilà ce qu'on avait dit."]));endMission(true,"Le sac est livré");}
// ---------------------------------------------------------------- mise à jour
function updateMissions(dt){
  MIS.cool=Math.max(0,MIS.cool-dt);
  if(!MIS.hinted&&clockT>8&&MIS.stage===0&&!MIS.active&&!menuOpen){MIS.hinted=true;hudMsg(`${CONTACT.name}, sur la place, a du boulot pour toi (repère vert)`,5);}
  // le contact n'existe que quand on est dans le coin
  const dC=Math.hypot(player.root.x-CONTACT.x,player.root.z-CONTACT.z);
  if(!MIS.contact||!walkers.includes(MIS.contact)){
    MIS.contact=null;
    if(dC<60&&chunkLoadedAt(new V3(CONTACT.x,0,CONTACT.z)))MIS.contact=spawnSpecial(contactLook(),new ContactBrain(),new V3(CONTACT.x,0,CONTACT.z),CONTACT.yaw);
  }else if(dC>90&&!MIS.contact.ko){removeWalker(MIS.contact,true);MIS.contact=null;}
  const C=MIS.contact;
  // si on l'a mis K.O., il disparaît et revient plus tard
  if(C&&C.ko&&!C._koNoted){C._koNoted=true;MIS.cool=60;if(MIS.active&&MIS.active.id==="sac"&&MIS.active.step==="back"){}hudMsg(`Tu as frappé ${CONTACT.name}… il ne te parlera pas avant un moment`,4);}
  const avail=!MIS.active&&MIS.cool<=0&&!(C&&C.ko);
  const showC=C&&!C.ko&&(avail||(MIS.active&&MIS.active.id==="sac"&&MIS.active.step==="back"));
  contactMark.visible=!!showC;if(showC){const h=wp(C.rig.b.Head);contactMark.position.set(h.x,h.y+0.55+Math.sin(clockT*3)*0.06,h.z);contactMark.rotation.y+=dt*2;}
  misBeam.visible=!!(avail||(MIS.active&&MIS.active.id==="sac"&&MIS.active.step==="back"))&&dC>12;misBeam.position.set(CONTACT.x,groundAt(CONTACT.x,CONTACT.z),CONTACT.z);
  // invite à parler
  if(nearContact()&&!MIS.talking&&(avail||(MIS.active&&MIS.active.id==="sac"&&MIS.active.step==="back"))){misPrompt.style.display=isTouch()?"none":"block";misPrompt.textContent=`E : parler à ${CONTACT.name}`;MIS.canTalk=true;}
  else{misPrompt.style.display="none";MIS.canTalk=false;}
  const A=MIS.active;if(!A)return;
  A.t+=dt;if(A.timer!=null)A.timer-=dt;
  const arrested=arrestEl.style.display==="flex";
  if(A.id==="colis"){
    const h=handPos(player);pkgMesh.position.copy(h).add(new V3(0,-0.05,0));pkgMesh.rotation.y=player.yaw*-D2R;
    if(player.ko||arrested){endMission(false,"Tu as perdu le colis");return;}
    if(A.timer<=0){endMission(false,"Trop tard, le client est parti");return;}
    if(hdist(player.root,A.dest)<2.6){
      const pos=new V3(A.dest.x,0,A.dest.z);pushOutOfObstacles(pos,0.4);const rc=spawnSpecial(randomPerson(rng),new NpcBrain(),pos.addScaledVector(new V3(player.root.x-A.dest.x,0,player.root.z-A.dest.z).normalize(),-1.2),0);rc.isMission=false;
      later(0.2,()=>{if(walkers.includes(rc)){say(rc,pick(["Ah, enfin ! Merci.","C'est pour moi ? Super, merci !","Pile à l'heure, merci."]));playGesture(rc,"wave");}});
      const bonus=Math.min(120,Math.round(Math.max(0,A.timer)));A.pay+=bonus;endMission(true,bonus>0?`Colis livré (bonus rapidité +${bonus} €)`:"Colis livré");return;}
    A.extra=`Distance : ${Math.round(hdist(player.root,A.dest))} m`;
  }else if(A.id==="filature"){
    const T=A.target;
    if(!T||!walkers.includes(T)||T.ko){endMission(false,"La cible a été mise hors d'état");return;}
    if(player.ko||arrested){endMission(false,"Filature interrompue");return;}
    tailMark.visible=true;const h=wp(T.rig.b.Head);tailMark.position.set(h.x,h.y+0.5+Math.sin(clockT*3)*0.05,h.z);
    const d=hdist(T.root,player.root);
    // trop près et dans son champ de vision : il se méfie
    if(d<5&&canSee(T,player,6,200)){A.close+=dt*(d<2.5?2:1)*(player.run?1.6:1);}else A.close=Math.max(0,A.close-dt*0.4);
    if(A.close>1.4&&!A.warned){A.warned=true;say(T,pick(["…Tu me suis, toi ?","Hmm ?","Qu'est-ce que tu me veux ?"]));}
    if(A.close<0.4)A.warned=false;
    if(A.close>3){T.brain.startFlee(T,player);T.brain.flee.t=12;say(T,pick(["Lâche-moi !","Je savais qu'on me suivait !"]));endMission(false,"Il t'a repéré !");return;}
    if(d>38)A.far+=dt;else A.far=Math.max(0,A.far-dt);
    if(A.far>7){endMission(false,"Tu l'as perdu de vue");return;}
    if(A.timer<=0){endMission(true,"Tu sais où il va : "+streetAt(T.root.x,T.root.z));return;}
    A.extra=A.close>1.2?"<span class='hot'>Il se méfie, recule !</span>":d>30?"<span class='hot'>Il s'éloigne, rapproche-toi</span>":`Distance : ${Math.round(d)} m`;
  }else if(A.id==="sac"){
    if(arrested){endMission(false,"Arrêté avec le sac");return;}
    if(player.ko&&A.step!=="go"){endMission(false,"Tu as perdu le sac");return;}
    if(A.step==="go"){
      bagMesh.rotation.y+=dt*0.5;
      const dB=hdist(player.root,A.bag);A.extra=`Distance : ${Math.round(dB)} m`;
      if(dB<1.6&&!player.swim){A.step="flee";misTargetBeam.visible=false;setWaypoint(null);
        reportCrime({pts:4,counted:0,sev:2,reported:false},"C'était un piège : la police arrive !","cop");
        A.obj="Sème la police";A.extra="";playSound("slap",0.2);}
    }else{
      const h=handPos(player);bagMesh.position.copy(h).add(new V3(0,-0.12,0));bagMesh.rotation.y=player.yaw*-D2R;
      if(A.step==="flee"&&wanted.level===0){A.step="back";A.obj=`Rapporte le sac à ${CONTACT.name} (place centrale)`;setWaypoint(CONTACT.x,CONTACT.z,CONTACT.name);hudMsg("Police semée ! Retourne voir Nino",3);}
      if(A.step==="back"&&wanted.level>0){A.step="flee";A.obj="Sème la police";if(waypoint&&waypoint.name===CONTACT.name)setWaypoint(null);}
      if(A.step==="back")A.extra=`Distance : ${Math.round(dC)} m`;else A.extra=`Recherché : ${"★".repeat(wanted.level)}`;
    }
  }
  misHud();
}
const misPrompt=document.createElement("div");misPrompt.id="misPrompt";document.body.appendChild(misPrompt);
// minicarte : contact et objectifs
function drawMissionMarks(c,edge,px,pz,sc,W){
  const dot=(x,z,col,r=6,ring)=>{const [mx,mz]=edge((x-px)*sc,(z-pz)*sc,W/2-10);c.fillStyle=col;c.beginPath();c.arc(mx,mz,r,0,7);c.fill();c.strokeStyle=ring||"#0b2a12";c.lineWidth=2;c.stroke();};
  const A=MIS.active;
  if(!A&&MIS.cool<=0||(A&&A.id==="sac"&&A.step==="back")){dot(CONTACT.x,CONTACT.z,"#4ad66d",6);const [mx,mz]=edge((CONTACT.x-px)*sc,(CONTACT.z-pz)*sc,W/2-10);c.fillStyle="#0b2a12";c.font="bold 9px system-ui";c.textAlign="center";c.fillText("!",mx,mz+3);}
  if(A&&A.id==="colis")dot(A.dest.x,A.dest.z,"#4ad66d",5);
  if(A&&A.id==="sac"&&A.step==="go")dot(A.bag.x,A.bag.z,"#4ad66d",5);
  if(A&&A.id==="filature"&&A.target)dot(A.target.root.x,A.target.root.z,"#ff4a4a",5,"#3a0000");
}
function missionSave(){return {stage:MIS.stage,done:MIS.done};}
function missionLoad(d){if(!d)return;MIS.stage=clamp(d.stage|0,0,STORY.length);MIS.done=d.done|0;}
// le panneau d'aide clavier s'efface après 25 s (la liste complète est dans le menu Échap)
setTimeout(()=>{const h=document.getElementById("hud");if(h&&!window.__keepHud)h.classList.add("faded");},25000);
