// ================================================================ MODULE 18 : port et docks « Port de la Vigie »
// Au nord-est de la ville (îlots cx 12..14, cz -13..-8) et sur la mer : un grand quai en béton (x 588..652),
// un labyrinthe de conteneurs empilés où l'on se perd et où la police perd la vue, des portiques animés
// qui chargent deux cargos, des chalutiers au quai de pêche, des chariots élévateurs et des dockers.
// Le quai est découpé en 4 tronçons construits/détruits selon la distance (comme les zones de la ville).
function inPort(cx,cz){return cx>=12&&cx<=14&&cz>=-13&&cz<=-8;}            // littéraux : appelé avant l'initialisation (skyline)
function portType(cx,cz){
  if(cx===12&&cz===-10)return "port_capitainerie";
  if(cx===12&&cz===-13)return "port_parking";
  if(cx===12)return "port_entrepot";
  return "port_conteneurs";
}
function inPortDeck(x,z){return x>=588&&x<=652&&z>=-530&&z<=-302;}         // littéraux (appelé par waterDepth)
const PORT={x0:588,x1:652,z0:-530,z1:-302,h:1.3,name:"Port de la Vigie"};
// le quai et sa rampe d'accès depuis la ville
SEA_FEATURES.push({kind:"ramp",x0:580,x1:588,z0:PORT.z0,z1:PORT.z1,h0:SIDEWALK,h1:PORT.h,axis:"x",dir:1,port:true},
                  {kind:"box",x0:PORT.x0,x1:PORT.x1,z0:PORT.z0,z1:PORT.z1,h:PORT.h,port:true});
