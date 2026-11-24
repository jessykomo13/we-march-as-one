// ================================================================ MULTIJOUEUR EN LIGNE (2 joueurs)
// Connexion directe navigateur ↔ navigateur (WebRTC) via PeerJS, chargé seulement quand on ouvre « Jouer en ligne ».
// L'un crée la partie (un code de 5 lettres), l'autre tape le code. Chacun voit l'autre : déplacements (locomotion
// procédurale), course, accroupi, nage, vol créatif, KO, coups de poing/pied (les coups touchent vraiment), voitures et
// bateaux (le bon modèle et la bonne couleur), étoiles de police. L'heure de la journée suit celle de l'hôte.
// Chat rapide, « aller vers mon ami ». Le monde est le même pour les deux (généré pareil), mais les passants et la
// circulation restent propres à chaque joueur.
// Tests : ?peerjs=<url locale>&peerhost=localhost&peerport=9000 pour un serveur PeerJS local.
const MPQ=new URLSearchParams(location.search);
const PEERJS_URL=MPQ.get("peerjs")||"https://cdn.jsdelivr.net/npm/peerjs@1.5.4/dist/peerjs.min.js";
const MP={peer:null,conn:null,role:null,code:null,st:"off",err:"",av:null,last:null,lastT:0,vel:new V3(),sendT:0,dayT:0,
  car:null,carKey:"",cars:[],fname:"Ton ami",flook:null,name:"",atkSent:null,tag:null,chip:null,ping:0,pingT:0,stats:{tx:0,rx:0,hitsSent:0,hitsGot:0}};
try{MP.name=localStorage.getItem("pw_mpname")||"";}catch(e){}
function mpPeerOpts(){const o={debug:0,config:{iceServers:[{urls:"stun:stun.l.google.com:19302"},{urls:"stun:stun1.l.google.com:19302"}]}};
  if(MPQ.get("peerhost")){o.host=MPQ.get("peerhost");o.port=+MPQ.get("peerport")||9000;o.path=MPQ.get("peerpath")||"/";o.secure=false;}return o;}
function loadPeerJS(){return new Promise((res,rej)=>{if(window.Peer)return res();const s=document.createElement("script");s.src=PEERJS_URL;s.onload=()=>window.Peer?res():rej(new Error("peerjs"));s.onerror=()=>rej(new Error("Impossible de charger le module réseau (connexion internet ?)"));document.head.appendChild(s);});}
function mpCode(){const A="ABCDEFGHJKMNPQRSTUVWXYZ23456789";let s="";for(let i=0;i<5;i++)s+=A[Math.floor(Math.random()*A.length)];return s;}
function mpErr(e){const t=e&&e.type;MP.err=t==="peer-unavailable"?"Code introuvable : vérifie le code (l'hôte doit avoir le jeu ouvert)":t==="unavailable-id"?"Ce code est déjà pris, réessaie":t==="network"||t==="server-error"||t==="socket-error"?"Pas de connexion au serveur de mise en relation":t==="browser-incompatible"?"Navigateur non compatible":(e&&e.message)||"Erreur réseau";
  if(MP.st!=="on")MP.st="err";mpUI();}
async function mpHost(){try{await loadPeerJS();}catch(e){mpErr(e);return;}mpClose(true);MP.role="host";MP.code=mpCode();MP.st="wait";MP.err="";
  MP.peer=new Peer("pwalk-"+MP.code,mpPeerOpts());MP.peer.on("open",()=>mpUI());MP.peer.on("connection",c=>{if(MP.conn&&MP.conn.open){c.on("open",()=>{c.send({t:"full"});setTimeout(()=>c.close(),300);});return;}mpBind(c);});
  MP.peer.on("error",mpErr);MP.peer.on("disconnected",()=>{if(MP.peer&&!MP.peer.destroyed)try{MP.peer.reconnect();}catch(e){}});mpUI();}
