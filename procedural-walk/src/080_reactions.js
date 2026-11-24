// ================================================================ réactions quand on bouscule
const LINES={
  gesture:["Oh, fais attention !","Eh ! Fais gaffe, là !","Oh ! Regarde devant toi !","Attention, toi !","Oh là, doucement !","Eh, tu peux faire attention ?"],
  point:["Tu peux pas regarder où tu vas ?!","Toi, là ! Fais attention !","C'est pas possible, ça !","Eh, je te parle, là !"],
  shrug:["Sérieux ?!","Mais quoi ?!","Non mais ça va pas ?","Euh… t'es sérieux ?"],
  hips:["Pff… n'importe quoi.","Incroyable…","Les gens, franchement…","Mais c'est pas vrai…"],
  sorry:["Oups… pardon.","Oh, excusez-moi.","Pas de souci.","Oh, pardon !"],
  shove:["Dégage !","Tu me bouscules, je te bouscule !","Oh ! Ça va pas, toi ?!","Recule !"],
  shoveAfter:["Fais gaffe la prochaine fois.","Voilà.","Allez, ciao.","Regarde où tu marches."]
};
const bubbleLayer=document.getElementById("bubbles");
const bubbles=[];
let voiceOn=true,frVoices=[];
function loadVoices(){try{frVoices=speechSynthesis.getVoices().filter(v=>/^fr/i.test(v.lang));}catch(e){}}
try{speechSynthesis.onvoiceschanged=loadVoices;loadVoices();}catch(e){}
function say(w,text,silent){
  for(const b of bubbles)if(b.w===w)b.life=Math.min(b.life,b.t+0.2);
  const div=document.createElement("div");div.className="bubble";div.textContent=text;bubbleLayer.appendChild(div);
  bubbles.push({w,div,t:0,life:1.4+text.length*0.055});
  w.talkT=0.35+text.length*0.065;
  if(!voiceOn||silent||menuOpen)return;
  try{
    const u=new SpeechSynthesisUtterance(text);u.lang="fr-FR";
    if(frVoices.length)u.voice=frVoices[Math.floor(w.seed)%frVoices.length];
    u.pitch=w.voicePitch;u.rate=w.voiceRate;
    u.volume=clamp(1.2-hdist(w.root,player.root)/14,0.15,1)*SET.voiceVol/100*SET.master/100;
    speechSynthesis.speak(u);
  }catch(e){}
}
function updateBubbles(dt){
  for(let i=bubbles.length-1;i>=0;i--){
    const b=bubbles[i];b.t+=dt;
    if(b.t>b.life){b.div.remove();bubbles.splice(i,1);continue;}
    const p=wp(b.w.rig.b.Head).add(new V3(0,0.32,0)).project(camera);
    const vis=p.z<1&&p.z>-1;
    b.div.style.display=vis?"block":"none";
    if(vis){
      b.div.style.left=((p.x*0.5+0.5)*innerWidth)+"px";b.div.style.top=((-p.y*0.5+0.5)*innerHeight)+"px";
      const a=Math.min(1,b.t*6)*Math.min(1,(b.life-b.t)*3);
      b.div.style.opacity=a;b.div.style.transform=`translate(-50%,-100%) scale(${0.85+0.15*Math.min(1,b.t*6)})`;
    }
  }
}
const sst=(a,b,x)=>{const t=clamp01((x-a)/(b-a));return t*t*(3-2*t);};
const env=(t,a,b,c,d)=>sst(a,b,t)*(1-sst(c,d,t));
function keysAt(K,t){ // K: [[t,x,y,f,wrist],...] interpolation lissée
  if(t<=K[0][0])return K[0];
  for(let i=1;i<K.length;i++)if(t<=K[i][0]){const a=K[i-1],b=K[i],u=sst(a[0],b[0],t);return a.map((v,j)=>v+(b[j]-v)*u);}
  return K[K.length-1];
}
// Crée une réaction procédurale : jamais exactement la même
function makeReaction(type,w,other,hand){
  const R={type,t:0,other,hand,delay:rand(0.12,0.4),said:false,line:pick(LINES[type==="sorry"?"sorry":type])};
  const amp=rand(0.8,1.3),hy=rand(-0.1,0.12),sp=rand(0.8,1.25);
  R.speed=sp;
  if(type==="gesture"){
    const flicks=Math.random()<0.4?2:1,both=Math.random()<0.18;
    const K=[[0,0.12,-0.45,0.05,8],[0.3,0.2,-0.08+hy,0.32,-20]];
    let t=0.3;
    for(let i=0;i<flicks;i++){K.push([t+0.14,0.4*amp,0.04+hy,0.4,rand(30,55)],[t+0.34,0.28,-0.06+hy,0.34,-10]);t+=0.36;}
    K.push([t+0.4,0.26,-0.12+hy,0.3,0]);
    R.dur=t+0.85;R.K=K;R.both=both;R.lean=rand(3,10);R.sayAt=rand(0.25,0.5);
  }else if(type==="point"){
    R.dur=rand(1.6,2.3);R.wagF=rand(9,15);R.wagA=rand(0.03,0.07);R.hipOther=Math.random()<0.45;R.lean=rand(4,9);R.sayAt=rand(0.2,0.45);
  }else if(type==="shrug"){
    R.dur=rand(1.5,2.1);R.spread=rand(0.28,0.42);R.raise=rand(9,16);R.tilt=rand(-12,12);R.sayAt=rand(0.15,0.35);
  }else if(type==="hips"){
    R.dur=rand(2.0,2.8);R.shakeA=rand(9,16);R.shakeF=rand(7,10);R.sayAt=rand(0.5,0.9);R.hipY=rand(-0.5,-0.44);
  }else if(type==="sorry"){
    R.dur=rand(1.0,1.5);R.sayAt=rand(0.1,0.3);R.h=rand(0.05,0.18);
  }else if(type==="shove"){
    R.phase="go";R.dur=9;R.sayAt=99;R.force=rand(1.5,2.4);R.lean=rand(8,14);
  }
  return R;
}
const pick=a=>a[Math.floor(Math.random()*a.length)];
function clearReaction(w){for(const a of w.arms){a.rFn=null;a.raise=0;}w.shrug=0;w.headShake=0;w.headTiltX=0;w.headNod=0;w.reactLean=0;w.lookW=0;w.lookAt=null;}
function driveReaction(w,R,dt){
  R.t+=dt;
  const o=R.other,t=R.t-R.delay;
  const to=new V3().subVectors(o.root,w.root);to.y=0;const dist=to.length();
  const faceYaw=Math.atan2(to.x,-to.z)/D2R;
  w.lookAt=o;w.lookW=Math.min(1,R.t*4);
  if(!R.said&&t>R.sayAt){R.said=true;say(w,R.line);}
  const dom=w.arms[R.hand<0?0:1],oth=w.arms[R.hand<0?1:0];
  const rel=(ww,sh,arm,x,y,f)=>sh.clone().add(local(ww.chestRot,arm.side*x,y,f));
  if(R.type!=="shove"||R.phase!=="go"){w.wish.set(0,0,0);if(R.type!=="sorry")w.targetYaw=faceYaw;}
  if(R.type==="gesture"){
    const k=t<0?0:env(t,0,0.25,R.dur-0.55,R.dur-0.1);
    dom.rFn=(ww,sh,arm)=>{const v=keysAt(R.K,Math.max(0,t)*R.speed);return {target:rel(ww,sh,arm,v[1],v[2],v[3]),w:k,wrist:v[4]};};
    if(R.both)oth.rFn=(ww,sh,arm)=>({target:rel(ww,sh,arm,0.18,-0.25,0.25),w:k*0.7,wrist:-10});
    w.reactLean=R.lean*k;w.headNod=Math.sin(Math.max(0,t)*7)*3*k;
  }else if(R.type==="point"){
    const k=t<0?0:env(t,0,0.3,R.dur-0.5,R.dur-0.1);
    dom.rFn=(ww,sh,arm)=>{
      const head=o.pelvisPos.clone().add(new V3(0,o.LEG*0.7,0)),d=new V3().subVectors(head,sh).normalize();
      const tgt=sh.clone().addScaledVector(d,(ww.P.upperArm+ww.P.forearm)*0.97).addScaledVector(rightOf(ww.yaw),Math.sin(t*R.wagF)*R.wagA);
      return {target:tgt,w:k,wrist:-25+Math.sin(t*R.wagF)*15,pole:local(ww.chestRot,arm.side*0.6,-0.8,0)};
    };
    if(R.hipOther)oth.rFn=(ww,sh,arm)=>({target:rel(ww,sh,arm,0.12,-0.47,-0.02),w:k,pole:local(ww.chestRot,arm.side,0,-0.3),wrist:0});
    w.reactLean=R.lean*k;w.headNod=Math.sin(t*R.wagF*0.5)*4*k;
  }else if(R.type==="shrug"){
    const k=t<0?0:env(t,0,0.3,R.dur-0.6,R.dur-0.15);
    for(const a of w.arms)a.rFn=(ww,sh,arm)=>({target:rel(ww,sh,arm,R.spread,-0.33,0.22),w:k,wrist:-35});
    w.shrug=R.raise*env(t,0.1,0.35,0.9,1.3);w.headTiltX=R.tilt*k;
  }else if(R.type==="hips"){
    const k=t<0?0:env(t,0,0.35,R.dur-0.5,R.dur-0.1);
    for(const a of w.arms)a.rFn=(ww,sh,arm)=>({target:rel(ww,sh,arm,0.1,R.hipY,-0.03),w:k,pole:local(ww.chestRot,arm.side,0,-0.25),wrist:0});
    w.headShake=Math.sin(t*R.shakeF)*R.shakeA*env(t,0.2,0.5,1.4,1.9);
  }else if(R.type==="sorry"){
    const k=t<0?0:env(t,0,0.2,R.dur-0.45,R.dur-0.1);
    dom.rFn=(ww,sh,arm)=>({target:rel(ww,sh,arm,0.1,R.h,0.3),w:k*0.9,wrist:-55});
    w.headNod=8*env(t,0.1,0.3,0.4,0.7);w.lookW=Math.min(0.7,R.t*4);
  }else if(R.type==="shove"){
    if(R.phase==="go"){
      // il vient te voir
      if(dist>0.72&&R.t<4){const d=to.clone().divideScalar(dist||1);w.wish.copy(d).multiplyScalar(Math.min(1,dist));w.speedMul=1.15;w.run=false;}
      else{R.phase="push";R.pt=0;w.wish.set(0,0,0);w.targetYaw=faceYaw;say(w,R.line);}
    }else if(R.phase==="push"){
      R.pt+=dt;w.targetYaw=faceYaw;
      const k=env(R.pt,0.05,0.32,0.55,0.85);
      for(const a of w.arms)a.rFn=(ww,sh,arm)=>{
        const chest=o.pelvisPos.clone().add(new V3(0,o.LEG*0.4,0)).addScaledVector(rightOf(ww.yaw),arm.side*0.13);
        const ready=rel(ww,sh,arm,0.14,-0.18,0.22);
        return {target:ready.lerp(chest,sst(0.15,0.36,R.pt)),w:k,wrist:-60};
      };
      w.reactLean=R.lean*k;
      if(!R.hit&&R.pt>0.3){R.hit=true;const d=to.clone().normalize();o.vel.addScaledVector(d,R.force);o.bump.addScaledVector(d,0.9);w.vel.addScaledVector(d,-0.4);}
      if(R.pt>1.1){R.phase="leave";R.lt=0;say(w,pick(LINES.shoveAfter));}
    }else{
      R.lt+=dt;w.lookW=Math.max(0,1-R.lt*1.5);
      if(R.lt>0.4)return true; // terminé -> il repart
    }
    return false;
  }
  return R.t>R.dur+R.delay;
}

