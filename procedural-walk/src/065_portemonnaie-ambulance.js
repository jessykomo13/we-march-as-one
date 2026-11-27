// ================================================================ porte-monnaie et ambulance
let money=0;
const wallets=[];
const walletMat=new THREE.MeshStandardMaterial({color:0x5a3a22,roughness:0.6});
const walletGeo=new THREE.BoxGeometry(0.12,0.025,0.09);
function dropWallet(w){
  if(w.walletDropped)return;w.walletDropped=true;
  const m=new THREE.Mesh(walletGeo,walletMat);m.castShadow=true;
  const p=w.pelvisPos.clone();m.position.copy(p);scene.add(m);
  wallets.push({m,v:new V3(rand(-1.2,1.2),rand(1.5,2.5),rand(-1.2,1.2)),spin:new V3(rand(-8,8),rand(-8,8),rand(-8,8)),amount:Math.round(rand(3,150)),rest:false,t:0});
}
function updateWallets(dt){
  for(let i=wallets.length-1;i>=0;i--){
    const W=wallets[i];W.t+=dt;
    if(!W.rest){
      W.v.y-=9.8*dt;W.m.position.addScaledVector(W.v,dt);W.m.rotation.x+=W.spin.x*dt;W.m.rotation.y+=W.spin.y*dt;W.m.rotation.z+=W.spin.z*dt;
      const fy=groundAt(W.m.position.x,W.m.position.z)+0.013;
      if(W.m.position.y<fy){W.m.position.y=fy;W.v.y*=-0.3;W.v.x*=0.6;W.v.z*=0.6;W.spin.multiplyScalar(0.5);
        if(Math.abs(W.v.y)<0.4){W.rest=true;W.m.rotation.x=0;W.m.rotation.z=0;}}
    }
    if(W.t>0.4&&!player.ko&&hdist(W.m.position,player.root)<0.65){
      money+=W.amount;moneyEl.textContent=money+" €";
      // voler un porte-monnaie devant quelqu'un = délit
      if(!W.bank){let src=null;
        if(walkers.some(w=>w.isCop&&!w.ko&&canSee(w,player,25,260)))src="cop";
        else if(cams.some(c=>camSees(c,player.root)))src="cctv";
        else{const wit=walkers.find(w=>w!==player&&!w.isCop&&!w.ko&&!w.isMedic&&w.brain.witness&&hdist(w.root,player.root)<9&&canSee(w,player,9,170));if(wit){src="witness";bark(wit,["Hé ! Il vole son portefeuille !","Au voleur !"],3);}}
        if(src)later(src==="cop"?0.1:rand(1.5,3),()=>reportCrime({pts:1,counted:0,sev:1,reported:false},"Vol d'un porte-monnaie",src));}
      const div=document.createElement("div");div.className="dmg";div.textContent="+"+W.amount+" €";div.style.color="#7dffa1";document.getElementById("bubbles").appendChild(div);
      floats.push({w:player,div,t:0,base:wp(player.rig.b.Head).add(new V3(0,0.25,0))});
      playCoin();scene.remove(W.m);wallets.splice(i,1);
    }
  }
}
function playCoin(){const c=actx;if(!c)return;try{[0,0.08].forEach((d,i)=>{const o=c.createOscillator(),g=c.createGain();o.type="triangle";o.frequency.value=i?1568:1175;g.gain.setValueAtTime(0.0001,c.currentTime+d);g.gain.exponentialRampToValueAtTime(0.25,c.currentTime+d+0.01);g.gain.exponentialRampToValueAtTime(0.0001,c.currentTime+d+0.25);o.connect(g).connect(sfxOut());o.start(c.currentTime+d);o.stop(c.currentTime+d+0.3);});}catch(e){}}

