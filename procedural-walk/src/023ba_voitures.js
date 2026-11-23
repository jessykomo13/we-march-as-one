// ================================================================ VOITURES : modèles variés (tous inventés)
// Chaque modèle a une silhouette (boîtes biseautées) et une conduite à lui. Les mêmes géométries servent aux voitures
// garées (cuites dans le décor), à celles qu'on conduit (roues qui tournent et braquent) et à la circulation (un seul
// maillage par voiture). Les supercars sont plus fréquentes dans les quartiers riches.
// cab = [longueur, hauteur, décalage z, retrait avant (pare-brise), retrait arrière]
const CAR_MODELS={
  citadine:{name:"Pixa",            L:3.7,W:1.68,bh:0.56,y0:0.27,r:0.3, wb:1.22,cab:[2.0,0.62,-0.1,0.5,0.3], hood:0.07,acc:8.5,vmax:35,grip:10.5,steer:0.68,brake:1,off:0.55},
  berline: {name:"Aurelia",         L:4.5,W:1.8, bh:0.6, y0:0.28,r:0.33,wb:1.42,cab:[2.4,0.55,-0.2,0.6,0.55],hood:0.1, acc:10, vmax:43,grip:11,  steer:0.6, brake:1,off:0.55},
  suv:     {name:"Montaro",         L:4.7,W:1.92,bh:0.82,y0:0.4, r:0.4, wb:1.45,cab:[2.8,0.68,-0.3,0.5,0.15],hood:0.08,acc:9.5,vmax:41,grip:10,  steer:0.55,brake:0.95,off:0.85,seat:0.2},
  pickup:  {name:"Torvik",          L:5.2,W:1.95,bh:0.78,y0:0.44,r:0.42,wb:1.7, cab:[1.7,0.68,0.55,0.4,0.05],hood:0.06,acc:9,  vmax:39,grip:9.5, steer:0.52,brake:0.9,off:0.9,seat:0.2,bed:true},
  van:     {name:"Cargo",           L:4.9,W:1.95,bh:0.62,y0:0.36,r:0.36,wb:1.6, acc:7,  vmax:32,grip:9,   steer:0.55,brake:0.85,off:0.6,seat:0.25,box:true},
  muscle:  {name:"Furia 68",        L:4.8,W:1.88,bh:0.58,y0:0.27,r:0.36,wb:1.5, cab:[2.0,0.48,-0.45,0.55,0.6],hood:0.04,acc:13, vmax:51,grip:9,   steer:0.56,brake:1,off:0.5,scoop:true,chrome:true,slide:1},
  sport:   {name:"Zefiro GT",       L:4.4,W:1.88,bh:0.5, y0:0.22,r:0.34,wb:1.36,cab:[2.0,0.45,-0.3,0.75,0.65],hood:0.14,acc:14.5,vmax:57,grip:12.5,steer:0.6,brake:1.15,off:0.45,spoiler:1,seat:-0.12},
  cabrio:  {name:"Libeccio Spider", L:4.2,W:1.8, bh:0.52,y0:0.24,r:0.33,wb:1.3, cab:[1.6,0.42,-0.3,0.55,0.4],hood:0.12,acc:12, vmax:50,grip:12,  steer:0.62,brake:1.1,off:0.45,cabrio:true,seat:-0.08},
  super:   {name:"Fulmine R",       L:4.6,W:2.0, bh:0.44,y0:0.17,r:0.34,wb:1.42,cab:[2.1,0.42,-0.15,0.95,0.75],hood:0.2,acc:18, vmax:68,grip:14,  steer:0.62,brake:1.3,off:0.35,wedge:true,spoiler:2,seat:-0.22,ww:0.32,slide:0.6},
  hyper:   {name:"Tempesta V12",    L:4.75,W:2.04,bh:0.42,y0:0.16,r:0.35,wb:1.48,cab:[2.0,0.4,-0.1,1.0,0.8], hood:0.22,acc:20, vmax:76,grip:15,  steer:0.6, brake:1.4,off:0.3,wedge:true,spoiler:3,seat:-0.24,ww:0.34,slide:0.5},
};
const CAR_GLASS=new THREE.MeshStandardMaterial({color:0x1a2a38,roughness:0.08,metalness:0.7});
const CARVC=new THREE.MeshStandardMaterial({vertexColors:true,roughness:0.5,metalness:0.3});
const SUPER_PAINT=["#9be01e","#ff7a00","#f5c400","#d81e2a","#6a2ad8","#f2f2f0","#1d1f24","#18a8c8"];
const PAINT_MATS=new Map();
function paintMat(hex){let m=PAINT_MATS.get(hex);if(!m){m=mat({color:hex,roughness:0.3,metalness:0.6});PAINT_MATS.set(hex,m);}return m;}
function carModelOf(kind){return CAR_MODELS[kind]?kind:kind==="van"||kind==="ambulance"?"van":"berline";}
// boîte dont le dessus peut être rétréci (nw), reculé à l'avant (fz) / l'arrière (bz) et abaissé (tf/tb) : capot, pare-brise, coin
function shapeBox(w,h,d,o){const g=new THREE.BoxGeometry(w,h,d).toNonIndexed();g.deleteAttribute("uv");
  if(o){const P=g.attributes.position;for(let i=0;i<P.count;i++){let x=P.getX(i),y=P.getY(i),z=P.getZ(i);
    if(y>0){if(o.nw)x*=o.nw;if(z>0){z-=o.fz||0;y-=o.tf||0;}else{z+=o.bz||0;y-=o.tb||0;}}else if(o.bnw)x*=o.bnw;P.setXYZ(i,x,y,z);}g.computeVertexNormals();}
  return g;}
