// ================================================================ LIEUX DE CAMPAGNE : il se passe toujours quelque chose
// Environ une zone de campagne sur 22 accueille un lieu : hameau habité, ruines, chapelle, château d'eau, tour de guet,
// carrière, ferme solaire, parc de caravanes, cinéma en plein air, moulin, cimetière, camping sauvage, épave, stand
// de fruits, radar météo, maison abandonnée, puits, pique-nique… Ils apparaissent sur la carte quand on les découvre.
const LIEU_BY_ZONE={agricole:["hameau","hameau","chapelle","chateau_eau","moulin","stand","solaire","cimetiere","ruines","puits"],mauve:["hameau","moulin","chapelle","ruines","stand"],
  ranch:["hameau","caravanes","epave","puits","drive_in"],pinede:["tour_guet","camping","ruines","maison_abandon","hameau"],foret:["camping","tour_guet","maison_abandon","ruines","cimetiere","hameau"],
  savane:["caravanes","drive_in","stand","solaire","epave"],agrumes:["stand","hameau","chateau_eau","chapelle"],vignoble:["hameau","chapelle","ruines","moulin"],mesa:["carriere","caravanes","solaire","epave","drive_in","radar"],
  jungle:["ruines","camping","maison_abandon","hameau"],bambous:["ruines","hameau"],fleurs:["pique_nique","moulin","hameau","chapelle"]};
const LIEU_NAMES={hameau:["Hameau des Saules","Les Granges","Le Petit-Bois","La Croix-Verte","Les Quatre-Vents","Mas Rouge","Les Bruyères","La Fontaine-aux-Loups","Les Tilleuls","Le Clos-Fleuri"],
  chapelle:["Chapelle Sainte-Rose","Chapelle des Champs","Chapelle du Calvaire"],ruines:["Ruines du Vieux Fort","Ruines de l'Abbaye","Vieux Moulin en ruine","Ruines mayas oubliées"],chateau_eau:["Château d'eau"],moulin:["Moulin de la Butte","Moulin Blanc"],
  stand:["Stand de fruits de Rosa","Fruits & Jus de Manolo"],solaire:["Ferme solaire Hélios"],cimetiere:["Vieux cimetière"],puits:["Le Puits aux Souhaits"],caravanes:["Parc de caravanes Sunset","Trailer Park Coyote"],
  epave:["Épave rouillée"],drive_in:["Cinéma en plein air Le Comète"],tour_guet:["Tour de guet forestière"],camping:["Camp sauvage"],maison_abandon:["Maison abandonnée","La maison du marais"],
  carriere:["Carrière de pierre rouge"],radar:["Station radar"],pique_nique:["Aire de pique-nique"]};
function lieuAt(cx,cz){
  const h=hash(cx*91.7+cz*37.3+7.1);if(h>0.045)return null;
  const X=cx*40,Z=cz*40;if(gridAt(cx,cz)||inAirport(cx,cz)||ROADSIDE.has(cx+","+cz))return null;
  if(onAnyRoad(X,Z,26)||rawLand(X,Z)<WATER_Y+0.05||bayouK(X,Z)>0.2||riverDist(X,Z)[0]<40)return null;
  const zn=zoneAt(X,Z),L=LIEU_BY_ZONE[zn];if(!L)return null;const k=L[Math.floor(hash(cx*3.3+cz*5.7)*L.length)];
  if(hillAt(X,Z)>14&&k!=="tour_guet"&&k!=="radar"&&k!=="ruines"&&k!=="camping")return null;
  return k;
}
function lieuName(k,cx,cz){const L=LIEU_NAMES[k]||["Lieu-dit"];return L[Math.abs(cx*13+cz*7)%L.length];}
// petite maison de campagne (murs, toit, porte, fenêtres)
function countryHouse(x,z,w,d,g,r,ry){const y=groundAt(x,z)-0.1,o=new THREE.Group();o.position.set(x,y,z);o.rotation.y=ry||0;g.add(o);
  const wm=KM.houseWall[Math.floor(r()*KM.houseWall.length)],H=2.9+(r()<0.3?2.9:0);walls(-w,-d,w,d,0,H,wm,o,3,2.9);gableRoof(-w-0.3,-d-0.3,w+0.3,d+0.3,H,1.6+r(),r()<0.6?KM.roofTile:KM.roofSlate,o);
  put(BX(1,2,0.06),KM.door,0,1,d+0.04,o);put(BX(0.5,1.4,0.5),KM.stone,w*0.5,H+1.2,0,o);
  const c=Math.abs(Math.cos(ry||0))>0.5;addObstacle({type:"box",x,z,hx:c?w:d,hz:c?d:w,tall:true,bld:true});}
