// ================================================================ VOL DE VOITURE (façon GTA)
// E près d'une voiture garée : on ne monte plus direct. Trois façons de la voler :
//  1. Casser la vitre : 1 s, mais bruyant → les passants autour appellent la police, les caméras filment, et si la
//     voiture a une alarme elle hurle (encore plus de témoins).
//  2. Crocheter la serrure (kit de crochetage) : mini-jeu de goupilles, discret (seuls les témoins tout proches et les
//     caméras qui regardent te voient). 3 ratés → la serrure se bloque (et l'alarme part si la voiture en a une).
//     Impossible sur les serrures électroniques (sport, cabriolets, supercars).
//  3. Double des clés (programmateur de clés) : lecture du signal + 3 fréquences à caler + copie. Long mais
//     indétectable : aucune étoile. Marche sur toutes les voitures, même les supercars.
// Les outils s'achètent chez « Le Bidouilleur » (Barrio Coral, icône 🔑 sur la carte). Certaines vieilles voitures
// ne sont même pas verrouillées.
const TOOLS={crochet:false,prog:false};
const TH={cur:null,init:false,alarms:[],blocked:new Set(),stats:{vitre:0,crochet:0,prog:0,open:0,alarm:0}};
const BIDOUILLE={x:-250.6,z:284.5,name:"Le Bidouilleur"};
{const st=document.createElement("style");st.textContent=`
#theft{position:fixed;left:50%;bottom:150px;transform:translateX(-50%);width:min(380px,92vw);display:none;background:rgba(14,16,22,.88);color:#fff;border-radius:14px;padding:10px 12px;font:600 14px system-ui;z-index:30;box-shadow:0 4px 18px rgba(0,0,0,.4)}
.touch #theft{bottom:auto;top:56px}
#theft .t{font:800 15px system-ui;margin-bottom:4px}#theft .s{opacity:.85;font-size:12.5px;margin-bottom:6px;min-height:16px}
#theft .bar{position:relative;height:18px;border-radius:9px;background:#2a2e38;overflow:hidden;margin:6px 0;display:none}
#theft .zone{position:absolute;top:0;bottom:0;background:#3fbf6a}#theft .nd{position:absolute;top:-2px;bottom:-2px;width:4px;margin-left:-2px;background:#fff;border-radius:2px}
#theft .pg{position:absolute;left:0;top:0;bottom:0;background:#4a8ae8}
#theft .btns{display:flex;flex-direction:column;gap:6px}
#theft button{all:unset;cursor:pointer;background:#2b3140;border-radius:10px;padding:8px 10px;font:600 13.5px system-ui;color:#fff;border:1px solid rgba(255,255,255,.18)}
#theft button.off{opacity:.45}#theft button b{color:#ffd23a}#theft button small{display:block;font-weight:500;opacity:.75;font-size:11.5px}`;document.head.appendChild(st);}
const thEl=document.createElement("div");thEl.id="theft";thEl.innerHTML=`<div class="t"></div><div class="s"></div><div class="bar"><i class="pg"></i><i class="zone"></i><i class="nd"></i></div><div class="btns"></div>`;document.body.appendChild(thEl);
const thT=thEl.querySelector(".t"),thS=thEl.querySelector(".s"),thBar=thEl.querySelector(".bar"),thZone=thEl.querySelector(".zone"),thNd=thEl.querySelector(".nd"),thPg=thEl.querySelector(".pg"),thBtns=thEl.querySelector(".btns");
// sécurité de la voiture (déterministe par place de parking)
function carSecurity(pc){
  const h=Math.abs(Math.sin(pc.x*3.7+pc.z*9.1)*43758.5)%1,k=carModelOf(pc.kind),lux=/super|hyper|sport|cabrio/.test(k),emerg=pc.kind==="police"||pc.kind==="ambulance";
  const old=/citadine|berline|van|pickup|muscle/.test(k);
  return {k,name:emerg?(pc.kind==="police"?"Voiture de police":"Ambulance"):CAR_MODELS[k].name,open:old&&!emerg&&h<0.1,
    alarm:lux||emerg||k==="suv"||(h*7%1)<({berline:0.5,muscle:0.4,citadine:0.25}[k]??0.2),elec:lux||emerg,pins:lux?4:k==="suv"?3:2,lux};}
