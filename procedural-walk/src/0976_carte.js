// ================================================================ module 13 : noms de rues, GPS, grande carte
// --- noms de rues (inventés) : avenues nord-sud, rues est-ouest
const AVENUES=[],RUES=[];for(let i=-NCH;i<=NCH;i++){AVENUES.push("Avenue "+AV_N[(i+14)%AV_N.length]);RUES.push("Rue "+RU_N[(i+14)%RU_N.length]);}
const roadIdx=v=>Math.round((v+16)/CHUNK);
const BIO_LABEL={mais:"Champ de maïs",tournesol:"Champ de tournesols",lavande:"Champs de lavande",serres:"Serres",verger:"Verger",ranch:"Ranch",pinede:"Pinède",palmeraie:"Palmeraie",mesa:"Plateau Rouge",jungle:"Jungle",bambou:"Bambouseraie",fleurs:"Prairie fleurie",dunes:"Dunes",mangrove:"Mangrove",riviere:"Rivière",ilot:"Îlot",champ:"Champs",prairie:"Prairie",foret:"Forêt",lande:"Lande",montagne:"Montagne",savane:"Savane",orangeraie:"Orangeraie",vigne:"Vignoble",ferme:"Ferme",eolien:"Parc éolien",bayou:"Bayou",plage:"Plage sauvage",cayo:"Les Cayos",mer:"En mer",lac:"Lac",aeroport:"Aéroport"};
function streetAt(x,z){
  if(inGridArea(x,z)){const ix=roadIdx(x),iz=roadIdx(z),dx=Math.abs(x-(ix*CHUNK-16)),dz=Math.abs(z-(iz*CHUNK-16));
    const T=townAt(Math.floor((x+12)/CHUNK),Math.floor((z+12)/CHUNK)),o=T?T.i0*3+T.j0:0;
    return dx<dz?AVENUES[md(ix+NCH+o,AVENUES.length)]:RUES[md(iz+NCH+o,RUES.length)];}
  const [H,d]=nearestHwy(x,z);if(d<hwyHalf(H)+3)return bridgeAt(x,z)?(H.id==="A3C"?"Pont des Cayos":"Pont · "+H.name):H.name;
  if(rectDist(AIR_RECT,x,z)<1)return AIRPORT.name;
  {const cx=Math.round(x/CHUNK),cz=Math.round(z/CHUNK),lk=lieuAt(cx,cz);if(lk&&Math.hypot(x-cx*CHUNK,z-cz*CHUNK)<24)return lieuName(lk,cx,cz);}
  const K=keyAt(x,z);if(K)return K.name;
  for(const L of LAKES)if(Math.hypot(x-L.x,z-L.z)<L.r*1.15)return L.name;
  return regionName(x,z)||BIO_LABEL[biomeAt(x,z)]||"Campagne";
}
const QUARTIER=QUARTIER_NOMS;
// --- points d'intérêt (déterministes, comme la ville)
const POIS=[];
const SPECIAL_POI={pop_marche:["marche","Mercado Coral"],pop_place:["jeux","Place des Dominos"],zenith:["tour","Tour Zénith"],foire:["jeux","Fête foraine"],etang_urbain:["parc","Étang des Canards"],commissariat:["police","Commissariat"],hopital:["hopital","Hôpital"],ecole:["ecole","Groupe scolaire"],station:["station","Station Azur"],eglise:["eglise","Chapelle Saint-Ange"],supermarche:["super","Marché Azur"],marche:["marche","Marché du Port"],port_capitainerie:["port","Capitainerie du port"],terrain:["sport","Terrain de basket"]};
{const cells=[];for(let cx=-NCH;cx<=NCH;cx++)for(let cz=-NCH;cz<=NCH;cz++)cells.push([cx,cz,null]);for(const T of TOWNS)for(let cx=T.i0;cx<=T.i1;cx++)for(let cz=T.j0;cz<=T.j1;cz++)cells.push([cx,cz,T]);
for(const [cx,cz,TW] of cells){
  const t=chunkType(cx,cz),X=cx*CHUNK+4,Z=cz*CHUNK+4,rel=TW?[]:reliefOf(cx,cz),sand=TW?[]:sandOf(cx,cz);
  const near=TW?TW.name:AV_N[(cx+14)%AV_N.length];
  if(t==="parc"&&(!TW||hash(cx*1.7+cz)<0.4))POIS.push({type:"parc",x:X,z:Z,name:"Parc "+(TW?"de "+near:near)});
  if(rel.length){const B=rel.find(f=>f.kind==="box"&&f.h>2);POIS.push({type:"vue",x:(B.x0+B.x1)/2,z:(B.z0+B.z1)/2,name:"Belvédère "+near});}
  if(SPECIAL_POI[t])POIS.push({type:SPECIAL_POI[t][0],x:X,z:Z,name:SPECIAL_POI[t][1]+" ("+near+")"});
  if(t==="plage"&&Math.abs(cz)%4===0)POIS.push({type:"plage",x:X+4,z:Z,name:"Plage "+near});
  if(t==="marina_bassin"&&!POIS.some(P=>P.name==="Marina del Sol"))POIS.push({type:"port",x:X,z:Z,name:"Marina del Sol"});
  if(!TW&&t!=="parc"&&t!=="plage")for(const s of sand)POIS.push({type:"jeux",x:(s.x0+s.x1)/2,z:(s.z0+s.z1)/2,name:"Aire de jeux"});
}}
for(const [k,R] of ROADSIDE){const [cx,cz]=k.split(",").map(Number);const ic={station_route:"station",motel:"motel",diner:"relais",relais:"relais",camping:"camping",aire:"aire"}[R.kind]||"aire";POIS.push({type:ic,x:cx*CHUNK,z:cz*CHUNK,name:roadsideName(R.kind,cx,cz)});}
for(const T of TOWNS)if(T.id!=="ps")POIS.push({type:"ville",x:(T.i0+T.i1)/2*CHUNK,z:(T.j0+T.j1)/2*CHUNK,name:T.name});
for(const L of LAKES)POIS.push({type:"lac",x:L.x,z:L.z-L.r*0.2,name:L.name});
for(const K of KEYS)if(K.name!=="Punta Esperanza")POIS.push({type:"ile",x:K.x,z:K.z-30,name:K.name});
POIS.push({type:"avion",x:-1560,z:780,name:AIRPORT.name});
for(const R of [HILLS[0],HILLS[3]])POIS.push({type:"vue",x:R.x,z:R.z,name:R.name});
POIS.push({type:"nature",x:-4100,z:1200,name:"Bayou des Alligators"});
POIS.push({type:"depart",x:0,z:0,name:"Point de départ"});
for(const I of ISLANDS)POIS.push({type:"ile",x:I.x,z:I.z,name:I.name});POIS.push({type:"plonge",x:644,z:300,name:"Ponton de plongée"});POIS.push({type:"port",x:646,z:-425,name:"Port de la Vigie (quais)"},{type:"port",x:620,z:-312,name:"Quai de pêche"});
POIS.push({type:"ville",x:184,z:-1180,name:"Port-Soleil"});
const TOWN_LABELS=[{x:0,z:0,name:"AZURIA"},...TOWNS.map(T=>({x:(T.i0+T.i1)/2*CHUNK,z:(T.j0+T.j1)/2*CHUNK,name:T.name}))];
const POI_ICON={tour:["🏙","#9fb3d0"],ville:["🏘","#ffffff"],aire:["🅿","#5fa0e0"],relais:["🍔","#e0a04a"],ile:["🏝","#e8d29a"],plonge:["🤿","#5fc4e0"],parc:["🌳","#5fae5a"],vue:["🔭","#e0b44a"],jeux:["🛝","#e08a4a"],depart:["⭐","#ffffff"],police:["🚓","#3a6ad0"],hopital:["🏥","#e04a4a"],ecole:["🏫","#e0b44a"],station:["⛽","#2fa060"],eglise:["⛪","#c9b48a"],super:["🛒","#e05a4a"],marche:["🍎","#e08a4a"],sport:["🏀","#e07a3a"],plage:["🏖","#e8d29a"],motel:["🛏","#e86aa0"],camping:["⛺","#5fae5a"],lac:["🎣","#5fc4e0"],avion:["✈","#9fd0ff"],nature:["🐊","#7fae5a"],secret:["★","#b98aff"],lieu:["📍","#e8c070"],port:["⚓","#7fb0d8"]};
// --- itinéraire GPS : on suit le quadrillage des rues (plus court chemin entre carrefours)
let waypoint=null,route=null,routeT=0,routeLen=0;
const NODE=(i,j)=>({i,j,x:i*CHUNK-16,z:j*CHUNK-16});
// carrefours : la ville, Port-Soleil, et l'autoroute qui relie le carrefour (5,-14) au (5,-26)
// nœuds = carrefours des quadrillages (ville + bourgs) et points de l'autoroute tous les 40 m
const GRIDS=[{i0:-14,i1:15,j0:-14,j1:15},...TOWNS.map(T=>({i0:T.i0,i1:T.i1+1,j0:T.j0,j1:T.j1+1}))];
const inG=(G,i,j)=>i>=G.i0&&i<=G.i1&&j>=G.j0&&j<=G.j1;
const onH=(H,i,j)=>H.ax==="ns"?i===H.k&&j>=H.a&&j<=H.b:j===H.k&&i>=H.a&&i<=H.b;
function gEdge(i,j,i2,j2){for(const G of GRIDS)if(inG(G,i,j)&&inG(G,i2,j2))return true;for(const H of HWYS)if(onH(H,i,j)&&onH(H,i2,j2))return true;return false;}
const nkey=(i,j)=>(i+500)*2000+(j+500);
function snapRoad(x,z){
  let best=null,bd=1e9;
  for(const G of GRIDS){const ix=clamp(roadIdx(x),G.i0,G.i1),iz=clamp(roadIdx(z),G.j0,G.j1),vx=ix*CHUNK-16,hz=iz*CHUNK-16;
    {const zz=clamp(z,G.j0*CHUNK-16,G.j1*CHUNK-16),d=Math.hypot(x-vx,z-zz);if(d<bd){const j0=clamp(Math.floor((zz+16)/CHUNK),G.j0,G.j1-1);bd=d;best={p:new V3(vx,0,zz),ends:[NODE(ix,j0),NODE(ix,j0+1)]};}}
    {const xx=clamp(x,G.i0*CHUNK-16,G.i1*CHUNK-16),d=Math.hypot(x-xx,z-hz);if(d<bd){const i0=clamp(Math.floor((xx+16)/CHUNK),G.i0,G.i1-1);bd=d;best={p:new V3(xx,0,hz),ends:[NODE(i0,iz),NODE(i0+1,iz)]};}}}
  for(const H of HWYS){const L=H.k*CHUNK-16,a=H.a*CHUNK-16,b=H.b*CHUNK-16;
    if(H.ax==="ns"){const zz=clamp(z,a,b),d=Math.hypot(x-L,z-zz);if(d<bd){const j0=clamp(Math.floor((zz+16)/CHUNK),H.a,H.b-1);bd=d;best={p:new V3(L,0,zz),ends:[NODE(H.k,j0),NODE(H.k,j0+1)],hwy:true};}}
    else{const xx=clamp(x,a,b),d=Math.hypot(x-xx,z-L);if(d<bd){const i0=clamp(Math.floor((xx+16)/CHUNK),H.a,H.b-1);bd=d;best={p:new V3(xx,0,L),ends:[NODE(i0,H.k),NODE(i0+1,H.k)],hwy:true};}}}
  return best;
}
// tas binaire pour Dijkstra
function heapPush(h,x){h.push(x);let i=h.length-1;while(i>0){const p=(i-1)>>1;if(h[p][0]<=h[i][0])break;[h[p],h[i]]=[h[i],h[p]];i=p;}}
function heapPop(h){const top=h[0],last=h.pop();if(h.length){h[0]=last;let i=0;for(;;){const l=2*i+1,r=l+1;let m=i;if(l<h.length&&h[l][0]<h[m][0])m=l;if(r<h.length&&h[r][0]<h[m][0])m=r;if(m===i)break;[h[m],h[i]]=[h[i],h[m]];i=m;}}return top;}
function computeRoute(from,to){
  const S=snapRoad(from.x,from.z),E=snapRoad(to.x,to.z);
  const key=n=>nkey(n.i,n.j);
  const sameSeg=key(S.ends[0])===key(E.ends[0])&&key(S.ends[1])===key(E.ends[1]);
  let pts;
  if(sameSeg||hdist(from,to)<14)pts=[from.clone(),S.p,E.p,to.clone()];
  else{
    const dist=new Map(),prev=new Map(),open=[];
    for(const n of S.ends){const d=hdist(S.p,n);if(!dist.has(key(n))||d<dist.get(key(n))){dist.set(key(n),d);heapPush(open,[d,n]);}}
    const goal=new Map(E.ends.map(n=>[key(n),hdist(n,E.p)]));
    let best=null,bestD=1e9,it=0;
    while(open.length&&it++<60000){
      const [d,n]=heapPop(open);if(d>dist.get(key(n)))continue;
      if(goal.has(key(n))&&d+goal.get(key(n))<bestD){bestD=d+goal.get(key(n));best=n;}
      if(d>bestD)break;
      for(const [di,dj] of [[1,0],[-1,0],[0,1],[0,-1]]){const i=n.i+di,j=n.j+dj;if(!gEdge(n.i,n.j,i,j))continue;
        const m=NODE(i,j),nd=d+CHUNK;if(nd<(dist.get(key(m))??1e9)){dist.set(key(m),nd);prev.set(key(m),n);heapPush(open,[nd,m]);}}
    }
    const chain=[];for(let n=best;n;n=prev.get(key(n)))chain.unshift(new V3(n.x,0,n.z));
    // on garde seulement les virages (moins de points sur les longues lignes droites)
    const slim=chain.filter((q,k)=>k===0||k===chain.length-1||!((chain[k-1].x===q.x&&q.x===chain[k+1].x)||(chain[k-1].z===q.z&&q.z===chain[k+1].z)));
    pts=[from.clone(),S.p,...slim,E.p,to.clone()];
  }
  // on enlève les points en double et les détours inutiles
  const out=[];for(const p of pts)if(!out.length||hdist(out[out.length-1],p)>0.5)out.push(p);
  return out;
}
function polyLen(P){let L=0;for(let i=1;i<P.length;i++)L+=hdist(P[i-1],P[i]);return L;}
function distToPoly(p,P){let best=1e9;for(let i=1;i<P.length;i++){const a=P[i-1],b=P[i],ab=new V3().subVectors(b,a),t=clamp01(new V3().subVectors(p,a).dot(ab)/Math.max(1e-6,ab.lengthSq()));best=Math.min(best,hdist(p,a.clone().addScaledVector(ab,t)));}return best;}
// repère 3D : colonne lumineuse au point d'arrivée
const wpBeam=new THREE.Group();
{const m=new THREE.MeshBasicMaterial({color:0xffc83d,transparent:true,opacity:0.35,depthWrite:false,fog:false});
  const col=new THREE.Mesh(new THREE.CylinderGeometry(0.35,0.35,60,16,1,true),m);col.position.y=30;wpBeam.add(col);
  const ring=new THREE.Mesh(new THREE.RingGeometry(0.8,1.15,32).rotateX(-Math.PI/2),new THREE.MeshBasicMaterial({color:0xffc83d,transparent:true,opacity:0.8,depthWrite:false}));ring.position.y=0.03;wpBeam.add(ring);
  wpBeam.visible=false;scene.add(wpBeam);}
