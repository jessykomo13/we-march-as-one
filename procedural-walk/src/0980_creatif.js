// ================================================================ MODE CRÉATIF
// G (ou menu) : on/off · double Espace : voler · Espace / Ctrl : monter / descendre · Shift : très vite
// clic sur la carte (Tab) : téléportation · pas de police, invincible, argent à volonté
const CREA={on:false,god:true,noCops:true,lastSpace:0,open:true};
let flyTouch=0;
const creaEl=document.createElement("div");creaEl.id="crea";document.body.appendChild(creaEl);
const flyUpBtn=document.createElement("button");flyUpBtn.id="flyUp";flyUpBtn.textContent="▲";document.body.appendChild(flyUpBtn);
const flyDnBtn=document.createElement("button");flyDnBtn.id="flyDn";flyDnBtn.textContent="▼";document.body.appendChild(flyDnBtn);
for(const [b,v] of [[flyUpBtn,1],[flyDnBtn,-1]]){
  b.addEventListener("pointerdown",e=>{e.stopPropagation();e.preventDefault();flyTouch=v;});
  for(const ev of ["pointerup","pointercancel","pointerleave"])b.addEventListener(ev,()=>{if(flyTouch===v)flyTouch=0;});
}
function creaTeleports(){
  const L=[["Place centrale (départ)",0,0],["Nino",CONTACT.x+2,CONTACT.z]];
  for(const P of POIS)L.push([P.name,P.x,P.z]);
  return L;
}
function renderCrea(){
  if(!CREA.on){creaEl.style.display="none";return;}
  creaEl.style.display="block";creaEl.classList.toggle("mini",!CREA.open);
  if(!CREA.open){creaEl.innerHTML=`<button data-c="open" class="ct">✦ Créatif</button>`;return;}
  const tp=creaTeleports();
  creaEl.innerHTML=`<button data-c="close" class="ct">✦ MODE CRÉATIF ▾</button>
  <div class="cg"><button data-c="fly" class="${player.fly?"on":""}">${player.fly?"Atterrir":"Voler"} <small>(2× Espace)</small></button>
  <button data-c="god" class="${CREA.god?"on":""}">Invincible</button><button data-c="cops" class="${CREA.noCops?"on":""}">Sans police</button></div>
  <div class="cg"><button data-c="money">+10 000 €</button><button data-c="heal">Soigner</button><button data-c="wp" ${waypoint?"":"disabled"}>→ Repère GPS</button></div>
  <select data-c="tp"><option value="">Se téléporter…</option>${tp.map((t,i)=>`<option value="${i}">${t[0]}</option>`).join("")}</select>
  <div class="cg"><button data-c="voleur">Voleur</button><button data-c="course">Course</button><button data-c="m0">Mission 1</button><button data-c="m1">Mission 2</button><button data-c="m2">Mission 3</button></div>
  <div class="cg"><button data-c="crowd+">+10 passants</button><button data-c="clear">Vider la rue</button><button data-c="quit">Quitter</button></div>
  <small class="ch">Tab : carte, clique pour t'y téléporter</small>`;
}
function teleportTo(x,z,label){
  const pl=player;if(pl.ko||pl.sit.state!=="none")return;
  if(pl.ball)dropBall(pl);
  let y=groundAt(x,z);if(x>SEA_X)y=Math.max(y,WATER_Y+0.15);
  const flying=!!pl.fly;
  pl.root.set(x,flying?y+6:y,z);pl.vel.set(0,0,0);pl.swim=null;pl.air=null;pl.setRig(pl.rig,true);pl.gy=pl.root.y;pl.lastOk.copy(pl.root);
  if(!flying&&nearPort(x,z)<80){streamWorld(true);updatePortStream(0,true);for(let k=0;k<3;k++)pushOutOfObstacles(pl.root,0.4);pl.setRig(pl.rig,true);pl.gy=pl.root.y;pl.lastOk.copy(pl.root);}
  if(!flying&&waterDepth(x,z)>1.1){pl.setFly(true);}   // au-dessus de l'eau : on reste en vol
  cam.cur=cam.dist;cam.focus.set(x,pl.root.y+1,z);camera.position.set(x,pl.root.y+4,z+6);
  hudMsg("Téléporté"+(label?" : "+label:""),2);playSound("slap",0.04);
}
function toggleCreative(on=!CREA.on){
  CREA.on=on;if(on&&isTouch())CREA.open=false;
  if(!on){player.setFly(false);flyTouch=0;}
  else{wanted.level=0;wanted.heat=0;wanted.lose=0;}
  document.body.classList.toggle("creaOn",on);
  misBanner(on?"Mode créatif":"Mode normal",on?"Vol, téléportation, pas de police":"Retour au jeu normal",on?"#7fd8ff":"#ffd25a");
  renderCrea();
}
function toggleFly(){if(!CREA.on||player.ko)return;if(player.sit.state!=="none")player.standUp();player.setFly(!player.fly);hudMsg(player.fly?"Vol : Espace monter · Ctrl descendre · Shift très vite":"Atterrissage",2.5);renderCrea();}
for(const ev of ["pointerdown","touchstart","touchmove","wheel"])creaEl.addEventListener(ev,e=>e.stopPropagation(),{passive:true});
creaEl.addEventListener("change",e=>{const t=e.target;if(t.dataset.c==="tp"&&t.value!==""){const d=creaTeleports()[+t.value];teleportTo(d[1],d[2],d[0]);t.blur();if(isTouch())CREA.open=false;renderCrea();}});
creaEl.addEventListener("click",e=>{
  const b=e.target.closest("button");if(!b)return;const c=b.dataset.c;b.blur();
  if(c==="open"||c==="close")CREA.open=c==="open";
  else if(c==="fly")toggleFly();
  else if(c==="god")CREA.god=!CREA.god;
  else if(c==="cops"){CREA.noCops=!CREA.noCops;}
  else if(c==="money"){money+=10000;moneyEl.textContent=money+" €";}
  else if(c==="heal"){player.hp=player.maxHp;player.stamina=100;}
  else if(c==="wp"&&waypoint)teleportTo(waypoint.x,waypoint.z,waypoint.name);
  else if(c==="voleur"){if(EV.cur)evEnd(null);EV.next=0;startVoleur()||hudMsg("Personne à voler ici",2);}
  else if(c==="course"){if(EV.cur)evEnd(null);startCourse()||hudMsg("Pas de place pour une course ici",2);}
  else if(c&&c[0]==="m"){const i=+c[1];if(MIS.active)endMission(false,"Mission changée");MIS.stage=i;MIS.cool=0;startMission(STORY[i].id,false);}
  else if(c==="crowd+"){SET.crowd=Math.min(60,SET.crowd+10);storeSettings();npcTarget=SET.crowd;}
  else if(c==="clear")removeNpcs(walkers.length);
  else if(c==="quit")toggleCreative(false);
  if(isTouch()&&c!=="open"&&c!=="god"&&c!=="cops")CREA.open=false;
  renderCrea();
});
addEventListener("keydown",e=>{
  if(menuOpen||galleryOn)return;
  if(e.code==="KeyG"&&!e.repeat)toggleCreative();
  if(CREA.on&&e.code==="Space"&&!e.repeat){const t=performance.now();if(t-CREA.lastSpace<320){toggleFly();CREA.lastSpace=0;}else CREA.lastSpace=t;}
});
function updateCreative(dt){
  const on=CREA.on;
  flyUpBtn.style.display=flyDnBtn.style.display=on&&player.fly&&isTouch()?"block":"none";
  if(!on)return;
  if(CREA.noCops){if(wanted.level>0||wanted.heat>0){wanted.level=0;wanted.heat=0;wanted.lose=0;}}
  if(CREA.god){player.hp=player.maxHp;player.stamina=100;player.exhausted=false;}
  if(player.fly)player.fly.t+=dt;
  if((CREA.t=(CREA.t||0)+dt)>0.5){CREA.t=0;const b=creaEl.querySelector('[data-c="wp"]');if(b)b.disabled=!waypoint;}
}