async function mpJoin(code){code=(code||"").toUpperCase().replace(/[^A-Z0-9]/g,"");if(code.length<4){MP.err="Tape le code de ton ami";mpUI();return;}
  try{await loadPeerJS();}catch(e){mpErr(e);return;}mpClose(true);MP.role="guest";MP.code=code;MP.st="join";MP.err="";
  MP.peer=new Peer(undefined,mpPeerOpts());MP.peer.on("open",()=>{const c=MP.peer.connect("pwalk-"+code,{reliable:true});mpBind(c);
    setTimeout(()=>{if(MP.st==="join"){MP.err="Pas de réponse : ton ami a-t-il bien créé la partie ?";MP.st="err";mpUI();}},15000);});MP.peer.on("error",mpErr);mpUI();}
function mpBind(c){MP.conn=c;
  c.on("open",()=>{MP.st="on";MP.lastRx=performance.now();MP.err="";mpSend({t:"hello",name:mpMyName(),look:playerLook,v:1});if(MP.role==="host")mpSend({t:"day",h:DAY.t});hudMsg("🌐 Connecté !",2.5);mpUI();});
  c.on("data",d=>{MP.stats.rx++;MP.lastRx=performance.now();try{mpRecv(d);}catch(e){console.warn("mp",e);}});
  c.on("close",()=>mpLost());c.on("error",()=>mpLost());}
function mpLost(){if(MP.st!=="on"&&MP.st!=="join")return;const was=MP.st==="on";mpRemoveAvatar();MP.conn=null;MP.st=MP.role==="host"?"wait":"off";if(was)hudMsg(`🌐 ${MP.fname} s'est déconnecté`,3);mpUI();}
function mpClose(silent){try{if(MP.conn&&MP.conn.open)MP.conn.send({t:"bye"});}catch(e){}try{MP.conn&&MP.conn.close();}catch(e){}try{MP.peer&&MP.peer.destroy();}catch(e){}
  MP.conn=null;MP.peer=null;mpRemoveAvatar();MP.st="off";MP.role=null;if(!silent)mpUI();}