// prendre la voiture garée (la vraie remplace celle cuite dans le décor)
function takeParked(n){if(n.V){n.V.locked=false;n.V.stolen=true;return n.V;}const pc=n.pc;TAKEN.add(carKey(pc.x,pc.z));unbakeParked(pc);removeObstacle(n.o);
  const V=makeVehicle(pc.x,pc.z,180-pc.ry/D2R,pc.paint,pc.kind);V.stolen=true;return V;}
function thSpot(n){return n.pc||{x:n.V.x,z:n.V.z,kind:n.V.kind};}
function startTheft(n){
  const sec=carSecurity(thSpot(n));
  if(sec.open&&!n.V){TH.stats.open++;const V=takeParked(n);hudMsg("La portière n'était pas verrouillée !");enterVehicle(V);return true;}
  TH.cur={n,sec,mode:"choix",t:0,at:player.root.clone(),seen:false,ck:0};showTheft();return true;}
function cancelTheft(msg){if(!TH.cur)return;TH.cur=null;thEl.style.display="none";if(msg)hudMsg(msg,2);}
function thButton(html,fn,off){const b=document.createElement("button");b.innerHTML=html;if(off)b.className="off";b.onclick=e=>{e.stopPropagation();fn();};b.addEventListener("touchend",e=>{e.preventDefault();e.stopPropagation();fn();},{passive:false});thBtns.appendChild(b);return b;}
function showTheft(){
  const C=TH.cur,sec=C.sec;thEl.style.display="block";thBtns.innerHTML="";thBar.style.display="none";
  thT.textContent=`${sec.name} — verrouillée`;thS.textContent=(sec.alarm?"🚨 Alarme":"Pas d'alarme")+(sec.elec?" · serrure électronique":" · serrure mécanique")+(isTouch()?"":" · touches 1, 2, 3");
  thButton(`1. Casser la vitre <b>rapide</b><small>Bruyant : les passants appellent la police${sec.alarm?", l'alarme hurle":""}, les caméras filment</small>`,()=>chooseTheft("vitre"));
  const P0=thSpot(C.n),blk=TH.blocked.has(carKey(P0.x,P0.z)),cOk=TOOLS.crochet&&!sec.elec&&!blk;
  thButton(`2. Crocheter la serrure <b>discret</b><small>${blk?"Serrure bloquée : casse la vitre ou fais un double":!TOOLS.crochet?"Il te faut un kit de crochetage (Le Bidouilleur, 🔑 sur la carte)":sec.elec?"Impossible : serrure électronique":"Mini-jeu : appuie quand l'aiguille est dans le vert"}</small>`,()=>cOk?chooseTheft("crochet"):hudMsg(blk?"Serrure bloquée":!TOOLS.crochet?"Il te faut un kit de crochetage":"Serrure électronique : il faut un double des clés",2),!cOk);
  thButton(`3. Faire un double des clés <b>indétectable</b><small>${TOOLS.prog?"Lis le signal, cale 3 fréquences, copie la clé : aucune étoile":"Il te faut un programmateur de clés (Le Bidouilleur)"}</small>`,()=>TOOLS.prog?chooseTheft("prog"):hudMsg("Il te faut un programmateur de clés (Le Bidouilleur)",2),!TOOLS.prog);
  thButton("Annuler",()=>cancelTheft());
}
function newZone(C,w){C.zw=w;C.zc=w/2+0.04+Math.random()*(1-w-0.08);}
function chooseTheft(m){const C=TH.cur;if(!C)return;C.mode=m;C.t=0;C.fails=0;C.ok=0;thBtns.innerHTML="";
  if(m==="vitre"){thT.textContent="Tu casses la vitre…";thS.textContent="";atkRequest="punch";}
  else if(m==="crochet"){thT.textContent="Crochetage";C.need=C.sec.pins;C.spd=2.2;newZone(C,0.2);thBar.style.display="block";}
  else{C.mode="prog1";thT.textContent="Programmateur de clés";thS.textContent="Lecture du signal de la clé…";thBar.style.display="block";}
  if(isTouch()&&(m==="crochet"))thButton("Tourner la goupille",()=>theftHit());}
