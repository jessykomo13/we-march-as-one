// ================================================================ module 16 : la mer, les îles, la nage
// À l'est de la plage (x > 588) : fond marin en pente, quatre îles, un pont piéton, un ponton pour plonger.
// On peut nager partout ; la police ne nage pas.
const WATER_Y=0.07,SEA_X=588,WORLD_E=1180;
const ISLANDS=[
  {x:705,z:-150,r:58,h:2.4,name:"Île aux Pélicans",villas:3},
  {x:790,z:190,r:72,h:3.2,name:"Île du Phare",phare:true,villas:2},
  {x:930,z:-30,r:42,h:2.0,name:"Îlot Corail",villas:1},
  {x:690,z:430,r:36,h:1.8,name:"Île des Tortues",villas:0},
  {x:1050,z:250,r:88,h:4.2,name:"Grande Île",villas:5,bar:true},
  {x:880,z:430,r:32,h:1.6,name:"Îlot des Mouettes",villas:0},
  {x:1040,z:-330,r:60,h:3.6,name:"Île Sauvage",villas:0,wild:true},
  {x:820,z:-430,r:40,h:2.2,name:"Île du Trésor",villas:1}
];
// pont (plage -> île aux Pélicans) et ponton de plongée, posés au-dessus de l'eau
const SEA_FEATURES=[
  {kind:"ramp",x0:582,x1:590,z0:-151.6,z1:-148.4,h0:SIDEWALK,h1:1.3,axis:"x",dir:1},
  {kind:"box",x0:590,x1:650,z0:-151.6,z1:-148.4,h:1.3,bridge:true},
  {kind:"ramp",x0:650,x1:658,z0:-151.6,z1:-148.4,h0:1.3,h1:0.9,axis:"x",dir:1},
  {kind:"box",x0:586,x1:640,z0:298.5,z1:301.5,h:1.5,pier:true},
  {kind:"box",x0:640,x1:648,z0:296,z1:304,h:1.5,pier:true}
];
const LADDERS=[{x:647.6,z:304.3,ix:0,iz:-1.3},{x:647.6,z:295.7,ix:0,iz:1.3},{x:592,z:-152.2,ix:0,iz:1.4},{x:592,z:-147.8,ix:0,iz:-1.4}];
function smooth01(t){t=clamp01(t);return t*t*(3-2*t);}
function seaFloor(x,z){
  let h=SIDEWALK-Math.min(3.6,Math.max(0,x-SEA_X)*0.16+Math.max(0,x-SEA_X-8)*0.05);
  for(const I of ISLANDS){const d=Math.hypot(x-I.x,z-I.z);if(d<I.r*1.35){const t=1-d/(I.r*1.35);h=Math.max(h,lerp(-3.6,I.h,smooth01(t*1.6)));}}
  return h;
}
function seaFeatureH(x,z){let h=-99;for(const f of SEA_FEATURES){if(x<f.x0||x>f.x1||z<f.z0||z>f.z1)continue;const v=featureH(f,x,z);if(v>h)h=v;}return h;}
function onIsland(x,z){return ISLANDS.find(I=>Math.hypot(x-I.x,z-I.z)<I.r*0.9);}
// --- fond marin + îles : une grande grille colorée selon la hauteur
{
  const W=WORLD_E-560,D=1400,sx=Math.round(W/4),sz=Math.round(D/4);
  const gm=new THREE.PlaneGeometry(W,D,sx,sz).rotateX(-Math.PI/2);gm.translate(560+W/2,0,0);
  const pos=gm.attributes.position,col=new Float32Array(pos.count*3),c=new THREE.Color();
  for(let i=0;i<pos.count;i++){const x=pos.getX(i),z=pos.getZ(i);let h=x<SEA_X?SIDEWALK-0.02:seaFloor(x,z);if(x<SEA_X)h=-0.4;pos.setY(i,h);
    const n=hash(x*0.37+z*0.91)*0.06;
    const S=THREE.SRGBColorSpace;if(h>1.0)c.setRGB(0.36+n,0.52+n,0.27+n,S);else if(h>-0.2)c.setRGB(0.84+n,0.75+n,0.55+n,S);else{const k=clamp01(-h/3.6);c.setRGB(0.78-k*0.5+n,0.72-k*0.38+n,0.55-k*0.2+n,S);}
    col[i*3]=c.r;col[i*3+1]=c.g;col[i*3+2]=c.b;}
  gm.setAttribute("color",new THREE.BufferAttribute(col,3));gm.computeVertexNormals();
  const m=new THREE.Mesh(gm,new THREE.MeshStandardMaterial({vertexColors:true,roughness:0.95}));m.receiveShadow=true;scene.add(m);
}
KM.water.opacity=0.78;KM.water.color.set(0x2b7896);
// --- objets fixes en mer (construits une fois)
const seaGroup=new THREE.Group();scene.add(seaGroup);
{
  const g=seaGroup;
  // pont et ponton
  for(const f of SEA_FEATURES){
    if(f.kind==="box"){box(f.x0,f.z0,f.x1,f.z1,f.h-0.25,f.h,KM.plank,g);
      for(let x=f.x0+1;x<f.x1;x+=4)for(const z of [f.z0+0.2,f.z1-0.2])put(CY(0.14,0.14,f.h+4,8),OM.wood,x,f.h-(f.h+4)/2,z,g);
      if(f.bridge)for(const z of [f.z0+0.1,f.z1-0.1]){put(BX(f.x1-f.x0,0.08,0.08),KM.white,(f.x0+f.x1)/2,f.h+1.0,z,g);for(let x=f.x0;x<=f.x1;x+=2)put(BX(0.07,1,0.07),KM.white,x,f.h+0.5,z,g);}}
    else reliefMesh(f,g);
  }
  for(const L of LADDERS){for(const s of [-0.25,0.25])put(BX(0.05,2.6,0.05),KM.chrome,L.x+s,0.2,L.z,g);for(let y=-0.9;y<1.5;y+=0.3)put(BX(0.5,0.04,0.04),KM.chrome,L.x,y,L.z,g);}
  put(BX(1.2,0.08,1.6),STRIPES[1],647.2,1.56,300,g);   // plongeoir
  // îles : palmiers, villas, phare, petit port
  ISLANDS.forEach((I,k)=>{
    const r=mulberry(k*977+13);
    for(let i=0;i<Math.round(I.r/(I.wild?1.4:3));i++){const a=r()*6.28,d=I.r*(0.3+r()*0.55),x=I.x+Math.cos(a)*d,z=I.z+Math.sin(a)*d;if(seaFloor(x,z)<0.4)continue;treeAt(x,z,r()<0.75?"palm":"round",0.9+r()*0.4,g,0.25);}
    for(let v=0;v<I.villas;v++){const a=k*1.7+v*2.1,d=I.r*0.35,x=I.x+Math.cos(a)*d,z=I.z+Math.sin(a)*d,y=seaFloor(x,z);
      const m=KM.houseWall[(k+v)%KM.houseWall.length];walls(x-5,z-4,x+5,z+4,y-0.5,4.2,m,g,3,2.9);box(x-5.4,z-4.4,x+5.4,z+4.4,y+3.7,y+4.0,KM.white,g);
      plane(5,3,KM.pool,x,y+0.05,z+6.5,g);box(x-2.7,z+4.8,x+2.7,z+8.2,y-0.3,y+0.03,KM.white,g);
      addObstacle({type:"box",x,z,hx:5,hz:4,tall:true,bld:true});for(let t=0;t<3;t++)terraceSet(x-4+t*2.5,z+10.5,g,STRIPES[(t+k)%STRIPES.length]);}
    if(I.phare){const x=I.x+I.r*0.45,z=I.z-I.r*0.3,y=seaFloor(x,z);
      for(let s=0;s<6;s++)put(CY(2.2-s*0.2,2.4-s*0.2,3,18),s%2?KM.red:KM.white,x,y+1.5+s*3,z,g);
      put(CY(1.5,1.5,1.6,12),KM.glass,x,y+19,z,g);put(geo("pharoof",()=>new THREE.ConeGeometry(1.8,1.6,12)),KM.red,x,y+20.6,z,g);
      const lamp=put(geo("pharLamp",()=>new THREE.SphereGeometry(0.6,12,8)),new THREE.MeshBasicMaterial({color:0xfff1a8}),x,y+19,z,g);lamp.userData.phare=true;
      addObstacle({type:"circle",x,z,r:2.4,tall:true});}
    if(I.bar){const x=I.x-I.r*0.55,z=I.z+I.r*0.1,y=seaFloor(x,z);box(x-3,z-2,x+3,z+2,y,y+1.1,OM.wood,g);put(BX(6.6,0.12,4.6),KM.plank,x,y+3.2,z,g);for(const [dx,dz] of [[-3,-2],[3,-2],[-3,2],[3,2]])put(CY(0.1,0.1,3.2,6),OM.wood,x+dx,y+1.6,z+dz,g);
      put(BX(3.2,0.5,0.06),signMat("Bar de l'Île","#c46a1e","#fff",{w:512,h:80}),x,y+2.7,z-2.05,g);addObstacle({type:"box",x,z,hx:3,hz:2});addShop("Glaces · Boissons du bar",x,z-3.2);addAmb("barman",x,z+0.2,0);
      for(let t=0;t<4;t++)beachUmbrella(x-6+t*4,z-8,g,t+k);}
    if(I.wild)for(let i=0;i<14;i++){const a=r()*6.28,d=I.r*r()*0.7,x=I.x+Math.cos(a)*d,z=I.z+Math.sin(a)*d,y=seaFloor(x,z);if(y<0.5)continue;const s=0.6+r()*1.4;put(geo("rock",()=>new THREE.DodecahedronGeometry(1,0)),KM.stone,x,y+s*0.3,z,g,r()*3,s*1.4,s*0.8,s);addObstacle({type:"circle",x,z,r:s*1.1});}
    // petite crique avec bateaux
    const bx=I.x-I.r*1.05,bz=I.z+I.r*0.2;for(let b=0;b<2;b++)boatAt(bx-b*7,bz+b*6,r()*0.5,g);
  });
  for(const fx of [598,611,626])addAmb("pecheur",fx,301.15,180);
  // bateaux au large et bouées
  for(let i=0;i<8;i++){const x=640+i*55,z=-500+((i*137)%900);if(!onIsland(x,z))boatAt(x,z,i*0.8,g);}
  for(let z=-560;z<=560;z+=40){const b=put(geo("buoy",()=>new THREE.SphereGeometry(0.35,10,8)),KM.red,630,WATER_Y,z,g);b.userData.bob=z;}
  // le groupe est fusionné, sauf ce qui bouge (bateaux, bouées, lumière du phare)
}
function boatAt(x,z,yaw,g){const b=new THREE.Group();b.position.set(x,WATER_Y,z);b.rotation.y=yaw;b.userData.boat=Math.random()*6;g.add(b);
  const hull=new THREE.Shape([new THREE.Vector2(-1.2,0),new THREE.Vector2(1.2,0),new THREE.Vector2(1.4,0.9),new THREE.Vector2(-1.4,0.9)]);
  const hg=geo("hull",()=>{const e=new THREE.ExtrudeGeometry(hull,{depth:6,bevelEnabled:false});e.translate(0,-0.45,-3);return e;});
  put(hg,KM.white,0,0,0,b);put(BX(2.6,0.05,5.8),OM.wood,0,0.46,0,b);put(BX(1.8,1.1,2),KM.glass,0,1.0,-0.6,b);put(BX(2,0.1,2.2),KM.white,0,1.6,-0.6,b);
  put(geo("bow",()=>new THREE.ConeGeometry(1.25,1.8,4).rotateX(Math.PI/2).rotateY(Math.PI/4)),KM.white,0,0.25,3.6,b);
  addObstacle({type:"circle",x,z,r:2.2});return b;}