function mpSend(m){if(MP.conn&&MP.conn.open){try{MP.conn.send(m);MP.stats.tx++;}catch(e){}}}
function mpMyName(){return (MP.name||"Joueur").slice(0,16);}
// ---------------------------------------------------------------- réception
function mpRecv(d){
  if(!d||typeof d!=="object")return;
  switch(d.t){
    case "hello":MP.fname=String(d.name||"Ton ami").slice(0,16);MP.flook=d.look||null;mpRemoveAvatar();if(MP.last)mpMakeAvatar();hudMsg(`🌐 ${MP.fname} a rejoint la partie !`,3);mpUI();break;
    case "look":MP.flook=d.look;if(MP.av){const keep={x:MP.av.root.x,z:MP.av.root.z};mpRemoveAvatar();MP.last&&(MP.last.x=keep.x,MP.last.z=keep.z);mpMakeAvatar();}break;
    case "s":{const now=performance.now();if(MP.last){const dt=Math.max(0.03,(now-MP.lastT)/1000);MP.vel.set((d.x-MP.last.x)/dt,0,(d.z-MP.last.z)/dt);if(MP.vel.length()>80)MP.vel.set(0,0,0);}
      MP.last=d;MP.lastT=now;if(!MP.av&&MP.st==="on")mpMakeAvatar();break;}
    case "a":if(MP.av&&!MP.av.ko){MP.av.atk=null;MP.av.startAttack(d.ty==="kick"?"kick":"punch",null,"head");}break;
    case "hit":{if(player.ko||(CREA.on&&CREA.god))break;MP.stats.hitsGot++;const att=MP.av||{root:new V3(d.x,0,d.z)};player.takeHit(att,["head","chest","belly","legs"].includes(d.z)?d.z:"chest",clamp(+d.d||0,0,40),!!d.k,!!d.b);break;}
    case "ko":{if(player.ko||(CREA.on&&CREA.god))break;const dir=new V3(+d.dx||0,0,+d.dz||1);if(dir.lengthSq()<1e-4)dir.set(0,0,1);dir.normalize();player.hp=Math.max(0,player.hp-clamp(+d.d||20,0,100));
      if(drive)exitVehicle(true);player.startKO(dir,MP.av||player,{getUp:player.hp>0?2.6:undefined,fast:true});floatText(player,d.car?`Renversé par ${MP.fname} !`:"K.O. !","#ffb07a");break;}
    case "say":{const t=String(d.txt||"").slice(0,80);if(!t)break;if(MP.av)say(MP.av,t);hudMsg(`💬 ${MP.fname} : ${t}`,4);mpChatLog(MP.fname,t);break;}
    case "day":if(MP.role==="guest"&&typeof d.h==="number"){if(Math.abs(DAY.t-d.h)>0.08)DAY.t=d.h;if(d.w!=null&&DAY.weather!=null)DAY.weather=d.w;}break;
    case "ping":mpSend({t:"pong",k:d.k});break;
    case "pong":MP.ping=Math.round(performance.now()-d.k);break;
    case "full":MP.err="La partie est déjà complète (2 joueurs)";MP.st="err";mpUI();break;
    case "bye":mpLost();break;
  }
}
// ---------------------------------------------------------------- l'avatar de l'ami
class RemoteBrain extends NpcBrain{
  constructor(){super();this.temper=0;}
  witness(){} startFight(){}
  update(w,dt){
    const S=MP.last;w.faceYaw=null;this.fight=null;this.flee=null;this.react=null;
    if(!S){w.wish.set(0,0,0);return;}
    const age=Math.min(0.25,(performance.now()-MP.lastT)/1000),tx=S.x+MP.vel.x*age,tz=S.z+MP.vel.z*age;
    const dx=tx-w.root.x,dz=tz-w.root.z,d=Math.hypot(dx,dz);
    if(S.car||S.bt){w.wish.set(0,0,0);return;}
    if(d>7){w.root.set(tx,S.y,tz);w.setRig(w.rig,true);return;}
    const P=w.P,sp=S.sp||0;w.run=sp>(P.jogSpeed+P.runSpeed)/2;w.jog=!w.run&&sp>(P.walkSpeed+P.jogSpeed)/2;w.speedMul=S.cr?0.45:1;
    w.crouchK=lerp(w.crouchK||0,S.cr?1:0,1-Math.exp(-6*dt));
    if(d>0.12||sp>0.3){const k=clamp(d/0.5,0.25,1);w.wish.set(dx/(d||1),0,dz/(d||1)).multiplyScalar(k);}else{w.wish.set(0,0,0);w.targetYaw=S.yaw;}
    // petite correction pour rester calé sur la vraie position
    const c=Math.min(1,dt*(d>1.5?3:1.2));w.root.x+=dx*c;w.root.z+=dz*c;
    if(S.fl&&!w.fly)w.setFly(true);else if(!S.fl&&w.fly)w.setFly(false);
    if(w.fly){w.flyUp=clamp((S.y-w.root.y)*0.6,-1,1);w.root.y=lerp(w.root.y,S.y,Math.min(1,dt*4));}
  }
}
function mpMakeAvatar(){if(MP.av||!MP.last)return;let look=MP.flook;
  const S=MP.last,w=spawnSpecial(look||randomPerson(rng),new RemoteBrain(),new V3(S.x,0,S.z),S.yaw||0);
  w.isRemote=true;w.isMission=true;w.hp=100;w.root.y=S.y;w.setRig(w.rig,true);MP.av=w;
  if(!MP.tag){MP.tag=document.createElement("div");MP.tag.className="mpTag";document.body.appendChild(MP.tag);}MP.tag.style.display="block";}