LADDERS.push(...[-512,-470,-430,-388,-346,-318].map(z=>({x:652.45,z,ix:-1.4,iz:0})),...[596,622,646].map(x=>({x,z:-301.55,ix:0,iz:-1.4})));
// --- matériaux (partagés : peu d'appels de rendu)
const PORT_LINES=[["MAREVIA","#b2321f"],["VIGIE CARGO","#1f4f9a"],["BALENA","#2d6b3f"],["PÉLAGOS","#c48a2a"],["CORAL LINE","#5a6a74"],["ALIZÉ FRET","#7a2a5a"],["SOLMAR","#d0661e"],["KAPRA","#20737a"]];
const PM={
  cont:PORT_LINES.map(([n,c],i)=>mat({roughness:0.62,metalness:0.25,map:cTex("pcont"+i,256,128,(g,w,h)=>{
    g.fillStyle=c;g.fillRect(0,0,w,h);for(let x=0;x<w;x+=8){g.fillStyle="rgba(0,0,0,.18)";g.fillRect(x,0,3,h);g.fillStyle="rgba(255,255,255,.08)";g.fillRect(x+4,0,2,h);}
    g.fillStyle="rgba(0,0,0,.28)";g.fillRect(0,0,w,6);g.fillRect(0,h-6,w,6);g.fillStyle="rgba(120,60,30,.25)";for(let k=0;k<14;k++)g.fillRect(Math.random()*w,h-6-Math.random()*20,2+Math.random()*4,3+Math.random()*14);
    g.fillStyle="#f4f1ea";g.textAlign="center";g.font="bold 30px sans-serif";g.fillText(n,w/2,h*0.46);
    g.font="13px monospace";g.fillText(n.slice(0,3).replace(/[^A-Z]/g,"X")+"U "+(100000+i*137911%899999),w/2,h*0.72);},false)})),
  plain:PORT_LINES.map(([n,c],i)=>mat({roughness:0.65,metalness:0.2,map:cTex("pcontp"+i,64,64,(g,w,h)=>{g.fillStyle=c;g.fillRect(0,0,w,h);for(let x=0;x<w;x+=6){g.fillStyle="rgba(0,0,0,.2)";g.fillRect(x,0,2,h);}g.fillStyle="rgba(0,0,0,.35)";for(let y=0;y<h;y+=16)g.fillRect(0,y,w,1);})})),
  slab:mat({roughness:0.95,map:cTex("pslab",128,128,(g,w,h)=>{speckle(g,w,h,[118,116,110],38,77);g.fillStyle="rgba(40,40,40,.35)";g.fillRect(0,0,w,2);g.fillRect(0,0,2,h);g.fillStyle="rgba(60,50,40,.12)";for(let k=0;k<6;k++){g.beginPath();g.arc(Math.random()*w,Math.random()*h,6+Math.random()*16,0,7);g.fill();}})}),
  quay:mat({color:0x8e8b84,roughness:0.95}),
  yel:mat({color:0xf0c419,roughness:0.6}),
  craneA:mat({color:0xc9452c,roughness:0.55,metalness:0.35}),craneB:mat({color:0x2b62a8,roughness:0.55,metalness:0.35}),
  steel:mat({color:0x5d6166,roughness:0.5,metalness:0.6}),rail:mat({color:0x8a8d90,roughness:0.35,metalness:0.8}),
  fender:mat({color:0x141414,roughness:0.9}),rope:mat({color:0xd9c79a,roughness:0.9}),
  hullA:mat({color:0x1d2c45,roughness:0.6}),hullB:mat({color:0x23402e,roughness:0.6}),hullRed:mat({color:0x7a1f1a,roughness:0.7}),
  deck:mat({color:0x5f6e5a,roughness:0.85}),white:mat({color:0xf2f0ea,roughness:0.7}),win:mat({color:0x1a2633,roughness:0.15,metalness:0.6}),
  fork:mat({color:0xe8a020,roughness:0.5,metalness:0.2}),black:mat({color:0x1c1c1e,roughness:0.7}),net:mat({color:0x3a5a52,roughness:1}),
  beacon:new THREE.MeshBasicMaterial({color:0xffa200}),redL:new THREE.MeshBasicMaterial({color:0xff2a1a})
};
const PORT_SIGNS=["DOCKS DE LA VIGIE","FRIGORIFIQUE MARÉE","HANGAR 7","COOPÉRATIVE DES PÊCHEURS","MAREVIA LOGISTIQUE","TRANSIT ALIZÉ"];
// --- petites briques
function beamTo(a,b,t,m,g){const d=new V3().subVectors(b,a),L=d.length(),o=new THREE.Mesh(BX(t,t,1),m);o.position.copy(a).add(b).multiplyScalar(0.5);o.scale.z=L;o.lookAt(b);g.add(o);return o;}
// conteneur (6 m) : niveaux empilés ; un seul obstacle haut au sol (bloque la vue de la police)
function portCont(x,z,alongX,levels,L,g,rnd,k){
  const y0=groundAt(x,z);
  for(let l=0;l<levels;l++){const m=PM.cont[(k+l*3)%PM.cont.length],j=l?(rnd()-0.5)*0.16:0;
    put(BX(L,2.6,2.44),m,x+(alongX?j:0),y0+1.3+l*2.6,z+(alongX?0:j),g,(alongX?0:Math.PI/2)+(l?(rnd()-0.5)*0.03:0)+(rnd()<0.5?Math.PI:0));}
  const P=L/2+0.15;addObstacle({type:"box",x,z,hx:alongX?P:1.22,hz:alongX?1.22:P,tall:true,cont:true,top:y0+levels*2.6});
}
// labyrinthe parfait (recherche en profondeur) puis quelques murs retirés pour créer des boucles
function portMaze(nx,nz,rnd,extra){
  const V=[],H=[];for(let i=0;i<=nx;i++){V[i]=[];for(let j=0;j<nz;j++)V[i][j]=true;}for(let i=0;i<nx;i++){H[i]=[];for(let j=0;j<=nz;j++)H[i][j]=true;}
  const seen=new Set(),st=[[Math.floor(rnd()*nx),Math.floor(rnd()*nz)]];seen.add(st[0][0]+","+st[0][1]);
  while(st.length){const [i,j]=st[st.length-1];
    const nb=[[1,0],[-1,0],[0,1],[0,-1]].filter(([a,b])=>{const p=i+a,q=j+b;return p>=0&&p<nx&&q>=0&&q<nz&&!seen.has(p+","+q);});
    if(!nb.length){st.pop();continue;}
    const [a,b]=nb[Math.floor(rnd()*nb.length)];
    if(a===1)V[i+1][j]=false;else if(a===-1)V[i][j]=false;else if(b===1)H[i][j+1]=false;else H[i][j]=false;
    seen.add((i+a)+","+(j+b));st.push([i+a,j+b]);}
  for(let i=1;i<nx;i++)for(let j=0;j<nz;j++)if(V[i][j]&&rnd()<extra)V[i][j]=false;
  for(let i=0;i<nx;i++)for(let j=1;j<nz;j++)if(H[i][j]&&rnd()<extra)H[i][j]=false;
  return {V,H,nx,nz};
}
// ouvre n passages au hasard sur un bord ("W","E","N","S")
function mazeOpen(M,side,n,rnd,forced){
  const len=side==="W"||side==="E"?M.nz:M.nx,ids=[...Array(len).keys()].sort(()=>rnd()-0.5).slice(0,n).concat(forced||[]);
  for(const k of ids){if(side==="W")M.V[0][k]=false;else if(side==="E")M.V[M.nx][k]=false;else if(side==="N")M.H[k][0]=false;else M.H[k][M.nz]=false;}
}
function mazeBuild(M,x0,z0,P,g,rnd,k0,hiEdge){
  const L=P-0.12,lv=e=>{const v=rnd();return e?(v<0.5?2:3):(v<0.22?1:v<0.7?2:3);};let k=k0;
  for(let i=0;i<=M.nx;i++)for(let j=0;j<M.nz;j++)if(M.V[i][j])portCont(x0+i*P,z0+(j+0.5)*P,false,lv(hiEdge&&(i===0||i===M.nx)),L,g,rnd,k++);
  for(let i=0;i<M.nx;i++)for(let j=0;j<=M.nz;j++)if(M.H[i][j])portCont(x0+(i+0.5)*P,z0+j*P,true,lv(hiEdge&&(j===0||j===M.nz)),L,g,rnd,k++);
  // dans quelques cellules : fûts, palettes, caisses (cachettes)
  for(let i=0;i<M.nx;i++)for(let j=0;j<M.nz;j++){const v=rnd();if(v>0.3)continue;const cx=x0+(i+0.5)*P+(rnd()-0.5)*1.2,cz=z0+(j+0.5)*P+(rnd()-0.5)*1.2,y=groundAt(cx,cz);
    if(v<0.12){for(let b=0;b<3;b++)put(CY(0.3,0.3,0.9,10),[KM.blue,KM.red,PM.yel][(b+i)%3],cx+(b%2)*0.62,y+0.45,cz+(b>>1)*0.62,g);addObstacle({type:"circle",x:cx+0.3,z:cz+0.3,r:0.75});}
    else{put(BX(1.2,0.14,1.0),OM.wood,cx,y+0.07,cz,g);put(BX(1.1,0.8,0.9),OM.crate,cx,y+0.55,cz,g,rnd()*0.3);addObstacle({type:"box",x:cx,z:cz,hx:0.65,hz:0.55});}}
}
// semi-remorque avec conteneur (axes alignés pour l'obstacle)
function semiTruck(x,z,ry,g,k){
  const T=new THREE.Group();T.position.set(x,groundAt(x,z),z);T.rotation.y=ry;g.add(T);
  const cab=CAR_PAINT[k%CAR_PAINT.length];
  put(BX(2.5,0.5,11.8),PM.steel,0,0.9,0,T);put(BX(2.5,2.4,2.4),cab,0,2.2,-4.7,T);put(BX(2.3,1.0,0.06),PM.win,0,2.75,-5.92,T);put(BX(2.55,0.5,0.4),KM.chrome,0,0.95,-5.9,T);
  put(BX(2.44,2.6,6.06),PM.cont[k%PM.cont.length],0,2.45,0.4,T);put(BX(2.44,2.6,3.0),PM.cont[(k+3)%PM.cont.length],0,2.45,4.45,T);
  for(const zz of [-4.6,-2.4,2.6,3.8,5.0])for(const s of [-1,1]){const w=put(CY(0.5,0.5,0.4,12),KM.tire,s*1.1,0.5,zz,T);w.rotation.z=Math.PI/2;}
  const c=Math.abs(Math.sin(ry))>0.5;addObstacle({type:"box",x,z,hx:c?6:1.35,hz:c?1.35:6,tall:true,top:groundAt(x,z)+3.8});
}
// chariot élévateur : va et vient sur une voie, s'arrête si quelqu'un est devant, bip en marche arrière
const portFork=[];
function forklift(ax,az,bx,bz,g,k){
  const F=new THREE.Group();F.userData.keep=true;g.add(F);
  put(BX(1.2,0.9,2.0),PM.fork,0,0.75,0,F);put(BX(1.15,0.6,0.5),PM.black,0,0.9,0.95,F);put(BX(0.5,0.55,0.4),PM.black,0,1.45,0.15,F);
  for(const [dx,dz] of [[-0.5,-0.55],[0.5,-0.55],[-0.5,0.5],[0.5,0.5]])put(BX(0.06,1.3,0.06),PM.black,dx,1.85,dz,F);put(BX(1.1,0.06,1.2),PM.black,0,2.5,0,F);
  for(const s of [-0.38,0.38])put(BX(0.1,2.6,0.12),PM.steel,s,1.35,-1.1,F);
  const lift=new THREE.Group();lift.position.set(0,0.25,-1.2);F.add(lift);for(const s of [-0.28,0.28])put(BX(0.1,0.05,1.1),PM.steel,s,0,-0.55,lift);
  const load=new THREE.Group();lift.add(load);put(BX(1.1,0.14,1.0),OM.wood,0,0.1,-0.55,load);put(BX(1.0,0.75,0.9),OM.crate,0,0.55,-0.55,load);
  for(const [dx,dz] of [[-0.62,-0.6],[0.62,-0.6],[-0.62,0.55],[0.62,0.55]]){const w=put(CY(0.28,0.28,0.22,10),KM.tire,dx,0.28,dz,F);w.rotation.z=Math.PI/2;}
  const bc=put(geo("pbeacon",()=>new THREE.SphereGeometry(0.09,8,6)),PM.beacon,0,2.6,0.3,F);
  const a=new V3(ax,0,az),b=new V3(bx,0,bz),o=addObstacle({type:"circle",x:ax,z:az,r:1.15});
  const f={F,lift,load,bc,a,b,t:(k*0.37)%1,dir:1,wait:0,o,beepT:0,len:hdist(a,b)};portFork.push(f);return f;
}
// grue portique (STS) : la chariot va du quai au cargo, descend, remonte avec un conteneur
const portCranes=[];
function stsCrane(zc,g,anim,k){
  const m=k%2?PM.craneB:PM.craneA,X0=635,X1=649,y=PORT.h,top=y+26;
  for(const x of [X0,X1])for(const s of [-1,1]){put(BX(1,26,1),m,x,y+13,zc+s*7,g);put(BX(1.4,0.8,2.2),PM.steel,x,y+0.4,zc+s*7,g);addObstacle({type:"circle",x,z:zc+s*7,r:0.75,tall:true});}
  for(const x of [X0,X1])put(BX(1,1.2,15),m,x,y+12,zc,g);
  for(const s of [-1,1]){put(BX(15,1.2,1),m,(X0+X1)/2,top,zc+s*7,g);put(BX(80,1.6,0.8),m,650,top+1.4,zc+s*2.2,g);}
  for(let x=614;x<=688;x+=6)put(BX(0.4,0.4,4.4),m,x,top+1.4,zc,g);
  for(const s of [-1,1]){const P0=new V3(X0,top+1.4,zc+s*2.2),P1=new V3(X1,top+1.4,zc+s*2.2),A=new V3(642,top+14,zc+s*2.2);
    beamTo(P0,A,0.9,m,g);beamTo(P1,A,0.9,m,g);beamTo(A,new V3(689,top+2,zc+s*2.2),0.25,PM.steel,g);beamTo(A,new V3(612,top+2,zc+s*2.2),0.25,PM.steel,g);}
  put(BX(9,3.4,5.4),PM.white,618,top+3.9,zc,g);put(BX(9.1,1,5.5),m,618,top+6.1,zc,g);
  put(BX(1,1,5.4),m,642,top+14,zc,g);put(BX(4,0.6,0.6),PM.yel,642,y+8,zc-7.6,g);
  const L=new THREE.Mesh(geo("pcraneL",()=>new THREE.SphereGeometry(0.35,8,6)),PM.redL);L.position.set(642,top+14.7,zc);anim.add(L);
  // chariot, cabine, câbles, palonnier, conteneur
  const tr=new THREE.Group();anim.add(tr);put(BX(3,1.2,5),PM.steel,0,0,0,tr);put(BX(2,1.8,2),PM.white,0,-1.4,-1.4,tr);put(BX(1.9,1.0,0.06),PM.win,0,-1.3,-2.42,tr);
  const cab=[];for(const [dx,dz] of [[-0.9,-1.6],[0.9,-1.6],[-0.9,1.6],[0.9,1.6]]){const c=put(BX(0.05,1,0.05),PM.black,dx,0,dz,anim);cab.push(c);}
  const sp=new THREE.Group();anim.add(sp);put(BX(2.6,0.4,6.3),PM.yel,0,0,0,sp);const box=put(BX(2.44,2.6,6.06),PM.cont[(k*3+1)%PM.cont.length],0,-1.55,0,sp);
  const C={tr,sp,box,cab,L,zc,top,ph:k*9.7};portCranes.push(C);return C;
}
function updateCrane(C,dt){
  const T=36,t=(clockT+C.ph)%T,hy=C.top-2,yS=13.5,yQ=PORT.h+4.5;
  let x=642,y=hy;
  if(t<6){x=lerp(642,663,smooth01(t/6));}
  else if(t<10){x=663;y=lerp(hy,yS,smooth01((t-6)/4));}else if(t<12){x=663;y=yS;}else if(t<16){x=663;y=lerp(yS,hy,smooth01((t-12)/4));}
  else if(t<22){x=lerp(663,642,smooth01((t-16)/6));}
  else if(t<26){y=lerp(hy,yQ,smooth01((t-22)/4));}else if(t<28){y=yQ;}else if(t<32){y=lerp(yQ,hy,smooth01((t-28)/4));}
  C.tr.position.set(x,C.top+0.2,C.zc);C.sp.position.set(x,y,C.zc);C.box.visible=t>=27||t<11;
  const L=C.top-0.6-(y+0.2);for(const c of C.cab){c.position.set(x+(c===C.cab[0]||c===C.cab[2]?-0.9:0.9),y+0.2+L/2,C.zc+(c===C.cab[0]||c===C.cab[1]?-1.6:1.6));c.scale.y=Math.max(0.1,L);}
  C.L.visible=Math.floor(clockT*1.4+C.ph)%2===0;
}
// cargo amarré le long du quai (x 654..670) : coque, château, conteneurs en pontée
function cargoShip(zc,k,g){
  const S=new THREE.Group();S.position.set(662,WATER_Y,zc);g.add(S);
  const hull=new THREE.Shape([new THREE.Vector2(-8,-44),new THREE.Vector2(8,-44),new THREE.Vector2(8,30),new THREE.Vector2(0,44),new THREE.Vector2(-8,30)]);
  const gm=geo("pcargoHull",()=>{const e=new THREE.ExtrudeGeometry(hull,{depth:9.5,bevelEnabled:false});e.rotateX(-Math.PI/2);e.translate(0,-4.5,0);return e;});
  put(gm,k%2?PM.hullB:PM.hullA,0,0,0,S);
  const band=geo("pcargoBand",()=>{const e=new THREE.ExtrudeGeometry(hull,{depth:0.9,bevelEnabled:false});e.rotateX(-Math.PI/2);e.scale(1.006,1,1.003);e.translate(0,-0.9,0);return e;});put(band,PM.hullRed,0,0,0,S);
  put(BX(15.6,0.1,72),PM.deck,0,5.02,-2,S);
  // château à l'arrière (+z)
  put(BX(14,12,8),PM.white,0,11,36,S);for(let f=0;f<4;f++)put(BX(14.1,0.8,8.1),PM.win,0,7.6+f*2.8,36,S);put(BX(18,1.4,4),PM.white,0,17.6,34.5,S);put(BX(17,0.9,0.1),PM.win,0,17.6,32.45,S);
  put(BX(3.6,6,3.6),k%2?KM.red:KM.yellow,0,20,39,S);put(BX(3.7,1,3.7),PM.black,0,23.4,39,S);put(BX(0.2,5,0.2),PM.steel,0,21,34,S);
  // conteneurs en pontée (une boîte par pile)
  const r=mulberry(9000+k*77);
  for(let bay=0;bay<9;bay++)for(let c=0;c<6;c++){const h=1+Math.floor(r()*4);if(r()<0.08)continue;const m=PM.plain[Math.floor(r()*PM.plain.length)];
    put(BX(2.4,2.6*h,6.1),m,-6.1+c*2.44,5+1.3*h,-38+bay*7.2,S);}
  put(BX(16,2.2,0.6),PM.white,0,4.6,32.8,S);
  const name=["MAREVIA STAR","BALENA AURORA"][k%2],sm=signMat(name,"#ffffff00","#f2f0ea",{w:512,h:72});
  for(const s of [-1,1]){const p=new THREE.Mesh(new THREE.PlaneGeometry(9,1.3),sm);p.position.set(s*8.05,3.2,-26);p.rotation.y=s*Math.PI/2;S.add(p);}
  addObstacle({type:"box",x:662,z:zc,hx:8.2,hz:44,tall:true,top:16});
  // amarres
  for(const dz of [-38,-20,20,38]){const bx=651.2,bz=zc+dz;beamTo(new V3(bx,PORT.h+0.55,bz),new V3(654.2,WATER_Y+5.2,bz+(dz>0?-4:4)),0.07,PM.rope,g);}
}
// chalutier (quai de pêche au sud du port)
const portBoats=[];
function trawler(x,z,k,g){
  const B=new THREE.Group();B.position.set(x,WATER_Y,z);B.userData.keep=true;g.add(B);
  const hc=[KM.blue,KM.red,KM.green][k%3];
  const hull=new THREE.Shape([new THREE.Vector2(-2.6,-8),new THREE.Vector2(2.6,-8),new THREE.Vector2(2.6,5),new THREE.Vector2(0,8.5),new THREE.Vector2(-2.6,5)]);
  const gm=geo("ptrawl",()=>{const e=new THREE.ExtrudeGeometry(hull,{depth:2.6,bevelEnabled:false});e.rotateX(-Math.PI/2);e.translate(0,-1.2,0);return e;});
  put(gm,hc,0,0,0,B);put(BX(5.0,0.08,12.6),OM.wood,0,1.42,-1.2,B);put(BX(5.3,0.35,0.2),PM.white,0,1.6,-8,B);
  put(BX(3.2,2.4,3.4),PM.white,0,2.6,1.6,B);put(BX(3.3,0.7,3.5),PM.win,0,3.3,1.6,B);put(BX(3.5,0.2,3.7),hc,0,3.9,1.6,B);
  put(CY(0.09,0.12,8,6),PM.steel,0,5.4,-1.5,B);for(const s of [-1,1]){const b=put(CY(0.05,0.07,6,6),PM.steel,s*1.7,4.6,-1.5,B);b.rotation.z=s*0.9;}
  put(CY(0.6,0.6,2.4,10),PM.net,0,2.0,-5.6,B).rotation.z=Math.PI/2;put(geo("pnet",()=>new THREE.IcosahedronGeometry(0.9,0)),PM.net,0.8,1.8,-3.8,B,0,1.3,0.6,1);
  const nm=signMat(["Belle-Écume","Saint-Ange II","Petit Goéland"][k%3],"#ffffff00","#ffffff",{w:384,h:64});
  for(const s of [-1,1]){const p=new THREE.Mesh(new THREE.PlaneGeometry(3.4,0.55),nm);p.position.set(s*2.62,0.9,4);p.rotation.y=s*Math.PI/2;B.add(p);}
  addObstacle({type:"box",x,z,hx:2.8,hz:8.2,tall:true});portBoats.push({B,ph:k*2.1});
  beamTo(new V3(x-2.5,PORT.h+0.55,-302.8),new V3(x-2.2,WATER_Y+1.5,z-6.5),0.06,PM.rope,g);
}
function bollard(x,z,g){const y=groundAt(x,z);put(CY(0.22,0.26,0.55,10),PM.black,x,y+0.27,z,g);put(CY(0.32,0.32,0.08,10),PM.black,x,y+0.58,z,g);addObstacle({type:"circle",x,z,r:0.3});}
function floodMast(x,z,g){const y=groundAt(x,z);put(CY(0.18,0.28,18,8),PM.steel,x,y+9,z,g);put(BX(2.6,0.5,0.9),PM.steel,x,y+18.2,z,g);for(const s of [-0.8,0,0.8])put(BX(0.6,0.35,0.15),OM.lamp,x+s,y+17.9,z+0.46,g);addObstacle({type:"circle",x,z,r:0.32,tall:true});}
// ---------------------------------------------------------------- tronçons du quai (construits à la demande)
const PORT_SEC=[0,1,2,3].map(k=>({k,z0:PORT.z0+k*57,z1:PORT.z0+(k+1)*57,g:null,anim:null,obs:[],amb:[]}));
const portStats={built:0,lastMs:0,maxMs:0};
function buildPortSection(S){
  const t0=performance.now(),g=new THREE.Group(),anim=new THREE.Group(),r=mulberry(4242+S.k*911),{z0,z1}=S,zc=(z0+z1)/2;
  obsSink=S.obs;S.amb=[];ambSink=S.amb;const n0=[portCranes.length,portFork.length,portBoats.length];
  // dalle du quai : faces en béton, dessus en dalles, joints, ligne jaune de sécurité, rails des portiques
  box(PORT.x0,z0,PORT.x1,z1,-4,PORT.h,PM.quay,g);plane(PORT.x1-PORT.x0,z1-z0,PM.slab,(PORT.x0+PORT.x1)/2,PORT.h+0.004,zc,g,(PORT.x1-PORT.x0)/6,(z1-z0)/6);
  plane(0.25,z1-z0,PM.yel,650.6,PORT.h+0.01,zc,g);for(const x of [635,649])for(const s of [-0.6,0.6])put(BX(0.12,0.08,z1-z0),PM.rail,x+s,PORT.h+0.04,zc,g);
  if(S.k===0)put(BX(PORT.x1-PORT.x0,0.4,0.25),PM.yel,(PORT.x0+PORT.x1)/2,PORT.h+0.2,z0+0.15,g);
  if(S.k===3)plane(PORT.x1-PORT.x0,0.25,PM.yel,(PORT.x0+PORT.x1)/2,PORT.h+0.01,z1-1.4,g);
  // bord du quai : pneus de défense, bittes d'amarrage
  for(let z=z0+3;z<z1-1;z+=9){bollard(651.2,z,g);const f=put(geo("ptire",()=>new THREE.TorusGeometry(0.45,0.17,8,14)),PM.fender,652.12,PORT.h-0.7,z+4.5,g);f.rotation.y=Math.PI/2;}
  if(S.k===3)for(let x=592;x<650;x+=8){bollard(x,-302.8,g);const f=put(geo("ptire",()=>new THREE.TorusGeometry(0.45,0.17,8,14)),PM.fender,x+4,PORT.h-0.7,-301.88,g);}
  for(const L of LADDERS)if(L.z>=z0&&L.z<z1&&(L.x>652||L.z>-302)){for(const s of [-0.25,0.25])put(BX(0.05,3.4,0.05),KM.chrome,L.x+(L.iz?s:0),PORT.h-1.6,L.z+(L.iz?0:s),g);for(let y=-1.3;y<PORT.h+0.2;y+=0.3)put(BX(L.iz?0.5:0.04,0.04,L.iz?0.04:0.5),KM.chrome,L.x,y,L.z,g);}
  floodMast(633,z0+12,g);floodMast(590.6,zc,g);
  // le labyrinthe de conteneurs (6 × 8 cellules de 6,3 m)
  const M=portMaze(6,8,r,0.14);mazeOpen(M,"W",3,r);mazeOpen(M,"E",3,r);mazeOpen(M,"N",2,r);mazeOpen(M,"S",2,r);
  mazeBuild(M,592.5,z0+2.3,6.3,g,r,S.k*17,true);
  // portique + chariot élévateur + dockers
  stsCrane(zc,g,anim,S.k);
  forklift(642,z0+5,642,z1-5,anim,S.k);
  addAmb("docker",646,zc+9,90);
  const da=addAmb("docker",590,z0+8+r()*10,180);da.b={x:590,z:z1-8};
  if(S.k%2)addAmb("docker",643.5,zc-11,270);
  // cargos
  for(const [cz,k] of [[-470,0],[-366,1]])if(cz>=z0&&cz<z1)cargoShip(cz,k,g);
  // quai de pêche : chalutiers, caisses de poissons, filets
  if(S.k===3){for(let i=0;i<3;i++)trawler(600+i*18,-293.2,i,anim);
    for(let i=0;i<5;i++){const x=596+i*9+r()*2,y=PORT.h;put(BX(1.4,0.35,0.9),[KM.blue,PM.white,KM.red][i%3],x,y+0.18,-305.5,g);put(BX(1.3,0.35,0.85),[PM.white,KM.blue][i%2],x+0.1,y+0.53,-305.5,g);addObstacle({type:"box",x,z:-305.5,hx:0.75,hz:0.5});}
    put(geo("pnetpile",()=>new THREE.IcosahedronGeometry(1.2,0)),PM.net,640,PORT.h+0.3,-306,g,0,1.6,0.4,1.2);addObstacle({type:"circle",x:640,z:-306,r:1.5});
    addAmb("pecheur",604,-302.4,180);addAmb("docker",628,-305.5,180);}
  [portCranes,portFork,portBoats].forEach((L,i)=>{for(let k=n0[i];k<L.length;k++)L[k].sec=S;});
  obsSink=null;ambSink=null;
  bake(g);g.add(anim);scene.add(g);S.g=g;S.anim=anim;
  portStats.built++;portStats.lastMs=performance.now()-t0;portStats.maxMs=Math.max(portStats.maxMs,portStats.lastMs);
}
function unloadPortSection(S){
  for(const L of [portCranes,portFork,portBoats])for(let i=L.length-1;i>=0;i--)if(L[i].sec===S)L.splice(i,1);
  for(const o of S.obs)removeObstacle(o);S.obs=[];dropAmb(S.amb);S.amb=[];
  S.g.traverse(o=>{if(o.isMesh&&!o.geometry.userData.shared)o.geometry.dispose();});scene.remove(S.g);S.g=null;S.anim=null;
}
let portCk=0;
function updatePortStream(dt,force){
  portCk-=dt;if(portCk>0&&!force)return;portCk=0.3;
  const px=player.root.x,pz=player.root.z,R=LOAD_R*CHUNK+60;let built=false;
  for(const S of PORT_SEC){const dx=Math.max(0,PORT.x0-px,px-700),dz=Math.max(0,S.z0-pz,pz-S.z1),d=Math.hypot(dx,dz);
    if(!S.g&&d<R&&(!built||force)){buildPortSection(S);built=true;}
    else if(S.g&&d>R+80)unloadPortSection(S);}
}
// ---------------------------------------------------------------- îlots du port en ville
BUILDERS.port_conteneurs=function(ch,C){const {X,Z,bx0,bz0,bx1,bz1,bcx,bcz,r,base,mid,detail,prop}=C;
  plane(32,32,WM.asphalt,bcx,SIDEWALK+0.006,bcz,base,8,8);
  const M=portMaze(4,4,r,0.12);mazeOpen(M,"W",1,r);mazeOpen(M,"N",1,r);mazeOpen(M,"S",1,r);mazeOpen(M,"E",C.cx===14?2:1,r);
  mazeBuild(M,bx0+4,bz0+4,6,base,r,Math.abs(C.cx*7+C.cz*3),true);
  for(const [x,z] of [[bx0+2,bz0+2],[bx1-2,bz1-2]])floodMast(x,z,mid);
  prop("lamp",bx1-2,bz0+2,0);prop("lamp",bx0+2,bz1-2,0);
  if(r()<0.6)addAmb("docker",bx0+1.4,bcz+r()*8-4,270);
  if(C.cx===14)put(BX(6,1.2,0.1),signMat("QUAIS ↑ PORT DE LA VIGIE","#1f3a5a","#ffffff",{w:512,h:96}),bx1-1.5,2.4,bcz,detail,Math.PI/2);
};
BUILDERS.port_entrepot=function(ch,C){const {X,Z,bx0,bz0,bx1,bz1,bcx,bcz,r,base,mid,detail,prop}=C;
  plane(32,32,WM.asphalt,bcx,SIDEWALK+0.006,bcz,base,8,8);
  const x0=bx0+3,x1=bx1-3,z0=bz0+15,z1=bz1-3,h=9+r()*3,wm=mat({color:["#c9cdd1","#b7c3cc","#d1c6b4","#a9b8b0"][Math.abs(C.cz)%4],map:KM.corrug.map});
  walls(x0,z0,x1,z1,0,h,wm,base,3,h);put(BX(x1-x0+0.6,0.4,z1-z0+0.6),KM.roofSlate,(x0+x1)/2,h+0.2,(z0+z1)/2,base);
  for(let i=0;i<3;i++){const x=x0+4.5+i*8;const open=i===1;put(BX(4.4,4.6,0.05),open?KM.dark:KM.roller,x,2.4,z0-0.03,base);put(BX(5,1.1,1.4),KM.stone,x,0.55,z0-0.7,base);put(BX(5.2,0.3,0.3),PM.yel,x,1.2,z0-1.4,base);}
  put(BX(10,1.2,0.1),signMat(PORT_SIGNS[Math.abs(C.cz*3+C.cx)%PORT_SIGNS.length],"#20262d","#ffd23a",{w:512,h:64}),(x0+x1)/2,h-1.4,z0-0.06,base);
  addObstacle({type:"box",x:(x0+x1)/2,z:(z0+z1)/2,hx:(x1-x0)/2,hz:(z1-z0)/2,tall:true,bld:true});
  for(const [i,x] of [[0,x0+4.5],[2,x0+20.5]])if(r()<0.8)semiTruck(x,bz0+8.2,0,mid,Math.abs(C.cz)+i);
  for(let i=0;i<4;i++){const x=x0+9+r()*6,z=bz0+5+r()*7;if(prop("crate",x,z,r()*0.4))break;}
  addAmb("docker",x0+12.5,z0-2.6,180);
  for(const x of [bx0+2,bx1-2])prop("lamp",x,bz0+2.2,0);
};
BUILDERS.port_capitainerie=function(ch,C){const {X,Z,bx0,bz0,bx1,bz1,bcx,bcz,r,base,mid,detail,prop}=C;
  const x0=bcx-8,x1=bcx+6,z0=bcz-2,z1=bcz+8;
  walls(x0,z0,x1,z1,0,7,FACADES[1],base,4,3.2);put(BX(x1-x0+0.4,0.4,z1-z0+0.4),KM.white,(x0+x1)/2,7.2,(z0+z1)/2,base);
  put(BX(9,1.1,0.1),signMat("CAPITAINERIE · PORT DE LA VIGIE","#1f3a5a","#ffffff",{w:640,h:72}),(x0+x1)/2,5.6,z0-0.06,base);
  put(BX(2,2.6,0.08),KM.door,(x0+x1)/2,1.3,z0-0.05,base);
  const tx=x1+3.5,tz=bcz+3;put(CY(2.2,2.4,15,16),KM.white,tx,7.5,tz,base);put(CY(2.8,2.8,2.4,16),KM.glass,tx,16.2,tz,base);put(CY(3.1,3.1,0.4,16),KM.red,tx,17.6,tz,base);put(CY(0.06,0.06,5,6),PM.steel,tx,20.3,tz,base);
  addObstacle({type:"box",x:(x0+x1)/2,z:(z0+z1)/2,hx:(x1-x0)/2,hz:(z1-z0)/2,tall:true,bld:true});addObstacle({type:"circle",x:tx,z:tz,r:2.5,tall:true});
  put(CY(0.05,0.05,9,6),KM.chrome,bx0+4,4.5,bz0+4,mid);put(BX(0.05,1.1,1.8),signMat("⚓","#1f4fa0","#ffffff",{w:128,h:96}),bx0+4,8.4,bz0+4.95,mid);addObstacle({type:"circle",x:bx0+4,z:bz0+4,r:0.15});
  for(let i=0;i<4;i++)parkedCar(bx0+5+i*3.2,bz1-5,Math.PI/2,mid,CAR_PAINT[(i*3+Math.abs(C.cx))%CAR_PAINT.length]);
  prop("bench",bcx-4,bz0+5,0);prop("bench",bcx+2,bz0+5,0);prop("bin",bcx-1,bz0+5,0);
  for(const x of [bx0+2,bx1-2])prop("lamp",x,bz0+2.2,0);
  addShop("Distributeur de boissons du port",bcx+4.5,bz0+5);
};
BUILDERS.port_parking=function(ch,C){const {X,Z,bx0,bz0,bx1,bz1,bcx,bcz,r,base,mid,detail,prop}=C;
  plane(32,32,WM.asphalt,bcx,SIDEWALK+0.006,bcz,base,8,8);
  for(let i=0;i<4;i++){const x=bx0+6+i*6.6;for(let s=0;s<2;s++)put(BX(0.15,0.01,13),WM.line,x-3.3+s*6.6,SIDEWALK+0.012,bcz+3,detail);if(r()<0.85)semiTruck(x,bcz+3,r()<0.5?0:Math.PI,mid,i+Math.abs(C.cz));}
  put(BX(2.4,2.6,2.4),KM.white,bx1-4,1.4,bz0+5,base);put(BX(2.5,0.8,2.5),PM.win,bx1-4,2.0,bz0+5,base);put(BX(2.7,0.2,2.7),KM.red,bx1-4,2.8,bz0+5,base);addObstacle({type:"box",x:bx1-4,z:bz0+5,hx:1.25,hz:1.25,tall:true});
  const bar=put(BX(5,0.12,0.12),KM.red,bx1-8,1.1,bz0+3.4,mid);bar.rotation.z=0.0;put(BX(0.4,1.1,0.4),KM.white,bx1-5.3,0.6,bz0+3.4,mid);
  addAmb("docker",bx1-6,bz0+6,0);
  for(const x of [bx0+2,bx1-2])prop("lamp",x,bz1-2.2,0);
};
for(const t of ["port_conteneurs","port_entrepot","port_capitainerie","port_parking"])PRIVATE.add(t);
Object.assign(QUARTIER_NOMS,{port_conteneurs:"Port de la Vigie",port_entrepot:"Docks de la Vigie",port_capitainerie:"Capitainerie",port_parking:"Parc à camions"});
Object.assign(TYPE_COLOR,{port_conteneurs:"#6f6a5f",port_entrepot:"#7b7f86",port_capitainerie:"#8a94a0",port_parking:"#5a5e66"});
// ---------------------------------------------------------------- vie du port : grues, chariots, bateaux, mouettes, sons
const gulls=[];{
  const gm=geo("pgull",()=>{const s=new THREE.Shape([new THREE.Vector2(0,0),new THREE.Vector2(0.55,0.12),new THREE.Vector2(0.2,-0.05)]);return new THREE.ShapeGeometry(s);});
  const gw=new THREE.MeshBasicMaterial({color:0xf4f4f0,side:THREE.DoubleSide,fog:true});
  for(let i=0;i<9;i++){const b=new THREE.Group();const L=new THREE.Mesh(gm,gw),R=new THREE.Mesh(gm,gw);R.scale.x=-1;L.rotation.x=R.rotation.x=-Math.PI/2;b.add(L,R);b.add(new THREE.Mesh(BX(0.12,0.1,0.45),gw));
    b.visible=false;scene.add(b);gulls.push({b,L,R,cx:600+(i%3)*25,cz:-480+Math.floor(i/3)*70,rad:10+i*2.3,h:14+(i%4)*4,sp:0.25+(i%5)*0.06,ph:i*1.7});}
}
function portSound(kind,vol){const c=actx;if(!c||c.state!=="running"||vol<0.01)return;try{const t=c.currentTime,out=sfxOut();
  if(kind==="horn"){const g=c.createGain(),f=c.createBiquadFilter();f.type="lowpass";f.frequency.value=420;g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(0.22*vol,t+0.25);g.gain.setValueAtTime(0.22*vol,t+2.3);g.gain.linearRampToValueAtTime(0,t+3.0);f.connect(g);g.connect(out);
    for(const fr of [73,110,146.5]){const o=c.createOscillator();o.type="sawtooth";o.frequency.value=fr;o.connect(f);o.start(t);o.stop(t+3.1);}}
  else if(kind==="beep"){const g=c.createGain(),o=c.createOscillator();o.type="square";o.frequency.value=1150;g.gain.setValueAtTime(0.05*vol,t);g.gain.setValueAtTime(0,t+0.18);o.connect(g);g.connect(out);o.start(t);o.stop(t+0.2);}
  else if(kind==="gull"){const g=c.createGain(),o=c.createOscillator();o.type="triangle";o.frequency.setValueAtTime(1900,t);o.frequency.exponentialRampToValueAtTime(1050,t+0.32);o.frequency.setValueAtTime(1700,t+0.36);o.frequency.exponentialRampToValueAtTime(950,t+0.62);
    g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(0.05*vol,t+0.03);g.gain.linearRampToValueAtTime(0.02*vol,t+0.32);g.gain.linearRampToValueAtTime(0.05*vol,t+0.38);g.gain.linearRampToValueAtTime(0,t+0.64);o.connect(g);g.connect(out);o.start(t);o.stop(t+0.66);}
}catch(e){}}
const PORT_AUD={horn:20,gull:4};
function nearPort(px,pz){const dx=Math.max(0,468-px,px-700),dz=Math.max(0,PORT.z0-pz,pz-PORT.z1);return Math.hypot(dx,dz);}
function updatePort(dt){
  updatePortStream(dt);
  for(const C of portCranes.slice()){if(!C.tr.parent||!C.tr.parent.parent){portCranes.splice(portCranes.indexOf(C),1);continue;}updateCrane(C,dt);}
  for(const B of portBoats.slice()){if(!B.B.parent||!B.B.parent.parent){portBoats.splice(portBoats.indexOf(B),1);continue;}B.B.position.y=WATER_Y+Math.sin(clockT*1.0+B.ph)*0.1;B.B.rotation.z=Math.sin(clockT*0.8+B.ph)*0.035;B.B.rotation.x=Math.sin(clockT*0.6+B.ph*2)*0.02;}
  for(const f of portFork.slice()){
    if(!f.F.parent||!f.F.parent.parent){portFork.splice(portFork.indexOf(f),1);continue;}
    const from=f.dir>0?f.a:f.b,to=f.dir>0?f.b:f.a,dir=new V3().subVectors(to,from).normalize();
    const pos=new V3().lerpVectors(f.a,f.b,f.t),y=groundAt(pos.x,pos.z);
    let blocked=false;for(const w of walkers){const d=new V3(w.root.x-pos.x,0,w.root.z-pos.z),ahead=d.dot(dir),side=Math.abs(d.x*dir.z-d.z*dir.x);if(ahead>0&&ahead<3.4&&side<1.4){blocked=true;break;}}
    if(f.wait>0)f.wait-=dt;
    else if(!blocked){f.t+=f.dir*dt*2.2/f.len;if(f.t>=1||f.t<=0){f.t=clamp01(f.t);f.dir*=-1;f.wait=rand(2.5,5);f.load.visible=!f.load.visible;}}
    // le chariot roule fourches devant à l'aller, en marche arrière au retour (bip)
    const fwd=f.dir>0,yaw=Math.atan2(f.b.x-f.a.x,f.b.z-f.a.z);
    f.F.position.set(pos.x,y,pos.z);f.F.rotation.y=yaw+Math.PI;f.lift.position.y=0.25+(f.wait>0?Math.min(1,f.wait)*0.5:0);
    f.bc.visible=Math.floor(clockT*3)%2===0;
    if(!fwd&&f.wait<=0&&!blocked){f.beepT-=dt;if(f.beepT<=0){f.beepT=0.55;const d=hdist(player.root,pos);if(d<26)portSound("beep",1-d/26);}}
    if(blocked&&f.wait<=0){f.beepT-=dt;if(f.beepT<=0){f.beepT=2.5;const d=hdist(player.root,pos);if(d<14&&Math.random()<0.5)hornSound(0.5*(1-d/14));}}
    gridRemove(f.o);f.o.x=pos.x;f.o.z=pos.z;gridAdd(f.o);
  }
  const dp=nearPort(player.root.x,player.root.z);
  for(const G of gulls){G.b.visible=dp<160;if(!G.b.visible)continue;const a=clockT*G.sp+G.ph;G.b.position.set(G.cx+Math.cos(a)*G.rad,G.h+Math.sin(clockT*0.7+G.ph)*1.5,G.cz+Math.sin(a)*G.rad);G.b.rotation.y=-a;
    const fl=Math.sin(clockT*7+G.ph)*0.5*(Math.sin(clockT*0.5+G.ph)>0?1:0.15);G.L.rotation.z=fl;G.R.rotation.z=-fl;}
  if(dp<220&&!menuOpen){PORT_AUD.horn-=dt;PORT_AUD.gull-=dt;
    if(PORT_AUD.horn<=0){PORT_AUD.horn=rand(45,90);portSound("horn",Math.max(0.15,1-dp/220));}
    if(PORT_AUD.gull<=0){PORT_AUD.gull=rand(3,9);if(dp<90)portSound("gull",1-dp/90);}}
}
// la police (et l'hélico) perd la vue quand on se faufile entre les conteneurs
function portHidden(p){
  if(!(inPortDeck(p.x,p.z)||inPort(Math.round((p.x-4)/CHUNK),Math.round((p.z-4)/CHUNK))))return false;
  let n=0;for(const o of obsAt(p))if(o.cont&&obstacleClosest(o,p).d<1.9)n++;return n>=1;
}
