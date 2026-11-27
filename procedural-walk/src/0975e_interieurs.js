// ================================================================ MODULE 24 : intérieurs — on peut entrer dans TOUS les bâtiments
// Près d'un mur de bâtiment : E pour entrer si c'est ouvert (magasin en journée, église, hall, hôpital…), sinon la porte est
// verrouillée et on l'enfonce à coups de pied (ou de poing). La solidité dépend du bâtiment : une cabane en forêt cède
// en 1-2 coups, une maison en 3, un immeuble en 4, un magasin fermé en 5, un entrepôt en 6, une tour/un commissariat en 9.
// L'intérieur est construit à la demande dans le volume du bâtiment (murs, sol, plafond, lumière, meubles selon le type).
// Les habitants réagissent : certains sortent leur téléphone et appellent la police (7 s) — si on les met KO avant, personne
// n'appelle. Les voisins dehors peuvent aussi voir l'effraction. On peut fouiller les meubles (E) pour trouver de l'argent.
const INT={list:[],cur:null,near:null,ck:0,broken:new Set(),looted:new Set(),hits:new Map()};
const IFLOOR=new Map();
const intLight=new THREE.PointLight(0xfff0d8,0,22,1.3);scene.add(intLight);
const IM={
  parquet:mat({roughness:0.7,map:cTex("parq",128,128,(g,w,h)=>{for(let y=0;y<h;y+=16)for(let x=-(y/16%2)*32;x<w;x+=64){const v=150+Math.random()*40|0;g.fillStyle=`rgb(${v},${v*0.7|0},${v*0.45|0})`;g.fillRect(x,y,63,15);}})}),
  tiles:mat({roughness:0.35,map:cTex("tilesI",64,64,(g,w,h)=>{g.fillStyle="#e8e4dc";g.fillRect(0,0,w,h);g.fillStyle="#c8c4bc";g.fillRect(0,0,w,2);g.fillRect(0,0,2,h);g.fillRect(0,32,w,2);g.fillRect(32,0,2,h);})}),
  concrete:mat({color:0x8a8a86,roughness:0.95}),wood:mat({color:0x8a6a4a,roughness:0.9,map:KM.plank.map}),
  wallH:["#efe6d6","#dfe8e0","#f2dcd0","#e0e4f0","#f4ecc8"].map(c=>mat({color:c,roughness:0.95})),wallW:mat({color:0xb8b4ac,roughness:0.95}),wallC:mat({color:0x7a6a58,map:KM.plank.map,roughness:1}),
  ceil:new THREE.MeshStandardMaterial({color:0xf4f2ec,roughness:1}),sofa:["#5a6a8a","#8a4a3a","#4a6a4a","#6a5a7a","#b89a6a"].map(c=>mat({color:c,roughness:0.95})),
  dark:mat({color:0x1e1e22,roughness:0.5}),screen:new THREE.MeshBasicMaterial({color:0x2a4a7a}),white:mat({color:0xf2f0ea,roughness:0.6}),metal:mat({color:0x9aa0a6,metalness:0.6,roughness:0.4}),
  rug:["#8a3a3a","#3a5a8a","#6a5a3a","#2a6a5a"].map(c=>mat({color:c,roughness:1})),bed:mat({color:0xf2f0ea,roughness:1}),blanket:["#3a5a8a","#8a3a4a","#4a7a5a","#c8a040"].map(c=>mat({color:c,roughness:1})),
  shelf:mat({color:0xd8d4cc,roughness:0.7}),prod:["#c8281e","#f2c43a","#2a7ab8","#4a9a3a","#e86a1a","#8a3aa8","#f2f2f2"].map(c=>mat({color:c,roughness:0.6})),
  glass:mat({color:0x2b4a62,roughness:0.08,metalness:0.6,transparent:true,opacity:0.5}),plant:mat({color:0x3d7a2a,roughness:0.9}),pot:mat({color:0xb5643c,roughness:0.9}),
  marble:mat({roughness:0.2,map:cTex("marbleI",128,128,(g,w,h)=>{g.fillStyle="#e8e6e2";g.fillRect(0,0,w,h);g.strokeStyle="rgba(120,120,130,.25)";for(let i=0;i<12;i++){g.beginPath();g.moveTo(Math.random()*w,0);g.bezierCurveTo(Math.random()*w,h*0.3,Math.random()*w,h*0.6,Math.random()*w,h);g.stroke();}})}),
  hay:mat({color:0xd8b860,roughness:1}),bars:mat({color:0x4a4e54,metalness:0.7,roughness:0.4}),web:new THREE.MeshBasicMaterial({color:0xd8d8d8,transparent:true,opacity:0.25,side:THREE.DoubleSide,depthWrite:false}),
  doorBroken:mat({color:0x6b4429,roughness:0.8}),hole:new THREE.MeshBasicMaterial({color:0x0e0c0a})};
