// ================================================================ BIOMES (suite) : décor des régions variées
// Chaque biome a son sol (couleur), sa végétation, ses objets, parfois des choses qui bougent, et des animaux
// (via addAnimals, voir 0973_animaux). Tout est posé avec groundAt (relief) et évite routes / eau / villes.
Object.assign(BIO_COL,{mais:[0.52,0.6,0.26],tournesol:[0.56,0.6,0.24],lavande:[0.5,0.5,0.36],serres:[0.46,0.56,0.3],verger:[0.4,0.56,0.27],ranch:[0.62,0.58,0.36],
  pinede:[0.4,0.44,0.26],palmeraie:[0.6,0.6,0.38],mesa:[0.72,0.42,0.27],jungle:[0.2,0.4,0.15],bambou:[0.42,0.58,0.24],fleurs:[0.44,0.62,0.3],dunes:[0.88,0.8,0.6],
  mangrove:[0.32,0.36,0.22],riviere:[0.42,0.5,0.3],ilot:[0.85,0.78,0.58]});
const BM={
  corn:new THREE.MeshStandardMaterial({roughness:0.95,alphaTest:0.5,side:THREE.DoubleSide,map:cTex("cornT",128,64,(g,w,h)=>{g.clearRect(0,0,w,h);for(let i=0;i<16;i++){const x=i*8+3;g.fillStyle=i%2?"#6f8f32":"#7f9a3a";g.fillRect(x,8,3,h);g.fillStyle="#88a845";g.beginPath();g.moveTo(x,30);g.lineTo(x-7,22+(i%3)*4);g.lineTo(x+1,28);g.fill();g.beginPath();g.moveTo(x+2,20);g.lineTo(x+9,13+(i%2)*5);g.lineTo(x+2,24);g.fill();g.fillStyle="#d8c060";g.fillRect(x-1,2,5,8);}},false)}),cornTop:mat({color:0xd8c060,roughness:1}),stem:mat({color:0x4f7a2a,roughness:0.95}),sun:mat({color:0xf2c21a,roughness:0.8}),sunC:mat({color:0x4a2e14,roughness:1}),
  lav:mat({color:0x7a5aa8,roughness:1,map:cTex("lavT",32,32,(g,w,h)=>{g.fillStyle="#9a86c0";g.fillRect(0,0,w,h);for(let i=0;i<160;i++){g.fillStyle=Math.random()<0.7?"#6a4a9a":"#5a7a4a";g.fillRect(Math.random()*w,Math.random()*h,2,2);}})}),lavG:mat({color:0x6a7a5a,roughness:1}),glassG:new THREE.MeshStandardMaterial({color:0xcfe8e0,roughness:0.1,metalness:0.1,transparent:true,opacity:0.45,depthWrite:false}),
  frame:mat({color:0xf2f2ee,roughness:0.6}),apple:mat({color:0xc8281e,roughness:0.6}),pine:mat({color:0x2f4a2a,roughness:0.95}),pineT:mat({color:0x6b4a33,roughness:0.95}),
  cactus:mat({color:0x4f7a3a,roughness:0.9}),redRock:mat({color:0xa85a3a,roughness:1}),redRock2:mat({color:0xc8794a,roughness:1}),bone:mat({color:0xe8e2d0,roughness:0.9}),
  jungle:mat({color:0x2a5a22,roughness:0.9}),jungle2:mat({color:0x3d7a2a,roughness:0.9,side:THREE.DoubleSide}),bamboo:mat({color:0x8ab84a,roughness:0.7}),bambooL:mat({color:0x6aa03a,roughness:0.9,side:THREE.DoubleSide}),
  flower:["#e8405a","#f2d23a","#ffffff","#a84ae0","#f28a2a","#4a8ae8"].map(c=>mat({color:c,roughness:0.8})),reed:mat({color:0x8a9a4a,roughness:1}),mang:mat({color:0x5a4a32,roughness:1}),
  pump:mat({color:0x2a2a2e,roughness:0.6,metalness:0.4}),pumpH:mat({color:0xc8a020,roughness:0.6}),trough:mat({color:0x8a8f94,metalness:0.5,roughness:0.5}),hive:mat({color:0xf2d070,roughness:0.9}),
  salt:mat({color:0xf2f2ee,roughness:0.5}),tumble:mat({color:0x9a7a4a,roughness:1})};
