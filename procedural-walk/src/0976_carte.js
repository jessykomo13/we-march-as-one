// ================================================================ module 13 : noms de rues, GPS, grande carte
// --- noms de rues (inventés) : avenues nord-sud, rues est-ouest
const AVENUES=[],RUES=[];for(let i=-NCH;i<=NCH;i++){AVENUES.push("Avenue "+AV_N[(i+14)%AV_N.length]);RUES.push("Rue "+RU_N[(i+14)%RU_N.length]);}
const roadIdx=v=>Math.round((v+16)/CHUNK);
function streetAt(x,z){
  const ti=inTown(Math.round((x-4)/CHUNK),Math.round((z-4)/CHUNK))||(z<-1050&&z>-1345&&x>15&&x<350);
  if(z<-590&&!ti)return Math.abs(x-HWY_X)<12?"Autoroute A1":"Campagne";
  const ix=roadIdx(x),iz=roadIdx(z),dx=Math.abs(x-(ix*CHUNK-16)),dz=Math.abs(z-(iz*CHUNK-16));
  return dx<dz?AVENUES[md(ix+NCH,AVENUES.length)]:RUES[md(iz+NCH,RUES.length)];
}
const QUARTIER=QUARTIER_NOMS;
// --- points d'intérêt (déterministes, comme la ville)
const POIS=[];
const SPECIAL_POI={pop_marche:["marche","Mercado Coral"],pop_place:["jeux","Place des Dominos"],zenith:["tour","Tour Zénith"],foire:["jeux","Fête foraine"],etang_urbain:["parc","Étang des Canards"],commissariat:["police","Commissariat"],hopital:["hopital","Hôpital"],ecole:["ecole","Groupe scolaire"],station:["station","Station Azur"],eglise:["eglise","Chapelle Saint-Ange"],supermarche:["super","Marché Azur"],marche:["marche","Marché du Port"],terrain:["sport","Terrain de basket"]};
for(let cx=-NCH;cx<=NCH;cx++)for(let cz=CZ_MIN;cz<=NCH;cz++){
  if(isCountry(cx,cz)){const t=chunkType(cx,cz);if(t==="aire")POIS.push({type:"aire",x:cx*CHUNK,z:cz*CHUNK,name:"Aire de repos de la Garrigue"});if(t==="relais")POIS.push({type:"relais",x:cx*CHUNK,z:cz*CHUNK,name:"Le Relais des Routiers"});continue;}
  const t=chunkType(cx,cz),X=cx*CHUNK+4,Z=cz*CHUNK+4,rel=reliefOf(cx,cz),sand=sandOf(cx,cz);
  const near=AV_N[(cx+14)%AV_N.length];
  if(t==="parc")POIS.push({type:"parc",x:X,z:Z,name:"Parc "+near});
  if(rel.length){const B=rel.find(f=>f.kind==="box"&&f.h>2);POIS.push({type:"vue",x:(B.x0+B.x1)/2,z:(B.z0+B.z1)/2,name:"Belvédère "+near});}
  if(SPECIAL_POI[t])POIS.push({type:SPECIAL_POI[t][0],x:X,z:Z,name:SPECIAL_POI[t][1]+" ("+near+")"});
  if(t==="plage"&&Math.abs(cz)%4===0)POIS.push({type:"plage",x:X+4,z:Z,name:"Plage "+near});
  if(t!=="parc"&&t!=="plage")for(const s of sand)POIS.push({type:"jeux",x:(s.x0+s.x1)/2,z:(s.z0+s.z1)/2,name:"Aire de jeux"});
}
POIS.push({type:"depart",x:0,z:0,name:"Point de départ"});
for(const I of ISLANDS)POIS.push({type:"ile",x:I.x,z:I.z,name:I.name});POIS.push({type:"plonge",x:644,z:300,name:"Ponton de plongée"});
POIS.push({type:"ville",x:184,z:-1180,name:"Port-Soleil"});
const POI_ICON={tour:["🏙","#9fb3d0"],ville:["🏘","#ffffff"],aire:["🅿","#5fa0e0"],relais:["🍔","#e0a04a"],ile:["🏝","#e8d29a"],plonge:["🤿","#5fc4e0"],parc:["🌳","#5fae5a"],vue:["🔭","#e0b44a"],jeux:["🛝","#e08a4a"],depart:["⭐","#ffffff"],police:["🚓","#3a6ad0"],hopital:["🏥","#e04a4a"],ecole:["🏫","#e0b44a"],station:["⛽","#2fa060"],eglise:["⛪","#c9b48a"],super:["🛒","#e05a4a"],marche:["🍎","#e08a4a"],sport:["🏀","#e07a3a"],plage:["🏖","#e8d29a"]};
// --- itinéraire GPS : on suit le quadrillage des rues (plus court chemin entre carrefours)
let waypoint=null,route=null,routeT=0,routeLen=0;
const NODE=(i,j)=>({i,j,x:i*CHUNK-16,z:j*CHUNK-16});
// carrefours : la ville, Port-Soleil, et l'autoroute qui relie le carrefour (5,-14) au (5,-26)
const validNode=(i,j)=>(Math.abs(i)<=14&&Math.abs(j)<=14)||(i>=TOWN.i0&&i<=TOWN.i1+1&&j>=TOWN.j0&&j<=TOWN.j1+1);
const HWY_N1=NODE(5,-14),HWY_N2=NODE(5,-26);
function snapRoad(x,z){
  if(z<-580&&z>-1052&&!(Math.abs(x-HWY_X)>300)){const zz=clamp(z,HWY_N2.z,HWY_N1.z);return {p:new V3(HWY_X,0,zz),ends:[HWY_N1,HWY_N2],hwy:true};}
  const town=z<-1040,lo=town?TOWN.j0:-NCH,hi=town?TOWN.j1+1:NCH,ilo=town?TOWN.i0:-NCH,ihi=town?TOWN.i1+1:NCH;
  const ix=clamp(roadIdx(x),ilo,ihi),iz=clamp(roadIdx(z),lo,hi),vx=ix*CHUNK-16,hz=iz*CHUNK-16;
  if(Math.abs(x-vx)<Math.abs(z-hz)){
    const zz=clamp(z,lo*CHUNK-16,hi*CHUNK-16),j0=Math.floor((zz+16)/CHUNK);
    return {p:new V3(vx,0,zz),ends:[NODE(ix,clamp(j0,lo,hi)),NODE(ix,clamp(j0+1,lo,hi))]};
  }
  const xx=clamp(x,ilo*CHUNK-16,ihi*CHUNK-16),i0=Math.floor((xx+16)/CHUNK);
  return {p:new V3(xx,0,hz),ends:[NODE(clamp(i0,ilo,ihi),iz),NODE(clamp(i0+1,ilo,ihi),iz)]};
}
function snapRoadOld(x,z){
  const ix=roadIdx(x),iz=roadIdx(z),vx=ix*CHUNK-16,hz=iz*CHUNK-16;
  if(Math.abs(x-vx)<Math.abs(z-hz)){ // sur une avenue (nord-sud)
    const zz=clamp(z,-NCH*CHUNK-16,NCH*CHUNK-16),j0=Math.floor((zz+16)/CHUNK);
    return {p:new V3(vx,0,zz),ends:[NODE(ix,clamp(j0,-NCH,NCH)),NODE(ix,clamp(j0+1,-NCH,NCH))]};
  }
  const xx=clamp(x,-NCH*CHUNK-16,NCH*CHUNK-16),i0=Math.floor((xx+16)/CHUNK);
  return {p:new V3(xx,0,hz),ends:[NODE(clamp(i0,-NCH,NCH),iz),NODE(clamp(i0+1,-NCH,NCH),iz)]};
}
function computeRoute(from,to){
  const S=snapRoad(from.x,from.z),E=snapRoad(to.x,to.z);
  const key=n=>n.i+","+n.j;
  const sameSeg=key(S.ends[0])===key(E.ends[0])&&key(S.ends[1])===key(E.ends[1]);
  let pts;
  if(sameSeg||hdist(from,to)<14)pts=[from.clone(),S.p,E.p,to.clone()];
  else{
    // Dijkstra sur les carrefours de la grille
    const dist=new Map(),prev=new Map(),open=[];
    for(const n of S.ends){const d=hdist(S.p,n);if(!dist.has(key(n))||d<dist.get(key(n))){dist.set(key(n),d);open.push([d,n]);}}
    const goal=new Map(E.ends.map(n=>[key(n),hdist(n,E.p)]));
    let best=null,bestD=1e9;
    while(open.length){
      open.sort((a,b)=>a[0]-b[0]);const [d,n]=open.shift();if(d>dist.get(key(n)))continue;
      if(goal.has(key(n))&&d+goal.get(key(n))<bestD){bestD=d+goal.get(key(n));best=n;}
      if(d>bestD)break;
      const nb=[[1,0],[-1,0],[0,1],[0,-1]].map(([di,dj])=>[n.i+di,n.j+dj,CHUNK]).filter(([i,j])=>validNode(i,j));
      if(n.i===5&&n.j===-14)nb.push([5,-26,480]);if(n.i===5&&n.j===-26)nb.push([5,-14,480]);
      for(const [i,j,w] of nb){
        const m=NODE(i,j),nd=d+w;if(nd<(dist.get(key(m))??1e9)){dist.set(key(m),nd);prev.set(key(m),n);open.push([nd,m]);}}
    }
    const chain=[];for(let n=best;n;n=prev.get(key(n)))chain.unshift(new V3(n.x,0,n.z));
    pts=[from.clone(),S.p,...chain,E.p,to.clone()];
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
  x=clamp(x,-WORLD+1,WORLD_E-1);z=clamp(z,-WORLD_N+1,WORLD-1);
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
const MAP={cx:0,cz:0,zoom:1.6,drag:null,pointers:new Map(),pinch:null,cursor:false};
function openMap(){if(galleryOn||menuOpen)return;mapOpen=true;bigEl.style.display="block";document.body.classList.add("mapOn");MAP.cx=player.root.x;MAP.cz=player.root.z;MAP.cursor=pad.on;keys.clear();resizeMap();applyAudio&&applyAudio();}
function closeMap(){document.body.classList.remove("mapOn");mapOpen=false;bigEl.style.display="none";keys.clear();}
function resizeMap(){const dpr=Math.min(2,devicePixelRatio);bigEl.width=innerWidth*dpr;bigEl.height=innerHeight*dpr;}
addEventListener("resize",()=>{if(mapOpen)resizeMap();});
const m2s=(x,z)=>{const dpr=bigEl.width/innerWidth;return [(x-MAP.cx)*MAP.zoom*dpr+bigEl.width/2,(z-MAP.cz)*MAP.zoom*dpr+bigEl.height/2];};
const s2m=(sx,sy)=>[(sx-innerWidth/2)/MAP.zoom+MAP.cx,(sy-innerHeight/2)/MAP.zoom+MAP.cz];
function drawBigMap(){
  const c=bctx,W=bigEl.width,H=bigEl.height,dpr=W/innerWidth,z=MAP.zoom*dpr;
  c.fillStyle="#4f6b78";c.fillRect(0,0,W,H);                                   // au-delà : la mer (bientôt)
  let [x0,y0]=m2s(-WORLD,-WORLD);c.fillStyle="#6f7a62";c.fillRect(x0-30*z,y0-30*z,(WORLD*2+30)*z,(WORLD*2+60)*z);
  c.fillStyle="#3a3e45";c.fillRect(x0,y0,(WORLD-12)*2*z,WORLD*2*z);                   // rues
  // campagne et autoroute
  {const [gx,gy]=m2s(-WORLD,-WORLD_N);c.fillStyle="#6c8f45";c.fillRect(gx,gy,WORLD*2*z,(WORLD_N-WORLD)*z+12*z);
   const [tx,ty]=m2s(TOWN.i0*CHUNK-20,TOWN.j0*CHUNK-20);c.fillStyle="#3a3e45";c.fillRect(tx,ty,((TOWN.i1-TOWN.i0)*CHUNK+48)*z,((TOWN.j1-TOWN.j0)*CHUNK+48)*z);
   const [hx,hy]=m2s(HWY_X-8.5,-1068);c.fillStyle="#2c2f35";c.fillRect(hx,hy,17*z,490*z);c.fillStyle="#f2d65a";c.fillRect(hx+8*z,hy,Math.max(1,z),490*z);}
  for(let cx=-NCH;cx<=NCH;cx++)for(let cz=CZ_MIN;cz<=NCH;cz++){
    if(isCountry(cx,cz)){const t=chunkType(cx,cz);if(t==="autoroute")continue;const [qx,qy]=m2s(cx*CHUNK-20,cz*CHUNK-20);if(qx>W||qy>H||qx+40*z<0||qy+40*z<0)continue;
      c.fillStyle={champ:"#a59a4a",foret:"#3d6034",ferme:"#8a6a4a",eolien:"#7f9a46",etang:"#3d6f7f",aire:"#5a5e66",relais:"#5a5e66",prairie:"#6c8f45"}[t]||"#6c8f45";c.fillRect(qx+2*z,qy+2*z,36*z,36*z);continue;}
    const t=chunkType(cx,cz),[bx,by]=m2s(cx*CHUNK-12,cz*CHUNK-12),bw=t==="plage"?40:32;
    if(bx>W||by>H||bx+40*z<0||by+32*z<0)continue;
    c.fillStyle=TYPE_COLOR[t]||"#8f8d86";c.fillRect(bx,by,bw*z,32*z);
    for(const s of sandOf(cx,cz)){const [sx,sy]=m2s(s.x0,s.z0);c.fillStyle="#d8c49a";c.fillRect(sx,sy,(s.x1-s.x0)*z,(s.z1-s.z0)*z);}
    for(const F of reliefOf(cx,cz)){const [fx,fy]=m2s(F.x0,F.z0);c.fillStyle=F.kind==="box"?(F.h>2?"#ece3d0":"#c6bfb0"):"#b3ac9f";c.fillRect(fx,fy,(F.x1-F.x0)*z,(F.z1-F.z0)*z);}
    if(PRIVATE.has(t)&&t!=="maisons"&&!chunks.has(ckey(cx,cz))){c.fillStyle="#c9c2b3";const m=3;c.fillRect(bx+m*z,by+m*z,(32-2*m)*z,(32-2*m)*z);}
  }
  for(const I of ISLANDS){const [ix,iy]=m2s(I.x,I.z);c.fillStyle="#d8c49a";c.beginPath();c.arc(ix,iy,I.r*1.05*z,0,7);c.fill();c.fillStyle="#5f8a4c";c.beginPath();c.arc(ix,iy,I.r*0.75*z,0,7);c.fill();
    if(MAP.zoom>1){c.fillStyle="#fff";c.font=`600 ${12*dpr}px system-ui`;c.textAlign="center";c.fillText(I.name,ix,iy+4*dpr);}}
  for(const f of SEA_FEATURES){const [fx,fy]=m2s(f.x0,f.z0);c.fillStyle="#a07850";c.fillRect(fx,fy,(f.x1-f.x0)*z,Math.max(2,(f.z1-f.z0)*z));}
  c.fillStyle="#d4cdbd";for(const o of obstacles)if(o.bld){const [ox,oy]=m2s(o.x-o.hx,o.z-o.hz);c.fillRect(ox,oy,o.hx*2*z,o.hz*2*z);}
  // noms des rues quand on zoome
  if(MAP.zoom>1.1){c.fillStyle="rgba(255,255,255,.75)";c.font=`${11*dpr}px system-ui`;c.textAlign="center";
    if(MAP.cz>-600)for(let i=-NCH;i<=NCH;i++){const [sx]=m2s(i*CHUNK-16,0),[,sy]=m2s(0,MAP.cz);c.save();c.translate(sx,sy+((i&1)?60:-60)*dpr);c.rotate(-Math.PI/2);c.fillText(AVENUES[i+NCH],0,4*dpr);c.restore();
      const [,ty]=m2s(0,i*CHUNK-16),[tx]=m2s(MAP.cx,0);c.fillText(RUES[i+NCH],tx+((i&1)?90:-90)*dpr,ty+4*dpr);}}
  // itinéraire
  if(route){c.strokeStyle="#b56cff";c.lineWidth=5*dpr;c.lineJoin="round";c.beginPath();route.forEach((p,i)=>{const [a,b]=m2s(p.x,p.z);i?c.lineTo(a,b):c.moveTo(a,b);});c.stroke();}
  // points d'intérêt
  c.textAlign="center";
  for(const P of POIS){const [px,py]=m2s(P.x,P.z);if(px<-20||py<-20||px>W+20||py>H+20)continue;const [ic,col]=POI_ICON[P.type];
    c.fillStyle="rgba(16,18,24,.75)";c.beginPath();c.arc(px,py,11*dpr,0,7);c.fill();c.strokeStyle=col;c.lineWidth=2*dpr;c.stroke();
    c.font=`${12*dpr}px system-ui`;c.fillText(ic,px,py+4*dpr);
    if(MAP.zoom>2.2){c.fillStyle="#fff";c.font=`${11*dpr}px system-ui`;c.fillText(P.name,px,py+24*dpr);}}
  // recherche, police
  if(wanted.level>0&&clockT-wanted.lastSeenT>0.8){const [wx,wy]=m2s(wanted.lastSeenPos.x,wanted.lastSeenPos.z);c.fillStyle="rgba(255,60,60,.2)";c.beginPath();c.arc(wx,wy,wanted.searchR*z,0,7);c.fill();}
  for(const C of policeCars){const [x,y]=m2s(C.g.position.x,C.g.position.z);c.fillStyle="#3070ff";c.fillRect(x-4*dpr,y-4*dpr,8*dpr,8*dpr);}
  for(const w of walkers)if(w.isCop&&!w.ko){const [x,y]=m2s(w.root.x,w.root.z);c.fillStyle="#ff3030";c.beginPath();c.arc(x,y,3.5*dpr,0,7);c.fill();}
  // point d'arrivée
  {const mk=(x,z,col,txt)=>{const [sx,sy]=m2s(x,z);c.fillStyle=col;c.beginPath();c.arc(sx,sy,8*dpr,0,7);c.fill();c.strokeStyle="#111";c.lineWidth=2*dpr;c.stroke();if(txt){c.fillStyle="#fff";c.font=`bold ${11*dpr}px system-ui`;c.textAlign="left";c.strokeStyle="rgba(0,0,0,.7)";c.lineWidth=3*dpr;c.strokeText(txt,sx+11*dpr,sy+4*dpr);c.fillText(txt,sx+11*dpr,sy+4*dpr);}};
    const A=MIS.active;
    if(!A||(A.id==="sac"&&A.step==="back"))mk(CONTACT.x,CONTACT.z,"#4ad66d",A?"Nino (rapporter le sac)":MIS.stage<STORY.length?"Nino : mission "+(MIS.stage+1):"Nino : petits boulots");
    if(A&&A.id==="colis")mk(A.dest.x,A.dest.z,"#4ad66d","Livraison");
    if(A&&A.id==="sac"&&A.step==="go")mk(A.bag.x,A.bag.z,"#4ad66d","Le sac");
    if(A&&A.id==="filature"&&A.target)mk(A.target.root.x,A.target.root.z,"#ff4a4a","Cible");}
  if(waypoint){const [x,y]=m2s(waypoint.x,waypoint.z);c.fillStyle="#ffc83d";c.beginPath();c.moveTo(x,y);c.arc(x,y-16*dpr,9*dpr,Math.PI*0.8,Math.PI*0.2);c.closePath();c.fill();c.fillStyle="#3a2a00";c.beginPath();c.arc(x,y-16*dpr,3.5*dpr,0,7);c.fill();}
  // joueur
  {const [x,y]=m2s(player.root.x,player.root.z);c.save();c.translate(x,y);c.rotate(player.yaw*D2R);c.fillStyle="#fff";c.strokeStyle="#000";c.lineWidth=1.5*dpr;c.beginPath();c.moveTo(0,-10*dpr);c.lineTo(7*dpr,8*dpr);c.lineTo(0,4*dpr);c.lineTo(-7*dpr,8*dpr);c.closePath();c.fill();c.stroke();c.restore();}
  // curseur manette
  if(MAP.cursor){c.strokeStyle="#fff";c.lineWidth=2*dpr;const cx=W/2,cy=H/2;c.beginPath();c.moveTo(cx-14*dpr,cy);c.lineTo(cx+14*dpr,cy);c.moveTo(cx,cy-14*dpr);c.lineTo(cx,cy+14*dpr);c.stroke();}
  // légende
  c.textAlign="left";c.fillStyle="rgba(16,18,24,.8)";c.fillRect(12*dpr,12*dpr,Math.min(W/dpr-24,440)*dpr,(waypoint?92:72)*dpr);c.fillStyle="#fff";c.font=`600 ${14*dpr}px system-ui`;
  c.fillText("Carte — "+streetAt(player.root.x,player.root.z),22*dpr,34*dpr);c.font=`${12*dpr}px system-ui`;c.fillStyle="#cfd6df";
  c.fillText(isTouch()?"Toucher : placer / enlever le point · pincer : zoom":pad.on?"Stick : bouger · A : placer · X : enlever · LT/RT : zoom · B : fermer":"Clic : placer / enlever le point · molette : zoom · glisser : bouger",22*dpr,54*dpr);
  c.fillText("🌳 parc 🔭 vue 🚓 police 🏥 hôpital 🏫 école ⛽ station 🛒 courses 🏖 plage",22*dpr,72*dpr);
  if(waypoint){c.fillStyle="#ffc83d";c.fillText(`Destination : ${waypoint.name} — ${Math.round(routeLen)} m`,22*dpr,90*dpr);}
}
function mapClick(sx,sy){
  if(CREA.on){const [mx,mz]=s2m(sx,sy);const poi=POIS.find(P=>Math.hypot(P.x-mx,P.z-mz)*MAP.zoom<16);closeMap();if(poi)teleportTo(poi.x,poi.z,poi.name);else teleportTo(clamp(mx,-WORLD+1,WORLD_E-1),clamp(mz,-WORLD_N+1,WORLD-1),streetAt(mx,mz));return;}
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
  if(MAP.pinch&&MAP.pointers.size===2){const [a,b]=[...MAP.pointers.values()];MAP.zoom=clamp(MAP.pinch.z*Math.hypot(a.x-b.x,a.y-b.y)/MAP.pinch.d,0.6,6);return;}
  if(MAP.drag){MAP.cx-=(e.clientX-MAP.drag.x)/MAP.zoom;MAP.cz-=(e.clientY-MAP.drag.y)/MAP.zoom;MAP.drag.x=e.clientX;MAP.drag.y=e.clientY;MAP.cursor=false;}});
bigEl.addEventListener("pointerup",e=>{MAP.pointers.delete(e.pointerId);
  if(MAP.drag&&Math.hypot(e.clientX-MAP.drag.sx,e.clientY-MAP.drag.sy)<8&&performance.now()-MAP.drag.t<400)mapClick(e.clientX,e.clientY);
  MAP.drag=null;if(MAP.pointers.size<2)MAP.pinch=null;});
bigEl.addEventListener("wheel",e=>{e.preventDefault();const [mx,mz]=s2m(e.clientX,e.clientY);MAP.zoom=clamp(MAP.zoom*(e.deltaY<0?1.15:1/1.15),0.6,6);
  const [nx,nz]=s2m(e.clientX,e.clientY);MAP.cx+=mx-nx;MAP.cz+=mz-nz;},{passive:false});
addEventListener("keydown",e=>{
  if(e.code==="Tab"){e.preventDefault();mapOpen?closeMap():openMap();return;}
  if(!mapOpen)return;
  if(e.code==="Escape"){e.preventDefault();e.stopImmediatePropagation();closeMap();return;}
  const s=60/MAP.zoom;
  if(e.code==="ArrowLeft")MAP.cx-=s;if(e.code==="ArrowRight")MAP.cx+=s;if(e.code==="ArrowUp")MAP.cz-=s;if(e.code==="ArrowDown")MAP.cz+=s;
  if(e.code==="Equal"||e.code==="NumpadAdd")MAP.zoom=clamp(MAP.zoom*1.2,0.6,6);if(e.code==="Minus"||e.code==="NumpadSubtract")MAP.zoom=clamp(MAP.zoom/1.2,0.6,6);
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
  const lt=gp.buttons[6]?.value||0,rt=gp.buttons[7]?.value||0;MAP.zoom=clamp(MAP.zoom*Math.exp((rt-lt)*1.6*dt),0.6,6);
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
  const n=player.root.x>SEA_X?(onIsland(player.root.x,player.root.z)?.name||(seaFeatureH(player.root.x,player.root.z)>0?(player.root.z>0?"Ponton de plongée":"Pont des Pélicans"):"En mer")):blockOf(player.root.x,player.root.z)?`${streetAt(player.root.x,player.root.z)} · ${inTown(bi,bj)?"Port-Soleil":QUARTIER[chunkType(bi,bj)]}`:streetAt(player.root.x,player.root.z);
  if(n!==streetName){streetName=n;streetEl.textContent=n;streetEl.classList.add("show");streetT=clockT;}
  else if(clockT-streetT>4)streetEl.classList.remove("show");
}
document.getElementById("mapClose").addEventListener("pointerdown",e=>{e.stopPropagation();closeMap();});