function setWaypoint(x,z,name){
  if(x==null){waypoint=null;route=null;wpBeam.visible=false;gpsEl.style.display="none";return;}
  x=clamp(x,W_MIN+40,W_MAX-40);z=clamp(z,W_MIN+40,W_MAX-40);
  waypoint={x,z,name:name||streetAt(x,z)};route=computeRoute(player.root,new V3(x,0,z));routeLen=polyLen(route);routeT=0;
  wpBeam.position.set(x,groundAt(x,z),z);wpBeam.visible=true;
}
const gpsEl=document.getElementById("gps");
function turnHint(){
  if(!route||route.length<3)return "";
  // prochain virage le long de l'itinéraire
  let acc=0;const p=player.root;
  let k=1,bd=1e9;for(let i=1;i<route.length;i++){const d=distToPoly(p,[route[i-1],route[i]]);if(d<bd){bd=d;k=i;}}
  acc=hdist(p,route[k]);
  for(let i=k;i<route.length-1;i++){
    const a=new V3().subVectors(route[i],route[i-1]),b=new V3().subVectors(route[i+1],route[i]);
    if(a.lengthSq()<0.01||b.lengthSq()<0.01){acc+=hdist(route[i],route[i+1]);continue;}
    const cr=a.x*b.z-a.z*b.x,dt=a.normalize().dot(b.clone().normalize());
    if(dt<0.7){return `${cr>0?"Tourne à droite":"Tourne à gauche"} dans ${Math.max(5,Math.round(acc/5)*5)} m`;}
    acc+=hdist(route[i],route[i+1]);
  }
  return "Tout droit";
}
function updateGPS(dt){
  if(!waypoint)return;
  routeT-=dt;
  const dest=new V3(waypoint.x,0,waypoint.z);
  if(hdist(player.root,dest)<3.5){hudMsg("Tu es arrivé : "+waypoint.name);setWaypoint(null);return;}
  if(routeT<=0){routeT=1;if(distToPoly(player.root,route)>10){route=computeRoute(player.root,dest);}
    else route[0]=player.root.clone();routeLen=polyLen(route);}
  // on retire les points déjà dépassés
  while(route.length>2&&(hdist(player.root,route[1])<3||distToPoly(player.root,[route[1],route[2]])<Math.min(3,hdist(player.root,route[1])-0.01)&&hdist(player.root,route[2])<hdist(route[1],route[2]))){route.splice(1,1);}
  route[0]=player.root.clone();routeLen=polyLen(route);
  wpBeam.children[0].material.opacity=0.25+0.12*Math.sin(clockT*3);
  gpsEl.style.display="block";
  gpsEl.innerHTML=`<b>${Math.round(routeLen)} m</b> · ${waypoint.name}<br><span>${turnHint()}</span>`;
}
// ---------- grande carte
let mapOpen=false;const bigEl=document.getElementById("bigmap"),bctx=bigEl.getContext("2d");
const MAP={cx:0,cz:0,zoom:1.2,drag:null,pointers:new Map(),pinch:null,cursor:false};
function openMap(){if(galleryOn||menuOpen)return;mapOpen=true;bigEl.style.display="block";document.body.classList.add("mapOn");MAP.cx=player.root.x;MAP.cz=player.root.z;MAP.cursor=pad.on;keys.clear();resizeMap();applyAudio&&applyAudio();}
function closeMap(){document.body.classList.remove("mapOn");mapOpen=false;bigEl.style.display="none";keys.clear();}
function resizeMap(){const dpr=Math.min(2,devicePixelRatio);bigEl.width=innerWidth*dpr;bigEl.height=innerHeight*dpr;}
addEventListener("resize",()=>{if(mapOpen)resizeMap();});
const m2s=(x,z)=>{const dpr=bigEl.width/innerWidth;return [(x-MAP.cx)*MAP.zoom*dpr+bigEl.width/2,(z-MAP.cz)*MAP.zoom*dpr+bigEl.height/2];};
const s2m=(sx,sy)=>[(sx-innerWidth/2)/MAP.zoom+MAP.cx,(sy-innerHeight/2)/MAP.zoom+MAP.cz];
const WMAP={px:24,canvas:null,ctx:null,row:0,done:false};
{const n=Math.ceil((W_MAX-W_MIN)/WMAP.px);WMAP.n=n;WMAP.canvas=document.createElement("canvas");WMAP.canvas.width=WMAP.canvas.height=n;WMAP.ctx=WMAP.canvas.getContext("2d");WMAP.img=WMAP.ctx.createImageData(n,n);}
function worldMapStep(budget){ // quelques lignes par image, jusqu'à ce que la carte du monde soit prête
  if(WMAP.done)return;const n=WMAP.n,d=WMAP.img.data,c=new THREE.Color();const t0=performance.now();
  while(WMAP.row<n&&performance.now()-t0<budget){const j=WMAP.row++,z=W_MIN+(j+0.5)*WMAP.px;
    for(let i=0;i<n;i++){const x=W_MIN+(i+0.5)*WMAP.px;let r,g,b;
      if(inOldSea(x,z)){const f=seaFloor(x,z);if(f>WATER_Y){r=0.84;g=0.76;b=0.6;}else{r=0.25;g=0.53;b=0.66;}}
      else if(inGridArea(x,z)){r=0.36;g=0.37;b=0.4;}
      else{const y=rawLand(x,z);if(y<WATER_Y){const bb=bayouK(x,z)>0.05&&newSeaFloor(x,z)===null;r=bb?0.29:0.25;g=bb?0.38:0.53;b=bb?0.3:0.66;}
        else if(rectDist(AIR_RECT,x,z)<1){r=0.5;g=0.52;b=0.5;}else{const bio=biomeAt(x,z);c.copy(terrColor(x,z,y,bio));c.convertLinearToSRGB();r=c.r;g=c.g;b=c.b;if(bio==="foret"||bio==="montagne"&&y>30){r*=0.85;g*=0.85;b*=0.85;}
          const sh=clamp((rawLand(x+WMAP.px,z-WMAP.px)-y)*0.04,-0.12,0.12);r-=sh;g-=sh;b-=sh;}}
      const k=(j*n+i)*4;d[k]=clamp(r,0,1)*255;d[k+1]=clamp(g,0,1)*255;d[k+2]=clamp(b,0,1)*255;d[k+3]=255;}}
  WMAP.ctx.putImageData(WMAP.img,0,0);if(WMAP.row>=n)WMAP.done=true;
}
function drawBigMap(){
  const c=bctx,W=bigEl.width,H=bigEl.height,dpr=W/innerWidth,z=MAP.zoom*dpr;
  c.fillStyle="#3f6f86";c.fillRect(0,0,W,H);
  worldMapStep(12);
  {const [x0,y0]=m2s(W_MIN,W_MIN);c.imageSmoothingEnabled=MAP.zoom<0.4;c.drawImage(WMAP.canvas,x0,y0,(W_MAX-W_MIN)*z,(W_MAX-W_MIN)*z);c.imageSmoothingEnabled=true;}
  // autoroutes
  for(const Hw of HWYS){const L=Hw.k*CHUNK-16,a=Hw.a*CHUNK-16,b=Hw.b*CHUNK-16,[x0,y0]=m2s(Hw.ax==="ns"?L:a,Hw.ax==="ns"?a:L),[x1,y1]=m2s(Hw.ax==="ns"?L:b,Hw.ax==="ns"?b:L);
    c.strokeStyle="#22252b";c.lineWidth=Math.max(2*dpr,(Hw.small?10:17)*z);c.beginPath();c.moveTo(x0,y0);c.lineTo(x1,y1);c.stroke();
    c.strokeStyle=Hw.small?"#e8e2d0":"#f2c43a";c.lineWidth=Math.max(1*dpr,1.2*z);c.beginPath();c.moveTo(x0,y0);c.lineTo(x1,y1);c.stroke();}
  // îles de l'ancienne mer, quais
  for(const I of ISLANDS){const [ix,iy]=m2s(I.x,I.z);c.fillStyle="#d8c49a";c.beginPath();c.arc(ix,iy,I.r*1.05*z,0,7);c.fill();c.fillStyle="#5f8a4c";c.beginPath();c.arc(ix,iy,I.r*0.75*z,0,7);c.fill();
    if(MAP.zoom>0.5){c.fillStyle="#fff";c.font=`600 ${12*dpr}px system-ui`;c.textAlign="center";c.fillText(I.name,ix,iy+4*dpr);}}
  for(const f of SEA_FEATURES){const [fx,fy]=m2s(f.x0,f.z0);c.fillStyle=f.port?"#8d8b86":"#a07850";c.fillRect(fx,fy,(f.x1-f.x0)*z,Math.max(2,(f.z1-f.z0)*z));}
  // détail des quadrillages (îlots) quand on zoome
  if(MAP.zoom>0.35){const [mx0,mz0]=s2m(0,0),[mx1,mz1]=s2m(innerWidth,innerHeight);
    const i0=Math.floor(mx0/CHUNK)-1,i1=Math.ceil(mx1/CHUNK)+1,j0=Math.floor(mz0/CHUNK)-1,j1=Math.ceil(mz1/CHUNK)+1;
    if((i1-i0)*(j1-j0)<9000)for(let cx=i0;cx<=i1;cx++)for(let cz=j0;cz<=j1;cz++){
      if(!gridAt(cx,cz)){continue;}
      const t=chunkType(cx,cz),[bx,by]=m2s(cx*CHUNK-12,cz*CHUNK-12),bw=t==="plage"?40:32;
      c.fillStyle=TYPE_COLOR[t]||({villas:"#9fb08a",cabanes:"#8a7356",chalets:"#7f9a6a",marina_bassin:"#3f88a8"}[t])||"#8f8d86";c.fillRect(bx,by,bw*z,32*z);
      if(MAP.zoom>1){for(const s of sandOf(cx,cz)){const [sx,sy]=m2s(s.x0,s.z0);c.fillStyle="#d8c49a";c.fillRect(sx,sy,(s.x1-s.x0)*z,(s.z1-s.z0)*z);}
        for(const F of reliefOf(cx,cz)){const [fx,fy]=m2s(F.x0,F.z0);c.fillStyle=F.kind==="box"?(F.h>2?"#ece3d0":"#c6bfb0"):"#b3ac9f";c.fillRect(fx,fy,(F.x1-F.x0)*z,(F.z1-F.z0)*z);}}
    }
    if(MAP.zoom>0.9){c.fillStyle="#d4cdbd";for(const o of obstacles)if(o.bld){const [ox,oy]=m2s(o.x-o.hx,o.z-o.hz);c.fillRect(ox,oy,o.hx*2*z,o.hz*2*z);}}}
  // noms des rues quand on zoome beaucoup (ville)
  if(MAP.zoom>1.1&&Math.abs(MAP.cx)<700&&Math.abs(MAP.cz)<700){c.fillStyle="rgba(255,255,255,.75)";c.font=`${11*dpr}px system-ui`;c.textAlign="center";
    for(let i=-NCH;i<=NCH;i++){const [sx]=m2s(i*CHUNK-16,0),[,sy]=m2s(0,MAP.cz);c.save();c.translate(sx,sy+((i&1)?60:-60)*dpr);c.rotate(-Math.PI/2);c.fillText(AVENUES[i+NCH],0,4*dpr);c.restore();
      const [,ty]=m2s(0,i*CHUNK-16),[tx]=m2s(MAP.cx,0);c.fillText(RUES[i+NCH],tx+((i&1)?90:-90)*dpr,ty+4*dpr);}}
  // itinéraire
  if(route){c.strokeStyle="#b56cff";c.lineWidth=Math.max(4*dpr,6*z);c.lineJoin="round";c.beginPath();route.forEach((p,i)=>{const [a,b]=m2s(p.x,p.z);i?c.lineTo(a,b):c.moveTo(a,b);});c.stroke();}
  // noms des villes et des régions quand on dézoome
  if(MAP.zoom<0.9){c.textAlign="center";for(const R of REGIONS){const [x,y]=m2s(R.x,R.z);c.font=`italic 600 ${12*dpr}px system-ui`;c.fillStyle="rgba(255,255,255,.55)";c.fillText(R.name,x,y);}
    for(const T of TOWN_LABELS){const [x,y]=m2s(T.x,T.z);c.font=`800 ${(T.name==="AZURIA"?18:13)*dpr}px system-ui`;c.strokeStyle="rgba(0,0,0,.65)";c.lineWidth=3*dpr;c.strokeText(T.name,x,y-14*dpr);c.fillStyle="#fff";c.fillText(T.name,x,y-14*dpr);}}
  // points d'intérêt (les petits n'apparaissent qu'en zoomant)
  c.textAlign="center";
  const big=new Set(["ville","avion","lac","ile","port","depart"]);
  for(const P of POIS){if(MAP.zoom<0.35&&!big.has(P.type))continue;if(MAP.zoom<0.9&&!big.has(P.type)&&Math.hypot(P.x,P.z)<700)continue;const [px,py]=m2s(P.x,P.z);if(px<-20||py<-20||px>W+20||py>H+20)continue;const [ic,col]=POI_ICON[P.type]||["•","#fff"];
    c.fillStyle="rgba(16,18,24,.75)";c.beginPath();c.arc(px,py,11*dpr,0,7);c.fill();c.strokeStyle=col;c.lineWidth=2*dpr;c.stroke();
    c.font=`${12*dpr}px system-ui`;c.fillText(ic,px,py+4*dpr);
    if(MAP.zoom>2.2||(P.type!=="ville"&&big.has(P.type)&&MAP.zoom>0.3)){c.fillStyle="#fff";c.font=`${11*dpr}px system-ui`;c.fillText(P.name,px,py+24*dpr);}}
  // recherche, police
  if(wanted.level>0&&clockT-wanted.lastSeenT>0.8){const [wx,wy]=m2s(wanted.lastSeenPos.x,wanted.lastSeenPos.z);c.fillStyle="rgba(255,60,60,.2)";c.beginPath();c.arc(wx,wy,wanted.searchR*z,0,7);c.fill();}
  for(const C of policeCars){const [x,y]=m2s(C.g.position.x,C.g.position.z);c.fillStyle="#3070ff";c.fillRect(x-4*dpr,y-4*dpr,8*dpr,8*dpr);}
  for(const w of walkers)if(w.isCop&&!w.ko){const [x,y]=m2s(w.root.x,w.root.z);c.fillStyle="#ff3030";c.beginPath();c.arc(x,y,3.5*dpr,0,7);c.fill();}
  {const mk=(x,z,col,txt)=>{const [sx,sy]=m2s(x,z);c.fillStyle=col;c.beginPath();c.arc(sx,sy,8*dpr,0,7);c.fill();c.strokeStyle="#111";c.lineWidth=2*dpr;c.stroke();if(txt){c.fillStyle="#fff";c.font=`bold ${11*dpr}px system-ui`;c.textAlign="left";c.strokeStyle="rgba(0,0,0,.7)";c.lineWidth=3*dpr;c.strokeText(txt,sx+11*dpr,sy+4*dpr);c.fillText(txt,sx+11*dpr,sy+4*dpr);}};
    const A=MIS.active;
    if(!A||(A.id==="sac"&&A.step==="back"))mk(CONTACT.x,CONTACT.z,"#4ad66d",A?"Nino (rapporter le sac)":MIS.stage<STORY.length?"Nino : mission "+(MIS.stage+1):"Nino : petits boulots");
    if(A&&A.id==="colis")mk(A.dest.x,A.dest.z,"#4ad66d","Livraison");
    if(A&&A.id==="sac"&&A.step==="go")mk(A.bag.x,A.bag.z,"#4ad66d","Le sac");
    if(A&&A.id==="filature"&&A.target)mk(A.target.root.x,A.target.root.z,"#ff4a4a","Cible");}
  if(waypoint){const [x,y]=m2s(waypoint.x,waypoint.z);c.fillStyle="#ffc83d";c.beginPath();c.moveTo(x,y);c.arc(x,y-16*dpr,9*dpr,Math.PI*0.8,Math.PI*0.2);c.closePath();c.fill();c.fillStyle="#3a2a00";c.beginPath();c.arc(x,y-16*dpr,3.5*dpr,0,7);c.fill();}
  {const [x,y]=m2s(player.root.x,player.root.z);c.save();c.translate(x,y);c.rotate(player.yaw*D2R);c.fillStyle="#fff";c.strokeStyle="#000";c.lineWidth=1.5*dpr;c.beginPath();c.moveTo(0,-10*dpr);c.lineTo(7*dpr,8*dpr);c.lineTo(0,4*dpr);c.lineTo(-7*dpr,8*dpr);c.closePath();c.fill();c.stroke();c.restore();}
  if(MAP.cursor){c.strokeStyle="#fff";c.lineWidth=2*dpr;const cx=W/2,cy=H/2;c.beginPath();c.moveTo(cx-14*dpr,cy);c.lineTo(cx+14*dpr,cy);c.moveTo(cx,cy-14*dpr);c.lineTo(cx,cy+14*dpr);c.stroke();}
  // légende + échelle
  c.textAlign="left";c.fillStyle="rgba(16,18,24,.8)";c.fillRect(12*dpr,12*dpr,Math.min(W/dpr-24,460)*dpr,(waypoint?92:72)*dpr);c.fillStyle="#fff";c.font=`600 ${14*dpr}px system-ui`;
  c.fillText("Floralia — "+streetAt(player.root.x,player.root.z),22*dpr,34*dpr);c.font=`${12*dpr}px system-ui`;c.fillStyle="#cfd6df";
  c.fillText(isTouch()?"Toucher : placer / enlever le point · pincer : zoom":pad.on?"Stick : bouger · A : placer · X : enlever · LT/RT : zoom · B : fermer":"Clic : placer / enlever le point · molette : zoom · glisser : bouger",22*dpr,54*dpr);
  {const m=MAP.zoom<0.15?2000:MAP.zoom<0.6?500:MAP.zoom<2?100:20;c.fillText(`⛽ station 🛏 motel 🍔 resto ✈ aéroport 🏘 ville  ·  ━ ${m>=1000?m/1000+" km":m+" m"}`,22*dpr,72*dpr);c.fillStyle="#fff";c.fillRect(W-30*dpr-m*z,H-24*dpr,m*z,3*dpr);}
  if(!WMAP.done){c.fillStyle="#ffc83d";c.fillText(`Carte du monde : ${Math.round(WMAP.row/WMAP.n*100)} %`,W/dpr*dpr-200*dpr,34*dpr);}
  if(waypoint){c.fillStyle="#ffc83d";c.fillText(`Destination : ${waypoint.name} — ${routeLen>1500?(routeLen/1000).toFixed(1)+" km":Math.round(routeLen)+" m"}`,22*dpr,90*dpr);}
}
function mapClick(sx,sy){
  if(CREA.on){const [mx,mz]=s2m(sx,sy);const poi=POIS.find(P=>Math.hypot(P.x-mx,P.z-mz)*MAP.zoom<16);closeMap();if(poi)teleportTo(poi.x,poi.z,poi.name);else teleportTo(clamp(mx,W_MIN+40,W_MAX-40),clamp(mz,W_MIN+40,W_MAX-40),streetAt(mx,mz));return;}
  if(waypoint){const [x,y]=m2s(waypoint.x,waypoint.z),dpr=bigEl.width/innerWidth;if(Math.hypot(sx*dpr-x,(sy*dpr)-(y-12*dpr))<22*dpr){setWaypoint(null);return;}}
  const [mx,mz]=s2m(sx,sy);
  const poi=POIS.find(P=>Math.hypot(P.x-mx,P.z-mz)*MAP.zoom<16);
  if(poi)setWaypoint(poi.x,poi.z,poi.name);else setWaypoint(mx,mz);
}
bigEl.addEventListener("pointerdown",e=>{e.stopPropagation();MAP.pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(MAP.pointers.size===2){const [a,b]=[...MAP.pointers.values()];MAP.pinch={d:Math.hypot(a.x-b.x,a.y-b.y),z:MAP.zoom};MAP.drag=null;}
  else MAP.drag={x:e.clientX,y:e.clientY,sx:e.clientX,sy:e.clientY,t:performance.now()};
  try{bigEl.setPointerCapture(e.pointerId);}catch(_){}});