function stalk(x,z,h,m,g,r=0.04){put(CY(r,r*1.3,h,5),m,x,groundAt(x,z)+h/2,z,g);}
function saguaro(x,z,s,g){const y=groundAt(x,z);put(CY(0.32*s,0.38*s,5*s,8),BM.cactus,x,y+2.5*s,z,g);put(geo("sgTop",()=>new THREE.SphereGeometry(0.32,8,6)),BM.cactus,x,y+5*s,z,g,0,s,s,s);
  for(const sd of [-1,1])if(Math.abs(x*7+z*3+sd)%3<2){put(BX(1*s,0.45*s,0.45*s),BM.cactus,x+sd*0.6*s,y+2.4*s,z,g);put(CY(0.22*s,0.22*s,1.8*s,8),BM.cactus,x+sd*1.05*s,y+3.2*s,z,g);}
  addObstacle({type:"circle",x,z,r:0.4*s,tall:true});}
function mesaRock(x,z,s,g){const y=groundAt(x,z);put(geo("rock",()=>new THREE.DodecahedronGeometry(1,0)),s>2?BM.redRock:BM.redRock2,x,y+s*0.45,z,g,(x+z)%6,s*1.2,s*(0.8+((x*3)%1)*0.8),s);if(s>0.7)addObstacle({type:"circle",x,z,r:s*0.95,tall:s>1.4});}
function pine(x,z,s,g){const y=groundAt(x,z);put(CY(0.14*s,0.22*s,5*s,7),BM.pineT,x,y+2.5*s,z,g);for(let k=0;k<3;k++)put(geo("pineC"+k,()=>new THREE.ConeGeometry(1.5-k*0.4,2.4,8)),BM.pine,x,y+(4.2+k*1.5)*s,z,g,0,s,s,s);addObstacle({type:"circle",x,z,r:0.3*s,tall:true});}
function jungleTree(x,z,s,g,r){const y=groundAt(x,z);put(CY(0.25*s,0.45*s,9*s,8),WM.trunk,x,y+4.5*s,z,g);
  put(geo("jTop",()=>new THREE.SphereGeometry(3,10,6).scale(1,0.45,1)),BM.jungle,x,y+9.2*s,z,g,0,s,s,s);put(geo("jTop2",()=>new THREE.SphereGeometry(2.2,10,6).scale(1,0.5,1)),BM.jungle,x+1.4*s,y+8*s,z-1*s,g,0,s,s,s);
  for(let k=0;k<3;k++){const a=r()*6.28,v=put(CY(0.03,0.03,5*s,4),BM.stem,x+Math.cos(a)*2*s,y+6.5*s,z+Math.sin(a)*2*s,g);}addObstacle({type:"circle",x,z,r:0.45*s,tall:true});}
function bigLeaf(x,z,g,r){const y=groundAt(x,z);for(let k=0;k<4;k++){const l=put(geo("bleaf2",()=>{const s=new THREE.Shape();s.moveTo(0,0);s.quadraticCurveTo(0.6,0.7,0,1.9);s.quadraticCurveTo(-0.6,0.7,0,0);return new THREE.ShapeGeometry(s,6);}),BM.jungle2,x,y,z,g,k*1.57+r());l.rotation.x=-0.75;}}
function bambooClump(x,z,g,r){const y=groundAt(x,z);for(let k=0;k<7;k++){const dx=(r()-0.5)*1.6,dz=(r()-0.5)*1.6,h=6+r()*4;put(CY(0.07,0.08,h,6),BM.bamboo,x+dx,y+h/2,z+dz,g);const l=put(geo("bmbL",()=>new THREE.PlaneGeometry(1.4,0.5)),BM.bambooL,x+dx,y+h-0.6,z+dz,g,r()*3);l.rotation.z=0.4;}addObstacle({type:"circle",x,z,r:1,tall:true});}
function mangroveTree(x,z,g,r){const y=Math.max(groundAt(x,z),WATER_Y-0.6);for(let k=0;k<6;k++){const a=k/6*6.28,rt=put(CY(0.05,0.07,1.8,4),BM.mang,x+Math.cos(a)*0.7,y+0.7,z+Math.sin(a)*0.7,g);rt.rotation.set(Math.sin(a)*0.5,0,-Math.cos(a)*0.5);}
  put(CY(0.15,0.2,2.4,6),BM.mang,x,y+2.4,z,g);put(geo("mgTop",()=>new THREE.SphereGeometry(2,8,6).scale(1,0.55,1)),BM.jungle,x,y+4,z,g);addObstacle({type:"circle",x,z,r:0.7,tall:true});}
