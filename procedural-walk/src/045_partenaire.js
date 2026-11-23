// ================================================================ partenaire d'entraînement (module 4)
let spar=null;
class SparBrain{
  constructor(){this.guardOn=false;this.next=rand(1,2);this.cd=rand(2,4);}
  update(w,dt){
    const to=new V3().subVectors(player.root,w.root);to.y=0;const d=to.length();
    w.faceYaw=Math.atan2(to.x,-to.z)/D2R;w.run=false;w.speedMul=0.7;
    // garde la bonne distance
    w.wish.copy(to).divideScalar(d||1).multiplyScalar(d>1.6?clamp((d-1.1)*0.8,0,1):d<0.7?-0.4:0);
    this.next-=dt;if(this.next<=0){this.guardOn=Math.random()<0.55;this.next=rand(1.2,3);}
    if(this.guardOn&&!w.atk)w.guardT=Math.max(w.guardT,0.25);
    this.cd-=dt;
    if(this.cd<=0&&d<1.15&&!w.atk&&!player.ko){this.cd=rand(2,4);w.power=0.4;w.startAttack("punch",player,isGuarding(player)?"belly":"head");}
  }
  onIncoming(w,att,a){if(this.guardOn)w.guardT=Math.max(w.guardT,a.dur+0.2);else if(Math.random()<0.12){const away=new V3().subVectors(w.root,att.root);away.y=0;w.vel.addScaledVector(away.normalize(),2);}}
  onHit(w){if(Math.random()<0.3)say(w,pick(["Bien !","Encore !","Pas mal.","Ouch, propre !"]),true);}
  bumped(){}
}
function toggleSpar(){
  if(spar){removeWalker(spar,true);spar=null;hudMsg("Partenaire d'entraînement parti");return;}
  const look=randomPerson(rng);Object.assign(look,{top:"tank",topColor:"#c8102e",jacket:null,bottom:"joggers",bottomColor:"#1c1d21",shoes:["#ecebe7","#ffffff"],boots:false,glasses:null,age:"young",muscle:0.8});
  const p=player.root.clone().addScaledVector(fwdOf(player.yaw),1.4);pushOutOfObstacles(p,0.4);
  spar=new Walker(buildRig(makeHuman(look)),new SparBrain(),p,player.yaw+180);
  spar.isSpar=true;spar.hand=1;walkers.push(spar);
  hudMsg("Partenaire d'entraînement : frappe-le, il se protège et riposte doucement");
}
const combatStats={tries:0,hits:0,taken:0};
const combatLog=[];
let hitStop=0;


