// ================================================================ basket : on joue sur tous les terrains
// Un ballon par terrain. On le ramasse en marchant dessus, on dribble en se déplaçant,
// F / clic / X (manette) / « Tirer » (téléphone) pour shooter vers le panier le plus proche.
// Le ballon suit une vraie trajectoire : planche, cercle, rebonds au sol. 2 points, 3 points derrière 6,75 m.
const balls=[],hoops=[];
let hoopSink=null,courtSink=null;
const BALL_R=0.12;
const ballMat=new THREE.MeshStandardMaterial({roughness:0.7,map:canvasTex(128,64,(g,w,h)=>{g.fillStyle="#d8692a";g.fillRect(0,0,w,h);
  g.strokeStyle="#2a160c";g.lineWidth=2.5;g.beginPath();g.moveTo(0,h/2);g.lineTo(w,h/2);for(const x of [w/4,w*3/4]){g.moveTo(x,0);g.lineTo(x,h);}
  g.moveTo(w/2,0);g.bezierCurveTo(w*0.35,h*0.3,w*0.35,h*0.7,w/2,h);g.moveTo(0,0);g.bezierCurveTo(w*0.15,h*0.3,w*0.15,h*0.7,0,h);g.stroke();},false)});
const ballGeo=new THREE.SphereGeometry(BALL_R,18,12);
const netMat=new THREE.MeshBasicMaterial({color:0xf2f2f2,wireframe:true,transparent:true,opacity:0.7});
function registerHoop(rim,face,g){const h={rim:rim.clone(),f:new V3(Math.sin(face),0,Math.cos(face)),swish:0};
  const net=new THREE.Mesh(geo("net",()=>new THREE.CylinderGeometry(0.23,0.15,0.42,10,3,true)),netMat);net.position.copy(rim).add(new V3(0,-0.22,0));net.userData.keep=true;g.add(net);h.net=net;
  hoops.push(h);if(hoopSink)hoopSink.push(h);}
function registerCourt(x,z,w,d){if(courtSink)courtSink.push({x,z,w,d});}
function spawnBall(court,ch){
  const m=new THREE.Mesh(ballGeo,ballMat);m.castShadow=true;scene.add(m);
  const b={m,pos:new V3(court.x+rand(-2,2),groundAt(court.x,court.z)+BALL_R,court.z+rand(-2,2)),vel:new V3(),holder:null,court,ch,shotBy:null,shot:null,idle:0,cd:0,spin:new V3()};
  m.position.copy(b.pos);balls.push(b);ch.balls.push(b);return b;
}
function removeBall(b){const i=balls.indexOf(b);if(i>=0)balls.splice(i,1);scene.remove(b.m);if(b.holder)b.holder.ball=null;}
// --- score du joueur
const bstats={pts:0,made:0,shots:0,streak:0,lastT:-99};
const basketEl=document.getElementById("basket");
function basketHud(){
  const show=player.ball||clockT-bstats.lastT<12;
  basketEl.style.display=show?"block":"none";
  if(show)basketEl.innerHTML=`🏀 <b>${bstats.pts} pts</b> · ${bstats.made}/${bstats.shots} paniers${bstats.streak>1?` · série ${bstats.streak}`:""}<br><span>${isTouch()?"Tirer : bouton rouge · lâcher : S'asseoir":"F / clic : tirer · E : lâcher le ballon"}</span>`;
  const pb=document.getElementById("punchBtn");if(pb)pb.textContent=drive?"Klaxon":player.ball?"Tirer":"Poing";
}
function swishSound(made){const c=actx;if(!c)return;try{const d=0.25,buf=c.createBuffer(1,c.sampleRate*d,c.sampleRate),a=buf.getChannelData(0);for(let i=0;i<a.length;i++){const t=i/a.length;a[i]=(Math.random()*2-1)*Math.sin(t*Math.PI)*(made?0.5:0.25);}
  const s=c.createBufferSource(),f=c.createBiquadFilter();f.type="highpass";f.frequency.value=made?2500:900;s.buffer=buf;s.connect(f).connect(sfxOut());s.start();}catch(e){}}