function sunflowerRow(x0,z,len,g){for(let x=x0;x<x0+len;x+=2.2){const y=groundAt(x,z),h=1.6+((x*13)%1)*0.5;put(CY(0.03,0.04,h,4),BM.stem,x,y+h/2,z,g);const f=put(geo("sunH",()=>new THREE.CylinderGeometry(0.28,0.28,0.08,10).rotateX(Math.PI/2)),BM.sun,x,y+h,z+0.05,g);put(geo("sunC",()=>new THREE.CylinderGeometry(0.13,0.13,0.1,8).rotateX(Math.PI/2)),BM.sunC,x,y+h,z+0.09,g);}}
function beehive(x,z,g){const y=groundAt(x,z);put(BX(0.6,0.15,0.6),OM.wood,x,y+0.4,z,g);put(BX(0.55,0.55,0.55),BM.hive,x,y+0.75,z,g);put(BX(0.65,0.08,0.65),KM.white,x,y+1.07,z,g);addObstacle({type:"box",x,z,hx:0.32,hz:0.32});}
function greenhouse(x,z,w,d,g){const y=groundAt(x,z);box(x-w/2,z-d/2,x+w/2,z+d/2,y,y+2.6,BM.glassG,g);put(geo("ghRoof",()=>new THREE.CylinderGeometry(1,1,1,10,1,false,0,Math.PI).rotateZ(Math.PI/2)),BM.glassG,x,y+2.6,z,g,0,w/2,1.2,d);
  for(let k=-d/2;k<=d/2;k+=3)put(BX(w,0.08,0.08),BM.frame,x,y+2.6,z+k,g);for(let k=-d/2+1.5;k<d/2;k+=2)put(BX(w*0.7,0.5,0.6),BM.lavG,x,y+0.25,z+k,g);addObstacle({type:"box",x,z,hx:w/2,hz:d/2,tall:true,bld:true});}
// éolienne de pompage du ranch (la roue tourne)
function ranchWindmill(x,z,g){const y=groundAt(x,z);for(const [dx,dz] of [[-1,-1],[1,-1],[-1,1],[1,1]]){const l=put(CY(0.06,0.06,9,4),OM.metal,x+dx*0.6,y+4.5,z+dz*0.6,g);l.rotation.set(dz*-0.06,0,dx*0.06);}
  const w=new THREE.Group();w.position.set(x,y+9.2,z+0.4);w.userData.keep=true;w.userData.ax="z";w.userData.spd=1.8;g.add(w);for(let k=0;k<12;k++){const b=put(BX(0.25,1.4,0.04),KM.white,0,0.8,0,w);b.position.set(Math.cos(k/12*6.28)*0.8,Math.sin(k/12*6.28)*0.8,0);b.rotation.z=k/12*6.28-Math.PI/2;}turbines.push(w);
  put(BX(0.2,0.8,1.6),KM.red,x,y+9.2,z-0.8,g);addObstacle({type:"circle",x,z,r:0.9,tall:true});
  put(BX(3,0.6,1),BM.trough,x+3,y+0.3,z,g);addObstacle({type:"box",x:x+3,z,hx:1.5,hz:0.5});}