const _pc=new THREE.Color();
function colorize(g,hex){const n=g.attributes.position.count,a=new Float32Array(n*3);_pc.set(hex);_pc.convertSRGBToLinear();for(let i=0;i<n;i++){a[i*3]=_pc.r;a[i*3+1]=_pc.g;a[i*3+2]=_pc.b;}g.setAttribute("color",new THREE.BufferAttribute(a,3));return g;}
// les pièces d'un modèle : c = "P" peinture, "G" vitres, "H" phares, "T" feux arrière, sinon une couleur fixe
function carParts(k){
  const M=CAR_MODELS[k],out=[],L=M.L,W=M.W,y0=M.y0,bh=M.bh,top=y0+bh;
  const add=(w,h,d,x,y,z,c,o)=>{out.push({g:shapeBox(w,h,d,o).translate(x,y,z),c});};
  if(M.box){ // fourgon : capot court + grande caisse
    add(W,bh,L,0,y0+bh/2,0,"P",{fz:0.1,tf:0.05});
    add(W,1.15,L-1.05,0,top+0.575,-0.52,"P",{nw:0.98});
    add(W-0.08,0.62,0.5,0,top+0.38,L/2-1.3,"G",{fz:0.32});
    for(const s of [-1,1])add(0.04,0.42,0.75,s*(W/2+0.005),top+0.5,L/2-1.75,"G");
  }else{
    const ft=M.wedge?{tf:0.16,fz:0.55,bz:0.12,tb:0.03}:{tf:M.hood,fz:0.16,bz:0.08,tb:0.03};
    add(W,bh,L,0,y0+bh/2,0,"P",ft);
    const [cl,ch,cz,cf,cb]=M.cab;
    if(M.cabrio){add(W-0.16,0.36,0.1,0,top+0.16,cz+cl/2-0.2,"G",{fz:0.22});add(W-0.5,0.26,0.9,0,top+0.04,cz-0.15,"#3a2418");
      for(const s of [-1,1])add(0.45,0.5,0.12,s*0.42,top+0.3,cz-0.55,"#3a2418");}
    else{add(W-0.14,ch,cl,0,top+ch/2-0.02,cz,"G",{fz:cf,bz:cb,nw:0.9});add(W*0.88,0.05,Math.max(0.4,cl-cf-cb+0.04),0,top+ch-0.005,cz+(cb-cf)/2,"P");}
    if(M.bed){const bz0=cz-cl/2,bl=bz0+L/2-0.05;for(const s of [-1,1])add(0.08,0.42,bl,s*(W/2-0.04),top+0.2,-L/2+bl/2+0.05,"P");add(W,0.42,0.08,0,top+0.2,-L/2+0.06,"P");add(W-0.2,0.04,bl,0,top+0.02,-L/2+bl/2+0.05,"#2a2a2a");}
    if(M.scoop)add(0.6,0.12,0.9,0,top-M.hood+0.05,L/2-1.0,"#151515",{fz:0.25});
    if(M.spoiler){const sh=M.spoiler>=2?0.32:0.08;if(M.spoiler>=2)for(const s of [-1,1])add(0.06,sh,0.12,s*(W/2-0.35),top+sh/2-0.02,-L/2+0.32,"#151515");
      add(M.spoiler>=2?W-0.1:W-0.3,0.05,M.spoiler>=2?0.38:0.22,0,top+sh,-L/2+(M.spoiler>=2?0.3:0.2),M.spoiler===3?"#151515":"P");}
    if(M.wedge){for(const s of [-1,1]){add(0.05,0.24,0.9,s*(W/2+0.005),y0+bh*0.55,-0.35,"#101010");add(0.04,0.08,L*0.7,s*(W/2+0.005),y0+0.06,0,"#101010");}
      add(W*0.7,0.08,0.06,0,y0+0.12,L/2+0.005,"#101010");add(W-0.3,0.18,0.05,0,y0+0.18,-L/2-0.005,"#151515");}
  }
  // pare-chocs, calandre, rétros, échappements
  const bc=M.chrome?"#c8ccd0":M.wedge?"#121212":"#26282c";
  if(!M.wedge){add(W+0.02,0.18,0.22,0,y0+0.12,L/2-0.08,bc);add(W+0.02,0.18,0.22,0,y0+0.12,-L/2+0.08,bc);add(W*0.46,0.14,0.04,0,y0+bh*0.5,L/2+0.01,"#111");}
  if(!M.cabrio&&!M.box){const [cl,ch,cz,cf]=M.cab;for(const s of [-1,1])add(0.16,0.1,0.08,s*(W/2+0.06),top+0.08,cz+cl/2-cf-0.1,"P");}
  for(const s of M.wedge?[-0.18,0.18]:[0.55]){add(0.09,0.09,0.12,s*W/2,y0+0.14,-L/2-0.04,"#8a8c90");if(M.wedge||M.chrome)add(0.09,0.09,0.12,-s*W/2,y0+0.14,-L/2-0.04,"#8a8c90");}
  // phares / feux
  const hy=M.box?y0+bh-0.18:top-0.12-(M.wedge?0.14:M.hood||0);
  for(const s of [-1,1])add(M.wedge?0.46:0.34,M.wedge?0.06:0.11,0.06,s*(W/2-0.3),hy,L/2+(M.box?0.01:-0.02),"H",M.wedge?{fz:0.03}:null);
  if(M.wedge)add(W-0.2,0.06,0.05,0,top-0.1,-L/2+0.02,"T");else for(const s of [-1,1])add(0.42,0.11,0.05,s*(W/2-0.3),M.box?top+0.2:top-0.12,-L/2-0.01,"T");
  return out;
}
const CARGEO=new Map();
function carGeos(k){let G=CARGEO.get(k);if(G)return G;G={};const by={P:[],V:[],G:[],H:[],T:[]};
  for(const p of carParts(k)){if(by[p.c])by[p.c].push(p.g);else by.V.push(colorize(p.g,p.c));}
  for(const key in by)if(by[key].length){G[key]=mergeGeometries(by[key]);G[key].userData.shared=true;by[key].forEach(g=>g.dispose());}
  CARGEO.set(k,G);return G;}
