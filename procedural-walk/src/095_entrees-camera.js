// ================================================================ entrées / caméra
const stepEl=document.getElementById("step"),speedEl=document.getElementById("speed"),crowdEl=document.getElementById("crowd");
addEventListener("keydown",e=>{
  keys.add(e.code);
  if(e.code==="KeyP"){SET.prints=!SET.prints;storeSettings();applySettings();hudMsg(SET.prints?"Traces de pas : oui":"Traces de pas : non");}
  if(e.code==="F1"||e.code==="KeyH"){debug=!debug;document.getElementById("hud").classList.toggle("faded",!debug);e.preventDefault();}
  if(e.code==="KeyN"){SET.crowd=Math.min(60,SET.crowd+5);storeSettings();npcTarget=SET.crowd;}
  if(e.code==="KeyB"){SET.crowd=Math.max(0,SET.crowd-5);storeSettings();npcTarget=SET.crowd;removeNpcs(5);}
  if(e.code==="KeyE")sitRequest=true;
  if(e.code==="KeyU")toggleGallery();
  if(galleryOn&&e.code==="ArrowRight"){galStep(1);e.preventDefault();return;}
  if(galleryOn&&e.code==="ArrowLeft"){galStep(-1);e.preventDefault();return;}
  if(galleryOn&&e.code==="KeyR"){buildGallery();galFocus=-1;galStep(0);}
  if(e.code==="KeyK")toggleSpar();
  if(e.code==="KeyY")playerSocial("greet");
  if(e.code==="KeyI")playerSocial("taunt");
  if(e.code==="Space")e.preventDefault();
  if(e.code==="KeyX"){jogOn=!jogOn;hudMsg(jogOn?"Allure : jogging":"Allure : marche");}
  if(e.code==="KeyT"){benchOn=!benchOn;benchEl.style.display=benchOn?"block":"none";}
  if(e.code==="KeyF"){atkRequest="punch";atkReqT=clockT;}
  if(e.code==="KeyL"){atkRequest="best";atkReqT=clockT;}
  if(e.code==="KeyC"){atkRequest="kick";atkReqT=clockT;}
  if(e.code==="KeyJ")toggleHandsUp();
  if(e.code==="KeyM"){player.hand=-player.hand;player.nextPunch=0;handEl.textContent=player.hand>0?"Droitier":"Gaucher";}
  if(e.code==="KeyV"){SET.voice=!SET.voice;storeSettings();voiceOn=SET.voice;try{if(!voiceOn)speechSynthesis.cancel();}catch(_){}}
  if(e.code.startsWith("Arrow")||e.code==="Space")e.preventDefault();
});
addEventListener("keyup",e=>keys.delete(e.code));
addEventListener("blur",()=>keys.clear());

const cam={shake:0,yaw:28,pitch:10,dist:3.6,focus:new V3(0,1,0)};
let drag=null;
const cv=renderer.domElement;
cv.addEventListener("contextmenu",e=>e.preventDefault());
cv.addEventListener("pointerdown",e=>{if(e._joy)return;drag={id:e.pointerId,x:e.clientX,y:e.clientY,sx:e.clientX,sy:e.clientY,t:performance.now(),b:e.button};cv.setPointerCapture(e.pointerId);});
cv.addEventListener("pointermove",e=>{if(!drag||drag.id!==e.pointerId)return;lastCamInput=clockT;const sn=0.3*SET.sens/100;cam.yaw+=(e.clientX-drag.x)*sn;cam.pitch=clamp(cam.pitch+(e.clientY-drag.y)*sn*(SET.invertY?-1:1),-5,80);drag.x=e.clientX;drag.y=e.clientY;});
cv.addEventListener("pointerup",e=>{if(drag&&e.pointerType==="mouse"&&Math.hypot(e.clientX-drag.sx,e.clientY-drag.sy)<6&&performance.now()-drag.t<300){atkRequest=drag.b===2?"kick":"punch";atkReqT=clockT;}drag=null;});cv.addEventListener("pointercancel",()=>drag=null);
cv.addEventListener("wheel",e=>{cam.dist=clamp(cam.dist+Math.sign(e.deltaY)*0.4,1.0,20);e.preventDefault();},{passive:false});
if(matchMedia("(pointer:coarse)").matches)document.body.classList.add("touch");
const joy=document.getElementById("joy"),knob=document.getElementById("knob"),runBtn=document.getElementById("runBtn");
let joyId=null;
function joyUpdate(e){const r=joy.getBoundingClientRect();let dx=(e.clientX-r.left-r.width/2)/(r.width/2),dy=(e.clientY-r.top-r.height/2)/(r.height/2);const m=Math.hypot(dx,dy);if(m>1){dx/=m;dy/=m;}touchMove={x:dx,y:-dy};knob.style.left=(40+dx*40)+"px";knob.style.top=(40+dy*40)+"px";}
joy.addEventListener("pointerdown",e=>{joyId=e.pointerId;joy.setPointerCapture(e.pointerId);joyUpdate(e);e.stopPropagation();});
joy.addEventListener("pointermove",e=>{if(e.pointerId===joyId)joyUpdate(e);});
const joyEnd=()=>{joyId=null;touchMove={x:0,y:0};knob.style.left=knob.style.top="40px";};
joy.addEventListener("pointerup",joyEnd);joy.addEventListener("pointercancel",joyEnd);
document.getElementById("handsBtn").addEventListener("pointerdown",e=>{toggleHandsUp();e.stopPropagation();});
{const cb=document.getElementById("crouchBtn");cb.addEventListener("pointerdown",e=>{touchCrouch=!touchCrouch;cb.style.background=touchCrouch?"rgba(80,140,255,.6)":"";e.stopPropagation();});}
document.getElementById("sitBtn").addEventListener("pointerdown",e=>{sitRequest=true;e.stopPropagation();});
runBtn.addEventListener("pointerdown",e=>{touchRun=!touchRun;runBtn.classList.toggle("on",touchRun);e.stopPropagation();});