function lieuBuild(ch,X,Z,r,base,mid,detail){
  const k=lieuAt(ch.cx,ch.cz),name=lieuName(k,ch.cx,ch.cz),y=groundAt(X,Z);
  const tree=(n,kind)=>{for(let i=0;i<n;i++){const x=X+r()*38-19,z=Z+r()*38-19;if(!onAnyRoad(x,z,3)&&waterDepth(x,z)<0.02&&Math.hypot(x-X,z-Z)>12)treeAt(x,z,kind||(r()<0.5?"round":"conifer"),0.9+r()*0.4,mid);}};
  const sign=(txt)=>{const x=X-14,z=Z-16,yy=groundAt(x,z);put(CY(0.06,0.06,2.4,5),OM.wood,x,yy+1.2,z,mid);put(BX(2.6,0.6,0.08),signMat(txt,"#3a2a1a","#f2e2b0",{w:512,h:96}),x,yy+2.2,z,mid);};
  switch(k){
    case "hameau":{const n=3+Math.floor(r()*3);for(let i=0;i<n;i++){const a=i/n*6.28+r()*0.4,x=X+Math.cos(a)*11,z=Z+Math.sin(a)*11;countryHouse(x,z,3.2+r(),2.8+r()*0.6,base,r,Math.round((a+Math.PI/2)/(Math.PI/2))*Math.PI/2);}
      plane(10,10,CMP.dirt,X,y+0.03,Z,base,3,3);put(CY(1,1.1,0.9,10),KM.stone,X,y+0.45,Z,base);addObstacle({type:"circle",x:X,z:Z,r:1.1});
      if(r()<0.7)parkedCar(X+5,Z-4,0,mid);addAmb("fermier",X+3,Z+3,r()*360);if(r()<0.6)addAnimals("chien",X,Z,1,4);addAnimals("poule",X-4,Z+4,4,4);sign(name);tree(5);break;}
    case "chapelle":{const o=lifted(base,X,Z);walls(X-3,Z-5,X+3,Z+5,0,5,KM.stone,o,3,5);gableRoof(X-3.3,Z-5.3,X+3.3,Z+5.3,5,2.6,KM.roofSlate,o);box(X-1,Z+4,X+1,Z+6,0,9,KM.stone,o);put(geo("chpCone",()=>new THREE.ConeGeometry(1.4,3,4)),KM.roofSlate,X,10.5,Z+5,o,Math.PI/4);
      put(BX(0.1,1.2,0.1),KM.yellow,X,12.6,Z+5,o);put(BX(0.7,0.1,0.1),KM.yellow,X,12.8,Z+5,o);put(BX(1.4,2.4,0.06),KM.door,X,1.2,Z-5.03,o);addObstacle({type:"box",x:X,z:Z,hx:3,hz:5,tall:true,bld:true});addObstacle({type:"box",x:X,z:Z+5,hx:1,hz:1,tall:true});
      for(let i=0;i<5;i++){const x=X-7+i*3.5,z=Z-10;put(BX(0.5,0.7,0.12),KM.stone,x,groundAt(x,z)+0.35,z,detail);}tree(6,"conifer");break;}
    case "ruines":{for(let i=0;i<9;i++){const a=i/9*6.28,x=X+Math.cos(a)*9,z=Z+Math.sin(a)*7,h=1+r()*3.5,yy=groundAt(x,z);put(BX(3.2,h,0.8),KM.stone,x,yy+h/2,z,base,a+Math.PI/2);addObstacle({type:"circle",x,z,r:1.4,tall:h>2});}
      for(let i=0;i<4;i++){const x=X+r()*8-4,z=Z+r()*8-4,yy=groundAt(x,z);put(CY(0.45,0.5,1+r()*4,8),KM.stone,x,yy+1.5,z,base);addObstacle({type:"circle",x,z,r:0.5,tall:true});}
      for(let i=0;i<6;i++){const x=X+r()*20-10,z=Z+r()*20-10;rockAt(x,z,0.4+r()*0.6,detail);}tree(4);break;}
    case "chateau_eau":{put(CY(0.6,0.8,16,8),WM2.concrete,X,y+8,Z,base);put(CY(4,3,5,14),WM2.concrete,X,y+18,Z,base);put(geo("cdeTop",()=>new THREE.ConeGeometry(4.2,1.5,14)),KM.roofSlate,X,y+21.2,Z,base);
      put(BX(5,1,0.1),signMat(["FLORALIA","BELLEFONTAINE","VAL D'AZUR"][Math.abs(ch.cx)%3],"#ffffff00","#1f3a5a",{w:512,h:96}),X,y+18,Z+3.6,base);addObstacle({type:"circle",x:X,z:Z,r:1,tall:true});tree(6);break;}
    case "moulin":{const o=lifted(base,X,Z);put(CY(2.6,3.4,9,10),KM.white,X,4.5,Z,o);put(geo("mlnCone",()=>new THREE.ConeGeometry(3,3,10)),KM.roofTile,X,10.5,Z,o);put(BX(1.2,2.2,0.08),KM.door,X,1.1,Z+3.2,o);
      const w=new THREE.Group();w.position.set(X,y+8.5,Z+3.4);w.userData.keep=true;w.userData.ax="z";w.userData.spd=0.6;mid.add(w);for(let i=0;i<4;i++){const b=put(BX(1.2,7,0.08),OM.wood,0,3.6,0,w);b.position.set(Math.cos(i*Math.PI/2+Math.PI/2)*3.6,Math.sin(i*Math.PI/2+Math.PI/2)*3.6,0);b.rotation.z=i*Math.PI/2;}turbines.push(w);
      addObstacle({type:"circle",x:X,z:Z,r:3.2,tall:true,bld:true});tree(3);break;}
    case "stand":{const x=X,z=Z;put(BX(3,1,1.2),OM.wood,x,y+0.5,z,mid);put(BX(3.4,0.08,1.8),STRIPES[3],x,y+2.4,z,mid);for(const [dx,dz] of [[-1.5,-0.6],[1.5,-0.6],[-1.5,0.6],[1.5,0.6]])put(CY(0.05,0.05,2.4,5),OM.wood,x+dx,y+1.2,z+dz,mid);
      for(let i=0;i<8;i++)put(geo("fruit",()=>new THREE.SphereGeometry(0.12,6,4)),WM2.orange,x-1.2+i*0.35,y+1.1,z-0.3,detail);addObstacle({type:"box",x,z,hx:1.5,hz:0.6});
      put(BX(2.4,0.5,0.06),signMat(name,"#c46a1e","#fff",{w:512,h:80}),x,y+2.8,z-0.9,mid);addShop("Jus de fruits frais",x,z-1.4);addAmb("marchand",x,z+1,180);tree(4,"palm");break;}
    case "solaire":{for(let a=-15;a<=15;a+=4)for(let b=-14;b<=14;b+=7){const x=X+a,z=Z+b,yy=groundAt(x,z);const p=put(BX(3,0.08,5.5),WM2.glass,x,yy+1.2,z,base);p.rotation.x=0.35;put(BX(0.1,1.2,0.1),OM.metal,x,yy+0.6,z,base);}
      addObstacle({type:"box",x:X,z:Z,hx:17,hz:16});sign(name);break;}
    case "cimetiere":{fenceRun(X-12,Z-10,X+12,Z-10,"rail",mid,[[11,13]]);fenceRun(X-12,Z+10,X+12,Z+10,"rail",mid,[]);fenceRun(X-12,Z-10,X-12,Z+10,"rail",mid,[]);fenceRun(X+12,Z-10,X+12,Z+10,"rail",mid,[]);
      for(let a=-9;a<=9;a+=3)for(let b=-6;b<=7;b+=4){const x=X+a,z=Z+b,yy=groundAt(x,z);put(BX(0.8,1+r()*0.5,0.18),KM.stone,x,yy+0.55,z,detail);if(r()<0.3)put(BX(0.12,0.7,0.12),KM.stone,x,yy+1.3,z,detail);}
      deadTree(X+9,Z+7,1,mid);tree(3,"conifer");break;}
    case "puits":{put(CY(1.1,1.2,0.9,12),KM.stone,X,y+0.45,Z,base);for(const s of [-1,1])put(BX(0.15,2.2,0.15),OM.wood,X+s,y+1.1,Z,base);put(BX(2.4,0.12,0.6),KM.roofTile,X,y+2.3,Z,base);addObstacle({type:"circle",x:X,z:Z,r:1.2});tree(5);break;}
    case "caravanes":{for(let i=0;i<5;i++){const x=X-14+i*7,z=Z+(i%2?5:-5),yy=groundAt(x,z);const c=[KM.white,KM.houseWall[4],KM.houseWall[2]][i%3];put(BX(2.4,2.5,7),c,x,yy+1.55,z,base);put(BX(2.45,0.3,7.05),KM.red,x,yy+1.2,z,base);put(BX(2.5,0.5,1.2),WM2.glass,x,yy+2,z-2,base);
        put(geo("wheel",()=>new THREE.CylinderGeometry(0.33,0.33,0.22,12).rotateZ(Math.PI/2)),KM.tire,x,yy+0.33,z,base);addObstacle({type:"box",x,z,hx:1.25,hz:3.5,tall:true});if(r()<0.5)terraceSet(x+3,z,detail,STRIPES[i%STRIPES.length]);}
      addAmb(r()<0.5?"fermier":"bayou",X,Z,0);if(r()<0.5)addAnimals("chien",X,Z,1,5);sign(name);break;}
    case "epave":{const c=carMesh(mat({color:0x7a3a1e,roughness:1}),r()<0.3?"van":null);c.position.set(X,y-0.15,Z);c.rotation.set(0.05,r()*6,0.12);mid.add(c);addObstacle({type:"circle",x:X,z:Z,r:2.1});for(let i=0;i<4;i++)grassTuft(X+r()*4-2,Z+r()*4-2,detail,WM2.straw);tree(4);break;}
    case "drive_in":{const yy=groundAt(X,Z+14);put(BX(18,9,0.4),KM.white,X,yy+6,Z+14,base);for(const s of [-8,8])put(BX(0.4,6,0.4),OM.metal,X+s,yy+3,Z+14,base);addObstacle({type:"box",x:X,z:Z+14,hx:9,hz:0.4,tall:true});
      const scr=new THREE.Mesh(new THREE.PlaneGeometry(17,8.4),new THREE.MeshBasicMaterial({color:0x8ab8e8}));scr.position.set(X,yy+6,Z+13.75);scr.rotation.y=Math.PI;scr.userData.keep=true;scr.userData.screen=true;mid.add(scr);worldMovers.push({o:scr,kind:"screen",ph:X});
      for(let i=0;i<6;i++){const x=X-10+i*4,z=Z-6+(i%2)*4;if(r()<0.8)parkedCar(x,z,Math.PI,mid);}put(BX(6,1.2,0.12),signMat(name,"#1f1f3a","#ffd23a",{w:640,h:96,glow:true}),X,yy+11.2,Z+14.3,base,Math.PI);break;}
    case "tour_guet":{const yy=groundAt(X,Z);for(const [dx,dz] of [[-1.2,-1.2],[1.2,-1.2],[-1.2,1.2],[1.2,1.2]])put(CY(0.1,0.12,12,5),OM.wood,X+dx,yy+6,Z+dz,base);box(X-1.8,Z-1.8,X+1.8,Z+1.8,yy+12,yy+12.2,KM.plank,base);walls(X-1.6,Z-1.6,X+1.6,Z+1.6,yy+12.2,2.2,KM.plank,base,3,2);
      box(X-2,Z-2,X+2,Z+2,yy+14.4,yy+14.7,KM.roofSlate,base);addObstacle({type:"box",x:X,z:Z,hx:1.4,hz:1.4,tall:true});addAmb("randonneur",X+3,Z+3,0);tree(14,"conifer");break;}
    case "camping":{for(let i=0;i<4;i++){const a=i*1.57+0.4,x=X+Math.cos(a)*5,z=Z+Math.sin(a)*5;put(geo("tent",()=>new THREE.ConeGeometry(1.8,2.2,4)),[KM.orange,KM.blue,KM.green,KM.red][i],x,groundAt(x,z)+1.1,z,mid,Math.PI/4);addObstacle({type:"circle",x,z,r:1.4});}
      put(CY(0.6,0.6,0.25,8),KM.stone,X,y+0.12,Z,detail);put(geo("fire",()=>new THREE.ConeGeometry(0.35,0.8,6)),KM.orange,X,y+0.6,Z,detail);for(let i=0;i<3;i++){const x=X+Math.cos(i*2.1)*2,z=Z+Math.sin(i*2.1)*2;const l=put(CY(0.2,0.2,1.4,6),WM.trunk,x,groundAt(x,z)+0.2,z,detail,i*2.1);l.rotation.z=Math.PI/2;}
      addAmb("randonneur",X+2,Z-2,0);tree(10,"conifer");break;}
    case "maison_abandon":{const o=lifted(base,X,Z);const dm=mat({color:0x6a6058,roughness:1});walls(X-4,Z-3,X+4,Z+3,0,5.2,dm,o,3,2.9);gableRoof(X-4.3,Z-3.3,X+4.3,Z+3.3,5.2,2,mat({color:0x3a3634,roughness:1}),o);
      for(const s of [-2,2])put(BX(1.2,1.2,0.08),KM.dark,X+s,3.6,Z+3.04,o);put(BX(1.1,2.1,0.08),KM.dark,X,1.05,Z+3.04,o);addObstacle({type:"box",x:X,z:Z,hx:4,hz:3,tall:true,bld:true});deadTree(X+7,Z+3,1.1,mid);deadTree(X-7,Z-4,0.9,mid);tree(4);
      if(r()<0.5)addAnimals("corbeau",X,Z,4,6);break;}
    case "carriere":{const yy=groundAt(X,Z);for(let i=0;i<10;i++){const x=X+r()*28-14,z=Z+r()*28-14;mesaRock(x,z,0.8+r()*2,base);}
      const t=new THREE.Group();t.position.set(X+4,yy,Z);mid.add(t);put(BX(3,1.8,5.5),KM.yellow,0,1.6,0,t);put(BX(2.8,1.2,2),KM.yellow,0,2.4,-2.6,t);for(const [a,b] of [[-1.3,-1.8],[1.3,-1.8],[-1.3,1.8],[1.3,1.8]]){const w=put(CY(0.7,0.7,0.6,10),KM.tire,a,0.7,b,t);w.rotation.z=Math.PI/2;}addObstacle({type:"box",x:X+4,z:Z,hx:1.6,hz:2.9,tall:true});
      const e=new THREE.Group();e.position.set(X-6,yy,Z+4);mid.add(e);put(BX(3,1.4,3.2),KM.orange,0,1.4,0,e);put(BX(0.5,0.5,6),KM.orange,0,3,2.6,e).rotation.x=-0.5;put(BX(4,0.9,4),KM.dark,0,0.45,0,e);addObstacle({type:"box",x:X-6,z:Z+4,hx:2,hz:2,tall:true});sign(name);break;}
    case "radar":{const yy=groundAt(X,Z);put(CY(0.8,1,10,8),KM.white,X,yy+5,Z,base);put(geo("radome",()=>new THREE.SphereGeometry(3.4,16,10)),KM.white,X,yy+12,Z,base);box(X-5,Z-5,X+1,Z,yy,yy+3,WM2.concrete,base);addObstacle({type:"circle",x:X,z:Z,r:1.1,tall:true});addObstacle({type:"box",x:X-2,z:Z-2.5,hx:3,hz:2.5,tall:true,bld:true});
      const L=new THREE.Mesh(geo("twrL",()=>new THREE.SphereGeometry(0.4,8,6)),WM2.neon);L.position.set(X,yy+15.6,Z);L.userData.keep=true;L.userData.blink=true;base.add(L);turbines.push(L);break;}
    case "pique_nique":{for(let i=0;i<4;i++){const x=X-6+i*4,z=Z;const o=lifted(detail,x,z);picnic(x,z,o);}put(BX(0.8,1,0.8),OM.bin,X+9,y+0.5,Z,detail);tree(8,"round");addAmb("randonneur",X,Z+3,0);if(r()<0.5)addAnimals("papillon",X,Z,4,8);break;}
  }
  if(!LIEU_SEEN.has(ch.cx+","+ch.cz)){LIEU_SEEN.add(ch.cx+","+ch.cz);if(k!=="epave"&&k!=="puits")POIS.push({type:"lieu",x:X,z:Z,name});}
}
const LIEU_SEEN=new Set();
// ---------------------------------------------------------------- styles des nouvelles villes
// Sierra Roja (désert) : maisons en adobe à toit plat, poutres qui dépassent, cactus en pot
BUILDERS.adobe=function(ch,C){const {X,Z,bx0,bz0,bx1,bz1,bcx,bcz,r,base,mid,detail,prop}=C;
  plane(26.8,26.8,mat({color:0xc89a6a,roughness:1}),bcx,SIDEWALK+0.006,bcz,base,6,6);
  const AD=[0xd8a878,0xc88a5a,0xe8c8a0,0xb8704a].map(c=>mat({color:c,roughness:1}));
  for(const [x,z] of [[bx0+9,bz0+9],[bx1-9,bz0+9],[bx0+9,bz1-9],[bx1-9,bz1-9]]){const w=4+r()*1.2,d=3.5+r(),H=r()<0.4?6:3.4,m=AD[Math.floor(r()*4)];
    box(x-w,z-d,x+w,z+d,SIDEWALK,SIDEWALK+H,m,base);box(x-w-0.15,z-d-0.15,x+w+0.15,z+d+0.15,SIDEWALK+H,SIDEWALK+H+0.35,m,base);
    for(let k=-w+0.8;k<w;k+=1.2)put(CY(0.09,0.09,0.9,5),OM.wood,x+k,SIDEWALK+H-0.4,z-d-0.3,base).rotation.x=Math.PI/2;
    put(BX(1,2,0.06),KM.door,x,SIDEWALK+1,z-d-0.03,base);put(BX(0.8,0.8,0.06),KM.dark,x-w*0.55,SIDEWALK+1.6,z-d-0.03,base);addObstacle({type:"box",x,z,hx:w,hz:d,tall:true,bld:true});
    if(r()<0.6)saguaro(x+w+1.2,z-d-1.2,0.5,mid);}
  for(let k=0;k<3;k++)mesaRock(bx0+4+r()*24,bcz+r()*6-3,0.4+r()*0.5,detail);for(const [x,z] of [[bx0+1.1,bcz],[bx1-1.1,bcz]])prop("lamp",x,z,0);};