const WHEELGEO=new Map();
function wheelGeo(r,w){const key=r+"|"+w;let g=WHEELGEO.get(key);if(g)return g;
  const t=colorize(new THREE.CylinderGeometry(r,r,w,12).rotateZ(Math.PI/2).toNonIndexed(),"#151515"),rim=colorize(new THREE.CylinderGeometry(r*0.62,r*0.62,w+0.02,8).rotateZ(Math.PI/2).toNonIndexed(),"#b8bcc2");
  const s1=colorize(new THREE.BoxGeometry(w+0.04,r*1.15,0.08).toNonIndexed(),"#55585e"),s2=colorize(new THREE.BoxGeometry(w+0.04,0.08,r*1.15).toNonIndexed(),"#55585e");
  for(const q of [t,rim,s1,s2])if(q.attributes.uv)q.deleteAttribute("uv");
  g=mergeGeometries([t,rim,s1,s2]);g.userData.shared=true;WHEELGEO.set(key,g);return g;}
// quel modèle garer ici (h ∈ [0,1[ déterministe) : plus de supercars dans les quartiers riches, de pick-up à la campagne
function carRich(x,z){if(Math.abs(x)<170&&Math.abs(z)<170)return true;if(x>520&&x<620&&Math.abs(z)<300)return true;
  const T=townAt(Math.round(x/40),Math.round(z/40));return !!(T&&/marina|resort|balneaire|banlieue/.test(T.style||""));}
function pickCarModel(h,x,z){
  const grid=inGridArea(x,z),rich=carRich(x,z);
  const tab=rich?[["citadine",8],["berline",15],["suv",18],["sport",16],["cabrio",10],["muscle",5],["super",17],["hyper",8],["pickup",2],["van",1]]
    :grid?[["citadine",24],["berline",26],["suv",15],["pickup",8],["van",7],["muscle",7],["sport",6],["cabrio",3],["super",3],["hyper",1]]
    :[["pickup",30],["suv",20],["berline",15],["citadine",12],["van",10],["muscle",8],["sport",3],["cabrio",1],["super",1]];
  let tot=0;for(const t of tab)tot+=t[1];let a=h*tot;for(const [k,w] of tab){a-=w;if(a<0)return k;}return "berline";}
