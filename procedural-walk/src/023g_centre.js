// ================================================================ MODULE 15 : centre-ville d'affaires
// Gratte-ciels variés (paliers, cylindres, flèches, héliports), la Tour Zénith en repère,
// une silhouette de la skyline visible de loin, et des rues plus animées (employés de bureau, vendeurs).
const CBD_R=3;
function inCBD(cx,cz){return cz>=-14&&Math.max(Math.abs(cx),Math.abs(cz))<=CBD_R&&cx<14;}
const TW_COLS=["#5e88a8","#6fa39a","#7f8fa8","#33475e","#8a7a63","#c9d0d6","#4f6d7a","#2d3a46"];
const KT=TW_COLS.map((c,i)=>{const dark=i===3||i===7,light=i===5;
  return mat({roughness:0.35,metalness:0.25,map:cTex("tws"+i,64,64,(g,w,h)=>{g.fillStyle=c;g.fillRect(0,0,w,h);
    if(light){g.fillStyle="#3c4c5c";for(const x of [6,38])g.fillRect(x,8,20,20);}
    else{g.fillStyle=dark?"rgba(140,190,230,.28)":"rgba(255,255,255,.2)";g.fillRect(3,3,27,26);g.fillRect(34,3,27,26);g.fillStyle="rgba(0,0,0,.25)";g.fillRect(0,29,w,4);g.fillRect(0,61,w,3);}
  })});});