// ---- modèle d'ambulance
function textTex(txt,w,h,bg,fg,font){const c=document.createElement("canvas");c.width=w;c.height=h;const g=c.getContext("2d");g.fillStyle=bg;g.fillRect(0,0,w,h);g.fillStyle=fg;g.font=font;g.textAlign="center";g.textBaseline="middle";g.fillText(txt,w/2,h/2);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;}
const AMB={
  white:new THREE.MeshStandardMaterial({color:0xf4f4f2,roughness:0.35,metalness:0.15}),
  red:new THREE.MeshStandardMaterial({color:0xc8102e,roughness:0.4}),
  glass:new THREE.MeshStandardMaterial({color:0x1a2633,roughness:0.08,metalness:0.6}),
  tire:new THREE.MeshStandardMaterial({color:0x151515,roughness:0.9}),
  rim:new THREE.MeshStandardMaterial({color:0xaaaaaa,metalness:0.8,roughness:0.3}),
  dark:new THREE.MeshStandardMaterial({color:0x2a2c30,roughness:0.8}),
  blue:new THREE.MeshStandardMaterial({color:0x2255ff,emissive:0x2255ff,emissiveIntensity:0.2}),
  orange:new THREE.MeshStandardMaterial({color:0xf08a24,roughness:0.6}),
  side:new THREE.MeshStandardMaterial({map:textTex("AMBULANCE",512,96,"#f4f4f2","#c8102e","bold 72px sans-serif"),roughness:0.35,side:THREE.DoubleSide,polygonOffset:true,polygonOffsetFactor:-2}),
  light:new THREE.MeshStandardMaterial({color:0xfff6d0,emissive:0xfff0b0,emissiveIntensity:0.8}),
  rear:new THREE.MeshStandardMaterial({color:0xff2020,emissive:0xff1010,emissiveIntensity:0.5})
};
function buildAmbulance(){
  const g=new THREE.Group();
  const add=(geo,mat,x,y,z,par=g)=>{const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;par.add(m);return m;};
  const B=(a,b,c)=>new THREE.BoxGeometry(a,b,c);
  // caisse arrière (avant du véhicule = +Z)
  add(B(2.1,2.15,3.6),AMB.white,0,1.5,-0.75);
  add(B(2.12,0.28,3.62),AMB.red,0,1.15,-0.75);
  add(B(2.1,1.55,1.55),AMB.white,0,1.17,1.8);           // cabine
  add(B(2.04,0.7,0.05),AMB.glass,0,1.55,2.58).rotation.x=-0.25; // pare-brise
  for(const s of [-1,1])add(B(0.04,0.55,0.9),AMB.glass,s*1.06,1.55,1.85);
  add(B(2.1,0.55,0.6),AMB.white,0,0.75,2.7);              // capot
  add(B(2.12,0.12,0.1),AMB.dark,0,0.5,3.0);               // pare-chocs
  for(const s of [-1,1]){add(B(0.32,0.16,0.04),AMB.light,s*0.75,0.85,3.0);add(B(0.2,0.3,0.04),AMB.rear,s*0.85,0.95,-2.57);}
  for(const s of [-1,1]){const m=add(new THREE.PlaneGeometry(3.0,0.56),AMB.side,s*1.08,1.85,-0.75);m.rotation.y=s*Math.PI/2;m.castShadow=false;}
  // croix
  for(const s of [-1,1]){add(B(0.02,0.5,0.16),AMB.red,s*1.07,2.15,-2.0);add(B(0.02,0.16,0.5),AMB.red,s*1.07,2.15,-2.0);}
  // gyrophares
  const lights=[];
  for(const x of [-0.6,0.6]){lights.push(add(B(0.45,0.14,0.22),AMB.blue.clone(),x,2.66,0.9));}
  add(B(1.7,0.06,0.3),AMB.dark,0,2.6,0.9);
  // roues
  const wheels=[];
  for(const [x,z] of [[-0.98,1.9],[0.98,1.9],[-0.98,-1.6],[0.98,-1.6]]){
    const w=new THREE.Group();w.position.set(x,0.4,z);g.add(w);
    const t=add(new THREE.CylinderGeometry(0.4,0.4,0.28,22),AMB.tire,0,0,0,w);t.rotation.z=Math.PI/2;
    const r=add(new THREE.CylinderGeometry(0.22,0.22,0.3,14),AMB.rim,0,0,0,w);r.rotation.z=Math.PI/2;
    wheels.push(w);
  }
  add(B(2.06,0.08,3.4),AMB.dark,0,0.42,-0.75);  // plancher visible
  add(B(1.9,1.9,0.05),AMB.dark,0,1.5,0.95);     // intérieur
  // portes arrière (charnières)
  const doors=[];
  for(const s of [-1,1]){const p=new THREE.Group();p.position.set(s*1.05,1.5,-2.56);g.add(p);const d=add(B(1.04,2.1,0.05),AMB.white,-s*0.52,0,0,p);add(B(0.6,0.5,0.03),AMB.glass,-s*0.52,0.45,-0.03,p);doors.push({p,s});}
  // brancard
  const str=new THREE.Group();g.add(str);
  add(B(0.62,0.08,1.95),AMB.orange,0,0,0,str);add(B(0.56,0.04,1.85),new THREE.MeshStandardMaterial({color:0x3b6fb6,roughness:0.8}),0,0.06,0,str);
  for(const x of [-0.26,0.26])for(const z of [-0.8,0.8])add(B(0.04,0.55,0.04),AMB.rim,x,-0.3,z,str);
  str.position.set(0,0.95,-1.2);
  return {g,lights,wheels,doors,str};
}
const vans=[];
function onNpcDown(w){
  let caller=null,n=0;
  for(const o of walkers){
    if(n>=3||o===w||o===player||o.isCop||o.isMedic||o.isSpar||o.ko||!o.brain.startWatch||o.brain.watch||o.brain.fight||o.brain.flee||o.brain.cuffed||o.brain.surrender)continue;
    if(hdist(o.root,w.root)<11&&Math.random()<0.6){o.brain.startWatch(o,false,w);n++;if(!caller){caller=o;later(rand(1,2.5),()=>{if(!caller.ko&&caller.brain.watch){say(caller,pick(["Allô, les secours ? Il y a quelqu'un par terre !","Allô ? Envoyez une ambulance, vite !"]));showPhone(caller,true);caller.brain.watch.phoneUntil=clockT+4;}});}}
  }
  for(const o of walkers)if(o.brain.watch&&!o.ko&&hdist(o.root,w.root)<8)bark(o,["Ohhh ! Il est K.O. !","Appelez une ambulance !","Oh non, il bouge plus !","Ouuuh !"],4);
  dropWallet(w);
  later(rand(1.5,3.5),()=>{if(walkers.includes(w)&&w.ko)callAmbulance(w);});
}
function clearPath(p,d,len,margin){
  for(let s=0;s<len;s+=0.8){const q=p.clone().addScaledVector(d,s);if(Math.abs(q.x)>W_MAX||Math.abs(q.z)>W_MAX)return false;for(const o of obsAt(q))if(obstacleClosest(o,q).d<margin)return false;}
  return true;
}
function callAmbulance(w){
  if(w.resident||(typeof INT!=="undefined"&&INT.list.some(I=>inRoom(I,w.root,0.5))))return; // pas d'ambulance dans une maison
  const body=w.pelvisPos.clone();body.y=0;
  // on cherche une direction dégagée pour reculer jusqu'au corps
  let bestD=null,bestScore=-1;
  for(let i=0;i<24;i++){
    const a=i/24*Math.PI*2,d=new V3(Math.cos(a),0,Math.sin(a));
    const ok1=clearPath(body.clone().addScaledVector(d,1.6),d,9,1.4);
    const edge=PLATE-Math.max(Math.abs(body.x+d.x*9),Math.abs(body.z+d.z*9));
    const ok2=ok1&&clearPath(body.clone().addScaledVector(d,10),d,40,1.5);
    const score=(ok1?10:0)+(ok2?20:0)+Math.min(edge,5)*0.2+Math.random()*0.5;
    if(score>bestScore){bestScore=score;bestD=d;}
  }
  const d=bestD;
  const v=buildAmbulance();scene.add(v.g);
  // arrivée de loin, en marche avant, puis demi-tour et marche arrière jusqu'au corps
  const A=body.clone().addScaledVector(d,8.5);
  const start=A.clone().addScaledVector(d,40);
  v.g.position.copy(start);
  const yawIn=Math.atan2(-d.x,-d.z); // rotation.y pour regarder vers le corps (+Z local)
  v.g.rotation.y=yawIn;
  vans.push({v,w,body,d,A,S:body.clone().addScaledVector(d,3.05+w.LEG*0.0),state:"in",t:0,speed:0,yaw:yawIn,yawOut:Math.atan2(d.x,d.z),blink:0,wheelRot:0});
}
function vanForward(v){return new V3(Math.sin(v.yaw),0,Math.cos(v.yaw));}
function pushOutOfVan(V,w){
  const g=V.v.g,c=Math.cos(V.yaw),s=Math.sin(V.yaw);
  const cx=g.position.x+Math.sin(V.yaw)*0.4,cz=g.position.z+Math.cos(V.yaw)*0.4;
  const dx=w.root.x-cx,dz=w.root.z-cz;
  const lx=dx*c-dz*s,lz=dx*s+dz*c; // repère local (x côté, z avant)
  const hx=1.08+w.radius,hz=2.75+w.radius;
  if(Math.abs(lx)<hx&&Math.abs(lz)<hz){
    const px=hx-Math.abs(lx),pz=hz-Math.abs(lz);
    let nlx=0,nlz=0;if(px<pz)nlx=Math.sign(lx)*px;else nlz=Math.sign(lz)*pz;
    w.root.x+=nlx*c+nlz*s;w.root.z+=-nlx*s+nlz*c;
  }
}
function pushOutOfCar(C,w){
  const g=C.g,c=Math.cos(C.yaw),s=Math.sin(C.yaw),dx=w.root.x-g.position.x,dz=w.root.z-g.position.z;
  const lx=dx*c-dz*s,lz=dx*s+dz*c,hx=C.hx+w.radius,hz=C.hz+w.radius;
  if(Math.abs(lx)<hx&&Math.abs(lz)<hz){const px=hx-Math.abs(lx),pz=hz-Math.abs(lz);let nlx=0,nlz=0;if(px<pz)nlx=Math.sign(lx)*px;else nlz=Math.sign(lz)*pz;w.root.x+=nlx*c+nlz*s;w.root.z+=-nlx*s+nlz*c;}
}
function updateVans(dt){
  for(let i=vans.length-1;i>=0;i--){
    const V=vans[i],g=V.v.g;V.t+=dt;V.blink+=dt;
    const on=Math.floor(V.blink*6)%2===0;
    V.v.lights.forEach((l,j)=>{l.material.emissiveIntensity=((j%2===0)===on)?3:0.2;});
    let mv=0;
    const drive=(target,dir,maxSp)=>{ // dir +1 avant, -1 arrière
      const to=new V3().subVectors(target,g.position);to.y=0;const d=to.length();
      const want=Math.min(maxSp,Math.sqrt(2*3.5*Math.max(0,d-0.05)));
      V.speed=lerp(V.speed,want,1-Math.exp(-2.5*dt));
      const step=Math.min(d,V.speed*dt);if(d>1e-4)g.position.addScaledVector(to.divideScalar(d),step);
      mv=step*dir;return d<0.08;
    };
    if(V.state==="in"){if(drive(V.A,1,11)){V.state="turn";V.t=0;V.speed=0;}}
    else if(V.state==="turn"){
      // demi-tour en arc
      const k=sst(0,2.6,V.t);if(V.yawIn0===undefined){V.yawIn0=V.yaw;V.turnDelta=Math.PI;}
      V.yaw=V.yawIn0+V.turnDelta*k;
      const side=new V3(-V.d.z,0,V.d.x);g.position.copy(V.A).addScaledVector(side,Math.sin(k*Math.PI)*2.2).addScaledVector(V.d,Math.sin(k*Math.PI)*0.8);
      mv=dt*2;if(V.t>2.6){V.yaw=V.yawOut;V.state="back";V.t=0;}
    }
    else if(V.state==="back"){if(drive(V.S,-1,2.2)){V.state="open";V.t=0;}}
    else if(V.state==="open"){const k=sst(0,0.9,V.t);V.v.doors.forEach(d=>d.p.rotation.y=d.s*k*1.9);if(V.t>1){V.state="medics";V.t=0;spawnMedics(V);}}
    else if(V.state==="medics"){
      // les ambulanciers vont au blessé, s'agenouillent, prennent le pouls
      const B=V.w.pelvisPos.clone();B.y=0;
      V.medics.forEach((m,i)=>{const b=m.brain;b.goal=B.clone().addScaledVector(V.side,(i?1:-1)*0.72);b.face=B.clone();});
      const arrived=V.medics.every(m=>hdist(m.root,m.brain.goal)<0.3);
      if(arrived||V.t>9){V.state="kneel";V.t=0;}
    }
    else if(V.state==="kneel"){
      const B=V.w.pelvisPos.clone();
      V.medics.forEach((m,i)=>{m.brain.crouch=1;m.brain.reach=V.t>0.6?(i?wp(V.w.rig.b.Neck):wp(V.w.rig.b.Spine2)):null;});
      if(!V.said&&V.t>1){V.said=true;say(V.medics[0],pick(["Il respire encore.","Pouls faible, on l'emmène !","Monsieur, vous m'entendez ?"]));}
      if(V.t>2.6){V.state="out";V.t=0;V.medics.forEach(m=>{m.brain.crouch=0;m.brain.reach=null;});}
    }
    else if(V.state==="out"){
      const k=sst(0,1.2,V.t);
      const loc=new V3(0,lerp(0.95,0.6,k),lerp(-1.2,-3.25,k));V.v.str.position.copy(loc);
      const sw=V.v.str.localToWorld(new V3(0,0,0.4));sw.y=0;
      if(V.medics)V.medics.forEach((m,i)=>{m.brain.goal=sw.clone().addScaledVector(V.side,(i?1:-1)*0.6);m.brain.face=sw.clone();});
      if(V.t>1.3){V.state="load";V.t=0;V.w.ko.carry={pos:new V3(),yaw:0,from:V.w.pelvisPos.clone()};}
    }
    else if(V.state==="load"||V.state==="in2"){
      const k=V.state==="load"?sst(0,1.1,V.t):1;
      const strW=V.v.str.localToWorld(new V3(0,0.12+0.1*(V.w.LEG/0.91),0.35));
      const c=V.w.ko.carry;c.yaw=-V.yaw*180/Math.PI; // tête vers l'avant du brancard... pieds vers la porte
      c.pos.copy(c.from).lerp(strW,k);c.pos.y=lerp(c.from.y,strW.y,k)+Math.sin(k*Math.PI)*0.25;
      if(V.medics)V.medics.forEach((m,i)=>{m.brain.reach=V.state==="load"?c.pos.clone():null;m.brain.crouch=V.state==="load"?0.45*Math.sin(Math.min(1,V.t)*Math.PI):0;if(V.state==="in2"){const sw=V.v.str.localToWorld(new V3(0,0,0.6));sw.y=0;m.brain.goal=sw.addScaledVector(V.side,(i?1:-1)*0.62);}});
      if(V.state==="load"&&V.t>1.2){V.state="in2";V.t=0;}
      if(V.state==="in2"){
        const k2=sst(0,1.4,V.t);V.v.str.position.set(0,lerp(0.6,0.95,k2),lerp(-3.25,-1.2,k2));
        if(V.t>1.5){V.state="close";V.t=0;removeWalker(V.w,V.w.isCop);if(V.w.isCop&&V.w.brain.car)V.w.brain.car.crew--;if(V.medics)V.medics.forEach(m=>removeWalker(m,true));V.medics=null;}
      }
    }
    else if(V.state==="close"){const k=1-sst(0,0.9,V.t);V.v.doors.forEach(d=>d.p.rotation.y=d.s*k*1.9);if(V.t>1){V.state="leave";V.t=0;V.speed=0;V.exit=g.position.clone().addScaledVector(vanForward(V),60);}}
    else if(V.state==="leave"){
      drive(V.exit,1,13);
      if(V.t>9){scene.remove(g);vans.splice(i,1);continue;}
    }
    g.rotation.y=V.yaw;
    V.wheelRot+=mv/0.4;V.v.wheels.forEach(w=>w.rotation.x=V.wheelRot);
  }
}
function removeWalker(w,noRespawn){
  dropSuspect(w);for(const o of walkers)if(o.brain&&o.brain.suspect===w)o.brain.suspect=null;
  if(w.sit&&w.sit.spot&&w.sit.spot.taken===w)w.sit.spot.taken=null;
  const i=walkers.indexOf(w);if(i<0)return;
  walkers.splice(i,1);scene.remove(w.rig.model);w.legs.forEach(l=>scene.remove(l.dbg));
  if(w.hpDiv)w.hpDiv.remove();
  for(const o of walkers){if(o.brain.fight&&o.brain.fight.target===w){o.brain.fight=null;o.fightTarget=null;}if(o.brain.leader===w)o.brain.leader=null;if(o.brain.followers)o.brain.followers=o.brain.followers.filter(f=>f!==w);}
  if(w.phone)w.phone.removeFromParent();

}
const respawns=[];
function updateRespawns(dt){
  for(let i=respawns.length-1;i>=0;i--){respawns[i]-=dt;if(respawns[i]<=0){respawns.splice(i,1);spawnMaybeGroup(true);}}
}