bigEl.addEventListener("pointermove",e=>{const P=MAP.pointers.get(e.pointerId);if(P){P.x=e.clientX;P.y=e.clientY;}
  if(MAP.pinch&&MAP.pointers.size===2){const [a,b]=[...MAP.pointers.values()];MAP.zoom=clamp(MAP.pinch.z*Math.hypot(a.x-b.x,a.y-b.y)/MAP.pinch.d,0.05,6);return;}
  if(MAP.drag){MAP.cx-=(e.clientX-MAP.drag.x)/MAP.zoom;MAP.cz-=(e.clientY-MAP.drag.y)/MAP.zoom;MAP.drag.x=e.clientX;MAP.drag.y=e.clientY;MAP.cursor=false;}});
bigEl.addEventListener("pointerup",e=>{MAP.pointers.delete(e.pointerId);
  if(MAP.drag&&Math.hypot(e.clientX-MAP.drag.sx,e.clientY-MAP.drag.sy)<8&&performance.now()-MAP.drag.t<400)mapClick(e.clientX,e.clientY);
  MAP.drag=null;if(MAP.pointers.size<2)MAP.pinch=null;});
bigEl.addEventListener("wheel",e=>{e.preventDefault();const [mx,mz]=s2m(e.clientX,e.clientY);MAP.zoom=clamp(MAP.zoom*(e.deltaY<0?1.15:1/1.15),0.05,6);
  const [nx,nz]=s2m(e.clientX,e.clientY);MAP.cx+=mx-nx;MAP.cz+=mz-nz;},{passive:false});
