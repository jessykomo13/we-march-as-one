// ================================================================ circulation sur l'autoroute A1
// Voitures sur 2 × 2 voies : elles gardent leurs distances, freinent et klaxonnent si quelqu'un est sur la route,
// et renversent ceux qui ne s'écartent pas. Elles n'existent que quand le joueur est près de l'autoroute.
// voies : décalage par rapport à l'axe et sens (+1 = vers la fin de l'autoroute)
const LANES4=[{o:-6.4,dir:1},{o:-2.4,dir:1},{o:2.4,dir:-1},{o:6.4,dir:-1}],LANES2=[{o:-2.5,dir:1},{o:2.5,dir:-1}];
const cars=[];
const SKIN_DRV=["#e8c1a0","#c68a62","#8d5a3b","#5a3a28","#f1d2b8"];
function lanesOf(H){return H.small?LANES2:LANES4;}
function carXZ(c){const L=hwyLine(c.H),l=lanesOf(c.H)[c.lane];return c.H.ax==="ns"?[L+l.o,c.s]:[c.s,L+l.o];}
function spawnCar(H,lane,s){
  const kind=Math.random()<0.1?"van":pickCarModel(Math.random(),H.ax==="ns"?hwyLine(H):s,H.ax==="ns"?s:hwyLine(H)),P=paintMat(carPaintHex(kind,Math.random())),l=lanesOf(H)[lane];
  const m=carMesh(P,kind,SKIN_DRV[Math.floor(Math.random()*SKIN_DRV.length)]);scene.add(m);
  const v0=rand(21,32)*(H.small?0.6:1)*(lane===0||lane===3?0.88:1);
  const c={m,H,lane,dir:l.dir,s,v:v0*0.9,v0,honkT:0,hitT:0,sight:Math.random()<0.22?24:70};
  cars.push(c);return c;
}
function removeCar(c){scene.remove(c.m);const i=cars.indexOf(c);if(i>=0)cars.splice(i,1);}
function hornSound(near){const c=actx;if(!c)return;try{const t=c.currentTime,g=c.createGain();g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(0.12*near,t+0.02);g.gain.setValueAtTime(0.12*near,t+0.45);g.gain.linearRampToValueAtTime(0,t+0.55);g.connect(sfxOut());
  for(const f of [392,494]){const o=c.createOscillator();o.type="sawtooth";o.frequency.value=f;const lp=c.createBiquadFilter();lp.type="lowpass";lp.frequency.value=1400;o.connect(lp).connect(g);o.start(t);o.stop(t+0.6);}}catch(e){}}
let carEngine=null;
function engineHum(){const c=actx;if(!c)return;if(!carEngine){try{const n=c.createBufferSource(),b=c.createBuffer(1,c.sampleRate*2,c.sampleRate),a=b.getChannelData(0);for(let i=0;i<a.length;i++)a[i]=Math.random()*2-1;n.buffer=b;n.loop=true;const f=c.createBiquadFilter();f.type="lowpass";f.frequency.value=380;const g=c.createGain();g.gain.value=0;n.connect(f).connect(g).connect(sfxOut());n.start();carEngine={g};}catch(e){return;}}
  let near=0;for(const car of cars){const d=Math.hypot(car.m.position.x-player.root.x,car.m.position.z-player.root.z);near=Math.max(near,clamp01(1-d/60)*car.v/30);}
  carEngine.g.gain.setTargetAtTime(near*0.25,c.currentTime,0.15);}
