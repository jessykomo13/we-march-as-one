// ================================================================ MODULE 27 : circulation en ville
// Des voitures roulent dans les rues d'Azuria et de toutes les villes : voie de droite, feux respectés, virages aux
// carrefours, distance de sécurité, arrêt pour les piétons (et coup de klaxon), on peut les braquer quand elles sont
// arrêtées (E). Chaque voiture est un seul maillage (couleurs par sommet) : un seul appel de rendu.
const ccars=[];
const CC_COLS=["#c9ccd1","#1d1f24","#f2f2f0","#8a1f1f","#1f3e7a","#5a6a74","#c48a2a","#2d5e45","#a8b0b8","#6a2a4f","#e8d24a","#d86a2a"];
const CC_MAT=new THREE.MeshStandardMaterial({vertexColors:true,roughness:0.45,metalness:0.35});
const _cc=new THREE.Color();
function fastCar(col,kind){
  if(kind!=="bus")return fastModelCar(kind==="taxi"?"berline":carModelOf(kind),col,kind==="taxi");
  const parts=[],add=(w,h,d,x,y,z,c)=>{const g=new THREE.BoxGeometry(w,h,d).toNonIndexed();g.translate(x,y,z);g.deleteAttribute("uv");colorize(g,c);parts.push(g);};
  const L=10;add(2.5,2.4,L,0,1.6,0,col);add(2.52,0.9,L-1,0,2.1,0,"#22303c");add(2.4,0.2,L,0,2.85,0,"#e8e8e4");
  for(const [sx,sz] of [[-1.2,3.6],[1.2,3.6],[-1.2,-3.6],[1.2,-3.6]])add(0.24,0.9,0.9,sx,0.45,sz,"#151515");
  for(const sx of [-0.8,0.8]){add(0.3,0.14,0.05,sx,0.75,L/2+0.01,"#fff6d0");add(0.3,0.12,0.05,sx,0.75,-L/2-0.01,"#c81e1e");}
  const gm=mergeGeometries(parts);parts.forEach(p=>p.dispose());const m=new THREE.Mesh(gm,CC_MAT);m.castShadow=true;return m;
}
// grilles de rues (ville + bourgs) : nœud (i,j) = carrefour (i*40-16, j*40-16)
function ccGrid(i,j){for(const G of GRIDS)if(i>=G.i0&&i<=G.i1&&j>=G.j0&&j<=G.j1)return G;return null;}
function ccRight(ax,dir){return ax==="z"?[-dir,0]:[0,dir];}   // à droite du sens de marche (x est, z sud)
const LANE_O=1.15;
function ccPos(c){const [rx,rz]=ccRight(c.ax,c.dir);const L=c.L*40-16;return c.ax==="z"?[L+rx*LANE_O,c.s]:[c.s,L+rz*LANE_O];}
function spawnCityCar(){
  // un point de rue à 60-110 m du joueur, dans une ville
  for(let k=0;k<12;k++){const a=Math.random()*6.28,r=rand(55,110),x=player.root.x+Math.cos(a)*r,z=player.root.z+Math.sin(a)*r;
    const ax=Math.random()<0.5?"z":"x",L=Math.round(((ax==="z"?x:z)+16)/40),s=ax==="z"?z:x,n0=Math.floor((s+16)/40);
    const G=ccGrid(ax==="z"?L:n0,ax==="z"?n0:L);if(!G||!ccGrid(ax==="z"?L:n0+1,ax==="z"?n0+1:L))continue;
    const dir=Math.random()<0.5?1:-1,c={ax,L,dir,s,v:rand(6,10),v0:rand(10.5,14),yaw:0,honkT:0,hitT:0,stopT:0};
    const [px,pz]=ccPos(c);if(ccars.some(o=>Math.hypot(o.m.position.x-px,o.m.position.z-pz)<12))continue;
    if(drive&&Math.hypot(drive.x-px,drive.z-pz)<12)continue;
    const r2=Math.random(),kind=r2<0.06?"van":r2<0.14?"taxi":r2<0.18&&G.i1-G.i0>12?"bus":pickCarModel(Math.random(),px,pz);
    c.kind=kind;c.col=kind==="taxi"?"#f2c43a":kind==="bus"?"#2a7ab8":carPaintHex(carModelOf(kind),Math.random());c.m=fastCar(c.col,kind);if(kind==="bus")c.v0=9;
    scene.add(c.m);ccars.push(c);return c;}
  return null;
}
function removeCityCar(c){scene.remove(c.m);c.m.geometry.dispose();const i=ccars.indexOf(c);if(i>=0)ccars.splice(i,1);}
let ccCk=0;
function updateCityTraffic(dt){
  const px=player.root.x,pz=player.root.z,inside=inGridArea(px,pz)||gridDist(px,pz)<60;
  const want=inside?Math.round((isTouch()?6:10)*(1-0.35*clamp01((DAY.night-0.5)/0.4))):0;
  ccCk-=dt;if(ccCk<=0){ccCk=0.6;if(ccars.length<want)spawnCityCar();}
  for(const c of ccars.slice()){
    const [x0,z0]=ccPos(c);if(Math.hypot(x0-px,z0-pz)>150||!inside&&Math.hypot(x0-px,z0-pz)>60){removeCityCar(c);continue;}
    // prochain carrefour dans le sens de marche
    const nodeS=(Math.floor((c.s+16)/40)+(c.dir>0?1:0))*40-16,toNode=(nodeS-c.s)*c.dir;
    const ni=c.ax==="z"?c.L:Math.round((nodeS+16)/40),nj=c.ax==="z"?Math.round((nodeS+16)/40):c.L;
    let gap=999;
    // feu rouge : on s'arrête à la ligne (7 m avant le centre du carrefour)
    const sig=signal(ni,nj),st=c.ax==="z"?sig.ns:sig.ew;
    if((st==="r"||(st==="a"&&toNode>12))&&toNode>5.5)gap=Math.min(gap,toNode-7);
    // voiture devant (même voie)
    for(const o of ccars){if(o===c||o.ax!==c.ax||o.L!==c.L||o.dir!==c.dir)continue;const d=(o.s-c.s)*c.dir;if(d>0&&d<gap+6)gap=Math.min(gap,d-5.2-(o.kind==="bus"?3:0));}
    // voiture du joueur
    if(drive){const V=drive,[rx,rz]=ccRight(c.ax,c.dir),lane=c.L*40-16+(c.ax==="z"?rx:rz)*LANE_O,o=c.ax==="z"?V.x:V.z,s=c.ax==="z"?V.z:V.x;if(Math.abs(o-lane)<2.2){const d=(s-c.s)*c.dir;if(d>0)gap=Math.min(gap,d-5);}}
    // piétons devant
    let ped=null;for(const w of walkers){if(w.ko&&!w.ko.getUp)continue;const dx=w.root.x-x0,dz=w.root.z-z0,a=c.ax==="z"?dz*c.dir:dx*c.dir,b=c.ax==="z"?dx:dz;if(a>0&&a<14&&Math.abs(b)<1.6){gap=Math.min(gap,a-3.2);ped=w;}}
    const sStar=3+c.v*1.0+c.v*c.v/(2*Math.sqrt(1.4*5));let acc=1.4*(1-Math.pow(c.v/c.v0,4)-Math.pow(sStar/Math.max(0.3,gap),2));acc=Math.max(acc,-8);
    c.v=Math.max(0,c.v+acc*dt);
    if(ped&&c.v<1&&ped===player){c.honkT-=dt;if(c.honkT<=0){c.honkT=rand(2,4);hornSound(clamp01(1-Math.hypot(x0-px,z0-pz)/50));}}
    if(c.v<0.3)c.stopT+=dt;else c.stopT=0;
    const ds=c.v*c.dir*dt,ns=c.s+ds;
    // passage du carrefour : on choisit tout droit, à gauche ou à droite selon les rues qui existent
    if((nodeS-c.s)*c.dir>0&&(nodeS-ns)*c.dir<=0){
      const opts=[];const ahead=c.ax==="z"?[ni,nj+c.dir]:[ni+c.dir,nj];if(ccGrid(...ahead))opts.push(["straight"],["straight"]);
      for(const td of [-1,1]){const t2=c.ax==="z"?[ni+td,nj]:[ni,nj+td];if(ccGrid(...t2))opts.push(["turn",td]);}
      const ch=opts.length?pick(opts):["uturn"];
      if(ch[0]==="turn"){const td=ch[1],nax=c.ax==="z"?"x":"z";c.ax=nax;c.L=nax==="x"?nj:ni;c.dir=td;c.s=(nax==="x"?ni:nj)*40-16+td*0.01;continue;}
      if(ch[0]==="uturn"){c.dir*=-1;c.s=nodeS;continue;}
    }
    c.s=ns;
    const [x,z]=ccPos(c),y=groundAt(x,z);c.m.position.set(x,Math.max(0,y>0.3?y:0),z);
    const yawT=c.ax==="z"?(c.dir>0?0:Math.PI):(c.dir>0?Math.PI/2:-Math.PI/2);c.yaw=c.yaw+((((yawT-c.yaw)%(2*Math.PI))+3*Math.PI)%(2*Math.PI)-Math.PI)*(1-Math.exp(-8*dt));c.m.rotation.set(-acc*0.004,c.yaw,0,"YXZ");
    // choc avec un piéton qui n'a pas bougé
    if(c.v>3&&c.hitT<=0)for(const w of walkers){if(w.ko)continue;const dx=w.root.x-x,dz=w.root.z-z,a=c.ax==="z"?dz*c.dir:dx*c.dir,b=c.ax==="z"?dx:dz;
      if(a>-2.2&&a<2.4&&Math.abs(b)<1.1){c.hitT=1.5;const dir=new V3(Math.sign(b||1)*0.5*(c.ax==="z"?1:0)+(c.ax==="x"?c.dir:0),0,(c.ax==="z"?c.dir:0)+Math.sign(b||1)*0.5*(c.ax==="x"?1:0)).normalize();const dmg=Math.round(c.v*2.2);
        w.hp=Math.max(0,w.hp-dmg);w.lastHurt=clockT;w.startKO(dir,w,{getUp:w.hp>0?2.6:undefined,fast:true});playSound("thud",1);if(w===player){floatText(w,"Renversé ! -"+dmg,"#ff8a6b");rumble(300,1);}c.v*=0.3;break;}}
    c.hitT=Math.max(0,c.hitT-dt);
  }
}
// braquage : E près d'une voiture arrêtée
function tryCarjack(){
  if(drive||player.ko||player.swim)return false;
  let best=null,bd=3.4;for(const c of ccars){if(c.v>2.5||c.kind==="bus")continue;const d=hdist(c.m.position,player.root);if(d<bd){bd=d;best=c;}}
  if(!best)return false;
  const c=best,p=c.m.position,yawDeg=180-c.yaw/D2R;
  const V=makeVehicle(p.x,p.z,yawDeg,paintMat(c.col||"#8a1f1f"),c.kind==="taxi"?"taxi":c.kind);
  removeCityCar(c);V.stolen=true;enterVehicle(V);
  // le conducteur sort en criant
  const f=rightOf(yawDeg),pos=new V3(p.x-f.x*2.2,0,p.z-f.z*2.2);pushOutOfObstacles(pos,0.5);
  const look=randomPerson(rng);const w=spawnSpecial(look,new NpcBrain(),pos,yawDeg);w.isMission=false;say(w,pick(["Ma voiture !!","Au voleur !","Hé ! Rends-moi ça !"]));
  try{w.brain.react=makeReaction("gesture",w,player,w.brain.hand);}catch(e){}
  hudMsg("Braquage de voiture !");return true;
}
function nearStoppedCar(){for(const c of ccars)if(c.v<2.5&&c.kind!=="bus"&&hdist(c.m.position,player.root)<3.4)return true;return false;}