// Puerto Selva (tropical) : paillotes sur pilotis, palmiers, hamacs
BUILDERS.paillotes=function(ch,C){const {X,Z,bx0,bz0,bx1,bz1,bcx,bcz,r,base,mid,detail,prop}=C;
  plane(26.8,26.8,WM.grass,bcx,SIDEWALK+0.006,bcz,base,6,6);const straw=mat({color:0xc8a860,roughness:1});
  for(const [x,z] of [[bx0+9,bz0+9],[bx1-9,bz0+9],[bx0+9,bz1-9],[bx1-9,bz1-9]]){const y=SIDEWALK+0.9;for(const [dx,dz] of [[-3,-2.5],[3,-2.5],[-3,2.5],[3,2.5]])put(CY(0.12,0.12,1.2,5),OM.wood,x+dx,SIDEWALK+0.45,z+dz,base);
    box(x-3.3,z-2.8,x+3.3,z+2.8,y-0.12,y,KM.plank,base);walls(x-2.8,z-2.3,x+2.8,z+2.3,y,2.4,[KM.houseWall[3],KM.houseWall[4],KM.houseWall[2]][Math.floor(r()*3)],base,3,2.4);
    put(geo("paille",()=>new THREE.ConeGeometry(4.6,2.6,4)),straw,x,y+3.6,z,base,Math.PI/4,1,1,0.85);put(BX(1,1.9,0.06),KM.door,x,y+0.95,z-2.33,base);addObstacle({type:"box",x,z,hx:3.2,hz:2.7,tall:true,bld:true});
    treeAt(x+4.5,z+3.5,"palm",0.8+r()*0.4,mid);}
  for(let k=0;k<4;k++)treeAt(bx0+3+r()*26,bcz+r()*4-2,"palm",0.9+r()*0.4,mid);for(const [x,z] of [[bx0+1.1,bcz],[bx1-1.1,bcz]])prop("lamp",x,z,0);
  if(r()<0.5)addAnimals("perroquet",bcx,bcz,3,10);};