const KT_TRIM=mat({color:0xd7dde3,roughness:0.5,metalness:0.4}),KT_ROOF=mat({color:0x5a6068,roughness:0.9}),KT_HELI=mat({color:0x3a3f44,roughness:0.95});
const KT_RED=new THREE.MeshBasicMaterial({color:0xff2a2a});
// plan déterministe d'un îlot de tours (le même pour le bâtiment réel et sa silhouette lointaine)
function towerPlan(cx,cz){
  const r=mulberry((cx*92821)^(cz*68917)^0x2f6b1),bx0=cx*CHUNK-12,bz0=cz*CHUNK-12,bx1=bx0+32,bz1=bz0+32;
  const near=1-Math.max(Math.abs(cx),Math.abs(cz))/(CBD_R+1.5);
  const lay=r();const foot=lay<0.35?[[bx0+5,bz0+5,bx1-5,bz1-5]]:lay<0.7?[[bx0+4,bz0+4,bx0+15,bz0+15],[bx0+18,bz0+16,bx1-4,bz1-4]]:[[bx0+4,bz0+5,bx0+14,bz1-5],[bx0+18,bz0+5,bx1-4,bz1-5]];
  return foot.map(([x0,z0,x1,z1],i)=>{
    const st=r(),style=st<0.3?"slab":st<0.5?"round":st<0.75?"stepped":"spire";
    const h=Math.round((34+near*60+r()*36)*(foot.length>1&&i===0?0.75:1)/4)*4;
    return {x0,z0,x1,z1,cx:(x0+x1)/2,cz:(z0+z1)/2,w:x1-x0,d:z1-z0,h,style,col:Math.floor(r()*KT.length),heli:r()<0.35,name:["Horizon","Azur","Neptune","Atlantis","Mirage","Zénith","Boréal","Cristal","Mistral","Orion","Calypso","Solstice"][Math.abs(cx*5+cz*3+i)%12]};
  });
}
// tranche de tour : boîte vitrée avec corniche
function towerBox(x0,z0,x1,z1,y0,h,m,g){walls(x0,z0,x1,z1,y0,h,m,g,4,4);box(x0-0.15,z0-0.15,x1+0.15,z1+0.15,y0+h,y0+h+0.5,KT_TRIM,g);put(BX(x1-x0,0.05,z1-z0),KT_ROOF,(x0+x1)/2,y0+h+0.52,(z0+z1)/2,g);}
function towerCyl(cx,cz,rad,y0,h,m,g){const gm=scaledUV(new THREE.CylinderGeometry(rad,rad,h,24,1,true),Math.round(2*Math.PI*rad/4),h/4);const o=put(gm,m,cx,y0+h/2,cz,g);put(CY(rad+0.2,rad+0.2,0.5,24),KT_TRIM,cx,y0+h+0.25,cz,g);put(CY(rad,rad,0.06,24),KT_ROOF,cx,y0+h+0.52,cz,g);return o;}
function rooftop(T,top,g,keepG,heli){
  const r=mulberry(T.h*31+T.x0*7+T.z0);
  if(heli){put(CY(Math.min(T.w,T.d)*0.36,Math.min(T.w,T.d)*0.36,0.3,20),KT_HELI,T.cx,top+0.15,T.cz,g);put(geo("heliH",()=>new THREE.TorusGeometry(1,0.08,4,24).rotateX(Math.PI/2)),KM.yellow||KT_TRIM,T.cx,top+0.32,T.cz,g,0,Math.min(T.w,T.d)*0.3,1,Math.min(T.w,T.d)*0.3);
    for(const s of [-1,1])put(BX(0.4,0.05,2.6),KM.white,T.cx+s*0.8,top+0.33,T.cz,g);put(BX(1.6,0.05,0.4),KM.white,T.cx,top+0.33,T.cz,g);}
  else{for(let i=0;i<3;i++)put(BX(1.6+r()*1.5,1.2,1.4+r()),KT_ROOF,T.x0+2+r()*(T.w-4),top+0.6,T.z0+2+r()*(T.d-4),g);
    put(CY(1.2,1.2,2.4,10),KM.wood||KT_ROOF,T.x0+2.5,top+1.2,T.z1-2.5,g);}
  // antenne avec feu rouge clignotant
  const ax=T.x1-1.5,az=T.z0+1.5;put(CY(0.08,0.12,6,6),KT_TRIM,ax,top+3,az,g);const L=new THREE.Mesh(geo("redL",()=>new THREE.SphereGeometry(0.22,8,6)),KT_RED);L.position.set(ax,top+6.1,az);L.userData.keep=true;L.userData.blink=true;keepG.add(L);turbines.push(L);
}
function buildTower(T,base,mid,detail,isZenith){
  const m=KT[T.col];
  // socle : hall vitré sur 2 niveaux, auvent d'entrée, nom de la tour
  walls(T.x0-0.8,T.z0-0.8,T.x1+0.8,T.z1+0.8,0,6,KM.shop,base,4,6);box(T.x0-1,T.z0-1,T.x1+1,T.z1+1,6,6.5,KT_TRIM,base);
  put(BX(Math.min(8,T.w-1),0.25,2.4),KT_TRIM,T.cx,4.2,T.z0-2,mid);for(const s of [-1,1])put(CY(0.08,0.08,4.2,6),KM.chrome,T.cx+s*Math.min(3.6,T.w/2-1),2.1,T.z0-3,mid);
  if(!isZenith)put(BX(Math.min(7,T.w-1),0.9,0.12),signMat("Tour "+T.name,"#15181d","#e9f0f6",{w:512,h:80,glow:true}),T.cx,5.2,T.z0-0.88,base);
  let top;
  if(T.style==="round"){const rad=Math.min(T.w,T.d)/2;top=T.h;towerCyl(T.cx,T.cz,rad,6.5,T.h-6.5,m,base);}
  else if(T.style==="stepped"){const t1=T.h*0.55,t2=T.h*0.82;towerBox(T.x0,T.z0,T.x1,T.z1,6.5,t1-6.5,m,base);towerBox(T.x0+2,T.z0+2,T.x1-2,T.z1-2,t1+0.5,t2-t1,m,base);towerBox(T.x0+3.5,T.z0+3.5,T.x1-3.5,T.z1-3.5,t2+0.5,T.h-t2,m,base);top=T.h+0.5;
    T._top={x0:T.x0+3.5,z0:T.z0+3.5,x1:T.x1-3.5,z1:T.z1-3.5};}
  else{towerBox(T.x0,T.z0,T.x1,T.z1,6.5,T.h-6.5,m,base);top=T.h+0.5;
    if(T.style==="slab")for(let y=18;y<T.h;y+=18)box(T.x0-0.1,T.z0-0.1,T.x1+0.1,T.z1+0.1,y,y+0.35,KT_TRIM,base);   // bandeaux techniques
    if(T.style==="spire"){const s=Math.min(T.w,T.d);box(T.cx-s*0.3,T.cz-s*0.3,T.cx+s*0.3,T.cz+s*0.3,top,top+5,KT[(T.col+3)%KT.length],base);put(geo("spire",()=>new THREE.ConeGeometry(1,1,4)),KT_TRIM,T.cx,top+5+s*0.8,T.cz,base,Math.PI/4,s*0.3,s*1.6,s*0.3);top+=5;}}
  const RT=T._top?{...T,...T._top,w:T._top.x1-T._top.x0,d:T._top.z1-T._top.z0}:T;
  if(T.style!=="spire")rooftop(RT,top,mid,base,T.heli);
  else{const L=new THREE.Mesh(geo("redL",()=>new THREE.SphereGeometry(0.22,8,6)),KT_RED);L.position.set(T.cx,top+Math.min(T.w,T.d)*1.6+0.3,T.cz);L.userData.keep=true;L.userData.blink=true;base.add(L);turbines.push(L);}
  if(T.style==="round")addObstacle({type:"circle",x:T.cx,z:T.cz,r:Math.min(T.w,T.d)/2+0.9,tall:true,bld:true});
  else addObstacle({type:"box",x:T.cx,z:T.cz,hx:T.w/2+0.8,hz:T.d/2+0.8,tall:true,bld:true});
}
BUILDERS.tours=function(ch,C){const {X,Z,bx0,bz0,bx1,bz1,bcx,bcz,r,base,mid,detail,prop,camAt}=C;
  const plan=towerPlan(C.cx,C.cz);for(const T of plan)buildTower(T,base,mid,detail,false);
  // parvis : bancs, jardinières, lampadaires, vendeur de hot-dogs
  const two=plan.length>1;
  for(let i=0;i<5;i++){const x=bx0+3+r()*26,z=bz0+2.2+r()*1.2;prop(i%2?"planter":"bench",x,z,0);}
  prop("lamp",bx0+2,bz1-2,0);prop("lamp",bx1-2,bz0+2,0);
  if(!two)statue(bx0+3,bz1-3,mid);
  if(r()<0.6){const x=two?bx1-8:bx0+8,z=two?bz0+9:bz1-2.6;hotdogCart(x,z,mid);}
  camAt(bx0+0.8,bz0+0.8,Math.atan2(1,1));edgeTrees(X,Z,mid,r,"palm");
};
BUILDERS.zenith=function(ch,C){const {X,Z,bx0,bz0,bx1,bz1,bcx,bcz,r,base,mid,detail,prop}=C;
  const T=ZENITH;buildTower(T,base,mid,detail,true);
  // couronne lumineuse + grande flèche : repère visible depuis toute la ville
  const top=T.h+0.5;for(let k=0;k<4;k++)box(T.x0+0.5+k*1.2,T.z0+0.5+k*1.2,T.x1-0.5-k*1.2,T.z1-0.5-k*1.2,top+k*2.2,top+k*2.2+2,k%2?KT_TRIM:KT[3],base);
  put(CY(0.25,0.6,30,8),KT_TRIM,T.cx,top+9+15,T.cz,base);
  const L=new THREE.Mesh(geo("redL2",()=>new THREE.SphereGeometry(0.4,8,6)),KT_RED);L.position.set(T.cx,top+39.4,T.cz);L.userData.keep=true;L.userData.blink=true;base.add(L);turbines.push(L);
  fountain(bcx,bz1-4,mid);for(let i=0;i<4;i++)prop("bench",bx0+4+i*7.5,bz1-1.6,Math.PI);
  hotdogCart(bx0+4,bz0+2.4,mid);
  put(BX(9,1.1,0.15),signMat("TOUR ZÉNITH · 168 m","#0e1a2a","#ffd25a",{w:768,h:96,glow:true}),T.cx,5.4,T.z0-0.9,base);
};
const ZENITH={x0:-12+40*1+5,z0:-12-40+5,x1:-12+40+27,z1:-12-40+23,cx:44,cz:-38,w:22,d:18,h:168,style:"slab",col:3,heli:false,name:"Zénith"};
function hotdogCart(x,z,g){
  put(BX(1.8,0.9,1),KM.white,x,0.12+0.85,z,g);put(BX(1.9,0.08,1.1),KT_TRIM,x,0.12+1.32,z,g);
  for(const s of [-0.6,0.6])put(CY(0.25,0.25,0.12,10),KM.dark,x+s,0.12+0.3,z+0.52,g,Math.PI/2);
  const um=put(geo("hdUmb",()=>new THREE.ConeGeometry(1.3,0.5,8)),STRIPES[1],x,0.12+2.5,z,g);put(CY(0.03,0.03,1.2,5),KM.chrome,x,0.12+1.9,z,g);
  put(BX(1.6,0.35,0.05),signMat("HOT-DOGS","#c62828","#ffe066",{w:256,h:56}),x,0.12+1.1,z-0.53,g);
  addObstacle({type:"box",x,z,hx:1,hz:0.6});addShop("Hot-dogs du coin",x,z-1.5);addAmb("vendeur",x+0.2,z+1.1,180);
}
// ---------------------------------------------------------------- skyline lointaine
// chaque tour du centre a une silhouette simple, ramenée à 230 m de la caméra (même taille apparente)
const skyMat=new THREE.MeshBasicMaterial({color:0xa9b6c6,fog:false,vertexColors:true}),skyMatD=new THREE.MeshBasicMaterial({color:0x96a4b6,fog:false,vertexColors:true});
// ombrage simple selon l'orientation des faces (soleil à l'ouest-sud-ouest), sans éclairage
function shadeGeo(g){g=g.index?g.toNonIndexed():g;const n=g.attributes.normal,c=new Float32Array(n.count*3);for(let i=0;i<n.count;i++){const k=0.86+0.1*n.getX(i)+0.06*n.getZ(i)+0.08*n.getY(i);c[i*3]=c[i*3+1]=c[i*3+2]=k;}g.setAttribute('color',new THREE.BufferAttribute(c,3));return g;}
const skyline=[];
{
  const add=(T,cx,cz,special)=>{const g=new THREE.Group();const top=T.h;
    let gm;if(T.style==="round")gm=new THREE.CylinderGeometry(Math.min(T.w,T.d)/2,Math.min(T.w,T.d)/2,top,16).translate(0,top/2,0);
    else if(T.style==="stepped"){const a=new THREE.BoxGeometry(T.w,T.h*0.55,T.d).translate(0,T.h*0.275,0),b=new THREE.BoxGeometry(T.w-4,T.h*0.27,T.d-4).translate(0,T.h*0.685,0),c=new THREE.BoxGeometry(T.w-7,T.h*0.18,T.d-7).translate(0,T.h*0.91,0);gm=mergeGeos([a,b,c]);}
    else gm=new THREE.BoxGeometry(T.w,top,T.d).translate(0,top/2,0);
    const m=new THREE.Mesh(shadeGeo(gm),T.col===3||T.col===7?skyMatD:skyMat);g.add(m);
    if(T.style==="spire"){const s=Math.min(T.w,T.d);g.add(new THREE.Mesh(shadeGeo(new THREE.ConeGeometry(s*0.3,s*1.6,4).translate(0,top+5+s*0.8,0)),skyMat));}
    if(special)g.add(new THREE.Mesh(shadeGeo(new THREE.CylinderGeometry(0.3,0.7,40,6).translate(0,top+20,0)),skyMat));
    g.userData={base:new V3(T.cx,0,T.cz),key:ckey(cx,cz)};g.visible=false;scene.add(g);skyline.push(g);};
  for(let i=-CBD_R;i<=CBD_R;i++)for(let j=-CBD_R;j<=CBD_R;j++){const t=chunkType(i,j);if(t==="tours")for(const T of towerPlan(i,j))add(T,i,j);else if(t==="zenith")add(ZENITH,i,j,true);}
}
function mergeGeos(list){const pos=[],nor=[];for(const g of list){const n=g.toNonIndexed();pos.push(...n.attributes.position.array);nor.push(...n.attributes.normal.array);}
  const out=new THREE.BufferGeometry();out.setAttribute("position",new THREE.Float32BufferAttribute(pos,3));out.setAttribute("normal",new THREE.Float32BufferAttribute(nor,3));return out;}
function updateSkyline(){
  const c=camera.position,FAR=camera.far-14;
  for(const g of skyline){
    if(chunks.has(g.userData.key)){g.visible=false;continue;}
    const b=g.userData.base,dx=b.x-c.x,dz=b.z-c.z,d=Math.hypot(dx,dz);
    if(d<90){g.visible=false;continue;}
    const k=Math.min(1,FAR/d);g.visible=true;g.position.set(c.x+dx*k,c.y+(0-c.y)*k,c.z+dz*k);g.scale.setScalar(k);
  }
}