addEventListener("keydown",e=>{
  if(e.code==="Tab"){e.preventDefault();mapOpen?closeMap():openMap();return;}
  if(!mapOpen)return;
  if(e.code==="Escape"){e.preventDefault();e.stopImmediatePropagation();closeMap();return;}
  const s=60/MAP.zoom;
  if(e.code==="ArrowLeft")MAP.cx-=s;if(e.code==="ArrowRight")MAP.cx+=s;if(e.code==="ArrowUp")MAP.cz-=s;if(e.code==="ArrowDown")MAP.cz+=s;
  if(e.code==="Equal"||e.code==="NumpadAdd")MAP.zoom=clamp(MAP.zoom*1.2,0.05,6);if(e.code==="Minus"||e.code==="NumpadSubtract")MAP.zoom=clamp(MAP.zoom/1.2,0.05,6);
  if(e.code==="Enter"){const [mx,mz]=s2m(innerWidth/2,innerHeight/2);setWaypoint(mx,mz);}
  if(e.code==="Delete"||e.code==="Backspace")setWaypoint(null);
},true);
document.getElementById("minimap").addEventListener("pointerdown",e=>{e.stopPropagation();openMap();});
const padPrevMap=[];
function pollPadMap(dt){
  const gp=(navigator.getGamepads?[...navigator.getGamepads()]:[]).find(g=>g&&g.connected);if(!gp)return;
  const B=i=>gp.buttons[i]&&(gp.buttons[i].pressed||gp.buttons[i].value>0.5),edge=i=>{const n=B(i),r=n&&!padPrevMap[i];padPrevMap[i]=n;return r;};
  const sel=edge(8);
  if(!mapOpen){if(sel&&!menuOpen){openMap();pad.prev[8]=true;}return;}
  MAP.cursor=true;
  const ax=dz(gp.axes[0]||0),ay=dz(gp.axes[1]||0);MAP.cx+=ax*Math.abs(ax)*220/MAP.zoom*dt;MAP.cz+=ay*Math.abs(ay)*220/MAP.zoom*dt;
  const lt=gp.buttons[6]?.value||0,rt=gp.buttons[7]?.value||0;MAP.zoom=clamp(MAP.zoom*Math.exp((rt-lt)*1.6*dt),0.05,6);
  if(edge(0)){const [mx,mz]=[MAP.cx,MAP.cz];const poi=POIS.find(P=>Math.hypot(P.x-mx,P.z-mz)*MAP.zoom<16);poi?setWaypoint(poi.x,poi.z,poi.name):setWaypoint(mx,mz);}
  if(edge(2))setWaypoint(null);
  if(edge(1)||sel){closeMap();pad.prev[1]=true;pad.prev[8]=true;}
}
PADMAP[8]=[8,"Select : grande carte"];