// ---------------------------------------------------------------- chemins de terre : des lieux jusqu'à la route la plus proche
// Un chemin en L (axes x puis z) part du lieu et rejoint l'autoroute la plus proche (si elle est à moins de 700 m).
const PATH_KINDS=new Set(["hameau","chapelle","moulin","stand","caravanes","drive_in","carriere","camping","tour_guet","cimetiere","chateau_eau","maison_abandon","pique_nique","solaire","radar","ruines"]);
const PATH_CACHE=new Map();
function lieuPath(cx,cz){const k=cx+","+cz;if(PATH_CACHE.has(k))return PATH_CACHE.get(k);let P=null;const L=lieuAt(cx,cz);
  if(L&&PATH_KINDS.has(L)){const X=cx*40,Z=cz*40;let best=null,bd=700;for(const H of HWYS){const d=hwyDist(X,Z,H);if(d<bd){bd=d;best=H;}}
    if(best){const Lh=hwyLine(best),[a,b]=hwyRange(best);if(best.ax==="ns"){const zz=clamp(Z,a,b);P={segs:[[X,Z,X,zz],[X,zz,Lh,zz]]};}else{const xx=clamp(X,a,b);P={segs:[[X,Z,xx,Z],[xx,Z,xx,Lh]]};}}}
  PATH_CACHE.set(k,P);return P;}
