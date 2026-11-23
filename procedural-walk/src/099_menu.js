// ================================================================ module 12 : menu pause, options, sauvegardes
// Échap (clavier), Start (manette) ou ☰ (téléphone) ouvrent le menu. Le jeu est figé pendant ce temps.
// Les réglages sont enregistrés à part de la partie et s'appliquent tout de suite.
const SET_KEY="proceduralwalk.settings.v1";
const SET_DEFAULT={
  quality:"haute",shadows:"haute",dist:"normale",res:100,fov:40,fpsShow:false,
  master:80,sfx:90,siren:70,voice:true,voiceVol:90,
  sens:100,invertY:false,vibrate:true,autoCam:true,
  crowd:22,prints:true,help:true
};
const QUALITY={
  basse:{shadows:"off",dist:"courte",res:70},
  moyenne:{shadows:"basse",dist:"courte",res:85},
  haute:{shadows:"haute",dist:"normale",res:100},
  ultra:{shadows:"ultra",dist:"loin",res:100}
};
let SET={...SET_DEFAULT};
function loadSettings(){try{const d=JSON.parse(localStorage.getItem(SET_KEY)||"null");if(d)SET={...SET_DEFAULT,...d};}catch(e){}}
function storeSettings(){try{localStorage.setItem(SET_KEY,JSON.stringify(SET));}catch(e){}}
// --- son : bus de volume (général > effets / sirènes)
const AUD={};
function audioBuses(){
  const c=actx;if(!c||AUD.master)return;
  AUD.master=c.createGain();AUD.master.connect(c.destination);
  AUD.sfx=c.createGain();AUD.sfx.connect(AUD.master);AUD.siren=c.createGain();AUD.siren.connect(AUD.master);
  applyAudio();
}
function applyAudio(){
  if(!AUD.master)return;
  const t=actx.currentTime;
  AUD.master.gain.setTargetAtTime(menuOpen?0:SET.master/100,t,0.05);AUD.sfx.gain.setTargetAtTime(SET.sfx/100,t,0.05);AUD.siren.gain.setTargetAtTime(SET.siren/100,t,0.05);
}
const sfxOut=()=>{audioBuses();return AUD.sfx||actx.destination;},sirenOut=()=>{audioBuses();return AUD.siren||actx.destination;};
// --- application des réglages
function applySettings(){
  // graphismes
  const S={off:0,basse:1024,haute:2048,ultra:4096}[SET.shadows]??2048;
  renderer.shadowMap.enabled=S>0;sun.castShadow=S>0;
  if(S>0&&sun.shadow.mapSize.x!==S){sun.shadow.mapSize.set(S,S);if(sun.shadow.map){sun.shadow.map.dispose();sun.shadow.map=null;}}
  const ext=SET.shadows==="ultra"?20:14;Object.assign(sun.shadow.camera,{left:-ext,right:ext,top:ext,bottom:-ext});sun.shadow.camera.updateProjectionMatrix();
  scene.traverse(o=>{if(o.material)o.material.needsUpdate=true;});
  renderer.setPixelRatio(Math.min(devicePixelRatio,2)*clamp(SET.res,50,100)/100);renderer.setSize(innerWidth,innerHeight);
  LOAD_R={courte:2,normale:3,loin:4}[SET.dist]||3;UNLOAD_R=LOAD_R+1;
  scene.fog.far=LOAD_R*CHUNK+15;scene.fog.near=scene.fog.far*0.33;camera.far=scene.fog.far+60;
  camera.fov=clamp(SET.fov,30,70);camera.updateProjectionMatrix();
  // jeu
  const urlNpc=parseInt(new URLSearchParams(location.search).get("npc"));npcTarget=isNaN(urlNpc)?clamp(SET.crowd|0,0,60):urlNpc;showPrints=SET.prints;voiceOn=SET.voice;
  document.body.classList.toggle("noHelp",!SET.help);
  document.body.classList.toggle("showFps",SET.fpsShow);
  applyAudio();
}
// --- sauvegardes : automatique + 3 emplacements
const SLOT_KEYS=["proceduralwalk.save.v1","proceduralwalk.slot1","proceduralwalk.slot2","proceduralwalk.slot3"];
function readSlot(k){try{const d=JSON.parse(localStorage.getItem(k)||"null");return d&&d.v===1?d:null;}catch(e){return null;}}
function writeSlot(k){try{const d=gatherSave();d.date=Date.now();localStorage.setItem(k,JSON.stringify(d));return true;}catch(e){return false;}}
function slotLabel(d){
  if(!d)return "Vide";
  const dt=new Date(d.date),zone=chunkType(chunkOf(d.player.x),chunkOf(d.player.z));
  const when=dt.toLocaleDateString("fr-FR",{day:"numeric",month:"short"})+" "+dt.toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"});
  return `${when} · ${zone} (${Math.round(d.player.x)}, ${Math.round(d.player.z)}) · ${d.money} € · ${d.wanted?.level||0}★`;
}
function loadFrom(d){
  if(player.ko)player.endKO();if(player.sit.state!=="none")player.standUp();if(player.handsUp)toggleHandsUp();
  applySave(d);streamWorld(true);for(let k=0;k<3;k++)pushOutOfObstacles(player.root,0.4);
  player.gy=player.root.y=groundAt(player.root.x,player.root.z);player.air=null;player.setRig(player.rig,true);
  despawnFar();cam.focus.copy(player.root);
}
// --- interface
let menuOpen=false,menuTab="main",confirmK=null;
const menuEl=document.getElementById("pause");
const T=(id,label)=>`<button data-nav data-act="${id}">${label}</button>`;
function sel(key,label,opts){return `<label class="opt"><span>${label}</span><select data-nav data-set="${key}">${opts.map(([v,t])=>`<option value="${v}"${String(SET[key])===String(v)?" selected":""}>${t}</option>`).join("")}</select></label>`;}
function rng2(key,label,min,max,step,unit=""){return `<label class="opt"><span>${label}</span><input data-nav type="range" data-set="${key}" min="${min}" max="${max}" step="${step}" value="${SET[key]}"><b>${SET[key]}${unit}</b></label>`;}
function tog(key,label){return `<label class="opt"><span>${label}</span><button data-nav class="tog${SET[key]?" on":""}" data-tog="${key}">${SET[key]?"Oui":"Non"}</button></label>`;}
function renderMenu(){
  let h=`<div class="pbox"><h1>${{main:"Pause",opt:"Options",save:"Sauvegarder",load:"Charger",keys:"Commandes"}[menuTab]}</h1>`;
  if(menuTab==="main"){
    h+=`<div class="col">${T("resume","Reprendre")}${T("opt","Options")}${T("save","Sauvegarder")}${T("load","Charger une partie")}${T("keys","Commandes")}${T("crea",CREA.on?"Quitter le mode créatif":"Mode créatif (G)")}${T("gallery","Galerie des persos")}${T("new",confirmK==="new"?"Confirmer : tout effacer ?":"Nouvelle partie")}</div>`;
  }else if(menuTab==="opt"){
    h+=`<div class="sec">Graphismes</div>`+sel("quality","Préréglage",[["basse","Basse (téléphone ancien)"],["moyenne","Moyenne"],["haute","Haute"],["ultra","Ultra"],["perso","Personnalisé"]])
      +sel("shadows","Ombres",[["off","Aucune"],["basse","Basses"],["haute","Hautes"],["ultra","Ultra"]])
      +sel("dist","Distance d'affichage",[["courte","Courte (100 m)"],["normale","Normale (135 m)"],["loin","Loin (175 m)"]])
      +rng2("res","Résolution",50,100,5," %")+rng2("fov","Champ de vision",30,70,1,"°")+tog("fpsShow","Afficher les FPS");
    h+=`<div class="sec">Son</div>`+rng2("master","Volume général",0,100,5," %")+rng2("sfx","Effets (coups, chutes)",0,100,5," %")+rng2("siren","Sirènes",0,100,5," %")+tog("voice","Voix des passants")+rng2("voiceVol","Volume des voix",0,100,5," %");
    h+=`<div class="sec">Commandes</div>`+rng2("sens","Sensibilité caméra",30,250,10," %")+tog("invertY","Inverser l'axe vertical")+tog("vibrate","Vibrations")+tog("autoCam","Caméra qui se replace derrière");
    h+=`<div class="sec">Jeu</div>`+rng2("crowd","Nombre de passants",0,60,2,"")+tog("prints","Traces de pas")+tog("help","Aide des touches à l'écran");
    h+=`<div class="col">${T("reset","Réglages par défaut")}${T("back","Retour")}</div>`;
  }else if(menuTab==="save"||menuTab==="load"){
    const keys=menuTab==="save"?SLOT_KEYS.slice(1):SLOT_KEYS;
    h+=`<div class="col">`+keys.map((k,i)=>{const d=readSlot(k),name=k===SLOT_KEYS[0]?"Automatique":"Emplacement "+(SLOT_KEYS.indexOf(k));
      const dis=menuTab==="load"&&!d?" disabled":"";const conf=confirmK===k?(menuTab==="save"?" — confirmer l'écrasement ?":" — confirmer ?"):"";
      return `<button data-nav class="slot" data-slot="${k}"${dis}><b>${name}${conf}</b><small>${slotLabel(d)}</small></button>`;}).join("")+T("back","Retour")+`</div>`;
  }else if(menuTab==="keys"){
    h+=`<div class="keysgrid"><div><b>Clavier</b><br>ZQSD / WASD marcher · Shift sprint · X jogging · Ctrl s'accroupir · F / clic poing · C / clic droit pied · L coup le plus fort · Espace garde · E s'asseoir · J se rendre · Y saluer · I provoquer · R caméra épaule · Tab carte · G mode créatif (2× Espace voler) · H debug · F9 sauver · Échap menu</div>
      <div><b>Manette</b><br>${PADMAP.map(m=>m[1]).join(" · ").replace("Start : aide manette","Start : menu")}</div>
      <div><b>Téléphone</b><br>Pouce gauche : joystick où tu poses le doigt · glisser à droite : caméra · pincer : zoom · boutons Poing, Pied, Garde, Courir, Accroupi, Épaule · ☰ : menu</div></div>`+`<div class="col">${T("back","Retour")}</div>`;
  }
  menuEl.innerHTML=h+`</div>`;
  navFocus(0,true);
}
function openMenu(tab="main"){if(galleryOn)return;menuOpen=true;menuTab=tab;confirmK=null;menuEl.style.display="flex";renderMenu();keys.clear();touchMove={x:0,y:0};applyAudio();try{speechSynthesis.cancel();}catch(e){}}
function closeMenu(){keys.clear();menuOpen=false;menuEl.style.display="none";applyAudio();}
function setVal(key,v){
  SET[key]=v;
  if(key==="quality"&&QUALITY[v])Object.assign(SET,QUALITY[v]);
  else if(["shadows","dist","res"].includes(key))SET.quality="perso";
  storeSettings();applySettings();
}
menuEl.addEventListener("pointerdown",e=>e.stopPropagation());
menuEl.addEventListener("click",e=>{
  const b=e.target.closest("button");if(!b||b.disabled)return;
  const a=b.dataset.act,k=b.dataset.tog,s=b.dataset.slot;
  if(k){setVal(k,!SET[k]);renderMenu();return;}
  if(s){
    if(confirmK!==s&&(menuTab==="load"||readSlot(s))){confirmK=s;renderMenu();return;}
    if(menuTab==="save"){hudMsg(writeSlot(s)?"Partie sauvegardée":"Sauvegarde impossible");confirmK=null;renderMenu();}
    else{const d=readSlot(s);if(d){loadFrom(d);closeMenu();hudMsg("Partie chargée");}}
    return;
  }
  confirmK=a==="new"&&confirmK!=="new"?"new":null;
  if(a==="resume")closeMenu();
  else if(["opt","save","load","keys"].includes(a)){menuTab=a;renderMenu();}
  else if(a==="back"){menuTab="main";renderMenu();}
  else if(a==="reset"){SET={...SET_DEFAULT};storeSettings();applySettings();renderMenu();}
  else if(a==="gallery"){closeMenu();toggleGallery();}
  else if(a==="crea"){closeMenu();toggleCreative();}
  else if(a==="new"){if(confirmK==="new")renderMenu();else{newGame();closeMenu();}}
});
menuEl.addEventListener("input",e=>{const t=e.target,k=t.dataset.set;if(!k)return;
  const v=t.type==="range"?+t.value:t.value;setVal(k,v);
  if(t.type==="range")t.nextElementSibling.textContent=v+(t.nextElementSibling.textContent.replace(/^[-\d.]+/,""));
  if(k==="quality"||["shadows","dist","res"].includes(k))renderMenu();
});
// navigation au clavier et à la manette
let navI=0;
function navItems(){return [...menuEl.querySelectorAll("[data-nav]")].filter(x=>!x.disabled);}
function navFocus(d,abs){const it=navItems();if(!it.length)return;navI=abs?d:(navI+d+it.length)%it.length;it.forEach(x=>x.classList.remove("nav"));const el=it[navI];el.classList.add("nav");if(document.body.classList.contains("touch"))return;el.focus({preventScroll:true});el.scrollIntoView({block:"nearest"});}
function navAdjust(dir){const el=navItems()[navI];if(!el)return;
  if(el.type==="range"){el.value=+el.value+dir*(+el.step||1);el.dispatchEvent(new Event("input",{bubbles:true}));}
  else if(el.tagName==="SELECT"){el.selectedIndex=clamp(el.selectedIndex+dir,0,el.options.length-1);el.dispatchEvent(new Event("input",{bubbles:true}));}
  else if(el.dataset.tog)el.click();
}
addEventListener("keydown",e=>{
  if(e.code==="Escape"){e.preventDefault();if(!menuOpen)openMenu();else if(menuTab!=="main"){menuTab="main";renderMenu();}else closeMenu();return;}
  if(!menuOpen)return;
  if(e.code==="ArrowDown"){navFocus(1);e.preventDefault();}
  if(e.code==="ArrowUp"){navFocus(-1);e.preventDefault();}
  if(e.code==="ArrowLeft"){navAdjust(-1);e.preventDefault();}
  if(e.code==="ArrowRight"){navAdjust(1);e.preventDefault();}
  if(e.code==="Enter"&&document.activeElement?.tagName!=="BUTTON"){navItems()[navI]?.click();e.preventDefault();}
},true);
const padPrevMenu=[];
function pollPadMenu(){
  const gp=(navigator.getGamepads?[...navigator.getGamepads()]:[]).find(g=>g&&g.connected);if(!gp)return;
  const B=i=>gp.buttons[i]&&(gp.buttons[i].pressed||gp.buttons[i].value>0.5),edge=i=>{const n=B(i),r=n&&!padPrevMenu[i];padPrevMenu[i]=n;return r;};
  const ay=gp.axes[1]||0,ax=gp.axes[0]||0;
  const up=edge(12)||(ay<-0.6&&!padPrevMenu.ay&&(padPrevMenu.ay=1)),down=edge(13)||(ay>0.6&&!padPrevMenu.ay&&(padPrevMenu.ay=1));if(Math.abs(ay)<0.3)padPrevMenu.ay=0;
  const left=edge(14)||(ax<-0.6&&!padPrevMenu.ax&&(padPrevMenu.ax=1)),right=edge(15)||(ax>0.6&&!padPrevMenu.ax&&(padPrevMenu.ax=1));if(Math.abs(ax)<0.3)padPrevMenu.ax=0;
  if(edge(9)){if(menuOpen)closeMenu();else openMenu();pad.prev[9]=true;return;}
  if(!menuOpen)return;
  if(up)navFocus(-1);if(down)navFocus(1);if(left)navAdjust(-1);if(right)navAdjust(1);
  if(edge(0))navItems()[navI]?.click();
  if(edge(1)){if(menuTab!=="main"){menuTab="main";renderMenu();}else closeMenu();}
}
// Start ouvre maintenant le menu (l'aide manette est dans « Commandes »)
PADMAP[9][2]=null;
document.getElementById("menuBtn").addEventListener("pointerdown",e=>{e.stopImmediatePropagation();document.body.classList.remove("menuOpen");openMenu();},true);
loadSettings();applySettings();