// ---------------------------------------------------------------- quel bâtiment, quel type, quelle solidité
function bldKey(o){return Math.round(o.x*2)+"|"+Math.round(o.z*2);}
function bldInfo(o){
  const grid=inGridArea(o.x,o.z),cx=grid?Math.round((o.x-4)/40):Math.round(o.x/40),cz=grid?Math.round((o.z-4)/40):Math.round(o.z/40),t=chunkType(cx,cz)||"",big=o.hx*o.hz>220;
  const country=!grid,forest=country&&["foret","pinede","jungle","bayou","bambou","mangrove"].includes(biomeAt(o.x,o.z));
  const h=DAY.t,day=h>=8&&h<21;
  let kind="maison",str=3,pub=false,res=[1,3];
  if(t==="banque"){kind="banque";str=99;pub=day;res=[0,0];}
  else if(/cabanes|paillotes|lieu_maison_abandon|lieu_tour_guet/.test(t)){kind=t==="lieu_maison_abandon"?"abandon":"cabane";str=t==="cabanes"||t==="paillotes"?2:1;res=t==="lieu_maison_abandon"?[0,0]:[0,1];}
  else if(/^lieu_hameau|^lieu_caravanes|ferme|^ranch|^lavande/.test(t)){kind=big?"grange":"maison";str=forest?1:2;res=[0,big?0:2];}
  else if(country&&!t.startsWith("lieu_")&&!t.startsWith("station")&&!["motel","diner","relais","aire","camping","aeroport"].includes(t)){kind=big?"grange":"cabane";str=forest?1:2;res=[0,1];}
  else if(/maisons|villas|chalets|adobe|pop_rue/.test(t)){kind="maison";str=t==="villas"?4:3;res=[1,3];}
  else if(/immeubles|hotels/.test(t)){kind=t==="hotels"?"hotel":"appart";str=4;pub=t==="hotels";res=[1,2];}
  else if(/commerces|pop_marche|supermarche|marche|station|diner|relais|motel|foodtrucks|^lieu_stand/.test(t)){kind=/diner|relais/.test(t)?"resto":t==="motel"?"hotel":"boutique";str=5;pub=day;res=[1,1];}
  else if(/tours|zenith|port_capitainerie/.test(t)){kind="bureau";str=9;pub=day;res=[1,1];}
  else if(/entrepot|port_|conteneurs|aeroport/.test(t)){kind=t==="aeroport"&&!big?"bureau":"entrepot";str=6;pub=t==="aeroport";res=[0,1];}
  else if(/eglise|lieu_chapelle/.test(t)){kind="eglise";str=3;pub=day;res=[0,1];}
  else if(t==="hopital"){kind="hopital";str=9;pub=true;res=[1,2];}
  else if(t==="commissariat"){kind="commissariat";str=99;pub=true;res=[2,3];}
  else if(t==="ecole"){kind="ecole";str=5;pub=day&&h<17;res=[0,2];}
  if(big&&kind==="maison")kind="appart";
  return {kind,str,pub,res,forest,t};
}
// le mur de bâtiment juste devant le joueur
function wallInFront(){
  const p=player.root,f=fwdOf(player.yaw);let best=null,bd=1.6;
  for(const o of obsAt(p)){if(!o.bld||o.type!=="box"||o.inner)continue;const c=obstacleClosest(o,p);if(c.d<0||c.d>bd)continue;if(c.nx*f.x+c.nz*f.z>-0.3)continue;bd=c.d;best={o,nx:c.nx,nz:c.nz};}
  if(!best){for(const I of INT.list)if(I.active)for(const o of [I.o]){}}
  return best;
}
// ---------------------------------------------------------------- construction de l'intérieur
function furnish(I,g,r){
  const {x0,x1,z0,z1,fy,kind}=I,W=x1-x0,D=z1-z0,cx=(x0+x1)/2,cz=(z0+z1)/2,obs=I.obs,dn=I.door;
  // couloir libre devant la porte (1,6 m de large, 2,8 m de profondeur)
  const ix=dn.side==="w"?1:dn.side==="e"?-1:0,iz=dn.side==="n"?1:dn.side==="s"?-1:0;
  const cX0=ix?Math.min(dn.x,dn.x+ix*2.8):dn.x-0.8,cX1=ix?Math.max(dn.x,dn.x+ix*2.8):dn.x+0.8;
  const cZ0=iz?Math.min(dn.z,dn.z+iz*2.8):dn.z-0.8,cZ1=iz?Math.max(dn.z,dn.z+iz*2.8):dn.z+0.8;
  const inCor=(x,z,hx,hz)=>x+hx>cX0&&x-hx<cX1&&z+hz>cZ0&&z-hz<cZ1;
  const O=(x,z,hx,hz)=>{if(inCor(x,z,hx,hz))return;obs.push(addObstacle({type:"box",x,z,hx,hz,inner:true}));};
  const nearDoor=(x,z)=>Math.hypot(x-dn.x,z-dn.z)<2.2;
  const B=(w,h,d,m,x,y,z,ry=0)=>{const c=Math.abs(Math.cos(ry))>0.5,hx=(c?w:d)/2,hz=(c?d:w)/2;if(y<2.2&&inCor(x,z,hx,hz))return null;return put(BX(w,h,d),m,x,fy+y,z,g,ry);};
  const loot=(x,z,label)=>I.loot.push({x,z,label,id:I.key+"|"+I.loot.length});
  const sofa=(x,z,ry)=>{const m=IM.sofa[Math.floor(r()*IM.sofa.length)],c=Math.abs(Math.cos(ry))>0.5;B(2.2,0.45,0.9,m,x,0.25,z,ry);const bk=new V3(Math.sin(ry),0,Math.cos(ry));B(2.2,0.5,0.25,m,x-bk.x*0.35,0.7,z-bk.z*0.35,ry);O(x,z,c?1.1:0.5,c?0.5:1.1);};
  const table=(x,z,w=1.4,d=0.9)=>{B(w,0.06,d,IM.wood,x,0.74,z);for(const [a,b] of [[-1,-1],[1,-1],[-1,1],[1,1]])B(0.07,0.72,0.07,IM.wood,x+a*(w/2-0.1),0.36,z+b*(d/2-0.1));O(x,z,w/2,d/2);};
  const chair=(x,z)=>{if(inCor(x,z,0.25,0.25))return;B(0.45,0.05,0.45,IM.wood,x,0.45,z);B(0.45,0.5,0.05,IM.wood,x,0.7,z-0.2);for(const [a,b] of [[-1,-1],[1,-1],[-1,1],[1,1]])B(0.04,0.45,0.04,IM.wood,x+a*0.19,0.22,z+b*0.19);};
  const bed=(x,z,ry)=>{B(1.6,0.45,2.1,IM.wood,x,0.22,z,ry);B(1.5,0.2,2,IM.bed,x,0.52,z,ry);B(1.52,0.08,1.3,IM.blanket[Math.floor(r()*4)],x,0.64,z+0.3,ry);const c=Math.abs(Math.cos(ry))>0.5;O(x,z,c?0.8:1.05,c?1.05:0.8);};
  const plant=(x,z)=>{if(inCor(x,z,0.3,0.3))return;B(0.4,0.4,0.4,IM.pot,x,0.2,z);put(geo("ipl",()=>new THREE.IcosahedronGeometry(0.45,0)),IM.plant,x,fy+0.85,z,g);};
  const shelfRow=(x,z,len,ax)=>{B(ax?len:0.5,1.8,ax?0.5:len,IM.shelf,x,0.9,z);for(let k=0;k<3;k++)for(let s=-len/2+0.3;s<len/2;s+=0.45)B(0.3,0.3,0.3,IM.prod[Math.floor(r()*7)],x+(ax?s:0),0.45+k*0.55,z+(ax?0:s));O(x,z,ax?len/2:0.3,ax?0.3:len/2);};
  const along=(fn,n,mg=1.5)=>{for(let k=0;k<n;k++){let x,z,t=0;do{x=x0+mg+r()*(W-2*mg);z=z0+mg+r()*(D-2*mg);t++;}while(nearDoor(x,z)&&t<8);fn(x,z,k);}};
  switch(kind){
    case "maison":case "appart":case "cabane":case "abandon":{
      const rug=kind==="abandon"?null:IM.rug[Math.floor(r()*4)];if(rug)put(geo("irug",()=>new THREE.PlaneGeometry(3,2).rotateX(-Math.PI/2)),rug,cx,fy+0.045,cz,g);
      const small=W*D<30;
      if(!small){sofa(x0+1.3,cz,Math.PI/2);B(0.6,0.5,1.6,IM.wood,x1-0.6,0.25,cz);B(0.08,0.75,1.3,IM.dark,x1-0.65,0.95,cz);put(BX(0.02,0.65,1.2),IM.screen,x1-0.69,fy+0.95,cz,g);O(x1-0.6,cz,0.3,0.8);table(cx,cz-1.2,0.9,0.6);}
      bed(x0+1.2,z1-1.4,0);table(x1-1.3,z0+1.1);chair(x1-1.3,z0+1.8);B(2,0.9,0.6,IM.white,cx,0.45,z0+0.35);B(0.7,1.8,0.65,IM.white,cx+1.4,0.9,z0+0.37);O(cx+0.35,z0+0.35,1.4,0.35);
      if(kind!=="abandon"){plant(x0+0.5,z0+0.5);loot(cx,z0+0.9,"le tiroir de la cuisine");loot(x0+1.2,z1-2.6,"la table de nuit");}
      else{for(let k=0;k<3;k++){const p=put(geo("iweb",()=>new THREE.PlaneGeometry(1.2,1.2)),IM.web,x0+0.3+r()*(W-0.6),fy+2.6,z0+0.3,g);p.rotation.x=0.4;}const ch=put(BX(0.45,0.5,0.45),IM.wood,cx+1,fy+0.2,cz+1,g);ch.rotation.z=1.4;loot(cx,cz,"un vieux coffre");}
      if(kind==="cabane"){B(0.8,0.9,0.6,IM.dark,x1-0.5,0.45,z1-0.5);put(CY(0.1,0.1,2.6,6),IM.dark,x1-0.5,fy+2.2,z1-0.5,g);O(x1-0.5,z1-0.5,0.4,0.3);}
      break;}
    case "boutique":{for(let x=x0+2;x<x1-1.5;x+=2.4)shelfRow(x,cz+0.5,Math.min(D-3.5,7),false);B(2.4,1,0.7,IM.wood,x0+1.6,0.5,z0+1.2);B(0.4,0.3,0.3,IM.dark,x0+1.2,1.15,z0+1.2);O(x0+1.6,z0+1.2,1.2,0.35);
      B(1.2,2,0.6,IM.glass,x1-0.8,1,z0+0.6);for(let k=0;k<4;k++)B(0.25,0.3,0.25,IM.prod[k],x1-0.8,0.4+k*0.45,z0+0.6);O(x1-0.8,z0+0.6,0.6,0.3);loot(x0+1.6,z0+1.9,"la caisse");break;}
    case "resto":{for(let k=0;k<6;k++){const x=x0+2+(k%3)*Math.max(2.4,(W-4)/3),z=z0+3+Math.floor(k/3)*3;if(x<x1-1&&z<z1-1){table(x,z,1,1);chair(x-0.8,z);chair(x+0.8,z);}}B(W-2,1,0.6,IM.wood,cx,0.5,z1-1);O(cx,z1-1,W/2-1,0.3);loot(cx,z1-1.6,"le comptoir");break;}
    case "bureau":case "hotel":{put(geo("imarble",()=>new THREE.PlaneGeometry(1,1).rotateX(-Math.PI/2)),IM.marble,cx,fy+0.045,cz,g,0,W,1,D);B(3,1.1,0.8,IM.wood,cx,0.55,cz-1);O(cx,cz-1,1.5,0.4);
      for(const s of [-1,1]){sofa(cx+s*Math.min(W/2-1.5,4),cz+2,s>0?-Math.PI/2:Math.PI/2);plant(cx+s*(W/2-0.8),z1-0.8);}
      for(let k=0;k<2;k++)B(1.4,2.4,0.1,IM.metal,cx-1+k*2,1.2,z1-0.3);if(W*D>150)for(const [a,b] of [[-1,-1],[1,-1],[-1,1],[1,1]]){const x=cx+a*W/4,z=cz+b*D/4;put(CY(0.35,0.35,3.2,10),IM.white,x,fy+1.6,z,g);O(x,z,0.35,0.35);}
      loot(cx,cz-0.3,"le bureau d'accueil");break;}
    case "entrepot":case "grange":{const g2=kind==="grange";for(let x=x0+2;x<x1-1.5;x+=3.2)for(let z=z0+2;z<z1-2;z+=4.5){if(nearDoor(x,z))continue;if(g2){put(geo("ihay",()=>new THREE.CylinderGeometry(0.75,0.75,1.2,12).rotateZ(Math.PI/2)),IM.hay,x,fy+0.75,z,g);O(x,z,0.6,0.75);}
      else{B(1.2,2.6,2.6,IM.metal,x,1.3,z);for(let k=0;k<3;k++)B(1,0.7,1,OM.crate,x,0.4+k*0.85,z);O(x,z,0.6,1.3);}}loot(x1-1,z1-1,g2?"une caisse à outils":"un bureau de contremaître");break;}
    case "eglise":{put(geo("icarpet",()=>new THREE.PlaneGeometry(1.4,1).rotateX(-Math.PI/2)),IM.rug[0],cx,fy+0.045,cz,g,0,1,1,D-1);for(let z=z0+2;z<z1-2.5;z+=1.4)for(const s of [-1,1]){B(W/2-1.4,0.5,0.4,IM.wood,cx+s*(W/4+0.35),0.45,z);O(cx+s*(W/4+0.35),z,W/4-0.7,0.2);}
      B(2,1,0.8,IM.white,cx,0.5,z1-1.2);O(cx,z1-1.2,1,0.4);for(const s of [-0.7,0.7])put(CY(0.04,0.04,0.3,6),IM.white,cx+s,fy+1.15,z1-1.2,g);loot(cx,z1-2,"le tronc des offrandes");break;}
    case "hopital":{for(let x=x0+1.5;x<x1-1;x+=2.6){bed(x,z1-1.4,0);B(0.05,2,2.2,IM.wallH[1],x+1.25,1,z1-1.4);}B(3,1.1,0.8,IM.white,cx,0.55,z0+1.5);O(cx,z0+1.5,1.5,0.4);plant(x0+0.6,z0+0.6);break;}
    case "commissariat":{for(let k=0;k<3;k++)table(x0+2+k*2.6,cz,1.4,0.8);const cx2=x1-2.2;for(let z=z0+1;z<z1-1;z+=0.25)put(BX(0.05,2.6,0.05),IM.bars,cx2,fy+1.3,z,g);obs.push(addObstacle({type:"box",x:cx2,z:cz,hx:0.05,hz:D/2-1,inner:true,bld:true,tall:true}));break;}
    case "banque":{bankFurnish(I,g,r,O,B,plant,sofa);break;}
    case "ecole":{for(let x=x0+1.6;x<x1-1;x+=1.8)for(let z=z0+2;z<z1-2;z+=1.6)table(x,z,1,0.6);B(W-2,1.2,0.05,IM.dark,cx,1.5,z1-0.1);break;}
  }
  if(kind!=="abandon"&&kind!=="grange"&&kind!=="entrepot")for(let k=0;k<2;k++){const z=z0+1.5+r()*(D-3);B(0.05,0.6,0.8,IM.prod[Math.floor(r()*7)],x0+0.05,1.6,z);}
}
function openInterior(o,door){
  const key=bldKey(o);let I=INT.list.find(q=>q.key===key);
  if(!I){const info=bldInfo(o),inset=0.25,x0=o.x-o.hx+inset,x1=o.x+o.hx-inset,z0=o.z-o.hz+inset,z1=o.z+o.hz-inset;
    const fy=inGridArea(o.x,o.z)?SIDEWALK:Math.min(groundAt(door.x,door.z),groundAt(o.x,o.z))+0.03,H=3.3,g=new THREE.Group(),r=mulberry(Math.abs(Math.round(o.x*7+o.z*13)));
    I={key,o,...info,x0,x1,z0,z1,fy,ceil:fy+H,g,obs:[],loot:[],door,active:false,residents:[],alarm:null,deco:new THREE.Group()};
    const wm=info.kind==="cabane"||info.kind==="abandon"||info.kind==="grange"?IM.wallC:info.kind==="entrepot"?IM.wallW:IM.wallH[Math.floor(r()*IM.wallH.length)];
    const floor=info.kind==="maison"||info.kind==="appart"||info.kind==="eglise"?IM.parquet:info.kind==="entrepot"||info.kind==="grange"?IM.concrete:info.kind==="cabane"||info.kind==="abandon"?IM.wood:IM.tiles;
    const W=x1-x0,D=z1-z0,cx=(x0+x1)/2,cz=(z0+z1)/2;
    const fk=floor.uuid+"|"+Math.round(W)+"|"+Math.round(D);let fm=IFLOOR.get(fk);if(!fm){fm=floor;if(floor.map){fm=floor.clone();fm.map=floor.map.clone();fm.map.wrapS=fm.map.wrapT=THREE.RepeatWrapping;fm.map.repeat.set(Math.max(1,Math.round(W/2)),Math.max(1,Math.round(D/2)));fm.map.needsUpdate=true;}IFLOOR.set(fk,fm);}
    put(geo("ifloor",()=>new THREE.PlaneGeometry(1,1).rotateX(-Math.PI/2)),fm,cx,fy+0.035,cz,g,0,W,1,D);
    put(geo("iceil",()=>new THREE.PlaneGeometry(1,1).rotateX(Math.PI/2)),IM.ceil,cx,fy+H,cz,g,0,W,1,D);
    // murs intérieurs (faces vers l'intérieur) avec l'ouverture de la porte
    const side=door.side,dg=0.85;
    const wall=(ax,fixed,a,b,face)=>{if(b-a<0.05)return;const len=b-a,mid=(a+b)/2;const m=new THREE.Mesh(geo("iwall",()=>new THREE.PlaneGeometry(1,1)),wm);m.scale.set(len,H,1);
      if(ax==="x"){m.position.set(mid,fy+H/2,fixed);m.rotation.y=face>0?0:Math.PI;}else{m.position.set(fixed,fy+H/2,mid);m.rotation.y=face>0?Math.PI/2:-Math.PI/2;}g.add(m);
      I.obs.push(addObstacle(ax==="x"?{type:"box",x:mid,z:fixed-face*0.12,hx:len/2,hz:0.12,inner:true,bld:true,tall:true}:{type:"box",x:fixed-face*0.12,z:mid,hx:0.12,hz:len/2,inner:true,bld:true,tall:true}));};
    const sides={n:["x",z0,x0,x1,1],s:["x",z1,x0,x1,-1],w:["z",x0,z0,z1,1],e:["z",x1,z0,z1,-1]};
    for(const [k,[ax,fixed,a,b,face]] of Object.entries(sides)){if(k===side){const c=ax==="x"?door.x:door.z;wall(ax,fixed,a,c-dg,face);wall(ax,fixed,c+dg,b,face);put(BX(ax==="x"?dg*2:0.1,H-2.3,ax==="x"?0.1:dg*2),wm,ax==="x"?c:fixed,fy+2.3+(H-2.3)/2,ax==="x"?fixed:c,g);}else wall(ax,fixed,a,b,face);}
    furnish(I,g,r);bake(g);if(I.kind==="banque")bankInterior(I);scene.add(g);g.visible=false;
    // l'encadrement de porte vu de dehors
    const dx=side==="w"?-1:side==="e"?1:0,dz=side==="n"?-1:side==="s"?1:0,ox=door.x+dx*(0.26+inset),oz=door.z+dz*(0.26+inset);
    const hole=new THREE.Mesh(geo("ihole",()=>new THREE.PlaneGeometry(1.5,2.3)),IM.hole);hole.position.set(ox,fy+1.15,oz);hole.rotation.y=dz?(dz>0?0:Math.PI):(dx>0?Math.PI/2:-Math.PI/2);if(!o.bankDoor)I.deco.add(hole);scene.add(I.deco);
    INT.list.push(I);if(INT.list.length>4){const old=INT.list.find(q=>q!==I&&!q.active);if(old)disposeInterior(old);}
    // habitants
    const [a,b]=info.res,night=DAY.night>0.5,n=info.pub?Math.min(1,b):Math.floor(a+(b-a)*(night?0.8:Math.random()));
    for(let k=0;k<n;k++){const p=new V3(x0+1.2+Math.random()*(W-2.4),0,z0+1.2+Math.random()*(D-2.4));if(Math.hypot(p.x-door.x,p.z-door.z)<2.5)p.z=(z0+z1)/2;const look=randomPerson(rng);const w=spawnSpecial(look,new ResidentBrain(I),p,Math.random()*360);w.isMission=true;w.resident=I;I.residents.push(w);}
  }
  I.door=door;return I;
}
function activateInterior(I){if(I.active)return;I.active=true;removeObstacle(I.o);for(const o of I.obs)if(!obstacles.includes(o))addObstacle(o);I.g.visible=true;INT.cur=I;}
function deactivateInterior(I){if(!I.active)return;I.active=false;for(const o of I.obs)removeObstacle(o);if(!obstacles.includes(I.o))addObstacle(I.o);I.g.visible=false;if(INT.cur===I)INT.cur=null;}
function disposeInterior(I){deactivateInterior(I);scene.remove(I.g);scene.remove(I.deco);I.g.traverse(o=>{if(o.isMesh&&!o.geometry.userData.shared)o.geometry.dispose();});for(const w of I.residents)if(walkers.includes(w))removeWalker(w,true);const i=INT.list.indexOf(I);if(i>=0)INT.list.splice(i,1);}
function inRoom(I,p,m=0){return p.x>I.x0-m&&p.x<I.x1+m&&p.z>I.z0-m&&p.z<I.z1+m;}
// ---------------------------------------------------------------- habitants
class ResidentBrain extends NpcBrain{
  constructor(I){super();this.I=I;this.temper=Math.random();this.state="calme";this.t=rand(2,5);this.callT=0;}
  pick(w){const I=this.I;this.target.set(I.x0+1+Math.random()*(I.x1-I.x0-2),0,I.z0+1+Math.random()*(I.z1-I.z0-2));this.path=[this.target.clone()];}
  alarm(w,theft){if(this.state!=="calme"||w.ko)return;const I=this.I;if(I.pub&&!I.forced&&!theft)return;this.state=this.temper<0.6?"appel":"peur";this.callT=7;
    say(w,pick(this.state==="appel"?["Au voleur ! J'appelle la police !","Qu'est-ce que vous faites chez moi ?!","Allô, la police ? Il y a quelqu'un chez moi !"]:["Prenez ce que vous voulez, ne me faites pas de mal !","Au secours !","Sortez d'ici !"]));if(this.state==="appel")showPhone(w,true);}
  update(w,dt,time){
    if(this.fight||this.flee||this.react||this.cuffed||this.surrender){super.update(w,dt,time);return;}
    const I=this.I;w.faceYaw=null;
    if(this.state==="appel"){w.wish.set(0,0,0);const to=new V3().subVectors(player.root,w.root);w.faceYaw=Math.atan2(to.x,-to.z)/D2R+180;this.callT-=dt;
      if(this.callT<=0){this.state="peur";showPhone(w,false);if(!(CREA.on&&CREA.noCops)){const c={t0:clockT,pts:4,counted:0,reported:false,sev:2};reportCrime(c,"Un habitant a appelé la police !","witness");wanted.lastSeenPos.copy(player.root);}}
      return;}
    if(this.state==="peur"){const away=new V3().subVectors(w.root,player.root);away.y=0;const L=away.length()||1;const t=w.root.clone().addScaledVector(away,1/L*2);t.x=clamp(t.x,I.x0+0.6,I.x1-0.6);t.z=clamp(t.z,I.z0+0.6,I.z1-0.6);
      const d=new V3().subVectors(t,w.root);d.y=0;w.wish.copy(d.lengthSq()>0.04?d.normalize():d.set(0,0,0));w.run=true;return;}
    this.t-=dt;if(this.t<=0){this.t=rand(3,7);this.pick(w);}const d=new V3().subVectors(this.target,w.root);d.y=0;if(d.length()<0.4)w.wish.set(0,0,0);else{w.wish.copy(d.normalize()).multiplyScalar(0.6);w.run=false;}
    if(I.active&&inRoom(I,player.root)&&canSee(w,player,14,200))this.alarm(w);
  }
}
// ---------------------------------------------------------------- interaction : entrer, enfoncer, fouiller
function doorFromWall(o,nx,nz){if(o.bankDoor)return {...o.bankDoor};const p=player.root,side=Math.abs(nx)>Math.abs(nz)?(nx>0?"e":"w"):(nz>0?"s":"n");
  const x=side==="w"?o.x-o.hx+0.25:side==="e"?o.x+o.hx-0.25:clamp(p.x,o.x-o.hx+1.3,o.x+o.hx-1.3),z=side==="n"?o.z-o.hz+0.25:side==="s"?o.z+o.hz-0.25:clamp(p.z,o.z-o.hz+1.3,o.z+o.hz-1.3);return {x,z,side};}