// tronçons de chemin qui traversent la zone (cx,cz) : on regarde les lieux proches
function pathsThrough(cx,cz){const out=[],R=18;for(let i=cx-R;i<=cx+R;i++)for(let j=cz-R;j<=cz+R;j++){if(hash(i*91.7+j*37.3+7.1)>0.045)continue;const P=lieuPath(i,j);if(!P)continue;
  for(const [x0,z0,x1,z1] of P.segs){const X0=cx*40-20,X1=cx*40+20,Z0=cz*40-20,Z1=cz*40+20,ax=Math.min(x0,x1),bx=Math.max(x0,x1),az=Math.min(z0,z1),bz=Math.max(z0,z1);
    if(bx<X0-2||ax>X1+2||bz<Z0-2||az>Z1+2)continue;out.push([Math.max(ax,X0),Math.max(az,Z0),Math.min(bx,X1),Math.min(bz,Z1),x0===x1]);}}return out;}
const PATH_M=new THREE.MeshStandardMaterial({color:0x9a8262,roughness:1,polygonOffset:true,polygonOffsetFactor:-3,polygonOffsetUnits:-3,map:CMP.dirt.map});
function buildPaths(ch,X,Z,g){
  for(const [ax,az,bx,bz,vert] of pathsThrough(ch.cx,ch.cz)){const len=vert?bz-az:bx-ax;if(len<1)continue;const n=Math.max(1,Math.round(len/4)),pos=[],idx=[],uv=[];
    for(let k=0;k<=n;k++){const t=k/n,cxp=vert?ax:ax+(bx-ax)*t,czp=vert?az+(bz-az)*t:az;for(const o of [-1.4,1.4]){const x=vert?cxp+o:cxp,z=vert?czp:czp+o;if(inGridArea(x,z)||onAnyRoad(x,z,0)){pos.push(x,-50,z);}else{const y=groundAt(x,z);pos.push(x,(waterDepth(x,z)>0?-50:y+0.03),z);}uv.push(o>0?1:0,(vert?czp:cxp)/3);}}
    for(let k=0;k<n;k++){const a=k*2;if(vert)idx.push(a,a+2,a+1,a+1,a+2,a+3);else idx.push(a,a+1,a+2,a+1,a+3,a+2);}
    const gm=new THREE.BufferGeometry();gm.setAttribute("position",new THREE.Float32BufferAttribute(pos,3));gm.setAttribute("uv",new THREE.Float32BufferAttribute(uv,2));gm.setIndex(idx);gm.computeVertexNormals();
    const m=new THREE.Mesh(gm,PATH_M);m.receiveShadow=true;g.add(m);}
}