// nom de la rue en bas à gauche quand il change
const streetEl=document.getElementById("street");let streetName="",streetT=0,streetCk=0;
function updateStreet(dt){
  streetCk-=dt;if(streetCk>0)return;streetCk=0.5;
  const bi=Math.round((player.root.x-4)/CHUNK),bj=Math.round((player.root.z-4)/CHUNK);
  const px=player.root.x,pz=player.root.z,TW=townAt(Math.floor((px+12)/CHUNK),Math.floor((pz+12)/CHUNK));
  const n=px>SEA_X&&inOldSea(px,pz)?(onIsland(px,pz)?.name||(inPortDeck(px,pz)?(pz>-310?"Quai de pêche · Port de la Vigie":"Quai de la Vigie · Port de la Vigie"):seaFeatureH(px,pz)>0?(pz>0?"Ponton de plongée":"Pont des Pélicans"):"En mer")):blockOf(px,pz)?`${streetAt(px,pz)} · ${TW?TW.name:QUARTIER[chunkType(bi,bj)]||"Azuria"}`:inGridArea(px,pz)?`${streetAt(px,pz)} · ${TW?TW.name:"Azuria"}`:streetAt(px,pz);
  if(n!==streetName){streetName=n;streetEl.textContent=n;streetEl.classList.add("show");streetT=clockT;}
  else if(clockT-streetT>4)streetEl.classList.remove("show");
}
document.getElementById("mapClose").addEventListener("pointerdown",e=>{e.stopPropagation();closeMap();});
