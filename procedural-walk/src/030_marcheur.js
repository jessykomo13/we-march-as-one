// ================================================================ un marcheur procédural
const fallStats=[];
class Walker{
  constructor(rig,brain,pos,yaw,isPlayer=false){
    this.brain=brain;this.isPlayer=isPlayer;
    this.seed=Math.random()*1000;
    this.root=pos.clone();this.gy=groundAt(pos.x,pos.z);this.root.y=this.gy;this.air=null;this.lastOk=pos.clone();this.yaw=yaw;this.targetYaw=yaw;this.yawVel=0;this.accelFwd=0;
    this.vel=new V3();this.prevVel=new V3();this.desiredVel=new V3();
    this.wish=new V3();this.run=false;this.speedMul=1;
    this.voicePitch=1;this.voiceRate=1.1;this.faceYaw=null;this.hp=100;this.maxHp=100;this.lastHurt=-99;this.hand=1;this.nextPunch=0;this.atk=null;this.ko=null;this.guardT=0;this.flinchLean=0;this.flinchHead=0;this.power=rand(0.85,1.2);this.stillTimer=0;this.settleDelay=0.3;this.phase=0;this.gaitOn=false;this.bump=new V3();this.radius=0.25;this.braking=false;this.sit={state:'none',t:0};this.mass=isPlayer?1.4:1;this.lastLeg=null;this.stepCount=0;
    this.height=1;this.dip=0;this.sd={height:0,sway:0,roll:0,twist:0,lean:0,turnRoll:0};
    this.sway=0;this.roll=0;this.twist=0;this.lean=0;this.turnRoll=0;
    this.pelvisPos=new V3();this.pelvisRot=new Q();this.chestRot=new Q();this.headRot=new Q();
    // personnalité de démarche (fixe) : chaque personne marche à sa façon
    this.gait={stride:rand(0.9,1.1),cadence:rand(0.92,1.08),width:rand(0.85,1.2),lift:rand(0.85,1.15),arm:rand(0.7,1.3),slouch:rand(-3,5),lean:rand(-2,3),bounce:rand(0.7,1.3),headTilt:rand(-4,4)};
    this.style={stride:1,cadence:1,width:1,lift:1,arm:1,slouch:0,bounce:1};
    this.glance={yaw:0,pitch:0,tYaw:0,tPitch:0,next:rand(1,6),sv:{y:0,p:0}};this.nod=0;
    this.legs=[this.makeLeg(-1),this.makeLeg(1)];this.L=this.legs[0];this.R=this.legs[1];
    this.arms=[{side:-1,swing:0,sv:{v:0},amp:rand(0.85,1.15),bendBias:rand(-6,6),bend:20,out:6},{side:1,swing:0,sv:{v:0},amp:rand(0.85,1.15),bendBias:rand(-6,6),bend:20,out:6}];
    this.setRig(rig,true);
  }
  makeLeg(side){
    const dbg=new THREE.Mesh(new THREE.SphereGeometry(0.03,10,6),dbgMat);dbg.visible=false;scene.add(dbg);
    return {side,stepping:false,t:0,planted:new V3(),plantedYaw:0,footPos:new V3(),footRot:new Q(),
      start:new V3(),target:new V3(),startYaw:0,targetYaw:0,pitch:0,dbg,
      bias:{h:rand(0.95,1.05),toe:rand(-3,3)}};
  }
  setRig(rig,reset){
    if(this.rig&&this.rig!==rig)scene.remove(this.rig.model);
    this.rig=rig;this.P=Object.assign({},P0,rig.pr);this.LEG=this.P.thigh+this.P.shin;
    if(reset){
      // téléportation (chargement, réapparition) : le sol et la dernière position sûre suivent
      if(this.lastOk&&Math.hypot(this.root.x-this.lastOk.x,this.root.z-this.lastOk.z)>1.5){const g=groundAt(this.root.x,this.root.z);this.gy=g;this.root.y=Math.max(this.root.y,g);this.lastOk.copy(this.root);this.air=null;}
      for(const leg of this.legs){
        const p=this.idealFoot(leg).addScaledVector(fwdOf(this.yaw),leg.side*0.04);
        leg.planted.copy(p);leg.footPos.copy(p);leg.plantedYaw=this.yaw+leg.side*this.P.toeOut;leg.footRot=frame(leg.plantedYaw);
      }
    }
    this.height=this.LEG*this.P.standRatio+this.P.ankleHeight;
  }
  get speed(){return Math.hypot(this.vel.x,this.vel.z);}
  get s01(){return clamp01(this.speed/this.P.runSpeed);}
  idealFoot(leg){
    const P=this.P,w=lerp(P.stanceHalfWidth,P.stanceHalfWidth*0.75,this.s01)*this.style.width;
    return this.root.clone().addScaledVector(rightOf(this.yaw),leg.side*w);
  }
  other(leg){return leg===this.L?this.R:this.L;}

