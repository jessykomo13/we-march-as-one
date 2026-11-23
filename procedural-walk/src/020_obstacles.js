// ================================================================ obstacles
const obstacles=[],benchSpots=[];
// grille spatiale : chaque obstacle est rangé dans les cases de 8 m qu'il touche (marge 2,5 m)
const OCELL=8,OMARGIN=2.5,ogrid=new Map(),EMPTY=[];
const okey=(i,j)=>i*100003+j;
function gridAdd(o){
  const ex=(o.type==="circle"?o.r:o.hx)+OMARGIN,ez=(o.type==="circle"?o.r:o.hz)+OMARGIN;o.cells=[];
  for(let i=Math.floor((o.x-ex)/OCELL);i<=Math.floor((o.x+ex)/OCELL);i++)for(let j=Math.floor((o.z-ez)/OCELL);j<=Math.floor((o.z+ez)/OCELL);j++){
    const k=okey(i,j);let a=ogrid.get(k);if(!a){a=[];ogrid.set(k,a);}a.push(o);o.cells.push(k);}
}
function gridRemove(o){for(const k of o.cells||[]){const a=ogrid.get(k);if(!a)continue;const i=a.indexOf(o);if(i>=0)a.splice(i,1);if(!a.length)ogrid.delete(k);}}
function obsAt(p){return ogrid.get(okey(Math.floor(p.x/OCELL),Math.floor(p.z/OCELL)))||EMPTY;}
let obsSink=null; // la zone en cours de construction récupère ses obstacles
function addObstacle(o){obstacles.push(o);gridAdd(o);if(obsSink)obsSink.push(o);return o;}
function removeObstacle(o){const i=obstacles.indexOf(o);if(i>=0)obstacles.splice(i,1);gridRemove(o);}
const GEO=new Map();function geo(key,mk){let g=GEO.get(key);if(!g){g=mk();g.userData.shared=true;GEO.set(key,g);}return g;}
const OM={
  wood:new THREE.MeshStandardMaterial({color:0x8a5a33,roughness:0.75}),
  metal:new THREE.MeshStandardMaterial({color:0x2b2e33,roughness:0.45,metalness:0.6}),
  concrete:new THREE.MeshStandardMaterial({color:0x9d9a94,roughness:0.95}),
  leaf:new THREE.MeshStandardMaterial({color:0x4f6e34,roughness:0.9}),
  leaf2:new THREE.MeshStandardMaterial({color:0x3d5c2a,roughness:0.9}),
  bark:new THREE.MeshStandardMaterial({color:0x5b4030,roughness:0.95}),
  bin:new THREE.MeshStandardMaterial({color:0x2f4a3a,roughness:0.6,metalness:0.2}),
  crate:new THREE.MeshStandardMaterial({color:0xa27c4f,roughness:0.85}),
  lamp:new THREE.MeshStandardMaterial({color:0xfff3d6,emissive:0xffe2a8,emissiveIntensity:0.6})
};
function addMesh(gm,mat,x,y,z,g,ry=0){const m=new THREE.Mesh(gm,mat);m.position.set(x,y,z);m.rotation.y=ry;m.castShadow=true;m.receiveShadow=true;g.add(m);return m;}
function makeObstacle(kind,x,z,rot,parent=scene,rnd=Math.random){
  const gy=typeof groundAt==="function"?groundAt(x,z):0;
  const g=new THREE.Group();g.position.set(x,gy,z);parent.add(g);
  const B=(w,h,d)=>geo(`B${w},${h},${d}`,()=>new THREE.BoxGeometry(w,h,d)),C=(r1,r2,h,n=20)=>geo(`C${r1},${r2},${h},${n}`,()=>new THREE.CylinderGeometry(r1,r2,h,n));
  if(kind==="bench"){
    g.rotation.y=rot;
    for(let i=0;i<4;i++)addMesh(B(1.8,0.035,0.09),OM.wood,0,0.45,-0.16+i*0.105,g);
    for(let i=0;i<3;i++){const m=addMesh(B(1.8,0.035,0.08),OM.wood,0,0.62+i*0.1,-0.27,g);m.rotation.x=-0.18;}
    for(const sx of [-0.75,0.75]){addMesh(B(0.05,0.45,0.42),OM.metal,sx,0.225,-0.03,g);addMesh(B(0.05,0.42,0.05),OM.metal,sx,0.66,-0.29,g);}
    const c=Math.abs(Math.cos(rot))>0.5;
    addObstacle({type:"box",x,z,hx:c?0.92:0.3,hz:c?0.3:0.92});
    const front=new V3(Math.sin(rot),0,Math.cos(rot)),along=new V3(Math.cos(rot),0,-Math.sin(rot));
    for(const lx of [-0.55,0,0.55])addSpot({pos:new V3(x,gy,z).addScaledVector(along,lx),front,yaw:Math.atan2(front.x,-front.z)/D2R,seatY:gy+0.4675,taken:null});
  }else if(kind==="lamp"){
    addMesh(C(0.12,0.14,0.3),OM.metal,0,0.15,0,g);addMesh(C(0.05,0.065,3.6,14),OM.metal,0,1.95,0,g);
    addMesh(B(0.5,0.08,0.18),OM.metal,0.18,3.72,0,g);addMesh(B(0.4,0.03,0.14),OM.lamp,0.18,3.67,0,g);
    addObstacle({type:"circle",x,z,r:0.16});
  }else if(kind==="planter"){
    addMesh(C(0.62,0.58,0.5,28),OM.concrete,0,0.25,0,g);
    addMesh(C(0.55,0.55,0.04,28),OM.bark,0,0.5,0,g);
    addMesh(C(0.07,0.1,1.6,10),OM.bark,0,1.3,0,g);
    const I=r=>geo("I"+r,()=>new THREE.IcosahedronGeometry(r,2));
    addMesh(I(0.75),OM.leaf,0,2.4,0,g);addMesh(I(0.5),OM.leaf2,0.3,2.1,0.2,g);addMesh(I(0.45),OM.leaf2,-0.3,2.7,-0.15,g);
    addObstacle({type:"circle",x,z,r:0.64,tall:true});
  }else if(kind==="bin"){
    addMesh(C(0.26,0.23,0.9,22),OM.bin,0,0.45,0,g);addMesh(C(0.28,0.28,0.05,22),OM.metal,0,0.92,0,g);
    addObstacle({type:"circle",x,z,r:0.28});
  }else if(kind==="bollard"){
    addMesh(C(0.11,0.12,0.85,16),OM.metal,0,0.425,0,g);addMesh(geo("bolTop",()=>new THREE.SphereGeometry(0.11,16,8,0,Math.PI*2,0,Math.PI/2)),OM.metal,0,0.85,0,g);
    addObstacle({type:"circle",x,z,r:0.13});
  }else{ // caisses
    g.rotation.y=rot;
    addMesh(B(0.8,0.8,0.8),OM.crate,0,0.4,0,g);
    if(rnd()<0.6)addMesh(B(0.7,0.7,0.7),OM.crate,0.05,1.15,0.02,g,0.3);
    addObstacle({type:"box",x,z,hx:0.42,hz:0.42,tall:true});
  }
}
let spotSink=null;function addSpot(sp){benchSpots.push(sp);if(spotSink)spotSink.push(sp);}
function obstacleClosest(o,p){
  if(o.type==="circle"){const dx=p.x-o.x,dz=p.z-o.z,d=Math.hypot(dx,dz)||1e-6;return {d:d-o.r,nx:dx/d,nz:dz/d};}
  const dx=p.x-o.x,dz=p.z-o.z,cx=clamp(dx,-o.hx,o.hx),cz=clamp(dz,-o.hz,o.hz);
  if(Math.abs(dx)<o.hx&&Math.abs(dz)<o.hz){ // dedans : vers la face la plus proche
    const px=o.hx-Math.abs(dx),pz=o.hz-Math.abs(dz);
    return px<pz?{d:-px,nx:Math.sign(dx)||1,nz:0}:{d:-pz,nx:0,nz:Math.sign(dz)||1};
  }
  const ex=dx-cx,ez=dz-cz,d=Math.hypot(ex,ez)||1e-6;return {d,nx:ex/d,nz:ez/d};
}
function avoidObstacles(root,dir){
  const push=new V3(),fwd=dir.clone().normalize(),probe=root.clone().addScaledVector(fwd,1.3);
  const A=obsAt(root),Bc=obsAt(probe),list=A===Bc?A:A.concat(Bc.filter(o=>!A.includes(o)));
  for(const o of list){
    const c=obstacleClosest(o,root);
    if(c.d<0.9)push.add(new V3(c.nx,0,c.nz).multiplyScalar((0.9-c.d)/0.9*1.4));
    const cp=obstacleClosest(o,probe);
    if(cp.d<0.55){
      const side=new V3(-fwd.z,0,fwd.x),toward=new V3(o.x-root.x,0,o.z-root.z);
      push.addScaledVector(side,side.dot(toward)>0?-0.9:0.9);
    }
  }
  return push;
}
function pushOutOfObstacles(p,r){
  let hit=false;
  for(const o of obsAt(p)){const c=obstacleClosest(o,p);if(c.d<r){p.x+=c.nx*(r-c.d);p.z+=c.nz*(r-c.d);hit=true;}}
  return hit;
}
function freeSpot(p,margin){return p.x>W_MIN+40&&p.x<W_MAX-40&&p.z>W_MIN+40&&p.z<W_MAX-40&&obsAt(p).every(o=>obstacleClosest(o,p).d>margin);}
const printMat=new THREE.MeshStandardMaterial({color:0x3a3836,roughness:1,transparent:true,opacity:0.4,depthWrite:false});
const printGeo=new THREE.PlaneGeometry(1,1).rotateX(-Math.PI/2);
const dbgMat=new THREE.MeshBasicMaterial({color:0xff2633});
let showPrints=true,debug=false;
const prints=[];

