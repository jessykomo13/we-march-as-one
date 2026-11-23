// ================================================================ cerveaux
const keys=new Set();
let touchMove={x:0,y:0},touchRun=false;
function nearestFreeSpot(w,maxD){
  let best=null,bd=maxD;
  for(const sp of benchSpots){if(sp.taken&&sp.taken!==w)continue;const d=hdist(sp.pos,w.root);if(d<bd){bd=d;best=sp;}}
  return best;
}
const crossStats={green:0};
let sitRequest=false,atkRequest=null,atkReqT=0,jogOn=false,benchOn=false;
const moveKeys=["KeyW","KeyA","KeyS","KeyD","ArrowUp","ArrowDown","ArrowLeft","ArrowRight"];
let touchCrouch=false;
const HANDS_UP=(ww,sh,arm)=>({target:sh.clone().add(local(ww.chestRot,arm.side*0.22,0.42,0.06)),w:1,wrist:-25});
function toggleHandsUp(){
  const p=player;if(p.ko||p.sit.state!=="none")return;
  p.handsUp=!p.handsUp;for(const a of p.arms)a.rFn=p.handsUp?HANDS_UP:null;
  if(p.handsUp){say(p,pick(["C'est bon, je me rends !","Ok, ok, je ne bouge plus !"]));if(wanted.level>0)hudMsg("Tu te rends : la police va t'arrêter sans violence");}
}
class PlayerBrain{
  sitUpdate(w){
    const moving=moveKeys.some(k=>keys.has(k))||Math.hypot(touchMove.x,touchMove.y)>0.3||Math.hypot(pad.move.x,pad.move.y)>0.2;
    if(sitRequest||moving){sitRequest=false;w.standUp();}
  }
  update(w){
    if(atkRequest&&clockT-atkReqT>0.45)atkRequest=null;
    if(atkRequest&&w.ball){shoot(w);atkRequest=null;}
    if(atkRequest&&!w.atk&&!(w.stunT>0)){
      const t=findTarget(w);
      const gd=t&&isGuarding(t);
      if(atkRequest==="kick")w.startAttack("kick",t,gd?pick(["legs","belly","belly"]):pick(["chest","belly","belly"]));
      else if(atkRequest==="best"){const b=bestAttack(w,t);w.startAttack(b[0],t,b[1]);}
      else w.startAttack("punch",t,gd?pick(["belly","belly","chest"]):"head");
      atkRequest=null;
    }
    w.guardHold=(keys.has("Space")&&!w.fly)||pad.guard||guardTouch;
    if(loot){w.wish.set(0,0,0);w.run=false;return;}
    if(w.shooting){w.wish.set(0,0,0);w.run=false;if(w.shooting.h){const to=new V3().subVectors(w.shooting.h.rim,w.root);w.faceYaw=Math.atan2(to.x,-to.z)/D2R;}return;}
    if(sitRequest&&MIS.canTalk&&missionTalk()){sitRequest=false;return;}
    if(sitRequest&&EV.canAccept&&acceptEvent()){sitRequest=false;return;}
    if(sitRequest&&shopNear&&!w.ball&&tryBuy()){sitRequest=false;return;}
    if(sitRequest&&w.ball){sitRequest=false;dropBall(w);return;}
    if(sitRequest&&tryLoot()){sitRequest=false;return;}
    if(sitRequest&&trySecret()){sitRequest=false;return;}
    if(sitRequest&&tryCarjack()){sitRequest=false;return;}
    if(sitRequest&&tryEnterVehicle()){sitRequest=false;return;}
    if(sitRequest&&tryEnterBuilding()){sitRequest=false;return;}
    if(sitRequest){sitRequest=false;const sp=nearestFreeSpot(w,3);if(sp&&w.goSit(sp))return;}
    let x=0,y=0;
    if(keys.has("KeyD")||keys.has("ArrowRight"))x+=1;
    if(keys.has("KeyA")||keys.has("ArrowLeft"))x-=1;
    if(keys.has("KeyW")||keys.has("ArrowUp"))y+=1;
    if(keys.has("KeyS")||keys.has("ArrowDown"))y-=1;
    x+=touchMove.x+pad.move.x;y+=touchMove.y+pad.move.y;
    const m=Math.hypot(x,y);if(m>1){x/=m;y/=m;}
    const camF=new V3();camera.getWorldDirection(camF);camF.y=0;if(camF.lengthSq()<1e-4)camF.set(0,0,-1);camF.normalize();
    const camR=new V3().crossVectors(camF,UP);
    w.wish.copy(camF.multiplyScalar(y).addScaledVector(camR,x));
    w.run=keys.has("ShiftLeft")||keys.has("ShiftRight")||touchRun||pad.run;w.jog=jogOn;
    w.speedMul=1;
    w.faceYaw=null;
    if((pad.aim||touchAim)&&!w.ko&&w.sit.state==="none")w.faceYaw=cam.yaw; // à l'épaule : on se déplace face à la caméra
    const crouch=(keys.has("ControlLeft")||keys.has("ControlRight")||touchCrouch)&&!w.handsUp&&!w.fly;
    w.crouchK=lerp(w.crouchK||0,crouch?1:0,1-Math.exp(-6*(1/60)));
    if(crouch){w.speedMul=0.45;w.run=false;w.jog=false;}
    if(w.handsUp){w.wish.set(0,0,0);w.run=false;return;}
    if(w.guardHold){w.guardT=Math.max(w.guardT,0.2);w.speedMul=0.55;w.run=false;}
    if(w.guardT>0&&!w.run){const t=findTarget(w,2.2,110);if(t){const to=new V3().subVectors(t.root,w.root);w.faceYaw=Math.atan2(to.x,-to.z)/D2R;}}
  }
}
const walkers=[];
class NpcBrain{
  constructor(){this.mode="idle";this.timer=rand(0,3);this.target=new V3();this.pace=rand(0.72,1.05);this.jog=false;this.seed=Math.random()*100;this.stuck=0;this.lastPos=new V3();this.startle=0;
    this.temper=Math.pow(Math.random(),1.2);this.hand=Math.random()<0.11?-1:1;this.annoy=0;this.react=null;this.fight=null;this.flee=null;this.aimHead=rand(0.3,0.75);this.defense=rand(0.12,0.5);}
  startFight(w,o){if(w.ko)return;clearReaction(w);this.react=null;this.flee=null;this.fight={target:o,cd:rand(0.3,0.8),side:Math.random()<0.5?-1:1,combo:0,t:0};w.fightTarget=o;say(w,pick(FLINES.fight));}
  startFlee(w,o){clearReaction(w);this.react=null;this.fight=null;w.fightTarget=null;this.flee={from:o,t:rand(4,7)};if(Math.random()<0.8)say(w,pick(FLINES.flee));}
  witness(w,crime){
    if(w.ko||this.call)return;
    this.endActivity(w);if(this.conv)endConv(this.conv);
    // les plus téméraires filment la scène et appellent la police plus tard
    if(crime&&this.temper>0.5&&Math.random()<0.6&&!this.flee){this.startWatch(w,true);this.watch.callCrime=crime;this.watch.callT=rand(5,9);return;}
    if(!this.flee)this.startFlee(w,player);
    this.flee.t=Math.max(this.flee.t,rand(7,10));
    this.call={crime,t:rand(3.5,5.5),dur:0,started:false};this.call.dur=this.call.t;
  }
  onHit(w,att,dmg,zone){
    this.endActivity(w);if(this.conv)endConv(this.conv);
    this.annoy=Math.min(3,this.annoy+1.2);
    if(w.ko)return;
    if(Math.random()<0.55)say(w,pick(FLINES.hit));
    if(this.fight)return;
    const brave=this.temper+rand(-0.15,0.15)+this.annoy*0.05;
    if(brave>0.4&&w.hp>30)this.startFight(w,att);else this.startFlee(w,att);
  }
  onGetUp(w,att){
    if(this.pendingCuff&&walkers.includes(this.pendingCuff)){const c=this.pendingCuff;this.pendingCuff=null;this.cuff(w,c);return;}
    this.fight=null;w.fightTarget=null;
    if(att&&this.temper>0.85&&Math.random()<0.5)this.startFight(w,att);else{this.startFlee(w,att||player);say(w,pick(FLINES.up));}
  }
  updateFight(w,dt){
    const F=this.fight,o=F.target;F.t+=dt;
    if(o.ko){say(w,pick(FLINES.win));this.fight=null;w.fightTarget=null;this.annoy=0;this.pick(w);this.mode="walk";return;}
    const to=new V3().subVectors(o.root,w.root);to.y=0;const dist=to.length(),dir=to.clone().divideScalar(dist||1);
    if(dist>14||(w.hp<25&&this.temper<0.75)){this.startFlee(w,o);return;}
    w.faceYaw=Math.atan2(dir.x,-dir.z)/D2R;w.guardT=0.6;
    const side=new V3(-dir.z,0,dir.x);
    if(Math.random()<dt*0.4)F.side=-F.side;
    if(dist>1.0){w.wish.copy(dir).multiplyScalar(Math.min(1,dist-0.6));w.run=dist>3;w.speedMul=1;}
    else if(dist<0.62){w.wish.copy(dir).multiplyScalar(-0.5);w.run=false;}
    else{w.wish.copy(side).multiplyScalar(0.25*F.side);w.run=false;w.speedMul=0.6;}
    F.cd-=dt;
    const facing=Math.abs(deltaAngle(w.yaw,w.faceYaw))<25;
    if(F.cd<=0&&dist<1.08&&facing&&!w.atk){
      if(Math.random()<0.22&&F.combo<=0){w.startAttack("kick",o,Math.random()<0.2?"head":Math.random()<0.4?"legs":"belly");F.cd=rand(1.1,1.8);}
      else{
        if(F.combo<=0)F.combo=1+Math.floor(Math.random()*2.4);
        w.startAttack("punch",o,Math.random()<this.aimHead?"head":"belly");F.combo--;
        F.cd=F.combo>0?rand(0.32,0.5):rand(1.1,2.2);
      }
    }
  }
  // défense : bloquer ou esquiver selon le niveau
  onIncoming(w,att,a){
    if(w.ko||w.seatedLike||!(this.fight||w.guardT>0||this.react))return;
    const r=Math.random();
    if(r<this.defense){w.guardT=Math.max(w.guardT,a.dur+0.25);if(w.atk&&!w.atk.hit&&w.atk.t<w.atk.impactT*0.6)w.atk=null;}
    else if(r<this.defense+0.18){const away=new V3().subVectors(w.root,att.root);away.y=0;away.normalize().add(rightOf(w.yaw).multiplyScalar(rand(-0.6,0.6)));w.vel.addScaledVector(away.normalize(),2.3);}
  }
  startWatch(w,film,body){
    this.endActivity(w);if(this.conv)endConv(this.conv);
    if(w.sit.state!=="none")w.standUp();
    const c=body?body.pelvisPos:fightEvent.pos;
    const a=Math.atan2(w.root.z-c.z,w.root.x-c.x)+rand(-0.4,0.4);
    this.watch={a,r:body?rand(1.6,2.4):rand(3,4.6),film,t:0,body};dlgStats.spect++;if(film)dlgStats.film++;
    if(film)showPhone(w,true);
  }
  updateWatch(w,dt){
    const W=this.watch;W.t+=dt;
    const center=W.body?W.body.pelvisPos.clone().setY(0):fightEvent.pos;
    if(W.body?(!walkers.includes(W.body)||!W.body.ko||W.t>45||vans.some(V=>V.w===W.body&&V.medics&&hdist(V.v.g.position,w.root)<6)):(clockT-fightEvent.t>7||W.t>40)){this.stopWatch(w);return false;}
    if(W.phoneUntil&&clockT>W.phoneUntil){showPhone(w,false);W.phoneUntil=0;}
    const spot=center.clone().add(new V3(Math.cos(W.a)*W.r,0,Math.sin(W.a)*W.r));
    const to=new V3().subVectors(spot,w.root);to.y=0;const d=to.length();
    w.wish.copy(d>0.4?this.steer(w,to.divideScalar(d).multiplyScalar(Math.min(1,d/1.5))):new V3());w.run=d>4;w.speedMul=1;
    const tf=new V3().subVectors(center,w.root);w.faceYaw=Math.atan2(tf.x,-tf.z)/D2R;
    w.lookAt=W.body||player;w.lookW=0.8;
    if(W.body){if(Math.random()<dt*0.15)bark(w,["Ça va, monsieur ?","Il bouge plus…","Quelqu'un a appelé les secours ?","Oh mon dieu…"],12,true);return true;}
    if(W.film){for(const a of w.arms)a.rFn=(ww,sh,arm)=>({target:sh.clone().add(local(ww.chestRot,-arm.side*0.07,0.0,0.33)),w:1,wrist:-80});}
    else if(Math.random()<dt*0.3)bark(w,["Vas-y !","Frappe-le !","Oh la bagarre !","Arrêtez !","Wesh, calmez-vous !","Ohhh !"],6,false);
    if(W.film&&Math.random()<dt*0.12)bark(w,["Je filme tout !","C'est en live, là !","Ça va faire le buzz…"],10,true);
    if(W.callCrime){W.callT-=dt;if(W.callT<=0){reportCrime(W.callCrime,"Un passant a filmé la scène et prévenu la police","witness");W.callCrime=null;}}
    return true;
  }
  stopWatch(w){if(this.watch&&(this.watch.film||this.watch.phoneUntil))showPhone(w,false);for(const a of w.arms)a.rFn=null;w.lookAt=null;w.lookW=0;this.watch=null;this.mode="idle";this.timer=rand(0.5,2);}
  onSocial(w,from,kind){
    if(this.fight||this.flee||this.react)return;
    this.endActivity(w);
    const to=new V3().subVectors(from.root,w.root);w.targetYaw=Math.atan2(to.x,-to.z)/D2R;w.glance.tYaw=0;
    if(kind==="greet"){
      const mood=1-this.temper-this.annoy*0.3+rand(-0.2,0.2);
      if(mood>0.45){playGesture(w,"wave");say(w,pick(["Salut !","Bonjour !","Hey, ça va ?","Coucou !"]));}
      else if(mood>0.1){playGesture(w,"nod");say(w,pick(["…Salut.","'jour.","Mmh, salut."]));}
      else say(w,pick(["On se connaît ?","Tu veux quoi ?","Laisse-moi tranquille."]));
    }else{
      this.annoy=Math.min(3,this.annoy+0.7);
      const anger=this.temper*0.8+this.annoy*0.3+Math.random()*0.2;
      if(anger>1.0&&w.hp>30){this.startFight(w,from);return;}
      if(anger>0.55){clearReaction(w);this.react=makeReaction(Math.random()<0.5?"point":"gesture",w,from,this.hand);this.react.line=pick(["Tu me parles à moi ?!","Répète un peu pour voir !","Fais attention à ce que tu dis !"]);return;}
      if(anger>0.3){clearReaction(w);this.react=makeReaction("hips",w,from,this.hand);this.react.line=pick(["N'importe quoi…","T'as rien d'autre à faire ?","Pff, laisse tomber."]);return;}
      this.startFlee(w,from);this.flee.t=rand(2,4);say(w,pick(["Euh… d'accord.","Je veux pas d'histoires !","Laisse-moi !"]));
    }
  }
  // petites remarques selon ce que fait le joueur
  contextBarks(w,dt){
    if(Math.random()>dt*4)return;
    const pl=player,d=hdist(w.root,pl.root);
    if(d>3||pl.ko)return;
    if(pl.run&&pl.speed>2&&d<2.2){bark(w,["Hé, doucement !","Oh, fais attention !","Tu cours où comme ça ?"],18);return;}
    if(pl.guardHold&&d<2.5){bark(w,["Calme-toi…","Euh… tout va bien ?","Range tes poings."],20);return;}
    if(d<1.3&&pl.speed<0.2){
      w._stare=(w._stare||0)+0.25;
      if(w._stare>2.5){w._stare=0;bark(w,["Tu veux ma photo ?","Euh… je peux t'aider ?","Pourquoi tu me fixes ?"],25);}
    }else w._stare=0;
  }
  sitUpdate(w,dt){
    if(w.sit.state==="seated"){this.sitFor-=dt;if(this.sitFor<=0){w.standUp();this.mode="idle";this.timer=rand(0.5,2);}}
    if(w.sit.state==="approach"){this.sitWait=(this.sitWait||0)+dt;if(this.sitWait>20){this.sitWait=0;w.standUp();}}else this.sitWait=0;
  }
  bumped(w,other,strength){
    if(this.cuffed||this.surrender)return;
    const from=other.root;
    if(strength<0.12)return;
    this.endActivity(w);if(this.conv)endConv(this.conv);
    if(w.sit.state==="approach")w.standUp();
    if(other===player){
      this.annoy=Math.min(2,this.annoy+strength*0.8+0.25);
      if(this.react&&this.react.type!=="sorry")return;
      const anger=this.temper*0.75+this.annoy*0.35+Math.random()*0.25;
      if(anger>1.0&&Math.random()<0.55&&w.hp>30){this.startFight(w,other);return;}
      const type=anger<0.32?pick(["sorry","sorry","hips"]):anger<0.75?pick(["gesture","gesture","point","shrug","hips"]):pick(["shove","shove","gesture","point"]);
      clearReaction(w);this.react=makeReaction(type,w,other,this.hand);return;
    }
    if(!this.react&&Math.random()<0.35&&strength>0.25){clearReaction(w);this.react=makeReaction("sorry",w,other,this.hand);return;}
    this.startle=rand(0.6,1.4);
    const to=new V3().subVectors(from,w.root);
    const ang=deltaAngle(w.yaw,Math.atan2(to.x,-to.z)/D2R);
    w.glance.tYaw=clamp(ang,-70,70);w.glance.tPitch=-3;w.glance.next=rand(1,2);
  }
  pick(w){
    if(Math.random()<0.22){
      const mb=blockOf(w.root.x,w.root.z),free=benchSpots.filter(s=>{if(s.taken||hdist(s.pos,w.root)>=18)return false;const b=blockOf(s.pos.x,s.pos.z);return mb&&b&&b.i===mb.i&&b.j===mb.j;});
      if(free.length){const sp=free[Math.floor(Math.random()*free.length)];if(w.goSit(sp)){this.sitFor=rand(6,25);return;}}
    }
    let ok=false;
    for(let i=0;i<14;i++){
      const a=Math.random()*Math.PI*2,r=rand(6,30);
      this.target.set(w.root.x+Math.cos(a)*r,0,w.root.z+Math.sin(a)*r);
      if(hdist(this.target,player.root)>60)this.target.lerp(player.root,0.5);
      if(hdist(this.target,w.root)>4&&chunkLoadedAt(this.target)&&blockOf(this.target.x,this.target.z)&&publicOK(this.target.x,this.target.z)&&!onRelief(this.target.x,this.target.z,0.8)&&freeSpot(this.target,0.9)&&legClear(w.root,this.target)){ok=true;break;}
    }
    if(!ok)this.target.copy(w.root); // rien de bien : on reste sur place un moment
    this.path=routeTo(w.root,this.target);this.waitT=0;this.redWait=0;this.goDelay=null;this.navTried=false;
    this.jog=Math.random()<0.08;
  }
  onCopApproach(w,cop){
    if(this.cuffed||w.ko)return;
    this.endActivity(w);if(this.conv)endConv(this.conv);clearReaction(w);this.react=null;this.watch=null;
    const r=this.temper+rand(-0.2,0.2);
    if(r>0.85&&w.hp>40){this.startFight(w,cop);say(w,pick(["Tu m'auras pas !","Lâche-moi, toi !"]));}
    else if(r>0.55&&Math.random()<0.6){this.startFlee(w,cop);this.flee.t=14;say(w,pick(["Je me casse !","Pas question !"]));}
    else{this.surrender=true;this.fight=null;this.flee=null;w.fightTarget=null;say(w,pick(["D'accord, d'accord… c'est lui qui m'a provoqué !","Ok, je me rends !","C'est pas moi qui ai commencé !"]));}
  }
  cuff(w,cop){
    this.cuffed={cop};this.surrender=false;this.fight=null;this.flee=null;this.react=null;this.watch=null;w.fightTarget=null;clearReaction(w);
    for(const a of w.arms)a.rFn=(ww,sh,arm)=>({target:wp(ww.rig.b.Hips).add(local(ww.pelvisRot,-arm.side*0.06,0.02,-0.2)),w:1,wrist:0,pole:local(ww.pelvisRot,arm.side,0,-0.5)});
    if(Math.random()<0.6)later(0.6,()=>say(w,pick(["Aïe, doucement !","C'est une erreur !","Je veux mon avocat !"])));
  }
  update(w,dt,time){
    const dir=new V3();
    w.faceYaw=null;
    if(this.cuffed){
      const c=this.cuffed.cop;
      if(!walkers.includes(c)||c.ko){this.cuffed=null;for(const a of w.arms)a.rFn=null;dropSuspect(w);return;}
      const tgt=c.root.clone().addScaledVector(fwdOf(c.yaw),-0.75),to=new V3().subVectors(tgt,w.root);to.y=0;const d=to.length();
      w.wish.copy(d>0.2?to.divideScalar(d).multiplyScalar(Math.min(1,d)):new V3());w.run=false;w.speedMul=0.8;
      const tc=new V3().subVectors(c.root,w.root);w.faceYaw=Math.atan2(tc.x,-tc.z)/D2R;w.headNod=14;return;
    }
    if(this.surrender){w.wish.set(0,0,0);w.run=false;for(const a of w.arms)a.rFn=(ww,sh,arm)=>({target:sh.clone().add(local(ww.chestRot,arm.side*0.25,0.35,0.05)),w:1,wrist:-30});return;}
    this.annoy=Math.max(0,this.annoy-dt*0.04);
    if(this.fight){this.updateFight(w,dt);return;}
    if(this.flee){
      this.flee.t-=dt;
      if(this.flee.t<=0){this.flee=null;this.pick(w);this.mode="walk";}
      else{
        const away=new V3().subVectors(w.root,this.flee.from.root);away.y=0;away.normalize();away.add(avoidObstacles(w.root,away));if(away.length()>1)away.normalize();w.wish.copy(away);w.run=true;w.speedMul=1;
        if(this.call){
          const C=this.call;C.t-=dt;
          if(!C.started&&C.t<C.dur-0.6){C.started=true;say(w,pick(["Allô, la police ?! Venez vite !","Allô ? Y a un fou qui frappe les gens !","Police ? Quelqu'un s'est fait agresser !","Allô ?! Il est là, venez !"]));showPhone(w,true);}
          if(C.started){w.run=false;w.speedMul=0.7;const dom=w.arms[this.hand<0?0:1];dom.rFn=(ww,sh,arm)=>({target:wp(ww.rig.b.Head).addScaledVector(rightOf(ww.yaw),arm.side*0.085).add(new V3(0,0.01,0)),w:1,wrist:-70});}
          if(C.t<=0){reportCrime(C.crime,C.crime?"Un témoin a appelé la police":null,"witness");this.call=null;showPhone(w,false);clearReaction(w);}
        }
        return;
      }
    }
    if(this.react){
      if(driveReaction(w,this.react,dt)){
        const wasShove=this.react.type==="shove";
        clearReaction(w);this.react=null;
        if(wasShove&&this.annoy>1.2&&this.temper>0.6){this.startFight(w,player);return;}
        if(wasShove){this.pick(w);this.mode="walk";}else{this.mode="idle";this.timer=rand(0.3,1.5);}
      }
      return;
    }
    if(this.startle>0){this.startle-=dt;w.wish.set(0,0,0);w.run=false;return;}
    if(this.watch){if(this.updateWatch(w,dt))return;}
    this.contextBarks(w,dt);
    // conversation en cours
    if(this.conv){if(this.updateConv(w,dt,time))return;}
    // membre d'un groupe : suit le meneur
    if(this.leader){if(this.follow(w,dt,time))return;}
    if(this.mode==="walk"){
      this.stuck+=dt;if(this.redWait>0||this.goDelay!=null||this.waitT>0){this.stuck=0;this.lastPos.copy(w.root);}
      if(this.stuck>2.5){if(hdist(w.root,this.lastPos)<0.5){
          // bloqué près d'une étape du trajet : on la considère atteinte ; sinon on change d'idée
          if(this.path&&this.path.length>1&&hdist(w.root,this.path[0])<2.5&&!this.path[0].xing)this.path.shift();else{const lp=this.path&&this.path.length&&!this.navTried?localPath(w.root,this.path[0]):null;if(lp){this.navTried=true;this.path=lp.concat(this.path.slice(1));crowdStats.nav=(crowdStats.nav||0)+1;}else{this.navTried=false;this.pick(w);}}crowdStats.stuck++;}
        this.stuck=0;this.lastPos.copy(w.root);}
    }
    if(this.mode==="idle"){
      this.timer-=dt;
      // un meneur à l'arrêt discute avec son groupe
      if(this.followers&&this.followers.length&&!this.conv&&!this.convDone){this.convDone=true;const near=this.followers.filter(f=>!f.ko&&hdist(f.root,w.root)<2.5&&!f.brain.fight&&!f.brain.flee);if(near.length)startConv([w,...near],this.timer);}
      else if(!this.conv)this.idleActivity(w,dt,time);
      if(this.timer<=0){this.endActivity(w);this.pick(w);this.mode="walk";this.convDone=false;}
    }else{
      if(!this.path||!this.path.length)this.path=[this.target.clone()];
      const goal=this.path[0];
      const to=new V3().subVectors(goal,w.root);to.y=0;const d=to.length();
      // sur la chaussée : si le feu passe au rouge pendant qu'on traverse, on presse le pas
      if(this.crossing&&!blockOf(w.root.x,w.root.z)){if(crossSignal(this.crossing)!=="go")w.speedMul*=1;this.hurry=crossSignal(this.crossing)!=="go";}
      else if(this.crossing&&blockOf(w.root.x,w.root.z)&&this.path.length&&!this.path[0].xing){this.crossing=null;this.hurry=false;}
      if(!goal.xing&&this.redWait>0&&this.goDelay==null)this.redWait=0;
      if(this.waitT>0){
        // au bord du trottoir : on regarde à gauche puis à droite avant de traverser
        this.waitT-=dt;const s=this.waitT>0.45?-1:1;w.glance.tYaw=s*65;w.glance.tPitch=-2;w.glance.next=0.3;
      }else if(this.path.length>1&&d<1.0&&goal.xing&&crossSignal(goal.xing)!=="go"){
        // feu piéton rouge : on attend au bord du trottoir
        this.redWait=(this.redWait||0)+dt;this.goDelay=null;
        const nx=this.path[1],tf=new V3().subVectors(nx,w.root);w.faceYaw=Math.atan2(tf.x,-tf.z)/D2R;
        if(Math.random()<dt*0.4){w.glance.tYaw=rand(-70,70);w.glance.next=rand(0.5,1.5);}
        if(this.redWait>9&&Math.random()<dt*0.03)bark(w,["Il est long, ce feu…","Allez, passe au vert…","Toujours rouge…"],25);
      }else if(this.path.length>1&&d<1.0){
        // feu vert : petit temps de réaction si on attendait, puis on traverse
        if(this.redWait>0){if(this.goDelay==null)this.goDelay=rand(0.25,0.9);this.goDelay-=dt;if(this.goDelay>0){const nx=this.path[1],tf=new V3().subVectors(nx,w.root);w.faceYaw=Math.atan2(tf.x,-tf.z)/D2R;w.wish.copy(this.steer(w,new V3()));return;}}
        if(goal.xing){crossStats.green++;this.crossing=goal.xing;}
        this.redWait=0;this.goDelay=null;
        if(goal.wait&&!this.followers?.length&&Math.random()<0.5)this.waitT=rand(0.5,0.9);
        this.path.shift();
      }else if(d<0.9&&this.path.length===1){
        if(Math.random()<0.55){this.mode="idle";this.timer=rand(2,9);this.act=null;}else this.pick(w);
      }else{
        dir.copy(to).divideScalar(d).applyAxisAngle(UP,(noise(time*0.25,this.seed)-0.5)*(this.path.length>1||!blockOf(w.root.x,w.root.z)?0.08:0.6));
        if(this.path.length===1)dir.multiplyScalar(Math.min(1,d/1.8));
      }
      // le meneur attend son groupe
      if(this.followers){const gap=Math.max(0,...this.followers.filter(f=>!f.ko).map(f=>hdist(f.root,w.root)));if(gap>4)dir.multiplyScalar(0);else if(gap>2.4)dir.multiplyScalar(0.45);}
      // rencontre : deux passants seuls qui se croisent s'arrêtent parfois pour discuter
      if(!this.followers&&clockT-(this.lastConv||-99)>40&&Math.random()<dt*0.04){
        for(const o of walkers){
          if(o===w||o.isPlayer||o.isCop||o.ko||!o.brain.pick||o.brain.conv||o.brain.leader||o.brain.followers||o.brain.fight||o.brain.flee||o.sit.state!=="none"||clockT-(o.brain.lastConv||-99)<40)continue;
          if(hdist(o.root,w.root)<1.8){startConv([w,o],rand(4,9),true);return;}
        }
      }
    }
    w.wish.copy(this.steer(w,dir));
    w.run=this.jog&&this.mode==="walk";
    w.speedMul=(this.jog?0.75:this.pace)*(this.hurry?1.35:1);
  }
  // évitement : séparation + anticipation de collision (temps avant impact), on passe toujours par la droite
  steer(w,dir){
    const push=new V3(),spd=dir.length();
    const myV=dir.clone().multiplyScalar(w.P.walkSpeed*this.pace);
    for(const o of walkers){
      if(o===w)continue;
      const off=new V3().subVectors(w.root,o.root);off.y=0;const d=off.length();
      if(d>6||d<1e-4)continue;
      const mate=(this.leader&&(o===this.leader||(this.leader.brain.followers||[]).includes(o)))||(this.followers&&this.followers.includes(o));
      const R=o.isPlayer?1.4:mate?0.7:1.05;
      if(d<R)push.addScaledVector(off,(R-d)/R/d*1.6);
      if(spd>0.05&&!mate&&!o.ko){
        const rv=new V3(o.vel.x-myV.x,0,o.vel.z-myV.z),rv2=rv.lengthSq();
        if(rv2>1e-3){
          const rp=off.clone().negate(),tc=-rp.dot(rv)/rv2;
          if(tc>0&&tc<2.6){
            const miss=rp.clone().addScaledVector(rv,tc).length();
            if(miss<0.95){
              const right=new V3(-dir.z,0,dir.x).normalize().negate(); // droite de ma direction
              const k=(1-tc/2.6)*(0.95-miss)/0.95;
              push.addScaledVector(right,1.4*k);
              if(tc<1)push.addScaledVector(dir,-0.5*k);
            }
          }
        }
      }
    }
    if(spd>0.05)push.add(avoidObstacles(w.root,dir));
    const out=dir.clone().add(push);
    if(out.length()>1)out.normalize();
    if(this.mode==="idle"&&out.length()<0.25)out.set(0,0,0);
    return out;
  }
  follow(w,dt,time){
    const L=this.leader,lb=L.brain;
    if(L.ko||!walkers.includes(L)||lb.fight||lb.flee){this.leader=null;return false;}
    const busy=lb.conv&&lb.conv.members.includes(w);
    if(busy)return false;
    const lf=fwdOf(L.yaw),lr=rightOf(L.yaw);
    const slot=this.slot;let tgt=L.root.clone().addScaledVector(lr,slot*0.72).addScaledVector(lf,-0.15*Math.abs(slot));
    // sur le trottoir, on ne déborde pas sur la route : on passe derrière le meneur
    const inB=(p,m)=>{const b=blockOf(p.x,p.z);return b&&b.lx>m&&b.lx<32-m&&b.lz>m&&b.lz<32-m;};
    if(inB(L.root,0)&&!inB(tgt,1.0))tgt=L.root.clone().addScaledVector(lf,-0.8*Math.abs(slot));
    const to=new V3().subVectors(tgt,w.root);to.y=0;const d=to.length();
    const lMoving=L.speed>0.2||lb.mode==="walk";
    if(L.sit.state!=="none"){ // le meneur s'assoit : on s'assoit à côté si possible
      if(w.sit.state==="none"&&L.sit.spot){const sp=benchSpots.filter(b=>!b.taken&&hdist(b.pos,L.sit.spot.pos)<0.7)[0];if(sp&&w.goSit(sp)){this.sitFor=99;return true;}}
    }
    let dir=new V3();
    if(d>0.25)dir.copy(to).divideScalar(d).multiplyScalar(Math.min(1,d/1.2+(lMoving?0.4:0)));
    w.wish.copy(this.steer(w,dir));
    w.run=L.run;
    w.speedMul=lb.pace*(d>0.8?1.2:d>0.3?1.0:0.85)*(lb.jog?0.75:1);
    if(!lMoving&&d<0.5){w.wish.set(0,0,0);w.faceYaw=Math.atan2(L.root.x-w.root.x,-(L.root.z-w.root.z))/D2R;}
    if(w.sit.state==="seated"&&L.sit.state==="none")w.standUp();
    return true;
  }
  idleActivity(w,dt,time){
    if(!this.act){
      const r=Math.random();
      this.act=r<0.38?{type:"phone",t:0}:r<0.55?{type:"watch",t:0,dur:rand(1.5,2.5)}:{type:"look",t:0};
      if(this.act.type==="phone")showPhone(w,true);
    }
    const A=this.act;A.t+=dt;
    const dom=w.arms[this.hand<0?0:1],oth=w.arms[this.hand<0?1:0];
    if(A.type==="phone"){
      const k=sst(0,0.6,A.t);
      dom.rFn=(ww,sh,arm)=>({target:sh.clone().add(local(ww.chestRot,-arm.side*0.1,-0.3,0.3)),w:k,wrist:-50});
      w.headNod=22*k;w.lookW=0;
      if(Math.random()<dt*0.15)w.glance.next=0;
    }else if(A.type==="watch"){
      const k=env(A.t,0,0.4,A.dur-0.4,A.dur);
      oth.rFn=(ww,sh,arm)=>({target:sh.clone().add(local(ww.chestRot,-arm.side*0.02,-0.22,0.32)),w:k,wrist:10});
      w.headNod=20*k;
      if(A.t>A.dur){this.endActivity(w);this.act={type:"look",t:0};}
    }
  }
  endActivity(w){if(this.act&&this.act.type==="phone")showPhone(w,false);if(this.act){for(const a of w.arms)a.rFn=null;w.headNod=0;}this.act=null;}
  updateConv(w,dt,time){
    const C=this.conv;
    if(!C||C.ended){this.conv=null;return false;}
    if(C.members[0]===w){
      C.t+=dt;
      if(C.t>C.dur||C.members.some(m=>m.ko||!walkers.includes(m)||m.brain.fight||m.brain.flee||m.brain.react)){endConv(C);return false;}
      if(C.t>C.next){C.speaker=(C.speaker+1+Math.floor(Math.random()*(C.members.length-1)))%C.members.length;C.next=C.t+rand(1.8,4);C.said=false;}
    }
    const center=new V3();for(const m of C.members)center.add(m.root);center.divideScalar(C.members.length);
    const speaker=C.members[C.speaker],me=w===speaker;
    // se placer en cercle à bonne distance
    const fromC=new V3().subVectors(w.root,center);fromC.y=0;const rd=fromC.length()||0.01,want=C.members.length>2?0.6:0.48;
    let dir=new V3();if(Math.abs(rd-want)>0.12)dir.copy(fromC).divideScalar(rd).multiplyScalar(clamp((want-rd)*2,-0.6,0.6));
    w.wish.copy(dir);w.run=false;w.speedMul=0.6;
    const look=me?C.members.find(m=>m!==w):speaker;
    const to=new V3().subVectors(me?center:look.root,w.root);
    if(to.lengthSq()>0.01)w.faceYaw=Math.atan2(to.x,-to.z)/D2R;
    w.lookAt=look;w.lookW=0.9;
    const dom=w.arms[this.hand<0?0:1],t=C.t+this.seed;
    if(me){
      dom.rFn=(ww,sh,arm)=>({target:sh.clone().add(local(ww.chestRot,-arm.side*(0.04+0.08*Math.sin(t*2.7)),-0.3+0.07*Math.sin(t*3.9),0.24+0.06*Math.sin(t*1.9))),w:0.85,wrist:-30+20*Math.sin(t*5)});
      w.headNod=Math.sin(t*6)*4;
      if(!C.said&&C.chatty){C.said=true;if(Math.random()<0.5)say(w,pick(C.first?["Salut !","Hé, ça va ?","Oh, salut toi !"]:SMALLTALK),true);C.first=false;}
    }else{dom.rFn=null;w.headNod=Math.sin(t*1.3)*3;}
    return true;
  }
}
const SMALLTALK=["Tu fais quoi ce soir ?","Grave !","Non mais t'imagines ?","Il fait trop beau aujourd'hui.","J'te jure…","Ah ouais ? Raconte !","Mdr, n'importe quoi.","On se fait un resto ?","T'as vu le match hier ?","Trop bien !","Je suis crevé…","Bon, on y va ?"];
function startConv(members,dur,chatty=true){
  const C={members,t:0,dur:Math.max(3,dur),speaker:0,next:rand(1.5,3),said:false,chatty,first:true,ended:false};
  for(const m of members){if(m.brain.endActivity)m.brain.endActivity(m);m.brain.conv=C;if(m.brain.mode==="walk"&&!m.brain.leader){m.brain.mode="idle";m.brain.timer=C.dur;}}
  crowdStats.convs++;
  return C;
}
function endConv(C){C.ended=true;for(const m of C.members){m.brain.lastConv=clockT;if(m.brain.conv===C){m.brain.conv=null;for(const a of m.arms)a.rFn=null;m.headNod=0;m.lookAt=null;m.lookW=0;}}}
const crowdStats={stuck:0,convs:0,minDist:9};
// la première ligne droite du trajet ne doit pas traverser un mur, une haie ou une clôture
function legClear(from,to){const a=blockOf(from.x,from.z),b=blockOf(to.x,to.z);if(!a||!b||a.i!==b.i||a.j!==b.j)return true;
  const d=new V3().subVectors(to,from);d.y=0;const L=d.length();if(L<0.5)return true;d.divideScalar(L);
  for(let s=0.8;s<L;s+=0.7){const q=from.clone().addScaledVector(d,s);for(const o of obsAt(q))if(obstacleClosest(o,q).d<0.32)return false;}return true;}