function mpRemoveAvatar(){if(MP.av){if(walkers.includes(MP.av))removeWalker(MP.av,true);MP.av=null;}if(MP.car){scene.remove(MP.car);MP.car=null;MP.carKey="";}MP.cars.length=0;if(MP.tag)MP.tag.style.display="none";}
// coups portés à l'avatar → envoyés à l'ami (c'est lui qui a les vrais points de vie)
function mpSendHit(att,zone,dmg,isKick,blocked){if(att!==player)return;MP.stats.hitsSent++;mpSend({t:"hit",z:zone,d:dmg,k:isKick?1:0,b:blocked?1:0,x:player.root.x,z2:player.root.z});}
function mpSendKO(w,dir){const d=Math.max(15,Math.round(100-(w.hp??100)));w.hp=100;mpSend({t:"ko",dx:dir?dir.x:0,dz:dir?dir.z:1,d,car:drive?1:0});}
// ---------------------------------------------------------------- envoi de l'état + mise à jour
function mpState(){const p=player,V=drive,s={t:"s",x:+p.root.x.toFixed(2),y:+p.root.y.toFixed(2),z:+p.root.z.toFixed(2),yaw:Math.round(p.yaw),sp:+Math.hypot(p.vel.x,p.vel.z).toFixed(2),
    cr:(p.crouchK||0)>0.5?1:0,ko:p.ko?1:0,sw:p.swim?1:0,fl:p.fly?1:0,wl:wanted.level||0,hp:Math.round(p.hp)};
  if(V){const o={x:+V.x.toFixed(2),y:+V.y.toFixed(2),z:+V.z.toFixed(2),yaw:+V.yaw.toFixed(1),p:+V.pitch.toFixed(3),r:+V.roll.toFixed(3),st:+(V.steer||0).toFixed(2),v:+V.v.toFixed(1)};
    if(V.boat){o.kind=V.kind;s.bt=o;}else{o.kind=V.kind||"berline";o.c=V.paint&&V.paint.color?"#"+V.paint.color.getHexString():"#8a1f1f";o.gold=V.gold?1:0;s.car=o;}}
  return s;}
function mpUpdate(dt){
  if(MP.st!=="on"){mpChip();return;}
  MP.stale=MP.lastRx&&performance.now()-MP.lastRx>6000;
  if(MP.lastRx&&performance.now()-MP.lastRx>40000){MP.lastRx=0;mpLost();return;}
  MP.sendT-=dt;if(MP.sendT<=0){MP.sendT=1/15;mpSend(mpState());}
  const a=player.atk;if(a&&a!==MP.atkSent){MP.atkSent=a;mpSend({t:"a",ty:a.type});}
  if(MP.role==="host"){MP.dayT-=dt;if(MP.dayT<=0){MP.dayT=4;mpSend({t:"day",h:DAY.t,w:DAY.weather});}}
  MP.pingT-=dt;if(MP.pingT<=0){MP.pingT=3;mpSend({t:"ping",k:performance.now()});}
  const S=MP.last,w=MP.av;
  if(w&&MP.stale){w.rig.model.visible=false;if(MP.car)MP.car.visible=false;w.wish.set(0,0,0);if(MP.tag)MP.tag.style.display="none";mpChip();return;}
  if(MP.car)MP.car.visible=true;
  if(w&&S){
    // KO synchronisé
    if(S.ko&&!w.ko){w._syncKO=true;w.startKO(fwdOf(w.yaw).negate(),null,{getUp:Infinity});w._syncKO=false;}
    else if(!S.ko&&w.ko&&w.ko.t>0.6)w.endKO();
    // voiture / bateau de l'ami
    const C=S.car||S.bt;
    if(C){const key=(S.bt?"b:":"c:")+C.kind+"|"+(C.c||"")+(C.gold?"g":"");
      if(MP.carKey!==key){if(MP.car)scene.remove(MP.car);MP.car=S.bt?boatMesh(C.kind,0):carMesh(C.gold?GOLD_PAINT:paintMat(C.c||"#8a1f1f"),C.kind,null,true);MP.car.traverse(o=>{if(o.isMesh)o.castShadow=true;});
        const hd=driverDummy();hd.position.set(S.bt?0.35:0.4,S.bt?0.05:0,S.bt?-0.6:0.15);MP.car.add(hd);try{const L=MP.flook||{},P=hd.userData.parts;P.torso.material.color.set(L.jacket||L.topColor||"#335");P.head.material.color.set(L.skin||"#e3ac88");}catch(e){}
        scene.add(MP.car);MP.carKey=key;MP.car.position.set(C.x,C.y,C.z);MP.carYaw=C.yaw;MP.cars.length=0;MP.cars.push({m:MP.car,v:0,remote:true});}
      const age=Math.min(0.25,(performance.now()-MP.lastT)/1000),f=fwdOf(C.yaw),tx=C.x+f.x*C.v*age,tz=C.z+f.z*C.v*age,k=1-Math.exp(-12*dt);
      const m=MP.car;if(Math.hypot(m.position.x-tx,m.position.z-tz)>12)m.position.set(tx,C.y,tz);else{m.position.x=lerp(m.position.x,tx,k);m.position.z=lerp(m.position.z,tz,k);m.position.y=lerp(m.position.y,C.y,k);}
      MP.carYaw+=deltaAngle(MP.carYaw,C.yaw)*k;m.rotation.set(0,Math.PI-MP.carYaw*D2R,0,"YXZ");m.rotation.x=C.p||0;m.rotation.z=C.r||0;MP.cars[0].v=Math.abs(C.v);
      const W=m.userData.wheels;if(W){MP.spin=(MP.spin||0)+C.v/0.34*dt;for(const q of W){q.rotation.x=MP.spin;if(q.userData.front)q.rotation.y=-(C.st||0)*1.1;}}
      w.rig.model.visible=false;w.inCar=true;w.root.set(m.position.x,m.position.y,m.position.z);w.gy=w.root.y;w.lastOk.copy(w.root);w.vel.set(0,0,0);}
    else{if(MP.car){scene.remove(MP.car);MP.car=null;MP.carKey="";MP.cars.length=0;w.root.set(S.x,S.y,S.z);w.setRig(w.rig,true);}w.inCar=false;w.rig.model.visible=true;}
  }
  mpTagUpdate();mpChip();
}
// étiquette au-dessus de la tête de l'ami
const _mpv=new V3();
function mpTagUpdate(){const T=MP.tag,w=MP.av,S=MP.last;if(!T)return;if(!w||!S){T.style.display="none";return;}
  const base=MP.car?MP.car.position:w.root;_mpv.set(base.x,base.y+(MP.car?2.2:2.15),base.z);const d=camera.position.distanceTo(_mpv);_mpv.project(camera);
  if(_mpv.z>1||d>260||Math.abs(_mpv.x)>1.1||Math.abs(_mpv.y)>1.1){T.style.display="none";return;}
  T.style.display="block";T.style.left=((_mpv.x+1)/2*innerWidth)+"px";T.style.top=((1-_mpv.y)/2*innerHeight)+"px";
  const st=S.wl?" "+"★".repeat(Math.min(6,S.wl)):"";T.innerHTML=`${MP.fname}<span>${st}</span>${d>25?`<small>${Math.round(hdist(player.root,base))} m</small>`:""}`;T.style.opacity=d>120?0.75:1;}