  think(dt,time){
    if(this.ko){this.wish.set(0,0,0);this.moveRoot(dt,time);return;}
    if(this.sit.state==="approach"&&(this.brain.react||this.brain.fight||this.brain.flee))this.standUp();
    if(this.sit.state==="none")this.brain.update(this,dt,time);
    else{if(this.brain.sitUpdate)this.brain.sitUpdate(this,dt,time);this.sitThink(dt);}
    // les PNJ n'entrent pas dans l'eau (la police ne nage pas)
    if(this!==player&&!this.swim&&this.wish.lengthSq()>0.01){const a=this.root.clone().addScaledVector(this.wish,1.4);if(waterDepth(a.x,a.z)>0.7){this.wish.set(0,0,0);if(this.isCop&&wanted.level>0&&player.swim&&Math.random()<dt*0.3)bark(this,["Il est dans l'eau !","Sors de l'eau !","Il nage, appelez les garde-côtes !"],8);}}
    if(this.stunT>0){this.stunT-=dt;this.wish.multiplyScalar(0.15);this.run=false;this.flinchHead+=Math.sin(clockT*20)*0.6;}
    this.moveRoot(dt,time);
  }
  animate(dt,time){
    this.updateStyle(time,dt);
    const st=this.sit.state;
    if(this.ko)this.updateKO(dt,time);
    else if(st==="down"||st==="seated"||st==="up")this.updateSit(dt,time);
    else{this.updateLegs(dt);this.updateBody(dt,time);this.updateCombat(dt);}
    this.pose();
    this.animMouth(dt);
    if(this.atk&&!this.atk.hit&&this.atk.t>=this.atk.impactT)this.resolveStrike();
    if(!this.ko&&clockT-this.lastHurt>6&&this.hp<this.maxHp)this.hp=Math.min(this.maxHp,this.hp+3*dt);
  }
  get seatedLike(){const s=this.sit.state;return !!this.ko||s==="down"||s==="seated"||s==="up";}
  goSit(spot){
    if(spot.taken&&spot.taken!==this)return false;
    spot.taken=this;this.sit={state:"approach",spot,t:0,ap:spot.pos.clone().addScaledVector(spot.front,0.6)};
    return true;
  }
  standUp(){
    const s=this.sit;
    if(s.state==="approach"){s.spot.taken=null;this.sit={state:"none",t:0};}
    else if(s.state==="seated"||s.state==="down"){const wasDown=s.state==="down";s.t=wasDown?1-clamp01(s.t):0;s.state="up";}
  }
  sitThink(dt){
    const s=this.sit;
    this.run=false;this.speedMul=0.85;
    if(s.state==="approach"){
      const to=new V3().subVectors(s.ap,this.root);to.y=0;const d=to.length();
      if(d>0.12&&!s.arrived){const dir=to.clone().divideScalar(d);if(d>1)dir.add(avoidObstacles(this.root,dir));if(dir.length()>1)dir.normalize();this.wish.copy(dir).multiplyScalar(Math.min(1,d/0.8+0.25));}
      else{
        s.arrived=true;this.wish.set(0,0,0);this.targetYaw=s.spot.yaw;
        if(d>0.3)s.arrived=false;
        const aligned=Math.abs(deltaAngle(this.yaw,s.spot.yaw))<8;
        if(aligned&&this.speed<0.1&&!this.L.stepping&&!this.R.stepping&&this.stillTimer>0.2){
          s.state="down";s.t=0;s.from=this.pelvisPos.clone();s.fromLean=this.lean;
          const r=rightOf(s.spot.yaw);
          for(const leg of this.legs){leg.planted.copy(s.spot.pos).addScaledVector(s.spot.front,0.56).addScaledVector(r,leg.side*this.P.hipWidth*rand(1.1,1.6));leg.planted.y=groundAt(leg.planted.x,leg.planted.z);leg.plantedYaw=s.spot.yaw+leg.side*rand(4,14);}
        }
      }
    }else{this.wish.set(0,0,0);this.vel.set(0,0,0);}
  }
  updateSit(dt,time){
    const s=this.sit,P=this.P,spot=s.spot,yaw=spot.yaw,S=this.LEG/0.91;
    const dur=s.state==="seated"?1:0.95;
    if(s.state!=="seated"){s.t+=dt/dur;}
    let k;
    if(s.state==="down"){k=clamp01(s.t);if(s.t>=1){s.state="seated";s.t=0;s.sitT=0;}}
    else if(s.state==="up"){k=1-clamp01(s.t);if(s.t>=1){this.finishStand();return this.updateBody(dt,time);}}
    else{k=1;s.sitT=(s.sitT||0)+dt;}
    const e=k*k*(3-2*k),mid=Math.sin(Math.PI*k)*(s.state==="seated"?0:1);
    const seat=spot.pos.clone().addScaledVector(spot.front,0.1);seat.y=spot.seatY+0.085*S;
    const from=s.from||seat;
    // le bassin recule d'abord, puis descend
    const ex=clamp01(e*1.25),ey=clamp01((e-0.15)/0.85);
    this.pelvisPos=new V3(lerp(from.x,seat.x,ex),lerp(from.y,seat.y,ey*ey*(3-2*ey)),lerp(from.z,seat.z,ex));
    this.height=this.pelvisPos.y;
    const breath=Math.sin(time*1.5+this.seed)*1.2;
    const shift=(noise(time*0.15,this.seed+81)-0.5)*6*e;
    this.pelvisRot=frame(yaw,-12*e+14*mid,shift*0.5,(noise(time*0.12,this.seed+83)-0.5)*4*e);
    this.chestRot=frame(yaw,lerp(this.sit.fromLean||0,-3+this.style.slouch*0.6,e)+34*mid+breath,shift+(noise(time*0.4,this.seed+43)-0.5)*6*e,(noise(time*0.2,this.seed+41)-0.5)*4*e);
    const gl=this.glance,nY=(noise(time*0.4,this.seed+11)-0.5)*16,nP=(noise(time*0.35,this.seed+17)-0.5)*8;
    this.headRot=frame(yaw,-(-3+34*mid)*0.6+nP+gl.pitch,nY+gl.yaw,this.gait.headTilt);
    // pieds posés devant, petits mouvements
    for(const leg of this.legs){
      leg.stepping=false;leg.pitch=0;
      const tap=s.state==="seated"?Math.max(0,Math.sin(time*3+leg.side+this.seed))*0.0:0;
      leg.footPos.copy(leg.planted);leg.footPos.y=tap;
      leg.footRot=frame(leg.plantedYaw);
    }
    for(const arm of this.arms){
      arm.ik=clamp01((e-0.35)/0.65);if(!arm.thighPos)arm.thighPos=rand(0.45,0.8);
      const tgt=lerp(arm.swing,32+(noise(time*0.2,this.seed+91+arm.side)-0.5)*14,e)+22*mid;
      arm.swing=smoothDamp(arm.swing,tgt,arm.sv,"v",0.12,dt);
      arm.bend=lerp(arm.bend,58+(noise(time*0.25,this.seed+61+arm.side)-0.5)*16,Math.min(1,dt*4));
      arm.out=lerp(arm.out,14,Math.min(1,dt*3));
    }
  }
  finishStand(){
    const s=this.sit;if(s.spot)s.spot.taken=null;
    for(const arm of this.arms){arm.ik=0;arm.thighPos=0;}
    this.sit={state:"none",t:0};this.yaw=this.targetYaw=s.spot?s.spot.yaw:this.yaw;
    this.sd.height=0;this.lean=0;this.stillTimer=0;
  }
  moveRoot(dt,time){
    const P=this.P;
    if(this.isPlayer){
      if(this.stamina===undefined)this.stamina=100;
      const sprinting=this.run&&this.speed>1.6;
      if(sprinting)this.stamina=Math.max(0,this.stamina-13/(1+Math.min(4,this.enduBoost||0)*0.15)*dt);else this.stamina=Math.min(100,this.stamina+(this.speed<0.2?22:12)*dt);
      if(this.stamina<=0)this.exhausted=true;if(this.exhausted&&this.stamina>40)this.exhausted=false;
      if(this.exhausted&&this.run){this.run=false;this.speedMul=1.3;}
    }
    const mood=1+(noise(time*0.13,this.seed)-0.5)*0.12;
    const wl=Math.min(1,this.wish.length());
    let spdTarget=(this.run?P.runSpeed:this.jog?P.jogSpeed:P.walkSpeed)*mood*this.speedMul*wl;
    if(this.swim){spdTarget=(this.run?1.9:1.15)*wl;if(this.isPlayer&&this.run)this.stamina=Math.max(0,this.stamina-6*dt);}
    if(this.fly)spdTarget=(this.run?28:9)*wl;
    const desired=new V3();
    if(this.faceYaw!=null){
      // en garde : on reste face à l'adversaire et on se déplace en pas chassés
      this.targetYaw=this.faceYaw;this.braking=false;
      desired.copy(this.wish).multiplyScalar(Math.min(spdTarget,P.walkSpeed*0.75*wl));
    }else if(wl>0.05){
      const wishYaw=Math.atan2(this.wish.x,-this.wish.z)/D2R;
      const err=Math.abs(deltaAngle(this.yaw,wishYaw));
      // gros changement de direction : on plante le pied, on s'arrête, puis on pivote
      if(this.speed>0.5&&err>75&&wl>0.5)this.braking=true;
      if(!this.braking){
        this.targetYaw=wishYaw;
        const k=err<30?1:err<75?Math.cos((err-30)/45*Math.PI/2):0; // on avance là où on regarde
        desired.copy(fwdOf(this.yaw)).multiplyScalar(spdTarget*k);
      }
    }
    if(this.braking&&this.speed<0.12)this.braking=false;
    this.desiredVel.copy(desired);
    this.prevVel.copy(this.vel);
    let rate=P.acceleration;
    if(desired.lengthSq()<this.vel.lengthSq()){
      // freinage calé sur le prochain appui : le pied se pose et on est arrêté
      let tl=0.18;for(const l of this.legs)if(l.stepping)tl=Math.min(tl,l.duration*(1-l.t));
      rate=desired.lengthSq()<0.01?clamp(this.speed/(Math.max(tl,0.08)+0.05),P.deceleration,10):P.deceleration*1.5;
    }
    if(this.fly)rate=Math.max(rate,this.run?14:9);
    const diff=desired.clone().sub(this.vel),dl=diff.length(),maxD=rate*dt;
    if(dl<=maxD)this.vel.copy(desired);else this.vel.addScaledVector(diff,maxD/dl);
    const ox=this.root.x,oz=this.root.z;
    this.root.x+=this.vel.x*dt;this.root.z+=this.vel.z*dt;
    if(!this.noClamp){const lim=WORLD-0.6;this.root.x=clamp(this.root.x,-lim,WORLD_E);this.root.z=clamp(this.root.z,-WORLD_N,lim);}
    if(this.fly)this.flyStep(dt);else this.groundStep(ox,oz,dt);
    const old=this.yaw;
    const dy=deltaAngle(this.yaw,this.targetYaw)*(1-Math.exp(-P.turnSharpness*dt));
    const maxTurn=lerp(240,170,this.s01)*dt;
    this.yaw+=clamp(dy,-maxTurn,maxTurn);
    this.yawVel=lerp(this.yawVel,deltaAngle(old,this.yaw)/dt,1-Math.exp(-10*dt));
    this.accelFwd=lerp(this.accelFwd,new V3().subVectors(this.vel,this.prevVel).dot(fwdOf(this.yaw))/dt,1-Math.exp(-6*dt));
  }
  predictedVel(t){
    const diff=this.desiredVel.clone().sub(this.vel),dl=diff.length(),maxD=this.P.acceleration*t;
    const v=this.vel.clone();if(dl<=maxD)v.copy(this.desiredVel);else v.addScaledVector(diff,maxD/dl);
    v.y=0;return v;
  }
  updateStyle(time,dt){
    const n=(f,k)=>noise(time*f,this.seed+k)-0.5,st=this.style,g=this.gait,moving=this.speed>0.15;
    st.stride=g.stride*(1+n(0.07,31)*0.32+n(0.31,32)*0.1);
    st.cadence=g.cadence*(1+n(0.09,33)*0.1+n(0.37,34)*0.04);
    st.width=g.width*(1+n(0.05,35)*0.5);
    st.lift=g.lift*(1+n(0.11,36)*0.5);
    st.arm=g.arm*(1+n(0.06,37)*0.6);
    st.slouch=g.slouch+n(0.04,38)*7;
    st.bounce=g.bounce*(1+n(0.08,39)*0.5);
    const gl=this.glance;gl.next-=dt;
    if(gl.next<=0){
      const busy=Math.random()<(moving?0.55:0.75);
      gl.tYaw=busy?rand(-45,45)*(moving?0.6:1):0;gl.tPitch=busy?rand(-12,10):0;
      gl.next=busy?rand(0.8,2.2):rand(2,7);
    }
    gl.yaw=smoothDamp(gl.yaw,gl.tYaw,gl.sv,"y",0.25,dt);
    gl.pitch=smoothDamp(gl.pitch,gl.tPitch,gl.sv,"p",0.3,dt);
    this.nod*=Math.exp(-8*dt);
  }


