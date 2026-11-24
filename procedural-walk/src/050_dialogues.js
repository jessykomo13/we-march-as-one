// ================================================================ dialogues contextuels (module 5)
let barkT=0;const laterQ=[];function later(sec,fn){laterQ.push({t:clockT+sec,fn});}
function runLater(){for(let i=laterQ.length-1;i>=0;i--)if(clockT>=laterQ[i].t){const f=laterQ[i].fn;laterQ.splice(i,1);try{f();}catch(e){console.error(e);}}}
const dlgStats={said:0,spect:0,film:0};
function bark(w,lines,cd=14,silent=false){
  if(clockT<barkT||clockT-(w.lastBark||-99)<cd||w.ko)return false;
  say(w,pick(lines),silent);w.lastBark=clockT;barkT=clockT+1.1;dlgStats.said++;return true;
}
// geste de la main (salut / provocation) pour n'importe qui
function playGesture(w,kind){
  const dom=w.arms[(w.hand||1)<0?0:1],oth=w.arms[(w.hand||1)<0?1:0],t0=clockT,dur=kind==="wave"?1.4:kind==="nod"?0.8:1.5;
  w.gest={kind,t0,dur};
  if(kind==="wave")dom.rFn=(ww,sh,arm)=>{const t=clockT-t0,k=env(t,0,0.25,dur-0.3,dur);return {target:sh.clone().add(local(ww.chestRot,arm.side*(0.18+0.07*Math.sin(t*11)),0.22,0.1)),w:k,wrist:-20+25*Math.sin(t*11)};};
  else if(kind==="taunt"){for(const a of [dom,oth])a.rFn=(ww,sh,arm)=>{const t=clockT-t0,k=env(t,0,0.25,dur-0.35,dur);return {target:sh.clone().add(local(ww.chestRot,arm.side*0.42,-0.22,0.18)),w:k,wrist:-40};};w.reactLean=-6;}
  later(dur,()=>{if(w.gest&&w.gest.t0===t0){for(const a of w.arms)a.rFn=null;w.gest=null;w.reactLean=0;}});
  if(kind==="nod"){w.headNod=12;later(0.4,()=>{w.headNod=0;});}
}
// le joueur salue (Y) ou provoque (I)
function playerSocial(kind){
  if(player.ko||player.seatedLike)return;
  const t=findTarget(player,4.5,70);
  playGesture(player,kind==="greet"?"wave":"taunt");
  say(player,kind==="greet"?pick(["Salut !","Bonjour !","Yo, ça va ?"]):pick(["Hé toi ! T'as un problème ?","Qu'est-ce que tu regardes ?","Viens, viens !"]),false);
  if(!t||!t.brain.onSocial)return;
  later(rand(0.4,0.9),()=>{if(!t.ko)t.brain.onSocial(t,player,kind);});
}
// spectateurs de bagarre
const fightEvent={pos:new V3(),t:-99};
function noteFight(pos){
  const fresh=clockT-fightEvent.t>8;fightEvent.pos.copy(pos);fightEvent.t=clockT;
  if(!fresh)return;
  for(const w of walkers){
    if(w===player||w.isCop||w.isSpar||w.ko||!w.brain.startWatch||w.brain.fight||w.brain.flee||w.brain.watch||w.brain.react)continue;
    const d=hdist(w.root,pos);
    if(d<16&&d>1.8&&w.brain.temper>0.25&&Math.random()<0.55)w.brain.startWatch(w,Math.random()<0.4);
  }
}