// E / clic pendant un mini-jeu
function theftAction(){const C=TH.cur;if(!C)return false;if(C.mode==="crochet"||C.mode==="prog2"){theftHit();return true;}
  if(C.mode==="choix"){hudMsg(isTouch()?"Choisis une option":"Choisis 1, 2 ou 3",1.5);return true;}return true;}
function theftHit(){const C=TH.cur;if(!C||(C.mode!=="crochet"&&C.mode!=="prog2"))return;
  const inZone=Math.abs(C.nd-C.zc)<C.zw/2;
  if(inZone){C.ok++;playSound("slap",0.04);C.spd*=1.18;newZone(C,Math.max(0.1,C.zw*0.88));
    if(C.ok>=C.need){if(C.mode==="crochet"){TH.stats.crochet++;finishTheft("Serrure crochetée !");}else{C.mode="prog3";C.t=0;thS.textContent="Copie de la clé…";thButtonsClear();}}}
  else{C.fails++;playSound("thud",0.25);
    if(C.mode==="crochet"){floatText(player,"Raté !","#ffb07a");if(C.fails>=3){const al=C.sec.alarm,P0=thSpot(C.n);TH.blocked.add(carKey(P0.x,P0.z));cancelTheft(al?"La serrure se bloque… l'alarme hurle !":"La goupille casse, la serrure est bloquée.");if(al){const V=takeParkedSilently(C.n);if(V)startAlarm(V);}}}
    else floatText(player,"Fréquence perdue","#9fc0ff");}
  if(TH.cur)thS.textContent=C.mode==="crochet"?`Goupilles : ${C.ok}/${C.need} · ratés ${C.fails}/3`:C.mode==="prog2"?`Fréquences calées : ${C.ok}/${C.need}`:thS.textContent;}
