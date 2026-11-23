// ================================================================ circulation sur l'autoroute A1
// Voitures sur 2 × 2 voies : elles gardent leurs distances, freinent et klaxonnent si quelqu'un est sur la route,
// et renversent ceux qui ne s'écartent pas. Elles n'existent que quand le joueur est près de l'autoroute.
const HWY_LANES=[{x:HWY_X-6.4,dir:1},{x:HWY_X-2.4,dir:1},{x:HWY_X+2.4,dir:-1},{x:HWY_X+6.4,dir:-1}];
const HWY_A=-598,HWY_B=-1058;   // bouts de l'autoroute (côté ville, côté Port-Soleil)
const cars=[];
const SKIN_DRV=["#e8c1a0","#c68a62","#8d5a3b","#5a3a28","#f1d2b8"];
function spawnCar(lane,z){
  const L=HWY_LANES[lane],P=CAR_PAINT[Math.floor(Math.random()*CAR_PAINT.length)],kind=Math.random()<0.12?"van":null;
  const m=carMesh(P,kind,SKIN_DRV[Math.floor(Math.random()*SKIN_DRV.length)]);m.rotation.y=L.dir>0?0:Math.PI;m.position.set(L.x,0,z);scene.add(m);
  const v0=rand(21,32)*(lane===0||lane===3?0.88:1);
  const c={m,lane,z,v:v0*0.9,v0,honkT:0,hitT:0,sight:Math.random()<0.22?24:70}; // certains conducteurs regardent leur téléphone…
  cars.push(c);return c;
}
function removeCar(c){scene.remove(c.m);const i=cars.indexOf(c);if(i>=0)cars.splice(i,1);}
function hornSound(near){const c=actx;if(!c)return;try{const t=c.currentTime,g=c.createGain();g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(0.12*near,t+0.02);g.gain.setValueAtTime(0.12*near,t+0.45);g.gain.linearRampToValueAtTime(0,t+0.55);g.connect(sfxOut());
  for(const f of [392,494]){const o=c.createOscillator();o.type="sawtooth";o.frequency.value=f;const lp=c.createBiquadFilter();lp.type="lowpass";lp.frequency.value=1400;o.connect(lp).connect(g);o.start(t);o.stop(t+0.6);}}catch(e){}}
let carEngine=null;
function engineHum(){const c=actx;if(!c)return;if(!carEngine){try{const n=c.createBufferSource(),b=c.createBuffer(1,c.sampleRate*2,c.sampleRate),a=b.getChannelData(0);for(let i=0;i<a.length;i++)a[i]=Math.random()*2-1;n.buffer=b;n.loop=true;const f=c.createBiquadFilter();f.type="lowpass";f.frequency.value=380;const g=c.createGain();g.gain.value=0;n.connect(f).connect(g).connect(sfxOut());n.start();carEngine={g};}catch(e){return;}}
  let near=0;for(const car of cars){const d=Math.hypot(car.m.position.x-player.root.x,car.m.position.z-player.root.z);near=Math.max(near,clamp01(1-d/60)*car.v/30);}
  carEngine.g.gain.setTargetAtTime(near*0.25,c.currentTime,0.15);}
function updateTraffic(dt){
  const px=player.root.x,pz=player.root.z,nearHwy=Math.abs(px-HWY_X)<320&&pz<-480&&pz>-1180;
  if(!nearHwy){for(const c of [...cars])removeCar(c);if(carEngine)carEngine.g.gain.value=0;return;}
  // garder 4 voitures par voie autour du joueur
  for(let l=0;l<4;l++){
    const inLane=cars.filter(c=>c.lane===l);
    if(inLane.length<4){const L=HWY_LANES[l];
      // on fait apparaître en amont, hors de vue si possible
      let z=L.dir>0?Math.max(HWY_B,pz-rand(140,260)):Math.min(HWY_A,pz+rand(140,260));
      if(L.dir>0&&z<HWY_B+5)z=HWY_B+5;if(L.dir<0&&z>HWY_A-5)z=HWY_A-5;
      if(inLane.every(c=>Math.abs(c.z-z)>30))spawnCar(l,z);}
  }
  for(const c of [...cars]){
    const L=HWY_LANES[c.lane];
    // véhicule de devant (même voie) ou piéton sur la voie
    let gap=999;
    for(const o of cars)if(o!==c&&o.lane===c.lane){const d=(o.z-c.z)*L.dir;if(d>0&&d<gap)gap=d-4.6;}
    let pedAhead=null;
    for(const w of walkers){if(w.ko&&!w.ko.getUp)continue;if(Math.abs(w.root.x-L.x)>1.9)continue;const d=(w.root.z-c.z)*L.dir;if(d>-1&&d<c.sight&&d<gap+4){gap=Math.max(0,d-3.2);pedAhead=w;}}
    // modèle de conduite (comme un vrai conducteur : accélère, garde ses distances, freine fort si besoin)
    const sStar=4+c.v*1.1+c.v*c.v/(2*Math.sqrt(1.6*6));
    let a=1.6*(1-Math.pow(c.v/c.v0,4)-Math.pow(sStar/Math.max(0.5,gap),2));
    a=Math.max(a,-9);c.v=Math.max(0,c.v+a*dt);c.z+=c.v*L.dir*dt;
    if(pedAhead&&gap<45&&c.v>4){c.honkT-=dt;if(c.honkT<=0){c.honkT=rand(1.2,2.4);hornSound(clamp01(1-Math.abs(c.z-pz)/80));if(pedAhead===player&&Math.random()<0.5)hudMsg(pick(["Pouet ! Dégage de la route !","Klaxon ! Sors de l'autoroute !"]));}}
    c.m.position.set(L.x,0,c.z);c.m.rotation.x=-clamp(a,-9,3)*0.004;
    // choc avec un piéton
    for(const w of walkers){if(w.ko||c.hitT>0)continue;const dx=w.root.x-L.x,dz=(w.root.z-c.z)*L.dir;
      if(Math.abs(dx)<1.15&&dz>-2.3&&dz<2.5&&c.v>2.5){
        c.hitT=1.5;const dir=new V3(Math.sign(dx||1)*0.6,0,L.dir).normalize();const dmg=Math.round(c.v*2.6);
        w.hp=Math.max(0,w.hp-dmg);w.lastHurt=clockT;w.vel.addScaledVector(dir,Math.min(9,c.v*0.35));
        w.startKO(dir,w,{getUp:w.hp>0?2.6:undefined,fast:true});playSound("thud",1);if(w===player){rumble(400,1);floatText(w,"Renversé ! -"+dmg,"#ff8a6b");}
        c.v*=0.35;break;}}
    c.hitT=Math.max(0,c.hitT-dt);
    // fin d'autoroute : la voiture sort
    if((L.dir>0&&c.z>HWY_A+2)||(L.dir<0&&c.z<HWY_B-2)||Math.abs(c.z-pz)>420)removeCar(c);
  }
  engineHum();
}