function bounceSound(v){const c=actx;if(!c||v<0.8)return;try{const o=c.createOscillator(),g=c.createGain();o.frequency.setValueAtTime(130,c.currentTime);o.frequency.exponentialRampToValueAtTime(60,c.currentTime+0.12);g.gain.setValueAtTime(Math.min(0.35,v*0.05),c.currentTime);g.gain.exponentialRampToValueAtTime(0.001,c.currentTime+0.15);o.connect(g).connect(sfxOut());o.start();o.stop(c.currentTime+0.16);}catch(e){}}
// --- prendre / lâcher / dribbler
function handPos(w){const side=w.hand>0?"RightHand":"LeftHand";return w.rig.b[side]?wp(w.rig.b[side]):w.root.clone().add(new V3(0,1,0));}
function grabBall(w,b){if(b.holder||w.ball||w.ko)return false;b.holder=w;w.ball=b;b.shot=null;b.cd=0;if(w===player)bstats.lastT=clockT;return true;}
function dropBall(w,toss=1){const b=w.ball;if(!b)return;b.holder=null;w.ball=null;b.vel.copy(fwdOf(w.yaw)).multiplyScalar(1.5*toss).add(new V3(0,1.2*toss,0));b.cd=0.8;for(const a of w.arms)a.rFn=null;}
function dribble(w,b,dt){
  // le ballon rebondit entre la main et le sol au rythme des pas
  const H=handPos(w),f=fwdOf(w.yaw),r=rightOf(w.yaw),side=w.hand>0?1:-1;
  b.dribT=(b.dribT||0)+dt*(w.speed>0.3?2.4+w.speed*0.35:1.6);
  const ph=b.dribT%1,k=ph<0.5?ph*2:2-ph*2,e=k*k;           // 0 à la main, 1 au sol
  const gy=groundAt(w.root.x,w.root.z)+BALL_R,top=w.root.y+0.95;
  const base=w.root.clone().addScaledVector(f,0.45+Math.min(0.3,w.speed*0.08)).addScaledVector(r,side*0.28);
  b.pos.set(base.x,lerp(top,gy,e),base.z);
  if(ph>0.49&&ph<0.51+dt*2&&!b.bounced){bounceSound(3);b.bounced=true;}if(ph<0.3)b.bounced=false;
  const arm=w.arms[w.hand>0?1:0];
  arm.rFn=(ww,sh)=>({target:new V3(base.x,top+0.05-e*0.25,base.z),w:1,wrist:-35-e*20});
  b.m.rotation.x+=dt*8;
}
// --- tir
function nearestHoop(w,maxD=14){let best=null,bd=maxD;for(const h of hoops){const d=hdist(h.rim,w.root);const to=new V3().subVectors(h.rim,w.root);to.y=0;to.normalize();
  if(d<bd&&to.dot(h.f)<0.2){bd=d;best=h;}}return best;}