function mpChip(){if(!MP.chip){MP.chip=document.createElement("div");MP.chip.id="mpChip";MP.chip.onclick=()=>mpOpen();MP.chip.addEventListener("touchend",e=>{e.preventDefault();mpOpen();},{passive:false});document.body.appendChild(MP.chip);}
  const on=MP.st==="on";MP.chip.style.display=MP.st==="off"?"none":"block";
  MP.chip.innerHTML=on?`🌐 ${MP.fname}${MP.stale?" (en pause)":""}${MP.last?" · "+Math.round(hdist(player.root,MP.last))+" m":""}`:MP.st==="wait"?`🌐 Code : <b>${MP.code}</b>`:MP.st==="join"?"🌐 Connexion…":"🌐 Hors ligne";}
// ---------------------------------------------------------------- interface
{const st=document.createElement("style");st.textContent=`
#mpPanel{position:fixed;inset:0;display:none;align-items:center;justify-content:center;background:rgba(6,8,12,.55);z-index:60;font:600 14px system-ui;color:#fff}
#mpPanel .box{width:min(420px,94vw);max-height:92vh;overflow:auto;background:#151922;border-radius:16px;padding:14px 16px;box-shadow:0 10px 40px rgba(0,0,0,.5)}
#mpPanel h2{margin:0 0 8px;font:800 18px system-ui}#mpPanel p{margin:6px 0;opacity:.85;font-weight:500;font-size:13px}
#mpPanel input{all:unset;box-sizing:border-box;width:100%;background:#232937;border-radius:10px;padding:9px 11px;margin:4px 0;font:600 15px system-ui;color:#fff}
#mpPanel input.code{font:800 22px ui-monospace,monospace;letter-spacing:.25em;text-transform:uppercase;text-align:center}
#mpPanel button{all:unset;cursor:pointer;display:block;box-sizing:border-box;width:100%;text-align:center;background:#2f6fe0;border-radius:10px;padding:10px;margin:6px 0;font:700 14px system-ui}
#mpPanel button.g{background:#2b3140}#mpPanel button.r{background:#8a2a2a}#mpPanel .row{display:flex;gap:6px}#mpPanel .row button{flex:1;font-size:12.5px;padding:8px 4px}
#mpPanel .big{font:800 34px ui-monospace,monospace;letter-spacing:.3em;text-align:center;background:#232937;border-radius:12px;padding:10px;margin:8px 0;color:#ffd23a}
#mpPanel .err{color:#ff8a7a}#mpPanel .log{font:500 12.5px system-ui;opacity:.9;max-height:90px;overflow:auto;background:#1b202b;border-radius:8px;padding:6px 8px;margin:6px 0}
.mpTag{position:fixed;transform:translate(-50%,-100%);pointer-events:none;color:#fff;font:800 13px system-ui;text-shadow:0 1px 3px #000,0 0 6px #000;white-space:nowrap;text-align:center;z-index:5;display:none}
.mpTag span{color:#ffd23a}.mpTag small{display:block;font:600 11px system-ui;opacity:.85}
#mpChip{position:fixed;top:10px;left:50%;transform:translateX(-50%);background:rgba(16,18,24,.72);color:#fff;font:700 12.5px system-ui;padding:5px 11px;border-radius:12px;z-index:20;display:none;cursor:pointer}
#mpChip b{color:#ffd23a;letter-spacing:.1em}
.touch #mpChip{left:auto;right:10px;top:118px;transform:none;font-size:11.5px;padding:4px 9px}`;document.head.appendChild(st);}
const mpEl=document.createElement("div");mpEl.id="mpPanel";mpEl.innerHTML=`<div class="box"></div>`;document.body.appendChild(mpEl);
const mpBox=mpEl.firstChild;let mpOpenNow=false;const mpChat=[];
["pointerdown","touchstart","keydown","keyup"].forEach(ev=>mpEl.addEventListener(ev,e=>e.stopPropagation(),{passive:true}));
mpEl.addEventListener("click",e=>{if(e.target===mpEl)mpCloseUI();});
function mpOpen(){if(menuOpen)closeMenu();mpOpenNow=true;mpEl.style.display="flex";keys.clear();touchMove={x:0,y:0};mpUI();}
function mpCloseUI(){mpOpenNow=false;mpEl.style.display="none";keys.clear();}
function mpChatLog(who,t){mpChat.push(`<b>${who.replace(/</g,"")}</b> : ${t.replace(/</g,"&lt;")}`);if(mpChat.length>30)mpChat.shift();if(mpOpenNow)mpUI();}
function mpSay(t){t=String(t||"").trim().slice(0,80);if(!t||MP.st!=="on")return;mpSend({t:"say",txt:t});say(player,t);mpChatLog("Toi",t);}
function mpGoTo(){const S=MP.last;if(!S)return;if(drive){hudMsg("Descends de la voiture d'abord",2);return;}const f=fwdOf((S.yaw||0)+120);teleportTo(S.x+f.x*2.2,S.z+f.z*2.2,"");mpCloseUI();hudMsg(`Tu rejoins ${MP.fname}`,2);}
function mpUI(){
  mpChip();if(!mpOpenNow)return;
  const esc=s=>String(s).replace(/[<>&"]/g,"");let h=`<h2>🌐 Jouer en ligne (2 joueurs)</h2>`;
  if(MP.st==="on"){h+=`<p>Connecté avec <b>${esc(MP.fname)}</b>${MP.ping?` · ${MP.ping} ms`:""}${MP.last?` · à ${Math.round(hdist(player.root,MP.last))} m`:""}</p>
    <button data-a="goto">📍 Aller vers ${esc(MP.fname)}</button>
    <div class="row"><button class="g" data-say="Rejoins-moi !">Rejoins-moi !</button><button class="g" data-say="Suis-moi !">Suis-moi !</button><button class="g" data-say="La police arrive !">Police !</button><button class="g" data-say="GG 😎">GG</button></div>
    <div class="log">${mpChat.slice(-8).join("<br>")||"<i>Pas encore de message</i>"}</div>
    <div class="row"><input id="mpMsg" placeholder="Message…" maxlength="80"><button data-a="send" style="flex:0 0 72px">Envoyer</button></div>
    <button class="r" data-a="quit">Quitter la partie en ligne</button>`;}
  else if(MP.st==="wait"){h+=`<p>Donne ce code à ton ami. Il ouvre le jeu, menu ☰ → « Jouer en ligne » → « Rejoindre », et tape :</p><div class="big">${MP.peer&&MP.peer.open?MP.code:"…"}</div><p>${MP.peer&&MP.peer.open?"En attente de ton ami…":"Création de la partie…"}</p>${MP.err?`<p class="err">${esc(MP.err)}</p>`:""}<button class="r" data-a="quit">Annuler</button>`;}
  else if(MP.st==="join"){h+=`<p>Connexion à la partie <b>${esc(MP.code)}</b>…</p><button class="r" data-a="quit">Annuler</button>`;}
  else{h+=`<p>Ton pseudo :</p><input id="mpName" maxlength="16" placeholder="Pseudo" value="${esc(MP.name)}">
    <button data-a="host">Créer une partie</button><p>ou rejoindre celle d'un ami :</p><input id="mpCodeIn" class="code" maxlength="5" placeholder="CODE" autocapitalize="characters" autocomplete="off"><button class="g" data-a="join">Rejoindre</button>
    ${MP.err?`<p class="err">${esc(MP.err)}</p>`:""}<p>Il faut internet. Le monde est le même pour vous deux ; les passants et la circulation sont propres à chacun.</p>`;}
  h+=`<button class="g" data-a="close">Fermer</button>`;mpBox.innerHTML=h;
}
mpBox.addEventListener("click",e=>{const b=e.target.closest("button");if(!b)return;const a=b.dataset.a;
  const nm=document.getElementById("mpName");if(nm){MP.name=nm.value.trim().slice(0,16);try{localStorage.setItem("pw_mpname",MP.name);}catch(_){}}
  if(b.dataset.say){mpSay(b.dataset.say);mpUI();return;}
  if(a==="host")mpHost();else if(a==="join")mpJoin((document.getElementById("mpCodeIn")||{}).value);
  else if(a==="quit"){mpClose();}else if(a==="close")mpCloseUI();else if(a==="goto")mpGoTo();
  else if(a==="send"){const i=document.getElementById("mpMsg");if(i){mpSay(i.value);i.value="";}mpUI();}});
mpBox.addEventListener("keydown",e=>{if(e.key==="Enter"&&e.target.id==="mpMsg"){mpSay(e.target.value);e.target.value="";mpUI();}if(e.key==="Enter"&&e.target.id==="mpCodeIn")mpJoin(e.target.value);});
addEventListener("keydown",e=>{if(e.code==="KeyO"&&!menuOpen&&!e.repeat&&document.activeElement.tagName!=="INPUT"){mpOpenNow?mpCloseUI():mpOpen();}if(e.code==="Escape"&&mpOpenNow){mpCloseUI();e.stopImmediatePropagation();}},true);
setInterval(()=>{if(MP.st==="on")mpSend({t:"k"});},2000);
addEventListener("beforeunload",()=>{try{mpSend({t:"bye"});}catch(e){}});
// mini-carte : l'ami (point cyan, au bord si loin)
function mpMini(c,T,W,H){if(!MP.last||MP.st!=="on")return;let [x,z]=T(MP.last.x,MP.last.z);const cx=W/2,cy=H/2,dx=x-cx,dz=z-cy,R=W/2-8,d=Math.hypot(dx,dz);if(d>R){x=cx+dx/d*R;z=cy+dz/d*R;}
  c.fillStyle="#38d6ff";c.strokeStyle="#002a36";c.lineWidth=2;c.beginPath();c.arc(x,z,5,0,7);c.fill();c.stroke();}