const seaMovers=[];seaGroup.traverse(o=>{if(o.userData.boat!==undefined||o.userData.bob!==undefined||o.userData.phare){seaMovers.push(o);o.userData.keep=true;}});
bake(seaGroup);
function waterDepth(x,z){return x>SEA_X?WATER_Y-seaFloor(x,z):0;}
function updateSeaLife(dt){
  const t=clockT;
  for(const o of seaMovers){if(o.userData.boat!==undefined){o.position.y=WATER_Y+Math.sin(t*1.1+o.userData.boat)*0.08;o.rotation.z=Math.sin(t*0.9+o.userData.boat)*0.04;o.rotation.x=Math.sin(t*0.7+o.userData.boat*2)*0.03;}
    else if(o.userData.bob!==undefined)o.position.y=WATER_Y+Math.sin(t*1.4+o.userData.bob)*0.07;
    else if(o.userData.phare)o.material.color.setHSL(0.14,1,0.6+0.35*Math.max(0,Math.sin(t*2)));}
  updateRipples(dt);
}
// --- ronds dans l'eau autour des nageurs et éclaboussures
const ripples=[];const rippleMat=new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:0.5,depthWrite:false});
const rippleGeo=new THREE.RingGeometry(0.35,0.45,24).rotateX(-Math.PI/2);
function ripple(x,z,big){if(ripples.length>40)return;const m=new THREE.Mesh(rippleGeo,rippleMat.clone());m.position.set(x,WATER_Y+0.02,z);scene.add(m);ripples.push({m,t:0,s:big?2.2:1});}
function updateRipples(dt){for(let i=ripples.length-1;i>=0;i--){const R=ripples[i];R.t+=dt;const k=R.t/1.4;R.m.scale.setScalar(1+k*3*R.s);R.m.material.opacity=0.5*(1-k);if(k>=1){scene.remove(R.m);R.m.material.dispose();ripples.splice(i,1);}}}
function splash(w,v){ripple(w.root.x,w.root.z,true);ripple(w.root.x+0.4,w.root.z-0.3,true);
  const c=actx;if(!c)return;try{const d=0.5,buf=c.createBuffer(1,c.sampleRate*d,c.sampleRate),a=buf.getChannelData(0);for(let i=0;i<a.length;i++){const t=i/a.length;a[i]=(Math.random()*2-1)*Math.exp(-t*5)*Math.min(1,v/6);}
    const s=c.createBufferSource(),f=c.createBiquadFilter();f.type="lowpass";f.frequency.value=1600;s.buffer=buf;s.connect(f).connect(sfxOut());s.start();}catch(e){}}