function shoot(w){
  const b=w.ball;if(!b||w.shooting)return false;
  const h=nearestHoop(w);
  w.shooting={t:0,h,b};w.run=false;
  if(h){const to=new V3().subVectors(h.rim,w.root);w.faceYaw=Math.atan2(to.x,-to.z)/D2R;}
  return true;
}
function updateShooting(w,dt){
  const S=w.shooting;if(!S)return;S.t+=dt;const b=S.b;
  const f=fwdOf(w.yaw),up=Math.min(1,S.t/0.32);
  if(S.h){const to=new V3().subVectors(S.h.rim,w.root);w.faceYaw=Math.atan2(to.x,-to.z)/D2R;}
  w.wish.set(0,0,0);w.crouchK=Math.max(w.crouchK||0,S.t<0.18?0.35*Math.sin(S.t/0.18*Math.PI/2):0);
  const hand=w.root.clone().addScaledVector(f,0.25).add(new V3(0,1.15+up*0.85,0));
  for(const a of w.arms)a.rFn=(ww,sh,arm)=>({target:hand.clone().addScaledVector(rightOf(ww.yaw),arm.side*0.12),w:1,wrist:-60+up*40});
  if(b.holder===w){b.pos.copy(hand).addScaledVector(f,0.12);}
  if(S.t>=0.34&&b.holder===w){
    // lâcher : trajectoire calculée vers le cercle, avec une erreur selon la distance et le mouvement
    b.holder=null;w.ball=null;b.cd=0.6;b.shotBy=w;
    const target=S.h?S.h.rim.clone().add(new V3(0,0.02,0)):b.pos.clone().addScaledVector(f,6).add(new V3(0,1,0));
    const d=hdist(target,b.pos),skill=w===player?1:w.skill||0.8;
    const err=(0.1+0.01*d+0.12*Math.min(2,w.speed))/skill;
    target.x+=rand(-1,1)*err;target.z+=rand(-1,1)*err;target.y+=rand(-0.5,1)*err*0.6;
    const T=0.62+d*0.075,dp=new V3().subVectors(target,b.pos);
    b.vel.set(dp.x/T,(dp.y+0.5*9.81*T*T)/T,dp.z/T);
    b.spin.set(-8,0,0);
    if(S.h)b.shot={h:S.h,three:hdist(S.h.rim,w.root)>6.75,by:w,above:false,scored:false};
    if(w===player){bstats.shots++;bstats.lastT=clockT;}
    playSound("whoosh",0.5);
  }
  if(S.t>0.6){w.shooting=null;w.faceYaw=null;for(const a of w.arms)a.rFn=null;}
}
// --- physique du ballon
function ballPhysics(b,dt){
  const steps=3,h=dt/steps;
  for(let s=0;s<steps;s++){
    b.vel.y-=9.81*h;b.pos.addScaledVector(b.vel,h);
    // panneau et cercle
    for(const H of (b.ch?b.ch.hoops:hoops)){
      const board=H.rim.clone().addScaledVector(H.f,-0.4);board.y+=0.3;
      const rel=new V3().subVectors(b.pos,board),n=rel.dot(H.f);
      if(Math.abs(n)<BALL_R&&Math.abs(rel.y)<0.5){const lat=rel.clone().addScaledVector(H.f,-n);lat.y=0;if(lat.length()<0.8){const vn=b.vel.dot(H.f);if(vn*Math.sign(n||1)<0){b.vel.addScaledVector(H.f,-1.6*vn);b.pos.addScaledVector(H.f,(BALL_R-Math.abs(n))*Math.sign(n||1));bounceSound(Math.abs(vn)*2);}}}
      // cercle : tore de rayon 0,23
      const dx=b.pos.x-H.rim.x,dz=b.pos.z-H.rim.z,rr=Math.hypot(dx,dz)||1e-6,cp=new V3(H.rim.x+dx/rr*0.23,H.rim.y,H.rim.z+dz/rr*0.23);
      const dv=new V3().subVectors(b.pos,cp),dl=dv.length();
      if(dl<BALL_R+0.02){dv.divideScalar(dl||1);const vn=b.vel.dot(dv);if(vn<0){b.vel.addScaledVector(dv,-1.5*vn);b.vel.multiplyScalar(0.85);b.pos.copy(cp).addScaledVector(dv,BALL_R+0.021);bounceSound(Math.abs(vn)*3);}}
      // panier : le ballon traverse le cercle vers le bas, au centre
      if(b.shot&&b.shot.h===H&&!b.shot.scored){
        if(b.pos.y>H.rim.y+0.05&&rr<0.6)b.shot.above=true;
        if(b.shot.above&&b.pos.y<H.rim.y-0.05&&rr<0.2&&b.vel.y<0){b.shot.scored=true;onScore(b,H);}
      }
    }
    // sol
    const gy=groundAt(b.pos.x,b.pos.z)+BALL_R;
    if(b.pos.y<gy){b.pos.y=gy;if(b.vel.y<-0.4){bounceSound(-b.vel.y);b.vel.y*=-0.72;b.vel.x*=0.9;b.vel.z*=0.9;}else{b.vel.y=0;b.vel.x*=Math.exp(-1.4*h);b.vel.z*=Math.exp(-1.4*h);}}
    // murs, grillages, bancs
    if(b.pos.y<gy+1.8){const p=b.pos.clone();if(pushOutOfObstacles(p,BALL_R)){const n=new V3(p.x-b.pos.x,0,p.z-b.pos.z).normalize();const vn=b.vel.dot(n);if(vn<0)b.vel.addScaledVector(n,-1.6*vn);b.pos.x=p.x;b.pos.z=p.z;}}
  }
  // les gens repoussent le ballon du pied
  for(const w of walkers){if(w.ko||b.pos.y>groundAt(b.pos.x,b.pos.z)+0.6)continue;const d=hdist(w.root,b.pos);if(d<0.35){const n=new V3(b.pos.x-w.root.x,0,b.pos.z-w.root.z).normalize();b.vel.addScaledVector(n,Math.max(0.6,w.speed));}}
  b.m.rotation.x+=b.vel.z*dt*4;b.m.rotation.z-=b.vel.x*dt*4;
}
function onScore(b,H){
  H.swish=1;swishSound(true);
  const by=b.shot.by,pts=b.shot.three?3:2;
  if(by===player){bstats.pts+=pts;bstats.made++;bstats.streak++;bstats.lastT=clockT;floatText(player,(pts===3?"Panier à 3 points ! +3":"Panier ! +2"),"#ffb347");
    for(const w of walkers)if(w!==player&&!w.isCop&&w.brain.pick&&hdist(w.root,player.root)<12&&Math.random()<0.35){bark(w,["Joli tir !","Bien joué !","Wow, propre !","Il a de la main !"],6);break;}}
  else if(by)floatText(by,"+"+pts,"#ffd9a0");
}
// --- passants qui jouent au basket
class HooperBrain{
  constructor(court){this.court=court;this.next=0;this.goal=null;this.retarget=0;}
  bumped(w,o){}
  update(w,dt){
    w.faceYaw=null;w.run=false;w.speedMul=0.95;const C=this.court;
    const ball=balls.find(b=>b.court===C);
    if(!ball){w.wish.set(0,0,0);return;}
    if(w.shooting){w.wish.set(0,0,0);return;}
    if(ball.holder===w){
      // dribble vers un spot de tir puis tire
      if(!this.goal||this.retarget<=0){const H=nearestHoop(w,40)||C.hoops?.[0];const a=rand(-1.2,1.2),d=rand(2.5,7.2);
        this.goal=H?H.rim.clone().addScaledVector(H.f,d).addScaledVector(new V3(H.f.z,0,-H.f.x),Math.sin(a)*d*0.7):new V3(C.x,0,C.z);this.goal.y=0;this.retarget=rand(2,5);}
      this.retarget-=dt;const to=new V3().subVectors(this.goal,w.root);to.y=0;const d=to.length();
      if(d<0.5||this.retarget<=0.2){w.wish.set(0,0,0);if(w.speed<0.3)shoot(w);}
      else{w.wish.copy(to.normalize().multiplyScalar(Math.min(1,d)));w.run=d>3;}
      return;
    }
    if(ball.holder&&ball.holder!==w){ // quelqu'un d'autre a le ballon : on regarde
      const to=new V3().subVectors(ball.holder.root,w.root);to.y=0;const d=to.length();w.faceYaw=Math.atan2(to.x,-to.z)/D2R;
      w.wish.copy(d>3?to.normalize().multiplyScalar(0.6):new V3());if(ball.holder===player&&Math.random()<dt*0.04)bark(w,["Fais une passe !","Allez, tire !","Je te prends en un contre un !"],15);return;}
    // aller chercher le ballon
    const to=new V3().subVectors(ball.pos,w.root);to.y=0;const d=to.length();
    if(ball.shot&&ball.vel.length()>2&&d>3){w.wish.set(0,0,0);w.faceYaw=Math.atan2(to.x,-to.z)/D2R;return;}
    w.wish.copy(to.normalize().multiplyScalar(Math.min(1,d)));w.run=d>2.5;
  }
}
// --- boucle
function updateBasket(dt){
  // ballons des terrains proches
  for(const ch of chunks.values()){if(!ch.courts||ch.balls.length)continue;const dd=Math.max(Math.abs(ch.cx-chunkOf(player.root.x)),Math.abs(ch.cz-chunkOf(player.root.z)));if(dd>1)continue;
    for(const c of ch.courts){c.hoops=ch.hoops;spawnBall(c,ch);
      if(Math.random()<0.7&&walkers.length<60){const p=new V3(c.x+rand(-3,3),0,c.z+rand(-3,3));const look=randomPerson(Math.random);look.top=pick(["tank","tee"]);look.bottom="shorts";look.jacket=null;
        const hw=new Walker(buildRig(makeHuman(look)),new HooperBrain(c),p,rand(-180,180));hw.look=look;hw.skill=rand(0.6,1.1);hw.isHooper=true;walkers.push(hw);ch.hoopers.push(hw);}}}
  for(const b of [...balls]){
    b.cd=Math.max(0,b.cd-dt);
    if(b.holder){if(b.holder.ko||!walkers.includes(b.holder)){dropBall(b.holder,0.4);continue;}if(!b.holder.shooting)dribble(b.holder,b,dt);b.m.position.copy(b.pos);continue;}
    ballPhysics(b,dt);b.m.position.copy(b.pos);
    if(b.shot&&b.vel.length()<1.5&&b.pos.y<groundAt(b.pos.x,b.pos.z)+0.3){if(b.shot.by===player&&!b.shot.scored)bstats.streak=0;b.shot=null;}
    // ramassage en passant dessus
    if(b.cd<=0&&b.pos.y<groundAt(b.pos.x,b.pos.z)+1.2)for(const w of walkers){if((w===player&&!w.ko&&!w.atk&&w.sit.state==="none"&&!loot)||w.isHooper){if(hdist(w.root,b.pos)<0.7&&!w.ball){grabBall(w,b);break;}}}
    // ballon perdu loin du terrain : il revient
    if(hdist(b.pos,b.court)>40){b.idle+=dt;if(b.idle>8){b.pos.set(b.court.x,groundAt(b.court.x,b.court.z)+1,b.court.z);b.vel.set(0,0,0);b.idle=0;}}else b.idle=0;
  }
  for(const w of walkers)if(w.shooting)updateShooting(w,dt);
  for(const H of hoops)if(H.net&&H.swish>0){H.swish=Math.max(0,H.swish-dt*2.5);H.net.scale.set(1,1+H.swish*0.35,1);H.net.rotation.y+=dt*H.swish*6;}
  basketHud();
}
function freeChunkBasket(ch){
  for(const b of [...(ch.balls||[])]){if(b.holder===player){b.ch=null;continue;}removeBall(b);}
  for(const w of ch.hoopers||[])if(walkers.includes(w))removeWalker(w,true);
  for(const h of ch.hoops||[]){const i=hoops.indexOf(h);if(i>=0)hoops.splice(i,1);}
}
