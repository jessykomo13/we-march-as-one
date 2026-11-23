// ================================================================ module 11 : manette, caméra à l'épaule, contrôles tactiles
// --- manette (API Gamepad, disposition « standard » Xbox / PlayStation)
const pad={on:false,move:{x:0,y:0},look:{x:0,y:0},run:false,guard:false,aim:false,prev:[],id:""};
let lastCamInput=-99;
const PADMAP=[ // bouton, libellé, action à l'appui
  [0,"A / Croix : sprint (maintenir)"],[1,"B / Rond : s'accroupir",()=>{touchCrouch=!touchCrouch;syncCrouchBtn();}],
  [2,"X / Carré : coup de poing",()=>{atkRequest="punch";atkReqT=clockT;}],[3,"Y / Triangle : coup de pied",()=>{atkRequest="kick";atkReqT=clockT;}],
  [4,"LB / L1 : garde (maintenir)"],[5,"RB / R1 : coup le plus fort",()=>{atkRequest="best";atkReqT=clockT;}],
  [6,"LT / L2 : caméra à l'épaule (maintenir)"],[7,"RT / R2 : sprint (maintenir)"],
  [8,"Select : panneau de debug",()=>{debug=!debug;}],[9,"Start : aide manette",()=>showPadHelp()],
  [10,"L3 : marche / jogging",()=>{jogOn=!jogOn;hudMsg(jogOn?"Allure : jogging":"Allure : marche");}],[11,"R3 : changer d'épaule",()=>{cam.side=-cam.side;}],
  [12,"Croix ↑ : s'asseoir / prendre les habits",()=>{sitRequest=true;}],[13,"Croix ↓ : se rendre",()=>toggleHandsUp()],
  [14,"Croix ← : saluer",()=>playerSocial("greet")],[15,"Croix → : provoquer",()=>playerSocial("taunt")]
];
function showPadHelp(){hudMsg(PADMAP.map(m=>m[1]).join(" · "),9);}
const dz=(v,d=0.16)=>Math.abs(v)<d?0:(v-Math.sign(v)*d)/(1-d);
function pollPad(dt){
  const list=navigator.getGamepads?[...navigator.getGamepads()]:[];
  const gp=list.find(g=>g&&g.connected);
  if(!gp){if(pad.on){pad.on=false;hudMsg("Manette déconnectée");}pad.move={x:0,y:0};pad.run=pad.guard=pad.aim=false;return;}
  if(!pad.on){pad.on=true;pad.id=gp.id;hudMsg("Manette connectée — Start pour voir les touches");}
  const a=gp.axes,B=i=>gp.buttons[i]&&(gp.buttons[i].pressed||gp.buttons[i].value>0.4);
  // stick gauche : déplacement (zone morte radiale, courbe douce)
  let mx=a[0]||0,my=-(a[1]||0);const m=Math.hypot(mx,my),k=m<0.14?0:Math.min(1,(m-0.14)/0.8)/(m||1);
  pad.move={x:mx*k,y:my*k};
  // stick droit : caméra, accélération progressive
  const lx=dz(a[2]||0),ly=dz(a[3]||0);
  if(lx||ly){const acc=(1+Math.hypot(lx,ly)*0.8)*SET.sens/100,iy=SET.invertY?-1:1;cam.yaw+=lx*Math.abs(lx)*115*acc*dt*(pad.aim?0.5:1);cam.pitch=clamp(cam.pitch+iy*ly*Math.abs(ly)*95*acc*dt*(pad.aim?0.5:1),-5,80);lastCamInput=clockT;}
  pad.run=B(0)||B(7);pad.guard=B(4);pad.aim=B(6);
  for(const [i,,fn] of PADMAP){const now=B(i);if(now&&!pad.prev[i]&&fn)fn();pad.prev[i]=now;}
}
function rumble(ms,strong=0.6){
  if(!SET.vibrate)return;
  try{if(pad.on){const gp=[...navigator.getGamepads()].find(g=>g&&g.connected);gp?.vibrationActuator?.playEffect?.("dual-rumble",{duration:ms,strongMagnitude:strong,weakMagnitude:strong*0.6});}}catch(e){}
  try{if(document.body.classList.contains("touch"))navigator.vibrate?.(Math.min(ms,80));}catch(e){}
}
addEventListener("gamepadconnected",()=>{});

// --- caméra : à l'épaule, collision avec les murs, recentrage automatique
cam.side=1;cam.mode=0;cam.sh=0;cam.cur=cam.dist;
addEventListener("keydown",e=>{if(e.code==="KeyR"&&!galleryOn){cam.mode=(cam.mode+1)%3;if(cam.mode===2)cam.side=-1;else cam.side=1;hudMsg(["Caméra : normale","Caméra : épaule droite","Caméra : épaule gauche"][cam.mode]);}});
function shoulderOn(){return !galleryOn&&(cam.mode>0||pad.aim||touchAim);}
function cameraBlocked(p){
  if(p.y<groundAt(p.x,p.z)+0.12)return true;
  if(p.y<WATER_Y+0.25&&waterDepth(p.x,p.z)>0)return true;
  for(const o of obsAt(p))if(o.tall&&(o.bld||(o.top!==undefined&&p.y<o.top+0.2))&&obstacleClosest(o,p).d<0.25)return true;
  return false;
}
function cameraRig(dt,want){
  const sh=shoulderOn();cam.sh=lerp(cam.sh,sh?1:0,1-Math.exp(-9*dt));
  // recentrage derrière le joueur quand il court et qu'on ne touche pas à la caméra
  if(SET.autoCam&&!galleryOn&&!sh&&clockT-lastCamInput>1.8&&player.speed>1.2&&!player.ko){
    const d=deltaAngle(cam.yaw,player.yaw);cam.yaw+=d*(1-Math.exp(-0.9*dt*Math.min(2,player.speed/2)));
  }
  const p=cam.pitch*D2R,y=cam.yaw*D2R;
  const dir=new V3(Math.sin(y)*Math.cos(p),-Math.sin(p),-Math.cos(y)*Math.cos(p));
  const right=new V3(Math.cos(y),0,Math.sin(y));
  const focus=want.clone();
  if(cam.sh>0.001){focus.addScaledVector(right,0.55*cam.side*cam.sh);focus.y+=0.1*cam.sh;}
  const dist=lerp(cam.dist,2.3,cam.sh);
  // collision : on avance la caméra si un immeuble ou le relief est entre elle et le joueur
  let free=dist;
  for(let s=0.35;s<=dist;s+=0.2){const q=focus.clone().addScaledVector(dir,-s);if(cameraBlocked(q)){free=Math.max(0.35,s-0.3);break;}}
  cam.cur=free<cam.cur?lerp(cam.cur,free,1-Math.exp(-25*dt)):lerp(cam.cur,free,1-Math.exp(-3*dt));
  return {focus,dir,dist:cam.cur};
}