// puits de pétrole (la tête monte et descend)
function pumpjack(x,z,g){const y=groundAt(x,z);put(BX(1.2,0.4,4.6),BM.pump,x,y+0.2,z,g);put(BX(0.3,3,0.3),BM.pump,x,y+1.7,z,g);
  const arm=new THREE.Group();arm.position.set(x,y+3.2,z);arm.userData.keep=true;arm.userData.pump=true;g.add(arm);put(BX(0.35,0.35,4.4),BM.pumpH,0,0,0,arm);put(BX(0.4,1.2,0.6),BM.pumpH,0,-0.4,2.3,arm);put(BX(0.8,0.8,0.8),BM.pump,0,-0.5,-1.9,arm);
  worldMovers.push({o:arm,kind:"pump",ph:x*0.1});addObstacle({type:"box",x,z,hx:0.7,hz:2.4,tall:true});}
// virevoltant (boule d'herbes sèches qui roule avec le vent)
function tumbleweed(x,z,g){const t=new THREE.Mesh(geo("tumble",()=>new THREE.IcosahedronGeometry(0.45,0)),BM.tumble);t.position.set(x,groundAt(x,z)+0.45,z);t.userData.keep=true;g.add(t);worldMovers.push({o:t,kind:"tumble",x0:x,z0:z,ph:x*0.07});}
// petit pont de bois au-dessus d'une rivière, roseaux
function reedClump(x,z,g){const y=groundAt(x,z);for(let k=0;k<5;k++)put(CY(0.02,0.03,1.6,3),BM.reed,x+(k%3-1)*0.25,Math.max(y,WATER_Y-0.3)+0.7,z+((k*7)%3-1)*0.25,g);}
// ---------------------------------------------------------------- un constructeur par biome
const BIOME2={
  mais(c){const {X,Z,r,mid,detail,ok,flat,G}=c;if(!flat||onAnyRoad(X,Z,24)){c.P(6,(x,z)=>{if(ok(x,z))treeAt(x,z,"round",0.9,mid);});return;}
    fieldPlane(X,Z,CMP.dirt,c.base);
    // un labyrinthe de maïs : des rangs avec des trouées
    for(let a=-16;a<=16;a+=2.6){const gap=r()*30-15;for(const [z0,z1] of [[-17,gap-1.5],[gap+1.5,17]]){if(z1-z0<1)continue;rowAlong(X+a,Z+z0,Z+z1,0.55,2.4,BM.corn,mid,true);}}
    if(r()<0.25)c.scarecrow(X+r()*10-5,Z+r()*10-5);},
  tournesol(c){const {X,Z,r,mid,detail,ok,flat}=c;if(!flat||onAnyRoad(X,Z,24)){c.P(4,(x,z)=>{if(ok(x,z))treeAt(x,z,"light",0.9,mid);});return;}
    fieldPlane(X,Z,CMP.field[1],c.base);for(let z=-15;z<=15;z+=3.4)sunflowerRow(X-16,Z+z,32,mid);if(r()<0.5)addAnimals("abeilles",X,Z,1,6);},
  lavande(c){const {X,Z,r,mid,detail,ok,flat}=c;if(!flat||onAnyRoad(X,Z,24)){c.P(5,(x,z)=>{if(ok(x,z))treeAt(x,z,"light",0.8,mid);});return;}
    for(let a=-16;a<=16;a+=2.2)for(let z=Z-17;z<Z+17;z+=6){const zc=z+3,y=groundAt(X+a,zc);put(geo("lavRow",()=>{const L=[];for(let k=0;k<6;k++){const s=new THREE.IcosahedronGeometry(0.55,0);s.scale(1,0.7,1.2);s.translate(0,0.3,-2.5+k);L.push(s.toNonIndexed());}const m=mergeGeometries(L);L.forEach(q=>q.dispose());return m;}),BM.lav,X+a,y,zc,mid);}
    if(r()<0.4)for(let k=0;k<4;k++)beehive(X+18.5,Z-12+k*2,detail);if(r()<0.25){const o=lifted(c.base,X,Z);walls(X+8,Z-17.5,X+16,Z-11,0,3,KM.stone,o,3,3);gableRoof(X+7.6,Z-17.9,X+16.4,Z-10.6,3,1.8,KM.roofTile,o);addObstacle({type:"box",x:X+12,z:Z-14.2,hx:4,hz:3.3,tall:true,bld:true});}},
  serres(c){const {X,Z,r,mid,detail,ok,flat}=c;if(!flat||onAnyRoad(X,Z,24))return;fieldPlane(X,Z,CMP.dirt,c.base);
    for(let k=0;k<3;k++)greenhouse(X-12+k*12,Z,8,26,mid);addAmb("fermier",X+r()*4,Z+15,0);},
  verger(c){const {X,Z,r,mid,detail,ok}=c;for(let a=-15;a<=15;a+=6)for(let b=-15;b<=15;b+=6){const x=X+a,z=Z+b;if(!ok(x,z,1))continue;const y=groundAt(x,z);put(CY(0.12,0.16,1.4,6),WM.trunk,x,y+0.7,z,mid);put(geo("vTop",()=>new THREE.IcosahedronGeometry(1.6,1)),OM.leaf,x,y+2.3,z,mid,0,1,0.85,1);
      for(const [dx,dy,dz] of [[0.9,2.4,0.7],[-0.8,2,-0.8],[0.3,2.9,-0.9]])put(geo("apl",()=>new THREE.SphereGeometry(0.12,6,4)),BM.apple,x+dx,y+dy,z+dz,detail);addObstacle({type:"circle",x,z,r:0.35,tall:true});}
    if(r()<0.3)for(let k=0;k<3;k++){const x=X-18+k*1.6,z=Z+18;put(BX(1.2,0.7,0.9),OM.crate,x,groundAt(x,z)+0.35,z,detail);}},
  ranch(c){const {X,Z,r,mid,detail,ok,G}=c;
    if(!onAnyRoad(X,Z,22)&&!G.water){fenceRun(X-17,Z-17,X+17,Z-17,"wood",mid,[[15,19]]);fenceRun(X-17,Z+17,X+17,Z+17,"wood",mid,[]);fenceRun(X-17,Z-17,X-17,Z+17,"wood",mid,[]);fenceRun(X+17,Z-17,X+17,Z+17,"wood",mid,[[15,19]]);
      if(r()<0.45)ranchWindmill(X+r()*10-5,Z+r()*10-5,mid);addAnimals(r()<0.6?"vache":"cheval",X,Z,2+Math.floor(r()*4),13);if(r()<0.3)addAnimals("cheval",X,Z,2,12);
      if(r()<0.2){const o=lifted(c.base,X,Z);barnAt(X-8,Z+8,o);}if(r()<0.15)addAmb("fermier",X+6,Z-15,0);}
    c.P(10,(x,z)=>{if(ok(x,z,0.5))grassTuft(x,z,detail,WM2.straw);});},
  pinede(c){const {X,Z,r,base,mid,detail,ok}=c;c.P(22,(x,z,i)=>{if(ok(x,z,0.8))pine(x,z,0.9+r()*0.6,i<12?base:mid);});
    c.P(3,(x,z)=>{if(ok(x,z)){const y=groundAt(x,z),l=put(CY(0.25,0.3,4,7),BM.pineT,x,y+0.25,z,detail,r()*3);l.rotation.z=Math.PI/2;}});
    if(r()<0.5)addAnimals(r()<0.6?"cerf":r()<0.5?"renard":"lapin",X,Z,1+Math.floor(r()*3),16);
    if(r()<0.04){const x=X,z=Z;if(ok(x,z,3)){const y=groundAt(x,z);for(const [dx,dz] of [[-1,-1],[1,-1],[-1,1],[1,1]])put(CY(0.08,0.08,7,4),OM.wood,x+dx,y+3.5,z+dz,mid);box(x-1.4,z-1.4,x+1.4,z+1.4,y+7,y+7.2,KM.plank,mid);walls(x-1.3,z-1.3,x+1.3,z+1.3,y+7.2,1.6,KM.plank,mid,3,2);addObstacle({type:"box",x,z,hx:1.2,hz:1.2,tall:true});}}},
  palmeraie(c){const {X,Z,r,mid,detail,ok}=c;c.P(14,(x,z)=>{if(ok(x,z))treeAt(x,z,"palm",0.8+r()*0.6,mid);});c.P(12,(x,z)=>{if(ok(x,z,0.5))grassTuft(x,z,detail);});if(r()<0.3)addAnimals("perroquet",X,Z,3,14);},
  mesa(c){const {X,Z,r,base,mid,detail,ok}=c;
    c.P(5,(x,z)=>{if(ok(x,z))saguaro(x,z,0.8+r()*0.5,mid);});c.P(7,(x,z)=>{if(ok(x,z))mesaRock(x,z,0.6+r()*2.6,base);});
    c.P(6,(x,z)=>{if(ok(x,z,0.5))grassTuft(x,z,detail,WM2.straw);});if(r()<0.25){const x=X+r()*20-10,z=Z+r()*20-10;if(ok(x,z))tumbleweed(x,z,detail);}
    if(r()<0.08){const x=X+r()*16-8,z=Z+r()*16-8;if(ok(x,z,3))pumpjack(x,z,mid);}
    if(r()<0.05){const x=X+r()*16-8,z=Z+r()*16-8;if(ok(x,z,1)){const y=groundAt(x,z);put(BX(1.6,0.3,0.5),BM.bone,x,y+0.15,z,detail,r()*3);put(geo("skullB",()=>new THREE.SphereGeometry(0.3,8,6)),BM.bone,x+1,y+0.25,z,detail);}}
    if(r()<0.35)addAnimals(r()<0.5?"coyote":"vautour",X,Z,1+Math.floor(r()*2),16);},
  jungle(c){const {X,Z,r,base,mid,detail,ok}=c;c.P(10,(x,z,i)=>{if(ok(x,z,1))jungleTree(x,z,0.8+r()*0.5,i<6?base:mid,r);});c.P(10,(x,z)=>{if(ok(x,z,0.5))bigLeaf(x,z,detail,r);});
    c.P(4,(x,z)=>{if(ok(x,z))treeAt(x,z,"palm",1+r()*0.4,mid);});if(r()<0.6)addAnimals(r()<0.6?"perroquet":"singe",X,Z,2+Math.floor(r()*3),15);},
  bambou(c){const {X,Z,r,mid,detail,ok}=c;c.P(12,(x,z)=>{if(ok(x,z,1))bambooClump(x,z,mid,r);});if(r()<0.15)addAnimals("panda_roux",X,Z,1,10);},
  fleurs(c){const {X,Z,r,mid,detail,ok,G}=c;c.P(60,(x,z,i)=>{if(ok(x,z,0.3)){const y=groundAt(x,z);put(geo("flw",()=>new THREE.SphereGeometry(0.12,6,4)),BM.flower[i%6],x,y+0.35,z,detail);put(CY(0.01,0.01,0.35,3),BM.stem,x,y+0.17,z,detail);}});
    c.P(4,(x,z)=>{if(ok(x,z))treeAt(x,z,"light",0.9+r()*0.4,mid);});if(!G.water&&r()<0.55)addAnimals(r()<0.6?"cheval":"mouton",X,Z,2+Math.floor(r()*3),14);if(r()<0.3)for(let k=0;k<3;k++)beehive(X-16+k*1.5,Z+17,detail);
    if(r()<0.5)addAnimals("papillon",X,Z,4,10);},
  dunes(c){const {X,Z,r,mid,detail,ok}=c;c.P(18,(x,z)=>{if(ok(x,z,0.4))grassTuft(x,z,detail,WM2.straw);});
    c.P(2,(x,z)=>{if(ok(x,z)){const y=groundAt(x,z),l=put(CY(0.15,0.2,3,6),WM2.dead,x,y+0.15,z,detail,r()*3);l.rotation.z=Math.PI/2;}});
    if(r()<0.3){const x0=X-15,z=Z+r()*20-10;for(let x=x0;x<x0+20;x+=1.2)if(ok(x,z,0))put(BX(0.08,1,0.08),OM.wood,x,groundAt(x,z)+0.5,z,detail);}
    if(r()<0.25)addAnimals("goeland",X,Z,3,14);if(r()<0.15)addAnimals("crabe",X,Z,3,10);},
  mangrove(c){const {X,Z,r,mid,detail,ok}=c;c.P(10,(x,z)=>{if(!inGridArea(x,z)&&!onAnyRoad(x,z,2)&&waterDepth(x,z)<1.2)mangroveTree(x,z,mid,r);});
    if(r()<0.4)addAnimals(r()<0.5?"heron":"flamant",X,Z,2+Math.floor(r()*3),12);},
  plage(c){const {X,Z,r}=c;if(r()<0.25)addAnimals(r()<0.6?"goeland":"crabe",X,Z,3,12);if(r()<0.12)addAnimals("pelican",X,Z,2,10);},
  riviere(c){const {X,Z,r,mid,detail,ok}=c;c.P(10,(x,z)=>{const d=waterDepth(x,z);if(d>0.02&&d<0.8&&!onAnyRoad(x,z,2))reedClump(x,z,detail);});
    c.P(4,(x,z)=>{if(ok(x,z))treeAt(x,z,r()<0.5?"light":"round",0.9+r()*0.3,mid);});c.P(3,(x,z)=>{if(ok(x,z))rockAt(x,z,0.5+r(),mid);});
    if(r()<0.3)addAnimals(r()<0.5?"canard":"heron",X,Z,2+Math.floor(r()*3),12);
    if(r()<0.06){for(let k=0;k<10;k++){const x=X+r()*30-15,z=Z+r()*30-15;if(ok(x,z,1)){let wd=null;for(let a=0;a<8;a++){const qx=x+Math.cos(a*0.785)*3,qz=z+Math.sin(a*0.785)*3;if(waterDepth(qx,qz)>0.4){wd=Math.atan2(qx-x,-(qz-z))/D2R;break;}}if(wd!==null){addAmb("pecheur",x,z,wd);break;}}}}},
  ilot(c){const {X,Z,r,mid,detail,ok}=c;c.P(5,(x,z)=>{if(ok(x,z))treeAt(x,z,"palm",0.8+r()*0.5,mid);});if(r()<0.4)addAnimals(r()<0.5?"pelican":"goeland",X,Z,3,12);if(r()<0.15)addAnimals("tortue",X,Z,2,10);},
  mer(c){const {X,Z,r}=c;if(r()<0.025)addAnimals("dauphin",X,Z,3,20);}
};
// animaux des biomes déjà existants (complète les constructeurs de 023j)
const BIOME_FAUNA={prairie:[["vache",0.25,3],["cheval",0.12,2],["mouton",0.18,5],["lapin",0.15,2]],ferme:[["poule",0.8,6],["cochon",0.6,3],["vache",0.5,3],["chien",0.4,1]],
  foret:[["cerf",0.25,2],["renard",0.12,1],["lapin",0.2,2],["ecureuil",0.2,2]],lande:[["mouton",0.25,4],["lapin",0.15,2]],montagne:[["chevre",0.35,3],["aigle",0.15,1]],
  savane:[["vache",0.15,3],["vautour",0.12,1],["flamant",0.1,3]],orangeraie:[["poule",0.1,3],["perroquet",0.08,2]],vigne:[["lapin",0.12,2]],champ:[["corbeau",0.2,3],["lapin",0.1,2]],
  eolien:[["mouton",0.3,4]],bayou:[["heron",0.25,2],["flamant",0.15,3],["tortue",0.12,2],["canard",0.15,3]],lac:[["canard",0.35,4],["cygne",0.15,2],["heron",0.12,1]],cayo:[["pelican",0.3,3],["goeland",0.25,3]]};