// import d'un personnage .glb rigué Mixamo pour le joueur
const seekEl=document.getElementById("seek");
const benchEl=document.getElementById("bench"),evEl=document.getElementById("evidence"),stamFill=document.getElementById("stamFill"),starsEl=document.getElementById("stars"),msgEl=document.getElementById("msg"),arrestEl=document.getElementById("arrest"),moneyEl=document.getElementById("money"),koEl=document.getElementById("ko"),flashEl=document.getElementById("flash"),hpFill=document.getElementById("hpFill"),hpTxt=document.getElementById("hpTxt"),handEl=document.getElementById("hand");
document.getElementById("galNew").addEventListener("click",()=>{buildGallery();galFocus=-1;galStep(0);});
document.getElementById("galPrev").addEventListener("click",()=>galStep(-1));
document.getElementById("galNext").addEventListener("click",()=>galStep(1));
document.getElementById("galBtn").addEventListener("click",()=>toggleGallery());
document.getElementById("punchBtn").addEventListener("pointerdown",e=>{atkRequest="punch";atkReqT=clockT;e.stopPropagation();});
document.getElementById("kickBtn").addEventListener("pointerdown",e=>{atkRequest="kick";atkReqT=clockT;e.stopPropagation();});
const fileIn=document.getElementById("fileIn"),loadingEl=document.getElementById("loading");
function importFile(file){
  if(!file)return;
  const url=URL.createObjectURL(file);
  loadingEl.textContent="Chargement de "+file.name+"…";loadingEl.style.display="flex";
  new GLTFLoader().load(url,gltf=>{
    try{player.setRig(buildRig(gltf),false);loadingEl.style.display="none";}
    catch(err){loadingEl.textContent="Ce fichier n'a pas de squelette Mixamo ("+err.message+").";setTimeout(()=>loadingEl.style.display="none",4000);}
    URL.revokeObjectURL(url);
  },undefined,()=>{loadingEl.textContent="Fichier illisible.";setTimeout(()=>loadingEl.style.display="none",3000);});
}
document.getElementById("importBtn").addEventListener("pointerdown",e=>e.stopPropagation());
document.getElementById("importBtn").addEventListener("click",()=>fileIn.click());
fileIn.addEventListener("change",()=>importFile(fileIn.files[0]));
addEventListener("dragover",e=>e.preventDefault());
addEventListener("drop",e=>{e.preventDefault();importFile(e.dataTransfer.files[0]);});

function updateCamera(dt){
  let want=player.root.clone().setY((galleryOn?0:player.root.y)+(window.__focusY??player.rig.neckY*0.78));
  if(player.swim&&!galleryOn)want.y=WATER_Y+0.6;
  if(galleryOn){const f=gallery[galFocus];want=f?f.root.clone().setY(f.rig.neckY+0.02):GAL_C.clone().setY(0.95);}
  cam.focus.lerp(want,1-Math.exp(-8*dt));
  const R=cameraRig(dt,cam.focus);
  camera.position.copy(R.focus).addScaledVector(R.dir,-R.dist);
  if(camera.position.y<0.1)camera.position.y=0.1;
  camera.lookAt(R.focus);
  if(cam.shake>0){cam.shake=Math.max(0,cam.shake-dt*1.6);camera.position.add(new V3(rand(-1,1),rand(-1,1),rand(-1,1)).multiplyScalar(cam.shake*0.12));}
  const sc=galleryOn?GAL_C:player.root;sun.position.copy(sc).add(new V3(-6,11,4));sun.target.position.copy(sc);
}