function thButtonsClear(){thBtns.innerHTML="";}
// la voiture reste garée mais devient un « vrai » véhicule (pour faire sonner l'alarme)
function takeParkedSilently(n){if(n.V)return n.V;try{const V=takeParked(n);V.locked=true;V.stolen=false;return V;}catch(e){return null;}}
function finishTheft(msg){const C=TH.cur;if(!C)return;cancelTheft();const V=takeParked(C.n);V.quiet=true;V.owned=true;hudMsg(`${msg} ${C.sec.name}`,2.2);enterVehicle(V);if(C.mode==="vitre"&&C.sec.alarm)startAlarm(V);}
// délit bruyant : tout le monde autour entend (pas besoin de voir), les caméras qui regardent filment
function noisyCrime(pos,R,why){
  if(CREA.on&&CREA.noCops)return;const victim={isCop:false,_crime:null,brain:{},root:pos.clone?pos.clone():new V3(pos.x,0,pos.z)};
  registerCrime(victim,false);const c=victim._crime;if(!c)return;c.pts=Math.max(c.pts,2);c.sev=Math.max(c.sev,2);
  for(const w of walkers){if(w===player||w.isCop||w.ko||w.resident)continue;if(hdist(w.root,pos)<R&&w.brain.witness){w.brain.witness(w,c);if(Math.random()<0.35)bark(w,["Hé ! Au voleur !","Il vole une voiture !","J'appelle la police !"]);}}
  for(const w of walkers)if(w.isCop&&!w.ko&&hdist(w.root,pos)<R*1.4){reportCrime(c,why||"Vol de voiture signalé !","cop");break;}
}
// alarme : klaxon par à-coups + clignotants, 12 s
function startAlarm(V){TH.stats.alarm++;V.alarmT=12;V.alarmK=0;noisyCrime(new V3(V.x,0,V.z),34,"Alarme de voiture !");if(!TH.alarms.includes(V))TH.alarms.push(V);}
function updateAlarms(dt){
  for(const V of TH.alarms.slice()){if(!VEH.includes(V)||V.dead){TH.alarms.splice(TH.alarms.indexOf(V),1);continue;}
    V.alarmT-=dt;V.alarmK-=dt;const on=V.alarmT>0;
    if(on&&V.alarmK<=0){V.alarmK=0.55;const d=hdist(V.m.position,player.root);if(d<70)hornSound(clamp01(1-d/70)*0.9);V._blink=!V._blink;V.m.traverse(o=>{if(o.isMesh&&(o.material===HEADL||o.material===KM.white||o.material===ALARM_L))o.material=V._blink?ALARM_L:HEADL;});
      if(Math.random()<0.25)noisyCrime(new V3(V.x,0,V.z),22);}
    if(!on){V.m.traverse(o=>{if(o.isMesh&&o.material===ALARM_L)o.material=HEADL;});TH.alarms.splice(TH.alarms.indexOf(V),1);}}
}
const ALARM_L=mat({color:0xffd060,emissive:0xffb020,emissiveIntensity:2.2});
// le vendeur d'outils
function thInit(){TH.init=true;
  try{POI_ICON.bidouille=["🔑","#ffd23a"];POIS.push({type:"bidouille",x:BIDOUILLE.x,z:BIDOUILLE.z,name:"Le Bidouilleur (outils de vol)"});}catch(e){}
  SHOP_OFFER.bidouille={get price(){return !TOOLS.crochet?120:!TOOLS.prog?2500:0;},label:()=>!TOOLS.crochet?"un kit de crochetage":!TOOLS.prog?"un programmateur de clés (double des clés)":"rien, tu as tous les outils",hp:0,stam:0,msg:["Fais-en bon usage…"],
    done:()=>TOOLS.crochet&&TOOLS.prog,buy(){if(!TOOLS.crochet){TOOLS.crochet=true;return "Kit de crochetage acheté ! Approche-toi d'une voiture et appuie sur E.";}TOOLS.prog=true;return "Programmateur de clés acheté ! Tu peux faire le double des clés de n'importe quelle voiture.";}};
  shopSpots.push({name:BIDOUILLE.name,kind:"bidouille",x:BIDOUILLE.x,z:BIDOUILLE.z,fixed:true});
  try{addAmb("vendeur",BIDOUILLE.x-0.9,BIDOUILLE.z,90);}catch(e){}
  // établi + enseigne
  const g=new THREE.Group(),y=groundAt(BIDOUILLE.x,BIDOUILLE.z),X=BIDOUILLE.x-1.0,Z=BIDOUILLE.z;
  put(BX(0.7,0.85,1.6),KM.plank||OM.wood,X,y+0.42,Z,g);for(let k=0;k<4;k++)put(BX(0.16,0.08,0.3),[KM.red,KM.blue,OM.metal,KM.white][k],X,y+0.9,Z-0.55+k*0.36,g);
  put(BX(0.06,1.9,0.06),OM.metal,X-0.3,y+1.4,Z+0.75,g);const s=put(BX(0.05,0.5,1.6),signMat("🔑 Le Bidouilleur","#1f1f2a","#ffd23a",{w:384,h:96}),X-0.3,y+2.2,Z,g);
  scene.add(g);addObstacle({type:"box",x:X,z:Z,hx:0.35,hz:0.8});
}
function updateTheft(dt){
  if(!TH.init)thInit();
  updateAlarms(dt);
  const C=TH.cur;if(!C)return;
  if(player.ko||drive||hdist(player.root,C.at)>2.2||menuOpen){cancelTheft(player.ko||drive||menuOpen?null:"Tu t'es éloigné de la voiture.");return;}
  C.t+=dt;
  // face à la voiture
  {const p=thSpot(C.n),to=new V3(p.x-player.root.x,0,p.z-player.root.z);if(to.lengthSq()>0.01){player.targetYaw=Math.atan2(to.x,-to.z)/D2R;}}
  if(C.mode==="vitre"){if(C.t>0.45&&!C.broke){C.broke=true;glassSound();cam.shake=Math.min(1,cam.shake+0.3);TH.stats.vitre++;noisyCrime(player.root,26,"Vitre cassée : on t'a entendu !");}if(C.t>1.0)finishTheft("Vitre cassée !");return;}
  if(C.mode==="crochet"||C.mode==="prog2"){C.nd=0.5+0.5*Math.sin(C.t*C.spd*Math.PI/1.6);thNd.style.left=(C.nd*100)+"%";thZone.style.left=((C.zc-C.zw/2)*100)+"%";thZone.style.width=(C.zw*100)+"%";thPg.style.width="0";
    // crochetage : un témoin tout proche ou une caméra peut te voir
    if(C.mode==="crochet"){C.ck-=dt;if(C.ck<=0&&!C.seen){C.ck=1;let seen=false;
      for(const w of walkers){if(w===player||w.ko||w.resident)continue;const d=hdist(w.root,player.root);if((w.isCop&&d<22&&canSee(w,player,22,200))||(!w.isCop&&d<9&&canSee(w,player,9,170))){seen=true;break;}}
      if(!seen)for(const cm of cams)if(camSees(cm,player.root)){seen=true;break;}
      if(seen){C.seen=true;const v={isCop:false,_crime:null,brain:{},root:player.root.clone()};registerCrime(v,false);hudMsg("Quelqu'un t'a vu crocheter la voiture !",2);}}}
    return;}
  if(C.mode==="prog1"){const k=clamp01(C.t/2.6);thPg.style.width=(k*100)+"%";thZone.style.width="0";thNd.style.left="-10%";if(k>=1){C.mode="prog2";C.t=0;C.need=3;C.ok=0;C.spd=1.6;newZone(C,0.16);thS.textContent="Cale les 3 fréquences : appuie quand l'aiguille est dans le vert";if(isTouch())thButton("Caler la fréquence",()=>theftHit());}return;}
  if(C.mode==="prog3"){const k=clamp01(C.t/1.6);thPg.style.width=(k*100)+"%";thZone.style.width="0";thNd.style.left="-10%";if(k>=1){TH.stats.prog++;finishTheft("Clé copiée, personne n'a rien vu.");}return;}
}
function glassSound(){const c=actx;if(!c)return;try{const t=c.currentTime,n=c.createBufferSource(),b=c.createBuffer(1,c.sampleRate*0.6,c.sampleRate),a=b.getChannelData(0);
  for(let i=0;i<a.length;i++)a[i]=(Math.random()*2-1)*Math.pow(1-i/a.length,3)*(Math.random()<0.02?3:1);n.buffer=b;const f=c.createBiquadFilter();f.type="highpass";f.frequency.value=2500;const g=c.createGain();g.gain.value=0.7;n.connect(f).connect(g).connect(sfxOut());n.start(t);}catch(e){}}
addEventListener("keydown",e=>{const C=TH.cur;if(!C||C.mode!=="choix")return;const m={Digit1:"vitre",Numpad1:"vitre",Digit2:"crochet",Numpad2:"crochet",Digit3:"prog",Numpad3:"prog"}[e.code];if(!m)return;
  const b=thBtns.querySelectorAll("button")[{vitre:0,crochet:1,prog:2}[m]];if(b)b.onclick(e);});