// la route est-elle « ouverte » à cet endroit (pas dans une ville, sur l'autoroute) ?
function hwyOpen(H,s){const L=hwyLine(H),x=H.ax==="ns"?L:s,z=H.ax==="ns"?s:L;return !inGridArea(x,z);}
function updateTraffic(dt){
  const px=player.root.x,pz=player.root.z;
  // autoroutes proches du joueur (au plus 2)
  const near=HWYS.map(H=>[H,hwyDist(px,pz,H)]).filter(([H,d])=>d<320).sort((a,b)=>a[1]-b[1]).slice(0,2).map(a=>a[0]);
  for(const c of [...cars])if(!near.includes(c.H))removeCar(c);
  if(!near.length){if(carEngine)carEngine.g.gain.value=0;return;}
  for(const H of near){const [a,b]=hwyRange(H),ps=H.ax==="ns"?pz:px,nl=lanesOf(H).length,per=H.small?2:4;
    for(let l=0;l<nl;l++){const inLane=cars.filter(c=>c.H===H&&c.lane===l);
      if(inLane.length<per){const dir=lanesOf(H)[l].dir;let s=ps-dir*rand(140,260);s=clamp(s,a+5,b-5);
        if(hwyOpen(H,s)&&inLane.every(c=>Math.abs(c.s-s)>30)&&Math.abs(s-ps)>60)spawnCar(H,l,s);}}}
  for(const c of [...cars]){
    const H=c.H,l=lanesOf(H)[c.lane],ns=H.ax==="ns",laneC=hwyLine(H)+l.o;
    let gap=999;
    for(const o of cars)if(o!==c&&o.H===H&&o.lane===c.lane){const d=(o.s-c.s)*c.dir;if(d>0&&d<gap)gap=d-4.6;}
    let pedAhead=null;
    for(const w of walkers){if(w.ko&&!w.ko.getUp)continue;const wo=ns?w.root.x:w.root.z,ws=ns?w.root.z:w.root.x;if(Math.abs(wo-laneC)>1.9)continue;const d=(ws-c.s)*c.dir;if(d>-1&&d<c.sight&&d<gap+4){gap=Math.max(0,d-3.2);pedAhead=w;}}
    if(typeof vehicleAhead==="function"){const vd=vehicleAhead(c,laneC,ns);if(vd<gap)gap=vd;}
    const sStar=4+c.v*1.1+c.v*c.v/(2*Math.sqrt(1.6*6));
    let a=1.6*(1-Math.pow(c.v/c.v0,4)-Math.pow(sStar/Math.max(0.5,gap),2));
    a=Math.max(a,-9);c.v=Math.max(0,c.v+a*dt);c.s+=c.v*c.dir*dt;
    const ps=ns?pz:px;
    if(pedAhead&&gap<45&&c.v>4){c.honkT-=dt;if(c.honkT<=0){c.honkT=rand(1.2,2.4);hornSound(clamp01(1-Math.abs(c.s-ps)/80));if(pedAhead===player&&Math.random()<0.5)hudMsg(pick(["Pouet ! Dégage de la route !","Klaxon ! Sors de l'autoroute !"]));}}
    const [x,z]=carXZ(c),y=groundAt(x,z),y2=groundAt(ns?x:x+c.dir*2,ns?z+c.dir*2:z);
    c.m.position.set(x,y,z);c.m.rotation.set(0,ns?(c.dir>0?0:Math.PI):(c.dir>0?Math.PI/2:-Math.PI/2),0);c.m.rotateX(-Math.atan2(y2-y,2)-clamp(a,-9,3)*0.004);
    for(const w of walkers){if(w.ko||c.hitT>0)continue;const dx=(ns?w.root.x-x:w.root.z-z),dz=(ns?w.root.z-z:w.root.x-x)*c.dir;
      if(Math.abs(dx)<1.15&&dz>-2.3&&dz<2.5&&c.v>2.5&&Math.abs(w.root.y-y)<1.5){
        c.hitT=1.5;const dir=ns?new V3(Math.sign(dx||1)*0.6,0,c.dir).normalize():new V3(c.dir,0,Math.sign(dx||1)*0.6).normalize();const dmg=Math.round(c.v*2.6);
        w.hp=Math.max(0,w.hp-dmg);w.lastHurt=clockT;w.vel.addScaledVector(dir,Math.min(9,c.v*0.35));
        w.startKO(dir,w,{getUp:w.hp>0?2.6:undefined,fast:true});playSound("thud",1);if(w===player){rumble(400,1);floatText(w,"Renversé ! -"+dmg,"#ff8a6b");}
        c.v*=0.35;break;}}
    c.hitT=Math.max(0,c.hitT-dt);
    const [ra,rb]=hwyRange(H);
    if(c.s<ra-2||c.s>rb+2||Math.abs(c.s-ps)>420||(!hwyOpen(H,c.s+c.dir*6)&&Math.abs(c.s-ps)>50))removeCar(c);
  }
  engineHum();
}