  // ---------------------------------------------------------- combat
  startAttack(type,target,aim){
    if(this.atk||this.ko||this.seatedLike||(this.stunT||0)>0)return false;
    if(this.sit.state==="approach")this.standUp();
    this.guardT=3;
    // enchaînement : jab -> direct -> crochet (ou uppercut de près)
    const inCombo=clockT-(this.lastAtkEnd||-9)<0.55;
    this.combo=inCombo?(this.combo||0)+1:0;
    const dist=target?hdist(target.root,this.root):9;
    if(type==="punch"){
      const side=this.nextPunch||this.hand;this.nextPunch=-side; // un poing puis l'autre
      const idx=this.combo%3;
      let kind=idx===0?"jab":idx===1?"cross":(dist<0.72&&aim==="head"?"upper":"hook");
      if(this!==player&&Math.random()<0.3)kind=pick(["jab","cross","hook","upper"]);
      const K={jab:[0.25,0.3,0.8],cross:[0.32,0.33,1.1],hook:[0.4,0.42,1.3],upper:[0.38,0.4,1.4]}[kind];
      const d=K[0]*rand(0.95,1.05);
      this.atk={type,kind,side,t:0,dur:d,impactT:d*K[1],target,aim,hit:false,mult:K[2]};
    }else{
      const side=this.hand,leg=side<0?this.L:this.R,other=this.other(leg);
      if(leg.stepping){leg.t=1;this.advanceStep(leg,0);}
      if(other.stepping){other.t=1;this.advanceStep(other,0);}
      const kind=aim==="legs"?"low":aim==="head"?"high":"front";
      const K={low:[0.6,0.45,0.9],front:[0.78,0.48,1.0],high:[0.92,0.5,1.15]}[kind];
      const d=K[0]*rand(0.95,1.05);
      this.atk={type,kind,side,leg,t:0,dur:d,impactT:d*K[1],target,aim,hit:false,high:kind==="high",low:kind==="low",mult:K[2]};
    }
    if(this===player)combatStats.tries++;
    if(target&&target.brain.onIncoming)target.brain.onIncoming(target,this,this.atk);
    if(target){
      const to=new V3().subVectors(target.root,this.root);to.y=0;const d=to.length(),f=Math.atan2(to.x,-to.z)/D2R;
      this.targetYaw=f;this.yaw=lerpAngle(this.yaw,f,0.6);
      // on avance dans le coup (transfert du poids)
      const want=type==="kick"?0.8:0.62;
      if(d>want)this.vel.addScaledVector(to.divideScalar(d),Math.min(1.6,(d-want)*4.5));
    }
    return true;
  }
  aimPoint(a,from){
    const o=a.target;
    if(!o){return from.clone().add(fwdOf(this.yaw).multiplyScalar(0.7)).add(new V3(0,a.type==="kick"?-0.4:(a.aim==="head"?0.05:-0.3),0));}
    const b=o.rig.b,toMe=new V3().subVectors(this.root,o.root);toMe.y=0;toMe.normalize();
    if(a.jit===undefined)a.jit=this===player?new V3():new V3(rand(-0.1,0.1),rand(-0.08,0.08),rand(-0.05,0.05));
    return this._aim(a,b,toMe).add(a.jit);
  }
  _aim(a,b,toMe){
    if(a.aim==="head")return wp(b.Head).add(new V3(0,0.07,0)).addScaledVector(toMe,0.02);
    if(a.aim==="legs")return wp(b[a.side<0?"RightLeg":"LeftLeg"]).add(new V3(0,0.08,0)).addScaledVector(toMe,0.06);
    if(a.aim==="chest")return wp(b.Spine2).addScaledVector(toMe,0.08);
    return wp(b.Spine).addScaledVector(toMe,0.08);
  }
  updateKick(dt){
    const a=this.atk,leg=a.leg,other=this.other(leg),P=this.P;
    if(other.stepping)this.advanceStep(other,dt);
    const t=clamp01(a.t/a.dur),fwd=fwdOf(this.yaw),hipH=this.LEG+P.ankleHeight;
    const base=leg.planted.clone();
    const C=base.clone().addScaledVector(fwd,0.2).add(new V3(0,hipH*(a.high?0.62:a.low?0.3:0.45),0));
    if(a.high)C.addScaledVector(rightOf(this.yaw),a.side*0.25); // circulaire : la jambe arrive de côté
    let T=this.aimPoint(a,this.pelvisPos);
    const off=new V3().subVectors(T,this.root);const hor=Math.hypot(off.x,off.z),maxR=this.LEG*0.95;
    if(hor>maxR){off.x*=maxR/hor;off.z*=maxR/hor;}
    T=this.root.clone().add(off);T.y=this.root.y+clamp(T.y-this.root.y,0.15,hipH*(a.high?1.12:a.low?0.5:0.8));
    let p;
    if(t<0.35)p=base.clone().lerp(C,sst(0,0.35,t));
    else if(t<0.55)p=C.clone().lerp(T,sst(0.35,0.5,t));
    else if(t<0.75)p=T.clone().lerp(C,sst(0.55,0.75,t));
    else p=C.clone().lerp(base,sst(0.75,1,t));
    leg.stepping=false;leg.footPos.copy(p).addScaledVector(UP,-P.ankleHeight*(1-sst(0.1,0.3,t)*(1-sst(0.8,1,t))));
    leg.pitch=t<0.35?25*sst(0,0.35,t):-40*env(t,0.35,0.5,0.6,0.85);
    leg.footRot=frame(leg.plantedYaw,leg.pitch);
    other.footPos.copy(other.planted);
  }
  updateCombat(dt){
    this.guardT-=dt;
    const a=this.atk;
    if(a){a.t+=dt;if(a.t>=a.dur){this.atk=null;this.lastAtkEnd=clockT;}}
    const guard=this.guardT>0||this.atk;
    if(!guard){if(this._cArms){for(const arm of this.arms)arm.rFn=null;this._cArms=false;}return;}
    this._cArms=true;
    const A=this.atk;
    let ext=0,lean=0,twist=0;
    if(A&&A.type==="punch"){
      const r=A.impactT/A.dur,tt=A.t/A.dur;ext=tt<r?sst(0,r,tt):tt<r+0.12?1:1-sst(r+0.12,1,tt);
      const TW={jab:10,cross:28,hook:34,upper:18}[A.kind]||24;
      twist=-A.side*TW*ext;lean=(A.kind==="upper"?13:9)*ext;
    }else if(A&&A.type==="kick"){const tt=A.t/A.dur;lean=-11*env(tt,0.2,0.45,0.6,0.9);}
    if(twist||lean){
      const ax=rightOf(this.yaw);
      this.chestRot=qAxis(UP,-twist).multiply(new Q().setFromAxisAngle(ax,-lean*D2R)).multiply(this.chestRot);
    }
    const gw=Math.min(1,Math.max(this.guardT,A?1:0)*2);
    for(const arm of this.arms){
      arm.rFn=(ww,sh,am)=>{
        const g=sh.clone().add(local(ww.chestRot,-am.side*0.1,-0.02,0.24));
        if(A&&A.type==="punch"&&am.side===A.side){
          const aim=ww.aimPoint(A,sh),tg=g.lerp(aim,ext),arc=Math.sin(Math.PI*ext);
          if(A.kind==="hook"){tg.add(local(ww.chestRot,am.side*0.3*arc,0.04*arc,-0.08*arc));return {target:tg,w:1,wrist:-10,pole:local(ww.chestRot,am.side*0.4,0.6,-0.2)};}
          if(A.kind==="upper"){tg.add(new V3(0,-0.28*arc*(1-ext*0.5),0));return {target:tg,w:1,wrist:-70,pole:local(ww.chestRot,am.side*0.8,-1,0.2)};}
          return {target:tg,w:1,wrist:0,pole:local(ww.chestRot,am.side*0.9,-0.6,-0.1)};
        }
        return {target:g,w:0.9*gw,wrist:-25,pole:local(ww.chestRot,am.side*0.7,-0.8,-0.2)};
      };
    }
  }
  animMouth(dt){
    const m=this.rig.mouth;if(!m)return;
    this.talkT=Math.max(0,(this.talkT||0)-dt);
    const B=m.userData.base;
    if(this.talkT>0){m.visible=true;const o=Math.abs(Math.sin(clockT*17+this.seed))*0.7+Math.abs(Math.sin(clockT*29+this.seed*2))*0.3;m.scale.set(B.w*(0.75+0.25*o),B.h*(0.15+0.85*o),B.d);}
    else if(this.ko){m.visible=true;m.scale.set(B.w*0.6,B.h*0.5,B.d);}
    else m.visible=false;
  }
  resolveStrike(){
    const a=this.atk;a.hit=true;
    const b=this.rig.b,isK=a.type==="kick";
    const P2=a.side<0?"Left":"Right";
    const e1=wp(b[isK?P2+"ToeBase":P2+"Hand"]),e0=wp(b[isK?P2+"Foot":P2+"ForeArm"]);
    const strike=e1.clone().addScaledVector(new V3().subVectors(e1,e0).normalize(),isK?0.05:0.08);
    let best=null;
    for(const v of walkers){
      if(v===this||v.ko||hdist(v.root,this.root)>2)continue;
      const vb=v.rig.b,S=v.LEG/0.91;
      const zones=[["head",wp(vb.Head).add(new V3(0,0.085*S,0)),0.12*S],["chest",wp(vb.Spine2),0.19*S],["belly",wp(vb.Spine),0.18*S],
        ["legs",wp(vb.LeftLeg).add(new V3(0,0.1,0)),0.11*S],["legs",wp(vb.RightLeg).add(new V3(0,0.1,0)),0.11*S]];
      for(const [z,p,r] of zones){const d=strike.distanceTo(p)-r;if(d<0.11&&(!best||d<best.d))best={v,z,d};}
    }
    if(!best){playSound("whoosh",0.4);if(this===player)combatLog.unshift({k:a.kind,z:"raté",d:0});return;}
    const D=isK?{head:[28,36],chest:[15,20],belly:[13,18],legs:[6,10]}:{head:[16,24],chest:[8,12],belly:[7,11],legs:[3,6]};
    let dmg=Math.round(rand(...D[best.z])*this.power*(a.mult||1)*(this===player?1:0.72));
    let blocked=false;
    if(isGuarding(best.v)&&(best.z==="head"||best.z==="chest")){dmg=Math.round(dmg*(best.z==="head"?0.3:0.65));blocked=true;}
    if(this===player){combatStats.hits++;combatLog.unshift({k:a.kind,z:best.z,d:dmg,b:blocked});if(combatLog.length>5)combatLog.pop();}
    if((this===player||best.v===player)&&!best.v.isSpar&&!this.isSpar)noteFight(best.v.root);
    if(this===player||best.v===player){hitStop=blocked?0.03:0.07;cam.shake=Math.min(0.25,cam.shake+(blocked?0.03:0.06+dmg/300));}
    best.v.takeHit(this,best.z,dmg,isK,blocked);
    if(this!==player&&!this.isCop&&!this.isSpar&&!best.v.isSpar)registerNpcCrime(this,best.v);
    if(!blocked&&((best.z==="head"&&dmg>=18)||(isK&&dmg>=20))){best.v.stunT=rand(0.5,0.9);best.v.atk=null;if(best.v!==player&&Math.random()<0.5)floatText(best.v,"Sonné !","#fff");}
  }
  takeHit(att,zone,dmg,isKick,blocked){
    if(this.ko)return;
    if(this===player&&CREA.on&&CREA.god)dmg=0;
    if(this.sit.state!=="none"){this.sit.state==="approach"?this.standUp():this.finishStand();}
    this.hp=Math.max(0,this.hp-dmg);this.lastHurt=clockT;
    if(this===player)rumble(blocked?60:140,blocked?0.3:0.8);
    if(this.ball)dropBall(this,0.6);
    const dir=new V3().subVectors(this.root,att.root);dir.y=0;dir.normalize();
    const k=(zone==="head"?1.1:0.7)*(isKick?1.5:1);
    this.vel.addScaledVector(dir,k);this.bump.addScaledVector(dir,0.5*k);
    if(zone==="head")this.flinchHead-=rand(22,32);
    if(zone==="belly"||zone==="chest")this.flinchLean+=zone==="belly"?rand(18,26):rand(8,14);
    const LBL={head:"dans les dents",chest:"au torse",belly:"dans le ventre",legs:"dans les jambes"};
    floatText(this,blocked?`-${dmg} bloqué`:`-${dmg} ${LBL[zone]}`,blocked?"#9fd0ff":zone==="head"?"#ff3b3b":"#ffb347");
    if(blocked){this.flinchHead*=0.3;}
    playSound(zone==="head"?"slap":"thud",Math.min(1,dmg/25));
    if(this===player)flashHurt(dmg);
    const selfDefense=this.aggressorVs===player&&clockT-(this.aggressorT||-99)<25;
    if(att===player&&this!==player&&!this.isSpar&&!selfDefense)registerCrime(this,this.hp<=0);
    if(this===player)combatStats.taken+=dmg;
    if(this.hp<=0)this.startKO(dir,att,this.isSpar?{getUp:3}:{});
    if(this.brain.onHit)this.brain.onHit(this,att,dmg,zone);
  }
  startKO(dir,att,opt={}){
    if(this===player&&CREA.on&&CREA.god){this.hp=this.maxHp;return;}
    clearReaction(this);this.atk=null;this.guardT=0;this.faceYaw=null;
    if(this.sit.state!=="none"){if(this.sit.spot)this.sit.spot.taken=null;this.sit={state:"none",t:0};}
    // direction de chute : surtout dans le sens du coup, avec du hasard
    const f=fwdOf(this.yaw),r=rightOf(this.yaw);
    let fd=dir.clone().multiplyScalar(0.8).addScaledVector(f,rand(-0.6,0.6)).addScaledVector(r,rand(-0.6,0.6));fd.y=0;
    if(fd.lengthSq()<1e-4)fd.copy(f).negate();fd.normalize();
    const S=this.LEG/0.91;
    this.ko={t:0,yaw:this.yaw,fallDir:fd,getUp:opt.getUp??(this===player?4.5:Infinity),att,knock:!!opt.getUp,stun:!!opt.stun,
      buckle:opt.fast?rand(0.05,0.1):rand(0.22,0.38),topple:rand(0.42,0.6),kneel:rand(0.5,0.62),slump:rand(18,32),
      headSide:rand(-35,35),legBend:[rand(0,0.35),rand(0,0.35)],armOut:[rand(0.2,0.6),rand(0.2,0.6)],armUp:[rand(-0.4,0.3),rand(-0.4,0.3)],
      hV:{p:0,v:0,r:0,rv:0},S,base:this.root.clone(),startFeet:this.legs.map(l=>l.footPos.clone())};
    for(const a of this.arms){a.rag=null;}
    if(this===player){if(!opt.getUp&&!(wanted.level>0&&copsNear(8)))koEl.style.display="flex";}
    if(this!==player&&!opt.getUp)onNpcDown(this);
  }
  updateKO(dt,time){
    const k=this.ko,S=k.S,P=this.P;k.t+=dt;
    const standH=this.LEG*P.standRatio+P.ankleHeight,kneelH=standH*k.kneel,lyH=0.11*S;
    // relevé (joueur uniquement)
    let g=1;if(k.t>k.getUp){g=1-sst(k.getUp,k.getUp+1.4,k.t);if(k.t>k.getUp+1.4){this.endKO();return this.updateBody(dt,time);}}
    const t=k.t;
    // 1) les genoux lâchent  2) le corps bascule (accélération type gravité)  3) petit rebond à l'impact
    const kb=sst(0,k.buckle,t);
    const tt=clamp01((t-k.buckle*0.7)/k.topple);
    let th=tt*tt*90;
    if(tt>=1){const u=t-k.buckle*0.7-k.topple;th=90-7*Math.exp(-u*7)*Math.sin(u*22)*(u<0.6?1:0);}
    th*=g;const thR=th*D2R;
    const fd=k.fallDir,axis=new V3().crossVectors(UP,fd).normalize();
    const Qf=new Q().setFromAxisAngle(axis,thR);
    const slump=k.slump*kb*(1-0.6*sst(0.5,1,tt))*g;
    const crouch=kb*g;
    const gb=this.root.y;
    const y=gb+lerp(standH,kneelH,crouch)*Math.cos(thR)+lyH*Math.sin(thR);
    const base=this.root.clone().addScaledVector(fd,Math.sin(thR)*0.42*S);
    this.pelvisPos=base;this.pelvisPos.y=Math.max(gb+lyH,y)+(tt>=1?Math.max(0,Math.sin((t-k.buckle*0.7-k.topple)*22))*0.02*Math.exp(-(t-k.buckle*0.7-k.topple)*6):0)*g;
    this.height=this.pelvisPos.y;
    const up0=frame(k.yaw,slump*0.4);
    this.pelvisRot=Qf.clone().multiply(up0);
    this.chestRot=Qf.clone().multiply(frame(k.yaw,slump));
    // tête molle : ressort sous-amorti
    const hv=k.hV,tp=(28*kb*(1-sst(0.3,1,tt))+(tt>=1?8:0))*g,tr=k.headSide*sst(0.4,1,tt)*g;
    hv.v+=((tp-hv.p)*90-hv.v*7)*dt;hv.p+=hv.v*dt;hv.rv+=((tr-hv.r)*60-hv.rv*6)*dt;hv.r+=hv.rv*dt;
    this.headRot=Qf.clone().multiply(frame(k.yaw,slump+hv.p,hv.r*0.6,hv.r*0.4));
    if(k.stun&&k.t<2.2){const z=Math.sin(k.t*70)*4;this.chestRot.multiply(qAxis(AZ,z));this.headRot.multiply(qAxis(AX,z));}
    // jambes : les pieds restent puis glissent vers la position allongée
    const lyW=sst(0.15,1,tt)*g;
    this.legs.forEach((leg,i)=>{
      leg.stepping=false;leg.pitch=0;
      const hip=this.pelvisPos.clone().add(local(this.pelvisRot,leg.side*P.hipWidth,0,0));
      const down=local(this.pelvisRot,leg.side*0.1,-1,k.legBend[i]).normalize();
      const lying=hip.addScaledVector(down,this.LEG*(0.93-k.legBend[i]*0.25));lying.y=Math.max(lying.y,gb+P.ankleHeight*0.5);
      lying.addScaledVector(UP,-P.ankleHeight);lying.y=Math.max(gb,lying.y);
      leg.footPos.copy(k.startFeet[i]).lerp(lying,lyW);
      leg.footRot=frame(k.yaw,-60*lyW).premultiply(new Q().setFromAxisAngle(axis,thR*0.3));
    });
    // bras : ballants, avec retard (ressort)
    this.arms.forEach((arm,i)=>{
      const want=local(this.chestRot,arm.side*(0.12+k.armOut[i]*sst(0.4,1,tt)),-0.5+0.3*k.armUp[i]*sst(0.5,1,tt),0.08);
      if(!arm.rag){arm.rag={o:want.clone(),v:new V3()};}
      const R=arm.rag;R.v.addScaledVector(new V3().subVectors(want,R.o),70*dt).multiplyScalar(Math.exp(-5*dt));R.o.addScaledVector(R.v,dt);
      arm.rFn=(ww,sh)=>({target:sh.clone().add(R.o),w:g,wrist:-10});
    });
    if(k.carry)this.applyCarry(k);
  }
  applyCarry(k){
    // posé à plat sur le brancard
    const c=k.carry,lay=frame(c.yaw,-90);
    this.pelvisPos=c.pos.clone();this.pelvisRot=lay;this.chestRot=lay.clone();this.headRot=frame(c.yaw,-88,0,0);
    const fwd=fwdOf(c.yaw);
    this.legs.forEach(leg=>{const p=c.pos.clone().addScaledVector(fwd,this.LEG*0.95).addScaledVector(rightOf(c.yaw),leg.side*this.P.hipWidth);p.y=c.pos.y-this.P.ankleHeight;leg.footPos.copy(p);leg.footRot=frame(c.yaw,-90);});
    this.arms.forEach(arm=>{arm.rFn=(ww,sh)=>({target:sh.clone().addScaledVector(fwdOf(c.yaw),0.5).addScaledVector(rightOf(c.yaw),arm.side*0.08).add(new V3(0,0.03,0)),w:1,wrist:0});});
  }
  endKO(){
    const k=this.ko;this.ko=null;
    for(const arm of this.arms){arm.rFn=null;arm.rag=null;}
    if(!k.knock)this.hp=this===player?100:45;
    if(this.isSpar)this.hp=100;
    this.setRig(this.rig,true);
    if(this===player)koEl.style.display="none";
    if(this.brain.onGetUp)this.brain.onGetUp(this,k.att);
  }
  // ---------------------------------------------------------- pas
  // ---------------------------------------------------------- sol, rebords, chutes (module 10)
  groundStep(ox,oz,dt){
    if(this.noClamp&&Math.abs(this.root.z)>WORLD+50){this.gy=0;this.root.y=0;this.air=null;return;}
    let g=groundAt(this.root.x,this.root.z);
    const deep=waterDepth(this.root.x,this.root.z);
    if(this.air){
      const A=this.air;A.vy-=9.81*dt;A.t+=dt;this.root.y+=A.vy*dt;
      if(WATER_Y-g>1.1&&this.root.y<=WATER_Y-0.95){ // plouf
        const v=-A.vy;this.air=null;this.swim={t:0,dive:Math.min(1,v/7)};this.gy=WATER_Y-1.2;this.root.y=this.gy-this.swim.dive*0.8;splash(this,v);this.dip=0;
        if(this===player&&v>4)floatText(this,"Plouf !","#bfe8ff");return;}
      if(this.root.y<=g){const v=-A.vy;this.root.y=g;this.gy=g;this.air=null;this.onLand(v,A);}
      return;
    }
    // --- nage
    if(this.swim){
      const S=this.swim;S.t+=dt;
      if(S.t>1.2)for(const L of LADDERS)if(Math.hypot(this.root.x-L.x,this.root.z-L.z)<0.9){ // échelle : on remonte
        this.swim=null;this.root.x=L.x+L.ix;this.root.z=L.z+L.iz;this.gy=this.root.y=groundAt(this.root.x,this.root.z);this.lastOk.copy(this.root);this.vel.set(0,0,0);this.dip=0.2;this.swimEnd();return;}
      if(deep<1.0){this.swim=null;this.swimEnd();}
      else{if(S.dive>0)S.dive=Math.max(0,S.dive-dt*1.2);this.gy=lerp(this.gy,WATER_Y-1.2,1-Math.exp(-6*dt));this.root.y=this.gy-(S.dive||0)*0.8;this.lastOk.copy(this.root);
        if(this.speed>0.3&&Math.random()<dt*2.5)ripple(this.root.x,this.root.z,false);return;}
    }else if(WATER_Y-g>1.15&&!this.ko){this.swim={t:0,dive:0};this.gy=this.root.y;return;}
    const base=this.gy;
    if(g>base+STEP_UP){ // rebord trop haut : on glisse le long
      const gx=groundAt(this.root.x,oz),gz=groundAt(ox,this.root.z);
      if(gx<=base+STEP_UP){this.root.z=oz;this.vel.z*=0.2;g=gx;}
      else if(gz<=base+STEP_UP){this.root.x=ox;this.vel.x*=0.2;g=gz;}
      else{const go=groundAt(ox,oz);if(go<=base+STEP_UP){this.root.x=ox;this.root.z=oz;g=go;}else{this.root.x=this.lastOk.x;this.root.z=this.lastOk.z;g=groundAt(this.root.x,this.root.z);}this.vel.multiplyScalar(0.2);}
    }
    if(g<base-FALL_DROP&&this.sit.state==="none"&&!(this.ko&&this.ko.carry)){
      this.air={vy:Math.min(0,this.vel.y||0),t:0,from:base};this.root.y=base;
      if(this.ko)this.air.ko=true;
      return;
    }
    this.gy+=(g-this.gy)*(1-Math.exp(-16*dt));if(Math.abs(g-this.gy)<0.003)this.gy=g;
    this.root.y=this.gy;this.lastOk.copy(this.root);
  }
  // mode créatif : vol libre (Espace monter, Ctrl descendre)
  flyStep(dt){
    const up=(keys.has("Space")?1:0)-(keys.has("ControlLeft")||keys.has("ControlRight")?1:0)+(typeof flyTouch!=="undefined"?flyTouch:0)+(pad.on?(pad.flyV||0):0);
    const vt=clamp(up,-1,1)*(this.run?16:7);this.flyVy=lerp(this.flyVy||0,vt,1-Math.exp(-5*dt));
    let floor=groundAt(this.root.x,this.root.z);if(this.root.x>SEA_X)floor=Math.max(floor,WATER_Y+0.15);
    this.root.y=clamp(this.root.y+this.flyVy*dt,floor,420);if(this.root.y<=floor&&this.flyVy<0)this.flyVy=0;
    this.gy=this.root.y;this.lastOk.copy(this.root);this.air=null;this.swim=null;
  }
  setFly(on){
    if(on){this.fly={t:0};this.swim=null;this.air=null;this.flyVy=2;this.root.y+=0.3;}
    else if(this.fly){this.fly=null;this.swimEnd();const g=groundAt(this.root.x,this.root.z);if(this.root.y>g+FALL_DROP)this.air={vy:0,t:0,from:this.root.y};}
  }
  flyArms(){
    const K=this.swimK||0;
    for(const a of this.arms){a._swimArm=true;
      a.rFn=(ww,sh,arm)=>{const f=fwdOf(ww.yaw),r=rightOf(ww.yaw);
        const sup=sh.clone().addScaledVector(f,0.5).addScaledVector(r,arm.side*0.12);sup.y+=0.08;   // bras tendus devant, façon super-héros
        const hover=sh.clone().addScaledVector(r,arm.side*0.32).addScaledVector(f,0.05);hover.y-=0.45;
        return {target:hover.lerp(sup,K),w:1,wrist:-10};};}
  }
  swimEnd(){for(const a of this.arms)if(a._swimArm){a.rFn=null;a._swimArm=false;}this.headNod=0;this.swimK=0;}
  swimArms(time){
    const K=this.swimK||0,ph=time*(this.speed>0.3?2.4:1.5)+this.seed;
    for(const a of this.arms){a._swimArm=true;
      a.rFn=(ww,sh,arm)=>{const f=fwdOf(ww.yaw),r=rightOf(ww.yaw),e1=0.5+0.5*Math.sin(ph),e2=0.5+0.5*Math.sin(ph-1.6);
        const prone=sh.clone().addScaledVector(f,0.2+0.45*e1).addScaledVector(r,arm.side*(0.1+0.32*e2));prone.y=WATER_Y-0.08-0.12*(1-e1);
        const tread=sh.clone().addScaledVector(f,0.32).addScaledVector(r,arm.side*(0.28+0.14*Math.sin(ph)));tread.y=WATER_Y-0.18;
        return {target:tread.lerp(prone,K),w:1,wrist:-20};};}
  }
  onLand(v,A){
    const fall=A.from-this.root.y;
    this.dip+=Math.min(0.32,v*0.04);this.nod+=v*1.6;
    for(const leg of this.legs){leg.stepping=false;leg.planted.set(leg.footPos.x,groundAt(leg.footPos.x,leg.footPos.z),leg.footPos.z);leg.footPos.copy(leg.planted);}
    this.gaitOn=false;this.vel.multiplyScalar(v>5?0.25:0.6);
    playSound("thud",Math.min(1,v/7));
    if(this===player)fallStats.push({h:+fall.toFixed(2),v:+v.toFixed(2),t:clockT});
    if(A.ko||this.ko)return;
    if(fall>2.2){
      const dmg=Math.round((fall-2)*22);this.hp=Math.max(0,this.hp-dmg);this.lastHurt=clockT;
      floatText(this,"Chute ! -"+dmg,"#ffb36b");
      if(this.hp<=0||fall>4.5)this.startKO(fwdOf(this.yaw),this,{getUp:this===player?2.4:3.5,fast:true});
      else{this.stagger=0.9;if(this!==player)bark(this,["Aïe, mes chevilles !","Ouille…","Ah, ça fait mal !"],4);}
    }else if(fall>1){this.stagger=0.45;}
  }
  updateLegs(dt){
    if(this.swim||this.fly){
      // jambes : brasse (les deux ensemble) derrière le corps, ou battements sous l'eau à l'arrêt
      const K=this.swimK||0,f=fwdOf(this.yaw),r=rightOf(this.yaw),ph=clockT*(this.speed>0.3?2.4:1.5)+this.seed;
      const hip=this.pelvisPos||this.root;
      this.legs.forEach((leg,i)=>{leg.stepping=false;const kick=K>0.5?Math.sin(ph-0.8):Math.sin(ph*1.6+i*Math.PI);
        leg.footPos.copy(hip).addScaledVector(r,leg.side*(this.P.hipWidth+0.08+0.12*K*(0.5+0.5*kick))).addScaledVector(f,-this.LEG*0.85*K-0.05).add(new V3(0,-this.LEG*0.9*(1-K)+kick*0.1,0));
        leg.planted.copy(leg.footPos);leg.pitch=10+60*K;leg.footRot=frame(this.yaw,leg.pitch);});
      return;
    }
    if(this.air){
      // en l'air : jambes légèrement fléchies sous le bassin, pointes vers le bas
      const r=rightOf(this.yaw),f=fwdOf(this.yaw),T=this.air.t;
      this.legs.forEach((leg,i)=>{leg.stepping=false;leg.pitch=12;
        leg.footPos.copy(this.root).addScaledVector(r,leg.side*this.P.hipWidth*1.1).addScaledVector(f,(i?0.12:-0.08)*Math.min(1,T*4));leg.footPos.y=this.root.y+0.04+0.08*Math.min(1,T*3);
        leg.planted.copy(leg.footPos);leg.footRot=frame(this.yaw,leg.pitch);});
      return;
    }
    const P=this.P,s01=this.s01,L=this.L,R=this.R;
    if(this.atk&&this.atk.type==="kick"){this.updateKick(dt);return;}
    const wantMove=this.desiredVel.lengthSq()>0.01;
    const moving=wantMove||this.speed>0.3;
    this.stillTimer=moving?0:this.stillTimer+dt;
    this.advanceStep(L,dt);this.advanceStep(R,dt);
    if(moving){
      // cycle de marche : les deux jambes toujours en opposition exacte -> pas de boiterie
      // cadence réaliste par allure : ~110 pas/min en marche, ~160 en jogging, ~175 en sprint
      const v=this.speed,cf=v<=P.walkSpeed?lerp(0.78,0.92,v/P.walkSpeed):v<=P.jogSpeed?lerp(0.92,1.33,(v-P.walkSpeed)/(P.jogSpeed-P.walkSpeed)):lerp(1.33,1.46,clamp01((v-P.jogSpeed)/(P.runSpeed-P.jogSpeed)));
      const fc=cf*this.style.cadence;
      if(!this.gaitOn){
        this.gaitOn=true;
        const dir=(wantMove?this.desiredVel:this.vel).clone();dir.y=0;dir.normalize();
        const first=new V3().subVectors(L.footPos,this.root).dot(dir)<new V3().subVectors(R.footPos,this.root).dot(dir)?L:R;
        this.phase=first===L?0.999:0.499;
      }
      const prev=this.phase;this.phase=(this.phase+dt*fc)%1;
      const crossed=x=>this.phase>=prev?(prev<x&&x<=this.phase):(x>prev||x<=this.phase);
      for(const leg of this.legs){
        const other=this.other(leg);
        if(!leg.stepping&&crossed(leg===L?0:0.5))this.startStep(leg,"gait",fc);
        // sécurité : pied trop loin derrière (gros changement de direction) -> on le ramène, une jambe à la fois
        else if(!leg.stepping&&!other.stepping&&hdist(leg.planted,this.idealFoot(leg))>this.LEG*0.72)this.startStep(leg,"gait",fc);
      }
    }else{
      this.gaitOn=false;
      // à l'arrêt : petits pas de réajustement, jamais les deux pieds en l'air
      if(L.stepping||R.stepping)return;
      let best=null,bestScore=0;
      for(const leg of this.legs){
        const err=hdist(leg.planted,this.idealFoot(leg));
        const yawErr=Math.abs(deltaAngle(leg.plantedYaw,this.yaw+leg.side*P.toeOut));
        const score=Math.max(err/P.idleThr,yawErr/26);
        if(score>1&&(this.stillTimer>this.settleDelay||yawErr>26)&&score>bestScore){bestScore=score;best=leg;}
      }
      if(best)this.startStep(best,"idle",0);
    }
  }
  startStep(leg,mode,fc){
    const P=this.P,st=this.style,s01=this.s01;
    this.lastLeg=leg;leg.stepping=true;leg.t=0;leg.mode=mode;leg.startPitch=Math.max(0,leg.pitch||0);leg.flatT=0;
    leg.start.copy(leg.planted);leg.startYaw=leg.plantedYaw;
    if(mode==="gait"){
      const swingFrac=lerp(0.4,0.5,s01);
      leg.duration=swingFrac/fc*rand(1-P.durVar,1+P.durVar);
      leg.stanceHalf=(1-swingFrac)/fc*0.5*rand(0.94,1.06)*st.stride;
      leg.height=lerp(P.walkH,P.runH,s01)*rand(1-P.hVar,1+P.hVar)*leg.bias.h*st.lift;
      if(Math.random()<0.06)leg.height*=0.6;          // pied qui frôle le sol
    }else{
      const err=hdist(leg.planted,this.idealFoot(leg));
      leg.duration=clamp(P.idleDur*rand(0.9,1.15)*(0.8+err*1.5),0.25,0.5);
      leg.stanceHalf=0;
      leg.height=Math.min(P.idleH*rand(0.8,1.2),0.03+err*0.2);
    }
    // --- ce qui rend chaque pas unique ---
    leg.lateral=rand(-1,1)*P.latJitter*(mode==="gait"?1:0.4);
    leg.yawJ=rand(-P.yawJitter,P.yawJitter)*(mode==="gait"?1:0.5)+leg.bias.toe;
    leg.peak=rand(0.35,0.6);
    leg.swingOut=rand(0,0.025);
    leg.easeK=rand(0.85,1.2);
    leg.toeOff=mode==="gait"?rand(24,34)+s01*12:rand(4,9);leg.heelStrike=mode==="gait"?lerp(rand(14,22),rand(4,9),s01):rand(1,4);
    leg.wobble=rand(-1,1)*0.008;leg.wobbleF=rand(1,3);
    this.settleDelay=rand(0.15,0.5);
    this.predictTarget(leg);
  }
  predictTarget(leg){
    const remaining=leg.duration*(1-leg.t);
    const vNow=this.predictedVel(remaining*0.5);
    const ahead=vNow.clone().multiplyScalar(leg.stanceHalf||0);
    const maxAhead=this.LEG*0.45;if(ahead.length()>maxAhead)ahead.setLength(maxAhead);
    leg.target.copy(this.idealFoot(leg)).addScaledVector(vNow,remaining).add(ahead).addScaledVector(rightOf(this.yaw),leg.lateral);
    this.keepOnSide(leg,leg.target,this.yaw+this.yawVel*remaining);
    pushOutOfObstacles(leg.target,0.09);
    leg.target.y=groundAt(leg.target.x,leg.target.z);
    for(let k=0;k<5&&leg.target.y>this.gy+STEP_UP;k++){leg.target.lerp(this.root,0.4);leg.target.y=groundAt(leg.target.x,leg.target.z);}
    leg.targetYaw=this.yaw+this.yawVel*remaining*0.6+leg.side*this.P.toeOut+leg.yawJ;
  }
  keepOnSide(leg,p,yawAt){
    const other=this.other(leg),r=rightOf(yawAt);
    const minLat=this.P.hipWidth*0.55;
    const lat=new V3().subVectors(p,this.root).dot(r)*leg.side;
    if(lat<minLat)p.addScaledVector(r,leg.side*(minLat-lat));
    const op=other.stepping?other.target:other.planted;
    const relLat=new V3().subVectors(p,op).dot(r)*leg.side;
    const minSep=this.P.footClear*0.75;
    if(relLat<minSep)p.addScaledVector(r,leg.side*(minSep-relLat));
  }
  // pied posé : pivot sur la pointe (talon levé, pitch>0) ou sur le talon (pointe levée, pitch<0)
  footFromContact(ground,yaw,pitch){
    const f=fwdOf(yaw),aH=this.P.ankleHeight,bd=this.P.ballDist,hd=this.P.heelDist;
    let a;
    if(pitch>=0){const p=pitch*D2R;a=ground.clone().addScaledVector(f,bd).addScaledVector(f,-bd*Math.cos(p)+aH*Math.sin(p)).addScaledVector(UP,bd*Math.sin(p)+aH*Math.cos(p));}
    else{const q=-pitch*D2R;a=ground.clone().addScaledVector(f,-hd).addScaledVector(f,hd*Math.cos(q)-aH*Math.sin(q)).addScaledVector(UP,hd*Math.sin(q)+aH*Math.cos(q));}
    return a.addScaledVector(UP,-aH);
  }
  advanceStep(leg,dt){
    if(!leg.stepping){
      // appui : le pied se pose à plat après l'attaque talon, puis le talon se lève quand le corps passe devant
      let pitch;
      if(leg.flatT>0){leg.flatT-=dt;pitch=leg.landPitch*Math.max(0,leg.flatT)/leg.flatDur;}
      else{
        const moving=this.speed>0.3&&this.gaitOn;
        const behind=moving?new V3().subVectors(this.root,leg.planted).dot(fwdOf(this.yaw)):0;
        const S=this.LEG/0.91,tgt=moving?clamp((behind-0.06*S)*(70+40*this.s01)/S,0,14+14*this.s01):0;
        leg.heelLift=lerp(leg.heelLift||0,tgt,1-Math.exp(-14*dt));
        pitch=leg.heelLift;
      }
      leg.pitch=pitch;leg.footRot=frame(leg.plantedYaw,pitch);
      leg.footPos.copy(Math.abs(pitch)>0.05?this.footFromContact(leg.planted,leg.plantedYaw,pitch):leg.planted);
      return;
    }
    leg.t+=dt/leg.duration;
    if(leg.t<0.7)this.predictTarget(leg);
    const t=clamp01(leg.t),tk=Math.pow(t,leg.easeK),e=tk*tk*(3-2*tk);
    const base=new V3().lerpVectors(leg.start,leg.target,e);
    const warp=t<leg.peak?0.5*t/leg.peak:0.5+0.5*(t-leg.peak)/(1-leg.peak);
    const arc=Math.sin(warp*Math.PI);
    const r=rightOf(this.yaw);
    leg.footPos.copy(base).addScaledVector(UP,(leg.height+Math.abs(leg.target.y-leg.start.y)*0.9)*arc)
      .addScaledVector(r,leg.side*(leg.swingOut*arc+leg.wobble*Math.sin(t*Math.PI*leg.wobbleF)));
    const other=this.other(leg);
    const rel=new V3().subVectors(leg.footPos,other.footPos);
    const relLat=rel.dot(r)*leg.side;
    const clear=this.P.footClear*(1-0.4*this.s01);
    if(Math.abs(rel.dot(fwdOf(this.yaw)))<0.32&&relLat<clear)leg.footPos.addScaledVector(r,leg.side*(clear-relLat)*Math.min(1,arc*3));
    const yawNow=lerpAngle(leg.startYaw,leg.targetYaw,e);
    // déroulé : décollage sur la pointe -> pied qui passe -> attaque talon
    const sp=leg.startPitch||0,K=[[0,sp],[0.14,Math.max(sp,leg.toeOff)],[0.45,3],[0.82,-leg.heelStrike*0.85],[1,-leg.heelStrike]];
    let pitch=K[K.length-1][1];
    for(let i=1;i<K.length;i++)if(t<=K[i][0]){const a=K[i-1],b=K[i],u=(t-a[0])/(b[0]-a[0]),s2=u*u*(3-2*u);pitch=a[1]+(b[1]-a[1])*s2;break;}
    leg.pitch=pitch;
    const w0=1-sst(0,0.24,t),w1=sst(0.8,1,t);
    if(w0>0)leg.footPos.lerp(this.footFromContact(leg.start,leg.startYaw,Math.max(0,pitch)),w0);
    if(w1>0)leg.footPos.lerp(this.footFromContact(leg.target,leg.targetYaw,Math.min(0,pitch)),w1);
    leg.footRot=frame(yawNow,leg.pitch);
    if(leg.t>=1)this.land(leg);
  }
  land(leg){
    leg.stepping=false;leg.planted.copy(leg.target);leg.plantedYaw=leg.targetYaw;
    leg.landPitch=leg.pitch;leg.flatDur=lerp(0.11,0.06,this.s01);leg.flatT=leg.flatDur;leg.heelLift=0;
    leg.footPos.copy(this.footFromContact(leg.planted,leg.plantedYaw,leg.pitch));leg.footRot=frame(leg.plantedYaw,leg.pitch);
    this.dip+=rand(0.006,0.016)*(0.5+this.s01*1.5)*this.style.bounce;
    this.nod+=rand(0.5,2.2)*(0.4+this.s01);
    this.stepCount++;
    addFootprint(this,leg,this.s01>0.5);
    if(this.isPlayer){
      benchSteps.push({s:leg.side,st:hdist(leg.start,leg.target),d:leg.duration,t:clockT});if(benchSteps.length>16)benchSteps.shift();
      (window.__steps=window.__steps||[]).push({s:leg.side,st:hdist(leg.start,leg.target),d:leg.duration,t:window.__simT||0,m:leg.mode});
      const a=deltaAngle(this.yaw,leg.plantedYaw);
      stepEl.textContent=`Pas n°${this.stepCount} (${leg.side<0?"G":"D"}) — foulée ${hdist(leg.start,leg.target).toFixed(2)} m · hauteur ${(leg.height*100).toFixed(1)} cm · durée ${leg.duration.toFixed(2)} s · angle ${a>=0?"+":""}${a.toFixed(1)}° · apex ${Math.round(leg.peak*100)}%`;
    }
  }