function canOpenSmall(o){return o.hx>=1.6&&o.hz>=1.6;}
function tryEnterBuilding(){
  if(drive||player.ko)return false;
  // fouiller un meuble
  const I0=INT.cur;if(I0&&inRoom(I0,player.root))for(const L of I0.loot){if(INT.looted.has(L.id))continue;if(Math.hypot(L.x-player.root.x,L.z-player.root.z)<1.6){INT.looted.add(L.id);const m=I0.kind==="abandon"?Math.round(rand(5,60)):Math.round(rand(20,260)*(I0.kind==="bureau"||I0.kind==="boutique"?2:1));giveMoney(m);floatText(player,"+"+m+" € ("+L.label+")","#7dffa1");playSound("slap",0.05);I0.residents.forEach(w=>w.brain.alarm&&w.brain.alarm(w,true));return true;}}
  const W=wallInFront();if(!W||!canOpenSmall(W.o))return false;
  const info=bldInfo(W.o),key=bldKey(W.o);
  if(info.kind==="banque"){if(!info.pub){hudMsg("Banque Azur fermée : ouverte de 8 h à 21 h");return true;}if(W.nz>-0.5){hudMsg("L'entrée de la banque est sur la façade (côté enseigne)");return true;}}
  if(info.pub||INT.broken.has(key)){const I=openInterior(W.o,doorFromWall(W.o,W.nx,W.nz));activateInterior(I);hudMsg(info.pub&&!INT.broken.has(key)?"Tu entres.":"La porte est enfoncée, tu entres.");return true;}
  if(info.str>=99){hudMsg("Porte blindée : impossible de l'enfoncer.");return true;}
  hudMsg(`Porte verrouillée (${info.kind==="cabane"||info.kind==="abandon"?"fragile":info.str<=3?"normale":info.str<=5?"solide":"très solide"}) : donne des coups de pied pour l'enfoncer`);return true;
}
function doorHit(force){
  const W=wallInFront();if(!W||!canOpenSmall(W.o))return;const info=bldInfo(W.o),key=bldKey(W.o);if(info.pub||INT.broken.has(key))return;
  if(info.str>=99){hudMsg("Porte blindée.");return;}
  const h=(INT.hits.get(key)||0)+force;INT.hits.set(key,h);playSound("thud",0.8);cam.shake=Math.min(1,cam.shake+0.2);
  // voisins témoins
  if(h===force&&!(CREA.on&&CREA.noCops)){for(const w of walkers){if(w===player||w.isCop||w.ko||w.resident)continue;if(hdist(w.root,player.root)<18&&canSee(w,player,18,200)){registerCrime({isCop:false,_crime:null,brain:{},root:player.root},false);break;}}}
  if(h<info.str){floatText(player,`Porte ${Math.min(99,Math.round(h/info.str*100))} %`,"#ffd08a");return;}
  INT.broken.add(key);const I=openInterior(W.o,doorFromWall(W.o,W.nx,W.nz));I.forced=true;activateInterior(I);
  playSound("thud",1);rumble(300,1);hudMsg("Porte enfoncée !");floatText(player,"CRAC !","#ffb07a");
  const p=put(BX(1,2.1,0.08),IM.doorBroken,I.door.x,I.fy+0.05,I.door.z,I.deco);p.rotation.set(-Math.PI/2,Math.random()*3,0);
  for(const w of I.residents)setTimeout(()=>{if(walkers.includes(w)&&!w.ko)w.brain.alarm(w);},rand(400,1500));
}
function updateInteriors(dt){
  // coups de pied / de poing contre une porte
  const a=player.atk;if(a&&!a._door&&a.t>=a.impactT){a._door=true;doorHit(a.type==="kick"?1:0.4);}
  INT.ck-=dt;if(INT.ck<=0){INT.ck=0.3;
    for(const I of INT.list.slice()){if(!chunks.has(ckey(Math.round(I.o.x/40),Math.round(I.o.z/40)))&&!chunks.has(ckey(Math.round((I.o.x-4)/40),Math.round((I.o.z-4)/40)))){disposeInterior(I);continue;}
      const inside=inRoom(I,player.root,0.6);if(inside&&!I.active){for(const J of INT.list)if(J!==I)deactivateInterior(J);activateInterior(I);}
      else if(!inside&&I.active&&!inRoom(I,player.root,3))deactivateInterior(I);
      if(hdist(I.o,player.root)>180)disposeInterior(I);}
    // petite aide à l'écran
    const W=drive?null:wallInFront();INT.near=W&&canOpenSmall(W.o)?W:null;}
  const I=INT.cur;intLight.intensity=I&&inRoom(I,player.root,0.5)?1.6:0;if(I)intLight.position.set((I.x0+I.x1)/2,I.ceil-0.4,(I.z0+I.z1)/2);
}
function interiorHint(){const I=INT.cur;if(I&&inRoom(I,player.root))for(const L of I.loot)if(!INT.looted.has(L.id)&&Math.hypot(L.x-player.root.x,L.z-player.root.z)<1.6)return ["E : fouiller "+L.label,"Fouiller"];
  if(INT.near){const info=bldInfo(INT.near.o),key=bldKey(INT.near.o);if(info.pub||INT.broken.has(key))return ["E : entrer","Entrer"];if(info.kind==="banque")return [info.pub?"E : entrer dans la banque":"Banque fermée (8 h – 21 h)",info.pub?"Entrer":""];if(info.str>=99)return ["Porte blindée",""];const h=INT.hits.get(key)||0;return [`Porte verrouillée — coups de pied pour l'enfoncer (${Math.round(h/info.str*100)} %)`,"Porte"];}
  return null;}