// --- tactile : joystick flottant, glisser pour la caméra, pincer pour zoomer, boutons contextuels
let touchAim=false,guardTouch=false;
const isTouch=()=>document.body.classList.contains("touch");
const tPointers=new Map();let pinch0=null;
function placeJoy(x,y){joy.style.left=(x-65)+"px";joy.style.top=(y-65)+"px";joy.style.bottom="auto";joy.classList.add("active");}
function resetJoy(){joy.style.left="";joy.style.top="";joy.style.bottom="";joy.classList.remove("active");}
cv.addEventListener("pointerdown",e=>{
  if(e.pointerType!=="touch")return;
  tPointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(e.clientX<innerWidth*0.45&&joyId===null){ // moitié gauche : le joystick apparaît sous le pouce
    e._joy=true;drag=null;joyId=e.pointerId;placeJoy(e.clientX,e.clientY);joyUpdate(e);try{cv.setPointerCapture(e.pointerId);}catch(_){}return;
  }
  lastCamInput=clockT;
  const cam2=[...tPointers.entries()].filter(([id])=>id!==joyId);
  if(cam2.length===2){e._joy=true;drag=null;pinch0={d:Math.hypot(cam2[0][1].x-cam2[1][1].x,cam2[0][1].y-cam2[1][1].y),dist:cam.dist};}
},true);
cv.addEventListener("pointermove",e=>{
  if(e.pointerType!=="touch")return;
  if(e.pointerId===joyId){joyUpdate(e);e.stopImmediatePropagation();return;}
  const t=tPointers.get(e.pointerId);if(t){t.x=e.clientX;t.y=e.clientY;}
  lastCamInput=clockT;
  const cam2=[...tPointers.entries()].filter(([id])=>id!==joyId);
  if(pinch0&&cam2.length===2){const d=Math.hypot(cam2[0][1].x-cam2[1][1].x,cam2[0][1].y-cam2[1][1].y);cam.dist=clamp(pinch0.dist*pinch0.d/Math.max(20,d),1.2,14);e.stopImmediatePropagation();}
},true);
const tEnd=e=>{if(e.pointerType!=="touch")return;tPointers.delete(e.pointerId);if(e.pointerId===joyId){joyEnd();resetJoy();}pinch0=null;};
cv.addEventListener("pointerup",tEnd,true);cv.addEventListener("pointercancel",tEnd,true);
function syncCrouchBtn(){const cb=document.getElementById("crouchBtn");if(cb)cb.classList.toggle("on",touchCrouch);}
{
  const hold=(id,on,off)=>{const b=document.getElementById(id);if(!b)return;
    b.addEventListener("pointerdown",e=>{e.stopPropagation();on();b.classList.add("on");});
    for(const ev of ["pointerup","pointercancel","pointerleave"])b.addEventListener(ev,()=>{off();b.classList.remove("on");});};
  hold("guardBtn",()=>{guardTouch=true;},()=>{guardTouch=false;});
  document.getElementById("aimBtn")?.addEventListener("pointerdown",e=>{e.stopPropagation();touchAim=!touchAim;e.currentTarget.classList.toggle("on",touchAim);});
  document.getElementById("menuBtn")?.addEventListener("pointerdown",e=>{e.stopPropagation();document.body.classList.toggle("menuOpen");});
}
// boutons contextuels : « S'asseoir » près d'un banc, « Se rendre » quand on est recherché
let ctxT=0;
function updateContextButtons(dt){
  ctxT-=dt;if(ctxT>0||!isTouch())return;ctxT=0.25;
  const sit=document.getElementById("sitBtn"),hands=document.getElementById("handsBtn");
  if(driveCtx(sit))return;
  if(secretNear()){sit.style.display="block";sit.textContent="Fouiller";return;}
  const seated=player.sit.state!=="none",nearBench=benchSpots.some(s=>!s.taken&&hdist(s.pos,player.root)<2.4);
  sit.style.display=seated||nearBench||player.ball||MIS.canTalk||EV.canAccept||shopNear?"block":"none";sit.textContent=MIS.canTalk&&!seated?"Parler":EV.canAccept?"Accepter":shopNear&&!seated&&!player.ball?"Acheter":player.ball?"Lâcher":seated?"Se lever":"S'asseoir";
  hands.style.display=wanted.level>0||player.handsUp?"block":"none";hands.textContent=player.handsUp?"Mains en bas":"Se rendre";
}
