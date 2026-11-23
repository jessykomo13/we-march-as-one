// ================================================================ population
const PLAYER_LOOK={sex:"m",height:1.8,build:1.0,skin:"#e3ac88",eyes:"#3b2414",hairColor:"#2e1f16",hair:"quiff",beard:"stubble",glasses:"clear",
  top:"tee",topColor:"#f2f2ef",jacket:"#2c4848",bottom:"jeans",bottomColor:"#86a3c4",cuffs:true,shoes:["#8a5a33","#3a2818"],boots:true,seed:7};
let rng=mulberry((Math.random()*1e9)|0);
const player=new Walker(buildRig(makeHuman(PLAYER_LOOK)),new PlayerBrain(),new V3(0,0,0),0,true);
player.gait.cadence=1;player.gait.stride=1;
walkers.push(player);
let npcTarget=(()=>{const v=parseInt(new URLSearchParams(location.search).get("npc"));return isNaN(v)?24:v;})();
const spawnQueue=[];
function queueNpcs(n){for(let i=0;i<n;i++)spawnQueue.push(1);}
// ---------------- collisions : on ne traverse ni les gens ni les obstacles, on bouscule
function resolveCollisions(){
  for(let it=0;it<2;it++){
    for(let i=0;i<walkers.length;i++)for(let j=i+1;j<walkers.length;j++){
      const a=walkers[i],b=walkers[j];
      const dx=b.root.x-a.root.x,dz=b.root.z-a.root.z,d=Math.hypot(dx,dz),min=a.radius+b.radius;
      if(d>=min||d<1e-5||a.ko||b.ko)continue;
      const ia=a.seatedLike?0:1/a.mass,ib=b.seatedLike?0:1/b.mass,sum=ia+ib;if(sum===0)continue;
      const nx=dx/d,nz=dz/d,over=min-d;
      a.root.x-=nx*over*ia/sum;a.root.z-=nz*over*ia/sum;
      b.root.x+=nx*over*ib/sum;b.root.z+=nz*over*ib/sum;
      if(it>0)continue;
      const vrel=(b.vel.x-a.vel.x)*nx+(b.vel.z-a.vel.z)*nz;
      if(vrel<0){
        const jimp=-(1.25)*vrel/sum;
        a.vel.x-=nx*jimp*ia;a.vel.z-=nz*jimp*ia;b.vel.x+=nx*jimp*ib;b.vel.z+=nz*jimp*ib;
        const str=Math.min(1,jimp*0.6);
        b.bump.add(new V3(nx,0,nz).multiplyScalar(str*ib));a.bump.add(new V3(-nx,0,-nz).multiplyScalar(str*ia));
        if(b.brain.bumped&&!b.seatedLike)b.brain.bumped(b,a,str);
        if(a.brain.bumped&&!a.seatedLike)a.brain.bumped(a,b,str);
      }
    }
    for(const w of walkers){
      if(w.seatedLike)continue;
      for(const v of vans)pushOutOfVan(v,w);
      for(const v of policeCars)pushOutOfCar(v,w);
      const before=w.root.clone();
      if(pushOutOfObstacles(w.root,w.radius)){
        const n=new V3().subVectors(w.root,before);n.y=0;const l=n.length();
        if(l>1e-6){n.divideScalar(l);const vn=w.vel.dot(n);if(vn<0)w.vel.addScaledVector(n,-vn);}
      }
    }
  }
}
function spawnOne(atEdge,asFollower){
  let pos;
  for(let i=0;i<30;i++){
    const a=Math.random()*Math.PI*2,r=atEdge?rand(32,50):3+Math.sqrt(Math.random())*36;
    pos=new V3(player.root.x+Math.cos(a)*r,0,player.root.z+Math.sin(a)*r);
    if(walkers.every(w=>hdist(w.root,pos)>1.6)&&chunkLoadedAt(pos)&&blockOf(pos.x,pos.z)&&publicOK(pos.x,pos.z)&&!onRelief(pos.x,pos.z,0.6)&&freeSpot(pos,0.7)){pos.ok=true;break;}
  }
  if(!pos.ok&&!asFollower)return null;   // aucun trottoir libre (campagne, mer) : personne n'apparaît au milieu de nulle part
  const look=randomPerson(rng);
  // centre d'affaires : beaucoup d'employés de bureau en costume / tailleur
  if(inCBD(chunkOf(pos.x),chunkOf(pos.z))&&look.age!=="senior"&&Math.random()<0.5){look.top="long";look.topColor=pick(["#f2f2ef","#dfe8f2","#e9e4da","#cfdcea"]);look.jacket=pick(["#1d1d1f","#30343f","#3a5372","#55595f"]);
    if(look.bottom!=="skirt"||Math.random()<0.5){look.bottom="pants";}look.bottomColor=look.jacket;look.shoes=["#1a1a1a","#0e0e0e"];look.boots=false;}
  if(inPop(chunkOf(pos.x),chunkOf(pos.z))){const B=["#e94f37","#f6bd60","#2a9d8f","#ef476f","#06d6a0","#ffd166","#118ab2","#ffffff","#f4a261","#e76f51"];
    look.topColor=pick(B);if(Math.random()<0.5){look.jacket=null;look.top=pick(["tee","tee","long"]);}if(Math.random()<0.4){look.bottom="shorts";look.bottomColor=pick(["#e8dcc4","#3a5a80","#f4f1ea","#2a2a2a"]);}}
  const nw=new Walker(buildRig(makeHuman(look)),new NpcBrain(),pos,rand(-180,180));nw.look=JSON.parse(JSON.stringify(look));
  if(asFollower){nw.root.copy(asFollower.root).addScaledVector(rightOf(asFollower.yaw),0.75*(asFollower.brain.followers.length+1)*(asFollower.brain.followers.length%2?-1:1));pushOutOfObstacles(nw.root,0.4);nw.yaw=nw.targetYaw=asFollower.yaw;nw.setRig(nw.rig,true);}
  if(look.age==="senior"){nw.voicePitchMul=0.85;nw.voiceRateMul=0.88;nw.gait.slouch+=6;nw.gait.lean+=3;nw.brain.pace*=0.78;nw.gait.cadence*=0.92;nw.gait.stride*=0.85;}
  if(look.age==="young")nw.brain.pace*=1.06;
  nw.hand=nw.brain.hand;nw.voicePitch=(look.sex==="f"?rand(1.15,1.45):rand(0.7,0.98))*(nw.voicePitchMul||1);nw.voiceRate=rand(1.0,1.25)*(nw.voiceRateMul||1)*(1+(nw.brain.temper-0.5)*0.15);
  walkers.push(nw);
  return nw;
}
// groupes d'amis / couples (2 ou 3 personnes)
function spawnMaybeGroup(atEdge,room=3){
  const L=spawnOne(atEdge);
  if(!L||room<2||Math.random()>0.32)return;
  L.brain.followers=[];
  const n=Math.min(room-1,Math.random()<0.7?1:2);
  for(let i=0;i<n;i++){
    const f=spawnOne(atEdge,L);if(!f)continue;
    f.brain.leader=L;f.brain.slot=i===0?1:-1;f.brain.pace=L.brain.pace;L.brain.followers.push(f);
  }
  L.brain.pace*=0.92;
}
// les passants trop loin du joueur disparaissent (un groupe part en entier) ; d'autres apparaissent plus près
const DESPAWN_R=72;
function despawnFar(){
  for(const w of [...walkers]){
    if(w===player||w.isMission||w.isCop||w.isSpar||w.isMedic||w.ko||w.brain.leader||w.brain.cuffed||suspects.includes(w)||!walkers.includes(w))continue;
    if(hdist(w.root,player.root)<DESPAWN_R)continue;
    for(const f of w.brain.followers||[])removeWalker(f,true);
    removeWalker(w,true);
  }
}
function removeNpcs(n){
  for(let i=0;i<n;i++){const w=[...walkers].reverse().find(x=>x!==player&&!x.isCop&&!x.isSpar&&!x.isMission&&!x.isHooper);if(!w)break;removeWalker(w,true);}
}


