// ================================================================ MODULE 29 : bateaux
// Vedettes au bord des plages, des îles, des lacs, des Cayos ; hydroglisseurs dans le bayou.
// On monte depuis la rive, un ponton… ou en nageant (E / « Piloter »). Mêmes commandes que la voiture.
// Le bateau s'arrête sur les hauts-fonds ; en descendant, on saute sur la terre la plus proche (sinon on nage).
const BOAT_PAINT=["#f4f4f2","#1f4fa0","#b3261e","#0e6b7a","#f2c43a"].map(c=>mat({color:c,roughness:0.35,metalness:0.1}));
function boatMesh(kind,k){
  const g=new THREE.Group(),hull=BOAT_PAINT[k%BOAT_PAINT.length];
  if(kind==="airboat"){
    put(BX(2.4,0.45,5.2),KM.chrome,0,0.12,0,g);put(BX(2.3,0.08,5.0),OM.wood,0,0.38,0,g);put(BX(0.9,0.9,0.9),KM.dark,0,0.85,-0.4,g);put(BX(0.8,1.6,0.1),KM.dark,0,1.3,-0.9,g);
    put(geo("fanCage",()=>new THREE.TorusGeometry(1.1,0.06,6,16)),KM.chrome,0,1.55,-2.1,g);const fan=new THREE.Group();fan.position.set(0,1.55,-2.0);g.add(fan);
    for(let i=0;i<2;i++){const b=put(BX(2,0.18,0.05),KM.dark,0,0,0,fan);b.rotation.z=i*Math.PI/2;}g.userData.fan=fan;return g;}
  const sh=new THREE.Shape([new THREE.Vector2(-1.1,-2.6),new THREE.Vector2(1.1,-2.6),new THREE.Vector2(1.15,1.2),new THREE.Vector2(0,3.1),new THREE.Vector2(-1.15,1.2)]);
  put(geo("spdHull",()=>{const e=new THREE.ExtrudeGeometry(sh,{depth:0.85,bevelEnabled:false});e.rotateX(-Math.PI/2);e.translate(0,-0.35,0);return e;}),hull,0,0,0,g);
  put(geo("spdBand",()=>{const e=new THREE.ExtrudeGeometry(sh,{depth:0.12,bevelEnabled:false});e.rotateX(-Math.PI/2);e.scale(1.02,1,1.01);e.translate(0,-0.12,0);return e;}),KM.blue,0,0,0,g);
  put(BX(2.0,0.05,3.6),OM.wood,0,0.52,-0.4,g);const ws=put(BX(1.9,0.55,0.06),KM.glass,0,0.85,0.75,g);ws.rotation.x=-0.5;
  put(BX(0.7,0.5,0.6),KM.white,0.35,0.75,0.2,g);for(const s of [-0.45,0.45])put(BX(0.7,0.35,0.7),KM.red,s,0.7,-0.8,g);
  put(BX(0.45,0.9,0.5),KM.dark,0,0.5,-2.85,g);put(BX(0.15,0.6,0.15),KM.dark,0,-0.1,-2.95,g);
  return g;
}
function makeBoat(x,z,yawDeg,kind,k=0){
  const m=boatMesh(kind,k);scene.add(m);m.traverse(o=>{if(o.isMesh)o.castShadow=true;});
  const head=driverDummy();head.position.set(0.35,0.05,-0.6);head.visible=false;m.add(head);
  const V={m,head,x,z,yaw:yawDeg,vel:new V3(),v:0,steer:0,y:WATER_Y-0.08,vy:0,kind,boat:true,hp:100,owned:true,lastUse:clockT,o:null,pitch:0,roll:0,sink:0,wakeT:0};
  V.o=addObstacle({type:"circle",x,z,r:1.5,veh:V});VEH.push(V);placeVehicle(V);return V;
}
const boatMinDepth=V=>V.kind==="airboat"?0.22:0.45;
function stepBoat(V,dt,inp){
  const f=fwdOf(V.yaw),r=rightOf(V.yaw);let vf=V.vel.dot(f),vl=V.vel.dot(r);
  const air=V.kind==="airboat",maxV=air?19:27,acc=air?6:8;
  if(inp.thr>0.05)vf+=acc*inp.thr*(1-clamp01(vf/maxV))*dt;else if(inp.thr<-0.05){vf=Math.max(-5,vf-(vf>0?9:3)*(-inp.thr)*dt);}
  vf-=vf*(inp.thr?0.12:0.55)*dt;
  V.steer=lerp(V.steer,inp.st,1-Math.exp(-5*dt));
  const yr=V.steer*(0.35+clamp01(Math.abs(vf)/8)*0.75)*(vf<-0.3?-1:1)*(inp.hand?1.5:1);V.yaw+=yr/D2R*dt;
  vl*=Math.exp(-(inp.hand?0.8:2.2)*dt);
  const f2=fwdOf(V.yaw),r2=rightOf(V.yaw);V.vel.copy(f2).multiplyScalar(vf).addScaledVector(r2,vl);V.v=vf;
  const nx=V.x+V.vel.x*dt,nz=V.z+V.vel.z*dt,ahead=waterDepth(nx+f2.x*2.4*Math.sign(vf||1),nz+f2.z*2.4*Math.sign(vf||1));
  if(ahead<boatMinDepth(V)||groundAt(nx,nz)>WATER_Y+0.05){if(Math.abs(vf)>4){playSound("thud",0.5);cam.shake=Math.min(1,cam.shake+0.2);}V.vel.multiplyScalar(-0.25);V.v=V.vel.dot(f2);}
  else{V.x=nx;V.z=nz;}
  for(const k of [0,2]){const p=new V3(V.x+f2.x*k,0,V.z+f2.z*k);for(const o of obsAt(p)){if(o.veh===V)continue;const c=obstacleClosest(o,p);if(c.d<1.2){V.x+=c.nx*(1.2-c.d);V.z+=c.nz*(1.2-c.d);const imp=-(V.vel.x*c.nx+V.vel.z*c.nz);if(imp>0){V.vel.x+=c.nx*imp*1.2;V.vel.z+=c.nz*imp*1.2;if(imp>4)playSound("thud",0.6);}}}}
  for(const w of walkers){if(w===player||w.ko)continue;const dx=w.root.x-V.x,dz=w.root.z-V.z;if(Math.hypot(dx,dz)<2.3&&Math.abs(V.v)>4){const dir=new V3(dx,0,dz).normalize();w.hp=Math.max(0,w.hp-15);w.startKO(dir,player,{getUp:2.6,fast:true});registerCrime(w,true);}}
  const sp=Math.abs(vf),t=clockT;
  V.y=WATER_Y-0.1+Math.sin(t*1.7+V.x*0.1)*0.05+clamp01(sp/18)*0.18;
  V.pitch=lerp(V.pitch,-clamp(vf*0.012,-0.04,0.16)+Math.sin(t*1.3)*0.02,1-Math.exp(-4*dt));V.roll=lerp(V.roll,-V.steer*clamp01(sp/10)*0.16+Math.sin(t*1.1)*0.02,1-Math.exp(-4*dt));
  placeVehicle(V);if(V.m.userData.fan)V.m.userData.fan.rotation.z+=dt*(6+sp*3);
  V.wakeT-=dt;if(sp>3&&V.wakeT<=0){V.wakeT=0.12;if(typeof ripple==="function")ripple(V.x-f2.x*2.6,V.z-f2.z*2.6,sp>12);}
}
// sortir du bateau : sur la terre la plus proche si elle est à portée, sinon à l'eau
function boatExitSpot(V){
  for(const R of [2.5,4,6,8])for(let a=0;a<16;a++){const x=V.x+Math.cos(a/16*Math.PI*2)*R,z=V.z+Math.sin(a/16*Math.PI*2)*R;if(waterDepth(x,z)<0.15&&groundAt(x,z)<WATER_Y+2.2){const q=new V3(x,0,z);pushOutOfObstacles(q,0.45);return q;}}
  return null;
}
// emplacements : quelques vedettes fixes, d'autres posées par les zones (hydroglisseurs du bayou)
const BOAT_SPOTS=[];
function addBoatSpot(x,z,yaw,kind){const k=carKey(x,z);if(BOAT_SPOTS.some(s=>s.k===k))return;BOAT_SPOTS.push({x,z,yaw,kind,k,V:null});}
{for(const z of [-230,60,470])addBoatSpot(602,z,90,"vedette");addBoatSpot(628,308,90,"vedette");addBoatSpot(662,-288,0,"vedette");
 addBoatSpot(632,-118,90,"vedette");addBoatSpot(930,300,180,"vedette");addBoatSpot(790,286,0,"vedette");addBoatSpot(1050,-232,0,"vedette");
 for(const L of LAKES)addBoatSpot(L.x,L.z+L.r*0.78,0,"vedette");
 for(const K of KEYS)addBoatSpot(K.x+K.r*0.2,K.z+K.r*1.15,90,"vedette");
 for(const z of [1400,1580,2200,-1700,-2600,-6000])addBoatSpot(coastX(z)+38,z,90,"vedette");
 addBoatSpot(620,800,90,"vedette");addBoatSpot(5250,2580+440*1.12,0,"vedette");}
let boatCk=0;
function updateBoatSpots(dt){
  boatCk-=dt;if(boatCk>0)return;boatCk=0.8;
  for(const S of BOAT_SPOTS){if(S.V&&!VEH.includes(S.V))S.V=null;
    if(!S.V&&!S.used&&Math.hypot(S.x-player.root.x,S.z-player.root.z)<170){
      let x=S.x,z=S.z;const need=S.kind==="airboat"?0.3:0.9;
      if(waterDepth(x,z)<need){let ok=false;for(let d=6;d<60&&!ok;d+=6)for(let a=0;a<8&&!ok;a++){const qx=S.x+Math.cos(a/8*6.28)*d,qz=S.z+Math.sin(a/8*6.28)*d;if(waterDepth(qx,qz)>need){x=qx;z=qz;ok=true;}}if(!ok){S.used=true;continue;}}
      S.V=makeBoat(x,z,S.yaw,S.kind==="airboat"?"airboat":"vedette",BOAT_SPOTS.indexOf(S));}}
}