function carPaintHex(k,h){const sup=k==="super"||k==="hyper"||k==="sport"||k==="cabrio";const L=sup?SUPER_PAINT:CC_COLS0;return L[Math.floor(h*L.length)%L.length];}
const CC_COLS0=["#c9ccd1","#1d1f24","#f2f2f0","#8a1f1f","#1f3e7a","#5a6a74","#c48a2a","#2d5e45","#a8b0b8","#6a2a4f","#e8d24a","#d86a2a"];
// circulation : un seul maillage par voiture (couleurs par sommet, roues fusionnées)
function fastModelCar(k,col,taxi){
  const M=CAR_MODELS[k],G=carGeos(k),parts=[];
  const cl=(g,hex)=>{const q=g.clone();colorize(q,hex);return q;};
  if(G.P)parts.push(cl(G.P,col));if(G.G)parts.push(cl(G.G,"#1d2a36"));if(G.V)parts.push(G.V.clone());if(G.H)parts.push(cl(G.H,"#fff6d0"));if(G.T)parts.push(cl(G.T,"#c81e1e"));
  const wg=wheelGeo(M.r,M.ww||0.26);for(const [sx,sz] of [[-1,1],[1,1],[-1,-1],[1,-1]])parts.push(wg.clone().translate(sx*(M.W/2-0.13),M.r,sz*M.wb));
  if(taxi)parts.push(colorize(new THREE.BoxGeometry(0.7,0.22,0.36).toNonIndexed().translate(0,M.y0+M.bh+M.cab[1]+0.1,M.cab[2]),"#f2d03a"));
  for(const p of parts)if(p.attributes.uv)p.deleteAttribute("uv");
  const gm=mergeGeometries(parts);parts.forEach(p=>p.dispose());const m=new THREE.Mesh(gm,CC_MAT);m.castShadow=true;return m;}
// voiture complète (garée, conduite, autoroute) : quelques maillages aux géométries partagées
function carMesh(P,kind,driver,lit){
  const k=carModelOf(kind),M=CAR_MODELS[k],G=carGeos(k),c=new THREE.Group();c.userData.model=k;
  const mk=(g,m)=>{const o=new THREE.Mesh(g,m);c.add(o);return o;};
  const paint=kind==="ambulance"?paintMat("#f2f2f0"):P;
  if(G.P)mk(G.P,paint);if(G.V)mk(G.V,CARVC);if(G.G)mk(G.G,CAR_GLASS);const on=driver||lit;if(G.H)mk(G.H,on?HEADL:KM.white);if(G.T)c.userData.tail=mk(G.T,on?TAILL:KM.red);
  const wg=wheelGeo(M.r,M.ww||0.26);c.userData.wheels=[];
  for(const [sx,sz] of [[-1,1],[1,1],[-1,-1],[1,-1]]){const w=new THREE.Mesh(wg,CARVC);w.position.set(sx*(M.W/2-0.13),M.r,sz*M.wb);w.rotation.order="YXZ";w.userData.front=sz>0;c.add(w);c.userData.wheels.push(w);}
  const top=M.y0+M.bh;
  if(kind==="police"){put(BX(M.W+0.01,0.26,1.3),KM.white,0,M.y0+bh2(M),0.1,c);put(BX(0.5,0.12,0.26),KM.blue,-0.26,top+M.cab[1]+0.06,M.cab[2],c);put(BX(0.5,0.12,0.26),KM.red,0.26,top+M.cab[1]+0.06,M.cab[2],c);}
  if(kind==="ambulance"){put(BX(M.W+0.02,0.22,M.L+0.02),KM.red,0,top+0.15,0,c);put(BX(0.5,0.12,0.26),KM.red,0,top+1.2,M.L/2-1.4,c);}
  if(kind==="taxi")put(BX(0.7,0.22,0.36),mat({color:0xf2d03a}),0,top+M.cab[1]+0.1,M.cab[2],c);
  if(driver){const sy=top-0.25+(M.seat||0)*0.5;put(geo("drvHead",()=>new THREE.SphereGeometry(0.13,10,8)),mat({color:driver}),M.W*0.21,sy+0.62,M.cab?M.cab[2]+0.15:M.L/2-1.6,c);put(BX(0.4,0.35,0.3),KM.dark,M.W*0.21,sy+0.35,M.cab?M.cab[2]+0.1:M.L/2-1.65,c);}
  return c;
}
function bh2(M){return M.bh*0.55;}