  // ---------------------------------------------------------- corps
  updateBody(dt,time){
    const P=this.P,s01=this.s01,moving=this.speed>0.15,spd=this.speed,sd=this.sd,st=this.style,g=this.gait;
    const fwd=fwdOf(this.yaw),right=rightOf(this.yaw),L=this.L,R=this.R;
    let swayT=0,rollT=0;
    for(const leg of this.legs){
      if(!leg.stepping)continue;
      const a=Math.sin(Math.PI*clamp01(leg.t));
      swayT+=-leg.side*a*lerp(P.swayWalk,P.swayRun,s01);
      rollT+=-leg.side*a*P.hipDrop;
    }
    if(!moving){swayT+=(noise(time*0.3,this.seed+3)-0.5)*0.05;rollT+=(noise(time*0.25,this.seed+7)-0.5)*3;}
    this.sway=smoothDamp(this.sway,swayT,sd,"sway",0.09,dt);
    this.roll=smoothDamp(this.roll,rollT,sd,"roll",0.08,dt);
    const fL=new V3().subVectors(L.footPos,this.root).dot(fwd),fR=new V3().subVectors(R.footPos,this.root).dot(fwd);
    this.twist=smoothDamp(this.twist,clamp(-(fR-fL)*P.twistPerM,-16,16),sd,"twist",0.06,dt);
    this.lean=smoothDamp(this.lean,clamp(s01*P.leanMax+this.accelFwd*1.6+g.lean,-8,16),sd,"lean",0.15,dt);
    this.turnRoll=smoothDamp(this.turnRoll,clamp(-this.yawVel*spd*0.012,-12,12),sd,"turnRoll",0.12,dt);
    this.pelvisRot=frame(this.yaw,this.lean*0.3,this.twist,this.roll+this.turnRoll*0.5);

    const pelvisXZ=this.root.clone().addScaledVector(right,this.sway);
    const Lc=this.LEG*0.985,hMax=this.LEG*P.standRatio+P.ankleHeight;
    const gb=this.root.y;let h=gb+hMax,gLow=gb;
    for(const leg of this.legs)if(!leg.stepping)gLow=Math.min(gLow,leg.planted.y);
    for(const leg of this.legs){
      const hip=pelvisXZ.clone().add(local(this.pelvisRot,leg.side*P.hipWidth,0,0));
      const ankleY=leg.footPos.y+P.ankleHeight;
      const d=Math.hypot(hip.x-leg.footPos.x,hip.z-leg.footPos.z);
      h=Math.min(h,d<Lc?ankleY+Math.sqrt(Lc*Lc-d*d):ankleY);
    }
    h=Math.max(h,gLow+hMax*0.86);
    if(this.air)h=gb+hMax*0.95;
    if(this.stagger>0){this.stagger-=dt;h-=Math.sin(Math.min(1,this.stagger)*Math.PI)*0.12;}
    if(this.crouchK>0.01)h=lerp(h,gb+hMax*0.5,this.crouchK);
    this.dip*=Math.exp(-11*dt);h-=this.dip;
    if(!moving)h+=Math.sin(time*1.7+this.seed)*0.004;
    this.height=this.air?h:smoothDamp(this.height,h,sd,"height",0.07,dt);
    this.height=Math.min(this.height,h+0.01);
    this.pelvisPos=pelvisXZ.clone();this.pelvisPos.y=this.height;

    const breath=Math.sin(time*(moving?2.4+s01*2:1.5)+this.seed)*(moving?0.8+s01*1.5:1.2);
    const sideBend=-this.roll*0.9+(noise(time*0.2,this.seed+41)-0.5)*3;
    const chestYawNoise=(noise(time*0.5,this.seed+43)-0.5)*(moving?4:8);
    this.bump.multiplyScalar(Math.exp(-3.5*dt));
    const bF=this.bump.dot(fwd)*28,bR=this.bump.dot(right)*28;
    this.pelvisRot=frame(this.yaw,this.lean*0.3+bF*0.3,this.twist,this.roll+this.turnRoll*0.5-bR*0.3);
    if(this.swim){ // à plat ventre quand on nage, debout dans l'eau à l'arrêt
      this.swimK=lerp(this.swimK||0,clamp01((this.speed-0.2)/0.9),1-Math.exp(-3*dt));const K=this.swimK;
      this.lean=lerp(4,66,K);this.pelvisRot=frame(this.yaw,this.lean*0.95,0,Math.sin(time*2.4)*4*K);
      this.pelvisPos.y=WATER_Y-lerp(0.98,0.3,K)+Math.sin(time*1.6+this.seed)*0.03-(this.swim.dive||0)*0.8;this.height=this.pelvisPos.y;
      this.headNod=-this.lean*0.85;this.swimArms(time);
    }else if(this.fly){ // en vol : à plat ventre quand on file, debout en vol stationnaire
      this.swimK=lerp(this.swimK||0,clamp01((this.speed-1)/5),1-Math.exp(-3*dt));const K=this.swimK;
      this.lean=lerp(3,72,K);this.pelvisRot=frame(this.yaw,this.lean*0.95,0,this.turnRoll*1.5);
      this.pelvisPos.y=this.root.y+lerp(1.0,0.6,K)+Math.sin(time*1.8+this.seed)*0.06;this.height=this.pelvisPos.y;
      this.headNod=-this.lean*0.8;this.flyArms();
    }
    this.flinchLean*=Math.exp(-5*dt);this.flinchHead*=Math.exp(-6*dt);
    this.chestRot=frame(this.yaw,this.lean*1.1+st.slouch+breath+bF+(this.reactLean||0)+this.flinchLean+(this.crouchK||0)*40,-this.twist*P.chestCounter+chestYawNoise,this.turnRoll+sideBend-bR);
    const look=clamp(this.yawVel*0.1,-25,25),gl=this.glance;
    const nY=(noise(time*0.4,this.seed+11)-0.5)*(moving?6:14),nP=(noise(time*0.35,this.seed+17)-0.5)*7;
    let lY=0,lP=0;
    if(this.lookAt&&this.lookW>0){
      const tgt=this.lookAt.pelvisPos.clone().add(new V3(0,this.lookAt.LEG*0.75,0)),me=this.pelvisPos.clone().add(new V3(0,this.LEG*0.8,0));
      const d=new V3().subVectors(tgt,me);
      lY=clamp(deltaAngle(this.yaw,Math.atan2(d.x,-d.z)/D2R),-75,75)*this.lookW;
      lP=clamp(-Math.atan2(d.y,Math.hypot(d.x,d.z))/D2R,-25,25)*this.lookW;
    }
    const glW=1-(this.lookW||0);
    if(this.fightTarget&&!this.lookAt){this.lookAt=this.fightTarget;this.lookW=1;this._fl=true;}
    if(this._fl){this.lookAt=null;this.lookW=0;this._fl=false;}
    this.headRot=frame(this.yaw,-this.lean*0.8-st.slouch*0.6+nP*glW+gl.pitch*glW+this.nod-1+lP+(this.headNod||0)+this.flinchHead,look+(nY+gl.yaw)*glW+this.twist*0.4+lY+(this.headShake||0),-this.turnRoll*0.4-sideBend*0.5+g.headTilt+(this.headTiltX||0));

    for(const arm of this.arms){
      const opp=arm.side<0?R:L;
      const amp=P.armSwingPerM*(0.55+s01*0.7)*st.arm*arm.amp;
      let tgt=clamp(new V3().subVectors(opp.footPos,this.pelvisPos).dot(fwd)*amp,-45,55);
      tgt+=(noise(time*0.6,this.seed+51+arm.side*7)-0.5)*(moving?8:5);
      if(!moving)tgt=(noise(time*0.3,this.seed+23+arm.side)-0.5)*7+breath*0.6;
      arm.swing=smoothDamp(arm.swing,tgt,arm.sv,"v",0.08,dt);
      arm.bend=lerp(12,85,s01*s01)+Math.max(0,arm.swing)*0.35+arm.bendBias+(noise(time*0.25,this.seed+61+arm.side)-0.5)*10;
      arm.out=7+s01*4+(noise(time*0.3,this.seed+71+arm.side)-0.5)*5;
    }
  }

