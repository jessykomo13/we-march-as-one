// ================================================================ ambulanciers (module 6)
class MedicBrain{
  constructor(){this.goal=null;this.face=null;this.crouch=0;this.reach=null;}
  update(w,dt){
    w.faceYaw=null;w.run=false;w.speedMul=0.9;
    if(this.goal){const to=new V3().subVectors(this.goal,w.root);to.y=0;const d=to.length();
      if(d>0.15){const dir=to.divideScalar(d);dir.add(avoidObstacles(w.root,dir).multiplyScalar(0.5));if(dir.length()>1)dir.normalize();w.wish.copy(dir).multiplyScalar(Math.min(1,d/0.7+0.2));}else w.wish.set(0,0,0);}
    else w.wish.set(0,0,0);
    if(this.face&&w.wish.lengthSq()<0.05){const tf=new V3().subVectors(this.face,w.root);if(tf.lengthSq()>0.01)w.faceYaw=Math.atan2(tf.x,-tf.z)/D2R;}
    w.crouchK=lerp(w.crouchK||0,this.crouch,1-Math.exp(-4*dt));
    if(this.reach){const R=this.reach;for(const a of w.arms)a.rFn=(ww,sh,arm)=>({target:R.clone().addScaledVector(rightOf(ww.yaw),arm.side*0.12),w:1,wrist:-40});}
    else for(const a of w.arms)a.rFn=null;
  }
  bumped(){}
}
function medicLook(){const p=randomPerson(Math.random);Object.assign(p,{top:"long",topColor:"#2f7a52",jacket:null,bottom:"pants",bottomColor:"#2b6e4a",shoes:["#111113","#111113"],boots:true,glasses:null,age:p.age==="senior"?"adult":p.age});return p;}
function spawnMedics(V){
  const g=V.v.g,f=vanForward(V),side=new V3(f.z,0,-f.x),rear=g.position.clone().addScaledVector(f,-2.9);
  V.medics=[-1,1].map(sd=>{const p=rear.clone().addScaledVector(side,sd*0.55);
    const ml=medicLook(),m=new Walker(buildRig(makeHuman(ml)),new MedicBrain(),p,(-V.yaw*180/Math.PI)+180);m.isMedic=true;m.noClamp=true;m.look=JSON.parse(JSON.stringify(ml));walkers.push(m);return m;});
  V.side=side;V.rear=rear;
}
// sirène deux tons « pin-pon »
let pinpon=null;
function updatePinpon(){
  const c=actx;if(!c)return;
  if(!pinpon){try{const o=c.createOscillator(),g=c.createGain(),f=c.createBiquadFilter();o.type="square";f.type="lowpass";f.frequency.value=1800;o.connect(f).connect(g).connect(sirenOut());g.gain.value=0;o.start();pinpon={o,g};}catch(e){return;}}
  let near=99;for(const V of vans)if(V.state==="in"||V.state==="turn"||V.state==="leave")near=Math.min(near,hdist(V.v.g.position,player.root));
  pinpon.o.frequency.setValueAtTime(Math.floor(clockT*1.6)%2?435:580,c.currentTime);
  pinpon.g.gain.setTargetAtTime(voiceOn&&near<70?0.05*(1-near/70):0,c.currentTime,0.1);
}