  // ---------------------------------------------------------- pose du squelette
  pose(){
    const rig=this.rig,{b,rest}=rig,P=this.P;
    const delta=q=>q.clone().multiply(rig.RestInv);
    const dP=delta(this.pelvisRot),dC=delta(this.chestRot),dH=delta(this.headRot);
    const hipsWorld=this.pelvisPos.clone().add(rig.hipsOffset.clone().applyQuaternion(dP));
    b.Hips.parent.updateWorldMatrix(true,false);
    b.Hips.position.copy(b.Hips.parent.worldToLocal(hipsWorld));
    setWorldQ(b.Hips,dP.clone().multiply(rest.Hips.q));
    setWorldQ(b.Spine,dP.clone().slerp(dC,0.35).multiply(rest.Spine.q));
    setWorldQ(b.Spine1,dP.clone().slerp(dC,0.7).multiply(rest.Spine1.q));
    setWorldQ(b.Spine2,dC.clone().multiply(rest.Spine2.q));
    setWorldQ(b.Neck,dC.clone().slerp(dH,0.45).multiply(rest.Neck.q));
    setWorldQ(b.Head,dH.clone().multiply(rest.Head.q));
    const aim=(l,dir,hint)=>{const qb=basis(dir,hint).multiply(l.restBasis.clone().invert());setWorldQ(b[l.bone],qb.clone().multiply(l.restQ));return qb;};
    for(const leg of this.legs){
      const r=rig.legs[leg.side];
      const hip=wp(b[r.up.bone]);
      const ankleT=leg.footPos.clone().addScaledVector(UP,P.ankleHeight);
      const pole=local(this.pelvisRot,leg.side*0.12,0,1).add(local(leg.footRot,0,0,0.6));
      const s=solveTwoBone(hip,ankleT,P.thigh,P.shin,pole);
      aim(r.up,new V3().subVectors(s.knee,hip),pole);
      aim(r.lo,new V3().subVectors(s.end,s.knee),pole);
      leg._hip=hip;leg._knee=s.knee;
      setWorldQ(b[r.foot],delta(leg.footRot).multiply(rest[r.foot].q));
      const f=new V3(0,0,-1).applyQuaternion(leg.footRot),fy=Math.atan2(f.x,-f.z)/D2R;
      setWorldQ(b[r.toe],delta(leg.pitch>0?frame(fy,leg.pitch*0.2):leg.footRot).multiply(rest[r.toe].q));
      leg.dbg.visible=debug&&leg.stepping;
      if(leg.dbg.visible)leg.dbg.position.copy(leg.target).setY(0.03);
    }
    for(const arm of this.arms){
      const r=rig.arms[arm.side];
      const raise=(this.shrug||0)+(arm.raise||0);
      const zW=local(this.chestRot,0,0,-1);
      setWorldQ(b[r.sh],(raise?new Q().setFromAxisAngle(zW,arm.side*raise*D2R):new Q()).multiply(dC.clone().multiply(rest[r.sh].q)));
      const upD=new V3(0,-1,0).applyQuaternion(qAxis(AX,arm.swing).multiply(qAxis(AZ,arm.side*arm.out))).applyQuaternion(this.chestRot);
      const foD=new V3(0,-1,0).applyQuaternion(qAxis(AX,arm.swing+arm.bend).multiply(qAxis(AZ,arm.side*2))).applyQuaternion(this.chestRot);
      const hint=local(this.chestRot,arm.side*0.15,0,1);
      if(arm.ik>0.001){
        // assis : la main se pose sur la cuisse
        const leg=arm.side<0?this.L:this.R,sh=wp(b[r.up.bone]);
        const tgt=new V3().lerpVectors(leg._hip,leg._knee,arm.thighPos||0.6).add(new V3(0,0.07*(this.LEG/0.91),0)).addScaledVector(rightOf(this.yaw),-arm.side*0.02);
        const ik=solveTwoBone(sh,tgt,P.upperArm,P.forearm,local(this.chestRot,arm.side*0.7,-0.2,-1));
        upD.lerp(new V3().subVectors(ik.knee,sh).normalize(),arm.ik).normalize();
        foD.lerp(new V3().subVectors(ik.end,ik.knee).normalize(),arm.ik).normalize();
      }
      let wrist=8;
      if(arm.rFn){
        // réaction (geste, doigt, poussée...) : IK vers une cible
        const sh=wp(b[r.up.bone]),rr=arm.rFn(this,sh,arm);
        if(rr&&rr.w>0.001){
          const ik=solveTwoBone(sh,rr.target,P.upperArm,P.forearm,rr.pole||local(this.chestRot,arm.side*0.8,-0.4,-0.6));
          upD.lerp(new V3().subVectors(ik.knee,sh).normalize(),rr.w).normalize();
          foD.lerp(new V3().subVectors(ik.end,ik.knee).normalize(),rr.w).normalize();
          wrist=lerp(8,rr.wrist??8,rr.w);
        }
      }
      aim(r.up,upD,hint);
      const qf=aim(r.lo,foD,hint);
      setWorldQ(b[r.hand],qf.clone().multiply(qAxis(AX,wrist)).multiply(rest[r.hand].q));
    }
  }
}



const KN={jab:"Jab",cross:"Direct",hook:"Crochet",upper:"Uppercut",low:"Pied bas",front:"Pied de face",high:"Pied circulaire"},ZN={head:"visage",chest:"torse",belly:"ventre",legs:"jambes"};
